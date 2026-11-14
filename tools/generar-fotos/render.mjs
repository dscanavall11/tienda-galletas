// Genera las fotos de las galletas (JPG) con un render procedural 2.5D:
// mapa de alturas + iluminación (difusa envolvente, especular, oclusión),
// pared lateral extruida, sombras suaves y fondo rosa con bokeh.
// Uso: node render.mjs <carpeta-salida> [slug ...]
// Con HOJA=1 también escribe _hoja.jpg (todas las fotos en una sola imagen) para revisarlas.
import fs from 'node:fs'
import path from 'node:path'
import jpeg from 'jpeg-js'

const W = 720
const H = 540
const CAM = 0.64 // aplastamiento del disco = seno de la elevación de la cámara

/* ---------- matemáticas ---------- */
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
const mix = (a, b, t) => a + (b - a) * t
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const lin = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.pow(c / 255, 2.2))
}
const mixC = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
const mulC = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
const norm3 = (v) => {
  const l = Math.hypot(v[0], v[1], v[2])
  return [v[0] / l, v[1] / l, v[2] / l]
}

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function h2(x, y, s) {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  n ^= n >>> 16
  return (n >>> 0) / 4294967296
}
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = h2(xi, yi, s)
  const b = h2(xi + 1, yi, s)
  const c = h2(xi, yi + 1, s)
  const d = h2(xi + 1, yi + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x, y, s = 0, oct = 4) {
  let v = 0
  let a = 0.5
  let f = 1
  let n = 0
  for (let i = 0; i < oct; i++) {
    v += a * vnoise(x * f, y * f, s + i * 17)
    n += a
    a *= 0.5
    f *= 2.03
  }
  return v / n
}

// Luz clave cálida desde arriba-izquierda-frente; rebote rosado de la mesa.
const LIGHT = norm3([-0.45, 0.3, 0.84])
const VIEW = norm3([0, Math.sqrt(1 - CAM * CAM), CAM])
const HALF = norm3([LIGHT[0] + VIEW[0], LIGHT[1] + VIEW[1], LIGHT[2] + VIEW[2]])
const SINC = CAM
const COSC = Math.sqrt(1 - CAM * CAM)
const AMB = [0.4, 0.29, 0.31]
const LC = [1.12, 0.99, 0.87]

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h)
  const out = new Float32Array(w * h)
  const d = 2 * r + 1
  const cl = (v, m) => (v < 0 ? 0 : v > m ? m : v)
  for (let y = 0; y < h; y++) {
    let s = 0
    for (let x = -r; x <= r; x++) s += src[y * w + cl(x, w - 1)]
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / d
      s += src[y * w + cl(x + r + 1, w - 1)] - src[y * w + cl(x - r, w - 1)]
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let y = -r; y <= r; y++) s += tmp[cl(y, h - 1) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / d
      s += tmp[cl(y + r + 1, h - 1) * w + x] - tmp[cl(y - r, h - 1) * w + x]
    }
  }
  return out
}

/* ---------- framebuffer ---------- */
function blendPx(fb, x, y, c, a) {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return
  const i = (y * W + x) * 3
  fb[i] = fb[i] * (1 - a) + c[0] * a
  fb[i + 1] = fb[i + 1] * (1 - a) + c[1] * a
  fb[i + 2] = fb[i + 2] * (1 - a) + c[2] * a
}
function addPx(fb, x, y, v) {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const i = (y * W + x) * 3
  fb[i] += v
  fb[i + 1] += v * 0.97
  fb[i + 2] += v * 0.93
}

/* ---------- fondo rosa con bokeh ---------- */
function fondo(fb, seed) {
  const r = rng(seed)
  const pared1 = lin('#ffe9f1')
  const pared2 = lin('#ffd2e2')
  const mesa1 = lin('#fbbfd4')
  const mesa2 = lin('#f0a0bf')
  const hz = H * 0.34
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const m = sstep(hz - 26, hz + 26, y)
      const pc = mixC(pared1, pared2, sstep(0, hz, y))
      const mc = mixC(mesa1, mesa2, sstep(hz, H, y))
      const c = mixC(pc, mc, m)
      const gl = Math.exp(-(((x - W * 0.2) / (W * 0.6)) ** 2 + ((y - 0) / (H * 0.55)) ** 2))
      const g =
        0.94 + 0.2 * gl + (fbm(x * 0.012, y * 0.012, seed, 3) - 0.5) * 0.06 + (vnoise(x * 0.8, y * 0.8, seed + 2) - 0.5) * 0.025 * m
      const i = (y * W + x) * 3
      fb[i] = c[0] * g
      fb[i + 1] = c[1] * g
      fb[i + 2] = c[2] * g
    }
  }
  const luz = lin('#fff5f9')
  for (let n = 0; n < 17; n++) {
    const bx = r() * W
    const by = r() * hz * 1.15
    const br = 14 + r() * 40
    const ba = 0.1 + r() * 0.17
    for (let y = Math.max(0, Math.floor(by - br)); y < Math.min(H, Math.ceil(by + br)); y++) {
      for (let x = Math.max(0, Math.floor(bx - br)); x < Math.min(W, Math.ceil(bx + br)); x++) {
        const d = Math.hypot(x - bx, y - by) / br
        if (d >= 1) continue
        blendPx(fb, x, y, luz, ba * (0.65 + 0.5 * sstep(0.55, 1, d)) * (1 - sstep(0.92, 1, d)))
      }
    }
  }
}

function sombra(fb, cx, cy, a, b, alpha, soft, tint = [0.42, 0.14, 0.22]) {
  const ex = a + soft * 2
  const ey = b + soft * 2
  const sf = soft / Math.sqrt(a * b)
  for (let y = Math.max(0, Math.floor(cy - ey)); y < Math.min(H, Math.ceil(cy + ey)); y++) {
    for (let x = Math.max(0, Math.floor(cx - ex)); x < Math.min(W, Math.ceil(cx + ex)); x++) {
      const d = Math.hypot((x - cx) / a, (y - cy) / b)
      const e = 1 - sstep(1 - sf, 1 + sf, d)
      if (e <= 0) continue
      const i = (y * W + x) * 3
      const s = e * alpha
      fb[i] *= 1 - s * (1 - tint[0])
      fb[i + 1] *= 1 - s * (1 - tint[1])
      fb[i + 2] *= 1 - s * (1 - tint[2])
    }
  }
}

