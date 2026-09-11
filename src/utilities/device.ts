import { headers } from 'next/headers'

export type DeviceClass = 'desktop' | 'mobile'

/**
 * Server-side device classification. One threshold, two component trees.
 *
 * Phones get the mobile tree. Everything else — including tablets and
 * foldables, which are explicitly out of scope — gets desktop. A `device`
 * search param overrides the UA for previewing either tree.
 */
const MOBILE_UA = /Mobi|iPhone|iPod|Windows Phone|Android(?!.*(Tablet|Pad))/i

export const classifyUserAgent = (ua: string | null | undefined): DeviceClass =>
  ua && MOBILE_UA.test(ua) ? 'mobile' : 'desktop'

export const getDeviceClass = async (
  override?: string | string[] | undefined,
): Promise<DeviceClass> => {
  const forced = Array.isArray(override) ? override[0] : override
  if (forced === 'mobile' || forced === 'desktop') return forced

  const h = await headers()
  // Client hints first (Chromium), UA sniff as the fallback
  const chMobile = h.get('sec-ch-ua-mobile')
  if (chMobile === '?1') return 'mobile'
  if (chMobile === '?0') return classifyUserAgent(h.get('user-agent')) === 'mobile' ? 'mobile' : 'desktop'

  return classifyUserAgent(h.get('user-agent'))
}
