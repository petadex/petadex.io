// backend/src/lib/structureMetrics.js
//
// Parse assumed ESMFold2 quality archives (NPZ / single .npy) into JSON for the
// Folding Viewer. Soft-fails when S3 is private or schema differs.

import zlib from 'zlib';

const MAX_PAE_SIDE = 128;

/**
 * @param {Buffer} buf
 * @returns {Record<string, { data: Float32Array|Float64Array|Int32Array|Uint8Array, shape: number[] }>}
 */
export function parseNumpyArchive(buf) {
  if (!buf || buf.length < 8) {
    throw new Error('Empty metrics archive');
  }
  // ZIP / NPZ
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    return parseNpz(buf);
  }
  // Single .npy
  if (buf[0] === 0x93 && buf.toString('ascii', 1, 6) === 'NUMPY') {
    const arr = parseNpy(buf);
    return { array: arr };
  }
  throw new Error('Unrecognized metrics archive format');
}

/**
 * @param {Buffer} buf
 */
function parseNpy(buf) {
  if (buf[0] !== 0x93 || buf.toString('ascii', 1, 6) !== 'NUMPY') {
    throw new Error('Invalid .npy magic');
  }
  const major = buf[6];
  const headerLen = major === 1 ? buf.readUInt16LE(8) : buf.readUInt32LE(8);
  const headerOffset = major === 1 ? 10 : 12;
  const headerStr = buf.toString('ascii', headerOffset, headerOffset + headerLen);
  const descrMatch = headerStr.match(/'descr'\s*:\s*'([^']+)'/);
  const shapeMatch = headerStr.match(/'shape'\s*:\s*\(([^)]*)\)/);
  const fortranMatch = headerStr.match(/'fortran_order'\s*:\s*(True|False)/);
  if (!descrMatch || !shapeMatch) {
    throw new Error('Could not parse .npy header');
  }
  const descr = descrMatch[1];
  const shape = shapeMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number);
  const fortran = fortranMatch?.[1] === 'True';
  if (fortran) {
    throw new Error('Fortran-order arrays are not supported');
  }
  const dataOffset = headerOffset + headerLen;
  const typed = typedArrayFromDescr(descr, buf.subarray(dataOffset));
  return { data: typed, shape: shape.length ? shape : [typed.length] };
}

/**
 * Minimal ZIP local-file NPZ reader (store + deflate).
 * @param {Buffer} buf
 */
function parseNpz(buf) {
  const out = {};
  let offset = 0;
  while (offset + 30 <= buf.length) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const uncompSize = buf.readUInt32LE(offset + 22);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.toString('utf8', offset + 30, offset + 30 + nameLen);
    const dataStart = offset + 30 + nameLen + extraLen;
    const compressed = buf.subarray(dataStart, dataStart + compSize);
    let raw;
    if (method === 0) {
      raw = Buffer.from(compressed);
    } else if (method === 8) {
      raw = zlib.inflateRawSync(compressed);
      if (uncompSize && raw.length !== uncompSize) {
        // allow slight mismatch
      }
    } else {
      offset = dataStart + compSize;
      continue;
    }
    if (name.endsWith('.npy') && !name.includes('/')) {
      const key = name.replace(/\.npy$/, '');
      try {
        out[key] = parseNpy(raw);
      } catch {
        // skip bad member
      }
    } else if (name.endsWith('.npy')) {
      const base = name.split('/').pop().replace(/\.npy$/, '');
      try {
        out[base] = parseNpy(raw);
      } catch {
        // skip
      }
    }
    offset = dataStart + compSize;
  }
  if (!Object.keys(out).length) {
    throw new Error('NPZ contained no readable .npy members');
  }
  return out;
}

function typedArrayFromDescr(descr, dataBuf) {
  // e.g. '<f4', '<f8', '|i4' — copy into aligned typed arrays (NPZ slices may be unaligned)
  const little = descr[0] !== '>';
  const code = descr.slice(-2);
  const view = dataBuf;
  const dv = new DataView(view.buffer, view.byteOffset, view.byteLength);
  if (code === 'f4') {
    const n = Math.floor(view.length / 4);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = dv.getFloat32(i * 4, little);
    return out;
  }
  if (code === 'f8') {
    const n = Math.floor(view.length / 8);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = dv.getFloat64(i * 8, little);
    return out;
  }
  if (code === 'i4' || code === 'u4') {
    const n = Math.floor(view.length / 4);
    const out = new Int32Array(n);
    for (let i = 0; i < n; i++) out[i] = dv.getInt32(i * 4, little);
    return out;
  }
  throw new Error(`Unsupported dtype ${descr}`);
}

function scalarOf(entry) {
  if (!entry) return null;
  const { data } = entry;
  if (!data || !data.length) return null;
  return Number(data[0]);
}

