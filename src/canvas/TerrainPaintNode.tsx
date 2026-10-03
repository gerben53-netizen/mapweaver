import { Shape } from 'react-konva/lib/ReactKonvaCore'
import { useTerrainBrushStore } from '../store/terrainBrushStore'
import { paintTerrain } from './drawTerrainPaint'
import type { TerrainPaint } from '../domain/terrainPaint'
import { useEffect } from 'react'
import { usePremiumTextures } from './usePremiumTextures'
import { paintTextureIds } from './premiumTerrainTextures'
import { useEditorStore } from '../store/editorStore'

export function TerrainPaintNode({paint}:{paint?:TerrainPaint}){
  const preview=useTerrainBrushStore(s=>s.preview)
  const resources = usePremiumTextures(paintTextureIds(preview || paint))
  useEffect(() => { if(resources.error)useEditorStore.setState({message:resources.error}) }, [resources.error])
  if (!resources.ready) return null
  return <Shape name="terrain-paint" listening={false} perfectDrawEnabled={false} sceneFunc={c=>paintTerrain(c._context,preview||paint)}/>
}
