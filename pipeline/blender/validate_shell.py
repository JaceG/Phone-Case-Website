"""Check the generated shell's topology, openings and shared artwork space.

Run with Blender -b master.blend -P pipeline/blender/validate_shell.py.
This validates the digital model, not physical fit or a production dieline.
"""
import json

import bmesh
import bpy
from mathutils import Vector


def main():
    scene = bpy.context.scene
    p = json.loads(scene['case_params'])
    meshes = [obj for obj in scene.objects if obj.type == 'MESH']
    report = {'parts': {}, 'openings': {}, 'uv_max_error': {}}
    for obj in meshes:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        invalid = sum(not edge.is_manifold for edge in bm.edges)
        volume = bm.calc_volume(signed=True)
        report['parts'][obj.name] = {'nonmanifold_edges': invalid, 'volume_mm3': volume * 1e9}
        bm.free()
        assert invalid == 0, f'{obj.name}: {invalid} nonmanifold edges'
        assert volume > 0, f'{obj.name}: inverted normals'
        assert obj.parent and obj.parent.name == 'turntable_pivot', obj.name

    # A ray through each lens/flash/sensor centre must pass through all parts.
    ci = p['camera_island']
    for hole in p['holes']:
        x = -p['width_mm']/2 + ci['x_mm'] + hole['x_mm']
        y = p['height_mm']/2 - ci['y_mm'] - hole['y_mm']
        origin = Vector((x*.001, -.04, y*.001))
        blocked = [obj.name for obj in meshes if obj.ray_cast(origin, Vector((0, 1, 0)), distance=.08)[0]]
        report['openings'][hole['name']] = 'clear' if not blocked else blocked
        assert not blocked, f"{hole['name']} blocked by {blocked}"

    # Numeric UV check catches the previous boolean interpolation streaks.
    for name in ('case_shell', 'camera_island'):
        obj = bpy.data.objects[name]
        uv = obj.data.uv_layers['UVMap']
        error = 0.0
        checked = 0
        for face in obj.data.polygons:
            if face.material_index != 0:
                continue
            for li in face.loop_indices:
                v = obj.data.vertices[obj.data.loops[li].vertex_index].co
                x, y, z = v.x*1000, v.z*1000, -v.y*1000-p['depth_mm']/2
                if name == 'case_shell' and z < -.499:
                    continue
                expected = Vector(((p['depth_mm']+p['width_mm']/2+x)/(p['width_mm']+2*p['depth_mm']),
                                   (p['depth_mm']+p['height_mm']/2+y)/(p['height_mm']+2*p['depth_mm'])))
                error = max(error, (uv.data[li].uv-expected).length)
                checked += 1
        assert checked > 0
        assert error < 1e-5, f'{name}: artwork shifted by {error} UV units'
        report['uv_max_error'][name] = error

    shell = bpy.data.objects['case_shell']
    dimensions = [round(v*1000, 4) for v in shell.dimensions]
    assert abs(dimensions[0]-p['width_mm']) < .01, dimensions
    assert abs(dimensions[1]-p['depth_mm']) < .01, dimensions
    assert abs(dimensions[2]-p['height_mm']) < .01, dimensions
    report['shell_envelope_mm'] = dimensions
    print(json.dumps(report, indent=2))
    print('PASS: closed outward-facing parts, six clear camera openings, envelope and shared UVs')


if __name__ == '__main__':
    main()
