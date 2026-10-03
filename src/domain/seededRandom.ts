export function seededRandom(seed: number, index: number, channel: number) {
  let n = (seed ^ Math.imul(index+1, 0x9e3779b9) ^ Math.imul(channel+1,0x85ebca6b)) >>> 0
  n = Math.imul(n ^ n >>> 16, 0x21f0aaad); n = Math.imul(n ^ n >>> 15, 0x735a2d97)
  return ((n ^ n >>> 15) >>> 0) / 4294967296
}
