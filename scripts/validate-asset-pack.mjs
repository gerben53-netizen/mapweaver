import { mkdtemp, mkdir, readFile, realpath, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const repository = fileURLToPath(new URL('../', import.meta.url))
async function removeBundle(directory, parent) {
  if (path.dirname(directory) !== parent || !path.basename(directory).startsWith('mapweaver-validator-')) throw Error('Unsafe validator cleanup path.')
  await rm(directory, { recursive: true, force: true })
}
let temporary, parent
try {
  if (process.argv.length !== 3) throw Error('Usage: npm run validate-asset-pack -- path/to/pack.zip')
  const input = path.resolve(process.argv[2])
  const info = await stat(input)
  if (!info.isFile()) throw Error('Choose one ZIP file.')
  if (info.size > 128 * 1024 * 1024) throw Error('Pack exceeds 128 MiB.')
  // Bundle TypeScript with the existing Vite dependency; native dependencies resolve locally.
  const cache = path.join(repository, 'node_modules', '.cache')
  await mkdir(cache, { recursive: true })
  parent = await realpath(cache)
  temporary = await mkdtemp(path.join(parent, 'mapweaver-validator-'))
  await build({ configFile: false, root: repository, publicDir: false, logLevel: 'error', build: {
    ssr: path.join(repository, 'service', 'assetPackValidation.ts'), outDir: temporary,
    emptyOutDir: false, target: 'node22', rolldownOptions: { output: { entryFileNames: 'validator.mjs' } },
  } })
  const { validateAssetPack } = await import(pathToFileURL(path.join(temporary, 'validator.mjs')).href)
  const result = await validateAssetPack(await readFile(input))
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.valid ? 0 : 1
} catch (error) {
  console.error(JSON.stringify({ valid: false, errors: [error.message] }, null, 2))
  process.exitCode = 1
} finally {
  if (temporary) {
    await removeBundle(temporary, parent)
  }
}