/* ---------- formas ---------- */
const polyR = (th, n, rot, round) => {
  const m = Math.PI / n
  const s = (((th - rot) % (2 * m)) + 2 * m) % (2 * m)
  return mix(Math.cos(m) / Math.cos(s - m), 1, round)
}

// Distancia aproximada (<0 dentro) en coordenadas locales normalizadas.
function sdForma(f, a, b, seed) {
  if (f.shape === 'heart') {
    const X = a * 1.2
    const Y = -b * 1.2 + 0.25
    const t = X * X + Y * Y - 1
    const F = t * t * t - X * X * Y * Y * Y
    const fx = 6 * X * t * t - 2 * X * Y * Y * Y
    const fy = 6 * Y * t * t - 3 * X * X * Y * Y
    return F / Math.max(0.35, Math.hypot(fx, fy)) / 1.2
  }
  const r = Math.hypot(a, b)
  let lim = 1
  if (f.sides) {
    const m = Math.PI / f.sides
    const s = ((Math.atan2(b, a) % (2 * m)) + 2 * m) % (2 * m)
    lim = mix(Math.cos(m) / Math.cos(s - m), 1, f.round ?? 0.4)
  }
  if (f.wob) lim *= 1 + f.wob * (vnoise(a * 2.3 + f.u * 40, b * 2.3 + f.v * 40, seed + 3) - 0.5)
  return r - lim
}

// Pieza sobre la cara de la galleta (chip, pasa, avena, almendra...), en el
// plano (u, v) donde la galleta es el círculo unidad.
function stamp(B, f) {
  const { x0, y0, bw, bh, cx, cy, R, k, hh, cov, alb, spc, shn, seed } = B
  const ext = Math.max(f.rx, f.ry) * 1.35
  const xa = Math.max(x0, Math.floor(cx + (f.u - ext) * R))
  const xb = Math.min(x0 + bw, Math.ceil(cx + (f.u + ext) * R))
  const ya = Math.max(y0, Math.floor(cy + (f.v - ext) * R * k))
  const yb = Math.min(y0 + bh, Math.ceil(cy + (f.v + ext) * R * k))
  const cr = Math.cos(f.rot ?? 0)
  const sr = Math.sin(f.rot ?? 0)
  const pxu = Math.max(1, Math.min(f.rx, f.ry) * R * 0.9)
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const i = (y - y0) * bw + (x - x0)
      if (cov[i] < 0.5) continue
      const du = (x + 0.5 - cx) / R - f.u
      const dv = (y + 0.5 - cy) / (R * k) - f.v
      const a = (du * cr + dv * sr) / f.rx
      const b = (-du * sr + dv * cr) / f.ry
      const sd = sdForma(f, a, b, seed)
      const al = clamp(0.5 - sd * pxu)
      if (al <= 0) continue
      const d = clamp(-sd / (f.bevel ?? 0.45))
      const prof = Math.pow(d, f.pillow ?? 0.6)
      let hz = f.h * prof * (1 + 0.5 * ((f.fa ?? 0) * a + (f.fb ?? 0) * b))
      if (f.rough) hz += (vnoise(a * 5 + f.u * 33, b * 5 + f.v * 33, seed + 5) - 0.5) * f.rough * f.h * prof
      hh[i] += hz * al
      let col = f.col2 ? mixC(f.col, f.col2, 1 - sstep(0, f.edge ?? 0.35, d)) : f.col
      if (f.tex) col = mulC(col, 1 + (vnoise(a * (f.texF ?? 10), b * (f.texF ?? 10) * 0.25, seed + 1) - 0.5) * f.tex)
      alb[i * 3] = mix(alb[i * 3], col[0], al)
      alb[i * 3 + 1] = mix(alb[i * 3 + 1], col[1], al)
      alb[i * 3 + 2] = mix(alb[i * 3 + 2], col[2], al)
      if (al > 0.5) {
        spc[i] = f.spec ?? 0.2
        shn[i] = f.shin ?? 20
      }
    }
  }
}

