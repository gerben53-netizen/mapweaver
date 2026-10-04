import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { primaryDirectory, runtimeConfiguration } from './runtime.mjs'

const absent = path.resolve('.qa.local/nonexistent-runtime-config.json')
test('normal dev selects persistent OS user storage deterministically', () => {
  assert.equal(runtimeConfiguration({}, absent).directory, primaryDirectory({}))
  assert.equal(runtimeConfiguration({}, absent).dataProfile, 'Primary Development')
})
test('isolated profiles fail closed, including redirected primary storage', () => {
  for (const profile of ['qa', 'test']) {
    assert.throws(() => runtimeConfiguration({ MAPWEAVER_RUNTIME_PROFILE: profile }, absent), /explicit absolute/)
    assert.throws(() => runtimeConfiguration({ MAPWEAVER_RUNTIME_PROFILE: profile, MAPWEAVER_DATA_DIR: primaryDirectory({}) }, absent), /cannot open/)
    assert.throws(() => runtimeConfiguration({ MAPWEAVER_RUNTIME_PROFILE: profile, MAPWEAVER_DATA_DIR: path.join(primaryDirectory({}), 'qa') }, absent), /cannot open/)
    assert.throws(() => runtimeConfiguration({ MAPWEAVER_RUNTIME_PROFILE: profile, MAPWEAVER_DATA_DIR: '.' }, absent), /absolute/)
    assert.equal(runtimeConfiguration({ MAPWEAVER_RUNTIME_PROFILE: profile, MAPWEAVER_DATA_DIR: path.resolve('.qa.local/isolated') }, absent).directory, path.resolve('.qa.local/isolated'))
  }
  assert.throws(() => runtimeConfiguration({ MAPWEAVER_DATA_DIR: path.resolve('.qa.local/isolated') }, absent), /cannot be redirected/)
})
