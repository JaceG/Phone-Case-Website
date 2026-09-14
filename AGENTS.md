# Custom Phone Case Store — Project Brief

Context document for Codex. Captures decisions made during planning so
they don't need re-deriving. Update this file as decisions change.

---

## What this is

A direct-to-consumer store selling custom-designed phone cases, printed
on demand in-house by the owner (Jace, sole developer/operator).

The site is the differentiator, not the product category. Competitors in
this space are cheap and largely selling unlicensed IP. The position here
is: original designs, real brand, a shopping experience nobody else has.

---

## Product decisions

- **Print on demand, in-house.** No pre-stocked design × model
  combinations. Blanks are stocked; designs are printed per order.
- **No inventory reconciliation needed** across SKU combinations. This is
  why Payload beat Medusa (see below).
- **Designs must be original or properly licensed.** Non-negotiable.
  Unlicensed IP puts payment processing at risk (Stripe termination →
  MATCH list → hard to get a replacement processor).

---

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js | Full control over the cinematic front end |
| Commerce + CMS + admin | **Payload CMS** + `@payloadcms/plugin-ecommerce` | Single TypeScript app; plugin covers products/variants, carts, orders, transactions, customer addresses, Stripe, multi-currency |
| Payments | Stripe | Via the plugin's payment adapter |
| Animation | GSAP / Framer Motion + Lenis | Per the cinematic prompt kit's stack |
| 3D | Blender (asset generation) + optional React Three Fiber | See imagery pipeline |

**Why Payload over Medusa:** Medusa is the stronger commerce engine, but
its advantage is operational inventory complexity — which print-on-demand
eliminates. Payload keeps content, assets, copy, products, and orders in
one app with one admin.

**Known risk:** the Payload ecommerce plugin is officially open source but
still in beta; breaking changes are possible. Pin versions, be deliberate
about upgrades.

**Fallback:** if the commerce side outgrows Payload, Medusa owns the
commerce data layer and Payload stays as the content layer, both consumed
by Next.js over API. Design boundaries so this swap stays possible.

---

## Site architecture

### Product pages are landing pages

Each product page is a focused, cinematic CTA page for that one design.
The catalog is **not** dumped onto the product page — it's reachable via a
menu/overlay.

**Commerce direction confirmed by Jace, 2026-09-14:** this is an ecommerce
store, and every phone-case design gets its own landing-page-style product
page, like the current editorial page. The homepage can feature a design;
the full treatment must also work at each `/products/[slug]` URL. Use a
shared page system with design-specific artwork, story, palette and images
so adding designs does not require hand-building another page.

**Primary merchandising offer: three cases for $50.** Most designs will be
priced alike. The experience should encourage building a three-case order
while retaining the ability to buy individually. The current seeded $39
single-case price is a placeholder, not a newly confirmed pricing decision.
Exact individual pricing and any offer exceptions remain open.

Direction for the next review-stage design pass:

- Keep the light editorial hero, approved rotation and persistent purchase
  controls, and develop the complete product-page story below them.
- Make browsing designs part of assembling an order. The proposed bundle
  interaction uses three visible case slots, progress such as "1 of 3
  selected", and a clear "$50 for 3" offer. Browsing another design must
  retain the selected phone and cases already added; viewing a design does
  not automatically add it to the order.
- Give each design its own hero/story/detail imagery while sharing case
  information, ordering explanation and FAQs where applicable.
- Present one coherent offer across the product page, sticky purchase bar
  and cart. Retain each selected design and phone variant for fulfillment.
- Use the cinematic kit selectively for editorial imagery, product details,
  useful scroll reveals and copy. The next milestone includes three strong
  presentation designs, complete supporting sections and a separate mobile
  treatment. Keep Stripe parked during this draft.

Resolution for the landing-page-vs-catalog tension:
**persistent sticky buy bar.** The CTA never leaves the viewport, so the
rest of the page is free to browse without costing conversion.

Catalog surfacing patterns to consider, best first:
1. **Persistent design-switcher** that swaps the case artwork on the same
   product render without a page load. Strongest option for this product
   specifically — the form factor is identical across the catalog, only
   the art changes, so browsing and buying become one interaction.
