"""Stable ids and checkout-relative paths shared by pipeline stages."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PIPELINE = ROOT / "pipeline"
RAW = PIPELINE / "data/raw/who_ghe2023"
INTERIM = PIPELINE / "data/interim"
CONFIG = PIPELINE / "config"
YEARS = [2000, 2010, 2015, 2019, 2020, 2021, 2022, 2023]
SEXES = {"Persons": "both", "Males": "male", "Females": "female"}
AGES = {
    "All ages": "all",
    "0-4": "0_4",
    "5-14": "5_14",
    "15-29": "15_29",
    "30-49": "30_49",
    "50-59": "50_59",
    "60-69": "60_69",
    "70+": "70_plus",
}
MEASURES = ["deaths", "dalys"]
