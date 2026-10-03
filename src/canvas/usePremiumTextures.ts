import { useEffect, useState } from 'react'
import { loadPremiumTexture, premiumTexturesReady } from './premiumTerrainTextures'

export function usePremiumTextures(ids: string[]) {
  const key = [...ids].sort().join('|')
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState({ key: '', error: '' })
  useEffect(() => {
    let active = true
    const values = key ? key.split('|') : []
    Promise.all(values.map(loadPremiumTexture)).then(() => {
      if (active) setStatus({ key, error: '' })
    }, error => { if (active) setStatus({ key, error: (error as Error).message }) })
    return () => { active = false }
  }, [key, attempt])
  return { ready: premiumTexturesReady(ids), error: status.key === key ? status.error : '', retry: () => setAttempt(n => n + 1) }
}
