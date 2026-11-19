---
name: editorial-charts
description: Usar al diseñar o construir cualquier gráfico de esta pieza (Observable Plot/D3). Cubre etiquetado directo, uso del color, small multiples, ejes honestos y accesibilidad de gráficos.
---

## Librería

- Observable Plot por defecto para cualquier gráfico nuevo.
- D3 directo solo cuando se necesite animar la transición ENTRE dos estados del mismo gráfico (Plot no tiene transiciones nativas; se re-renderiza con D3 interpolando los datos, o se anima manualmente con `requestAnimationFrame`).

## Etiquetado y foco

- Etiquetas directas sobre el final de cada línea en vez de depender solo de una leyenda aparte (la leyenda es respaldo, no el único lugar donde se identifica una serie).
- Anotaciones en el propio gráfico que nombren el momento clave (ej. "pico: 2023") en vez de dejar que el lector lo deduzca del eje.
- Gris (tinta de texto secundaria) para todo lo que es contexto; color solo para la(s) serie(s) que el texto de ese paso está señalando en ese momento. Las series no señaladas bajan de opacidad, no desaparecen (mantienen el contexto).

## Cuándo usar small multiples

- Si una comparación necesita más de ~4-5 líneas superpuestas, no se agregan más colores: se parte en small multiples (un panel pequeño por región/categoría, mismos ejes y misma escala). Nunca 20-30 líneas de distintos municipios en un solo panel.

## Ejes honestos

- Gráficos de barras: el eje siempre empieza en cero. Nunca cortar el eje para exagerar una diferencia.
- Gráficos de línea pueden no empezar en cero si la unidad lo justifica (ej. un índice rebasado a 100), pero la unidad y el año tienen que estar visibles siempre, en el título o en el eje — nunca un número sin saber qué es ni de cuándo.
- Cada gráfico tiene una frase-titular que dice la CONCLUSIÓN, no el tema: "El hurto en grandes ciudades cuadruplica al resto del país" en vez de "Tasa de hurto por grupo de municipios".

## Accesibilidad de gráficos

- Tooltip navegable por teclado (foco con Tab) además de con mouse/touch — no depender solo de `:hover`.
- Tabla de datos alternativa (colapsable, `<details>`) junto a cada gráfico, para quien use lector de pantalla o quiera ver los números exactos.
- Nunca color como único canal para distinguir series — complementar siempre con la etiqueta directa de texto (ver "Etiquetado y foco").

## Snippet: etiqueta directa al final de una línea con Observable Plot

```js
Plot.text(rows, Plot.selectLast({
  x: "anio", y: "valor",
  text: (d) => seriesLabel(d.serie),
  dx: 8, textAnchor: "start",
  fill: "var(--text-secondary)", // nunca el color de la serie: texto = tinta, no dato
}))
```
