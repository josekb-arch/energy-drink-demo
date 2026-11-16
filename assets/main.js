/* OKO ENERGY — 3D scroll demo (Three.js + GSAP ScrollTrigger + Lenis)
   All cans are procedural: lathe/cylinder geometry + canvas-painted labels. */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

const MQ = matchMedia('(max-width: 820px)');
let isMobile = MQ.matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ flavors */
const FLAVORS = [
  { id: 'citron',   pre: 'GOÛT', name: 'CITRON VERT',     base: '#1d48b8', base2: '#0a1a52', accent: '#5ff2e0', glow: '#38e6ff' },
  { id: 'menthe',   pre: 'GOÛT', name: 'MENTHE GLACIALE', base: '#0f6a58', base2: '#052a22', accent: '#8dffcf', glow: '#2bffb0' },
  { id: 'myrtille', pre: 'GOÛT', name: 'MYRTILLE',        base: '#5a24a8', base2: '#1e0a45', accent: '#d2b0ff', glow: '#b07bff' },
  { id: 'peche',    pre: 'GOÛT', name: 'PÊCHE BLANCHE',   base: '#d0261c', base2: '#7a0c08', accent: '#ffb46a', glow: '#ff8a3d' },
  { id: 'mangue',   pre: 'GOÛT', name: 'MANGUE PASSION',  base: '#f07c12', base2: '#9a3604', accent: '#fff0a8', glow: '#ffb02e' },
  { id: 'fraise',   pre: 'GOÛT', name: 'FRAISE LITCHI',   base: '#da2064', base2: '#7c0a33', accent: '#ffd0e0', glow: '#ff5c9a' },
  { id: 'pasteque', pre: 'GOÛT', name: 'PASTÈQUE',        base: '#ff6f8e', base2: '#b23552', accent: '#e4ffe6', glow: '#ff8fa8' },
  { id: 'original', pre: 'GOÛT', name: 'ORIGINAL',        base: '#c2c7cf', base2: '#6e747d', accent: '#1d2f7a', glow: '#dfe8ff', logo: '#ffffff' },
  { id: 'yuzu',     pre: 'GOÛT', name: 'YUZU',            base: '#f4cc1b', base2: '#a07d04', accent: '#1a1a1a', glow: '#ffe14d', logo: '#161616' },
  { id: 'cassis',   pre: 'GOÛT', name: 'CASSIS',          base: '#701a56', base2: '#2c0722', accent: '#ff97d6', glow: '#ff4fc0' },
  { id: 'ananas',   pre: 'GOÛT', name: 'ANANAS',          base: '#e5a82c', base2: '#8b5a0b', accent: '#fff6cf', glow: '#ffc94a' },
  { id: 'glacier',  pre: 'GOÛT', name: 'GLACIER',         base: '#84d6f0', base2: '#2a7fa2', accent: '#0b2c5c', glow: '#9fe8ff' },
  { id: 'cola',     pre: 'GOÛT', name: 'COLA NOIR',       base: '#1c1616', base2: '#070505', accent: '#ff3b2f', glow: '#ff3b2f', dark: true },
  { id: 'nuit',     pre: 'GOÛT', name: 'ZÉRO NUIT',       base: '#13161b', base2: '#050608', accent: '#45f0ff', glow: '#45f0ff', dark: true },
];
const FL = Object.fromEntries(FLAVORS.map(f => [f.id, f]));

/* ------------------------------------------------------------- color utils */
const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgb = (a, al = 1) => `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${al})`;
const mix = (h1, h2, t) => { const a = hex2rgb(h1), b = hex2rgb(h2); return rgb(a.map((v, i) => lerp(v, b[i], t))); };

/* --------------------------------------------------------- label painting */
const FONT = (wt, px, ital = true) => `${ital ? 'italic ' : ''}${wt} ${Math.round(px)}px Archivo, "Arial Black", Impact, sans-serif`;
const BODY = (wt, px) => `${wt} ${Math.round(px)}px Inter, Arial, sans-serif`;
const MR = { base: 'rgb(0,62,215)', print: 'rgb(0,110,28)', back: 'rgb(0,92,150)', band: 'rgb(0,80,60)' };

function setStretch(ctx, s) { if ('fontStretch' in ctx) ctx.fontStretch = s; }

function drawLabel(ctx, W, H, f, mr) {
  const C = (c, m) => (mr ? m : c);
  // base coat
  if (mr) ctx.fillStyle = MR.base;
  else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, mix(f.base, '#ffffff', .06)); g.addColorStop(.55, f.base); g.addColorStop(1, f.base2); ctx.fillStyle = g; }
  ctx.fillRect(0, 0, W, H);

  // back panel (darker), spanning the seam (u=0 / u=1)
  const bw = W * 0.2, backCol = f.dark ? '#0b0b0d' : mix(f.base2, '#000000', .62);
  ctx.fillStyle = C(backCol, MR.back);
  ctx.fillRect(W - bw, 0, bw, H); ctx.fillRect(0, 0, bw, H);
  if (!mr) {
    for (const [x0, x1] of [[bw, bw + W * .05], [W - bw, W - bw - W * .05]]) {
      const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, backCol); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), H);
    }
  }
  for (const cx of [0, W]) drawBack(ctx, cx, W, H, f, mr);
  drawFront(ctx, W, H, f, mr);

  // printed rim lines
  ctx.fillStyle = C(rgb(hex2rgb(f.accent), .7), MR.print);
  ctx.fillRect(0, H * .018, W, Math.max(2, H * .004));
  ctx.fillRect(0, H * .978, W, Math.max(2, H * .004));
}

