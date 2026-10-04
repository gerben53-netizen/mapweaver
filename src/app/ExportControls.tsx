import { CampfirePublishingDialog } from './CampfirePublishingDialog'
import { downloadBlob } from '../storage/api'
import { isHexGrid } from '../domain/hexGrid'
import { isLandMap,mapWorkspace } from '../domain/geography'
import { useState } from 'react'
import { Modal } from './Modal'
import { useProjectStore } from '../store/projectStore'
import { useHistoryStore } from '../store/history'
import { currentSnapshot, useProjectSession } from '../projects/session'
import { downloadName } from '../projects/archive'
import { exportDimensions, roll20Settings } from '../export/scene'
import type { ExportOptions } from '../export/scene'
export function ExportControls() {
  const [campfireOpen,setCampfireOpen]=useState(false),[open, setOpen] = useState(false), busy = useProjectSession((s) => s.busy), gesture = useHistoryStore((s) => s.busy)
  const [publishingOpen,setPublishingOpen]=useState(false)
  return <><button className="secondary" disabled={!!busy||gesture} onClick={()=>setPublishingOpen(true)}>Naar Campfire sturen</button>{publishingOpen&&<CampfirePublishingDialog onClose={()=>setPublishingOpen(false)}/>}<button className="secondary" disabled={!!busy||gesture} onClick={()=>setCampfireOpen(true)}>Export Campfire Map</button>{campfireOpen&&<CampfireDialog onClose={()=>setCampfireOpen(false)}/>}<button className="secondary" disabled={!!busy || gesture} title={gesture ? 'Finish the current edit before export' : 'Export the full map as PNG'} onClick={() => setOpen(true)}>Export PNG</button>{open && <ExportDialog onClose={() => setOpen(false)} />}</>
}
function ExportDialog({ onClose }: { onClose: () => void }) {
  const map = useProjectStore((s) => s.map), name = useProjectSession((s) => s.info.name)
  const [options, setOptions] = useState<ExportOptions>({ scale: 1, includeScaleBar:mapWorkspace(map).geography.exportScaleBar, includeGrid: isLandMap(map)&&!isHexGrid(map.grid)?mapWorkspace(map).geography.graticule:map.grid.visible, transparent: false })
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState('')
  let limit = ''; try { exportDimensions(map, options.scale) } catch (cause) { limit = (cause as Error).message }
  const info = roll20Settings(map, options), fileName = downloadName(name).replace(/\.mapweaver$/, '.png')
  async function download() {
    if (useProjectSession.getState().busy || useHistoryStore.getState().busy) return
    setBusy(true); setError(''); setStatus('Decoding images and rendering PNG…'); useProjectSession.setState({ busy: 'Exporting PNG…' })
    try {
      const { exportPng } = await import('../export/render')
      const blob = await exportPng(currentSnapshot(), options), url = URL.createObjectURL(blob), link = document.createElement('a')
      link.href = url; link.download = fileName; document.body.append(link)
      try { link.click() } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000) }
      setStatus('PNG download started. Your editable project has not been saved by this export.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'PNG export failed.'); setStatus('') }
    finally { setBusy(false); useProjectSession.setState({ busy: '' }) }
  }
  return <Modal title="Export PNG" busy={busy} onClose={onClose}>
    <p>{fileName}</p><fieldset disabled={busy}>
      <label>Scale<select aria-label="PNG export scale" value={options.scale} onChange={(e) => setOptions({ ...options, scale: Number(e.target.value) as 1 | 2 })}><option value={1}>1× — original map pixels</option><option value={2}>2× — double width and height</option></select></label>
      <label><input type="checkbox" checked={options.includeGrid} onChange={(e) => setOptions({ ...options, includeGrid: e.target.checked })} /> Include grid</label>
      {isLandMap(map)&&<label><input type="checkbox" checked={!!options.includeScaleBar} onChange={e=>setOptions({...options,includeScaleBar:e.target.checked})}/>Include corner scale bar</label>}<p>Starts with the editor grid visibility. Changing this option only affects this export.</p>
      <label><input type="checkbox" checked={options.transparent} onChange={(e) => setOptions({ ...options, transparent: e.target.checked })} /> Transparent canvas background</label>
      <p>Removes the map color; background images remain included.</p>
    </fieldset><p>Limit: 32 million pixels; image memory is checked before rendering. Large maps may require 1×.</p><pre>{info}</pre>
    {(limit || error) && <p role="alert">{limit || error}</p>}<p role="status">{status}</p>
    <button className="primary" disabled={busy || !!limit} onClick={() => { void download() }}>{busy ? 'Exporting…' : 'Download PNG'}</button>
    <button disabled={busy} onClick={() => { void Promise.resolve().then(() => navigator.clipboard.writeText(info)).then(() => setStatus('Settings copied.'), () => setError('Clipboard unavailable. Select and copy the settings text above.')) }}>Copy settings</button>
    <button disabled={busy} onClick={onClose}>Close</button>
  </Modal>
}

function CampfireDialog({onClose}:{onClose:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('')
 async function download(){setBusy(true);setError('');useProjectSession.setState({busy:'Exporting Campfire Map…'});try{const {exportCampfire}=await import('../campfire/package');const info=useProjectSession.getState().info,blob=await exportCampfire(currentSnapshot(),info);downloadBlob(blob,downloadName(info.name).replace(/\.mapweaver$/,'-campfire.zip'));setStatus('Campfire package downloaded. Contains map.json and map.png; lighting is semantic and is not baked into the image.')}catch(cause){setError((cause as Error).message)}finally{setBusy(false);useProjectSession.setState({busy:''})}}
 return <Modal title="Export Campfire Map" busy={busy} onClose={onClose}><p>Canonical Campfire Map Contract v3. Original map pixels, local PNG, visible artwork and semantic walls, doors, windows and lighting.</p><p>Requires a physical game scale, a square or disabled grid and contract-compatible geometry. Validation runs before rendering; no partial package is downloaded.</p>{error&&<pre role="alert">{error}</pre>}<p role="status">{status}</p><button disabled={busy} onClick={()=>void download()}>{busy?'Exporting…':'Download Campfire package'}</button><button disabled={busy} onClick={onClose}>Close</button></Modal>
}
