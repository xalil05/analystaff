/* ============================================================
   Analystaff — Dashboard mockup
   Composants adaptés de ShipSwift (signerlabs) au web :
     SWRadarChart      → radar 4 piliers animé (canvas)
     SWRingChart       → anneaux concentriques de charge (SVG)
     SWActivityHeatmap → heatmap d'assiduité + streak
     SWDonutChart      → donut d'état d'effectif (SVG, tap-to-focus)
     SWAnimatedMeshGradient → fond maillé animé (canvas)
   Tokens : charte visuelle Analystaff v2.0
   ============================================================ */

const $  = (s, r = document) => r.querySelector(s);
const nf = (v, d = 0) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const easeOut = t => 1 - Math.pow(1 - t, 3);
const DPR = Math.min(window.devicePixelRatio || 1, 2);

/* ── Couleurs piliers ─────────────────────────────────────── */
const P = {
  physique:  { fill: '#E53935', text: '#C62828' },
  technique: { fill: '#1E88E5', text: '#1565C0' },
  tactique:  { fill: '#8E24AA', text: '#6A1B9A' },
  mental:    { fill: '#F59E0B', text: '#B45309' },
};
const PILLARS = [
  { key: 'physique',  label: 'Physique'  },
  { key: 'technique', label: 'Technique' },
  { key: 'tactique',  label: 'Tactique'  },
  { key: 'mental',    label: 'Mental'    },
];

/* ── Données ──────────────────────────────────────────────── */
const SQUAD = [
  { n: 'Cheikh Faye',        p: 'Gardien',    s: 'dispo',  note: 7.8, chg: 62, ass: 96, pil: [72, 61, 68, 79] },
  { n: 'Ousmane Ba',         p: 'Gardien',    s: 'dispo',  note: 7.1, chg: 55, ass: 92, pil: [68, 58, 60, 71] },
  { n: 'Pape Sow',           p: 'Latéral D',  s: 'dispo',  note: 8.2, chg: 88, ass: 100, pil: [86, 79, 74, 77] },
  { n: 'Moussa Diagne',      p: 'Latéral G',  s: 'recup',  note: 7.5, chg: 41, ass: 78, pil: [64, 73, 70, 66] },
  { n: 'Ibrahima Sarr',      p: 'Central',    s: 'dispo',  note: 7.9, chg: 71, ass: 100, pil: [82, 62, 81, 84] },
  { n: 'Abdou Kane',         p: 'Central',    s: 'dispo',  note: 7.4, chg: 66, ass: 95, pil: [79, 60, 76, 72] },
  { n: 'Malick Ndiaye',      p: 'Central',    s: 'blesse', note: 7.2, chg: 12, ass: 42, pil: [70, 64, 69, 61] },
  { n: 'Souleymane Diallo',  p: 'Latéral G',  s: 'dispo',  note: 6.9, chg: 74, ass: 88, pil: [75, 66, 62, 68] },
  { n: 'Lamine Cissé',       p: 'Milieu D',   s: 'dispo',  note: 8.0, chg: 84, ass: 98, pil: [78, 84, 79, 73] },
  { n: 'Alioune Fall',       p: 'Milieu G',   s: 'susp',   note: 7.3, chg: 58, ass: 91, pil: [71, 77, 72, 70] },
  { n: 'Cheikh Tidiane N.',  p: 'Sentinelle', s: 'dispo',  note: 7.7, chg: 79, ass: 100, pil: [83, 68, 85, 76] },
  { n: 'Modou Guèye',        p: 'Sentinelle', s: 'dispo',  note: 7.0, chg: 92, ass: 89, pil: [88, 63, 74, 65] },
  { n: 'Idrissa Niang',      p: 'Milieu',     s: 'dispo',  note: 7.6, chg: 68, ass: 97, pil: [74, 80, 77, 79] },
  { n: 'Babacar Sène',       p: 'Milieu',     s: 'recup',  note: 6.8, chg: 37, ass: 74, pil: [66, 75, 68, 59] },
  { n: 'Mamadou Sy',         p: 'Meneur',     s: 'dispo',  note: 8.6, chg: 76, ass: 99, pil: [69, 91, 88, 86] },
  { n: 'Seydou Camara',      p: 'Meneur',     s: 'dispo',  note: 7.4, chg: 63, ass: 93, pil: [65, 83, 76, 74] },
  { n: 'Oumar Touré',        p: 'Ailier D',   s: 'dispo',  note: 8.3, chg: 90, ass: 96, pil: [89, 86, 71, 78] },
  { n: 'Ndiaga Sarr',        p: 'Ailier D',   s: 'dispo',  note: 7.1, chg: 70, ass: 90, pil: [80, 78, 66, 69] },
  { n: 'Ibou Diop',          p: 'Ailier G',   s: 'dispo',  note: 8.1, chg: 87, ass: 98, pil: [87, 88, 73, 75] },
  { n: 'Mouhamed Traoré',    p: 'Ailier G',   s: 'dispo',  note: 7.5, chg: 72, ass: 94, pil: [81, 82, 68, 72] },
  { n: 'Amadou Diallo',      p: 'Avant-centre', s: 'dispo', note: 8.8, chg: 93, ass: 100, pil: [91, 84, 79, 88] },
  { n: 'Lamine Gueye',       p: 'Avant-centre', s: 'dispo', note: 7.6, chg: 69, ass: 95, pil: [84, 74, 72, 76] },
  { n: 'Falilou Ndiaye',     p: 'Avant-centre', s: 'blesse', note: 7.9, chg: 8,  ass: 38, pil: [77, 71, 74, 80] },
  { n: 'Sérigne Mbaye',      p: 'Avant-centre', s: 'blesse', note: 7.0, chg: 15, ass: 51, pil: [72, 68, 66, 63] },
];

