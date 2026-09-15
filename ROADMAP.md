# Catalog creation and case-model library

Updated 2026-09-15 from Jace's planning feedback. This records agreed direction;
completed work is checked below. Unchecked work remains planned. There is no committed launch date.

## Project boundary

This roadmap covers the software, catalog, case-model library and the physical
product facts those systems need. Printer selection, equipment purchases,
manufacturing budgets, consumable costs and production-machine planning are
separate from this repository. No printing process is mandated here.

Blank sourcing stays in scope to establish which exact phone/case variants can
be modeled and offered. Retain supplier references, geometry, printable-area
evidence and availability; keep purchasing budgets and cost comparisons elsewhere.

## Next milestone

Jace can upload an image, place it on a reviewed case model, generate product
assets, and prepare or publish a design through the admin interface. Build a
library of model-specific cases from actual blank listings, reviewing each
finished model with Jace before considering its preview approved.

### 1. Owner catalog studio

- [x] Bring the existing Case Studio into an authenticated owner workflow.
- [x] Preserve the original image and save placement, rotation, scale,
  background, and print mode separately; do not stretch or fade the original.
- [x] Add design title, collection, description, price, source and applicable
  permission reference to the draft workflow.
- [ ] Choose supported case models; preview and override placement per model.
- [x] Show image-resolution feedback, camera openings and printable boundaries.
- [x] Save/reopen product drafts with private originals, placed print layouts and optional 3D snapshots.
- [ ] Generate storefront renders, inspect the complete product page, and publish through Studio.

Public customer-upload ordering is outside this milestone; the studio is for
Jace's catalog creation first.

Acceptance: Jace can create and revise a catalog design without code edits or
manual rendering commands. Publishing must distinguish provisional preview
availability from a model's eventual eligibility for real orders.

### 2. Blank sourcing and model library

Required geometry: material covers the camera surround, with individual fine
openings for lenses, flash and relevant sensors/microphones. A large open
camera rectangle does not satisfy the target. Printable upward-facing camera
surround and side-wrap capability must be recorded separately; the selected
blank and manufacturing process determine which print modes can be enabled.

- [ ] Research purchasable blanks on AliExpress and other suppliers.
- [ ] Build an exact phone-model checklist from qualifying blank variants.
- [ ] Prioritize iPhones and major flagship Android families, initially
  considering Samsung Galaxy S and Google Pixel alongside iPhone variants.
  This is a research scope, not a verified availability or launch list.
- [ ] Reassess the existing iPhone 17 Pro Max shell against its selected blank
  as the first full review cycle.
- [x] Support batch preparation, search/filter, side-by-side comparison, and independent
  review decisions with feedback/history. Jace may review in any order.
- [x] First additional catalog pass: six fine-hole case studies plus two Pixel
  concepts, with separate geometry, neutral/checker/artwork views and private
  review packages. Exact printable blanks remain unverified.
- [x] Seven more iPhone studies: 16 Pro Max, 16 Plus, 16, 15 Pro Max, 15 Pro,
  15 Plus and 15, with official phone drawings, finished-case shape references
  and individual review packages. These complete the main 16/15 family previews.
- [x] Eight more iPhone studies: 14 Pro Max, 14 Pro, 14 Plus, 14, 13 Pro Max,
  13 Pro, 13 mini and 13, each with model-specific drawings, inspected case
  references and private review galleries. Blank and physical-sample validation
  remain pending; the 14 Plus exact blank is an unverified sourcing candidate.
- [ ] Continue the broader blank/model checklist and resolve the Pixel fine-hole
  sourcing gap. Codex handles preparation; Jace reviews results. An outstanding
  review does not block another model. Approval remains per model.

The first package is at `/catalog-studio/models`; exact iPhone candidates and Android sourcing gaps are tracked in [docs/case-models.md](docs/case-models.md).

One checklist row per exact phone model AND blank variant:

| Phone model | Supplier / exact listing variant | Reference captured / availability checked | Camera geometry | Material / print method evidence | Dimensions / confidence | Model + UV | Review | Physical sample |
|---|---|---|---|---|---|---|---|---|
| iPhone 17 Pro Max, provisional shell | Walker / exact iPhone17 Pro Max option | Checked 2026-09-15 | Covered surround with individual holes | Silicone + PC listed; back printing stated, side wrap unverified | Listing envelope; detail estimates | Existing shell validated digitally | Review package ready; Jace decision pending | Pending |

