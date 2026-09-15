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

The same listing's expanded variant picker offered the options marked below.
The main iPhone 12–17 families, iPhone 17e and iPhone Air now have individual review packages.
The 12 family, 14 Plus and 17e include additional finished-case-backed candidates;
their exact printable blanks are unverified. The supplier's "iPhone17 Air" wording needs identity confirmation.

| Phone / supplier option | Listing evidence | Geometry / review |
|---|---|---|
| iPhone 17 Pro Max | Exact variant present | First review pending |
| iPhone 17 Pro | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 17e | Finished-case reference; exact blank unverified | Visual study prepared; review and sample validation separate |
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
| iPhone 14 Pro Max | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 14 Pro | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 14 Plus | Finished-case reference; exact blank unverified | Visual study prepared; review and sample validation separate |
| iPhone 14 | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 13 Pro Max | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 13 Pro | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 13 mini | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 13 | Exact variant present | Visual study prepared; review and sample validation separate |
| iPhone 12 Pro Max | Finished-case reference; exact blank unverified | Visual study prepared; review and sample validation separate |
| iPhone 12 Pro | Finished-case reference; exact blank unverified | Visual study prepared; review and sample validation separate |
| iPhone 12 mini | Finished-case reference; exact blank unverified | Visual study prepared; review and sample validation separate |
| iPhone 12 | Finished-case reference; exact blank unverified | Visual study prepared; review and sample validation separate |

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

## iPhone 14 and 13 expansion — 2026-09-15

Eight further studies cover 14 Pro Max, 14 Pro, 14 Plus, 14, 13 Pro Max, 13 Pro,
13 mini and 13. Apple dimensional drawings establish each phone's envelope and
dimensioned camera/control positions. Inspected Otofly 14-family photographs
and Surphy 13-family photographs establish camera coverage and case shaping.
The 14 and 14 Pro have flush covered backs; the other six have raised covered
camera surrounds. All retain separate optical openings, mute-switch openings
and an estimated Lightning-port case opening. The mini has its own smaller
envelope and camera arrangement.

The initially located Otofly 13 Pro/Pro Max photos showed newer phones and were
rejected as model-specific evidence; the imported references are Surphy photos.
Case clearances, back/deck depths, lens lips, Pro LiDAR centres, mini flash
horizontal placement and bottom opening patterns remain estimates. Each model
has eleven rendered views and one private source photo, ready for independent
review. These new phone records also use the hidden review-only catalog status;
none is activated for sale or installed into Case Studio by this preparation.

## iPhone 12 family and 17e completion — 2026-09-15

The 12, 12 mini, 12 Pro and 12 Pro Max now have separate covered-camera studies,
using exact Apple dimensional drawings. The base/mini use vertical lenses,
while the Pros have their own triangular layouts and individual sensor openings.
Reference photographs come from SNPMarket (mini), seller listings on Rozetka
(12 and 12 Pro), and Mobikoff (12 Pro Max). These are finished-case shape
references, not confirmed printable blanks or US-deliverable stock. Camera-deck
heights, clearances and Pro LiDAR placement remain estimates. The low-resolution
mini photo and partially resolved Pro sensor details are recorded limitations.

The 17e adds the remaining named 17-series phone: single lens, separate mic and
flash, Action button and USB-C opening. Its flush covered back follows Otofly's
17e MagSafe case listing; that page reuses 16e-named imagery. Geometry uses the
exact Apple 17e drawing, not a renamed 16e mesh. The existing 17 (entry 20),
17 Pro (21), 17 Pro Max (1), and Air (19) retain their own review packages and
decisions. The original 17 Pro Max has eight review views; the other three have
twelve each. No duplicate 17 entries or review resets are needed.

The five additions each contain eleven rendered views and a private reference
photo. They stay hidden from the storefront while awaiting owner review and
physical validation; Case Studio still uses its existing provisional shell.

Verification: all five passed the shell geometry checks, and all 55 rendered
views were visually inspected before importing the 60 private gallery images.
The live 17e artwork preview loads correctly. All 44 existing 17/Air gallery
files are present, and all 24 prior review records are unchanged. The catalog
still has 18 variants and three published designs. Anonymous requests to each
new gallery cover return 403. Owner review remains pending.
