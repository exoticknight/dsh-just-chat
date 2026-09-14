import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

test('Just Chat opens an independent native workspace when no workspace is selected', async () => {
  const source = await fs.readFile(new URL('../client.js', import.meta.url), 'utf8')
  let factory
  const moduleLoader = {
    load(definition) {
      factory = definition.factory
    },
  }

  vm.runInNewContext(source, {
    console,
    fetch: async (_url, options) => {
      assert.match(JSON.parse(options.body).title, /^Just Chat · \d{2}-\d{2} \d{2}:\d{2}$/)
      return { ok: true, json: async () => ({ path: 'C:\\dsh-home\\just-chat\\sessions\\chat-test' }) }
    },
    window: { __ModuleLoader__: moduleLoader },
  })

  const startCalls = []
  const uiWorkspace = {
    async openWorkspace(...args) {
      startCalls.push(args)
    },
  }
  const locale = {
    bind: () => () => 'Just Chat',
    getSnapshot: () => ({ revision: 0 }),
    subscribe: () => () => {},
  }
  const settings = {
    getSnapshot: () => ({ value: { hero: true, sidebar: true }, writable: true }),
    set: async () => {},
    subscribe: () => () => {},
  }
  const injections = new Map()
  const registrations = []
  const ctx = {
    effect() {},
    get(name) {
      if (name === 'locale') return locale
      if (name === 'uiWorkspace') return uiWorkspace
      if (name === 'workspaces') return { create: async ({ path }) => {
        assert.equal(path, 'C:\\dsh-home\\just-chat\\sessions\\chat-test')
        return { workspaceId: 'native-workspace-id' }
      } }
      return {}
    },
    settingsScope: { bind: () => settings },
    slots: {
      inject(name, callback) {
        injections.set(name, callback)
      },
      register(spec, component) {
        registrations.push({ component, spec })
        return () => {}
      },
    },
  }
  const React = {
    createElement: () => ({}),
    useCallback: (callback) => callback,
    useEffect: (callback) => {
      callback()
      return () => {}
    },
    useState: (initial) => [initial, () => {}],
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  }
  const plugin = factory((name) => {
    if (name === 'react') return React
    throw new Error(`Unexpected dependency: ${name}`)
  })

  plugin.apply(ctx)
  injections.get('main')()
  const panel = registrations.find(({ spec }) => spec.key === 'dsh-just-chat')?.component
  assert.ok(panel)
  panel()
  await new Promise(setImmediate)

  assert.equal(startCalls.length, 1)
  assert.deepEqual(startCalls[0], ['native-workspace-id'])
})
