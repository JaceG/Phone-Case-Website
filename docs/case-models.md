# Case-model checklist

Evidence checked 2026-09-15. Models can be prepared in batches and reviewed in
any order at **Catalog Studio → Case model review**. Each decision belongs to one
model/version; an outstanding review never blocks preparation of other models. A listing option is a sourcing lead, not a
validated sample, current stock guarantee or approval to sell.

## First review

**iPhone 17 Pro Max — Walker fine-hole blank.** Existing provisional geometry
is packaged with a supplier reference, neutral angle, camera close-up, inside,
checker back/angle, side and presentation-artwork views. Review camera spacing,
rim proportions, controls/openings and artwork continuity. Measurements and
print coverage remain provisional; approve the preview separately from a sample.

Reference: [Guangzhou Walker blank listing](https://www.alibaba.com/product-detail/Dust-Repellent-Smooth-Color-Liquid-Silicone_1601927395824.html).
The live variant picker includes the exact iPhone17 Pro Max option. The listing
states Silicone + PC; the photo shows individual camera openings. Its customization
panel specifies back printing, which does not verify side wrapping. Shipping
details are negotiated with the supplier. No order or inquiry was submitted.

## iPhone candidates

The same listing's expanded variant picker offered these exact phone options.
Only the first has a model review package; other shapes need their own references
and geometry. The supplier's "iPhone17 Air" wording needs identity confirmation.

| Phone / supplier option | Listing evidence | Geometry / review |
|---|---|---|
| iPhone 17 Pro Max | Exact variant present | First review pending |
| iPhone 17 Pro | Exact variant present | Not modeled |
| iPhone 17 | Exact variant present | Not modeled |
| "iPhone17 Air" | Exact supplier label | Identity and geometry unverified |
| iPhone 16 Pro Max | Exact variant present | Not modeled |
| iPhone 16 Pro | Exact variant present | Not modeled |
| iPhone 16 Plus | Exact variant present | Not modeled |
| iPhone 16 | Exact variant present | Not modeled |
| iPhone 15 Pro Max | Exact variant present | Not modeled |
| iPhone 15 Pro | Exact variant present | Not modeled |
| iPhone 15 Plus | Exact variant present | Not modeled |
| iPhone 15 | Exact variant present | Not modeled |
| iPhone 14 Pro Max | Exact variant present | Not modeled |
| iPhone 14 Pro | Exact variant present | Not modeled |
| iPhone 14 | Exact variant present | Not modeled |
| iPhone 13 Pro Max | Exact variant present | Not modeled |
| iPhone 13 Pro | Exact variant present | Not modeled |
| iPhone 13 mini | Exact variant present | Not modeled |
| iPhone 13 | Exact variant present | Not modeled |

## Android sourcing queue

Start with the existing catalog's Galaxy S25 Ultra, Galaxy S25, Pixel 9 Pro and
Pixel 9 candidates, then assess additional flagship models against actual blank
supply. No accurate Android geometry has been built or approved.

The Walker listing title mentions Samsung series, but its expanded option list
in this check contained iPhones only. Do not promote the title into proof of an
exact Android variant. Samsung and Pixel fine-hole blanks need separate verified
listings and model-specific photographs before entering the modeling queue.

## Updating a review

Open any model card to leave feedback, request changes, approve its preview or
reject it without leaving the review dashboard. Compare two or three selected
models side by side; use filters to revisit a batch, brand or review status. Changing its geometry/version clears its prior visual
and sample approval. The Studio currently uses the single provisional iPhone
mesh; it does not yet switch among these blank records. A preview approval does
not activate a phone's commerce variants.

The first package can be imported with
`pnpm exec tsx pipeline/scripts/import-model-review.ts` once its referenced local
images exist. Repeating the import preserves an existing review's decisions.
Review images are private assets; the supplied source photo is not storefront art.

## Reference discipline

Find model-specific blank or finished-case photographs when a supplier provides
only one shared listing image. Finished printed designs are useful for camera
spacing, raised surrounds, rim profiles, side controls and overall proportions.
Record them as **Finished case / shape reference**, separate from the blank
supplier and from catalog artwork. Never infer every variant's geometry from
one shared photo. Save source URLs and note exactly what each view establishes.

## Batch workflow

Use **Prepare a batch** to queue multiple existing phone models. This creates
research candidates with no pretend geometry or approvals. Search/filter by
batch, select models, and **Export worklist** for preparation. Modeling/rendering
remain operator-run; queueing does not start a background Blender service.

The operator can update preparation stages and import many completed review
packages with [the batch guide](model-review-batches.md). Packages can finish in
any order; reimporting unchanged packages preserves decisions. A changed package
requires a new review only for that model. Approval does not activate sales or
mark a physical sample validated.
