# colombia-violence-in-numbers

Pieza de periodismo de datos (scrollytelling) sobre homicidios, hurto a
personas y lesiones personales en Colombia, 2018-2025.

**Ángulo editorial:** "Dos Colombias violentas" — las grandes ciudades
tienen una tasa de homicidios más baja que el resto del país, pero una tasa
de hurto a personas 3 a 4 veces más alta, y esa brecha no se cierra. Las
lesiones personales (control) muestran una brecha mucho menor entre los dos
grupos, lo que sugiere que el patrón urbano es específico del hurto, no
violencia generalizada.

Ver la pieza completa para el guion de 8 pasos (en dos capítulos: "Fuera de
las grandes ciudades" y "La ciudad") y la lectura de cada gráfico.

## Skills del proyecto

`.claude/skills/` documenta las reglas específicas de este proyecto:
`colombia-open-data` (API, tasas, quiebres de registro),
`data-scrollytelling` (patrón sticky+pasos, mobile, accesibilidad de
movimiento), `editorial-art-direction` (tipografía, fotografía, slots de
imagen, ética visual) y `editorial-charts` (etiquetado, color, small
multiples, ejes honestos).

## Datos

Fuente: Policía Nacional de Colombia / Ministerio de Defensa y DANE,
distribuidos por el paquete público
[`colombia-open`](https://github.com/davidcasr/colombia-open). Solo se usa
su API pública (`ColombiaOpen().load_polars(...)`), nunca los portales o
Excel originales.

Decisiones de alcance forzadas por los datos:

- `demografia` (población, DANE) solo cubre proyecciones **2018-2042**.
  Como el proyecto nunca muestra una cifra absoluta sin cruzarla con
  población, ninguna tasa va más atrás de 2018, aunque `delincuencia_homicidios`
  y `delincuencia_hurto_personas` tienen conteos desde 2003.
- 2026 se excluye del analisis: es un año incompleto en la fuente al momento
  de construir el pipeline (los datos de delincuencia solo llegan hasta
  jul-sep de 2026).
- "Grandes ciudades" = los municipios con población total >= 500.000
  habitantes en 2025 (15 municipios: Bogotá, Medellín, Cali, Barranquilla,
  Cartagena, Soacha, Cúcuta, Soledad, Bucaramanga, Valledupar, Bello,
  Villavicencio, Santa Marta, Montería e Ibagué). "Resto del país" es todo
  lo demás.
- Todas las tasas son casos por cada 100.000 habitantes del grupo
  correspondiente en ese año.

> **Nota sobre `colombia-open`:** al momento de escribir esto, PyPI solo
> publica la versión 0.12.0, que no reconoce el dataset
> `delincuencia_homicidios` (agregado en la v0.13.0 de GitHub). Por eso
> `requirements.txt` instala directo desde el tag `v0.14.0` de GitHub en
> lugar de `pip install colombia-open`. Cuando haya un release >=0.14.0 en
> PyPI, cambiar esa línea por `colombia-open>=0.14.0`.

## Estructura

```
.claude/skills/            # reglas del proyecto (datos, scrollytelling, arte, charts)
scripts/build_data.py      # Polars: agrega los datasets y escribe site/data/*.json
scripts/optimize_images.py # Pillow: originals/*.{png,jpg,webp} -> variantes AVIF/WebP/JPG
scripts/generate_og_image.py # genera site/assets/og-image.jpg (1200x630) desde el hero
site/                       # HTML/CSS/JS plano (Scrollama.js + Observable Plot)
  data/                     # 5 JSON pequeños, uno por grafico real de la pieza
  assets/img/
    originals/              # fotos fuente (no se sirven directo)
    IMAGE_BRIEF.md           # tabla de slots: id, archivo, proporcion, alt, estado
.github/workflows/          # Reconstruye los JSON + imagenes mensualmente o manualmente
```

## Desarrollo local

```bash
python -m venv .venv
.venv/Scripts/activate   # o: source .venv/bin/activate
pip install -r requirements.txt
python scripts/build_data.py
python scripts/optimize_images.py
python scripts/generate_og_image.py
cd site && python -m http.server 8787
```

Abrir `http://localhost:8787`.

## Despliegue

El workflow `.github/workflows/build.yml` reconstruye los JSON (mensual o
manualmente vía `workflow_dispatch`) y despliega `site/` a **GitHub Pages**.
Para activarlo: Settings → Pages → Source → "GitHub Actions".

Alternativa gratis: **Vercel**. Importar el repo y configurar "Root
Directory" = `site` (sitio estático, sin build step: Framework Preset =
"Other"). Para mantener los JSON frescos en Vercel, correr
`python scripts/build_data.py` y commitear antes de cada deploy, o dejar que
el workflow de GitHub Actions lo haga y Vercel se redesplegará con el push.

## Licencias

Solo librerías de código abierto sin licencia comercial: Observable Plot
(ISC), Scrollama.js (MIT). Sin mapas que requieran token de pago.
