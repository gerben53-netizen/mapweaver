import { useEffect, useState } from 'react'
import { Shape } from 'react-konva/lib/ReactKonvaCore'
import type { MapDocument, MapObject } from '../domain/models'
import type { ArlMode } from '../store/arlStore'
import type { ArlBatch } from './architecturalReadability'
import { arlWall } from './architecturalReadability'
import { paintArlBatch } from './drawArchitecturalReadability'
import { loadGeneratedWall } from './drawGeneratedWall'
import { useEditorStore } from '../store/editorStore'
import { useAssetContext } from '../projects/assets'
export function ArchitecturalReadabilityNode({ batch, map, objects, mode }: { batch: ArlBatch; map: MapDocument; objects: MapObject[]; mode: ArlMode }) {
  const generation = useAssetContext(s => s.generation), keys = objects.filter(arlWall).map(w => `${w.wall!.generated!.id}@${w.wall!.generated!.revision}`).sort().join('|')
  const [ready, setReady] = useState('')
  useEffect(() => {
    let cancelled = false
    const walls = objects.filter(arlWall)
    void Promise.all(walls.map(w => loadGeneratedWall(w.wall!.generated!))).then(() => { if (!cancelled) setReady(keys) }).catch(e => { if (!cancelled) useEditorStore.setState({ message: `Wall readability unavailable: ${e.message}` }) })
    return () => { cancelled = true }
  }, [keys, objects])
  return ready === keys ? <Shape listening={false} perfectDrawEnabled={false} sceneFunc={c => { void generation; paintArlBatch(c._context, batch, map, objects, mode) }} /> : null
}
