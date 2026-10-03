import { applyLandStroke, type LandBrushInput } from '../domain/landBrush'
self.onmessage=(event:MessageEvent<LandBrushInput>)=>{
 try{self.postMessage({result:applyLandStroke(event.data)})}catch(error){self.postMessage({error:error instanceof Error?error.message:'Land editing failed.'})}
}
