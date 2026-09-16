'use client'
import { useState, type Ref } from 'react'
import type { Placement } from '@/components/case-studio/artwork'
import type { ViewerHandle } from '@/components/case-studio/CaseViewer'
import type { StudioPhone } from '@/lib/studio-publish/types'
import type { ModelSettings } from '@/lib/studio/modelSettings'
import { adaptPlacement } from '@/lib/studio-publish/placement'
import { ModelPlacement } from './ModelPlacement'
import './workflow.css'

export function PhoneFits({
  models,
  settings,
  shared,
  source,
  aspect,
  active,
  onActive,
  onChange,
  viewerRef,
}: {
  models: StudioPhone[]
  settings: ModelSettings
  shared: Placement
  source: string
  aspect: number
  active: number | null
  onActive: (id: number) => void
  onChange: (settings: ModelSettings) => void
  viewerRef: Ref<ViewerHandle>
}) {
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('all')
  const matching = models.filter(
    (m) =>
      (brand === 'all' || m.brand === brand) && m.name.toLowerCase().includes(search.toLowerCase()),
  )
  const phone =
    models.find((m) => m.id === active) ??
    models.find((m) => m.slug === 'iphone-17-pro-max') ??
    models[0]
  if (!phone)
    return (
      <p className="cw-notice">
        No approved case models are available yet. Review the case model library to add them.
      </p>
    )
  const fit = settings.placements[String(phone.id)]
  const placement = fit?.placement ?? adaptPlacement(shared, phone.params)
  const included = settings.phones.includes(phone.id)
  return (
    <section className="cw-fit-workspace" aria-label="Fit design by phone">
      <header>
        <div>
          <span className="cw-kicker">One design · individual phone fits</span>
          <h2>Fit by phone</h2>
          <p>
            Choose any case to check its camera openings, crop and edges. Switching phones keeps
            your adjustments.
          </p>
        </div>
        <span>
          {Object.keys(settings.placements).length} custom fits · {settings.phones.length} phones
          included
        </span>
      </header>
      <div className="cw-fit-grid">
        <aside className="cw-fit-picker" aria-label="Choose a case model">
          <label>
            Find a phone
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. 16 Pro, S25 Ultra"
            />
          </label>
          <label>
            Brand
            <select value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="all">All brands</option>
              <option value="apple">iPhone</option>
              <option value="samsung">Samsung</option>
            </select>
          </label>
          <div className="cw-fit-list">
            {matching.map((m) => (
              <button key={m.id} aria-pressed={m.id === phone.id} onClick={() => onActive(m.id)}>
                <strong>{m.name}</strong>
                <span>
                  {settings.placements[String(m.id)] ? 'Custom fit' : 'Shared fit'}
                  {!settings.phones.includes(m.id) ? ' · not included' : ''}
                </span>
              </button>
            ))}
            {!matching.length && <p>No phones match. Try another search.</p>}
          </div>
        </aside>
        <div className="cw-fit-editor">
          <div className="cw-fit-heading">
            <div>
              <h3>{phone.name}</h3>
              <span>{fit ? 'Custom fit for this phone' : 'Using shared artwork placement'}</span>
            </div>
            <label>
              <input
                type="checkbox"
                checked={included}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    phones: e.target.checked
                      ? [...settings.phones, phone.id]
                      : settings.phones.filter((id) => id !== phone.id),
                  })
                }
              />{' '}
              Include in this design
            </label>
          </div>
          {fit && fit.version !== phone.version && (
            <p className="cw-notice">
              This case geometry changed. Check the placement and adjust it, or reset this phone to
              the shared fit before saving.
            </p>
          )}
          {!included && (
            <p className="cw-notice">
              You can edit this fit, but this phone will not be rendered or offered for this design
              until included.
            </p>
          )}
          <ModelPlacement
            key={phone.id}
            phone={phone}
            source={source}
            aspect={aspect}
            placement={placement}
            viewerRef={viewerRef}
            onChange={(p) =>
              onChange({
                ...settings,
                placements: {
                  ...settings.placements,
                  [String(phone.id)]: { version: phone.version, placement: p },
                },
              })
            }
            onReset={() => {
              const placements = { ...settings.placements }
              delete placements[String(phone.id)]
              onChange({ ...settings, placements })
            }}
          />
        </div>
      </div>
    </section>
  )
}
