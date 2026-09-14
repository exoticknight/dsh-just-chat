import z from '@deepseek-ai/schemastery'
import { mkdir, mkdtemp, rmdir } from 'node:fs/promises'
import { join } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'

export const name = 'dsh-just-chat'

const SETTINGS_NAMESPACE = 'dsh-just-chat'
const SettingsSchema = z.object({
  hero: z.boolean().default(true),
  sidebar: z.boolean().default(true),
  workspaceNameTemplate: z.string().min(1).max(200).default('{label} · {MM}-{DD} {HH}:{mm}'),
})

export function apply(ctx) {
  ctx.inject(['settings'], (pluginCtx) => {
    pluginCtx.settings.register(SETTINGS_NAMESPACE, SettingsSchema)
  })
  ctx.inject(['connection', 'workspaceRegistry'], (pluginCtx) => {
    // The shared API channel owns authentication, origin checks, and route lifetime.
    pluginCtx.connection.fetch.register({
      path: '/api/just-chat/prepare',
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        let path
        try {
          request.signal.throwIfAborted()
          const { title } = await request.json()
          if (typeof title !== 'string' || !title.trim() || title.length > 100) {
            return Response.json({ error: 'Invalid workspace title' }, { status: 400 })
          }
          const root = dshHomePath('just-chat', 'sessions')
          await mkdir(root, { recursive: true })
          path = await mkdtemp(join(root, 'chat-'))
          request.signal.throwIfAborted()
          // Only the folder name is ours; DSH generates Workspace and Session IDs.
          await pluginCtx.workspaceRegistry.create(path, title)
          return Response.json({ path })
        } catch (error) {
          // Undo only an empty directory that never acquired a Workspace.
          if (path && !pluginCtx.workspaceRegistry.list().some((workspace) => workspace.path === path)) {
            await rmdir(path).catch(() => {})
          }
          return Response.json({ error: error.message }, { status: 500 })
        }
      },
    })
  })
}
