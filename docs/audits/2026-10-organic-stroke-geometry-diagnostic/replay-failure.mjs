import fs from 'node:fs/promises'
import { URL } from 'node:url'
import console from 'node:console'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import clipping from 'polygon-clipping'

// Fresh-process replay of EXACT retained doubles. No product modules, repairs,
// coordinate rounding, alternate algorithm or hidden successful fallback.
const root=new URL('./mask-comparisons/',import.meta.url)
const data=JSON.parse(await fs.readFile(new URL('high-density.json',root)))
const expected=JSON.parse(await fs.readFile(new URL('high-density-result.json',root)))
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
assert.equal(hash(data.reference),expected.referenceHash)
assert.equal(hash(data.candidate),expected.candidateHash)
const operations=[]
for(const[direction,a,b]of[['reference-minus-candidate',data.reference,data.candidate],['candidate-minus-reference',data.candidate,data.reference]]){
  try{const result=clipping.difference(a,b);operations.push({direction,status:'unexpected-success',polygons:result.length})}
  catch(error){operations.push({direction,status:'failed',error:error.message})}
}
for(const op of operations){assert.equal(op.status,'failed');assert.equal(op.error,expected.operations.find(v=>v.direction===op.direction).error)}
const land=[[[[150,100],[550,100],[550,950],[150,950],[150,100]]]]
const landOperations=[]
for(const[name,mask]of[['reference',data.reference],['high-density',data.candidate]])for(const operation of['add-union','remove-subtract']){
  try{const result=operation==='add-union'?clipping.union(land,mask):clipping.difference(land,mask);landOperations.push({name,operation,status:'ok',polygons:result.length})}
  catch(error){landOperations.push({name,operation,status:'failed',error:error.message})}
}
for(const item of landOperations)assert.equal(item.status,'ok','A retained mask also fails a land operation; investigate before generalizing')
const report={status:'Known geometry failure reproduced, not repaired',variant:data.name,coordinatesUnchanged:true,operations,landOperations,scope:'Mask-versus-mask differences fail. Both masks independently pass the raw land union and subtract operations on the exact diagnostic rectangle. This is not proof that every production use of these masks is safe.'}
await fs.writeFile(new URL('failure-replay.json',import.meta.url),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
