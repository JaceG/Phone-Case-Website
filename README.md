# Phone Case Store

An ecommerce site for original and licensed phone-case designs. Each design
gets a landing-page-style product page, with phone selection, a shared cart
and repeating three-case sets. Next.js, Payload CMS and its ecommerce plugin
run in one TypeScript app backed by Postgres.

The storefront, local Case Studio and manual Blender pipeline are working
drafts. Authenticated Catalog Studio now saves and reopens product drafts with
private originals and print layouts, per-model placement, automatic local renders,
private product-page previews and explicit publishing. The landing pages use 44
visually approved iPhone/Samsung models. Next: representative catalog trials,
then hosted operations and test-mode checkout before launch.

- [Current brief and development constraints](AGENTS.md)
- [Roadmap and case-model checklist](ROADMAP.md)
- [Blender pipeline and Case Studio](pipeline/README.md)
- [Presentation artwork workflow](pipeline/artwork/README.md)

## Run locally

Use Node 22, pnpm and Postgres. Blender is needed to generate new case assets,
not to serve previously generated images or open the existing editor.

For a **new checkout/database**:

```bash
pnpm install
cp .env.example .env
createdb phone_case_dev
```

Set `DATABASE_URL` for your Postgres user/database, replace `PAYLOAD_SECRET` and
`PREVIEW_SECRET`, and match server URLs to your local origin. Preserve an
existing `.env` rather than copying over it. Keep
`NEXT_PUBLIC_CHECKOUT_ENABLED=false`; Stripe setup is not required for this phase.

```bash
pnpm dev
```

