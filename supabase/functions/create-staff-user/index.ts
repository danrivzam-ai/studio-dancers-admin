import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ─── Alta de personal desde el panel (solo admin) ───────────────────────────
// Antes el admin agregaba el email en user_roles y la persona debía registrarse
// sola en el login (requería el registro público de Supabase habilitado, que
// permitía a cualquiera crearse una cuenta). Esta función:
//   1. Verifica que quien llama es admin (JWT + user_roles.role = 'admin')
//   2. Crea la cuenta de Auth con una contraseña temporal (o actualiza la
//      existente si la persona ya se había registrado sin rol vinculado)
//   3. Guarda el rol en user_roles con user_id vinculado (lo exige RLS v42)
// Así el registro público puede quedar desactivado.
//
// Body: { email, displayName, role, password }

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
}

const ALLOWED_ROLES = ["admin", "supervisor", "receptionist", "viewer", "contador"]

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
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
    // ── 1. Solo admin ──────────────────────────────────────────────────────
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
    const { data: caller } = await supabaseAdmin.auth.getUser(token)
    if (!caller?.user) return jsonResponse({ error: "No autorizado" }, 401)

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.user.id)
      .maybeSingle()
    if (callerRole?.role !== "admin") return jsonResponse({ error: "Solo un administrador puede crear usuarios" }, 403)

    // ── 2. Validar datos ───────────────────────────────────────────────────
    const body = await req.json()
    const email = String(body.email || "").trim().toLowerCase()
    const displayName = String(body.displayName || "").trim().slice(0, 120)
    const role = String(body.role || "")
    const password = String(body.password || "")

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ error: "Email inválido" }, 400)
    if (!displayName) return jsonResponse({ error: "El nombre es requerido" }, 400)
    if (!ALLOWED_ROLES.includes(role)) return jsonResponse({ error: "Rol inválido" }, 400)
    if (password.length < 8) return jsonResponse({ error: "La contraseña temporal debe tener al menos 8 caracteres" }, 400)

    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id")
      .ilike("email", email)
      .maybeSingle()
    if (existingRole?.user_id) return jsonResponse({ error: "Este email ya tiene acceso" }, 409)

    // ── 3. Cuenta de Auth: reutilizar si ya existe (registro sin rol) ──────
    let userId: string | null = null
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
      const users = list?.users ?? []
      userId = users.find((u: { email?: string }) => (u.email || "").toLowerCase() === email)?.id ?? null
      if (users.length < 1000) break
    }

    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      })
      if (error) throw error
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      })
      if (error || !created?.user) throw error || new Error("No se pudo crear la cuenta")
      userId = created.user.id
    }

    // El trigger handle_new_user_role pudo haber vinculado ya la fila pendiente
    const { data: pendingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .ilike("email", email)
      .maybeSingle()

    const roleData = { user_id: userId, email, role, display_name: displayName, updated_at: new Date().toISOString() }
    const { error: roleError } = pendingRole
      ? await supabaseAdmin.from("user_roles").update(roleData).eq("id", pendingRole.id)
      : await supabaseAdmin.from("user_roles").insert({ ...roleData, created_by: caller.user.id })
    if (roleError) throw roleError

    await supabaseAdmin.from("audit_log").insert({
      user_id: caller.user.id,
      action: "staff_user_created",
      table_name: "user_roles",
      record_id: userId,
      new_data: { email, role, display_name: displayName },
    })

    return jsonResponse({ success: true, userId }, 200)
  } catch (err) {
    console.error("create-staff-user error:", err)
    return jsonResponse({ error: "No se pudo crear el usuario. Intenta de nuevo." }, 500)
  }
})
