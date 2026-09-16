import type { CollectionBeforeDeleteHook } from 'payload'

/** Permanent deletion only: Payload implements Trash as an update to deletedAt. */
export const deleteDesignDependents: CollectionBeforeDeleteHook = async ({ id, req }) => {
  // Both child collections require a parent product. Remove only this design's
  // rows in the parent's transaction so any failure restores the entire design.
  // Keep artwork/media: other designs and historical orders can reference them.
  for (const collection of ['studioRevisions', 'variants'] as const) {
    const children = await req.payload.find({
      collection,
      where: { product: { equals: id } },
      select: { product: true },
      depth: 0,
      pagination: false,
      trash: true,
      overrideAccess: true,
      req,
    })
    for (const child of children.docs) {
      // The parent operation already checked delete access. Studio snapshots
      // deliberately disallow independent deletion through their public API.
      await req.payload.delete({
        collection,
        id: child.id,
        trash: true,
        overrideAccess: true,
        req,
      })
    }
  }
}
