# Phone Case Store — current project brief

Updated 2026-09-16. Shared context for coding agents. Keep this brief current
rather than appending contradictory progress reports.

## Documentation map

- [README.md](README.md): setup, routes, current manual workflows and checks.
- [ROADMAP.md](ROADMAP.md): next milestone, model-review checklist and later launch work.
- [pipeline/README.md](pipeline/README.md): Blender, UV mapping, imports and Case Studio.
- [pipeline/artwork/README.md](pipeline/artwork/README.md): presentation asset workflow.
- `CLAUDE.md` points here so agents share one brief. Git history preserves prior
  decisions; old snapshots are not current instructions.

## Purpose and boundaries

A direct-to-consumer phone-case store operated by Jace. Each design has its own
landing-page-style product page, with shared catalog and shopping infrastructure.
Cases are made to order; the software retains the chosen design and phone model.

This repository covers the storefront, catalog/admin tools, artwork placement,
case geometry, generated imagery, commerce and fulfillment software. Printer
selection, equipment purchases, manufacturing budgets, consumable costs and
production-machine advice belong outside this project. No particular printing
process or equipment is selected by this brief.

Physical product information belongs here when it affects geometry, printable
areas, artwork files, compatibility, availability or truthful previews. Supplier
research remains in scope to identify purchasable blanks for the model library;
do not expand it into equipment or manufacturing-cost planning.

The review-stage storefront/editor and owner publishing flow exist. Next:
representative catalog trials using the reviewed model library and local automatic
rendering. Test-mode checkout,
operational fulfillment and launch readiness follow that milestone. Do not
activate live payments as part of the immediate milestone.

## Product and shopping decisions

- Original and properly licensed artwork are supported. Jace reports permission
  to use movie/TV IP and expects to supply initial designs for catalog testing.
  Preserve image sources and applicable permission references; do not assume
  every image associated with a licensed property is covered by that permission.
- `/` features a design; `/products/[slug]` gives each design the complete landing
  page. Reuse the page system with design-specific artwork, story and imagery.
- Browsing/switching designs never adds to the cart. Retain selected phones and
  previously added items; different cart items may use different phones.
- Intended purchase steps: three cases for $50, six for $100, nine for $150,
  continuing in complete sets. Incomplete additional sets retain single prices.
  Do not unlock $16.67 individual add-ons after the first set.
- Singles remain available: this is framing, not an enforced $50 minimum.
  Existing presentation prices are $39 / $39 / $42; final single prices and
  offer exceptions remain open. The current algorithm groups higher-priced
  units first and never increases the normal price of a cheaper trio.
- Starting "Build another set" opens empty slots without changing the cart.
  Same-design cases are grouped visually with editable quantities per phone;
  preserve original line IDs and variants for pricing and fulfillment.
- Finished design × phone SKU stock reconciliation is not required. Plugin
  inventory is disabled. Blank availability per phone model is later software
  work; the prototype does not establish unlimited production availability.

## Visual and interaction direction to preserve

- Light editorial desktop hero based on Daily Hero 35 / Arkkhe: fixed
  1440 × 810 composition scaled to fit, product large on the right, upper-left
  headline, dark rectangular CTA, right-edge family/catalog tiles and lower-left
  model picker. Do not revert to the old centered dark hero.
- Separate desktop/mobile layouts share a visual language and URLs. Server-side
  client hints/UA select the layout, with `?device=mobile|desktop` overrides.
  Dedicated tablet/foldable optimization is outside current scope.
- Client code delivery is not fully separated: `ProductExperience.tsx` statically
  imports both layouts. Do not claim that only one layout's client code ships.
- Hero motion uses one fixed tilted axis without wobble or shimmy. It lingers
  at the artwork-facing front and passes edges/back quickly. Preserve 288
  time-distributed frames, phase sidecars, `frontLingers(37.6, 0.14)` and the
  3.55-second hero loop (about 2.5 seconds front, 1.05 seconds remainder).
