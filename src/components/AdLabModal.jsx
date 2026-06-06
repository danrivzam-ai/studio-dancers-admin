import { useEffect } from 'react'

const ADLAB_URL = 'https://adlabec.com'
const ADLAB_WA  = 'https://wa.me/593961324949?text=Hola%2C+vi+el+demo+y+quiero+informacion'

export default function AdLabModal({ isOpen, onClose }) {
  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'adlab-bg-in 0.2s ease',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes adlab-bg-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes adlab-card-in {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .adlab-card {
          animation: adlab-card-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .adlab-btn-primary:hover  { opacity: 0.88; }
        .adlab-btn-secondary:hover { opacity: 0.78; }
        .adlab-btn-primary,
        .adlab-btn-secondary {
          transition: opacity 0.15s ease;
          cursor: pointer;
        }
        .adlab-close:hover { opacity: 0.6; }
        .adlab-close { transition: opacity 0.15s ease; cursor: pointer; }
      `}</style>

      {/* Tarjeta del modal */}
      <div
        data-adlab-modal
        className="adlab-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0a0f2c',
          border: '2px solid #fffb7a',
          borderRadius: '20px',
          maxWidth: '400px',
          width: '100%',
          overflow: 'hidden',
          fontFamily: '"Space Grotesk", sans-serif',
          position: 'relative',
        }}
      >
        {/* Botón cerrar */}
        <button
          className="adlab-close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#ffffff80',
            fontSize: '20px',
            lineHeight: 1,
            padding: '4px',
          }}
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Encabezado con degradado sutil */}
        <div style={{
          background: 'linear-gradient(135deg, #0e1540 0%, #0a0f2c 100%)',
          padding: '36px 28px 24px',
          textAlign: 'center',
          borderBottom: '1px solid #ffffff12',
        }}>
          {/* Badge DEMO */}
          <div style={{
            display: 'inline-block',
            background: '#fffb7a22',
            border: '1px solid #fffb7a55',
            borderRadius: '999px',
            padding: '4px 14px',
            marginBottom: '16px',
          }}>
            <span style={{
              color: '#fffb7a',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              Sitio de demostración
            </span>
          </div>

          {/* Logo/Marca */}
          <div style={{ marginBottom: '10px' }}>
            <span style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}>
              ADLAB
            </span>
            <span style={{
              color: '#fffb7a',
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}>
              {' '}STUDIO
            </span>
          </div>

          <p style={{
            color: '#ffffffcc',
            fontSize: '15px',
            fontWeight: 700,
            margin: '0 0 6px',
            lineHeight: 1.3,
          }}>
            ¿Te gustó lo que ves?
          </p>
          <p style={{
            color: '#ffffff80',
            fontSize: '13px',
            fontWeight: 400,
            margin: 0,
            lineHeight: 1.5,
          }}>
            Este sistema fue diseñado y desarrollado por ADLAB STUDIO — la agencia digital que construye herramientas a la medida para tu negocio.
          </p>
        </div>

        {/* Cuerpo con CTAs */}
        <div style={{ padding: '24px 28px 20px' }}>
          {/* CTA primario */}
          <a
            href={ADLAB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="adlab-btn-primary"
            style={{
              display: 'block',
              width: '100%',
              padding: '14px',
              background: '#fffb7a',
              color: '#0a0f2c',
              borderRadius: '12px',
              textAlign: 'center',
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              textDecoration: 'none',
              marginBottom: '10px',
            }}
          >
            Ver nuestro portafolio →
          </a>

          {/* CTA secundario */}
          <a
            href={ADLAB_WA}
            target="_blank"
            rel="noopener noreferrer"
            className="adlab-btn-secondary"
            style={{
              display: 'block',
              width: '100%',
              padding: '13px',
              background: 'transparent',
              color: '#ffffff',
              border: '1.5px solid #ffffff30',
              borderRadius: '12px',
              textAlign: 'center',
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            💬 Chatear por WhatsApp
          </a>
        </div>

        {/* Pie del modal */}
        <div style={{
          borderTop: '1px solid #ffffff10',
          padding: '12px 28px',
          textAlign: 'center',
        }}>
          <p style={{
            color: '#ffffff40',
            fontSize: '11px',
            fontWeight: 500,
            margin: 0,
            fontFamily: '"Space Grotesk", sans-serif',
          }}>
            Esta página es una demo —{' '}
            <a
              href={ADLAB_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#fffb7a80', textDecoration: 'none' }}
            >
              adlabec.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
