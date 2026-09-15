# Model review batches

Updated 2026-09-15. Preparation can proceed in batches. Jace can review, compare,
approve, request changes or reject models in any order. There is no sequential
approval gate between models. Every approval still belongs to one model/version.

## Owner workflow

1. Open `/catalog-studio/models` as an administrator and choose **Prepare a batch**.
2. Name the batch, choose phones, and optionally mark it high priority. Queueing
   creates research candidates, not finished geometry, sales variants or a render job.
   Repeating the same batch name/phone combination does not duplicate it.
3. Search and filter by status, brand or batch. Select cards and export a worklist
   for the operator. Each exported row has its ID, phone slug, current version,
   last-update timestamp, feedback, and references.
4. Select two or three cards for comparison. Each column can show a different view.
5. Open any card to inspect all images, source links, preparation notes and review
   history. Save feedback, request changes, approve the preview or reject the model.
   Changes/rejection require a note. Saving keeps that model open; there is no
   forced next model. A `?model=ID` URL opens a specific review directly.
6. Use **Reopen review** when revisiting a decision. Preview approval never changes
   physical sample status or storefront availability.

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
Copy its `id`, phone `slug` and `updatedAt` from a fresh exported worklist; use that
last value as `expectedUpdatedAt`. Example structure (replace placeholders):

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
