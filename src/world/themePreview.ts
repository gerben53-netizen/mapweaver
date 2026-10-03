import { styleFingerprint, worldTheme } from '../domain/worldThemes'
import { exportScene } from '../export/scene'
import { loadAnnotationFonts } from '../canvas/annotationFonts'
import { themePreviewScene, THEME_PREVIEW_VERSION, type PreviewImages } from './themePreviewScene'

interface PreviewResult {url:string;warning:string;milliseconds:number}
const cache=new Map<string,Promise<PreviewResult>>()
let queue=Promise.resolve()
/** Session cache, rebuilt on application reload/deploy. Serial jobs bound transient render memory. */
export function themePreview(id:string):Promise<PreviewResult> {
 const key=styleFingerprint([THEME_PREVIEW_VERSION,worldTheme(id)])
 const hit=cache.get(key);if(hit)return hit
 const job=queue.then(async()=>{
  // Let the chooser paint and respond between bounded, one-shot renders.
  await new Promise(resolve=>setTimeout(resolve,0))
  const started=performance.now(),theme=worldTheme(id);if(!theme)throw Error('Unknown theme.')
  const {buildScene}=await import('../export/render')
  await loadAnnotationFonts()
  const painterly=theme.assetTheme==='painterlyFantasy',images=new Map<string,HTMLImageElement>(),metadata:PreviewImages={},missing:string[]=[]
  const sources={mountain:painterly?'/world-assets-painterly/assets/ridge-01.png':'/world-assets/assets/ridge-cluster.png',forest:painterly?'/world-assets-painterly/assets/broadleaf-interior-01.png':'/world-assets/assets/temperate-forest.png',...(painterly?{city:'/settlement-assets-painterly/assets/city-stone.png'}:{})}
  await Promise.all(Object.entries(sources).map(async([kind,url])=>{try{const image=new Image();image.src=url;await image.decode();images.set(kind,image);metadata[kind as keyof PreviewImages]={id:kind,width:image.naturalWidth,height:image.naturalHeight}}catch{missing.push(kind)}}))
  const scene=themePreviewScene(id,metadata),root=buildScene(exportScene(scene,{scale:1,transparent:false,includeGrid:false}),images)
  try {const canvas=root.toCanvas({x:0,y:0,width:800,height:500,pixelRatio:1});try{return {url:canvas.toDataURL('image/png'),warning:missing.length?`Some sample artwork is unavailable (${missing.join(', ')}). Terrain and symbols remain visible.`:'',milliseconds:performance.now()-started}}finally{canvas.width=canvas.height=0}}
  finally {root.destroy()}
 })
 queue=job.then(()=>{},()=>{});cache.set(key,job);void job.catch(()=>cache.delete(key));return job
}