const STATUS = {
  dispo:  { label: 'Disponible',  color: '#10B981', cls: 'b-dispo'  },
  blesse: { label: 'Blessé',      color: '#DC2626', cls: 'b-blesse' },
  recup:  { label: 'Récupération',color: '#F59E0B', cls: 'b-recup'  },
  susp:   { label: 'Suspendu',    color: '#2563EB', cls: 'b-susp'   },
};

const NOTES = [
  { a: 'AT', n: 'Amadou Traoré', r: 'Préparateur physique', t: 'Il y a 2 h',
    x: "Amadou Diallo a terminé le circuit sans douleur. On monte à 4 séries sur les sprints répétés, retour sous réserve du kiné." },
  { a: 'MB', n: 'Moussa Bâ', r: 'Kinésithérapeute', t: 'Hier 18:40',
    x: "Malick Ndiaye : ischio droit, stade 1. Reprise course J+5, réévaluation avant le déplacement si le test de résistance est propre." },
  { a: 'IS', n: 'Ibrahima Sy', r: 'Entraîneur adjoint', t: 'Hier 12:05',
    x: "Notre bloc bas a tenu 68 minutes. Teungueth attaque beaucoup côté gauche : on maintient le volume sur les transitions défensives." },
  { a: 'IB', n: 'Ibou Ndiaye', r: 'Entraîneur principal', t: 'Lun. 09:20',
    x: "Moussa Diagne reprend le collectif à 60 %. Aucun ballon tendu pour lui cette semaine." },
];

const ALERTS = [
  { ic: 'warn', t: 'Surveiller · 3 joueurs', d: "Charge hebdomadaire au-dessus de 88 % pour Sow, Guèye et Diallo. Réduire le volume de la séance du jour d'un tiers.", r: 'Haut', rc: '#DC2626' },
  { ic: 'med',  t: 'Dossier médical · 2 mises à jour', d: "Malick Ndiaye (ischio) et Falilou Ndiaye (adducteurs) attendent la validation du staff avant retour au collectif.", r: 'Moyen', rc: '#B45309' },
  { ic: 'cal',  t: 'Documents administratifs', d: "Licence de Sérigne Mbaye expire le 30/09. Pièce manquante : certificat médical d'aptitude signé.", r: 'Bas', rc: '#2563EB' },
];