function drawFront(ctx, W, H, f, mr) {
  const C = (c, m) => (mr ? m : c);
  const cx = W * .5;
  // logo size (rotated 90° -> runs along the can height)
  let s = H * .34; setStretch(ctx, 'expanded'); ctx.font = FONT(900, s);
  let tw = ctx.measureText('OKO').width; if (tw > H * .8) { s *= H * .8 / tw; ctx.font = FONT(900, s); tw = ctx.measureText('OKO').width; }
  const half = s * .37, lx = cx + W * .01, ly = H * .43;

  // neon stripe for dark cans
  if (f.dark) { ctx.fillStyle = C(f.accent, MR.print); ctx.fillRect(cx - half - W * .07, H * .05, Math.max(3, W * .006), H * .9); }

  ctx.save(); ctx.translate(lx, ly); ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (!mr) { ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillText('OKO', s * .03, s * .045); }
  const logoCol = f.dark ? mix(f.base, '#ffffff', .16) : (f.logo || '#ffffff');
  ctx.fillStyle = C(logoCol, MR.print); ctx.fillText('OKO', 0, 0);
  // speed cuts through the logo
  ctx.fillStyle = C(f.dark ? f.base : mix(f.base, '#000000', .05), f.dark ? MR.base : MR.base);
  ctx.save(); ctx.rotate(-.18);
  ctx.fillRect(-tw * .6, -s * .06, tw * 1.2, s * .035);
  ctx.fillRect(-tw * .6, s * .1, tw * 1.2, s * .02);
  ctx.restore();
  if (f.dark && !mr) { ctx.strokeStyle = rgb(hex2rgb(f.accent), .45); ctx.lineWidth = 2; ctx.strokeText('OKO', 0, 0); }
  ctx.restore();

  // flavour name, vertical, left of logo
  ctx.save(); ctx.translate(cx - half - W * .025, H * .08); ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; setStretch(ctx, 'normal');
  ctx.fillStyle = C(f.accent, MR.print);
  ctx.font = FONT(800, H * .046, false); ctx.fillText(f.pre, 0, 0);
  ctx.font = FONT(900, H * .046, false); ctx.fillText(f.name, ctx.measureText(f.pre + ' ').width * 1.0 + H * .01, 0);
  ctx.restore();

  // tiny vertical copy, right of logo
  ctx.save(); ctx.translate(cx + half + W * .035, H * .1); ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'left'; ctx.font = BODY(600, H * .02);
  ctx.fillStyle = C(f.dark || f.logo === '#161616' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.8)', MR.print);
  if (f.logo === '#161616') ctx.fillStyle = C('rgba(0,0,0,.65)', MR.print);
  ctx.fillText('BOISSON ÉNERGISANTE  ·  CAFÉINE NATURELLE  ·  80 MG', 0, 0);
  ctx.restore();

  // ENERGY
  setStretch(ctx, 'expanded'); ctx.font = FONT(900, H * .085); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if (!mr) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillText('ENERGY', cx + 3, H * .87 + 4); }
  ctx.fillStyle = C(f.accent, MR.print); ctx.fillText('ENERGY', cx, H * .87);
  setStretch(ctx, 'normal');
  ctx.font = BODY(600, H * .024);
  ctx.fillStyle = C(f.logo === '#161616' ? 'rgba(0,0,0,.75)' : 'rgba(255,255,255,.85)', MR.print);
  ctx.fillText('250 ml  |  Zéro sucre ajouté', cx, H * .925);

  // little leaf mark
  ctx.save(); ctx.translate(cx - half * .55, H * .075); ctx.fillStyle = C(f.accent, MR.print);
  const k = H * .03; ctx.beginPath(); ctx.moveTo(0, k); ctx.quadraticCurveTo(-k, 0, 0, -k); ctx.quadraticCurveTo(k, 0, 0, k); ctx.fill();
  ctx.fillRect(-k * .08, -k * .1, k * .16, k * 1.4);
  ctx.restore();
}

function drawBack(ctx, cx, W, H, f, mr) {
  const C = (c, m) => (mr ? m : c);
  const w = W * .36, x0 = cx - w / 2;
  // giant outline word
  ctx.save(); ctx.translate(x0 + w * .16, H * .06); ctx.rotate(Math.PI / 2);
  setStretch(ctx, 'expanded'); ctx.font = FONT(900, H * .1); ctx.textAlign = 'left';
  if (!mr) { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.strokeText('ÉNERGIE PROPRE', 0, 0); }
  ctx.restore(); setStretch(ctx, 'normal');
  // nutrition lines
  ctx.fillStyle = C('rgba(255,255,255,.55)', MR.print); ctx.font = BODY(600, H * .017); ctx.textAlign = 'left';
  const nl = ['VALEURS NUTRITIONNELLES / 100 ML', 'Énergie ........ 15 kJ / 4 kcal', 'Glucides ....... 0,5 g', 'dont sucres .... 0,48 g', 'Caféine ........ 32 mg', 'Vit. B3 · B5 · B6 · B12'];
  nl.forEach((t, i) => ctx.fillText(t, x0 + w * .3, H * (.14 + i * .034)));
  // accent band
  const by = H * .46, bh = H * .15;
  if (mr) { ctx.fillStyle = MR.band; ctx.fillRect(x0 + w * .26, by, w * .7, bh); }
  else {
    const band = f.dark ? f.accent : f.base;
    const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, mix(band, '#ffffff', .12)); g.addColorStop(1, mix(band, '#000000', .25));
    ctx.fillStyle = g; ctx.fillRect(x0 + w * .26, by, w * .7, bh);
  }
  ctx.fillStyle = C(f.dark ? '#0b0b0d' : '#ffffff', MR.print);
  ctx.font = FONT(900, H * .03, false); ctx.fillText('CAFÉINE ISSUE DE', x0 + w * .3, by + bh * .32);
  ctx.fillText('GRAINS DE CAFÉ', x0 + w * .3, by + bh * .58);
  ctx.font = BODY(500, H * .016); ctx.fillText('Pour une énergie douce, sans crash.', x0 + w * .3, by + bh * .84);
  // ingredients
  ctx.fillStyle = C('rgba(255,255,255,.45)', MR.print); ctx.font = BODY(500, H * .015);
  ['Eau gazéifiée, jus de fruits (4 %), extrait de', 'café vert, arômes naturels, acidifiant : acide', 'citrique, extrait de stévia, vitamines.', 'À conserver au frais. Bien agiter. Recyclable.'].forEach((t, i) => ctx.fillText(t, x0 + w * .28, H * (.67 + i * .028)));
  ctx.font = FONT(900, H * .04, false); ctx.fillStyle = C(f.dark ? f.accent : mix(f.base, '#ffffff', .2), MR.print); ctx.fillText('STÉVIA', x0 + w * .28, H * .82);
  // barcode
  const bx = x0 + w * .62, byy = H * .79, bw2 = w * .3, bhh = H * .1;
  ctx.fillStyle = C('#f2f2f2', MR.print); ctx.fillRect(bx, byy, bw2, bhh);
  if (!mr) { ctx.fillStyle = '#111'; let xx = bx + bw2 * .06; let i = 0; while (xx < bx + bw2 * .94) { const ww = ((i * 7919) % 3 + 1) * bw2 * .012; if (i % 2 === 0) ctx.fillRect(xx, byy + bhh * .1, ww, bhh * .72); xx += ww + bw2 * .01; i++; } }
}

