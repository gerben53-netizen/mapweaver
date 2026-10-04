import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer as netServer } from 'node:net'
import { createServer } from 'vite'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { configuration, health, supervise } from './dev.mjs'

async function freePort() {
  const server = netServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}

test('dev config propagates explicit service/client ports and isolated directory', () => {
  assert.equal(configuration({ MAPWEAVER_PORT: '49191', MAPWEAVER_DEV_PORT: '49192' }, []).servicePort, 49191)
  assert.equal(configuration({}, ['--port', '49193']).clientPort, 49193)
  assert.throws(() => configuration({ MAPWEAVER_PORT: 'bad' }, []))
  assert.throws(() => configuration({ MAPWEAVER_PORT: '49182' }, []))
})

test('real service without Campfire token becomes healthy before Vite; proxy agrees', async () => {
  await mkdir('.qa.local', { recursive: true })
  const directory = await mkdtemp(path.resolve('.qa.local/dev-startup-'))
  const port = await freePort(), clientPort = await freePort(), controller = new AbortController()
  let opened = false
  try {
    await supervise({ port, env: { ...process.env, MAPWEAVER_PORT: String(port), MAPWEAVER_DATA_DIR: directory, MAPWEAVER_RUNTIME_PROFILE: 'test', MAPWEAVER_DEV_ORIGIN: `http://127.0.0.1:${clientPort}` }, signal: controller.signal, frontend: async () => {
      assert.equal((await health(port)).application, 'Mapweaver')
      const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: clientPort, strictPort: true, proxy: { '/api/v1': `http://127.0.0.1:${port}` } } })
      try {
        await server.listen()
        const response = await fetch(`http://127.0.0.1:${clientPort}/api/v1/health`)
        assert.equal(response.status, 200)
        assert.equal((await response.json()).pid, (await health(port)).pid)
        opened = true
        controller.abort()
        return server
      } catch (error) { await server.close(); throw error }
    } })
    assert.ok(opened)
  } finally { controller.abort(); await rm(directory, { recursive: true, force: true }) }
})

test('backend immediate failure prevents frontend startup', async () => {
  let opened = false
  await assert.rejects(supervise({ port: await freePort(), env: process.env, signal: new AbortController().signal, command: [process.execPath, '-e', 'console.error("deliberate startup failure");process.exit(7)'], frontend: async () => { opened = true } }), /code 7/)
  assert.equal(opened, false)
})

test('backend failure after readiness closes frontend and fails entire session', async () => {
  const port = await freePort()
  let opened = false, closed = false
  const code = `require('http').createServer((req,res)=>res.end(JSON.stringify({application:'Mapweaver',pid:process.pid}))).listen(${port},'127.0.0.1');setTimeout(()=>process.exit(9),1500)`
  await assert.rejects(supervise({ port, env: process.env, signal: new AbortController().signal, command: [process.execPath, '-e', code], frontend: async () => { opened = true; return { close: async () => { closed = true } } } }), /code 9/)
  assert.ok(opened && closed)
})
