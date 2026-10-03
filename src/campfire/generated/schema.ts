// Canonical source: types are inferred from this schema; build emits the JSON Schema.
const coordinate = { type: 'number', minimum: 0 } as const;
const id = { type: 'string', minLength: 1, maxLength: 128, pattern: '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' } as const;
const point = { type: 'object', additionalProperties: false, required: ['x', 'y'], properties: { x: coordinate, y: coordinate } } as const;
const intensity = { type: 'number', minimum: 0, maximum: 1 } as const;
const line = { type: 'object', additionalProperties: false, required: ['start', 'end'], properties: { start: point, end: point } } as const;
export const mapContractSchemaV1 = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://campfire.local/schemas/campfire-map-contract-v1.schema.json',
  title: 'CAMPFIRE_MAPWEAVER v1',
  description: 'The Map Contract describes the world; Campfire/PixiJS determines how that world is rendered. No renderer or runtime state.',
  type: 'object', additionalProperties: false,
  required: ['format', 'version', 'mapId', 'revision', 'name', 'dimensions', 'grid', 'image', 'walls', 'doors'],
  properties: {
    format: { const: 'CAMPFIRE_MAPWEAVER' }, version: { const: 1 }, mapId: id,
    revision: { type: 'integer', minimum: 1, maximum: 9007199254740991 },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    dimensions: { type: 'object', additionalProperties: false, required: ['pixelWidth', 'pixelHeight'], properties: {
      pixelWidth: { type: 'integer', minimum: 1, maximum: 8192 }, pixelHeight: { type: 'integer', minimum: 1, maximum: 8192 }
    } },
    grid: { type: 'object', additionalProperties: false, required: ['type', 'sizePx', 'feetPerCell'], properties: {
      type: { enum: ['SQUARE', 'NONE'] }, sizePx: { type: 'number', exclusiveMinimum: 0, maximum: 1024 }, feetPerCell: { type: 'number', exclusiveMinimum: 0, maximum: 1000 }
    } },
    image: { type: 'object', additionalProperties: false, required: ['path', 'mimeType'], properties: {
      path: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[A-Za-z0-9][A-Za-z0-9_./-]*\\.(png|jpg|jpeg|webp)$' },
      mimeType: { enum: ['image/png', 'image/jpeg', 'image/webp'] }
    } },
    walls: { type: 'array', maxItems: 80, items: { type: 'object', additionalProperties: false, required: ['id', 'start', 'end', 'blocksVision'], properties: {
      id, start: point, end: point, blocksVision: { type: 'boolean' }
    } } },
    doors: { type: 'array', maxItems: 20, items: { type: 'object', additionalProperties: false, required: ['id', 'geometry', 'blocksVisionWhenClosed'], properties: {
      id, geometry: line, blocksVisionWhenClosed: { type: 'boolean' }, label: { type: 'string', maxLength: 120 }
    } } },
    lighting: { type: 'object', additionalProperties: false, required: ['ambient', 'lights'], properties: {
      ambient: { type: 'object', additionalProperties: false, required: ['intensity'], properties: { intensity } },
      lights: { type: 'array', maxItems: 32, items: { type: 'object', additionalProperties: false,
        required: ['id', 'type', 'position', 'radiusFt', 'intensity', 'color', 'affectsVision', 'enabled'], properties: {
          id, type: { const: 'point' }, position: point, radiusFt: { type: 'number', exclusiveMinimum: 0, maximum: 500 }, intensity,
          color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }, affectsVision: { type: 'boolean' }, enabled: { type: 'boolean' }
        }
      } }
    } }
  }
} as const;

// v1 stays immutable. v2 adds permanent apertures, never runtime environment state.
export const mapContractSchemaV2={...mapContractSchemaV1,
 $id:'https://campfire.local/schemas/campfire-map-contract-v2.schema.json',title:'CAMPFIRE_MAPWEAVER v2',
 properties:{...mapContractSchemaV1.properties,version:{const:2},windows:{type:'array',maxItems:16,items:{type:'object',additionalProperties:false,
 required:['id','geometry','wallId','transmitsExteriorLight'],properties:{id,geometry:line,wallId:id,transmitsExteriorLight:{type:'boolean'},exteriorLightTransmission:intensity}}}}
} as const;
