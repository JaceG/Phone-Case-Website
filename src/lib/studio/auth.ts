import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'
import { checkRole } from '@/access/utilities'

export async function studioAuth(headers: Headers) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  if (!user || !checkRole(['admin'], user)) return null
  return { payload, user, req: await createLocalReq({ user, req: { headers } }, payload) }
}
