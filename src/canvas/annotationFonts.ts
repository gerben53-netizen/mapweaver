import { FONT_LIBRARY } from '../fonts/registry'
let ready:Promise<void>|undefined
export const fontFailures:string[]=[]
/** One local preload barrier shared by editor, previews and PNG export. */
export function loadAnnotationFonts():Promise<void>{
 if(!ready)ready=Promise.all(FONT_LIBRARY.flatMap(font=>Object.values(font.variants).map(async v=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  try {
   const face=new FontFace(`Mapweaver ${font.name}`,`url("${encodeURI(v.file)}")`,{weight:String(v.weight),style:v.style})
   await Promise.race([face.load(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Font timeout')),5000)})])
   document.fonts.add(face)
  }catch {if(!fontFailures.includes(font.name))fontFailures.push(font.name)}finally {clearTimeout(timer)}
 }))).then(()=>{})
 return ready
}