/* ---------- disco: galleta (o cualquier pieza redonda) ---------- */
function disco(fb, o) {
  const { cx, cy, R, seed } = o
  const k = CAM
  const T = o.T ?? R * 0.2
  const irr = o.irr ?? 0.03
  const sx = o.stretch?.[0] ?? 1
  const sy = o.stretch?.[1] ?? 1
  const cr0 = Math.cos(o.rot ?? 0)
  const sr0 = Math.sin(o.rot ?? 0)

  // Radio del borde según el ángulo: irregular, festoneado o poligonal.
  const NA = 512
  const rim = new Float32Array(NA + 1)
  for (let i = 0; i <= NA; i++) {
    const th = (i / NA) * 2 * Math.PI - Math.PI
    let r = 1 + irr * (fbm(Math.cos(th) * 1.7 + seed, Math.sin(th) * 1.7 + seed * 0.37, seed, 3) - 0.5) * 2
    r += irr * 0.4 * (fbm(Math.cos(th) * 6.5 + seed, Math.sin(th) * 6.5 + seed * 0.7, seed + 5, 2) - 0.5) * 2
    if (o.lobes) r += (o.lobeAmp ?? 0.02) * Math.cos(o.lobes * th)
    if (o.poly) r *= polyR(th, o.poly.n, o.poly.rot ?? 0, o.poly.round ?? 0.4)
    rim[i] = r
  }
  const rimAt = (th) => {
    const f = ((th + Math.PI) / (2 * Math.PI)) * NA
    const i = Math.min(NA - 1, Math.floor(f))
    return mix(rim[i], rim[i + 1], f - i)
  }

  if (!o.noShadow) {
    const s = o.shadow ?? 1
    if (o.shadowBack) sombra(fb, cx + R * 0.2, cy - R * k * 0.05, R * 1.02, R * k * 0.9, 0.3, R * 0.16)
    sombra(fb, cx + R * 0.1, cy + T + R * k * 0.03, R * sx * 1.05, R * k * sy * 1.03, 0.38 * s, Math.max(1.5, R * 0.11))
    sombra(fb, cx, cy + T + 1, R * sx * 1.01, R * k * sy, 0.5 * s, Math.max(1.2, R * 0.03))
  }

  const rx = R * Math.max(sx, 1)
  const ry = R * k * Math.max(sy, 1)
  const pad = Math.ceil(R * 0.12) + 2
  const x0 = Math.max(0, Math.floor(cx - rx - pad))
  const x1 = Math.min(W, Math.ceil(cx + rx + pad))
  const y0 = Math.max(0, Math.floor(cy - ry - pad))
  const y1 = Math.min(H, Math.ceil(cy + ry + pad))
  const bw = x1 - x0
  const bh = y1 - y0
  if (bw <= 0 || bh <= 0) return
  const N = bw * bh
  const hh = new Float32Array(N)
  const cov = new Float32Array(N)
  const alb = new Float32Array(N * 3)
  const spc = new Float32Array(N)
  const shn = new Float32Array(N)
  const top = o.top
  const rimc = o.rimc ?? o.top
  const cs = o.cracks
  const fk = o.fork

  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x
      const ux = (x0 + x + 0.5 - cx) / R
      const vx = (y0 + y + 0.5 - cy) / (R * k)
      const u = (ux * cr0 + vx * sr0) / sx
      const v = (-ux * sr0 + vx * cr0) / sy
      const rho = Math.hypot(u, v)
      const rr = rho / rimAt(Math.atan2(v, u))
      const c = clamp((1 - rr) * R * Math.min(sx, sy) * 0.85 + 0.5)
      cov[i] = c
      if (c <= 0) continue
      const q = Math.min(rr, 1)
      let h = (o.dome ?? 0.16) * (1 - Math.pow(q, o.domePow ?? 2.4))
      h += (fbm(u * 3.6 + seed, v * 3.6, seed, 4) - 0.5) * (o.rough ?? 0.07)
      h += (fbm(u * 2.2 + seed, v * 2.2, seed + 13, 3) - 0.5) * 0.16 * (o.lump ?? 1)
      h += (vnoise(u * 30, v * 30, seed + 7) - 0.5) * (o.grain ?? 0.02)
      h += (vnoise(u * 75, v * 75, seed + 9) - 0.5) * 0.01
      let a = mixC(top, rimc, clamp(sstep(0.3, 1, q) + (fbm(u * 5, v * 5, seed + 11, 3) - 0.5) * 0.5))
      a = mulC(
        a,
        (0.84 + 0.32 * fbm(u * 3.4 + 3, v * 3.4, seed + 23, 3)) *
          (0.9 + 0.2 * fbm(u * 9 + 3, v * 9, seed + 21, 3)) *
          (vnoise(u * 55, v * 55, seed + 29) > 0.84 ? 0.86 : 1)
      )
      if (cs) {
        const sc = cs.scale ?? 3.2
        const crk = 1 - sstep(0, cs.w ?? 0.03, Math.abs(fbm(u * sc + seed, v * sc, seed + 9, 3) - 0.5))
        const m = crk * sstep(0.1, 0.4, rho) * (cs.amt ?? 1)
        h -= m * 0.04
        a = mixC(a, cs.col, clamp(m * 0.9))
      }
      if (fk) {
        const ca = Math.cos(fk.ang)
        const sa = Math.sin(fk.ang)
        let g = Math.pow(0.5 + 0.5 * Math.cos(fk.freq * (u * ca + v * sa)), 7)
        if (fk.cross) g = Math.max(g, Math.pow(0.5 + 0.5 * Math.cos(fk.freq * (-u * sa + v * ca)), 7))
        g *= sstep(0.95, 0.8, rho)
        h -= g * fk.depth
        a = mulC(a, 1 - g * 0.18)
      }
      hh[i] = h
      alb[i * 3] = a[0]
      alb[i * 3 + 1] = a[1]
      alb[i * 3 + 2] = a[2]
      spc[i] = o.spec ?? 0.07
      shn[i] = o.shin ?? 9
    }
  }

  const B = { x0, y0, bw, bh, cx, cy, R, k, hh, cov, alb, spc, shn, seed }
  for (const f of o.features ?? []) stamp(B, f)

  if (o.dust) {
    const dd = o.dust
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const i = y * bw + x
        if (cov[i] < 0.5 || spc[i] > 0.6) continue
        const u = (x0 + x + 0.5 - cx) / R
        const v = (y0 + y + 0.5 - cy) / (R * k)
        const m = clamp(dd.dens * (0.25 + 0.95 * fbm(u * 8 + seed, v * 8, seed + 5, 3)) * (0.35 + 1.3 * h2(x0 + x, y0 + y, seed + 8)) - 0.14)
        if (m <= 0) continue
        const t = m * 0.97
        alb[i * 3] = mix(alb[i * 3], dd.col[0], t)
        alb[i * 3 + 1] = mix(alb[i * 3 + 1], dd.col[1], t)
        alb[i * 3 + 2] = mix(alb[i * 3 + 2], dd.col[2], t)
        spc[i] *= 1 - m * 0.8
        hh[i] += m * 0.004
      }
    }
  }

  // Pared lateral: para cada píxel se busca hacia arriba (hasta T px) el borde
  // de la cara; esa distancia es la profundidad en la pared.
  const coverAt = (px, py) => {
    const ux = (px - cx) / R
    const vx = (py - cy) / (R * k)
    const u = (ux * cr0 + vx * sr0) / sx
    const v = (-ux * sr0 + vx * cr0) / sy
    const rr = Math.hypot(u, v) / rimAt(Math.atan2(v, u))
    return clamp((1 - rr) * R * Math.min(sx, sy) * 0.85 + 0.5)
  }
  const side = o.side ?? [top, mulC(top, 0.55)]
  const wc3 = (tt) => {
    if (side.length === 2) return mixC(side[0], side[1], tt)
    return tt < 0.5 ? mixC(side[0], side[1], tt * 2) : mixC(side[1], side[2], (tt - 0.5) * 2)
  }
  const yTop = Math.max(0, Math.floor(cy))
  const yBot = Math.min(H, Math.ceil(cy + ry + T + 2))
  for (let py = yTop; py < yBot; py++) {
    for (let px = x0; px < x1; px++) {
      const u = (px + 0.5 - cx) / (R * sx)
      if (Math.abs(u) > 1.06) continue
      let best = 0
      let tStar = 0
      for (let t = 0; t <= T + 1; t++) {
        const c = coverAt(px + 0.5, py + 0.5 - t)
        if (c > best) {
          best = c
          tStar = t
        }
        if (c >= 0.5) break
      }
      if (best <= 0 || tStar === 0 && best >= 0.5) continue
      const tt = clamp(tStar / T)
      const al = clamp(best * 2) * clamp(T + 1.5 - tStar)
      const uu = clamp(u, -1, 1)
      const nwy = Math.sqrt(1 - uu * uu)
      const crumb = 0.85 + 0.3 * vnoise(px * 0.8, py * 0.8, seed + 33)
      const diff = clamp((uu * LIGHT[0] + nwy * LIGHT[1] + 0.4) / 1.4) * crumb
      const tex = (0.8 + 0.4 * fbm(px * 0.07, py * 0.5, seed + 31, 3)) * (0.9 + 0.2 * vnoise(px * 0.9, py * 0.9, seed + 35))
      const pit = fbm(px * 0.3, py * 0.3, seed + 41, 2) > 0.7 ? 0.78 : 1
      const wc = wc3(tt)
      const aoW = 1 - 0.5 * Math.pow(tt, 1.7)
      const lit = 0.25 + 0.85 * diff
      const lip = 0.2 * (1 - sstep(0, 0.14, tt)) * (0.4 + diff)
      let spark = 0
      if (o.wallSparkle && h2(px, py, seed + 61) > 1 - o.wallSparkle) spark = 0.45
      let gl = 0
      if (o.wallGloss) {
        const g = o.wallGloss
        const nn = norm3([uu, nwy, (0.45 - tt) * g.bulge])
        gl = g.s * Math.pow(Math.max(0, nn[0] * HALF[0] + nn[1] * HALF[1] + nn[2] * HALF[2]), g.shin)
      }
      const col = [0, 1, 2].map((ch) => wc[ch] * tex * pit * (AMB[ch] * aoW * 0.8 + lit * LC[ch] * aoW) + lip * wc[ch] + spark + gl * LC[ch])
      blendPx(fb, px, py, col, al)
    }
  }

  // Cara superior iluminada.
  const hb = boxBlur(hh, bw, bh, Math.max(2, Math.round(R * 0.03)))
  const col = [0, 0, 0]
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x
      const c = cov[i]
      if (c <= 0) continue
      const xl = Math.max(0, x - 1)
      const xr = Math.min(bw - 1, x + 1)
      const yu = Math.max(0, y - 1)
      const yd = Math.min(bh - 1, y + 1)
      const hx = (hh[y * bw + xr] - hh[y * bw + xl]) * 0.5 * R
      const hy = (hh[yd * bw + x] - hh[yu * bw + x]) * 0.5 * R * k
      const il = 1 / Math.hypot(hx, hy, 1)
      const nx = -hx * il
      const ny = -hy * il
      const nz = il
      const diff = clamp((nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + 0.18) / 1.18)
      const ao = clamp(1 - (hb[i] - hh[i]) * (o.ao ?? 12), 0.42, 1)
      const nh = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2])
      const sp = spc[i] * Math.pow(nh, shn[i])
      for (let ch = 0; ch < 3; ch++) {
        col[ch] = alb[i * 3 + ch] * (AMB[ch] * ao + diff * LC[ch] * (0.5 + 0.5 * ao)) + sp * LC[ch]
      }
      blendPx(fb, x0 + x, y0 + y, col, c)
    }
  }

  if (o.sparkle) {
    const r = rng(seed + 99)
    for (let s = 0; s < o.sparkle; s++) {
      const a = r() * 6.2832
      const rr = Math.sqrt(r()) * 0.88
      const px = Math.round(cx + Math.cos(a) * rr * R)
      const py = Math.round(cy + Math.sin(a) * rr * R * k)
      const I = 0.3 + 0.55 * r()
      addPx(fb, px, py, I)
      addPx(fb, px + 1, py, I * 0.3)
      addPx(fb, px - 1, py, I * 0.3)
      addPx(fb, px, py + 1, I * 0.3)
      addPx(fb, px, py - 1, I * 0.3)
    }
  }
}

