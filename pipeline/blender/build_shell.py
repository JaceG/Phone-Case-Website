"""
Build master.blend — a parametric open-front phone case shell — from a JSON of
dimensions, with the UV layout, material, cameras and lights that render.py
expects.

Usage (headless):
  Blender -b -P build_shell.py -- --out master.blend --params params/iphone-17-pro-max.json [--texture uv-checker.png]

What it produces (the render.py contract):
  - image datablock `case_artwork` (base colour of the printable surface)
  - cameras `hero`, `three_quarter`, `flat`, `turntable`
  - empty `turntable_pivot` at the origin; the shell is parented to it, the
    turntable camera is not
  - per-camera custom props `res_x` / `res_y` that render.py applies

Coordinate conventions
  Build frame (used for the geometry maths, in mm): the back face lies in the
  XY plane at z = 0 with its outward normal +Z, +X is the viewer's right and +Y
  the phone's top when the back is viewed from outside. Side walls run down to
  z = -depth. The finished mesh is rotated into the scene frame: back faces -Y,
  phone top is +Z, walls extend from y ≈ -depth/2 to +depth/2, so the Z axis
  (the turntable axis) passes through the middle of the case.

UV layout ("dieline")
  One rectangular UV space = the flat print template, aspect
  (width + 2·depth) : (height + 2·depth). The back face sits in the centre; each
  side wall folds outward from the back-face edge by its depth, so a wall vertex
  at depth t maps to  outline_point + outward_normal · t . Rounded corners fan
  radially. u runs left→right, v bottom→top as seen from outside the back.
  Documented in pipeline/README.md.
"""

import argparse
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

MM = 0.001  # scene units are metres; params are millimetres


# --------------------------------------------------------------------------- args


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True, help="path of the .blend to write")
    p.add_argument("--params", required=True, help="JSON of case dimensions (mm)")
    p.add_argument(
        "--texture",
        default=None,
        help="initial artwork image (default: uv-checker.png next to this script)",
    )
    return p.parse_args(argv)


# ----------------------------------------------------------------------- geometry


def rounded_rect_outline(w, h, r, seg):
    """CCW (viewed from +Z) list of (point, outward_normal) 2D Vectors around a
    w×h rectangle centred on the origin with corner radius r. Straight edges
    are single segments between arc endpoints."""
    r = max(0.01, min(r, w / 2 - 0.01, h / 2 - 0.01))
    corners = [
        (w / 2 - r, -h / 2 + r, -90.0),  # bottom-right
        (w / 2 - r, h / 2 - r, 0.0),  # top-right
        (-w / 2 + r, h / 2 - r, 90.0),  # top-left
        (-w / 2 + r, -h / 2 + r, 180.0),  # bottom-left
    ]
    out = []
    for cx, cy, a0 in corners:
        for i in range(seg + 1):
            a = math.radians(a0 + 90.0 * i / seg)
            n = Vector((math.cos(a), math.sin(a)))
            out.append((Vector((cx, cy)) + n * r, n))
    return out


class Template:
    """Build-frame mm  ->  UV in the print-template rectangle."""

    def __init__(self, width, height, depth):
        self.w, self.h, self.d = width, height, depth
        self.tw = width + 2 * depth
        self.th = height + 2 * depth

    def uv(self, p2, n2=None, t=0.0):
        q = p2 + (n2 * t if n2 is not None else Vector((0.0, 0.0)))
        return (
            (self.d + self.w / 2 + q.x) / self.tw,
            (self.d + self.h / 2 + q.y) / self.th,
        )


def build_outer_surface(P, T):
    """Open outer surface of the case: back face + four wrapped side walls, with
    dieline UVs. Returns a bpy mesh in the build frame (mm)."""
    outline = rounded_rect_outline(P["width_mm"], P["height_mm"], P["corner_radius_mm"], P["corner_segments"])
    depth = P["depth_mm"]

    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")

    fold = [bm.verts.new((p.x, p.y, 0.0)) for p, _ in outline]
    rim = [bm.verts.new((p.x, p.y, -depth)) for p, _ in outline]
    bm.verts.ensure_lookup_table()

    n = len(outline)
    back = bm.faces.new(fold)  # CCW -> normal +Z
    back.material_index = 0
    for loop in back.loops:
        i = fold.index(loop.vert)
        loop[uv_layer].uv = T.uv(outline[i][0])

    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new((fold[i], rim[i], rim[j], fold[j]))  # outward normal
        f.material_index = 0
        for loop in f.loops:
            k = i if loop.vert in (fold[i], rim[i]) else j
            t = depth if loop.vert in (rim[i], rim[j]) else 0.0
            loop[uv_layer].uv = T.uv(outline[k][0], outline[k][1], t)

    me = bpy.data.meshes.new("case_shell")
    bm.to_mesh(me)
    bm.free()
    return me


