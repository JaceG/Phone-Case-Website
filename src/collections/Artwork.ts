import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { adminOnly } from '@/access/adminOnly'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * The print master for a design. This is the single file that the whole
 * imagery pipeline hangs off: one upload here → Blender renders every
 * product image → the print station prints from it.
 *
 * Private on purpose. Product pages show renders from `media`, never the
 * raw artwork. Licensing metadata is required so the "original or properly
 * licensed" rule is enforced at the data layer, not by memory.
 */
export const Artwork: CollectionConfig = {
  slug: 'artwork',
  labels: {
    singular: 'Artwork',
    plural: 'Artwork',
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
    defaultColumns: ['filename', 'license', 'designer', 'updatedAt'],
    description:
      'Print masters. Full-bleed, in the print template coordinate space. Admin-only, never public.',
  },
  upload: {
    staticDir: path.resolve(dirname, '../../uploads/artwork'),
    mimeTypes: ['image/png', 'image/tiff', 'image/jpeg', 'image/webp', 'application/pdf'],
    disableLocalStorage: false,
  },
  fields: [
    {
      name: 'license',
      type: 'select',
      required: true,
      admin: {
        description:
          'Unlicensed IP puts payment processing at risk. Every file needs a clear basis for use.',
      },
      options: [
        { label: 'Original (made in-house)', value: 'original' },
        { label: 'Commissioned (rights assigned)', value: 'commissioned' },
        { label: 'Licensed (see notes)', value: 'licensed' },
        { label: 'Revenue share (see notes)', value: 'revenueShare' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'designer', type: 'text' },
        {
          name: 'colorProfile',
          type: 'select',
          defaultValue: 'sRGB',
          options: [
            { label: 'sRGB', value: 'sRGB' },
            { label: 'Adobe RGB', value: 'adobeRGB' },
            { label: 'CMYK', value: 'cmyk' },
          ],
        },
        { name: 'dpi', type: 'number', label: 'DPI' },
      ],
    },
    {
      name: 'licenseNotes',
      type: 'textarea',
      admin: {
        description: 'Contract reference, licence terms, revenue-share percentage, expiry.',
      },
    },
  ],
}
