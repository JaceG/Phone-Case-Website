'use client'
/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages */
import { useState } from 'react'
import styles from './workspace.module.css'
export type DesignCard = {
  id: number
  title: string
  image: string | null
  edit: string
  live: string | null
  status: string
  updated: string
}
export function DesignLibrary({ designs }: { designs: DesignCard[] }) {
  const [search, setSearch] = useState('')
  const shown = designs.filter((design) =>
    design.title.toLowerCase().includes(search.toLowerCase().trim()),
  )
  return (
    <main className={styles.library}>
      <header>
        <div>
          <h1>My designs</h1>
          <p>One place for each design. Open it to keep editing where you left off.</p>
        </div>
        <a className={styles.primary} href="/catalog-studio">
          Create a design +
        </a>
      </header>
      <label className={styles.search}>
        Find a design
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className={styles.grid}>
        {shown.map((design) => (
          <article key={design.id} className={styles.card}>
            <a href={design.edit} aria-label={`Edit ${design.title}`}>
              {design.image ? (
                <img className={styles.thumb} src={design.image} alt="" />
              ) : (
                <div className={styles.placeholder}>No preview yet</div>
              )}
            </a>
            <div className={styles.body}>
              <span className={styles.status}>{design.status}</span>
              <h2>{design.title}</h2>
              <p>
                Saved{' '}
                {new Date(design.updated).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'America/New_York',
                })}
              </p>
              <div className={styles.actions}>
                <a className={styles.primary} href={design.edit}>
                  Edit design
                </a>
                {design.live && <a href={design.live}>View in store ↗</a>}
                <a href={`/admin/collections/products/${design.id}`}>Product details</a>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!shown.length && (
        <p>
          {designs.length
            ? 'No designs match that name.'
            : 'Your first design starts with an image. Choose Create a design to begin.'}
        </p>
      )}
    </main>
  )
}
