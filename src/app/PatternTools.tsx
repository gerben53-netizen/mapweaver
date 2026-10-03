import { openMaterialBrowser } from '../store/materialApplication'
import { openStampLibrary } from '../library/stampPlacement'
import { elementName } from '../domain/cartographicPresets'
import { useEditorStore } from '../store/editorStore'
import { useImage } from '../images/useImage'
import styles from './PatternTools.module.css'
function Choice({ id, name, pattern }: { id: string; name: string; pattern: boolean }) {
  const { image } = useImage(id, 'thumbnail')
  return <button className={styles.choice} title={`Change ${name}`} onClick={() => pattern ? openMaterialBrowser() : openStampLibrary()}>{image && <img src={image.src} alt="" />}<span>{name}</span><span aria-hidden="true">⌄</span></button>
}
export function PatternTools() {
  const tool = useEditorStore((s) => s.activeTool), stamp = useEditorStore((s) => s.stampAsset), pattern = useEditorStore((s) => s.patternAsset)
  const asset = tool === 'placeStamp' ? stamp : tool === 'patternFill' ? pattern : null
  return <div className={styles.tools}><span>{['place','label','legend','compass','scaleBar','title','infoPanel'].includes(tool)?elementName(tool):tool === 'route' ? 'Route' : tool === 'measure' ? 'Measure' : tool === 'scatter' ? 'Scatter' : tool === 'opening' ? 'Opening' : tool === 'wall' ? 'Wall' : tool === 'path' ? 'Path' : tool === 'editPath' ? 'Edit path' : tool === 'placeStamp' ? 'Place asset' : tool === 'area' ? 'Area' : tool === 'editArea' ? 'Edit points' : tool === 'patternFill' ? 'Apply Material' : 'Select'}</span>{asset && <Choice id={asset.id} name={asset.name} pattern={tool === 'patternFill'} />}</div>
}

