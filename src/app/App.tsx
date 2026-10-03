import { CampaignWorkspace } from '../campaigns/CampaignWorkspace'
import { InspectorResize } from './InspectorResize'
import { useInspectorWidth } from './inspectorWidth'
import { useEffect } from 'react'
import { watchMapToolContext } from '../store/mapToolContext'
import { confirmLibraryNavigation, refreshActiveAssetDefault } from '../library/libraryHistory'
import { version } from '../../package.json'
import { ProjectControls } from './ProjectControls'
import { useProjectSession } from '../projects/session'
import { MapSettingsPanel } from './MapSettingsPanel'
import { SceneOutliner } from './SceneOutliner'
import { ObjectProperties } from './ObjectProperties'
import { MapCanvas } from '../canvas/MapCanvas'
import { LibraryWorkspace } from '../library/LibraryWorkspace'
import { AssetPicker } from '../library/AssetPicker'
import { BackgroundImport } from './BackgroundImport'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { finishObjectGesture } from '../canvas/interaction'
import { ToolRail } from './ToolRail'
import { Tabs } from './Tabs'
import { Icon } from './Icon'
import styles from './App.module.css'
export function App() {
  const [inspectorWidth,setInspectorWidth]=useInspectorWidth()
  useEffect(watchMapToolContext, [])
  const stampBrowserOpen = useEditorStore(s => s.stampBrowserOpen)
  const focus = useEditorStore(s => s.focusMode)
  const revision = useProjectSession(s => s.revision)
  const generation = useProjectSession((s) => s.generation), busy = useProjectSession((s) => s.busy)
  const workspace = useEditorStore((s) => s.workspace), inspector = useEditorStore((s) => s.inspector), collapsed = useEditorStore((s) => s.inspectorCollapsed)
  const map = useProjectStore((s) => s.map)
  return <div className={styles.app} data-mapweaver-editor>
    <header className={styles.header}><div className={styles.brand}><span className={styles.brandMark} aria-hidden="true"><Icon name="compass"/></span><h1>Mapweaver <small>{version}</small></h1></div><div inert={!!busy}><Tabs label="Workspace" value={workspace} items={[["editor", 'Map editor'], ['library', 'Asset library']]} onChange={(value) => { if(workspace==='library'&&!confirmLibraryNavigation())return; finishObjectGesture(); if(value==='editor')void refreshActiveAssetDefault(); useEditorStore.setState({ workspace: value }) }} /></div><ProjectControls /></header>
    <main className={`${styles.main} ${stampBrowserOpen && workspace === 'editor' ? styles.withStampBrowser : ''}`} inert={!!busy}>
      <div hidden={workspace !== 'editor'} className={`${styles.editor} ${focus ? styles.focus : ""}`}><CampaignWorkspace><div className={`${styles.editor} ${focus ? styles.focus : ""}`} key={generation} inert={revision===null}><ToolRail /><MapCanvas />
        <aside className={collapsed ? styles.collapsed : styles.panel} style={collapsed?undefined:{width:inspectorWidth}} aria-label="Inspector">
          {!collapsed&&<InspectorResize width={inspectorWidth} onChange={setInspectorWidth}/>}
          <div className={styles.inspectorHead}>{!collapsed && <Tabs label="Inspector" value={inspector==='objects'?'layers':inspector} items={[["layers", 'Scene'], ['properties', 'Properties'], ['map', 'Map']]} onChange={(value) => useEditorStore.setState({ inspector: value, ...(value === 'layers' ? { layersUsedAt: Date.now() } : {}) })} />}<button className="icon-button" title={collapsed ? 'Expand inspector' : 'Collapse inspector'} aria-label={collapsed ? 'Expand inspector' : 'Collapse inspector'} onClick={() => useEditorStore.setState({ inspectorCollapsed: !collapsed })}><Icon name={collapsed ? 'layers' : 'close'} /></button></div>
          <div hidden={collapsed} className={styles.inspectorBody}>
            <div hidden={inspector !== 'layers' && inspector !== 'objects'} className={styles.scenePage}><SceneOutliner/></div>
            <div hidden={inspector !== 'properties'} className={styles.inspectorPage}>{inspector === 'properties' && <ObjectProperties />}</div>
            <div hidden={inspector !== 'map'} className={styles.inspectorPage}><MapSettingsPanel /><section className={styles.background}><h2>Background</h2><p className="muted">{map.background?.name || 'A plain canvas'}</p><BackgroundImport /><p className="muted">Loading an image uses its natural dimensions as the map size.</p></section></div>
          </div>
        </aside>
      </div></CampaignWorkspace></div><div hidden={workspace !== 'library' && !stampBrowserOpen} className={workspace === 'editor' ? styles.stampBrowser : styles.library}><LibraryWorkspace docked={workspace === 'editor'} /></div>
    </main><AssetPicker />
  </div>
}