/* ---------- esfera brillante (frambuesas, uvas, bolitas) ---------- */
function esfera(fb, sx, sy, rad, albedo, spec, shin) {
  for (let y = Math.floor(sy - rad - 1); y <= Math.ceil(sy + rad + 1); y++) {
    for (let x = Math.floor(sx - rad - 1); x <= Math.ceil(sx + rad + 1); x++) {
      const dx = (x + 0.5 - sx) / rad
      const dy = (y + 0.5 - sy) / rad
      const d = Math.hypot(dx, dy)
      if (d > 1.05) continue
      const al = clamp((1 - d) * rad + 0.5)
      const nz = Math.sqrt(Math.max(0, 1 - Math.min(d, 1) ** 2))
      const n = [dx, dy * SINC + nz * COSC, -dy * COSC + nz * SINC]
      const diff = clamp((n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2] + 0.25) / 1.25)
      const nh = Math.max(0, n[0] * HALF[0] + n[1] * HALF[1] + n[2] * HALF[2])
      const ao = (0.55 + 0.45 * nz) * (1 - 0.4 * sstep(0.2, 1, dy))
      const col = [0, 1, 2].map((c) => albedo[c] * (AMB[c] * ao + diff * LC[c] * ao) + spec * Math.pow(nh, shin) * LC[c])
      blendPx(fb, x, y, col, al)
    }
  }
}

