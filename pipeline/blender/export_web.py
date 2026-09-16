"""Export the existing shell and its print UVs for the local case editor.

Blender -b pipeline/blender/master.blend -P pipeline/blender/export_web.py
No artwork, lights, or cameras are included. This never saves over master.blend.
"""

import os
import sys
import argparse
import bpy


root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
parser = argparse.ArgumentParser()
parser.add_argument('--out', default=os.path.join(root, 'public', 'models', 'iphone-17-pro-max.glb'))
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
destination = os.path.abspath(args.out)
os.makedirs(os.path.dirname(destination), exist_ok=True)

# Keep the mesh, normals, UVs and material assignments exactly as modeled.
# Replace procedural/render materials with simple web materials so the export
# cannot accidentally embed the current test artwork or bake it into the asset.
for name in ('case_print', 'case_inner'):
    material = bpy.data.materials[name]
    original = next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    inner_color = tuple(original.inputs['Base Color'].default_value) if original else (.009, .009, .011, 1)
    material.node_tree.nodes.clear()
    output = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    surface = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    surface.inputs['Base Color'].default_value = (1, 1, 1, 1) if name == 'case_print' else inner_color
    surface.inputs['Roughness'].default_value = .62
    material.node_tree.links.new(surface.outputs['BSDF'], output.inputs['Surface'])

bpy.ops.object.select_all(action='DESELECT')
pivot = bpy.data.objects.get('turntable_pivot')
if pivot:
    pivot.rotation_euler = (0, 0, 0)
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' or obj == pivot:
        obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=destination,
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_apply=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
)
print('Web shell exported:', destination)
