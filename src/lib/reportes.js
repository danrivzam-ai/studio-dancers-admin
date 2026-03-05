import { supabase } from './supabase'

// ── Reportes pendientes / devueltos (para admin) ──────────────────
export async function getReportesPendientes() {
  const { data, error } = await supabase
    .from('reportes_ciclo')
    .select('*')
    .in('estado', ['pendiente', 'devuelto'])
    .order('fecha_generado', { ascending: false })
  return { data: data || [], error }
}

// ── Aprobar reporte ────────────────────────────────────────────────
export async function aprobarReporte(id) {
  const { error } = await supabase
    .from('reportes_ciclo')
    .update({ estado: 'aprobado', fecha_aprobado: new Date().toISOString() })
    .eq('id', id)
  return { error }
}

// ── Devolver reporte con nota ──────────────────────────────────────
export async function devolverReporte(id, nota) {
  const { error } = await supabase
    .from('reportes_ciclo')
    .update({ estado: 'devuelto', nota_devolucion: nota })
    .eq('id', id)
  return { error }
}
