import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import {
  ensureVariantOptionForPhoneModel,
  syncVariantsForPhoneModel,
} from '@/lib/catalog/syncVariants'

/**
 * A phone model is the physical blank a design gets printed on.
 *
 * Every product (design) × active phone model becomes a purchasable variant.
 * The plugin's `variantOptions` collection is the commerce-side mirror of this
 * collection; the link is maintained automatically by the afterChange hook, so
 * adding a phone model here is the only step needed to sell every design on it.
 *
 * Geometry data lives here too (dimensions, dieline, shell) because the
 * Blender render pipeline is model-specific.
 */
export const PhoneModels: CollectionConfig = {
  slug: 'phoneModels',
  labels: {
    singular: 'Phone Model',
    plural: 'Phone Models',
  },
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  admin: {
    group: 'Catalog',
    useAsTitle: 'name',
    defaultColumns: ['name', 'brand', 'status', 'sortOrder'],
    description:
      'Blanks you can print on. Setting a model to Active creates a purchasable variant for every published design.',
  },
  defaultPopulate: {
    name: true,
    slug: true,
    brand: true,
    status: true,
    sortOrder: true,
    variantOption: true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Customer-facing name, e.g. "iPhone 17 Pro".' },
    },
    slugField(),
    {
      type: 'row',
      fields: [
        {
          name: 'brand',
          type: 'select',
          required: true,
          defaultValue: 'apple',
          options: [
            { label: 'Apple', value: 'apple' },
            { label: 'Samsung', value: 'samsung' },
            { label: 'Google', value: 'google' },
            { label: 'Other', value: 'other' },
          ],
        },
        {
          name: 'screenInches',
          type: 'number',
          label: 'Screen (inches)',
          admin: { step: 0.1 },
        },
        {
          name: 'releaseYear',
          type: 'number',
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'comingSoon',
      admin: {
        position: 'sidebar',
        description:
          'Active: sellable now. Coming soon: visible but not purchasable. Retired: hidden.',
      },
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Coming soon', value: 'comingSoon' },
        { label: 'Retired', value: 'retired' },
      ],
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first in the model picker.',
      },
    },
    {
      name: 'variantOption',
      type: 'relationship',
      relationTo: 'variantOptions',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Managed automatically. Commerce-side mirror of this phone model.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Geometry',
          description:
            'Measured from a physical blank with calipers. Listing dimensions are a starting scale only.',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'heightMm', type: 'number', label: 'Height (mm)', admin: { step: 0.1 } },
                { name: 'widthMm', type: 'number', label: 'Width (mm)', admin: { step: 0.1 } },
                { name: 'depthMm', type: 'number', label: 'Depth (mm)', admin: { step: 0.1 } },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'cornerRadiusMm',
                  type: 'number',
                  label: 'Corner radius (mm)',
                  admin: { step: 0.1 },
                },
                {
                  name: 'wallThicknessMm',
                  type: 'number',
                  label: 'Wall thickness (mm)',
                  admin: { step: 0.1 },
                },
                {
                  name: 'cameraIslandHeightMm',
                  type: 'number',
                  label: 'Camera island height (mm)',
                  admin: { step: 0.1 },
                },
              ],
            },
            {
              name: 'geometryNotes',
              type: 'textarea',
              admin: { description: 'Where the numbers came from, sample source, caveats.' },
            },
          ],
        },
        {
          label: 'Production',
          description:
            'Files the render pipeline and print station consume. Never public.',
          fields: [
            {
              name: 'printTemplate',
              type: 'upload',
              relationTo: 'productionAssets',
              label: 'Print template / dieline',
              admin: {
                description:
                  'Blocks the Blender UV unwrap. The UV map and this template must share one coordinate space.',
              },
            },
            {
              name: 'shellModel',
              type: 'upload',
              relationTo: 'productionAssets',
              label: 'Shell model (GLB)',
              admin: {
                description: 'Exported case shell for optional React Three Fiber use on desktop.',
              },
            },
            {
              name: 'blendFile',
              type: 'upload',
              relationTo: 'productionAssets',
              label: 'Blender master file',
            },
            {
              name: 'blankSupplier',
              type: 'group',
              fields: [
                { name: 'name', type: 'text' },
                { name: 'sku', type: 'text', label: 'SKU' },
                { name: 'url', type: 'text', label: 'URL' },
                { name: 'material', type: 'text', admin: { description: 'e.g. liquid silicone, rigid PC, TPU' } },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        // Write the mirror option's ID with the document itself. Doing this in
        // beforeChange (rather than updating the doc in afterChange) avoids
        // re-entering hooks and needing context flags, which Payload shares
        // across nested operations on the same request.
        if (data?.name) {
          data.variantOption = await ensureVariantOptionForPhoneModel({
            phoneModel: { name: data.name, slug: data.slug, variantOption: data.variantOption },
            req,
          })
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        if (doc.status === 'active') {
          await syncVariantsForPhoneModel({ phoneModel: doc, req })
        }
        return doc
      },
    ],
  },
}
