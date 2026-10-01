import { mapContractSchemaV1 } from './schema.js';
import type { CampfireMapContractV1 } from './types.js';
type Schema = { type?: string; const?: unknown; enum?: readonly unknown[]; properties?: Record<string, Schema>; required?: readonly string[]; additionalProperties?: boolean; items?: Schema; maxItems?: number; minimum?: number; maximum?: number; exclusiveMinimum?: number; minLength?: number; maxLength?: number; pattern?: string };
export type MapContractValidation = { valid: true; value: CampfireMapContractV1 } | { valid: false; errors: string[] };
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
  check(mapContractSchemaV1, value, 'map');
  return errors;
}
export function validateMapContract(value: unknown): MapContractValidation {
  const errors = validateMapContractShape(value);
  if (errors.length) return { valid: false, errors };
  const map = value as CampfireMapContractV1;
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
  return errors.length ? { valid: false, errors } : { valid: true, value: map };
}
