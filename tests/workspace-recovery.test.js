import assert from 'node:assert/strict'
import test from 'node:test'

import { apply } from '../index.js'

test('disables automatic settings UI while the plugin configuration is applied', async () => {
  let runInject
  let dependencies
  let settingsOptions

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
    effect(callback) {
      callback()
    },
    settings: {
      configure(options) {
        settingsOptions = options
      },
    },
  })

  assert.deepEqual(dependencies, ['settings'])
  assert.deepEqual(settingsOptions, { auto: false })
})
