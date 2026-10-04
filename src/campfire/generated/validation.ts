import { mapContractSchemaV1,mapContractSchemaV2,mapContractSchemaV3 } from './schema.js';
import type { CampfireMapContract,MapWorldPoint } from './types.js';
type Schema = { type?: string; const?: unknown; enum?: readonly unknown[]; properties?: Record<string, Schema>; required?: readonly string[]; additionalProperties?: boolean; items?: Schema; minItems?: number; maxItems?: number; minimum?: number; maximum?: number; exclusiveMinimum?: number; minLength?: number; maxLength?: number; pattern?: string };
export type MapContractValidation = { valid: true; value: CampfireMapContract } | { valid: false; errors: string[] };
// Only the vocabulary used by the canonical schema. Not an application-wide schema framework.
export function validateMapContractShape(value: unknown): string[] {
  const errors: string[] = [];
  function check(s: Schema, v: unknown, path: string): void {
    const fail = (reason: string) => { errors.push(`${path}: ${reason}`); };
    if ('const' in s && v !== s.const) return fail('unsupported value');
    if (s.enum && !s.enum.includes(v)) return fail('unsupported value');
    if (s.type === 'object') {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return fail('expected object');
      const o = v as Record<string, unknown>;
      for (const key of s.required ?? []) if (!(key in o)) fail(`missing ${key}`);
      for (const key of Object.keys(o)) {
        if (!s.properties || !Object.hasOwn(s.properties, key)) fail(`unexpected ${key}`);
        else check(s.properties[key], o[key], `${path}.${key}`);
      }
    } else if (s.type === 'array') {
      if (!Array.isArray(v)) return fail('expected array');
      if (s.minItems !== undefined && v.length < s.minItems) return fail('too few entries');
      if (s.maxItems !== undefined && v.length > s.maxItems) return fail('too many entries');
      if (s.items) v.forEach((item, i) => check(s.items!, item, `${path}[${i}]`));
    } else if (s.type === 'number' || s.type === 'integer') {
      if (typeof v !== 'number' || !Number.isFinite(v) || (s.type === 'integer' && !Number.isSafeInteger(v))) return fail('expected finite number');
      if ((s.minimum !== undefined && v < s.minimum) || (s.maximum !== undefined && v > s.maximum) || (s.exclusiveMinimum !== undefined && v <= s.exclusiveMinimum)) fail('out of range');
    } else if (s.type === 'string') {
      if (typeof v !== 'string') return fail('expected string');
      if ((s.minLength !== undefined && v.length < s.minLength) || (s.maxLength !== undefined && v.length > s.maxLength) || (s.pattern && !new RegExp(s.pattern).test(v))) fail('invalid text');
    } else if (s.type === 'boolean' && typeof v !== 'boolean') fail('expected boolean');
  }
  const version=(value as {version?:unknown}|null)?.version;
  check(version===3?mapContractSchemaV3:version===2?mapContractSchemaV2:mapContractSchemaV1, value, 'map');
  return errors;
}
export function validateMapContract(value: unknown): MapContractValidation {
  const errors = validateMapContractShape(value);
  if (errors.length) return { valid: false, errors };
  const map = value as CampfireMapContract;
  if (!map.name.trim()) errors.push('map.name: empty name');
  if (map.image.path.split('/').some(p => p === '..' || p === '.' || !p)) errors.push('map.image.path: unsafe relative path');
  const point = (p: { x: number; y: number }, path: string) => { if (p.x > map.dimensions.pixelWidth || p.y > map.dimensions.pixelHeight) errors.push(`${path}: out of bounds`); };
  for (const [kind, entries] of [['walls', map.walls], ['doors', map.doors], ['lights', map.lighting?.lights ?? []]] as const) {
    const seen = new Set<string>();
    for (const entry of entries) { if (seen.has(entry.id)) errors.push(`map.${kind}: duplicate id ${entry.id}`); seen.add(entry.id); }
  }
  for (const [kind, lines] of [['walls', map.walls], ['doors', map.doors.map(d => ({ id: d.id, ...d.geometry }))]] as const) for (const l of lines) {
    point(l.start, `${kind}.${l.id}.start`); point(l.end, `${kind}.${l.id}.end`);
    if (l.start.x === l.end.x && l.start.y === l.end.y) errors.push(`${kind}.${l.id}: zero length`);
  }
  for (const l of map.lighting?.lights ?? []) point(l.position, `lights.${l.id}.position`);
  if(map.version===2||map.version===3){const seen=new Set<string>();for(const w of map.windows??[]){
   if(seen.has(w.id))errors.push(`windows: duplicate id ${w.id}`);seen.add(w.id);
   const wall=map.walls.find(l=>l.id===w.wallId),a=w.geometry.start,b=w.geometry.end;
   point(a,`windows.${w.id}.start`);point(b,`windows.${w.id}.end`);
   if(Math.hypot(b.x-a.x,b.y-a.y)<1e-6)errors.push(`windows.${w.id}: zero length`);
   const on=(p:{x:number;y:number})=>{if(!wall)return false;const dx=wall.end.x-wall.start.x,dy=wall.end.y-wall.start.y,n=dx*dx+dy*dy,t=((p.x-wall.start.x)*dx+(p.y-wall.start.y)*dy)/n;return n>0&&t>=-1e-7&&t<=1+1e-7&&Math.abs((p.x-wall.start.x)*dy-(p.y-wall.start.y)*dx)/Math.sqrt(n)<1e-5;};
   if(!on(a)||!on(b))errors.push(`windows.${w.id}: geometry must lie on referenced wall`);
  }}
  if(map.version===3){const seen=new Set<string>();for(const r of map.ceilingRegions??[]){
   if(seen.has(r.id))errors.push(`ceilingRegions: duplicate id ${r.id}`);seen.add(r.id);
   r.points.forEach((p,i)=>point(p,`ceilingRegions.${r.id}.points[${i}]`));
   for(const reason of polygonErrors(r.points))errors.push(`ceilingRegions.${r.id}: ${reason}`);
  }}
  return errors.length ? { valid: false, errors } : { valid: true, value: map };
}

