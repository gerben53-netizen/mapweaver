import { labelTextStyle, textWidth } from './annotations'
import type { TextStyle } from './annotations'
import type { MapDocument } from './models'
import { LABEL_CLASSES, type LabelClass } from './automaticLabelMetadata'
import { themeText, worldTheme, type WorldTheme } from './worldThemes'
export function automaticThemeStyle(theme:WorldTheme,kind:LabelClass){const c=LABEL_CLASSES[kind];return {...themeText(theme,c.role),size:c.size*(theme.sparse?.9:1),bold:['worldTitle','majorRegion','region','capital','majorCity'].includes(kind),italic:c.role==='water',letterSpacing:kind==='majorRegion'?2:kind==='region'||kind==='mountainRange'?1:0}}
export function automaticLabelStyle(map:MapDocument,kind:LabelClass,text:string):TextStyle{
 const theme=worldTheme(map.theme?.id),c=LABEL_CLASSES[kind],style={...labelTextStyle(map.mapType),size:c.size,...(theme?automaticThemeStyle(theme,kind):{font:c.role==='water'?'ebgaramond':'spectral',italic:c.role==='water',bold:c.priority>=70,color:c.role==='water'?'#315f76':'#343b2d',strokeColor:'#f1e5c4',strokeWidth:1.5}),backgroundOpacity:0,padding:2,maxWidth:2000}
 return {...style,maxWidth:Math.max(20,Math.min(600,Math.ceil(textWidth(text,style))))}
}
