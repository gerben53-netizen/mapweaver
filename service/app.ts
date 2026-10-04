import { registerCampfirePublishing } from './campfirePublishing'
import { ACTIVE_ASSET_SQL } from '../src/domain/assetQuality'
import packageMetadata from '../package.json'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { initializeDefaultContent } from './defaultContent'
import { readStampPalettes, writeStampPalettes } from './stampPalettes'
import { queryGeneratorAssets, generatorAssetReadiness } from './generatorAssets'
import { removalPreview, undoRemovalIds, libraryRevision } from './library'
import { campaigns, campaign, createCampaign, campaignCommand, preferences, rememberCampaign, mapLocation, restoreMapNode } from './campaigns'
import type { CampaignCommand, MapLocation } from './campaigns'
import type { CampaignPreferences } from '../src/campaigns/model'
import { startupProject, clearStartupProject, rememberStartupProject } from './startupProject'
import { validatePrefab } from '../src/domain/prefabs'
import { prepareWallSet, importWallSet, listWallSets, wallSetConflict } from './wallSets'
import { Lifecycle } from './lifecycle'
import { lifecycleLog } from './lifecycleLog'
import Fastify from 'fastify'
import staticFiles from '@fastify/static'
import { randomUUID, createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { Storage, SCHEMA_VERSION, assetFromRow, StorageError, safeId, label } from './storage'
import { Jobs, registerJobs } from './jobs'
import { generation, diskUsage } from './safety'
import type { AssetRow } from './storage'
import { canOpenDataFolder,openDataFolder } from './platform'
import { libraryCommand, libraryQuery, putCategory, usage } from './library'
import type { LibraryQuery } from './library'
import { previewPack, commitPack, exportLibrary, recoverLibraryImports } from './libraryPacks'

export async function createApp(options: { defaultContent?: { manifest: string; contentRoot: string }; directory?: string; port?: number; frontend?: string; developmentOrigin?: string; failWrite?: () => void; openFolder?: (directory:string)=>Promise<void>; shutdown?: () => void; instanceId?: string; supervisorId?: string; controlToken?: string } = {}) {
  if (options.developmentOrigin) {
    const dev = new URL(options.developmentOrigin)
    if (dev.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(dev.hostname) || dev.origin !== options.developmentOrigin) throw new StorageError('INVALID_DEV_ORIGIN','Development origin must be an exact local HTTP origin.')
  }
  const existingDatabase = options.directory ? existsSync(path.join(options.directory, 'mapweaver.sqlite3')) : true
  let store = new Storage(options.directory, options.failWrite)
  recoverLibraryImports(store)
  if (options.frontend) await initializeDefaultContent(store, options.frontend, existingDatabase, options.defaultContent)
  const app = Fastify({ logger: false, bodyLimit: 4 * 1024 * 1024 })
  const lifecycle = new Lifecycle(), log = lifecycleLog(store.root)
  const instanceId = options.instanceId || randomUUID()
  let activeRequests = 0, closeScheduled = false
  const tracked = new Map<string, string>()
  const origin = `http://127.0.0.1:${options.port || 47831}`
  let queue = Promise.resolve(), pendingWrites=0
  const serialized = <T>(operation: () => Promise<T> | T) => { pendingWrites++; const next = queue.then(operation); queue = next.then(() => {pendingWrites--}, () => {pendingWrites--}); return next }
  let datasetId=generation(store)
  const jobs = new Jobs(() => store, next => { store = next; datasetId=generation(next) }, serialized)
  const work = () => [...[...jobs.jobs.values()].filter(j => j.state === 'running' || j.state === 'ready').map(j => ({ kind: j.kind, cancellable: !j.progress.phase.startsWith('Replacing') })), ...[...tracked.values()].filter(Boolean).map(kind => ({ kind, cancellable: false })), ...[...lifecycle.busyClients].map(() => ({ kind: 'browser import / export / storage task', cancellable: false }))]
  log.event('service-started')
  const mutation = <T>(request: { headers: Record<string, unknown> }, operation: () => T | Promise<T>) => serialized(() => {
    if (jobs.maintenance || request.headers['x-mapweaver-generation'] !== generation(store)) throw new StorageError('DATASET_CHANGED','Storage changed. Keep unsaved work and reload explicitly.',409)
    return operation()
  })
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff').header('Cache-Control', 'no-store')
    if (request.headers.host !== new URL(origin).host || (request.headers.origin && ![origin, options.developmentOrigin].includes(request.headers.origin)) || request.headers['sec-fetch-site'] === 'cross-site') throw new StorageError('FORBIDDEN_ORIGIN', 'Only the local Mapweaver application may access this service.', 403)
    if (!['GET','HEAD'].includes(request.method) && request.headers['x-mapweaver'] !== '1') throw new StorageError('FORBIDDEN_REQUEST', 'A Mapweaver request header is required.', 403)
    if (request.url.startsWith('/api/v1/campfire/') && !['GET','HEAD'].includes(request.method) && (jobs.maintenance || request.headers['x-mapweaver-generation'] !== generation(store))) throw new StorageError('DATASET_CHANGED','Storage changed. Reload before publishing.',409)
    const control = request.url.split('?')[0].startsWith('/api/v1/lifecycle')
    if (request.url.split('?')[0].startsWith('/api/') && request.url.split('?')[0] !== '/api/v1/health' && options.instanceId && (!['GET','HEAD'].includes(request.method) || request.headers['x-mapweaver-instance']) && request.headers['x-mapweaver-instance'] !== instanceId) throw new StorageError('INSTANCE_CHANGED', 'Mapweaver restarted. Export unsaved work and reload explicitly.', 409)
    if (control) return
    if (lifecycle.phase !== 'running' && request.url.split('?')[0].startsWith('/api/') && request.url.split('?')[0] !== '/api/v1/health') {
      const flush = ((request.method === 'PUT' && /^\/api\/v1\/projects\/[a-zA-Z0-9_-]+$/.test(request.url.split('?')[0])) || (request.method === 'POST' && request.url.split('?')[0] === '/api/v1/library/command')) && lifecycle.canFlush(String(request.headers['x-mapweaver-client'] || ''))
      const cancel = /^\/api\/v1\/operations\/[^/]+\/cancel$/.test(request.url.split('?')[0])
      const read = lifecycle.phase !== 'closing' && ['GET','HEAD'].includes(request.method) && !request.url.split('?')[0].endsWith('/export') && !request.url.split('?')[0].endsWith('/download')
      if (!flush && !cancel && !read && request.url.split('?')[0] !== '/api/v1/stop') throw new StorageError('STOPPING', 'Mapweaver is stopping. Keep this tab open.', 409)
    }
    const operation = /^\/api\/v1\/(health|operations|stop)(\/|$)/.test(request.url.split('?')[0])
    if (request.url.split('?')[0].startsWith('/api/') && !operation) {
      if (jobs.maintenance) throw new StorageError('MAINTENANCE', 'Storage maintenance is active. Keep unsaved work open and wait.', 503)
      if ((!['GET','HEAD'].includes(request.method) || request.headers['x-mapweaver-generation']) && request.headers['x-mapweaver-generation'] !== generation(store)) throw new StorageError('DATASET_CHANGED', 'Local data changed or the client is outdated. Export unsaved work, then reload.', 409)
    }

  })
  app.addHook('onRequest', async request => {
    if (request.url.split('?')[0].startsWith('/api/') && !/^\/api\/v1\/(health|lifecycle|stop)(\/|$)/.test(request.url.split('?')[0])) { tracked.set(request.id, /import|restores/.test(request.url.split('?')[0]) ? 'import' : /export|download/.test(request.url.split('?')[0]) ? 'export / download' : request.method === 'PUT' ? 'save' : ''); activeRequests++ }
  })
  app.addHook('onResponse', async request => { if (tracked.delete(request.id)) activeRequests-- })
  app.addHook('onRequestAbort', async request => { if (tracked.delete(request.id)) activeRequests-- })
  app.addHook('onError', async request => { if (tracked.delete(request.id)) activeRequests-- })
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof StorageError) return reply.status(error.status).send({ code: error.code, message: error.message })
    const code = (error as { code?: string }).code || ''
    const message = code.includes('BUSY') || code.includes('LOCKED') ? 'Storage is busy. Retry saving; your edits are still open.' : code === 'ENOSPC' ? 'Disk is full. Free space and retry.' : 'The operation could not be completed. Check the input and local storage; existing data was kept.'
    return reply.status(code.startsWith('FST_ERR') ? 400 : 500).send({ code: code.startsWith('FST_ERR') ? 'INVALID_REQUEST' : 'STORAGE_ERROR', message })
  })
  app.addContentTypeParser(['image/png','image/jpeg','image/webp','application/zip','application/octet-stream'], { parseAs: 'buffer', bodyLimit: 128 * 1024 * 1024 }, (_request, body, done) => done(null, body))
  const params = (request: { params: unknown }) => request.params as { id: string }
  registerJobs(app, jobs)
  registerCampfirePublishing(app, () => store)
  app.get('/api/v1/health', () => { if(!store.db.open&&!jobs.maintenance&&lifecycle.phase!=='closing')throw new StorageError('RECOVERY_REQUIRED','Storage needs manual recovery. Retained datasets were kept.',503); return ({ application: 'Mapweaver', dataKey: createHash('sha256').update(process.platform==='win32'?store.root.toLowerCase():store.root).digest('hex'), version: packageMetadata.version, generation: datasetId, instanceId, pid: process.pid, supervisorId: options.supervisorId || null, lifecycle: lifecycle.view(work()), maintenance: jobs.maintenance, schemaVersion: SCHEMA_VERSION, runtime: { profile: process.env.MAPWEAVER_RUNTIME_PROFILE || 'release', dataProfile: process.env.MAPWEAVER_DATA_PROFILE || 'Release', build: process.env.MAPWEAVER_BUILD_ID || null } }) })
  const requestStop = () => { if (!options.shutdown) throw new StorageError('UNAVAILABLE', 'Stop is unavailable in this environment.'); lifecycle.request(); if (options.supervisorId && work().length) lifecycle.hold = true; log.event('stop-requested'); if(work().length) log.event('active-work'); return lifecycle.view(work()) }
  const releaseTabs = (confirmed: unknown, keep?: string) => {
    if (confirmed !== true || lifecycle.phase !== 'error' || activeRequests || pendingWrites || [...jobs.jobs.values()].some(j => j.state === 'running' || j.state === 'ready')) throw new StorageError('UNSAFE_RELEASE', 'Wait for storage work to finish. Browser waits can be released only after a stop timeout and explicit confirmation.', 409)
    lifecycle.clients.clear(); lifecycle.busyClients.clear()
    if (keep) lifecycle.clients.set(keep, '')
    lifecycle.cancel(); log.event('browser-waits-released'); return requestStop()
  }
  app.post('/api/v1/stop', request => { if (!lifecycle.clients.has(String(request.headers['x-mapweaver-client'] || ''))) throw new StorageError('SESSION_REQUIRED', 'Open a current Mapweaver browser session first.', 403); return requestStop() })
  app.post('/api/v1/lifecycle/client', request => {
    const body = request.body as { id: string; ticket?: string; leave?: boolean; busy?: boolean; decision?: 'wait' | 'keep' | 'release-tabs'; confirmed?: boolean }
    lifecycle.register(body?.id)
    if (body.decision === 'release-tabs') return releaseTabs(body.confirmed, body.id)
    if (body.decision === 'wait') lifecycle.hold = false
    else if (body.decision === 'keep') lifecycle.cancel()
    if (body.busy) lifecycle.busyClients.add(body.id); else lifecycle.busyClients.delete(body.id)
    if (body.leave) { lifecycle.clients.delete(body.id); lifecycle.busyClients.delete(body.id) }
    else if (body.ticket) lifecycle.ack(body.id, body.ticket)
    return lifecycle.view(work())
  })
  app.post('/api/v1/lifecycle/control', request => {
    if (!options.controlToken || request.headers['x-mapweaver-control'] !== options.controlToken) throw new StorageError('CONTROL_DENIED', 'Supervisor authentication required.', 403)
    const body = request.body as { action: string; event?: string; confirmed?: boolean }
    if (body?.action === 'release-tabs') return releaseTabs(body.confirmed)
    if (body?.action === 'stop') return requestStop()
    if (body?.action === 'proceed') lifecycle.hold = false
    else if (body?.action === 'keep') { lifecycle.cancel(); log.event('keep-running') }
    else if (body?.action === 'cancel-work') { for (const j of jobs.jobs.values()) if (j.state === 'running' || j.state === 'ready') jobs.cancel(j.id) }
    else if (body?.action === 'event' && body.event) log.event(body.event)
    else throw new StorageError('INVALID_CONTROL', 'Unknown supervisor command.')
    return lifecycle.view(work())
  })
  app.get('/api/v1/scatter-presets',()=>{const row=store.db.prepare("SELECT value FROM settings WHERE key='scatterRecentSets'").get() as {value:string}|undefined;return row?JSON.parse(row.value):[]})
  app.post('/api/v1/scatter-presets',async request=>mutation(request,()=>{
    const sources=request.body as {assetId:string;weight:number}[]
    if(!Array.isArray(sources)||!sources.length||sources.length>16||new Set(sources.map(a=>a?.assetId)).size!==sources.length||sources.some(a=>!a||Object.keys(a).some(k=>!['assetId','weight'].includes(k))||typeof a.assetId!=='string'||!/^[\w-]{1,80}$/.test(a.assetId)||!Number.isFinite(a.weight)||a.weight<.01||a.weight>1000))throw new StorageError('INVALID_SCATTER_SET','Choose 1–16 unique stamps and positive weights.')
    for(const source of sources)if(store.asset(source.assetId).type!=='stamp')throw new StorageError('INVALID_SCATTER_SET','Only stamp assets can be used.')
    const row=store.db.prepare("SELECT value FROM settings WHERE key='scatterRecentSets'").get() as {value:string}|undefined,prior:unknown[]=row?JSON.parse(row.value):[],sets=[sources,...prior.filter(s=>JSON.stringify(s)!==JSON.stringify(sources))].slice(0,5)
    store.db.prepare("INSERT INTO settings VALUES('scatterRecentSets',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(sets));return sets
  }))
  app.get('/api/v1/storage', () => ({ location: store.root, canOpenDataFolder, usedBytes: store.usedBytes(), usage: diskUsage(store.root), schemaVersion: SCHEMA_VERSION, integrity: store.integrity(), lastBackup: store.db.prepare("SELECT value FROM settings WHERE key='lastBackup'").get() || null }))
  app.post('/api/v1/storage/open-folder',async()=>{await (options.openFolder || openDataFolder)(store.root);return {opened:true}})
  const location=(request:{query:unknown}):MapLocation|undefined=>{const q=request.query as {campaignId?:string;parentId?:string};return q.campaignId?{campaignId:safeId(q.campaignId),parentId:q.parentId?safeId(q.parentId):null}:undefined}
  app.get('/api/v1/campaigns',request=>campaigns(store,(request.query as {trash?:string}).trash==='true'))
  app.post('/api/v1/campaigns',request=>mutation(request,()=>createCampaign(store,(request.body as {name:string})?.name)))
  app.get('/api/v1/campaigns/:id',request=>campaign(store,params(request).id))
  app.post('/api/v1/campaigns/:id/opened',request=>mutation(request,()=>{rememberCampaign(store,params(request).id);return {opened:true}}))
  app.post('/api/v1/campaigns/:id/command',request=>mutation(request,()=>campaignCommand(store,params(request).id,request.body as CampaignCommand)))
  app.put('/api/v1/campaigns/:id/preferences',request=>mutation(request,()=>preferences(store,params(request).id,request.body as CampaignPreferences)))
  app.get('/api/v1/campaigns/:id/stamp-palettes',request=>readStampPalettes(store,params(request).id))
  app.put('/api/v1/campaigns/:id/stamp-palettes',request=>mutation(request,()=>writeStampPalettes(store,params(request).id,request.body)))
  app.get('/api/v1/startup-campaign',()=>({id:(store.db.prepare("SELECT value FROM settings WHERE key='lastCampaign'").get() as {value:string}|undefined)?.value||null}))
  app.get('/api/v1/startup-project',()=>({id:startupProject(store)}))
  app.post('/api/v1/startup-project',request=>mutation(request,()=>({claimed:clearStartupProject(store,(request.body as {id:string})?.id)})))
  app.post('/api/v1/projects/:id/opened',request=>mutation(request,()=>rememberStartupProject(store,params(request).id)))
  app.get('/api/v1/projects', request => store.db.prepare(`SELECT id,name,revision,createdAt,modifiedAt,openedAt,deletedAt FROM projects WHERE deletedAt IS ${((request.query as {trash?:string}).trash === 'true') ? 'NOT NULL' : 'NULL'} ORDER BY modifiedAt DESC`).all())
  app.post('/api/v1/projects', request => mutation(request, () => {
    const value = request.body as Record<string, unknown>
    return store.writeProject({ ...value, id: randomUUID() },undefined,location(request))
  }))
  app.get('/api/v1/projects/:id', request => { const row = store.project(params(request).id); if(row.deletedAt)throw new StorageError('PROJECT_TRASHED','Restore this project from Trash before opening.',409); store.validateDocument(row.document); return row })
  app.put('/api/v1/projects/:id', request => mutation(request, () => {
    const body = request.body as { document: unknown; revision: number }
    if (!Number.isSafeInteger(body?.revision) || body.revision < 1) throw new StorageError('INVALID_REVISION', 'A positive revision is required.')
    return store.writeProject({ ...(body.document as object), id: safeId(params(request).id) }, body.revision)
  }))
  app.patch('/api/v1/projects/:id', request => mutation(request, () => {
    const body = request.body as { name: string; revision: number }, row = store.project(params(request).id)
    return store.writeProject({ ...row.document, name: label(body.name) }, body.revision)
  }))
  app.post('/api/v1/projects/:id/duplicate', request => mutation(request, () => { const d = store.project(params(request).id).document; return store.writeProject({ ...d, id: randomUUID(), name: `${d.name.slice(0,110)} copy`, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString() },undefined,mapLocation(store,params(request).id)) }))
  app.delete('/api/v1/projects/:id', request => mutation(request, () => {
    const row = store.project(params(request).id), body = request.body as { revision: number; permanent?: boolean }
    if (body?.revision !== row.revision) throw new StorageError('REVISION_CONFLICT','Project changed. Refresh before deleting.',409)
    if (body.permanent) {
      const result = store.db.prepare('DELETE FROM projects WHERE id=? AND revision=? AND deletedAt IS NOT NULL').run(row.id,body.revision)
      if (!result.changes) throw new StorageError('NOT_TRASHED','Move the project to Trash first.',409)
    } else {
      const loc=mapLocation(store,row.id)
      if(!loc)throw new StorageError('INVALID_REFERENCE','Map has no campaign entry.')
      const snapshot=campaign(store,loc.campaignId)
      campaignCommand(store,loc.campaignId,{op:'trash',id:snapshot.nodes.find(n=>n.mapId===row.id)!.id,revision:snapshot.campaign.revision})
    }
    clearStartupProject(store,row.id)
    return { deleted: true }
  }))
  app.post('/api/v1/projects/:id/restore', request => mutation(request, () => {
    const row = store.project(params(request).id), body = request.body as { revision: number }
    if (body?.revision !== row.revision) throw new StorageError('REVISION_CONFLICT','Project changed. Refresh first.',409)
    store.db.transaction(()=>{restoreMapNode(store,row.id);store.db.prepare('UPDATE projects SET deletedAt=NULL,revision=revision+1 WHERE id=? AND revision=?').run(row.id,body.revision)})()
    return store.project(row.id)
  }))
  app.get('/api/v1/projects/:id/export', async (request, reply) => reply.type('application/zip').header('Content-Disposition','attachment; filename="Mapweaver-project.mapweaver"').send(Buffer.from(await store.exportProject(params(request).id))))
  app.post('/api/v1/projects/import', { bodyLimit: 128 * 1024 * 1024 }, request => mutation(request, () => store.importProject(request.body as Buffer, request.headers['x-migration-key'] as string | undefined,location(request))))
  app.get('/api/v1/wall-sets', () => listWallSets(store))
  app.post('/api/v1/wall-sets/preview', { bodyLimit:32*1024*1024 }, async request => {
    const prepared=await prepareWallSet(request.body as Buffer)
    return { definition:prepared.definition, preview:`data:image/png;base64,${prepared.atlas.toString('base64')}`, conflict:wallSetConflict(store,prepared.definition) }
  })
  app.post('/api/v1/wall-sets/import', { bodyLimit:32*1024*1024 }, request => mutation(request, () => importWallSet(store,request.body as Buffer)))
  app.get('/api/v1/categories', () => store.db.prepare('SELECT * FROM categories ORDER BY normalizedName').all())
  app.get('/api/v1/library/generator-readiness',()=>generatorAssetReadiness(store))
  app.post('/api/v1/library/generator-query',request=>queryGeneratorAssets(store,request.body))
  app.get('/api/v1/library', request => libraryQuery(store, request.query as LibraryQuery, (request.query as { ids?: string }).ids === 'true'))
  app.post('/api/v1/library/command', request => mutation(request, () => { const body=request.body as Parameters<typeof libraryCommand>[1];if(lifecycle.phase!=='running'&&body.op!=='metadata')throw new StorageError('STOPPING','Only pending metadata saves can finish while stopping.',409);return libraryCommand(store,body) }))
  app.get('/api/v1/prefabs/:id', request => {
    const row=store.asset((request.params as {id:string}).id)
    if(row.type!=='prefab'||!row.prefab)throw Error('Prefab not found.')
    const prefab=validatePrefab(JSON.parse(row.prefab));store.validateDocument(prefab.document)
    return prefab
  })
  app.post('/api/v1/library/preview', { bodyLimit: 128 * 1024 * 1024 }, request => mutation(request, () => previewPack(store, request.body as Buffer, (request.query as { type?: string }).type,(request.query as {preference?:string}).preference)))
  app.post('/api/v1/library/review', request => mutation(request, () => commitPack(store, request.body as Parameters<typeof commitPack>[1],true)))
  app.post('/api/v1/library/commit', request => mutation(request, () => commitPack(store, request.body as Parameters<typeof commitPack>[1])))
  app.post('/api/v1/library/undo-removal-preview', request => ({ids:undoRemovalIds(store,(request.body as {token:string}).token)}))
  app.post('/api/v1/library/removal-preview',request=>removalPreview(store,(request.body as {ids:unknown}).ids))
  app.post('/api/v1/library/usage', request => usage(store, (request.body as { ids: string[] }).ids))
  app.post('/api/v1/library/export', (request, reply) => { const b = request.body as { ids: string[]; category?: string; metadataOnly?: boolean; collectionId?: string }; return reply.type(b.metadataOnly ? 'application/json' : 'application/zip').send(exportLibrary(store, b.ids, b.category, b.metadataOnly,b.collectionId)) })
  app.post('/api/v1/categories', request => mutation(request, () => {
    const name = label((request.body as {name:string}).name,80), normalized = name.toLocaleLowerCase('en-US')
    const old = store.db.prepare('SELECT * FROM categories WHERE parentId IS NULL AND (normalizedName=? OR normalizedName=?)').get(normalized,'/'+normalized)
    if (old) return old
    return putCategory(store, { name })
  }))
  app.get('/api/v1/assets', request => {
    const q = request.query as {type?:string;search?:string;category?:string;offset?:string;limit?:string}
    const offset = Number(q.offset || 0), limit = Number(q.limit || 100)
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 500) throw new StorageError('INVALID_PAGE','Invalid page size.')
    return (store.db.prepare(`SELECT * FROM assets WHERE deletedAt IS NULL AND ${ACTIVE_ASSET_SQL} AND (? IS NULL OR type=?) AND (? IS NULL OR categoryId=?) AND name LIKE ? ORDER BY createdAt,id LIMIT ? OFFSET ?`).all(q.type || null,q.type || null,q.category || null,q.category || null,`%${(q.search || '').slice(0,120)}%`,limit,offset) as AssetRow[]).map(assetFromRow)
  })
  app.get('/api/v1/assets/:id', request => store.asset(params(request).id))
  app.post('/api/v1/assets', { bodyLimit: 20 * 1024 * 1024 }, request => mutation(request, () => {
    const q = request.query as { type: string; name: string; filename: string; category?: string }
    return store.importAsset(new File([new Uint8Array(request.body as Buffer)],q.filename,{type:request.headers['content-type']}),q.type,q.name,q.category)
  }))
  for (const preview of [false,true]) app.get(`/api/v1/assets/:id/${preview ? 'preview' : 'content'}`, (request, reply) => {
    const a = store.asset(params(request).id)
    return reply.type(preview ? 'image/png' : a.mimeType).header('Cache-Control','private, max-age=3600').header('ETag', `"${a.sha256}${preview ? '-preview' : ''}"`).send(store.bytes(a,preview))
  })
  app.get('/api/v1/assets/:id/usage', request => store.db.prepare('SELECT DISTINCT p.name FROM project_assets a JOIN projects p ON p.id=a.projectId WHERE a.assetId=?').all(safeId(params(request).id)))
  app.patch('/api/v1/assets/:id', request => mutation(request, () => {
    const a = store.asset(params(request).id), body = request.body as { name:string;categoryId:string;tags?:unknown }
    const tags = body.tags === undefined ? JSON.parse(a.tags) : body.tags
    if (!Array.isArray(tags) || tags.length > 30) throw new StorageError('INVALID_TAGS','At most 30 tags are allowed.')
    const normalized = tags.map(t => label(t,80))
    if (!store.db.prepare('SELECT 1 FROM categories WHERE id=?').get(safeId(body.categoryId))) throw new StorageError('INVALID_CATEGORY','Category not found.')
    store.db.prepare('UPDATE assets SET name=?,categoryId=?,tags=?,modifiedAt=? WHERE id=?').run(label(body.name),body.categoryId,JSON.stringify(normalized),new Date().toISOString(),a.id)
    return store.asset(a.id)
  }))
  app.delete('/api/v1/assets/:id', request => mutation(request, () => {
    const a = store.asset(params(request).id), used = usage(store,[a.id])
    if (store.db.prepare('SELECT 1 FROM wall_sets WHERE assetId=?').get(a.id)) throw new StorageError('ASSET_IN_USE','This atlas belongs to an immutable wall set. Keep it for existing and future walls.',409)
    if (used.length) throw new StorageError('ASSET_IN_USE', `Used by ${used.length} project(s): ${used.map(p => p.name).join(', ')}.`,409)
    libraryCommand(store,{revision:libraryRevision(store),op:'delete',ids:[a.id]})
    // Conservatively retain unreferenced source files for recovery; integrity reports them.
    return { deleted:true }
  }))
  // Compatibility endpoint streams the validated on-disk archive; new UI uses progress jobs.
  app.post('/api/v1/backup', async (_request, reply) => {
    const started = jobs.backup(), job = jobs.job(started.id)
    while (job.state === 'running') await new Promise(resolve => setTimeout(resolve, 20))
    if (job.state !== 'complete' || !job.file) throw new StorageError('BACKUP_INCOMPLETE', job.error || 'Backup failed.',409)
    return reply.type('application/zip').send(createReadStream(job.file))
  })
  if (options.frontend) { await app.register(staticFiles,{root:options.frontend}); app.setNotFoundHandler((request,reply) => request.url.split('?')[0].startsWith('/api/') ? reply.status(404).send({code:'NOT_FOUND',message:'Route not found.'}) : reply.sendFile('index.html')) }
  const lifecycleTimer = options.shutdown ? setInterval(() => {
    const before = lifecycle.phase
    lifecycle.advance(work(), activeRequests + pendingWrites)
    if (lifecycle.phase === 'error' && before !== 'error') log.event('shutdown-timeout')
    if (lifecycle.phase === 'closing' && !closeScheduled) {
      closeScheduled = true; log.event('drain-complete')
      // Let the final acknowledgement reach its browser before closing HTTP.
      setTimeout(() => { void queue.then(() => {
        store.db.pragma('wal_checkpoint(TRUNCATE)'); store.close(); log.event('database-closed'); options.shutdown?.()
      }).catch(() => { lifecycle.phase = 'error'; closeScheduled = false; log.event('shutdown-timeout') }) }, 300)
    }
  }, 100) : undefined
  lifecycleTimer?.unref()
  app.addHook('onClose', async () => { clearInterval(lifecycleTimer); await queue; if (store.db.open) { store.db.pragma('wal_checkpoint(TRUNCATE)'); store.close() }; log.event('service-stopped') })
  return { app, get store() { return store }, jobs, lifecycle, requestStop }
}
