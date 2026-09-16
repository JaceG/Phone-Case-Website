import Link from 'next/link'
import { workspaceLinks } from '@/components/workspace/links'
import styles from '@/components/workspace/workspace.module.css'

export function BeforeDashboard() {
  return (
    <section className={styles.home}>
      <h1>Your store workspace</h1>
      <p>Create designs, review cases, and manage your store. Choose what you want to work on.</p>
      <div className={styles.grid}>
        {workspaceLinks.slice(1).map((link) => (
          <Link className={`${styles.card} ${styles.shortcut}`} key={link.href} href={link.href}>
            <h2>{link.label} ↗</h2>
            <p>{link.description}</p>
          </Link>
        ))}
      </div>
      <h2 style={{ marginTop: 40 }}>Advanced records</h2>
      <p>Individual settings and files live below. For everyday artwork editing, use My designs.</p>
    </section>
  )
}
