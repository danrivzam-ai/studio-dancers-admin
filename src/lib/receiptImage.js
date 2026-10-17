import { toPng } from 'html-to-image'

/** Captura el comprobante como PNG (incluye el logo si el servidor lo permite). */
export async function downloadReceiptImage(node, filename) {
  const base = { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true, skipFonts: true }
  let dataUrl
  try {
    dataUrl = await toPng(node, base)
  } catch {
    // Logo externo bloqueado (CORS): se genera sin imágenes externas
    dataUrl = await toPng(node, {
      ...base,
      filter: (n) => !(n.tagName === 'IMG' && n.src && !n.src.startsWith('data:')),
    })
  }
  const link = document.createElement('a')
  link.download = filename.replace(/\s+/g, '_')
  link.href = dataUrl
  link.click()
}

