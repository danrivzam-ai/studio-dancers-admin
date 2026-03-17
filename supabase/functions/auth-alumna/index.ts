import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

// Genera un password determinístico: SHA-256(cedula + phone4 + secret)
async function derivePassword(cedula: string, phone4: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(cedula + phone4 + secret)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

Deno.serve(async (req: Request) => {
  // CORS preflight
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
    const cedula = (body.cedula || "").trim()
    const phone4 = (body.phone4 || "").trim()

    // ── Validar input ──────────────────────────────────────────
    if (!cedula || cedula.length < 5 || !phone4 || !/^\d{4}$/.test(phone4)) {
      return jsonResponse({ error: "Credenciales incorrectas" }, 401)
    }

    // ── Rate limiting: max 5 fallos en 10 min por cédula ──────
    const { data: recentAttempts } = await supabaseAdmin
      .from("login_attempts")
      .select("id")
      .eq("cedula", cedula)
      .eq("success", false)
      .gte("attempted_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())

    if (recentAttempts && recentAttempts.length >= 5) {
      return jsonResponse(
        { error: "Demasiados intentos. Espera 10 minutos." },
        429
      )
    }

    // ── Verificar credenciales via RPC existente ──────────────
    const { data: students, error: rpcError } = await supabaseAdmin.rpc(
      "rpc_client_login",
      { p_cedula: cedula, p_phone_last4: phone4 }
    )

    if (rpcError || !students || students.length === 0) {
      // Registrar intento fallido
      await supabaseAdmin
        .from("login_attempts")
        .insert({ cedula, success: false })
      return jsonResponse({ error: "Credenciales incorrectas" }, 401)
    }

    // ── Determinar email para el shadow user ──────────────────
    // Buscar is_minor y emails del primer student encontrado
    const studentIds = students.map((s: { id: string }) => s.id)
    const { data: studentDetails } = await supabaseAdmin
      .from("students")
      .select("id, is_minor, email, parent_email")
      .in("id", studentIds)
      .limit(1)
      .single()

    let email: string
    const isMinor = studentDetails?.is_minor ?? true

    if (isMinor && studentDetails?.parent_email) {
      email = studentDetails.parent_email
    } else if (!isMinor && studentDetails?.email) {
      email = studentDetails.email
    } else {
      // Placeholder si no hay email real
      email = `${cedula}@portal.studiodancers.app`
    }

    // ── Buscar o crear shadow user ────────────────────────────
    const secret = Deno.env.get("PORTAL_AUTH_SECRET") || "default-secret-change-me"
    const password = await derivePassword(cedula, phone4, secret)

    // Buscar usuario existente por email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email === email
    )

    if (!existingUser) {
      // Crear shadow user
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          portal_role: "alumna",
          tipo: isMinor ? "menor" : "adulta",
          cedula,
        },
      })

      if (createError) {
        console.error("Error creating shadow user:", createError.message)
        return jsonResponse({ error: "Credenciales incorrectas" }, 401)
      }
    }

    // ── Login con signInWithPassword ──────────────────────────
    let { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password })

    // Si falla (ej: phone cambió y password ya no coincide), actualizar password
    if (signInError && existingUser) {
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
      })
      // Reintentar login
      const retry = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      })
      signInData = retry.data
      signInError = retry.error
    }

    if (signInError || !signInData?.session) {
      await supabaseAdmin
        .from("login_attempts")
        .insert({ cedula, success: false })
      return jsonResponse({ error: "Credenciales incorrectas" }, 401)
    }

    // ── Registrar intento exitoso ─────────────────────────────
    await supabaseAdmin
      .from("login_attempts")
      .insert({ cedula, success: true })

    // ── Retornar sesión + estudiantes ─────────────────────────
    return jsonResponse(
      {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_in: signInData.session.expires_in,
        students,
      },
      200
    )
  } catch (err) {
    console.error("auth-alumna error:", err)
    return jsonResponse({ error: "Credenciales incorrectas" }, 401)
  }
})