function meanOf(entry) {
  if (!entry) return null;
  const { data } = entry;
  if (!data || !data.length) return null;
  let s = 0;
  for (let i = 0; i < data.length; i++) s += Number(data[i]);
  return s / data.length;
}

/**
 * Downsample square PAE matrix to at most MAX_PAE_SIDE.
 * @param {{ data: ArrayLike<number>, shape: number[] }} entry
 * @returns {number[][] | null}
 */
function paeMatrix(entry) {
  if (!entry) return null;
  const { data, shape } = entry;
  let n;
  if (shape.length === 2 && shape[0] === shape[1]) {
    n = shape[0];
  } else {
    n = Math.floor(Math.sqrt(data.length));
    if (n * n !== data.length) return null;
  }
  const step = Math.max(1, Math.ceil(n / MAX_PAE_SIDE));
  const outN = Math.ceil(n / step);
  const matrix = new Array(outN);
  for (let i = 0; i < outN; i++) {
    const row = new Array(outN);
    const si = Math.min(n - 1, i * step);
    for (let j = 0; j < outN; j++) {
      const sj = Math.min(n - 1, j * step);
      row[j] = Number(data[si * n + sj]);
    }
    matrix[i] = row;
  }
  return matrix;
}

/**
 * @param {Buffer} buf
 * @param {{ isCentroid?: boolean }} opts
 */
export function summarizeMetricsArchive(buf, { isCentroid = false } = {}) {
  const arrays = parseNumpyArchive(buf);
  // Single .npy fallback: treat as pLDDT vector
  if (arrays.array && !arrays.plddt) {
    arrays.plddt = arrays.array;
  }

  const plddt = arrays.plddt || arrays.pLDDT || arrays.lddt_pred;
  const ptm = arrays.ptm || arrays.pTM || arrays.predicted_tm;
  const pae = arrays.pae || arrays.PAE;
  const molprobity = arrays.molprobity || arrays.MolProbity;
  const lddt = arrays.lddt || arrays.lDDT;
  const tm = arrays.tm || arrays.TM || arrays.tm_score;
  const gdt = arrays.gdt_ts || arrays.gdt || arrays.GDT_TS;

  const plddtVec = plddt?.data
    ? Array.from(plddt.data.slice(0, Math.min(plddt.data.length, 4096)), Number)
    : null;

  return {
    available: true,
    mean_plddt: meanOf(plddt),
    ptm: scalarOf(ptm),
    molprobity: scalarOf(molprobity),
    length: plddt?.data?.length ?? (pae?.shape?.[0] ?? null),
    plddt: plddtVec,
    pae: paeMatrix(pae),
    experimental: {
      mean_lddt: meanOf(lddt),
      tm: scalarOf(tm),
      gdt_ts: scalarOf(gdt),
    },
    validated: false,
    is_centroid: Boolean(isCentroid),
    disclaimer: isCentroid
      ? 'For centroids / non-PDB predictions, these metrics can’t be validated against an experimental structure.'
      : 'Predicted confidence metrics; not experimental accuracy unless a PDB reference is available.',
  };
}

/**
 * Fetch metrics archive from URL; soft-fail JSON.
 * @param {string} url
 * @param {{ isCentroid?: boolean }} opts
 */
export async function fetchAndSummarizeMetrics(url, opts = {}) {
  if (!url) {
    return {
      available: false,
      reason: 'No metrics URL',
      mean_plddt: null,
      ptm: null,
      molprobity: null,
      pae: null,
      plddt: null,
      validated: false,
      disclaimer: opts.isCentroid
        ? 'For centroids / non-PDB predictions, these metrics can’t be validated against an experimental structure.'
        : null,
    };
  }
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(25000),
      headers: { Accept: '*/*' },
    });
    if (!res.ok) {
      return {
        available: false,
        reason: `HTTP ${res.status}`,
        metrics_url: url,
        mean_plddt: null,
        ptm: null,
        molprobity: null,
        pae: null,
        plddt: null,
        validated: false,
        is_centroid: Boolean(opts.isCentroid),
        disclaimer:
          'For centroids / non-PDB predictions, these metrics can’t be validated against an experimental structure.',
      };
    }
    const ab = await res.arrayBuffer();
    return {
      ...summarizeMetricsArchive(Buffer.from(ab), opts),
      metrics_url: url,
    };
  } catch (err) {
    return {
      available: false,
      reason: err.message || 'Fetch/parse failed',
      metrics_url: url,
      mean_plddt: null,
      ptm: null,
      molprobity: null,
      pae: null,
      plddt: null,
      validated: false,
      is_centroid: Boolean(opts.isCentroid),
      disclaimer:
        'For centroids / non-PDB predictions, these metrics can’t be validated against an experimental structure.',
    };
  }
}
