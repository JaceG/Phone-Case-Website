# Presentation collection — September 2026

Three original, AI-assisted studies made with the built-in image generation tool:

- **Meridian:** a vermilion sun, black orbital bands, an electric-blue arc.
- **Static Bloom:** detailed poppies and fine foliage on deep plum.
- **Low Tide:** a quiet sea-glass and teal shoreline with an ochre sun.

The exact generation prompts are in `prompts.json`. The unmodified tool outputs
are checked in under `source/`. No third-party artwork or source images were used.
These are presentation studies for the first draft, not approved production designs.

`pnpm presentation:prepare` creates the 1070 × 1910 pixel print rectangle and a
smaller public artwork preview. The source aspect ratio is preserved with a very
small centre crop to fit the existing UV rectangle. No stretch, fade or gradient
is applied. Generated print masters in `pipeline/designs/` are ignored; original
sources and the public WebP previews are tracked.

Render with the established geometry and approved motion:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b pipeline/blender/master.blend -P pipeline/blender/render.py -- --designs pipeline/designs --out pipeline/out/presentation --cameras hero three_quarter flat detail --turntable 24 --tumble 288 --tumble-boost 37.6 --tumble-halfwidth .14 --samples 32
RENDERS_OUT=pipeline/out/presentation RENDERS_KEEP_PREVIOUS=1 pnpm renders:import
pnpm presentation:import
```

Each design has 4 stills, 24 turntable frames and 288 tumble frames. The original
3.55-second playback and per-frame phase sidecars are unchanged. The importer
converts animation frames to WebP and puts the renders in Payload media.

`presentation:import` updates the three existing seeded designs, preserving IDs,
individual prices and variants. It puts the public flat artwork first in `gallery`
and the camera close-up second; `DesignLanding` uses those as the artwork/detail
views. The case view reads `renders.threeQuarter`. Products without gallery images
fall back to case renders. These two gallery slots are the presentation-page
convention when adding a design through the current CMS.

The script keeps prior documents in ignored `pipeline/out/presentation/previous-presentation/`.
It reuses its own named media/artwork on repeat runs and reprices active draft
carts. Old per-model checker overrides are cleared, so the shared new artwork
appears for all sample phone options. Model-specific shells and physical print
coverage still require actual blanks and measurements.

For intentionally revised artwork, use a new presentation version/name or update
its existing media explicitly; the import does not replace a previously imported
same-version image behind its filename.
