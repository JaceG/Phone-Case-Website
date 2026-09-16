"""Render a public presentation set from an approved shell. Run inside Blender."""
import argparse, os, sys
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import render
p=argparse.ArgumentParser()
p.add_argument('--textures', required=True)
p.add_argument('--out', required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
s=bpy.context.scene
s.render.film_transparent=True
s.render.image_settings.file_format='PNG'
s.render.image_settings.color_mode='RGBA'
s.render.engine=render.eevee_engine_id()
for filename in sorted(os.listdir(a.textures)):
    if not filename.endswith('.png'): continue
    slug=filename[:-4]
    texture=bpy.data.images['case_artwork']
    texture.filepath=os.path.abspath(os.path.join(a.textures,filename))
    texture.reload()
    for camera in ['hero','three_quarter','flat','detail']:
        render.set_camera(s,camera)
        s.render.resolution_percentage=75
        s.render.filepath=os.path.join(a.out,f'{slug}_{camera}.png')
        bpy.ops.render.render(write_still=True)
print('Storefront stills rendered')
