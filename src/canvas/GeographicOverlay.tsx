import { Line,Circle } from 'react-konva/lib/ReactKonvaCore'
import 'konva/lib/shapes/Circle'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { isLandMap,scaleBar,measurePoints,formatDistance,mapWorkspace,mapTypeName } from '../domain/geography'
import type { Point } from './viewport'
export function MeasureLines({points}:{points:Point[]}) {const zoom=useEditorStore(s=>s.viewport.zoom);return <><Line points={points.flatMap(p=>[p.x,p.y])} stroke="#f5ca74" strokeWidth={2/zoom} listening={false}/>{points.map((p,i)=><Circle key={i} x={p.x} y={p.y} radius={3/zoom} fill="#f5ca74" listening={false}/>)}</>}
export function GeographicReadout({points}:{points:Point[]}) {
  const map=useProjectStore(s=>s.map),zoom=useEditorStore(s=>s.viewport.zoom),tool=useEditorStore(s=>s.activeTool)
  if(!isLandMap(map))return null
  const g=mapWorkspace(map).geography,bar=scaleBar(map,zoom),m=measurePoints(points,map)
  return <div style={{position:'absolute',bottom:12,left:12,pointerEvents:'none',background:'#1e282eee',color:'#edf2ed',padding:'8px 12px',borderRadius:4,fontSize:12,maxWidth:'calc(100% - 24px)'}}>
    <div>{mapTypeName(map.mapType)} · {formatDistance(g.widthKm/(g.unit==='mi'?1.609344:1),g.unit)} across · N {g.northDegrees}°</div>
    {g.scaleBar&&<div aria-label="Map scale bar" style={{width:bar.pixels,borderBottom:'3px solid #edf2ed',padding:'3px 0'}}>{bar.label}</div>}
    {tool==='measure'&&<div>Click points · Enter finishes · Backspace removes · Esc clears{g.ruler&&<div aria-label="Measured distance">Total {formatDistance(m.total,g.unit)} · Last {formatDistance(m.segments.at(-1)??0,g.unit)}</div>}</div>}
  </div>
}
