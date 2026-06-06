import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ─── Notificación server-side de transferencias nuevas (Telegram) ───────────
// El portal de alumnas (UploadComprobante.jsx) llamaba directamente a la API
// de Telegram usando VITE_TELEGRAM_TRANSFERS_BOT_TOKEN / CHAT_ID — variables
// que Vite empaqueta en el bundle público, exponiendo el token del bot a
// cualquiera que inspeccione el JS. Esta función mueve ese envío al servidor:
// el token se lee de `school_settings` con el service role y nunca llega
// al navegador.
//
// Body esperado: { studentName, amount, bankName, receiptNumber? }

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405)
  }

  try {
    const body = await req.json()
    const studentName   = String(body.studentName || "—").slice(0, 200)
    const amount        = Number(body.amount) || 0
    const bankName      = String(body.bankName || "Transferencia").slice(0, 100)
    const receiptNumber = body.receiptNumber ? String(body.receiptNumber).slice(0, 100) : ""

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: cfg } = await supabaseAdmin
      .from("school_settings")
      .select("telegram_transfers_bot_token, telegram_transfers_chat_id")
      .eq("id", 1)
      .single()

    const botToken = cfg?.telegram_transfers_bot_token
    const chatId   = cfg?.telegram_transfers_chat_id

    // Si no hay credenciales configuradas, simplemente no hay nada que notificar
    // (no es un error — el admin puede no haber activado esta función)
    if (!botToken || !chatId) {
      return jsonResponse({ ok: true, sent: false, reason: "telegram_not_configured" }, 200)
    }

    const hora  = new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", timeZone: "America/Guayaquil" })
    const fecha = new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "short", timeZone: "America/Guayaquil" })

    const text =
      `💸 *Nueva transferencia recibida*\n\n` +
      `👤 *Alumna:* ${studentName}\n` +
      `🏦 *Banco:* ${bankName}\n` +
      `💰 *Monto:* $${amount.toFixed(2)}` +
      (receiptNumber ? `\n🔢 *Comprobante:* ${receiptNumber}` : "") +
      `\n\n🕐 ${fecha} · ${hora}\n` +
      `_Revisa la sección de Transferencias en el sistema._`

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    })

    return jsonResponse({ ok: true, sent: tgRes.ok }, 200)
  } catch (err) {
    console.error("notify-transfer error:", err)
    // No bloquear el flujo del portal por un fallo de notificación
    return jsonResponse({ ok: false, sent: false }, 200)
  }
})
