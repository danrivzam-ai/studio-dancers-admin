import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ─── Foto de perfil desde el portal de alumnas ───────────────────────────────
// Antes el portal subía `avatars/{studentId}.jpg` directo con la anon key y una
// política de Storage abierta: cualquiera podía reemplazar la foto de cualquier
// alumna. Desde v47 el bucket no acepta escritura anónima; esta función valida
// cédula + 4 dígitos con rpc_client_login (incluye el límite de intentos de v46)
// y solo entonces sube la foto con el service role.
//
// Body: multipart/form-data { cedula, phoneLast4, studentId, file (image/jpeg) }

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

const MAX_BYTES = 1024 * 1024 // el portal comprime a 400px JPEG (~30–80 KB)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405)
  }

  try {
    const form = await req.formData()
    const cedula = String(form.get("cedula") || "")
    const phoneLast4 = String(form.get("phoneLast4") || "")
    const studentId = String(form.get("studentId") || "")
    const file = form.get("file")

    if (!UUID_RE.test(studentId) || !/^\d{4}$/.test(phoneLast4) || !(file instanceof File)) {
      return jsonResponse({ ok: false, error: "invalid_request" }, 400)
    }
    if (file.size > MAX_BYTES || !file.type.startsWith("image/")) {
      return jsonResponse({ ok: false, error: "invalid_file" }, 400)
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: students, error: loginError } = await supabaseAdmin.rpc("rpc_client_login", {
      p_cedula: cedula,
      p_phone_last4: phoneLast4,
    })
    if (loginError) {
      return jsonResponse({ ok: false, error: loginError.hint === "rate_limited" ? "rate_limited" : "auth_failed" }, 429)
    }
    // deno-lint-ignore no-explicit-any
    if (!(students || []).some((s: any) => s.id === studentId)) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403)
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(`${studentId}.jpg`, file, { upsert: true, contentType: "image/jpeg" })
    if (uploadError) throw uploadError

    return jsonResponse({ ok: true }, 200)
  } catch (err) {
    console.error("upload-avatar error:", err)
    return jsonResponse({ ok: false, error: "upload_failed" }, 500)
  }
})
