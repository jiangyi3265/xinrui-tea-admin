// Minimal dependency-free .xlsx writer (one sheet, text and numbers) so the
// statement can be exported to Excel without adding a package.
const encoder = new TextEncoder()
const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0 }
  return table
})()
function crc32(bytes) { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const escapeXml = value => String(value).replace(/[<>&'"\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch] || ''))
function columnName(index) { let name = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name; return name }

// Stored (uncompressed) zip: simple and accepted by Excel, WPS and Numbers.
function zip(files) {
  const chunks = [], central = []
  let offset = 0
  const u16 = value => [value & 0xff, (value >>> 8) & 0xff]
  const u32 = value => [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]
  for (const [name, text] of files) {
    const nameBytes = encoder.encode(name), data = encoder.encode(text), crc = crc32(data)
    const local = Uint8Array.from([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0)])
    chunks.push(local, nameBytes, data)
    central.push(Uint8Array.from([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nameBytes)
    offset += local.length + nameBytes.length + data.length
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0)
  const end = Uint8Array.from([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), ...u16(0)])
  const all = [...chunks, ...central, end]
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0))
  let position = 0
  for (const part of all) { out.set(part, position); position += part.length }
  return out
}

// rows: array of arrays; numbers stay numeric, everything else is text.
export function buildXlsx(rows, sheetName = 'Sheet1', widths = []) {
  const cols = widths.length ? '<cols>' + widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>' : ''
  const data = rows.map((row, r) => '<row r="' + (r + 1) + '">' + row.map((value, c) => {
    const ref = columnName(c) + (r + 1)
    if (value === null || value === undefined || value === '') return ''
    return typeof value === 'number' && Number.isFinite(value) ? `<c r="${ref}"><v>${value}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
  }).join('') + '</row>').join('')
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  return zip([
    ['[Content_Types].xml', head + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', head + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', head + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${data}</sheetData></worksheet>`]
  ])
}

export async function downloadXlsx(filename, rows, sheetName, widths) {
  const { saveAs } = await import('file-saver')
  saveAs(new Blob([buildXlsx(rows, sheetName, widths)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}
