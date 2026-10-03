import type { mapContractSchemaV1,mapContractSchemaV2 } from './schema.js';
// Infer this package's small JSON Schema vocabulary, avoiding a second contract definition.
type Infer<S> = S extends { const: infer C } ? C : S extends { enum: readonly (infer E)[] } ? E
  : S extends { type: 'string' } ? string : S extends { type: 'number' | 'integer' } ? number
  : S extends { type: 'boolean' } ? boolean : S extends { type: 'array'; items: infer I } ? Infer<I>[]
  : S extends { type: 'object'; properties: infer P; required: readonly (infer R)[] }
    ? { [K in keyof P as K extends R ? K : never]: Infer<P[K]> } & { [K in keyof P as K extends R ? never : K]?: Infer<P[K]> }
    : never;
export type CampfireMapContractV1 = Infer<typeof mapContractSchemaV1>;
export type MapDimensionsV1 = CampfireMapContractV1['dimensions'];
export type MapGridV1 = CampfireMapContractV1['grid'];
export type MapImageV1 = CampfireMapContractV1['image'];
export type MapWallV1 = CampfireMapContractV1['walls'][number];
export type MapDoorV1 = CampfireMapContractV1['doors'][number];
export type MapLightingV1 = NonNullable<CampfireMapContractV1['lighting']>;
export type MapPointLightV1 = MapLightingV1['lights'][number];

export type CampfireMapContractV2 = Infer<typeof mapContractSchemaV2>;
export type CampfireMapContract = CampfireMapContractV1 | CampfireMapContractV2;
export type MapWindowV2 = NonNullable<CampfireMapContractV2['windows']>[number];
