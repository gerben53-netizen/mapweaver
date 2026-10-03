import { useProjectStore } from '../store/projectStore'
import { formatSize, worldDimension } from '../domain/mapScale'
import styles from './ObjectProperties.module.css'

export function WorldDimensions({ width, height }: { width: number; height: number }) {
  const map = useProjectStore(s => s.map)
  return <dl className={styles.dimensions} aria-label="Object dimensions">
    {([['Width', width], ['Height', height]] as const).map(([label, pixels]) => {
      const world = worldDimension(pixels, map)
      return <div key={label}><dt>{label}</dt><dd>
        {world && <strong>{formatSize(world.value)} {world.unit}</strong>}
        <small>{formatSize(pixels)} px</small>
      </dd></div>
    })}
  </dl>
}