def build_rounded_box(name, w, h, r, seg, z0, z1, center, T, material_index=0, project_uv=True):
    """Closed rounded box (used for the camera island and the cutout cutter).
    UVs are a planar projection of the build-frame XY through the template, so
    the artwork continues across the island top; the island's vertical faces
    smear the surrounding pixels, which is roughly what the film does over a
    step."""
    outline = rounded_rect_outline(w, h, r, seg)
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    cx, cy = center
    top = [bm.verts.new((p.x + cx, p.y + cy, z1)) for p, _ in outline]
    bot = [bm.verts.new((p.x + cx, p.y + cy, z0)) for p, _ in outline]
    faces = [bm.faces.new(top), bm.faces.new(list(reversed(bot)))]
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        faces.append(bm.faces.new((bot[i], bot[j], top[j], top[i])))
    for f in faces:
        f.material_index = material_index
        for loop in f.loops:
            v = loop.vert.co
            loop[uv_layer].uv = T.uv(Vector((v.x, v.y))) if project_uv else (0.0, 0.0)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me


def build_to_scene_matrix(depth):
    """mm build frame -> metres scene frame: rotate so the back faces -Y and the
    phone top is +Z, then shift so the case is centred on the Z axis."""
    rot = Matrix.Rotation(math.radians(90.0), 4, "X")  # (x, y, z) -> (x, -z, y)
    shift = Matrix.Translation((0.0, -depth / 2.0, 0.0))  # walls now span y in [0, depth]
    return Matrix.Scale(MM, 4) @ shift @ rot


# ---------------------------------------------------------------------- helpers


def apply_modifier(obj, mod):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def shade_smooth(obj, angle_deg=35.0):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    for op in ("shade_smooth_by_angle", "shade_auto_smooth"):
        if hasattr(bpy.ops.object, op):
            try:
                getattr(bpy.ops.object, op)(angle=math.radians(angle_deg))
                return
            except Exception:
                pass
    bpy.ops.object.shade_smooth()


def add_bevel(obj, width_m, segments=3):
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = width_m
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(40.0)
    mod.miter_outer = "MITER_ARC"
    mod.harden_normals = True
    apply_modifier(obj, mod)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera(name, location, target, lens=None, ortho_scale=None, res=(1024, 1280)):
    cam = bpy.data.cameras.new(name)
    cam.sensor_fit = "AUTO"
    cam.clip_start = 0.01
    if ortho_scale is not None:
        cam.type = "ORTHO"
        cam.ortho_scale = ortho_scale
    else:
        cam.type = "PERSP"
        cam.lens = lens or 75.0
    obj = bpy.data.objects.new(name, cam)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    look_at(obj, target)
    obj["res_x"], obj["res_y"] = int(res[0]), int(res[1])
    return obj


def add_area_light(name, location, target, energy, size, color=(1.0, 1.0, 1.0), shape="SQUARE", size_y=None):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = shape
    data.size = size
    if size_y is not None:
        data.size_y = size_y
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    look_at(obj, target)
    return obj


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_linear(hex_str):
    h = hex_str.lstrip("#")
    return tuple(srgb_to_linear(int(h[i : i + 2], 16) / 255.0) for i in (0, 2, 4))


# -------------------------------------------------------------------- materials


