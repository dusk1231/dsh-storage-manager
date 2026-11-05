# 1.2.0 / unreleased

- 计划中：agent 工具（storage_scan / storage_clean）供会话内 AI 调用同一套宿主方法
- 计划中：浅色主题适配

# 1.1.0

删除等级从三级改为四级带标签体系：

- `instant 放心删 ✓` / `rebuild 可重建 ↻` / `caution 需确认 ！` / `blocked 禁止删除 ✕`
- 宿主 `TIERS` 随 `/state` 下发（含中英标签与图标），面板汇总卡可点击按等级筛选
- 工具条新增「按等级分组」切换；等级分组模式组头可一键勾选该级可删项
- 行徽章带等级图标；确认弹窗文案同步
- 服务端 clean 仅放行 instant / rebuild / caution；blocked 二次拒绝

# 1.0.0

首个可用版本：

- 扫描 DSH 安装目录、`~/.dsh`、`%LOCALAPPDATA%` / `%APPDATA%` 中的 DSH 痕迹、已知工作区临时产物
- 三级安全分级（safe / caution / blocked）+ 回收站删除（trash）+ 资源管理器定位
- Windows 11 24H2 无 wmic 时自动回退 `fs.statfs` 取磁盘余量
- 中英双语面板（跟随宿主语言）
