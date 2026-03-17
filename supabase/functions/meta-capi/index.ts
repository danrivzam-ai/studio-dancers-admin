import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const PIXEL_ID = Deno.env.get('META_PIXEL_ID')
const ACCESS_TOKEN = Deno.env.get('META_CAPI_TOKEN')
const API_VERSION = 'v21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!PIXEL_ID || !ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ success: false, error: 'Meta CAPI not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { event_name, event_id, user_data, custom_data } = await req.json()

    if (!event_name || !user_data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing event_name or user_data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'physical_store',
          event_id: event_id || `${event_name.toLowerCase()}_${Date.now()}`,
          user_data,
          custom_data: custom_data || {},
        },
      ],
    }

    const endpoint = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('[meta-capi] Meta API error:', result)
      return new Response(
        JSON.stringify({ success: false, error: 'Meta API error' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, events_received: result.events_received }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[meta-capi] Error:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