/* ------------------------------------------------------------- renderer */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true;
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function sizeRenderer() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
}
sizeRenderer();
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* label texture cache */
const labelCache = new Map();
function getLabel(f, hi = false) {
  const key = f.id + (hi ? '@hi' : '');
  if (labelCache.has(key)) return labelCache.get(key);
  const W = hi ? (isMobile ? 1024 : 2048) : (isMobile ? 768 : 1024), H = Math.round(W * .86);
  const c1 = document.createElement('canvas'); c1.width = W; c1.height = H; drawLabel(c1.getContext('2d'), W, H, f, false);
  const c2 = document.createElement('canvas'); c2.width = W / 2; c2.height = H / 2;
  const x2 = c2.getContext('2d'); x2.scale(.5, .5); drawLabel(x2, W, H, f, true);
  const map = new THREE.CanvasTexture(c1); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = maxAniso;
  const mr = new THREE.CanvasTexture(c2); mr.anisotropy = maxAniso;
  const out = { map, mr, canvas: c1 }; labelCache.set(key, out); return out;
}

/* glow sprite texture */
function radialTex(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowTex = radialTex([[0, 'rgba(255,255,255,1)'], [.25, 'rgba(255,255,255,.55)'], [.6, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]);
const softTex = radialTex([[0, 'rgba(255,255,255,.9)'], [.5, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]);

/* ------------------------------------------------------------ can model */
const CAN_R = 0.5, CAN_H = 2.7, T = CAN_H / 2;
const SEG = isMobile ? 48 : 80;
const bodyGeo = new THREE.CylinderGeometry(CAN_R, CAN_R, CAN_H, SEG, 1, true, -Math.PI, Math.PI * 2);
const topGeo = new THREE.LatheGeometry([
  [CAN_R, T], [CAN_R * .99, T + .04], [CAN_R * .9, T + .13], [CAN_R * .81, T + .2], [CAN_R * .8, T + .215],
  [CAN_R * .83, T + .232], [CAN_R * .835, T + .245], [CAN_R * .81, T + .258], [CAN_R * .775, T + .248], [CAN_R * .765, T + .215], [CAN_R * .7, T + .205], [0, T + .205]
].map(p => new THREE.Vector2(p[0], p[1])), SEG);
const botGeo = new THREE.LatheGeometry([
  [0, -T - .05], [CAN_R * .5, -T - .085], [CAN_R * .7, -T - .115], [CAN_R * .8, -T - .105], [CAN_R * .93, -T - .06], [CAN_R, -T - .012], [CAN_R, -T]
].map(p => new THREE.Vector2(p[0], p[1])), SEG);
const tabGeo = new THREE.TorusGeometry(.12, .028, 8, 24); tabGeo.scale(1, 1.55, .35);
const metalMat = new THREE.MeshStandardMaterial({ color: 0xd9dce2, metalness: 1, roughness: .2, side: THREE.DoubleSide });

function makeCan(f, { hi = false, clip = null } = {}) {
  const lab = getLabel(f, hi);
  const mat = new THREE.MeshPhysicalMaterial({ map: lab.map, roughnessMap: lab.mr, metalnessMap: lab.mr, metalness: 1, roughness: 1, clearcoat: isMobile ? .35 : .75, clearcoatRoughness: .16 });
  const mm = clip ? metalMat.clone() : metalMat;
  if (clip) { mat.clippingPlanes = clip; mm.clippingPlanes = clip; }
  const g = new THREE.Group();
  const body = new THREE.Mesh(bodyGeo, mat);
  const top = new THREE.Mesh(topGeo, mm), bot = new THREE.Mesh(botGeo, mm);
  const tab = new THREE.Mesh(tabGeo, mm); tab.rotation.x = -Math.PI / 2; tab.position.set(0, T + .215, .14);
  g.add(body, top, bot, tab);
  return {
    group: g, mat, metal: mm, flavor: f,
    setFlavor(nf) { const l = getLabel(nf, hi); mat.map = l.map; mat.roughnessMap = l.mr; mat.metalnessMap = l.mr; mat.needsUpdate = true; this.flavor = nf; },
    setTint(v) { mat.color.setScalar(v); },
  };
}

/* "portal" disc: dark metal housing with a glowing ring */
function makePortal({ logo = true, color = 0xe9fbff } = {}) {
  const g = new THREE.Group();
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.34, .34, 72), new THREE.MeshStandardMaterial({ color: 0x15171b, metalness: 1, roughness: .28 }));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.36, .045, 12, 96), new THREE.MeshStandardMaterial({ color: 0xbfc5cc, metalness: 1, roughness: .15 }));
  lip.rotation.x = Math.PI / 2; lip.position.y = .17;
  const lip2 = lip.clone(); lip2.position.y = -.17; lip2.scale.setScalar(1.03);
  g.add(housing, lip, lip2);
  const glowMat = new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true });
  [[1.12, .045, 1], [.86, .025, .7], [.6, .02, .45]].forEach(([r, t, o], i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, 96), glowMat.clone()); m.material.opacity = o;
    m.rotation.x = Math.PI / 2; m.position.y = -.18 - i * .012; g.add(m);
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.15, 64), new THREE.MeshBasicMaterial({ map: softTex, color, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  disc.rotation.x = Math.PI / 2; disc.position.y = -.19; g.add(disc);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.scale.set(5, 2.2, 1); halo.position.y = -.35; g.add(halo);
  if (logo) {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      const px = 256 + i * 512; setStretch(x, 'expanded');
      x.font = FONT(900, 50); x.fillText('OKO', px, 44); x.font = FONT(900, 30); x.fillText('ENERGY', px, 84);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.372, 1.372, .3, 96, 1, true, -Math.PI, Math.PI * 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false }));
    g.add(band);
  }
  g.userData.glow = [halo, disc];
  return g;
}

