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

- Committed: thirty-one additional parameter JSON files, the geometry builder, source-link records.
- Private local outputs: `pipeline/out/model-library/<slug>/shell.blend`, seven
  neutral views, two numbered checker views and two Static Bloom artwork views.
- Private source photos: `placeholder/model-references/`. Apple drawings are
  dimensional references, not public assets. Re-download from recorded sources
  if rebuilding on another machine; product listings can change.
- Initial eight review packages: 98 private images (88 renders + ten references).
  No new storefront media, phone activation or design publishing occurred.

Build any subset with `python3 pipeline/blender/build_review_library.py <slugs>`;
omit slugs for all thirty-one. Inspect every result, then use the existing operator
importer described in `docs/model-review-batches.md`. Do not ask Jace to export a
worklist. Read fresh library IDs/revisions directly from Payload.

The Pixel packages are retained for inspection with coverage `unknown`, status
`draft`, and stage `failed` (displayed as **Needs attention**). Their approval is
disabled. Importing them again must preserve this research distinction; never
mark a conceptual camera deck as a verified blank.

## Geometry checks

The initial eight meshes passed closed topology, outward normals, actual camera and
bottom-port clearance, correct outer envelope and matching back/deck UV checks.
The unchanged iPhone 17 Pro Max parameters also passed a separate rebuild.
Neutral/camera/interior/side/bottom/checker/artwork contact sheets were inspected.
A micron-scale 17 Pro boolean sliver was repaired under a tightly bounded cleanup
rule; flat wall shading removes false creases around its speaker openings.

The website production build and nine focused review tests passed. The existing
ESLint configuration still fails during setup with a circular-config error.
Browser checks confirmed loaded private images, model detail/artwork switching,
and comparison of the distinct Samsung cases. Anonymous review-image access
returns 403. Human decisions live in the review database; this document does not override them.

## iPhone 16 and 15 expansion

Prepared 2026-09-15, separately from the original eight studies.

| Model | Geometry direction | Local review entry |
| --- | --- | --- |
| iPhone 16 Pro Max | Flush back; three lenses, flash, mic, LiDAR; Camera Control opening | 28 |
| iPhone 16 Plus | Flush back; vertical lenses, flash, mic; Camera Control opening | 27 |
| iPhone 16 | Smaller envelope; vertical lenses, flash, mic; Camera Control opening | 26 |
| iPhone 15 Pro Max | Flush back; three lenses, flash, mic, LiDAR; Action button | 25 |
| iPhone 15 Pro | Smaller envelope and estimated camera/back depth; Action button | 24 |
| iPhone 15 Plus | Raised covered camera deck; diagonal lenses; mute-switch opening | 23 |
| iPhone 15 | Flush back; diagonal lenses; mute-switch opening | 22 |

Each exact Apple drawing establishes phone dimensions and dimensioned camera and
control positions. Inspected Otofly finished-case photos establish the coverage
style; their 16 Pro Max and 16 Plus pages reuse family imagery, so those photos
are not treated as dimensional evidence. Pro LiDAR positions, case clearances,
back thickness, protection lips, interior recesses and bottom port patterns remain
estimates. These cases are not verified sublimation blanks or physical-fit CAD.

Each package has eleven renders and one private source image (84 new images).
All seven pass topology, outward-normal, aperture, envelope and UV checks; neutral,
close-up, checker, artwork, inside, side and bottom views were inspected. New
phone records use the existing hidden `retired` status to keep preparation out
of the storefront. Existing reviews, published designs and sellable variants
remain unchanged. The local database holds review status and private assets.

## iPhone 14 and 13 expansion

Prepared 2026-09-15, with eight independent review packages.

| Model | Geometry direction | Local review entry |
| --- | --- | --- |
| iPhone 14 Pro Max | Raised covered deck; triangular lenses, flash, mic, LiDAR | 36 |
| iPhone 14 Pro | Flush covered back; triangular lenses, flash, mic, LiDAR | 35 |
| iPhone 14 Plus | Raised covered deck; diagonal lenses, flash, mic | 34 |
| iPhone 14 | Flush covered back; diagonal lenses, flash, mic | 33 |
| iPhone 13 Pro Max | Raised covered deck; triangular lenses, flash, mic, LiDAR | 32 |
| iPhone 13 Pro | Smaller envelope; raised covered deck and model-specific right lens | 31 |
| iPhone 13 mini | Distinct smaller envelope/camera spacing; raised covered deck | 30 |
| iPhone 13 | Raised covered deck; diagonal lenses, flash, mic | 29 |

Each exact Apple drawing and inspected Otofly (14 family) or Surphy (13 family)
case photo is linked in `catalog.json` and its params file. Incorrect newer-phone
photos on the initially found Otofly 13 Pro/Pro Max pages were rejected. All eight
have mute-switch openings and an estimated Lightning-port opening, without
Action/Camera Control features. The 14 Plus has a finished-case shape reference
but no verified exact printable blank listing. Case details, Pro LiDAR centres,
mini flash horizontal position and bottom speaker/microphone case patterns
remain estimates; phone drawings do not establish blank fit.

