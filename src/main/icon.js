const zlib = require('zlib');

/**
 * Procedurally rendered "Mochi" mascot icon (same purple orb as in the UI).
 * Generated at runtime as a PNG so the project has no binary icon dependency and the
 * tray icon stays crisp (the previous placeholder was a flat blue square).
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const inEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

const LILAC = [192, 132, 252];
const INDIGO = [99, 102, 241];
const BLUE = [59, 130, 246];
const INK = [15, 23, 42];

/** Colour (r,g,b,a 0..1) of the mascot at normalised point (x, y). */
function shade(x, y) {
  const d = Math.hypot(x - 0.5, y - 0.5);
  if (d > 0.47) return null;

  const r = Math.hypot(x - 0.35, y - 0.3) / 0.75;
  let c = r < 0.5 ? mix(LILAC, INDIGO, r / 0.5) : mix(INDIGO, BLUE, clamp01((r - 0.5) / 0.5));

  // soft darkening towards the lower rim for depth (continuous, no seam)
  const lower = clamp01((y - 0.4) / 0.25);
  c = mix(c, [30, 27, 75], 0.35 * lower * clamp01((d - 0.22) / 0.25));

  // gloss highlight
  if (inEllipse(x, y, 0.36, 0.22, 0.13, 0.06)) c = mix(c, [255, 255, 255], 0.6);

  // eyes (white, dark pupil, tiny glint)
  for (const ex of [0.375, 0.625]) {
    if (inEllipse(x, y, ex, 0.5, 0.08, 0.105)) {
      c = [255, 255, 255];
      if (inEllipse(x, y, ex + 0.008, 0.525, 0.045, 0.06)) {
        c = INK;
        if (inEllipse(x, y, ex + 0.025, 0.5, 0.016, 0.016)) c = [255, 255, 255];
      }
    }
  }

  // smile
  const dx = x - 0.5;
  if (Math.abs(dx) < 0.08 && Math.abs(y - (0.69 - dx * dx * 6)) < 0.018) c = INK;

  return c;
}

function renderIcon(size) {
  const ss = size <= 64 ? 4 : 2; // supersampling per axis (anti-aliasing)
  const out = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = shade((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 1;
          }
        }
      }
      const i = (py * size + px) * 4;
      if (a > 0) {
        out[i] = Math.round(r / a);
        out[i + 1] = Math.round(g / a);
        out[i + 2] = Math.round(b / a);
        out[i + 3] = Math.round((a / (ss * ss)) * 255);
      }
    }
  }
  return encodePng(size, size, out);
}

const cache = new Map();

/** PNG buffer of the icon at `size` px (memoised). */
function iconPng(size) {
  if (!cache.has(size)) cache.set(size, renderIcon(size));
  return cache.get(size);
}

module.exports = { iconPng };
