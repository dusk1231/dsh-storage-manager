# dsh-storage-manager · DSH 存储管家

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的存储管理插件：统计本机所有与 DSH 相关的文件占用——**应用本体、`~/.dsh` 数据目录、系统应用数据、各工作区的临时产物**——按四级删除等级打标签，并把确认过的条目移入 Windows 回收站（可还原）。

侧边栏新增一个「存储」面板：打开即自动扫描（约 2–5 秒），给出总量、四级汇总卡、按位置或按等级分组的明细表。

## 功能

- **全量统计**：DSH 安装目录（exe / resources / locales 等）+ `~/.dsh` 全部子目录 + `%LOCALAPPDATA%` / `%APPDATA%` 中的 DSH 痕迹（更新包缓存、Electron 缓存、内嵌浏览器配置等）+ 已知工作区里的 `node_modules` / `build` / `out` / `.venv` / `__pycache__` / pip 残留等临时产物。
- **四级删除等级**（每个条目一个标签，面板可按等级筛选 / 分组 / 一键勾选）：

  | 等级 | 标签 | 含义 |
  |---|---|---|
  | 🟢 `instant` | 放心删 ✓ | 缓存、日志、临时残留、旧备份；零代价，自动重建 |
  | 🩹 `rebuild` | 可重建 ↻ | 依赖与构建产物；删除后需重装 / 重构建 |
  | 🟡 `caution` | 需确认 ！ | 会话、附件、登录态、模型；有实质代价，逐项确认 |
  | 🔴 `blocked` | 禁止删除 ✕ | DSH 本体、运行时、凭据、规则文件；删除会让 DSH 失效 |

- **产出物分类（可选）**：通过 config 的 `outputDirs` 声明产线成品目录（例如渲染管线拷贝 MP4 的归档目录）。声明目录**下钻一层**：其下每个子目录与散装文件各成为一条 🟡「需确认」条目（视频/数学/HTML 报告分列），可见、可统计、可删（回收站），删除带强警示；声明的根目录本身不进列表，防整目录误删。bundle patch 里配置：

  ```yaml
  - insert:
      - id: dsh-storage-manager
        name: 'dsh-storage-manager'
        config:
          outputDirs:
            - 'D:\toor\考研资料'
  ```

- **回收站删除**：所有清理动作走 [trash](https://github.com/sindresorhus/trash)（Windows 回收站），误删可还原；服务端拒绝任何 `blocked` 条目，即使前端被绕过。
- **磁盘余量**：面板头部显示各盘剩余空间。
- **资源管理器定位**：每行可一键在 Explorer 中选中该文件/目录。
- **中英双语**：跟随宿主语言切换。

## 安装

### 方式一：DSH CLI（推荐）

```bash
dsh plugin --profile <你的profile> add github:dusk1231/dsh-storage-manager
```

装完重启 DeepSeek Harness 生效。

> 桌面版（Electron 托管的 profile，如 `desktop`）会拒绝 CLI 安装（"managed exclusively by the Electron application"）。桌面版请用方式二。

### 方式二：git clone + 手工接入 profile

```bash
git clone https://github.com/dusk1231/dsh-storage-manager.git
cd dsh-storage-manager && npm install --omit=dev
```

然后在 profile 的 `package.json`（`~/.dsh/profiles/<你的profile>/package.json`）里：

1. `dependencies` 加 `"dsh-storage-manager": "link:<插件目录的绝对路径>"`；
2. `dsh.profile.bundles` 数组末尾追加 `"dsh-storage-manager"`；
3. 重启 DeepSeek Harness。

### 方式三：会话内安装（开发中 harness）

在 DSH 会话里让助手执行：把仓库 clone 到任意目录后，用 `plugin_manager` 的 `install_bundle`（target = 仓库目录绝对路径）安装，免重启生效。

## 安全模型

- 前端只发送条目 id；路径由服务端从最近一次扫描结果解析，**伪造路径无法进入删除流程**。
- 清理请求必须携带 `confirm: true`，且经过同源校验（Host / Origin 头防 DNS rebinding）。
- `blocked` 条目在服务端二次校验，直接拒绝。
- 插件自身只删除「扫描结果中存在且等级允许」的条目；不会碰扫描范围之外的任何路径。

## 已知限制

- 面板为深色主题（跟随 DSH 深色模式观感），未适配浅色主题。
- 工作区扫描为「一层项目 + 项目内常见临时目录名」，不递归全盘，不扫 `%TEMP%`。
- 磁盘信息优先用 `node-disk-info`（wmic）；Windows 11 24H2 起系统不再自带 wmic，此时自动回退 `fs.statfs`。

## 技术说明

通用能力全部复用成熟库，本插件只写 DSH 路径分类与业务编排：

| 能力 | 依赖 |
|---|---|
| 目录体积 | [get-folder-size](https://github.com/alessioalex/get-folder-size) v5（MIT，零依赖） |
| 回收站删除 | [trash](https://github.com/sindresorhus/trash) v10（MIT） |
| 磁盘余量 | [node-disk-info](https://github.com/cristiammercado/node-disk-info) v1.3（MIT）+ `fs.statfs` 回退 |

结构：`index.js`（宿主：扫描 / 分级 / 路由）+ `client.js`（Web 面板：React via 模块表，无独立构建步骤）+ `cordis.patch.yml`（bundle patch）+ `locale/`（中英元数据与文案）。

## License

[MIT](./LICENSE) © dusk1231
