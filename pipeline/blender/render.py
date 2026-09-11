"""
Batch-render every design in a folder from master.blend.

Usage (headless):
  Blender -b master.blend -P render.py -- --designs DIR --out DIR [--cameras hero three_quarter flat] [--turntable 36]

Contract with master.blend:
  - image datablock `case_artwork` is the per-design texture
  - cameras: hero, three_quarter, flat, turntable
  - empty `turntable_pivot` is rotated around Z for turntable frames
  - optional: camera custom props `res_x` / `res_y` set the output size per
    camera (build_shell.py writes them); otherwise the scene resolution is used
"""

import argparse
import math
import os
import sys

import bpy

CYCLES_CAMERAS = {"hero", "three_quarter"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--designs", required=True, help="folder of artwork files")
    p.add_argument("--out", required=True, help="output folder")
    p.add_argument("--cameras", nargs="*", default=["hero", "three_quarter", "flat"])
    p.add_argument("--turntable", type=int, default=0, help="frame count; 0 disables")
    p.add_argument("--tumble", type=int, default=0, help="tumble frame count (two-axis precession loop); 0 disables")
    p.add_argument("--only", nargs="*", default=None, help="design slugs to render (default: all)")
    p.add_argument("--samples", type=int, default=32, help="Cycles samples for hero shots (denoised)")
    p.add_argument("--cpu", action="store_true", help="force Cycles onto the CPU")
    return p.parse_args(argv)


def eevee_engine_id():
    """Blender 4.2–4.x call EEVEE `BLENDER_EEVEE_NEXT`; 5.x went back to
    `BLENDER_EEVEE`. Ask the enum rather than guessing from version."""
    ids = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    for candidate in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        if candidate in ids:
            return candidate
    raise RuntimeError(f"no EEVEE engine among {sorted(ids)}")


def enable_gpu(scene, force_cpu):
    """Best effort: use Metal/CUDA/etc. for Cycles when available."""
    if force_cpu:
        scene.cycles.device = "CPU"
        return
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for backend in ("METAL", "OPTIX", "CUDA", "HIP", "ONEAPI"):
            try:
                prefs.compute_device_type = backend
            except TypeError:
                continue
            prefs.get_devices()
            gpus = [d for d in prefs.devices if d.type != "CPU"]
            if gpus:
                for d in prefs.devices:
                    d.use = d.type != "CPU"
                scene.cycles.device = "GPU"
                print(f"cycles: {backend} on {', '.join(d.name for d in gpus)}")
                return
    except Exception as exc:  # preferences may be unavailable in some builds
        print(f"cycles: GPU setup skipped ({exc})")
    scene.cycles.device = "CPU"


def set_engine(scene, camera_name, samples):
    if camera_name in CYCLES_CAMERAS:
        scene.render.engine = "CYCLES"
        scene.cycles.samples = samples
    else:
        scene.render.engine = eevee_engine_id()


def set_camera(scene, camera_name):
    cam = bpy.data.objects[camera_name]
    scene.camera = cam
    if "res_x" in cam and "res_y" in cam:
        scene.render.resolution_x = int(cam["res_x"])
        scene.render.resolution_y = int(cam["res_y"])


def render_still(scene, camera_name, out_path, samples):
    set_camera(scene, camera_name)
    set_engine(scene, camera_name, samples)
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)


def render_turntable(scene, slug, out_dir, frames, samples):
    pivot = bpy.data.objects["turntable_pivot"]
    set_camera(scene, "turntable")
    set_engine(scene, "turntable", samples)
    for i in range(frames):
        pivot.rotation_euler[2] = (i / frames) * math.tau
        scene.render.filepath = os.path.join(out_dir, f"{slug}_turntable_{i:03d}.png")
        bpy.ops.render.render(write_still=True)
    pivot.rotation_euler[2] = 0.0


def render_tumble(scene, slug, out_dir, frames, samples):
    """One smooth motion: constant-speed rotation about a single fixed axis
    that is tilted toward the camera (the way the Meta logo turns, or a coin
    rolling slowly). No secondary wobble. The case is leaned slightly off the
    spin axis so front, edge and back come round in one even sweep."""
    from mathutils import Quaternion, Vector

    pivot = bpy.data.objects["turntable_pivot"]
    set_camera(scene, "turntable")
    set_engine(scene, "turntable", samples)
    # Lighter frames for the idle loop: it is preloaded in full on the hero.
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640

    tilt = math.radians(26)   # spin axis tilted toward the camera
    lean = math.radians(12)   # case leaned off the spin axis (constant)
    axis = Vector((0.0, -math.sin(tilt), math.cos(tilt))).normalized()
    lean_q = Quaternion((1.0, 0.0, 0.0), lean)

    prev_mode = pivot.rotation_mode
    pivot.rotation_mode = "QUATERNION"
    base_scale = tuple(pivot.scale)
    pivot.scale = tuple(c * 0.9 for c in base_scale)
    for i in range(frames):
        t = (i / frames) * math.tau
        pivot.rotation_quaternion = Quaternion(axis, t) @ lean_q
        scene.render.filepath = os.path.join(out_dir, f"{slug}_tumble_{i:03d}.png")
        bpy.ops.render.render(write_still=True)
    pivot.rotation_quaternion = Quaternion((1.0, 0.0, 0.0, 0.0))
    pivot.rotation_mode = prev_mode
    pivot.rotation_euler = (0.0, 0.0, 0.0)
    pivot.scale = base_scale


def main():
    args = parse_args()
    scene = bpy.context.scene
    # Transparent background: the storefront composites renders onto its own
    # ground (light editorial theme), so no baked backdrop.
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    tex = bpy.data.images["case_artwork"]
    os.makedirs(args.out, exist_ok=True)
    enable_gpu(scene, args.cpu)

    files = sorted(
        f for f in os.listdir(args.designs) if os.path.splitext(f)[1].lower() in IMAGE_EXTS
    )
    if args.only:
        files = [f for f in files if os.path.splitext(f)[0] in set(args.only)]

    for f in files:
        slug = os.path.splitext(f)[0]
        tex.filepath = os.path.abspath(os.path.join(args.designs, f))
        tex.reload()
        for cam in args.cameras:
            render_still(scene, cam, os.path.join(args.out, f"{slug}_{cam}.png"), args.samples)
        if args.turntable > 0:
            render_turntable(scene, slug, args.out, args.turntable, args.samples)
        if args.tumble > 0:
            render_tumble(scene, slug, args.out, args.tumble, args.samples)
        print(f"rendered {slug}")


if __name__ == "__main__":
    main()
