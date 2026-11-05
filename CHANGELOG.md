# 1.2.0

- 新增「产出物」分类（第五类）：通过 config 的 `outputDirs` 声明产线成品目录（如渲染完拷贝 MP4 的归档目录），每个目录整体成为一条「需确认」条目——可见、可统计、可删（回收站），删除带强警示。
- 防呆：与 DSH 自身目录重叠的声明自动忽略；目录不存在自动跳过；不与工作区重复计费。
- README 补充 `outputDirs` 配置说明与示例。

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