2. "Other designs in this collection" — narrow, thematic, curated.
3. Full-bleed horizontal-scroll gallery at page bottom.

### Mobile and desktop are designed independently

Not responsive breakpoints. Two separate designs sharing one design
language, each built for its platform.

**Implementation: one route tree, two component trees.**
Same URL, `<MobileProductPage>` / `<DesktopProductPage>` chosen at render
via **server-side** device detection. Client-side swap is wrong — it ships
both bundles and flashes the wrong one first.

Rejected: separate `/m/*` and `/d/*` route trees. Same visual outcome but
forks the sitemap and creates SEO duplication for no gain.

**Why this is justified here:** the interaction vocabularies genuinely
differ. Desktop cinematic language is cursor-reactive parallax, hover
reveals, scroll-scrubbing. Mobile is tap, swipe, momentum, haptics. Those
aren't one design at two widths.

**Tablets and foldables are explicitly out of scope.** Do not optimize.
Single viewport/UA threshold; anything at or above it gets the desktop
tree. A tablet gets desktop-narrow and that's an acceptable outcome.

---

## Imagery pipeline

Goal: adding a new design is **one file upload**, and all product images
generate themselves. This is what makes a large catalog maintainable by
one person.

### Approach: Blender, modeled once

1. Model the case shell once. Camera cutout, button cutouts, camera island.
2. UV unwrap the printable face. **The UV map and the physical print
   template must share one coordinate space** — otherwise renders stop
   being accurate proofs of what ships. This is the critical constraint.
3. Material: image-texture node drives base color; roughness + normal maps
   for the case finish. The texture filepath is the only per-design change.
4. Cameras and lighting set up once: hero, three-quarter, flat-on for
   catalog grid, turntable for scroll-scrubbing.
5. Batch render headless via Blender's Python API.

```bash
blender -b master.blend -P render.py
```

```python
import bpy, os

tex = bpy.data.images['case_artwork']
designs = '/path/to/designs'

for f in os.listdir(designs):
    tex.filepath = os.path.join(designs, f)
    name = os.path.splitext(f)[0]
    for cam in ['hero', 'three_quarter', 'flat']:
        bpy.context.scene.camera = bpy.data.objects[cam]
        bpy.context.scene.render.filepath = f'/out/{name}_{cam}.png'
        bpy.ops.render.render(write_still=True)
```

Cycles for hero shots, EEVEE for grid thumbnails.

### Web delivery

- **Turntable as frame sequence** (36–60 frames), scrubbed on scroll.
  Lighter on mobile than shipping a WebGL scene.
- Optionally export shell as GLB + React Three Fiber for true
  interactivity **on desktop only**. Maps cleanly onto the two-component-
  tree split: R3F on desktop, frame sequence on mobile.

### Rules

- **Product pixels must be truthful.** The case, print quality, color, and
  cutouts represent what ships. Environment, lighting, atmosphere, and
  motion can be synthetic (AI-generated or rendered).
- Test with UV checker textures and edge-alignment grids, not real
  designs — stretching and misalignment are visible immediately on a
  numbered checker and invisible on artwork.
- Design folder structure now for an eventual Payload hook → headless
  Blender worker, even if runs are manual at first.

---

## Production hardware (deferred until after the site ships)

Planned purchase, ~$3,363:

| Item | Price |
|---|---|
| eufyMake E1, Basic bundle | $2,359 |
| UV DTF Laminating Machine | $399.99 |
| UV DTF A/B Film | $99.00 |
| Standard Adhesive Mat (10-pack) | $69.99 |
| Air Filter | $34.99 |
| eufyMake Care | $399.99 |

Do **not** buy the Deluxe bundle ($3,059) — it bundles a rotary attachment
(mugs/tumblers) that's irrelevant here. Basic + laminator à la carte is
$300 cheaper.

**Process: UV DTF, not direct-to-object.** Print reversed onto AB film,
laminate, peel, apply. The film conforms to curves and wraps case edges —
which a flatbed cannot do. Flatbed direct printing gives face-only prints
with a visible flat border, and can't print across the raised camera
island step.

