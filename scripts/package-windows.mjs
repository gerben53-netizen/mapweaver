import { checkFontResources } from './check-font-resources.mjs'
import { mkdirSync, copyFileSync, cpSync, readFileSync, existsSync } from 'node:fs'
import { checksums } from './package-checksums.mjs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
if(process.platform!=='win32'||process.arch!=='x64')throw new Error('Build on Windows x64 with the pinned Node runtime.')
if(process.version!=='v24.17.0')throw new Error('Use Node v24.17.0 for this package; rebuild native modules together with runtime upgrades.')
const packageName=process.argv[2] || 'Mapweaver'
if(!/^Mapweaver(?:-[a-zA-Z0-9-]+)?$/.test(packageName))throw new Error('Use a Mapweaver package name, without path components.')
const root=process.cwd(),target=path.join(root,'distribution.local',packageName)
if(existsSync(target))throw new Error('Output exists. Retain or move the previous package before building a new one.')
checkFontResources('dist')
mkdirSync(path.join(target,'runtime'),{recursive:true})
copyFileSync(process.execPath,path.join(target,'runtime','node.exe'))
for(const name of ['dist','dist-service','docs'])cpSync(path.join(root,name),path.join(target,name),{recursive:true})
const lock=JSON.parse(readFileSync('package-lock.json','utf8'))
for(const [name,meta] of Object.entries(lock.packages)){
  if(!name.startsWith('node_modules/')||meta.dev||!existsSync(name))continue
  cpSync(name,path.join(target,name),{recursive:true})
}
copyFileSync('THIRD_PARTY_FONTS.md',path.join(target,'THIRD_PARTY_FONTS.md'))
copyFileSync('package.json',path.join(target,'package.json'))
copyFileSync('package-lock.json',path.join(target,'package-lock.json'))
const compiler=path.join(process.env.SystemRoot,'Microsoft.NET','Framework64','v4.0.30319','csc.exe')
execFileSync(compiler,['/nologo','/target:winexe',`/win32icon:${path.join(root,'launcher','Mapweaver.ico')}`,'/reference:System.Drawing.dll','/reference:System.Windows.Forms.dll','/reference:System.Web.Extensions.dll',`/out:${path.join(target,'Mapweaver.exe')}`,path.join(root,'launcher','Mapweaver.cs')],{stdio:'inherit',windowsHide:true})
copyFileSync(path.join(target,'Mapweaver.exe'),path.join(target,'Create shortcuts.exe'))
for(const [source,dest] of [['README.md','README.md'],['docs/portable-windows.md','PORTABLE-WINDOWS.md'],['docs/backup-restore.md','BACKUP-RESTORE.md'],['docs/troubleshooting.md','TROUBLESHOOTING.md'],['launcher/Create shortcuts.ps1','Create shortcuts.ps1']])copyFileSync(source,path.join(target,dest))
const license=path.join(root,'launcher','licenses','Node-LICENSE')
if(!existsSync(license))throw new Error('Node runtime LICENSE missing; supply it alongside node.exe before packaging.')
copyFileSync(license,path.join(target,'runtime','LICENSE'))
checksums(target,packageName === 'Mapweaver' ? undefined : path.join(root,'distribution.local',packageName+'-SHA256SUMS.txt'))
console.log('Portable Windows package built: '+target)

