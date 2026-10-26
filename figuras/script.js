/* =========================================================
   Exploradores de Figuras — lógica de la aventura
   3.º grado · Figuras geométricas planas
   El progreso vive solo en la memoria de esta pestaña:
   no se guarda en el equipo ni se envía a ningún servidor.
   ========================================================= */
'use strict';

(function () {

  /* ---------------------------------------------------------
     1. Utilidades
     --------------------------------------------------------- */
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const app = $('#app');

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const clamp = (v) => Math.max(0, Math.min(255, v));
    const r = clamp((n >> 16) + amt), g = clamp(((n >> 8) & 255) + amt), b = clamp((n & 255) + amt);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------------------------------------------------------
     2. Figuras (SVG) y sus propiedades geométricas
     --------------------------------------------------------- */
  const C = {
    coral: '#FF6B6B', sun: '#FFC23C', teal: '#18B3A4', sky: '#3B9EF2', violet: '#8B6CEF',
    green: '#43B864', pink: '#FF6FAE', orange: '#F29A2E', brown: '#C49A6C', blue: '#3D8BD9',
    red: '#E5484D', yellow: '#F7C531', lime: '#7BC950', purple: '#9C8BDB', dgreen: '#2E8B3E'
  };

  function regPts(n, r, cx, cy, startDeg) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (startDeg + (360 / n) * i) * Math.PI / 180;
      pts.push([+(cx + r * Math.cos(a)).toFixed(2), +(cy + r * Math.sin(a)).toFixed(2)]);
    }
    return pts;
  }

  // Coordenadas dentro de una caja de 100 × 100.
  const SHAPES = {
    square:      { pts: [[20, 20], [80, 20], [80, 80], [20, 80]] },
    rectangle:   { pts: [[6, 30], [94, 30], [94, 70], [6, 70]] },
    triEq:       { pts: [[50, 13], [93, 87], [7, 87]] },
    triIso:      { pts: [[50, 6], [78, 92], [22, 92]] },
    triRight:    { pts: [[14, 22], [14, 86], [92, 86]] },
    triRightIso: { pts: [[15, 15], [15, 85], [85, 85]] },
    triObtuse:   { pts: [[4, 70], [96, 70], [26, 36]] },
    triScalene:  { pts: [[10, 85], [90, 85], [62, 15]] },
    rhombus:     { pts: [[50, 6], [80, 50], [50, 94], [20, 50]] },
    trapezoid:   { pts: [[30, 24], [70, 24], [94, 76], [6, 76]] },
    pentagon:    { pts: regPts(5, 46, 50, 54, -90) },
    hexagon:     { pts: regPts(6, 46, 50, 50, 0) },
    circle:      { circle: true },
    oval:        { ellipse: true }
  };

  // eq: 'all' todos los lados iguales · 'pairs' 2 largos iguales y 2 cortos iguales
  //     'two' dos lados iguales · 'none' todos distintos
  const PROPS = {
    square:      { name: 'cuadrado',   sides: 4, vertices: 4, right: 4, eq: 'all',   angles: 'recto' },
    rectangle:   { name: 'rectángulo', sides: 4, vertices: 4, right: 4, eq: 'pairs', angles: 'recto' },
    triEq:       { name: 'triángulo',  sides: 3, vertices: 3, right: 0, eq: 'all',   angles: 'agudos' },
    triIso:      { name: 'triángulo',  sides: 3, vertices: 3, right: 0, eq: 'two',   angles: 'agudos' },
    triRight:    { name: 'triángulo',  sides: 3, vertices: 3, right: 1, eq: 'none',  angles: 'recto' },
    triRightIso: { name: 'triángulo',  sides: 3, vertices: 3, right: 1, eq: 'two',   angles: 'recto' },
    triObtuse:   { name: 'triángulo',  sides: 3, vertices: 3, right: 0, eq: 'none',  angles: 'obtuso' },
    triScalene:  { name: 'triángulo',  sides: 3, vertices: 3, right: 0, eq: 'none',  angles: 'agudos' },
    rhombus:     { name: 'rombo',      sides: 4, vertices: 4, right: 0, eq: 'all',   angles: 'mixtos' },
    trapezoid:   { name: 'trapecio',   sides: 4, vertices: 4, right: 0, eq: 'two',   angles: 'mixtos' },
    pentagon:    { name: 'pentágono',  sides: 5, vertices: 5, right: 0, eq: 'all',   angles: 'obtusos' },
    hexagon:     { name: 'hexágono',   sides: 6, vertices: 6, right: 0, eq: 'all',   angles: 'obtusos' },
    circle:      { name: 'círculo',    sides: 0, vertices: 0, right: 0, eq: '-',     angles: '-', curved: true },
    oval:        { name: 'óvalo',      sides: 0, vertices: 0, right: 0, eq: '-',     angles: '-', curved: true }
  };

  const S = (type, color, rot = 0, extra = {}) => Object.assign({ type, color, rot }, extra);

  function shapeBody(type, scale = 1) {
    const d = SHAPES[type];
    const sc = (v) => +(50 + (v - 50) * scale).toFixed(2);
    if (d.circle) return `<circle cx="50" cy="50" r="${(40 * scale).toFixed(1)}"/>`;
    if (d.ellipse) return `<ellipse cx="50" cy="50" rx="${(45 * scale).toFixed(1)}" ry="${(27 * scale).toFixed(1)}"/>`;
    return `<polygon points="${d.pts.map(([x, y]) => sc(x) + ',' + sc(y)).join(' ')}"/>`;
  }

  function shapeSVG(spec, extraClass = '') {
    const color = spec.color || C.sky;
    const face = spec.face ? `<g fill="#1E2A4A" stroke="none"><circle cx="40" cy="52" r="4.5"/><circle cx="60" cy="52" r="4.5"/></g><path d="M40 64 Q50 73 60 64" fill="none" stroke="#1E2A4A" stroke-width="3.5" stroke-linecap="round"/>` : '';
    return `<svg class="shp ${extraClass}" viewBox="-6 -6 112 112" aria-hidden="true" focusable="false">` +
      `<g transform="rotate(${spec.rot || 0} 50 50)" fill="${color}" stroke="${shade(color, -45)}" stroke-width="3" stroke-linejoin="round">${shapeBody(spec.type, spec.scale || 1)}</g>${face}</svg>`;
  }

  /* ---------------------------------------------------------
     3. Ayudas para armar “escenas” (guardas, tarjetas, chicos)
     --------------------------------------------------------- */
  function guardaHTML(items, opts = {}) {
    const cells = items.map((s, i) => {
      const inner = shapeSVG(s);
      if (opts.clickable) {
        return `<button type="button" class="g-item" data-i="${i}" aria-pressed="false" aria-label="Figura ${i + 1} de la guarda">${inner}<span class="g-num" aria-hidden="true">${i + 1}</span></button>`;
      }
      return `<span class="g-item">${inner}</span>`;
    }).join('');
    return `<div class="guarda-wrap">${opts.label ? `<span class="guarda-label">${opts.label}</span>` : ''}<div class="guarda ${opts.big ? 'big' : ''}">${cells}</div></div>`;
  }

  function clueCardHTML(lines, title = 'La tarjeta dice:') {
    return `<div class="clue-card" style="max-width:640px"><h3>${title}</h3><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>`;
  }

  function kidsHTML(kids) {
    return `<div class="kids">${kids.map((k) => `<div class="kid"><div class="kid-face" aria-hidden="true">${k.face}</div><div class="kid-name">${k.name} pescó:</div>${shapeSVG(k.shape)}</div>`).join('')}</div>`;
  }

  // Dibujos sobre cuadrícula (1 cuadradito = 1 cm). rects: [x, y, w, h, color]
  function gridDrawing(w, h, parts, opts = {}) {
    const lines = [];
    for (let x = 0; x <= w; x++) lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
    for (let y = 0; y <= h; y++) lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
    const shapes = parts.map((p) => {
      if (p.poly) return `<polygon points="${p.poly.map((q) => q.join(',')).join(' ')}" fill="${p.color}" fill-opacity="${p.op || .85}" stroke="${shade(p.color, -60)}" stroke-width=".08" stroke-linejoin="round"/>`;
      return `<rect x="${p.r[0]}" y="${p.r[1]}" width="${p.r[2]}" height="${p.r[3]}" fill="${p.color}" fill-opacity="${p.op || .85}" stroke="${shade(p.color, -60)}" stroke-width=".08"/>`;
    }).join('');
    const maxW = opts.maxW || 520;
    return `<svg viewBox="-0.3 -0.3 ${w + 0.6} ${h + 0.6}" style="width:min(${maxW}px,100%);height:auto;max-height:${opts.maxH || 260}px;background:#fff;border-radius:14px;border:3px solid #E7DCC6" aria-hidden="true">` +
      `<g stroke="#CFE3F5" stroke-width=".04">${lines.join('')}</g>${shapes}${opts.extra || ''}</svg>`;
  }

  // Pequeño dibujo de un ángulo para las cajas de clasificación.
  function angleIcon(kind) {
    const paths = {
      recto: '<path d="M8 8 V36 H36" /><rect x="8" y="26" width="10" height="10" fill="none"/>',
      agudo: '<path d="M8 36 H38 M8 36 L30 10" />',
      obtuso: '<path d="M14 36 H40 M14 36 L2 12" />'
    };
    return `<svg viewBox="0 0 44 44" aria-hidden="true"><g fill="none" stroke="#1E2A4A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</g></svg>`;
  }

  /* ---------------------------------------------------------
     4. Habilidades (para la evaluación formativa)
     --------------------------------------------------------- */
  const SKILLS = {
    reconocer: 'Reconocer y nombrar figuras',
    curvos: 'Diferenciar lados rectos y bordes curvos',
    contar: 'Contar lados y vértices',
    triangulos: 'Triángulos según sus ángulos y sus lados',
    patrones: 'Descubrir y completar patrones (guardas)',
    propiedades: 'Reconocer figuras a partir de pistas',
    componer: 'Componer y descomponer figuras',
    diagonales: 'Marcar lados, vértices y diagonales',
    medidas: 'Medir lados en centímetros',
    cuadrilateros: 'Cuadriláteros: cuadrado y rectángulo'
  };

  /* ---------------------------------------------------------
     5. Piezas de la fábrica (unidades = cuadraditos de 1 cm)
     --------------------------------------------------------- */
  const PIECES = {
    triRI3: { name: 'triángulo marrón', pts: [[0, 0], [3, 0], [0, 3]], color: C.brown },
    tri42:  { name: 'triángulo azul', pts: [[0, 0], [4, 0], [0, 2]], color: C.blue },
    triRI2: { name: 'triángulo pequeño', pts: [[0, 0], [2, 0], [0, 2]], color: C.violet },
    triHead:{ name: 'triángulo', pts: [[0, 0], [0, 4], [2, 2]], color: C.pink },
    sq2:    { name: 'cuadrado pequeño', pts: [[0, 0], [2, 0], [2, 2], [0, 2]], color: C.yellow },
    sq3:    { name: 'cuadrado', pts: [[0, 0], [3, 0], [3, 3], [0, 3]], color: C.brown },
    sq4:    { name: 'cuadrado grande', pts: [[0, 0], [4, 0], [4, 4], [0, 4]], color: C.teal },
    rect42: { name: 'rectángulo', pts: [[0, 0], [4, 0], [4, 2], [0, 2]], color: C.sky }
  };

  function transformPts(base, rot, flip) {
    let pts = base.map(([x, y]) => (flip ? [-x, y] : [x, y]));
    for (let k = 0; k < (rot % 4); k++) pts = pts.map(([x, y]) => [-y, x]);
    const mx = Math.min(...pts.map((p) => p[0])), my = Math.min(...pts.map((p) => p[1]));
    return pts.map(([x, y]) => [x - mx + 0, y - my + 0]);
  }
  function bbox(pts) {
    return { w: Math.max(...pts.map((p) => p[0])), h: Math.max(...pts.map((p) => p[1])) };
  }
  function pieceSVGThumb(kind) {
    const p = PIECES[kind];
    const b = bbox(p.pts);
    return `<svg viewBox="-0.3 -0.3 ${b.w + 0.6} ${b.h + 0.6}" aria-hidden="true"><polygon points="${p.pts.map((q) => q.join(',')).join(' ')}" fill="${p.color}" stroke="${shade(p.color, -60)}" stroke-width=".1" stroke-linejoin="round"/></svg>`;
  }
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  const solPoly = (s) => transformPts(PIECES[s.kind].pts, s.rot || 0, !!s.flip).map(([x, y]) => [x + s.x, y + s.y]);

  /* ---------------------------------------------------------
     6. Contenidos: niveles y desafíos (basados en la planificación)
     --------------------------------------------------------- */
  const o = (id, shape, label) => ({ id, shape, label });
  const t = (id, label, shape) => ({ id, label, shape });

  // Guarda de Ramiro (actividad 1 de la planificación)
  const RAMIRO_UNIT = [S('triRightIso', C.orange, 180), S('square', C.orange), S('circle', C.orange), S('triEq', C.orange), S('rectangle', C.orange)];
  const RAMIRO = RAMIRO_UNIT.concat(RAMIRO_UNIT);
  const RAMIRO_WRONG = RAMIRO.map((s, i) => (i === 1 || i === 6 ? S('rectangle', C.orange) : s));
  // Secuencias de Pilar (actividad 3)
  const P_EQ = S('triEq', C.dgreen), P_OB = S('triObtuse', '#3FA34D');
  const P_SQ = S('square', C.dgreen), P_RE = S('rectangle', C.dgreen);

  // Pescando: estanque general
  const POND = [
    S('square', C.blue), S('square', C.sun, 30), S('rectangle', C.red), S('rectangle', C.teal, 90),
    S('triEq', C.yellow), S('triRight', C.coral, 0), S('triObtuse', C.green), S('circle', C.sky),
    S('pentagon', C.violet), S('rhombus', C.pink), S('trapezoid', C.orange)
  ];

  // Triángulos numerados (actividad 7 de la planificación)
  const TRI6 = [
    t('t1', '1', S('triRightIso', C.blue, 0)),
    t('t2', '2', S('triObtuse', C.blue, 8)),
    t('t3', '3', S('triRight', C.blue, 90)),
    t('t4', '4', S('triEq', C.blue, 0)),
    t('t5', '5', S('triIso', C.blue, -90)),
    t('t6', '6', S('triScalene', C.blue, 200))
  ];

  const LEVELS = [
    /* ================= NIVEL 1 ================= */
    {
      id: 'L1', num: 1, title: 'Detectives de figuras', icon: '🔍', color: '#3B9EF2',
      goal: 'Reconocé, nombrá y compará figuras planas.',
      badge: 'detective',
      oral: [
        '¿Qué nombre recibe la figura que tiene exactamente 3 lados rectos y 3 vértices?',
        '¿Qué figura plana no tiene lados rectos ni esquinas? ¿Cómo es su borde?',
        'Si contás las esquinas de un cuadrado y de un rectángulo, ¿cuántas encontrás en cada uno?'
      ],
      challenges: [
        { id: 'L1-1', type: 'choice', skill: 'reconocer', prompt: 'Tocá el triángulo.',
          options: [o('a', S('circle', C.sky)), o('b', S('triIso', C.coral, 25)), o('c', S('square', C.sun)), o('d', S('pentagon', C.green, 10))],
          correct: ['b'], hint: 'Buscá la figura que tiene 3 lados rectos.',
          explain: 'El triángulo tiene 3 lados rectos y 3 vértices, aunque esté inclinado.' },

        { id: 'L1-2', type: 'choice', skill: 'reconocer', prompt: 'Tocá el cuadrado.', sub: 'Puede estar girado.',
          options: [o('a', S('rectangle', C.sky)), o('b', S('square', C.violet, 20)), o('c', S('rhombus', C.pink)), o('d', S('trapezoid', C.teal))],
          correct: ['b'], hint: 'Buscá 4 lados iguales y esquinas como las de una hoja (ángulos rectos).',
          explain: 'El cuadrado tiene 4 lados iguales y 4 ángulos rectos. ¡Sigue siendo cuadrado aunque esté girado! El rombo tiene lados iguales, pero sus ángulos no son rectos.' },

        { id: 'L1-3', type: 'choice', multi: true, skill: 'reconocer', prompt: 'Tocá todos los rectángulos.', sub: 'Hay más de uno. Después tocá «Comprobar».',
          options: [o('a', S('rectangle', C.coral)), o('b', S('rhombus', C.green)), o('c', S('rectangle', C.sky, 90)), o('d', S('trapezoid', C.violet)), o('e', S('rectangle', C.sun, 30)), o('f', S('triRight', C.orange))],
          correct: ['a', 'c', 'e'], hint: 'Un rectángulo tiene 2 lados largos iguales, 2 cortos iguales y 4 ángulos rectos. No importa el color ni la posición.',
          explain: 'Hay 3 rectángulos: tienen 2 lados largos iguales, 2 cortos iguales y 4 ángulos rectos, aunque cambien el color y la posición.' },

        { id: 'L1-4', type: 'sort', skill: 'curvos', prompt: '¿Lados rectos o borde curvo? Llevá cada figura a su caja.', sub: 'Podés arrastrar o tocar la figura y después la caja.',
          bins: [{ id: 'rectos', label: 'Solo lados rectos', color: C.blue, icon: shapeSVG(S('triEq', C.blue)) }, { id: 'curvos', label: 'Borde curvo', color: C.pink, icon: shapeSVG(S('circle', C.pink)) }],
          items: [
            { id: 'a', shape: S('circle', C.coral), bin: 'curvos' }, { id: 'b', shape: S('triEq', C.sun, 15), bin: 'rectos' },
            { id: 'c', shape: S('oval', C.sky), bin: 'curvos' }, { id: 'd', shape: S('rectangle', C.violet, 90), bin: 'rectos' },
            { id: 'e', shape: S('pentagon', C.green), bin: 'rectos' }, { id: 'f', shape: S('circle', C.teal, 0, { scale: .6 }), bin: 'curvos' },
            { id: 'g', shape: S('hexagon', C.pink), bin: 'rectos' }
          ],
          hint: 'Pasá el dedo por el borde: ¿encontrás esquinas (vértices) o es redondo?',
          explain: 'El círculo y el óvalo tienen borde curvo: no tienen lados rectos ni vértices. Las demás figuras tienen solo lados rectos.' },

        { id: 'L1-5', type: 'match', skill: 'reconocer', prompt: 'Uní cada figura con su nombre.', sub: 'Tocá una figura y después su nombre.',
          pairs: [
            { id: 'a', shape: S('triScalene', C.orange), label: 'triángulo' }, { id: 'b', shape: S('square', C.sky, 10), label: 'cuadrado' },
            { id: 'c', shape: S('rectangle', C.green), label: 'rectángulo' }, { id: 'd', shape: S('circle', C.pink), label: 'círculo' },
            { id: 'e', shape: S('pentagon', C.violet), label: 'pentágono' }
          ],
          hint: 'Contá los lados: 3 lados → triángulo; 5 lados → pentágono.',
          explain: 'Triángulo: 3 lados. Cuadrado: 4 lados iguales. Rectángulo: 2 lados largos y 2 cortos. Círculo: borde curvo. Pentágono: 5 lados.' },

        { id: 'L1-6', type: 'choice', multi: true, skill: 'contar', prompt: 'Tocá todas las figuras que tienen 4 vértices, como el cuadrado.',
          options: [o('a', S('triEq', C.coral)), o('b', S('rectangle', C.sky, 15)), o('c', S('pentagon', C.green)), o('d', S('rhombus', C.pink)), o('e', S('circle', C.sun)), o('f', S('trapezoid', C.violet))],
          correct: ['b', 'd', 'f'], hint: '¡Contá los vértices (esquinas) de cada figura para comprobarlo!',
          explain: 'El rectángulo, el rombo y el trapecio tienen 4 vértices y 4 lados, igual que el cuadrado. ¡Todos son cuadriláteros!' },

        { id: 'L1-7', type: 'choice', skill: 'triangulos', prompt: '¿Cuál de estos triángulos tiene un ángulo recto?',
          options: [o('a', S('triEq', C.sky)), o('b', S('triRight', C.coral, 200)), o('c', S('triObtuse', C.sun)), o('d', S('triScalene', C.green, 30))],
          correct: ['b'], hint: 'Un ángulo recto es como la esquina de una hoja. Imaginá que apoyás la esquina de un papel.',
          explain: 'Ese triángulo tiene una esquina igual a la de una hoja: un ángulo recto.' },

        { id: 'L1-8', type: 'sort', skill: 'triangulos', prompt: 'Clasificá los triángulos según sus ángulos.',
          bins: [
            { id: 'recto', label: 'Tiene un ángulo recto', color: C.coral, icon: angleIcon('recto') },
            { id: 'agudos', label: 'Tiene 3 ángulos agudos (más cerrados que el recto)', color: C.green, icon: angleIcon('agudo') },
            { id: 'obtuso', label: 'Tiene un ángulo obtuso (más abierto que el recto)', color: C.violet, icon: angleIcon('obtuso') }
          ],
          items: [
            { id: 'a', shape: S('triRight', C.coral, 0), bin: 'recto' }, { id: 'b', shape: S('triEq', C.sun, 0), bin: 'agudos' },
            { id: 'c', shape: S('triObtuse', C.sky, 0), bin: 'obtuso' }, { id: 'd', shape: S('triRightIso', C.green, 135), bin: 'recto' },
            { id: 'e', shape: S('triScalene', C.pink, 20), bin: 'agudos' }, { id: 'f', shape: S('triObtuse', C.violet, 160), bin: 'obtuso' }
          ],
          hint: 'Compará cada esquina con la esquina de una hoja: ¿es igual, más cerrada o más abierta?',
          explain: 'Ángulo recto: como la esquina de una hoja. Agudo: más cerrado. Obtuso: más abierto que el recto.' },

        { id: 'L1-9', type: 'memo', skill: 'reconocer', prompt: 'Memotest: encontrá cada figura con su descripción.', sub: 'Dá vuelta dos cartas por vez.',
          pairs: [
            { id: 'a', shape: S('triEq', C.coral), text: '3 lados rectos y 3 vértices' },
            { id: 'b', shape: S('circle', C.sky), text: 'Sin lados rectos ni vértices' },
            { id: 'c', shape: S('square', C.green), text: '4 lados iguales y 4 ángulos rectos' },
            { id: 'd', shape: S('rectangle', C.violet), text: '2 lados largos iguales y 2 cortos iguales' },
            { id: 'e', shape: S('pentagon', C.orange), text: '5 lados y 5 vértices' }
          ],
          explain: '¡Encontraste todas las parejas! Cada figura se reconoce por sus lados y sus vértices.' }
      ]
    },

    /* ================= NIVEL 2 ================= */
    {
      id: 'L2', num: 2, title: 'El misterio de las guardas', icon: '🧩', color: '#8B6CEF',
      goal: 'Descubrí patrones y completá guardas.',
      badge: 'patrones',
      oral: [
        '¿Qué le dirías a Ramiro para que no se confunda nuevamente?',
        'Contale a un compañero o compañera cómo hiciste para completar la guarda.',
        'En la secuencia 2 de Pilar, ¿en qué se parecen y en qué se diferencian las figuras?'
      ],
      challenges: [
        { id: 'L2-1', type: 'choice', multi: true, skill: 'patrones', prompt: 'Mirá la guarda de Ramiro. ¿Qué figuras aparecen?', sub: 'Tocá todas las que veas y después «Comprobar».',
          display: guardaHTML(RAMIRO),
          options: [t('a', 'Triángulo', S('triEq', C.orange)), t('b', 'Cuadrado', S('square', C.orange)), t('c', 'Círculo', S('circle', C.orange)), t('d', 'Rectángulo', S('rectangle', C.orange)), t('e', 'Rombo', S('rhombus', C.orange)), t('f', 'Pentágono', S('pentagon', C.orange))],
          textCols: 2, correct: ['a', 'b', 'c', 'd'], hint: 'Recorré la guarda figura por figura. Hay dos clases de triángulos, pero los dos son triángulos.',
          explain: 'Aparecen triángulos, cuadrados, círculos y rectángulos. No hay rombos ni pentágonos.' },

        { id: 'L2-2', type: 'choice', skill: 'patrones', prompt: '¿Cada cuántas figuras vuelve a empezar el dibujo?',
          display: guardaHTML(RAMIRO),
          options: [t('a', '3 figuras'), t('b', '4 figuras'), t('c', '5 figuras'), t('d', '10 figuras')], textCols: 2,
          correct: ['c'], hint: 'Mirá la primera figura y buscá dónde aparece otra vez.',
          explain: 'Cada 5 figuras vuelve a empezar: triángulo, cuadrado, círculo, triángulo, rectángulo.' },

        { id: 'L2-3', type: 'pattern', skill: 'patrones', prompt: 'Marcá el patrón que se repite.', sub: 'Tocá las figuras de una vuelta completa, una al lado de la otra.',
          seq: RAMIRO, period: 5,
          hint: 'Una vuelta completa son las figuras que hay antes de que el dibujo empiece otra vez.',
          explain: 'El patrón tiene 5 figuras seguidas: triángulo, cuadrado, círculo, triángulo y rectángulo.' },

        { id: 'L2-4', type: 'findError', skill: 'patrones', prompt: 'Ramiro armó así la guarda. ¿La armó bien?', sub: 'Tocá las figuras que están mal y después «Comprobar».',
          model: RAMIRO, seq: RAMIRO_WRONG, wrongIdx: [1, 6],
          fix: { prompt: '¿Qué figura tenía que ir en esos lugares?', options: [t('a', 'Un cuadrado', S('square', C.orange)), t('b', 'Un rectángulo', S('rectangle', C.orange)), t('c', 'Un círculo', S('circle', C.orange))], correct: 'a' },
          hint: 'Compará la guarda de Ramiro con el modelo, figura por figura. Mirá bien si los 4 lados son iguales.',
          explain: 'Ramiro puso rectángulos donde iban cuadrados. El cuadrado tiene sus 4 lados iguales; el rectángulo tiene 2 lados largos y 2 cortos.' },

        { id: 'L2-5', type: 'choice', skill: 'patrones', prompt: '¿Qué le dirías a Ramiro para que no se confunda nuevamente?',
          options: [t('a', 'Que compare los lados: el cuadrado tiene sus 4 lados iguales.'), t('b', 'Que use figuras de otro color.'), t('c', 'Que arme la guarda más rápido.')],
          correct: ['a'], hint: '¿Qué diferencia al cuadrado del rectángulo?',
          explain: 'Para no confundir el cuadrado con el rectángulo hay que mirar (o medir) los lados: el cuadrado tiene sus 4 lados iguales.' },

        { id: 'L2-6', type: 'sequence', skill: 'patrones', prompt: 'Completá la secuencia 1 de Pilar.', sub: 'Elegí una figura de abajo y ponela en el lugar vacío.',
          seq: [P_EQ, P_OB, P_EQ, P_OB, P_EQ, null, null], answer: ['triObtuse', 'triEq'],
          palette: [S('triEq', C.dgreen), S('triObtuse', '#3FA34D'), S('triRight', C.dgreen), S('square', C.dgreen)],
          hint: 'Los dos triángulos se van turnando: uno, el otro, uno, el otro…',
          explain: 'La secuencia alterna el triángulo de lados iguales y el triángulo de lados distintos con un ángulo muy abierto.' },

        { id: 'L2-7', type: 'choice', skill: 'triangulos', prompt: 'En la secuencia 1, ¿en qué se diferencian los triángulos?',
          display: guardaHTML([P_EQ, P_OB, P_EQ]),
          options: [t('a', 'Uno tiene sus 3 lados iguales; el otro tiene lados de distinta medida y un ángulo muy abierto (obtuso).'), t('b', 'Uno tiene 3 lados y el otro tiene 4 lados.'), t('c', 'Se diferencian solo en el color.')],
          correct: ['a'], hint: 'Los dos son verdes y los dos tienen 3 lados. Mirá la medida de sus lados y sus ángulos.',
          explain: 'Los dos son triángulos (3 lados), pero uno tiene 3 lados iguales y el otro tiene lados distintos y un ángulo obtuso.' },

        { id: 'L2-8', type: 'sequence', skill: 'patrones', prompt: 'Completá la secuencia 2 de Pilar.',
          seq: [P_SQ, P_EQ, P_EQ, P_RE, P_SQ, null, P_EQ, null], answer: ['triEq', 'rectangle'],
          palette: [S('square', C.dgreen), S('triEq', C.dgreen), S('rectangle', C.dgreen), S('circle', C.dgreen)],
          hint: 'El patrón es: cuadrado, triángulo, triángulo, rectángulo… y vuelve a empezar.',
          explain: 'El patrón es cuadrado, triángulo, triángulo, rectángulo, y se repite.' },

        { id: 'L2-9', type: 'choice', skill: 'reconocer', prompt: 'En la secuencia 2, ¿en qué se parecen todas las figuras?',
          display: guardaHTML([P_SQ, P_EQ, P_EQ, P_RE]),
          options: [t('a', 'Todas tienen lados rectos y vértices.'), t('b', 'Todas tienen 4 lados.'), t('c', 'Todas tienen borde curvo.')],
          correct: ['a'], hint: 'Contá los lados de cada una: ¿tienen todas la misma cantidad?',
          explain: 'Todas tienen lados rectos y vértices. Se diferencian en la cantidad de lados: el cuadrado y el rectángulo tienen 4; los triángulos, 3.' },

        { id: 'L2-10', type: 'sequence', skill: 'patrones', prompt: 'Completá la guarda. ¡Fijate en la forma, no en el color!',
          seq: [S('circle', C.coral), S('square', C.sky), S('square', C.sun), S('circle', C.green), S('square', C.pink), S('square', C.violet, 15), null, null, null],
          answer: ['circle', 'square', 'square'],
          palette: [S('circle', C.orange), S('square', C.teal), S('triEq', C.blue), S('rectangle', C.red)],
          hint: 'El color cambia, pero las formas se repiten: círculo, cuadrado, cuadrado…',
          explain: 'El patrón es círculo, cuadrado, cuadrado. Los colores cambian, pero la forma es lo que se repite.' },

        { id: 'L2-11', type: 'create', skill: 'patrones', prompt: '¡Creá tu propia guarda!', sub: 'Elegí de 2 a 4 figuras para tu patrón. Mirá cómo se repite.',
          palette: [S('triEq', C.coral), S('square', C.sky), S('circle', C.sun), S('rectangle', C.green), S('rhombus', C.pink), S('pentagon', C.violet)],
          hint: 'Contá cuántas figuras tiene tu patrón antes de volver a empezar.',
          explain: 'Una guarda se forma repitiendo siempre el mismo patrón.' }
      ]
    },

    /* ================= NIVEL 3 ================= */
    {
      id: 'L3', num: 3, title: 'Pescando figuras', icon: '🎣', color: '#18B3A4',
      goal: 'Leé las pistas y pescá la figura correcta.',
      badge: 'pescador',
      oral: [
        '¿Cómo te diste cuenta de qué figura había que pescar?',
        'Inventá una tarjeta con pistas para que un compañero pesque una figura.',
        '¿Todos los triángulos tienen sus tres lados de igual longitud?'
      ],
      challenges: [
        { id: 'L3-1', type: 'fish', skill: 'propiedades', prompt: 'Leé la tarjeta y pescá una figura que cumpla todo.',
          clues: [{ t: 'Tengo 3 lados rectos.', f: (p) => p.sides === 3 }, { t: 'Tengo 3 vértices.', f: (p) => p.vertices === 3 }],
          pond: POND, hint: 'Contá los lados rectos de la figura antes de pescarla.',
          explain: '¡Cualquier triángulo cumple! Todos los triángulos tienen 3 lados rectos y 3 vértices.' },

        { id: 'L3-2', type: 'fish', skill: 'propiedades', prompt: 'Pilar y Juani tienen esta tarjeta. ¡Pescá la figura!',
          clues: [{ t: 'Tengo 4 ángulos rectos.', f: (p) => p.right === 4 }, { t: 'Todos mis lados son de igual medida.', f: (p) => p.eq === 'all' }],
          pond: POND, hint: 'Necesitás las dos cosas: esquinas como las de una hoja y lados iguales.',
          explain: 'Es el cuadrado: tiene 4 ángulos rectos y sus 4 lados iguales. ¡Aunque esté girado sigue siendo cuadrado!' },

        { id: 'L3-3', type: 'fish', skill: 'propiedades', prompt: 'Franco y Ramiro tienen esta tarjeta. ¡Pescá la figura!',
          clues: [{ t: 'Tengo 3 lados.', f: (p) => p.sides === 3 }, { t: 'Tengo un ángulo recto.', f: (p) => p.right === 1 }],
          pond: POND, hint: 'Buscá un triángulo que tenga una esquina como la de una hoja.',
          explain: 'Es un triángulo con un ángulo recto.' },

        { id: 'L3-4', type: 'fish', skill: 'propiedades', prompt: 'Lautaro tiene esta tarjeta. ¡Pescá la figura!',
          clues: [{ t: 'Tengo 4 lados y 4 ángulos rectos.', f: (p) => p.sides === 4 && p.right === 4 }, { t: 'Tengo 2 lados largos de igual medida y 2 lados cortos de igual medida.', f: (p) => p.eq === 'pairs' }],
          pond: POND, hint: 'El cuadrado tiene 4 lados iguales. ¿Qué figura tiene lados largos y cortos?',
          explain: 'Es el rectángulo: 2 lados largos iguales, 2 cortos iguales y 4 ángulos rectos.' },

        { id: 'L3-5', type: 'fish', progressive: true, skill: 'propiedades', prompt: '¿Quién soy? Pedí pistas y pescame.', sub: 'Podés pescar cuando quieras, ¡pero cuantas más pistas leas, más seguro estarás!',
          clues: [{ t: 'Tengo solo lados rectos.', f: (p) => !p.curved }, { t: 'Tengo más de 4 lados.', f: (p) => p.sides > 4 }, { t: 'Tengo 5 vértices.', f: (p) => p.vertices === 5 }],
          pond: POND, hint: 'Contá los vértices de las figuras que tienen muchos lados.',
          explain: '¡Soy el pentágono! Tengo 5 lados y 5 vértices.' },

        { id: 'L3-6', type: 'fish', progressive: true, skill: 'propiedades', prompt: '¿Quién soy? Pedí pistas y pescame.',
          clues: [{ t: 'No soy un triángulo.', f: (p) => p.sides !== 3 }, { t: 'Tengo 4 lados.', f: (p) => p.sides === 4 }, { t: 'Mis 4 lados son iguales.', f: (p) => p.eq === 'all' && p.sides === 4 }, { t: 'No tengo ángulos rectos.', f: (p) => p.right === 0 }],
          pond: POND, hint: 'Tiene 4 lados iguales como el cuadrado, pero sus esquinas no son como las de una hoja.',
          explain: '¡Soy el rombo! Tengo 4 lados iguales, pero mis ángulos no son rectos.' },

        { id: 'L3-7', type: 'fish', progressive: true, skill: 'propiedades', prompt: '¿Quién soy? Pedí pistas y pescame.',
          clues: [{ t: 'Tengo 3 vértices.', f: (p) => p.vertices === 3 }, { t: 'Mis 3 lados miden lo mismo.', f: (p) => p.sides === 3 && p.eq === 'all' }, { t: 'Mis 3 ángulos son agudos.', f: (p) => p.angles === 'agudos' }],
          pond: POND, hint: 'Buscá el triángulo que tiene todos sus lados iguales.',
          explain: '¡Soy el triángulo con 3 lados iguales y 3 ángulos agudos!' },

        { id: 'L3-8', type: 'fish', skill: 'curvos', prompt: 'Leé la tarjeta y pescá la figura.',
          clues: [{ t: 'No tengo lados rectos.', f: (p) => p.sides === 0 }, { t: 'No tengo vértices. Mi borde es curvo.', f: (p) => p.vertices === 0 }],
          pond: POND, hint: 'Buscá la figura redonda.',
          explain: 'Es el círculo: no tiene lados rectos ni vértices, su borde es curvo.' },

        { id: 'L3-9', type: 'choice', skill: 'propiedades', prompt: 'Pilar y Juani sacaron una figura al mismo tiempo. ¿Quién ganó?',
          display: clueCardHTML(['Tiene 4 ángulos rectos.', 'Todos sus lados son de igual medida.']) + kidsHTML([{ name: 'Pilar', face: '👧', shape: S('square', C.blue) }, { name: 'Juani', face: '👦', shape: S('rectangle', C.red, 90) }]),
          options: [t('a', 'Pilar'), t('b', 'Juani'), t('c', 'Los dos'), t('d', 'Nadie')], textCols: 2,
          correct: ['a'], hint: 'Las dos figuras tienen 4 ángulos rectos. ¿Cuál tiene todos sus lados iguales?',
          explain: 'Ganó Pilar: pescó un cuadrado. La figura de Juani es un rectángulo: tiene 4 ángulos rectos, pero no todos sus lados iguales.' },

        { id: 'L3-10', type: 'choice', skill: 'triangulos', prompt: 'Franco y Ramiro también jugaron. ¿Alguien ganó?',
          display: clueCardHTML(['Tiene 3 lados.', 'Tiene un ángulo recto.']) + kidsHTML([{ name: 'Franco', face: '🧒', shape: S('triEq', C.yellow) }, { name: 'Ramiro', face: '👦', shape: S('triRight', C.red) }]),
          options: [t('a', 'Ganó Franco'), t('b', 'Ganó Ramiro'), t('c', 'Ganaron los dos'), t('d', 'No ganó nadie')], textCols: 2,
          correct: ['b'], hint: 'Los dos pescaron triángulos. ¿Cuál tiene una esquina como la de una hoja?',
          explain: 'Ganó Ramiro: su triángulo tiene un ángulo recto. El de Franco tiene 3 ángulos agudos.' },

        { id: 'L3-11', type: 'choice', skill: 'propiedades', prompt: 'Lautaro ganó y pescó esta figura. ¿Qué decía su tarjeta?',
          display: kidsHTML([{ name: 'Lautaro', face: '🧒', shape: S('rectangle', C.yellow) }]),
          options: [t('a', 'Tiene 4 lados iguales y 4 ángulos rectos.'), t('b', 'Tiene 2 lados largos iguales, 2 lados cortos iguales y 4 ángulos rectos.'), t('c', 'Tiene 3 lados y un ángulo recto.'), t('d', 'No tiene lados rectos ni vértices.')],
          correct: ['b'], hint: 'Mirá la figura: ¿sus lados son todos iguales?',
          explain: 'Lautaro pescó un rectángulo: 2 lados largos iguales, 2 cortos iguales y 4 ángulos rectos.' },

        { id: 'L3-12', type: 'choice', skill: 'medidas', prompt: 'Adiviná quién soy.',
          display: clueCardHTML(['Soy una figura geométrica.', 'Tengo 4 vértices que unen a mis 4 lados.', 'Tengo 2 lados que miden 8 cm cada uno.', 'Tengo 2 lados que miden 4 cm cada uno.', 'Mis 4 ángulos son rectos.'], 'Pistas:'),
          options: [t('a', 'Rectángulo', S('rectangle', C.sky)), t('b', 'Cuadrado', S('square', C.sky)), t('c', 'Triángulo', S('triEq', C.sky)), t('d', 'Rombo', S('rhombus', C.sky))], textCols: 2,
          correct: ['a'], hint: 'Tiene lados de dos medidas distintas: 8 cm y 4 cm.',
          explain: 'Es un rectángulo: 2 lados largos de 8 cm, 2 cortos de 4 cm y 4 ángulos rectos.' },

        { id: 'L3-13', type: 'choice', skill: 'medidas', prompt: 'Adiviná quién soy.',
          display: clueCardHTML(['Soy una figura geométrica.', 'Tengo 3 vértices que unen a mis 3 lados.', 'Un lado mide 4 cm.', 'Otro lado mide 3 cm.', 'El tercer lado mide 5 cm.'], 'Pistas:'),
          options: [t('a', 'Cuadrado', S('square', C.green)), t('b', 'Triángulo', S('triRight', C.green)), t('c', 'Rectángulo', S('rectangle', C.green)), t('d', 'Pentágono', S('pentagon', C.green))], textCols: 2,
          correct: ['b'], hint: '¿Cuántos lados tiene? Contá las medidas.',
          explain: 'Es un triángulo: tiene 3 lados y 3 vértices. ¡Sus lados miden distinto! No todos los triángulos tienen lados iguales.' },

        { id: 'L3-14', type: 'choice', letters: true, skill: 'cuadrilateros', prompt: 'Elegí la figura que cumple todo: «cuatro lados iguales y cuatro ángulos rectos».',
          options: [o('a', S('rhombus', '#12B5E5')), o('b', S('trapezoid', '#12B5E5')), o('c', S('square', '#12B5E5')), o('d', S('rectangle', '#12B5E5'))],
          correct: ['c'], hint: 'El rombo tiene 4 lados iguales, pero ¿sus ángulos son rectos?',
          explain: 'Es la C, el cuadrado. El rombo tiene lados iguales sin ángulos rectos; el rectángulo tiene ángulos rectos, pero no todos los lados iguales.' }
      ]
    },

    /* ================= NIVEL 4 ================= */
    {
      id: 'L4', num: 4, title: 'La fábrica de figuras', icon: '🏗️', color: '#FF9F1C',
      goal: 'Armá figuras juntando otras figuras.',
      badge: 'arquitecto',
      oral: [
        '¿Qué habrá tenido en cuenta Ramiro para decir que con dos cuadrados forma un rectángulo?',
        '¿Qué figuras se pueden distinguir en la cruz y en la flecha?',
        '¿Cómo te diste cuenta de hacia dónde girar las piezas?'
      ],
      challenges: [
        { id: 'L4-1', type: 'build', skill: 'componer', prompt: 'Ramiro dice: «Con 2 triángulos marrones formo un cuadrado». ¡Armalo!', sub: 'Mové las piezas hasta cubrir el modelo. Usá «Girar» si hace falta.',
          pieces: ['triRI3', 'triRI3'], solution: [{ kind: 'triRI3', rot: 0, x: 2, y: 2 }, { kind: 'triRI3', rot: 2, x: 2, y: 2 }],
          hint: '¡Probá girar la pieza! Los dos triángulos se juntan por su lado más largo.',
          explain: 'Dos triángulos iguales con un ángulo recto, unidos por su lado más largo, forman un cuadrado.' },

        { id: 'L4-2', type: 'build', skill: 'componer', prompt: 'Formá el rectángulo con 2 triángulos.', sub: 'Elegí las piezas correctas. ¡No todas sirven!',
          pieces: ['tri42', 'triRI3', 'tri42'], solution: [{ kind: 'tri42', rot: 0, x: 2, y: 3 }, { kind: 'tri42', rot: 2, x: 2, y: 3 }],
          hint: 'Usá los dos triángulos azules. Girá uno para que encaje con el otro.',
          explain: 'Dos triángulos azules iguales, unidos por su lado más largo, forman un rectángulo.' },

        { id: 'L4-3', type: 'build', skill: 'componer', prompt: 'Ramiro también dice: «Con 2 cuadrados formo un rectángulo». ¡Probalo!',
          pieces: ['sq3', 'triRI3', 'sq3'], solution: [{ kind: 'sq3', x: 1, y: 2 }, { kind: 'sq3', x: 4, y: 2 }],
          hint: 'Poné los dos cuadrados uno al lado del otro.',
          explain: 'Dos cuadrados iguales, uno al lado del otro, forman un rectángulo: 2 lados largos iguales y 2 cortos iguales.' },

        { id: 'L4-4', type: 'build', skill: 'componer', prompt: 'Reproducí el modelo de la cruz.',
          pieces: ['sq2', 'sq2', 'rect42', 'sq2', 'sq2', 'triHead', 'sq2'],
          solution: [{ kind: 'sq2', x: 3, y: 1 }, { kind: 'sq2', x: 1, y: 3 }, { kind: 'sq2', x: 3, y: 3 }, { kind: 'sq2', x: 5, y: 3 }, { kind: 'sq2', x: 3, y: 5 }],
          hint: 'Empezá por el cuadrado del centro. ¡Hay más de una manera de armarla!',
          explain: 'La cruz se puede armar con 5 cuadrados, o con un rectángulo y cuadrados.' },

        { id: 'L4-5', type: 'build', skill: 'componer', prompt: 'Reproducí el modelo de la flecha.',
          pieces: ['triRI3', 'rect42', 'sq2', 'triHead'], solution: [{ kind: 'rect42', x: 1, y: 4 }, { kind: 'triHead', rot: 0, x: 5, y: 3 }],
          hint: 'La flecha tiene un cuerpo largo y una punta. ¿Qué piezas se parecen?',
          explain: 'La flecha se arma con un rectángulo y un triángulo.' },

        { id: 'L4-6', type: 'build', skill: 'componer', prompt: 'Ayudá a Renata y Federico a copiar su dibujo.',
          pieces: ['triHead', 'sq4', 'rect42', 'triHead'], solution: [{ kind: 'triHead', rot: 2, x: 1, y: 2 }, { kind: 'sq4', x: 3, y: 2 }, { kind: 'triHead', rot: 0, x: 7, y: 2 }],
          hint: 'En el medio hay un cuadrado. A cada lado, un triángulo que apunta hacia afuera.',
          explain: 'El dibujo tiene un cuadrado en el medio y un triángulo a cada lado.' },

        { id: 'L4-7', type: 'build', skill: 'componer', prompt: 'Copiá este otro dibujo de Renata y Federico.',
          pieces: ['sq2', 'rect42', 'triRI2', 'triRI3'], solution: [{ kind: 'rect42', x: 1, y: 3 }, { kind: 'triRI2', rot: 3, x: 5, y: 3 }],
          hint: 'El triángulo pequeño va pegado al costado derecho. Probá girarlo.',
          explain: 'El dibujo se forma con un rectángulo y un triángulo con un ángulo recto.' },

        { id: 'L4-8', type: 'choice', multi: true, skill: 'componer', prompt: '¿Qué figuras podés distinguir en la flecha?', sub: 'Tocá todas las que veas.',
          display: gridDrawing(9, 6, [{ r: [1, 2, 4, 2], color: C.yellow }, { poly: [[5, 1], [5, 5], [7, 3]], color: C.yellow }], { maxW: 380, maxH: 220 }),
          options: [t('a', 'Rectángulo', S('rectangle', C.yellow)), t('b', 'Triángulo', S('triEq', C.yellow)), t('c', 'Círculo', S('circle', C.yellow)), t('d', 'Pentágono', S('pentagon', C.yellow))], textCols: 2,
          correct: ['a', 'b'], hint: 'Separá la flecha en dos partes: el cuerpo y la punta.',
          explain: 'En la flecha hay un rectángulo (el cuerpo) y un triángulo (la punta).' },

        { id: 'L4-9', type: 'choice', multi: true, skill: 'componer', prompt: '¿Qué figuras podés distinguir en la cruz?', sub: 'Tocá todas las que veas.',
          display: gridDrawing(8, 8, [{ r: [3, 1, 2, 6], color: C.yellow }, { r: [1, 3, 6, 2], color: C.yellow }], { maxW: 260, maxH: 230 }),
          options: [t('a', 'Cuadrados', S('square', C.yellow)), t('b', 'Rectángulos', S('rectangle', C.yellow)), t('c', 'Triángulos', S('triEq', C.yellow)), t('d', 'Círculos', S('circle', C.yellow))], textCols: 2,
          correct: ['a'], optional: ['b'], hint: 'Mirá el centro de la cruz y los brazos. Contá los cuadraditos.',
          explain: 'En la cruz se ven cuadrados (el centro y cada brazo). También podés ver rectángulos si juntás el centro con dos brazos.' },

        { id: 'L4-10', type: 'tf', skill: 'cuadrilateros', prompt: 'Juani completó su dibujo y dice: «Adentro queda un cuadrado». ¿Tiene razón?',
          display: gridDrawing(9, 7, [{ r: [1, 1, 2, 5], color: C.purple }, { r: [6, 1, 2, 5], color: C.purple }, { r: [3, 1, 3, 1], color: C.lime }, { r: [3, 5, 3, 1], color: C.yellow }], { maxW: 340, maxH: 240 }),
          statement: 'Adentro de la figura queda un cuadrado.', answer: true,
          justs: [t('a', 'El hueco tiene 4 lados de 3 cuadraditos cada uno y 4 ángulos rectos.'), t('b', 'El hueco tiene 2 lados largos y 2 lados cortos.'), t('c', 'Las figuras de alrededor son de colores.'), t('d', 'El hueco es redondo.')],
          justCorrect: 'a', hint: 'Contá los cuadraditos de cada lado del hueco blanco.',
          explain: 'Juani tiene razón: el hueco tiene 4 lados iguales (3 cm cada uno) y 4 ángulos rectos. ¡Es un cuadrado!' },

        { id: 'L4-11', type: 'tf', skill: 'cuadrilateros', prompt: 'Ramiro dice: «Con 2 cuadrados iguales, uno al lado del otro, formo un rectángulo».',
          display: gridDrawing(8, 4, [{ r: [1, 1, 3, 3], color: C.brown }, { r: [4, 1, 3, 3], color: C.brown }], { maxW: 300, maxH: 160 }),
          statement: 'Con 2 cuadrados iguales formo un rectángulo.', answer: true,
          justs: [t('a', 'Quedan 2 lados largos iguales, 2 lados cortos iguales y 4 ángulos rectos.'), t('b', 'Los cuadrados son grandes.'), t('c', 'Dos cuadrados siempre forman otro cuadrado.')],
          justCorrect: 'a', hint: 'Medí los lados de la figura que se forma: ¿son todos iguales?',
          explain: 'Es verdadero: la figura nueva tiene 2 lados largos (6 cm), 2 cortos (3 cm) y 4 ángulos rectos. ¡Es un rectángulo!' },

        { id: 'L4-12', type: 'choice', multi: true, skill: 'componer', prompt: 'En el primer dibujo de Renata, ¿qué figuras observás?', sub: 'Tocá todas las que veas.',
          display: gridDrawing(12, 10, [{ r: [1, 1, 3, 8], color: C.sky, op: .35 }, { r: [4, 3, 3, 6], color: C.sky, op: .35 }, { r: [7, 6, 3, 3], color: C.sky, op: .35 }], { maxW: 300, maxH: 240 }),
          options: [t('a', 'Rectángulos', S('rectangle', C.sky, 90)), t('b', 'Un cuadrado', S('square', C.sky)), t('c', 'Triángulos', S('triEq', C.sky)), t('d', 'Círculos', S('circle', C.sky))], textCols: 2,
          correct: ['a', 'b'], hint: 'Contá los cuadraditos de cada figura. ¿Alguna tiene todos sus lados iguales?',
          explain: 'Hay 2 rectángulos (3 × 8 y 3 × 6) y un cuadrado (3 × 3).' },

        { id: 'L4-13', type: 'choice', multi: true, skill: 'componer', prompt: 'En este dibujo, ¿qué figuras observás?', sub: 'Tocá todas las que veas.',
          display: gridDrawing(9, 5, [{ r: [1, 1, 4, 3], color: C.violet, op: .35 }, { poly: [[5, 1], [5, 4], [8, 4]], color: C.violet, op: .35 }], { maxW: 320, maxH: 180 }),
          options: [t('a', 'Rectángulo', S('rectangle', C.violet)), t('b', 'Triángulo', S('triRight', C.violet)), t('c', 'Cuadrado', S('square', C.violet)), t('d', 'Círculo', S('circle', C.violet))], textCols: 2,
          correct: ['a', 'b'], hint: 'Contá los cuadraditos del lado largo y del lado corto de la primera figura.',
          explain: 'Hay un rectángulo (4 × 3) y un triángulo con un ángulo recto.' }
      ]
    },

    /* ================= NIVEL 5 ================= */
    {
      id: 'L5', num: 5, title: 'Laboratorio de lados y vértices', icon: '🔬', color: '#43B864',
      goal: 'Investigá lados, vértices, ángulos y diagonales.',
      badge: 'vertices',
      oral: [
        '¿Cuántos lados rectos necesita una figura como mínimo para poder cerrarse? ¿Por qué no se puede con 2?',
        'Si medimos con una regla los 4 lados de un cuadrado, ¿qué descubrimos? ¿Ocurre lo mismo en el rectángulo?',
        '¿A qué llamamos cuadrilátero? ¿El cuadrado y el rectángulo pertenecen a esa familia? ¿Por qué?'
      ],
      challenges: [
        { id: 'L5-1', type: 'mark', skill: 'diagonales', prompt: 'Marcá los vértices del rectángulo.', sub: 'Tocá todos los vértices y después «Comprobar».',
          view: [10, 6], mode: 'points', markColor: '#1C6DB6',
          base: [{ poly: [[1, 1], [9, 1], [9, 5], [1, 5]] }],
          cands: [[1, 1, 1], [9, 1, 1], [9, 5, 1], [1, 5, 1], [5, 1, 0], [9, 3, 0], [5, 5, 0], [1, 3, 0], [5, 3, 0]],
          hint: 'Los vértices son las esquinas, donde se juntan dos lados.',
          explain: 'El rectángulo tiene 4 vértices: uno en cada esquina.' },

        { id: 'L5-2', type: 'mark', skill: 'diagonales', prompt: 'Marcá los vértices del triángulo.',
          view: [10, 9], mode: 'points', markColor: '#1C6DB6',
          base: [{ poly: [[5, 0.9], [9.4, 8.5], [0.6, 8.5]] }],
          cands: [[5, 0.9, 1], [9.4, 8.5, 1], [0.6, 8.5, 1], [7.2, 4.7, 0], [2.8, 4.7, 0], [5, 8.5, 0]],
          hint: 'Un triángulo tiene tantos vértices como lados.',
          explain: 'El triángulo tiene 3 vértices y 3 lados.' },

        { id: 'L5-3', type: 'mark', skill: 'diagonales', prompt: 'Marcá solo los lados del cuadrado (no las diagonales).',
          view: [10, 10], mode: 'segments', markColor: '#1C6DB6',
          cands: [[1.5, 1.5, 8.5, 1.5, 1], [8.5, 1.5, 8.5, 8.5, 1], [8.5, 8.5, 1.5, 8.5, 1], [1.5, 8.5, 1.5, 1.5, 1], [1.5, 1.5, 8.5, 8.5, 0], [8.5, 1.5, 1.5, 8.5, 0]],
          dashedWrong: true,
          hint: 'Los lados forman el borde de la figura. Las diagonales la cruzan por adentro.',
          explain: 'El cuadrado tiene 4 lados (el borde). Las líneas que cruzan por adentro son diagonales.' },

        { id: 'L5-4', type: 'mark', skill: 'diagonales', prompt: 'Marcá las diagonales del rectángulo.', sub: 'Una diagonal une dos vértices que no están uno al lado del otro.',
          view: [10, 8], mode: 'segments', markColor: '#C8414A',
          base: [{ poly: [[1, 1.5], [9, 1.5], [9, 6.5], [1, 6.5]] }],
          cands: [[1, 1.5, 9, 6.5, 1], [9, 1.5, 1, 6.5, 1], [1, 1.5, 5, 6.5, 0], [5, 1.5, 5, 6.5, 0]],
          allDashed: true,
          hint: 'Las diagonales van de una esquina a la esquina de enfrente.',
          explain: 'El rectángulo tiene 2 diagonales: cada una une dos vértices opuestos.' },

        { id: 'L5-5', type: 'choice', skill: 'contar', prompt: '¿Cuántos vértices tiene esta figura?',
          display: `<div style="width:190px">${shapeSVG(S('pentagon', C.violet, 18))}</div>`,
          options: [t('a', '4'), t('b', '5'), t('c', '6'), t('d', '10')], textCols: 2,
          correct: ['b'], hint: '¡Contá los vértices para comprobarlo! Empezá por uno y marcá en tu mente cuál contaste.',
          explain: 'Es un pentágono: tiene 5 vértices y 5 lados.' },

        { id: 'L5-6', type: 'table', skill: 'contar', prompt: 'Completá el cuadro de las figuras.', sub: 'Cada cuadradito mide 1 cm.',
          rows: [
            { fig: gridDrawing(8, 5, [{ r: [1, 1, 6, 3], color: C.sky, op: .25 }], { maxW: 150, maxH: 92 }), ans: { name: 'rectángulo', sides: '4', vertices: '4', medida: '6 cm, 3 cm, 6 cm y 3 cm' } },
            { fig: gridDrawing(5, 5, [{ r: [1, 1, 3, 3], color: C.sky, op: .25 }], { maxW: 150, maxH: 92 }), ans: { name: 'cuadrado', sides: '4', vertices: '4', medida: '3 cm cada uno' } },
            { fig: gridDrawing(6, 5, [{ poly: [[1, 4.46], [5, 4.46], [3, 1]], color: C.sky, op: .25 }], { maxW: 150, maxH: 92, extra: '<g font-size=".75" font-weight="800" fill="#1E2A4A" font-family="sans-serif"><text x="2.2" y="5.3">4 cm</text><text x="4.2" y="2.4">4 cm</text><text x="0" y="2.4">4 cm</text></g>' }), ans: { name: 'triángulo', sides: '3', vertices: '3', medida: '4 cm cada uno' } }
          ],
          cols: {
            name: ['cuadrado', 'rectángulo', 'triángulo', 'círculo'],
            sides: ['0', '3', '4', '5'],
            vertices: ['0', '3', '4', '5'],
            medida: ['6 cm, 3 cm, 6 cm y 3 cm', '3 cm cada uno', '4 cm cada uno', '6 cm cada uno']
          },
          hint: 'Contá los cuadraditos de cada lado. En el triángulo, la medida está escrita.',
          explain: 'Rectángulo: 4 lados, 4 vértices (6, 3, 6 y 3 cm). Cuadrado: 4 lados, 4 vértices (3 cm cada uno). Triángulo: 3 lados, 3 vértices (4 cm cada uno).' },

        { id: 'L5-7', type: 'choice', skill: 'cuadrilateros', prompt: 'El cuadrado y el rectángulo tienen 4 lados y 4 vértices. ¿En qué se diferencian?',
          display: `<div style="display:flex;gap:20px"><div style="width:130px">${shapeSVG(S('square', C.coral))}</div><div style="width:130px">${shapeSVG(S('rectangle', C.sky))}</div></div>`,
          options: [t('a', 'El cuadrado tiene sus 4 lados iguales; el rectángulo tiene 2 lados largos iguales y 2 cortos iguales.'), t('b', 'El cuadrado tiene más vértices que el rectángulo.'), t('c', 'El rectángulo no tiene ángulos rectos.')],
          correct: ['a'], hint: 'Los dos tienen 4 ángulos rectos. Mirá la medida de sus lados.',
          explain: 'Los dos tienen 4 lados, 4 vértices y 4 ángulos rectos. Se diferencian en la medida de los lados.' },

        { id: 'L5-8', type: 'tf', skill: 'cuadrilateros', prompt: '¿Verdadero o falso?',
          display: `<div style="display:flex;gap:16px">${['square', 'rectangle', 'rhombus', 'trapezoid'].map((k, i) => `<div style="width:96px">${shapeSVG(S(k, [C.sun, C.green, C.violet, C.pink][i]))}</div>`).join('')}</div>`,
          statement: 'El cuadrado y el rectángulo son cuadriláteros.', answer: true,
          justs: [t('a', 'Porque tienen 4 lados, 4 vértices y 4 ángulos.'), t('b', 'Porque tienen lados curvos.'), t('c', 'Porque todos sus lados son iguales.')],
          justCorrect: 'a', hint: 'Un cuadrilátero es una figura que tiene 4 lados, 4 vértices y 4 ángulos.',
          explain: 'Es verdadero: los dos tienen 4 lados, 4 vértices y 4 ángulos, como el rombo y el trapecio. ¡Son de la familia de los cuadriláteros!' },

        { id: 'L5-9', type: 'tf', skill: 'triangulos', prompt: '¿Verdadero o falso?',
          display: `<div style="display:flex;gap:16px">${[S('triEq', C.coral), S('triRight', C.sky), S('triObtuse', C.green)].map((s) => `<div style="width:110px">${shapeSVG(s)}</div>`).join('')}</div>`,
          statement: 'Todos los triángulos tienen sus 3 lados iguales.', answer: false,
          justs: [t('a', 'Hay triángulos con lados de distinta medida, como el de 3 cm, 4 cm y 5 cm.'), t('b', 'Todos los triángulos son iguales.'), t('c', 'Los triángulos tienen 4 lados.')],
          justCorrect: 'a', hint: 'Mirá los triángulos de la imagen: ¿todos tienen los lados iguales?',
          explain: 'Es falso: algunos triángulos tienen 3 lados iguales, pero otros tienen lados de distinta medida.' },

        { id: 'L5-10', type: 'choice', skill: 'contar', prompt: '¿Cuántos lados rectos necesita una figura, como mínimo, para poder cerrarse?',
          display: `<svg viewBox="0 0 300 110" style="width:300px" aria-hidden="true"><g fill="none" stroke="#1E2A4A" stroke-width="5" stroke-linecap="round"><path d="M20 90 L80 20 L140 90"/><path d="M170 90 L230 20 L290 90 Z" fill="#FFD9A0"/></g><text x="45" y="108" font-size="14" font-weight="800" fill="#4A5677">¿2 lados?</text><text x="200" y="108" font-size="14" font-weight="800" fill="#4A5677">¿3 lados?</text></svg>`,
          options: [t('a', '2 lados'), t('b', '3 lados'), t('c', '4 lados')], textCols: 2,
          correct: ['b'], hint: 'Mirá el dibujo: con 2 lados, ¿se puede cerrar la figura?',
          explain: 'Con 2 lados rectos la figura queda abierta. Se necesitan como mínimo 3: así se forma un triángulo.' },

        { id: 'L5-11', type: 'sort', skill: 'cuadrilateros', prompt: '¿Es un cuadrilátero? Llevá cada figura a su caja.',
          bins: [{ id: 'si', label: 'Sí, es cuadrilátero (4 lados)', color: C.green }, { id: 'no', label: 'No es cuadrilátero', color: C.coral }],
          items: [
            { id: 'a', shape: S('square', C.sun, 30), bin: 'si' }, { id: 'b', shape: S('rectangle', C.sky), bin: 'si' }, { id: 'c', shape: S('rhombus', C.violet), bin: 'si' },
            { id: 'd', shape: S('trapezoid', C.pink), bin: 'si' }, { id: 'e', shape: S('triEq', C.coral), bin: 'no' }, { id: 'f', shape: S('pentagon', C.green), bin: 'no' },
            { id: 'g', shape: S('circle', C.teal), bin: 'no' }
          ],
          hint: 'Contá los lados: los cuadriláteros tienen exactamente 4.',
          explain: 'Cuadrado, rectángulo, rombo y trapecio tienen 4 lados: son cuadriláteros. El triángulo, el pentágono y el círculo no.' },

        { id: 'L5-12', type: 'choice', skill: 'medidas', prompt: 'Cada cuadradito mide 1 cm. ¿Cuánto mide cada lado del rectángulo?',
          display: gridDrawing(7, 4, [{ r: [1, 1, 5, 2], color: C.coral, op: .5 }], { maxW: 330, maxH: 190 }),
          options: [t('a', '5 cm, 2 cm, 5 cm y 2 cm'), t('b', '5 cm cada uno'), t('c', '2 cm cada uno'), t('d', '7 cm, 4 cm, 7 cm y 4 cm')], textCols: 2,
          correct: ['a'], hint: 'Contá los cuadraditos del lado largo y del lado corto.',
          explain: 'Los lados largos miden 5 cm y los cortos, 2 cm.' },

        { id: 'L5-13', type: 'choice', skill: 'triangulos', prompt: '¿Cuál triángulo tiene un ángulo recto y dos lados de la misma medida?',
          options: TRI6.map((x) => ({ id: x.id, shape: x.shape, letter: x.label })), keepOrder: true, letters: true,
          correct: ['t1'], hint: 'Primero buscá los que tienen un ángulo recto. Después mirá cuál tiene dos lados iguales.',
          explain: 'Es el triángulo 1: tiene un ángulo recto y sus dos lados cortos miden lo mismo.' },

        { id: 'L5-14', type: 'choice', skill: 'triangulos', prompt: '¿Cuál tiene 3 ángulos agudos y todos sus lados de la misma medida?',
          options: TRI6.map((x) => ({ id: x.id, shape: x.shape, letter: x.label })), keepOrder: true, letters: true,
          correct: ['t4'], hint: 'Buscá el triángulo que tiene sus 3 lados iguales.',
          explain: 'Es el triángulo 4: tiene sus 3 lados iguales y 3 ángulos agudos.' },

        { id: 'L5-15', type: 'choice', skill: 'triangulos', prompt: '¿Qué características permiten identificar al triángulo 3?',
          display: `<div style="width:170px;position:relative">${shapeSVG(TRI6[2].shape)}<b style="position:absolute;left:8px;top:4px;font-size:22px">3</b></div>`,
          options: [t('a', 'Tiene un ángulo recto y sus 3 lados miden distinto.'), t('b', 'Tiene sus 3 lados iguales y 3 ángulos agudos.'), t('c', 'Tiene 4 vértices.')],
          correct: ['a'], hint: 'Buscá una esquina como la de una hoja y compará sus lados.',
          explain: 'El triángulo 3 tiene un ángulo recto y sus 3 lados tienen medidas distintas.' },

        { id: 'L5-16', type: 'tf', skill: 'diagonales', prompt: '¿Verdadero o falso?',
          display: `<div style="width:150px">${shapeSVG(S('triEq', C.sun))}</div>`,
          statement: 'El triángulo tiene diagonales.', answer: false,
          justs: [t('a', 'Cada vértice ya está unido con los otros dos por un lado: no hay vértices para unir por adentro.'), t('b', 'Porque es de color amarillo.'), t('c', 'Porque tiene 4 lados.')],
          justCorrect: 'a', hint: 'Una diagonal une dos vértices que no están uno al lado del otro. ¿Hay alguno así en el triángulo?',
          explain: 'Es falso: en el triángulo todos los vértices están uno al lado del otro, así que no tiene diagonales.' }
      ]
    },

    /* ================= DESAFÍO FINAL ================= */
    {
      id: 'F', num: 6, title: 'Desafío final', icon: '👑', color: '#E5484D', final: true,
      goal: 'Mostrá todo lo que aprendiste en la gran expedición.',
      badge: 'leyenda',
      oral: [
        '¿Qué fue lo que más te costó en la aventura? ¿Cómo lo resolviste?',
        'Explicale a alguien de tu familia qué es un cuadrilátero.'
      ],
      challenges: [
        { id: 'F-1', type: 'fish', progressive: true, skill: 'propiedades', prompt: '¿Quién soy? Pedí pistas y pescame.',
          clues: [{ t: 'Tengo 4 vértices.', f: (p) => p.vertices === 4 }, { t: 'Mis 4 ángulos son rectos.', f: (p) => p.right === 4 }, { t: 'Mis lados no son todos iguales.', f: (p) => p.eq !== 'all' }],
          pond: POND, hint: 'Tiene ángulos rectos como el cuadrado, pero lados largos y cortos.',
          explain: '¡Soy el rectángulo!' },

        { id: 'F-2', type: 'sequence', skill: 'patrones', prompt: 'Completá la guarda.',
          seq: [S('hexagon', C.violet), S('circle', C.sun), S('triEq', C.teal), S('hexagon', C.violet), null, S('triEq', C.teal), null, null], answer: ['circle', 'hexagon', 'circle'],
          palette: [S('circle', C.sun), S('triEq', C.teal), S('hexagon', C.violet), S('square', C.coral)],
          hint: 'El patrón tiene 3 figuras.', explain: 'El patrón es hexágono, círculo, triángulo.' },

        { id: 'F-3', type: 'build', skill: 'componer', prompt: 'Armá la casita con las piezas correctas.',
          pieces: ['triRI3', 'triHead', 'rect42', 'sq4'], solution: [{ kind: 'sq4', x: 2, y: 4 }, { kind: 'triHead', rot: 3, x: 2, y: 2 }],
          hint: 'El techo es un triángulo. ¡Probá girarlo!', explain: 'La casita se arma con un cuadrado y un triángulo.' },

        { id: 'F-4', type: 'choice', skill: 'cuadrilateros', prompt: '¿Cuál NO es un cuadrilátero?',
          options: [o('a', S('trapezoid', C.sky)), o('b', S('square', C.green, 45)), o('c', S('pentagon', C.coral)), o('d', S('rectangle', C.sun, 60))],
          correct: ['c'], hint: 'Contá los lados de cada figura.', explain: 'El pentágono tiene 5 lados: no es un cuadrilátero.' },

        { id: 'F-5', type: 'mark', skill: 'diagonales', prompt: 'Marcá las diagonales del cuadrado.',
          view: [10, 10], mode: 'segments', markColor: '#C8414A',
          base: [{ poly: [[5, 0.8], [9.2, 5], [5, 9.2], [0.8, 5]] }],
          cands: [[5, 0.8, 5, 9.2, 1], [0.8, 5, 9.2, 5, 1], [5, 0.8, 7.1, 7.1, 0], [0.8, 5, 7.1, 2.9, 0]],
          allDashed: true, hint: 'Aunque esté girado, las diagonales van de un vértice al vértice de enfrente.',
          explain: 'El cuadrado tiene 2 diagonales, que unen vértices opuestos.' },

        { id: 'F-6', type: 'tf', skill: 'reconocer', prompt: '¿Verdadero o falso?',
          display: `<div style="display:flex;gap:16px"><div style="width:120px">${shapeSVG(S('square', C.sky))}</div><div style="width:120px">${shapeSVG(S('square', C.sky, 40))}</div></div>`,
          statement: 'Si giramos un cuadrado, deja de ser cuadrado.', answer: false,
          justs: [t('a', 'Sigue teniendo 4 lados iguales y 4 ángulos rectos.'), t('b', 'Se convierte en un triángulo.'), t('c', 'Cambia de color.')],
          justCorrect: 'a', hint: 'Al girarlo, ¿cambian sus lados o sus ángulos?',
          explain: 'Es falso: una figura se reconoce por sus propiedades, no por su posición.' },

        { id: 'F-7', type: 'match', skill: 'reconocer', prompt: 'Uní cada figura con su nombre.',
          pairs: [{ id: 'a', shape: S('rhombus', C.pink), label: 'rombo' }, { id: 'b', shape: S('trapezoid', C.teal), label: 'trapecio' }, { id: 'c', shape: S('hexagon', C.sun), label: 'hexágono' }, { id: 'd', shape: S('pentagon', C.violet), label: 'pentágono' }],
          hint: 'Contá los lados: 5 lados → pentágono; 6 lados → hexágono.', explain: 'Rombo y trapecio tienen 4 lados; el pentágono, 5; el hexágono, 6.' },

        { id: 'F-8', type: 'choice', skill: 'medidas', prompt: 'Medimos con una regla los 4 lados de un cuadrado. ¿Qué descubrimos?',
          options: [t('a', 'Los 4 lados miden lo mismo.'), t('b', 'Dos lados miden más que los otros dos.'), t('c', 'Cada lado mide distinto.')],
          correct: ['a'], hint: 'Pensá en cómo son los lados del cuadrado.', explain: 'En el cuadrado los 4 lados miden lo mismo. En el rectángulo, no: tiene 2 largos y 2 cortos.' },

        { id: 'F-9', type: 'sort', skill: 'triangulos', prompt: 'Clasificá los triángulos según sus lados.',
          bins: [{ id: 'iguales', label: 'Sus 3 lados son iguales', color: C.green }, { id: 'distintos', label: 'No todos sus lados son iguales', color: C.violet }],
          items: [{ id: 'a', shape: S('triEq', C.coral), bin: 'iguales' }, { id: 'b', shape: S('triRight', C.sky), bin: 'distintos' }, { id: 'c', shape: S('triEq', C.sun, 45), bin: 'iguales' }, { id: 'd', shape: S('triObtuse', C.green), bin: 'distintos' }, { id: 'e', shape: S('triIso', C.pink), bin: 'distintos' }],
          hint: 'Compará el largo de los lados de cada triángulo.', explain: 'Algunos triángulos tienen 3 lados iguales y otros tienen lados de distinta medida.' },

        { id: 'F-10', type: 'fish', skill: 'propiedades', prompt: 'Última tarjeta: ¡pescá la figura!',
          clues: [{ t: 'Tengo 4 lados.', f: (p) => p.sides === 4 }, { t: 'Solo 2 de mis lados son iguales.', f: (p) => p.eq === 'two' }, { t: 'No tengo ángulos rectos.', f: (p) => p.right === 0 }],
          pond: POND, hint: 'No es el cuadrado, ni el rectángulo, ni el rombo.', explain: 'Es el trapecio: 4 lados, sin ángulos rectos, y solo 2 lados iguales.' }
      ]
    }
  ];

  const BADGES = [
    { id: 'detective', name: 'Detective de figuras', icon: '🔍', desc: 'Completaste el nivel 1.' },
    { id: 'patrones', name: 'Experto en patrones', icon: '🧩', desc: 'Completaste el nivel 2.' },
    { id: 'pescador', name: 'Pescador de figuras', icon: '🎣', desc: 'Completaste el nivel 3.' },
    { id: 'arquitecto', name: 'Arquitecto geométrico', icon: '🏗️', desc: 'Completaste el nivel 4.' },
    { id: 'vertices', name: 'Maestro de los vértices', icon: '🔬', desc: 'Completaste el nivel 5.' },
    { id: 'leyenda', name: 'Gran explorador', icon: '👑', desc: 'Superaste el desafío final.' },
    { id: 'racha', name: 'Racha imparable', icon: '🔥', desc: 'Resolviste 5 desafíos seguidos.' },
    { id: 'perseverante', name: 'Nunca me rindo', icon: '💪', desc: 'Lograste 5 desafíos después de equivocarte.' },
    { id: 'curioso', name: 'Explorador curioso', icon: '💡', desc: 'Pediste 3 pistas para pensar mejor.' }
  ];

  const CHESTS = [
    { at: 15, sticker: { name: 'Triángulo saltarín', shape: S('triEq', C.coral, 0, { face: true }) } },
    { at: 45, sticker: { name: 'Cuadrado valiente', shape: S('square', C.sky, 0, { face: true }) } },
    { at: 80, sticker: { name: 'Círculo dormilón', shape: S('circle', C.sun, 0, { face: true }) } },
    { at: 120, sticker: { name: 'Rombo bailarín', shape: S('rhombus', C.pink, 0, { face: true }) } },
    { at: 160, sticker: { name: 'Pentágono sabio', shape: S('pentagon', C.violet, 0, { face: true }) } },
    { at: 200, sticker: { name: 'Hexágono estrella', shape: S('hexagon', C.green, 0, { face: true }) } }
  ];

  const PRAISE = ['¡Muy bien!', '¡Excelente!', '¡Genial!', '¡Bien pensado!', '¡Lo descubriste!', '¡Súper!'];
  const PRAISE_BY_TYPE = { pattern: '¡Muy bien, descubriste el patrón!', sequence: '¡Muy bien, completaste el patrón!', build: '¡Excelente, armaste la figura!', fish: '¡Buena pesca!', memo: '¡Qué buena memoria!' };

  const levelById = (id) => LEVELS.find((l) => l.id === id);

  /* ---------------------------------------------------------
     7. Estado (solo en memoria)
     --------------------------------------------------------- */
  let state;
  function freshState() {
    const levels = {};
    LEVELS.forEach((l, i) => { levels[l.id] = { unlocked: i === 0, completed: false, best: null, last: null, plays: 0 }; });
    return {
      xp: 0, streak: 0, bestStreak: 0, hints: 0, persevere: 0,
      badges: [], chestsEarned: 0, chestsOpened: 0,
      levels, log: {}, run: null, pendingRewards: [], justUnlocked: null,
      totals: { right: 0, wrong: 0, attempts: 0 }
    };
  }
  state = freshState();

  const logFor = (id) => (state.log[id] = state.log[id] || { attempts: 0, right: 0, wrong: 0, best: 0, last: null, ever: false, plays: 0 });
  const totalStars = () => Object.values(state.log).reduce((s, l) => s + l.best, 0);
  const challengesPassed = () => Object.values(state.log).filter((l) => l.ever).length;
  const allChallenges = () => LEVELS.flatMap((l) => l.challenges.map((c) => Object.assign({ level: l.id }, c)));
  const levelStars = (lv) => lv.challenges.reduce((s, c) => s + (state.log[c.id] ? state.log[c.id].best : 0), 0);

  /* ---------------------------------------------------------
     8. Encabezado, efectos y avisos
     --------------------------------------------------------- */
  function updateHeader(popKey) {
    $('#statStars').textContent = totalStars();
    $('#statXp').textContent = state.xp;
    $('#statStreak').textContent = state.streak;
    $('#statBadges').textContent = state.badges.length;
    if (popKey) {
      const el = { stars: '.chip-star', xp: '.chip-xp', streak: '.chip-streak', badges: '.chip-badge' }[popKey];
      const chip = $(el);
      if (chip) { chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
    }
  }

  function toast(msg) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.innerHTML = msg;
    $('#toasts').appendChild(d);
    setTimeout(() => d.remove(), 3200);
  }

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function confetti(n = 36) {
    if (reduceMotion) return;
    const fx = $('#fx');
    const cols = [C.coral, C.sun, C.sky, C.green, C.violet, C.pink, C.orange];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'conf';
      const kind = i % 3;
      const col = pick(cols);
      p.style.left = Math.random() * 100 + 'vw';
      p.style.animationDelay = Math.random() * 0.35 + 's';
      p.style.animationDuration = 1.2 + Math.random() * 1 + 's';
      if (kind === 0) { p.style.background = col; p.style.borderRadius = '50%'; }
      else if (kind === 1) { p.style.background = col; }
      else { p.style.width = '0'; p.style.height = '0'; p.style.borderLeft = '8px solid transparent'; p.style.borderRight = '8px solid transparent'; p.style.borderBottom = `14px solid ${col}`; }
      fx.appendChild(p);
      setTimeout(() => p.remove(), 2600);
    }
  }

  function floatGain(text, anchor) {
    const r = anchor ? anchor.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0 };
    const d = document.createElement('div');
    d.className = 'float-gain';
    d.textContent = text;
    d.style.left = r.left + r.width / 2 - 40 + 'px';
    d.style.top = r.top - 10 + 'px';
    $('#fx').appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }

  /* Lectura en voz alta de la consigna (si el navegador lo permite) */
  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('Este navegador no puede leer en voz alta. Pedile ayuda a tu maestro/a.'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[«»]/g, ''));
    u.lang = 'es-AR';
    u.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => /es[-_](AR|419|US|MX)/i.test(x.lang)) || voices.find((x) => /^es/i.test(x.lang));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }

  /* ---------------------------------------------------------
     9. Ventana modal
     --------------------------------------------------------- */
  let modalReturnFocus = null;
  function openModal(html, onReady) {
    modalReturnFocus = document.activeElement;
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
    if (onReady) onReady($('#modalBody'));
    const first = $('#modalBody').querySelector('button, input, [tabindex]');
    if (first) first.focus();
  }
  function closeModal() {
    $('#modal').hidden = true;
    $('#modalBody').innerHTML = '';
    if (modalReturnFocus && document.body.contains(modalReturnFocus)) modalReturnFocus.focus();
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden && !$('#modal').dataset.locked) closeModal();
  });

  function confirmModal(title, text, yesLabel, onYes) {
    openModal(`<h2 id="modalTitle">${title}</h2><p>${text}</p><div class="btn-row"><button class="btn btn-light" data-no>No, volver</button><button class="btn btn-primary" data-yes>${yesLabel}</button></div>`, (b) => {
      b.querySelector('[data-no]').onclick = closeModal;
      b.querySelector('[data-yes]').onclick = () => { closeModal(); onYes(); };
    });
  }

  /* ---------------------------------------------------------
     10. Arrastrar y soltar (mouse, dedo y lápiz)
     --------------------------------------------------------- */
  function makeDraggable(el, { onTap, onDrop, dropSelector }) {
    let start = null, ghost = null, dragging = false, lastHover = null;
    el.addEventListener('click', (e) => {
      if (el._justDragged) { e.preventDefault(); return; }
      onTap && onTap(e);
    });
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || el.disabled) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      dragging = false;
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!dragging && Math.hypot(dx, dy) > 8) {
        dragging = true;
        ghost = el.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.style.width = el.offsetWidth + 'px';
        ghost.style.height = el.offsetHeight + 'px';
        document.body.appendChild(ghost);
        el.style.opacity = '.35';
      }
      if (dragging) {
        ghost.style.left = e.clientX + 'px';
        ghost.style.top = e.clientY + 'px';
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const target = under && under.closest(dropSelector);
        if (target !== lastHover) {
          lastHover && lastHover.classList.remove('drop-hover');
          target && target.classList.add('drop-hover');
          lastHover = target;
        }
      }
    });
    const end = (e) => {
      if (!start) return;
      if (dragging) {
        ghost && ghost.remove();
        el.style.opacity = '';
        lastHover && lastHover.classList.remove('drop-hover');
        lastHover = null;
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const target = under && under.closest(dropSelector);
        el._justDragged = true;
        setTimeout(() => { el._justDragged = false; }, 60);
        if (target) onDrop(target);
      }
      start = null; dragging = false; ghost = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /* ---------------------------------------------------------
     11. Navegación entre pantallas
     --------------------------------------------------------- */
  function show(html, cls) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    app.innerHTML = `<section class="screen ${cls}">${html}</section>`;
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function nextLevelToPlay() {
    return LEVELS.find((l) => state.levels[l.id].unlocked && !state.levels[l.id].completed) || null;
  }

  /* ---------- Pantalla inicial con mapa ---------- */
  const NODE_POS = [[11, 76], [28, 36], [45, 72], [61, 38], [78, 74], [88, 15]];

  function renderHome() {
    const done = LEVELS.filter((l) => state.levels[l.id].completed).length;
    const pct = Math.round((done / LEVELS.length) * 100);
    const next = nextLevelToPlay();
    const pathD = NODE_POS.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');

    const nodes = LEVELS.map((l, i) => {
      const st = state.levels[l.id];
      const [x, y] = NODE_POS[i];
      let cls = 'locked', status = '🔒 Bloqueado';
      if (st.completed) { cls = 'done'; status = `✔ Completado · ${st.best} %`; }
      else if (st.unlocked) { cls = 'open'; status = st.plays ? `▶ Mejor: ${st.best} %` : '▶ ¡A jugar!'; }
      const current = next && next.id === l.id ? ' current' : '';
      const just = state.justUnlocked === l.id ? ' just-unlocked' : '';
      const stars = levelStars(l), max = l.challenges.length * 3;
      return `<button type="button" class="node ${cls}${current}${just}" style="left:${x}%;top:${y}%;--c:${l.color}" data-level="${l.id}"
        aria-label="${l.final ? 'Desafío final' : 'Nivel ' + l.num}: ${l.title}. ${status.replace(/[✔▶🔒]/g, '')}. ${stars} de ${max} estrellas.">
        <span class="n-icon" aria-hidden="true">${st.unlocked ? l.icon : '🔒'}</span>
        <span class="n-num">${l.final ? 'Final' : 'Nivel ' + l.num}</span>
        <span class="n-title">${l.title}</span>
        <span class="n-status">${status}</span>
        <span class="n-stars" aria-hidden="true">⭐ ${stars}/${max}</span>
      </button>`;
    }).join('');
    state.justUnlocked = null;

    const badgeMinis = BADGES.map((b) => `<span class="badge-mini ${state.badges.includes(b.id) ? '' : 'off'}" title="${b.name}${state.badges.includes(b.id) ? '' : ' (todavía no)'}" role="img" aria-label="${b.name}${state.badges.includes(b.id) ? ', obtenida' : ', todavía no obtenida'}">${b.icon}</span>`).join('');
    const chestMinis = CHESTS.map((c, i) => `<span class="chest-mini ${i < state.chestsOpened ? 'got' : ''}" title="Cofre de ${c.at} estrellas">${chestSVG(i < state.chestsOpened)} ${i < state.chestsOpened ? c.sticker.name : c.at + ' ⭐'}</span>`).join('');

    show(`
      <div class="home">
        <div class="hero">
          <div class="hero-shapes" aria-hidden="true">${shapeSVG(S('triEq', C.coral))}${shapeSVG(S('square', C.sky, 12))}${shapeSVG(S('circle', C.sun))}${shapeSVG(S('rectangle', C.green, -8))}</div>
          <h1>Exploradores <span class="accent">de Figuras</span></h1>
          <p>Una aventura para descubrir triángulos, cuadrados, rectángulos, guardas y mucho más.</p>
          <button class="btn btn-primary btn-big" id="startBtn" type="button">¡Comenzar a explorar!</button>
          <div class="progress">
            <div class="progress-label"><span>Progreso de la aventura</span><span>${pct} %</span></div>
            <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso de la aventura"><span style="width:${pct}%"></span></div>
          </div>
          <div class="mini-stats">
            <div class="mini-stat"><b>${totalStars()}</b><span>⭐ estrellas</span></div>
            <div class="mini-stat"><b>${state.badges.length}</b><span>🏅 insignias</span></div>
            <div class="mini-stat"><b>${challengesPassed()}</b><span>✅ desafíos superados</span></div>
          </div>
          <div class="backpack"><h2>Mis insignias</h2><div class="badge-row">${badgeMinis}</div></div>
          <p class="note">💾 Tu progreso se guarda solo mientras esta página esté abierta. Si la cerrás o la recargás, la aventura empieza de nuevo.</p>
        </div>
        <div class="map-card">
          <h2>🗺️ Mapa de la aventura</h2>
          <div class="map">
            <svg class="map-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="${pathD}" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke-width:16px"/>
              <path d="${pathD}" fill="none" stroke="#E8B04B" stroke-width="1" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" style="stroke-width:5px;stroke-dasharray:14 12"/>
            </svg>
            ${nodes}
          </div>
          <div class="chests" aria-label="Cofres sorpresa"><b>Cofres sorpresa:</b> ${chestMinis}</div>
        </div>
      </div>`, 'home-screen');

    $('#startBtn').onclick = () => {
      const n = nextLevelToPlay();
      if (n) openLevel(n.id);
      else renderReport();
    };
    $$('.node').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.level;
        const lv = levelById(id);
        if (!state.levels[id].unlocked) {
          const msg = lv.final ? 'El desafío final se abre cuando completes los 5 niveles con al menos 70 %.' : `Este nivel se abre cuando completes el nivel ${lv.num - 1} con al menos 70 % de respuestas correctas.`;
          toast('🔒 ' + msg);
          b.classList.remove('just-unlocked'); void b.offsetWidth;
          return;
        }
        openLevel(id);
      };
    });
  }

  function chestSVG(open) {
    return open
      ? `<svg viewBox="0 0 64 56" aria-hidden="true"><path d="M8 14 L56 14 L52 2 L12 2 Z" fill="#E0A14A" stroke="#8A5A1C" stroke-width="3"/><rect x="6" y="22" width="52" height="30" rx="4" fill="#C9822F" stroke="#8A5A1C" stroke-width="3"/><circle cx="32" cy="22" r="7" fill="#FFE066"/></svg>`
      : `<svg viewBox="0 0 64 56" aria-hidden="true"><path d="M6 24 Q6 6 32 6 Q58 6 58 24 Z" fill="#E0A14A" stroke="#8A5A1C" stroke-width="3"/><rect x="6" y="24" width="52" height="28" rx="4" fill="#C9822F" stroke="#8A5A1C" stroke-width="3"/><rect x="27" y="20" width="10" height="12" rx="2" fill="#FFD23F" stroke="#8A5A1C" stroke-width="2"/></svg>`;
  }

  /* ---------- Introducción del nivel ---------- */
  function openLevel(id) {
    const lv = levelById(id);
    if (state.run && state.run.levelId === id && state.run.idx < lv.challenges.length) { renderChallenge(); return; }
    const st = state.levels[id];
    show(`<div class="intro-card" style="--lv:${lv.color}">
        <div class="intro-icon" aria-hidden="true">${lv.icon}</div>
        <h1>${lv.final ? '' : 'Nivel ' + lv.num + ': '}${lv.title}</h1>
        <p><b>Misión:</b> ${lv.goal}</p>
        <p>${lv.challenges.length} desafíos · Para completar la misión necesitás al menos 70 % de respuestas correctas.</p>
        ${st.plays ? `<p>Tu mejor resultado: <b>${st.best} %</b>. ¡Podés mejorarlo!</p>` : ''}
        <p style="font-size:17px;color:#4A5677">No hay tiempo límite. Si te equivocás, vas a recibir una pista. ¡Equivocarse también es aprender!</p>
        <div class="btn-row"><button class="btn btn-light" id="backMap">⟵ Volver al mapa</button><button class="btn btn-primary btn-big" id="goLevel">¡Empezar la misión!</button></div>
      </div>`, 'intro');
    $('#backMap').onclick = renderHome;
    $('#goLevel').onclick = () => {
      state.run = { levelId: id, idx: 0, results: [], newBadges: [], newChests: 0, xp0: state.xp, stars0: totalStars() };
      renderChallenge();
    };
    $('#goLevel').focus();
  }

  /* ---------------------------------------------------------
     12. Motor de desafíos
     --------------------------------------------------------- */
  let cur = null;

  function renderChallenge() {
    const run = state.run;
    const lv = levelById(run.levelId);
    const ch = lv.challenges[run.idx];
    cur = { ch, lv, wrong: 0, finished: false, hintHandler: null, testSolve: null, testFail: null };

    const dots = lv.challenges.map((c, i) => {
      const r = run.results[i];
      let cls = '';
      if (r) cls = r.correct ? 'ok' : 'tried';
      else if (i === run.idx) cls = 'now';
      return `<span class="dot ${cls}" title="Desafío ${i + 1}"></span>`;
    }).join('');

    show(`
      <div class="lvl-head" style="--lv:${lv.color}">
        <button class="btn btn-small btn-light" id="toMap" type="button">⟵ Mapa</button>
        <div class="lvl-title"><span class="tag">${lv.final ? 'Final' : 'Nivel ' + lv.num}</span> <span aria-hidden="true">${lv.icon}</span> ${lv.title}</div>
        <div class="dots" aria-hidden="true">${dots}</div>
        <div class="counter">Desafío ${run.idx + 1} de ${lv.challenges.length}</div>
      </div>
      <div class="prompt-row" style="--lv:${lv.color}">
        <p class="prompt" id="prompt">${ch.prompt}${ch.sub ? `<small>${ch.sub}</small>` : ''}</p>
        <button class="btn btn-small btn-light" id="readBtn" type="button" title="Leer la consigna en voz alta"><span aria-hidden="true">🔊</span> Leer</button>
        <button class="btn btn-small btn-light" id="hintBtn" type="button"><span aria-hidden="true">💡</span> Pista</button>
      </div>
      <div class="stage" id="stage"></div>
      <div class="bottom">
        <div class="fb" id="fb" role="status" aria-live="polite"></div>
        <div class="actions" id="actions"></div>
      </div>`, 'level');

    $('#toMap').onclick = renderHome;
    $('#readBtn').onclick = () => speak($('#prompt').textContent);
    $('#hintBtn').onclick = () => {
      if (cur.finished) return;
      state.hints++;
      if (state.hints === 3) awardBadge('curioso');
      if (cur.hintHandler) cur.hintHandler();
      else feedback('info', '💡', ch.hint || 'Observá con atención las figuras: contá sus lados y sus vértices.');
    };

    const render = RENDER[ch.type];
    render(ch, $('#stage'), api);
  }

  function feedback(kind, icon, html) {
    const fb = $('#fb');
    if (!fb) return;
    fb.className = 'fb fb-' + kind;
    fb.innerHTML = `<span class="fb-icon" aria-hidden="true">${icon}</span><span>${html}</span>`;
    if (kind === 'try') { fb.classList.remove('shake'); void fb.offsetWidth; fb.classList.add('shake'); }
  }

  function setActions(btns) {
    const box = $('#actions');
    box.innerHTML = '';
    btns.forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'btn ' + (b.cls || 'btn-green');
      el.innerHTML = b.label;
      el.onclick = b.onClick;
      if (b.id) el.id = b.id;
      box.appendChild(el);
    });
    return box;
  }

  const api = {
    feedback,
    setActions,
    checkButton(fn) { setActions([{ label: '✔ Comprobar', cls: 'btn-green', onClick: fn, id: 'checkBtn' }]); },
    onHint(fn) { cur.hintHandler = fn; },
    test(solve, fail) { cur.testSolve = solve; cur.testFail = fail; },
    get wrongCount() { return cur.wrong; },
    isDone() { return cur.finished; },

    /* ok: respuesta correcta.  opt.msg: mensaje específico.  opt.reveal: muestra la respuesta.
       opt.soft: aviso sin contar como intento. */
    submit(ok, opt = {}) {
      if (cur.finished) return;
      const ch = cur.ch, L = logFor(ch.id);
      if (opt.soft) { feedback('info', '🤔', opt.msg); return; }
      L.attempts++; state.totals.attempts++;
      if (ok) {
        L.right++; state.totals.right++;
        finish(cur.wrong < (ch.okWithin || 2), opt);
      } else {
        L.wrong++; state.totals.wrong++;
        cur.wrong++;
        const max = ch.maxTries || 2;
        if (cur.wrong >= max) {
          if (opt.reveal) opt.reveal();
          finish(false, opt);
        } else {
          const extra = opt.msg ? opt.msg + ' ' : '';
          feedback('try', '?', `<b>¡Casi!</b> ${extra}<br>💡 ${ch.hint || 'Observá bien las figuras.'} ¡Probá otra vez!`);
          if (opt.retry) opt.retry();
        }
      }
    },
    complete(stars) { // para actividades que siempre terminan bien (memotest)
      if (cur.finished) return;
      const L = logFor(cur.ch.id);
      L.attempts++; L.right++; state.totals.attempts++; state.totals.right++;
      finish(true, { stars });
    }
  };

  function finish(correct, opt = {}) {
    cur.finished = true;
    const ch = cur.ch, L = logFor(ch.id), run = state.run;
    const stars = opt.stars || (correct ? (cur.wrong === 0 ? 3 : 2) : 1);
    const before = totalStars();
    L.best = Math.max(L.best, stars);
    L.last = correct;
    L.plays++;
    if (correct) L.ever = true;
    const gainedStars = totalStars() - before;

    let xp = correct ? (cur.wrong === 0 ? 15 : 10) : 5;
    let streakMsg = '';
    if (correct) {
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      if (state.streak % 3 === 0) { xp += 5; streakMsg = ` <span>🔥 ¡Racha de ${state.streak} desafíos! +5 ⚡</span>`; }
      if (state.streak >= 5) awardBadge('racha');
      if (cur.wrong > 0) { state.persevere++; if (state.persevere >= 5) awardBadge('perseverante'); }
    } else {
      state.streak = 0;
    }
    state.xp += xp;
    run.results[run.idx] = { id: ch.id, correct, wrong: cur.wrong, stars, skill: ch.skill };

    if (correct) {
      const praise = (cur.wrong > 0 ? '¡Lo lograste! Intentar otra vez dio resultado.' : (PRAISE_BY_TYPE[ch.type] || pick(PRAISE)));
      feedback('ok', '✔', `<b>${praise}</b> ${ch.explain || ''}${streakMsg}`);
      confetti(cur.wrong === 0 ? 40 : 22);
    } else {
      feedback('info', 'i', `<b>¡Buen intento! Mirá la respuesta:</b> ${ch.explain || ''} <span>+${xp} ⚡ por tu esfuerzo.</span>`);
    }
    const anchor = $('.chip-star');
    if (gainedStars > 0) floatGain(`+${gainedStars} ⭐`, anchor);
    else floatGain(`+${xp} ⚡`, $('.chip-xp'));
    updateHeader(gainedStars > 0 ? 'stars' : 'xp');
    checkChests();

    const last = run.idx >= cur.lv.challenges.length - 1;
    setActions([{ label: last ? 'Ver resultados ➜' : 'Siguiente ➜', cls: 'btn-primary', id: 'nextBtn', onClick: () => {
      run.idx++;
      if (run.idx >= cur.lv.challenges.length) renderSummary(); else renderChallenge();
    } }]);
    const hb = $('#hintBtn'); if (hb) hb.disabled = true;
    setTimeout(() => { const nb = $('#nextBtn'); if (nb) nb.focus({ preventScroll: true }); }, 50);
  }

  function awardBadge(id) {
    if (state.badges.includes(id)) return;
    state.badges.push(id);
    const b = BADGES.find((x) => x.id === id);
    if (state.run) state.run.newBadges.push(id);
    toast(`🏅 ¡Nueva insignia: ${b.icon} ${b.name}!`);
    updateHeader('badges');
  }

  function checkChests() {
    const s = totalStars();
    while (state.chestsEarned < CHESTS.length && s >= CHESTS[state.chestsEarned].at) {
      state.chestsEarned++;
      if (state.run) state.run.newChests++;
      toast('🎁 ¡Ganaste un cofre sorpresa! Lo vas a poder abrir al terminar el nivel.');
    }
  }

  /* ---------------------------------------------------------
     13. Tipos de actividad
     --------------------------------------------------------- */
  const RENDER = {};
  const markEl = (ok) => `<span class="mark ${ok ? 'ok' : 'bad'}" aria-hidden="true">${ok ? '✓' : '✗'}</span>`;
  function setMark(el, ok) {
    el.querySelectorAll(':scope > .mark').forEach((m) => m.remove());
    if (ok === null) { el.classList.remove('ok', 'bad'); return; }
    el.classList.toggle('ok', ok); el.classList.toggle('bad', !ok);
    el.insertAdjacentHTML('beforeend', markEl(ok));
  }

  /* ----- Selección de respuestas (una o varias) ----- */
  RENDER.choice = function (ch, stage, api) {
    const isText = ch.options.some((x) => x.label !== undefined && !x.letter);
    let opts = ch.keepOrder || ch.letters ? ch.options.slice() : shuffle(ch.options);
    const cols = ch.textCols === 2 ? ' two' : '';
    stage.innerHTML = `${ch.display ? `<div class="display">${ch.display}</div>` : ''}
      <div class="opts ${isText ? 'text-opts' + cols : ''}" role="group" aria-label="Opciones">
        ${opts.map((x, i) => {
          const letter = ch.letters ? (x.letter || String.fromCharCode(65 + ch.options.indexOf(x))) : '';
          if (isText) return `<button type="button" class="opt text" data-id="${x.id}" ${ch.multi ? 'aria-pressed="false"' : ''}>${x.shape ? `<span class="ico">${shapeSVG(x.shape)}</span>` : ''}<span>${x.label}</span></button>`;
          return `<button type="button" class="opt" data-id="${x.id}" ${ch.multi ? 'aria-pressed="false"' : ''} aria-label="Opción ${letter || i + 1}">${letter ? `<span class="letter">${letter}</span>` : ''}${shapeSVG(x.shape)}</button>`;
        }).join('')}
      </div>`;
    const btns = $$('.opt', stage);
    const required = ch.correct, optional = ch.optional || [];
    const revealAll = () => btns.forEach((b) => { if (required.includes(b.dataset.id)) setMark(b, true); else if (!b.classList.contains('bad')) b.classList.add('dim'); });

    if (!ch.multi) {
      btns.forEach((b) => b.addEventListener('click', () => {
        if (api.isDone() || b.classList.contains('bad')) return;
        const ok = required.includes(b.dataset.id);
        if (ok) { setMark(b, true); btns.forEach((x) => { if (x !== b && !x.classList.contains('bad')) x.classList.add('dim'); }); api.submit(true); }
        else { setMark(b, false); b.setAttribute('aria-disabled', 'true'); api.submit(false, { reveal: revealAll }); }
      }));
      api.test(() => btns.find((b) => required.includes(b.dataset.id)).click(),
               () => btns.find((b) => !required.includes(b.dataset.id) && !b.classList.contains('bad')).click());
      return;
    }

    btns.forEach((b) => b.addEventListener('click', () => {
      if (api.isDone()) return;
      btns.forEach((x) => { if (x.classList.contains('bad')) setMark(x, null); });
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    }));
    const check = () => {
      const sel = btns.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.id);
      if (!sel.length) { api.feedback('info', '👆', 'Primero tocá las opciones que elegís.'); return; }
      const missing = required.filter((id) => !sel.includes(id));
      const extra = sel.filter((id) => !required.includes(id) && !optional.includes(id));
      if (!missing.length && !extra.length) {
        btns.forEach((b) => { if (sel.includes(b.dataset.id)) setMark(b, true); });
        api.submit(true);
        return;
      }
      btns.forEach((b) => { if (extra.includes(b.dataset.id)) { setMark(b, false); b.setAttribute('aria-pressed', 'false'); } });
      let msg = '';
      if (extra.length && missing.length) msg = 'Hay alguna que no corresponde (✗) y te falta encontrar otra.';
      else if (extra.length) msg = 'Elegiste alguna que no corresponde (está marcada con ✗).';
      else msg = `Vas bien, pero te falta encontrar ${missing.length === 1 ? 'una más' : 'algunas más'}.`;
      api.submit(false, { msg, reveal: () => { btns.forEach((b) => b.setAttribute('aria-pressed', 'false')); revealAll(); } });
    };
    api.checkButton(check);
    api.test(() => { btns.forEach((b) => b.setAttribute('aria-pressed', required.includes(b.dataset.id) ? 'true' : 'false')); check(); },
             () => { btns.forEach((b) => b.setAttribute('aria-pressed', required.includes(b.dataset.id) ? 'false' : 'true')); check(); });
  };

  /* ----- Clasificar en cajas ----- */
  RENDER.sort = function (ch, stage, api) {
    const place = {};
    let selected = null;
    const items = shuffle(ch.items);
    stage.innerHTML = `<div class="sort-wrap">
        <div class="tray" data-drop="tray" aria-label="Figuras para ubicar"></div>
        <div class="bins">${ch.bins.map((b) => `<div class="bin" data-drop="${b.id}" style="--c:${b.color}" role="button" tabindex="0" aria-label="Caja: ${b.label}"><span class="bin-head">${b.icon ? b.icon : ''}<span>${b.label}</span></span><span class="bin-items"></span></div>`).join('')}</div>
      </div>`;
    const tray = $('.tray', stage);
    const itemEls = {};
    items.forEach((it, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'item';
      el.dataset.id = it.id;
      el.setAttribute('aria-label', 'Figura ' + (i + 1));
      el.innerHTML = shapeSVG(it.shape);
      itemEls[it.id] = el;
      makeDraggable(el, {
        dropSelector: '[data-drop]',
        onTap: (e) => {
          e.stopPropagation();
          if (api.isDone()) return;
          if (place[it.id]) { moveTo(it.id, null); return; }
          select(selected === it.id ? null : it.id);
        },
        onDrop: (target) => { if (!api.isDone()) moveTo(it.id, target.dataset.drop === 'tray' ? null : target.dataset.drop); }
      });
      tray.appendChild(el);
    });
    function select(id) {
      selected = id;
      Object.values(itemEls).forEach((e) => e.classList.toggle('selected', e.dataset.id === id));
      if (id) api.feedback('info', '👉', 'Ahora tocá la caja donde va esa figura.');
    }
    function moveTo(id, binId) {
      const el = itemEls[id];
      setMark(el, null);
      place[id] = binId;
      if (binId) $(`.bin[data-drop="${binId}"] .bin-items`, stage).appendChild(el);
      else tray.appendChild(el);
      select(null);
      refreshTray();
    }
    function refreshTray() {
      const left = items.filter((it) => !place[it.id]).length;
      let msg = $('.tray-empty', tray);
      if (!left && !msg) tray.insertAdjacentHTML('beforeend', '<span class="tray-empty">¡Ubicaste todas! Tocá «Comprobar».</span>');
      if (left && msg) msg.remove();
    }
    $$('.bin', stage).forEach((b) => {
      const act = () => {
        if (api.isDone() || !selected) { if (!selected && !api.isDone()) api.feedback('info', '👆', 'Primero tocá una figura (o arrastrala hasta la caja).'); return; }
        moveTo(selected, b.dataset.drop);
      };
      b.addEventListener('click', act);
      b.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === b) { e.preventDefault(); act(); } });
    });
    const check = () => {
      const left = items.filter((it) => !place[it.id]);
      if (left.length) { api.feedback('info', '👆', `Todavía ${left.length === 1 ? 'queda 1 figura' : 'quedan ' + left.length + ' figuras'} sin ubicar.`); return; }
      const bad = items.filter((it) => place[it.id] !== it.bin);
      if (!bad.length) { items.forEach((it) => setMark(itemEls[it.id], true)); api.submit(true); return; }
      bad.forEach((it) => setMark(itemEls[it.id], false));
      api.submit(false, {
        msg: `${bad.length === 1 ? 'Hay 1 figura' : 'Hay ' + bad.length + ' figuras'} en una caja equivocada (marcadas con ✗).`,
        reveal: () => items.forEach((it) => { const el = itemEls[it.id]; $(`.bin[data-drop="${it.bin}"] .bin-items`, stage).appendChild(el); place[it.id] = it.bin; setMark(el, true); })
      });
    };
    api.checkButton(check);
    api.test(() => { items.forEach((it) => moveTo(it.id, it.bin)); check(); },
             () => { items.forEach((it) => moveTo(it.id, ch.bins.find((b) => b.id !== it.bin).id)); check(); });
  };

  /* ----- Unir figura con nombre ----- */
  RENDER.match = function (ch, stage, api) {
    const PAIR_COLORS = [C.violet, C.orange, C.teal, C.pink, C.blue, C.green];
    const left = shuffle(ch.pairs), right = shuffle(ch.pairs);
    const links = {}; // shapeId -> nameId
    let selL = null, selR = null;
    stage.innerHTML = `<div class="match">
      <div class="match-col shapes">${left.map((p, i) => `<button type="button" class="m-item" data-l="${p.id}" aria-label="Figura ${i + 1}">${shapeSVG(p.shape)}<span class="pair"></span></button>`).join('')}</div>
      <div class="match-col names">${right.map((p) => `<button type="button" class="m-item" data-r="${p.id}">${p.label}<span class="pair"></span></button>`).join('')}</div></div>`;
    const Ls = $$('[data-l]', stage), Rs = $$('[data-r]', stage);
    function paint() {
      const order = Object.keys(links);
      [...Ls, ...Rs].forEach((el) => { setMark(el, null); el.classList.remove('selected'); const p = $('.pair', el); p.textContent = ''; p.style.background = 'transparent'; });
      order.forEach((l, i) => {
        const r = links[l], col = PAIR_COLORS[i % PAIR_COLORS.length];
        [Ls.find((e) => e.dataset.l === l), Rs.find((e) => e.dataset.r === r)].forEach((el) => { const p = $('.pair', el); p.textContent = i + 1; p.style.background = col; });
      });
      if (selL) Ls.find((e) => e.dataset.l === selL).classList.add('selected');
      if (selR) Rs.find((e) => e.dataset.r === selR).classList.add('selected');
    }
    function tryLink() {
      if (selL && selR) {
        Object.keys(links).forEach((k) => { if (links[k] === selR) delete links[k]; });
        links[selL] = selR; selL = selR = null;
      }
      paint();
    }
    Ls.forEach((el) => el.addEventListener('click', () => {
      if (api.isDone()) return;
      const id = el.dataset.l;
      if (links[id]) { delete links[id]; selL = null; paint(); return; }
      selL = selL === id ? null : id; tryLink();
    }));
    Rs.forEach((el) => el.addEventListener('click', () => {
      if (api.isDone()) return;
      const id = el.dataset.r;
      const owner = Object.keys(links).find((k) => links[k] === id);
      if (owner) { delete links[owner]; selR = null; paint(); return; }
      selR = selR === id ? null : id; tryLink();
    }));
    const check = () => {
      if (Object.keys(links).length < ch.pairs.length) { api.feedback('info', '👆', 'Uní todas las figuras con un nombre antes de comprobar.'); return; }
      const bad = Object.keys(links).filter((l) => links[l] !== l);
      if (!bad.length) { paint(); [...Ls, ...Rs].forEach((e) => setMark(e, true)); api.submit(true); return; }
      paint();
      bad.forEach((l) => { setMark(Ls.find((e) => e.dataset.l === l), false); setMark(Rs.find((e) => e.dataset.r === links[l]), false); });
      api.submit(false, {
        msg: `${bad.length === 1 ? 'Hay una unión equivocada' : 'Hay ' + bad.length + ' uniones equivocadas'} (✗). Tocala para deshacerla.`,
        reveal: () => { Object.keys(links).forEach((k) => delete links[k]); ch.pairs.forEach((p) => { links[p.id] = p.id; }); paint(); [...Ls, ...Rs].forEach((e) => setMark(e, true)); }
      });
    };
    api.checkButton(check);
    api.test(() => { ch.pairs.forEach((p) => { links[p.id] = p.id; }); paint(); check(); },
             () => { ch.pairs.forEach((p, i) => { links[p.id] = ch.pairs[(i + 1) % ch.pairs.length].id; }); paint(); check(); });
  };

  /* ----- Memotest ----- */
  RENDER.memo = function (ch, stage, api) {
    const cards = shuffle(ch.pairs.flatMap((p) => [{ key: p.id, kind: 's', p }, { key: p.id, kind: 't', p }]));
    let open = [], lock = false, miss = 0, found = 0;
    stage.innerHTML = `<div class="memo">${cards.map((c, i) => `<button type="button" class="card" data-i="${i}" aria-label="Carta ${i + 1}, boca abajo"><span class="card-in"><span class="card-face card-back" aria-hidden="true">?</span><span class="card-face card-front">${c.kind === 's' ? shapeSVG(c.p.shape) : c.p.text}</span></span></button>`).join('')}</div>`;
    const els = $$('.card', stage);
    api.setActions([]);
    function flip(i) {
      const el = els[i], c = cards[i];
      if (lock || api.isDone() || el.classList.contains('flip') || el.classList.contains('matched')) return;
      el.classList.add('flip');
      el.setAttribute('aria-label', `Carta ${i + 1}: ${c.kind === 's' ? 'figura ' + PROPS[c.p.shape.type].name : c.p.text}`);
      open.push(i);
      if (open.length === 2) {
        const [a, b] = open;
        if (cards[a].key === cards[b].key && cards[a].kind !== cards[b].kind) {
          els[a].classList.add('matched'); els[b].classList.add('matched');
          found++; open = [];
          api.feedback('ok', '✔', `<b>¡Pareja!</b> El ${PROPS[cards[a].p.shape.type].name}: ${cards[a].p.text.toLowerCase()}.`);
          if (found === ch.pairs.length) {
            const stars = miss <= 4 ? 3 : (miss <= 9 ? 2 : 1);
            setTimeout(() => api.complete(stars), 500);
          }
        } else {
          miss++; lock = true;
          api.feedback('try', '?', 'No son pareja. ¡Recordá dónde estaban!');
          setTimeout(() => { els[a].classList.remove('flip'); els[b].classList.remove('flip'); els[a].setAttribute('aria-label', `Carta ${a + 1}, boca abajo`); els[b].setAttribute('aria-label', `Carta ${b + 1}, boca abajo`); open = []; lock = false; }, 1200);
        }
      }
    }
    els.forEach((el, i) => el.addEventListener('click', () => flip(i)));
    api.onHint(() => {
      // Pista: muestra un instante una pareja que todavía no se encontró.
      if (lock || open.length) { api.feedback('info', '💡', 'Esperá a que se den vuelta las cartas y pedí la pista otra vez.'); return; }
      const idx = cards.map((c, i) => i).filter((i) => !els[i].classList.contains('matched'));
      if (!idx.length) return;
      const k = cards[idx[0]].key;
      const pair = idx.filter((i) => cards[i].key === k);
      lock = true;
      pair.forEach((i) => els[i].classList.add('flip'));
      api.feedback('info', '💡', 'Mirá bien: estas dos cartas son pareja. ¡Recordá dónde están!');
      setTimeout(() => { pair.forEach((i) => els[i].classList.remove('flip')); lock = false; }, 1500);
    });
    api.test(() => { found = ch.pairs.length - 0; els.forEach((e) => e.classList.add('matched')); api.complete(3); }, null);
  };

  /* ----- Completar secuencias (guardas) ----- */
  RENDER.sequence = function (ch, stage, api) {
    const blanks = ch.seq.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
    const fill = {}; // index -> palette index
    let active = blanks[0];
    stage.innerHTML = `<div class="guarda" style="overflow-x:auto">${ch.seq.map((s, i) => s
        ? `<span class="seq-cell">${shapeSVG(s)}</span>`
        : `<button type="button" class="seq-cell blank" data-i="${i}" data-drop="${i}" aria-label="Lugar vacío ${blanks.indexOf(i) + 1}">?</button>`).join('')}</div>
      <div class="palette"><span class="palette-title">Figuras disponibles (tocá o arrastrá):</span>${ch.palette.map((s, k) => `<button type="button" class="pal-item" data-k="${k}" aria-label="Figura ${PROPS[s.type].name}">${shapeSVG(s)}</button>`).join('')}</div>`;
    const cells = $$('.blank', stage);
    const cellOf = (i) => cells.find((c) => +c.dataset.i === i);
    function paint() {
      cells.forEach((c) => {
        const i = +c.dataset.i;
        const k = fill[i];
        c.classList.toggle('active', i === active);
        c.classList.toggle('filled', k !== undefined);
        c.innerHTML = k !== undefined ? shapeSVG(ch.palette[k]) : '?';
        c.setAttribute('aria-label', `Lugar vacío ${blanks.indexOf(i) + 1}${k !== undefined ? ': ' + PROPS[ch.palette[k].type].name : ''}`);
      });
    }
    function put(i, k) {
      fill[i] = k;
      const nextEmpty = blanks.find((b) => fill[b] === undefined);
      active = nextEmpty !== undefined ? nextEmpty : null;
      paint();
    }
    cells.forEach((c) => c.addEventListener('click', () => {
      if (api.isDone()) return;
      const i = +c.dataset.i;
      if (fill[i] !== undefined) { delete fill[i]; }
      active = i; paint();
    }));
    $$('.pal-item', stage).forEach((p) => makeDraggable(p, {
      dropSelector: '.blank',
      onTap: () => {
        if (api.isDone()) return;
        if (active === null || active === undefined) { const e = blanks.find((b) => fill[b] === undefined); if (e === undefined) { api.feedback('info', '👆', 'Tocá un lugar para cambiar la figura.'); return; } active = e; }
        put(active, +p.dataset.k);
      },
      onDrop: (target) => { if (!api.isDone()) put(+target.dataset.i, +p.dataset.k); }
    }));
    paint();
    const check = () => {
      if (blanks.some((b) => fill[b] === undefined)) { api.feedback('info', '👆', 'Completá todos los lugares vacíos.'); return; }
      const bad = blanks.filter((b, n) => ch.palette[fill[b]].type !== ch.answer[n]);
      paint();
      if (!bad.length) { blanks.forEach((b) => setMark(cellOf(b), true)); api.submit(true); return; }
      bad.forEach((b) => setMark(cellOf(b), false));
      api.submit(false, {
        msg: bad.length === 1 ? 'Hay un lugar con una figura equivocada (✗).' : `Hay ${bad.length} lugares con figuras equivocadas (✗).`,
        reveal: () => { blanks.forEach((b, n) => { fill[b] = ch.palette.findIndex((s) => s.type === ch.answer[n]); }); active = null; paint(); blanks.forEach((b) => setMark(cellOf(b), true)); }
      });
    };
    api.checkButton(check);
    api.test(() => { blanks.forEach((b, n) => { fill[b] = ch.palette.findIndex((s) => s.type === ch.answer[n]); }); check(); },
             () => { blanks.forEach((b, n) => { fill[b] = ch.palette.findIndex((s) => s.type !== ch.answer[n]); }); check(); });
  };

  /* ----- Marcar el patrón que se repite ----- */
  RENDER.pattern = function (ch, stage, api) {
    stage.innerHTML = guardaHTML(ch.seq, { clickable: true, big: true });
    const els = $$('.g-item', stage);
    els.forEach((e) => e.addEventListener('click', () => {
      if (api.isDone()) return;
      els.forEach((x) => setMark(x, null));
      e.setAttribute('aria-pressed', e.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      const n = els.filter((x) => x.getAttribute('aria-pressed') === 'true').length;
      api.feedback('info', '⭕', `Marcaste ${n} ${n === 1 ? 'figura' : 'figuras'}.`);
    }));
    const check = () => {
      const sel = els.map((e, i) => (e.getAttribute('aria-pressed') === 'true' ? i : -1)).filter((i) => i >= 0);
      if (!sel.length) { api.feedback('info', '👆', 'Tocá las figuras que forman el patrón.'); return; }
      const contiguous = sel.every((v, k) => k === 0 || v === sel[k - 1] + 1);
      if (contiguous && sel.length === ch.period) { sel.forEach((i) => setMark(els[i], true)); api.submit(true); return; }
      let msg = '';
      if (!contiguous) msg = 'Las figuras del patrón tienen que estar una al lado de la otra.';
      else if (sel.length < ch.period) msg = `Marcaste ${sel.length}: te faltan figuras para una vuelta completa.`;
      else msg = `Marcaste ${sel.length}: es más de una vuelta.`;
      api.submit(false, { msg, reveal: () => els.forEach((e, i) => { e.setAttribute('aria-pressed', i < ch.period ? 'true' : 'false'); if (i < ch.period) setMark(e, true); }) });
    };
    api.checkButton(check);
    api.test(() => { els.forEach((e, i) => e.setAttribute('aria-pressed', i >= 2 && i < 2 + ch.period ? 'true' : 'false')); check(); },
             () => { els.forEach((e, i) => e.setAttribute('aria-pressed', i < 3 ? 'true' : 'false')); check(); });
  };

  /* ----- Encontrar el error en una guarda ----- */
  RENDER.findError = function (ch, stage, api) {
    stage.innerHTML = guardaHTML(ch.model, { label: 'Modelo' }) + guardaHTML(ch.seq, { clickable: true, label: 'Guarda de Ramiro (tocá las figuras que están mal)' }) + '<div id="fixArea" style="width:100%"></div>';
    const els = $$('button.g-item', stage);
    let phase = 1;
    els.forEach((e) => e.addEventListener('click', () => {
      if (api.isDone() || phase !== 1) return;
      els.forEach((x) => setMark(x, null));
      e.setAttribute('aria-pressed', e.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    }));
    const revealErr = () => els.forEach((e, i) => { e.setAttribute('aria-pressed', 'false'); if (ch.wrongIdx.includes(i)) setMark(e, false); });
    const goPhase2 = () => {
      phase = 2;
      api.feedback('ok', '✔', '<b>¡Bien! Encontraste los errores.</b> Ahora contestá la última pregunta.');
      const opts = shuffle(ch.fix.options);
      $('#fixArea', stage).innerHTML = `<p class="prompt" style="text-align:center;margin:6px 0">${ch.fix.prompt}</p><div class="opts text-opts two">${opts.map((x) => `<button type="button" class="opt text" data-id="${x.id}"><span class="ico">${shapeSVG(x.shape)}</span><span>${x.label}</span></button>`).join('')}</div>`;
      api.setActions([]);
      const fb = $$('#fixArea .opt', stage);
      fb.forEach((b) => b.addEventListener('click', () => {
        if (api.isDone() || b.classList.contains('bad')) return;
        if (b.dataset.id === ch.fix.correct) { setMark(b, true); api.submit(true); }
        else { setMark(b, false); api.submit(false, { reveal: () => setMark(fb.find((x) => x.dataset.id === ch.fix.correct), true) }); }
      }));
      cur.testSolve = () => fb.find((x) => x.dataset.id === ch.fix.correct).click();
    };
    const check = () => {
      const sel = els.map((e, i) => (e.getAttribute('aria-pressed') === 'true' ? i : -1)).filter((i) => i >= 0);
      if (!sel.length) { api.feedback('info', '👆', 'Tocá las figuras de la guarda de Ramiro que están mal.'); return; }
      const bad = sel.filter((i) => !ch.wrongIdx.includes(i));
      const missing = ch.wrongIdx.filter((i) => !sel.includes(i));
      if (!bad.length && !missing.length) { sel.forEach((i) => setMark(els[i], false)); goPhase2(); return; }
      bad.forEach((i) => { setMark(els[i], true); els[i].setAttribute('aria-pressed', 'false'); });
      const msg = bad.length ? 'Marcaste alguna figura que está bien (✓).' : `Encontraste ${sel.length}, pero hay ${ch.wrongIdx.length} errores.`;
      api.submit(false, { msg, reveal: revealErr });
    };
    api.checkButton(check);
    api.test(() => { els.forEach((e, i) => e.setAttribute('aria-pressed', ch.wrongIdx.includes(i) ? 'true' : 'false')); check(); cur.testSolve(); },
             () => { els.forEach((e, i) => e.setAttribute('aria-pressed', i === 0 ? 'true' : 'false')); check(); });
  };

  /* ----- Crear una guarda propia ----- */
  RENDER.create = function (ch, stage, api) {
    const unit = [];
    let phase = 1;
    function draw() {
      const rep = unit.length ? Array.from({ length: Math.max(3, Math.ceil(9 / unit.length)) }, () => unit).flat().slice(0, unit.length * 3) : [];
      stage.innerHTML = `<div class="create">
        <div class="unit"><span class="unit-label">Mi patrón:</span>${unit.length ? unit.map((k, i) => `<button type="button" class="pal-item" data-rm="${i}" aria-label="Quitar figura ${i + 1}">${shapeSVG(ch.palette[k])}</button>`).join('') : '<span style="font-weight:700;color:#4A5677">Tocá figuras de abajo (de 2 a 4).</span>'}</div>
        ${rep.length ? guardaHTML(rep.map((k) => ch.palette[k]), { label: 'Así queda tu guarda:' }) : ''}
        ${phase === 1 ? `<div class="palette"><span class="palette-title">Elegí figuras para tu patrón. Tocá una figura del patrón para quitarla.</span>${ch.palette.map((s, k) => `<button type="button" class="pal-item" data-k="${k}" aria-label="Agregar ${PROPS[s.type].name}">${shapeSVG(s)}</button>`).join('')}</div>` : '<div id="q2" style="width:100%"></div>'}
      </div>`;
      $$('[data-k]', stage).forEach((b) => b.addEventListener('click', () => {
        if (unit.length >= 4) { api.feedback('info', '✋', 'Tu patrón puede tener hasta 4 figuras.'); return; }
        unit.push(+b.dataset.k); draw();
      }));
      $$('[data-rm]', stage).forEach((b) => b.addEventListener('click', () => { if (phase === 1) { unit.splice(+b.dataset.rm, 1); draw(); } }));
      if (phase === 2) askPeriod();
    }
    function minimalPeriod(arr) {
      for (let p = 1; p <= arr.length; p++) if (arr.length % p === 0 && arr.every((v, i) => v === arr[i % p])) return p;
      return arr.length;
    }
    function askPeriod() {
      const valid = [...new Set([minimalPeriod(unit.map((k) => ch.palette[k].type)), unit.length])];
      const opts = [2, 3, 4, 5];
      $('#q2', stage).innerHTML = `<p class="prompt" style="text-align:center;margin:4px 0">¿Cada cuántas figuras vuelve a empezar tu guarda?</p><div class="opts text-opts two" style="grid-template-columns:repeat(4,1fr)">${opts.map((n) => `<button type="button" class="opt text" data-n="${n}" style="justify-content:center;padding:10px">${n} figuras</button>`).join('')}</div>`;
      const bs = $$('#q2 .opt', stage);
      bs.forEach((b) => b.addEventListener('click', () => {
        if (api.isDone() || b.classList.contains('bad')) return;
        const n = +b.dataset.n;
        if (valid.includes(n)) { setMark(b, true); api.submit(true); }
        else { setMark(b, false); api.submit(false, { msg: 'Contá las figuras de tu patrón.', reveal: () => bs.forEach((x) => { if (valid.includes(+x.dataset.n)) setMark(x, true); }) }); }
      }));
      cur.testSolve = () => bs.find((x) => valid.includes(+x.dataset.n)).click();
    }
    const ready = () => {
      if (unit.length < 2) { api.feedback('info', '👆', 'Elegí por lo menos 2 figuras para tu patrón.'); return; }
      if (new Set(unit.map((k) => ch.palette[k].type)).size < 2) { api.feedback('info', '👆', 'Usá al menos 2 figuras distintas para que se note el patrón.'); return; }
      phase = 2; api.setActions([]); draw();
      api.feedback('ok', '✔', '<b>¡Qué linda guarda!</b> Ahora contestá la pregunta.');
    };
    draw();
    api.setActions([{ label: '✔ ¡Listo!', cls: 'btn-green', onClick: ready, id: 'checkBtn' }]);
    api.test(() => { unit.push(0, 1, 2); ready(); cur.testSolve(); }, null);
  };

  /* ----- Pescando figuras ----- */
  RENDER.fish = function (ch, stage, api) {
    let shown = ch.progressive ? 1 : ch.clues.length;
    // Posiciones en una grilla con leve variación
    const pond = shuffle(ch.pond.map((s, i) => Object.assign({ key: i }, s)));
    const cols = 4, rows = Math.ceil(pond.length / cols);
    const pos = pond.map((s, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      return [12 + c * 25 + (Math.random() * 6 - 3), 21 + r * (62 / Math.max(1, rows - 1)) + (Math.random() * 4 - 2)];
    });
    stage.innerHTML = `<div class="fish-wrap">
      <div class="clue-card"><h3>🎣 ${ch.progressive ? '¿Quién soy?' : 'Tarjeta'}</h3><ul id="clues"></ul>
        ${ch.progressive ? '<button class="btn btn-small btn-violet" id="moreClue" type="button">➕ Otra pista</button>' : ''}
        <p style="margin:0;font-size:15px;font-weight:700;color:#6b5a3a">Tocá una figura del estanque para pescarla.</p></div>
      <div class="pond" role="group" aria-label="Estanque con figuras">${pond.map((s, i) => `<button type="button" class="fish" data-i="${i}" style="left:${pos[i][0]}%;top:${pos[i][1]}%" aria-label="Figura ${i + 1}"><span class="bobber" style="animation-delay:${(i % 5) * 0.4}s"><span class="ring"></span>${shapeSVG(s)}</span></button>`).join('')}</div>
    </div>`;
    const fishes = $$('.fish', stage);
    function drawClues() {
      $('#clues', stage).innerHTML = ch.clues.map((c, i) => (i < shown ? `<li>${c.t}</li>` : `<li class="hidden-clue">Pista escondida</li>`)).join('');
      const mb = $('#moreClue', stage);
      if (mb) mb.disabled = shown >= ch.clues.length;
    }
    drawClues();
    const more = $('#moreClue', stage);
    if (more) more.onclick = () => { if (shown < ch.clues.length) { shown++; drawClues(); } };
    const valid = (s) => ch.clues.every((c) => c.f(PROPS[s.type]));
    const reveal = () => fishes.forEach((f, i) => { if (valid(pond[i])) { f.classList.add('glow'); setMark(f, true); } });
    fishes.forEach((f, i) => f.addEventListener('click', () => {
      if (api.isDone() || f.classList.contains('bad')) return;
      const s = pond[i], p = PROPS[s.type];
      if (valid(s)) {
        f.classList.add('caught'); setMark(f, true);
        api.submit(true);
        return;
      }
      const shownOk = ch.clues.slice(0, shown).every((c) => c.f(p));
      if (ch.progressive && shownOk) {
        api.submit(false, { soft: true, msg: '<b>¡Puede ser!</b> Esa figura cumple las pistas que leíste, pero no estás seguro. Tocá «Otra pista».' });
        return;
      }
      const failed = ch.clues.slice(0, shown).find((c) => !c.f(p)) || ch.clues.find((c) => !c.f(p));
      f.classList.add('nope'); setTimeout(() => f.classList.remove('nope'), 500);
      setMark(f, false);
      api.submit(false, { msg: `Esa figura no cumple con «${failed.t}».`, reveal });
    }));
    api.onHint(() => {
      if (ch.progressive && shown < ch.clues.length) { shown++; drawClues(); api.feedback('info', '💡', 'Te regalo otra pista. ¡Leela con atención!'); }
      else api.feedback('info', '💡', ch.hint);
    });
    api.setActions([]);
    api.test(() => { shown = ch.clues.length; fishes.find((f, i) => valid(pond[i])).click(); },
             () => { shown = ch.clues.length; fishes.find((f, i) => !valid(pond[i])).click(); });
  };

  /* ----- Verdadero o falso con justificación ----- */
  RENDER.tf = function (ch, stage, api) {
    let tf = null, just = null;
    const justs = shuffle(ch.justs);
    stage.innerHTML = `<div class="tf cols">
      <div class="tf-left">
        ${ch.display ? `<div class="display">${ch.display}</div>` : ''}
        <div class="statement">«${ch.statement}»</div>
        <div class="tf-btns" role="group" aria-label="Verdadero o falso">
          <button type="button" class="btn btn-green tf-btn" data-v="1" aria-pressed="false">✔ Verdadero</button>
          <button type="button" class="btn btn-violet tf-btn" data-v="0" aria-pressed="false">✗ Falso</button>
        </div>
      </div>
      <div class="tf-right">
        <div class="just-title">¿Por qué? Elegí la mejor explicación:</div>
        <div class="opts text-opts" role="group" aria-label="Explicaciones">${justs.map((j) => `<button type="button" class="opt text" data-id="${j.id}" aria-pressed="false">${j.label}</button>`).join('')}</div>
      </div></div>`;
    const tfb = $$('.tf-btn', stage), jb = $$('.opt', stage);
    tfb.forEach((b) => b.addEventListener('click', () => { if (api.isDone()) return; tf = b.dataset.v === '1'; tfb.forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); }));
    jb.forEach((b) => b.addEventListener('click', () => { if (api.isDone()) return; just = b.dataset.id; jb.forEach((x) => { setMark(x, null); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); }));
    const reveal = () => {
      tfb.forEach((x) => x.setAttribute('aria-pressed', (x.dataset.v === '1') === ch.answer ? 'true' : 'false'));
      jb.forEach((x) => { x.setAttribute('aria-pressed', 'false'); if (x.dataset.id === ch.justCorrect) setMark(x, true); });
    };
    const check = () => {
      if (tf === null) { api.feedback('info', '👆', 'Elegí «Verdadero» o «Falso».'); return; }
      if (just === null) { api.feedback('info', '👆', 'Elegí también por qué.'); return; }
      const okTf = tf === ch.answer, okJ = just === ch.justCorrect;
      if (okTf && okJ) { setMark(jb.find((x) => x.dataset.id === just), true); api.submit(true); return; }
      if (!okJ) setMark(jb.find((x) => x.dataset.id === just), false);
      const msg = !okTf ? 'Pensá otra vez si la frase es verdadera o falsa.' : '¡Bien elegido! Pero revisá el porqué.';
      api.submit(false, { msg, reveal });
    };
    api.checkButton(check);
    api.test(() => { tf = ch.answer; just = ch.justCorrect; check(); }, () => { tf = !ch.answer; just = ch.justs.find((j) => j.id !== ch.justCorrect).id; check(); });
  };

  /* ----- Marcar vértices, lados y diagonales ----- */
  RENDER.mark = function (ch, stage, api) {
    const [W, H] = ch.view;
    const sel = new Set();
    const isPts = ch.mode === 'points';
    const word = isPts ? 'vértices' : (ch.allDashed ? 'diagonales' : 'lados');
    const base = (ch.base || []).map((b) => `<polygon points="${b.poly.map((p) => p.join(',')).join(' ')}" fill="#FFF3D6" stroke="#1E2A4A" stroke-width=".12" stroke-linejoin="round"/>`).join('');
    const cands = ch.cands.map((c, i) => {
      if (isPts) {
        return `<g class="hit" data-i="${i}" tabindex="0" role="button" aria-pressed="false" aria-label="Punto ${i + 1}">
          <circle cx="${c[0]}" cy="${c[1]}" r=".75" fill="transparent"/>
          <circle class="focus-ring" cx="${c[0]}" cy="${c[1]}" r=".55" fill="none" stroke="transparent"/>
          <circle class="dotv" cx="${c[0]}" cy="${c[1]}" r=".3" fill="#fff" stroke="#8A7F6A" stroke-width=".08"/></g>`;
      }
      const dashed = ch.allDashed || (ch.dashedWrong && !c[4]);
      return `<g class="hit" data-i="${i}" tabindex="0" role="button" aria-pressed="false" aria-label="Línea ${i + 1}">
        <line x1="${c[0]}" y1="${c[1]}" x2="${c[2]}" y2="${c[3]}" stroke="transparent" stroke-width=".9" stroke-linecap="round"/>
        <line class="focus-ring" x1="${c[0]}" y1="${c[1]}" x2="${c[2]}" y2="${c[3]}" stroke="transparent" stroke-width=".5"/>
        <line class="segv" x1="${c[0]}" y1="${c[1]}" x2="${c[2]}" y2="${c[3]}" stroke="#4A5677" stroke-width=".12" ${dashed ? 'stroke-dasharray=".35 .25"' : ''} stroke-linecap="round"/></g>`;
    }).join('');
    stage.innerHTML = `<div class="mark-wrap"><svg class="mark-svg" viewBox="0 0 ${W} ${H}" aria-label="Figura para marcar">${base}${cands}<g id="ticks"></g></svg>
      <div class="mark-legend">Marcaste<span class="count" id="markCount">0</span>${word}<br><span style="font-size:15px;color:#4A5677">Tocá de nuevo para desmarcar.</span></div></div>`;
    const hits = $$('.hit', stage);
    function paint(marks = {}) {
      hits.forEach((g) => {
        const i = +g.dataset.i, on = sel.has(i);
        g.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (isPts) {
          const d = $('.dotv', g);
          d.setAttribute('r', on ? '.42' : '.3');
          d.setAttribute('fill', on ? ch.markColor : '#fff');
          d.setAttribute('stroke', on ? '#0E3D6B' : '#8A7F6A');
        } else {
          const l = $('.segv', g);
          l.setAttribute('stroke', on ? ch.markColor : '#4A5677');
          l.setAttribute('stroke-width', on ? '.32' : '.12');
          if (on) l.removeAttribute('stroke-dasharray');
          else if (ch.allDashed || (ch.dashedWrong && !ch.cands[i][4])) l.setAttribute('stroke-dasharray', '.35 .25');
        }
      });
      $('#markCount', stage).textContent = sel.size;
      // ✓ / ✗ sobre las marcas
      $('#ticks', stage).innerHTML = Object.keys(marks).map((i) => {
        const c = ch.cands[i];
        const [x, y] = isPts ? [c[0] + .55, c[1] - .55] : [(c[0] + c[2]) / 2 + .35, (c[1] + c[3]) / 2 - .35];
        const ok = marks[i];
        return `<g aria-hidden="true"><circle cx="${x}" cy="${y}" r=".38" fill="${ok ? '#2FA35A' : '#FF6B6B'}"/><text x="${x}" y="${y + .16}" text-anchor="middle" font-size=".5" font-weight="900" fill="#fff" font-family="sans-serif">${ok ? '✓' : '✗'}</text></g>`;
      }).join('');
    }
    const toggle = (g) => { if (api.isDone()) return; const i = +g.dataset.i; sel.has(i) ? sel.delete(i) : sel.add(i); paint(); };
    hits.forEach((g) => {
      g.addEventListener('click', () => toggle(g));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(g); } });
    });
    paint();
    const correct = ch.cands.map((c, i) => (c[isPts ? 2 : 4] ? i : -1)).filter((i) => i >= 0);
    const check = () => {
      if (!sel.size) { api.feedback('info', '👆', `Tocá los ${word} para marcarlos.`); return; }
      const s = [...sel];
      const extra = s.filter((i) => !correct.includes(i)), missing = correct.filter((i) => !sel.has(i));
      if (!extra.length && !missing.length) { const m = {}; s.forEach((i) => { m[i] = true; }); paint(m); api.submit(true); return; }
      const m = {}; extra.forEach((i) => { m[i] = false; });
      paint(m);
      let msg = extra.length ? `Marcaste algo que no es ${isPts ? 'un vértice' : (ch.allDashed ? 'una diagonal' : 'un lado')} (✗).` : `Te ${missing.length === 1 ? 'falta 1' : 'faltan ' + missing.length}.`;
      api.submit(false, { msg, reveal: () => { sel.clear(); correct.forEach((i) => sel.add(i)); const mm = {}; correct.forEach((i) => { mm[i] = true; }); paint(mm); } });
    };
    api.checkButton(check);
    api.test(() => { sel.clear(); correct.forEach((i) => sel.add(i)); check(); }, () => { sel.clear(); sel.add(ch.cands.findIndex((c) => !c[isPts ? 2 : 4])); check(); });
  };

  /* ----- Completar tablas ----- */
  RENDER.table = function (ch, stage, api) {
    const keys = ['name', 'sides', 'vertices', 'medida'];
    const heads = ['Figura', 'Se llama…', 'Cantidad de lados', 'Cantidad de vértices', 'Medida de cada uno de sus lados'];
    stage.innerHTML = `<table class="ftable"><thead><tr>${heads.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>
      ${ch.rows.map((r, ri) => `<tr><td class="fig"><b>Figura ${ri + 1}</b><br>${r.fig}</td>${keys.map((k) => `<td><select data-r="${ri}" data-k="${k}" aria-label="Figura ${ri + 1}: ${heads[keys.indexOf(k) + 1]}"><option value="">Elegí…</option>${ch.cols[k].map((v) => `<option value="${esc(v)}">${v}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}
      </tbody></table><p class="table-note">Elegí una opción en cada casillero y tocá «Comprobar».</p>`;
    const sels = $$('select', stage);
    sels.forEach((s) => s.addEventListener('change', () => { s.classList.remove('bad', 'ok'); const m = s.parentElement.querySelector('.cell-mark'); if (m) m.remove(); }));
    const markCell = (s, ok) => { s.classList.toggle('ok', ok); s.classList.toggle('bad', !ok); let m = s.parentElement.querySelector('.cell-mark'); if (!m) { m = document.createElement('span'); m.className = 'cell-mark'; s.parentElement.appendChild(m); } m.textContent = ok ? '✓' : '✗'; m.style.color = ok ? '#1E7A40' : '#C8414A'; s.setAttribute('aria-invalid', ok ? 'false' : 'true'); };
    const check = () => {
      if (sels.some((s) => !s.value)) { api.feedback('info', '👆', 'Completá todos los casilleros antes de comprobar.'); return; }
      let bad = 0;
      sels.forEach((s) => { const ok = s.value === ch.rows[+s.dataset.r].ans[s.dataset.k]; markCell(s, ok); if (!ok) bad++; });
      if (!bad) { sels.forEach((s) => { s.disabled = true; }); api.submit(true); return; }
      api.submit(false, {
        msg: bad === 1 ? 'Hay 1 casillero para revisar (✗).' : `Hay ${bad} casilleros para revisar (✗). Los que están bien quedan con ✓.`,
        reveal: () => sels.forEach((s) => { s.value = ch.rows[+s.dataset.r].ans[s.dataset.k]; markCell(s, true); s.disabled = true; })
      });
    };
    api.checkButton(check);
    api.test(() => { sels.forEach((s) => { s.value = ch.rows[+s.dataset.r].ans[s.dataset.k]; }); check(); },
             () => { sels.forEach((s) => { s.value = ch.cols[s.dataset.k].find((v) => v !== ch.rows[+s.dataset.r].ans[s.dataset.k]); }); check(); });
  };

  /* ----- Fábrica: espacio para mover, girar y ubicar piezas ----- */
  RENDER.build = function (ch, stage, api) {
    const W = 15, H = 9;
    const pieces = ch.pieces.map((kind, i) => ({ uid: i, kind, rot: 0, flip: false, x: 0, y: 0, on: false }));
    const target = ch.solution.map(solPoly);
    let selected = null, hintIdx = 0, ghosts = [];

    const gridLines = [];
    for (let x = 0; x <= W; x++) gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`);
    for (let y = 0; y <= H; y++) gridLines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`);
    const polyStr = (pts) => pts.map((p) => p.join(',')).join(' ');
    const targetSVG = target.map((p) => `<polygon points="${polyStr(p)}" fill="none" stroke="#1E2A4A" stroke-width=".14" stroke-linejoin="round" stroke-dasharray=".3 .18"/>`).join('') +
      target.map((p) => `<polygon points="${polyStr(p)}" fill="#E9E1D0" stroke="#E9E1D0" stroke-width=".06"/>`).join('');

    stage.innerHTML = `<div class="build-wrap">
      <div class="build-main">
      <div class="board-box" tabindex="0" id="boardBox" aria-label="Mesa de trabajo. Elegí una pieza y movela con las flechas del teclado; R gira, V voltea, Suprimir la devuelve a la caja.">
        <svg class="board" id="board" viewBox="-0.2 -0.2 ${W + 0.4} ${H + 0.4}">
          <rect x="0" y="0" width="${W}" height="${H}" fill="#FFFDF8"/>
          <rect x="9.6" y="0" width="${W - 9.6}" height="${H}" fill="#F4F9FF"/>
          <g stroke="#DCE8F3" stroke-width=".035">${gridLines.join('')}</g>
          <text x="${W - 0.25}" y="${H - 0.25}" text-anchor="end" font-size=".42" fill="#8AA3BC" font-family="sans-serif" font-weight="700">zona libre</text>
          <g id="target">${targetSVG}</g>
          <g id="ghosts"></g>
          <g id="pieces"></g>
        </svg>
      </div>
      <div class="tools" role="toolbar" aria-label="Herramientas para la pieza elegida">
        <button class="btn btn-violet" type="button" id="rotBtn" title="Girar (tecla R)">↻ Girar</button>
        <button class="btn btn-violet" type="button" id="flipBtn" title="Dar vuelta (tecla V)">⇋ Voltear</button>
        <span class="tools-sep" aria-hidden="true"></span>
        <button class="btn btn-light" type="button" data-mv="-1,0" aria-label="Mover a la izquierda">←</button>
        <button class="btn btn-light" type="button" data-mv="0,-1" aria-label="Mover arriba">↑</button>
        <button class="btn btn-light" type="button" data-mv="0,1" aria-label="Mover abajo">↓</button>
        <button class="btn btn-light" type="button" data-mv="1,0" aria-label="Mover a la derecha">→</button>
        <button class="btn btn-light" type="button" id="backBtn" title="Devolver a la caja">📦 A la caja</button>
      </div>
      </div>
      <div class="side-panel">
        <h3>Caja de piezas</h3>
        <div class="piece-tray tray" id="pieceTray"></div>
        <div class="sel-info" id="selInfo"></div>
      </div></div>`;

    const svg = $('#board', stage), gPieces = $('#pieces', stage), tray = $('#pieceTray', stage);
    const polyOf = (p) => transformPts(PIECES[p.kind].pts, p.rot, p.flip).map(([x, y]) => [x + p.x, y + p.y]);
    const sizeOf = (p) => bbox(transformPts(PIECES[p.kind].pts, p.rot, p.flip));
    const clamp = (p) => { const s = sizeOf(p); p.x = Math.max(0, Math.min(W - s.w, p.x)); p.y = Math.max(0, Math.min(H - s.h, p.y)); };

    function drawTray() {
      const off = pieces.filter((p) => !p.on);
      tray.innerHTML = off.length ? '' : '<span class="tray-empty-msg">La caja está vacía.</span>';
      off.forEach((p) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'tray-piece'; b.dataset.uid = p.uid;
        b.setAttribute('aria-label', 'Poner en la mesa: ' + PIECES[p.kind].name);
        b.innerHTML = pieceSVGThumb(p.kind);
        b.addEventListener('click', () => { if (b._justDragged) return; placeFromTray(p); });
        b.addEventListener('pointerdown', (e) => startTrayDrag(e, p, b));
        tray.appendChild(b);
      });
    }
    function drawPieces() {
      gPieces.innerHTML = pieces.filter((p) => p.on).map((p) => {
        const col = PIECES[p.kind].color;
        return `<polygon class="piece ${p.uid === selected ? 'sel' : ''}" data-uid="${p.uid}" points="${polyStr(polyOf(p))}" fill="${col}" fill-opacity=".9" stroke="${shade(col, -60)}" stroke-width=".07" stroke-linejoin="round"/>`;
      }).join('');
      // la pieza elegida se dibuja arriba de todo
      const s = gPieces.querySelector('.sel'); if (s) gPieces.appendChild(s);
      const info = $('#selInfo', stage);
      const sp = pieces.find((p) => p.uid === selected);
      info.textContent = sp ? `Elegiste: ${PIECES[sp.kind].name}. Arrastrala o usá los botones de abajo.` : 'Tocá una pieza de la caja para ponerla en la mesa.';
    }
    function redraw() { drawTray(); drawPieces(); }
    function spawn(p) {
      const s = sizeOf(p);
      const n = pieces.filter((q) => q.on).length;
      p.x = W - s.w - (n % 2); p.y = Math.min(H - s.h, (n * 2) % Math.max(1, H - s.h + 1));
      p.on = true;
    }
    function placeFromTray(p) { if (api.isDone()) return; spawn(p); selected = p.uid; redraw(); $('#boardBox', stage).focus({ preventScroll: true }); }

    function svgPoint(e) {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }
    let drag = null;
    function beginDrag(e, p, offset) {
      drag = { p, off: offset, id: e.pointerId };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const q = svgPoint(e);
      drag.p.x = Math.round(q.x - drag.off.x); drag.p.y = Math.round(q.y - drag.off.y);
      clamp(drag.p); drawPieces();
      drag.moved = true;
    }
    function onUp(e) {
      if (!drag) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const under = document.elementFromPoint(e.clientX, e.clientY);
      if (under && under.closest('#pieceTray')) { drag.p.on = false; if (selected === drag.p.uid) selected = null; }
      drag = null; redraw();
    }
    gPieces.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.piece'); if (!el || api.isDone()) return;
      e.preventDefault();
      const p = pieces[+el.dataset.uid];
      selected = p.uid;
      $('#boardBox', stage).focus({ preventScroll: true });
      const q = svgPoint(e);
      beginDrag(e, p, { x: q.x - p.x, y: q.y - p.y });
      drawPieces();
    });
    function startTrayDrag(e, p, btn) {
      if (api.isDone() || e.button !== 0) return;
      const sx = e.clientX, sy = e.clientY;
      const mv = (ev) => {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
        window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
        btn._justDragged = true; setTimeout(() => { btn._justDragged = false; }, 80);
        const s = sizeOf(p); p.on = true; selected = p.uid;
        const q = svgPoint(ev); p.x = Math.round(q.x - s.w / 2); p.y = Math.round(q.y - s.h / 2); clamp(p);
        redraw();
        beginDrag(ev, p, { x: s.w / 2, y: s.h / 2 });
      };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    }

    const sel = () => pieces.find((p) => p.uid === selected && p.on);
    function needSel() { const p = sel(); if (!p) api.feedback('info', '👆', 'Primero elegí una pieza de la mesa (tocala).'); return p; }
    function rotate() { const p = needSel(); if (!p || api.isDone()) return; const a = sizeOf(p); const cx = p.x + a.w / 2, cy = p.y + a.h / 2; p.rot = (p.rot + 1) % 4; const b = sizeOf(p); p.x = Math.round(cx - b.w / 2); p.y = Math.round(cy - b.h / 2); clamp(p); drawPieces(); }
    function flipP() { const p = needSel(); if (!p || api.isDone()) return; p.flip = !p.flip; drawPieces(); }
    function move(dx, dy) { const p = needSel(); if (!p || api.isDone()) return; p.x += dx; p.y += dy; clamp(p); drawPieces(); }
    function back() { const p = needSel(); if (!p || api.isDone()) return; p.on = false; selected = null; redraw(); }
    $('#rotBtn', stage).onclick = rotate;
    $('#flipBtn', stage).onclick = flipP;
    $('#backBtn', stage).onclick = back;
    $$('[data-mv]', stage).forEach((b) => { b.onclick = () => { const [dx, dy] = b.dataset.mv.split(',').map(Number); move(dx, dy); }; });
    $('#boardBox', stage).addEventListener('keydown', (e) => {
      const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (map[e.key]) { e.preventDefault(); move(...map[e.key]); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotate(); }
      else if (e.key === 'v' || e.key === 'V' || e.key === 'f' || e.key === 'F') { e.preventDefault(); flipP(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); back(); }
      else if (e.key === 'n' || e.key === 'N') { // cambiar de pieza con el teclado
        const on = pieces.filter((p) => p.on); if (!on.length) return;
        const k = on.findIndex((p) => p.uid === selected); selected = on[(k + 1) % on.length].uid; drawPieces();
      }
    });

    // Comprobación: se toman muestras de puntos y se compara el modelo con las piezas.
    function evaluate() {
      const on = pieces.filter((p) => p.on).map(polyOf);
      let uncovered = 0, overlap = 0, outside = 0, inside = 0;
      for (let i = 0; i < W * 4; i++) {
        for (let j = 0; j < H * 4; j++) {
          const x = 0.1 + i * 0.25, y = 0.17 + j * 0.25;
          const inT = target.some((t) => pointInPoly(x, y, t));
          const cnt = on.reduce((s, p) => s + (pointInPoly(x, y, p) ? 1 : 0), 0);
          if (inT) { inside++; if (cnt === 0) uncovered++; }
          if (cnt > 1) overlap++;
          if (!inT && cnt > 0) outside++;
        }
      }
      return { uncovered, overlap, outside, inside };
    }
    const check = () => {
      if (!pieces.some((p) => p.on)) { api.feedback('info', '👆', 'Poné piezas en la mesa para cubrir el modelo.'); return; }
      const r = evaluate();
      const tol = 2;
      if (r.uncovered <= tol && r.overlap <= tol && r.outside <= tol) { selected = null; ghosts = []; $('#ghosts', stage).innerHTML = ''; drawPieces(); api.submit(true); return; }
      let msg;
      if (r.overlap > tol) msg = 'Hay piezas encimadas.';
      else if (r.outside > tol) msg = 'Alguna pieza se sale del modelo. ¿Elegiste la pieza correcta?';
      else msg = 'Todavía queda una parte del modelo sin cubrir.';
      api.submit(false, { msg });
      if (api.wrongCount >= 3 && !$('#solBtn')) {
        api.setActions([{ label: '✔ Comprobar', cls: 'btn-green', onClick: check, id: 'checkBtn' }, { label: '👀 Ver cómo se arma', cls: 'btn-light', onClick: showSolution, id: 'solBtn' }]);
      }
    };
    function placeSolution() {
      pieces.forEach((p) => { p.on = false; });
      const used = new Set();
      ch.solution.forEach((s) => {
        const p = pieces.find((q) => q.kind === s.kind && !used.has(q.uid));
        used.add(p.uid);
        Object.assign(p, { rot: s.rot || 0, flip: !!s.flip, x: s.x, y: s.y, on: true });
      });
      selected = null; redraw();
    }
    function showSolution() { placeSolution(); cur.wrong = Math.max(cur.wrong, (cur.ch.maxTries || 99) - 1); api.submit(false, {}); }
    api.onHint(() => {
      const s = ch.solution[hintIdx % ch.solution.length];
      hintIdx++;
      const pts = solPoly(s), col = PIECES[s.kind].color;
      $('#ghosts', stage).innerHTML = `<polygon points="${polyStr(pts)}" fill="${col}" fill-opacity=".25" stroke="${shade(col, -40)}" stroke-width=".14" stroke-dasharray=".25 .15"><animate attributeName="fill-opacity" values=".1;.45;.1" dur="1.4s" repeatCount="3"/></polygon>`;
      api.feedback('info', '💡', `Mirá la sombra: ahí va un ${PIECES[s.kind].name}. ${ch.hint}`);
    });
    redraw();
    api.checkButton(check);
    cur.ch.maxTries = 99; cur.ch.okWithin = 3;
    api.test(() => { placeSolution(); check(); }, () => { pieces.forEach((p) => { p.on = false; }); spawn(pieces[0]); check(); });
  };

  /* ---------------------------------------------------------
     14. Resumen del nivel, cofres y desbloqueos
     --------------------------------------------------------- */
  function ringSVG(pct, color) {
    const r = 54, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return `<svg class="ring" viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="${r}" fill="none" stroke="#F1E8D6" stroke-width="16"/><circle cx="70" cy="70" r="${r}" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 70 70)"/><text x="70" y="80" text-anchor="middle" font-size="30" font-weight="900" fill="#1E2A4A" font-family="inherit">${pct}%</text></svg>`;
  }

  function skillBreakdown(results) {
    const by = {};
    results.forEach((r) => { if (!r) return; (by[r.skill] = by[r.skill] || { ok: 0, n: 0 }); by[r.skill].n++; if (r.correct) by[r.skill].ok++; });
    const good = [], more = [];
    Object.keys(by).forEach((k) => { (by[k].ok / by[k].n >= 0.7 ? good : more).push(SKILLS[k]); });
    return { good, more };
  }

  function renderSummary() {
    const run = state.run, lv = levelById(run.levelId), st = state.levels[lv.id];
    const total = lv.challenges.length;
    const ok = run.results.filter((r) => r && r.correct).length;
    const pct = Math.round((ok / total) * 100);
    const passed = pct >= 70;
    const wasCompleted = st.completed;
    const prevLast = st.last;
    st.plays++; st.last = pct; st.best = Math.max(st.best || 0, pct);
    let unlockedNow = null;
    if (passed) {
      st.completed = true;
      if (lv.badge) awardBadge(lv.badge);
      const idx = LEVELS.indexOf(lv);
      const nxt = LEVELS[idx + 1];
      if (nxt && !nxt.final && !state.levels[nxt.id].unlocked) { state.levels[nxt.id].unlocked = true; unlockedNow = nxt; }
      const allDone = LEVELS.filter((l) => !l.final).every((l) => state.levels[l.id].completed);
      const fin = LEVELS.find((l) => l.final);
      if (allDone && !state.levels[fin.id].unlocked) { state.levels[fin.id].unlocked = true; unlockedNow = fin; }
    }
    if (unlockedNow) state.justUnlocked = unlockedNow.id;

    const { good, more } = skillBreakdown(run.results);
    const starsGot = totalStars() - run.stars0, xpGot = state.xp - run.xp0;
    const newB = run.newBadges.map((id) => BADGES.find((b) => b.id === id));
    const chestsToOpen = state.chestsEarned - state.chestsOpened;
    const improved = prevLast !== null && pct > prevLast;
    state.run = null;

    let title, msg;
    if (passed) { title = lv.final ? '¡Completaste la gran expedición!' : '¡Misión cumplida!'; msg = unlockedNow ? `Se desbloqueó: <b>${unlockedNow.final ? 'el desafío final' : 'el nivel ' + unlockedNow.num}</b>.` : (wasCompleted ? '¡Volviste a practicar y lo hiciste genial!' : '¡Excelente trabajo!'); }
    else { title = '¡Buen trabajo, explorador!'; msg = 'Para abrir el próximo nivel necesitás 70 % de respuestas correctas. ¡Volvé a intentarlo: cada vez vas a descubrir más!'; }

    show(`
      <div class="sum-grid">
        <div class="panel">
          <div class="sum-big">${ringSVG(pct, passed ? '#2FA35A' : '#FFC23C')}
            <div><h1 class="sum-title">${title}</h1><p class="sum-msg">${msg}</p>
            <p class="sum-msg">Respondiste bien <b>${ok} de ${total}</b> desafíos.${improved ? ' 📈 ¡Mejoraste tu resultado!' : ''}</p></div></div>
          <div class="new-rewards" style="margin-top:12px">
            <span class="reward-chip">⭐ +${starsGot} estrellas</span>
            <span class="reward-chip">⚡ +${xpGot} puntos</span>
            ${newB.map((b) => `<span class="reward-chip">${b.icon} ${b.name}</span>`).join('')}
          </div>
          ${chestsToOpen > 0 ? `<div style="margin-top:14px;display:flex;align-items:center;gap:12px"><button class="btn btn-primary" id="openChest">🎁 Abrir cofre sorpresa (${chestsToOpen})</button></div>` : ''}
        </div>
        <div class="panel">
          <h2 style="margin:0">Lo que lograste</h2>
          <ul class="skill-list">${good.length ? good.map((g) => `<li class="good"><span class="s-ico" aria-hidden="true">✅</span> ${g}</li>`).join('') : '<li class="more">¡Seguí practicando y vas a lograrlo!</li>'}</ul>
          ${more.length ? `<h2 style="margin:12px 0 0">Para seguir practicando</h2><ul class="skill-list">${more.map((g) => `<li class="more"><span class="s-ico" aria-hidden="true">🔁</span> ${g}</li>`).join('')}</ul>` : ''}
        </div>
      </div>
      <div class="oral"><h3>💬 Para conversar con tus compañeros</h3><ul>${lv.oral.map((q) => `<li>${q}</li>`).join('')}</ul></div>
      <div class="btn-row">
        <button class="btn btn-light" id="sumMap">🗺️ Volver al mapa</button>
        <button class="btn btn-violet" id="sumRetry">↻ Practicar otra vez</button>
        ${unlockedNow ? `<button class="btn btn-primary" id="sumNext">${unlockedNow.final ? '👑 Ir al desafío final' : '➜ Ir al nivel ' + unlockedNow.num}</button>` : ''}
        ${lv.final && passed ? '<button class="btn btn-primary" id="sumReport">📋 Ver mi informe final</button>' : ''}
      </div>`, 'summary');

    if (passed) confetti(70);
    $('#sumMap').onclick = renderHome;
    $('#sumRetry').onclick = () => openLevel(lv.id);
    if ($('#sumNext')) $('#sumNext').onclick = () => openLevel(unlockedNow.id);
    if ($('#sumReport')) $('#sumReport').onclick = () => renderReport(true);
    if ($('#openChest')) $('#openChest').onclick = () => openChestFlow(() => renderSummaryRefreshChest());
    updateHeader();
  }
  function renderSummaryRefreshChest() {
    const b = $('#openChest');
    const left = state.chestsEarned - state.chestsOpened;
    if (!b) return;
    if (left > 0) b.textContent = `🎁 Abrir cofre sorpresa (${left})`;
    else b.parentElement.innerHTML = '<span class="reward-chip">🎁 ¡Abriste todos tus cofres! Miralos en el mapa.</span>';
  }

  function openChestFlow(done) {
    if (state.chestsOpened >= state.chestsEarned) { done && done(); return; }
    const chest = CHESTS[state.chestsOpened];
    openModal(`<h2 id="modalTitle">🎁 ¡Cofre sorpresa!</h2><p>Juntaste ${chest.at} estrellas. Tocá el cofre para abrirlo.</p>
      <button class="chest-big" id="chestBtn" aria-label="Abrir el cofre">${chestSVG(false)}</button><div id="chestOut"></div>`, (b) => {
      const btn = b.querySelector('#chestBtn');
      btn.onclick = () => {
        btn.classList.add('shake');
        btn.disabled = true;
        setTimeout(() => {
          state.chestsOpened++;
          btn.innerHTML = chestSVG(true);
          b.querySelector('#chestOut').innerHTML = `<div class="sticker">${shapeSVG(chest.sticker.shape)}</div><p><b>¡Conseguiste la figurita «${chest.sticker.name}»!</b></p><div class="btn-row"><button class="btn btn-primary" id="chestOk">¡Genial!</button></div>`;
          confetti(50);
          const okb = b.querySelector('#chestOk');
          okb.focus();
          okb.onclick = () => { closeModal(); done && done(); };
        }, reduceMotion ? 50 : 900);
      };
    });
  }

  /* ---------------------------------------------------------
     15. Informe de progreso (individual, sin comparaciones)
     --------------------------------------------------------- */
  function renderReport(isFinal) {
    const all = allChallenges();
    const done = all.filter((c) => state.log[c.id] && state.log[c.id].plays);
    const okNow = done.filter((c) => state.log[c.id].last).length;
    const pct = done.length ? Math.round((okNow / done.length) * 100) : 0;
    const bySkill = {};
    done.forEach((c) => { (bySkill[c.skill] = bySkill[c.skill] || { ok: 0, n: 0 }); bySkill[c.skill].n++; if (state.log[c.id].last) bySkill[c.skill].ok++; });
    const mastered = [], practice = [], pending = [];
    Object.keys(SKILLS).forEach((k) => {
      if (!bySkill[k]) pending.push(SKILLS[k]);
      else (bySkill[k].ok / bySkill[k].n >= 0.7 ? mastered : practice).push(`${SKILLS[k]} <small>(${bySkill[k].ok} de ${bySkill[k].n})</small>`);
    });
    const rows = LEVELS.map((l) => {
      const st = state.levels[l.id];
      const estado = st.completed ? '✅ Completado' : (st.unlocked ? (st.plays ? '🔁 En práctica' : '▶ Disponible') : '🔒 Bloqueado');
      const att = l.challenges.reduce((s, c) => s + (state.log[c.id] ? state.log[c.id].attempts : 0), 0);
      return `<tr><td>${l.icon} ${l.final ? 'Desafío final' : 'Nivel ' + l.num + ': ' + l.title}</td><td>${estado}</td><td>${st.best !== null ? st.best + ' %' : '—'}</td><td>${st.plays}</td><td>${att}</td><td>⭐ ${levelStars(l)}/${l.challenges.length * 3}</td></tr>`;
    }).join('');
    const completedLv = LEVELS.filter((l) => state.levels[l.id].completed).length;
    const today = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

    show(`
      <div class="panel" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">
        <div><h1>${isFinal ? '🏆 Informe final de la aventura' : '📋 Mi informe de progreso'}</h1><p style="margin:2px 0 0;color:#4A5677">Exploradores de Figuras · ${today}</p></div>
        <label class="nick">Explorador/a: <input type="text" maxlength="20" placeholder="Apodo (no se guarda)" aria-label="Apodo, no se guarda"></label>
      </div>
      <div class="rep-grid">
        <div class="rep-stat"><b>${pct} %</b><span>aciertos generales</span></div>
        <div class="rep-stat"><b>${completedLv} / ${LEVELS.length}</b><span>niveles completados</span></div>
        <div class="rep-stat"><b>${done.length} / ${all.length}</b><span>actividades realizadas</span></div>
        <div class="rep-stat"><b>${state.totals.attempts}</b><span>intentos (${state.totals.right} correctos · ${state.totals.wrong} para revisar)</span></div>
      </div>
      <div class="panel"><table class="rep-table"><thead><tr><th>Nivel</th><th>Estado</th><th>Mejor resultado</th><th>Veces jugado</th><th>Intentos</th><th>Estrellas</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="two-col">
        <div class="panel"><h2 style="margin:0">✅ Contenidos dominados</h2><ul class="skill-list">${mastered.length ? mastered.map((s) => `<li class="good">${s}</li>`).join('') : '<li class="more">Todavía no hay contenidos con 70 % o más. ¡A explorar!</li>'}</ul></div>
        <div class="panel"><h2 style="margin:0">🔁 Necesitan más práctica</h2><ul class="skill-list">${practice.length ? practice.map((s) => `<li class="more">${s}</li>`).join('') : '<li class="good">¡Nada por ahora!</li>'}</ul>
          ${pending.length ? `<p style="margin:10px 0 0;color:#4A5677;font-size:16px"><b>Todavía sin explorar:</b> ${pending.join(' · ')}</p>` : ''}</div>
      </div>
      <div class="panel"><h2 style="margin:0 0 8px">🏅 Insignias y recompensas</h2>
        <div class="badge-wall">${BADGES.map((b) => `<span class="badge-big ${state.badges.includes(b.id) ? '' : 'off'}"><span class="medal" aria-hidden="true">${b.icon}</span>${b.name}<span class="sr">${state.badges.includes(b.id) ? ' (obtenida)' : ' (todavía no)'}</span></span>`).join('')}</div>
        <p style="margin:10px 0 0">⭐ ${totalStars()} estrellas · ⚡ ${state.xp} puntos de experiencia · 🔥 mejor racha: ${state.bestStreak} · 🎁 cofres abiertos: ${state.chestsOpened} · 💡 pistas pedidas: ${state.hints}</p>
      </div>
      <div class="btn-row no-print">
        <button class="btn btn-light" id="repMap">🗺️ Volver al mapa</button>
        <button class="btn btn-violet" id="repPrint">🖨️ Imprimir informe</button>
      </div>
      <p class="note no-print" style="text-align:center">Este informe muestra solo tu propio progreso. No se guarda ni se comparte: si querés conservarlo, imprimilo o guardalo como PDF.</p>`, 'report');
    $('#repMap').onclick = renderHome;
    $('#repPrint').onclick = () => window.print();
    if (isFinal) confetti(60);
  }

  /* ---------------------------------------------------------
     16. Inicio, barra superior y reinicio
     --------------------------------------------------------- */
  $('#brandBtn').onclick = renderHome;
  $('#navMap').onclick = renderHome;
  $('#navReport').onclick = () => renderReport(false);
  $('#navReset').onclick = () => confirmModal('¿Reiniciar la aventura?', 'Se van a borrar todas las estrellas, insignias, cofres y niveles. ¿Querés empezar de nuevo?', 'Sí, reiniciar', () => {
    state = freshState();
    cur = null;
    updateHeader();
    renderHome();
    toast('↺ La aventura empezó de nuevo.');
  });

  // Aviso para no perder el progreso por cerrar la pestaña sin querer.
  window.addEventListener('beforeunload', (e) => {
    if (state.xp > 0) { e.preventDefault(); e.returnValue = ''; }
  });

  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
  updateHeader();
  renderHome();

  /* Ganchos de prueba (no se usan durante el juego) */
  window.__EF = {
    get state() { return state; }, LEVELS, PROPS,
    solve() { cur && cur.testSolve && cur.testSolve(); },
    fail() { cur && cur.testFail && cur.testFail(); },
    current() { return cur && { id: cur.ch.id, finished: cur.finished, wrong: cur.wrong }; },
    go: { home: renderHome, level: openLevel, report: renderReport }
  };
})();
