import type { ContinuousWallDefinition } from './continuousWallMaterial'
import type { WallSetDefinition } from './wallSets'
export function continuousRecipe():ContinuousWallDefinition {
  return {version:1,category:'Test material',sources:{fill:[0]},scale:{unit:'ft',textureLength:6,textureWidth:3,organicWavelength:5,edgeWidth:.2},widths:{thin:1.5,standard:3.5,heavy:6,massive:10},supported:['organic','variation'],defaults:{variation:.6,organic:.5,growth:0,overgrowth:0},presets:[{name:'Clean',values:{variation:0,organic:0,growth:0,overgrowth:0}}],options:[]}
}
export function continuousDefinition():WallSetDefinition {
  return {schemaVersion:1,id:'test-continuous',version:'1',title:'Continuous fixture',description:'Test only',renderingMode:'continuous',continuous:continuousRecipe(),nominalWidthPx:16,defaultThickness:35,repeatLengthPx:32,overlapPx:0,coreColor:'#b1a389',roughnessLimits:{max:0,default:0,maxProtrusionPx:0},bodyVariants:[{file:'assets/test.png',width:32,height:16,anchor:{x:16,y:8},weight:1,rotation:0,scaleVariation:0,rect:{x:0,y:0},hull:[{x:0,y:0},{x:32,y:0},{x:32,y:16},{x:0,y:16}]}],author:'Test',source:'Test',license:'Test',atlasWidth:32,atlasHeight:16,revision:'b'.repeat(64)}
}