Notes:
- Printhead warranty is only 3 months; replacement head is $599. Hence
  eufyMake Care.
- Ink shelf life is 12 months from production. Don't stockpile.
- Ink maintenance runs roughly $54/month printing daily.
- Ask eufyMake support about **flexible white UV ink** if printing on
  TPU/silicone rather than rigid PC — standard ink cracks on flex.

---

## Open decisions

1. **Blank case selection.** The silicone MagSafe case originally
   referenced is viable again under UV DTF (it wasn't under direct
   flatbed). Needs final choice + supplier.
2. **Print template / dieline** from the blank supplier or measured from a
   physical sample with calipers. **Blocks the Blender UV unwrap.**
3. **Which phone model first.** Shell geometry is model-specific.
4. Whether eufyMake Studio runs on macOS, or a Windows print station is
   needed.
5. Design sourcing: commission, license, or artist revenue-share.

---

## Local assets

Reference material lives outside the repo at:

```
/Users/jace/Downloads/Phone Website Stuff
```

Path contains spaces — quote it in shell commands:
`ls "/Users/jace/Downloads/Phone Website Stuff"`

Expected contents:

| Files | What they are | How to use |
|---|---|---|
| `H*.avif` (7 files) | Liquid silicone MagSafe case product photos — three-quarter, angled edge, colorway grid | **Geometry reference** for the Blender shell. Load as background reference planes. Modeling from a photo of an object is fine; the output is original geometry. |
| `S*.avif` (5 files) | Third-party case listings showing full-bleed wrapped-edge print quality | **Finish/quality reference only.** These are unlicensed anime IP. Do not use the artwork. They illustrate what UV DTF wrap looks like versus flatbed. |
| `Screenshot_*.png` | Marketplace and printer listings | Purchasing research. No build relevance. |
| `*.html` | Notion exports of the two purchased design kits | Prompt library and Figma template index. |

`.avif` isn't universally supported — convert before use:

```bash
cd "/Users/jace/Downloads/Phone Website Stuff"
for f in *.avif; do magick "$f" "${f%.avif}.png"; done
```

### Placeholder discipline

Any borrowed image used while prototyping goes in a **gitignored
`placeholder/` directory** and is never deployed, including to staging.
The moment a borrowed image sits on a public URL it stops being a dev
placeholder.

Prefer generated test textures over real designs for pipeline validation
— a numbered UV checker or edge-alignment grid reveals stretching and
misalignment immediately, where artwork hides it. Also avoids letting
someone else's art direction shape the layout.

### Known case dimensions

From the silicone case listing, confirmed by Jace on 2026-09-08 (treat as
outer envelope / starting scale, not gospel):

- 6.1-inch blank: 150 × 75 × 13 mm
- 6.9-inch blank: 165 × 81 × 13 mm

The 6.9-inch figures are on the seeded iPhone 17 Pro Max. No seeded model
is 6.1-inch (the 17 / 17 Pro / 16 Pro are 6.3-inch), so which phone the
6.1-inch blank is for is still open decision #3.

The 13 mm depth is unreliable — a silicone case wall is more like
1.5–2 mm, so that figure is likely the packaged item or the full
phone-plus-case stack. **Get wall thickness, camera island height, and
corner radius from calipers on a physical sample.**

---

## Design assets on hand

- **Kit: Cinematic Websites with AI** — 85+ prompts (site/image/copy) plus
  a formula. Fixed cinematic DNA: near-black, dramatic light, parallax,
  giant serif, film grain. Prompts name the stack explicitly (Next.js +
  Tailwind + Framer Motion + Lenis), fonts, hex values, section structure.
  Targets v0/Lovable/Bolt/Cursor/Codex.
- **GRIGOLETTO Templates Pack** — 43 Figma section templates (heroes,
  navs, footers, pricing, testimonials, features grids, 2 full landing
  pages). Design files, not code.

