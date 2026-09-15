import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/adminOnly'

/** Append-only saves. The unique key also rejects racing saves from two tabs. */
export const StudioRevisions: CollectionConfig = {
  slug: 'studioRevisions',
  labels: { singular: 'Studio revision', plural: 'Studio revisions' },
  access: { read: adminOnly, create: () => false, update: () => false, delete: () => false },
  admin: {
    group: 'Catalog',
    useAsTitle: 'title',
    defaultColumns: ['title', 'revision', 'createdAt'],
    description:
      'Saved through Catalog Studio. Each save preserves the original, placement and print layout.',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'lineage', type: 'text', required: true, index: true },
    { name: 'revision', type: 'number', required: true },
    { name: 'versionKey', type: 'text', unique: true, required: true },
    { name: 'product', type: 'relationship', relationTo: 'products', required: true },
    { name: 'original', type: 'upload', relationTo: 'artwork', required: true },
    { name: 'originalHash', type: 'text', required: true },
    { name: 'printMaster', type: 'upload', relationTo: 'artwork', required: true },
    { name: 'preview', type: 'upload', relationTo: 'productionAssets' },
    { name: 'modelSlug', type: 'text', required: true },
    { name: 'geometryVersion', type: 'text', required: true },
    { name: 'geometrySnapshot', type: 'json', required: true },
    { name: 'placement', type: 'json', required: true },
    { name: 'details', type: 'json', required: true },
    { name: 'savedBy', type: 'relationship', relationTo: 'users', required: true },
  ],
}
