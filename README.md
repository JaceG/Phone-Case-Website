# Phone Case Store

Direct-to-consumer store for original-design phone cases, printed to order
in-house. Payload CMS + `@payloadcms/plugin-ecommerce` + Next.js in one app.

See [CLAUDE.md](./CLAUDE.md) for the full brief and every decision made so far.

## Run locally

Requires Node ≥ 20, pnpm, and a local Postgres.

```bash
createdb phone_case_dev
cp .env.example .env      # set PAYLOAD_SECRET; DATABASE_URL already points at phone_case_dev
pnpm install
pnpm dev
```

Then:

1. Open <http://localhost:3000/admin> and create the first user (it becomes admin).
2. On the dashboard click **Seed your database**. This creates phone models,
   three placeholder designs with generated UV-checker imagery, and one
   variant per design × active phone model.
3. Storefront: <http://localhost:3000/shop>.

Stripe keys in `.env` are needed for checkout. Forward webhooks in dev with:

```bash
pnpm stripe-webhooks
```

## Data model

| Collection | What it is |
|---|---|
| `products` (labelled **Designs**) | One design. Artwork upload, story, renders, base price. |
| `phoneModels` | A blank you can print on. Geometry, dieline, status. |
| `variantTypes` / `variantOptions` | Plugin collections. Exactly one type, *Phone Model*; one option per phone model. Mirrored automatically. |
| `variants` | Design × phone model, with price. Generated on publish. |
| `artwork` | Private print masters. Licence metadata required. |
| `productionAssets` | Private dielines, `.blend`, `.glb`, test textures. |
| `media` | Public renders and site imagery. |
| `categories` (labelled **Collections**) | Thematic groupings of designs. |

Inventory is disabled at the plugin level. Everything is printed to order.

## Adding a design

1. Upload the print master to **Artwork** with its licence basis.
2. Create a **Design**, attach the artwork, set the price, publish.
3. Variants for every active phone model appear automatically.
4. Run the render pipeline (see [pipeline/README.md](./pipeline/README.md))
   and attach the outputs under **Imagery**. Automating step 4 is the next
   pipeline milestone.

## Adding a phone model

Create it under **Phone Models** and set status to *Active*. A variant is
created for every published design.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Next + Payload dev server |
| `pnpm generate:types` | Regenerate `src/payload-types.ts` after schema changes |
| `pnpm lint` | ESLint |
| `pnpm test:int` / `pnpm test:e2e` | Vitest / Playwright (template tests, not yet adapted) |
| `pnpm tsx pipeline/scripts/uv-checker.ts` | Write a UV checker PNG for Blender validation |

## Storefront routes

| Route | What |
|---|---|
| `/` | Featured design's landing page (cinematic tree) |
| `/products/[slug]` | Design landing page. Server-side device split: phones get the mobile tree, everything else desktop. `?device=mobile\|desktop` forces one for previewing. |
| `/shop`, `/checkout`, `/account`, `/login`, … | Payload template pages, kept as-is under `src/app/(app)/(template)` |
| `/admin` | Payload admin. `/admin/print-queue` lists orders waiting to print. |

## Layout

```
src/
  collections/      Payload collections (PhoneModels, Artwork, ProductionAssets, Products override, …)
  lib/catalog/      variant sync between phone models and designs
  plugins/          ecommerce / seo / form-builder plugin config
  endpoints/seed/   seed data and generated textures
  app/(app)/(cinematic)/  the real storefront (home + product landing pages)
  app/(app)/(template)/   Payload template pages (shop, checkout, account, auth, CMS)
  app/(payload)/          admin
  components/store/       cinematic storefront: shared state, catalog overlay, desktop/ and mobile/ trees
  components/admin/       print queue view
pipeline/           Blender batch render skeleton
uploads/            private files (gitignored)
placeholder/        borrowed prototyping images (gitignored, never deployed)
```