const MATCHES = [
  { r: 'V', s: '2 – 0', adv: 'ASC Jaraaf – US Gorée', m: 'Ligue 1 · J11 · à domicile', d: 'Dim. 13/09' },
  { r: 'N', s: '1 – 1', adv: 'AS Douanes – ASC Jaraaf', m: 'Ligue 1 · J10 · à l’extérieur', d: 'Dim. 06/09' },
  { r: 'V', s: '3 – 1', adv: 'ASC Jaraaf – Diambars FC', m: 'Ligue 1 · J9 · à domicile', d: 'Sam. 30/08' },
  { r: 'V', s: '2 – 1', adv: 'Djolof FC – ASC Jaraaf', m: 'Coupe · 8e de finale', d: 'Mer. 26/08' },
  { r: 'D', s: '0 – 2', adv: 'Teungueth FC – ASC Jaraaf', m: 'Ligue 1 · J8 · à l’extérieur', d: 'Dim. 23/08' },
];

const CHARGES = [4120, 4380, 3960, 4510, 4230, 4740, 3910, 4620, 5090, 4780];
const WEEKS   = ['S03','S04','S05','S06','S07','S08','S09','S10','S11','S12'];
const SESSIONS = [
  { d: 'Lun', v: 78 }, { d: 'Mar', v: 92 }, { d: 'Jeu', v: 64 }, { d: 'Sam', v: 86 },
];

/* ── KPI ──────────────────────────────────────────────────── */
const KPI = [
  { v: 8.1, unit: '/10', d: '+0,2', dir: 1, l: 'Note moyenne du groupe', note: 'vs 7,9 le mois dernier',
    ico: 'star', c: '#10B981', soft: '#D1FAE5', spark: [7.7,7.8,7.9,7.8,8.0,7.9,8.1,8.0,8.2,8.1] },
  { v: 88, unit: '%', d: '−2 pts', dir: -1, l: 'Assiduité aux séances', note: '2 absences cette semaine',
    ico: 'check', c: '#1E3A5F', soft: '#E0E7FF', spark: [94,96,95,92,93,91,90,89,89,88] },
  { v: 4760, unit: 'UA', d: '+430 UA', dir: 1, l: 'Charge collective / semaine', note: 'moyenne 4 320 UA',
    ico: 'load', c: '#F59E0B', soft: '#FEF3C7', spark: CHARGES },
  { v: 1.24, unit: '', dec: 2, d: '+0,05', dir: 1, l: 'Ratio charge aiguë / chronique', note: 'zone optimale 0,8 – 1,3',
    ico: 'pulse', c: '#DC2626', soft: '#FEE2E2', spark: [1.02,1.08,0.96,1.12,1.05,1.18,1.09,1.21,1.19,1.24] },
];

const ICONS = {
  star:  '<path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8 2 9.4h7.6z"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  load:  '<path d="M3 3v18h18"/><path d="M7 16l4-6 4 3 5-8"/>',
  pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
};

function sparkSVG(vals, color) {
  const w = 150, h = 26, mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || 1;
  const pts = vals.map((v, i) => [ (i / (vals.length - 1)) * w, h - 3 - ((v - mn) / sp) * (h - 8) ]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L${w} ${h} L0 ${h} Z`;
  const id = 'sp' + Math.random().toString(36).slice(2, 7);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity=".22"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#${id})"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${pts[pts.length-1][0].toFixed(1)}" cy="${pts[pts.length-1][1].toFixed(1)}" r="2.4" fill="${color}"/>
  </svg>`;
}

function renderKPIs() {
  $('#kpis').innerHTML = KPI.map(k => {
    const cls = k.dir > 0 ? 'up' : k.dir < 0 ? 'down' : 'flat';
    const arrow = k.dir > 0 ? '▲' : k.dir < 0 ? '▼' : '—';
    return `<article class="card kpi">
      <div class="kpi-top">
        <div>
          <div class="kpi-val num" data-count="${k.v}" data-dec="${k.dec || 0}">0<span class="kpi-unit">${k.unit}</span></div>
          <div class="kpi-label">${k.l}</div>
        </div>
        <div class="kpi-ico" style="background:${k.soft}">
          <svg viewBox="0 0 24 24" fill="none" stroke="${k.c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k.ico]}</svg>
        </div>
      </div>
      <div class="kpi-foot">
        <span class="delta ${cls}">${arrow} ${k.d}</span>
        <span class="kpi-note">${k.note}</span>
      </div>
      ${sparkSVG(k.spark, k.c)}
    </article>`;
  }).join('');
  // compteurs animés
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec);
    const unit = el.querySelector('.kpi-unit')?.outerHTML || '0000§';
    const t0 = performance.now(), dur = 900;
    const tick = now => {
      const t = Math.min((now - t0) / dur, 1);
      const v = target * easeOut(t);
      el.innerHTML = (dec ? nf(v, dec) : nf(Math.round(v))) + unit;
      if (t < 1) requestAnimationFrame(tick);
      else el.innerHTML = (dec ? nf(target, dec) : nf(target)) + unit;
    };
    requestAnimationFrame(tick);
  });
}