function frambuesa(fb, x, y, r, seed) {
  const rand = rng(seed)
  sombra(fb, x + r * 0.15, y + r * 0.68, r * 1.05, r * 0.4, 0.55, r * 0.2)
  const pts = []
  const n = 40
  for (let i = 0; i < n; i++) {
    const zz = 1 - ((i + 0.5) / n) * 0.9
    const rad = Math.sqrt(1 - zz * zz)
    const ph = i * 2.399963 + rand() * 0.3
    pts.push({ px: Math.cos(ph) * rad * 0.82, py: Math.sin(ph) * rad * 0.82, pz: zz * 0.78 })
  }
  for (const p of pts) {
    p.sx = x + p.px * r
    p.sy = y + (p.py * SINC - p.pz * COSC) * r
    p.depth = p.py * COSC + p.pz * SINC
  }
  pts.sort((a, b) => a.depth - b.depth)
  const rojo = [lin('#b8102f'), lin('#c8143a'), lin('#a30d2b')]
  for (const p of pts) esfera(fb, p.sx, p.sy, r * 0.27, rojo[Math.floor(rand() * 3)], 0.8, 70)
}

/* ---------- goteo de relleno (arequipe) ---------- */
function goteo(fb, x, ytop, len, w, col) {
  const rw = w / 2
  const bulb = w * 0.64
  const yEnd = ytop + len
  for (let y = Math.floor(ytop); y <= Math.ceil(yEnd + bulb); y++) {
    for (let px = Math.floor(x - bulb - 1); px <= Math.ceil(x + bulb + 1); px++) {
      const dx = px + 0.5 - x
      const dy = y + 0.5 - yEnd
      const dBulb = Math.hypot(dx, dy) - bulb
      const dSeg = y < yEnd ? Math.abs(dx) - rw * (1 - 0.18 * ((y - ytop) / len)) : 1e9
      const sd = Math.min(dBulb, dSeg)
      const al = clamp(0.5 - sd)
      if (al <= 0) continue
      const wr = y < yEnd ? rw : bulb
      const nx = clamp(dx / wr, -1, 1)
      const nzz = Math.sqrt(1 - nx * nx)
      const n = norm3([nx, nzz * 0.45, nzz * 0.55])
      const diff = clamp((n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2] + 0.3) / 1.3)
      const nh = Math.max(0, n[0] * HALF[0] + n[1] * HALF[1] + n[2] * HALF[2])
      const c = [0, 1, 2].map((ch) => col[ch] * (AMB[ch] + diff * LC[ch]) + 0.75 * Math.pow(nh, 45) * LC[ch])
      blendPx(fb, px, y, c, al)
    }
  }
}

/* ---------- materiales y piezas ---------- */
const MAT = {
  dorada: { top: lin('#dcad6e'), rimc: lin('#a8661f'), side: ['#b9792f', '#d29b57', '#9c6228'].map(lin) },
  cacao: { top: lin('#6a4030'), rimc: lin('#3c2117'), side: ['#4a2a1b', '#5e3827', '#2e170e'].map(lin) },
  avena: { top: lin('#d9ae70'), rimc: lin('#a67638'), side: ['#b98a49', '#d1a766', '#94662f'].map(lin) },
  mantequilla: { top: lin('#f1d092'), rimc: lin('#cf9a4e'), side: ['#d9a85e', '#ebc283', '#c0904c'].map(lin) },
  sable: { top: lin('#f3d9a8'), rimc: lin('#d9a558'), side: ['#e6c284', '#f2d9a8', '#d3a65e'].map(lin) },
  rellena: { top: lin('#eecb98'), rimc: lin('#cc9453'), side: ['#cf9a56', '#e1b574', '#a8773a'].map(lin) },
}
const CHOCO = ['#33190c', '#3d1f0f', '#2a1409', '#46250f'].map(lin)
const pickChoc = (r) => CHOCO[Math.floor(r() * CHOCO.length)]

function spread(rand, n, minD, maxR = 0.8) {
  const pts = []
  for (let i = 0; i < n; i++) {
    for (let t = 0; t < 60; t++) {
      const a = rand() * 6.2832
      const rr = Math.sqrt(rand()) * maxR
      const p = [Math.cos(a) * rr, Math.sin(a) * rr]
      if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > minD)) {
        pts.push(p)
        break
      }
    }
  }
  return pts
}

