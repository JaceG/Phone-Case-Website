'use client'
/* eslint-disable @next/next/no-html-link-for-pages */
import { usePathname } from 'next/navigation'
import { workspaceLinks } from './links'
import styles from './workspace.module.css'

function workspaceSection(pathname: string) {
  if (/^\/admin\/collections\/(products|variants|categories)(\/|$)/.test(pathname)) {
    return '/catalog-studio/designs'
  }
  if (/^\/admin\/collections\/(caseBlanks|phoneModels)(\/|$)/.test(pathname)) {
    return '/catalog-studio/models'
  }
  if (pathname.startsWith('/admin/collections/orders/')) return '/admin/collections/orders'
  if (pathname.startsWith('/catalog-studio/preview/')) return '/catalog-studio/designs'
  return pathname
}

export function WorkspaceNav({ sidebar = false }: { sidebar?: boolean }) {
  const pathname = usePathname()
  const section = workspaceSection(pathname)
  return (
    <nav
      className={sidebar ? styles.sidebar : styles.nav}
      aria-label={sidebar ? 'Workspace shortcuts' : 'Store workspace'}
    >
      <strong>CASE / WORKSPACE</strong>
      <div>
        {workspaceLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            aria-current={
              section === link.href ? (pathname === link.href ? 'page' : 'location') : undefined
            }
          >
            {link.label}
          </a>
        ))}
      </div>
      {sidebar && <small>Advanced records below</small>}
    </nav>
  )
}
export function WorkspaceSidebar() {
  return <WorkspaceNav sidebar />
}
