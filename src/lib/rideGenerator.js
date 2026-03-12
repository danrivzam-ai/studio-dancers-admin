import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { getPaymentMethodLabel, getBuyerIdTypeLabel } from './sriUtils'

/**
 * Genera el RIDE (Representación Impresa del Documento Electrónico) como PDF
 * Formato estándar SRI Ecuador
 *
 * @param {object} invoice - Datos de la factura (con invoice_items)
 * @param {object} options - Opciones adicionales
 * @param {string} options.logoBase64 - Logo en base64 (opcional)
 * @returns {jsPDF} Documento PDF
 */
export function generateRidePDF(invoice, options = {}) {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  const pageWidth = 210
  const margin = 10
  const contentWidth = pageWidth - margin * 2
  const midX = pageWidth / 2

  let y = margin

  // =============================
  // SECCIÓN IZQUIERDA - EMISOR
  // =============================
  const leftWidth = contentWidth * 0.55
  const rightWidth = contentWidth * 0.42
  const rightX = margin + leftWidth + contentWidth * 0.03

  // Logo
  if (options.logoBase64) {
    try {
      doc.addImage(options.logoBase64, 'PNG', margin, y, 25, 25)
    } catch (e) {
      // Si falla el logo, continuar sin él
    }
  }

  // Datos del emisor
  const emisorX = margin + (options.logoBase64 ? 28 : 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.issuer_name || 'ADLAB STUDIO S.A.S.', emisorX, y + 4)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  let emisorY = y + 9
  if (invoice.issuer_trade_name) {
    doc.text(`Nombre Comercial: ${invoice.issuer_trade_name}`, emisorX, emisorY)
    emisorY += 4
  }

  // Dirección (multi-línea si es larga)
  const addressLines = doc.splitTextToSize(
    `Dir. Matriz: ${invoice.issuer_address || ''}`,
    leftWidth - (options.logoBase64 ? 30 : 2)
  )
  addressLines.forEach(line => {
    doc.text(line, emisorX, emisorY)
    emisorY += 3.5
  })

  doc.setFont('helvetica', 'bold')
  doc.text('Obligado a llevar contabilidad: SI', emisorX, emisorY)
  emisorY += 4

  // =============================
  // SECCIÓN DERECHA - FACTURA
  // =============================
  const boxTop = y
  const boxHeight = Math.max(emisorY - y, 35)

  // Recuadro
  doc.setDrawColor(0)
  doc.setLineWidth(0.5)
  doc.rect(rightX, boxTop, rightWidth, boxHeight)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  let rY = boxTop + 5

  doc.text(`R.U.C.: ${invoice.issuer_ruc || ''}`, rightX + 3, rY)
  rY += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('FACTURA', rightX + 3, rY)
  rY += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`No. ${invoice.invoice_number || ''}`, rightX + 3, rY)
  rY += 5

  // Clave de acceso (como texto, barcode en Fase B)
  doc.setFontSize(6)
  doc.text('CLAVE DE ACCESO:', rightX + 3, rY)
  rY += 3
  if (invoice.access_key) {
    doc.text(invoice.access_key, rightX + 3, rY)
  }
  rY += 4

  // Ambiente y emisión
  doc.setFontSize(7)
  const ambienteLabel = invoice.environment === '2' ? 'PRODUCCION' : 'PRUEBAS'
  doc.text(`Ambiente: ${ambienteLabel}`, rightX + 3, rY)
  rY += 3.5
  doc.text('Emisión: NORMAL', rightX + 3, rY)

  y = Math.max(emisorY, boxTop + boxHeight) + 5

  // =============================
  // DATOS DEL COMPRADOR
  // =============================
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(margin, y, contentWidth, 22)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const buyerY = y + 5
  const col2X = margin + contentWidth / 2

  doc.text(`Razón Social / Nombres: ${invoice.buyer_name || ''}`, margin + 3, buyerY)

  const idLabel = getBuyerIdTypeLabel(invoice.buyer_id_type)
  doc.text(`Identificación (${idLabel}): ${invoice.buyer_id_number || ''}`, margin + 3, buyerY + 5)

  // Fecha de emisión
  const emissionDate = invoice.created_at
    ? new Date(invoice.created_at).toLocaleDateString('es-EC', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      })
    : ''
  doc.text(`Fecha de Emisión: ${emissionDate}`, col2X, buyerY)

  if (invoice.buyer_address) {
    doc.text(`Dirección: ${invoice.buyer_address}`, margin + 3, buyerY + 10)
  }

  if (invoice.buyer_email) {
    doc.text(`Email: ${invoice.buyer_email}`, col2X, buyerY + 5)
  }

  y += 27

  // =============================
  // TABLA DE DETALLE
  // =============================
  const items = invoice.invoice_items || []
  const tableBody = items.map(item => [
    item.description || '',
    Number(item.quantity || 1).toFixed(2),
    `$${Number(item.unit_price || 0).toFixed(2)}`,
    '0%',
    `$${Number(item.subtotal || 0).toFixed(2)}`,
  ])

  doc.autoTable({
    startY: y,
    head: [['Descripción', 'Cant.', 'P. Unitario', 'IVA', 'Subtotal']],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [80, 80, 80],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.45 },
      1: { cellWidth: contentWidth * 0.10, halign: 'center' },
      2: { cellWidth: contentWidth * 0.15, halign: 'right' },
      3: { cellWidth: contentWidth * 0.10, halign: 'center' },
      4: { cellWidth: contentWidth * 0.20, halign: 'right' },
    },
  })

  y = doc.lastAutoTable.finalY + 5

  // =============================
  // TOTALES
  // =============================
  const totalsX = margin + contentWidth * 0.55
  const totalsWidth = contentWidth * 0.45
  const valueX = totalsX + totalsWidth - 3

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)

  const totals = [
    ['SUBTOTAL IVA 0%', `$${Number(invoice.subtotal_0 || 0).toFixed(2)}`],
    ['SUBTOTAL IVA 12%', `$${Number(invoice.subtotal_12 || 0).toFixed(2)}`],
    ['IVA 12%', `$${Number(invoice.iva_amount || 0).toFixed(2)}`],
    ['TOTAL', `$${Number(invoice.total || 0).toFixed(2)}`],
  ]

  totals.forEach(([label, value], i) => {
    const rowY = y + (i * 5)
    doc.rect(totalsX, rowY, totalsWidth, 5)
    doc.setFontSize(7)
    doc.setFont('helvetica', i === totals.length - 1 ? 'bold' : 'normal')
    doc.text(label, totalsX + 2, rowY + 3.5)
    doc.text(value, valueX, rowY + 3.5, { align: 'right' })
  })

  y += totals.length * 5 + 5

  // =============================
  // FORMA DE PAGO
  // =============================
  const paymentLabel = getPaymentMethodLabel(invoice.payment_method_sri)

  doc.autoTable({
    startY: y,
    head: [['Forma de Pago', 'Valor']],
    body: [[paymentLabel, `$${Number(invoice.total || 0).toFixed(2)}`]],
    margin: { left: margin, right: margin + contentWidth * 0.45 },
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: {
      fillColor: [80, 80, 80],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
  })

  y = doc.lastAutoTable.finalY + 5

  // =============================
  // INFORMACIÓN ADICIONAL
  // =============================
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('Información Adicional:', margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.text('Régimen General - ADLAB STUDIO S.A.S.', margin, y)
  y += 3.5

  if (invoice.buyer_email) {
    doc.text(`Email: ${invoice.buyer_email}`, margin, y)
    y += 3.5
  }
  if (invoice.buyer_phone) {
    doc.text(`Teléfono: ${invoice.buyer_phone}`, margin, y)
    y += 3.5
  }

  // Estado
  if (invoice.status === 'draft') {
    doc.setFontSize(14)
    doc.setTextColor(200, 200, 200)
    doc.setFont('helvetica', 'bold')
    doc.text('BORRADOR - SIN VALIDEZ TRIBUTARIA', midX, 140, { align: 'center', angle: 30 })
    doc.setTextColor(0, 0, 0)
  }

  if (invoice.authorization_number) {
    y += 5
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(`No. Autorización: ${invoice.authorization_number}`, margin, y)
    y += 3.5
    if (invoice.authorization_date) {
      const authDate = new Date(invoice.authorization_date).toLocaleString('es-EC')
      doc.text(`Fecha Autorización: ${authDate}`, margin, y)
    }
  }

  return doc
}

/**
 * Descarga el RIDE como PDF
 */
export function downloadRidePDF(invoice, options = {}) {
  const doc = generateRidePDF(invoice, options)
  const fileName = `Factura_${invoice.invoice_number?.replace(/\//g, '-') || 'borrador'}.pdf`
  doc.save(fileName)
  return fileName
}

/**
 * Obtiene el RIDE como blob para envío por WhatsApp/Email
 */
export function getRidePDFBlob(invoice, options = {}) {
  const doc = generateRidePDF(invoice, options)
  return doc.output('blob')
}
