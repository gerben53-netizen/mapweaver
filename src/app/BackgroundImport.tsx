import { useProjectStore } from '../store/projectStore'
import { useRef, useState } from 'react'
import { importBackground } from '../imports/importBackground'
import { errorMessage } from '../imports/readImage'
import { IMAGE_ACCEPT } from '../imports/limits'

export function BackgroundImport() {
  const background = useProjectStore(s => s.map.background)
  const input = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function importFile(file?: File) {
    if (!file || busyRef.current) return
    busyRef.current = true
    setBusy(true); setMessage('')
    try {
      await importBackground(file, () => window.confirm('Replace the current background and use the new image dimensions? Map objects keep their coordinates. This can be undone.'))
    } catch (error) { setMessage(errorMessage(error)) }
    finally { busyRef.current = false; setBusy(false) }
  }
  return <div>
    <button disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Reading image…' : 'Import background'}</button>
    {background && <button disabled={busy} onClick={() => useProjectStore.getState().removeBackground()}>Remove background</button>}
    <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden aria-label="Background image file" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void importFile(file) }} />
    {message && <p role="alert">{message}</p>}
  </div>
}


