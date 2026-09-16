"""Render saved Studio artwork on an approved case without changing the cached blend."""
import argparse
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import render

parser = argparse.ArgumentParser()
parser.add_argument('--texture', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--silicone', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])

scene = bpy.context.scene
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.engine = render.eevee_engine_id()
bpy.data.images['case_artwork'].filepath = os.path.abspath(args.texture)
bpy.data.images['case_artwork'].reload()


def linear(value):
    """Convert the UI's sRGB colors to Blender's linear shader inputs."""
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


color = tuple(linear(int(args.silicone[i:i + 2], 16) / 255) for i in (1, 3, 5)) + (1,)
for node in bpy.data.materials['case_inner'].node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Base Color'].default_value = color

for camera in ['hero', 'three_quarter', 'flat', 'detail']:
    render.set_camera(scene, camera)
    scene.render.resolution_percentage = 75
    scene.render.filepath = os.path.join(args.out, camera + '.png')
    bpy.ops.render.render(write_still=True)
