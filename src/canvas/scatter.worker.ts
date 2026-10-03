import { generateScatter } from '../domain/scatter'
self.onmessage=event=>{try{self.postMessage({object:generateScatter(event.data)})}catch(error){self.postMessage({error:(error as Error).message})}}
