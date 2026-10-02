import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ─── Notificación server-side de transferencias nuevas (Telegram) ───────────
// El portal de alumnas llama a esta función justo después de
// rpc_client_submit_transfer, enviando solo el id de la solicitud.
// Los datos del mensaje se leen de la base (no del navegador), así que nadie
// puede usar la función para mandar texto arbitrario al grupo, y el token del
// bot se lee de `school_settings` con el service role: nunca llega al navegador.
//
// Body esperado: { requestId }
// - Solo notifica solicitudes recientes (≤ 15 min).
// - `telegram_notified_at` (v47) evita avisos repetidos.

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

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405)
  }

  try {
    const body = await req.json()
    const requestId = String(body.requestId || "")
    if (!UUID_RE.test(requestId)) {
      return jsonResponse({ ok: false, sent: false, reason: "invalid_request" }, 400)
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Reclamar la notificación de forma atómica: solo la primera llamada
    // sobre una solicitud reciente y no notificada obtiene la fila.
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: reqRow } = await supabaseAdmin
      .from("transfer_requests")
      .update({ telegram_notified_at: new Date().toISOString() })
      .eq("id", requestId)
      .is("telegram_notified_at", null)
      .gte("submitted_at", since)
      .select("amount, bank_name, receipt_number, notes, submitted_at, students(name)")
      .maybeSingle()

    if (!reqRow) {
      return jsonResponse({ ok: true, sent: false, reason: "not_found_or_already_notified" }, 200)
    }

    const { data: cfg } = await supabaseAdmin
      .from("school_settings")
      .select("telegram_transfers_bot_token, telegram_transfers_chat_id")
      .eq("id", 1)
      .single()

    const botToken = cfg?.telegram_transfers_bot_token
    const chatId   = cfg?.telegram_transfers_chat_id
    if (!botToken || !chatId) {
      return jsonResponse({ ok: true, sent: false, reason: "telegram_not_configured" }, 200)
    }

    // deno-lint-ignore no-explicit-any
    const studentName = String((reqRow as any).students?.name || "—")
    const amount = Number(reqRow.amount) || 0
    const submitted = new Date(reqRow.submitted_at)
    const hora  = submitted.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", timeZone: "America/Guayaquil" })
    const fecha = submitted.toLocaleDateString("es-EC", { day: "2-digit", month: "short", timeZone: "America/Guayaquil" })

    const text =
      `💸 <b>Nueva transferencia recibida</b>\n\n` +
      `👤 <b>Alumna:</b> ${escapeHtml(studentName)}\n` +
      `🏦 <b>Banco:</b> ${escapeHtml(reqRow.bank_name || "Transferencia")}\n` +
      `💰 <b>Monto:</b> $${amount.toFixed(2)}` +
      (reqRow.receipt_number ? `\n🔢 <b>Comprobante:</b> ${escapeHtml(String(reqRow.receipt_number))}` : "") +
      (reqRow.notes ? `\n📝 <b>Nota:</b> ${escapeHtml(String(reqRow.notes).slice(0, 300))}` : "") +
      `\n\n🕐 ${fecha} · ${hora}\n` +
      `<i>Revisa la sección de Transferencias en el sistema.</i>`

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    })

    return jsonResponse({ ok: true, sent: tgRes.ok }, 200)
  } catch (err) {
    console.error("notify-transfer error:", err)
    // No bloquear el flujo del portal por un fallo de notificación
    return jsonResponse({ ok: false, sent: false }, 200)
  }
})
