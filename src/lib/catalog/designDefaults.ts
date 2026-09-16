/** Deterministic, editable starting copy. No inferred licensing or product claims. */
export function suggestedCopy(title: string) {
  const name = title.trim() || 'Your design'
  return {
    tagline: `${name}. Art for your everyday.`.slice(0, 200),
    description: `Carry ${name} your way. Choose your phone to see the artwork on its case, then make it part of your daily rotation. Pair it with other designs or keep a few favorites on hand.`,
  }
}
export function plainText(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const node = value as { type?: string; text?: string; root?: unknown; children?: unknown[] }
  if (node.root) return plainText(node.root)
  if (typeof node.text === 'string') return node.text
  if (node.type === 'root') return (node.children ?? []).map(plainText).join('\n')
  return (node.children ?? [])
    .map(plainText)
    .join(node.type === 'root' ? '\n' : ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
export function richText(text: string) {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          direction: null,
          format: '',
          indent: 0,
          children: [
            { type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' },
          ],
        },
      ],
    },
  }
}
export function seoDescription(title: string, tagline: string) {
  const intro = tagline.trim() || `${title} phone case.`
  const text = `${intro} Choose your phone and mix your favorite designs in a three-case set for $50.`
  if (text.length <= 155) return text
  return text.slice(0, 152).replace(/\s+\S*$/, '') + '…'
}
export const relationID = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && 'id' in value
      ? Number(value.id)
      : null

/** Replace an earlier automatic value, but never an edited/custom value. */
export function mayFill(current: unknown, previous: unknown) {
  return (
    current == null ||
    current === '' ||
    (Array.isArray(current) && current.length === 0) ||
    (previous !== undefined && JSON.stringify(current) === JSON.stringify(previous))
  )
}

export function seoTitle(title: string, siteName = 'Phone Case Store') {
  const suffix = ` Phone Case | 3 for $50 | ${siteName}`
  const room = Math.max(15, 65 - suffix.length)
  return `${title.length > room ? title.slice(0, room - 1).trimEnd() + '…' : title}${suffix}`
}

export function hasCustomFormatting(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const n = value as {
    type?: string
    format?: string | number
    style?: string
    root?: unknown
    children?: unknown[]
  }
  return Boolean(
    (n.format && n.format !== 0) ||
    n.style ||
    (n.type && !['root', 'paragraph', 'text', 'linebreak'].includes(n.type)) ||
    (n.root && hasCustomFormatting(n.root)) ||
    n.children?.some(hasCustomFormatting),
  )
}
