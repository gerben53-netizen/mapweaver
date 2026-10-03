/** Optional format-12 visual configuration. Absent means exact legacy rendering. */
export interface GeographyFinish {
  version: 1
  relief: { enabled: boolean; strength: number; light: number; softness: number; contrast: number }
  transitions: 'off' | 'natural' | 'wash'
  coast: 'off' | 'natural' | 'ink'
  ocean: 'off' | 'shelf' | 'deep'
}
export const finishPreset = (id = 'world.painterlyFantasy'): GeographyFinish => {
  const minimal = id === 'world.minimalPolitical', wash = id === 'world.classicParchment'
  return { version: 1, relief: { enabled: !minimal, strength: minimal ? 0 : wash ? .22 : id === 'world.darkFantasy' ? .65 : .45, light: 315, softness: .45, contrast: 1 }, transitions: minimal ? 'off' : wash ? 'wash' : 'natural', coast: minimal ? 'off' : wash ? 'ink' : 'natural', ocean: minimal ? 'off' : wash ? 'shelf' : 'deep' }
}
export function validateGeographyFinish(value: unknown): GeographyFinish {
  const v = value as GeographyFinish
  const keys = (x: unknown, allowed: string[]) => !!x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).every(k => allowed.includes(k))
  if (!keys(v, ['version','relief','transitions','coast','ocean']) || v.version !== 1 || !keys(v.relief, ['enabled','strength','light','softness','contrast']) || typeof v.relief.enabled !== 'boolean' || !['off','natural','wash'].includes(v.transitions) || !['off','natural','ink'].includes(v.coast) || !['off','shelf','deep'].includes(v.ocean)) throw Error('Invalid geography finish settings.')
  for (const [n, min, max] of [[v.relief.strength,0,1],[v.relief.light,0,360],[v.relief.softness,0,1],[v.relief.contrast,.25,2]]) if (!Number.isFinite(n) || n < min || n > max) throw Error('Geography finish value outside supported range.')
  return structuredClone(v)
}
/** Smooth, map-anchored noise; never viewport or frame dependent. */
export function finishNoise(x: number, y: number) {
  const hash = (a: number, b: number) => { let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967295 }
  const ix = Math.floor(x), iy = Math.floor(y), sx = x - ix, sy = y - iy, u = sx*sx*(3-2*sx), v = sy*sy*(3-2*sy)
  return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v
}
/** Chamfer distance in samples, retaining the nearest source for coast semantics. */
export function distanceField(source: ArrayLike<number>, width: number, height: number) {
  const distance = new Float32Array(source.length), nearest = new Int32Array(source.length)
  for (let i=0;i<source.length;i++) { distance[i] = source[i] ? 0 : width+height; nearest[i] = source[i] ? i : -1 }
  const update = (i: number, j: number, step: number) => { if (distance[j]+step < distance[i]) { distance[i]=distance[j]+step; nearest[i]=nearest[j] } }
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) { const i=y*width+x; if(x)update(i,i-1,1);if(y)update(i,i-width,1);if(x&&y)update(i,i-width-1,Math.SQRT2);if(y&&x+1<width)update(i,i-width+1,Math.SQRT2) }
  for (let y=height-1;y>=0;y--) for (let x=width-1;x>=0;x--) { const i=y*width+x;if(x+1<width)update(i,i+1,1);if(y+1<height)update(i,i+width,1);if(x+1<width&&y+1<height)update(i,i+width+1,Math.SQRT2);if(x&&y+1<height)update(i,i+width-1,Math.SQRT2) }
  return {distance,nearest}
}
export function transitionPair(style: string, under = 'grassland') {
  if(style==='snow' && ['rocky','land','grassland'].includes(under))return {width:1.35,patch:.8,scale:11}
  if(style==='forest')return {width:1.1,patch:.7,scale:7}
  if(style==='desert')return {width:1.6,patch:.65,scale:14}
  if(style==='swamp')return {width:1.4,patch:.85,scale:6}
  return {width:1,patch:.45,scale:10}
}
export function transitionAlpha(distance: number, width: number, x: number, y: number, style: string, under?: string) {
  const p=transitionPair(style,under), n=finishNoise(x/p.scale,y/p.scale)*.7+finishNoise(x/(p.scale*.37),y/(p.scale*.37))*.3
  const t=Math.max(0,Math.min(1,distance / Math.max(.01,width*p.width) + (n-.5)*p.patch))
  return t*t*(3-2*t)
}
export function coastDepth(distance: number, x: number, y: number, high: number, scale: number) {
  const variation=.72+finishNoise(x/31,y/31)*.56, shelf=Math.max(1,scale*variation*(1-.65*high))
  return { shore: Math.exp(-distance/(shelf*.06)), near:Math.exp(-distance/(shelf*.24)), shallow:Math.exp(-distance/shelf), offshore:Math.exp(-distance/(shelf*3.5)) }
}
export function reliefLight(dx: number, dy: number, direction: number, strength: number, contrast: number) {
  const a=direction*Math.PI/180, light=-dx*Math.sin(a)+dy*Math.cos(a)
  return Math.max(-.65,Math.min(.65,light*strength*contrast))
}