/* ------------------------------------------------------------- stages */
const stages = [];
function makeStage(el, fov) {
  const scene = new THREE.Scene(); scene.environment = envTex;
  const camera = new THREE.PerspectiveCamera(fov, 1, .1, 120);
  const st = { el, scene, camera, update: () => {}, visible: false }; stages.push(st); return st;
}
const P = { hero: 0, story: 0, lineup: 0 };   // raw ScrollTrigger progress
const S = { hero: 0, story: 0, lineup: 0 };   // smoothed
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });

/* ---------------- HERO: ring of cans ---------------- */
const HERO_SEQ = ['citron', 'menthe', 'myrtille', 'peche'];
function buildHero() {
  const st = makeStage($('#hero'), 30);
  const { scene, camera } = st;
  scene.environmentIntensity = .42;
  scene.add(new THREE.HemisphereLight(0x9fb4c8, 0x050505, .5));
  const spot = new THREE.SpotLight(0xe8f4ff, 9, 0, .42, .75, 0); spot.position.set(0, 9, 7); scene.add(spot, spot.target);
  const rimL = new THREE.DirectionalLight(0x6fa8ff, 1.6); rimL.position.set(-6, 3, -4); scene.add(rimL);
  const rimR = new THREE.DirectionalLight(0x7ffff0, 1.2); rimR.position.set(6, 2, -3); scene.add(rimR);
  const front = new THREE.DirectionalLight(0xffffff, .6); front.position.set(0, 1, 8); scene.add(front);

  const N = 12, RR = 5.6;
  const order = ['citron', 'menthe', 'myrtille', 'peche', 'cola', 'nuit', 'cassis', 'mangue', 'nuit', 'fraise', 'cola', 'glacier'];
  const ring = new THREE.Group(); ring.position.z = -RR; scene.add(ring);
  const cans = order.map((id, k) => {
    const c = makeCan(FL[id], { hi: k === 3 });
    const holder = new THREE.Group(), tilt = new THREE.Group();
    const th = k / N * Math.PI * 2;
    holder.position.set(Math.sin(th) * RR, 0, Math.cos(th) * RR); holder.rotation.y = th;
    tilt.rotation.set((Math.random() - .5) * .25, 0, (k % 2 ? 1 : -1) * (.12 + Math.random() * .2));
    tilt.add(c.group); holder.add(tilt); ring.add(holder);
    return { c, holder, tilt, th, seed: Math.random() * 10, baseRz: tilt.rotation.z, baseRx: tilt.rotation.x };
  });
  const top = makePortal({ logo: true }); scene.add(top);
  const bot = makePortal({ logo: false, color: 0x9ffcff }); bot.rotation.x = Math.PI; scene.add(bot);
  const floorGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9fdfff, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));
  floorGlow.scale.set(14, 4, 1); floorGlow.position.set(0, -2.6, -2); scene.add(floorGlow);

  let lastIdx = -1, stepS = 0;
  st.update = (dt, t) => {
    const p = S.hero;
    const raw = clamp(p / .7) * 3; const fl = Math.min(2, Math.floor(raw)); const fr = raw - fl;
    const stepT = raw >= 3 ? 3 : fl + sstep(.2, .8, fr);
    stepS = damp(stepS, stepT, 9, dt);
    const z = sstep(.72, 1, p);                       // zoom-through phase
    ring.rotation.y = -stepS / N * Math.PI * 2 + (reduced ? 0 : Math.sin(t * .15) * .015);
    const idx = Math.round(clamp(stepS, 0, 3));
    if (idx !== lastIdx) { lastIdx = idx; setHeroLabel(idx); }
    const spread = 1 + z * 2.6;
    cans.forEach((o, k) => {
      const a = Math.atan2(Math.sin(o.th + ring.rotation.y), Math.cos(o.th + ring.rotation.y));
      const facing = Math.cos(a);
      const isFront = Math.abs(a) < .3;
      o.c.setTint(facing < 0 ? lerp(.05, .12, 1 + facing) : lerp(.12, 1, Math.pow(sstep(.6, .99, facing), 1.6)));
      o.holder.position.set(Math.sin(o.th) * RR * (isFront ? 1 : spread), 0, Math.cos(o.th) * RR);
      const bob = reduced ? 0 : Math.sin(t * .9 + o.seed) * .07;
      o.tilt.position.set(isFront ? z * .55 : 0, bob + (isFront ? -z * .35 : 0), 0);
      const frontW = sstep(.3, 0, Math.abs(a));
      o.tilt.rotation.z = lerp(o.baseRz, .1 + z * .52, frontW);
      o.tilt.rotation.x = lerp(o.baseRx, .02, frontW);
      o.c.group.rotation.y = lerp(Math.sin(t * .35 + o.seed) * .5, lerp(Math.sin(t * .5) * .18 - .12, -.5, z), frontW);
      o.c.group.scale.setScalar(isFront ? 1 : Math.max(.001, 1 - z * 1.4));
    });
    // camera
    const asp = camera.aspect, mob = asp < .9;
    camera.fov = mob ? 36 : 30;
    const tanH = Math.tan(camera.fov * Math.PI / 360);
    const baseZ = mob ? 2.7 / (tanH * asp) : Math.max(12.5, 5.2 / (tanH * asp));
    mouse.sx = damp(mouse.sx, mouse.x, 3, dt); mouse.sy = damp(mouse.sy, mouse.y, 3, dt);
    camera.position.set(mouse.sx * .35 * (1 - z), .15 - mouse.sy * .2 * (1 - z) - z * .15, lerp(baseZ, 3.4 + .6, z * z));
    camera.lookAt(0, -z * .05, 0);
    // portals
    const hh = baseZ * tanH;
    top.position.set(0, hh * (mob ? .6 : .76) + z * 4, 0); top.rotation.y = t * .15;
    bot.position.set(0, -hh * (mob ? .8 : .86) - z * 4, 0); bot.rotation.y = -t * .12;
    logoEl.style.opacity = sstep(.74, .9, p);
    const pulse = .5 + Math.sin(t * 2.2) * .08;
    top.userData.glow[0].material.opacity = pulse; bot.userData.glow[0].material.opacity = pulse * .9;
    spot.target.position.set(0, 0, 0);
    floorGlow.material.opacity = .22 * (1 - z);
    // DOM
    heroLabel.style.opacity = 1 - sstep(.72, .82, p);
    heroUI.forEach(e => e.style.opacity = 1 - sstep(.05, .2, p) * (e.classList.contains('scroll-hint') ? 1 : 0) - sstep(.72, .82, p));
  };
  return st;
}
const logoEl = $('.hdr .logo'), heroLabel = $('#heroLabel'), heroUI = $$('.hero-kicker,.scroll-hint');
function splitChars(el, text) { el.innerHTML = [...text].map(ch => ch === ' ' ? ' ' : `<span class="ch">${ch}</span>`).join(''); return $$('.ch', el); }
function setHeroLabel(i) {
  const f = FL[HERO_SEQ[i]];
  heroLabel.style.setProperty('--accent', f.glow);
  $('#heroIdx').textContent = String(i + 1).padStart(2, '0');
  const pre = splitChars($('#heroPre'), f.pre), nm = splitChars($('#heroName'), f.name);
  if (window.gsap && !reduced) gsap.fromTo([...pre, ...nm], { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .55, stagger: .018, ease: 'power3.out', overwrite: true });
}

