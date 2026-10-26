/** Minimal ZIP/DEFLATE implementation for portable, dependency-free release verification. */
import { deflateRawSync, inflateRawSync } from 'node:zlib';
const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1; table[n] = c >>> 0; }
export function crc32(bytes) { let value = 0xffffffff; for (const byte of bytes) value = table[(value ^ byte) & 255] ^ value >>> 8; return (value ^ 0xffffffff) >>> 0; }
export function safePath(name) {
  return typeof name === 'string' && name.length > 0 && !name.startsWith('/') && !name.includes('\\')
    && !name.includes('\0') && !/^[a-zA-Z]:/.test(name) && name.split('/').every(part => part && part !== '.' && part !== '..');
}
export function makeZip(entries) {
  if (!Array.isArray(entries) || entries.length > 65535) throw Error('ZIP64 is not supported');
  const locals = [], central = [], names = new Set(); let offset = 0;
  for (const entry of entries) {
    if (!safePath(entry.name) || names.has(entry.name)) throw Error(`Unsafe or duplicate ZIP path: ${entry.name}`);
    names.add(entry.name);
    const name = Buffer.from(entry.name, 'utf8'), data = Buffer.from(entry.data), compressed = deflateRawSync(data, { level: 9 });
    if (data.length >= 0xffffffff || compressed.length >= 0xffffffff || offset >= 0xffffffff) throw Error('ZIP64 is not supported');
    const crc = crc32(data), local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8); local.writeUInt16LE(33, 12); // 1980-01-01, reproducible timestamps
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    locals.push(local, name, compressed);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0); record.writeUInt16LE(0x0314, 4); record.writeUInt16LE(20, 6); record.writeUInt16LE(0x0800, 8);
    record.writeUInt16LE(8, 10); record.writeUInt16LE(33, 14); record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(compressed.length, 20); record.writeUInt32LE(data.length, 24); record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(0x81a40000, 38); record.writeUInt32LE(offset, 42);
    central.push(record, name); offset += local.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
export function readZip(input) {
  const zip = Buffer.from(input);
  if (zip.length < 22) throw Error('Truncated ZIP');
  let end = -1;
  for (let at = zip.length - 22; at >= Math.max(0, zip.length - 65557); at--) {
    if (zip.readUInt32LE(at) === 0x06054b50 && at + 22 + zip.readUInt16LE(at + 20) === zip.length) { end = at; break; }
  }
  if (end < 0 || zip.readUInt16LE(end + 4) || zip.readUInt16LE(end + 6)) throw Error('Unsupported ZIP directory');
  const count = zip.readUInt16LE(end + 10), size = zip.readUInt32LE(end + 12), directory = zip.readUInt32LE(end + 16);
  if (count !== zip.readUInt16LE(end + 8) || directory + size !== end) throw Error('Invalid ZIP central directory');
  const entries = new Map(); let cursor = directory, lastLocalEnd = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || zip.readUInt32LE(cursor) !== 0x02014b50) throw Error('Invalid ZIP entry');
    const flags = zip.readUInt16LE(cursor + 8), method = zip.readUInt16LE(cursor + 10), crc = zip.readUInt32LE(cursor + 16);
    const compressed = zip.readUInt32LE(cursor + 20), expanded = zip.readUInt32LE(cursor + 24), nameLength = zip.readUInt16LE(cursor + 28);
    const extraLength = zip.readUInt16LE(cursor + 30), commentLength = zip.readUInt16LE(cursor + 32), localAt = zip.readUInt32LE(cursor + 42);
    const after = cursor + 46 + nameLength + extraLength + commentLength;
    if (after > end || flags & 1 || ![0, 8].includes(method) || expanded > 512 * 1024 * 1024) throw Error('Unsafe or unsupported ZIP entry');
    const nameBytes = zip.subarray(cursor + 46, cursor + 46 + nameLength), name = nameBytes.toString('utf8');
    if (!safePath(name) || entries.has(name) || localAt < lastLocalEnd || localAt + 30 > directory || zip.readUInt32LE(localAt) !== 0x04034b50) throw Error(`Invalid ZIP path/header: ${name}`);
    const localNameLength = zip.readUInt16LE(localAt + 26), localExtra = zip.readUInt16LE(localAt + 28);
    const start = localAt + 30 + localNameLength + localExtra, stop = start + compressed;
    if (stop > directory || zip.readUInt16LE(localAt + 8) !== method || zip.readUInt16LE(localAt + 6) !== flags
      || zip.readUInt32LE(localAt + 14) !== crc || zip.readUInt32LE(localAt + 18) !== compressed
      || zip.readUInt32LE(localAt + 22) !== expanded
      || !zip.subarray(localAt + 30, localAt + 30 + localNameLength).equals(nameBytes)) throw Error(`ZIP header mismatch: ${name}`);
    const bytes = method === 8 ? inflateRawSync(zip.subarray(start, stop), { maxOutputLength: expanded || 1 }) : Buffer.from(zip.subarray(start, stop));
    if (bytes.length !== expanded || crc32(bytes) !== crc) throw Error(`ZIP integrity mismatch: ${name}`);
    entries.set(name, bytes); lastLocalEnd = stop; cursor = after;
  }
  if (cursor !== end || lastLocalEnd !== directory) throw Error('Unexpected bytes in ZIP structure');
  return entries;
}
