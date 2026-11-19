---
name: data-scrollytelling
description: Usar al construir o modificar la estructura de scroll (Scrollama + gráfico sticky) de una pieza de periodismo de datos. Cubre el patrón gráfico+pasos, mobile-first, accesibilidad de movimiento y rendimiento de las transiciones.
---

## Patrón base

- Un gráfico "sticky" (`position: sticky`) + una columna de pasos de texto observada con Scrollama. El gráfico es UNO que se transforma a lo largo de la pieza; nunca se reemplaza toda la página en cada paso.
- Cada paso de Scrollama cambia exactamente UNA cosa en el gráfico: resaltar una serie, cambiar de escala, filtrar una región/año, añadir una anotación. El texto de ese paso explica esa cosa y nada más — si el texto necesita explicar dos cosas, son dos pasos.
- Vanilla JS + Scrollama, sin framework (React/Vue) ni build step. El sitio sigue siendo HTML/CSS/JS plano servible desde `site/`.

## Mobile-first — nunca ocultar el gráfico

- En móvil el gráfico sigue siendo sticky, arriba de los pasos, con altura objetivo ~55svh.
- Los pasos de texto pasan por encima del gráfico en tarjetas con fondo semitransparente (no 100% opaco), para que el gráfico siga siendo visible como contexto mientras se lee.
- Usar `svh`/`dvh` en vez de `vh` para el panel sticky — `vh` no descuenta la barra de navegación móvil y causa saltos al aparecer/desaparecer.

```css
.graphic-pane { position: sticky; top: 0; height: 55svh; }
@supports not (height: 1svh) {
  .graphic-pane { height: 55vh; } /* respaldo para navegadores sin svh */
}
```

## Accesibilidad y buen comportamiento de scroll

- Nunca scroll-jacking: nunca interceptar o modificar la velocidad/dirección del scroll del usuario. Scrollama solo observa el scroll, no lo controla.
- Respetar `prefers-reduced-motion`: con esa preferencia activa, las transiciones de gráfico van directo al estado final, sin animación intermedia.

```css
@media (prefers-reduced-motion: reduce) {
  .chart-inner, .step, * { transition: none !important; animation: none !important; }
}
```

- Todo el contenido (texto de cada paso, cifras, fuente) existe en el DOM desde el inicio — no se inyecta solo al activarse el paso, para que sea indexable y accesible sin JS.
- La pieza se navega con teclado (Tab a través de pasos, `<details>`, enlaces) sin quedar atrapada en ningún elemento.
- Indicador visible de progreso de scroll (barra o contador de pasos "3 / 7").

## Rendimiento de las transiciones

- Animar solo `transform` y `opacity` (las únicas propiedades que no disparan layout/paint costoso). Nunca animar `width`, `height`, `top`/`left` de un elemento grande.
- Transiciones de cambio de datos (fade entre un gráfico y el siguiente estado): 400–800 ms. Más rápido se siente brusco; más lento se siente pesado o roto.

## Estructura narrativa de las escenas

1. **Contexto** — el estado o promedio que el lector ya cree conocer.
2. **Tensión** — la primera grieta: el promedio esconde algo.
3. **Evidencia** — los datos que sostienen esa grieta, con más detalle.
4. **Giro** — el hallazgo contraintuitivo o el contraste central de la tesis.
5. **Cierre** — síntesis + qué significa, con la fuente visible.