type Point=MapWorldPoint;
// Contract tolerances: world-pixel distance, and squared world-pixel area.
const epsilon=1e-7,areaEpsilon=1e-7;
function polygonErrors(points:Point[]):string[]{
 const n=points.length,errors:string[]=[];
 const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const same=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)<=epsilon;
 const on=(a:Point,b:Point,p:Point)=>Math.abs(cross(a,b,p))<=epsilon*Math.max(1,Math.hypot(b.x-a.x,b.y-a.y))&&p.x>=Math.min(a.x,b.x)-epsilon&&p.x<=Math.max(a.x,b.x)+epsilon&&p.y>=Math.min(a.y,b.y)-epsilon&&p.y<=Math.max(a.y,b.y)+epsilon;
 let twiceArea=0;
 for(let i=0;i<n;i++){
  const a=points[i]!,b=points[(i+1)%n]!,c=points[(i+2)%n]!;
  twiceArea+=a.x*b.y-b.x*a.y;
  if(same(a,b))errors.push(i===n-1?'repeated closing point':'duplicate consecutive vertices');
  if(!same(a,b)&&!same(b,c)&&(on(a,b,c)||on(b,c,a)))errors.push('adjacent edges overlap');
 }
 if(Math.abs(twiceArea)/2<=areaEpsilon)errors.push('zero-area polygon');
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  if(j===i+1||(i===0&&j===n-1))continue;
  const a=points[i]!,b=points[(i+1)%n]!,c=points[j]!,d=points[(j+1)%n]!;
  if(on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b)||(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)){
   errors.push('self-intersection or non-adjacent edge touch');return errors;
  }
 }
 return errors;
}
