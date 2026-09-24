# RED 工作约定

本项目使用 RED Protocol 1，把未解决的研究证据、进行中的工程变更和已接受的项目知识分开管理。

## 当前映射

- Document：`README.md`、`CHANGELOG.md` 与 `docs/**`。README 面向使用者说明安装、功能、配置与生命周期；CHANGELOG 记录已接受的用户可见版本变更；`docs/development.md` 面向开发者说明初始化、调试、测试与实现结构；`docs/images/` 保存配图。
- Research：`.research/**`。这里保留既有纯净 DSH 调研、运行时证据和交接材料，不迁移旧文件，也不把其中的历史工作记录当作规范要求。
- Evolve：`.evolve/**`。这里记录当前 Just Chat 插件的实施范围、验收证据、未决替代方案和后续工作。

项目使用 Git。Research 和 Evolve 由 `.gitignore` 排除，仅作为本地工作记录保存；Document 和配置纳入版本管理。

## 维护规则

- 新 Research / Evolve 文件使用 UTF-8 Markdown 和 RED TOML front matter。
- Document 只写已接受、可供使用者和后续 agent 直接依赖的知识；验证日志、历史过程和开放问题留在 Research / Evolve。
- CHANGELOG 只记录已接受的用户可见变更摘要；实现过程、验证证据和未决方案仍留在 Evolve / Research。
- Evolve 的验收证据提交评审后，获得单独接受前不更新 Document。
- DSH 宿主和宿主 UI 的边界以实现证据为准；如规范文档与代码、配置或运行时结果冲突，先记录为 Research 冲突。
