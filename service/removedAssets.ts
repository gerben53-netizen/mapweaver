import type { Storage } from './storage'
/** Keep immutable bytes/identity for library undo; detach all active-library metadata. */
export function resetRemovedAssetMetadata(s:Storage,id:string){
 s.db.prepare('DELETE FROM library_members WHERE assetId=?').run(id)
 s.db.prepare("UPDATE assets SET patternScale=NULL,generator=NULL,categoryId='uncategorized',tags='[]',description='',favorite=0,author='',source='',license='',applicableMapTypes='[]',sizingMode='native',defaultWidth=NULL,defaultHeight=NULL,sizingUnit=NULL,aspectRatioLocked=1,sizingScope='any' WHERE id=?").run(id)
}
export function reviveRemovedAsset(s:Storage,id:string,name:string,originalName:string,categoryId:string){
 resetRemovedAssetMetadata(s,id)
 const now=new Date().toISOString()
 s.db.prepare('UPDATE assets SET deletedAt=NULL,name=?,originalName=?,categoryId=?,createdAt=?,modifiedAt=? WHERE id=?').run(name,originalName,categoryId,now,now,id)
}
export function removeRecentAssetChoices(s:Storage,ids:Set<string>){
 const row=s.db.prepare("SELECT value FROM settings WHERE key='scatterRecentSets'").get() as {value:string}|undefined
 if(row){const sets=(JSON.parse(row.value) as {assetId:string}[][]).filter(set=>!set.some(source=>ids.has(source.assetId)));s.db.prepare("UPDATE settings SET value=? WHERE key='scatterRecentSets'").run(JSON.stringify(sets))}
}
