---
name: editorial-art-direction
description: Usar al definir tipografía, fotografía/imágenes y el sistema de slots de imagen de una pieza editorial sobre un tema sensible. Cubre ética visual para temas de violencia y presupuestos de peso de imagen.
---

## Tipografía

- Titulares y cifras protagonistas: una familia display grande, tamaño con `clamp()` para que escale con el viewport sin romperse en móvil.
- Cuerpo de texto: 18–20px (1.125rem–1.25rem), interlineado generoso (1.5–1.6).
- Cifras y datos tabulares: una fuente monoespaciada (o `font-variant-numeric: tabular-nums`) para que los números alineen en tablas y leyendas.

## Fotografía como atmósfera, no como ilustración literal

- El hero y los cortes de capítulo llevan foto a sangre (full-bleed, sin márgenes).
- Tratamiento uniforme casi monocromo vía CSS: duotono con los dos colores principales de la paleta (`mix-blend-mode` + filtro de color, o `feColorMatrix` en SVG), para que el color vivo de la pieza lo pongan los gráficos de datos, no las fotos.

```css
.photo-duotone {
  filter: grayscale(1) contrast(1.1);
  background-blend-mode: multiply, screen;
  background-image:
    linear-gradient(var(--duotone-dark), var(--duotone-dark)),
    linear-gradient(var(--duotone-light), var(--duotone-light));
}
```

- Las fotos dan ambiente/contexto; los datos informan. Si una foto compite visualmente con un gráfico, se apaga más la foto (más oscura, menos contraste), nunca al revés.

## Ética visual (no negociable en un tema de violencia)

- Nunca mostrar víctimas, sangre, armas, cinta policial, uniformes o insignias de fuerza pública, ni personas identificables.
- Lenguaje de los textos sobrio, sin sensacionalismo ni morbo — la pieza informa con cifras, no dramatiza con imágenes.
- Toda imagen generada con IA lleva un crédito visible, en la propia imagen o justo debajo: **"Imagen ilustrativa generada con IA"**. Nunca se presenta como fotografía documental de un lugar, hecho o persona real.

## Sistema de slots de imagen

- Cada imagen de la pieza es un "slot": id, archivo esperado (ruta), proporción (`aspect-ratio`), alt descriptivo, crédito.
- Si el archivo del slot no existe todavía, se muestra un placeholder elegante (gradiente con la paleta + el id del slot en texto pequeño) y la página se sigue viendo terminada — nunca un ícono roto ni un hueco en blanco.

```html
<picture class="slot" data-slot="hero" style="aspect-ratio: 16/9">
  <source type="image/avif" srcset="assets/img/hero-640.avif 640w, assets/img/hero-1280.avif 1280w, assets/img/hero-1920.avif 1920w, assets/img/hero-2560.avif 2560w">
  <source type="image/webp" srcset="assets/img/hero-640.webp 640w, assets/img/hero-1280.webp 1280w, assets/img/hero-1920.webp 1920w, assets/img/hero-2560.webp 2560w">
  <img src="assets/img/hero-1280.jpg" alt="..." width="1920" height="1080" loading="eager">
</picture>
```

- `<picture>` con AVIF + WebP + JPG de respaldo, `srcset` en 640/1280/1920/2560px, `loading="lazy"` en todo menos el hero, `width`/`height` siempre presentes (evita *layout shift*).

## Presupuestos de peso

- Imagen del hero: ≤ 300 KB.
- Carga inicial completa (HTML+CSS+JS+imágenes visibles sin scroll): ≤ 1,5 MB.
- Si un slot no cabe en el presupuesto, se reduce calidad/resolución antes que quitar el formato moderno (AVIF/WebP).
