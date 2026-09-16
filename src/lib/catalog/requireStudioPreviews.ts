import { APIError, type CollectionBeforeChangeHook } from 'payload'

/** Studio artwork must pass through its reviewed render set before becoming public. */
export const requireStudioPreviews: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (data?._status !== 'published' || !originalDoc?.id) return data
  const candidate = { ...originalDoc, ...data }
  if (
    candidate.renderStatus === 'ready' &&
    Object.keys(candidate.studioPresentation?.models ?? {}).length > 0
  )
    return data
  const saved = await req.payload.find({
    collection: 'studioRevisions',
    req,
    depth: 0,
    limit: 1,
    where: { product: { equals: originalDoc.id } },
  })
  if (saved.docs.length)
    throw new APIError(
      'This design needs its case previews first. Choose “Continue this design in Catalog Studio”, generate previews, then use “Publish to catalog”. Save your edits as a draft before opening Studio.',
      400,
    )
  return data
}