Caveat: the prompt kit is one aesthetic. Everything built from it will
look related. Vary deliberately, or pair with a system file (shadcn/ui
Figma, Untitled UI) for structure and use GRIGOLETTO for hero treatments
and typographic moments.

---

## Suggested build order

1. Payload project scaffold; products/variants schema modeling
   design × phone model.
2. Stripe adapter + cart + checkout working end to end with placeholder
   product images.
3. Blender shell + UV unwrap once the dieline exists; batch render script.
4. Wire render outputs into Payload's media library.
5. Desktop product page (cinematic, full treatment).
6. Mobile product page (independent design).
7. Catalog overlay + design-switcher.
8. Order → print queue status flow.

Commerce plumbing first, cinematic layer second. The pretty part is more
fun and less likely to block launch.

---

## Current state (updated 2026-09-08)

Build-order step 1 is done and step 2 is scaffolded.

**Repo:** scaffolded from Payload's official `ecommerce` template
(`create-payload-app -t ecommerce`, Payload 3.88.0, Next 16, Postgres via
`@payloadcms/db-postgres`, pnpm). Local DB is `phone_case_dev` on the
Homebrew Postgres 14 service. `.env` is set up; Stripe keys are still
placeholders. Dev server config for the Codex browser lives in
`.Codex/launch.json` (`dev`).

**Schema decisions made while building:**

- **Inventory is disabled** (`inventory: false` on the plugin). The template
  storefront's stock checks were removed; availability = "a variant exists".
  The plugin's order-confirm endpoint still tries to `$inc` an `inventory`
  field, but the Postgres adapter drops unknown fields, so it's a no-op.
- **`phoneModels`** is a first-class collection (geometry, dieline, shell,
  supplier, status). It mirrors itself into the plugin's `variantOptions`
  in a `beforeChange` hook. There is exactly one `variantType`,
  `phoneModel`, created on demand.
- **Products are labelled "Designs".** Fields: `artwork` (private upload),
  `tagline`, `description` (story), `palette`, `renders` group
  (hero / threeQuarter / flat / turntable[]), `renderStatus`, `gallery`
  (optional per-model shots via `variantOption`), `collections`
  (= `categories`, relabelled), base price. `enableVariants` defaults on.
- **Variants are generated, not hand-made.** Publishing a design creates a
  variant for every active phone model at the design's base price;
  activating a phone model fans out across every published design.
  Idempotent. Logic in `src/lib/catalog/syncVariants.ts`.
- **Variants collection is overridden** (`src/collections/Variants.ts`)
  because the plugin's own title hook and option validator query without
  `req`, i.e. outside the caller's transaction, which breaks creation from
  inside a product hook on Postgres.
- **Do not use Payload `context` flags across nested local-API calls that
  share a `req`.** `createLocalReq` merges nested `context` into the shared
  request, so a "skip" flag set once leaks into every later operation. This
  bit the first seed run. The hooks are now flag-free.
- **Private uploads:** `artwork` and `productionAssets` live in `uploads/`
  (gitignored), read access admin-only, served only via Payload's
  access-controlled file endpoint. Verified: anonymous file and list requests get 403, admin gets 200.
- **Seed is fully synthetic.** Generated numbered UV checkers (via sharp)
  for artwork and renders, a dark gradient for site imagery. Five phone
  models (three active), three designs, nine variants. Dashboard "Seed"
  button or `POST /next/seed` as admin.

**Print queue (step 8, rough first draft):** the plugin's `orders` collection
is overridden in `src/collections/Orders.ts` (admin group "Fulfillment").
Each order carries a `fulfillment` group (`printStatus` queued → printing →
printed → qc → packed → shipped, plus cancelled; `printedAt`/`shippedAt`
are stamped by a beforeChange hook on the first transition into those
states; carrier/tracking/notes) and a read-only `printJobs` array, one row
per line item (design title/slug, phone model name, qty, `artwork` and
`variant` relationships), built by a beforeChange hook on create (or on
update if still empty) by walking item → product → artwork and variant →
options → option label. All lookups pass `req`; no `context` flags.
`/admin/print-queue` (`src/components/admin/PrintQueue/`, registered under
`admin.components.views` + `afterNavLinks`) lists orders in queued/printing
oldest-first with links to the print master file and the order. Seed adds a
demo transaction + two orders (one printed, one queued). Rough edges: the
view is a plain table with no actions (status changes happen on the order);
`printJobs` is never rebuilt once populated (re-save after clearing it, or
add a backfill); the anonymous guard relies on a Next `redirect()` inside
the RSC stream rather than an HTTP 3xx; no list preset on Orders yet.

