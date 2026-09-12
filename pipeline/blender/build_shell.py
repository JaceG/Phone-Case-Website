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


def build_to_scene_matrix(depth):
    """mm build frame -> metres scene frame: rotate so the back faces -Y and the
    phone top is +Z, then shift so the case is centred on the Z axis."""
    rot = Matrix.Rotation(math.radians(90.0), 4, "X")  # (x, y, z) -> (x, -z, y)
    shift = Matrix.Translation((0.0, -depth / 2.0, 0.0))  # walls now span y in [0, depth]
    return Matrix.Scale(MM, 4) @ shift @ rot


# ---------------------------------------------------------------------- helpers


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


def make_materials(texture_path, silicone_color='#b4a6d1'):
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
    noise.inputs["Scale"].default_value = 4200.0
    noise.inputs["Detail"].default_value = 2.0
    noise.inputs["Roughness"].default_value = 0.6
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.000012

    bsdf.inputs["Roughness"].default_value = 0.57
    bsdf.inputs["IOR"].default_value = 1.43
    for key in ("Specular IOR Level", "Specular"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = 0.28
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

    # Inner surfaces, rim/lip and cutout walls: plain matte silicone.
    inner = bpy.data.materials.new("case_inner")
    inner.use_nodes = True
    ib = inner.node_tree.nodes.get("Principled BSDF")
    ib.inputs["Base Color"].default_value = (*hex_to_linear(silicone_color), 1.0)
    ib.inputs["Roughness"].default_value = 0.65
    ib.inputs["IOR"].default_value = 1.43
    ib.inputs["Specular IOR Level"].default_value = 0.28

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

    for vt in ("AgX", "Standard"):
        try:
            scene.view_settings.view_transform = vt
            break
        except TypeError:
            continue
    scene.view_settings.look = "None"

    # Neutral studio ambience; render.py uses a transparent backdrop.
    world = bpy.data.worlds.new("studio")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.65, 0.68, 0.75, 1.0)
    bg.inputs["Strength"].default_value = 0.25
    scene.world = world

    scene["case_params"] = json.dumps(P)
    scene["print_template_px"] = [int(T.tw * P["template_px_per_mm"]), int(T.th * P["template_px_per_mm"])]
    scene["print_template_mm"] = [T.tw, T.th]
    return scene


def setup_cameras_and_lights():
    origin = (0.0, 0.0, 0.0)
    add_camera("hero", (-0.15, -0.46, 0.14), origin, lens=85.0, res=(1200, 1500))
    add_camera("three_quarter", (0.27, -0.41, 0.12), origin, lens=85.0, res=(1200, 1500))
    add_camera("flat", (0.0, -0.5, 0.0), origin, ortho_scale=0.21, res=(1024, 2048))
    add_camera("turntable", (0.0, -0.5, 0.05), origin, lens=80.0, res=(768, 768))
    add_camera("detail", (-.12, -.25, .19), (0, -.009, .055), lens=100, res=(1400, 1100))
    add_camera("interior", (.22, .4, .15), origin, lens=80, res=(1200, 1500))

    add_area_light("key", (-0.28, -0.35, 0.32), origin, energy=7.0, size=0.30,
                   color=(1.0, .97, .94), shape='RECTANGLE', size_y=.5)
    add_area_light("fill", (0.3, -0.25, 0.04), origin, energy=3.0, size=0.24,
                   color=(.94, .96, 1.0), shape='RECTANGLE', size_y=.45)
    add_area_light("rim", (0.12, 0.23, 0.25), origin, energy=6.0, size=0.18,
                   shape='RECTANGLE', size_y=.4)
    add_area_light("interior_fill", (-0.1, .4, -.03), origin, energy=2.5, size=.35)


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
    img, print_mat, inner_mat = make_materials(texture, P.get('silicone_color', '#b4a6d1'))
    to_scene = build_to_scene_matrix(P["depth_mm"])

    # --- pivot
    pivot = bpy.data.objects.new("turntable_pivot", None)
    pivot.empty_display_type = "PLAIN_AXES"
    pivot.empty_display_size = 0.05
    scene.collection.objects.link(pivot)

    # Profiled moulded shell; all cutting/UV repair happens in millimetres.
    sys.path.insert(0, here)
    from shell_geometry import build_parts
    parts = build_parts(P, T, print_mat, inner_mat)
    shell, island = parts[:2]
    for ob in parts:
        ob.data.transform(to_scene)
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
