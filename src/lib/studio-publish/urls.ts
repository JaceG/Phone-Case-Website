export function imageURL(job: string, slug: string, view: string) {
  return `/api/catalog-studio/render?job=${job}&model=${encodeURIComponent(slug)}&image=${view}`
}
