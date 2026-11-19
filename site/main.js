import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3/+esm";

const fmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

const GRUPO_LABEL = {
  grandes_ciudades: "Grandes ciudades",
  resto_pais: "Resto del país",
  nacional: "Nacional",
};
const DELITO_LABEL = {
  homicidios: "Homicidios",
  hurto: "Hurto a personas",
  lesiones: "Lesiones personales",
};
const CIUDAD_LABEL = {
  Bogota: "Bogotá",
  Medellin: "Medellín",
  Cali: "Cali",
  Barranquilla: "Barranquilla",
  Cartagena: "Cartagena",
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FADE_MS = prefersReducedMotion ? 0 : 450;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function palette() {
  return {
    grandes_ciudades: cssVar("--series-grandes"),
    resto_pais: cssVar("--series-resto"),
    nacional: cssVar("--series-nacional"),
    homicidios: cssVar("--series-grandes"),
    hurto: cssVar("--series-resto"),
    lesiones: cssVar("--series-aqua"),
  };
}

/* ---------- sistema de slots: placeholder elegante si falta la imagen ---------- */

function setupImageSlots() {
  document.querySelectorAll("[data-slot]").forEach((el) => {
    const img = el.querySelector("img");
    if (!img) return;
    const mark = () => {
      el.classList.add("slot-missing");
      const media = el.matches(".slot-media") ? el : el.querySelector(".slot-media");
      if (media) media.setAttribute("data-slot-label", el.dataset.slot);
    };
    if (img.complete && img.naturalWidth === 0) mark();
    img.addEventListener("error", mark, { once: true });
  });
}

/* ---------- construcción de gráficos ---------- */

function renderLegend(legendEl, entries) {
  legendEl.innerHTML = "";
  if (entries.length < 2) return;
  const colors = palette();
  for (const { key, label } of entries) {
    const item = document.createElement("span");
    item.className = "legend-item";
    const dot = document.createElement("span");
    dot.className = "legend-swatch";
    dot.style.background = colors[key] || "#999";
    item.appendChild(dot);
    item.appendChild(document.createTextNode(label));
    legendEl.appendChild(item);
  }
}

function renderTable(tableEl, rows, { xKey, xLabel, seriesKey, seriesLabelFn, valueKey, valueLabel }) {
  const years = [...new Set(rows.map((r) => r[xKey]))].sort((a, b) => a - b);
  const series = [...new Set(rows.map((r) => r[seriesKey]))];
  const byKey = new Map(rows.map((r) => [`${r[xKey]}__${r[seriesKey]}`, r[valueKey]]));

  let html = `<table><caption class="sr-only">${valueLabel}</caption><thead><tr><th scope="col">${xLabel}</th>`;
  for (const s of series) html += `<th scope="col">${seriesLabelFn(s)}</th>`;
  html += "</tr></thead><tbody>";
  for (const y of years) {
    html += `<tr><th scope="row">${y}</th>`;
    for (const s of series) {
      const v = byKey.get(`${y}__${s}`);
      html += `<td>${v == null ? "" : fmt.format(v)}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  tableEl.innerHTML = html;
}

/* Dimensiones reales del contenedor: el SVG se dibuja al ancho en píxeles
   que va a ocupar, así el texto de los ejes nunca se encoge por debajo de
   su tamaño nominal en pantallas angostas. */
function chartDims(el, { tall = false } = {}) {
  const width = Math.max(280, Math.round(el.clientWidth || 640));
  const mobile = width < 520;
  const vh = window.innerHeight || 800;
  let height;
  if (tall) height = mobile ? Math.min(360, Math.round(vh * 0.42)) : 460;
  else height = mobile ? Math.max(190, Math.min(250, Math.round(vh * 0.3))) : 360;
  return { width, height, mobile };
}

const SHORT_GRUPO = { grandes_ciudades: "Grandes", resto_pais: "Resto", nacional: "Nacional" };
const SHORT_DELITO = { homicidios: "Homicidio", hurto: "Hurto", lesiones: "Lesiones" };

// Plot no evita choques entre etiquetas: tras dibujar, se separan
// verticalmente las etiquetas finales que quedaron a menos de `gap` px.
function separateLabels(svg, gap) {
  const texts = [...svg.querySelectorAll("g.end-label text")];
  if (texts.length < 2) return;
  // Plot posiciona cada <text> con transform="translate(x,y)".
  const items = texts
    .map((t) => {
      const m = /translate\(([-\d.e]+)[ ,]+([-\d.e]+)\)/.exec(t.getAttribute("transform") || "");
      return m && { t, x: parseFloat(m[1]), y: parseFloat(m[2]) };
    })
    .filter(Boolean)
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < items.length; i++) {
    if (items[i].y - items[i - 1].y < gap) items[i].y = items[i - 1].y + gap;
  }
  for (const d of items) d.t.setAttribute("transform", `translate(${d.x},${d.y})`);
}

function yAxis(label, mobile, extra = {}) {
  return { label, grid: true, nice: true, ticks: mobile ? 4 : 5, tickFormat: (d) => fmt.format(d), ...extra };
}

function lineChart({ rows, seriesKey, seriesOrder, seriesLabelFn, shortLabelFn, yLabel, tooltipUnit, dims }) {
  const colors = palette();
  const domain = seriesOrder.filter((s) => rows.some((r) => r[seriesKey] === s));
  const range = domain.map((s) => colors[s] || "#999");
  const { width, height, mobile } = dims;
  const labelFn = mobile ? shortLabelFn : seriesLabelFn;

  const svg = Plot.plot({
    width,
    height,
    marginRight: mobile ? 64 : 112,
    marginLeft: mobile ? 40 : 46,
    style: { fontSize: mobile ? "11px" : "12px" },
    x: { label: null, tickFormat: (d) => String(d), ticks: mobile ? 4 : undefined },
    y: yAxis(yLabel, mobile, { zero: true }),
    color: { domain, range },
    marks: [
      Plot.ruleY([0], { stroke: cssVar("--baseline") }),
      Plot.line(rows, { x: "anio", y: "tasa_100k", stroke: seriesKey, strokeWidth: 2.25, curve: "monotone-x" }),
      Plot.dot(
        rows,
        Plot.selectLast({
          x: "anio", y: "tasa_100k", fill: seriesKey, z: seriesKey, r: 4,
          stroke: cssVar("--surface-1"), strokeWidth: 2,
        })
      ),
      // z: seriesKey hace que selectLast tome el último punto de CADA serie
      // (sin él, solo se etiquetaba la última fila de todo el conjunto).
      Plot.text(
        rows,
        Plot.selectLast({
          x: "anio", y: "tasa_100k", z: seriesKey,
          text: (d) => `${labelFn(d[seriesKey])}\n${fmt.format(d.tasa_100k)}`,
          dx: 8, textAnchor: "start", lineAnchor: "middle",
          fill: cssVar("--text-secondary"), fontSize: mobile ? 11 : 12,
          className: "end-label",
        })
      ),
      Plot.tip(
        rows,
        Plot.pointerX({
          x: "anio", y: "tasa_100k",
          title: (d) => `${seriesLabelFn(d[seriesKey])}\n${d.anio}: ${fmt.format(d.tasa_100k)} ${tooltipUnit}`,
        })
      ),
    ],
  });
  separateLabels(svg, mobile ? 28 : 30);
  return svg;
}

function smallMultiplesChart(rows, order, restoRows, dims) {
  const colors = palette();
  const { width, height, mobile } = dims;
  // Referencia: la tasa de hurto del resto del país, repetida en cada panel,
  // para que "todas muy por encima del resto del país" se vea, no se lea.
  const ref = order.flatMap((c) => restoRows.map((r) => ({ ...r, ciudad: c })));
  return Plot.plot({
    width,
    height,
    marginLeft: mobile ? 40 : 44,
    marginRight: mobile ? 48 : 64,
    style: { fontSize: mobile ? "11px" : "12px" },
    x: { label: null, tickFormat: (d) => String(d), ticks: mobile ? 4 : undefined },
    y: yAxis("hurtos por 100.000 hab.", mobile, { zero: true, ticks: 2 }),
    fy: { domain: order.map((c) => CIUDAD_LABEL[c]), axis: null, padding: 0.12 },
    marks: [
      Plot.frame({ stroke: cssVar("--gridline") }),
      Plot.ruleY([0], { stroke: cssVar("--baseline") }),
      Plot.line(ref, {
        x: "anio", y: "tasa_100k",
        fy: (d) => CIUDAD_LABEL[d.ciudad],
        stroke: colors.resto_pais, strokeWidth: 1.5, strokeDasharray: "3,3", strokeOpacity: 0.85,
        curve: "monotone-x",
      }),
      Plot.text(ref.filter((d) => d.ciudad === order[0]), Plot.selectLast({
        x: "anio", y: "tasa_100k",
        fy: (d) => CIUDAD_LABEL[d.ciudad],
        text: () => "Resto del país",
        dy: -8, textAnchor: "end",
        fill: colors.resto_pais, fontSize: mobile ? 10 : 11,
      })),
      // Un solo color (el de "grandes ciudades"): todas estas ciudades son de
      // ese grupo, y el naranja ya significa "resto del país" en la pieza.
      Plot.line(rows, {
        x: "anio", y: "tasa_100k",
        fy: (d) => CIUDAD_LABEL[d.ciudad],
        stroke: colors.grandes_ciudades,
        strokeWidth: 2, curve: "monotone-x",
      }),
      Plot.dot(rows, Plot.selectLast({
        x: "anio", y: "tasa_100k",
        fy: (d) => CIUDAD_LABEL[d.ciudad],
        fill: colors.grandes_ciudades,
        r: 3.5, stroke: cssVar("--surface-1"), strokeWidth: 1.5,
      })),
      Plot.text(rows, Plot.selectLast({
        x: "anio", y: "tasa_100k",
        fy: (d) => CIUDAD_LABEL[d.ciudad],
        text: (d) => fmt.format(Math.round(d.tasa_100k)),
        dx: 6, textAnchor: "start",
        fill: cssVar("--text-secondary"), fontSize: mobile ? 10 : 11,
      })),
      // nombre de cada panel anclado arriba-izquierda, en vez del eje fy
      // automático (que colisiona con el valor final cuando la línea
      // termina cerca del centro vertical del panel).
      Plot.text(order, {
        fy: (c) => CIUDAD_LABEL[c],
        frameAnchor: "top-left",
        dx: 4, dy: 4,
        text: (c) => CIUDAD_LABEL[c],
        fill: cssVar("--text-primary"),
        fontWeight: 600,
        fontSize: mobile ? 11 : 12,
      }),
      Plot.tip(rows, Plot.pointerX({
        x: "anio", y: "tasa_100k",
        fy: (d) => CIUDAD_LABEL[d.ciudad],
        title: (d) => `${CIUDAD_LABEL[d.ciudad]}\n${d.anio}: ${fmt.format(d.tasa_100k)} por 100k`,
      })),
    ],
  });
}

function indicesChart(rows, order, dims) {
  const colors = palette();
  const { width, height, mobile } = dims;
  const labelFn = (d) => (mobile ? SHORT_DELITO[d] : DELITO_LABEL[d]);
  const svg = Plot.plot({
    width,
    height,
    marginRight: mobile ? 72 : 132,
    marginLeft: mobile ? 40 : 46,
    style: { fontSize: mobile ? "11px" : "12px" },
    x: { label: null, tickFormat: (d) => String(d), ticks: mobile ? 4 : undefined },
    y: yAxis("índice (2018 = 100)", mobile),
    color: { domain: order, range: order.map((d) => colors[d]) },
    marks: [
      Plot.ruleY([100], { stroke: cssVar("--baseline"), strokeDasharray: "2,3" }),
      Plot.line(rows, { x: "anio", y: "indice", stroke: "delito", strokeWidth: 2.25, curve: "monotone-x" }),
      Plot.dot(rows, Plot.selectLast({
        x: "anio", y: "indice", fill: "delito", z: "delito", r: 4,
        stroke: cssVar("--surface-1"), strokeWidth: 2,
      })),
      Plot.text(rows, Plot.selectLast({
        x: "anio", y: "indice", z: "delito",
        text: (d) => `${labelFn(d.delito)}\n${fmt.format(d.indice)}`,
        dx: 8, textAnchor: "start", lineAnchor: "middle",
        fill: cssVar("--text-secondary"), fontSize: mobile ? 11 : 12,
        className: "end-label",
      })),
      Plot.tip(rows, Plot.pointerX({
        x: "anio", y: "indice",
        title: (d) => `${DELITO_LABEL[d.delito]}\n${d.anio}: índice ${fmt.format(d.indice)} (tasa ${fmt.format(d.tasa_100k)})`,
      })),
    ],
  });
  separateLabels(svg, mobile ? 28 : 30);
  return svg;
}

/* ---------- grupo de escenas (un sticky + sus pasos) ---------- */

function createChartGroup(suffix, scenes) {
  const refs = {
    scene: document.getElementById(`scene-${suffix}`),
    chart: document.getElementById(`chart-${suffix}`),
    legend: document.getElementById(`legend-${suffix}`),
    title: document.getElementById(`chart-title-${suffix}`),
    caption: document.getElementById(`chart-caption-${suffix}`),
    caveat: document.getElementById(`chart-caveat-${suffix}`),
    table: document.getElementById(`data-table-${suffix}`),
  };

  function apply(def) {
    refs.title.textContent = def.title;
    refs.caption.textContent = def.caption;
    if (refs.caveat) refs.caveat.hidden = !def.caveat;
    renderLegend(refs.legend, def.legend);
    refs.chart.innerHTML = "";
    refs.chart.appendChild(def.svg);
    renderTable(refs.table, def.tableRows, def.tableSpec);
  }

  let current = -1;
  let lastWidth = 0;
  function build(index, data) {
    lastWidth = refs.chart.clientWidth;
    return scenes[index](data, (opts) => chartDims(refs.chart, opts));
  }
  function renderStep(index, data) {
    if (index === current) return;
    current = index;
    const def = build(index, data);
    if (FADE_MS === 0) {
      apply(def);
      return;
    }
    refs.scene.classList.add("is-fading");
    window.setTimeout(() => {
      apply(def);
      refs.scene.classList.remove("is-fading");
    }, FADE_MS);
  }

  // Al rotar el teléfono o cambiar el ancho de la ventana, se redibuja el
  // estado actual al nuevo ancho (sin fundido).
  function rerender(data) {
    if (current < 0 || refs.chart.clientWidth === lastWidth) return;
    apply(build(current, data));
  }

  return { renderStep, rerender, el: refs.scene.closest(".scrolly") };
}

/* ---------- definición de escenas ---------- */

function grupoScene(data, dims, { delito, groups, title, caption, caveat }) {
  const rows = data.grupo.filter((r) => r.delito === delito && groups.includes(r.grupo));
  return {
    title, caption, caveat,
    legend: groups.map((g) => ({ key: g, label: GRUPO_LABEL[g] })),
    svg: lineChart({
      rows, seriesKey: "grupo",
      seriesOrder: ["grandes_ciudades", "resto_pais", "nacional"],
      seriesLabelFn: (g) => GRUPO_LABEL[g],
      shortLabelFn: (g) => SHORT_GRUPO[g],
      yLabel: "casos por 100.000 hab.",
      tooltipUnit: "por 100k",
      dims: dims(),
    }),
    tableRows: rows,
    tableSpec: { xKey: "anio", xLabel: "Año", seriesKey: "grupo", seriesLabelFn: (g) => GRUPO_LABEL[g], valueKey: "tasa_100k", valueLabel: `Tasa de ${delito} por grupo de municipios` },
  };
}

const SCENES_A = [
  (data, dims) => grupoScene(data, dims, {
    delito: "homicidios", groups: ["nacional"],
    title: "El homicidio nacional no subió ni bajó",
    caption: "Tasa de homicidios por cada 100.000 habitantes, Colombia completa, 2018–2025.",
  }),
  (data, dims) => grupoScene(data, dims, {
    delito: "homicidios", groups: ["grandes_ciudades", "resto_pais"],
    title: "Vivir lejos de una gran ciudad fue más letal",
    caption: "Grandes ciudades (≥500.000 hab. en 2025) vs. resto del país.",
  }),
];

const SCENES_B = [
  (data, dims) => grupoScene(data, dims, {
    delito: "hurto", groups: ["nacional"],
    title: "El hurto se disparó — o se disparó la denuncia",
    caption: "Tasa de hurto a personas por cada 100.000 habitantes, 2018–2025.",
    caveat: true,
  }),
  (data, dims) => grupoScene(data, dims, {
    delito: "hurto", groups: ["grandes_ciudades", "resto_pais"],
    title: "Y esa alza es casi toda urbana",
    caption: "La misma comparación que con homicidios — la brecha se invierte.",
    caveat: true,
  }),
  (data, dims) => {
    const order = ["Bogota", "Medellin", "Cali", "Barranquilla", "Cartagena"];
    const rows = data.topCities;
    const resto = data.grupo.filter((r) => r.delito === "hurto" && r.grupo === "resto_pais");
    return {
      title: "No es igual en cada ciudad",
      caption: "Tasa de hurto a personas, 2018–2025.",
      caveat: true,
      legend: [],
      svg: smallMultiplesChart(rows, order, resto, dims({ tall: true })),
      tableRows: rows,
      tableSpec: { xKey: "anio", xLabel: "Año", seriesKey: "ciudad", seriesLabelFn: (c) => CIUDAD_LABEL[c], valueKey: "tasa_100k", valueLabel: "Tasa de hurto por ciudad" },
    };
  },
  (data, dims) => grupoScene(data, dims, {
    delito: "lesiones", groups: ["grandes_ciudades", "resto_pais"],
    title: "¿Son las ciudades más violentas, en general? No.",
    caption: "Control: aquí la brecha entre grupos es mucho menor que en hurto.",
    caveat: true,
  }),
  (data, dims) => {
    const order = ["homicidios", "hurto", "lesiones"];
    const rows = data.indices;
    return {
      title: "El péndulo de la violencia urbana",
      caption: "Índice 2018 = 100, solo grandes ciudades.",
      caveat: false,
      legend: order.map((d) => ({ key: d, label: DELITO_LABEL[d] })),
      svg: indicesChart(rows, order, dims()),
      tableRows: rows,
      tableSpec: { xKey: "anio", xLabel: "Año", seriesKey: "delito", seriesLabelFn: (d) => DELITO_LABEL[d], valueKey: "indice", valueLabel: "Índice comparado 2018=100" },
    };
  },
];

/* ---------- carga de datos + orquestación de scroll ---------- */

async function loadData() {
  const [grupo, topCities, indices] = await Promise.all([
    fetch("data/tasas_por_grupo.json").then((r) => r.json()),
    fetch("data/tasa_hurto_top_ciudades.json").then((r) => r.json()),
    fetch("data/indices_comparados_grandes_ciudades.json").then((r) => r.json()),
  ]);
  return { grupo, topCities, indices };
}

function setupProgressBar() {
  const bar = document.getElementById("progress-bar");
  const update = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = `${max > 0 ? (scrolled / max) * 100 : 0}%`;
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}

async function main() {
  setupImageSlots();
  setupProgressBar();

  const data = await loadData();

  const groupA = createChartGroup("a", SCENES_A);
  const groupB = createChartGroup("b", SCENES_B);
  groupA.renderStep(0, data);
  groupB.renderStep(0, data);

  const scroller = scrollama();
  scroller
    .setup({ step: ".step", offset: window.matchMedia("(max-width: 860px)").matches ? 0.8 : 0.6 })
    .onStepEnter(({ element, index }) => {
      document.querySelectorAll(".step").forEach((el) => el.classList.remove("is-active"));
      element.classList.add("is-active");
      const group = element.dataset.group;
      const stepIndex = Number(element.dataset.step);
      if (group === "a") groupA.renderStep(stepIndex, data);
      if (group === "b") groupB.renderStep(stepIndex, data);
    });

  let resizeTimer;
  window.addEventListener("resize", () => {
    scroller.resize();
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      groupA.rerender(data);
      groupB.rerender(data);
    }, 200);
  });
}

main();