/* ---------------- STORY: hero can + features + ZERO BULLSHIT ---------------- */
function buildStory() {
  const st = makeStage($('#saveur'), 30);
  const { scene, camera } = st;
  scene.environmentIntensity = .55;
  const key = new THREE.DirectionalLight(0xffd7ad, 2.6); key.position.set(-5, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff6a1a, 3.2); rim.position.set(5, 1, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffa060, 1.4); rim2.position.set(-4, -2, -3); scene.add(rim2);
  scene.add(new THREE.HemisphereLight(0xffc89a, 0x2a0a02, .5));
  const can = makeCan(FL.peche, { hi: true });
  const holder = new THREE.Group(); holder.add(can.group); scene.add(holder);
  const backGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa860, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }));
  backGlow.scale.set(7, 7, 1); backGlow.position.z = -2.5; holder.add(backGlow);

  // ember particles
  const n = isMobile ? 70 : 140, pos = new Float32Array(n * 3), spd = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * 16; pos[i * 3 + 1] = (Math.random() - .5) * 10; pos[i * 3 + 2] = -6 + Math.random() * 7; spd[i] = .15 + Math.random() * .45; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTex, color: 0xffd2a0, size: .11, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(pts);

  const PI = Math.PI;
  // keyframes: p, x, y, z, rx, ry, rz, scale
  const KD = [
    [0.00, .55, -.35, 3.4, .1, -.5, .62, 1],
    [0.08, 1.75, -.1, 0, .06, .1, .34, 1.2],
    [0.21, 1.75, -.05, 0, .06, .45, .3, 1.2],
    [0.29, 1.95, .05, 0, 0, 3 * PI - .4, .05, 1.22],
    [0.37, 1.95, .05, 0, 0, 3 * PI - .1, .05, 1.22],
    [0.45, 1.9, 0, 0, .04, 5 * PI + .05, .12, 1.2],
    [0.53, 1.9, 0, 0, .04, 5 * PI + .35, .12, 1.2],
    [0.61, 1.95, .05, 0, 0, 7 * PI - .25, .03, 1.22],
    [0.69, 1.95, .05, 0, 0, 7 * PI + .05, .03, 1.22],
    [0.79, 0, -.05, 0, 0, 8 * PI + .1, .05, 1.0],
    [0.90, 0, 0, 0, 0, 8 * PI + .5, .04, .72],
    [1.00, 0, 0, -.5, 0, 8 * PI + 1.6, .04, 0],
  ];
  const KM = KD.map(k => { const m = [...k]; if (m[0] > 0 && m[0] < .75) { m[1] = 0; m[2] = .62 + m[2]; m[7] *= .82; } if (m[0] === 0) { m[1] = .2; m[2] = .3; } return m; });
  const v = new Array(8).fill(0);
  function sample(K, p) {
    let i = 0; while (i < K.length - 2 && p > K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], t = sstep(a[0], b[0], p);
    for (let j = 1; j < 8; j++) v[j] = lerp(a[j], b[j], t); return v;
  }
  let feat = -1;
  st.update = (dt, t) => {
    const p = S.story, mob = camera.aspect < .9;
    const k = sample(mob ? KM : KD, p);
    holder.position.set(k[1], k[2] + (reduced ? 0 : Math.sin(t * 1.1) * .04), k[3]);
    holder.rotation.set(k[4], 0, k[6]);
    can.group.rotation.y = k[5] + (reduced ? 0 : Math.sin(t * .6) * .05);
    holder.scale.setScalar(Math.max(.0001, k[7]));
    camera.fov = mob ? 38 : 30;
    camera.position.set(mouse.sx * .25, mouse.sy * -.15, mob ? 10.5 : 8.2); camera.lookAt(0, 0, 0);
    backGlow.material.opacity = .45 * (1 - sstep(.7, .8, p));
    const a = pg.attributes.position.array;
    for (let i = 0; i < n; i++) { a[i * 3 + 1] += spd[i] * dt * (1 + sstep(.7, 1, p) * 3); if (a[i * 3 + 1] > 5.5) a[i * 3 + 1] = -5.5; }
    pg.attributes.position.needsUpdate = true;
    pts.material.opacity = .85 * (1 - sstep(.9, 1, p));
    // features
    const fi = p < .25 ? 0 : p < .41 ? 1 : p < .57 ? 2 : 3;
    if (fi !== feat) setFeature(fi, feat), feat = fi;
    const show = sstep(.03, .08, p) * (1 - sstep(.7, .75, p));
    featsEl.style.opacity = show; featNav.style.opacity = show; featCount.style.opacity = show;
  };
  return st;
}
const featsEl = $('#feats'), featNav = $('#featNav'), featCount = $('.feat-count');
const featEls = $$('.feat'), navEls = $$('#featNav li');
function setFeature(i, prev) {
  navEls.forEach((e, k) => e.classList.toggle('is-on', k === i));
  $('#featIdx').textContent = String(i + 1).padStart(2, '0');
  featEls.forEach((e, k) => {
    if (k === i) {
      e.classList.add('is-on');
      gsap.fromTo(e.children, { opacity: 0, y: 26, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .7, stagger: .07, ease: 'power3.out', overwrite: true });
      gsap.to(e, { opacity: 1, duration: .01 });
    } else if (k === prev) {
      gsap.to(e.children, { opacity: 0, y: -18, filter: 'blur(6px)', duration: .35, stagger: .03, ease: 'power2.in', overwrite: true, onComplete: () => e.classList.remove('is-on') });
    } else { e.classList.remove('is-on'); gsap.set(e.children, { opacity: 0 }); }
  });
}

