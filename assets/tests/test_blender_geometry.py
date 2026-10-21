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
