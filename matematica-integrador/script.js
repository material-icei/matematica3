/* =====================================================================
   LA GRAN AVENTURA MATEMÁTICA – El desafío de los cuatro reinos
   Integrador de Matemática · 3º grado
   ---------------------------------------------------------------------
   script.js: lógica del juego (JavaScript vanilla, sin dependencias).

   Índice
     1. Configuración
     2. Utilidades
     3. Ilustraciones (SVG generados por código)
     4. Banco de actividades (4 misiones × 6 desafíos)
     5. Componentes de actividad (dibujo + validación de cada tipo)
     6. Estado del juego y almacenamiento local
     7. Pantallas y navegación
     8. Cálculo de resultados
     9. Envío a Google Apps Script (cola sin conexión y reintentos)
    10. Informe final
    11. Panel docente
    12. Arranque
   ===================================================================== */
'use strict';

/* =====================================================================
   1. CONFIGURACIÓN
   Pegá en SCRIPT_URL la URL de la aplicación web de Google Apps Script
   (termina en /exec). Ver README.md, sección «Configurar Google Apps Script».
   ===================================================================== */
const CONFIG = Object.assign({
  SCRIPT_URL: '',                 // ← pegar aquí la URL /exec del Apps Script
  GRADOS: ['3º'],
  DIVISIONES: ['A', 'B'],
  REINTENTOS: 3,                  // reintentos automáticos por envío
  ESPERAS_MS: [2000, 5000, 10000],// espera antes de cada reintento
  TIEMPO_MAX_MS: 25000,           // tiempo máximo de espera de cada intento
  REPROGRAMAR_MS: 60000,          // si quedó pendiente, se vuelve a probar cada minuto
  MODO_PRUEBA: false,             // solo para pruebas automáticas (no activar en el aula)
  VERSION: '1.0.0'
}, window.AVENTURA_CONFIG || {});

/* =====================================================================
   2. UTILIDADES
   ===================================================================== */
const $ = (id) => document.getElementById(id);

