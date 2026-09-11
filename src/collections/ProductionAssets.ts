import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { adminOnly } from '@/access/adminOnly'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Private files consumed by the render pipeline and the print station:
 * dielines, Blender masters, GLB shells, UV checkers.
 *
 * Stored under `uploads/` (gitignored, outside `public/`) and served only
 * through Payload's access-controlled file endpoint. Nothing here should ever
 * reach a public URL.
 */
export const ProductionAssets: CollectionConfig = {
  slug: 'productionAssets',
  labels: {
    singular: 'Production Asset',
    plural: 'Production Assets',
  },
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    group: 'Production',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'kind', 'updatedAt'],
    description: 'Dielines, Blender files, shells, test textures. Admin-only, never public.',
  },
  upload: {
    staticDir: path.resolve(dirname, '../../uploads/production-assets'),
    // Anything goes: .blend, .glb, .pdf, .ai, .svg, .png
    mimeTypes: undefined,
    disableLocalStorage: false,
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'other',
      options: [
        { label: 'Print template / dieline', value: 'dieline' },
        { label: 'Blender master (.blend)', value: 'blend' },
        { label: 'Shell model (.glb)', value: 'shell' },
        { label: 'UV checker / test texture', value: 'uvChecker' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