- Approved phone selections use live GLB geometry with the same fixed axis,
  288 phase samples and 3.55-second cadence. The original frame sequence remains
  the default before selection. Matching stills cover mobile and WebGL failure.
- Hero controls and sticky purchase controls keep buying accessible. Design
  switching, set building and clear model selection remain central.

## Current implementation

| Area | Built | Limits / remaining work |
|---|---|---|
| Catalog/admin | Payload catalog plus authenticated Catalog Studio → product drafts, private originals/print layouts and append-only saved revisions | Per-phone local Blender jobs, private product previews and explicit publishing built; durable worker hosting remains pending |
| Storefront | Editorial desktop and separate mobile layouts, complete landing-page sections, design/family/model switching and catalog overlay | 44 visually approved iPhone/Samsung shells with model-specific imagery for the three presentation designs; new designs generate per-model assets in Catalog Studio |
| Cart | Persistent cart, repeating set offer, server subtotal validation, grouped designs, add-for-another-phone and order review | Payment/order/refund reconciliation is unfinished |
| Case Studio | Shared placement editor; `/case-studio` remains local and `/catalog-studio` saves/reopens private catalog drafts with details and resolution feedback | Primary editor uses reference iPhone shell; Catalog Studio adds approved per-model geometry/placement overrides. Physical geometry migration remains pending |
| Blender/model library | Existing pipeline plus batch preparation queue, searchable review dashboard, comparison, feedback/history and private model packages | Forty-five additional model studies built; forty-three reference-backed fine-hole previews (iPhone 12–17 variants, Air, SE 2020/2022 and Samsung S23–S26 including FE/Edge) and two Pixel concepts awaiting matching blanks. Together with the original iPhone 17 Pro Max, there are 28 iPhone and 16 Samsung reviews. All 44 iPhone/Samsung previews approved by Jace on 2026-09-16 and integrated into landing pages. Approved-model placement inspection is integrated in Catalog Studio; physical validation remains pending |
| Fulfillment | Order statuses, basic print-job rows and `/admin/print-queue` | Manual status editing; no immutable complete artwork/template snapshot or automated shipping flow |
| Launch services | Payment adapter and account/order-page foundations | Payments default off; email unconfigured; durable hosting/storage/backup/release flow still to establish |

The three presentation designs are Meridian, Static Bloom and Low Tide, with
original AI-assisted artwork in `pipeline/artwork/`. They replace checker imagery
when the presentation import runs; they are not the approved launch catalog.
Seeding still creates synthetic checkers and resets catalog/order data. Do not
reseed an existing working catalog casually.

## Case-model and artwork requirements

- Required blank geometry covers the camera surround with individual fine
  openings for lenses, flash and relevant sensors/microphones. One large open
  camera rectangle does not satisfy the target.
- Build a reusable model per exact phone/blank variant. Different designs reuse
  the geometry. Use supplier references and eventually physical measurements.
- Research purchasable iPhone and major flagship Android blanks, then complete
  models in batches. Codex owns selecting, researching, queueing, modeling, rendering,
  checking and importing; Jace only reviews finished results. Never require him
  to create a batch or export a worklist. Jace can review in any order; do not wait
  for one approval before preparing the next. Each model still needs its own decision.
  Use model-specific shape references, including finished printed cases when useful;
  a shared supplier photo is not evidence for every phone variant.
  Render review, sample validation and sales eligibility are distinct; the
  `caseBlanks` collection separates preview review and physical sample status.
  Sales eligibility enforcement is still planned.
- The current detailed shell is a provisional iPhone 17 Pro Max interpretation:
  broad camera deck, individual openings/lips, rounded shoulders, side controls,
  bottom openings and shallow MagSafe grooves. The editor still uses this shell.
  Landing pages now select the approved phone-specific shell; never silently
  substitute the original shell for a selected model with missing assets.