**Pipeline:** `pipeline/` holds the Blender batch script (`render.py`) and
the naming contract. Blender is installed at `/Applications/Blender.app`
(not on PATH); the installed version is 5.1, whose EEVEE id is
`BLENDER_EEVEE` (4.2–4.x used `BLENDER_EEVEE_NEXT`; `render.py` reads the
enum).

**Blender shell (steps 3–4, first draft, 2026-09-08):**
`pipeline/blender/build_shell.py` builds `master.blend` parametrically from
`pipeline/blender/params/iphone-17-pro-max.json` in about a second, so the
JSON is the source and the blend is disposable. Measured (from the listing):
the 165 × 81 × 13 mm envelope. **Placeholder, awaiting calipers:** wall
thickness (1.8 mm), corner radius (10 mm), camera island (a 38 mm square
top-left of the back, 2.5 mm proud — the real 17 Pro Max plateau spans most
of the width), and the lens cutout (island inset 3 mm, 6 mm corners). The
UV unwrap is the dieline itself: back face centred, side walls folded out
by the 13 mm depth, so the print template is `(81 + 26) × (165 + 26)` mm =
1070 × 1910 px at 10 px/mm, and `pipeline/scripts/uv-checker.ts` defaults
to that size (documented in `pipeline/README.md`). Verified on numbered
checkers: labels render unstretched, the outer columns/rows land on the
walls, the island and cutout show. The three seeded designs are rendered
(hero, three-quarter, flat, 24-frame turntable) and imported through
`pnpm renders:import` (`pipeline/scripts/import-renders.ts`, idempotent),
which fills `renders.*` and sets `renderStatus = 'ready'`. Everything the
renders show is a UV checker; there is still no real artwork, and the
storefront still uses the template UI.

**Template fixes applied (keep):** `generatePreviewPath` pointed at a
non-existent `(frontend)` route group; the `Media` image component built
absolute `http://localhost:3000` URLs which Next 16's image optimizer rejects
as a private-IP upstream, so same-origin media now stays relative
(`images.localPatterns` covers `/api/media/file/**`); `remotePatterns` now
carries the port. Storefront reads imagery through
`src/utilities/productImages.ts` (renders first, then gallery). The shop
filter uses the renamed `collections` field.

**Storefront (steps 5–7) first draft, 2026-09-08:**

- Routes are split into two groups under `src/app/(app)`: `(template)`
  keeps the Payload template's shop/checkout/account/auth/CMS pages with
  its own header/footer; `(cinematic)` is the real storefront (`/` and
  `/products/[slug]`) with its own chrome (Lenis, grain, minimal header).
  `/` renders the featured (first published) design; product pages are
  landing pages.
- **Server-side device split** in `src/utilities/device.ts`: client hints
  then UA sniff; phones → `MobileProductPage`, everything else (tablets
  included) → `DesktopProductPage`. `?device=mobile|desktop` overrides
  for previewing. Both trees share `ProductExperience`, which owns the
  active design and selected phone model (persisted in localStorage).
- **Design-switcher**: the whole catalog is serialised into the page
  (`src/lib/storefront/loadStorefront.ts` → `CatalogDesign[]`); switching
  swaps artwork in place and rewrites the URL with `history.replaceState`.
  Desktop: catalog overlay + "more from collection" row. Mobile: swipe the
  hero, dots, overlay.
- Desktop: cursor-parallax hero, scroll-scrubbed turntable (canvas frame
  sequence when `renders.turntable` exists, 3D-rotating hero otherwise),
  hover reveals, sticky glass buy bar. Mobile: swipe hero, bottom-sheet
  phone picker with haptics, fixed buy bar. Styling: Instrument Serif +
  Geist, `#0a0a0b`/`#f0efed`, tokens in `src/components/store/store.css`.
