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
    { name: 'batch', type: 'text', index: true },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Normal', value: 'normal' },
        { label: 'High', value: 'high' },
      ],
    },
    {
      name: 'buildStage',
      type: 'select',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Modeling', value: 'modeling' },
        { label: 'Rendering', value: 'rendering' },
        { label: 'Ready', value: 'ready' },
        { label: 'Needs attention', value: 'failed' },
      ],
    },
    { name: 'buildError', type: 'textarea' },
    {
      name: 'reviewFeedback',
      type: 'textarea',
      admin: { description: 'Jace’s latest feedback; separate from preparation notes.' },
    },
    {
      name: 'reviewHistory',
      type: 'json',
      admin: { readOnly: true },
      access: { create: () => false, update: () => false },
    },
    { name: 'supplierURL', type: 'text' },
    { name: 'supplierVariant', type: 'text' },
    {
      name: 'references',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
        {
          name: 'kind',
          type: 'select',
          required: true,
          options: [
            { label: 'Exact blank', value: 'blank' },
            { label: 'Finished case / shape reference', value: 'finishedCase' },
            { label: 'Phone dimensions', value: 'phone' },
            { label: 'Physical sample', value: 'sample' },
          ],
        },
        { name: 'notes', type: 'textarea' },
      ],
    },
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
        const imageSignature = (
          images: { caption?: string; image: number | { id: number } }[] = [],
        ) =>
          JSON.stringify(
            images.map(({ caption, image }) => [
              caption,
              typeof image === 'object' ? image.id : image,
            ]),
          )
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
            (data.reviewImages !== undefined &&
              imageSignature(data.reviewImages) !== imageSignature(originalDoc.reviewImages)) ||
            (data.geometryVersion !== undefined &&
              data.geometryVersion !== originalDoc.geometryVersion) ||
            (data.geometry !== undefined &&
              JSON.stringify(data.geometry) !== JSON.stringify(originalDoc.geometry)))
        ) {
          data.previewStatus = 'draft'
          data.sampleStatus = 'pending'
          data.reviewedBy = null
          data.reviewedAt = null
          data.buildStage = 'queued'
        } else if (
          data.previewStatus !== undefined &&
          data.previewStatus !== originalDoc?.previewStatus &&
          ['approved', 'changes', 'rejected'].includes(data.previewStatus)
        ) {
          data.reviewedBy = req.user?.id ?? null
          data.reviewedAt = new Date().toISOString()
        }
        const statusChanged =
          data.previewStatus !== undefined && data.previewStatus !== originalDoc?.previewStatus
        const feedbackChanged =
          data.reviewFeedback !== undefined && data.reviewFeedback !== originalDoc?.reviewFeedback
        // Build history from stored data, never from an incoming history field.
        const history = Array.isArray(originalDoc?.reviewHistory) ? originalDoc.reviewHistory : []
        if (statusChanged || feedbackChanged) {
          data.reviewHistory = [
            ...history,
            {
              at: new Date().toISOString(),
              status: data.previewStatus ?? originalDoc?.previewStatus ?? 'draft',
              note: data.reviewFeedback ?? originalDoc?.reviewFeedback ?? '',
              geometryVersion: data.geometryVersion ?? originalDoc?.geometryVersion,
              reviewer: req.user?.id ?? null,
            },
          ]
        } else if (data.reviewHistory !== undefined) data.reviewHistory = history
        return data
      },
    ],
  },
}
