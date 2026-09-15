import Link from 'next/link'

export function CatalogStudioLink() {
  return (
    <div className="nav-group" style={{ marginTop: '1rem' }}>
      <Link href="/catalog-studio" className="nav__link">
        Catalog Studio
      </Link>
    </div>
  )
}