/* ---------------- LINEUP: 14 cans, camera pan + light sweep ---------------- */
function buildLineup() {
  const st = makeStage($('#gamme'), 32);
  const { scene, camera } = st;
  scene.environmentIntensity = .5;
  scene.add(new THREE.HemisphereLight(0xb8c8d8, 0x080808, .55));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 6, 7); scene.add(key);
  const sweep = new THREE.SpotLight(0xffffff, 22, 0, .35, .6, 0); sweep.position.set(0, 7, 5); scene.add(sweep, sweep.target);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 1.4); rim.position.set(4, 2, -5); scene.add(rim);
  const GAP = 1.22;
  const cans = FLAVORS.map((f, i) => {
    const c = makeCan(f); const h = new THREE.Group(); h.add(c.group); scene.add(h);
    const x = (i - 6.5) * GAP; h.position.set(x, 0, -Math.abs(i - 6.5) * .05);
    return { c, h, x, seed: Math.random() * 10 };
  });
  let lastI = -1;
  st.update = (dt, t) => {
    const p = S.lineup, mob = camera.aspect < .9;
    const pan = sstep(.04, .96, p);
    const span = 6.5 * GAP;
    const camX = lerp(-span - (mob ? 0 : 1.5), span + (mob ? 0 : 1.5), pan);
    const lookX = camX + (mob ? 0 : 3.2);
    camera.fov = mob ? 40 : 32;
    camera.position.set(camX - (mob ? 0 : 1.6), 1.5 + mouse.sy * -.15, mob ? 12.5 : 10.5);
    camera.lookAt(lookX, -.1, 0);
    const intro = sstep(0, .12, p);
    cans.forEach((o, i) => {
      const d = (o.x - lookX) / GAP;
      const drop = (1 - sstep(i * .04, i * .04 + .5, intro * 1.6)) * 4;
      o.h.position.y = drop + (reduced ? 0 : Math.sin(t * .9 + o.seed) * .05);
      o.h.rotation.set(.22, 0, -.2 - drop * .1);
      o.c.group.rotation.y = -.55 + Math.sin(t * .4 + o.seed) * .1 + clamp(d, -3, 3) * -.06;
      const near = Math.exp(-d * d * .35);
      o.c.setTint(lerp(.45, 1, near));
      o.h.scale.setScalar(1 + near * .06);
    });
    const sx = lerp(-span - 4, span + 4, (p * 1.6 + t * .03) % 1);
    sweep.position.set(sx, 7, 5); sweep.target.position.set(sx, 0, 0);
    sweepEl.style.transform = `translateX(${(pan * 1.8 - .2) * innerWidth + innerWidth * .4}px) skewX(-18deg)`;
    const ci = clamp(Math.round(lookX / GAP + 6.5), 0, 13);
    if (ci !== lastI) {
      lastI = ci; const f = FLAVORS[ci];
      lineupName.textContent = f.name; lineupName.style.textShadow = `0 0 26px ${f.glow}aa`;
      $('#lineupIdx').textContent = String(ci + 1).padStart(2, '0');
    }
    $('#lineupBar').style.width = (pan * 100) + '%';
  };
  return st;
}
const sweepEl = $('#sweep'), lineupName = $('#lineupName');

