---
name: colombia-open-data
description: Usar siempre que se construya o modifique un pipeline de datos sobre colombia-open (agregaciones, tasas, series temporales) en este proyecto. Cubre qué API usar, cómo cruzar con población, cómo tratar municipios pequeños y cómo detectar quiebres de registro en delitos que dependen de denuncia.
---

## API

- Solo la API pública de `colombia-open` (`ColombiaOpen().load_polars(...)`, `.list_datasets()`, `.provenance(...)`). Nunca importar de `extractors/` ni `builders/` internos del paquete — son detalles de implementación que pueden cambiar sin aviso entre versiones.
- Antes de usar un dataset nuevo, confirmar su rango de años real (`df['anio'].min()/.max()`) en vez de asumirlo. `demografia` en este proyecto solo cubre 2018 en adelante (proyecciones DANE pos-censo 2018) — no hay población confiable antes de eso con esta fuente.

## Tasas, nunca cifras sueltas

- Toda cifra absoluta que se muestre en la pieza va acompañada de su tasa por 100.000 habitantes y el año al que corresponde.
- El cruce con población es siempre por `cod_mpio` (o `cod_dpto` si se agregó a departamento) **y** `anio` — población del MISMO año que el conteo de delito, nunca un año fijo aplicado a toda la serie.

```python
rate = (
    counts.join(pop, on=["cod_mpio", "anio"], how="inner")
    .group_by("anio")
    .agg(pl.col("casos").sum(), pl.col("poblacion").sum())
    .with_columns((pl.col("casos") / pl.col("poblacion") * 100_000).alias("tasa_100k"))
)
```

## Unidades pequeñas

- Municipios chicos o delitos poco frecuentes producen tasas con mucho ruido año a año (un solo caso mueve la tasa 100k enteros).
- Antes de rankear o comparar municipios pequeños: agregar a departamento/región, o usar promedio móvil de 3 años. Nunca publicar un ranking de municipios pequeños con la tasa de un solo año.

## Advertencias de registro (léelas antes de interpretar cualquier serie)

- **Homicidio es la serie más confiable**: casi siempre se registra (hay un cuerpo), poco sensible a cambios en el canal de denuncia.
- **Hurto a personas y lesiones personales dependen de que la víctima denuncie.** Un alza o caída puede ser un cambio real del delito O un cambio en qué tan fácil es denunciar (denuncia virtual, campañas, cambios de metodología policial). Estos datos solos no permiten distinguir una cosa de otra.
- Antes de afirmar una tendencia en hurto o lesiones: comparar su variación interanual contra la de homicidios en el mismo año. Una variación de hurto/lesiones mucho mayor que la de homicidios ese año es candidata a quiebre de registro, no necesariamente un salto real de violencia.
- Si aparece un quiebre así: mencionarlo en el texto de la pieza como posible efecto de registro (con la incertidumbre explícita), nunca presentarlo como tendencia real sin advertencia.

## Trazabilidad visible (obligatoria en la pieza, no solo en el README)

- Fuente: "Policía Nacional de Colombia / Ministerio de Defensa, vía colombia-open".
- Enlace: https://github.com/davidcasr/colombia-open.
- Fecha de corte real de los datos (la fecha máxima en los datasets usados, no "hoy").

## Salida del pipeline

- Un archivo JSON pequeño por cada gráfico real de la pieza, ya agregado con solo las columnas que ese gráfico necesita.
- Nunca un volcado completo de un dataset fuente a `site/data/`.
