import { useEffect,useState } from 'react'
import type { GeneratedWall } from '../domain/generatedWalls'
import { loadGeneratedWall } from './drawGeneratedWall'
import { useEditorStore } from '../store/editorStore'
export function useGeneratedWallImages(g?:GeneratedWall){
 const [,setReady]=useState(0),key=g?g.id+'@'+g.revision:''
 useEffect(()=>{if(!key)return;let active=true;const[id,revision]=key.split('@');void loadGeneratedWall({id,revision,seed:0,organic:0,growth:0,overgrowth:0}).then(()=>{if(active)setReady(n=>n+1)}).catch(e=>{if(active)useEditorStore.setState({message:`Generated wall unavailable: ${e.message}`})});return()=>{active=false}},[key])
}
