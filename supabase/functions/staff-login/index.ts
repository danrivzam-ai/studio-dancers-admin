import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import bcrypt from "https://esm.sh/bcryptjs@2.4.3"

// ─── Login server-side para Recepción e Instructoras ────────────────────────
// Reemplaza las consultas directas a `receptionists` / `instructors` que
// hacían bcrypt.compare() en el navegador (exponiendo los hashes al cliente).
// Esta función:
//   1. Recibe { role: 'recepcion' | 'instructora', identifier, password }
//   2. Busca la cuenta con el service role (nunca expone el hash al cliente)
//   3. Compara la contraseña server-side
//   4. Aplica rate limiting (máx. 5 fallos en 10 min) reutilizando login_attempts
//   5. Devuelve solo los datos seguros necesarios para la sesión
//      (recepción: además una sesión de Supabase Auth con rol 'receptionist')

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

const ROLE_TABLES: Record<string, { table: string; idColumn: string }> = {
  recepcion: { table: "receptionists", idColumn: "username" },
  instructora: { table: "instructors", idColumn: "cedula" },
}

// Correo interno (no recibe mensajes) del usuario de Auth de cada recepcionista.
// ReceptionistManager usa el mismo formato para quitar el rol al desactivarla.
const receptionistEmail = (id: string) => `recepcion-${id}@staff.studiodancers.app`

// Crea (o reutiliza) el usuario de Auth de la recepcionista, le asegura el rol
// 'receptionist' en user_roles y devuelve una sesión. La contraseña interna es
// aleatoria y se renueva en cada ingreso: nadie la conoce ni la necesita.
// deno-lint-ignore no-explicit-any
async function createReceptionistSession(supabaseAdmin: any, receptionistId: string, name: string) {
  const email = receptionistEmail(receptionistId)
  const internalPassword = crypto.randomUUID() + crypto.randomUUID()

  const { data: roleRow } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle()

  let userId: string | null = roleRow?.user_id ?? null
  let needsRole = !userId

  if (!userId) {
    // Puede existir el usuario de Auth sin rol (se le quitó al desactivarla)
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
      const users = list?.users ?? []
      userId = users.find((u: { email?: string }) => u.email === email)?.id ?? null
      if (users.length < 1000) break
    }
  }

  if (userId) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: internalPassword })
    if (error) {
      console.error("[staff-login] updateUserById:", error.message)
      return null
    }
  } else {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: internalPassword,
      email_confirm: true,
      app_metadata: { staff_role: "receptionist", receptionist_id: receptionistId },
      user_metadata: { full_name: name },
    })
    if (error || !created?.user) {
      console.error("[staff-login] createUser:", error?.message)
      return null
    }
    userId = created.user.id
    needsRole = true
  }

  if (needsRole) {
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      email,
      role: "receptionist",
      display_name: name,
    })
    if (roleError) {
      console.error("[staff-login] user_roles insert:", roleError.message)
      return null
    }
  }

  // Cliente aparte (anon, sin persistir) para no mezclar la sesión con el admin client
  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data, error } = await authClient.auth.signInWithPassword({ email, password: internalPassword })
  if (error || !data?.session) {
    console.error("[staff-login] signInWithPassword:", error?.message)
    return null
  }
  return data.session
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405)
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    const body = await req.json()
    const role = String(body.role || "")
    const identifier = String(body.identifier || "").trim()
    const password = String(body.password || "")

    const roleConfig = ROLE_TABLES[role]
    if (!roleConfig || !identifier || !password) {
      return jsonResponse({ error: "Datos incompletos" }, 400)
    }

    // Clave de rate limiting: distingue por superficie de login + identificador
    const rateKey = `${role}:${identifier.toLowerCase()}`

    const { data: recentAttempts } = await supabaseAdmin
      .from("login_attempts")
      .select("id")
      .eq("cedula", rateKey)
      .eq("success", false)
      .gte("attempted_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())

    if (recentAttempts && recentAttempts.length >= 5) {
      return jsonResponse({ error: "Demasiados intentos. Espera 10 minutos." }, 429)
    }

    const registerAttempt = (success: boolean) =>
      supabaseAdmin.from("login_attempts").insert({ cedula: rateKey, success })

    // ── Buscar cuenta ──────────────────────────────────────────────────────
    const lookupValue = role === "recepcion" ? identifier.toLowerCase() : identifier
    const selectCols =
      role === "recepcion"
        ? "id, name, password, active"
        : "id, name, email, cedula, password, active, must_change_password"

    const { data: record, error: dbError } = await supabaseAdmin
      .from(roleConfig.table)
      .select(selectCols)
      .eq(roleConfig.idColumn, lookupValue)
      .maybeSingle()

    if (dbError || !record) {
      await registerAttempt(false)
      return jsonResponse({ error: "Usuario o contraseña incorrectos" }, 401)
    }

    if (!record.active) {
      return jsonResponse({ error: "Esta cuenta está desactivada. Contacta a la administración." }, 403)
    }

    // ── Comparar contraseña server-side (soporta hashes legacy en texto plano) ──
    const isBcrypt = typeof record.password === "string" && record.password.startsWith("$2")
    const valid = isBcrypt
      ? await bcrypt.compare(password, record.password)
      : password === record.password

    if (!valid) {
      await registerAttempt(false)
      return jsonResponse({ error: "Usuario o contraseña incorrectos" }, 401)
    }

    // ── Auto-migrar contraseñas legacy en texto plano a bcrypt ─────────────
    if (!isBcrypt) {
      try {
        const hashed = await bcrypt.hash(password, 10)
        await supabaseAdmin.from(roleConfig.table).update({ password: hashed }).eq("id", record.id)
      } catch (e) {
        console.error(`[staff-login] auto-migrate password failed for ${role}:`, e)
      }
    }

    // ── Recepción: sesión real de Supabase Auth ────────────────────────────
    // La base exige sesión autenticada con rol en user_roles (RLS v42), así que
    // cada recepcionista tiene un usuario interno de Auth con rol 'receptionist'.
    if (role === "recepcion") {
      const session = await createReceptionistSession(supabaseAdmin, record.id, record.name)
      if (!session) {
        return jsonResponse({ error: "No se pudo iniciar la sesión. Intenta de nuevo." }, 500)
      }
      await registerAttempt(true)
      return jsonResponse({
        id: record.id,
        name: record.name,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }, 200)
    }

    await registerAttempt(true)

    return jsonResponse(
      {
        id: record.id,
        name: record.name,
        email: record.email,
        mustChangePw: !!record.must_change_password,
      },
      200
    )
  } catch (err) {
    console.error("staff-login error:", err)
    return jsonResponse({ error: "Error al iniciar sesión. Intenta de nuevo." }, 500)
  }
})
