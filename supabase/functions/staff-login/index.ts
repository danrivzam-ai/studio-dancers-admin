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

    await registerAttempt(true)

    // ── Responder solo con datos seguros (nunca el hash) ───────────────────
    if (role === "recepcion") {
      return jsonResponse({ id: record.id, name: record.name }, 200)
    }

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
