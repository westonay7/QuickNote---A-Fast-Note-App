// @ts-check
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function makePng(width, height, getPixel) {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (width * 4 + 1));
  let pos = 0;
  for (let y = 0; y < height; y++) {
    raw[pos++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      raw[pos++] = r;
      raw[pos++] = g;
      raw[pos++] = b;
      raw[pos++] = a;
    }
  }

  const idatData = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function renderIcon(size, isMaskable) {
  return makePng(size, size, (x, y, w, h) => {
    const nx = (x + 0.5) / w;
    const ny = (y + 0.5) / h;

    if (isMaskable) {
      const grad = 1 - ny * 0.15;
      const r = Math.round(79 * grad);
      const g = Math.round(70 * grad);
      const b = Math.round(229 * grad);

      const px = nx;
      const py = ny;
      const left = 0.26,
        right = 0.74,
        top = 0.22,
        bottom = 0.78,
        rad = 0.08;

      const dx = Math.max(left + rad - px, 0, px - (right - rad));
      const dy = Math.max(top + rad - py, 0, py - (bottom - rad));
      const dist = Math.sqrt(dx * dx + dy * dy);
      const insidePage =
        (px >= left && px <= right && py >= top && py <= bottom && dist <= rad) ||
        (px >= left + rad && px <= right - rad && py >= top && py <= bottom) ||
        (px >= left && px <= right && py >= top + rad && py <= bottom - rad);

      function onLine(lx1, lx2, ly, thick) {
        const ldx = Math.max(lx1 - px, 0, px - lx2);
        const ldy = Math.abs(py - ly);
        return Math.sqrt(ldx * ldx + ldy * ldy) <= thick / 2;
      }

      if (
        onLine(0.36, 0.64, 0.36, 0.045) ||
        onLine(0.36, 0.64, 0.49, 0.045) ||
        onLine(0.36, 0.52, 0.62, 0.045)
      ) {
        return [255, 255, 255, 255];
      }

      if (insidePage) {
        return [
          Math.round(r * 0.85 + 255 * 0.15),
          Math.round(g * 0.85 + 255 * 0.15),
          Math.round(b * 0.85 + 255 * 0.15),
          255,
        ];
      }

      return [r, g, b, 255];
    } else {
      const left = 0.06,
        right = 0.94,
        top = 0.06,
        bottom = 0.94,
        rad = 0.22;
      const dx = Math.max(left + rad - nx, 0, nx - (right - rad));
      const dy = Math.max(top + rad - ny, 0, ny - (bottom - rad));
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pixelSize = 1.2 / w;
      let alpha = 1;
      if (dist > rad) {
        alpha = Math.max(0, Math.min(1, 1 - (dist - rad) / pixelSize));
      }
      if (alpha <= 0) return [0, 0, 0, 0];

      const grad = 1 - ny * 0.18;
      const baseR = Math.round(79 * grad);
      const baseG = Math.round(70 * grad);
      const baseB = Math.round(229 * grad);

      function lineAlpha(lx1, lx2, ly, thick) {
        const ldx = Math.max(lx1 - nx, 0, nx - lx2);
        const ldy = Math.abs(ny - ly);
        const ldist = Math.sqrt(ldx * ldx + ldy * ldy);
        const radius = thick / 2;
        if (ldist <= radius - pixelSize) return 1;
        if (ldist >= radius + pixelSize) return 0;
        return (radius + pixelSize - ldist) / (2 * pixelSize);
      }

      const la1 = lineAlpha(0.28, 0.72, 0.35, 0.07);
      const la2 = lineAlpha(0.28, 0.72, 0.5, 0.07);
      const la3 = lineAlpha(0.28, 0.54, 0.65, 0.07);
      const lineA = Math.max(la1, la2, la3);

      const r = Math.round(baseR * (1 - lineA) + 255 * lineA);
      const g = Math.round(baseG * (1 - lineA) + 255 * lineA);
      const b = Math.round(baseB * (1 - lineA) + 255 * lineA);
      const finalA = Math.round(alpha * 255);
      return [r, g, b, finalA];
    }
  });
}

const pub = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(pub, 'pwa-192x192.png'), renderIcon(192, false));
fs.writeFileSync(path.join(pub, 'pwa-512x512.png'), renderIcon(512, false));
fs.writeFileSync(path.join(pub, 'pwa-maskable-512x512.png'), renderIcon(512, true));
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), renderIcon(180, false));
console.log('Generated PWA icon set in public/');
