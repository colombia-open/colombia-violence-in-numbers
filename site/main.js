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
    Bogota: cssVar("--series-grandes"),
    Medellin: cssVar("--series-resto"),
    Cali: cssVar("--series-aqua"),
    Barranquilla: cssVar("--series-yellow"),
    Cartagena: cssVar("--series-magenta"),
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

function lineChart({ rows, seriesKey, seriesOrder, seriesLabelFn, yLabel, tooltipUnit }) {
  const colors = palette();
  const domain = seriesOrder.filter((s) => rows.some((r) => r[seriesKey] === s));
  const range = domain.map((s) => colors[s] || "#999");

  return Plot.plot({
    width: 640,
    height: 360,
    marginRight: 92,
    marginLeft: 46,
    x: { label: null, tickFormat: (d) => String(d) },
    y: { label: yLabel, grid: true, nice: true, zero: true },
    color: { domain, range },
    marks: [
      Plot.ruleY([0], { stroke: cssVar("--baseline") }),
      Plot.line(rows, { x: "anio", y: "tasa_100k", stroke: seriesKey, strokeWidth: 2, curve: "catmull-rom" }),
      Plot.dot(
        rows,
        Plot.selectLast({
          x: "anio", y: "tasa_100k", fill: seriesKey, r: 4,
          stroke: cssVar("--surface-1"), strokeWidth: 2,
          title: (d) => `${seriesLabelFn(d[seriesKey])}\n${d.anio}: ${fmt.format(d.tasa_100k)} ${tooltipUnit}`,
        })
      ),
      Plot.text(
        rows,
        Plot.selectLast({
          x: "anio", y: "tasa_100k",
          text: (d) => seriesLabelFn(d[seriesKey]),
          dx: 8, textAnchor: "start",
          fill: cssVar("--text-secondary"), fontSize: 11,
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
}

function smallMultiplesChart(rows, order) {
  const colors = palette();
  return Plot.plot({
    width: 640,
    height: 460,
    marginLeft: 44,
    marginRight: 70,
    x: { label: null, tickFormat: (d) => String(d) },
    y: { label: "hurtos por 100.000 hab.", grid: true, nice: true, zero: true },
    fy: { domain: order.map((c) => CIUDAD_LABEL[c]), axis: null },
    marks: [
      Plot.frame({ stroke: cssVar("--gridline") }),
      Plot.ruleY([0], { stroke: cssVar("--baseline") }),
      Plot.line(rows, {
        x: "anio", y: "tasa_100k",
        fy: (d) => CIUDAD_LABEL[d.ciudad],
        stroke: (d) => colors[d.ciudad] || "#999",
        strokeWidth: 2, curve: "catmull-rom",
      }),
      Plot.dot(rows, Plot.selectLast({
        x: "anio", y: "tasa_100k",
        fy: (d) => CIUDAD_LABEL[d.ciudad],
        fill: (d) => colors[d.ciudad] || "#999",
        r: 3.5, stroke: cssVar("--surface-1"), strokeWidth: 1.5,
        title: (d) => `${CIUDAD_LABEL[d.ciudad]}\n${d.anio}: ${fmt.format(d.tasa_100k)} por 100k`,
      })),
      Plot.text(rows, Plot.selectLast({
        x: "anio", y: "tasa_100k",
        fy: (d) => CIUDAD_LABEL[d.ciudad],
        text: (d) => fmt.format(d.tasa_100k),
        dx: 6, textAnchor: "start",
        fill: cssVar("--text-secondary"), fontSize: 10,
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
        fontSize: 12,
      }),
    ],
  });
}

function indicesChart(rows, order) {
  const colors = palette();
  return Plot.plot({
    width: 640,
    height: 360,
    marginRight: 100,
    marginLeft: 46,
    x: { label: null, tickFormat: (d) => String(d) },
    y: { label: "índice (2018 = 100)", grid: true, nice: true },
    color: { domain: order, range: order.map((d) => colors[d]) },
    marks: [
      Plot.ruleY([100], { stroke: cssVar("--baseline"), strokeDasharray: "2,3" }),
      Plot.line(rows, { x: "anio", y: "indice", stroke: "delito", strokeWidth: 2, curve: "catmull-rom" }),
      Plot.dot(rows, Plot.selectLast({
        x: "anio", y: "indice", fill: "delito", r: 4,
        stroke: cssVar("--surface-1"), strokeWidth: 2,
        title: (d) => `${DELITO_LABEL[d.delito]}\n${d.anio}: índice ${fmt.format(d.indice)} (tasa ${fmt.format(d.tasa_100k)})`,
      })),
      Plot.text(rows, Plot.selectLast({
        x: "anio", y: "indice",
        text: (d) => DELITO_LABEL[d.delito],
        dx: 8, textAnchor: "start",
        fill: cssVar("--text-secondary"), fontSize: 11,
      })),
      Plot.tip(rows, Plot.pointerX({
        x: "anio", y: "indice",
        title: (d) => `${DELITO_LABEL[d.delito]}\n${d.anio}: índice ${fmt.format(d.indice)} (tasa ${fmt.format(d.tasa_100k)})`,
      })),
    ],
  });
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
  function renderStep(index, data) {
    if (index === current) return;
    current = index;
    const def = scenes[index](data);
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

  return { renderStep, el: refs.scene.closest(".scrolly") };
}

/* ---------- definición de escenas ---------- */

function grupoScene(data, { delito, groups, title, caption, caveat }) {
  const rows = data.grupo.filter((r) => r.delito === delito && groups.includes(r.grupo));
  return {
    title, caption, caveat,
    legend: groups.map((g) => ({ key: g, label: GRUPO_LABEL[g] })),
    svg: lineChart({
      rows, seriesKey: "grupo",
      seriesOrder: ["grandes_ciudades", "resto_pais", "nacional"],
      seriesLabelFn: (g) => GRUPO_LABEL[g],
      yLabel: "casos por 100.000 hab.",
      tooltipUnit: "por 100k",
    }),
    tableRows: rows,
    tableSpec: { xKey: "anio", xLabel: "Año", seriesKey: "grupo", seriesLabelFn: (g) => GRUPO_LABEL[g], valueKey: "tasa_100k", valueLabel: `Tasa de ${delito} por grupo de municipios` },
  };
}

const SCENES_A = [
  (data) => grupoScene(data, {
    delito: "homicidios", groups: ["nacional"],
    title: "El homicidio nacional no subió ni bajó",
    caption: "Tasa de homicidios por cada 100.000 habitantes, Colombia completa, 2018–2025.",
  }),
  (data) => grupoScene(data, {
    delito: "homicidios", groups: ["grandes_ciudades", "resto_pais"],
    title: "Vivir lejos de una gran ciudad fue más letal",
    caption: "Grandes ciudades (≥500.000 hab. en 2025) vs. resto del país.",
  }),
];

const SCENES_B = [
  (data) => grupoScene(data, {
    delito: "hurto", groups: ["nacional"],
    title: "El hurto se disparó — o se disparó la denuncia",
    caption: "Tasa de hurto a personas por cada 100.000 habitantes, 2018–2025.",
    caveat: true,
  }),
  (data) => grupoScene(data, {
    delito: "hurto", groups: ["grandes_ciudades", "resto_pais"],
    title: "Y esa alza es casi toda urbana",
    caption: "La misma comparación que con homicidios — la brecha se invierte.",
    caveat: true,
  }),
  (data) => {
    const order = ["Bogota", "Medellin", "Cali", "Barranquilla", "Cartagena"];
    const rows = data.topCities;
    return {
      title: "No es igual en cada ciudad",
      caption: "Tasa de hurto a personas, 2018–2025.",
      caveat: true,
      legend: [],
      svg: smallMultiplesChart(rows, order),
      tableRows: rows,
      tableSpec: { xKey: "anio", xLabel: "Año", seriesKey: "ciudad", seriesLabelFn: (c) => CIUDAD_LABEL[c], valueKey: "tasa_100k", valueLabel: "Tasa de hurto por ciudad" },
    };
  },
  (data) => grupoScene(data, {
    delito: "lesiones", groups: ["grandes_ciudades", "resto_pais"],
    title: "¿Son las ciudades más violentas, en general? No.",
    caption: "Control: aquí la brecha entre grupos es mucho menor que en hurto.",
    caveat: true,
  }),
  (data) => {
    const order = ["homicidios", "hurto", "lesiones"];
    const rows = data.indices;
    return {
      title: "El péndulo de la violencia urbana",
      caption: "Índice 2018 = 100, solo grandes ciudades.",
      caveat: false,
      legend: order.map((d) => ({ key: d, label: DELITO_LABEL[d] })),
      svg: indicesChart(rows, order),
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
    .setup({ step: ".step", offset: 0.6 })
    .onStepEnter(({ element, index }) => {
      document.querySelectorAll(".step").forEach((el) => el.classList.remove("is-active"));
      element.classList.add("is-active");
      const group = element.dataset.group;
      const stepIndex = Number(element.dataset.step);
      if (group === "a") groupA.renderStep(stepIndex, data);
      if (group === "b") groupB.renderStep(stepIndex, data);
    });

  window.addEventListener("resize", () => scroller.resize());
}

main();
