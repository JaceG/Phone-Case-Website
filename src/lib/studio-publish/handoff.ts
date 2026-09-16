import type { Placement } from '@/components/case-studio/artwork'
type Transfer = { image: string; name: string; placement: Placement }
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('case-studio-handoff', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('draft')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
export async function transferArtwork(value: Transfer) {
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('draft', 'readwrite')
      tx.objectStore('draft').put(value, 'current')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
export async function receiveArtwork(): Promise<Transfer | null> {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('draft').objectStore('draft').get('current')
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}
