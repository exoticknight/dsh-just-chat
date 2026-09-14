# RED 工作约定

本项目使用 RED Protocol 1，把未解决的研究证据、进行中的工程变更和已接受的项目知识分开管理。

## 当前映射

- Document：`docs/**`。当前还没有接受后的规范文档；E-1 完成评审并获得接受后，再把稳定契约写入这里。
- Research：`.research/**`。这里保留既有纯净 DSH 调研、运行时证据和交接材料，不迁移旧文件，也不把其中的历史工作记录当作规范要求。
- Evolve：`.evolve/**`。这里记录当前 Just Chat 插件的实施范围、验收证据、未决替代方案和后续工作。

本目录当前不是 Git 仓库，Research 和 Evolve 文件作为项目工作区内的本地记录保存；后续若接入版本控制或外部 issue 系统，再单独决定发布策略。

## 维护规则

- 新 Research / Evolve 文件使用 UTF-8 Markdown 和 RED TOML front matter。
- Document 只写已接受、可供使用者和后续 agent 直接依赖的知识；验证日志、历史过程和开放问题留在 Research / Evolve。
- Evolve 的验收证据提交评审后，获得单独接受前不更新 Document。
- DSH 宿主和宿主 UI 的边界以实现证据为准；如规范文档与代码、配置或运行时结果冲突，先记录为 Research 冲突。
