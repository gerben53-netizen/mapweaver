import { openStampLibrary } from '../library/stampPlacement'
import { MapElementsMenu } from './MapElementsMenu'
import { mapCapabilities } from '../domain/mapCapabilities'
import { useProjectStore } from '../store/projectStore'
import { finishObjectGesture } from '../canvas/interaction'
import { useEditorStore } from '../store/editorStore'
import { toolDescriptions } from './toolIntent'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import styles from './App.module.css'
type Tool = ReturnType<typeof useEditorStore.getState>['activeTool']
export function ToolRail() {
  const capabilities = mapCapabilities(useProjectStore(s => s.map.mapType)), land=capabilities.geographicAreas, tool = useEditorStore(s => s.activeTool), role = useEditorStore(s => s.areaRole)
  const button = (id: Tool, name: string, icon: IconName, action?: () => void, active = tool === id) => capabilities.tools.includes(id) ? <button className="tertiary" key={name} title={toolDescriptions[name] || name} aria-label={name} aria-pressed={active} onClick={() => { finishObjectGesture(); if (action) action(); else useEditorStore.setState({ activeTool: id, message: '' }) }}><Icon name={icon}/></button> : null
  return <nav className={styles.rail} aria-label="Map tools">
    <div role="group" aria-label="Select and edit" className={styles.toolGroup}>
      {button('select','Select','select')}{button('measure','Measure','measure')}
    </div>
    <div role="group" aria-label="Assets" className={styles.toolGroup}>
      {button('placeStamp','Place asset','stamp',openStampLibrary)}
      {button('scatter','Scatter','scatter')}
    </div>
    <div role="group" aria-label="Draw" className={styles.toolGroup}>
      {button('area','Area','area',()=>useEditorStore.setState({activeTool:'area',areaRole:'area',message:''}),tool==='area'&&role==='area')}
      {button('path','Path','path',()=>useEditorStore.setState({activeTool:tool==='route'?'route':'path',message:''}),tool==='path'||tool==='route')}
      {button('ceiling','Ceiling','ceiling',()=>useEditorStore.setState({activeTool:'ceiling',areaShape:'polygon',ceilingsVisible:true,message:''}))}{button('wall','Wall','wall')}{button('opening','Opening','opening')}
    </div>
    <div role="group" aria-label="Terrain and surface" className={styles.toolGroup}>
      {button('environmentalDetail','Environmental Detail','scatter')}
      {button('textureBrush','Texture Brush','brush')}
      {land&&<>
        {button('landBrush','Land / Water','landmass')}
        {button('area','Terrain Region','terrain',()=>useEditorStore.setState({activeTool:'area',areaRole:'terrain-region',areaShape:'polygon',areaFill:{kind:'solid',color:'#7e995c'},areaStroke:true,message:''}),tool==='area'&&role==='terrain-region')}
        {button('terrainBrush','Terrain Brush','brush')}
        {button('waterDepth','Water Depth','waterDepth')}
      </>}
    </div>
    <div role="group" aria-label="Map elements" className={styles.toolGroup}>
      {button('place','Place Marker','place',()=>useEditorStore.setState({markerWizard:true}))}<MapElementsMenu/>
    </div>
  </nav>
}
