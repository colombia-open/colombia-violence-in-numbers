"""Agrega las series de delincuencia de colombia-open y escribe los JSON
que consume site/. Cada archivo corresponde a UN grafico real de la pieza.

Angulo editorial: "Dos Colombias violentas" -- las grandes ciudades son mas
seguras frente al homicidio pero mucho mas peligrosas frente al hurto a
personas (2018-2025).

Decisiones de alcance, forzadas por los datos (ver README):
- demografia solo cubre 2018-2042 (proyecciones DANE pos-censo 2018), asi que
  toda tasa per capita del proyecto se limita a esa ventana.
- 2026 se excluye: es un anio parcial (los datasets de delincuencia solo
  llegan hasta jul/sep de 2026 al momento de construir este pipeline).
- "Grandes ciudades" = municipios con poblacion total >= 500,000 en 2025
  (15 municipios). El resto del pais es todo lo demas.
"""

from __future__ import annotations

import json
from pathlib import Path

import polars as pl

import colombia_open as co

YEAR_MIN = 2018
YEAR_MAX = 2025
BIG_CITY_POP_THRESHOLD = 500_000
BIG_CITY_REFERENCE_YEAR = 2025

ZOOM_CITIES = {
    "11001": "Bogota",
    "05001": "Medellin",
    "76001": "Cali",
    "08001": "Barranquilla",
    "13001": "Cartagena",
}

# Las 15 grandes ciudades (umbral de poblacion >=500k en 2025), para la tasa
# de homicidios por ciudad (escena "Cali es la excepcion"). Códigos y nombres
# verificados contra el dataset `municipios` de colombia-open.
BIG_CITY_SLUGS = {
    "11001": "Bogota",
    "05001": "Medellin",
    "76001": "Cali",
    "08001": "Barranquilla",
    "13001": "Cartagena",
    "25754": "Soacha",
    "54001": "Cucuta",
    "08758": "Soledad",
    "68001": "Bucaramanga",
    "20001": "Valledupar",
    "05088": "Bello",
    "50001": "Villavicencio",
    "47001": "SantaMarta",
    "23001": "Monteria",
    "73001": "Ibague",
}

OUT_DIR = Path(__file__).resolve().parent.parent / "site" / "data"

FUENTE = (
    "Policia Nacional de Colombia / Ministerio de Defensa, via colombia-open "
    "(github.com/davidcasr/colombia-open). Poblacion: DANE (proyecciones "
    "pos-censo 2018)."
)


def load_population(client: co.ColombiaOpen) -> pl.DataFrame:
    dem = client.load_polars("demografia")
    dem = dem.filter(pl.col("area_geografica") == "Total")
    return dem.select(["cod_mpio", "anio", "poblacion"])


def big_city_codes(pop: pl.DataFrame) -> list[str]:
    ref = pop.filter(
        (pl.col("anio") == BIG_CITY_REFERENCE_YEAR)
        & (pl.col("poblacion") >= BIG_CITY_POP_THRESHOLD)
    )
    return ref["cod_mpio"].unique().to_list()


def yearly_counts(df: pl.DataFrame) -> pl.DataFrame:
    return (
        df.filter(pl.col("anio").is_between(YEAR_MIN, YEAR_MAX))
        .group_by(["cod_mpio", "anio"])
        .agg(pl.col("cantidad").sum().alias("casos"))
    )


def rate_by_group(counts: pl.DataFrame, pop: pl.DataFrame, big_cities: list[str]) -> pl.DataFrame:
    """Tasa nacional + por grupo (grandes_ciudades / resto_pais) por anio."""
    joined = counts.join(pop, on=["cod_mpio", "anio"], how="inner")
    joined = joined.with_columns(
        pl.when(pl.col("cod_mpio").is_in(big_cities))
        .then(pl.lit("grandes_ciudades"))
        .otherwise(pl.lit("resto_pais"))
        .alias("grupo")
    )

    por_grupo = joined.group_by(["grupo", "anio"]).agg(
        pl.col("casos").sum().alias("casos"),
        pl.col("poblacion").sum().alias("poblacion"),
    )
    nacional = joined.group_by("anio").agg(
        pl.col("casos").sum().alias("casos"),
        pl.col("poblacion").sum().alias("poblacion"),
    ).with_columns(pl.lit("nacional").alias("grupo"))

    out = pl.concat([por_grupo, nacional.select(por_grupo.columns)])
    out = out.with_columns(
        (pl.col("casos") / pl.col("poblacion") * 100_000).round(1).alias("tasa_100k")
    )
    return out.sort(["grupo", "anio"])


def rate_by_city(counts: pl.DataFrame, pop: pl.DataFrame, city_map: dict[str, str]) -> pl.DataFrame:
    joined = counts.filter(pl.col("cod_mpio").is_in(list(city_map))).join(
        pop, on=["cod_mpio", "anio"], how="inner"
    )
    joined = joined.with_columns(
        pl.col("cod_mpio").replace(city_map).alias("ciudad"),
        (pl.col("casos") / pl.col("poblacion") * 100_000).round(1).alias("tasa_100k"),
    )
    return joined.select(["ciudad", "anio", "tasa_100k"]).sort(["ciudad", "anio"])