const chocolatePieza = (r, u, v, size, extra = {}) => {
  const rx = size * (0.9 + r() * 0.2)
  return {
    u, v, rx, ry: rx * (0.72 + r() * 0.3), rot: r() * 6.28, sides: 3 + Math.floor(r() * 3), round: 0.4, wob: 0.12,
    h: size * 0.65, bevel: 0.5, col: pickChoc(r), spec: 0.9, shin: 60, fa: (r() - 0.5) * 1.1, fb: (r() - 0.5) * 1.1, ...extra,
  }
}
const chocolateCharco = (r, u, v, size) => ({
  u, v, rx: size * 2.1, ry: size * 1.7, rot: r() * 6.28, sides: 0, wob: 0.35, h: 0.012, bevel: 0.9,
  col: lin('#4f2b15'), spec: 0.75, shin: 45,
})
const avenaPieza = (r, u, v, big = 1) => {
  const rx = (0.06 + r() * 0.03) * big
  return {
    u, v, rx, ry: rx * (0.5 + r() * 0.2), rot: r() * 6.28, sides: 0, wob: 0.15, h: 0.02 * big, bevel: 0.5,
    col: lin(r() < 0.5 ? '#efdcb0' : '#dcc18a'), col2: lin('#b98f55'), edge: 0.5, tex: 0.3, texF: 22, spec: 0.1, shin: 12,
    fa: (r() - 0.5) * 0.8, fb: (r() - 0.5) * 0.8,
  }
}
const pasaPieza = (r, u, v) => {
  const rx = 0.055 + r() * 0.02
  return {
    u, v, rx, ry: rx * (0.8 + r() * 0.25), rot: r() * 6.28, sides: 0, wob: 0.25, h: 0.05, bevel: 0.7, rough: 0.7,
    col: lin('#4f2638'), col2: lin('#2a121e'), edge: 0.4, spec: 0.6, shin: 35,
  }
}
const cocoPieza = (r, u, v) => ({
  u, v, rx: 0.06 + r() * 0.06, ry: 0.008 + r() * 0.007, rot: r() * 6.28, sides: 0, h: 0.012, bevel: 0.8,
  col: lin(r() < 0.35 ? '#d9a95e' : '#f7eed9'), spec: 0.06, shin: 10,
})
const almendraPieza = (r, u, v) => {
  const rx = 0.14 + r() * 0.04
  return {
    u, v, rx, ry: rx * 0.48, rot: r() * 6.28, sides: 0, wob: 0.06, h: 0.04, bevel: 0.45,
    col: lin('#efd8aa'), col2: lin('#a8733a'), edge: 0.55, tex: 0.25, texF: 16, spec: 0.2, shin: 18,
    fa: (r() - 0.5) * 0.9, fb: (r() - 0.5) * 0.9,
  }
}
function hilo(r, ang, n, amp, fase, ancho = 0.026) {
  const out = []
  const ca = Math.cos(ang)
  const sa = Math.sin(ang)
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * 2 - 1
    const a = t * 0.95
    const b = amp * Math.sin(t * Math.PI * 3.2 + fase)
    const u = a * ca - b * sa
    const v = a * sa + b * ca
    if (Math.hypot(u, v) > 0.88) continue
    out.push({ u, v, rx: ancho, ry: ancho, sides: 0, h: 0.0055, bevel: 1, col: lin('#2c1509'), spec: 0.95, shin: 90 })
  }
  return out
}

// Pinchazos de tenedor en anillos concéntricos (galleta de mantequilla).
function pinchazos(col) {
  const out = []
  const anillos = [[1, 0], [6, 0.28], [12, 0.56], [19, 0.84]]
  anillos.forEach(([n, rad], k) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.2832 + k * 0.3
      out.push({ u: Math.cos(a) * rad, v: Math.sin(a) * rad, rx: 0.026, ry: 0.026, sides: 0, h: -0.028, bevel: 0.7, col, spec: 0.04, shin: 8 })
    }
  })
  return out
}

/* ---------- escenas (una por producto) ---------- */
const ESCENAS = {
  'chispas-de-chocolate': {
    seed: 3,
    mat: 'dorada',
    sueltos: ['chip', 'chip', 'chip'],
    cookie: (r, hero) => {
      const pts = spread(r, hero ? 36 : 26, 0.125, 0.87)
      const features = []
      pts.forEach(([u, v], i) => {
        if (i % 12 === 3) features.push(chocolateCharco(r, u, v, 0.07))
        features.push(chocolatePieza(r, u, v, i % 7 === 0 ? 0.115 : 0.055 + r() * 0.03))
      })
      return { irr: 0.05, features }
    },
  },
  'doble-chocolate': {
    seed: 5,
    mat: 'cacao',
    sueltos: ['chip', 'chip', 'blanco'],
    cookie: (r, hero) => {
      const pts = spread(r, hero ? 15 : 10, 0.24, 0.82)
      const features = []
      pts.forEach(([u, v], i) => {
        if (i % 3 === 0) features.push(chocolateCharco(r, u, v, 0.1))
        if (i % 4 === 1) {
          features.push(chocolatePieza(r, u, v, 0.115, { col: lin('#f2e6c9'), spec: 0.5, shin: 40 }))
        } else {
          features.push(chocolatePieza(r, u, v, i % 3 === 0 ? 0.15 : 0.1))
        }
      })
      return { irr: 0.05, cracks: { amt: 0.7, w: 0.035, col: lin('#8c5c40'), scale: 3 }, features, spec: 0.14, shin: 16 }
    },
  },
  'choco-almendra': {
    seed: 7,
    mat: 'dorada',
    sueltos: ['almendra', 'almendra', 'chip'],
    cookie: (r, hero) => {
      const pts = spread(r, hero ? 15 : 10, 0.22, 0.82)
      const features = []
      pts.forEach(([u, v], i) => {
        if (i % 3 === 0) features.push(almendraPieza(r, u, v))
        else features.push(chocolatePieza(r, u, v, 0.085))
      })
      features.push(...hilo(r, 0.5 + r() * 0.5, hero ? 330 : 220, 0.34, r() * 6))
      return { irr: 0.05, features }
    },
  },
  'avena-y-pasas': {
    seed: 9,
    mat: 'avena',
    sueltos: ['pasa', 'pasa', 'avena'],
    cookie: (r, hero) => {
      const features = []
      for (const [u, v] of spread(r, hero ? 70 : 42, 0.1, 0.9)) features.push(avenaPieza(r, u, v))
      for (const [u, v] of spread(r, hero ? 8 : 6, 0.28, 0.78)) features.push(pasaPieza(r, u, v))
      return { rough: 0.1, features }
    },
  },
  'avena-y-coco': {
    seed: 13,
    mat: 'avena',
    sueltos: ['coco', 'coco', 'coco'],
    cookie: (r, hero) => {
      const features = []
      for (const [u, v] of spread(r, hero ? 22 : 14, 0.16, 0.88)) features.push(avenaPieza(r, u, v, 0.9))
      const n = hero ? 150 : 90
      for (let i = 0; i < n; i++) {
        const a = r() * 6.28
        const rr = Math.sqrt(r()) * 0.9
        features.push(cocoPieza(r, Math.cos(a) * rr, Math.sin(a) * rr))
      }
      return { rough: 0.09, features }
    },
  },
  'oatmeal-cookie': {
    seed: 17,
    mat: 'avena',
    sueltos: ['avena', 'avena', 'avena'],
    cookie: (r, hero) => {
      const features = []
      for (const [u, v] of spread(r, hero ? 34 : 22, 0.15, 0.9)) features.push(avenaPieza(r, u, v, 1.35))
      return { irr: 0.05, rough: 0.09, features, dust: { dens: 0.5, col: lin('#9a5326') }, sparkle: hero ? 60 : 30 }
    },
  },
  'mantequilla-clasica': {
    seed: 19,
    mat: 'mantequilla',
    sueltos: [],
    cookie: (r, hero) => ({
      irr: 0.018,
      rough: 0.04,
      dome: 0.14,
      sparkle: hero ? 90 : 45,
      wallSparkle: 0.01,
      features: pinchazos(lin('#b98d4e')),
    }),
  },
  'sable-de-mantequilla': {
    seed: 23,
    mat: 'sable',
    apilado: true,
    sueltos: [],
    cookie: (r, hero) => ({
      irr: 0.008,
      lobes: 18,
      lobeAmp: 0.022,
      rough: 0.025,
      dome: 0.1,
      grain: 0.02,
      sparkle: hero ? 120 : 60,
      wallSparkle: 0.05,
      features: [],
    }),
  },
  'rellena-de-arequipe': {
    seed: 29,
    mat: 'rellena',
    sandwich: 'arequipe',
    sueltos: [],
    cookie: () => ({}),
  },
  'rellena-de-frambuesa': {
    seed: 31,
    mat: 'rellena',
    sandwich: 'frambuesa',
    sueltos: [],
    cookie: () => ({}),
  },
}

