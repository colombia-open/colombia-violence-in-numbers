# CLAUDE.md

Guía para trabajar en este repositorio. El contexto editorial y de datos
completo está en `README.md`; aquí va lo que hace falta para cambiar código
sin romper la pieza.

## Qué es

"Dos Colombias violentas": pieza de periodismo de datos en formato
scrollytelling sobre homicidios, hurto a personas y lesiones personales en
Colombia, 2018–2025. Se publica en GitHub Pages
(https://colombia-open.github.io/colombia-violence-in-numbers/). Todo el
texto visible está en español de Colombia.

## Estructura

```
scripts/build_data.py         # Polars + colombia-open -> site/data/*.json
scripts/optimize_images.py    # originals/* -> variantes AVIF/WebP/JPG (640/1280)
scripts/generate_og_image.py  # site/assets/og-image.jpg desde el hero
site/index.html               # texto de los pasos, slots de imagen, metodología
site/style.css                # tokens de color, layout, responsive
site/main.js                  # gráficos (Observable Plot) + Scrollama
site/data/                    # un JSON por gráfico real de la pieza (generado)
site/assets/img/IMAGE_BRIEF.md  # tabla de slots de imagen
.claude/skills/               # reglas del proyecto (ver abajo)
.github/workflows/build.yml   # build mensual/manual + deploy a Pages
```

## Comandos

```bash
pip install -r requirements.txt     # colombia-open se instala desde un tag de GitHub
python scripts/build_data.py        # regenera site/data/*.json (requiere red)
python scripts/optimize_images.py
python scripts/generate_og_image.py
cd site && python -m http.server 8787   # vista local en http://localhost:8787
```

No hay build step para el frontend, ni bundler ni framework: HTML/CSS/JS
plano con módulos ES. Las dependencias (`@observablehq/plot`, `scrollama`)
se cargan por CDN en `main.js`. No hay suite de tests: para verificar un
cambio visual se sirve `site/` y se revisa con Playwright a 1440×900
(escritorio) y 390×844 (móvil), mirando también la consola y que no haya
scroll horizontal (`document.documentElement.scrollWidth`).

## Skills del proyecto: cárgalas antes de tocar su área

- `colombia-open-data`: cualquier cambio en `scripts/build_data.py`, tasas
  o series.
- `data-scrollytelling`: estructura sticky + pasos y comportamiento en
  móvil.
- `editorial-charts`: cualquier gráfico en `main.js`.
- `editorial-art-direction`: tipografía, imágenes y slots.

## Convenciones que no se negocian

**Datos**
- Nunca se muestra una cifra absoluta sin cruzarla con población: todo es
  tasa por 100.000 habitantes (o un índice 2018 = 100).
- La ventana es 2018–2025, porque la población del DANE empieza en 2018.
  2026 se excluye por estar incompleto.
- Hurto y lesiones dependen de que haya denuncia. Siempre que se grafiquen,
  va el aviso `graphic-caveat` junto al gráfico (`caveat: true` en la
  escena).
- Si cambian los datos, revisa las cifras escritas a mano en
  `index.html` (portada, pasos y cierre): no se generan solas.

**Gráficos (`site/main.js`)**
- Usa `curve: "monotone-x"`, nunca `catmull-rom` ni `natural`, que inventan
  picos y valles entre años.
- Ejes y valores con `fmt` (`Intl.NumberFormat("es-CO")`): `2.000`, no
  `2,000`.
- Pon una etiqueta directa al final de cada serie, con nombre y valor. En
  `Plot.selectLast` hace falta `z: <serie>`; sin él solo se etiqueta una
  línea. Las etiquetas llevan `className: "end-label"` y `separateLabels()`
  las separa si chocan.
- El color tiene un significado fijo en toda la pieza: azul
  (`--series-grandes`) = grandes ciudades, naranja (`--series-resto`) =
  resto del país, gris (`--series-nacional`) = nacional. No reutilices esos
  colores para otra cosa.
- Los gráficos se dibujan al ancho real del contenedor con `chartDims()` y
  se redibujan al cambiar el tamaño de la ventana. No vuelvas a un ancho
  fijo escalado: en móvil el texto de los ejes queda ilegible.
- Cada escena es una función `(data, dims) => ({ title, caption, caveat,
  legend, svg, tableRows, tableSpec })`. El título dice la conclusión, no
  el tema. Cada gráfico tiene su tabla de datos en `<details>`.

**Layout y estilo (`site/style.css`)**
- Solo hay tema claro. No agregues `prefers-color-scheme: dark`; el HTML
  declara `<meta name="color-scheme" content="light">`.
- Los tamaños van en `rem`. La base es 18px en escritorio (`html { font-size:
  1.125rem }`) y baja a 16px en pantallas de hasta 640px.
- En móvil (hasta 860px), el gráfico es sticky arriba y los pasos pasan por
  encima (z-index mayor), con mucho espacio entre ellos. La tarjeta del
  gráfico nunca se recorta ni tiene scroll interno.
- Anima solo `transform` y `opacity`, y respeta `prefers-reduced-motion`.

**Imágenes**
- Todas las imágenes son ilustrativas y generadas con IA. Cada una lleva el
  crédito visible "Imagen ilustrativa generada con IA" (`.photo-credit`),
  con estilo discreto de pie de foto. No lo quites.
- Las imágenes llevan tratamiento duotono azul (`.duotone`). Las fotos van
  en `site/assets/img/originals/`; las variantes se generan con
  `optimize_images.py`.
- Nada de imágenes de violencia explícita, víctimas ni lugares reales
  identificables (ver `editorial-art-direction`).

## Despliegue

`build.yml` corre con push a `main` (si cambian `site/`, `scripts/` o
`requirements.txt`), cada mes y a mano. Reconstruye datos e imágenes y
despliega `site/` a Pages. Solo commitea los archivos generados en las
corridas programadas o manuales, nunca en un push, para no entrar en un
loop. Un cambio no se ve en el sitio publicado hasta que llega a `main`.
