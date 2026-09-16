import fs from 'node:fs/promises'
import path from 'node:path'
import type { RenderJob } from './types'
export const jobsRoot = path.join(process.cwd(), 'uploads/studio-renders')
export function jobDirectory(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid render job.')
  return path.join(jobsRoot, id)
}
export async function readJob(id: string): Promise<RenderJob> {
  return JSON.parse(await fs.readFile(path.join(jobDirectory(id), 'job.json'), 'utf8'))
}
export async function writeJob(job: RenderJob) {
  job.updatedAt = new Date().toISOString()
  const dir = jobDirectory(job.id)
  await fs.mkdir(dir, { recursive: true })
  const tmp = path.join(dir, `job-${process.pid}.tmp`)
  await fs.writeFile(tmp, JSON.stringify(job, null, 2))
  await fs.rename(tmp, path.join(dir, 'job.json'))
}
export async function latestJob(revision: number) {
  const names = await fs.readdir(jobsRoot).catch(() => [])
  const jobs = (
    await Promise.all(
      names.filter((n) => /^[a-f0-9-]{36}$/.test(n)).map((id) => readJob(id).catch(() => null)),
    )
  )
    .filter((j): j is RenderJob => Boolean(j && j.revision === revision))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const job = jobs[0] ?? null
  if (
    job &&
    ['queued', 'rendering'].includes(job.status) &&
    Date.now() - Date.parse(job.updatedAt) > 60000
  ) {
    let alive = false
    if (job.pid) {
      try {
        process.kill(job.pid, 0)
        alive = true
      } catch {}
    }
    if (!alive) {
      job.status = 'failed'
      job.error = 'Rendering stopped. Generate previews again to retry.'
      await writeJob(job)
    }
  }
  return job
}
export { imageURL } from './urls'
