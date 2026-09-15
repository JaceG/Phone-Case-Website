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
The 17, 16 and 15 family studies listed below now have individual review packages.
The older 14 and 13 candidates still need their own references and geometry. The supplier's "iPhone17 Air" wording needs identity confirmation.

| Phone / supplier option | Listing evidence | Geometry / review |
|---|---|---|
| iPhone 17 Pro Max | Exact variant present | First review pending |
| iPhone 17 Pro | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 17 | Exact variant present | Visual study prepared; review and sample validation separate |
| "iPhone17 Air" | Exact supplier label | Apple iPhone Air study prepared; supplier identity still unconfirmed |
| iPhone 16 Pro Max | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 16 Pro | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 16 Plus | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 16 | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 15 Pro Max | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 15 Pro | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 15 Plus | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 15 | Exact variant present | Visual study prepared; review and sample validation separate |
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
supply. Galaxy S25 and S25 Ultra have model-specific visual studies based on
finished fine-hole cases. Pixel 9 and Pixel 9 Pro have concepts awaiting matching
fine-hole references. None of these establishes physical blank fit.

The Walker listing title mentions Samsung series, but its expanded option list
in this check contained iPhones only. Do not promote the title into proof of an
exact Android variant. Samsung and Pixel fine-hole blanks need separate verified
listings. Samsung finished-case photographs support visual studies; the Pixel
reference gap remains open.

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

## Preparation and review responsibilities

Codex performs the research, queue setup, modeling, render checks and private
imports. Jace reviews finished results in any order and can compare two or three
models. No batch creation, worklist export or rendering commands are required
from Jace. Optional operator controls live under **Preparation tools**.

The first additional catalog pass has model-specific geometry for iPhone 17 Pro,
iPhone 17, iPhone Air, iPhone 16 Pro, Galaxy S25 and Galaxy S25 Ultra, based on
finished fine-hole cases plus official phone dimensions. These are visual studies;
compatible printable blanks and physical fit are not yet verified. Pixel 9 and
Pixel 9 Pro also have rendered shape concepts, but the located references use a
common lens window; their fine-hole adaptation remains unverified and cannot be
approved as a matching blank.

Source links and dimensions: `pipeline/model-library/catalog.json` and each
`pipeline/blender/params/<phone>.json`. Eleven rendered views per new model cover
neutral geometry, camera, inside, side, bottom, checker and artwork; source images
are included privately. The existing iPhone 17 Pro Max review stays separate.

See [the preparation guide](model-review-batches.md). Storefront and Studio still
use the existing shell until reviewed model integration is implemented.

## iPhone 16 and 15 expansion — 2026-09-15

Seven further studies complete the main 16 and 15 families: iPhone 16 Pro Max,
16 Plus, 16, 15 Pro Max, 15 Pro, 15 Plus and 15. Each has its own Apple dimensional
drawing and an inspected finished-case reference, eleven rendered views and one
private source photo. The Otofly 16 Pro Max and 16 Plus pages reuse family imagery;
exact model dimensions and control locations come from their Apple drawings.
The 15 Plus reference has a raised covered camera deck; the other six use a flush
covered back. Pro cases retain three lens openings plus flash, microphone and
LiDAR; regular 16s have vertical lenses and regular 15s have diagonal lenses.

New phone records are hidden from the storefront using the existing `retired`
status while they are review-only candidates. This is a temporary catalog state,
not a decision to discontinue these models. Reviews do not activate sales or
replace the Studio shell. Existing review decisions are preserved.
