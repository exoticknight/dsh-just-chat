import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

test('Just Chat opens a native conversation when no workspace is selected', async () => {
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
    configForms: {
      get(id) {
        assert.equal(id, 'dsh-just-chat')
        return settings
      },
    },
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
    if (name === 'react-dom') return { createPortal: () => ({}) }
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Button: 'button', IconNewChatOutline16: () => ({}) }
    throw new Error(`Unexpected dependency: ${name}`)
  })

  const date = new Date(2026, 8, 14, 7, 5, 3)
  assert.equal(plugin.formatWorkspaceName('{label} · {MM}-{DD} {HH}:{mm}', '快速对话', date), '快速对话 · 09-14 07:05')
  assert.equal(plugin.formatWorkspaceName('Notes {YYYY}/{MM}/{DD} {ss}', 'Just Chat', date), 'Notes 2026/09/14 03')
  assert.throws(() => plugin.formatWorkspaceName('{unknown}', 'Just Chat', date))
  assert.throws(() => plugin.formatWorkspaceName(' ', 'Just Chat', date))
  assert.throws(() => plugin.formatWorkspaceName('{label}'.repeat(20), 'Just Chat', date))

  plugin.apply(ctx)
  assert.equal(injections.has('settings.general.item'), false)
  assert.equal(injections.has('settings.plugin.item'), false)
  assert.equal(injections.has('plugins.bundle.config'), true)
  injections.get('plugins.bundle.config')()
  assert.equal(registrations.some(({ spec }) => spec.name === 'plugins.bundle.config' && spec.key === 'dsh-just-chat'), true)
  injections.get('main')()
  const panel = registrations.find(({ spec }) => spec.key === 'dsh-just-chat')?.component
  assert.ok(panel)
  panel()
  await new Promise(setImmediate)

  assert.equal(startCalls.length, 1)
  assert.deepEqual(startCalls[0], ['native-workspace-id'])
})
