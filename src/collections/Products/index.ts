import { autofillProduct } from '@/lib/catalog/autofillProduct'
import { CallToAction } from '@/blocks/CallToAction/config'
import { Content } from '@/blocks/Content/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { slugField } from 'payload'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { CollectionOverride } from '@payloadcms/plugin-ecommerce/types'
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import {
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import type { CheckboxField, DefaultDocumentIDType, Field, Where } from 'payload'

import type { Product } from '@/payload-types'
import { getPhoneModelVariantTypeID, syncVariantsForProduct } from '@/lib/catalog/syncVariants'

/**
 * A product is one design. The physical form factor is identical across the
 * catalog, so the only thing that varies per product is the artwork, and the
 * only thing that varies per variant is the phone model it's printed for.
 *
 * Variants (design × phone model) are generated automatically on publish; see
 * `@/lib/catalog/syncVariants`. Inventory is disabled at the plugin level
 * because everything is printed to order.
 */

const renderSlot = (name: string, label: string, description?: string): Field => ({
  name,
  type: 'upload',
  relationTo: 'media',
  label,
  admin: { description },
})

const frameSequence = (name: string, label: string, description: string): Field => ({
  name,
  type: 'array',
  label,
  admin: { description, initCollapsed: true },
  fields: [
    {
      name: 'frame',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
  ],
})

const turntableField = (description: string): Field =>
  frameSequence('turntable', 'Turntable frames', description)

const tumbleField = (description: string): Field =>
  frameSequence('tumble', 'Tumble frames', description)

const tumblePhasesField: Field = {
  name: 'tumblePhases',
  type: 'json',
  label: 'Tumble frame phases',
  admin: {
    description:
      'Loop phase (0–1) of each tumble frame, written by the render pipeline. Frames may be unevenly spaced (denser where playback is slow).',
  },
}

export const ProductsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  labels: {
    singular: 'Design',
    plural: 'Designs',
  },
  admin: {
    ...defaultCollection?.admin,
    group: 'Catalog',
    defaultColumns: ['title', 'collections', 'renderStatus', '_status'],
    description:
      'Save to fill missing copy, colors and search details automatically. Your edits are preserved. Use Catalog Studio to place artwork, generate previews and publish.',
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'products',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'products',
        req,
      }),
    useAsTitle: 'title',
  },
  defaultPopulate: {
    ...defaultCollection?.defaultPopulate,
    title: true,
    slug: true,
    variantOptions: true,
    variants: true,
    enableVariants: true,
    gallery: true,
    renders: true,
    modelRenders: true,
    studioPresentation: true,
    renderStatus: true,
    priceInUSD: true,
    meta: true,
  },
  fields: [
    {
      name: 'catalogHelp',
      type: 'ui',
      admin: { components: { Field: '@/components/admin/DesignGuide#DesignGuide' } },
    },
    { name: 'catalogDefaults', type: 'json', admin: { hidden: true } },
    { name: 'title', type: 'text', required: true },
    { name: 'studioPresentation', type: 'json', admin: { hidden: true } },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Design',
          fields: [
            {
              name: 'artwork',
              type: 'upload',
              relationTo: 'artwork',
              admin: {
                description:
                  'The print master. This single file drives every render and the print job. Never shown to customers directly.',
              },
            },
            {
              name: 'tagline',
              type: 'text',
              admin: { description: 'One line under the title on the product page.' },
            },
            {
              name: 'description',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: 'Story',
              required: false,
            },
            {
              name: 'palette',
              type: 'array',
              label: 'Palette',
              maxRows: 5,
              admin: {
                description:
                  'Extracted from your artwork when you save. Edit these colors to override the automatic palette.',
              },
              fields: [{ name: 'hex', type: 'text', required: true }],
            },
          ],
        },
        {
          label: 'Imagery',
          description:
            'Generated in Catalog Studio. Public images appear here after you review and publish. Manual replacements are optional.',
          fields: [
            {
              type: 'collapsible',
              label: 'Generated images and optional overrides',
              admin: { initCollapsed: true },
              fields: [
                {
                  name: 'renderStatus',
                  type: 'select',
                  defaultValue: 'pending',
                  admin: { position: 'sidebar' },
                  options: [
                    { label: 'Pending', value: 'pending' },
                    { label: 'Rendering', value: 'rendering' },
                    { label: 'Ready', value: 'ready' },
                    { label: 'Failed', value: 'failed' },
                  ],
                },
                {
                  name: 'renders',
                  type: 'group',
                  fields: [
                    renderSlot('hero', 'Hero', 'Cycles. Dramatic light, the landing shot.'),
                    renderSlot(
                      'threeQuarter',
                      'Three-quarter',
                      'Cycles. Shows the wrap around the edge.',
                    ),
                    renderSlot('flat', 'Flat-on', 'EEVEE. Catalog grid thumbnail.'),
                    turntableField(
                      '36–60 frames in order. Scrubbed on scroll. Leave empty to fall back to the hero.',
                    ),
                    tumbleField(
                      'Smooth tilted-axis loop played as the idle motion in the hero. Empty = use the turntable.',
                    ),
                    tumblePhasesField,
                  ],
                },
                {
                  name: 'modelRenders',
                  type: 'array',
                  label: 'Per-model renders',
                  admin: {
                    description:
                      'Optional. Renders of this design on a specific phone model (camera bump, cutouts differ). Any slot left empty falls back to the shared renders above. Filled by `pnpm renders:import` with RENDERS_MODEL set.',
                  },
                  fields: [
                    {
                      name: 'phoneModel',
                      type: 'relationship',
                      relationTo: 'phoneModels',
                      required: true,
                    },
                    {
                      type: 'row',
                      fields: [
                        renderSlot('hero', 'Hero'),
                        renderSlot('threeQuarter', 'Three-quarter'),
                        renderSlot('flat', 'Flat-on'),
                      ],
                    },
                    turntableField('Frames for this model. Empty = use the shared turntable.'),
                    tumbleField('Tumble frames for this model. Empty = use the shared tumble.'),
                    tumblePhasesField,
                  ],
                },
                {
                  name: 'gallery',
                  type: 'array',
                  label: 'Extra gallery images',
                  admin: {
                    description:
                      'Lifestyle shots, or per-phone-model renders (camera cutouts differ). Optional.',
                  },
                  fields: [
                    {
                      name: 'image',
                      type: 'upload',
                      relationTo: 'media',
                      required: true,
                    },
                    {
                      name: 'variantOption',
                      type: 'relationship',
                      relationTo: 'variantOptions',
                      label: 'Phone model (optional)',
                      admin: {
                        description: 'Set when this image is specific to one phone model.',
                        condition: (data) => data?.enableVariants === true,
                      },
                      filterOptions: ({ data }) => {
                        const variantTypeIDs: DefaultDocumentIDType[] = Array.isArray(
                          data?.variantTypes,
                        )
                          ? data.variantTypes.map((item: unknown) =>
                              typeof item === 'object' && item && 'id' in item
                                ? (item as { id: DefaultDocumentIDType }).id
                                : (item as DefaultDocumentIDType),
                            )
                          : []

                        const query: Where = { variantType: { in: variantTypeIDs } }
                        return query
                      },
                    },
                  ],
                },
                {
                  name: 'layout',
                  type: 'blocks',
                  blocks: [CallToAction, Content, MediaBlock],
                },
              ],
            },
          ],
        },
        {
          label: 'Commerce',
          fields: [
            ...defaultCollection.fields.map((field): Field => {
              if (field.type === 'checkbox' && field.name === 'enableVariants') {
                const enableVariants: CheckboxField = {
                  ...field,
                  defaultValue: true,
                  admin: {
                    ...field.admin,
                    description:
                      'Managed automatically. Catalog Studio creates variants for the phones you select.',
                  },
                }
                return enableVariants
              }
              if (field.type === 'relationship' && field.name === 'variantTypes')
                return { ...field, admin: { ...field.admin, hidden: true } } as Field
              if (field.type === 'number' && field.name === 'priceInUSD')
                return {
                  ...field,
                  admin: {
                    ...field.admin,
                    description:
                      'Default single-case price. New phone variants inherit this price; existing variant price overrides are preserved.',
                  },
                }
              return field
            }),
            {
              name: 'relatedProducts',
              type: 'relationship',
              label: 'Related designs',
              filterOptions: ({ id }) => {
                if (id) {
                  return {
                    id: {
                      not_in: [id],
                    },
                  }
                }

                // ID comes back as undefined during seeding so we need to handle that case
                return {
                  id: {
                    exists: true,
                  },
                }
              },
              hasMany: true,
              relationTo: 'products',
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'collections',
      type: 'relationship',
      label: 'Collections',
      admin: {
        position: 'sidebar',
        sortOptions: 'title',
        description:
          'Optional. Choose an existing collection. Drives "other designs in this collection".',
      },
      hasMany: true,
      relationTo: 'categories',
    },
    slugField(),
  ],
  hooks: {
    ...defaultCollection.hooks,
    beforeValidate: [...(defaultCollection.hooks?.beforeValidate ?? []), autofillProduct],
    beforeChange: [
      ...(defaultCollection.hooks?.beforeChange ?? []),
      async ({ data, req }) => {
        // Every design sells on the phone-model axis. Default the variant type
        // so the admin never has to pick it.
        if (data?.enableVariants && (!data.variantTypes || data.variantTypes.length === 0)) {
          data.variantTypes = [await getPhoneModelVariantTypeID({ req })]
        }
        return data
      },
    ],
    afterChange: [
      ...(defaultCollection.hooks?.afterChange ?? []),
      async ({ doc, req }) => {
        if (doc?._status !== 'published') return doc

        // Idempotent: only missing design × active-model variants are created.

        await syncVariantsForProduct({ product: doc as Product, req })
        return doc
      },
    ],
  },
})
