import { Unzip, UnzipInflate, zip, strToU8, strFromU8 } from 'fflate'
import { PROJECT_LIMITS as L } from './limits'
function error(): never { throw new Error('Invalid or unsafe Mapweaver ZIP structure or size limit.') }
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
function crc(bytes: Uint8Array) { let n = 0xffffffff; for (const b of bytes) n = crcTable[(n ^ b) & 255] ^ (n >>> 8); return (n ^ 0xffffffff) >>> 0 }
interface ZipEntry { name: string; size: number; compressed: number; checksum: number; offset: number; end: number }
function entries(bytes: Uint8Array, kind: 'project' | 'wallSet'): Map<string, ZipEntry> {
  if (bytes.length < 22 || bytes.length > L.archive) error()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const u16 = (n: number) => view.getUint16(n, true), u32 = (n: number) => view.getUint32(n, true)
  const checkExtra = (start: number, length: number) => {
    const end = start + length
    for (let cursor = start; cursor < end;) {
      if (cursor + 4 > end || u16(cursor) === 1) error() // ZIP64 is unsupported.
      const size = u16(cursor + 2)
      cursor += 4 + size
      if (cursor > end) error()
    }
  }
  let end = bytes.length - 22
  while (end >= Math.max(0, bytes.length - 65557) && u32(end) !== 0x06054b50) end--
  if (end < 0 || u32(end) !== 0x06054b50 || end + 22 + u16(end + 20) !== bytes.length || u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10)) error()
  const count = u16(end + 10), dir = u32(end + 16), length = u32(end + 12)
  if (!count || count > L.entries || dir + length !== end) error()
  const result = new Map<string, ZipEntry>(); let cursor = dir, total = 0
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || u32(cursor) !== 0x02014b50) error()
    const flags = u16(cursor + 8), method = u16(cursor + 10), compressed = u32(cursor + 20), size = u32(cursor + 24), n = u16(cursor + 28), extra = u16(cursor + 30), comment = u16(cursor + 32), offset = u32(cursor + 42)
    if (cursor + 46 + n + extra + comment > end || flags & ~0x808 || ![0, 8].includes(method) || u16(cursor + 34)) error()
    const name = strFromU8(bytes.subarray(cursor + 46, cursor + 46 + n))
    checkExtra(cursor + 46 + n, extra)
    if (!(kind === 'wallSet' ? /^(wall-set\.json|assets\/[A-Za-z0-9_-]{1,80}\.(png|webp))$/ : /^(project\.json|preview\.png|assets\/[A-Za-z0-9_-]{1,80}\.(png|jpg|webp))$/).test(name) || result.has(name)) error()
    const limit = name.endsWith('.json') ? L.json : name === 'preview.png' ? L.preview : L.image
    total += size
    if (!size || size > limit || total > L.unpacked || size > Math.max(1024, compressed) * L.ratio || offset + 30 > dir || u32(offset) !== 0x04034b50 || u16(offset + 6) !== flags || u16(offset + 8) !== method) error()
    const localName = u16(offset + 26), localExtra = u16(offset + 28), start = offset + 30 + localName + localExtra
    if (strFromU8(bytes.subarray(offset + 30, offset + 30 + localName)) !== name || start + compressed > dir) error()
    checkExtra(offset + 30 + localName, localExtra)
    const checksum = u32(cursor + 16)
    let dataEnd = start + compressed
    if (flags & 8) {
      if (dataEnd + 12 > dir) error()
      if (u32(dataEnd) === 0x08074b50) dataEnd += 4
      if (dataEnd + 12 > dir || u32(dataEnd) !== checksum || u32(dataEnd + 4) !== compressed || u32(dataEnd + 8) !== size) error()
      dataEnd += 12
    } else if (u32(offset + 14) !== checksum || u32(offset + 18) !== compressed || u32(offset + 22) !== size) error()
    result.set(name, { name, size, compressed, checksum, offset, end: dataEnd })
    cursor += 46 + n + extra + comment
  }
  const ranges = [...result.values()].sort((a, b) => a.offset - b.offset)
  if (cursor !== end || ranges[0].offset !== 0 || ranges.at(-1)!.end !== dir || ranges.some((entry, i) => i > 0 && entry.offset !== ranges[i - 1].end) || !result.has(kind === 'wallSet' ? 'wall-set.json' : 'project.json')) error()
  return result
}
export async function readZip(bytes: Uint8Array, kind: 'project' | 'wallSet' = 'project'): Promise<Map<string, Uint8Array>> {
  let metadata: Map<string, ZipEntry>
  try { metadata = entries(bytes, kind) } catch { return error() }
  const result = new Map<string, Uint8Array>(), seen = new Set<string>(); let total = 0
  const unzip = new Unzip((file) => {
    const expected = metadata.get(file.name)
    if (!expected || seen.has(file.name)) error()
    seen.add(file.name); let size = 0; const chunks: Uint8Array[] = []
    file.ondata = (cause, data, final) => {
      if (cause) throw cause
      size += data.length; total += data.length
      if (size > expected.size || total > L.unpacked) { file.terminate(); error() }
      chunks.push(data)
      if (final) {
        if (size !== expected.size) error()
        const output = new Uint8Array(size); let offset = 0
        for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length }
        if (crc(output) !== expected.checksum) error()
        result.set(file.name, output)
      }
    }
    file.start()
  })
  unzip.register(UnzipInflate)
  // Bounded compressed input chunks prevent a forged output length from allocating an entire bomb.
  for (let i = 0; i < bytes.length; i += 4096) {
    unzip.push(bytes.subarray(i, i + 4096), i + 4096 >= bytes.length)
    if (i % (256 * 1024) === 0) await new Promise((resolve) => setTimeout(resolve, 0))
  }
  if (result.size !== metadata.size) error()
  return result
}
export function writeZip(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  // Images are already compressed. STORE avoids expensive recompression and preserves bytes.
  return new Promise((resolve, reject) => zip(files, { level: 0 }, (error, data) => error ? reject(error) : data.length > L.archive ? reject(new Error('Project archive exceeds 128 MiB.')) : resolve(data)))
}
export { strToU8, strFromU8 }


