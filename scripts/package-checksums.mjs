import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
export function checksums(target=path.resolve('distribution.local/Mapweaver'),output=path.join(path.dirname(target),'SHA256SUMS.txt')) {
 const files=[];const visit=folder=>{for(const name of readdirSync(folder)){const file=path.join(folder,name);if(statSync(file).isDirectory())visit(file);else files.push(file)}};visit(target)
 writeFileSync(output,files.sort().map(file=>createHash('sha256').update(readFileSync(file)).digest('hex')+'  '+path.relative(path.dirname(target),file)).join('\n')+'\n')
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))checksums(process.argv[2]?path.resolve(process.argv[2]):undefined,process.argv[3]?path.resolve(process.argv[3]):undefined)
