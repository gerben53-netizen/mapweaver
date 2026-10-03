import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
const {version}=JSON.parse(readFileSync('package.json','utf8'))
const compiler=process.env.INNO_SETUP_ISCC || '.installer.local/tools/inno/ISCC.exe'
if(!existsSync(compiler))throw Error('Install Inno Setup 6.7.3; set INNO_SETUP_ISCC to its ISCC.exe (see docs/distribution/README.md).')
const name=`Mapweaver-Installer-${version}`,target=path.resolve('distribution.local',name)
if(existsSync(target)||existsSync(`distribution.local/Mapweaver-Setup-${version}.exe`))throw Error('Release output already exists; preserve it and increment package.json version before another release.')
const env={...process.env,VITE_MAPWEAVER_INSTALLER:'1',MAPWEAVER_INSTALLER_PACKAGE:'1'}
execFileSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm run build'],{env,stdio:'inherit',windowsHide:true})
execFileSync(process.execPath,['scripts/package-windows.mjs',name],{env,stdio:'inherit',windowsHide:true})
execFileSync(path.resolve(compiler),['/Q',`/DAppVersion=${version}`,`/DPackageDir=${target}`,path.resolve('launcher/installer.iss')],{stdio:'inherit',windowsHide:true})
const setup=`distribution.local/Mapweaver-Setup-${version}.exe`
writeFileSync(setup+'.sha256',createHash('sha256').update(readFileSync(setup)).digest('hex')+'  '+path.basename(setup)+'\n')
console.log('Installer: '+path.resolve(setup))
