"""Acquire manifest-listed inputs with atomic downloads and explicit first-use hash recording."""

import hashlib
import http.client
import re
import shutil
import stat
import tempfile
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import Request, urlopen

import yaml

from .constants import CONFIG, ROOT

USER_AGENT = "Visceral/0.1 (research data acquisition; https://github.com/narowtow/visceral)"
CHUNK_SIZE = 1024 * 1024
TRANSIENT_HTTP = {408, 425, 429, 500, 502, 503, 504}


@dataclass(frozen=True)
class SourceFile:
    group: str
    name: str
    url: str
    path: Path
    sha256: str | None


@dataclass
class AcquisitionResult:
    source: SourceFile
    status: str
    size: int = 0
    sha256: str | None = None
    detail: str = ""


def filename(url):
    """Keep the complete URL basename, excluding its query and fragment."""
    name = unquote(PurePosixPath(urlsplit(url).path).name)
    if not name or name in {".", ".."} or any(c in name for c in "/\\:"):
        raise ValueError(f"Unsafe source filename: {url}")
    return name


def _entries(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from _entries(child)
    elif isinstance(value, list):
        for child in value:
            yield from _entries(child)
    else:
        raise TypeError("Source files must be URLs in a mapping or list")


def source_files(manifest, root=ROOT, who=False, bodyparts3d=False):
    """No flags selects both sources; validate the entire plan before any network access."""
    root = Path(root).resolve()
    all_sources = not who and not bodyparts3d
    groups = []
    if who or all_sources:
        groups.append(("who_ghe_2023", "pipeline/data/raw/who_ghe2023"))
    if bodyparts3d or all_sources:
        groups.append(("bodyparts3d_4_0", "assets/source/bodyparts3d"))
    planned = []
    seen = set()
    for group, default in groups:
        source = manifest[group]
        directory = (root / source.get("local_dir", default)).resolve()
        if not directory.is_relative_to(root):
            raise ValueError(f"Source directory escapes workspace: {directory}")
        for entry in _entries(source["files"]):
            url = source["base_url"].rstrip("/") + "/" + entry
            if urlsplit(url).scheme not in {"http", "https"}:
                raise ValueError(f"Unsupported source URL: {url}")
            name = filename(url)
            digest = source["sha256"][name]
            if digest is not None and not re.fullmatch(r"[0-9a-fA-F]{64}", digest):
                raise ValueError(f"Invalid SHA-256 for {group}/{name}")
            path = directory / name
            if str(path).casefold() in seen or not path.resolve().is_relative_to(root):
                raise ValueError(f"Duplicate or unsafe source path: {path}")
            seen.add(str(path).casefold())
            planned.append(SourceFile(group, name, url, path, digest.lower() if digest else None))
    return planned


def file_hash(path):
    with Path(path).open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def download(source, force=False, attempts=3):
    """Stream each attempt to a sibling temp file; a mismatch never replaces an existing file."""
    if not force and source.sha256 and source.path.is_file() and file_hash(source.path) == source.sha256:
        return AcquisitionResult(source, "SKIPPED", source.path.stat().st_size, source.sha256)
    source.path.parent.mkdir(parents=True, exist_ok=True)
    request = Request(source.url, headers={"User-Agent": USER_AGENT})
    for attempt in range(attempts):
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(
                dir=source.path.parent, prefix=".download-", delete=False
            ) as out:
                temporary = Path(out.name)
                digest = hashlib.sha256()
                size = 0
                with urlopen(request, timeout=60) as response:
                    while chunk := response.read(CHUNK_SIZE):
                        digest.update(chunk)
                        out.write(chunk)
                        size += len(chunk)
                    length = response.headers.get("Content-Length")
                    if length is not None and size != int(length):
                        raise http.client.IncompleteRead(b"", max(0, int(length) - size))
            actual = digest.hexdigest()
            if not size:
                raise ValueError(f"Empty response for {source.name}")
            if source.sha256 is not None and actual != source.sha256:
                raise ValueError(f"SHA-256 mismatch: expected {source.sha256}, received {actual}")
            if source.path.suffix.lower() == ".zip" and not zipfile.is_zipfile(temporary):
                raise ValueError(f"Response is not a ZIP archive: {source.name}")
            temporary.replace(source.path)
            return AcquisitionResult(source, "DOWNLOADED", size, actual)
        except (HTTPError, URLError, TimeoutError, ConnectionError, http.client.HTTPException) as error:
            if isinstance(error, HTTPError) and error.code not in TRANSIENT_HTTP:
                raise
            if attempt + 1 == attempts:
                raise
            delay = 2**attempt
            print(f"Retry {attempt + 1}/{attempts - 1}: {source.name}: {error}; waiting {delay}s", flush=True)
            time.sleep(delay)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
    raise ValueError("Download needs at least one attempt")


def _archive_parts(info, stem):
    name = info.filename
    parts = name.rstrip("/").split("/")
    mode = stat.S_IFMT(info.external_attr >> 16)
    if (
        not name
        or name.startswith("/")
        or "\\" in name
        or any(p in {"", ".", ".."} or ":" in p for p in parts)
        or mode not in {0, stat.S_IFREG, stat.S_IFDIR}
    ):
        raise ValueError(f"Unsafe ZIP member: {name}")
    # Archives with a top-level tree directory and flat archives produce the same layout.
    if parts[:2] == ["obj", stem]:
        parts = parts[2:]
    elif parts[0] == stem:
        parts = parts[1:]
    return parts


def extract_objects(archive):
    """Stage and CRC-check ZIP contents before publishing into obj/<archive stem>/."""
    archive = Path(archive)
    root = archive.parent.resolve()
    destination = root / "obj" / archive.stem
    if not destination.resolve().is_relative_to(root):
        raise ValueError("OBJ destination escapes source directory")
    with zipfile.ZipFile(archive) as zipped:
        members = []
        seen = set()
        for info in zipped.infolist():
            parts = _archive_parts(info, archive.stem)
            if not parts or info.is_dir():
                continue
            relative = Path(*parts)
            key = str(relative).casefold()
            if key in seen:
                raise ValueError(f"Duplicate ZIP member: {info.filename}")
            seen.add(key)
            if relative.suffix.lower() == ".obj" and len(parts) != 1:
                raise ValueError(f"Unexpected nested OBJ layout: {info.filename}")
            target = destination / relative
            if not target.resolve().is_relative_to(root):
                raise ValueError(f"ZIP target escapes source directory: {info.filename}")
            members.append((info, relative))
        objects = sum(relative.suffix.lower() == ".obj" for _, relative in members)
        if not objects:
            raise ValueError(f"No OBJ elements in {archive.name}")
        with tempfile.TemporaryDirectory(dir=root, prefix=".extract-") as stage:
            stage = Path(stage)
            for info, relative in members:
                target = stage / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                with zipped.open(info) as source, target.open("wb") as out:
                    shutil.copyfileobj(source, out, length=CHUNK_SIZE)
            for _, relative in members:
                target = destination / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                (stage / relative).replace(target)
    return objects


def record_hash(manifest_path, group, name, digest):
    """Replace only an explicit null scalar, preserving citations, comments and existing pins."""
    path = Path(manifest_path)
    text = path.read_text(encoding="utf-8")
    node = yaml.compose(text)
    for key in [group, "sha256", name]:
        node = next(value for field, value in node.value if field.value == key)
    if node.tag != "tag:yaml.org,2002:null":
        if node.value == digest:
            return
        raise ValueError(f"Refusing to change a known hash for {name}")
    updated = text[: node.start_mark.index] + f'"{digest}"' + text[node.end_mark.index :]
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as out:
            temporary = Path(out.name)
            out.write(updated)
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    print(
        f"RECORDED first-use SHA-256 for {group}/{name}: {digest}. "
        "No prior trusted hash was available; review and commit sources.yaml.",
        flush=True,
    )


def print_summary(results):
    rows = [(r.source.group, r.source.name, r.status, str(r.size), r.sha256 or "-") for r in results]
    headers = ("Source", "File", "Status", "Bytes", "SHA-256")
    widths = [max(len(row[i]) for row in [headers, *rows]) for i in range(len(headers))]
    print("\n" + "  ".join(value.ljust(width) for value, width in zip(headers, widths)))
    print("  ".join("-" * width for width in widths))
    for result, row in zip(results, rows):
        print("  ".join(value.ljust(width) for value, width in zip(row, widths)))
        if result.detail:
            print(f"  {result.source.name}: {result.detail}")
    print(
        f"\n{len(results)} files; {sum(r.size for r in results):,} bytes present; "
        f"{sum(r.status == 'FAILED' for r in results)} failed."
    )


def acquire(who=False, bodyparts3d=False, force=False, manifest_path=CONFIG / "sources.yaml", root=ROOT):
    manifest_path = Path(manifest_path)
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    plan = source_files(manifest, root=root, who=who, bodyparts3d=bodyparts3d)
    results = []
    for source in plan:
        try:
            print(f"Acquiring {source.group}/{source.name}", flush=True)
            result = download(source, force=force)
            if source.group == "bodyparts3d_4_0" and source.path.suffix.lower() == ".zip":
                count = extract_objects(source.path)
                result.detail = f"Extracted {count:,} OBJ elements into obj/{source.path.stem}/"
            if source.sha256 is None:
                record_hash(manifest_path, source.group, source.name, result.sha256)
                result.status = "RECORDED"
            results.append(result)
        except (OSError, ValueError, RuntimeError, zipfile.BadZipFile, http.client.HTTPException) as error:
            results.append(AcquisitionResult(source, "FAILED", detail=str(error)))
    print_summary(results)
    return results
