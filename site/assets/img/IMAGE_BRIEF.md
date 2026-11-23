# Brief de imágenes — Dos Colombias violentas

Todas las imágenes son **ilustrativas, generadas con IA** (o de archivo genérico
sin relación con un hecho, lugar o persona real documentados). Llevan el
crédito "Imagen ilustrativa generada con IA" visible en la pieza. Ninguna
muestra víctimas, sangre, armas, cinta policial, uniformes/insignias de
fuerza pública ni personas identificables — ver `editorial-art-direction`.

La pieza usa 4 escenas fotográficas (hero, dos cortes de capítulo y el
cierre): menos fotos genéricas de IA, más peso puesto en los gráficos. El
detalle de hurto por ciudad (`detalle-paradero`) sí se quitó por esto.

| id slot | archivo (original) | proporción | tamaño mínimo | qué debe mostrar | alt | estado |
|---|---|---|---|---|---|---|
| `hero` | `originals/hero.webp` | ~16:9 (1672×941) | 1280×720 | Paisaje colombiano atmosférico a sangre, crepúsculo, sin elementos narrativos de violencia — ambiente, no ilustración literal | "Vista panorámica de un poblado colombiano entre montañas al atardecer" | ✅ cargada |
| `hero-mobile` | `originals/hero-mobile.webp` | ~9:16 (941×1672) | 640×1138 | Recorte vertical del mismo tono/paleta que `hero`, para el hero en móvil | "Vista vertical de un poblado colombiano entre montañas al atardecer" | ✅ cargada |
| `capitulo-campo` | `originals/capitulo-campo.webp` | ~2.33:1 (1914×822) | 1280×550 | Corte de capítulo antes de las escenas de homicidios: carretera/zona rural, niebla, sin pueblos ni personas | "Camino de tierra entre montañas colombianas en la niebla, lejos de una gran ciudad" | ✅ cargada |
| `capitulo-ciudad` | `originals/capitulo-ciudad.webp` | ~2.33:1 (1914×822) | 1280×550 | Corte de capítulo antes de las escenas de hurto: calle urbana vacía de noche, con alumbrado público, sin personas identificables | "Calle urbana vacía de noche, con luces de alumbrado público" | ✅ cargada |
| `cierre` | `originals/cierre.webp` | ~16:9 (1672×941) | 1280×720 | Imagen de cierre, tono más cálido/esperanzador que el resto de la pieza | "Vista de un poblado colombiano entre montañas al amanecer" | ✅ cargada |

## Convenciones

- Originales en `site/assets/img/originals/*.{png,jpg,jpeg,webp}` → `scripts/optimize_images.py` genera `assets/img/<slot>-<ancho>.{avif,webp,jpg}` para anchos 640/1280/1920/2560 (capados al ancho nativo del original).
- El duotono/tratamiento casi monocromo se aplica en vivo por CSS (`.photo-duotone`), no está horneado en el archivo — así funciona igual en claro/oscuro.
- Si un slot pierde su archivo, el frontend muestra un degradado con la paleta + el id del slot (ver `.slot-placeholder` en `style.css`) y la página se sigue viendo terminada.
