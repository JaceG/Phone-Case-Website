"""Reference-led silicone geometry, built in millimetres before scene conversion.

Profile rings explicitly model the moulded roll at the back and open rim. Small
booleans only cut openings; planar UVs are restored after topology changes so
the camera deck cannot inherit interpolated/streaked boolean UVs.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def outline(w, h, r, segments=32):
    r = min(r, w / 2 - .001, h / 2 - .001)
    result = []
    for cx, cy, start in ((w/2-r, -h/2+r, -90), (w/2-r, h/2-r, 0),
                          (-w/2+r, h/2-r, 90), (-w/2+r, -h/2+r, 180)):
        for i in range(segments + 1):
            a = math.radians(start + i * 90 / segments)
            result.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return result


def mesh_object(name, vertices, faces, materials):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    for mat in materials:
        mesh.materials.append(mat)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    return obj


def profile_solid(name, w, h, radius, rings, materials, center=(0, 0), segments=32):
    vertices = []
    for inset, z in rings:
        vertices += [(x + center[0], y + center[1], z)
                     for x, y in outline(w-2*inset, h-2*inset, radius-inset, segments)]
    n = 4 * (segments + 1)
    faces = [tuple(reversed(range(n)))]
    for row in range(len(rings)-1):
        for i in range(n):
            j = (i+1) % n
            faces.append((row*n+i, row*n+j, (row+1)*n+j, (row+1)*n+i))
    faces.append(tuple(range((len(rings)-1)*n, len(rings)*n)))
    return mesh_object(name, vertices, faces, materials)


def apply(obj, mod):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def cut(obj, cutter):
    mod = obj.modifiers.new('opening', 'BOOLEAN')
    mod.operation, mod.solver, mod.object = 'DIFFERENCE', 'EXACT', cutter
    mod.material_mode = 'TRANSFER'
    apply(obj, mod)


def dispose(obj):
    mesh = obj.data
    bpy.data.objects.remove(obj, do_unlink=True)
    if mesh.users == 0:
        bpy.data.meshes.remove(mesh)


def cylinder(name, x, y, diameter, bottom, top, mat, segments=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=diameter/2,
        depth=top-bottom, location=(x, y, (top+bottom)/2))
    obj = bpy.context.object
    obj.name = name
    # Bake translation so every mesh is in the same build coordinate space.
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)
    obj.data.materials.append(mat)
    return obj


def annular_profile(name, x, y, radii_heights, materials, segments=128):
    vertices = [(x+r*math.cos(i*math.tau/segments), y+r*math.sin(i*math.tau/segments), z)
                for r, z in radii_heights for i in range(segments)]
    faces = []
    for row in range(len(radii_heights)):
        next_row = (row+1) % len(radii_heights)
        for i in range(segments):
            j = (i+1) % segments
            faces.append((row*segments+i, row*segments+j, next_row*segments+j, next_row*segments+i))
    return mesh_object(name, vertices, faces, materials)


def planar_uv(obj, template):
    uv = obj.data.uv_layers.get('UVMap') or obj.data.uv_layers.new(name='UVMap')
    for face in obj.data.polygons:
        for index in face.loop_indices:
            v = obj.data.vertices[obj.data.loops[index].vertex_index].co
            uv.data[index].uv = template.uv(Vector((v.x, v.y)))


def finish(obj, bevel=0, flat_sides=False):
    if bevel:
        mod = obj.modifiers.new('Soft tool edges', 'BEVEL')
        mod.width, mod.segments = bevel, 4
        mod.limit_method, mod.angle_limit = 'ANGLE', math.radians(40)
        apply(obj, mod)
    # Flat deck polygons stay flat. Smooth cylinders and moulded profile bands.
    for f in obj.data.polygons:
        f.use_smooth = (max(abs(n) for n in f.normal) if flat_sides else abs(f.normal.z)) < .9999


def build_parts(p, template, print_mat, silicone):
    w, h, d, wall = p['width_mm'], p['height_mm'], p['depth_mm'], p['wall_mm']
    back = p.get('back_mm', wall)
    r, roll = p['corner_radius_mm'], p['back_roll_mm']
    rings = []
    # Outside: flat back -> broad rolled shoulder -> straight wall -> rolled lip.
    for i in range(9):
        a = i * math.pi/16
        rings.append((roll*(1-math.sin(a)), -roll*(1-math.cos(a))))
    lip = wall/2
    for i in range(13):
        a = i*math.pi/12
        rings.append((lip-lip*math.cos(a), -d+lip-lip*math.sin(a)))
    # Inside fillet meets a flat floor, avoiding the sharp solidify corner.
    inner_roll = .65
    rings.append((wall, -back-inner_roll))
    for i in range(1, 7):
        a = i*math.pi/12
        rings.append((wall+inner_roll*(1-math.cos(a)), -back-inner_roll+inner_roll*math.sin(a)))
    # First cap is the outside back; last is the interior floor.
    shell = profile_solid('case_shell', w, h, r, rings, [print_mat, silicone], segments=p['corner_segments'])
    uv = shell.data.uv_layers.new(name='UVMap')
    ring_vertices = len(outline(w, h, r, p['corner_segments']))
    for f in shell.data.polygons:
        f.material_index = 1 if f.index > 1 + (9+6)*ring_vertices else 0
        for li in f.loop_indices:
            vi = shell.data.loops[li].vertex_index
            row = vi // ring_vertices
            v = shell.data.vertices[vi].co
            inset, z = rings[row]
            # Printable walls fold outward from the same template boundary.
            cx = max(-w/2+r, min(w/2-r, v.x))
            cy = max(-h/2+r, min(h/2-r, v.y))
            n = Vector((v.x-cx, v.y-cy)).normalized()
            uv.data[li].uv = template.uv(Vector((v.x, v.y)), n, max(0, -z-roll*.35)) if row > 0 else template.uv(Vector((v.x, v.y)))
    parts = [shell]

    ci = p['camera_island']
    left, top = -w/2+ci['x_mm'], h/2-ci['y_mm']
    center = (left+ci['w_mm']/2, top-ci['h_mm']/2)
    raised = ci.get('enabled', True)
    deck = ci['deck_height_mm'] if raised else 0
    height_scale = ci['height_mm'] / 2.8
    surround = [(0, -.25), (0, .3), (.15, 1.4), (.55, 2.15), (1.05, 2.65),
                (1.7, 2.8), (2.3, 2.65), (2.8, 2.2)]
    island = None
    if raised:
        island = profile_solid('camera_island', ci['w_mm'], ci['h_mm'], ci['corner_radius_mm'],
            [(inset, z*height_scale) for inset, z in surround] + [(3.2, deck)],
            [print_mat, silicone], center=center, segments=p['corner_segments'])
        parts.append(island)
    for hole in p['holes']:
        x, y, rad = left+hole['x_mm'], top-hole['y_mm'], hole['d_mm']/2
        cutter = cylinder('cutter_'+hole['name'], x, y, 2*rad, -back-1, ci['height_mm']+2, silicone, segments=p['hole_segments'])
        cut(shell, cutter)
        if island:
            cut(island, cutter)
        dispose(cutter)
        if hole['kind'] == 'lens':
            # Separate annular topology: no union interpolation across the deck.
            rw, rh = p['lens_rim']['width_mm'], p['lens_rim']['height_mm']
            rim = annular_profile('lip_'+hole['name'], x, y,
                [(rad+rw*.90, deck-.1), (rad+rw, deck+rh*.24), (rad+rw*.76, deck+rh*.84),
                 (rad+rw*.42, deck+rh), (rad+rw*.07, deck+rh*.6), (rad, deck-.1)], [silicone])
            parts.append(rim)

    # Shallow channel with bevelled shoulders, retaining artwork at its floor.
    ms = p.get('magsafe_ring')
    if ms:
        add_magsafe_groove(shell, ms, h, template, print_mat)

    # Controls and port layouts are specific to each phone, in rear-view coordinates.
    for control in p['buttons']:
        side = control['side']
        x = (-1 if side == 'left' else 1) * (w/2-.12)
        y = h/2-control['from_top_mm']
        opening = control.get('kind') == 'opening'
        height = control.get('height_mm', 3.3)
        cap = profile_solid(control['name'], control['length_mm'], height, min(height/2-.01, 1.5),
                            [(0, -wall-1), (0, 2)] if opening else
                            [(0, -.25), (0, .2), (.18, .5), (.35, .65)], [silicone], segments=16)
        rot = Matrix(((0, 0, -1 if side == 'left' else 1, x),
                      (1, 0, 0, y), (0, 1, 0, control.get('z_mm', -d*.55)), (0, 0, 0, 1)))
        cap.data.transform(rot)
        bm = bmesh.new()
        bm.from_mesh(cap.data)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(cap.data)
        bm.free()
        if opening:
            cut(shell, cap)
            dispose(cap)
        else:
            parts.append(cap)

    # Preserve the original shell's defaults; new models supply their own port map.
    bottom = p.get('bottom_openings', [(0, 12, 4.8)] + [(x, 1.8, 2.1) for x in (-24,-20.5,-17,17,20.5,24)])
    for index, (x, width, height) in enumerate(bottom):
        cutter = profile_solid('bottom_opening', width, height, min(height,width)/2-.01,
                              [(0, -wall-1), (0, wall+1)], [silicone], segments=12)
        transform = Matrix(((1,0,0,x), (0,0,-1,-h/2+wall/2), (0,1,0,-d*.55), (0,0,0,1)))
        cutter.data.transform(transform)
        cut(shell, cutter)
        dispose(cutter)

    finish(shell, p['bevel_mm'], p.get('flat_side_shading', False))
    # Nearly coincident boolean points can leave micron-scale slivers on a deck.
    # Opt in per model; reproject the printable UVs after welding these points.
    tolerance = p.get('cleanup_tolerance_mm', 0)
    if tolerance:
        bm = bmesh.new()
        bm.from_mesh(shell.data)
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=tolerance)
        bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=tolerance)
        boundary = [edge for edge in bm.edges if edge.is_boundary]
        # A closed case should have no boundary edges. Only repair a tiny planar
        # boolean sliver; larger holes must fail validation rather than be hidden.
        if (0 < len(boundary) <= 3 and sum(e.calc_length() for e in boundary) < .5
                and all(abs(v.co.z) < tolerance for e in boundary for v in e.verts)):
            bmesh.ops.holes_fill(bm, edges=boundary, sides=3)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(shell.data)
        bm.free()
    if island:
        finish(island, p['bevel_mm'])
        planar_uv(island, template)
    shell_uv = shell.data.uv_layers['UVMap']
    for f in shell.data.polygons:
        for li in f.loop_indices:
            v = shell.data.vertices[shell.data.loops[li].vertex_index].co
            if v.z >= -.5:
                shell_uv.data[li].uv = template.uv(Vector((v.x, v.y)))
    for obj in parts[1:]:
        if obj != island:
            finish(obj)
            planar_uv(obj, template)
    return parts


def add_magsafe_groove(shell, ms, h, template, print_mat):
    rad, width, depth = ms['d_mm']/2, ms['width_mm'], ms['depth_mm']
    cy = h/2-ms['cy_from_top_mm']
    groove = annular_profile('magsafe_cutter', 0, cy,
        [(rad, .3), (rad, -.03), (rad-.18, -depth),
         (rad-width+.18, -depth), (rad-width, -.03), (rad-width, .3)], [print_mat])
    planar_uv(groove, template)
    cut(shell, groove)
    dispose(groove)
    line = profile_solid('alignment_cutter', ms['line_width_mm'], ms['line_length_mm'],
        ms['line_width_mm']/2-.01, [(0, -depth), (0, .3)], [print_mat],
        center=(0, cy-rad-ms['line_gap_mm']-ms['line_length_mm']/2))
    planar_uv(line, template)
    cut(shell, line)
    dispose(line)
