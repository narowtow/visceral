"""Standard-library tests; run without Blender or third-party packages."""

import json
from pathlib import Path
import struct
import tempfile
import unittest

from assets.anatomy_sources import (
    SourceTables,
    centering_offset,
    inspect_glb,
    obj_header_bounds,
    resolve_sources,
    union_bounds,
    validate_source_map,
    web_bounds,
    web_point,
)
from assets.build_anatomy import TRIANGLE_BUDGETS, preflight

ROOT = Path(__file__).resolve().parents[2]


class SourceResolutionTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / "partof_parts_list_e.txt").write_text(
            "concept id\trepresentation id\ten\n"
            "FMA1\tBP1\tcompound organ\nFMA2\tBP2\tsigmoid colon\n"
            "FMA3\tBP3\tsigmoid artery\n", encoding="utf-8",
        )
        (self.root / "partof_element_parts.txt").write_text(
            "concept id\tname\telement file id\n"
            "FMA1\tcompound organ\tFJ10\nFMA1\tcompound organ\tFJ11\n"
            "FMA1\tcompound organ\tFJ10\nFMA2\tsigmoid colon\tFJ11\n"
            "FMA2\tsigmoid colon\tFJ12\nFMA3\tsigmoid artery\tFJ99\n",
            encoding="utf-8",
        )

    def test_compound_union_deduplicates_elements_and_matches_optional_names_exactly(self):
        table = SourceTables.load(self.root, "partof")
        concepts, elements, warnings = table.resolve({"concepts": ["FMA1"], "optionalConceptNames": ["Sigmoid colon"]})
        self.assertEqual(concepts, ["FMA1", "FMA2"])
        self.assertEqual(elements, ["FJ10", "FJ11", "FJ12"])
        self.assertEqual(warnings, [])
        self.assertEqual(table.element_path("FJ10"), self.root / "obj/partof_BP3D_4.0_obj_99/FJ10.obj")
        self.assertEqual(table.element_path("FJ1656M").name, "FJ1656M.obj")

    def test_missing_concepts_fail_and_missing_optional_names_are_reported(self):
        table = SourceTables.load(self.root, "partof")
        with self.assertRaisesRegex(ValueError, "No ELEMENT mapping"):
            table.resolve({"concepts": ["FMA999"]})
        _concepts, _elements, warnings = table.resolve({"concepts": ["FMA1"], "optionalConceptNames": ["colon"]})
        self.assertEqual(len(warnings), 1)
        with self.assertRaises(ValueError):
            table.element_path("../../outside")

    def test_additional_tree_sources_union_by_element_id(self):
        partof = SourceTables.load(self.root, "partof")
        isa = SourceTables(self.root, "isa", {"FMA4": ["FJ11", "FJ20"]}, {"FMA4": "limb bones"})
        resolved = resolve_sources({"tree": "partof", "concepts": ["FMA1"], "additionalSources": [{"tree": "isa", "concepts": ["FMA4"]}]}, {"partof": partof, "isa": isa})
        self.assertEqual(resolved["elements"], ["FJ10", "FJ11", "FJ20"])
        self.assertEqual(resolved["concepts"], ["FMA1", "FMA4"])
        self.assertEqual(resolved["files"][1], partof.element_path("FJ11"))
        self.assertEqual(resolved["files"][2], isa.element_path("FJ20"))

    def test_malformed_table_is_not_silently_accepted(self):
        (self.root / "partof_element_parts.txt").write_text("concept id\tname\twrong\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Unexpected columns"):
            SourceTables.load(self.root, "partof")

    def test_header_bounds_and_coordinate_conversion(self):
        path = self.root / "FJ10.obj"
        path.write_text("# Bounds(mm): (-10,-200,-80)-(30,50,1640)\nv 0 0 0\n", encoding="utf-8")
        raw = obj_header_bounds(path)
        self.assertEqual(web_point((100, -200, 1500)), (.1, 1.5, .2))
        bounds = web_bounds(raw)
        self.assertEqual(bounds, ((-.01, -.08, -.05), (.03, 1.64, .2)))
        offset = centering_offset(bounds)
        self.assertAlmostEqual(bounds[0][1] + offset[1], 0)
        self.assertAlmostEqual((bounds[0][0] + bounds[1][0]) / 2 + offset[0], 0)
        self.assertAlmostEqual((bounds[0][2] + bounds[1][2]) / 2 + offset[2], 0)
        self.assertEqual(union_bounds([bounds, ((0, 0, 0), (.5, 2, .5))]), ((-.01, -.08, -.05), (.5, 2, .5)))
        path.write_text("v 0 0 0\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Bounds"):
            obj_header_bounds(path)

    def test_missing_elements_are_retained_in_failure_report(self):
        # A second table is required even when this tiny map uses only partof.
        for suffix in ("parts_list_e", "element_parts"):
            (self.root / f"isa_{suffix}.txt").write_text((self.root / f"partof_{suffix}.txt").read_text(encoding="utf-8"), encoding="utf-8")
        report = {"nodes": {}}
        with self.assertRaisesRegex(ValueError, "Missing ELEMENT"):
            preflight(self.root, {"heart": {"tree": "partof", "concepts": ["FMA1"]}}, {"heart": 100}, report)
        self.assertEqual(report["nodes"]["heart"]["missing_elements"], ["FJ10", "FJ11"])