/** Crea un elemento con clase y contenido HTML opcional. */
function crear(tag, clase, html) {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (html !== undefined) n.innerHTML = html;
  return n;
}
/** Escapa texto ingresado por el usuario antes de mostrarlo como HTML. */
function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
/** Quita etiquetas HTML para guardar textos legibles en la planilla. */
function sinHtml(h) {
  const d = document.createElement('div');
  d.innerHTML = h;
  return d.textContent.replace(/\s+/g, ' ').trim();
}
/** 3058 → «3.058» (separador de miles argentino). */
function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
/** «3.058», «3058» o «$ 3058» → 3058. Devuelve NaN si no es un número entero. */
function aNumero(s) {
  const limpio = String(s == null ? '' : s).trim().replace(/[.\s$]/g, '');
  return /^\d{1,6}$/.test(limpio) ? Number(limpio) : NaN;
}
function clonar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function iguales(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }
function idUnico() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
/** Segundos → «12:05» (minutos:segundos). */
function mmss(seg) {
  seg = Math.max(0, Math.round(seg || 0));
  return `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;
}
function minutosTexto(seg) {
  const m = Math.floor((seg || 0) / 60), s = Math.round(seg || 0) % 60;
  return m ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
}
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('ver');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('ver'), 2600);
}

/**
 * Arrastrar y soltar con eventos de puntero (funciona con mouse, touchpad y
 * pantalla táctil). Si el puntero casi no se mueve, se interpreta como toque.
 */
function arrastrable(nodo, { alTocar, alSoltar, alMover } = {}) {
  nodo.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    const x0 = ev.clientX, y0 = ev.clientY;
    let fantasma = null, ultimoDestino = null;
    const resaltar = (x, y) => {
      const d = destinoEn(x, y);
      if (d !== ultimoDestino) {
        if (ultimoDestino) ultimoDestino.classList.remove('sobre');
        if (d) d.classList.add('sobre');
        ultimoDestino = d;
      }
    };
    const mover = (e) => {
      if (!fantasma && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) {
        const r = nodo.getBoundingClientRect(), cs = getComputedStyle(nodo);
        fantasma = nodo.cloneNode(true);
        fantasma.classList.add('fantasma');
        Object.assign(fantasma.style, { width: r.width + 'px', height: r.height + 'px', fontSize: cs.fontSize, fontFamily: cs.fontFamily });
        document.body.appendChild(fantasma);
        nodo.classList.add('arrastrando');
      }
      if (fantasma) {
        fantasma.style.left = e.clientX + 'px';
        fantasma.style.top = e.clientY + 'px';
        if (alMover) alMover(e.clientX, e.clientY);
        resaltar(e.clientX, e.clientY);
      }
    };
    const fin = (e) => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', fin);
      window.removeEventListener('pointercancel', fin);
      if (ultimoDestino) ultimoDestino.classList.remove('sobre');
      if (fantasma) {
        fantasma.remove();
        nodo.classList.remove('arrastrando');
        if (alSoltar) alSoltar(e.type === 'pointercancel' ? null : document.elementFromPoint(e.clientX, e.clientY));
      } else if (e.type !== 'pointercancel' && alTocar) {
        alTocar();
      }
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', fin);
    window.addEventListener('pointercancel', fin);
  });
}
function destinoEn(x, y) {
  const el = document.elementFromPoint(x, y);
  return el ? el.closest('[data-destino]') : null;
}

/* =====================================================================
   3. ILUSTRACIONES (SVG)
   Todo se dibuja con código: no hay imágenes externas que puedan fallar.
   ===================================================================== */
const ILU = (() => {
  const TINTA = '#23264A';
  const S = (vb, inner, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${extra} aria-hidden="true" focusable="false">${inner}</svg>`;
  const pts = (arr) => arr.map((p) => p.join(',')).join(' ');
  function regular(n, r, cx, cy, rot) {
    return Array.from({ length: n }, (_, i) => {
      const a = (rot + 360 * i / n) * Math.PI / 180;
      return [(cx + r * Math.cos(a)).toFixed(1), (cy + r * Math.sin(a)).toFixed(1)];
    });
  }
  /** Sector circular (ángulos en grados desde las 12, sentido horario). */
  function sector(cx, cy, r, a1, a2) {
    const p = (a) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
    const [x1, y1] = p(a1), [x2, y2] = p(a2);
    return `M${cx} ${cy}L${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
  }

  /* ---- Figuras planas ---- */
  const COLOR_FIG = {
    cuadrado: '#FFD166', rectangulo: '#8EC5FF', triangulo: '#FF9AA2', trianguloRect: '#FFB38A',
    trianguloEsc: '#F7A8D8', rombo: '#B5EAD7', trapecio: '#C7B8FF', pentagono: '#9BE7FF',
    hexagono: '#FFE29A', circulo: '#A8E6A1'
  };
  function figura(nombre, color) {
    const st = `fill="${color || COLOR_FIG[nombre]}" stroke="${TINTA}" stroke-width="3" stroke-linejoin="round"`;
    const d = {
      cuadrado: `<rect x="20" y="20" width="60" height="60" ${st}/>`,
      rectangulo: `<rect x="6" y="31" width="88" height="38" ${st}/>`,
      triangulo: `<polygon points="50,14 90,84 10,84" ${st}/>`,
      trianguloRect: `<polygon points="18,16 18,84 86,84" ${st}/>`,
      trianguloEsc: `<polygon points="8,80 94,80 30,24" ${st}/>`,
      rombo: `<polygon points="50,6 80,50 50,94 20,50" ${st}/>`,
      trapecio: `<polygon points="30,26 70,26 93,76 7,76" ${st}/>`,
      pentagono: `<polygon points="${pts(regular(5, 41, 50, 54, -90))}" ${st}/>`,
      hexagono: `<polygon points="${pts(regular(6, 42, 50, 50, 0))}" ${st}/>`,
      circulo: `<circle cx="50" cy="50" r="38" ${st}/>`
    };
    return S('0 0 100 100', d[nombre]);
  }

  /* ---- Cuerpos geométricos (aristas ocultas en línea punteada) ---- */
  function cuerpo(nombre) {
    const c1 = '#BDEFE7', c2 = '#7FD6C8', c3 = '#4FB8A8';
    const cara = (p, f) => `<polygon points="${p}" fill="${f}" stroke="${TINTA}" stroke-width="2.6" stroke-linejoin="round"/>`;
    const oculta = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${TINTA}" stroke-width="2.2" stroke-dasharray="5 4" opacity=".75"/>`;
    let s = '';
    switch (nombre) {
      case 'cubo':
        s = cara('22,48 72,48 72,98 22,98', c2) + cara('22,48 46,24 96,24 72,48', c1) + cara('72,48 96,24 96,74 72,98', c3) +
          oculta(46, 24, 46, 74) + oculta(46, 74, 22, 98) + oculta(46, 74, 96, 74);
        break;
      case 'prismaRect':
        s = cara('10,58 80,58 80,102 10,102', c2) + cara('10,58 34,34 108,34 80,58', c1) + cara('80,58 108,34 108,78 80,102', c3) +
          oculta(34, 34, 34, 78) + oculta(34, 78, 10, 102) + oculta(34, 78, 108, 78);
        break;
      case 'prismaTri':
        // cara triangular del frente + cara lateral derecha; el vértice de atrás
        // abajo a la izquierda queda oculto (sus 3 aristas van punteadas)
        s = cara('12,102 66,102 39,52', c2) + cara('66,102 102,78 75,28 39,52', c3) +
          oculta(12, 102, 48, 78) + oculta(48, 78, 102, 78) + oculta(48, 78, 75, 28);
        break;
      case 'piramide':
        s = cara('58,12 14,98 76,98', c2) + cara('58,12 76,98 106,74', c3) +
          oculta(14, 98, 44, 74) + oculta(44, 74, 106, 74) + oculta(44, 74, 58, 12);
        break;
      case 'cilindro':
        s = `<path d="M26 28V94A34 10 0 0 0 94 94V28" fill="${c2}" stroke="${TINTA}" stroke-width="2.6"/>` +
          `<path d="M26 94A34 10 0 0 1 94 94" fill="none" stroke="${TINTA}" stroke-width="2.2" stroke-dasharray="5 4" opacity=".75"/>` +
          `<ellipse cx="60" cy="28" rx="34" ry="10" fill="${c1}" stroke="${TINTA}" stroke-width="2.6"/>`;
        break;
      case 'cono':
        s = `<path d="M24 96L60 12L96 96A36 10 0 0 1 24 96Z" fill="${c2}" stroke="${TINTA}" stroke-width="2.6" stroke-linejoin="round"/>` +
          `<path d="M24 96A36 10 0 0 1 96 96" fill="none" stroke="${TINTA}" stroke-width="2.2" stroke-dasharray="5 4" opacity=".75"/>`;
        break;
      case 'esfera':
        s = `<defs><radialGradient id="gEsf" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#E9FBF8"/><stop offset="1" stop-color="${c3}"/></radialGradient></defs>` +
          `<circle cx="60" cy="60" r="42" fill="url(#gEsf)" stroke="${TINTA}" stroke-width="2.6"/>` +
          `<path d="M18 60A42 12 0 0 0 102 60" fill="none" stroke="${TINTA}" stroke-width="2"/>` +
          `<path d="M18 60A42 12 0 0 1 102 60" fill="none" stroke="${TINTA}" stroke-width="2" stroke-dasharray="5 4" opacity=".6"/>`;
        break;
    }
    return S('0 0 120 120', s);
  }

  /* ---- Objetos de la vida cotidiana ---- */
  function objeto(nombre) {
    const t = `stroke="${TINTA}" stroke-width="2.6" stroke-linejoin="round"`;
    const o = {
      pelota: `<circle cx="60" cy="60" r="44" fill="#fff" ${t}/><polygon points="${pts(regular(5, 15, 60, 60, -90))}" fill="${TINTA}"/>` +
        regular(5, 15, 60, 60, -90).map((p, i) => { const q = regular(5, 40, 60, 60, -90)[i]; return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" ${t}/>`; }).join(''),
      dado: `<polygon points="22,48 72,48 72,98 22,98" fill="#fff" ${t}/><polygon points="22,48 46,24 96,24 72,48" fill="#F3F1FF" ${t}/><polygon points="72,48 96,24 96,74 72,98" fill="#E2DEFA" ${t}/>` +
        `<circle cx="34" cy="60" r="4.5" fill="#E04F5F"/><circle cx="47" cy="73" r="4.5" fill="#E04F5F"/><circle cx="60" cy="86" r="4.5" fill="#E04F5F"/><circle cx="59" cy="36" r="4" fill="${TINTA}"/><circle cx="84" cy="61" r="3.6" fill="${TINTA}"/><circle cx="84" cy="80" r="3.6" fill="${TINTA}"/><circle cx="84" cy="42" r="3.6" fill="${TINTA}"/>`,
      lata: `<path d="M30 26V96A30 9 0 0 0 90 96V26" fill="#E04F5F" ${t}/><rect x="30" y="46" width="60" height="30" fill="#fff"/><text x="60" y="66" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="12" fill="#E04F5F">TOMATE</text><path d="M30 26V96M90 26V96" ${t}/><ellipse cx="60" cy="26" rx="30" ry="9" fill="#D7D7E4" ${t}/>`,
      gorrito: `<path d="M26 98L60 18L94 98A34 9 0 0 1 26 98Z" fill="#6C5CE7" ${t}/><path d="M43 58L77 58M35 78L85 78" stroke="#FFD166" stroke-width="6"/><circle cx="60" cy="16" r="9" fill="#FFB703" ${t}/>`,
      caja: `<polygon points="14,40 70,40 70,108 14,108" fill="#FFB703" ${t}/><polygon points="14,40 36,22 92,22 70,40" fill="#FFD166" ${t}/><polygon points="70,40 92,22 92,90 70,108" fill="#E39A00" ${t}/><text x="42" y="70" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="11" fill="#fff">CEREAL</text><circle cx="42" cy="88" r="9" fill="#fff" opacity=".85"/>`,
      carpa: `<polygon points="10,100 64,100 37,44" fill="#3DBE6B" ${t}/><polygon points="64,100 104,76 77,20 37,44" fill="#2A9C55" ${t}/><polygon points="37,100 49,100 37,70 25,100" fill="#1E6E3C"/>`
    };
    return S('0 0 120 120', o[nombre]);
  }

  /* ---- Fracciones: figuras divididas en partes ---- */
  function partesForma(forma) {
    switch (forma) {
      case 'rect2': return ['M8 28H50V72H8Z', 'M50 28H92V72H50Z'];
      case 'rect4': return [0, 1, 2, 3].map((i) => `M${8 + 21 * i} 28H${29 + 21 * i}V72H${8 + 21 * i}Z`);
      case 'square4': return ['M14 14H50V50H14Z', 'M50 14H86V50H50Z', 'M14 50H50V86H14Z', 'M50 50H86V86H50Z'];
      case 'circle2': return [sector(50, 50, 40, 0, 180), sector(50, 50, 40, 180, 360)];
      case 'circle4': return [0, 90, 180, 270].map((a) => sector(50, 50, 40, a, a + 90));
    }
    return [];
  }
  /** Figura con partes pintadas (solo para mirar). */
  function fraccionPintada(forma, pintadas, color) {
    const partes = partesForma(forma).map((d, i) =>
      `<path d="${d}" fill="${pintadas.includes(i) ? color : '#fff'}" stroke="${TINTA}" stroke-width="2.6" stroke-linejoin="round"/>`).join('');
    return S('0 0 100 100', partes, 'class="fig-fraccion"');
  }
  /** Figura con líneas de corte (para decidir si las partes son iguales). */
  function partida(base, cortes) {
    const st = `fill="#FFE7B0" stroke="${TINTA}" stroke-width="2.8" stroke-linejoin="round"`;
    const contorno = {
      circulo: `<circle cx="50" cy="50" r="40" ${st}/>`,
      rect: `<rect x="8" y="26" width="84" height="48" ${st}/>`,
      cuadrado: `<rect x="14" y="14" width="72" height="72" ${st}/>`,
      triangulo: `<polygon points="50,12 90,86 10,86" ${st}/>`
    }[base];
    const lineas = cortes.map(([x1, y1, x2, y2]) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${TINTA}" stroke-width="2.6" stroke-linecap="round"/>`).join('');
    return S('0 0 100 100', contorno + lineas);
  }
  const radio = (a) => [+(50 + 40 * Math.sin(a * Math.PI / 180)).toFixed(1), +(50 - 40 * Math.cos(a * Math.PI / 180)).toFixed(1)];

  /* ---- Cristal (insignia de cada reino) ---- */
  function cristal(color, apagado) {
    const f = apagado ? '#DAD6EA' : color;
    return S('0 0 64 72',
      `<polygon points="32,2 60,24 48,70 16,70 4,24" fill="${f}"/>` +
      `<polygon points="32,2 44,24 32,70 20,24" fill="#fff" opacity=".28"/>` +
      `<polygon points="4,24 60,24 32,2" fill="#fff" opacity=".35"/>` +
      `<polygon points="44,24 60,24 48,70 32,70" fill="#000" opacity=".1"/>` +
      (apagado ? '' : `<circle cx="22" cy="18" r="3" fill="#fff" opacity=".9"/>`),
      `class="cristal"`);
  }

  /** Indicador circular de porcentaje para el informe. */
  function medidor(pct, color) {
    const r = 44, c = 2 * Math.PI * r, lleno = c * Math.max(0, Math.min(100, pct)) / 100;
    return S('0 0 110 110',
      `<circle cx="55" cy="55" r="${r}" fill="none" stroke="#ECE8F8" stroke-width="12"/>` +
      `<circle cx="55" cy="55" r="${r}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${lleno.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 55 55)"/>` +
      `<text x="55" y="61" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="24" fill="${TINTA}">${pct}%</text>` +
      `<text x="55" y="78" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="700" font-size="9" fill="#5A5E86">de aciertos</text>`,
      'class="gauge"');
  }

  return { figura, cuerpo, objeto, partesForma, fraccionPintada, partida, radio, cristal, medidor };
})();

/* =====================================================================
   4. BANCO DE ACTIVIDADES
   Basado en la planificación docente de 3º grado (numeración hasta el
   10.000, fracciones ½ y ¼, figuras y cuerpos, problemas con las cuatro
   operaciones). Cada desafío tiene ítems; cada ítem guarda su respuesta
   correcta para la corrección automática.
   ===================================================================== */
const EJES = {
  num: 'Numeración y Valor Posicional',
  frac: 'Fracciones',
  geo: 'Figuras y Cuerpos Geométricos',
  prob: 'Situaciones Problemáticas'
};

/** Fichas de operaciones para armar cálculos. */
const OPERACIONES = [
  { id: '+', html: '+', tipo: 'op' }, { id: '-', html: '−', tipo: 'op' },
  { id: 'x', html: '×', tipo: 'op' }, { id: ':', html: ':', tipo: 'op' }
];
/** Ítem «Armá el cálculo»: números del problema + operaciones. */
function itemCalculo(titulo, numeros, acepta) {
  return {
    tipo: 'casilleros', titulo, compacto: true,
    opciones: numeros.map((n) => ({ id: String(n), html: fmt(n), tipo: 'num' })).concat(OPERACIONES),
    filas: [{ html: '{num} {op} {num}', acepta: acepta.map((a) => a.map(String)) }]
  };
}
const figOpcion = (id, nombre) => ({ id, nombre, html: ILU.figura(id), tipo: 'fig' });
const cuerpoChip = (id, nombre, caja) => ({ id, nombre, html: ILU.cuerpo(id), caja });
const figChip = (id, nombre, caja) => ({ id, nombre, html: ILU.figura(id), caja });

const MISIONES = [
  /* ------------------------------------------------------------------
     MISIÓN 1 · EXPLORADORES DE NÚMEROS · Reino de los Números
     ------------------------------------------------------------------ */
  {
    id: 'M1', eje: 'num', reino: 'Reino de los Números', titulo: 'Exploradores de Números',
    color: '#6C5CE7', emblema: '123',
    relato: 'El primer cristal está escondido en el Reino de los Números. Sus puertas solo se abren para quienes saben leer, armar, ordenar y descubrir números de hasta 10.000.',
    lista: ['Descubrir números secretos', 'Leer y escribir números', 'Armar y desarmar números', 'Ordenar y completar series'],
    actividades: [
      {
        id: 'M1A1', titulo: 'El número secreto', contenido: 'Valor posicional: acertijos numéricos',
        consigna: 'Leé cada pista y escribí con cifras el número secreto.', layout: 'col-3',
        items: [
          { tipo: 'blanks', titulo: 'Pista 1', lineas: [
            { html: '<p class="texto-info">Tengo 4 cifras. Mis <b>miles</b> son 3, <b>no tengo cienes</b>, mis <b>dieces</b> son 5 y mis <b>unos</b> son 8.</p>' },
            { html: 'El número secreto es {n}', resp: [3058] }] },
          { tipo: 'blanks', titulo: 'Pista 2', lineas: [
            { html: '<p class="texto-info">Estoy justo después del <b>4.999</b>. Soy el primero de la familia del cinco mil.</p>' },
            { html: 'El número secreto es {n}', resp: [5000] }] },
          { tipo: 'blanks', titulo: 'Pista 3', lineas: [
            { html: '<p class="texto-info">Si junto <b>10 billetes de $100</b>, formo este número.</p>' },
            { html: 'El número secreto es {n}', resp: [1000] }] }
        ]
      },
      {
        id: 'M1A2', titulo: 'Leer y escribir números', contenido: 'Lectura y escritura de números',
        consigna: 'Armá el nombre de cada número tocando las tarjetas en orden. Después escribí con cifras los números que están en letras.', layout: 'col-2',
        items: [
          { tipo: 'palabras', titulo: 'Armá el nombre del <span class="numero-grande">3.580</span>',
            fichas: ['ochenta', 'tres mil', 'cincuenta', 'quinientos', 'trescientos', 'ocho'], sol: ['tres mil', 'quinientos', 'ochenta'] },
          { tipo: 'palabras', titulo: 'Armá el nombre del <span class="numero-grande">8.021</span>',
            fichas: ['veinte', 'ocho mil', 'doscientos', 'veintiuno', 'ochocientos', 'uno'], sol: ['ocho mil', 'veintiuno'] },
          { tipo: 'blanks', titulo: 'Escribí con cifras', ancho: true, lineas: [
            { html: '«seis mil cuatrocientos cincuenta y cinco» → {n}', resp: [6455] },
            { html: '«dos mil trescientos cuarenta» → {n}', resp: [2340] }] }
        ]
      },
      {
        id: 'M1A3', titulo: 'Armar y desarmar', contenido: 'Composición y descomposición de números',
        consigna: 'Armá el número con las tarjetas de 1.000, 100, 10 y 1. Después completá las sumas.', layout: 'col-2',
        items: [
          { tipo: 'tarjetas', titulo: 'Armá el número <span class="numero-grande">2.340</span> con tarjetas', objetivo: 2340, valores: [1000, 100, 10, 1], alto: true },
          { tipo: 'blanks', titulo: 'Desarmá el número', lineas: [
            { html: '4.684 = {n} + {n} + {n} + {n}', resp: [4000, 600, 80, 4], sinOrden: true }] },
          { tipo: 'blanks', titulo: 'Armá el número', lineas: [
            { html: '9.000 + 700 + 20 = {n}', resp: [9720] },
            { html: '7.000 + 200 + 60 + 9 = {n}', resp: [7269] }] }
        ]
      },
      {
        id: 'M1A4', titulo: 'El valor de cada cifra', contenido: 'Valor de cada cifra según su posición (unos, dieces, cienes y miles)',
        consigna: 'Mirá la cifra roja de cada número. Escribí cuánto vale y llevá a cada casillero el lugar que ocupa.', layout: 'col-2',
        items: [
          { tipo: 'blanks', titulo: '¿Cuánto vale la cifra roja?', lineas: [
            { html: '<span class="numero-grande"><b class="dest">4</b>.821</span> → vale {n}', resp: [4000] },
            { html: '<span class="numero-grande">8.1<b class="dest">4</b>2</span> → vale {n}', resp: [40] },
            { html: '<span class="numero-grande">6.<b class="dest">3</b>75</span> → vale {n}', resp: [300] },
            { html: '<span class="numero-grande">2.50<b class="dest">9</b></span> → vale {n}', resp: [9] }] },
          { tipo: 'casilleros', titulo: '¿En qué lugar está la cifra roja?',
            opciones: [
              { id: 'um', html: 'miles', tipo: 'lugar' }, { id: 'c', html: 'cienes', tipo: 'lugar' },
              { id: 'd', html: 'dieces', tipo: 'lugar' }, { id: 'u', html: 'unos', tipo: 'lugar' }],
            filas: [
              { html: '<span class="numero-grande"><b class="dest">4</b>.821</span> {lugar}', resp: ['um'] },
              { html: '<span class="numero-grande">8.1<b class="dest">4</b>2</span> {lugar}', resp: ['d'] },
              { html: '<span class="numero-grande">6.<b class="dest">3</b>75</span> {lugar}', resp: ['c'] },
              { html: '<span class="numero-grande">2.50<b class="dest">9</b></span> {lugar}', resp: ['u'] }] }
        ]
      },
      {
        id: 'M1A5', titulo: 'Ordenar números', contenido: 'Orden y comparación de números',
        consigna: 'Arrastrá las tarjetas para ordenarlas. También podés tocar dos tarjetas para cambiarlas de lugar.', layout: 'col-1',
        items: [
          { tipo: 'ordenar', titulo: 'Ordená de <b>menor a mayor</b>', guia: ['menor', 'mayor'],
            fichas: [{ id: 'a', t: '4.999' }, { id: 'b', t: '2.450' }, { id: 'c', t: '10.000' }, { id: 'd', t: '1.000' }, { id: 'e', t: '6.100' }, { id: 'f', t: '3.780' }],
            sol: ['d', 'b', 'f', 'a', 'e', 'c'] },
          { tipo: 'ordenar', titulo: 'Ordená de <b>mayor a menor</b>', guia: ['mayor', 'menor'],
            fichas: [{ id: 'a', t: '3.250' }, { id: 'b', t: '3.502' }, { id: 'c', t: '3.205' }, { id: 'd', t: '3.520' }, { id: 'e', t: '2.999' }],
            sol: ['d', 'b', 'a', 'c', 'e'] }
        ]
      },
      {
        id: 'M1A6', titulo: 'Series, anterior y posterior', contenido: 'Secuencias numéricas, anterior y posterior',
        consigna: 'Completá las series y escribí el número anterior y el posterior.', layout: 'col-2 col-ancha',
        items: [
          { tipo: 'blanks', titulo: 'Completá las series', lineas: [
            { html: '<small>De 100 en 100:</small> 3.700 · 3.800 · {n} · {n} · 4.100', resp: [3900, 4000] },
            { html: '<small>De 10 en 10:</small> 5.970 · 5.980 · {n} · {n} · 6.010', resp: [5990, 6000] },
            { html: '<small>De 1.000 en 1.000:</small> 6.000 · {n} · 8.000 · {n} · 10.000', resp: [7000, 9000] }] },
          { tipo: 'blanks', titulo: 'Anterior y posterior', lineas: [
            { html: '{n} ◀ <span class="numero-grande">7.000</span> ▶ {n}', resp: [6999, 7001] },
            { html: '{n} ◀ <span class="numero-grande">4.590</span> ▶ {n}', resp: [4589, 4591] },
            { html: '{n} ◀ <span class="numero-grande">9.999</span> ▶ {n}', resp: [9998, 10000] }] }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------
     MISIÓN 2 · EL LABORATORIO DE LAS FRACCIONES · Isla de las Fracciones
     ------------------------------------------------------------------ */
  {
    id: 'M2', eje: 'frac', reino: 'Isla de las Fracciones', titulo: 'El Laboratorio de las Fracciones',
    color: '#FF7A59', emblema: '½',
    relato: 'En la Isla de las Fracciones vive Anita, que cocina con medios y cuartos. El segundo cristal aparecerá cuando la ayudes a partir, pintar y armar enteros.',
    lista: ['Pintar medios y cuartos', 'Reconocer fracciones en imágenes', 'Partir en partes iguales', 'Armar enteros y comparar'],
    actividades: [
      {
        id: 'M2A1', titulo: 'Pintar fracciones', contenido: 'Representación gráfica de medios, cuartos y el entero',
        consigna: 'Tocá las partes para pintarlas. Si te equivocás, tocá otra vez para despintar.', layout: 'col-4',
        items: [
          { tipo: 'pintar', titulo: 'Pintá <b>½</b> del chocolate', forma: 'rect2', necesita: 1, color: '#8B5A3C' },
          { tipo: 'pintar', titulo: 'Pintá <b>¼</b> de la torta', forma: 'circle4', necesita: 1, color: '#FF8FA3' },
          { tipo: 'pintar', titulo: 'Pintá <b>½</b> de la pizza', forma: 'circle4', necesita: 2, color: '#FFB703' },
          { tipo: 'pintar', titulo: 'Pintá <b>el entero</b>', forma: 'square4', necesita: 4, color: '#12A89A' }
        ]
      },
      {
        id: 'M2A2', titulo: '¿Qué fracción es?', contenido: 'Identificación de la fracción representada en una imagen',
        consigna: 'Mirá la parte pintada de cada figura y escribí la fracción que representa (arriba las partes pintadas, abajo las partes del entero).', layout: 'col-4',
        items: [
          { tipo: 'blanks', titulo: 'Figura 1', centrado: true, lineas: [{ html: ILU.fraccionPintada('circle2', [0], '#FF7A59') }, { html: '{f}', resp: [[1, 2]] }] },
          { tipo: 'blanks', titulo: 'Figura 2', centrado: true, lineas: [{ html: ILU.fraccionPintada('rect4', [2], '#FF7A59') }, { html: '{f}', resp: [[1, 4]] }] },
          { tipo: 'blanks', titulo: 'Figura 3', centrado: true, lineas: [{ html: ILU.fraccionPintada('square4', [0, 1], '#FF7A59') }, { html: '{f}', resp: [[2, 4]] }] },
          { tipo: 'blanks', titulo: 'Figura 4', centrado: true, lineas: [{ html: ILU.fraccionPintada('circle4', [0, 1, 2, 3], '#FF7A59') }, { html: '{f}', resp: [[4, 4]] }] }
        ]
      },
      {
        id: 'M2A3', titulo: 'Partes iguales', contenido: 'División de un entero en partes iguales',
        consigna: 'Tocá solamente las figuras que cumplen lo pedido. Podés elegir varias. Para quitar una, tocala otra vez.', layout: 'col-1',
        items: [
          { tipo: 'elegirFiguras', titulo: '¿Cuáles están divididas en <b>cuartos</b> (4 partes iguales)?', figuras: [
            { id: 'q4', ok: false, svg: ILU.partida('rect', [[18.1, 26, 18.1, 74], [34.9, 26, 34.9, 74], [60.1, 26, 60.1, 74]]) },
            { id: 'q1', ok: true, svg: ILU.partida('circulo', [[50, 10, 50, 90], [10, 50, 90, 50]]) },
            { id: 'q6', ok: false, svg: ILU.partida('cuadrado', [[36, 14, 36, 86], [14, 64, 86, 64]]) },
            { id: 'q2', ok: true, svg: ILU.partida('rect', [[29, 26, 29, 74], [50, 26, 50, 74], [71, 26, 71, 74]]) },
            { id: 'q5', ok: false, svg: ILU.partida('circulo', [0, 70, 160, 250].map((a) => [50, 50, ...ILU.radio(a)])) },
            { id: 'q3', ok: true, svg: ILU.partida('cuadrado', [[50, 14, 50, 86], [14, 50, 86, 50]]) }] },
          { tipo: 'elegirFiguras', titulo: '¿Cuáles están divididas en <b>medios</b> (2 partes iguales)?', figuras: [
            { id: 'h1', ok: true, svg: ILU.partida('circulo', [[50, 10, 50, 90]]) },
            { id: 'h2', ok: false, svg: ILU.partida('rect', [[33.2, 26, 33.2, 74]]) },
            { id: 'h3', ok: true, svg: ILU.partida('cuadrado', [[14, 14, 86, 86]]) },
            { id: 'h5', ok: true, svg: ILU.partida('rect', [[50, 26, 50, 74]]) },
            { id: 'h4', ok: false, svg: ILU.partida('circulo', [[35, 12.9, 35, 87.1]]) },
            { id: 'h6', ok: false, svg: ILU.partida('triangulo', [[50, 12, 30, 86]]) }] }
        ]
      },
      {
        id: 'M2A4', titulo: 'Armar el entero', contenido: 'Relación entre medios, cuartos y el entero',
        consigna: 'Tocá las piezas de abajo para agregarlas al chocolate. Para sacar una pieza, tocala en el chocolate.', layout: 'col-2',
        items: [
          { tipo: 'entero', titulo: 'Mariana tiene una pieza de <b>½</b>. Agregá lo que le falta para formar <b>1 entero</b>.', fija: [2], piezas: [2, 1] },
          { tipo: 'entero', titulo: 'Formá <b>1 entero</b> usando solamente piezas de <b>¼</b>.', fija: [], piezas: [1], soloCuartos: true },
          { tipo: 'blanks', titulo: 'Pensá y respondé', ancho: true, lineas: [
            { html: '¿Cuántos cuartos (¼) forman medio entero (½)? {c}', resp: [2] },
            { html: 'José tiene tres piezas de ¼. ¿Cuántas piezas de ¼ le faltan para formar el entero? {c}', resp: [1] }] }
        ]
      },
      {
        id: 'M2A5', titulo: 'La cocina de Anita', contenido: 'Fracciones en situaciones cotidianas: capacidad, peso y tiempo',
        consigna: 'Ayudá a Anita a resolver lo que pasa en su cocina.', layout: 'col-3',
        items: [
          { tipo: 'blanks', titulo: 'Con una botella de <b>1 litro</b>, ¿cuántos vasos de <b>¼ litro</b> se llenan?', lineas: [{ html: '{c} vasos', resp: [4] }] },
          { tipo: 'blanks', titulo: 'Una botella de <b>500 ml</b>, ¿qué parte de 1 litro es?', lineas: [{ html: '{f} de litro', resp: [[1, 2]] }] },
          { tipo: 'blanks', titulo: 'Marina compró <b>½ kg</b> de papas y <b>½ kg</b> de tomates. ¿Cuántos kilos compró?', lineas: [{ html: '{c} kg', resp: [1] }] },
          { tipo: 'blanks', titulo: 'Una hora tiene 60 minutos.', lineas: [
            { html: '½ hora = {c} minutos', resp: [30] }, { html: '¼ de hora = {c} minutos', resp: [15] }] },
          { tipo: 'blanks', titulo: 'Empiezan a cocinar a las <b>11:00</b> y las verduras tardan <b>media hora</b>. ¿A qué hora terminan?', ancho2: true, lineas: [
            { html: 'A las {c} : {c}', resp: [11, 30] }] }
        ]
      },
      {
        id: 'M2A6', titulo: '¿Más, menos o igual que un entero?', contenido: 'Comparación y equivalencias entre medios, cuartos y el entero',
        consigna: 'Arrastrá cada tarjeta a la caja que corresponde (o tocala y después tocá la caja). Después ordená las botellas.', layout: 'col-1',
        items: [
          { tipo: 'clasificar', titulo: 'Si juntamos estas partes, ¿qué formamos?',
            cajas: [{ id: 'menos', t: 'Menos de 1 entero' }, { id: 'igual', t: '1 entero justo' }, { id: 'mas', t: 'Más de 1 entero' }],
            fichas: [
              { id: 'a', html: '½ + ¼', caja: 'menos' }, { id: 'b', html: '½ + ½', caja: 'igual' },
              { id: 'c', html: '¼ + ¼ + ¼', caja: 'menos' }, { id: 'd', html: '½ + ½ + ½', caja: 'mas' },
              { id: 'e', html: '¼ + ¼ + ¼ + ¼', caja: 'igual' }, { id: 'f', html: '½ + ¼ + ¼', caja: 'igual' },
              { id: 'g', html: '½ + ½ + ¼', caja: 'mas' }, { id: 'h', html: '¼', caja: 'menos' }] },
          { tipo: 'ordenar', titulo: 'Ordená las botellas de <b>menor a mayor</b> cantidad', guia: ['menor', 'mayor'],
            fichas: [{ id: 'a', t: '1 L' }, { id: 'b', t: '¼ L' }, { id: 'c', t: '½ L' }], sol: ['b', 'c', 'a'] }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------
     MISIÓN 3 · CONSTRUCTORES GEOMÉTRICOS · Ciudad Geométrica
     ------------------------------------------------------------------ */
  {
    id: 'M3', eje: 'geo', reino: 'Ciudad Geométrica', titulo: 'Constructores Geométricos',
    color: '#12A89A', emblema: '▲■',
    relato: 'La Ciudad Geométrica está hecha de figuras y cuerpos. Para encontrar el tercer cristal, tendrás que reconocerlos, contar sus lados y vértices y descubrirlos en los objetos de todos los días.',
    lista: ['Adivinar figuras', 'Contar lados y vértices', 'Clasificar figuras y completar guardas', 'Explorar cuerpos geométricos'],
    actividades: [
      {
        id: 'M3A1', titulo: 'Adiviná quién soy', contenido: 'Reconocimiento de figuras planas a partir de sus características',
        consigna: 'Leé cada adivinanza. Tocá el casillero y después la figura correcta (o arrastrá la figura al casillero).', layout: 'col-1',
        items: [
          { tipo: 'casilleros', titulo: 'Adivinanzas de figuras', dosColumnas: true,
            opciones: [figOpcion('cuadrado', 'cuadrado'), figOpcion('rombo', 'rombo'), figOpcion('rectangulo', 'rectángulo'),
              figOpcion('triangulo', 'triángulo'), figOpcion('trapecio', 'trapecio'), figOpcion('circulo', 'círculo'), figOpcion('pentagono', 'pentágono')],
            filas: [
              { html: '<p>Tengo 4 lados y 4 vértices. Dos de mis lados miden 8 cm y los otros dos miden 4 cm.</p>{fig}', resp: ['rectangulo'] },
              { html: '<p>Tengo 4 lados iguales y 4 ángulos rectos.</p>{fig}', resp: ['cuadrado'] },
              { html: '<p>Tengo 3 lados y 3 vértices. Mis lados miden 3 cm, 4 cm y 5 cm.</p>{fig}', resp: ['triangulo'] },
              { html: '<p>No tengo lados rectos ni vértices. Mi borde es curvo.</p>{fig}', resp: ['circulo'] },
              { html: '<p>Tengo 5 lados y 5 vértices.</p>{fig}', resp: ['pentagono'] }] }
        ]
      },
      {
        id: 'M3A2', titulo: 'Lados, vértices y diagonales', contenido: 'Identificación de lados, vértices y diagonales',
        consigna: 'Contá y completá la tabla. Después respondé sobre las diagonales.', layout: 'col-2',
        items: [
          { tipo: 'tabla', titulo: 'Completá la tabla', columnas: ['Lados', 'Vértices'], filas: [
            { etq: `<span class="fig">${ILU.figura('triangulo')} Triángulo</span>`, resp: [3, 3] },
            { etq: `<span class="fig">${ILU.figura('rectangulo')} Rectángulo</span>`, resp: [4, 4] },
            { etq: `<span class="fig">${ILU.figura('pentagono')} Pentágono</span>`, resp: [5, 5] },
            { etq: `<span class="fig">${ILU.figura('hexagono')} Hexágono</span>`, resp: [6, 6] },
            { etq: `<span class="fig">${ILU.figura('circulo')} Círculo</span>`, resp: [0, 0] }] },
          { tipo: 'blanks', titulo: 'Las diagonales', lineas: [
            { html: '<p class="texto-info">Una <b>diagonal</b> es un segmento que une dos vértices que <b>no</b> están uno al lado del otro.</p>' },
            { html: `<span class="mini-fig">${ILU.figura('cuadrado')}</span> ¿Cuántas diagonales tiene un cuadrado? {c}`, resp: [2] },
            { html: `<span class="mini-fig">${ILU.figura('triangulo')}</span> ¿Y en un triángulo? {c}`, resp: [0] }] }
        ]
      },
      {
        id: 'M3A3', titulo: 'Clasificar figuras y guardas', contenido: 'Clasificación de triángulos y cuadriláteros; patrones geométricos',
        consigna: 'Ubicá cada figura en su caja. Después completá la guarda con las figuras que siguen.', layout: 'col-1',
        items: [
          { tipo: 'clasificar', titulo: 'Clasificá las figuras', fichaFigura: true,
            cajas: [{ id: 'tri', t: 'Triángulos' }, { id: 'cua', t: 'Cuadriláteros' }, { id: 'otr', t: 'Otras figuras' }],
            fichas: [
              figChip('triangulo', 'triángulo', 'tri'), figChip('cuadrado', 'cuadrado', 'cua'), figChip('trianguloRect', 'triángulo rectángulo', 'tri'),
              figChip('rombo', 'rombo', 'cua'), figChip('circulo', 'círculo', 'otr'), figChip('rectangulo', 'rectángulo', 'cua'),
              figChip('pentagono', 'pentágono', 'otr'), figChip('trianguloEsc', 'triángulo de lados distintos', 'tri'),
              figChip('trapecio', 'trapecio', 'cua'), figChip('hexagono', 'hexágono', 'otr')] },
          { tipo: 'casilleros', titulo: 'Completá la guarda', compacto: true, enLinea: true,
            opciones: [figOpcion('triangulo', 'triángulo'), figOpcion('cuadrado', 'cuadrado'), figOpcion('circulo', 'círculo'), figOpcion('rombo', 'rombo')],
            filas: [{ html: `<span class="patron">${['triangulo', 'cuadrado', 'circulo', 'triangulo', 'cuadrado', 'circulo', 'triangulo'].map((f) => `<span class="fijo">${ILU.figura(f)}</span>`).join('')}</span>{fig}{fig}{fig}`,
              resp: ['cuadrado', 'circulo', 'triangulo'] }] }
        ]
      },
      {
        id: 'M3A4', titulo: '¿Figura plana o cuerpo?', contenido: 'Diferenciación entre figuras planas y cuerpos geométricos',
        consigna: 'Arrastrá cada dibujo a la caja que corresponde (o tocalo y después tocá la caja).', layout: 'col-1',
        items: [
          { tipo: 'clasificar', titulo: 'Las figuras planas son chatas; los cuerpos tienen volumen.', fichaFigura: true, grande: true,
            cajas: [{ id: 'plana', t: 'Figuras planas' }, { id: 'cuerpo', t: 'Cuerpos geométricos' }],
            fichas: [
              figChip('cuadrado', 'cuadrado', 'plana'), cuerpoChip('cubo', 'cubo', 'cuerpo'), figChip('circulo', 'círculo', 'plana'),
              cuerpoChip('esfera', 'esfera', 'cuerpo'), figChip('triangulo', 'triángulo', 'plana'), cuerpoChip('piramide', 'pirámide', 'cuerpo'),
              figChip('rectangulo', 'rectángulo', 'plana'), cuerpoChip('cilindro', 'cilindro', 'cuerpo'), cuerpoChip('cono', 'cono', 'cuerpo'),
              figChip('hexagono', 'hexágono', 'plana')] }
        ]
      },
      {
        id: 'M3A5', titulo: 'Cuerpos en la vida cotidiana', contenido: 'Asociación de cuerpos geométricos con objetos de la vida cotidiana',
        consigna: 'Tocá un objeto y después el nombre del cuerpo geométrico al que se parece. Se dibujará una línea.', layout: 'col-1',
        items: [
          { tipo: 'relacionar', titulo: 'Uní cada objeto con su cuerpo geométrico',
            izq: [
              { id: 'pelota', html: ILU.objeto('pelota') + 'Pelota', nombre: 'pelota' },
              { id: 'dado', html: ILU.objeto('dado') + 'Dado', nombre: 'dado' },
              { id: 'lata', html: ILU.objeto('lata') + 'Lata de tomates', nombre: 'lata' },
              { id: 'gorrito', html: ILU.objeto('gorrito') + 'Gorrito de cumpleaños', nombre: 'gorrito' },
              { id: 'caja', html: ILU.objeto('caja') + 'Caja de cereales', nombre: 'caja de cereales' },
              { id: 'carpa', html: ILU.objeto('carpa') + 'Carpa canadiense', nombre: 'carpa' }],
            der: [
              { id: 'cubo', html: 'Cubo' }, { id: 'cono', html: 'Cono' }, { id: 'prismaTri', html: 'Prisma de base triangular' },
              { id: 'esfera', html: 'Esfera' }, { id: 'cilindro', html: 'Cilindro' }, { id: 'prismaRect', html: 'Prisma de base rectangular' }],
            pares: { pelota: 'esfera', dado: 'cubo', lata: 'cilindro', gorrito: 'cono', caja: 'prismaRect', carpa: 'prismaTri' } }
        ]
      },
      {
        id: 'M3A6', titulo: 'Caras, aristas y vértices', contenido: 'Elementos de los cuerpos geométricos: caras, aristas y vértices',
        consigna: 'Observá cada cuerpo y contá. Las líneas punteadas son las aristas que quedan atrás y no se ven.', layout: 'col-2 col-ancha',
        items: [
          { tipo: 'tabla', titulo: 'Completá la tabla', cuerpos: true, columnas: ['Caras', 'Aristas', 'Vértices'], filas: [
            { etq: `<span class="fig">${ILU.cuerpo('cubo')} Cubo</span>`, resp: [6, 12, 8] },
            { etq: `<span class="fig">${ILU.cuerpo('piramide')} Pirámide de base cuadrada</span>`, resp: [5, 8, 5] },
            { etq: `<span class="fig">${ILU.cuerpo('prismaTri')} Prisma de base triangular</span>`, resp: [5, 9, 6] }] },
          { tipo: 'blanks', titulo: 'Cuerpos redondos', lineas: [
            { html: '<p class="texto-info"><b>Caras:</b> las superficies. <b>Aristas:</b> donde se juntan dos caras. <b>Vértices:</b> las puntas.</p>' },
            { html: `<span class="mini-fig">${ILU.cuerpo('esfera')}</span> La esfera tiene {c} vértices.`, resp: [0] },
            { html: `<span class="mini-fig">${ILU.cuerpo('cilindro')}</span> El cilindro tiene {c} caras planas.`, resp: [2] }] }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------
     MISIÓN 4 · DETECTIVES DE PROBLEMAS · Valle de los Problemas
     ------------------------------------------------------------------ */
  {
    id: 'M4', eje: 'prob', reino: 'Valle de los Problemas', titulo: 'Detectives de Problemas',
    color: '#2F86E8', emblema: '?',
    relato: 'El último cristal está en el Valle de los Problemas. Como buen detective, vas a leer con atención, encontrar los datos, elegir la operación y comprobar si tu respuesta tiene sentido.',
    lista: ['Encontrar los datos que sirven', 'Elegir la operación', 'Resolver con estrategias de cálculo', 'Interpretar el resultado'],
    actividades: [
      {
        id: 'M4A1', titulo: 'En el kiosco', contenido: 'Comprender los datos del problema y resolver una suma',
        consigna: 'Leé el problema, tocá los datos que necesitás, armá el cálculo y escribí la respuesta.', layout: 'col-2',
        items: [
          { tipo: 'tocarTexto', alto: true, titulo: 'Tocá los datos que necesitás para resolver',
            partes: ['Tomás tiene ', { id: 'x', t: '9' }, ' años. En el kiosco de la escuela compró un alfajor de ', { id: 'a', t: '$1.250' },
              ' y un jugo de ', { id: 'b', t: '$980' }, '. ¿Cuánto gastó en total?'], sol: ['a', 'b'] },
          itemCalculo('Armá el cálculo', [9, 1250, 980], [[1250, '+', 980], [980, '+', 1250]]),
          { tipo: 'blanks', titulo: 'Respondé', lineas: [{ html: 'Tomás gastó $ {n}', resp: [2230] }] }
        ]
      },
      {
        id: 'M4A2', titulo: 'La final del torneo', contenido: 'Identificar los datos y la pregunta; resolver una resta',
        consigna: 'Leé el problema, tocá las oraciones que tienen los datos necesarios, armá el cálculo y respondé.', layout: 'col-2',
        items: [
          { tipo: 'tocarTexto', alto: true, modo: 'oraciones', titulo: 'Tocá las oraciones con los datos que necesitás',
            partes: [{ id: 'o1', t: 'El domingo se jugó la final del torneo de fútbol del barrio.' }, ' ',
              { id: 'o2', t: 'En el estadio había 3.892 personas.' }, ' ',
              { id: 'o3', t: 'Al terminar el primer tiempo, se fueron 1.157 personas.' }, ' ',
              { id: 'o4', t: 'El equipo azul ganó 3 a 1.' }, ' ',
              { id: 'o5', t: '¿Cuántas personas se quedaron a ver el segundo tiempo?' }], sol: ['o2', 'o3'] },
          itemCalculo('Armá el cálculo', [3892, 1157, 3], [[3892, '-', 1157]]),
          { tipo: 'blanks', titulo: 'Respondé', lineas: [{ html: 'Se quedaron {n} personas.', resp: [2735] }] }
        ]
      },
      {
        id: 'M4A3', titulo: 'Útiles para el aula', contenido: 'Seleccionar la operación adecuada: multiplicación',
        consigna: 'Leé el problema, tocá los datos que necesitás, armá el cálculo y respondé.', layout: 'col-2',
        items: [
          { tipo: 'tocarTexto', alto: true, titulo: 'Tocá los datos que necesitás para resolver',
            partes: ['Para el aula de ', { id: 'g', t: '3º' }, ', la seño compró ', { id: 'a', t: '5' }, ' cajas de lápices. Cada caja trae ',
              { id: 'b', t: '12' }, ' lápices y cuesta ', { id: 'p', t: '$900' }, '. ¿Cuántos lápices compró en total?'], sol: ['a', 'b'] },
          itemCalculo('Armá el cálculo', [5, 12, 900], [[5, 'x', 12], [12, 'x', 5]]),
          { tipo: 'blanks', titulo: 'Respondé', lineas: [{ html: 'Compró {n} lápices.', resp: [60] }] }
        ]
      },
      {
        id: 'M4A4', titulo: 'El reparto de figuritas', contenido: 'Reparto en partes iguales: división y su relación con la multiplicación',
        consigna: 'Leé el problema, armá el cálculo, resolvelo y comprobá con una multiplicación.', layout: 'col-2',
        items: [
          { tipo: 'info', alto: true, titulo: 'El problema', html: '<p class="enunciado">Lucía tiene <b>48 figuritas</b> y las quiere repartir <b>en partes iguales</b> entre sus <b>4 amigos</b>, sin que le sobre ninguna.<br><br>¿Cuántas figuritas recibe cada amigo?</p>' },
          itemCalculo('Armá el cálculo', [48, 4], [[48, ':', 4]]),
          { tipo: 'blanks', titulo: 'Respondé y comprobá', lineas: [
            { html: 'Cada amigo recibe {n} figuritas.', resp: [12] },
            { html: 'Para comprobar: 4 × {n} = 48', resp: [12] }] }
        ]
      },
      {
        id: 'M4A5', titulo: 'Equipos para el torneo', contenido: 'Organización de grupos: división con resto e interpretación del resultado',
        consigna: 'Leé el problema con atención: tiene dos preguntas. Armá el cálculo y respondé las dos.', layout: 'col-2',
        items: [
          { tipo: 'info', alto: true, titulo: 'El problema', html: '<p class="enunciado">Para un torneo de fútbol se anotaron <b>33 chicos</b>. Cada equipo tiene que tener <b>5 jugadores</b>.<br><br>¿Cuántos equipos completos se pueden formar? ¿Cuántos chicos quedan sin equipo?</p>' },
          itemCalculo('Armá el cálculo', [33, 5], [[33, ':', 5]]),
          { tipo: 'blanks', titulo: 'Respondé', lineas: [
            { html: 'Se pueden formar {n} equipos completos.', resp: [6] },
            { html: 'Quedan {n} chicos sin equipo.', resp: [3] }] }
        ]
      },
      {
        id: 'M4A6', titulo: 'Las compras del supermercado', contenido: 'Problema de dos pasos (multiplicación y resta) en una situación familiar',
        consigna: 'Este problema se resuelve en dos pasos. Primero averiguá cuánto gastó y después cuánto le quedó.', layout: 'col-2',
        items: [
          { tipo: 'info', alto: true, titulo: 'El problema', html: '<p class="enunciado">Mamá fue al supermercado con <b>$5.000</b>. Compró <b>3 paquetes de fideos</b> que cuestan <b>$850</b> cada uno.<br><br>¿Cuánto dinero le quedó?</p>' },
          itemCalculo('Paso 1: armá el cálculo para saber cuánto gastó', [5000, 3, 850], [[3, 'x', 850], [850, 'x', 3]]),
          { tipo: 'blanks', titulo: 'Paso 2: respondé', lineas: [
            { html: 'Gastó $ {n}', resp: [2550] },
            { html: 'Le quedaron $ {n}', resp: [2450] }] }
        ]
      }
    ]
  }
];

/* =====================================================================
   5. COMPONENTES DE ACTIVIDAD
   Cada tipo de ítem define:
     vacio(item)              → respuesta inicial
     render(nodo, item, v, cb)→ dibuja y llama cb(nuevoValor) al cambiar
     completo(item, v)        → true si no quedan partes sin responder
     corregir(item, v)        → { ok, total } (partes correctas / totales)
     describir(item, v)       → texto de la respuesta del alumno
     solucion(item)           → texto de la respuesta correcta
     resolver(item)           → respuesta correcta (para pruebas y banco)
   ===================================================================== */
const SIN_RESP = '(sin responder)';

/** Campo numérico grande, apto para chicos (acepta «3.058» o «3058»). */
function campoNumero(valor, alCambiar, corto) {
  const i = document.createElement('input');
  i.type = 'text';
  i.inputMode = 'numeric';
  i.maxLength = 6;
  i.autocomplete = 'off';
  i.className = 'in-num' + (corto ? ' corto' : '') + (valor ? ' lleno' : '');
  i.value = valor || '';
  i.setAttribute('aria-label', 'Escribí un número');
  i.addEventListener('input', () => {
    const limpio = i.value.replace(/[^\d.]/g, '');
    if (limpio !== i.value) i.value = limpio;
    i.classList.toggle('lleno', !!i.value);
    alCambiar(i.value);
  });
  i.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const todos = [...document.querySelectorAll('#act-area .in-num')];
      const sig = todos[todos.indexOf(i) + 1];
      if (sig) sig.focus(); else i.blur();
    }
  });
  return i;
}
const fracTexto = (f) => (f && (f[0] !== '' || f[1] !== '')) ? `${f[0] || '?'}/${f[1] || '?'}` : '___';
function fracEquivale(v, r) {
  const n = aNumero(v[0]), d = aNumero(v[1]);
  return !isNaN(n) && !isNaN(d) && d > 0 && n * r[1] === r[0] * d;
}
const TOKEN = /(\{[nfc]\})/;

const COMP = {
  /* ---------- Completar espacios (números y fracciones) ---------- */
  blanks: {
    campos(ln) { return (ln.html.match(/\{[nfc]\}/g) || []); },
    vacio(it) { return it.lineas.map((ln) => this.campos(ln).map((t) => (t === '{f}' ? ['', ''] : ''))); },
    render(nodo, it, v, cb) {
      v = clonar(v);
      if (it.centrado) nodo.classList.add('centrado');
      it.lineas.forEach((ln, li) => {
        const fila = crear('div', 'linea');
        let k = 0;
        ln.html.split(TOKEN).forEach((trozo) => {
          if (!TOKEN.test(trozo)) { if (trozo) fila.insertAdjacentHTML('beforeend', trozo); return; }
          const idx = k++;
          if (trozo === '{f}') {
            const caja = crear('span', 'fr-input');
            const arriba = campoNumero(v[li][idx][0], (x) => { v[li][idx][0] = x; cb(clonar(v)); }, true);
            const abajo = campoNumero(v[li][idx][1], (x) => { v[li][idx][1] = x; cb(clonar(v)); }, true);
            arriba.setAttribute('aria-label', 'Numerador'); abajo.setAttribute('aria-label', 'Denominador');
            caja.append(arriba, crear('i'), abajo);
            fila.append(caja);
          } else {
            fila.append(campoNumero(v[li][idx], (x) => { v[li][idx] = x; cb(clonar(v)); }, trozo === '{c}'));
          }
        });
        nodo.append(fila);
      });
    },
    completo(it, v) { return v.every((l) => l.every((x) => (Array.isArray(x) ? x[0] !== '' && x[1] !== '' : x !== ''))); },
    corregir(it, v) {
      let ok = 0, total = 0;
      it.lineas.forEach((ln, li) => {
        const resp = ln.resp || [];
        total += resp.length;
        if (ln.sinOrden) {
          const pendientes = resp.slice();
          v[li].forEach((x) => { const p = pendientes.indexOf(aNumero(x)); if (p >= 0) { pendientes.splice(p, 1); ok++; } });
        } else {
          resp.forEach((r, k) => { if (Array.isArray(r) ? fracEquivale(v[li][k], r) : aNumero(v[li][k]) === r) ok++; });
        }
      });
      return { ok, total };
    },
    texto(it, valores) {
      return it.lineas.map((ln, li) => {
        if (!this.campos(ln).length) return null;
        let k = 0;
        const t = ln.html.replace(/\{[nfc]\}/g, () => {
          const x = valores[li][k++];
          return Array.isArray(x) ? fracTexto(x) : (x === '' || x == null ? '___' : String(x));
        });
        return sinHtml(t);
      }).filter(Boolean).join(' / ');
    },
    describir(it, v) { return this.texto(it, v); },
    solucion(it) {
      return this.texto(it, it.lineas.map((ln) => (ln.resp || []).map((r) => (Array.isArray(r) ? r.map(String) : fmt(r))))) +
        (it.lineas.some((l) => (l.resp || []).some(Array.isArray)) ? ' (o una fracción equivalente)' : '') +
        (it.lineas.some((l) => l.sinOrden) ? ' (en cualquier orden)' : '');
    },
    resolver(it) { return it.lineas.map((ln) => (ln.resp || []).map((r) => (Array.isArray(r) ? r.map(String) : String(r)))); }
  },

  /* ---------- Tabla para completar ---------- */
  tabla: {
    vacio(it) { return it.filas.map((f) => f.resp.map(() => '')); },
    render(nodo, it, v, cb) {
      v = clonar(v);
      const t = crear('table', 'tabla' + (it.cuerpos ? ' cuerpos' : ''));
      t.innerHTML = `<thead><tr><th></th>${it.columnas.map((c) => `<th>${c}</th>`).join('')}</tr></thead>`;
      const tb = crear('tbody');
      it.filas.forEach((f, fi) => {
        const tr = crear('tr');
        tr.append(crear('td', 'etq', f.etq));
        f.resp.forEach((_, ci) => {
          const td = crear('td');
          td.append(campoNumero(v[fi][ci], (x) => { v[fi][ci] = x; cb(clonar(v)); }, true));
          tr.append(td);
        });
        tb.append(tr);
      });
      t.append(tb);
      nodo.append(t);
    },
    completo(it, v) { return v.every((f) => f.every((x) => x !== '')); },
    corregir(it, v) {
      let ok = 0, total = 0;
      it.filas.forEach((f, fi) => f.resp.forEach((r, ci) => { total++; if (aNumero(v[fi][ci]) === r) ok++; }));
      return { ok, total };
    },
    texto(it, m) { return it.filas.map((f, fi) => `${sinHtml(f.etq)}: ${it.columnas.map((c, ci) => `${c.toLowerCase()} ${m[fi][ci] === '' ? '___' : m[fi][ci]}`).join(', ')}`).join(' / '); },
    describir(it, v) { return this.texto(it, v); },
    solucion(it) { return this.texto(it, it.filas.map((f) => f.resp)); },
    resolver(it) { return it.filas.map((f) => f.resp.map(String)); }
  },

  /* ---------- Armar el nombre de un número con tarjetas de palabras ---------- */
  palabras: {
    vacio() { return []; },
    render(nodo, it, v, cb) {
      let elegidas = clonar(v);
      const armado = crear('div', 'armado');
      armado.dataset.vacio = 'Tocá las tarjetas para armar el nombre';
      const pozo = crear('div', 'fichas');
      const dibujar = () => {
        armado.innerHTML = ''; pozo.innerHTML = '';
        elegidas.forEach((ix, pos) => {
          const b = crear('button', 'ficha', esc(it.fichas[ix]));
          b.type = 'button';
          b.title = 'Tocá para quitar';
          b.onclick = () => { elegidas.splice(pos, 1); cb(clonar(elegidas)); dibujar(); };
          armado.append(b);
        });
        it.fichas.forEach((f, ix) => {
          const b = crear('button', 'ficha' + (elegidas.includes(ix) ? ' usada' : ''), esc(f));
          b.type = 'button';
          b.disabled = elegidas.includes(ix);
          b.onclick = () => { elegidas.push(ix); cb(clonar(elegidas)); dibujar(); };
          pozo.append(b);
        });
      };
      dibujar();
      nodo.append(armado, pozo);
    },
    completo(it, v) { return v.length > 0; },
    corregir(it, v) { return { ok: v.map((i) => it.fichas[i]).join(' ') === it.sol.join(' ') ? 1 : 0, total: 1 }; },
    describir(it, v) { return v.length ? v.map((i) => it.fichas[i]).join(' ') : SIN_RESP; },
    solucion(it) { return it.sol.join(' '); },
    resolver(it) { return it.sol.map((s) => it.fichas.indexOf(s)); }
  },

  /* ---------- Armar un número con tarjetas de 1.000, 100, 10 y 1 ---------- */
  tarjetas: {
    vacio() { return []; },
    render(nodo, it, v, cb) {
      let mesa = clonar(v);
      const pozo = crear('div', 'fichas');
      const zona = crear('div', 'armado mesa');
      zona.dataset.vacio = 'Tocá o arrastrá las tarjetas hasta aquí';
      zona.dataset.destino = 'mesa';
      const agregar = (val) => { if (mesa.length < 40) { mesa.push(val); cb(clonar(mesa)); dibujar(); } };
      it.valores.forEach((val) => {
        const b = crear('button', `ficha tarjeta-valor tv-${val}`, fmt(val));
        b.type = 'button';
        arrastrable(b, { alTocar: () => agregar(val), alSoltar: (d) => { if (d && d.closest('.mesa') === zona) agregar(val); } });
        pozo.append(b);
      });
      const dibujar = () => {
        zona.innerHTML = '';
        mesa.slice().sort((a, b) => b - a).forEach((val) => {
          const b = crear('button', `ficha tarjeta-valor tv-${val}`, fmt(val));
          b.type = 'button';
          b.title = 'Tocá para quitar';
          b.onclick = () => { mesa.splice(mesa.indexOf(val), 1); cb(clonar(mesa)); dibujar(); };
          zona.append(b);
        });
      };
      dibujar();
      nodo.append(crear('p', 'texto-info', 'Tarjetas disponibles:'), pozo, crear('p', 'texto-info', 'Tu mesa:'), zona);
    },
    completo(it, v) { return v.length > 0; },
    corregir(it, v) { return { ok: v.reduce((a, b) => a + b, 0) === it.objetivo ? 1 : 0, total: 1 }; },
    contar(lista) {
      return [1000, 100, 10, 1].map((val) => [val, lista.filter((x) => x === val).length]).filter(([, n]) => n)
        .map(([val, n]) => `${n} de ${fmt(val)}`).join(', ');
    },
    describir(it, v) { return v.length ? `${this.contar(v)} (forma ${fmt(v.reduce((a, b) => a + b, 0))})` : SIN_RESP; },
    solucion(it) { return `Tarjetas que sumen ${fmt(it.objetivo)} (por ejemplo: ${this.contar(this.resolver(it))})`; },
    resolver(it) {
      const r = []; let resto = it.objetivo;
      it.valores.forEach((val) => { while (resto >= val) { r.push(val); resto -= val; } });
      return r;
    }
  },

  /* ---------- Ordenar tarjetas arrastrándolas ---------- */
  ordenar: {
    vacio() { return null; },
    render(nodo, it, v, cb) {
      let orden = v ? clonar(v) : it.fichas.map((f) => f.id);
      let sel = null;
      const guia = crear('div', 'ordenar-guia', `<span>◀ ${it.guia[0]}</span><span>${it.guia[1]} ▶</span>`);
      const fila = crear('div', 'ordenar');
      const leer = () => [...fila.children].map((c) => c.dataset.id);
      const confirmar = () => { orden = leer(); cb(clonar(orden)); };
      const dibujar = () => {
        fila.innerHTML = '';
        orden.forEach((id) => {
          const f = it.fichas.find((x) => x.id === id);
          const b = crear('button', 'ficha' + (sel === id ? ' sel' : ''), esc(f.t));
          b.type = 'button';
          b.dataset.id = id;
          arrastrable(b, {
            alMover: (x) => {
              const otros = [...fila.children].filter((c) => c !== b);
              const sig = otros.find((c) => { const r = c.getBoundingClientRect(); return x < r.left + r.width / 2; });
              if (sig) fila.insertBefore(b, sig); else fila.append(b);
            },
            alSoltar: () => { sel = null; confirmar(); dibujar(); },
            alTocar: () => {
              if (sel === null) { sel = id; }
              else if (sel === id) { sel = null; }
              else { const i = orden.indexOf(sel), j = orden.indexOf(id); [orden[i], orden[j]] = [orden[j], orden[i]]; sel = null; cb(clonar(orden)); }
              dibujar();
            }
          });
          fila.append(b);
        });
      };
      dibujar();
      nodo.append(guia, fila);
    },
    completo(it, v) { return v !== null; },
    corregir(it, v) { return { ok: iguales(v || it.fichas.map((f) => f.id), it.sol) ? 1 : 0, total: 1 }; },
    texto(it, ids) { return ids.map((id) => it.fichas.find((f) => f.id === id).t).join(' → '); },
    describir(it, v) { return v ? this.texto(it, v) : `${SIN_RESP}: ${this.texto(it, it.fichas.map((f) => f.id))}`; },
    solucion(it) { return this.texto(it, it.sol); },
    resolver(it) { return it.sol.slice(); }
  },

  /* ---------- Clasificar en cajas ---------- */
  clasificar: {
    vacio() { return {}; },
    render(nodo, it, v, cb) {
      let ubic = clonar(v);
      let sel = null;
      const cont = crear('div', 'clasificar');
      const pozo = crear('div', 'pozo fichas');
      pozo.dataset.destino = '';
      const cajas = crear('div', 'cajas');
      cajas.style.gridTemplateColumns = `repeat(${it.cajas.length}, 1fr)`;
      const mover = (idFicha, idCaja) => {
        if (idCaja) ubic[idFicha] = idCaja; else delete ubic[idFicha];
        sel = null; cb(clonar(ubic)); dibujar();
      };
      const nodosCaja = {};
      it.cajas.forEach((c) => {
        const caja = crear('div', 'caja', `<div class="caja-titulo">${c.t}</div>`);
        caja.dataset.destino = c.id;
        const dentro = crear('div', 'fichas');
        caja.append(dentro);
        caja.addEventListener('click', (e) => { if (!e.target.closest('.ficha') && sel) mover(sel, c.id); });
        nodosCaja[c.id] = dentro;
        cajas.append(caja);
      });
      pozo.addEventListener('click', (e) => { if (!e.target.closest('.ficha') && sel) mover(sel, null); });
      const dibujar = () => {
        pozo.innerHTML = '';
        Object.values(nodosCaja).forEach((n) => { n.innerHTML = ''; });
        cajas.querySelectorAll('.caja').forEach((c) => c.classList.toggle('destino', !!sel));
        it.fichas.forEach((f) => {
          const b = crear('button', 'ficha' + (it.fichaFigura ? ' fig' : '') + (it.grande ? ' grande' : '') + (sel === f.id ? ' sel' : ''), f.html);
          b.type = 'button';
          if (f.nombre) b.setAttribute('aria-label', f.nombre);
          arrastrable(b, {
            alTocar: () => { sel = sel === f.id ? null : f.id; dibujar(); },
            alSoltar: (d) => {
              const destino = d && d.closest('[data-destino]');
              if (destino && destino.closest('.clasificar') === cont) mover(f.id, destino.dataset.destino || null);
            }
          });
          (ubic[f.id] ? nodosCaja[ubic[f.id]] : pozo).append(b);
        });
      };
      dibujar();
      cont.append(pozo, cajas);
      nodo.append(cont);
    },
    completo(it, v) { return it.fichas.every((f) => v[f.id]); },
    corregir(it, v) { return { ok: it.fichas.filter((f) => v[f.id] === f.caja).length, total: it.fichas.length }; },
    texto(it, m) {
      return it.cajas.map((c) => `${c.t}: ${it.fichas.filter((f) => m[f.id] === c.id).map((f) => f.nombre || sinHtml(f.html)).join(', ') || '—'}`).join(' / ');
    },
    describir(it, v) {
      const sinUbicar = it.fichas.filter((f) => !v[f.id]).map((f) => f.nombre || sinHtml(f.html));
      return this.texto(it, v) + (sinUbicar.length ? ` / Sin ubicar: ${sinUbicar.join(', ')}` : '');
    },
    solucion(it) { return this.texto(it, this.resolver(it)); },
    resolver(it) { const m = {}; it.fichas.forEach((f) => { m[f.id] = f.caja; }); return m; }
  },

  /* ---------- Relacionar columnas con líneas ---------- */
  relacionar: {
    COLORES: ['#6C5CE7', '#FF7A59', '#12A89A', '#2F86E8', '#E0A100', '#D6457A'],
    vacio() { return {}; },
    render(nodo, it, v, cb) {
      let pares = clonar(v);
      let sel = null; // { lado: 'izq' | 'der', id }
      const cont = crear('div', 'relacionar');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'lineas');
      const colI = crear('div', 'rel-col izq'), colD = crear('div', 'rel-col der');
      const botones = { izq: {}, der: {} };
      const color = (idIzq) => this.COLORES[it.izq.findIndex((x) => x.id === idIzq) % this.COLORES.length];
      const unir = (idIzq, idDer) => {
        Object.keys(pares).forEach((k) => { if (pares[k] === idDer) delete pares[k]; });
        pares[idIzq] = idDer;
        sel = null; cb(clonar(pares)); dibujar();
      };
      const tocar = (lado, id) => {
        if (sel && sel.lado !== lado) { lado === 'der' ? unir(sel.id, id) : unir(id, sel.id); return; }
        if (lado === 'izq' && pares[id] && !(sel && sel.id === id)) { delete pares[id]; cb(clonar(pares)); }
        sel = (sel && sel.id === id && sel.lado === lado) ? null : { lado, id };
        dibujar();
      };
      it.izq.forEach((o) => {
        const b = crear('button', 'rel-op', o.html + '<span class="punto"></span>');
        b.type = 'button';
        b.onclick = () => tocar('izq', o.id);
        botones.izq[o.id] = b; colI.append(b);
      });
      it.der.forEach((o) => {
        const b = crear('button', 'rel-op', '<span class="punto"></span>' + o.html);
        b.type = 'button';
        b.onclick = () => tocar('der', o.id);
        botones.der[o.id] = b; colD.append(b);
      });
      const lineas = () => {
        const base = cont.getBoundingClientRect();
        svg.innerHTML = '';
        Object.entries(pares).forEach(([i, d]) => {
          const a = botones.izq[i].querySelector('.punto').getBoundingClientRect();
          const b = botones.der[d].querySelector('.punto').getBoundingClientRect();
          const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          l.setAttribute('x1', a.left + a.width / 2 - base.left); l.setAttribute('y1', a.top + a.height / 2 - base.top);
          l.setAttribute('x2', b.left + b.width / 2 - base.left); l.setAttribute('y2', b.top + b.height / 2 - base.top);
          l.setAttribute('stroke', color(i)); l.setAttribute('stroke-width', '4'); l.setAttribute('stroke-linecap', 'round');
          svg.append(l);
        });
      };
      const dibujar = () => {
        const unidosDer = {};
        Object.entries(pares).forEach(([i, d]) => { unidosDer[d] = i; });
        Object.entries(botones.izq).forEach(([id, b]) => {
          b.classList.toggle('unido', !!pares[id]); b.classList.toggle('sel', !!sel && sel.lado === 'izq' && sel.id === id);
          b.style.setProperty('--c', color(id));
        });
        Object.entries(botones.der).forEach(([id, b]) => {
          b.classList.toggle('unido', !!unidosDer[id]); b.classList.toggle('sel', !!sel && sel.lado === 'der' && sel.id === id);
          if (unidosDer[id]) b.style.setProperty('--c', color(unidosDer[id]));
        });
        requestAnimationFrame(lineas);
      };
      cont.append(svg, colI, colD);
      nodo.append(cont);
      if (window.ResizeObserver) new ResizeObserver(() => lineas()).observe(cont);
      dibujar();
    },
    completo(it, v) { return it.izq.every((o) => v[o.id]); },
    corregir(it, v) { return { ok: it.izq.filter((o) => v[o.id] === it.pares[o.id]).length, total: it.izq.length }; },
    texto(it, m) { return it.izq.map((o) => `${o.nombre || o.id} → ${m[o.id] ? sinHtml(it.der.find((d) => d.id === m[o.id]).html) : '___'}`).join(' / '); },
    describir(it, v) { return this.texto(it, v); },
    solucion(it) { return this.texto(it, it.pares); },
    resolver(it) { return clonar(it.pares); }
  },

  /* ---------- Casilleros: adivinanzas, guardas y armado de cálculos ---------- */
  casilleros: {
    TOKEN: /(\{(?:num|op|fig|lugar)\})/,
    tipos(fila) { return (fila.html.match(/\{(num|op|fig|lugar)\}/g) || []).map((t) => t.slice(1, -1)); },
    vacio(it) { return it.filas.map((f) => this.tipos(f).map(() => '')); },
    render(nodo, it, v, cb) {
      let val = clonar(v);
      let activo = null; // [fila, posición]
      const opcion = (id) => it.opciones.find((o) => o.id === id);
      const tipos = it.filas.map((f) => this.tipos(f));
      const primeroVacio = (tipo) => {
        for (let f = 0; f < val.length; f++) for (let k = 0; k < val[f].length; k++) {
          if (val[f][k] === '' && (!tipo || tipos[f][k] === tipo)) return [f, k];
        }
        return null;
      };
      const poner = (f, k, id) => { val[f][k] = id; activo = primeroVacio(); cb(clonar(val)); dibujar(); };
      const filas = crear('div', 'filas-casilleros' + (it.dosColumnas ? ' dos-columnas' : ''));
      if (it.enLinea) nodo.classList.add('en-linea');
      const galeria = crear('div', 'fichas galeria');
      const dibujar = () => {
        filas.innerHTML = '';
        it.filas.forEach((fila, f) => {
          const linea = crear('div', it.compacto ? 'fila-casillero compacta' : 'fila-casillero');
          let k = 0;
          fila.html.split(this.TOKEN).forEach((trozo) => {
            if (!this.TOKEN.test(trozo)) { if (trozo.trim()) linea.insertAdjacentHTML('beforeend', trozo); return; }
            const pos = k++;
            const tipo = tipos[f][pos];
            const id = val[f][pos];
            const esActivo = activo && activo[0] === f && activo[1] === pos;
            const c = crear('button', `casillero ${tipo}${id ? ' lleno' : ''}${esActivo ? ' activo' : ''}`, id ? opcion(id).html : '?');
            c.type = 'button';
            c.dataset.destino = `${f}-${pos}`;
            c.setAttribute('aria-label', id ? 'Casillero completo, tocá para vaciarlo' : 'Casillero vacío');
            c.onclick = () => { if (val[f][pos]) { val[f][pos] = ''; cb(clonar(val)); } activo = [f, pos]; dibujar(); };
            linea.append(c);
          });
          filas.append(linea);
        });
      };
      it.opciones.forEach((o) => {
        const b = crear('button', 'ficha' + (o.tipo === 'fig' ? ' fig' : '') + (o.tipo === 'lugar' ? ' lugar' : ''), o.html);
        b.type = 'button';
        if (o.nombre) b.setAttribute('aria-label', o.nombre);
        arrastrable(b, {
          alTocar: () => {
            const destino = (activo && tipos[activo[0]][activo[1]] === o.tipo) ? activo : primeroVacio(o.tipo);
            if (destino) poner(destino[0], destino[1], o.id);
          },
          alSoltar: (d) => {
            const c = d && d.closest('.casillero');
            if (!c || !filas.contains(c)) return;
            const [f, k] = c.dataset.destino.split('-').map(Number);
            if (tipos[f][k] === o.tipo) poner(f, k, o.id);
          }
        });
        galeria.append(b);
      });
      activo = primeroVacio();
      dibujar();
      nodo.append(filas, galeria);
    },
    completo(it, v) { return v.every((f) => f.every((x) => x !== '')); },
    corregir(it, v) {
      let ok = 0, total = 0;
      it.filas.forEach((fila, f) => {
        if (fila.acepta) { total++; if (fila.acepta.some((a) => iguales(a, v[f]))) ok++; }
        else fila.resp.forEach((r, k) => { total++; if (v[f][k] === r) ok++; });
      });
      return { ok, total };
    },
    nombre(it, id) { const o = it.opciones.find((x) => x.id === id); return o ? (o.nombre || sinHtml(o.html)) : '___'; },
    describir(it, v) { return v.map((f) => f.map((id) => (id ? this.nombre(it, id) : '___')).join(' ')).join(' / '); },
    solucion(it) { return it.filas.map((f) => (f.acepta ? f.acepta.map((a) => a.map((id) => this.nombre(it, id)).join(' ')).join(' o ') : f.resp.map((id) => this.nombre(it, id)).join(' '))).join(' / '); },
    resolver(it) { return it.filas.map((f) => (f.acepta ? f.acepta[0].slice() : f.resp.slice())); }
  },

  /* ---------- Tocar datos u oraciones de un texto ---------- */
  tocarTexto: {
    vacio() { return []; },
    render(nodo, it, v, cb) {
      let marcados = clonar(v);
      const p = crear('p', it.modo === 'oraciones' ? 'enunciado texto-problema' : 'enunciado texto-problema');
      it.partes.forEach((parte) => {
        if (typeof parte === 'string') { p.append(document.createTextNode(parte)); return; }
        const b = crear('button', 'toque' + (it.modo === 'oraciones' ? ' oracion' : '') + (marcados.includes(parte.id) ? ' sel' : ''), esc(parte.t));
        b.type = 'button';
        b.setAttribute('aria-pressed', marcados.includes(parte.id));
        b.onclick = () => {
          marcados = marcados.includes(parte.id) ? marcados.filter((x) => x !== parte.id) : marcados.concat(parte.id);
          b.classList.toggle('sel'); b.setAttribute('aria-pressed', marcados.includes(parte.id));
          cb(clonar(marcados));
        };
        p.append(b);
      });
      nodo.append(p);
    },
    completo(it, v) { return v.length > 0; },
    corregir(it, v) { return { ok: iguales(v.slice().sort(), it.sol.slice().sort()) ? 1 : 0, total: 1 }; },
    texto(it, ids) { return it.partes.filter((x) => typeof x !== 'string' && ids.includes(x.id)).map((x) => `«${x.t}»`).join(', '); },
    describir(it, v) { return v.length ? 'Marcó: ' + this.texto(it, v) : SIN_RESP; },
    solucion(it) { return 'Marcar: ' + this.texto(it, it.sol); },
    resolver(it) { return it.sol.slice(); }
  },

  /* ---------- Pintar partes de una figura ---------- */
  pintar: {
    vacio() { return []; },
    render(nodo, it, v, cb) {
      let pintadas = clonar(v);
      const caja = crear('div', 'pintar');
      const partes = ILU.partesForma(it.forma);
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('role', 'group');
      const pista = crear('p', 'pista');
      const actualizar = () => { pista.textContent = `Partes pintadas: ${pintadas.length} de ${partes.length}`; };
      partes.forEach((d, i) => {
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', d);
        p.setAttribute('class', 'parte');
        p.setAttribute('stroke', '#23264A'); p.setAttribute('stroke-width', '2.6'); p.setAttribute('stroke-linejoin', 'round');
        p.setAttribute('fill', pintadas.includes(i) ? it.color : '#fff');
        p.addEventListener('click', () => {
          pintadas = pintadas.includes(i) ? pintadas.filter((x) => x !== i) : pintadas.concat(i).sort();
          p.setAttribute('fill', pintadas.includes(i) ? it.color : '#fff');
          actualizar(); cb(clonar(pintadas));
        });
        svg.append(p);
      });
      actualizar();
      caja.append(svg, pista);
      nodo.append(caja);
    },
    completo(it, v) { return v.length > 0; },
    corregir(it, v) { return { ok: v.length === it.necesita ? 1 : 0, total: 1 }; },
    describir(it, v) { return v.length ? `Pintó ${v.length} de ${ILU.partesForma(it.forma).length} partes` : SIN_RESP; },
    solucion(it) { return `Pintar ${it.necesita} de ${ILU.partesForma(it.forma).length} partes`; },
    resolver(it) { return Array.from({ length: it.necesita }, (_, i) => i); }
  },

  /* ---------- Seleccionar figuras de una imagen ---------- */
  elegirFiguras: {
    vacio() { return []; },
    render(nodo, it, v, cb) {
      let elegidas = clonar(v);
      const grilla = crear('div', 'figuras-grilla');
      it.figuras.forEach((f, i) => {
        const b = crear('button', 'fig-op' + (elegidas.includes(f.id) ? ' sel' : ''), f.svg);
        b.type = 'button';
        b.setAttribute('aria-label', `Figura ${i + 1}`);
        b.setAttribute('aria-pressed', elegidas.includes(f.id));
        b.onclick = () => {
          elegidas = elegidas.includes(f.id) ? elegidas.filter((x) => x !== f.id) : elegidas.concat(f.id);
          b.classList.toggle('sel'); b.setAttribute('aria-pressed', elegidas.includes(f.id));
          cb(clonar(elegidas));
        };
        grilla.append(b);
      });
      nodo.append(grilla);
    },
    completo(it, v) { return v.length > 0; },
    /* Puntaje: aciertos menos elecciones incorrectas (nunca negativo).
       Así, tocar todas las figuras no suma puntos. */
    corregir(it, v) {
      const correctas = it.figuras.filter((f) => f.ok).map((f) => f.id);
      const aciertos = v.filter((id) => correctas.includes(id)).length;
      const errores = v.length - aciertos;
      return { ok: Math.max(0, aciertos - errores), total: correctas.length };
    },
    texto(it, ids) { return it.figuras.map((f, i) => (ids.includes(f.id) ? i + 1 : null)).filter(Boolean).join(', '); },
    describir(it, v) { return v.length ? `Eligió las figuras ${this.texto(it, v)}` : SIN_RESP; },
    solucion(it) { return `Figuras ${this.texto(it, it.figuras.filter((f) => f.ok).map((f) => f.id))}`; },
    resolver(it) { return it.figuras.filter((f) => f.ok).map((f) => f.id); }
  },

  /* ---------- Armar un entero con piezas de ½ y ¼ (en cuartos) ---------- */
  entero: {
    NOMBRE: { 1: '¼', 2: '½' },
    vacio() { return []; },
    render(nodo, it, v, cb) {
      let agregadas = clonar(v);
      const caja = crear('div', 'armar-entero');
      const marco = crear('div', 'entero-marco', '<div class="entero-guia"></div>');
      const piezas = crear('div', 'entero-piezas');
      marco.append(piezas);
      const paleta = crear('div', 'paleta-piezas');
      const dibujar = () => {
        piezas.innerHTML = '';
        let acumulado = 0;
        it.fija.concat(agregadas).forEach((q, i) => {
          const fija = i < it.fija.length;
          acumulado += q;
          const p = crear('button', 'pieza' + (fija ? ' fija' : '') + (acumulado > 4 ? ' excede' : ''), this.NOMBRE[q]);
          p.type = 'button';
          p.style.width = `${q * 25}%`;
          p.setAttribute('aria-label', fija ? `Pieza de ${this.NOMBRE[q]} (ya estaba)` : `Pieza de ${this.NOMBRE[q]}, tocá para sacarla`);
          if (!fija) p.onclick = () => { agregadas.splice(i - it.fija.length, 1); cb(clonar(agregadas)); dibujar(); };
          piezas.append(p);
        });
      };
      it.piezas.forEach((q) => {
        const b = crear('button', 'ficha', `pieza de ${this.NOMBRE[q]}`);
        b.type = 'button';
        b.onclick = () => {
          const total = it.fija.concat(agregadas).reduce((a, x) => a + x, 0);
          if (total + q <= 6) { agregadas.push(q); cb(clonar(agregadas)); dibujar(); }
        };
        paleta.append(b);
      });
      dibujar();
      caja.append(marco, paleta);
      nodo.append(caja);
    },
    completo(it, v) { return v.length > 0; },
    corregir(it, v) {
      const total = it.fija.concat(v).reduce((a, x) => a + x, 0);
      return { ok: total === 4 && (!it.soloCuartos || v.every((q) => q === 1)) ? 1 : 0, total: 1 };
    },
    describir(it, v) {
      if (!v.length) return SIN_RESP;
      const total = it.fija.concat(v).reduce((a, x) => a + x, 0);
      return `${it.fija.map((q) => this.NOMBRE[q] + ' (dada)').concat(v.map((q) => this.NOMBRE[q])).join(' + ')} = ${total}/4`;
    },
    solucion(it) { return it.soloCuartos ? '¼ + ¼ + ¼ + ¼ = 1 entero' : '½ (dada) + ½, o ½ (dada) + ¼ + ¼ = 1 entero'; },
    resolver(it) { return it.soloCuartos ? [1, 1, 1, 1] : [2]; }
  },

  /* ---------- Texto informativo (no se corrige) ---------- */
  info: {
    vacio() { return null; },
    render(nodo, it) { nodo.insertAdjacentHTML('beforeend', it.html); },
    completo() { return true; },
    corregir() { return { ok: 0, total: 0 }; },
    describir() { return ''; },
    solucion() { return ''; },
    resolver() { return null; }
  }
};

/* =====================================================================
   6. ESTADO DEL JUEGO Y ALMACENAMIENTO LOCAL
   El progreso se guarda en el navegador para no perder nada si se cierra
   la pestaña o se corta Internet.
   ===================================================================== */
const CLAVES = {
  estado: 'aventura3_estado_v1',
  pendientes: 'aventura3_pendientes_v1',
  enviados: 'aventura3_enviados_v1'
};
const Almacen = {
  leer(clave, porDefecto) {
    try { const t = localStorage.getItem(clave); return t ? JSON.parse(t) : porDefecto; } catch (e) { return porDefecto; }
  },
  escribir(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); return true; } catch (e) { return false; }
  },
  borrar(clave) { try { localStorage.removeItem(clave); } catch (e) { /* sin acceso */ } }
};

let E = null;               // estado de la sesión actual
let pantallaActual = 's-inicio';

function nuevoEstado(alumno) {
  return {
    version: CONFIG.VERSION,
    sesion: idUnico(),
    alumno,
    inicio: new Date().toISOString(),
    segundos: 0,
    fase: 'jugando',          // jugando → revision → enviado
    misiones: [false, false, false, false],
    pos: { m: 0, a: 0 },
    resp: {}
  };
}
function guardar() { if (E) Almacen.escribir(CLAVES.estado, E); }
const guardarPronto = (() => { let t; return () => { clearTimeout(t); t = setTimeout(guardar, 300); }; })();

function vacioActividad(A) { return A.items.map((it) => COMP[it.tipo].vacio(it)); }
/** Respuesta guardada de un desafío (la crea vacía si no existe). */
function respuestaDe(A) {
  if (!E.resp[A.id]) E.resp[A.id] = { v: vacioActividad(A), intentos: 0, tiempo: 0, confirmada: null };
  return E.resp[A.id];
}
function actividadCompleta(A) {
  const r = E.resp[A.id];
  return !!r && A.items.every((it, i) => COMP[it.tipo].completo(it, r.v[i]));
}
function actividadTocada(A, r) { return !iguales(r.v, vacioActividad(A)); }
/**
 * Se cuenta un intento cada vez que el alumno deja un desafío con una
 * respuesta distinta de la última confirmada (la primera vez, y cada cambio
 * posterior durante la revisión).
 */
function confirmarRespuesta(A) {
  const r = respuestaDe(A);
  const actual = JSON.stringify(r.v);
  if (actividadTocada(A, r) && actual !== r.confirmada) { r.intentos++; r.confirmada = actual; }
  guardar();
}

/* =====================================================================
   7. PANTALLAS Y NAVEGACIÓN
   ===================================================================== */
function mostrar(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('activa', s.id === id));
  pantallaActual = id;
  const actual = $(id);
  if (actual) actual.scrollTop = 0;
}
function colorMision(M) { $('stage').style.setProperty('--m', M ? M.color : '#6C5CE7'); }
function cristalesMini(nodo) {
  nodo.innerHTML = MISIONES.map((M, i) => ILU.cristal(M.color, !(E && E.misiones[i]))).join('');
  nodo.setAttribute('aria-label', `Cristales obtenidos: ${E ? E.misiones.filter(Boolean).length : 0} de 4`);
}
function cursoTexto(al) { return `${al.grado} ${al.division}`; }

/* ---------- Pantalla de inicio ---------- */
function pantallaInicio() {
  colorMision(null);
  $('hero-cristales').innerHTML = MISIONES.map((M, i) => {
    const pos = [['6%', '62%'], ['78%', '18%'], ['84%', '64%'], ['10%', '20%']][i];
    return `<div style="left:${pos[0]};top:${pos[1]};animation-delay:-${i}s;position:absolute">${ILU.cristal(M.color, false)}</div>`;
  }).join('');
  $('hero-cristales').querySelectorAll('.cristal').forEach((c) => { c.style.width = '4.6rem'; });

  const guardado = Almacen.leer(CLAVES.estado, null);
  const reanudar = $('reanudar');
  reanudar.hidden = true;
  $('error-inicio').textContent = '';
  pantallaInicio.confirmarBorrado = false;
  if (guardado && guardado.alumno && guardado.version) {
    reanudar.hidden = false;
    if (guardado.fase === 'enviado') {
      reanudar.innerHTML = `La aventura de <b>${esc(guardado.alumno.nombre)}</b> ya terminó.<br>
        <button type="button" class="btn btn-secundario" id="btn-ver-informe">Ver su informe</button>`;
      $('btn-ver-informe').onclick = () => { E = guardado; pantallaInformeFinal(); };
    } else {
      reanudar.innerHTML = `Hay una aventura sin terminar de <b>${esc(guardado.alumno.nombre)}</b> (${esc(cursoTexto(guardado.alumno))}).<br>
        <button type="button" class="btn btn-primario" id="btn-continuar">Continuar la aventura</button>`;
      $('btn-continuar').onclick = () => { E = guardado; continuarAventura(); };
    }
  }
  actualizarAvisoPendientes();
  mostrar('s-inicio');
}
function actualizarAvisoPendientes() {
  const n = Envio.pendientes().length;
  const p = $('pendientes-inicio');
  p.hidden = n === 0;
  p.textContent = n ? `⏳ Hay ${n} resultado${n > 1 ? 's' : ''} guardado${n > 1 ? 's' : ''} en esta computadora esperando para enviarse a la planilla.` : '';
}
function comenzar(ev) {
  ev.preventDefault();
  const nombre = $('in-nombre').value.replace(/\s+/g, ' ').trim();
  const grado = $('in-grado').value, division = $('in-division').value;
  const err = $('error-inicio');
  if (nombre.split(' ').filter((p) => p.length >= 2).length < 2) { err.textContent = 'Escribí tu nombre y tu apellido.'; $('in-nombre').focus(); return; }
  if (!grado || !division) { err.textContent = 'Elegí tu grado y tu división.'; return; }
  const guardado = Almacen.leer(CLAVES.estado, null);
  if (guardado && guardado.fase && guardado.fase !== 'enviado' && !pantallaInicio.confirmarBorrado) {
    pantallaInicio.confirmarBorrado = true;
    err.textContent = `Hay una aventura sin terminar de ${guardado.alumno.nombre}. Si empezás una nueva, se borrará. Tocá «Comenzar» otra vez para confirmar.`;
    return;
  }
  E = nuevoEstado({ nombre, grado, division });
  guardar();
  $('form-inicio').reset();
  llenarSelects();
  pantallaMapa(true);
}
function continuarAventura() {
  if (E.fase === 'revision') pantallaRevision();
  else if (E.fase === 'enviado') pantallaInformeFinal();
  else pantallaMapa(false);
}

/* ---------- Mapa de los reinos ---------- */
const POS_REINOS = [[17, 60], [39, 33], [62, 63], [84, 35]];
function misionDisponible() { return E.misiones.findIndex((x) => !x); }
function pantallaMapa(recienEmpieza) {
  colorMision(null);
  $('mapa-alumno').textContent = `🧭 ${E.alumno.nombre} · ${cursoTexto(E.alumno)}`;
  const hechas = E.misiones.filter(Boolean).length;
  $('mapa-progreso').style.width = `${hechas * 25}%`;
  $('mapa-progreso-txt').textContent = `${hechas} de 4 cristales`;
  cristalesMini($('mapa-cristales'));
  const mapa = $('mapa');
  const disponible = misionDisponible();
  mapa.innerHTML = `<svg class="camino" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${POS_REINOS.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 14" vector-effect="non-scaling-stroke"/></svg>`;
  MISIONES.forEach((M, i) => {
    const hecha = E.misiones[i], actual = i === disponible;
    const b = crear('button', 'reino' + (hecha ? ' hecho' : actual ? ' actual' : ' bloqueado'));
    b.type = 'button';
    b.style.left = POS_REINOS[i][0] + '%';
    b.style.top = POS_REINOS[i][1] + '%';
    b.style.setProperty('--c', M.color);
    b.disabled = !actual;
    b.innerHTML = `<div class="reino-isla"><span class="emblema">${M.emblema}</span>
        ${hecha ? ILU.cristal(M.color, false).replace('class="cristal"', 'class="cristal cristal-ganado"') : ''}
        ${!hecha && !actual ? '<span class="candado" aria-hidden="true">🔒</span>' : ''}</div>
      <span class="reino-nombre">${M.reino}</span>
      <span class="reino-estado">${hecha ? '¡Cristal recuperado!' : actual ? '¡Tocá para entrar!' : 'Bloqueado'}</span>`;
    b.setAttribute('aria-label', `${M.reino}: ${hecha ? 'completado' : actual ? 'disponible' : 'bloqueado'}`);
    if (actual) b.onclick = () => pantallaMision(i);
    mapa.append(b);
  });
  let msg;
  if (disponible === -1) {
    msg = '¡Recuperaste los cuatro cristales! Ahora revisá tus respuestas.';
    const b = crear('button', 'btn btn-primario btn-grande', 'Revisar mis respuestas');
    b.type = 'button';
    b.style.cssText = 'position:absolute;right:2rem;bottom:2rem';
    b.onclick = () => { E.fase = 'revision'; guardar(); pantallaRevision(); };
    mapa.append(b);
  } else if (recienEmpieza) {
    msg = `¡Bienvenido/a, ${esc(E.alumno.nombre.split(' ')[0])}! Los cuatro cristales matemáticos se perdieron. Empecemos por el <b>${MISIONES[0].reino}</b>.`;
  } else {
    msg = hechas ? `¡Ya tenés ${hechas} cristal${hechas > 1 ? 'es' : ''}! El próximo está en <b>${MISIONES[disponible].reino}</b>.` : `Tocá el <b>${MISIONES[disponible].reino}</b> para empezar.`;
  }
  $('mapa-burbuja').innerHTML = msg;
  mostrar('s-mapa');
}

/* ---------- Presentación de cada misión ---------- */
function pantallaMision(mi) {
  const M = MISIONES[mi];
  colorMision(M);
  $('mision-intro').innerHTML = `
    <div class="mision-lado">
      <span class="num">Misión ${mi + 1} de 4</span>
      ${ILU.cristal('#FFFFFF', false)}
      <h2>${M.reino}</h2>
    </div>
    <div class="mision-cuerpo">
      <h3>${M.titulo}</h3>
      <p class="eje">Eje: ${EJES[M.eje]}</p>
      <p class="relato">${M.relato}</p>
      <p><b>En esta misión vas a:</b></p>
      <ul class="mision-lista">${M.lista.map((x) => `<li>${x}</li>`).join('')}</ul>
      <p>Son <b>${M.actividades.length} desafíos</b>. Leé con calma cada consigna: al final de la aventura vas a poder revisar todo antes de enviarlo.</p>
      <div class="mision-guia">
        <img src="assets/images/exploradora.svg" alt="">
        <button type="button" class="btn btn-grande btn-primario" id="btn-empezar-mision">¡Empezar la misión!</button>
      </div>
    </div>`;
  $('btn-empezar-mision').onclick = () => {
    const a = (E.pos && E.pos.m === mi) ? E.pos.a : 0;
    pantallaActividad(mi, a, 'juego');
  };
  mostrar('s-mision');
}

/* ---------- Pantalla de cada desafío ---------- */
let modoActividad = 'juego';
let avisoMostrado = false;
function pantallaActividad(mi, ai, modo) {
  const M = MISIONES[mi], A = M.actividades[ai];
  modoActividad = modo;
  avisoMostrado = false;
  E.pos = { m: mi, a: ai };
  colorMision(M);
  $('act-mision').textContent = M.reino;
  $('act-numero').textContent = modo === 'revision' ? `Revisando · Desafío ${ai + 1} de ${M.actividades.length}` : `Desafío ${ai + 1} de ${M.actividades.length}`;
  $('act-progreso').style.width = `${(ai + 1) / M.actividades.length * 100}%`;
  cristalesMini($('act-cristales'));
  $('act-titulo').textContent = A.titulo;
  $('act-consigna').textContent = A.consigna;
  $('act-aviso').textContent = '';

  const area = $('act-area');
  area.innerHTML = '';
  area.className = 'act-area ' + (A.layout || 'col-1');
  const r = respuestaDe(A);
  const evaluables = A.items.filter((it) => it.tipo !== 'info').length;
  let letra = 0;
  A.items.forEach((it, idx) => {
    const card = crear('div', 'item' + (it.ancho ? ' ancho' : '') + (it.alto ? ' alto' : '') + (it.ancho2 ? ' ancho2' : '') + ' item-' + it.tipo);
    if (it.titulo) {
      const conLetra = it.tipo !== 'info' && evaluables > 1;
      const l = conLetra ? `<span class="letra">${String.fromCharCode(97 + letra++)}</span>` : '';
      card.append(crear('div', 'item-titulo', `${l}<span>${it.titulo}</span>`));
    }
    const cuerpo = crear('div', 'item-cuerpo');
    card.append(cuerpo);
    COMP[it.tipo].render(cuerpo, it, r.v[idx], (nuevo) => {
      r.v[idx] = nuevo;
      $('act-aviso').textContent = '';
      avisoMostrado = false;
      guardarPronto();
    });
    area.append(card);
  });

  const ultimo = ai === M.actividades.length - 1;
  $('btn-anterior').hidden = modo === 'revision' || ai === 0;
  $('btn-siguiente').textContent = modo === 'revision' ? '✔ Listo, volver a la revisión' : (ultimo ? 'Terminar la misión ✔' : 'Siguiente ▶');
  guardar();
  mostrar('s-actividad');
}
function actividadActual() { return MISIONES[E.pos.m].actividades[E.pos.a]; }
function siguiente() {
  const A = actividadActual();
  if (!actividadCompleta(A) && !avisoMostrado) {
    avisoMostrado = true;
    $('act-aviso').textContent = 'Hay partes sin completar. Podés completarlas ahora o tocar el botón otra vez para seguir.';
    return;
  }
  confirmarRespuesta(A);
  const { m, a } = E.pos;
  if (modoActividad === 'revision') { pantallaRevision(); return; }
  if (a < MISIONES[m].actividades.length - 1) { pantallaActividad(m, a + 1, 'juego'); return; }
  E.misiones[m] = true;
  E.pos = { m: m + 1, a: 0 };
  if (E.misiones.every(Boolean)) E.fase = 'revision';
  guardar();
  pantallaFinMision(m);
}
function anterior() {
  confirmarRespuesta(actividadActual());
  const { m, a } = E.pos;
  if (a > 0) pantallaActividad(m, a - 1, 'juego');
}

/* ---------- Fin de misión: se obtiene el cristal ---------- */
function pantallaFinMision(mi) {
  const M = MISIONES[mi];
  colorMision(M);
  const ultima = mi === MISIONES.length - 1;
  $('fin-card').innerHTML = `
    ${ILU.cristal(M.color, false)}
    <h2>¡Misión cumplida!</h2>
    <p>Recuperaste el cristal del <b>${M.reino}</b>.</p>
    <p>${ultima ? '¡Ya tenés los cuatro cristales! Antes de enviar tus respuestas a la docente, vas a poder revisarlas.' : `Llevás ${E.misiones.filter(Boolean).length} de 4 cristales. ¡Seguimos!`}</p>
    <button type="button" class="btn btn-primario btn-grande" id="btn-fin">${ultima ? 'Revisar mis respuestas' : 'Volver al mapa'}</button>`;
  $('btn-fin').onclick = () => (ultima ? pantallaRevision() : pantallaMapa(false));
  const confeti = $('confeti');
  confeti.innerHTML = '';
  const colores = MISIONES.map((x) => x.color).concat('#FFB703', '#FFD166');
  for (let i = 0; i < 70; i++) {
    const c = crear('i');
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colores[i % colores.length];
    c.style.animationDuration = `${2.2 + Math.random() * 2.2}s`;
    c.style.animationDelay = `${Math.random() * .8}s`;
    confeti.append(c);
  }
  mostrar('s-fin');
}

/* ---------- Revisión de respuestas antes de enviar ---------- */
let avisoRevision = false;
function pantallaRevision() {
  colorMision(null);
  avisoRevision = false;
  $('rev-alumno').textContent = `🧭 ${E.alumno.nombre} · ${cursoTexto(E.alumno)}`;
  cristalesMini($('rev-cristales'));
  $('rev-aviso').textContent = '';
  const g = $('rev-grilla');
  g.innerHTML = '';
  MISIONES.forEach((M, mi) => {
    const col = crear('div', 'rev-col', `<h3>${M.reino}</h3>`);
    col.style.setProperty('--c', M.color);
    M.actividades.forEach((A, ai) => {
      const ok = actividadCompleta(A);
      const b = crear('button', 'rev-act', `<span>${ai + 1}. ${A.titulo}</span><span class="estado ${ok ? 'completo' : 'incompleto'}">${ok ? 'Completo' : 'Incompleto'}</span>`);
      b.type = 'button';
      b.onclick = () => pantallaActividad(mi, ai, 'revision');
      col.append(b);
    });
    g.append(col);
  });
  mostrar('s-revision');
}
function enviarALaDocente() {
  const faltan = MISIONES.flatMap((M) => M.actividades).filter((A) => !actividadCompleta(A)).length;
  if (faltan && !avisoRevision) {
    avisoRevision = true;
    $('rev-aviso').textContent = `Te falta${faltan > 1 ? 'n' : ''} completar ${faltan} desafío${faltan > 1 ? 's' : ''}. Podés volver a ${faltan > 1 ? 'ellos' : 'él'} o tocar «Enviar» otra vez para enviar igual.`;
    return;
  }
  finalizar();
}

/* =====================================================================
   8. CÁLCULO DE RESULTADOS
   Cada desafío vale 10 puntos (24 desafíos → 240 puntos). Si un desafío
   tiene varias partes, el puntaje es proporcional a las partes correctas.
   ===================================================================== */
const NIVELES = [
  { min: 80, clave: 'logrado', texto: 'Logrado' },
  { min: 50, clave: 'proceso', texto: 'En proceso' },
  { min: 0, clave: 'refuerzo', texto: 'Requiere refuerzo' }
];
const nivelDe = (pct) => NIVELES.find((n) => pct >= n.min);

function corregirActividad(A, r) {
  let ok = 0, total = 0;
  const respuestas = [], correctas = [];
  const evaluables = A.items.filter((it) => it.tipo !== 'info');
  let letra = 0;
  A.items.forEach((it, i) => {
    if (it.tipo === 'info') return;
    const C = COMP[it.tipo];
    const g = C.corregir(it, r.v[i]);
    ok += g.ok; total += g.total;
    const pre = evaluables.length > 1 ? `${String.fromCharCode(97 + letra++)}) ` : '';
    respuestas.push(pre + C.describir(it, r.v[i]));
    correctas.push(pre + C.solucion(it));
  });
  const puntos = total ? Math.round(10 * ok / total) : 0;
  const tocada = actividadTocada(A, r);
  const resultado = !tocada ? 'Sin responder' : puntos === 10 ? 'Correcta' : puntos === 0 ? 'Incorrecta' : `Parcialmente correcta (${puntos}/10)`;
  return { puntos, ok, total, resultado, respuesta: respuestas.join(' | '), correcta: correctas.join(' | ') };
}

function calcularResultados() {
  const detalle = [];
  const porMision = MISIONES.map((M, mi) => {
    let puntaje = 0, correctas = 0, incorrectas = 0, sinResponder = 0;
    const repasar = [];
    M.actividades.forEach((A, ai) => {
      const r = E.resp[A.id] || { v: vacioActividad(A), intentos: 0, tiempo: 0 };
      const c = corregirActividad(A, r);
      puntaje += c.puntos;
      if (c.puntos === 10) correctas++; else incorrectas++;
      if (c.resultado === 'Sin responder') sinResponder++;
      if (c.puntos < 7) repasar.push(A.contenido);
      detalle.push({
        mision: `${mi + 1}. ${M.reino}`, eje: EJES[M.eje], numero: ai + 1, actividad: A.titulo, contenido: A.contenido,
        respuesta: c.respuesta, correcta: c.correcta, resultado: c.resultado, puntos: c.puntos,
        intentos: r.intentos || 0, tiempoSeg: Math.round(r.tiempo || 0)
      });
    });
    const max = M.actividades.length * 10;
    const pct = Math.round(puntaje / max * 100);
    return { id: M.id, eje: M.eje, nombreEje: EJES[M.eje], reino: M.reino, puntaje, max, pct, nivel: nivelDe(pct), correctas, incorrectas, sinResponder, repasar };
  });
  const puntajeTotal = porMision.reduce((a, m) => a + m.puntaje, 0);
  const puntajeMaximo = porMision.reduce((a, m) => a + m.max, 0);
  const porcentaje = Math.round(puntajeTotal / puntajeMaximo * 100);
  const totalActividades = detalle.length;
  const correctas = porMision.reduce((a, m) => a + m.correctas, 0);
  const sinResponder = porMision.reduce((a, m) => a + m.sinResponder, 0);
  return {
    porMision, detalle, puntajeTotal, puntajeMaximo, porcentaje, totalActividades, correctas,
    incorrectas: totalActividades - correctas, sinResponder, resueltos: totalActividades - sinResponder,
    nivel: nivelDe(porcentaje), misionesCompletadas: E.misiones.filter(Boolean).length, segundos: Math.round(E.segundos)
  };
}

/** Datos que se envían a Google Apps Script (sin datos personales extra). */
function armarEnvio() {
  const R = E.resultado;
  const ejes = {};
  R.porMision.forEach((m) => { ejes[m.eje] = `${m.pct}% · ${m.nivel.texto}`; });
  const estado = R.sinResponder ? `Finalizado con ${R.sinResponder} desafío(s) sin responder` : 'Finalizado';
  return {
    version: CONFIG.VERSION,
    sessionId: E.sesion,
    inicio: E.inicio,
    finalizadoEn: E.finalizado,
    alumno: { nombre: E.alumno.nombre, grado: E.alumno.grado, division: E.alumno.division },
    resumen: {
      puntajeTotal: R.puntajeTotal, puntajeMaximo: R.puntajeMaximo, porcentaje: R.porcentaje,
      correctas: R.correctas, incorrectas: R.incorrectas, totalActividades: R.totalActividades,
      tiempoTotalSeg: R.segundos, misionesCompletadas: R.misionesCompletadas,
      resultadoGeneral: R.nivel.texto, estado: `${estado} (${R.misionesCompletadas}/4 misiones)`, ejes
    },
    detalle: R.detalle.map((d) => ({
      mision: d.mision, numero: d.numero, contenido: `${d.actividad}: ${d.contenido}`, respuesta: d.respuesta,
      correcta: d.correcta, resultado: d.resultado, intentos: d.intentos, tiempoSeg: d.tiempoSeg
    }))
  };
}

function finalizar() {
  E.fase = 'enviado';
  E.finalizado = new Date().toISOString();
  E.resultado = calcularResultados();
  Envio.encolar(armarEnvio());
  guardar();
  pantallaInformeFinal();
  Envio.procesar();
}

/* =====================================================================
   9. ENVÍO A GOOGLE APPS SCRIPT
   - Se usa fetch con POST y cuerpo de texto (Content-Type text/plain),
     una «petición simple» que no requiere verificación CORS previa y es
     compatible con GitHub Pages.
   - Solo se considera guardado cuando Apps Script responde {ok:true} con
     el mismo identificador de sesión.
   - Si falla, el resultado queda en una cola del almacenamiento local y se
     reintenta automáticamente (al volver la conexión, cada minuto y al
     abrir la app).
   ===================================================================== */
const Envio = {
  enCurso: false,
  enviandoId: null,
  temporizador: null,
  pendientes() { return Almacen.leer(CLAVES.pendientes, []); },
  guardarPendientes(lista) { Almacen.escribir(CLAVES.pendientes, lista); },
  enviados() { return Almacen.leer(CLAVES.enviados, []); },
  encolar(payload) {
    const lista = this.pendientes().filter((p) => p.payload.sessionId !== payload.sessionId);
    if (this.enviados().includes(payload.sessionId)) return;
    lista.push({ payload, intentos: 0, error: '', creado: new Date().toISOString() });
    this.guardarPendientes(lista);
    this.notificar();
  },
  estadoDe(id) {
    if (this.enviados().includes(id)) return { clave: 'ok' };
    if (this.enviandoId === id) return { clave: 'enviando' };
    const p = this.pendientes().find((x) => x.payload.sessionId === id);
    if (!p) return { clave: 'desconocido' };
    if (!CONFIG.SCRIPT_URL) return { clave: 'sinConfig' };
    if (p.rechazado) return { clave: 'rechazado', error: p.error };
    return { clave: 'pendiente', error: p.error, intentos: p.intentos };
  },
  alCambiar: [],
  notificar() { this.alCambiar.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } }); },

  /** Un envío con reintentos. Devuelve {estado:'ok'|'rechazado'|'fallo', ...}. */
  async enviarUno(payload) {
    let ultimoError = 'Sin conexión';
    for (let i = 0; i <= CONFIG.REINTENTOS; i++) {
      if (!navigator.onLine) { ultimoError = 'Sin conexión a Internet'; break; }
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), CONFIG.TIEMPO_MAX_MS);
      try {
        const resp = await fetch(CONFIG.SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify(payload),           // text/plain → sin preflight CORS
          redirect: 'follow',
          cache: 'no-store',
          signal: ctrl.signal
        });
        const texto = await resp.text();
        let datos;
        try { datos = JSON.parse(texto); } catch (e) { throw new Error(`Respuesta no válida del servidor (HTTP ${resp.status})`); }
        if (datos.ok === true && datos.sessionId === payload.sessionId) return { estado: 'ok', duplicado: !!datos.duplicado };
        if (datos.ok === false && datos.codigo === 'VALIDACION') return { estado: 'rechazado', error: datos.error || 'Datos rechazados' };
        throw new Error(datos.error || 'El servidor no confirmó el registro');
      } catch (err) {
        ultimoError = err.name === 'AbortError' ? 'El servidor tardó demasiado en responder' : (err.message || String(err));
      } finally {
        clearTimeout(t);
      }
      if (i < CONFIG.REINTENTOS) await esperar(CONFIG.ESPERAS_MS[i] || 10000);
    }
    return { estado: 'fallo', error: ultimoError };
  },

  /** Procesa la cola de envíos pendientes, de a uno por vez. */
  async procesar() {
    if (this.enCurso || !CONFIG.SCRIPT_URL) { this.notificar(); return; }
    this.enCurso = true;
    clearTimeout(this.temporizador);
    try {
      for (const p of this.pendientes()) {
        if (p.rechazado) continue;
        this.enviandoId = p.payload.sessionId;
        this.notificar();
        const res = await this.enviarUno(p.payload);
        this.enviandoId = null;
        const lista = this.pendientes();
        const actual = lista.find((x) => x.payload.sessionId === p.payload.sessionId);
        if (res.estado === 'ok') {
          this.guardarPendientes(lista.filter((x) => x !== actual));
          const env = this.enviados();
          if (!env.includes(p.payload.sessionId)) { env.push(p.payload.sessionId); Almacen.escribir(CLAVES.enviados, env.slice(-300)); }
        } else if (actual) {
          actual.intentos += 1;
          actual.error = res.error;
          actual.rechazado = res.estado === 'rechazado';
          this.guardarPendientes(lista);
          if (res.estado === 'fallo') break; // sin conexión: no seguir probando con los demás
        }
        this.notificar();
      }
    } finally {
      this.enCurso = false;
      this.enviandoId = null;
      if (this.pendientes().some((p) => !p.rechazado)) {
        this.temporizador = setTimeout(() => this.procesar(), CONFIG.REPROGRAMAR_MS);
      }
      this.notificar();
    }
  }
};

/* =====================================================================
   10. INFORME FINAL DEL ALUMNO
   ===================================================================== */
function mensajeFinal(pct, nombre) {
  const n = esc(nombre.split(' ')[0]);
  if (pct >= 90) return [`¡Excelente trabajo, ${n}!`, 'Recuperaste los cuatro cristales y demostraste que sabés mucho de matemática.'];
  if (pct >= 70) return [`¡Muy bien, ${n}!`, 'Completaste la aventura con muy buenos resultados. Mirá qué temas te conviene repasar.'];
  if (pct >= 50) return [`¡Buen esfuerzo, ${n}!`, 'Terminaste la aventura. Con un poco más de práctica en algunos temas, vas a llegar muy lejos.'];
  return [`¡Gracias por tu esfuerzo, ${n}!`, 'Terminaste la aventura. Vamos a seguir practicando juntos los temas que más te costaron.'];
}
function recomendacion(m) {
  if (!m.repasar.length) return '¡Muy bien! Comprendiste los contenidos de este eje.';
  return 'Para repasar: ' + m.repasar.map((c) => c.charAt(0).toLowerCase() + c.slice(1)).join('; ') + '.';
}
function pantallaInformeFinal() {
  colorMision(null);
  const R = E.resultado || calcularResultados();
  const [titulo, texto] = mensajeFinal(R.porcentaje, E.alumno.nombre);
  $('informe').innerHTML = `
    <section class="card inf-izq">
      <h2>Informe de la aventura</h2>
      <div class="inf-nombre">${esc(E.alumno.nombre)}</div>
      <div class="inf-curso">${esc(cursoTexto(E.alumno))} · ${new Date(E.finalizado || Date.now()).toLocaleDateString('es-AR')}</div>
      ${ILU.medidor(R.porcentaje, '#5B4BDB')}
      <div class="inf-datos">
        <div class="dato"><b>${R.puntajeTotal}<small style="font-size:.6em"> / ${R.puntajeMaximo}</small></b><span>Puntaje total</span></div>
        <div class="dato"><b>${R.resueltos} / ${R.totalActividades}</b><span>Desafíos resueltos</span></div>
        <div class="dato"><b>${R.correctas}</b><span>Desafíos correctos</span></div>
        <div class="dato"><b>${minutosTexto(R.segundos)}</b><span>Tiempo empleado</span></div>
      </div>
      <div><b>Medallas obtenidas: ${R.misionesCompletadas} de 4 cristales</b></div>
      <div class="medallas">${MISIONES.map((M, i) => ILU.cristal(M.color, !E.misiones[i])).join('')}</div>
    </section>
    <section class="inf-der">
      <div class="card inf-mensaje">
        <img src="assets/images/exploradora.svg" alt="">
        <div><h3>${titulo}</h3><p>${texto} Resultado general: <b>${R.nivel.texto}</b>.</p></div>
      </div>
      ${R.porMision.map((m, i) => `
        <div class="card inf-eje" style="--c:${MISIONES[i].color}">
          <div class="inf-eje-cab">${ILU.cristal(MISIONES[i].color, !E.misiones[i])}
            <h4>${m.reino}<small>${m.nombreEje}</small></h4>
            <span class="nivel ${m.nivel.clave}">${m.nivel.texto}</span></div>
          <div class="barra"><div class="barra-relleno" style="width:${m.pct}%"></div></div>
          <div class="pct">${m.pct}% · ${m.puntaje} de ${m.max} puntos · ${m.correctas} de ${m.correctas + m.incorrectas} desafíos correctos</div>
          <p class="reco">${recomendacion(m)}</p>
        </div>`).join('')}
    </section>
    <footer class="inf-pie">
      <div class="estado-envio" id="estado-envio"></div>
      <button type="button" class="btn btn-secundario" id="btn-imprimir">🖨 Imprimir o guardar PDF</button>
      <button type="button" class="btn btn-primario" id="btn-nueva">Nueva aventura</button>
    </footer>`;
  $('btn-imprimir').onclick = () => window.print();
  $('btn-nueva').onclick = nuevaAventura;
  mostrarEstadoEnvio();
  mostrar('s-informe');
}
/** Muestra el estado real del envío. Nunca dice «guardado» sin confirmación. */
function mostrarEstadoEnvio() {
  const caja = $('estado-envio');
  if (!caja || !E || E.fase !== 'enviado') return;
  const st = Envio.estadoDe(E.sesion);
  caja.className = 'estado-envio';
  const reintentar = '<button type="button" class="btn btn-secundario" id="btn-reintentar">Reintentar ahora</button>';
  switch (st.clave) {
    case 'ok':
      caja.classList.add('ok');
      caja.innerHTML = '✔ Resultados guardados en la planilla de la docente.';
      break;
    case 'enviando':
      caja.innerHTML = '<span class="girando"></span> Enviando los resultados a la docente…';
      break;
    case 'sinConfig':
      caja.classList.add('pendiente');
      caja.innerHTML = '⏳ La app todavía no está conectada con la planilla. Tus resultados quedaron guardados en esta computadora. Avisale a tu docente.';
      break;
    case 'rechazado':
      caja.classList.add('error');
      caja.innerHTML = `⚠ La planilla rechazó los datos (${esc(st.error || 'error')}). Avisale a tu docente.`;
      break;
    case 'pendiente':
      caja.classList.add('pendiente');
      caja.innerHTML = `⏳ Todavía no se pudieron enviar los resultados${st.error ? ` (${esc(st.error)})` : ''}. Quedaron guardados en esta computadora y se enviarán solos cuando haya conexión. ${reintentar}`;
      break;
    default:
      caja.innerHTML = 'Preparando el envío…';
  }
  const b = $('btn-reintentar');
  if (b) b.onclick = () => Envio.procesar();
}
function nuevaAventura() {
  const b = $('btn-nueva');
  if (!b.dataset.confirmar) {
    b.dataset.confirmar = '1';
    b.textContent = 'Tocá otra vez para empezar';
    return;
  }
  Almacen.borrar(CLAVES.estado);
  E = null;
  pantallaInicio();
}

/* =====================================================================
   11. PANEL DOCENTE
   Permite comprobar la conexión con la planilla y reenviar resultados.
   ===================================================================== */
function abrirPanel() {
  actualizarPanel();
  $('panel-msg').textContent = '';
  $('panel-docente').hidden = false;
}
function actualizarPanel() {
  const p = Envio.pendientes();
  $('panel-estado').innerHTML = `
    <li>Conexión con Google Sheets: <b>${CONFIG.SCRIPT_URL ? 'configurada' : 'NO configurada (falta SCRIPT_URL en script.js)'}</b></li>
    <li>Internet en este equipo: <b>${navigator.onLine ? 'sí' : 'no'}</b></li>
    <li>Resultados pendientes de envío: <b>${p.length}</b>${p.length ? ' — ' + p.map((x) => esc(x.payload.alumno.nombre) + (x.error ? ` (${esc(x.error)})` : '')).join('; ') : ''}</li>
    <li>Resultados confirmados desde este equipo: <b>${Envio.enviados().length}</b></li>
    <li>Versión de la aplicación: ${CONFIG.VERSION}</li>`;
}
async function probarConexion() {
  const msg = $('panel-msg');
  if (!CONFIG.SCRIPT_URL) { msg.textContent = 'Primero hay que pegar la URL del Apps Script en script.js (ver README).'; return; }
  msg.textContent = 'Probando…';
  try {
    const r = await fetch(`${CONFIG.SCRIPT_URL}?accion=estado`, { cache: 'no-store' });
    const d = JSON.parse(await r.text());
    msg.textContent = d.ok ? `✔ Conexión correcta con la planilla «${d.planilla}» (${d.registros} resultados registrados).` : `⚠ ${d.error}`;
  } catch (e) {
    msg.textContent = '⚠ No se pudo conectar. Revisá la URL y que la implementación tenga acceso «Cualquier persona».';
  }
}
function descargarCopia() {
  const datos = { exportado: new Date().toISOString(), pendientes: Envio.pendientes().map((p) => p.payload) };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aventura-matematica-pendientes-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $('panel-msg').textContent = `Se descargó una copia con ${datos.pendientes.length} resultado(s) pendiente(s).`;
}

/* =====================================================================
   12. ARRANQUE
   ===================================================================== */
function llenarSelects() {
  $('in-grado').innerHTML = CONFIG.GRADOS.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
  $('in-division').innerHTML = '<option value="">Elegí…</option>' + CONFIG.DIVISIONES.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
}
function iniciar() {
  llenarSelects();
  $('form-inicio').addEventListener('submit', comenzar);
  $('btn-siguiente').addEventListener('click', siguiente);
  $('btn-anterior').addEventListener('click', anterior);
  $('btn-enviar').addEventListener('click', enviarALaDocente);
  $('btn-docente').addEventListener('click', abrirPanel);
  $('btn-cerrar-panel').addEventListener('click', () => { $('panel-docente').hidden = true; });
  $('btn-probar').addEventListener('click', probarConexion);
  $('btn-reenviar').addEventListener('click', () => { $('panel-msg').textContent = 'Enviando pendientes…'; Envio.procesar(); });
  $('btn-descargar').addEventListener('click', descargarCopia);

  Envio.alCambiar.push(() => {
    if (pantallaActual === 's-informe') mostrarEstadoEnvio();
    if (pantallaActual === 's-inicio') actualizarAvisoPendientes();
    if (!$('panel-docente').hidden) actualizarPanel();
  });
  window.addEventListener('online', () => { toast('Volvió la conexión a Internet'); Envio.procesar(); });
  window.addEventListener('offline', () => { toast('Sin conexión: tu progreso se sigue guardando en esta computadora'); Envio.notificar(); });

  // Reloj: tiempo total y tiempo de cada desafío (solo con la pestaña visible)
  setInterval(() => {
    if (!E || E.fase === 'enviado' || document.visibilityState !== 'visible') return;
    if (pantallaActual === 's-inicio') return;
    E.segundos += 1;
    if (pantallaActual === 's-actividad') respuestaDe(actividadActual()).tiempo += 1;
    if (E.segundos % 5 === 0) guardar();
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardar(); });

  pantallaInicio();
  Envio.procesar();

  // Herramientas solo para pruebas automáticas (desactivadas en el aula)
  if (CONFIG.MODO_PRUEBA) {
    window.AventuraApp = {
      MISIONES, COMP, EJES, Envio, calcularResultados, CONFIG,
      estado: () => E,
      resolver(mi, ai) { const A = MISIONES[mi].actividades[ai]; respuestaDe(A).v = A.items.map((it) => clonar(COMP[it.tipo].resolver(it))); },
      ir: { actividad: pantallaActividad, revision: pantallaRevision }
    };
  }
}
document.addEventListener('DOMContentLoaded', iniciar);
