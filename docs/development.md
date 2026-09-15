# 开发指南

本页面向修改和调试插件的开发者。插件安装、功能与配置见 [README](../README.md)。

## 准备环境

开发脚本面向 Windows，要求系统已安装 Node.js（`^22.19.0 || >=24.0.0`）、npm、pnpm，并可使用 PowerShell。

从 GitHub 克隆或下载源码后，在仓库根目录运行：

```powershell
npm run dev
```

脚本会依次：

1. 使用系统 pnpm 按锁文件安装依赖，包括项目内的 DSH `0.1.5-rc.2`。
2. 创建或复用仓库中的 `.dsh-dev`，作为调试用 `DSH_HOME`。
3. 将当前插件安装到该 Home 的 `web` profile，同时安装调试伴随插件 `@michengai/dsh-archive-manager@0.1.41`。
4. 使用项目内的 DSH 启动服务，在终端输出带登录 token 的本地访问链接。

打开终端链接，在 DSH 模型设置中配置凭据，即可点击“快速对话”调试。端口由系统分配，每次启动可能不同；不要公开带 token 的链接。结束调试时在启动终端按 `Ctrl+C`。

仅初始化、不启动服务：

```powershell
npm run setup
```

重复运行会保留 `.dsh-dev` 中的对话、设置与凭据。脚本不依赖全局 DSH，不复制其他 Home 的凭据；Node/pnpm 使用系统原生环境，不重定位缓存。修改插件后先停止当前调试服务，再运行 `npm run dev`，打开新输出的链接。

### 安装本地源码到已有 DSH

若需要在指定的已有 DSH 环境中验证源码，在仓库根目录运行：

```powershell
pnpm install --frozen-lockfile
dsh plugin --profile web add .
```

确认 `DSH_HOME` 和 profile 与目标环境一致，安装后重启目标 DSH 并刷新页面。本地安装引用当前目录，请保留该目录。日常开发优先使用上面的隔离调试环境。

## 业务验证

```powershell
npm test
```

自动测试覆盖入口调用和命名规则。运行环境中还应检查：

- 从没有工作区的状态点击入口，能够进入对话并收到真实模型回复。
- 两个入口连续新建时使用不同目录；原生“新建会话”仍使用所在工作区的目录。
- 归档会话、删除工作区后，再次点击入口仍可对话；刷新后记录正常保留。
- 两个入口开关、模板预览与校验、保存/放弃、语言切换，以及刷新和重启后的配置保留。
- 窄窗口布局、附件、取消响应和断线恢复。

模型凭据与原生目录选择器由人工操作。清理测试数据前确认目标，保留非测试会话和文件。

### 归档管理伴随插件

开发初始化额外安装的归档管理插件在 **设置 → 归档会话** 中提供恢复和永久删除功能，用于验证快速对话与原生会话管理的兼容性。它不是快速对话插件的依赖。