The eight meshes pass topology, outward-normal, aperture, envelope and UV checks.
All eleven rendered views per model were visually inspected, including neutral,
inside, side, bottom, close-up, checker and artwork. The private import contains
96 images (88 renders plus eight source photos). Import checks confirmed all
eight packages are ready with twelve views, all sixteen previous reviews are
unchanged, and the eighteen variants and three published designs are unchanged.
The live dashboard shows all eight new models; the mini artwork gallery loads,
and anonymous requests to all eight covers return 403. User decisions remain in the
review database. New phone records stay hidden from commerce pending the later
reviewed-model integration and physical validation steps.

## iPhone 12 family and iPhone 17e

Prepared 2026-09-15. This completes the missing 12-family studies and adds 17e
to the existing 17/17 Pro/17 Pro Max/Air coverage.

| Model | Geometry direction | Local review entry |
| --- | --- | --- |
| iPhone 12 | Raised covered camera area; two vertical lenses, flash and mic | 41 |
| iPhone 12 mini | Smaller envelope; separate vertical camera spacing and controls | 40 |
| iPhone 12 Pro | Covered camera area; three lenses, flash, mic and estimated LiDAR | 39 |
| iPhone 12 Pro Max | Larger lens diameters, spacing, envelope and camera deck | 38 |
| iPhone 17e | Flush covered back; single lens, flash and mic; Action button, USB-C | 37 |

The four 12 models use mute-switch openings and Lightning connector clearances.
Each uses its exact Apple drawing for phone dimensions, camera and button centres.
The 17e also has its own Apple drawing; its Otofly 17e listing uses 16e-named
photos for the flush-back direction. Finished 12-case photographs are from
SNPMarket, Rozetka sellers and Mobikoff. The mini reference is low resolution;
the 12 Pro image does not clearly resolve every small sensor opening. Pro LiDAR
positions and all case-specific details remain estimates pending samples. No
logos from reference photos are copied into the generated meshes or artwork.

Five private packages contain 60 images: 55 renders and five reference photos.
Existing 17-family reviews remain separate and unchanged: 17/17 Pro/Air each
have twelve views, while the original 17 Pro Max has eight. This preparation
does not replace the storefront/editor shell or make these phones sellable.

## Known geometric approximations

Phone specifications establish a scale, not the outer blank dimensions. Side
walls, back thickness, clearances, camera protection profiles, lens lips, buttons,
ports and interior recesses still need a selected blank and measurements. The
flush-back studies approximate the extra back thickness around the cameras; they
are not fit-ready tooling models. Pixel sensor placement is a concept and must be
replaced from an exact qualifying blank. The UV rectangle preserves artwork
proportions but does not simulate material stretch around a curved surface.

## iPhone submodel completeness audit — 2026-09-15

The missing 16e and SE (2020/2nd generation, 2022/3rd generation) now have
separate review packages. `iphone-lineup.json` records the 28 expected Apple
models across the prepared range: all 12–17 variants, Air and those two SEs.
It is independently transcribed from Apple's model-identification list, not
inferred from whatever entries already happen to exist in the catalog.

Run `python3 pipeline/blender/audit_iphone_coverage.py` to detect missing or
duplicate catalog entries, missing/wrong geometry and iPhone studies omitted
from the checklist. This offline check does not assert live review readiness.
Refresh the checklist from its official source when expanding the model range.
Color, storage and regional A-numbers do not create separate case studies;
regional fit differences must still be checked against a chosen blank. iPhone
11 and earlier, and SE 1st generation, remain outside this prepared range.

| Addition | Review entry | Geometry/reference |
| --- | --- | --- |
| iPhone 16e | 44 | Exact Apple 16e drawing; Otofly fine-hole flush-back case, exposed Action button |
| iPhone SE (2020) | 43 | Apple shared SE drawing; covered camera surround, mute switch, Lightning |
| iPhone SE (2022) | 42 | Same dimensioned shape as 2020; independent review record |

Apple explicitly labels its SE drawing for both 2nd and 3rd generations. The
SE finished-case photo is labeled 2022; reuse for 2020 is based on that documented
compatibility. The listing was out of stock. The initial Otofly 16e variant with
a common camera window was rejected; the selected reference has separate holes.
The 16e reference has no built-in magnets. All are shape references, not verified
printable blanks. Case clearances, optical keepouts, thickness and curved SE side
profiles remain estimates. These three models add 33 renders and three private
reference photos. User approval and physical validation remain pending.

Verification: all three new shells pass topology, aperture, envelope and UV checks;
all 33 rendered views were inspected. Live audit confirms exactly one review for
each of the 28 expected iPhones and every referenced gallery file is present.
All 29 previous review records, 18 sellable variants and three published designs
are unchanged. The 16e artwork gallery loads in the browser; anonymous access to
each new cover returns 403. Local database snapshots were saved before and after.
