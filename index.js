import z from '@deepseek-ai/schemastery'
import { createHash } from 'node:crypto'
import { mkdir, realpath, rmdir } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'

function isQuickChatWorkspace(root, workspacePath) {
  const childPath = relative(root, workspacePath)
  return childPath !== ''
    && childPath !== '..'
    && !childPath.startsWith(`..${sep}`)
    && !isAbsolute(childPath)
    && !childPath.includes(sep)
    && childPath.startsWith('chat-')
}

function quickChatDirectoryName(title) {
  return `chat-${createHash('sha256').update(title).digest('hex')}`
}

export const name = 'dsh-just-chat'

export const Config = z.object({
  hero: z.boolean().default(true).volatile(),
  sidebar: z.boolean().default(true).volatile(),
  workspaceNameTemplate: z.string().min(1).max(200).default('{label} · {MM}-{DD} {HH}:{mm}').volatile(),
})

export function apply(ctx) {
  ctx.inject(['settings'], (pluginCtx) => {
    pluginCtx.effect(
      () => pluginCtx.settings.configure({ auto: false }, ctx.fiber),
      'dsh-just-chat: custom settings card',
    )
  })
  ctx.inject(['connection', 'workspaceRegistry'], (pluginCtx) => {
    const titleTails = new Map()

    async function prepareWorkspace(title, signal) {
      const previous = titleTails.get(title) ?? Promise.resolve()
      let release
      const turn = new Promise((resolve) => { release = resolve })
      const tail = previous.then(() => turn)
      titleTails.set(title, tail)
      await previous

      try {
        signal.throwIfAborted()
        const root = dshHomePath('just-chat', 'sessions')
        await mkdir(root, { recursive: true })
        const canonicalRoot = await realpath(root)

        for (const workspace of pluginCtx.workspaceRegistry.list()) {
          if (workspace.title !== title || !isQuickChatWorkspace(canonicalRoot, workspace.path)) continue
          let existingPath
          try {
            existingPath = await realpath(workspace.path)
          } catch {
            // A removed chat directory cannot be adopted; create a fresh one.
          }
          if (existingPath) {
            signal.throwIfAborted()
            return existingPath
          }
        }

        const path = join(canonicalRoot, quickChatDirectoryName(title))
        let createdDirectory = false
        try {
          await mkdir(path)
          createdDirectory = true
        } catch (error) {
          if (error.code !== 'EEXIST') throw error
        }

        try {
          signal.throwIfAborted()
          // Only the folder name is ours; DSH generates Workspace and Session IDs.
          await pluginCtx.workspaceRegistry.create(path, title)
          return path
        } catch (error) {
          // Undo only a directory created by this request and still unregistered.
          if (createdDirectory && !pluginCtx.workspaceRegistry.list().some((workspace) => workspace.path === path)) {
            await rmdir(path).catch(() => {})
          }
          throw error
        }
      } finally {
        release()
        if (titleTails.get(title) === tail) titleTails.delete(title)
      }
    }

    // The shared API channel owns authentication, origin checks, and route lifetime.
    pluginCtx.connection.fetch.register({
      path: '/api/just-chat/prepare',
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        try {
          request.signal.throwIfAborted()
          const { title } = await request.json()
          if (typeof title !== 'string' || !title.trim() || title.length > 100) {
            return Response.json({ error: 'Invalid workspace title' }, { status: 400 })
          }
          const path = await prepareWorkspace(title, request.signal)
          return Response.json({ path })
        } catch (error) {
          return Response.json({ error: error.message }, { status: 500 })
        }
      },
    })
  })
}
