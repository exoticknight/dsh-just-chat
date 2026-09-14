window.__ModuleLoader__.load({
  id: 'dsh-just-chat',
  factory: (require) => {
    const React = require('react')
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
    const defaultSettings = Object.freeze({ hero: true, sidebar: true })
    const fallbackSettingsSnapshot = Object.freeze({
      status: 'loading',
      value: defaultSettings,
      writable: false,
    })

    const localeDictionaries = {
      zh: {
        entry: '随便聊聊',
        opening: '打开中…',
        'panel.loaded': '正在打开随便聊聊…',
        'panel.failed': '打开失败：{error}',
        'panel.retry': '重试',
        'settings.title': '随便聊聊入口',
        'settings.description': '选择要显示的入口位置',
        'settings.hero': '标准模式旁入口',
        'settings.sidebar': '侧栏入口',
      },
      en: {
        entry: 'Just Chat',
        opening: 'Opening…',
        'panel.loaded': 'Opening Just Chat…',
        'panel.failed': 'Could not open Just Chat: {error}',
        'panel.retry': 'Retry',
        'settings.title': 'Just Chat entry points',
        'settings.description': 'Choose where Just Chat should appear',
        'settings.hero': 'Beside Standard mode',
        'settings.sidebar': 'In the sidebar',
      },
    }

    function JustChatIcon({ size = 16 }) {
      return React.createElement(
        'svg',
        {
          'aria-hidden': 'true',
          fill: 'none',
          height: size,
          viewBox: '0 0 16 16',
          width: size,
        },
        React.createElement('path', {
          d: 'M4.25 2.75h7.5A2.5 2.5 0 0 1 14.25 5.25v2.5a2.5 2.5 0 0 1-2.5 2.5H8.2l-2.7 2.25v-2.25H4.25a2.5 2.5 0 0 1-2.5-2.5v-5A2.5 2.5 0 0 1 4.25 2.75Z',
          stroke: 'currentColor',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 1.35,
        }),
        React.createElement('path', {
          d: 'M5.25 6.45h.01M8 6.45h.01M10.75 6.45h.01',
          stroke: 'currentColor',
          strokeLinecap: 'round',
          strokeWidth: 1.7,
        }),
      )
    }

    function PanelIcon({ size = 16 }) {
      return React.createElement(JustChatIcon, { size })
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
          const now = new Date()
          const pad = (value) => String(value).padStart(2, '0')
          const stamp = `${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
          const title = `${runtimeCtx.get('locale').bind(localeNamespace)('entry')} · ${stamp}`
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

    function useHeroAgentPresetAnchor() {
      const [anchor, setAnchor] = React.useState(null)
      const measure = React.useCallback(() => {
        const target = document.querySelector('[data-slot="conversation.hero.agentPreset"] button')
        if (!target) {
          setAnchor(null)
          return
        }
        const rect = target.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) {
          setAnchor(null)
          return
        }
        const next = { left: rect.right + 8, top: rect.top, height: rect.height }
        setAnchor((previous) => previous
          && Math.abs(previous.left - next.left) < 0.5
          && Math.abs(previous.top - next.top) < 0.5
          && Math.abs(previous.height - next.height) < 0.5
          ? previous
          : next)
      }, [])

      React.useEffect(() => {
        let frame = 0
        let observed = null
        const schedule = () => {
          cancelAnimationFrame(frame)
          frame = requestAnimationFrame(measure)
        }
        const resizeObserver = new ResizeObserver(schedule)
        const syncObservedTarget = () => {
          const target = document.querySelector('[data-slot="conversation.hero.agentPreset"] button')
          if (target === observed) return
          resizeObserver.disconnect()
          observed = target
          if (target) resizeObserver.observe(target)
          schedule()
        }
        const mutationObserver = new MutationObserver(syncObservedTarget)
        mutationObserver.observe(document.getElementById('root') ?? document.body, {
          subtree: true,
          childList: true,
        })
        window.addEventListener('resize', schedule)
        document.addEventListener('scroll', schedule, true)
        syncObservedTarget()
        return () => {
          cancelAnimationFrame(frame)
          resizeObserver.disconnect()
          mutationObserver.disconnect()
          window.removeEventListener('resize', schedule)
          document.removeEventListener('scroll', schedule, true)
        }
      }, [measure])

      return anchor
    }

    function JustChatOverlay() {
      const t = useJustChatT()
      const settings = useEntrySettings()
      const anchor = useHeroAgentPresetAnchor()
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(null)
      if (!anchor || !settingEnabled(settings, 'hero')) return null

      const openChat = async () => {
        if (busy) return
        setBusy(true)
        setError(null)
        try {
          await openJustChat()
        } catch (error) {
          setError(error.message)
        } finally {
          setBusy(false)
        }
      }

      return React.createElement(
        'div',
        {
          'data-just-chat-overlay': 'true',
          style: {
            height: anchor.height,
            left: anchor.left,
            pointerEvents: 'none',
            position: 'absolute',
            top: anchor.top,
          },
        },
        React.createElement(
          'button',
          {
            type: 'button',
            'aria-label': busy ? t('opening') : t('entry'),
            title: t('entry'),
            onClick: openChat,
            disabled: busy,
            style: {
              alignItems: 'center',
              background: 'transparent',
              border: 0,
              borderRadius: 16,
              color: 'var(--dsw-alias-label-primary, #0f1115)',
              cursor: busy ? 'wait' : 'pointer',
              display: 'flex',
              font: '500 13px / 20px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
              gap: 5,
              height: 28,
              padding: '0 8px',
              pointerEvents: 'auto',
              whiteSpace: 'nowrap',
            },
          },
          React.createElement(JustChatIcon, { size: 14 }),
          busy ? t('opening') : t('entry'),
        ),
        error && React.createElement('div', { role: 'alert', style: { pointerEvents: 'auto', maxWidth: 360 } },
          t('panel.failed', { error })),
      )
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
            'button',
            { onClick: () => setAttempt((value) => value + 1), type: 'button' },
            t('panel.retry'),
          )
          : null,
      )
    }

    function EntrySettingsRow({ t }) {
      const snapshot = useEntrySettings()
      const settings = { ...defaultSettings, ...(snapshot?.value ?? {}) }
      const [saving, setSaving] = React.useState(null)
      const writable = snapshot?.writable !== false

      const toggle = async (key) => {
        if (saving !== null || !writable) return
        setSaving(key)
        try {
          await entrySettings.set(key, !settings[key])
        } catch (error) {
          console.error('[dsh-just-chat] settings update failed', error)
        } finally {
          setSaving(null)
        }
      }

      const rowStyle = {
        alignItems: 'center',
        borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
        display: 'flex',
        gap: 12,
        justifyContent: 'space-between',
        padding: '16px 0',
      }
      const textStyle = { display: 'flex', flex: 1, flexDirection: 'column', gap: 4, minWidth: 0 }
      const titleStyle = { color: 'var(--dsw-alias-label-primary)', fontSize: 14, lineHeight: '22px' }
      const descriptionStyle = { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, lineHeight: '18px' }
      const optionsStyle = { alignItems: 'flex-end', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 170 }
      const optionStyle = { alignItems: 'center', color: 'var(--dsw-alias-label-secondary)', display: 'flex', gap: 8, fontSize: 13, lineHeight: '20px' }

      return React.createElement(
        'div',
        { style: rowStyle },
        React.createElement(
          'div',
          { style: textStyle },
          React.createElement('div', { style: titleStyle }, t('settings.title')),
          React.createElement('div', { style: descriptionStyle }, t('settings.description')),
        ),
        React.createElement(
          'div',
          { style: optionsStyle },
          ['hero', 'sidebar'].map((key) => React.createElement(
            'label',
            { key, style: optionStyle },
            React.createElement('input', {
              'aria-label': t(`settings.${key}`),
              checked: settings[key],
              disabled: !writable || saving !== null,
              onChange: () => toggle(key),
              type: 'checkbox',
            }),
            React.createElement('span', null, t(`settings.${key}`)),
          )),
        ),
      )
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

      ctx.slots.inject('settings.general.item', () => ctx.slots.register(
        {
          name: 'settings.general.item',
          id: 'dsh-just-chat-entries',
          order: 20,
          locale: localeNamespace,
        },
        EntrySettingsRow,
      ))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
