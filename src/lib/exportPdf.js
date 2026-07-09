import { jsPDF } from 'jspdf'

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:        [10,  15,  30],   // near-black background
  surface:   [22,  30,  50],   // card surface
  border:    [40,  50,  75],   // subtle border
  accent:    [99,  102, 241],  // indigo
  white:     [255, 255, 255],
  muted:     [148, 163, 184],  // slate-400
  faint:     [71,  85,  105],  // slate-600
  green:     [52,  211, 153],
  red:       [248, 113, 113],
  yellow:    [251, 191,  36],
}

const PAGE_W = 210  // A4 mm
const PAGE_H = 297
const MARGIN = 16
const COL_W  = PAGE_W - MARGIN * 2

// ── Helpers ───────────────────────────────────────────────────────────────────
function rgb(doc, color) { doc.setTextColor(...color) }
function fill(doc, color) { doc.setFillColor(...color) }
function draw(doc, color) { doc.setDrawColor(...color) }

function rect(doc, x, y, w, h, color, radius = 3) {
  fill(doc, color)
  doc.roundedRect(x, y, w, h, radius, radius, 'F')
}

function hline(doc, y, color = C.border) {
  draw(doc, color)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
}

function badge(doc, text, x, y, bg, textColor = C.white) {
  const pad = 3
  doc.setFontSize(7)
  const tw = doc.getTextWidth(text)
  rect(doc, x, y - 3.5, tw + pad * 2, 5.5, bg, 2)
  rgb(doc, textColor)
  doc.text(text, x + pad, y)
  return x + tw + pad * 2 + 2
}

function section(doc, title, y) {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  rgb(doc, C.muted)
  doc.text(title.toUpperCase(), MARGIN, y)
  hline(doc, y + 2, C.border)
  return y + 7
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function exportRouteCardPdf({ route, wall, gym, testers }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Background
  fill(doc, C.bg)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  let y = MARGIN

  // ── Header card ───────────────────────────────────────────────────────────
  rect(doc, MARGIN, y, COL_W, 28, C.surface)

  // App name
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  rgb(doc, C.faint)
  doc.text('SetterCanvas · Route Card', MARGIN + 4, y + 5)

  // Route name
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  rgb(doc, C.white)
  const routeName = route.name || 'Unnamed Route'
  doc.text(routeName, MARGIN + 4, y + 15)

  // Gym / wall breadcrumb
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  rgb(doc, C.muted)
  const breadcrumb = [gym?.name, wall?.name].filter(Boolean).join(' › ')
  if (breadcrumb) doc.text(breadcrumb, MARGIN + 4, y + 22)

  // Grade badge (top-right)
  if (route.grade) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    rgb(doc, C.accent)
    const gradeW = doc.getTextWidth(route.grade)
    doc.text(route.grade, PAGE_W - MARGIN - 4 - gradeW, y + 15)
  }

  y += 34

  // ── Core info ─────────────────────────────────────────────────────────────
  y = section(doc, 'Route Info', y)

  const fields = [
    ['Status',   route.status ? route.status.charAt(0).toUpperCase() + route.status.slice(1) : '—'],
    ['Type',     route.routeType || '—'],
    ['Tape',     route.tapeColor || '—'],
    ['Setter',   route.setter   || '—'],
    ['Date set', route.dateSet  || '—'],
    ['Wall',     wall?.name     || '—'],
    ['Angle',    wall?.angle    || '—'],
  ]

  const colW2 = COL_W / 2 - 3
  fields.forEach(([label, value], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = MARGIN + col * (colW2 + 6)
    const fy = y + row * 9

    // Label
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    rgb(doc, C.faint)
    doc.text(label, x, fy)

    // Value
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    rgb(doc, C.white)
    doc.text(value, x, fy + 4.5)
  })

  y += Math.ceil(fields.length / 2) * 9 + 4

  // Style tags
  if (route.styleTags?.length > 0) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    rgb(doc, C.faint)
    doc.text('Style', MARGIN, y)
    y += 4

    let tagX = MARGIN
    route.styleTags.forEach(tag => {
      if (tagX + 25 > PAGE_W - MARGIN) { tagX = MARGIN; y += 7 }
      tagX = badge(doc, tag, tagX, y, C.surface)
    })
    y += 9
  }

  hline(doc, y)
  y += 6

  // ── Testing summary ───────────────────────────────────────────────────────
  if (testers && testers.length > 0) {
    y = section(doc, 'Testing Summary', y)

    const passed  = testers.filter(t => t.completed === 'Yes').length
    const partial = testers.filter(t => t.completed === 'Partial').length
    const failed  = testers.length - passed - partial

    // Summary boxes
    const boxW = COL_W / 3 - 3
    const boxes = [
      { label: 'Testers', value: testers.length, color: C.surface },
      { label: 'Passed',  value: passed,          color: [20, 60, 40] },
      { label: 'Failed',  value: failed,           color: [60, 20, 20] },
    ]
    boxes.forEach(({ label, value, color }, i) => {
      const bx = MARGIN + i * (boxW + 4.5)
      rect(doc, bx, y, boxW, 14, color)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      rgb(doc, i === 1 ? C.green : i === 2 ? C.red : C.white)
      doc.text(String(value), bx + boxW / 2, y + 9, { align: 'center' })
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      rgb(doc, C.muted)
      doc.text(label, bx + boxW / 2, y + 13, { align: 'center' })
    })
    y += 20

    // Tester entries
    testers.forEach(t => {
      if (y > PAGE_H - 30) { doc.addPage(); fill(doc, C.bg); doc.rect(0, 0, PAGE_W, PAGE_H, 'F'); y = MARGIN }

      rect(doc, MARGIN, y, COL_W, t.feedback ? 16 : 11, C.surface)

      // Name + completed
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      rgb(doc, C.white)
      doc.text(t.name || 'Unknown', MARGIN + 3, y + 5)

      const completedColor = t.completed === 'Yes' ? [20,60,40] : t.completed === 'Partial' ? [60,50,10] : [60,20,20]
      badge(doc, t.completed, PAGE_W - MARGIN - 22, y + 5, completedColor)

      // Meta
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      rgb(doc, C.muted)
      const meta = [t.ability, t.height ? `${t.height}cm` : null, t.date].filter(Boolean).join(' · ')
      doc.text(meta, MARGIN + 3, y + 9.5)

      // Feedback
      if (t.feedback) {
        doc.setFontSize(7.5)
        rgb(doc, C.faint)
        const lines = doc.splitTextToSize(`"${t.feedback}"`, COL_W - 6)
        doc.text(lines[0], MARGIN + 3, y + 14)
      }

      y += t.feedback ? 19 : 14
    })
  } else {
    // No testers
    y = section(doc, 'Testing Summary', y)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    rgb(doc, C.faint)
    doc.text('No testers logged for this route.', MARGIN, y)
    y += 10
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  hline(doc, PAGE_H - 12)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  rgb(doc, C.faint)
  doc.text(`Generated by SetterCanvas · ${new Date().toLocaleDateString()}`, MARGIN, PAGE_H - 7)
  doc.text('Page 1', PAGE_W - MARGIN, PAGE_H - 7, { align: 'right' })

  // ── Save ───────────────────────────────────────────────────────────────────
  const filename = `${routeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_route_card.pdf`
  doc.save(filename)
}
