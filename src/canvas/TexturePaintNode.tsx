import { useProjectStore } from '../store/projectStore'
import { mergeTextureImages } from '../domain/textureBrush'
import { useEffect } from 'react'
import { Shape } from 'react-konva/lib/ReactKonvaCore'
import { useTextureBrushStore } from '../store/textureBrushStore'
import { useAssetContext } from '../projects/assets'
import { acquireAssetImage } from '../images/imageCache'
import { texturePaintAssetIds, type TerrainPaint } from '../domain/terrainPaint'
import type { MapObject } from '../domain/models'
import { drawTexturePaint } from './drawTexturePaint'
import { useEditorStore } from '../store/editorStore'
export function TexturePaintNode({paint,objects,restricted,base=false}:{base?:boolean;paint?:TerrainPaint;objects:MapObject[];restricted:boolean}){
 const preview=useTextureBrushStore(s=>s.preview),selected=useTextureBrushStore(s=>s.settings.assetId),images=useTextureBrushStore(s=>s.images),imageGeneration=useTextureBrushStore(s=>s.imageGeneration),generation=useAssetContext(s=>s.generation)
 const current=preview||paint, key=JSON.stringify([...new Set([...texturePaintAssetIds(current),...(selected?[selected]:[])])].sort())
 useEffect(()=>{let active=true;const ids=JSON.parse(key) as string[],leases=ids.map(id=>({id,lease:acquireAssetImage(id,'fillPattern')}));void Promise.all(leases.map(async({id,lease})=>[id,await lease.promise] as const)).then(entries=>{if(active)useTextureBrushStore.setState(state=>{const required=[...texturePaintAssetIds(useProjectStore.getState().map.texturePaint),...texturePaintAssetIds(state.preview||undefined),...(state.settings.assetId?[state.settings.assetId]:[])];return {images:mergeTextureImages(state.imageGeneration===generation?state.images:new Map(),entries,required),imageGeneration:generation}})}).catch(e=>{if(active)useEditorStore.setState({message:`Material unavailable: ${e.message}`})});return()=>{active=false;leases.forEach(l=>l.lease.release())}},[key,generation])
 if(imageGeneration!==generation||texturePaintAssetIds(current).some(id=>!images.has(id)))return null
 return <Shape name={base?"base-texture-paint":"texture-paint"} listening={false} perfectDrawEnabled={false} sceneFunc={c=>drawTexturePaint(c._context,current,objects,restricted,images,base)}/>
}
