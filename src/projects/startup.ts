import { api } from '../storage/api'
import type { RemoteProject } from '../storage/api'
import { inventory, migrationState } from '../storage/migration'
import { loadLocalProject, pendingDatabase } from './localSession'
import type { PendingCopy } from './localSession'
import { useProjectSession } from './session'

export interface StartupResult { rows:RemoteProject[]; pending:PendingCopy[]; migrationRequired:boolean; opened:boolean; error:string }
/** Consumes the automatic attempt before loading: even a crash cannot loop on the same broken target. */
export async function openStartupProject(rows:RemoteProject[]):Promise<{opened:boolean;error:string}> {
 try {
  const {id}=await api<{id:string|null}>('/startup-project')
  if(!id)return {opened:false,error:''}
  const {claimed}=await api<{claimed:boolean}>('/startup-project','POST',{id})
  if(!claimed)return {opened:false,error:''}
  if(!rows.some(row=>row.id===id))return {opened:false,error:'The previous project is missing or in Trash. Choose another project.'}
  useProjectSession.setState({busy:`Opening ${rows.find(row=>row.id===id)!.name}…`})
  return {opened:await loadLocalProject(id,()=>false),error:''}
 }catch(error){return {opened:false,error:`The previous project could not be reopened. Choose a project or retry from Projects. ${error instanceof Error?error.message:''}`}}
}
export async function initializeProjects():Promise<StartupResult> {
 const result:StartupResult={rows:[],pending:[],migrationRequired:true,opened:false,error:''}
 useProjectSession.setState({busy:'Opening Mapweaver…'})
 try {
  const [projects,browser]=await Promise.allSettled([api<RemoteProject[]>('/projects'),Promise.all([inventory(),migrationState(),pendingDatabase.pending.toArray()])])
  if(projects.status==='fulfilled')result.rows=projects.value
  else throw projects.reason
  if(browser.status==='rejected')throw browser.reason
  const [source,state,copies]=browser.value
  result.pending=copies;result.migrationRequired=!state.completed&&(source.assets.length>0||source.projects.length>0)
  if(!result.migrationRequired)Object.assign(result,await openStartupProject(result.rows))
  if(result.opened&&copies.length)useProjectSession.setState({warning:'Unsynced browser recovery copies are available under Projects → Recovery.'})
 }catch(error){result.error=`Local projects could not be checked. Use Projects → More → Refresh projects or Storage. ${error instanceof Error?error.message:''}`}
 finally {useProjectSession.setState({busy:'',error:result.error})}
 return result
}
