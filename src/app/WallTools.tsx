import { materialPixelsPerUnit } from '../domain/continuousWallMaterial'
import { SIMPLE_WALL, STONE_WALL, wallDrawingStyle } from '../domain/walls'
import type { WallStyle } from '../domain/walls'
import { useEditorStore } from '../store/editorStore'
import { WallFields } from './WallFields'
import styles from './PathTools.module.css'
function setWallStyle(style:WallStyle) { style=wallDrawingStyle(style); if(style.wall.material&&style.wall.material.set.revision!==useEditorStore.getState().wallStyle.wall.material?.set.revision)style={...style,strokeWidth:style.wall.material.set.continuous?style.wall.material.set.continuous.widths.standard*materialPixelsPerUnit(style,style.wall.material.set.continuous.scale.unit):style.wall.material.set.defaultThickness}; const preset=JSON.stringify(style)===JSON.stringify(SIMPLE_WALL)?'simple':JSON.stringify(style)===JSON.stringify(STONE_WALL)?'stone':'custom';useEditorStore.setState({wallStyle:style,wallPreset:preset,...(preset==='custom'?{customWallStyle:style}:{})}) }
export function WallTools() {
  const tool=useEditorStore(s=>s.activeTool),style=useEditorStore(s=>s.wallStyle),mode=useEditorStore(s=>s.pathMode),snap=useEditorStore(s=>s.wallSnap)
  if(tool!=='wall')return null
  return <div className={styles.bar} aria-label="Wall controls">
    <WallFields value={wallDrawingStyle(style)} onChange={setWallStyle} compact/>
    <label>Mode <select aria-label="Wall mode" value={mode} onChange={e=>useEditorStore.setState({pathMode:e.target.value as typeof mode})}><option value="straight">Straight</option><option value="curved">Curved</option></select></label>
    <span>Open wall: click nodes · Enter / double-click finishes · Click start to close · Esc cancels · Shift angles · Alt free</span>
    {snap?.kind==='endpoint'&&<button onClick={()=>window.dispatchEvent(new Event('mapweaver-wall-continue'))}>Continue wall</button>}
    <button onClick={()=>window.dispatchEvent(new Event('mapweaver-path-done'))}>Done</button>
    <button onClick={()=>useEditorStore.setState({activeTool:'select'})}>Select</button>
  </div>
}