/* ---------------- SHOP: can between two portal rings, falling cans ---------------- */
let shopCan, shopBurst = () => {};
function buildShop() {
  const st = makeStage($('#boutique'), 32);
  const { scene, camera } = st;
  scene.environmentIntensity = .5;
  scene.add(new THREE.HemisphereLight(0xaabbd0, 0x060606, .5));
  const spot = new THREE.SpotLight(0xfff1e0, 10, 0, .4, .7, 0); spot.position.set(0, 9, 6); scene.add(spot, spot.target);
  const rim = new THREE.DirectionalLight(0xff8a3a, 2.2); rim.position.set(5, 1, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x7fd8ff, 1.2); rim2.position.set(-5, 2, -4); scene.add(rim2);
  const front = new THREE.DirectionalLight(0xffffff, .7); front.position.set(0, 0, 8); scene.add(front);
  const RY = 2.5, root = new THREE.Group(); scene.add(root);
  const topP = makePortal({ logo: true }); topP.position.set(0, RY, -.4); root.add(topP);
  const botP = makePortal({ logo: false, color: 0xffd2a8 }); botP.rotation.x = Math.PI; botP.position.set(0, -RY, -.4); root.add(botP);
  shopCan = makeCan(FL.peche, { hi: true });
  const holder = new THREE.Group(); holder.add(shopCan.group); holder.position.z = .5; root.add(holder);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a50, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(6, 6, 1); glow.position.z = -1.6; root.add(glow);
  // world-space clip between the two rings (updated per frame for root offset)
  const clipTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), RY), clipBot = new THREE.Plane(new THREE.Vector3(0, 1, 0), RY);
  const clip = [clipTop, clipBot];
  const ids = ['citron', 'mangue', 'cola', 'myrtille', 'menthe', 'fraise', 'nuit', 'yuzu', 'peche', 'cassis', 'glacier', 'ananas'];
  const fall = ids.map((id, i) => {
    const c = makeCan(FL[id], { clip }); c.group.scale.setScalar(.72); root.add(c.group);
    return { c, loop: i < 6, phase: i / 6, x: (Math.random() - .5) * 1.1, z: -1.15 + Math.random() * .35, spin: (Math.random() - .5) * 3, t0: -10, rz: (Math.random() - .5) * .8 };
  });
  shopBurst = () => { let k = 0; fall.forEach(o => { if (!o.loop) { o.t0 = clockT + k * .12; o.x = (Math.random() - .5) * 1.2; k++; } }); };
  st.update = (dt, t) => {
    const mob = camera.aspect < .9;
    camera.fov = mob ? 44 : 32;
    camera.position.set(mouse.sx * .3, -mouse.sy * .15, mob ? 16 : 13.6); camera.lookAt(0, 0, 0);
    root.position.y = mob ? -.45 : 0;
    root.scale.setScalar(mob ? 1.1 : 1);
    clipTop.constant = (RY - .19) * root.scale.y + root.position.y; clipBot.constant = (RY - .19) * root.scale.y - root.position.y;
    holder.rotation.set(.04, 0, -.06 + Math.sin(t * .7) * .04);
    shopCan.group.rotation.y = reduced ? .2 : t * .45;
    holder.position.y = reduced ? 0 : Math.sin(t * 1.2) * .08;
    topP.rotation.y = t * .2; botP.rotation.y = -t * .2;
    fall.forEach(o => {
      let u;
      if (o.loop) u = ((t * .23 + o.phase) % 1);
      else { u = (t - o.t0) * .7; if (u > 1 || u < 0) { o.c.group.visible = false; return; } }
      o.c.group.visible = true;
      const e = u * u * .55 + u * .45;
      o.c.group.position.set(o.x, lerp(RY + 1.8, -RY - 1.8, e), o.z);
      o.c.group.rotation.set(.15, t * o.spin, o.rz * .4 + (u - .5) * .5);
      o.c.setTint(.75);
    });
  };
  return st;
}
let clockT = 0;

/* ------------------------------------------------------------- render */
function render() {
  const W = innerWidth, H = innerHeight;
  renderer.setScissorTest(false); renderer.clear();
  renderer.setScissorTest(true);
  for (const st of stages) {
    const r = st.el.getBoundingClientRect();
    st.visible = r.bottom > 0 && r.top < H && r.width > 0;
    if (!st.visible) continue;
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
    renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    st.camera.aspect = r.width / r.height; st.camera.updateProjectionMatrix();
    renderer.render(st.scene, st.camera);
  }
}

/* ------------------------------------------------------------- DOM / UI */
const bgOrange = $('#bgOrange'), bgFlash = $('#bgFlash'), bgDark = $('#bgDark'), zeroEl = $('#zero'), progressEl = $('#progress'), orangeGlow = $('#orangeGlow');
function updateBackground() {
  const h = S.hero, s = S.story;
  const toOrange = sstep(.8, .95, h);
  bgOrange.style.opacity = toOrange;
  bgFlash.style.opacity = sstep(.82, .97, h) * (1 - sstep(.0, .07, s)) * .85;
  const q = clamp((s - .7) / .3);
  bgDark.style.opacity = sstep(.8, .97, q);
  orangeGlow.style.transform = `translate(-50%,-50%) translate(${mouse.sx * 20}px,${mouse.sy * 20}px) scale(${1 + Math.sin(clockT * .8) * .04})`;
  const vis = q > 0 && q < 1;
  zeroEl.style.visibility = vis ? 'visible' : 'hidden';
  if (vis) {
    const sc = .82 + q * .28 + Math.pow(Math.max(0, q - .38) / .62, 2.8) * 26;
    zeroEl.style.opacity = sstep(0, .12, q);
    zeroEl.style.transform = `translate(-50%,-48%) scale(${sc})`;
    zeroEl.style.filter = `blur(${2 + sstep(.5, 1, q) * 10}px)`;
  }
  const max = document.documentElement.scrollHeight - innerHeight;
  progressEl.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
}