**永久删除会话不可恢复**，但会保留工作目录。原生删除工作区也不删除磁盘目录；详细生命周期见 [README](../README.md#工作区与对话的关系)。

## 实现结构

仓库根目录就是可安装的插件 package root，无需单独构建。

| 文件 | 职责 |
| --- | --- |
| `index.js` | 注册设置、准备目录、调用原生 Workspace 服务 |
| `client.js` | 入口、原生 UI 组件、配置卡片和命名模板 |
| `cordis.patch.yml` | DSH bundle 的 Host 激活配置 |
| `scripts/install-dsh-dev.ps1` | 安装项目内 DSH 与调试插件 |
| `scripts/start-dsh-dev.ps1` | 初始化并启动隔离的调试环境 |
| `tests/` | 入口调用与命名规则测试 |

所有功能在插件中实现，不修改 DSH 宿主源码。首页入口使用 `conversation.hero.agentPreset` 的 DOM 锚点，侧栏和配置卡片使用官方插槽；升级 DSH 时需重新验证入口挂载和布局。

调试时生成的工作目录位于 `.dsh-dev/just-chat/sessions/`。Workspace 和 Session ID、归档和工作区删除均由 DSH 管理。

## 打包与版本控制

```powershell
npm pack --dry-run
```

发布包通过 `package.json` 的 `files` 白名单仅包含 `index.js`、`client.js`、`cordis.patch.yml`，以及 npm 自动纳入的 `package.json`、README 和 LICENSE。配图、开发指南与 RED 约定保留在 GitHub 仓库；README 使用在线绝对链接访问它们。`.gitattributes` 的 `export-ignore` 另外将配图排除出源码压缩包。插件运行不依赖这些图片。

提交源码、锁文件和文档；`.gitignore` 排除调试 Home、依赖、临时输出及本地研究记录。不要提交 `.dsh-dev` 中的凭据与对话数据。

### GitHub 与 npm 发布准备

仓库提供以下自动化：

- `ci.yml`：main 推送和 PR 触发，在 Windows/Linux、Node 22.19/24 上按锁文件安装依赖，检查 JavaScript 语法、运行现有测试并预检发布包。
- `release.yml`：推送 `v*` tag 后先运行同一套 CI；tag 必须等于 `v` 加 package.json 的版本号。通过后发布 npm，随后创建带自动发布说明的 GitHub Release。含预发布后缀的版本使用 npm `next` 和 GitHub prerelease，其余使用 `latest`。
- Dependabot：每周检查 GitHub Actions 更新并创建更新 PR。

CI 不启动模型服务，真实对话和界面流程仍按上面的业务验证执行。

首次启用发布：

1. 将源码推送到实际 GitHub 仓库，完成下面的发布准备项。发布工作流会检查 repository.url 与当前仓库一致，并要求设置许可证。
2. 在 GitHub 创建 `npm` environment，限制仅发布 tag 可部署；按团队需要配置审批，并保护 main 和 `v*` tag。
3. 在 npm 包设置中添加 GitHub Actions Trusted Publisher，填写实际 owner/repository、工作流文件名 `release.yml`、environment `npm`，允许直接 `npm publish`。见 [npm Trusted Publishing 配置说明](https://docs.npmjs.com/trusted-publishers/)。如果新包尚不能配置 Trusted Publisher，先由维护者登录 npm 手动完成首次发布，再绑定后续自动发布。
4. 工作流使用 Node 24 和 OIDC，不需保存 NPM_TOKEN。npm CLI 需至少 11.5.1。

发布一个新版本（以下以 0.1.1 为例，工作区应先保持干净）：

```sh
npm version 0.1.1
git push origin main
git push origin v0.1.1
```

`npm version` 会更新版本、提交并创建 tag；首次手动发布过的版本不要再次触发 npm 发布。npm 版本不可覆盖。若 npm 成功但 GitHub Release 失败，使用 Actions 的 **Re-run failed jobs**，只重试后续 Release job；不要重跑已经成功的 npm 发布 job。

GitHub 提供源码和开发文档，npm 提供可安装的 `dsh-just-chat` 插件包。发布前：

- 确认 npm 包名可用、版本号和发布权限，以及项目许可证。
- 在 `package.json` 中补齐实际 GitHub 地址对应的 `repository`、`homepage` 和 `bugs`。
- 将 README 配图和开发指南链接改为该 GitHub 仓库的绝对链接，并检查 GitHub 与 npm 页面都能正常展示；仅把图片打入 npm 包不能保证 npm 页面解析相对图片地址。
- 检查发布清单和业务流程，发布后在独立 DSH Home 中验证 README 的 npm 安装命令。
- 首次 npm 发布可用后，移除 README 中“发布后可用”的提示。
- npm 版本 badge 从注册表读取已发布版本，首次发布前可能显示无法获取；RED badge 使用 RED 项目提供的样式并链接到其 GitHub 仓库。