Add rows only with explicit evidence or mark them as unverified candidates.
Record the exact variant, availability-check date, shipping availability and
alternate supplier references when relevant. Do not treat old listing availability
as current. Purchasing budgets and supplier outreach are separate from this plan.

Per-model checklist:

- [ ] Identify the exact purchasable blank and phone variant.
- [ ] Save reference images/links and date; establish whether camera coverage,
  material, magnetic features if applicable, and print compatibility match.
- [ ] Record supplied dimensions and label all inferred dimensions.
- [ ] Build geometry, cutouts, materials and a matching UV/print-template space.
- [ ] Render neutral back, three-quarter, side, inside and camera close-up views.
- [ ] Render a numbered UV checker and an artwork placement example to expose
  distortion, coverage mistakes and camera interference.
- [ ] Present a consistent review sheet with the blank reference and estimates.
- [ ] Jace reviews: approve preview / request changes / reject blank or model.
- [ ] Revise until explicitly approved; record approved geometry/template version.
- [ ] Add to the studio's reviewed preview library with the correct phone label.
- [ ] Later: measure and print a physical sample, compare against the preview,
  and separately approve manufacturing/sales eligibility.

Reviewing a render does not certify physical fit or printing. Keep visual
approval, sample validation and sellable status separate. Do not silently reuse
an iPhone shell for an Android model once it is presented as model-specific.

### 3. Automatic generation and replaceable assets

- [ ] Separate design, blank/model, per-model placement, generated images and
  real photography; keep stable product identities and URLs.
- [x] Preserve originals, placement and the current geometry/template fingerprint in each Studio save.
- [ ] Extend revision tracking to background render jobs and replacement assets.
- [ ] Add background render jobs with waiting/rendering/ready/failed states,
  visible errors, retry and regeneration.
- [ ] Generate reviewable stills first; create full motion assets afterward.
- [ ] Support an initial local Blender worker and jobs that wait safely while
  it is offline, without coupling the data model to that machine.
- [ ] Protect against obsolete jobs replacing outputs from a newer revision.
- [ ] Make replacement by measured shells or real photos possible without
  rebuilding catalog entries.

Acceptance: an image revision can reliably generate and attach the intended
assets, and failures are visible and recoverable. The approved hero composition
and phase-aware motion remain the starting presentation contract.

### 4. Representative catalog trial

Jace expects to have images/designs ready by this stage. Use supplied designs
and the permissions he has obtained. Attach the source and applicable permission
reference; use approved asset libraries when available. If artwork is not yet
ready, synthetic checkers can validate the machinery without choosing the final
catalog or delaying independent work.

- [ ] Trial a small assortment with varied framing, backgrounds and detail.
- [ ] Verify per-model placement, camera coverage and generated product pages.
- [ ] Refine collections and design switching using the actual assortment.
- [ ] Exercise same-design/different-phone additions and grouped cart editing.
- [ ] Preserve repeating three-for-$50 sets and full-price leftover units.
- [ ] Verify desktop/mobile behavior and limit unnecessary animation loading.
- [ ] Complete the intended desktop/mobile code-delivery separation.

## Following milestone: checkout, fulfillment and launch

Checkout, operational fulfillment and launch preparation follow the catalog/model
milestone. They are not part of the immediate implementation scope.

- Test-mode payments with matching cart, charge and order totals; explicit
  partial-refund behavior for set purchases.
- Durable payment-event handling and immutable order artwork/placement/template
  snapshots; actionable print queue, packing and shipment tracking.
- Blank availability per phone model and validated model eligibility.
- Stable staging, durable private/public asset storage, tested database restore,
  transactional email, monitoring and repeatable deployments.
- Physical sample validation, truthful final copy/photos, full order rehearsal,
  then live sales when Jace is ready to manufacture.

## Sequence and ownership

Start with the shared model/placement structure, connect the owner studio to
product drafts, and complete the first blank/model review cycle. Use that first
cycle to establish the reusable review package and generation workflow, then
expand the model checklist in batches. Modeling and software work can continue
while any model awaits review; Jace chooses review order and approval remains
per model. Use finished-case references for shaping when the blank listing lacks
model-specific images.

Codex: implementation, supplier research, modeling, render generation and review
packages. Jace: supplied artwork/permissions, model review and physical sample
feedback. Equipment and manufacturing planning remain separate. Exact model
coverage follows verified blank supply;
the next milestone does not promise every phone released or every candidate.
