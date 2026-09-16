'use client'
/* eslint-disable @next/next/no-html-link-for-pages */
import { usePathname } from 'next/navigation'
import { workspaceLinks } from './links'
import styles from './workspace.module.css'

export function WorkspaceNav({ sidebar = false }: { sidebar?: boolean }) {
  const pathname = usePathname()
  return (
    <nav className={sidebar ? styles.sidebar : styles.nav} aria-label="Store workspace">
      <strong>CASE / WORKSPACE</strong>
      <div>
        {workspaceLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? 'page' : undefined}
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
