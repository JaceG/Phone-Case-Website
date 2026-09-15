# Model review batches

Updated 2026-09-15. Preparation can proceed in batches. Jace can review, compare,
approve, request changes or reject models in any order. There is no sequential
approval gate between models. Every approval still belongs to one model/version.

## Responsibilities

Codex owns preparation: choose the next catalog phones, research exact model
references, create the library records, build each shell, validate it, inspect
renders and import the finished review package. A batch is an internal way to
organize that work. Jace does not need to name batches, queue phones, export
worklists or run Blender. Do not hand those tasks back to him.

Preparation of one model continues while another waits for review. Missing
references remain an operator research task, with a visible explanation; do not
quietly replace a fine-hole blank with a large camera window.

## Owner workflow

1. Open `/catalog-studio/models` and choose any finished model, or filter to
   **Ready for you**. Each model has its own independent review.
2. Inspect the neutral case, camera detail, interior, numbered checker and artwork
   views. Source photos and links explain what the model was based on.
3. Leave feedback, request changes, approve the preview or reject it. Changes and
   rejection need a note. Saving keeps the model open; there is no forced next item.
4. Select two or three cards to compare. Switch views independently in each column.
5. Reopen a previous decision when needed. A `?model=ID` link opens one review.

Optional queue/export controls are collapsed under **Preparation tools**. They
are operator conveniences, never a prerequisite for reviewing.

Only completed packages with individual camera openings can be approved. Notes
can be saved on unfinished candidates. A stale review is rejected if someone
updates the model while its review window is open. **Load latest, keep my note**
retains unsaved text while fetching the new model for another look.

## Operator preparation

The dashboard is a work queue, not a background rendering service. Work through
any number of queued models; waiting for one review must not stop another model.
Use the existing Blender pipeline for geometry/render generation. Do not reuse
one phone's geometry under another model's label.

Collect references for the exact phone model. A supplier may show only one shared
photo across many variants. Search other blank listings and finished printed
cases for camera surrounds, individual openings, edge profiles, controls and
proportions. Record finished-case sources as `finishedCase`; they are shaping
references, not approved catalog artwork or proof of blank availability.

Update the stage of one queued model as work progresses (replace `MODEL_ID`):

```bash
pnpm exec tsx pipeline/scripts/model-review-batch.ts stage modeling MODEL_ID
pnpm exec tsx pipeline/scripts/model-review-batch.ts stage rendering MODEL_ID
pnpm exec tsx pipeline/scripts/model-review-batch.ts stage failed MODEL_ID "Need a camera-side reference"
```

Stage updates never approve a model. Approved models must be reopened by the owner
before starting another pass. The admin record also exposes batch, priority, stage,
references and preparation notes. Keep owner feedback separate from research notes.

## Import completed packages together

Save a manifest outside committed assets, for example under `placeholder/`.
Each entry targets a queued library record. Paths resolve relative to the manifest.
Read its `id`, phone `slug` and `updatedAt` directly from Payload as the operator;
use the last value as `expectedUpdatedAt`. No owner-exported worklist is required. Example structure (replace placeholders):

```json
{
  "models": [
    {
      "id": 123,
      "slug": "iphone-17-pro",
      "expectedUpdatedAt": "COPY_FROM_WORKLIST",
      "geometryFile": "iphone-17-pro/params.json",
      "notes": "Exact blank reference; list measured values and remaining estimates.",
      "cameraCoverage": "fineHoles",
      "supplierURL": "https://example.com/exact-blank",
      "supplierVariant": "Exact phone and blank variant",
      "references": [
        {
          "title": "Exact model camera and edge view",
          "url": "https://example.com/finished-case",
          "kind": "finishedCase",
          "notes": "Camera surround and side-profile shaping reference only."
        }
      ],
      "images": [
        { "caption": "Supplier reference", "file": "iphone-17-pro/reference.png" },
        { "caption": "Neutral shell", "file": "iphone-17-pro/neutral.png" },
        { "caption": "Camera detail", "file": "iphone-17-pro/camera.png" },
        { "caption": "Inside and rim", "file": "iphone-17-pro/inside.png" },
        { "caption": "Numbered checker", "file": "iphone-17-pro/checker.png" },
        { "caption": "Side coverage", "file": "iphone-17-pro/side.png" },
        { "caption": "Artwork preview", "file": "iphone-17-pro/artwork.png" }
      ]
    }
  ]
}
```

The geometry JSON must include the same phone `slug`. Reference kinds are `blank`,
`finishedCase`, `phone` and `sample`. List what each reference establishes; a phone
specification alone does not establish the blank's outer geometry.

```bash
pnpm exec tsx pipeline/scripts/model-review-batch.ts import placeholder/batch.json
```

Up to 50 packages can be imported in one invocation, each with 2–20 labeled
images. Prepare the full reference/neutral/camera/interior/checker/side/artwork set
where available. The two-image minimum is an input guard, not a sufficient visual
review standard. Output reports each model separately; one failure does not block
other imports. Failed entries can be fixed and rerun. If all packages import, the
process exits successfully; any failures produce a nonzero exit status.

The importer fingerprints geometry, review imagery and reference details. An
identical package is skipped, preserving its existing decision. A changed package
requires a matching last-update timestamp, clears that model's prior preview and
sample approvals, retains owner feedback/history, and marks it **Ready for review**.
Older private images are retained for now; durable revision browsing and storage
cleanup remain later work. Review-package fingerprints are not Studio mesh IDs;
importing a review package does not install that shell into the placement editor.

## Verification

`pnpm test:int tests/int/modelReview.int.spec.ts tests/int/caseBlankReview.int.spec.ts`
checks filtering, readiness and review invalidation. With the app running,
`pnpm exec tsx tests/scripts/verifyModelReview.ts` checks private access, queue
idempotence, import/reimport, simultaneous and stale decisions, per-model history,
comparison, nonsequential review, mobile layout and cleanup using temporary records.

## Researched catalog library

`pipeline/model-library/catalog.json` records eight additional model studies and
their model-specific source links. Their parameter files live under
`pipeline/blender/params/`. Build them locally with:

```bash
python3 pipeline/blender/build_review_library.py
# Or rebuild just one:
python3 pipeline/blender/build_review_library.py iphone-17-pro
```

The operator script builds and validates each shell, then renders seven neutral
views and four checker/artwork views. Failures are isolated per model and logged
under `pipeline/out/model-library/<slug>/`. It never replaces the storefront
master, the placement editor mesh or existing product renders. Inspect the output
before importing. Reference images remain private under `placeholder/`.

Apple phone drawings establish phone dimensions and rear camera centres; Samsung
and Google specifications establish phone envelopes. Case thickness, clearances
and photo-derived dimensions remain estimates. A finished silicone case does not
prove availability of a compatible sublimation blank. Pixel fine-hole adaptations
are concepts only until an exact matching blank is found; keep their coverage
unverified and their approval disabled.
