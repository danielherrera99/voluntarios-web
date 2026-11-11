// Cifrado simétrico autenticado para payloads QR de Voluntarios (VP26).
// Evita exponer DNI o nombres en texto plano al escanear el QR con cámaras externas o Google Lens.

const QR_PREFIX = 'VP26:';
const QR_SECRET = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_QR_SECRET) || 'CixVisitaPapal2026#DiocesisChiclayo!Secret';

// SHA-256 compacto puro JS (funciona 100% offline y en cualquier contexto HTTP/HTTPS)
const sha256Bytes = (inputBytes) => {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  const len = inputBytes.length;
  const bitLenHi = Math.floor((len * 8) / 0x100000000);
  const bitLenLo = (len * 8) >>> 0;
  const paddedLen = Math.ceil((len + 9) / 64) * 64;
  const buf = new Uint8Array(paddedLen);
  buf.set(inputBytes);
  buf[len] = 0x80;

  const view = new DataView(buf.buffer);
  view.setUint32(paddedLen - 8, bitLenHi, false);
  view.setUint32(paddedLen - 4, bitLenLo, false);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]);
  const W = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i += 1) {
    outView.setUint32(i * 4, H[i], false);
  }
  return out;
};

const toBase64Url = (bytes) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (str) => {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
};

const deriveKeystream = (secretBytes, ivBytes, length) => {
  const stream = new Uint8Array(length);
  let pos = 0;
  let counter = 0;
  while (pos < length) {
    const seed = new Uint8Array(secretBytes.length + ivBytes.length + 1);
    seed.set(secretBytes, 0);
    seed.set(ivBytes, secretBytes.length);
    seed[secretBytes.length + ivBytes.length] = counter & 0xff;
    const block = sha256Bytes(seed);
    const take = Math.min(block.length, length - pos);
    stream.set(block.subarray(0, take), pos);
    pos += take;
    counter += 1;
  }
  return stream;
};

const computeMac = (secretBytes, ivBytes, cipherBytes) => {
  const input = new Uint8Array(secretBytes.length + ivBytes.length + cipherBytes.length);
  input.set(secretBytes, 0);
  input.set(ivBytes, secretBytes.length);
  input.set(cipherBytes, secretBytes.length + ivBytes.length);
  return sha256Bytes(input).subarray(0, 4);
};

export const encryptVolunteerQrPayload = ({ dni, codigo }) => {
  const encoder = new TextEncoder();
  const plainObj = {
    d: String(dni || '').trim(),
    c: String(codigo || '').trim()
  };
  const plainBytes = encoder.encode(JSON.stringify(plainObj));
  const secretBytes = encoder.encode(QR_SECRET);

  const iv = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(iv);
  } else {
    for (let i = 0; i < iv.length; i += 1) iv[i] = Math.floor(Math.random() * 256);
  }

  const keystream = deriveKeystream(secretBytes, iv, plainBytes.length);
  const cipher = new Uint8Array(plainBytes.length);
  for (let i = 0; i < plainBytes.length; i += 1) {
    cipher[i] = plainBytes[i] ^ keystream[i];
  }

  const mac = computeMac(secretBytes, iv, cipher);
  const packed = new Uint8Array(iv.length + mac.length + cipher.length);
  packed.set(iv, 0);
  packed.set(mac, iv.length);
  packed.set(cipher, iv.length + mac.length);

  return `${QR_PREFIX}${toBase64Url(packed)}`;
};

// Decodifica QR cifrados (VP26:...), QR heredados en JSON plano o DNI/código directo
export const decodeVolunteerQrPayload = (rawText) => {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return { lookupTerm: '', format: 'empty' };

  if (trimmed.startsWith(QR_PREFIX)) {
    try {
      const packed = fromBase64Url(trimmed.slice(QR_PREFIX.length));
      if (packed.length <= 10) return { lookupTerm: trimmed, format: 'invalid' };
      const iv = packed.subarray(0, 6);
      const mac = packed.subarray(6, 10);
      const cipher = packed.subarray(10);

      const encoder = new TextEncoder();
      const secretBytes = encoder.encode(QR_SECRET);
      const expectedMac = computeMac(secretBytes, iv, cipher);
      for (let i = 0; i < 4; i += 1) {
        if (mac[i] !== expectedMac[i]) {
          return { lookupTerm: trimmed, format: 'invalid_mac' };
        }
      }

      const keystream = deriveKeystream(secretBytes, iv, cipher.length);
      const plain = new Uint8Array(cipher.length);
      for (let i = 0; i < cipher.length; i += 1) {
        plain[i] = cipher[i] ^ keystream[i];
      }

      const decoded = JSON.parse(new TextDecoder().decode(plain));
      const lookupTerm = String(decoded.d || decoded.c || '').trim();
      return {
        lookupTerm,
        dni: decoded.d || null,
        codigo: decoded.c || null,
        format: 'encrypted_v1'
      };
    } catch {
      return { lookupTerm: trimmed, format: 'invalid' };
    }
  }

  // Compatibilidad retroactiva con credenciales descargadas antes del cifrado
  try {
    const parsed = JSON.parse(trimmed);
    const lookupTerm = String(parsed.dni || parsed.codigo || '').trim();
    if (lookupTerm) {
      return {
        lookupTerm,
        dni: parsed.dni || null,
        codigo: parsed.codigo || null,
        format: 'legacy_json'
      };
    }
  } catch {}

  return { lookupTerm: trimmed, format: 'plain' };
};
