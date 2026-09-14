# dsh-just-chat

一个可安装的 DeepSeek Harness bundle，提供 `Just Chat` / `随便聊聊` 入口，并复用原生 Conversation 创建会话。

## 包结构

- `package.json`：声明 `dsh.bundle` 和 Web `dsh.client`。
- `cordis.patch.yml`：bundle 激活时把根插件挂载到 Host。
- `index.js`：Host 侧入口和 `dsh-just-chat` settings namespace。
- `client.js`：Web client bundle，负责 hero、侧栏、设置和原生 Session 路由。

点击 `随便聊聊` / `Just Chat` 时，插件在 `$DSH_HOME/just-chat/sessions/chat-*` 准备独立目录，再通过 DSH 原生 Workspace 和 Session 流程打开对话。调试目录位于本项目 `.dsh-dev` 内。Workspace ID、Session ID、归档和删除均由 DSH 管理；原生删除工作区会保留目录和会话日志。启动时不创建工作区。

## 本地调试

前置条件：Windows PowerShell、系统 Node.js（`^22.19.0 || >=24.0.0`）、npm 和 pnpm。无需全局安装 DSH。克隆项目后可直接运行：

```powershell
npm run dev
```

它会初始化并启动服务，终端输出带登录 token 的访问地址（随机端口）。仅初始化、不启动时运行：

```powershell
npm run setup
```

初始化使用系统原生 pnpm 执行 `install --frozen-lockfile`，安装项目内 DSH `0.1.5-rc.2`，然后通过官方 CLI 向 `.dsh-dev` 的 `web` profile 安装当前根 bundle 和归档管理插件 `@michengai/dsh-archive-manager@0.1.41`。后者只用于开发环境，不是发布 bundle 的依赖。版本固定在 `scripts/install-dsh-dev.ps1`。

重复初始化保留 `.dsh-dev` 中的凭据、对话和工作区。首次使用需在 DSH 内配置模型凭据；脚本不会复制本机其他 Home 的凭据。安装失败立即退出，保留原始错误，不移动系统缓存或自动删除依赖目录。

在“设置 → 归档会话”可恢复或永久删除归档记录；永久删除不可恢复，工作目录仍保留。新工作区按创建时语言命名为“随便聊聊 · MM-DD HH:mm”或“Just Chat · MM-DD HH:mm”，旧名称不随语言切换重写。

## 版本管理与验证

根目录即插件实现目录。提交源码、脚本、测试、RED 配置、`pnpm-lock.yaml` 和 `pnpm-workspace.yaml`；`.gitignore` 排除 `.evolve`、`.research`、`.dsh-*`（含凭据和对话）、`node_modules`、临时输出及日志。不要提交调试 Home。

运行 `npm test` 检查入口回归；本地业务验收记录保存在被忽略的 `.evolve` 中，不随克隆分发。首次模型配置和原生目录选择器需要手工操作。
