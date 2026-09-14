window.__ModuleLoader__.load({
  id: 'dsh-just-chat',
  factory: (require) => {
    const React = require('react')
    const { createPortal } = require('react-dom')
    const { Button, Tag, IconChevronDownOutline14, IconNewChatOutline16 } = require('@deepseek-ai/dsh-client-ui-primitives')
    const module = { exports: {} }
    const exports = module.exports

    let runtimeCtx
    let entrySettings
    let sidebarRegistration
    let sidebarInjectionLive = false
    let openingChat
    let pendingPath

    const localeNamespace = 'dsh-just-chat'
    const settingsNamespace = 'dsh-just-chat'
    const defaultNameTemplate = '{label} · {MM}-{DD} {HH}:{mm}'
    const defaultSettings = Object.freeze({ hero: true, sidebar: true, workspaceNameTemplate: defaultNameTemplate })
    const fallbackSettingsSnapshot = Object.freeze({
      status: 'loading',
      value: defaultSettings,
      writable: false,
    })

    const localeDictionaries = {
      zh: {
        entry: '快速对话',
        opening: '打开中…',
        'panel.loaded': '正在打开快速对话…',
        'panel.failed': '打开失败：{error}',
        'panel.retry': '重试',
        'settings.description': '配置快速对话入口和新工作区的命名规则',
        'settings.hero': '标准模式旁入口',
        'settings.sidebar': '侧栏入口',
        'settings.template': '工作区名称模板',
        'settings.help': '可用占位符：{label} 本地化名称、{YYYY} 年、{MM} 月、{DD} 日、{HH} 时、{mm} 分、{ss} 秒。使用本地时间，仅影响新建工作区。',
        'settings.preview': '预览',
        'settings.save': '保存',
        'settings.reset': '恢复默认模板',
        'settings.invalid': '请使用已列出的占位符，且展开后的名称须为 1–100 个字符。',
        'settings.discard': '放弃更改',
        'settings.unsaved': '未保存',
        'settings.saving': '保存中…',
        'settings.expand': '展开设置',
        'settings.collapse': '收起设置',
        'settings.readOnly': '当前设置只读。',
      },
      en: {
        entry: 'Just Chat',
        opening: 'Opening…',
        'panel.loaded': 'Opening Just Chat…',
        'panel.failed': 'Could not open Just Chat: {error}',
        'panel.retry': 'Retry',
        'settings.description': 'Configure entry points and names for new workspaces',
        'settings.hero': 'Beside Standard mode',
        'settings.sidebar': 'In the sidebar',
        'settings.template': 'Workspace name template',
        'settings.help': 'Placeholders: {label} localized name, {YYYY} year, {MM} month, {DD} day, {HH} hour, {mm} minute, {ss} second. Uses local time; affects new workspaces only.',
        'settings.preview': 'Preview',
        'settings.save': 'Save',
        'settings.reset': 'Restore default template',
        'settings.invalid': 'Use the listed placeholders and a resulting name of 1–100 characters.',
        'settings.discard': 'Discard changes',
        'settings.unsaved': 'Unsaved',
        'settings.saving': 'Saving…',
        'settings.expand': 'Show settings',
        'settings.collapse': 'Hide settings',
        'settings.readOnly': 'These settings are read-only.',
      },
    }

    function PanelIcon({ size = 16 }) {
      return React.createElement(IconNewChatOutline16, { size })
    }

    // Deliberately a small literal-token formatter, not an executable template language.
    function formatWorkspaceName(template, label, now = new Date()) {
      const pad = (value) => String(value).padStart(2, '0')
      const values = { label, YYYY: String(now.getFullYear()), MM: pad(now.getMonth() + 1),
        DD: pad(now.getDate()), HH: pad(now.getHours()), mm: pad(now.getMinutes()), ss: pad(now.getSeconds()) }
      if (typeof template !== 'string' || template.length > 200) throw new Error('Invalid template')
      const title = template.replace(/\{([^{}]*)\}/g, (token, key) => {
        if (!Object.hasOwn(values, key)) throw new Error('Unknown placeholder')
        return values[key]
      }).trim()
      if (/[{}]/.test(title) || !title || title.length > 100) throw new Error('Invalid workspace name')
      return title
    }

    function useJustChatT() {
      const locale = runtimeCtx.get('locale')
      const subscribe = React.useCallback((listener) => locale.subscribe(listener), [locale])
      const getRevision = React.useCallback(() => locale.getSnapshot().revision, [locale])
      React.useSyncExternalStore(subscribe, getRevision, getRevision)
      return locale.bind(localeNamespace)
    }

    function useEntrySettings() {
      const scope = entrySettings
      const subscribe = React.useCallback(
        (listener) => scope?.subscribe(listener) ?? (() => {}),
        [scope],
      )
      const getSnapshot = React.useCallback(
        () => scope?.getSnapshot?.() ?? fallbackSettingsSnapshot,
        [scope],
      )
      return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    }

    function settingEnabled(snapshot, key) {
      return snapshot?.value?.[key] !== false
    }

    function openJustChat() {
      if (openingChat) return openingChat
      openingChat = (async () => {
        if (!pendingPath) {
          let title
          const t = runtimeCtx.get('locale').bind(localeNamespace)
          try {
            title = formatWorkspaceName(entrySettings.getSnapshot()?.value?.workspaceNameTemplate ?? defaultNameTemplate, t('entry'))
          } catch {
            throw new Error(t('settings.invalid'))
          }
          const response = await fetch('/api/just-chat/prepare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
          })
          if (!response.ok) throw new Error(await response.text())
          const result = await response.json()
          pendingPath = result.path
        }
        // Native create adopts the registered path and synchronizes Client state.
        // Keep it for retry if opening fails; both native operations are idempotent.
        const workspace = await runtimeCtx.get('workspaces').create({ path: pendingPath })
        await runtimeCtx.get('uiWorkspace').openWorkspace(workspace.workspaceId)
        pendingPath = undefined
      })().finally(() => { openingChat = undefined })
      return openingChat
    }

    function useHeroMount() {
      const [mount, setMount] = React.useState(null)
      React.useEffect(() => {
        const node = document.createElement('span')
        node.dataset.justChatMount = 'true'
        const style = document.createElement('style')
        style.textContent = 'div:has(> [data-just-chat-mount]) { flex-wrap: wrap; row-gap: 4px; }'
        document.head.appendChild(style)
        Object.assign(node.style, { display: 'inline-flex', minWidth: '0', flexShrink: '0', marginLeft: '6px' })
        const sync = () => {
          const slot = document.querySelector('[data-slot="conversation.hero.agentPreset"]')
          if (!slot) {
            node.remove()
            setMount(null)
          } else {
            // Join the existing flex row, so long workspace labels reserve space for the action.
            if (node.previousSibling !== slot) slot.after(node)
            setMount(node)
          }
        }
        const observer = new MutationObserver(sync)
        observer.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true })
        sync()
        return () => { observer.disconnect(); node.remove(); style.remove() }
      }, [])
      return mount
    }

    function JustChatOverlay() {
      const t = useJustChatT()
      const settings = useEntrySettings()
      const mount = useHeroMount()
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(null)
      if (!mount || !settingEnabled(settings, 'hero')) return null
      const openChat = async () => {
        if (busy) return
        setBusy(true)
        setError(null)
        try { await openJustChat() } catch (error) { setError(error.message) }
        finally { setBusy(false) }
      }
      return createPortal(React.createElement('span', { style: { position: 'relative' } },
        React.createElement(Button, {
          variant: 'ghost', size: 'sm', onClick: openChat, disabled: busy,
          'aria-label': busy ? t('opening') : t('entry'), title: t('entry'),
          style: { borderRadius: 16, height: 28, padding: '0 8px', gap: 4, whiteSpace: 'nowrap' },
        }, React.createElement(IconNewChatOutline16, { size: 14 }), busy ? t('opening') : t('entry')),
        error && React.createElement('span', { role: 'alert', style: {
          position: 'absolute', top: '100%', right: 0, width: 280, zIndex: 10,
          padding: 8, background: 'var(--dsw-alias-bg-layer-3)', color: 'var(--dsw-alias-label-error)',
        } }, error),
      ), mount)
    }

    function ChatPanel() {
      const t = useJustChatT()
      const [attempt, setAttempt] = React.useState(0)
      const [message, setMessage] = React.useState({ key: 'panel.loaded' })

      React.useEffect(() => {
        let active = true
        setMessage({ key: 'panel.loaded' })
        void openJustChat().catch((error) => {
          if (active) {
            setMessage({
              key: 'panel.failed',
              params: { error: error?.message ?? JSON.stringify(error) },
            })
          }
        })
        return () => {
          active = false
        }
      }, [attempt])

      return React.createElement(
        'section',
        { style: { fontFamily: 'sans-serif', padding: '24px' } },
        React.createElement('h1', null, t('entry')),
        React.createElement('p', null, t(message.key, message.params)),
        message.key === 'panel.failed'
          ? React.createElement(
            Button,
            { variant: 'outline', size: 'sm', onClick: () => setAttempt((value) => value + 1), type: 'button' },
            t('panel.retry'),
          )
          : null,
      )
    }

    // The host's PluginCard is private. Match its layout with owned, scoped styles.
    const settingsCss = `
      .jc-card{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);border-radius:16px;list-style:none;transition:border-color .16s,background .16s}
      .jc-card:hover{border-color:var(--dsw-alias-label-dimmed)}
      .jc-card[data-open=true]{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}
      .jc-card-header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:transparent;border:0;border-radius:12px;display:flex;align-items:center;gap:12px;padding:14px 16px}
      .jc-card-header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
      .jc-card-heading{display:flex;flex:1;flex-direction:column;gap:4px;min-width:0}
      .jc-card-name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}
      .jc-card-description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}
      .jc-card-chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}
      .jc-card[data-open=true] .jc-card-chevron{transform:rotate(180deg)}
      .jc-card-body{border-top:.5px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}
      .jc-field{display:flex;flex-direction:column;gap:6px;padding:12px 0}
      .jc-field+.jc-field{border-top:.5px solid var(--dsw-alias-border-l2)}
      .jc-field-head{display:flex;align-items:center;gap:8px}
      .jc-field-label{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:1.5}
      .jc-field-toggle{accent-color:var(--dsw-alias-brand-primary);width:16px;height:16px;cursor:pointer}
      .jc-field-input{box-sizing:border-box;width:100%;height:34px;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}
      .jc-field-input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
      .jc-field-input[aria-invalid=true]{border-color:var(--dsw-alias-label-error)}
      .jc-field-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5;overflow-wrap:anywhere}
      .jc-field-reset{background:none;border:0;padding:0;font:inherit;font-size:12px;color:var(--dsw-alias-label-secondary);cursor:pointer}
      .jc-card-footer{display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:8px;border-top:.5px solid var(--dsw-alias-border-l2);padding:12px 0 4px}
      .jc-card-error{color:var(--dsw-alias-label-error);font-size:12px;line-height:1.5;overflow-wrap:anywhere}
    `

    function PluginSettingsCard() {
      const t = useJustChatT()
      const snapshot = useEntrySettings()
      const current = { ...defaultSettings, ...(snapshot.value ?? {}) }
      const [open, setOpen] = React.useState(false)
      const [editor, setEditor] = React.useState(null)
      const [saving, setSaving] = React.useState(false)
      const [error, setError] = React.useState(null)
      const draft = editor?.value ?? current
      const dirty = Object.keys(defaultSettings).some((key) => draft[key] !== current[key])
      const disabled = saving || snapshot.writable === false
      let preview
      try { preview = formatWorkspaceName(draft.workspaceNameTemplate, t('entry')) } catch {}
      const edit = (key, value) => {
        setEditor((previous) => ({ revision: previous?.revision ?? snapshot.revision,
          value: { ...(previous?.value ?? current), [key]: value } }))
        setError(null)
      }
      const save = async () => {
        if (!dirty || !preview || disabled) return
        setSaving(true); setError(null)
        try {
          const ops = Object.keys(defaultSettings).filter((key) => draft[key] !== current[key])
            .map((key) => ({ op: 'set', path: [key], value: draft[key] }))
          await entrySettings.mutate(ops, editor?.revision)
          setEditor(null); setOpen(false)
        } catch (error) { setError(error.message) }
        finally { setSaving(false) }
      }
      if (snapshot.status === 'unavailable') return null
      return React.createElement('li', { className: 'jc-card', 'data-open': open },
        React.createElement('button', {
          className: 'jc-card-header', type: 'button', 'aria-expanded': open,
          'aria-controls': 'just-chat-settings-body',
          'aria-label': t(open ? 'settings.collapse' : 'settings.expand') + ': ' + t('entry'),
          onClick: () => setOpen(!open),
        },
          React.createElement('span', { className: 'jc-card-heading' },
            React.createElement('span', { className: 'jc-card-name' }, t('entry')),
            React.createElement('span', { className: 'jc-card-description' }, t('settings.description'))),
          dirty && React.createElement(Tag, { tone: 'neutral' }, t('settings.unsaved')),
          React.createElement(IconChevronDownOutline14, { className: 'jc-card-chevron' })),
        open && React.createElement('div', { className: 'jc-card-body', id: 'just-chat-settings-body' },
          snapshot.writable === false && React.createElement('p', { className: 'jc-field-hint', role: 'status' }, t('settings.readOnly')),
          ['hero', 'sidebar'].map((key) => React.createElement('div', { key, className: 'jc-field' },
            React.createElement('label', { className: 'jc-field-head' },
              React.createElement('span', { className: 'jc-field-label' }, t('settings.' + key)),
              React.createElement('input', { className: 'jc-field-toggle', type: 'checkbox',
                checked: draft[key], disabled, 'aria-label': t('settings.' + key),
                onChange: (event) => edit(key, event.target.checked) })))),
          React.createElement('div', { className: 'jc-field' },
            React.createElement('div', { className: 'jc-field-head' },
              React.createElement('label', { className: 'jc-field-label', htmlFor: 'just-chat-name-template' }, t('settings.template')),
              React.createElement('button', { className: 'jc-field-reset', type: 'button', disabled,
                onClick: () => edit('workspaceNameTemplate', defaultNameTemplate) }, t('settings.reset'))),
            React.createElement('input', { className: 'jc-field-input', id: 'just-chat-name-template',
              value: draft.workspaceNameTemplate, maxLength: 200, disabled, 'aria-invalid': !preview,
              'aria-describedby': 'just-chat-template-help just-chat-template-preview',
              onChange: (event) => edit('workspaceNameTemplate', event.target.value) }),
            React.createElement('p', { id: 'just-chat-template-help', className: 'jc-field-hint' }, t('settings.help')),
            React.createElement('p', { id: 'just-chat-template-preview', role: preview ? 'status' : 'alert',
              className: preview ? 'jc-field-hint' : 'jc-card-error' },
              preview ? t('settings.preview') + ': ' + preview : t('settings.invalid'))),
          error && React.createElement('p', { role: 'alert', className: 'jc-card-error' }, error),
          React.createElement('div', { className: 'jc-card-footer' },
            React.createElement(Button, { variant: 'outline', size: 'sm', disabled: !dirty || saving,
              onClick: () => { setEditor(null); setError(null) } }, t('settings.discard')),
            React.createElement(Button, { size: 'sm', disabled: disabled || !dirty || !preview,
              onClick: save }, t(saving ? 'settings.saving' : 'settings.save'))),
        ))
    }

    const inject = [
      'slots',
      'sessions',
      'workspaces',
      'uiWorkspace',
      'layout',
      'locale',
      'settingsScope',
    ]

    function apply(ctx) {
      runtimeCtx = ctx
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.pluginCss = 'dsh-just-chat/settings'
        style.textContent = settingsCss
        document.head.appendChild(style)
        return () => style.remove()
      }, 'dsh-just-chat: settings styles')
      const locale = ctx.get('locale')
      entrySettings = ctx.settingsScope.bind({ namespace: settingsNamespace })

      ctx.effect(
        () => locale.register(localeNamespace, localeDictionaries),
        'dsh-just-chat: dictionaries',
      )

      let sidebarEnabled = settingEnabled(entrySettings.getSnapshot(), 'sidebar')
      const registerSidebarEntry = () => ctx.slots.register(
        {
          name: 'sidebar.panellist',
          id: 'dsh-just-chat',
          order: 10,
          label: () => locale.bind(localeNamespace)('entry'),
        },
        PanelIcon,
      )

      ctx.slots.inject('sidebar.panellist', () => {
        sidebarInjectionLive = true
        sidebarRegistration = sidebarEnabled ? registerSidebarEntry() : undefined
        return () => {
          sidebarRegistration?.()
          sidebarRegistration = undefined
          sidebarInjectionLive = false
        }
      })

      ctx.effect(() => {
        const syncSidebar = () => {
          const next = settingEnabled(entrySettings.getSnapshot(), 'sidebar')
          if (next === sidebarEnabled) return
          sidebarEnabled = next
          if (!sidebarInjectionLive) return
          sidebarRegistration?.()
          sidebarRegistration = sidebarEnabled ? registerSidebarEntry() : undefined
        }
        const stop = entrySettings.subscribe(syncSidebar)
        syncSidebar()
        return stop
      }, 'dsh-just-chat: sidebar entry setting')

      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        {
          name: 'shell.overlay',
          id: 'dsh-just-chat-hero',
          order: 100,
        },
        JustChatOverlay,
      ))

      ctx.slots.inject('main', () => ctx.slots.register(
        { name: 'main', key: 'dsh-just-chat' },
        ChatPanel,
      ))

      ctx.slots.inject('settings.plugin.item', () => ctx.slots.register(
        { name: 'settings.plugin.item', key: settingsNamespace, locale: localeNamespace },
        PluginSettingsCard,
      ))


    }

    exports.formatWorkspaceName = formatWorkspaceName
    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
