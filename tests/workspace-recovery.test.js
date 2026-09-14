import assert from 'node:assert/strict'
import test from 'node:test'

import { apply } from '../index.js'

test('does not register the project workspace while the plugin is applying', async () => {
  let runInject
  let dependencies

  apply({
    inject(nextDependencies, callback) {
      if (nextDependencies.includes('settings')) {
        dependencies = nextDependencies
        runInject = callback
      }
    },
    effect() {},
  })

  await runInject({
    settings: { register() {} },
  })

  assert.deepEqual(dependencies, ['settings'])
})
