import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
const explorer=path.join(process.env.SystemRoot || 'C:\\Windows','explorer.exe')
export const canOpenDataFolder=process.platform==='win32'&&existsSync(explorer)
export function openDataFolder(directory:string):Promise<void>{
  if(!canOpenDataFolder)return Promise.reject(new Error('Folder opening is unavailable on this platform.'))
  return new Promise((resolve,reject)=>{
    // The explicit UI action opens only the validated application directory; no shell/user command.
    const child=spawn(explorer,[directory],{shell:false,windowsHide:false,stdio:'ignore'})
    child.once('error',reject);child.once('spawn',()=>{child.unref();resolve()})
  })
}
