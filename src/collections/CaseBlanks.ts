import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/adminOnly'

/** Blank identity/review is separate from the phone's commerce availability. */
export const CaseBlanks: CollectionConfig = {
  slug: 'caseBlanks',
  labels: { singular: 'Case blank', plural: 'Case model library' },
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: {
    group: 'Catalog',
    useAsTitle: 'title',
    defaultColumns: ['title', 'phoneModel', 'previewStatus', 'sampleStatus'],
    description:
      'One record per exact phone and supplier blank. Review previews separately from physical samples.',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'referenceKey', type: 'text', unique: true, required: true },
    { name: 'phoneModel', type: 'relationship', relationTo: 'phoneModels', required: true },
    { name: 'supplierURL', type: 'text' },
    { name: 'supplierVariant', type: 'text' },
    {
      name: 'availability',
      type: 'select',
      defaultValue: 'unverified',
      options: [
        { label: 'Needs verification', value: 'unverified' },
        { label: 'Listing verified', value: 'verified' },
        { label: 'Unavailable', value: 'unavailable' },
      ],
    },
    { name: 'availabilityCheckedAt', type: 'date' },
    {
      name: 'cameraCoverage',
      type: 'select',
      defaultValue: 'unknown',
      options: [
        { label: 'Covered surround with individual openings', value: 'fineHoles' },
        { label: 'Large open camera area — does not meet target', value: 'open' },
        { label: 'Needs verification', value: 'unknown' },
      ],
    },
    {
      name: 'previewStatus',
      type: 'select',
      defaultValue: 'draft',
      required: true,
      options: [
        { label: 'Draft model', value: 'draft' },
        { label: 'Ready for review', value: 'review' },
        { label: 'Changes requested', value: 'changes' },
        { label: 'Preview approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    {
      name: 'sampleStatus',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      options: [
        { label: 'Awaiting physical sample', value: 'pending' },
        { label: 'Sample needs changes', value: 'changes' },
        { label: 'Sample validated', value: 'validated' },
      ],
    },
    { name: 'geometryVersion', type: 'text', required: true },
    { name: 'geometry', type: 'json', required: true },
    { name: 'reviewNotes', type: 'textarea' },
    {
      name: 'reviewImages',
      type: 'array',
      fields: [
        { name: 'caption', type: 'text', required: true },
        { name: 'image', type: 'upload', relationTo: 'productionAssets', required: true },
      ],
    },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'reviewedAt', type: 'date', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        const identityChanged =
          operation === 'update' &&
          originalDoc &&
          ['phoneModel', 'supplierURL', 'supplierVariant', 'cameraCoverage'].some((key) => {
            const value = data[key]
            const old = originalDoc[key]
            const id = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? v.id : v)
            return value !== undefined && id(value) !== id(old)
          })
        if (
          operation === 'update' &&
          originalDoc &&
          (identityChanged ||
            (data.geometryVersion !== undefined &&
              data.geometryVersion !== originalDoc.geometryVersion) ||
            (data.geometry !== undefined &&
              JSON.stringify(data.geometry) !== JSON.stringify(originalDoc.geometry)))
        ) {
          data.previewStatus = 'draft'
          data.sampleStatus = 'pending'
          data.reviewedBy = null
          data.reviewedAt = null
        } else if (
          data.previewStatus !== undefined &&
          data.previewStatus !== originalDoc?.previewStatus &&
          ['approved', 'changes', 'rejected'].includes(data.previewStatus)
        ) {
          data.reviewedBy = req.user?.id ?? null
          data.reviewedAt = new Date().toISOString()
        }
        return data
      },
    ],
  },
}