function sandwich(fb, e, s, seed, rand) {
  const M = MAT[e.mat]
  const T1 = s.R * 0.11
  const Tf = s.R * 0.1
  const T2 = s.R * 0.12
  const base = s.cy
  const caramelo = e.sandwich === 'arequipe'
  const rellenoTop = caramelo ? lin('#b8702c') : lin('#a30f33')
  const rellenoRim = caramelo ? lin('#8f4f1b') : lin('#7a0a26')
  disco(fb, { ...M, cx: s.cx, cy: base, R: s.R, T: T1, seed, irr: 0.02, rough: 0.03, dome: 0.1, features: [] })
  disco(fb, {
    cx: s.cx, cy: base - Tf, R: s.R * 1.028, T: Tf, seed: seed + 3, irr: 0.05, rough: 0.02, dome: 0.03, noShadow: true,
    top: rellenoTop, rimc: rellenoRim, side: [rellenoTop, rellenoRim], spec: 0.85, shin: 55,
    wallGloss: { s: 0.9, shin: 36, bulge: 1.5 },
  })
  const features = []
  if (e.sandwich === 'frambuesa') {
    features.push({ shape: 'heart', u: 0, v: 0.02, rx: 0.52, ry: 0.52, rot: 0, h: -0.06, bevel: 0.1, col: lin('#c0123c'), col2: lin('#7d0a28'), edge: 0.3, spec: 0.95, shin: 150 })
  } else {
    features.push({ u: 0, v: 0, rx: 0.5, ry: 0.5, sides: 0, h: -0.012, bevel: 0.12, col: mulC(M.top, 0.92), spec: 0.07, shin: 9 })
    features.push(...hilo(rand, 0.45, 260, 0.3, rand() * 6, 0.024).map((f) => ({ ...f, col: lin('#b3641f') })))
  }
  disco(fb, {
    ...M, cx: s.cx, cy: base - Tf - T2, R: s.R, T: T2, seed: seed + 5, irr: 0.02, rough: 0.03, dome: 0.1, noShadow: true,
    dust: { dens: 1.05, col: lin('#fcf6ef') }, features, sparkle: 40,
  })
}

const SUELTO = {
  chip: (r) => ({ top: pickChoc(r), rimc: pickChoc(r), side: [pickChoc(r), lin('#1d0e06')], spec: 0.9, shin: 60, dome: 0.28, poly: { n: 4 + Math.floor(r() * 2), rot: r() * 6, round: 0.4 }, size: [7, 12], rough: 0.03 }),
  blanco: () => ({ top: lin('#f2e6c9'), rimc: lin('#e0cfa6'), side: [lin('#e8d9b4'), lin('#c9b78d')], spec: 0.5, shin: 40, dome: 0.28, poly: { n: 5, rot: 0.3, round: 0.4 }, size: [8, 12], rough: 0.03 }),
  pasa: (r) => ({ top: lin('#4f2638'), rimc: lin('#2a121e'), side: [lin('#3b1b2a'), lin('#1f0d17')], spec: 0.6, shin: 35, dome: 0.3, stretch: [1, 0.85], size: [7, 10], rough: 0.12, rot: r() * 3 }),
  avena: (r) => ({ top: lin('#e8d2a4'), rimc: lin('#c9a56c'), side: [lin('#d9bb84'), lin('#a98450')], spec: 0.1, shin: 12, dome: 0.2, stretch: [1, 0.55], size: [10, 16], rot: r() * 3 }),
  coco: (r) => ({ top: lin(r() < 0.4 ? '#d9a95e' : '#f7eed9'), rimc: lin('#e8d9b8'), side: [lin('#efe2c3'), lin('#c9b78d')], spec: 0.06, shin: 10, dome: 0.2, stretch: [1, 0.16], size: [10, 18], rot: r() * 3 }),
  almendra: (r) => ({ top: lin('#efd8aa'), rimc: lin('#a8733a'), side: [lin('#d9b57c'), lin('#a8733a')], spec: 0.2, shin: 18, dome: 0.2, stretch: [1, 0.5], size: [14, 22], rot: r() * 3 }),
}