def make_materials(texture_path):
    img = bpy.data.images.load(texture_path, check_existing=False)
    img.name = "case_artwork"
    try:
        img.colorspace_settings.name = "sRGB"
    except Exception:
        pass

    # Printable surface: artwork drives base colour, silicone-ish roughness,
    # subtle procedural grain in the normal.
    print_mat = bpy.data.materials.new("case_print")
    print_mat.use_nodes = True
    nt = print_mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.name = tex.label = "case_artwork"
    tex.image = img
    tex.interpolation = "Cubic"
    tex.extension = "EXTEND"
    coord = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 900.0
    noise.inputs["Detail"].default_value = 6.0
    noise.inputs["Roughness"].default_value = 0.6
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.06
    bump.inputs["Distance"].default_value = 0.0004

    bsdf.inputs["Roughness"].default_value = 0.55
    for key in ("Specular IOR Level", "Specular"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = 0.45
            break

    links = nt.links
    links.new(coord.outputs["UV"], tex.inputs["Vector"])
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(coord.outputs["Object"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    out.location = (600, 0)
    bsdf.location = (300, 0)
    tex.location = (-100, 150)
    coord.location = (-500, 0)
    noise.location = (-200, -300)
    bump.location = (50, -300)

    # Inner surfaces, rim/lip and cutout walls: plain matte dark silicone.
    inner = bpy.data.materials.new("case_inner")
    inner.use_nodes = True
    ib = inner.node_tree.nodes.get("Principled BSDF")
    ib.inputs["Base Color"].default_value = (0.02, 0.02, 0.022, 1.0)
    ib.inputs["Roughness"].default_value = 0.75

    return img, print_mat, inner


# ------------------------------------------------------------------------ scene


def setup_scene(P, T):
    scene = bpy.context.scene
    scene.name = "case"
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "MILLIMETERS"

    r = scene.render
    r.resolution_x, r.resolution_y = 1024, 1280
    r.resolution_percentage = 100
    r.film_transparent = False
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGB"
    r.image_settings.color_depth = "8"
    r.engine = "CYCLES"

    cy = scene.cycles
    cy.samples = 32
    cy.use_adaptive_sampling = True
    cy.use_denoising = True
    try:
        cy.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    cy.device = "GPU"

    ev = scene.eevee
    ev.taa_render_samples = 32
    for attr, val in (("use_shadows", True), ("use_raytracing", True)):
        if hasattr(ev, attr):
            setattr(ev, attr, val)

    for vt in ("Standard", "AgX"):
        try:
            scene.view_settings.view_transform = vt
            break
        except TypeError:
            continue
    scene.view_settings.look = "None"

    # World: near-black studio background.
    world = bpy.data.worlds.new("studio")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (*hex_to_linear("#0a0a0c"), 1.0)
    bg.inputs["Strength"].default_value = 1.0
    scene.world = world

    scene["case_params"] = json.dumps(P)
    scene["print_template_px"] = [int(T.tw * P["template_px_per_mm"]), int(T.th * P["template_px_per_mm"])]
    scene["print_template_mm"] = [T.tw, T.th]
    return scene


def setup_cameras_and_lights():
    origin = (0.0, 0.0, 0.0)
    add_camera("hero", (-0.17, -0.36, 0.21), (0.0, 0.0, 0.0), lens=75.0, res=(1024, 1280))
    add_camera("three_quarter", (0.30, -0.28, 0.07), (0.0, 0.0, 0.01), lens=75.0, res=(1024, 1280))
    add_camera("flat", (0.0, -0.5, 0.0), origin, ortho_scale=0.21, res=(1024, 2048))
    add_camera("turntable", (0.0, -0.5, 0.05), origin, lens=80.0, res=(768, 768))

    add_area_light("key", (-0.45, -0.55, 0.55), origin, energy=40.0, size=0.7, color=(1.0, 0.97, 0.93))
    add_area_light("fill", (0.6, -0.5, 0.1), origin, energy=12.0, size=1.0, color=(0.9, 0.95, 1.0))
    add_area_light("rim", (0.25, 0.45, 0.45), origin, energy=45.0, size=0.25, color=(1.0, 1.0, 1.0))


# ------------------------------------------------------------------------- main


def main():
    args = parse_args()
    here = os.path.dirname(os.path.abspath(__file__))
    with open(args.params) as f:
        P = json.load(f)
    texture = os.path.abspath(args.texture or os.path.join(here, "uv-checker.png"))
    if not os.path.exists(texture):
        sys.exit(f"texture not found: {texture} (run `pnpm tsx pipeline/scripts/uv-checker.ts pipeline/blender/uv-checker.png`)")

    bpy.ops.wm.read_factory_settings(use_empty=True)

    T = Template(P["width_mm"], P["height_mm"], P["depth_mm"])
    scene = setup_scene(P, T)
    img, print_mat, inner_mat = make_materials(texture)
    to_scene = build_to_scene_matrix(P["depth_mm"])

    # --- pivot
    pivot = bpy.data.objects.new("turntable_pivot", None)
    pivot.empty_display_type = "PLAIN_AXES"
    pivot.empty_display_size = 0.05
    scene.collection.objects.link(pivot)

    # --- shell: outer printable surface, then solidify inward for the wall
    shell_me = build_outer_surface(P, T)
    shell_me.transform(to_scene)
    shell = bpy.data.objects.new("case_shell", shell_me)
    scene.collection.objects.link(shell)
    shell.data.materials.append(print_mat)
    shell.data.materials.append(inner_mat)

    sol = shell.modifiers.new("wall", "SOLIDIFY")
    sol.thickness = P["wall_mm"] * MM
    sol.offset = -1.0  # grow inward (against the outward normals)
    sol.use_even_offset = True
    sol.use_rim = True
    sol.material_offset = 1
    sol.material_offset_rim = 1
    apply_modifier(shell, sol)

    # --- camera island (build frame: top-left of the back as seen from outside)
    ci = P["camera_island"]
    W, H = P["width_mm"], P["height_mm"]
    isl_cx = -W / 2 + ci["x_mm"] + ci["w_mm"] / 2
    isl_cy = H / 2 - ci["y_mm"] - ci["h_mm"] / 2
    island_me = build_rounded_box(
        "camera_island",
        ci["w_mm"], ci["h_mm"], ci["corner_radius_mm"], P["corner_segments"],
        z0=-0.4, z1=ci["height_mm"], center=(isl_cx, isl_cy), T=T,
    )
    island_me.transform(to_scene)
    island = bpy.data.objects.new("camera_island", island_me)
    scene.collection.objects.link(island)
    island.data.materials.append(print_mat)
    island.data.materials.append(inner_mat)

    # --- lens cutout: rounded rectangle through island and back
    inset = P["cutout_inset_mm"]
    cut_me = build_rounded_box(
        "lens_cutter",
        ci["w_mm"] - 2 * inset, ci["h_mm"] - 2 * inset, P["cutout_radius_mm"], P["corner_segments"],
        z0=-(P["wall_mm"] + 1.0), z1=ci["height_mm"] + 1.0, center=(isl_cx, isl_cy), T=T,
        material_index=0, project_uv=False,
    )
    cut_me.transform(to_scene)
    cutter = bpy.data.objects.new("lens_cutter", cut_me)
    scene.collection.objects.link(cutter)
    cutter.data.materials.append(inner_mat)

    for target in (shell, island):
        b = target.modifiers.new("lens_cutout", "BOOLEAN")
        b.operation = "DIFFERENCE"
        b.object = cutter
        for solver in ("EXACT", "MANIFOLD", "FLOAT"):
            try:
                b.solver = solver
                break
            except TypeError:
                continue
        b.material_mode = "TRANSFER"
        apply_modifier(target, b)

    bpy.data.objects.remove(cutter, do_unlink=True)
    bpy.data.meshes.remove(cut_me, do_unlink=True)

    # --- finish: bevel + smooth shading, parent to pivot
    add_bevel(shell, P["bevel_mm"] * MM, segments=3)
    add_bevel(island, min(P["bevel_mm"], 0.5) * MM, segments=2)
    shade_smooth(shell)
    shade_smooth(island)
    for ob in (shell, island):
        ob.parent = pivot

    setup_cameras_and_lights()
    scene.camera = bpy.data.objects["hero"]

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=out, relative_remap=True, compress=True)

    print(
        f"wrote {out}\n"
        f"  shell verts={len(shell.data.vertices)} faces={len(shell.data.polygons)}; "
        f"island faces={len(island.data.polygons)}\n"
        f"  template {T.tw:g} x {T.th:g} mm = {scene['print_template_px'][0]} x {scene['print_template_px'][1]} px\n"
        f"  case_artwork -> {img.filepath}"
    )


if __name__ == "__main__":
    main()
