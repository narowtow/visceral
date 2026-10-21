"""Blender-independent source resolution, coordinate helpers and GLB validation."""

from __future__ import annotations

import csv
import json
import math
import re
import struct
from dataclasses import dataclass
from pathlib import Path

Point = tuple[float, float, float]
Bounds = tuple[Point, Point]


def read_tsv(path: Path, expected: tuple[str, ...]) -> list[list[str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle, delimiter="\t")
        header = tuple(cell.strip().lower() for cell in next(reader, []))
        if header != expected:
            raise ValueError(f"Unexpected columns in {path}: {header}")
        rows = []
        for line, row in enumerate(reader, start=2):
            if not row or not any(cell.strip() for cell in row):
                continue
            if len(row) != len(expected):
                raise ValueError(f"Malformed TSV row: {path}:{line}")
            rows.append([cell.strip() for cell in row])
    return rows


@dataclass
class SourceTables:
    root: Path
    tree: str
    elements: dict[str, list[str]]
    names: dict[str, str]

    @classmethod
    def load(cls, root: Path, tree: str) -> SourceTables:
        if tree not in {"partof", "isa"}:
            raise ValueError(f"Unknown source tree: {tree}")
        names = {}
        for concept, _representation, name in read_tsv(
            root / f"{tree}_parts_list_e.txt", ("concept id", "representation id", "en")
        ):
            names[concept] = name
        elements: dict[str, list[str]] = {}
        for concept, name, element in read_tsv(
            root / f"{tree}_element_parts.txt", ("concept id", "name", "element file id")
        ):
            if not re.fullmatch(r"FMA\d+", concept) or not re.fullmatch(r"FJ\d+[A-Z]*", element):
                raise ValueError(f"Invalid concept/element ID in {tree}: {concept}, {element}")
            names.setdefault(concept, name)
            entries = elements.setdefault(concept, [])
            if element not in entries:
                entries.append(element)
        return cls(root, tree, elements, names)

    def element_path(self, element: str) -> Path:
        if not re.fullmatch(r"FJ\d+[A-Z]*", element):
            raise ValueError(f"Invalid element file ID: {element}")
        return self.root / "obj" / f"{self.tree}_BP3D_4.0_obj_99" / f"{element}.obj"

    def resolve(self, specification: dict) -> tuple[list[str], list[str], list[str]]:
        concepts = list(specification["concepts"])
        warnings = []
        for name in specification.get("optionalConceptNames", []):
            matches = sorted(cid for cid, label in self.names.items() if label.casefold() == name.casefold())
            if not matches:
                warnings.append(f"Optional concept absent from {self.tree} tables: {name}")
            concepts.extend(matches)
        concepts = list(dict.fromkeys(concepts))
        for concept in concepts:
            if not self.elements.get(concept):
                raise ValueError(f"No ELEMENT mapping for {self.tree}:{concept} ({self.names.get(concept, 'unknown')})")
        elements = list(dict.fromkeys(element for concept in concepts for element in self.elements[concept]))
        return concepts, elements, warnings


def web_point(point: Point) -> Point:
    x, y, z = point
    return x / 1000, z / 1000, -y / 1000


def resolve_sources(specification: dict, tables: dict[str, SourceTables]) -> dict:
    """Union explicit concepts across trees, preferring the first copy of an ELEMENT."""
    sources = [specification, *specification.get("additionalSources", [])]
    paths = {}
    concepts = []
    warnings = []
    provenance = []
    for source in sources:
        table = tables[source["tree"]]
        resolved_concepts, elements, notes = table.resolve(source)
        concepts.extend(resolved_concepts)
        warnings.extend(notes)
        provenance.append({"tree": table.tree, "concepts": resolved_concepts, "element_ids": elements})
        for element in elements:
            paths.setdefault(element, table.element_path(element))
    return {
        "concepts": list(dict.fromkeys(concepts)), "elements": list(paths),
        "files": list(paths.values()), "warnings": warnings, "sources": provenance,
    }


def union_bounds(bounds: list[Bounds]) -> Bounds:
    if not bounds:
        raise ValueError("Cannot calculate bounds of empty geometry")
    return (
        tuple(min(box[0][axis] for box in bounds) for axis in range(3)),
        tuple(max(box[1][axis] for box in bounds) for axis in range(3)),
    )


def web_bounds(bounds: Bounds) -> Bounds:
    low, high = bounds
    return (low[0] / 1000, low[2] / 1000, -high[1] / 1000), (high[0] / 1000, high[2] / 1000, -low[1] / 1000)


def centering_offset(bounds: Bounds) -> Point:
    low, high = bounds
    return -(low[0] + high[0]) / 2, -low[1], -(low[2] + high[2]) / 2


def obj_header_bounds(path: Path) -> Bounds:
    # Stop at the first geometry line; never scan a huge OBJ just for its header.
    with path.open(encoding="utf-8-sig") as handle:
        for line in handle:
            if line.startswith("# Bounds(mm):"):
                values = [float(value) for value in re.findall(r"[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?", line.split(":", 1)[1])]
                if len(values) != 6 or not all(math.isfinite(value) for value in values):
                    break
                bounds = tuple(values[:3]), tuple(values[3:])
                if any(bounds[0][axis] > bounds[1][axis] for axis in range(3)):
                    break
                return bounds
            if line.strip() and not line.startswith("#"):
                break
    raise ValueError(f"Missing or malformed Bounds(mm) header: {path}")


def validate_source_map(nodes: dict, contract: dict) -> dict[str, str]:
    owners = {name: organ["id"] for organ in contract["organs"] if organ["modeled"] for name in organ["meshNames"]}
    if set(nodes) != set(owners):
        raise ValueError(f"Source map differs from modeled meshNames. Missing: {sorted(set(owners) - set(nodes))}; extra: {sorted(set(nodes) - set(owners))}")
    for name, spec in nodes.items():
        if spec.get("stylized"):
            if name != "thyroid" or spec.get("tree") is not None or spec.get("concepts") != []:
                raise ValueError(f"Invalid stylized source: {name}")
        elif spec.get("tree") not in {"partof", "isa"} or not spec.get("concepts"):
            raise ValueError(f"Missing tree or concepts for {name}")
        for source in spec.get("additionalSources", []):
            if source.get("tree") not in {"partof", "isa"} or not source.get("concepts"):
                raise ValueError(f"Missing additional tree or concepts for {name}")
        if spec.get("split") not in {None, "positive_x", "negative_x"}:
            raise ValueError(f"Invalid split for {name}")
    return owners


def inspect_glb(path: Path, required: set[str]) -> dict:
    with path.open("rb") as handle:
        magic, version, length = struct.unpack("<4sII", handle.read(12))
        if magic != b"glTF" or version != 2 or length != path.stat().st_size:
            raise ValueError(f"Invalid GLB header: {path}")
        chunk_length, chunk_type = struct.unpack("<I4s", handle.read(8))
        if chunk_type != b"JSON":
            raise ValueError(f"GLB JSON chunk missing: {path}")
        document = json.loads(handle.read(chunk_length))
    mesh_nodes = [node for node in document.get("nodes", []) if "mesh" in node]
    names = [node.get("name") for node in mesh_nodes]
    if set(names) != required or len(names) != len(required):
        raise ValueError(f"Exported mesh node names differ from contract: {names}")
    if document.get("cameras") or document.get("extensions", {}).get("KHR_lights_punctual"):
        raise ValueError("Unexpected cameras or lights in anatomy GLB")
    if document.get("textures") or document.get("images"):
        raise ValueError("Unexpected textures in neutral anatomy GLB")
    for node in mesh_nodes:
        extras = node.get("extras", {})
        if not extras.get("organ_id") or "source_concepts" not in extras or "stylized" not in extras:
            raise ValueError(f"Missing provenance extras for {node.get('name')}")
        if node["name"] == "thyroid" and extras["stylized"] is not True:
            raise ValueError("Thyroid must be marked stylized")
        primitives = document["meshes"][node["mesh"]]["primitives"]
        if not primitives or any(not document["accessors"][p["attributes"]["POSITION"]]["count"] for p in primitives):
            raise ValueError(f"Empty exported mesh: {node['name']}")
    return document
