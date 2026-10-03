import { Group, Image, Rect } from 'react-konva'
import { useStampGhost, stampPlacementError } from '../library/stampPlacement'
import { useImage } from '../images/useImage'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { placementSize } from '../domain/placement'
import { interactionGrid, snapPoint } from '../domain/mapSettings'
export function StampPlacementGhost() {
  const ghost = useStampGhost(), zoom = useEditorStore(s => s.viewport.zoom)
  const map = useProjectStore(s => s.map)
  useProjectStore(s => s.layers); useProjectStore(s => s.layerTree)
  useEditorStore(s => s.activeLayerId); useEditorStore(s => s.soloLayerId)
  const { image } = useImage(ghost.asset?.id || '', 'asset', 'stamp')
  if (!ghost.asset || !ghost.point) return null
  const { width, height } = placementSize(ghost.asset, map), center = snapPoint(ghost.point, interactionGrid(map), ghost.bypass)
  const invalid = ghost.error || stampPlacementError(ghost.asset, ghost.point)
  return <Group name="stamp-placement-ghost" listening={false} x={center.x - width / 2} y={center.y - height / 2}>
    {image && <Image image={image} width={width} height={height} opacity={invalid ? .3 : .65} />}
    <Rect width={width} height={height} stroke={invalid ? '#ff6975' : '#91dbbe'} strokeWidth={2 / zoom} dash={[6 / zoom, 4 / zoom]} />
  </Group>
}