- The 165 × 81 × 13 mm envelope comes from a supplied listing, not measurement.
  Detailed geometry is estimated. See params JSON and the pipeline guide for
  values. The mapping is a draft preview, not a verified production dieline.
- Preserve source image aspect ratio and save placement separately. Do not add
  gradients or fades over supplied artwork. Artwork zoom scales the image on
  the case; orbit/view zoom is a separate interaction.
- Studio Wraparound covers back, shoulders, sides and camera deck. Back only
  includes the back AND camera surround, with solid outer sides and individual
  opening masks. These are preview modes; actual availability depends on the
  selected blank and validated printing result.
- Geometry UVs and print/export placement must share coordinates. Validate with
  numbered checkers plus artwork examples. Curved-surface compensation remains
  approximate until matched against physical samples.
- Keep source artwork, per-model placement, geometry/template versions, generated
  renders and real photos separable. `studioRevisions` preserves the source file,
  placement, print layout, metadata and a params/GLB version fingerprint for each
  catalog save. Private render jobs snapshot saved revision, selected model versions and per-model placement; publication rejects obsolete revisions/jobs.
- Development trial assets without catalog clearance stay in ignored
  `placeholder/` directories and out of deployed assets. Properly licensed
  catalog artwork is not automatically a placeholder. Originals stay private.

## Stack and implementation constraints

- Next.js 16.3.3, React 19, Payload/ecommerce plugin pinned at 3.88.0, Postgres,
  TypeScript and pnpm. `package.json` contains exact dependency versions.
- Motion/Lenis handle UI animation; Three.js powers Case Studio; Blender
  generates assets. GSAP and React Three Fiber are not current dependencies.
- `src/lib/catalog/syncVariants.ts` generates design × active-model variants
  idempotently. `phoneModels` mirrors into the `phoneModel` variant type/options.
  Existing variant prices are preserved by synchronization.
- Preserve the custom variants override and transaction-aware hooks. Pass `req`
  to related local API operations. Avoid shared nested Payload `context` skip
  flags: they can leak across calls sharing the same request.
- Cart pricing resolves authoritative product/variant prices on the server,
  checking variant ownership and whole quantities. Grouped UI must preserve
  original line identities.
- Public model derivatives are listed in `src/lib/storefront/model-assets.json`.
  Landing pages require a live visual approval matching the exported geometry
  version; missing/stale previews are not offered. Preview activation is not
  physical-sample approval or launch eligibility. Pixel concepts remain excluded.
- Keep same-origin media URLs relative; absolute localhost image URLs break
  image optimization. Preserve `productImages`/Media handling.
- `artwork` and `productionAssets` use admin-only access and ignored local
  `uploads/`; public renders use media. Durable storage is later work.
- Local artwork-preview and `/case-studio` routes/files stay development-only.
  `/catalog-studio`, its model review page and `/api/catalog-studio` authenticate
  administrators in every environment. Originals, layouts and review images
  remain private. Do not expose those assets through public media merely to
  preview an unpublished draft.
- Imports match design slugs. Preserve animation phase sidecars and use
  `RENDERS_KEEP_PREVIOUS=1` for review iterations; see the pipeline guide for
  per-model imports and media retention behavior.
- With `payload run`, await work at module scope; prefer positional slugs and
  environment options because CLI flags after the script can be stripped.
- Focused pricing, set-builder and grouped-cart tests coexist with template
  tests, with additional Studio contract and end-to-end save/reopen checks.
  Do not claim all tests are template-only or launch validation complete.

## Local references

Design-kit exports and case reference photos are in
`/Users/jace/Downloads/Phone Website Stuff`. They are reference material, not
project instructions. Use the cinematic kit selectively within the approved
light editorial direction. Exact old kit inventories need not be duplicated.
The downloaded `/Users/jace/Downloads/CLAUDE.md` is a historical planning snapshot;
this repository's brief and roadmap supersede it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