class ContractAndArchiveTests(unittest.TestCase):
    def test_map_exactly_covers_modeled_contract_meshes(self):
        nodes = json.loads((ROOT / "assets/organ_sources.json").read_text(encoding="utf-8"))["nodes"]
        contract = json.loads((ROOT / "contracts/organs.json").read_text(encoding="utf-8"))
        owners = validate_source_map(nodes, contract)
        self.assertEqual(owners["skeleton"], "bones_joints")
        self.assertEqual(set(TRIANGLE_BUDGETS), set(owners))
        self.assertLessEqual(sum(TRIANGLE_BUDGETS.values()), 250000)
        with self.assertRaisesRegex(ValueError, "Missing"):
            validate_source_map({name: spec for name, spec in nodes.items() if name != "heart"}, contract)

    @unittest.skipUnless((ROOT / "assets/source/bodyparts3d/partof_element_parts.txt").exists(), "Local BodyParts3D archive unavailable")
    def test_supplied_archive_resolves_all_files_and_special_cases(self):
        nodes = json.loads((ROOT / "assets/organ_sources.json").read_text(encoding="utf-8"))["nodes"]
        report = {"nodes": {}}
        resolved = preflight(ROOT / "assets/source/bodyparts3d", nodes, TRIANGLE_BUDGETS, report)
        self.assertEqual(len(resolved), len(nodes))
        self.assertGreater(report["nodes"]["skeleton"]["element_count"], 240)
        self.assertEqual(report["nodes"]["skeleton"]["source_tree"], "mixed")
        self.assertIn("FMA23914", report["nodes"]["skeleton"]["source_concepts"])
        self.assertEqual(report["nodes"]["skin"]["element_ids"], ["FJ2810"])
        self.assertEqual(report["nodes"]["ear_left"]["element_ids"], report["nodes"]["ear_right"]["element_ids"])
        self.assertEqual(report["nodes"]["testis_left"]["source_tree"], "isa")
        self.assertEqual(report["nodes"]["thyroid"]["element_count"], 0)
        self.assertTrue(report["nodes"]["thyroid"]["stylized"])
        self.assertTrue(report["nodes"]["colon"]["warnings"])
        for name in ("lung_left", "lung_right"):
            self.assertEqual(report["nodes"][name]["derived"], "envelope of BodyParts3D bronchial/vascular tree")
            self.assertLessEqual(TRIANGLE_BUDGETS[name], 8000)
        self.assertGreater(report["nodes"]["trachea"]["element_count"], 90)
        for path in resolved["trachea"]["files"]:
            with path.open(encoding="utf-8-sig") as handle:
                header = next(line for line in handle if line.startswith("# English name"))
            self.assertRegex(header.casefold(), "trachea|bronch")
            self.assertNotRegex(header.casefold(), "artery|vein|vascular")


class ExportValidationTests(unittest.TestCase):
    def test_glb_requires_nonempty_named_nodes_and_provenance(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "test.glb"
            document = {
                "asset": {"version": "2.0"},
                "nodes": [{"name": "thyroid", "mesh": 0, "extras": {"organ_id": "thyroid", "source_concepts": "[]", "stylized": True}}],
                "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}],
                "accessors": [{"count": 3}],
            }

            def write():
                body = json.dumps(document).encode("utf-8")
                body += b" " * (-len(body) % 4)
                path.write_bytes(struct.pack("<4sIII4s", b"glTF", 2, 20 + len(body), len(body), b"JSON") + body)

            write()
            self.assertEqual(inspect_glb(path, {"thyroid"})["nodes"][0]["name"], "thyroid")
            with self.assertRaisesRegex(ValueError, "names differ"):
                inspect_glb(path, {"heart"})
            document["nodes"][0]["extras"]["stylized"] = False
            write()
            with self.assertRaisesRegex(ValueError, "marked stylized"):
                inspect_glb(path, {"thyroid"})
            document["nodes"][0]["extras"]["stylized"] = True
            document["accessors"][0]["count"] = 0
            write()
            with self.assertRaisesRegex(ValueError, "Empty exported"):
                inspect_glb(path, {"thyroid"})


if __name__ == "__main__":
    unittest.main()
