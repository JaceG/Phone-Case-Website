# Catalog case studies

Prepared 2026-09-15. These are model-specific visual studies, not supplier CAD or
validated print templates. Codex owns preparation; Jace reviews finished results.

| Model | Geometry direction | Review entry | Remaining reference limits |
| --- | --- | --- | --- |
| iPhone 17 Pro | Broad raised camera deck; separate lens/flash/mic/LiDAR openings | 21 | Gorilla finished case + Apple phone drawing; printable blank unverified |
| iPhone 17 | Flush back; two lenses with separate flash/mic openings | 20 | Otofly finished case + Apple phone drawing; printable blank unverified |
| iPhone Air | Flush back; single lens, flash and microphone | 19 | Otofly finished case + Apple phone drawing; back thickness estimated |
| iPhone 16 Pro | Flush back; triangular lenses, flash, microphone, LiDAR | 18 | Otofly finished case + Apple phone drawing; LiDAR centre and clearances estimated |
| Galaxy S25 | Rounded flat back; three vertical lenses and flash | 16 | Elago case photos + Samsung envelope; camera positions estimated |
| Galaxy S25 Ultra | Squarer flat back; four lenses, autofocus, flash; S Pen opening | 17 | Elago camera/underside photos + Samsung envelope; positions estimated |
| Pixel 9 | Two-camera raised pill with proposed individual holes | 14 | CONCEPT: verified Bizon photos have a shared window; matching fine-hole blank still needed |
| Pixel 9 Pro | Three-camera raised pill with proposed individual holes | 15 | CONCEPT: shared-window reference; matching blank and exact sensor geometry still needed |

`catalog.json` contains the source URLs and geometry paths. IDs above describe the
current local review database, not stable identifiers for another environment.
The original iPhone 17 Pro Max remains in review entry 1, unchanged.

## Assets and repeatability

- Committed: eight parameter JSON files, the geometry builder, source-link records.
- Private local outputs: `pipeline/out/model-library/<slug>/shell.blend`, seven
  neutral views, two numbered checker views and two Static Bloom artwork views.
- Private source photos: `placeholder/model-references/`. Apple drawings are
  dimensional references, not public assets. Re-download from recorded sources
  if rebuilding on another machine; product listings can change.
- Review packages: 98 newly imported private images (88 renders + ten references).
  No new storefront media, phone activation or design publishing occurred.

Build any subset with `python3 pipeline/blender/build_review_library.py <slugs>`;
omit slugs for all eight. Inspect every result, then use the existing operator
importer described in `docs/model-review-batches.md`. Do not ask Jace to export a
worklist. Read fresh library IDs/revisions directly from Payload.

The Pixel packages are retained for inspection with coverage `unknown`, status
`draft`, and stage `failed` (displayed as **Needs attention**). Their approval is
disabled. Importing them again must preserve this research distinction; never
mark a conceptual camera deck as a verified blank.

## Geometry checks

All eight meshes passed closed topology, outward normals, actual camera and
bottom-port clearance, correct outer envelope and matching back/deck UV checks.
The unchanged iPhone 17 Pro Max parameters also passed a separate rebuild.
Neutral/camera/interior/side/bottom/checker/artwork contact sheets were inspected.
A micron-scale 17 Pro boolean sliver was repaired under a tightly bounded cleanup
rule; flat wall shading removes false creases around its speaker openings.

The website production build and nine focused review tests passed. The existing
ESLint configuration still fails during setup with a circular-config error.
Browser checks confirmed loaded private images, model detail/artwork switching,
and comparison of the distinct Samsung cases. Anonymous review-image access
returns 403. No human review or sample approval has been recorded.

## Known geometric approximations

Phone specifications establish a scale, not the outer blank dimensions. Side
walls, back thickness, clearances, camera protection profiles, lens lips, buttons,
ports and interior recesses still need a selected blank and measurements. The
flush-back studies approximate the extra back thickness around the cameras; they
are not fit-ready tooling models. Pixel sensor placement is a concept and must be
replaced from an exact qualifying blank. The UV rectangle preserves artwork
proportions but does not simulate material stretch around a curved surface.
