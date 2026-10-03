import { campaignForMap } from './campaigns'
import { Storage, StorageError, safeId } from './storage'
const key='lastOpenedProject'
export function startupProject(store:Storage):string|null {
 return (store.db.prepare('SELECT value FROM settings WHERE key=?').get(key) as {value:string}|undefined)?.value||null
}
export function clearStartupProject(store:Storage,id:string) {
 if(typeof id!=='string')throw new StorageError('INVALID_REFERENCE','Expected a project reference.')
 return !!store.db.prepare('DELETE FROM settings WHERE key=? AND value=?').run(key,id).changes
}
export function rememberStartupProject(store:Storage,id:string) {
 safeId(id)
 store.db.transaction(()=>{
  const row=store.db.prepare('SELECT deletedAt FROM projects WHERE id=?').get(id) as {deletedAt:string|null}|undefined
  if(!row||row.deletedAt)throw new StorageError('NOT_FOUND','Project is missing or in Trash.',404)
  store.db.prepare('UPDATE projects SET openedAt=? WHERE id=?').run(new Date().toISOString(),id)
  store.db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,id)
 })()
 return {id,campaignId:campaignForMap(store,id)}
}