/* ── SWRadarChart (canvas) ────────────────────────────────── */
let radarAnim = null;
function drawRadar(canvas, series, { W = 330, H = 268, max = 100 } = {}) {
  const ctx = canvas.getContext('2d');
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const c = W / 2, cy = H / 2, R = 84;
  const angles = PILLARS.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / PILLARS.length);
  const pt = (i, r) => [ c + Math.cos(angles[i]) * r, cy + Math.sin(angles[i]) * r ];

  const paint = t => {
    ctx.clearRect(0, 0, W, H);
    // anneaux de grille 20/40/60/80/100
    for (let g = 1; g <= 5; g++) {
      const r = (R * g) / 5;
      ctx.beginPath();
      angles.forEach((_, i) => { const [x, y] = pt(i, r); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath();
      ctx.strokeStyle = g === 5 ? '#CBD5E1' : '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // rayons
    angles.forEach((_, i) => {
      const [x, y] = pt(i, R);
      ctx.beginPath(); ctx.moveTo(c, cy); ctx.lineTo(x, y);
      ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1; ctx.stroke();
    });

    // séries
    series.forEach(s => {
      const sc = s.scale === undefined ? t : s.scale;
      if (s.dashed) {
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        angles.forEach((_, i) => {
          const [x, y] = pt(i, (s.values[i] / max) * R * sc);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.closePath();
        ctx.strokeStyle = s.color; ctx.lineWidth = 1.6; ctx.globalAlpha = .75; ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else {
        ctx.beginPath();
        angles.forEach((_, i) => {
          const [x, y] = pt(i, (s.values[i] / max) * R * sc);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = s.color + '30'; ctx.fill();
        ctx.strokeStyle = s.color; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
        angles.forEach((_, i) => {
          const [x, y] = pt(i, (s.values[i] / max) * R * sc);
          ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.stroke();
        });
      }
    });

    // labels — ancrés dans la marge du canvas (jamais tronqués)
    angles.forEach((_, i) => {
      const cosv = Math.cos(angles[i]);
      const [px, py] = pt(i, R + 12);
      const isSide = Math.abs(cosv) > 0.25;
      const x = px;
      const y = isSide ? py : py + 4;
      ctx.textAlign = isSide ? (cosv > 0 ? 'left' : 'right') : 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 10px Inter, sans-serif';
      ctx.fillStyle = P[PILLARS[i].key].text;
      ctx.fillText(PILLARS[i].label.toUpperCase(), x, y - 7);
      ctx.font = '700 13px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#1E293B';
      ctx.fillText(Math.round(series[0].values[i] * t), x, y + 7);
    });
  };

  if (radarAnim) cancelAnimationFrame(radarAnim);
  const t0 = performance.now(), dur = 1200;
  const step = now => {
    const t = easeOut(Math.min((now - t0) / dur, 1));
    paint(t);
    if (t < 1) radarAnim = requestAnimationFrame(step);
  };
  radarAnim = requestAnimationFrame(step);
}

let radarMode = 'player', radarPlayer = 0;

function squadAvg() {
  const k = SQUAD.length;
  return PILLARS.map((_, i) => Math.round(SQUAD.reduce((a, p) => a + p.pil[i], 0) / k));
}

function renderRadar() {
  const holder = $('#radarHolder'); holder.innerHTML = '';
  const cv = document.createElement('canvas'); holder.appendChild(cv);
  const pl = SQUAD[radarPlayer];
  const avg = squadAvg();

  let series;
  if (radarMode === 'squad') {
    series = [{ values: avg, color: '#10B981' }];
  } else {
    series = [
      { values: pl.pil, color: '#10B981' },
      { values: avg, color: '#1E3A5F', dashed: true, scale: 1 },
    ];
  }
  drawRadar(cv, series);

  const vals = radarMode === 'squad' ? avg : pl.pil;
  $('#radarLegend').innerHTML = PILLARS.map((p, i) => `
    <div class="pl-row">
      <span class="pl-name">${p.label}</span>
      <span class="pl-bar"><span class="pl-fill" style="background:${P[p.key].fill};transition-delay:${i * 90}ms"></span></span>
      <span class="pl-val num">${vals[i]}</span>
      <span class="pl-delta num">${radarMode === 'player' ? (vals[i] - avg[i] >= 0 ? '+' : '') + (vals[i] - avg[i]) : ''}</span>
    </div>`).join('');
  requestAnimationFrame(() => document.querySelectorAll('#radarLegend .pl-fill')
    .forEach((el, i) => { el.style.width = vals[i] + '%'; }));

  $('#playerPicks').innerHTML = SQUAD.slice(0, 4).map((p, i) => `
    <button class="player-pick ${i === radarPlayer && radarMode === 'player' ? 'on' : ''}" data-pick="${i}">
      <span class="avatar" style="background:${STATUS[p.s].color}20;color:${STATUS[p.s].color}">${initials(p.n)}</span>
      <span>
        <span class="pp-name">${p.n}</span><br>
        <span class="pp-meta">${p.p} · ${STATUS[p.s].label}</span>
      </span>
      <span class="pp-note">${nf(p.note, 1)}</span>
    </button>`).join('');

  document.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
    radarPlayer = +b.dataset.pick; radarMode = 'player';
    document.querySelectorAll('#radarSeg button').forEach(x => x.classList.toggle('on', x.dataset.mode === 'player'));
    renderRadar();
  });
}

/* ── SWRingChart (SVG concentrique) ───────────────────────── */
function renderRings() {
  const size = 232, cx = size / 2, cy = size / 2, ringW = 16, gap = 8;
  let svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
  const total = SESSIONS.reduce((a, s) => a + s.v, 0) * 12; // UA indicatif
  svg += `<text x="${cx}" y="${cy - 5}" text-anchor="middle" class="donut-center-num" style="font-size:20px">${nf(total)}</text>`;
  svg += `<text x="${cx}" y="${cy + 10}" text-anchor="middle" class="donut-center-lbl" style="font-size:8.5px">UA / semaine</text>`;

  SESSIONS.forEach((s, i) => {
    const r = cy - 10 - i * (ringW + gap);
    const circ = 2 * Math.PI * r;
    const max = 100;
    const len = (s.v / max) * circ;
    const col = ['#10B981', '#F59E0B', '#1E88E5', '#8E24AA'][i];
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="${ringW}"/>`;
    svg += `<circle class="ring-arc" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}"
              stroke-width="${ringW}" stroke-linecap="round"
              stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${circ.toFixed(1)}"
              data-len="${len.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"
              style="transition:stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1) ${i * 130}ms"/>`;
  });
  svg += '</svg>';
  $('#ringsHolder').innerHTML = svg;

  $('#ringLegend').innerHTML = SESSIONS.map((s, i) => {
    const col = ['#10B981', '#F59E0B', '#1E88E5', '#8E24AA'][i];
    return `<div class="rl-row"><span class="rl-bullet" style="background:${col}"></span>
      <span class="rl-label">${s.d} — séance</span><span class="rl-val">${s.v} %</span></div>`;
  }).join('');

  $('#acwr').innerHTML = `
    <div class="acwr-row">
      <span class="acwr-lbl">Aiguë · 7 jours</span>
      <span class="acwr-track"><span class="acwr-fill" style="background:#DC2626;width:0"></span></span>
      <span class="acwr-val num">1 190</span>
    </div>
    <div class="acwr-row">
      <span class="acwr-lbl">Chronique · 28 jours</span>
      <span class="acwr-track"><span class="acwr-fill" style="background:#1E3A5F;width:0"></span></span>
      <span class="acwr-val num">960</span>
    </div>
    <div class="acwr-scale"><span>0,8</span><span>Zone optimale</span><span>1,3</span></div>`;

  setTimeout(() => {
    document.querySelectorAll('.ring-arc').forEach(a => {
      a.style.strokeDashoffset = (parseFloat(a.getAttribute('stroke-dasharray')) - parseFloat(a.dataset.len)).toFixed(1);
    });
    const f = document.querySelectorAll('#acwr .acwr-fill');
    if (f[0]) f[0].style.width = '74%';
    if (f[1]) f[1].style.width = '60%';
  }, 60);
}

/* ── SWActivityHeatmap ────────────────────────────────────── */
function renderHeat() {
  const weeks = 12, days = 7, cell = 13, gap = 3;
  const w = weeks * (cell + gap), h = days * (cell + gap);
  let cells = '';
  // densité pseudo-déterministe mais stable
  const dens = [3,4,4,3,4,2,0,3,4,4,3,4,4,3,1,4,4,3,4,4,3,0,4,4,3,4,3,2,4,4,4,3,4,4,3,1,4,3,4,4,3,4,4,2,0,4,4,3,4,4,3,4,4,3,1,4,4,3,4,4,3,4,2,0,4,4,4,3,4,4,3,4,4,3,4,4,4,3,4,4,3,4,4,2];
  const cols = ['#F1F5F9', '#D1FAE5', '#6EE7B7', '#34D399', '#059669'];
  for (let i = 0; i < weeks * days; i++) {
    const wk = Math.floor(i / days), dy = i % days;
    const v = dens[i % dens.length];
    const x = wk * (cell + gap), y = dy * (cell + gap);
    cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${cols[v]}">
      <title>${(v)} séance${v > 1 ? 's' : ''}</title></rect>`;
  }
  $('#heatHolder').innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">${cells}</svg>`;
  $('#streakNum').textContent = '11';
  $('#streakFoot').innerHTML = 'Depuis le 03/07<br>Record : 21 jours';
}

/* ── SWDonutChart ─────────────────────────────────────────── */
let donutFilter = null;
function renderDonut() {
  const counts = { dispo: 0, blesse: 0, recup: 0, susp: 0 };
  SQUAD.forEach(p => counts[p.s]++);
  const total = SQUAD.length;
  const size = 176, cx = size / 2, cy = size / 2, r = 62, sw = 22;
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  let a0 = -Math.PI / 2, svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;

  entries.forEach(([k, v]) => {
    const span = (v / total) * Math.PI * 2;
    const focus = donutFilter === k;
    const rr = focus ? r + 5 : r;
    const a1 = a0 + span;
    const x0 = cx + Math.cos(a0) * rr, y0 = cy + Math.sin(a0) * rr;
    const x1 = cx + Math.cos(a1) * rr, y1 = cy + Math.sin(a1) * rr;
    const large = span > Math.PI ? 1 : 0;
    svg += `<path d="M ${x0} ${y0} A ${rr} ${rr} 0 ${large} 1 ${x1} ${y1}" fill="none"
      stroke="${STATUS[k].color}" stroke-width="${focus ? sw + 4 : sw}" stroke-linecap="butt"
      opacity="${donutFilter && !focus ? .3 : 1}" style="transition:.18s"/>`;
    a0 = a1;
  });
  svg += `<circle cx="${cx}" cy="${cy}" r="${r - sw / 2 - 3}" fill="none" stroke="#fff" stroke-width="1"/>`;
  const shown = donutFilter ? counts[donutFilter] : total;
  const lbl = donutFilter ? STATUS[donutFilter].label : 'Joueurs';
  svg += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" class="donut-center-num">${shown}</text>`;
  svg += `<text x="${cx}" y="${cy + 13}" text-anchor="middle" class="donut-center-lbl">${lbl}</text>`;
  svg += '</svg>';
  $('#donutHolder').innerHTML = svg;

  $('#donutLegend').innerHTML = entries.map(([k, v]) => `
    <button class="dl-row ${donutFilter === k ? 'on' : ''}" data-st="${k}">
      <span class="dl-bullet" style="background:${STATUS[k].color}"></span>
      <span>${STATUS[k].label}</span>
      <span class="dl-val"><span class="dl-num">${v}</span><span class="dl-pct">${nf((v / total) * 100)} %</span></span>
    </button>`).join('');

  document.querySelectorAll('[data-st]').forEach(b => b.onclick = () => {
    donutFilter = donutFilter === b.dataset.st ? null : b.dataset.st;
    renderDonut(); applyFilter();
  });
}

/* ── Table ────────────────────────────────────────────────── */
function initials(n) { return n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }
let tableFilter = 'all';
function applyFilter() {
  if (donutFilter) tableFilter = 'status:' + donutFilter;
  renderTable();
}
function renderTable() {
  let rows = SQUAD.slice();
  if (tableFilter === 'dispo') rows = rows.filter(p => p.s === 'dispo');
  else if (tableFilter === 'alerte') rows = rows.filter(p => p.s !== 'dispo' || p.chg >= 88);
  else if (tableFilter.startsWith('status:')) rows = rows.filter(p => p.s === tableFilter.slice(7));

  $('#tbody').innerHTML = rows.map(p => {
    const chgCol = p.chg < 70 ? '#10B981' : p.chg <= 85 ? '#F59E0B' : '#DC2626';
    return `<tr>
      <td>
        <div class="tbl-name">
          <span class="tbl-av" style="background:${STATUS[p.s].color}">${initials(p.n)}</span>
          <span>
            <span class="tbl-full">${p.n}</span><br>
            <span class="tbl-role">${p.p}</span>
          </span>
        </div>
      </td>
      <td><span class="badge ${STATUS[p.s].cls}">${STATUS[p.s].label}</span></td>
      <td class="r"><span class="note-pill" style="background:${p.note >= 8 ? '#D1FAE5' : '#F1F5F9'};color:${p.note >= 8 ? '#059669' : '#334155'}">${nf(p.note, 1)}</span></td>
      <td class="r">
        <span class="charge">
          <span class="charge-track"><span class="charge-fill" style="width:${p.chg}%;background:${chgCol}"></span></span>
          <span class="charge-num" style="color:${chgCol}">${p.chg}%</span>
        </span>
      </td>
      <td class="r num" style="font-size:11.5px;color:#64748B">${p.ass}%</td>
    </tr>`;
  }).join('');

  document.querySelectorAll('#filterSeg button').forEach(b =>
    b.classList.toggle('on', b.dataset.f === tableFilter));
}

/* ── Notes / alertes / matchs / barres ────────────────────── */
function renderNotes() {
  $('#notes').innerHTML = NOTES.map(nt => `
    <div class="note">
      <span class="note-av" style="background:#1E3A5F">${nt.a}</span>
      <div>
        <div class="note-head"><span class="note-author">${nt.n}</span>
        <span class="note-time">${nt.r} · ${nt.t}</span></div>
        <div class="note-text">« ${nt.x} »</div>
      </div>
    </div>`).join('');
}

const AL_ICO = {
  warn: { c: '#DC2626', bg: '#FEE2E2', d: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>' },
  med:  { c: '#F59E0B', bg: '#FEF3C7', d: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>' },
  cal:  { c: '#2563EB', bg: '#DBEAFE', d: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
};
function renderAlerts() {
  $('#alerts').innerHTML = ALERTS.map(a => {
    const s = AL_ICO[a.ic];
    return `<div class="alert">
      <span class="alert-ico" style="background:${s.bg}">
        <svg viewBox="0 0 24 24" fill="none" stroke="${s.c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.d}</svg>
      </span>
      <div>
        <div class="alert-t">${a.t}</div>
        <div class="alert-d">${a.d}</div>
      </div>
      <span class="risk" style="background:${s.bg};color:${a.rc}">${a.r}</span>
    </div>`;
  }).join('');
}

function renderMatches() {
  const col = { V: '#10B981', N: '#F59E0B', D: '#DC2626' };
  $('#matches').innerHTML = MATCHES.map(m => `
    <div class="match-row">
      <span class="res" style="background:${col[m.r]}">${m.r}</span>
      <span><span class="match-t">${m.adv}</span><br><span class="match-m">${m.m}</span></span>
      <span class="match-score">${m.s}</span>
      <span class="match-m" style="width:66px;text-align:right">${m.d}</span>
    </div>`).join('');
}

function renderBars() {
  const max = Math.max(...CHARGES), mn = Math.min(...CHARGES);
  const w = 300, h = 140, bw = 20, gap = (w - CHARGES.length * bw) / (CHARGES.length + 1);
  let bars = '';
  CHARGES.forEach((v, i) => {
    const bh = ((v - mn * .8) / (max - mn * .8)) * (h - 26);
    const x = gap + i * (bw + gap), y = h - 18 - bh;
    const last = i === CHARGES.length - 1;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="5"
      fill="${last ? '#10B981' : '#CBD5E1'}" data-h="${bh.toFixed(1)}" data-y="${y.toFixed(1)}"/>
      <text x="${(x + bw / 2).toFixed(1)}" y="${h - 5}" text-anchor="middle"
        font-size="8.5" font-weight="600" fill="#94A3B8" font-family="Inter">${WEEKS[i]}</text>`;
  });
  $('#barsHolder').innerHTML = `<svg viewBox="0 0 ${w} ${h + 10}" style="width:100%;height:auto">
    <line x1="0" y1="${h - 18}" x2="${w}" y2="${h - 18}" stroke="#E2E8F0" stroke-width="1"/>${bars}</svg>`;
  requestAnimationFrame(() => document.querySelectorAll('#barsHolder rect[data-h]').forEach((r, i) => {
    setTimeout(() => r.setAttribute('height', r.dataset.h), i * 45);
  }));
}

/* ── SWAnimatedMeshGradient ───────────────────────────────── */
function meshGradient() {
  const cv = $('#mesh'); if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H;
  const resize = () => {
    const r = cv.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const palA = ['#312E81', '#1D4ED8', '#0891B2', '#1E40AF', '#312E81', '#1E3A8A', '#0E7490', '#1D4ED8', '#4F46E5'];
  const palB = ['#0E7490', '#4F46E5', '#1E40AF', '#312E81', '#1D4ED8', '#312E81', '#1D4ED8', '#0891B2', '#1E3A8A'];
  const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  let last = performance.now();

  const frame = now => {
    const dur = 7000, t = ((now % (dur * 2)) / dur) > 1 ? 2 - ((now % (dur * 2)) / dur) : (now % (dur * 2)) / dur;
    const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const cA = hex2rgb(palA[i]), cB = hex2rgb(palB[i]);
      const rgb = cA.map((v, k) => Math.round(v + (cB[k] - v) * e));
      const gx = (i % 3) * (W / 2), gy = Math.floor(i / 3) * (H / 2);
      const g = ctx.createRadialGradient(gx + W / 4, gy + H / 4, 0, gx + W / 4, gy + H / 4, Math.max(W, H) * .55);
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.85)`);
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* ── Bloc IA ──────────────────────────────────────────────── */
function renderAI() {
  $('#aiBody').innerHTML = `Face à <strong>Teungueth FC</strong>, l'adversaire attaque à <strong>63 % par le couloir gauche</strong>. Votre côté droit a concédé 8 occasions lors des 3 derniers matchs.`;
  $('#aiList').innerHTML = [
    [1, 'Aligner <b>Pape Sow</b> et <b>Ibou Diop</b> sur le couloir droit : ce sont les deux meilleurs volumes défensifs du groupe (86 · 87).'],
    [2, 'Préserver <b>Seydou Camara</b> en sortie de banc : sa charge est à 63 %, il peut couvrir 30 minutes à haute intensité.'],
    [3, 'Réduire le volume de <b>Modou Guèye</b> (92 % de charge) : risque de blessure multiplié par 2,4 au-delà de 90 %.'],
  ].map(([n, t]) => `<div class="ai-item"><span class="ai-num">0${n}</span><span class="ai-item-t">${t}</span></div>`).join('');
}

/* ── Interactions ─────────────────────────────────────────── */
$('#radarSeg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  radarMode = b.dataset.mode;
  document.querySelectorAll('#radarSeg button').forEach(x => x.classList.toggle('on', x === b));
  renderRadar();
});
$('#filterSeg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  tableFilter = b.dataset.f;
  if (tableFilter !== 'all') donutFilter = tableFilter === 'alerte' ? donutFilter : null;
  if (tableFilter === 'all') donutFilter = null;
  renderDonut(); renderTable();
});

/* ── Boot ─────────────────────────────────────────────────── */
renderKPIs();
renderRadar();
renderRings();
renderHeat();
renderDonut();
renderTable();
renderNotes();
renderAlerts();
renderMatches();
renderBars();
renderAI();
meshGradient();