- Cart/checkout reuse the template's `useCart`, cart sheet and `/checkout`.
  Copy on the pages (silicone, MagSafe, matte, "ships in days") is
  placeholder and needs to match the real blank.

**Known template debris still to clean:** `pnpm lint` fails on the
template's eslint config (FlatCompat circular-structure error, upstream);
storefront UI under `src/app/(app)` and `src/components` is the template's
and will be replaced in steps 5–7; Playwright/Vitest tests are the
template's and not adapted.

**Next (first draft complete, 2026-09-08):** every build-order step has
a rough working version. Review order suggested: storefront copy and
motion (steps 5–7), then blank/dieline reality (calipers → params JSON →
rebuild → rerender → `pnpm renders:import`), then Stripe test keys for
step 2. Also: pick the 6.1-inch blank's phone (open decision #3), replace
the generated checker designs with real licensed artwork, and decide the
brand name (`SITE_NAME` / `NEXT_PUBLIC_SITE_NAME`).

---

## Imported Claude continuation (2026-09-11)

This section was imported from the local Claude Code transcript after the
initial first-draft milestone. Treat it as the current direction for the
prototype.

### Editorial desktop reference and interaction direction

- The reference file is
  `https://www.figma.com/design/E1xCViV2T1hHpok5iycz2Q/Daily-Hero-35----Arkkhe--Copy-?m=auto&t=wZptTxzCyTfBvRoG-6`.
  It was a flattened showcase image rather than an editable Figma design,
  so its composition was rebuilt as code rather than modified in Figma.
- The previous cinematic page was rejected as a superficial tweak. The
  desktop hero was rebuilt around the reference's fixed **1440 × 810**
  composition: light silver ground; headline at upper left/top; product
  large on the right; dark rectangular CTA; staggered right-edge tiles
  for iPhone / Android / all designs; bottom-left phone-model slider card.
  Do not drift back to the prior centred dark product-page composition.
- The product prototype now exposes device-family switching (iPhone /
  Android), model selection, and render crossfades. Android is catalogued
  for interaction testing but deliberately reuses the iPhone shell render
  until real model-specific geometry is made. This is a function-first
  prototype decision.

### Hero motion: approved current behaviour

- The hero must never wobble, shimmy, or rotate like a top. It uses one
  fixed tilted axis at constant angular geometry — a smooth coin/Meta-logo
  style rotation.
- Playback is intentionally non-uniform: it lingers only when the front
  faces the viewer, speeds up as soon as the edge comes around, and passes
  the back quickly. The approved timing is roughly **2.5 seconds** for the
  front window and **1.05 seconds** for edges/back. The front window is
  approximately ±50° around dead-front.
- The sequence has **288 frames**. Frames are distributed by time rather
  than angle (203 in the slow front region, 85 in the fast remainder), with
  a per-frame phase sidecar consumed by `SpinningRender.tsx`. This avoided
  visible stepping without inflating to 576 frames. Preserve this mechanism
  if retuning timing.
- The pre-speed-profile state is committed and tagged **`v1.0`**. The
  approved hero motion work is committed as **`fa70b51`**.

### Shell revised from the supplied blank reference photos

- The generic single rectangular camera cutout was replaced with three
  raised-lip lens holes in a triangle, plus separate flash, microphone, and
  depth-sensor holes. The MagSafe ring and alignment line are shallow
  grooves in the back; artwork continues across them.
- Hole definitions are data in
  `pipeline/blender/params/iphone-17-pro-max.json`, so each future model
  supplies a list of centres/diameters instead of needing a new mesh script.
- The current shell redesign is **uncommitted**. Its dimensions, hole
  placement, raised lips, camera plateau and MagSafe groove are traced by
  eye from reference photos and remain placeholders pending a physical
  blank and caliper measurements. A faint island-top UV artifact around
  the lenses is known and documented in `pipeline/README.md`.

## Blender refinement (2026-09-12)

