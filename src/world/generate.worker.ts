import { generateWorld } from './generate'
import { scatterWorld } from './scatterWorld'
import type { WorldParameters } from './model'
import type { WorldScatterAsset,WorldScatterSettings } from './scatterModel'
type Input=WorldParameters|{parameters:WorldParameters;settings:WorldScatterSettings;assets:WorldScatterAsset[]}
self.onmessage=(event:MessageEvent<Input>)=>{try{const input=event.data;self.postMessage({result:'parameters' in input?scatterWorld(generateWorld(input.parameters,2),input.settings,input.assets):generateWorld(input,2)})}catch(error){self.postMessage({error:error instanceof Error?error.message:'World generation failed.'})}}
