import { useEditorStore } from './editorStore'
import { useProjectStore } from './projectStore'
import { useProjectSession } from '../projects/session'
import { generateScatterAsync } from '../canvas/scatterClient'
import type { ScatterObject } from '../domain/scatter'
export async function regenerateScatter(input:ScatterObject,expected?:ScatterObject){
  if(useEditorStore.getState().scatterBusy)throw Error('Wait for the current scatter operation.')
  const generation=useProjectSession.getState().generation,layer=useEditorStore.getState().activeLayerId,map=useProjectStore.getState().map
  useEditorStore.setState({scatterBusy:true})
  try{const result=await generateScatterAsync(input);if(generation!==useProjectSession.getState().generation||map!==useProjectStore.getState().map||(!expected&&layer!==useEditorStore.getState().activeLayerId))throw Error('Project changed; scatter was not applied.');useProjectStore.getState().commitScatter(result,expected)}finally{if(generation===useProjectSession.getState().generation)useEditorStore.setState({scatterBusy:false})}
}
