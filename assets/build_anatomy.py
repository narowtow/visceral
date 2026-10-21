"""Build contract-named BodyParts3D meshes in Blender 5.x (no downloads).

blender --background --factory-startup --python assets/build_anatomy.py -- \
    --source assets/source/bodyparts3d --out assets/build/visceral.raw.glb
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys
import traceback

# Blender does not consistently add the --python script's directory to sys.path.
ASSET_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ASSET_DIR))
from anatomy_sources import (  # noqa: E402
    SourceTables,
    centering_offset,
    inspect_glb,
    obj_header_bounds,
    resolve_sources,
    union_bounds,
    validate_source_map,
    web_bounds,
)

# Hard ceilings, not targets that would require adding artificial detail.
TRIANGLE_BUDGETS = {
    "brain": 15000, "heart": 12000,
    "lung_left": 8000, "lung_right": 8000, "trachea": 8000,
    "liver": 12000, "stomach": 6000, "esophagus": 2500,
    "pancreas": 4500, "gallbladder": 2500,
    "kidney_left": 5000, "kidney_right": 5000,
    "bladder": 3500, "prostate": 2500,
    "small_intestine": 10000, "colon": 10000, "rectum": 2500,
    "eye_left": 2000, "eye_right": 2000,
    "ear_left": 3000, "ear_right": 3000,
    "testis_left": 2000, "testis_right": 2000,
    "thyroid": 1500, "skin": 25000, "skeleton": 60000,
}


def progress(message: str) -> None:
    print(f"[anatomy] {message}", flush=True)


def write_report(path: Path, report: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def preflight(source: Path, nodes: dict, budgets: dict, report: dict) -> dict:
    tables = {tree: SourceTables.load(source, tree) for tree in ("partof", "isa")}
    resolved = {}
    errors = []
    for name, specification in nodes.items():
        entry = {
            "source_tree": specification["tree"], "source_concepts": [],
            "element_ids": [], "element_count": 0, "missing_elements": [],
            "stylized": bool(specification.get("stylized")),
            "triangle_budget": budgets[name], "triangles": None, "bounds_m": None,
            "warnings": [], "notes": specification.get("notes", ""),
        }
        if specification.get("derived"):
            entry["derived"] = specification["derived"]
        report["nodes"][name] = entry
        try:
            if entry["stylized"]:
                resolved[name] = {"files": [], "entry": entry}
                placement = specification.get("placement")
                if placement:
                    try:
                        table = tables[placement["tree"]]
                        concepts, elements, _warnings = table.resolve(placement)
                        anchor = union_bounds([web_bounds(obj_header_bounds(table.element_path(e))) for e in elements])
                        resolved[name]["anchor"] = anchor
                        entry["placement_concepts"] = concepts
                    except (ValueError, OSError) as error:
                        entry["warnings"].append(f"Cartilage reference unavailable; using trachea bounds: {error}")
                continue
            union = resolve_sources(specification, tables)
            concepts, elements, files = union["concepts"], union["elements"], union["files"]
            entry.update(
                source_tree="mixed" if len(union["sources"]) > 1 else specification["tree"],
                sources=union["sources"], source_concepts=concepts, element_ids=elements,
                element_count=len(elements), warnings=union["warnings"],
            )
            entry["missing_elements"] = [element for element, path in zip(elements, files) if not path.is_file()]
            if entry["missing_elements"]:
                raise ValueError(f"Missing ELEMENT files: {entry['missing_elements']}")
            entry["source_bounds_mm"] = union_bounds([obj_header_bounds(path) for path in files])
            resolved[name] = {"files": files, "entry": entry}
            progress(f"Resolved {name}: {len(concepts)} concepts -> {len(elements)} elements ({entry['source_tree']})")
        except (ValueError, OSError) as error:
            entry["error"] = str(error)
            errors.append(f"{name}: {error}")
    if errors:
        raise ValueError("Source preflight failed:\n" + "\n".join(errors))
    return resolved


class AnatomyBuilder:
    def __init__(self) -> None:
        # Kept out of module scope so --validate-only and unit tests need no Blender.
        import bpy
        import bmesh
        from mathutils import Matrix

        self.bpy = bpy
        self.bmesh = bmesh
        self.Matrix = Matrix
        # Source OBJ axes are imported unchanged, then converted exactly once.
        self.to_web = Matrix(((.001, 0, 0, 0), (0, 0, .001, 0), (0, -.001, 0, 0), (0, 0, 0, 1)))

    def reset_scene(self) -> None:
        bpy = self.bpy
        if bpy.context.object and bpy.context.object.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)

    def activate(self, objects: list) -> None:
        self.bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.hide_set(False)
            obj.select_set(True)
        self.bpy.context.view_layer.objects.active = objects[0]

    def join(self, objects: list, name: str):
        if not objects:
            raise ValueError(f"{name}: no imported mesh objects")
        self.activate(objects)
        if len(objects) > 1:
            self.bpy.ops.object.join()
        obj = self.bpy.context.view_layer.objects.active
        obj.name = name
        obj.data.name = f"{name}_mesh"
        # Bake any importer/primitive object transforms into the mesh.
        obj.data.transform(obj.matrix_world)
        obj.matrix_world = self.Matrix.Identity(4)
        return obj

    def import_node(self, name: str, specification: dict, files: list[Path]):
        bpy = self.bpy
        objects = []
        for index, path in enumerate(files, start=1):
            progress(f"  {name}: import {index}/{len(files)} {path.name}")
            before = set(bpy.data.objects)
            # Blender's native axes: forward Y, up Z. Avoid the OBJ importer's
            # default Y-up interpretation of these explicitly Z-up source files.
            result = bpy.ops.wm.obj_import(
                filepath=str(path), forward_axis="Y", up_axis="Z",
                use_split_objects=False, use_split_groups=False,
                validate_meshes=True,
            )
            imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
            if "FINISHED" not in result or not imported:
                raise ValueError(f"{name}: OBJ import produced no mesh: {path}")
            objects.extend(imported)
        obj = self.join(objects, name)
        obj.data.transform(self.to_web)
        if side := specification.get("split"):
            bm = self.bmesh.new()
            try:
                bm.from_mesh(obj.data)
                discard = [v for v in bm.verts if (v.co.x < 0 if side == "positive_x" else v.co.x > 0)]
                self.bmesh.ops.delete(bm, geom=discard, context="VERTS")
                bm.to_mesh(obj.data)
            finally:
                bm.free()
        return obj

    @staticmethod
    def height_band(obj, bottom: float, top: float, center_x: float = 0, half_width: float = .2):
        points = [v.co for v in obj.data.vertices if bottom <= v.co.y <= top and abs(v.co.x - center_x) < half_width]
        if len(points) < 3:
            raise ValueError(f"{obj.name}: insufficient vertices in height band {bottom:.4f}–{top:.4f}")
        return tuple(tuple(fn(p[axis] for p in points) for axis in range(3)) for fn in (min, max))

    def thyroid(self, trachea, anchor):
        _low, high = self.bounds(trachea)
        # Cartilage supplies height only. The airway node also contains thoracic
        # bronchi: its global anterior bound is nowhere near the cervical tube.
        center_y = min(anchor[0][1] - .012, high[1] - .022) if anchor else high[1] - .022
        low, high = self.height_band(trachea, center_y - .019, center_y + .019)
        center_x = (low[0] + high[0]) / 2
        lateral_offset = (high[0] - low[0]) / 2 + .004
        # Lobes flank and hug the tube, rather than sitting entirely in front.
        lobe_z = high[2] - .003
        objects = []
        for side in (-1, 1):
            self.bpy.ops.mesh.primitive_uv_sphere_add(
                segments=24, ring_count=16, radius=1,
                location=(center_x + side * lateral_offset, center_y, lobe_z),
            )
            lobe = self.bpy.context.object
            lobe.scale = (.009, .019, .0075)
            lobe.rotation_euler[2] = side * math.radians(-12)
            objects.append(lobe)
        # Sample the airway again at the lower isthmus height. Its posterior
        # face sits 3 mm anterior to that local tracheal surface.
        isthmus_y = center_y - .005
        _low, bridge_airway = self.height_band(trachea, isthmus_y - .004, isthmus_y + .004)
        self.bpy.ops.mesh.primitive_uv_sphere_add(
            segments=24, ring_count=12, radius=1,
            location=(center_x, isthmus_y, bridge_airway[2] + .006),
        )
        bridge = self.bpy.context.object
        bridge.scale = (.016, .005, .003)
        objects.append(bridge)
        return self.join(objects, "thyroid")

    @staticmethod
    def skin_clearance(obj, skin, minimum: float = .0035) -> float:
        from mathutils import Vector
        from mathutils.bvhtree import BVHTree

        tree = BVHTree.FromPolygons(
            [vertex.co for vertex in skin.data.vertices],
            [polygon.vertices[:] for polygon in skin.data.polygons],
            all_triangles=True,
        )
        distances = []
        for vertex in obj.data.vertices:
            # Surface distance alone also accepts points outside the body.
            # Both rays must exit the enclosing skin, with outward normals.
            for direction in (Vector((0, 0, 1)), Vector((0, 0, -1))):
                hit, normal, _face, _distance = tree.ray_cast(vertex.co, direction)
                if hit is None or normal.dot(direction) <= 0:
                    raise ValueError(f"{obj.name}: vertex outside neck skin at {tuple(vertex.co)}")
            _point, _normal, _face, distance = tree.find_nearest(vertex.co)
            if distance is None or distance < minimum:
                raise ValueError(f"{obj.name}: skin clearance {distance} m is below {minimum} m")
            distances.append(distance)
        return min(distances)

    def lung_envelope(self, obj) -> None:
        # Direct voxel remeshing of sparse trees still leaves tubes. A hull of
        # their actual vertices bridges the gaps before 8 mm voxel smoothing.
        # This is an approximate outer envelope, not recovered lung parenchyma.
        bm = self.bmesh.new()
        try:
            for vertex in obj.data.vertices:
                bm.verts.new(vertex.co)
            self.bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
            loose = [vertex for vertex in bm.verts if not vertex.link_faces]
            self.bmesh.ops.delete(bm, geom=loose, context="VERTS")
            bm.to_mesh(obj.data)
        finally:
            bm.free()
        self.activate([obj])
        remesh = obj.modifiers.new(name="Envelope8mm", type="REMESH")
        remesh.mode = "VOXEL"
        remesh.voxel_size = .008
        remesh.use_smooth_shade = True
        self.bpy.ops.object.modifier_apply(modifier=remesh.name)
        smooth = obj.modifiers.new(name="RoundedEnvelope", type="SMOOTH")
        smooth.factor = .8
        smooth.iterations = 6
        self.bpy.ops.object.modifier_apply(modifier=smooth.name)
        # Round voxel corners before the final 8k reduction, rather than
        # exporting faceted hull edges or subdividing already-decimated faces.
        subdivision = obj.modifiers.new(name="EnvelopeCurvature", type="SUBSURF")
        subdivision.levels = 1
        self.bpy.ops.object.modifier_apply(modifier=subdivision.name)
        self.clean_mesh(obj)
        progress(f"  {obj.name}: derived closed envelope (8 mm voxels, 6 smoothing iterations)")

    def clean_mesh(self, obj) -> None:
        bm = self.bmesh.new()
        try:
            bm.from_mesh(obj.data)
            # Discard loose geometry, which must not inflate bounds or output size.
            loose = [v for v in bm.verts if not v.link_faces]
            if loose:
                self.bmesh.ops.delete(bm, geom=loose, context="VERTS")
            self.bmesh.ops.triangulate(bm, faces=list(bm.faces))
            self.bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
            bm.to_mesh(obj.data)
        finally:
            bm.free()
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        for layer in list(obj.data.uv_layers):
            obj.data.uv_layers.remove(layer)
        for attribute in list(obj.data.color_attributes):
            obj.data.color_attributes.remove(attribute)
        obj.data.update()
        if not obj.data.vertices or not obj.data.polygons:
            raise ValueError(f"{obj.name}: EMPTY mesh after import/split/cleanup")

    @staticmethod
    def triangle_count(obj) -> int:
        obj.data.calc_loop_triangles()
        return len(obj.data.loop_triangles)

    @staticmethod
    def bounds(obj):
        if not obj.data.vertices:
            raise ValueError(f"{obj.name}: empty vertex array")
        return (
            tuple(min(vertex.co[axis] for vertex in obj.data.vertices) for axis in range(3)),
            tuple(max(vertex.co[axis] for vertex in obj.data.vertices) for axis in range(3)),
        )

    def decimate(self, obj, budget: int) -> None:
        self.activate([obj])
        for attempt in range(3):
            count = self.triangle_count(obj)
            if count <= budget:
                return
            modifier = obj.modifiers.new(name="TriangleBudget", type="DECIMATE")
            modifier.decimate_type = "COLLAPSE"
            modifier.ratio = budget / count * .98
            modifier.use_collapse_triangulate = True
            progress(f"  {obj.name}: decimate {count:,} -> <= {budget:,} (pass {attempt + 1}, ratio {modifier.ratio:.5f})")
            self.bpy.ops.object.modifier_apply(modifier=modifier.name)
        if self.triangle_count(obj) > budget:
            raise ValueError(f"{obj.name}: unable to meet triangle budget {budget}")

    def neutral_material(self, obj) -> None:
        obj.data.materials.clear()
        material = self.bpy.data.materials.new(name=f"{obj.name}_neutral")
        material.diffuse_color = (.58, .64, .70, 1)
        material.use_nodes = True
        bsdf = material.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = material.diffuse_color
        bsdf.inputs["Roughness"].default_value = .6
        bsdf.inputs["Metallic"].default_value = 0
        obj.data.materials.append(material)
        for polygon in obj.data.polygons:
            polygon.material_index = 0

    def build(self, nodes: dict, resolved: dict, owners: dict, budgets: dict, report: dict, out: Path) -> None:
        self.reset_scene()
        objects = {}
        # The stylized thyroid uses the already transformed trachea for placement.
        order = [name for name in nodes if name != "thyroid"] + ["thyroid"]
        for number, name in enumerate(order, start=1):
            progress(f"[{number}/{len(order)}] Building {name}")
            entry = resolved[name]["entry"]
            try:
                obj = self.thyroid(objects["trachea"], resolved[name].get("anchor")) if entry["stylized"] else self.import_node(name, nodes[name], resolved[name]["files"])
                self.clean_mesh(obj)
                entry["triangles_before"] = self.triangle_count(obj)
                if entry.get("derived"):
                    self.lung_envelope(obj)
                    entry["envelope"] = {"method": "convex hull, voxel remesh, smooth, subdivision", "voxel_size_m": .008, "smooth_iterations": 6, "subdivision_levels": 1}
                entry["bounds_before_decimation_m"] = self.bounds(obj)
                self.decimate(obj, budgets[name])
                self.clean_mesh(obj)
                if self.triangle_count(obj) > budgets[name]:
                    raise ValueError(f"{name}: cleanup exceeded triangle budget")
                if name == "thyroid":
                    clearance = self.skin_clearance(obj, objects["skin"])
                    entry["placement"] = {
                        "reference": "local cervical trachea; cartilage height only",
                        "minimum_skin_clearance_m": clearance,
                        # Reserve 0.5 mm beyond the required margin for Meshopt quantization.
                        "required_skin_clearance_m": .0035,
                    }
                    obj["placement_reference"] = entry["placement"]["reference"]
                    progress(f"  thyroid: minimum neck-skin clearance {clearance * 1000:.2f} mm")
                self.neutral_material(obj)
                obj["organ_id"] = owners[name]
                # A JSON string is portable across Blender IDProperty versions;
                # the report also contains a native JSON array of these IDs.
                obj["source_concepts"] = json.dumps(entry["source_concepts"])
                obj["stylized"] = entry["stylized"]
                if entry.get("derived"):
                    obj["derived"] = entry["derived"]
                entry["triangles"] = self.triangle_count(obj)
                objects[name] = obj
                progress(f"  {name}: {entry['triangles']:,} triangles")
            except Exception as error:
                entry["error"] = str(error)
                raise RuntimeError(f"Failed building {name}: {error}") from error

        # One common translation, never per-organ centering: relative anatomical
        # positions must survive. Use final geometry so the emitted feet sit at 0.
        full_bounds = union_bounds([self.bounds(obj) for obj in objects.values()])
        offset = centering_offset(full_bounds)
        report["translation_m"] = offset
        from mathutils import Matrix

        for name, obj in objects.items():
            obj.data.transform(Matrix.Translation(offset))
            obj.data.update()
            report["nodes"][name]["bounds_m"] = self.bounds(obj)
        report["bounds_m"] = union_bounds([self.bounds(obj) for obj in objects.values()])
        report["total_triangles"] = sum(self.triangle_count(obj) for obj in objects.values())
        if set(objects) != set(owners):
            raise ValueError("Some modeled contract meshNames were not built")

        self.activate(list(objects.values()))
        out.parent.mkdir(parents=True, exist_ok=True)
        temporary = out.with_name(out.stem + ".tmp.glb")
        progress(f"Exporting {len(objects)} nodes, {report['total_triangles']:,} triangles -> {out}")
        result = self.bpy.ops.export_scene.gltf(
            filepath=str(temporary), export_format="GLB", export_extras=True,
            export_copyright=(
                "BodyParts3D 4.0, (c) The Database Center for Life Science; "
                "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). "
                "Modified for Visceral: grouped, transformed, decimated; derived lung "
                "envelopes from bronchial/vascular trees; stylized thyroid."
            ),
            use_selection=True, export_cameras=False, export_lights=False,
            export_animations=False, export_materials="EXPORT", export_normals=True,
            export_texcoords=False,
            # Vertices ALREADY use web/glTF axes. The exporter's default Y-up
            # conversion would rotate them a second time.
            export_yup=False,
        )
        if "FINISHED" not in result:
            raise RuntimeError(f"GLB exporter failed: {result}")
        inspect_glb(temporary, set(owners))
        temporary.replace(out)
        report["raw_glb_bytes"] = out.stat().st_size


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--budgets", type=Path, help="JSON object overriding per-node triangle ceilings")
    parser.add_argument("--validate-only", action="store_true", help="Check tables/files without importing bpy or building geometry")
    parser.add_argument("--inspect-glb", type=Path, help="Check a built/compressed GLB against meshNames and provenance")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    return parser.parse_args(argv)


def main() -> None:
    args = arguments()
    report_path = args.report or args.out.with_suffix(".report.json")
    report = {
        "status": "started", "source": str(args.source.resolve()), "output": str(args.out.resolve()),
        "coordinate_convention": "metres; Y-up; anterior +Z; feet y=0; centered x/z",
        "license": "CC-BY-4.0", "nodes": {},
    }
    try:
        specification = json.loads((ASSET_DIR / "organ_sources.json").read_text(encoding="utf-8"))
        contract = json.loads((ASSET_DIR.parent / "contracts" / "organs.json").read_text(encoding="utf-8"))
        nodes = specification["nodes"]
        owners = validate_source_map(nodes, contract)
        budgets = dict(TRIANGLE_BUDGETS)
        if args.budgets:
            overrides = json.loads(args.budgets.read_text(encoding="utf-8"))
            if not isinstance(overrides, dict) or set(overrides) - set(nodes):
                raise ValueError("Budget overrides must be an object of known meshNames")
            budgets.update(overrides)
        if set(budgets) != set(nodes) or any(type(value) is not int or value < 100 for value in budgets.values()):
            raise ValueError("Every meshName needs an integer triangle ceiling >= 100")
        report["total_triangle_budget"] = sum(budgets.values())
        resolved = preflight(args.source.resolve(), nodes, budgets, report)
        write_report(report_path, report)
        if args.inspect_glb:
            inspect_glb(args.inspect_glb, set(owners))
            report["inspected_glb"] = str(args.inspect_glb)
        elif not args.validate_only:
            AnatomyBuilder().build(nodes, resolved, owners, budgets, report, args.out.resolve())
        report["status"] = "validated" if args.validate_only or args.inspect_glb else "complete"
        progress(f"{report['status'].upper()}; report: {report_path}")
    except Exception as error:
        report["status"] = "failed"
        report["error"] = str(error)
        traceback.print_exc()
        raise
    finally:
        write_report(report_path, report)


if __name__ == "__main__":
    main()