function initUI(lenis) {
  // anchors
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); const el = id === '#top' ? 0 : $(id); if (el === null) return;
    e.preventDefault(); document.body.classList.remove('menu-open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
    lenis ? lenis.scrollTo(el, { duration: 1.6 }) : (el === 0 ? scrollTo(0, 0) : el.scrollIntoView());
  }));
  $('#menuBtn').addEventListener('click', () => {
    const o = document.body.classList.toggle('menu-open'); $('#menuBtn').setAttribute('aria-expanded', o); $('#menu').setAttribute('aria-hidden', !o);
    o ? lenis?.stop() : lenis?.start();
  });
  // sound (soft synth drone, generated — no audio files)
  let actx, gain;
  $('#snd').addEventListener('click', e => {
    const b = e.currentTarget, on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on); $('#sndState').textContent = on ? 'ON' : 'OFF';
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)(); gain = actx.createGain(); gain.gain.value = 0;
      const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(gain); gain.connect(actx.destination);
      [55, 82.4, 110.2, 164.8].forEach((fq, i) => { const o = actx.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = fq; o.detune.value = (i - 1.5) * 6; const g = actx.createGain(); g.gain.value = i % 2 ? .05 : .16; o.connect(g); g.connect(lp); o.start(); });
      const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = .08; lg.gain.value = 180; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    }
    actx.resume(); gain.gain.setTargetAtTime(on ? .09 : 0, actx.currentTime, .4);
  });
  // FAQ accordion (single open, animated)
  $$('#acc details').forEach(d => {
    const sum = $('summary', d), body = $('.acc-b', d);
    sum.addEventListener('click', e => {
      e.preventDefault();
      if (d.open) { gsap.to(body, { height: 0, duration: .45, ease: 'power3.inOut', onComplete: () => { d.open = false; body.style.height = ''; } }); }
      else {
        $$('#acc details[open]').forEach(o => { if (o !== d) { const b = $('.acc-b', o); gsap.to(b, { height: 0, duration: .4, ease: 'power3.inOut', onComplete: () => { o.open = false; b.style.height = ''; } }); } });
        d.open = true; gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: .55, ease: 'power3.out' });
      }
    });
  });
  // shop
  let qty = 12, cart = 0;
  const qEl = $('#qty'), priceEl = $('#price');
  const upd = () => { qEl.textContent = qty; priceEl.textContent = (qty * 19.9 / 12).toFixed(2) + '€'; gsap.fromTo(priceEl, { y: -6, opacity: .4 }, { y: 0, opacity: 1, duration: .35 }); };
  $('#qMinus').onclick = () => { qty = Math.max(6, qty - 6); upd(); };
  $('#qPlus').onclick = () => { qty = Math.min(96, qty + 6); upd(); };
  const toast = $('#toast'); let tt;
  $('#addBtn').onclick = () => {
    cart += qty; const cc = $('#cartCount'); cc.textContent = cart;
    const cb = $('.cart-btn'); cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump');
    toast.textContent = `${qty} boîtes ${shopCan.flavor.name.toLowerCase()} ajoutées au panier`; toast.classList.add('on');
    clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 2200);
    shopBurst();
  };
  const sw = $('#swatches');
  ['peche', 'citron', 'menthe', 'myrtille', 'mangue', 'fraise', 'yuzu', 'cola', 'nuit'].forEach((id, i) => {
    const f = FL[id], b = document.createElement('button');
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', i === 0); b.setAttribute('aria-label', f.name);
    b.style.background = `linear-gradient(135deg, ${f.base}, ${f.base2})`;
    b.onclick = () => {
      $$('button', sw).forEach(x => x.setAttribute('aria-checked', x === b));
      shopCan.setFlavor(f); const parts = f.name.split(' ');
      $('#shopName').innerHTML = parts.length > 1 ? parts[0] + '<br>' + parts.slice(1).join(' ') : f.name;
      gsap.fromTo('#shopName', { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: .5, ease: 'power3.out' });
    };
    sw.appendChild(b);
  });
  // reveals
  gsap.from('.faq-title span', { scrollTrigger: { trigger: '.faq', start: 'top 70%' }, x: -80, opacity: 0, duration: 1.1, stagger: .12, ease: 'power4.out' });
  gsap.from('#acc details', { scrollTrigger: { trigger: '#acc', start: 'top 85%' }, y: 30, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out' });
  gsap.from('.shop-info > *, .shop-buy > *', { scrollTrigger: { trigger: '.shop', start: 'top 60%' }, y: 30, opacity: 0, duration: .8, stagger: .06, ease: 'power3.out' });
  gsap.from('.foot-news > *', { scrollTrigger: { trigger: '.foot', start: 'top 75%' }, y: 30, opacity: 0, duration: .9, stagger: .08, ease: 'power3.out' });
}

/* ------------------------------------------------------------- boot */
async function boot() {
  const bar = $('#loaderBar'), pct = $('#loaderPct');
  const setP = v => { bar.style.width = v + '%'; pct.textContent = String(Math.round(v)).padStart(3, '0'); };
  setP(8);
  try {
    await Promise.race([
      Promise.all([document.fonts.load('italic 900 100px Archivo'), document.fonts.load('900 100px Archivo'), document.fonts.load('600 20px Inter'), document.fonts.load('italic 800 40px Archivo')]),
      new Promise(r => setTimeout(r, 3500)),
    ]);
  } catch (e) { /* fallback fonts */ }
  setP(30); await new Promise(r => requestAnimationFrame(r));
  gsap.registerPlugin(ScrollTrigger);
  buildHero(); setP(55); await new Promise(r => requestAnimationFrame(r));
  buildStory(); setP(70); await new Promise(r => requestAnimationFrame(r));
  buildLineup(); setP(85); await new Promise(r => requestAnimationFrame(r));
  buildShop(); setP(95);
  // compile shaders early
  stages.forEach(s => renderer.compile(s.scene, s.camera));

  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: .085, smoothWheel: true, wheelMultiplier: .9 });
    lenis.on('scroll', ScrollTrigger.update);
    window.__lenis = lenis;
  }
  ScrollTrigger.config({ ignoreMobileResize: true });
  const pin = (sel, key, vh) => ScrollTrigger.create({ trigger: sel, start: 'top top', end: () => '+=' + innerHeight * vh, pin: true, pinSpacing: true, anticipatePin: 1, onUpdate: s => { P[key] = s.progress; }, onRefresh: s => { P[key] = s.progress; } });
  pin('#hero', 'hero', 3.2); pin('#saveur', 'story', 5.2); pin('#gamme', 'lineup', 2.8);
  initUI(lenis);
  setFeature(0, -1);

  let last = performance.now();
  gsap.ticker.add(time => {
    if (lenis) lenis.raf(time * 1000);
    const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now; clockT = time;
    for (const k in S) S[k] = damp(S[k], P[k], 10, dt);
    for (const k in S) if (Math.abs(S[k] - P[k]) < 1e-4) S[k] = P[k];
    updateBackground();
    stages.forEach(st => { const r = st.el.getBoundingClientRect(); if (r.bottom > -50 && r.top < innerHeight + 50) st.update(dt, time); });
    render();
  });
  gsap.ticker.lagSmoothing(0);
  window.__state = { P, S };

  addEventListener('resize', () => { const was = isMobile; isMobile = MQ.matches; sizeRenderer(); if (was !== isMobile) ScrollTrigger.refresh(); });
  setP(100);
  setTimeout(() => { $('#loader').classList.add('done'); document.body.classList.remove('is-loading'); ScrollTrigger.refresh(); window.__ready = true; }, 250);
}
boot();
