"""Write pandas frames to parquet through DuckDB, without pyarrow."""


def copy_parquet(con, frame, path):
    con.register("frame_to_cache", frame)
    try:
        con.execute("COPY frame_to_cache TO ? (FORMAT parquet, COMPRESSION zstd)", [str(path)])
    finally:
        con.unregister("frame_to_cache")
