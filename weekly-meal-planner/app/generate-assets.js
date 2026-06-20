/**
 * Run once: node generate-assets.js
 * Creates valid placeholder PNG assets so Expo prebuild succeeds.
 * Replace with real artwork before publishing to app stores.
 */
const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xff];
  return ((crc ^ 0xffffffff) >>> 0);
}

function chunk(type, data) {
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePNG(w, h, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const row = Buffer.alloc(1 + w * 3);
  row[0] = 0;
  for (let x = 0; x < w; x++) { row[1 + x*3] = r; row[2 + x*3] = g; row[3 + x*3] = b; }
  const raw = Buffer.concat(Array(h).fill(row));

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

fs.mkdirSync('assets', { recursive: true });

// Mediterranean teal icon (1024x1024)
const icon = makePNG(1024, 1024, 46, 134, 171);
fs.writeFileSync('assets/icon.png', icon);
fs.writeFileSync('assets/adaptive-icon.png', icon);
fs.writeFileSync('assets/favicon.png', makePNG(32, 32, 46, 134, 171));

// Warm cream splash screen (2048x2048)
fs.writeFileSync('assets/splash.png', makePNG(2048, 2048, 245, 240, 232));

console.log('Assets created successfully.');