Jace authorized another Blender pass using the Alibaba blank listing and local
reference photos. `build_shell.py` now delegates geometry to `shell_geometry.py`:
explicit rolled back/rim/interior profiles, a broad 72 × 43 mm camera surround
with a recessed deck, thin separate lens lips, six clear camera-area openings,
shallow MagSafe grooves, four side controls, and bottom charging/speaker holes.
The old boolean-union camera-deck streaks were fixed by separate lens-lip
meshes and reprojection after cuts/bevels. Material and lighting now use matte
lavender inner silicone, subtle surface grain, broad lights, and AgX highlights.
The shared 1070 × 1910 artwork rectangle remains; curved-surface flattening
and film stretch remain approximations. All detail dimensions are visual
estimates; only the outer 165 × 81 × 13 mm comes from the supplied listing.

Final render batch is `pipeline/out/refined/`: three stills, 24 turntable and
288 tumble frames per design. The approved axis, speed functions, 3.55-second
playback and phase sidecars are unchanged. The editorial page composition and
Android shell reuse are preserved. Plain lavender review images are in
`pipeline/out/review/lavender/`, including `detail` and `interior` cameras.

`validate_shell.py` checks closed outward-facing mesh parts, clear camera
openings, the shell envelope and shared back/deck UV coordinates. Prior
uncommitted source/model/sample renders are saved in
`pipeline/out/review/baseline/`. Import with `RENDERS_KEEP_PREVIOUS=1` to retain
old media and write rollback relationships under the render output directory's
`previous-renders/<timestamp>/`. See `pipeline/README.md` for commands.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ecommerce landing-page draft (2026-09-14)

The prior Case Studio work was committed as `276d07c` before starting this pass.
Implementation lives on `codex/three-case-storefront`.

- `/` and `/products/[slug]` share the complete landing-page system: approved
  light editorial desktop hero and spin, visible design switcher, three-case
  builder, flat artwork → case → close-up reveal, story/palette, ordering steps,
  collection, FAQ and closing CTA. Mobile uses its own swipe hero, phone sheet,
  tap-through imagery, horizontal collection and bottom purchase bar.
- The three original AI-assisted presentation designs replace the seeded UV
  checkers for visual review: Meridian / Form, Static Bloom / Flora, Low Tide /
  Tide. Sources and prompts are tracked in `pipeline/artwork/`; commands and the
  two gallery-slot convention are documented there. Renders and private uploads
  remain generated/local. The approved 288-frame phase mapping is unchanged.
- `src/lib/commerce/bundlePricing.ts` defines the draft USD offer. Each full set
  of three is capped at $50; leftovers retain individual prices. Higher-priced
  units go into the set first. Duplicates, mixed models and multiple sets work.
  The offer never increases a cheaper set's normal price. All current catalog
  products are cases and participate; exception eligibility is still undecided.
- `src/collections/Carts.ts` appends pricing after the plugin's default hook,
  preserving guest access/secrets. It resolves authoritative prices through
  the local API with `req`, checks variant ownership and whole quantities, and
  persists the discounted subtotal. Partial updates reprice original items;
  caller-supplied subtotals are ignored. Product/variant line identities remain
  intact for fulfillment. `pnpm verify:offer` creates and removes its own local
  test cart; the pure price tests are in `tests/int/bundlePricing.int.spec.ts`.
- The builder uses Payload's actual persistent cart. Browsing never adds a case.
  Phone selection is remembered; each added item keeps its own phone. Design
  switching writes a shareable URL and supports browser back/forward.
- `/checkout` now uses cinematic chrome and an order-review screen with correct
  subtotal and savings. `NEXT_PUBLIC_CHECKOUT_ENABLED` defaults off. Stripe,
  delivery/tax rules and actual payment remain parked. Existing single prices
  ($39 / $39 / $42) were preserved as draft values, not newly approved pricing.
- Public copy no longer promises unverified UV DTF, full-wrap availability,
  silicone/MagSafe specifications or shipping times. The FAQ identifies current
  renders as sample-case previews. Physical blank, print method, coverage,
  artwork approval and model-specific geometry remain review-stage decisions.
