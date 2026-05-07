import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Config ──────────────────────────────────────────────────────────────────
const FACTUPLAN_API_KEY  = Deno.env.get('FACTUPLAN_API_KEY')
const FACTUPLAN_BASE_URL = 'https://api-rest.factuplan.com.ec/v1'
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** Código SRI → tipo identificación Factuplan */
function toFactuplanIdType(sriCode: string): string {
  return ({ '04': 'RUC', '05': 'CEDULA', '06': 'PASSPORT', '07': 'FINAL_CONSUMER' } as Record<string, string>)[sriCode] ?? 'FINAL_CONSUMER'
}

/** Método de pago interno → código SRI */
function toPaymentCode(method: string): string {
  return ({ efectivo: '01', Efectivo: '01', transferencia: '20', Transferencia: '20', tarjeta: '19', Tarjeta: '19' } as Record<string, string>)[method] ?? '01'
}

/** Estado Factuplan → estado interno */
function toLocalStatus(fp: string): string {
  return ({ PROCESSING: 'processing', AUTHORIZED: 'authorized', COMPLETED: 'authorized', ERROR: 'draft', REJECTED: 'rejected' } as Record<string, string>)[fp] ?? 'draft'
}

/** Llama a Factuplan con manejo de errores estándar */
async function factuplanFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${FACTUPLAN_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FACTUPLAN_API_KEY}`,
      ...(init?.headers ?? {}),
    },
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

// ─── Handler principal ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!FACTUPLAN_API_KEY) {
      return json({ success: false, error: 'FACTUPLAN_API_KEY no configurado en Supabase secrets' })
    }

    const body = await req.json()
    const { action } = body
    const db = createClient(SUPABASE_URL, SUPABASE_KEY)

    // ── EMITIR FACTURA ──────────────────────────────────────────────────────
    if (action === 'emit') {
      const { payment, buyer, settings } = body

      // Construir payload para Factuplan
      const payload: Record<string, unknown> = {
        customer: {
          identificationType: toFactuplanIdType(buyer.idType ?? '07'),
          identification:     buyer.idNumber ?? '9999999999999',
          legalName:          (buyer.name ?? 'CONSUMIDOR FINAL').toUpperCase(),
          ...(buyer.email   ? { email:   buyer.email }   : {}),
          ...(buyer.address ? { address: buyer.address } : {}),
        },
        items: [{
          code:           'SERV-DANZA-001',
          description:    payment.description ?? 'Servicio de enseñanza de danza',
          quantity:       1,
          // El monto cobrado YA INCLUYE IVA 15% → enviamos la base imponible
          unitPrice:      Math.round((parseFloat(payment.amount) / 1.15) * 10000) / 10000,
          taxType:        'IVA_RATE',
          taxPercentage:  15,
        }],
        payments: [{
          method:   toPaymentCode(payment.paymentMethod ?? 'efectivo'),
          amount:   parseFloat(payment.amount),
          term:     0,
          timeUnit: 'days',
        }],
        additionalInfo: {
          ...(payment.studentName ? { Alumna: payment.studentName } : {}),
          ...(payment.courseName  ? { Programa: payment.courseName } : {}),
        },
        sendEmail: !!(buyer.email),
      }

      // Punto de emisión: UUID > códigos SRI > auto-detect
      if (settings?.factuplan_emission_point_id) {
        payload.emissionPointId = settings.factuplan_emission_point_id
      } else if (settings?.sri_establishment && settings?.sri_emission_point) {
        payload.establishment  = settings.sri_establishment   // '001'
        payload.emissionPoint  = settings.sri_emission_point  // '001'
      }
      // Si no hay ninguno: Factuplan auto-detecta (válido cuando hay un solo punto)

      const { ok, data: fp } = await factuplanFetch('/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (!ok) {
        console.error('[emitir-factura] Factuplan error:', fp)
        return json({ success: false, error: fp?.message ?? 'Error en Factuplan', code: fp?.code, details: fp })
      }

      // Guardar en tabla invoices
      const localStatus = toLocalStatus(fp.status)
      const { data: invoice, error: dbErr } = await db
        .from('invoices')
        .insert({
          factuplan_id:          fp.id,
          invoice_number:        fp.invoiceNumber ?? fp.number ?? '',
          access_key:            fp.accessKey ?? '',
          authorization_number:  fp.authorizationNumber ?? null,
          status:                localStatus,
          environment:           settings?.sri_environment ?? '2',
          issuer_ruc:            settings?.ruc ?? '',
          issuer_name:           'ADLAB STUDIO S.A.S.',
          issuer_trade_name:     settings?.name ?? 'Studio Dancers',
          issuer_address:        settings?.address ?? '',
          buyer_id_type:         buyer.idType ?? '07',
          buyer_id_number:       buyer.idNumber ?? '9999999999999',
          buyer_name:            (buyer.name ?? 'CONSUMIDOR FINAL').toUpperCase(),
          buyer_email:           buyer.email ?? null,
          buyer_phone:           buyer.phone ?? null,
          buyer_address:         buyer.address ?? null,
          // Precio total incluye IVA → desgloses para el SRI
          subtotal_0:            0,
          subtotal_12:           Math.round((parseFloat(payment.amount) / 1.15) * 100) / 100,
          iva_amount:            Math.round((parseFloat(payment.amount) - parseFloat(payment.amount) / 1.15) * 100) / 100,
          total:                 parseFloat(payment.amount),
          payment_method_sri:    toPaymentCode(payment.paymentMethod ?? 'efectivo'),
          payment_id:            payment.id ?? null,
          student_id:            payment.studentId ?? null,
        })
        .select()
        .single()

      if (dbErr) {
        console.error('[emitir-factura] DB error:', dbErr)
        return json({ success: false, error: 'Error al guardar factura en base de datos', details: dbErr })
      }

      // Guardar ítem de factura
      await db.from('invoice_items').insert({
        invoice_id: invoice.id,
        description: payment.description ?? 'Servicio de enseñanza de danza',
        quantity:    1,
        unit_price:  parseFloat(payment.amount),
        subtotal:    parseFloat(payment.amount),
        iva_rate:    0,
        iva_code:    '0',
      })

      return json({ success: true, data: invoice, factuplan: fp })
    }

    // ── VERIFICAR ESTADO ────────────────────────────────────────────────────
    if (action === 'status') {
      const { invoiceId, factuplanId } = body
      const { ok, data: fp } = await factuplanFetch(`/invoices/${factuplanId}/status`)

      if (!ok) return json({ success: false, error: fp?.message ?? 'Error al consultar estado' })

      const newStatus = toLocalStatus(fp.status)
      await db
        .from('invoices')
        .update({
          status:               newStatus,
          authorization_number: fp.authorizationNumber ?? null,
          ...(fp.authorizedAt ? { authorization_date: fp.authorizedAt } : {}),
        })
        .eq('id', invoiceId)

      return json({ success: true, status: fp.status, localStatus: newStatus, data: fp })
    }

    // ── OBTENER URLs DE DESCARGA ────────────────────────────────────────────
    if (action === 'download') {
      const { factuplanId } = body
      const { ok, data: fp } = await factuplanFetch(`/invoices/${factuplanId}/download`)

      if (!ok) return json({ success: false, error: fp?.message ?? 'Error al obtener enlace de descarga' })

      return json({ success: true, data: fp })
    }

    return json({ success: false, error: 'Acción no válida' }, 400)

  } catch (err) {
    console.error('[emitir-factura] Error inesperado:', err)
    return json({ success: false, error: String((err as Error).message) }, 500)
  }
})