Open [the admin](http://localhost:3000/admin); on a new database, create the first
user, who becomes admin. Optionally use the dashboard seed action for a disposable
development catalog. **Seeding clears and replaces catalog, cart, order and
related data.** It is not an additive import or a way to resume an existing
project. It creates synthetic checkers; use the presentation workflow afterward
for the presentation artwork.

Open [the storefront](http://localhost:3000/) or
[Case Studio](http://localhost:3000/case-studio). Existing installations only
need the configured database and `pnpm dev`.

## Current routes

| Route | Purpose |
|---|---|
| `/` | Featured design landing page |
| `/products/[slug]` | Individual design landing page |
| `/checkout` | Storefront order review; payment interface gated off by default |
| `/shop` | Retained template catalog; main experience uses the design switcher/overlay |
| `/account`, `/login`, other account/auth pages | Retained template foundations |
| `/admin` | Payload catalog and commerce admin |
| `/admin/print-queue` | Basic queue with artwork/order links; edit statuses on the order |
| `/case-studio` | Development-only placement tool, live 3D preview and local saves |
| `/admin` | Store workspace overview and shortcuts; advanced records below |
| `/catalog-studio/designs` | Searchable design library, one card per product, live/draft status |
| `/catalog-studio` | Admin-only artwork editor; Create design / Save changes |
| `/catalog-studio/models` | Admin-only batch queue, searchable model grid, comparison, feedback and review decisions |

Landing pages select desktop/mobile layouts through server-side device detection.
Use `?device=desktop` or `?device=mobile` for previews. The shared client component
currently imports both layouts; separate code delivery remains planned.

## Current catalog workflow

Start at **Overview** (`/admin`) or **My designs** (`/catalog-studio/designs`).
The workspace navigation connects designs, the artwork editor, case models, orders,
the print queue and the storefront. Advanced Payload records remain available below
the shortcuts; internal Studio history is hidden from the main navigation.

Choose **Create a design**, upload artwork, adjust placement and fill Design details.
**Create design** makes the product; **Save changes** updates that same design.
My designs shows one card per product, including whether saved changes are still a
draft while an earlier version is live. Reopening uses a stable `?product=…` URL;
old revision bookmarks also load the latest saved state. New design clears that URL.

Unchanged saves are no-ops and do not create files, history or invalidate previews.
Meaningful edits keep private history snapshots of the source, placement, print
layout, model fingerprint and optional 3D image for render consistency. These are
not separate catalog designs. Competing edits from another tab are rejected;
retrying an already-saved change returns the existing save. Published artwork
stays live until updated previews are generated, reviewed and published.

Moving a design to Trash preserves its Studio history and phone variants for
restoration, and hides it from the Studio picker and design library. Permanent
deletion removes that design's history and variants in the same transaction as
the product, including trashed variants. Artwork and media files are retained
because other designs or historical print jobs may reference them.

Routine details now fill on save: editable title-based tagline/story defaults,
colors extracted from the artwork, search title/description, related designs, and
$39 when no price exists. **Suggest missing copy** previews the copy in Studio.
These are deterministic starting suggestions, not an AI interpretation of the image.
Custom copy (including formatting), palette, price, URLs and SEO overrides are
preserved. The public hero becomes the sharing image on publication; private
originals are never used for that purpose. Permissions are never inferred.

Studio designs cannot be published from admin before their generated presentation
is ready. Save a draft and use Studio’s review/publish flow; this prevents empty
product pages with no selectable phones.

The admin form links directly to the design in Studio. Opening it brings
in the latest saved admin details; use Save changes before generating
previews if they changed. Advanced imagery controls are collapsed. Saved SEO and
related-design selections are now used by the landing page.

Continue below the editor in **From artwork to product page**:

1. Select all approved models, just iPhones/Samsung, or individual phones.
2. Choose a phone under **Check a phone’s placement** to inspect its actual
   approved geometry. Drag or resize its artwork independently, or restore
   shared placement.
3. **Generate previews** saves those model placements and starts local Blender
   rendering. Progress survives closing the page; reopen the same draft to resume
   reviewing. A failed job can be regenerated.
4. Review the generated cards, private print layouts, and complete desktop/mobile
   product-page previews. Shopping is disabled in private previews.
5. **Publish to catalog** attaches public derivatives and creates selected phone
   variants. The design appears in the shared catalog, landing page and set builder.
   Originals and print layouts stay private. New revisions leave the live product
   intact until published; outdated revisions/render sets cannot overwrite newer ones.

In local `/case-studio`, **Add to catalog** transfers the current original and
placement into Catalog Studio, including across sign-in. It does not publish.
The worker requires this computer and Blender to remain running. Jobs and exact
geometry/placement snapshots live under ignored `uploads/studio-renders/`; durable
hosting, offline scheduling and worker deployment remain later work.

The existing manual workflow also remains available:

1. Upload a prepared master under **Artwork**, with licensing information. Keep
   original images separate from fitted print masters.
2. Create a draft **Design** with artwork, story, collection and price.
3. Prepare its artwork for the template, render using the matching design slug,
   and import outputs using the [pipeline guide](pipeline/README.md).
4. Inspect imagery and page content, then publish. Publishing creates missing
   variants for active phone models. Sync preserves existing variant prices.

The presentation studies have a repeatable workflow in
[pipeline/artwork/README.md](pipeline/artwork/README.md). They are draft assets,
not an approved launch catalog. All 44 approved iPhone/Samsung models now have
matching previews for the three presentation designs (132 combinations). Selecting
a phone changes the desktop hero geometry, detail views and collection thumbnails;
mobile uses matching stills. Desktop choices are grouped by phone family, and the
mobile picker is searchable. Design switching preserves the selected phone.

Case Studio preserves image aspect ratio, supports direct artwork zoom and
placement, and saves local projects. Back only includes the camera surround
with solid sides; Wraparound also covers sides. Its primary editor uses the reference
iPhone shell, with approved-model placement adjustments in Catalog Studio. The local
`/case-studio` routes remain development-only.
The authenticated `/catalog-studio` mode creates catalog drafts in every environment.

Local Case Studio's **Saved files** supports individual **Delete** and **Clear all**.
Both move files into a recoverable local folder. **Undo** restores the last batch;
the **Deleted files** section offers individual Restore buttons after refreshing.
These controls affect saved Studio copies, not the current artwork or downloaded
copies elsewhere on the computer.

## Phone models

Create models under **Phone Models**. Setting one to **Active** generates variants
for published designs; it does not build geometry or validate a blank. Current
statuses are Active, Coming soon and Retired. The separate **Case model library**
records exact supplier blanks, preview reviews and physical sample status. Changing
geometry or blank identity resets its approval. Sales eligibility enforcement and
Studio switching among blank records remain planned.

Jace visually approved all 28 iPhones and 16 Samsung previews on 2026-09-16.
Physical samples remain unvalidated. The [candidate checklist](docs/case-models.md)
retains supplier evidence and sourcing gaps. Pixel concepts remain outside the
landing-page selector.

Public geometry and images are generated from approved review snapshots; the
storefront requires a live approval matching the export version. Read the
[approved-model export workflow](pipeline/README.md#approved-model-storefront-previews)
to rebuild them. These public derivatives contain only the three presentation
designs. Private originals, supplier references and review galleries stay private.
New designs still need their matching model assets before being offered.

Follow the [model checklist](ROADMAP.md) to source exact blanks with covered
camera surrounds and individual openings, build geometry and review each result
with Jace. Equipment selection and manufacturing budgets are outside this repo.

## Data model

| Collection | Role |
|---|---|
| `products` / **Designs** | Artwork relationship, story, palette, shared/per-model renders, price and publishing state |
| `phoneModels` | Phone/blank identity, geometry metadata, asset links and availability status |
| `variantTypes` / `variantOptions` | One Phone Model type, with options mirrored from phone models |
| `variants` | Design × phone model and price; generated by catalog hooks |
| `artwork` | Admin-only original artwork and prepared print masters with licensing metadata |
| `studioRevisions` | Append-only catalog saves linked to a product, private files, placement and geometry fingerprint |
| `caseBlanks` | Exact blank references, versioned geometry, private review images and independent preview/sample statuses |
| `productionAssets` | Admin-only templates, models and supporting files |
| `media` | Public renders and site imagery |
| `categories` / **Collections** | Design groupings |
| `carts` | Product/variant lines and authoritative server-priced subtotal |
| `orders`, `transactions`, `addresses`, `users` | Commerce foundations and basic fulfillment fields |

Plugin inventory is disabled. Future blank availability will be tracked by phone
model without stocking each finished design × model combination. Private assets
currently use local `uploads/`; public media is local too. Durable storage and
transactional email are not configured for launch.

## Offer behavior

Each complete trio is capped at $50; leftovers keep their single prices.
Higher-priced cases enter sets first, and a cheaper trio is not marked up.
At $39 each: 3 cases = $50, 4 = $89, 5 = $128, 6 = $100. Those steps are
intentional. Starting another set does not add or charge for anything.

The bag groups matching designs while preserving each phone variant's line
identity. Server pricing is implemented; the complete payment/refund/fulfillment
path still needs to be connected and validated.

## Commands and verification

| Command | Purpose |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Build / serve the production-mode app |
| `pnpm generate:types` | Regenerate Payload types after schema edits |
| `pnpm generate:importmap` | Regenerate admin component imports |
| `pnpm renders:import` | Import a manually rendered batch; see pipeline options |
| `pnpm presentation:prepare` / `pnpm presentation:import` | Prepare/import presentation designs |
| `pnpm verify:offer` | Verify server cart offer using temporary local data |
| `pnpm exec tsx pipeline/scripts/verify-storefront-models.ts` | Check 44 current approvals, 132 preview/variant combinations and a disposable mixed-phone cart |
| `pnpm test:int` / `pnpm test:e2e` | Vitest / Playwright suites |
| `pnpm lint` | ESLint; legacy FlatCompat configuration needs repair |

Focused pricing, set-builder, grouped-cart and approved-model tests coexist with template tests.
Run the focused set with:

```bash
pnpm test:int tests/int/bundlePricing.int.spec.ts tests/int/setBuilder.int.spec.ts tests/int/groupCartDesigns.int.spec.ts tests/int/studioContract.int.spec.ts tests/int/caseBlankReview.int.spec.ts
```

With the local server running, `pnpm exec tsx tests/scripts/verifyStudioUpdates.ts`
checks unchanged saves, retry deduplication, stable design links, private access,
concurrent edits and cleanup with disposable records.

`pnpm exec tsx tests/scripts/verifyDesignDeletion.ts` checks permanent and bulk
deletion, trash/restore, hidden trashed drafts, shared-asset retention and rollback
with disposable records. It does not delete existing catalog designs.

The older `pnpm exec tsx tests/scripts/verifyStudio.ts` tests
authentication, original preservation, draft/revision saves, racing saves, published
version isolation and browser save/reopen. It uses installed Chrome in headless
mode, creates its own temporary admin/catalog data and cleans it up. Screenshots
are written under ignored `placeholder/studio-verification/`.

Use a development/test database for checks that create records. A passing focused
suite does not mean the template suites or launch flows have been validated.

## Source layout

```text
src/collections/              Catalog, assets and commerce overrides
src/lib/catalog/              Variant synchronization
src/lib/commerce/             Offer pricing and cart grouping
src/components/store/         Shared shopping state and desktop/mobile storefronts
src/components/Cart/          Grouped bag and add-for-another-phone controls
src/components/case-studio/   Local artwork editor and Three.js preview
src/components/admin/         Basic print queue
src/app/(app)/(cinematic)/    Home, design landing pages and checkout review
src/app/(app)/(template)/     Remaining template catalog/account/CMS routes
src/app/(payload)/            Payload admin and API
pipeline/                    Blender, artwork preparation and import scripts
uploads/                     Private local assets (ignored)
placeholder/                 Local trial artwork/projects/exports (ignored)
```

## Batch model review

[Case model review](http://localhost:3000/catalog-studio/models) supports preparing
multiple models together and reviewing them in any order. Search by phone/blank,
filter by brand/status/batch, compare two or three selected models, and save
feedback or individual approval directly in a review window. Queued models
remain visibly unfinished. Export selected worklists for the operator.

See [the batch preparation/import guide](docs/model-review-batches.md).
Verification: `pnpm exec tsx tests/scripts/verifyModelReview.ts` creates and removes
its own test records, checks imports/revisions/access and exercises desktop/mobile
review, comparison and queueing. `STUDIO_TEST_ORIGIN` can target a built app on a
different local port. This requires a local running app/database and Chrome.
