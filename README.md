# 快速对话 · Just Chat

[![npm version](https://img.shields.io/npm/v/dsh-just-chat?logo=npm)](https://www.npmjs.com/package/dsh-just-chat) [![CI](https://github.com/exoticknight/dsh-just-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/exoticknight/dsh-just-chat/actions/workflows/ci.yml) [![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](https://github.com/exoticknight/dsh-just-chat/blob/main/LICENSE) ![DSH compatibility: 0.1.5-rc.2](https://img.shields.io/badge/DSH-0.1.5--rc.2-blue) <a href="https://github.com/exoticknight/red"><img src="https://img.shields.io/badge/maintained_with-RED-C1121F" alt="Maintained with RED"></a>

[![dsh.pub registry status](https://dsh.pub/api/badges/exoticknight/dsh-just-chat.svg)](https://dsh.pub/en/plugins/?q=exoticknight%2Fdsh-just-chat)

为 DeepSeek Harness 添加一键对话入口：点击即可进入独立工作目录中的原生会话，省去手动选择工作区。

![首页标准模式旁和侧栏的快速对话入口](https://raw.githubusercontent.com/exoticknight/dsh-just-chat/main/docs/images/quick-chat.png)

## 功能特点

- **一键开始**：首页“标准模式”旁、侧栏各有一个入口，可分别开启或关闭。
- **独立目录**：每次完成一次入口点击，都会新建独立工作区及对话。启动插件时不预建工作区。
- **原生对话体验**：复用 DSH 的会话、模型、权限与附件流程；Workspace 和 Session ID 由 DSH 生成。
- **自定义命名**：用占位符设置新工作区名称，编辑时预览，保存后生效。
- **融入现有界面**：使用 DSH 原生图标和按钮，窄窗口自动换行；中文显示“快速对话”，英文显示“Just Chat”。

## 快速开始

### 安装插件

适用于 DSH `0.1.5-rc.2` 的 Web 界面。先确认你的 DSH 已能正常对话，并且终端中可以使用 `dsh`。

通过 DSH 插件管理命令从 npm 安装：

```sh
dsh plugin --profile web add dsh-just-chat
```

如果你使用自定义 `DSH_HOME` 或其他 profile，请选择与平时启动 DSH 相同的环境。安装后重启该 DSH 并刷新页面。

### 开始对话

1. 打开你平时使用的 DSH 页面。
2. 点击首页“标准模式”旁或侧栏的 **快速对话**。
3. 在打开的对话中输入消息并发送。

插件会自动准备独立工作目录并打开原生对话，无需选择目录。模型与权限沿用 DSH 的配置。

## 配置入口与命名

打开 **设置 → 插件 → 插件配置 → 快速对话**。

![快速对话配置卡片：入口开关、名称模板、预览和保存操作](https://raw.githubusercontent.com/exoticknight/dsh-just-chat/main/docs/images/settings.png)

“标准模式旁入口”和“侧栏入口”控制两个按钮的显示位置。修改开关或模板后，卡片会标记“未保存”；点击“保存”统一应用，或点击“放弃更改”恢复已保存的值。配置集中在这张卡片中。

### 工作区名称模板

默认模板：

```text
{label} · {MM}-{DD} {HH}:{mm}
```

例如，中文界面创建的工作区显示为 `快速对话 · 09-14 18:01`；英文界面显示为 `Just Chat · 09-14 18:01`。

| 占位符 | 含义 | 示例 |
| --- | --- | --- |
| `{label}` | 创建时的本地化名称 | 快速对话 / Just Chat |
| `{YYYY}` | 四位年份 | 2026 |
| `{MM}` / `{DD}` | 两位月份 / 日期 | 09 / 14 |
| `{HH}` / `{mm}` / `{ss}` | 24 小时制的时 / 分 / 秒 | 18 / 01 / 05 |

也可以写成 `灵感 {YYYY}-{MM}-{DD}` 或 `{label} {HH}:{mm}:{ss}`，普通文字会原样保留。

- 时间取自浏览器本地时间，占位符区分大小写。
- 模板最多 200 个字符；展开并去除首尾空白后的名称必须为 1–100 个字符。
- 未知或不完整的占位符会显示错误并阻止保存。
- “恢复默认模板”只修改草稿，还需点击“保存”。
- 模板与语言变更只影响之后新建的工作区，不会重命名已有工作区，也不会改变磁盘目录。

## 工作区与对话的关系

每次通过快速对话入口创建的工作目录位于：

```text
<DSH_HOME>/just-chat/sessions/chat-<随机后缀>
```

`DSH_HOME` 是当前 DSH 的用户数据目录。显示名称与目录名分开管理；即使两个工作区显示名称相同，目录和原生 ID 仍然不同。

| 操作 | 结果 |
| --- | --- |
| 点击快速对话入口 | 新建独立目录、工作区和原生对话 |
| 在该工作区使用 DSH 原生“新建会话” | 仍使用该工作区的目录 |
| 归档会话 | 隐藏会话，保留记录和目录，可恢复 |
| 原生删除工作区 | 移除工作区登记，保留目录与会话记录，会话转入“未分组” |

快速对话创建的会话和工作区使用 DSH 原生管理操作。删除工作区后，磁盘上的工作目录仍会保留；快速对话插件不会自动清理这些目录。

## 开发与维护

本地环境初始化、调试、测试和实现说明见[开发指南](https://github.com/exoticknight/dsh-just-chat/blob/main/docs/development.md)。
