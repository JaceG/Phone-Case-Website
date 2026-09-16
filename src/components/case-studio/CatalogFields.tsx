import { suggestedCopy } from '@/lib/catalog/designDefaults'
import type { StudioDetails } from '@/lib/studio/contract'

export function CatalogFields({
  details,
  change,
  collections,
  disabled,
}: {
  details: StudioDetails
  change: (patch: Partial<StudioDetails>) => void
  collections: { id: number; title: string }[]
  disabled: boolean
}) {
  return (
    <fieldset className="cs-catalog-fields" disabled={disabled}>
      <legend>Design details</legend>
      <p style={{ gridColumn: '1 / -1', margin: 0 }}>
        Start with a title. Missing copy, artwork colors and search details fill when you save. You
        can edit every suggestion.
      </p>
      <button
        type="button"
        disabled={!details.title.trim()}
        onClick={() => {
          const copy = suggestedCopy(details.title)
          change({
            ...(!details.tagline.trim() ? { tagline: copy.tagline } : {}),
            ...(!details.description.trim() ? { description: copy.description } : {}),
          })
        }}
      >
        Suggest missing copy
      </button>
      <label>
        Design title
        <input
          value={details.title}
          maxLength={150}
          onChange={(e) => {
            const title = e.target.value
            change({
              title,
              ...(!details.slug ||
              details.slug ===
                details.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '')
                ? {
                    slug: title
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '')
                      .slice(0, 100),
                  }
                : {}),
            })
          }}
        />
      </label>
      <label>
        Product URL
        <input
          value={details.slug}
          maxLength={100}
          onChange={(e) => change({ slug: e.target.value })}
        />
        <small>/products/{details.slug || 'your-design'}</small>
      </label>
      <label>
        Single-case price ($)
        <input
          type="number"
          min="0.01"
          max="10000"
          step="0.01"
          value={details.price}
          onChange={(e) => change({ price: Number(e.target.value) })}
        />
      </label>
      <label>
        Collection
        <select
          value={details.collection ?? ''}
          onChange={(e) => change({ collection: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">No collection yet</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tagline
        <input
          value={details.tagline}
          maxLength={200}
          onChange={(e) => change({ tagline: e.target.value })}
        />
      </label>
      <label>
        Design story
        <textarea
          rows={4}
          value={details.description}
          maxLength={8000}
          onChange={(e) => change({ description: e.target.value })}
        />
      </label>
      <label>
        Artwork permission
        <select
          value={details.license}
          onChange={(e) => change({ license: e.target.value as StudioDetails['license'] })}
        >
          <option value="original">Original artwork</option>
          <option value="licensed">Licensed artwork</option>
          <option value="commissioned">Commissioned artwork</option>
          <option value="revenueShare">Artist revenue share</option>
        </select>
      </label>
      <label>
        Artist / designer
        <input
          value={details.designer}
          maxLength={200}
          onChange={(e) => change({ designer: e.target.value })}
        />
      </label>
      <label>
        Image source
        <input
          value={details.source}
          maxLength={2000}
          onChange={(e) => change({ source: e.target.value })}
        />
      </label>
      <label>
        Permission / agreement reference
        <textarea
          rows={3}
          value={details.permission}
          maxLength={8000}
          onChange={(e) => change({ permission: e.target.value })}
        />
      </label>
    </fieldset>
  )
}
