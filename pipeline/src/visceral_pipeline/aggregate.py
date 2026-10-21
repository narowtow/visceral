"""DuckDB aggregation. Missing components propagate; world totals precede rate division."""

import pandas as pd

from .standardize import load_weights


def aggregate(con, mapping, organs):
    con.register("cause_map", mapping)
    con.register("organ_ids", pd.DataFrame({"organ": organs}))
    con.register("standard_weights", pd.DataFrame(load_weights().items(), columns=["age_group", "weight"]))
    con.execute("""
        CREATE OR REPLACE TABLE population_world AS
        SELECT * FROM population UNION ALL
        SELECT year, 'WLD' AS location, sex, age_group,
               CASE WHEN count(population)=count(*) THEN sum(population) END AS population
        FROM population GROUP BY year, sex, age_group;
        CREATE OR REPLACE TABLE primary_counts AS
        SELECT o.*, m.organ FROM observations o JOIN cause_map m ON o.cause_code=m.code
        WHERE m.relation='primary';
        CREATE OR REPLACE TABLE primary_world AS
        SELECT * FROM primary_counts UNION ALL
        SELECT measure,year,'WLD' AS location,sex,age_group,cause_code,
               CASE WHEN count(value)=count(*) THEN sum(value) END AS value,organ
        FROM primary_counts GROUP BY measure,year,sex,age_group,cause_code,organ;
        CREATE OR REPLACE TABLE organ_counts AS
        SELECT measure,year,location,sex,age_group,organ,
               CASE WHEN count(value)=count(*) THEN sum(value) END AS count
        FROM primary_world GROUP BY ALL;
        CREATE OR REPLACE TABLE organ_rates AS
        SELECT d.measure,p.year,p.location,p.sex,p.age_group,g.organ,
               CASE WHEN m.n IS NULL THEN 0 ELSE c.count END AS count,
               (CASE WHEN m.n IS NULL THEN 0 ELSE c.count END)/nullif(p.population,0)*100000 AS rate
        FROM population_world p
        CROSS JOIN (SELECT DISTINCT measure FROM observations) d CROSS JOIN organ_ids g
        LEFT JOIN (SELECT organ,count(*) AS n FROM cause_map WHERE relation='primary' GROUP BY organ) m
          ON m.organ=g.organ
        LEFT JOIN organ_counts c ON c.measure=d.measure AND c.year=p.year AND c.location=p.location
          AND c.sex=p.sex AND c.age_group=p.age_group AND c.organ=g.organ;
        CREATE OR REPLACE TABLE standardized AS
        SELECT measure,year,location,sex,organ,
               CASE WHEN count(r.rate)=7 THEN sum(r.rate*w.weight) END AS ageStdRate
        FROM organ_rates r JOIN standard_weights w USING(age_group) GROUP BY ALL;
        CREATE OR REPLACE TABLE published_organ_asdr AS
        WITH sums AS (
          SELECT r.year,r.location,r.sex,m.organ,
            CASE WHEN count(r.value)=count(*) THEN sum(r.value) END AS published_sum
          FROM reference_rates r JOIN cause_map m ON r.cause_code=m.code
          WHERE r.measure='ASDR' AND m.relation='primary'
            AND r.year IN (SELECT DISTINCT year FROM observations)
          GROUP BY ALL)
        SELECT k.year,k.location,k.sex,g.organ,
          CASE WHEN m.n IS NULL THEN 0 ELSE s.published_sum END AS published_sum
        FROM (SELECT DISTINCT year,location,sex FROM reference_rates WHERE measure='ASDR'
              AND year IN (SELECT DISTINCT year FROM observations)) k CROSS JOIN organ_ids g
        LEFT JOIN (SELECT organ,count(*) AS n FROM cause_map WHERE relation='primary' GROUP BY organ) m
          ON m.organ=g.organ
        LEFT JOIN sums s ON s.year=k.year AND s.location=k.location AND s.sex=k.sex AND s.organ=g.organ;
        CREATE OR REPLACE TABLE deaths_asdr_method_comparison AS
        SELECT b.location,b.year,b.sex,b.organ,p.published_sum,b.ageStdRate AS broad_bin,
          b.ageStdRate-p.published_sum AS diff,
          (b.ageStdRate-p.published_sum)/nullif(p.published_sum,0) AS rel_diff
        FROM standardized b LEFT JOIN published_organ_asdr p USING(year,location,sex,organ)
        WHERE b.measure='deaths' AND b.location!='WLD';
        CREATE OR REPLACE TABLE organ_burden AS
        SELECT r.*, CASE WHEN r.age_group='all' THEN
          CASE WHEN r.measure='deaths' AND r.location!='WLD' THEN p.published_sum
               ELSE s.ageStdRate END END AS ageStdRate
        FROM organ_rates r LEFT JOIN standardized s
        ON r.measure=s.measure AND r.year=s.year
          AND r.location=s.location AND r.sex=s.sex AND r.organ=s.organ
        LEFT JOIN published_organ_asdr p ON r.year=p.year AND r.location=p.location
          AND r.sex=p.sex AND r.organ=p.organ;
        CREATE OR REPLACE TABLE top_causes AS
        SELECT c.*, c.value/nullif(p.population,0)*100000 AS rate,
          row_number() OVER (PARTITION BY measure,c.year,c.location,c.sex,organ
                             ORDER BY value DESC NULLS LAST,cause_code) AS rank
        FROM primary_world c JOIN population_world p USING(year,location,sex,age_group)
        WHERE c.age_group='all' AND c.value>0
        QUALIFY rank<=5;
    """)
