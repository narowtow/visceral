"""Geometry regression; skipped by ordinary Python, exercised by Blender."""

import importlib.util
import unittest

from assets.build_anatomy import AnatomyBuilder


@unittest.skipUnless(importlib.util.find_spec("bpy"), "Requires Blender")
class EnvelopeTests(unittest.TestCase):
    def test_sparse_branches_become_one_closed_rounded_envelope(self):
        builder = AnatomyBuilder()
        builder.reset_scene()
        pieces = []
        for position in ((-.06, 1, 0), (.06, 1, 0), (0, 1.25, 0), (0, 1.1, .12)):
            builder.bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=.015, location=position)
            pieces.append(builder.bpy.context.object)
        obj = builder.join(pieces, "lung_left")
        builder.lung_envelope(obj)
        builder.decimate(obj, 8000)
        bm = builder.bmesh.new()
        try:
            bm.from_mesh(obj.data)
            self.assertTrue(all(edge.is_manifold for edge in bm.edges))
            self.assertGreater(abs(bm.calc_volume()), .0005)
            remaining = set(bm.verts)
            reached = set()
            queue = [next(iter(remaining))]
            while queue:
                vertex = queue.pop()
                if vertex in reached:
                    continue
                reached.add(vertex)
                queue.extend(edge.other_vert(vertex) for edge in vertex.link_edges)
            self.assertEqual(reached, remaining)
            self.assertLessEqual(builder.triangle_count(obj), 8000)
        finally:
            bm.free()
            builder.reset_scene()


@unittest.skipUnless(importlib.util.find_spec("bpy"), "Requires Blender")
class ThyroidTests(unittest.TestCase):
    def setUp(self):
        self.builder = AnatomyBuilder()
        self.builder.reset_scene()
        self.addCleanup(self.builder.reset_scene)

    def sphere(self, name, location, scale):
        self.builder.bpy.ops.mesh.primitive_uv_sphere_add(
            segments=32, ring_count=32, radius=1, location=location,
        )
        obj = self.builder.bpy.context.object
        obj.scale = scale
        return self.builder.join([obj], name)

    def test_neck_slice_ignores_anterior_bronchi_and_cartilage_depth(self):
        builder = self.builder
        neck = self.sphere("neck_airway", (0, 1.39, 0), (.01, .08, .01))
        bronchi = self.sphere("thoracic_branch", (0, 1.30, .08), (.02, .02, .02))
        trachea = builder.join([neck, bronchi], "trachea")
        skin = self.sphere("skin", (0, 1.43, 0), (.055, .12, .06))
        builder.clean_mesh(skin)
        # The cartilage's anterior bounds must never pull the thyroid forward.
        anchor = ((-.02, 1.464, .15), (.02, 1.49, .2))
        thyroid = builder.thyroid(trachea, anchor)
        builder.clean_mesh(thyroid)
        builder.decimate(thyroid, 1500)
        low, high = builder.bounds(thyroid)
        self.assertGreater(high[0] - low[0], .04)
        self.assertLess(high[0] - low[0], .06)
        self.assertLess(high[1], builder.bounds(trachea)[1][1])
        self.assertLess(high[2], .025)
        self.assertGreater(high[2], .005)
        self.assertGreaterEqual(builder.skin_clearance(thyroid, skin), .0035)
        # A detached gland must fail even if it is far from the skin surface.
        for vertex in thyroid.data.vertices:
            vertex.co.z += .1
        with self.assertRaisesRegex(ValueError, "outside neck skin"):
            builder.skin_clearance(thyroid, skin)