def big_city_rate_series(counts: pl.DataFrame, pop: pl.DataFrame, big_cities: list[str]) -> pl.DataFrame:
    joined = counts.filter(pl.col("cod_mpio").is_in(big_cities)).join(
        pop, on=["cod_mpio", "anio"], how="inner"
    )
    agg = joined.group_by("anio").agg(
        pl.col("casos").sum().alias("casos"),
        pl.col("poblacion").sum().alias("poblacion"),
    )
    agg = agg.with_columns((pl.col("casos") / pl.col("poblacion") * 100_000).alias("tasa_100k"))
    return agg.sort("anio")


def write_json(data, name: str) -> None:
    path = OUT_DIR / name
    path.write_text(json.dumps(data, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"escrito {path} ({len(data)} registros)" if isinstance(data, list) else f"escrito {path}")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    client = co.ColombiaOpen()

    pop = load_population(client)
    big_cities = big_city_codes(pop)
    if set(big_cities) != set(BIG_CITY_SLUGS):
        raise RuntimeError(
            "BIG_CITY_SLUGS desactualizado: las 15 grandes ciudades "
            f"calculadas ({sorted(big_cities)}) no coinciden con el mapa "
            f"fijo ({sorted(BIG_CITY_SLUGS)}). Actualiza BIG_CITY_SLUGS."
        )

    homicidios = yearly_counts(client.load_polars("delincuencia_homicidios"))
    hurto = yearly_counts(client.load_polars("delincuencia_hurto_personas"))
    lesiones = yearly_counts(client.load_polars("delincuencia_lesiones_personales"))

    # 1) tasas_por_grupo.json -- nacional / grandes_ciudades / resto_pais por
    #    delito. Alimenta los pasos 1-2 (homicidios), 4-5 (hurto) y 7
    #    (lesiones como control: casi no hay brecha entre grupos). El grupo
    #    resto_pais de homicidios tambien es la linea de referencia del
    #    paso 3 (small multiples por ciudad).
    grupo_rows = []
    for delito, counts in (
        ("homicidios", homicidios),
        ("hurto", hurto),
        ("lesiones", lesiones),
    ):
        rows = rate_by_group(counts, pop, big_cities).to_dicts()
        for row in rows:
            row["delito"] = delito
        grupo_rows.extend(rows)
    write_json(grupo_rows, "tasas_por_grupo.json")

    # 2) tasa_hurto_top_ciudades.json -- paso 6
    hurto_top = rate_by_city(hurto, pop, ZOOM_CITIES)
    write_json(hurto_top.to_dicts(), "tasa_hurto_top_ciudades.json")

    # 2b) tasa_homicidios_ciudades.json -- escena "Cali es la excepcion":
    #     tasa de homicidios de las 15 grandes ciudades (misma metodologia y
    #     poblacion DANE que el resto de tasas), para contrastar cada una
    #     contra la linea de referencia del resto del pais.
    homicidios_ciudades = rate_by_city(homicidios, pop, BIG_CITY_SLUGS)
    write_json(homicidios_ciudades.to_dicts(), "tasa_homicidios_ciudades.json")

    # 3) indices_comparados_grandes_ciudades.json -- paso 8 (resumen)
    series = {
        "homicidios": big_city_rate_series(homicidios, pop, big_cities),
        "hurto": big_city_rate_series(hurto, pop, big_cities),
        "lesiones": big_city_rate_series(lesiones, pop, big_cities),
    }
    indices_rows = []
    for delito, serie in series.items():
        base = serie.filter(pl.col("anio") == YEAR_MIN)["tasa_100k"][0]
        serie = serie.with_columns(
            (pl.col("tasa_100k") / base * 100).round(1).alias("indice"),
            pl.col("tasa_100k").round(1),
        )
        for row in serie.select(["anio", "tasa_100k", "indice"]).to_dicts():
            row["delito"] = delito
            indices_rows.append(row)
    write_json(indices_rows, "indices_comparados_grandes_ciudades.json")

    # 4) meta.json -- metodologia y fuente para el pie de la pieza
    mun = client.load_polars("municipios").select(["cod_mpio", "nombre_mpio", "nombre_dpto"])
    ciudades_meta = (
        pop.filter((pl.col("anio") == BIG_CITY_REFERENCE_YEAR) & (pl.col("cod_mpio").is_in(big_cities)))
        .join(mun, on="cod_mpio")
        .sort("poblacion", descending=True)
        .select(["nombre_mpio", "nombre_dpto", "poblacion"])
        .to_dicts()
    )
    meta = {
        "fuente": FUENTE,
        "anio_min": YEAR_MIN,
        "anio_max": YEAR_MAX,
        "umbral_grandes_ciudades": BIG_CITY_POP_THRESHOLD,
        "anio_referencia_poblacion": BIG_CITY_REFERENCE_YEAR,
        "n_grandes_ciudades": len(big_cities),
        "grandes_ciudades": ciudades_meta,
    }
    write_json(meta, "meta.json")


if __name__ == "__main__":
    main()
