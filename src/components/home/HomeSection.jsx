import { ChevronRight, MessageCircle } from 'lucide-react'

const TONE_CLASS = {
  danger: 'sd-status-danger',
  warn: 'sd-status-warn',
  ok: 'sd-status-ok',
  muted: 'text-ink-muted',
}

// Sección del inicio: tarjeta blanca con título estilo agenda, filas y pie "ver todas".
// Toda la tarjeta abre la lista filtrada (onOpen); los botones internos detienen el clic.
export function HomeSection({ icon: Icon, title, meta, metaTone = 'muted', onOpen, moreCount = 0, children }) {
  return (
    <section
      onClick={onOpen}
      className="sd-card mb-3 overflow-hidden cursor-pointer"
    >
      <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
        <h3 className="sd-section-title flex items-center gap-2 min-w-0">
          {Icon && <Icon size={14} className="shrink-0" />}
          <span className="truncate">{title}</span>
        </h3>
        {meta !== undefined && (
          <span className={`text-sm font-semibold tabular-nums shrink-0 ${TONE_CLASS[metaTone] || ''}`}>{meta}</span>
        )}
      </header>
      <div>{children}</div>
      {moreCount > 0 && (
        <div className="flex items-center justify-center gap-1 px-4 py-2.5 border-t border-line text-xs font-medium text-brand-ink">
          Ver {moreCount} más
          <ChevronRight size={14} />
        </div>
      )}
    </section>
  )
}

// Fila de alumna dentro de una sección: nombre, detalle, estado a la derecha y
// botón opcional de WhatsApp (área táctil de 40px).
export function HomeRow({ name, detail, status, tone = 'muted', onWhatsApp, whatsappTitle }) {
  return (
    <div className="sd-row !py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{name}</p>
        {detail && <p className="text-xs text-ink-muted truncate">{detail}</p>}
      </div>
      {status && (
        <span className={`text-xs font-semibold tabular-nums shrink-0 ${TONE_CLASS[tone] || ''}`}>{status}</span>
      )}
      {onWhatsApp && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onWhatsApp() }}
          className="shrink-0 w-10 h-10 -mr-2 flex items-center justify-center rounded-full text-ink-muted hover:text-[#1f7a4d] hover:bg-surface-alt"
          title={whatsappTitle || 'Enviar recordatorio por WhatsApp'}
          aria-label={whatsappTitle || 'Enviar recordatorio por WhatsApp'}
        >
          <MessageCircle size={17} />
        </button>
      )}
    </div>
  )
}
