import type { LabelObject } from './annotations'
import { styleFingerprint } from './worldThemes'
export const LABEL_CLASSES={worldTitle:{priority:110,size:42,role:'title'},majorRegion:{priority:100,size:32,role:'region'},region:{priority:90,size:26,role:'region'},capital:{priority:80,size:23,role:'city'},majorCity:{priority:70,size:20,role:'city'},settlement:{priority:60,size:17,role:'city'},landmark:{priority:40,size:15,role:'marker'},waterMajor:{priority:85,size:29,role:'water'},waterMinor:{priority:50,size:20,role:'water'},river:{priority:45,size:16,role:'water'},mountainRange:{priority:65,size:22,role:'region'}} as const
export type LabelClass=keyof typeof LABEL_CLASSES
export const LABEL_CATEGORIES=['regions','settlements','rivers','water','mountains','landmarks'] as const
export type LabelCategory=typeof LABEL_CATEGORIES[number]
export interface AutomaticLabel {version:1;sourceId:string;labelClass:LabelClass;category:LabelCategory;baseline:string;overridden:boolean;suppressed:boolean}
export function validateAutomaticLabel(v:AutomaticLabel){
 if(!v||Object.keys(v).some(k=>!['version','sourceId','labelClass','category','baseline','overridden','suppressed'].includes(k))||v.version!==1||typeof v.sourceId!=='string'||!/^[\w-]{1,80}$/.test(v.sourceId)||!Object.hasOwn(LABEL_CLASSES,v.labelClass)||!LABEL_CATEGORIES.includes(v.category)||typeof v.baseline!=='string'||!/^[0-9a-f]{16}$/.test(v.baseline)||typeof v.overridden!=='boolean'||typeof v.suppressed!=='boolean')throw Error('Invalid automatic label metadata.')
}
export function automaticLabelFingerprint(o:LabelObject){return styleFingerprint([o.text,o.x,o.y,o.width,o.height,o.rotation,o.style,o.opacity,o.visible!==false,o.offset,o.anchor,o.layoutScale,o.ownerId,o.leader])}
export const automaticLabelOverridden=(o:LabelObject)=>!!o.automatic&&(o.automatic.overridden||o.automatic.baseline!==automaticLabelFingerprint(o))
export function markAutomaticLabelEdit(previous:LabelObject,next:LabelObject):LabelObject{
 return previous.automatic&&next.automatic&&(previous.automatic.overridden||automaticLabelFingerprint(previous)!==automaticLabelFingerprint(next))?{...next,markerName:false,automatic:{...next.automatic,overridden:true}}:next
}