function sueltos(fb, r, e, M) {
  // migas de masa junto a la galleta principal
  for (let i = 0; i < 30; i++) {
    const x = 80 + r() * 560
    const y = 440 + r() * 90
    disco(fb, { top: M.top, rimc: M.rimc, side: M.side, cx: x, cy: y, R: 2 + r() * 4.5, T: 1.5 + r() * 2, seed: 700 + i, irr: 0.4, dome: 0.25, rough: 0.1, ao: 6 })
  }
  const lugares = [
    [92, 436], [140, 500], [600, 440], [650, 495], [260, 515], [470, 512], [40, 470], [690, 420], [330, 524],
  ]
  let li = 0
  for (const kind of e.sueltos ?? []) {
    for (let j = 0; j < 2; j++) {
      const [px, py] = lugares[li++ % lugares.length]
      const o = SUELTO[kind](r)
      const R = o.size[0] + r() * (o.size[1] - o.size[0])
      disco(fb, { ...o, cx: px + (r() - 0.5) * 24, cy: py + (r() - 0.5) * 14, R, T: R * 0.4, seed: 900 + li * 7, irr: 0.1, ao: 8 })
    }
  }
  if (e.sandwich === 'frambuesa') {
    frambuesa(fb, 98, 462, 40, 41)
    frambuesa(fb, 640, 468, 34, 43)
    frambuesa(fb, 560, 508, 28, 47)
  }
}

/* ---------- acabado fotográfico ---------- */
function post(fb, seed) {
  const r = rng(seed + 1234)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - W / 2) / (W / 2), (y - H * 0.5) / (H / 2))
      const vig = 1 - 0.22 * Math.pow(d, 2.4)
      const i = (y * W + x) * 3
      const g = (r() - 0.5) * 0.012
      for (let c = 0; c < 3; c++) {
        let v = fb[i + c] * vig * [1.04, 1.0, 0.97][c] * 1.08
        v = v / (1 + 0.14 * v)
        fb[i + c] = v + g
      }
    }
  }
}

// Desenfoque leve de lo que ya se dibujó (las galletas de atrás quedan fuera de foco).
function softenFB(fb, r = 1) {
  const n = W * H
  for (let c = 0; c < 3; c++) {
    const ch = new Float32Array(n)
    for (let p = 0; p < n; p++) ch[p] = fb[p * 3 + c]
    const b = boxBlur(ch, W, H, r)
    for (let p = 0; p < n; p++) fb[p * 3 + c] = b[p]
  }
}

function aRGBA(fb) {
  const out = Buffer.alloc(W * H * 4)
  for (let p = 0; p < W * H; p++) {
    for (let c = 0; c < 3; c++) out[p * 4 + c] = Math.round(255 * Math.pow(clamp(fb[p * 3 + c]), 1 / 2.2))
    out[p * 4 + 3] = 255
  }
  return out
}

function render(slug, e) {
  const fb = new Float32Array(W * H * 3)
  fondo(fb, e.seed)
  const r = rng(e.seed * 101 + 7)
  const M = MAT[e.mat]
  const specs = [
    { cx: 186 + (r() - 0.5) * 14, cy: 234, R: 126, T: 30, hero: false },
    { cx: 540 + (r() - 0.5) * 14, cy: 228, R: 120, T: 29, hero: false },
    { cx: 366, cy: 316, R: 186, T: 44, hero: true },
  ]
  for (const s of specs) {
    if (s.hero) softenFB(fb, 1)
    const seed = e.seed * 31 + Math.floor(s.cx)
    const rr = rng(seed)
    if (e.sandwich) {
      sandwich(fb, e, s, seed, rr)
      continue
    }
    if (e.apilado && s.hero) {
      // dos galletas apiladas: la de arriba se apoya sobre la de abajo
      const low = { ...M, cx: s.cx + 6, cy: s.cy + 40, R: s.R, T: s.T, seed: seed + 1, ...e.cookie(rr, false) }
      disco(fb, low)
      disco(fb, { ...M, cx: s.cx - 4, cy: s.cy + 40 - s.T, R: s.R * 0.985, T: s.T, seed, noShadow: true, ...e.cookie(rr, true) })
      continue
    }
    disco(fb, { ...M, cx: s.cx, cy: s.cy, R: s.R, T: s.T, seed, shadowBack: s.hero, ...e.cookie(rr, s.hero) })
  }
  sueltos(fb, rng(e.seed * 53 + 5), e, M)
  post(fb, e.seed)
  return aRGBA(fb)
}

/* ---------- principal ---------- */
const [, , outDir = '.', ...solo] = process.argv
fs.mkdirSync(outDir, { recursive: true })
const hoja = []
for (const [slug, e] of Object.entries(ESCENAS)) {
  if (solo.length && !solo.includes(slug)) continue
  const t0 = Date.now()
  const rgba = render(slug, e)
  const jpg = jpeg.encode({ data: rgba, width: W, height: H }, 86).data
  fs.writeFileSync(path.join(outDir, `${slug}.jpg`), jpg)
  hoja.push(rgba)
  console.log(`${slug}.jpg  ${(jpg.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`)
}

// Hoja de contactos (mitad de tamaño) para revisar todo de un vistazo.
const cols = Math.min(5, hoja.length)
const filas = Math.ceil(hoja.length / cols)
const tw = W / 2
const th = H / 2
const sheet = Buffer.alloc(cols * tw * filas * th * 4, 255)
hoja.forEach((img, n) => {
  const ox = (n % cols) * tw
  const oy = Math.floor(n / cols) * th
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      for (let c = 0; c < 3; c++) {
        const s = [0, 1, 2, 3].map((q) => img[(((y * 2 + (q >> 1)) * W) + x * 2 + (q & 1)) * 4 + c])
        sheet[(((oy + y) * cols * tw) + ox + x) * 4 + c] = Math.round((s[0] + s[1] + s[2] + s[3]) / 4)
      }
    }
  }
})
if (process.env.HOJA) {
  fs.writeFileSync(path.join(outDir, '_hoja.jpg'), jpeg.encode({ data: sheet, width: cols * tw, height: filas * th }, 82).data)
}
