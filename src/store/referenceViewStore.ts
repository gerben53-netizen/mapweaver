import { create } from 'zustand'
import { calibrateReference, linkedReferenceViewport, validReferencePoint, type ReferencePair, type Similarity } from '../canvas/referenceCalibration'
import type { Point, Size, Viewport } from '../canvas/viewport'
import { useEditorStore } from './editorStore'
/** Editor-only visibility; deliberately absent from project snapshots, archives and assets. */
export type ReferenceMode='independent'|'reference-map'|'map-reference'
const session=()=>({pairs:[] as ReferencePair[],calibration:null as Similarity|null,mode:'independent' as ReferenceMode,pick:null as {id:number;side:'image'|'map'}|null,calibrating:false,markers:true,error:'',navigationNote:'',imageSize:null as Size|null,referenceSize:{width:0,height:0},view:{zoom:1,pan:{x:0,y:0}} as Viewport})
export const useReferenceViewStore=create(()=>({open:false,mapCanvasSize:{width:0,height:0},...session()}))
export function resetReferenceSession(){useReferenceViewStore.setState(session())}
export function invalidateReferenceCalibration(message='Points changed. Recalculate calibration.') {useReferenceViewStore.setState({calibration:null,mode:'independent',error:message,navigationNote:''})}
export function addReferencePair(){const s=useReferenceViewStore.getState();if(s.pairs.length>=16){useReferenceViewStore.setState({error:'Use at most 16 point pairs.'});return}const id=Math.max(0,...s.pairs.map(p=>p.id))+1;invalidateReferenceCalibration('');useReferenceViewStore.setState({pairs:[...s.pairs,{id,image:null,map:null}],pick:{id,side:'image'},calibrating:true})}
export function removeReferencePair(id:number){const s=useReferenceViewStore.getState();invalidateReferenceCalibration();useReferenceViewStore.setState({pairs:s.pairs.filter(p=>p.id!==id),pick:null})}
export function setReferencePoint(id:number,side:'image'|'map',point:Point,bounds:Size){
  const s=useReferenceViewStore.getState()
  if(!validReferencePoint(point,bounds)){useReferenceViewStore.setState({error:'Choose a point inside the '+(side==='image'?'image':'map')+' bounds.'});return false}
  if(!s.pairs.some(p=>p.id===id))return false
  invalidateReferenceCalibration('')
  useReferenceViewStore.setState({pairs:s.pairs.map(p=>p.id===id?{...p,[side]:point}:p),pick:side==='image'?{id,side:'map'}:null})
  return true
}
export function calculateReferenceCalibration(map:Size){const s=useReferenceViewStore.getState();try{if(!s.imageSize)throw Error('Load a reference image first.');const calibration=calibrateReference(s.pairs,s.imageSize,map);useReferenceViewStore.setState({calibration,error:'',pick:null})}catch(e){invalidateReferenceCalibration((e as Error).message)}}
export function alignReferenceViews(direction:'reference-map'|'map-reference'='reference-map'){
  const s=useReferenceViewStore.getState();if(!s.open||!s.calibration||!s.imageSize||![s.referenceSize.width,s.referenceSize.height,s.mapCanvasSize.width,s.mapCanvasSize.height].every(v=>v>0))return
  const mapView=useEditorStore.getState().viewport,fromReference=direction==='reference-map',next=linkedReferenceViewport(fromReference?s.view:mapView,fromReference?s.referenceSize:s.mapCanvasSize,fromReference?s.mapCanvasSize:s.referenceSize,s.calibration,direction)
  if(fromReference)useEditorStore.setState({viewport:next.view});else useReferenceViewStore.setState({view:next.view})
  useReferenceViewStore.setState({navigationNote:next.limited?'Follower zoom limit reached; centres remain aligned.':''})
}
/** Directional subscriptions with a reentrancy guard; target updates never become source events. */
export function installReferenceNavigation(){let syncing=false;const sync=(direction:'reference-map'|'map-reference')=>{if(syncing)return;syncing=true;try{alignReferenceViews(direction)}finally{syncing=false}}
 const offMap=useEditorStore.subscribe((s,p)=>{if(s.viewport!==p.viewport&&useReferenceViewStore.getState().mode==='map-reference')sync('map-reference')})
 const offReference=useReferenceViewStore.subscribe((s,p)=>{if(!s.open&&(s.mode!=='independent'||s.pick)){useReferenceViewStore.setState({mode:'independent',pick:null});return}if(s.mode==='independent')return;if(s.view!==p.view||s.mode!==p.mode||s.referenceSize!==p.referenceSize||s.mapCanvasSize!==p.mapCanvasSize||s.calibration!==p.calibration)sync(s.mode)})
 return()=>{offMap();offReference()}
}
