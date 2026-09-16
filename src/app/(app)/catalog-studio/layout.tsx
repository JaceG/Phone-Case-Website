import type { ReactNode } from 'react'
import { WorkspaceNav } from '@/components/workspace/WorkspaceNav'
export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <WorkspaceNav />
      {children}
    </>
  )
}
