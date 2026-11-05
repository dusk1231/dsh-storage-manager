/**
 * Host half of `@local/dsh-storage-manager` — the DSH storage butler.
 *
 * Division of labour (per the workspace reuse rule):
 *   - generic capabilities come from mature packages:
 *       folder size      → get-folder-size@5 (MIT, pure JS, no deps)
 *       recycle bin      → trash@10 (MIT, ships windows-trash.exe)
 *       free disk space  → node-disk-info@1.3 (MIT) with fs.statfs fallback
 *   - everything business-specific is glue in this file:
 *       the DSH path taxonomy (install / home / AppData / workspace),
 *       the safety classification, and the "never delete these" rules.
 *
 * Routes (all under `/dsh-storage/api/`, same-origin POST for mutations):
 *   GET  /state   cached scan result + running job + disks
 *   POST /scan    start a scan job
 *   POST /clean   move selected ids to the Windows Recycle Bin
 *   POST /open    reveal one scanned item in Explorer
 */

import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, statfsSync } from 'node:fs'
import { lstat, readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, sep } from 'node:path'

import folderSize from 'get-folder-size'
import trash from 'trash'
import diskInfoPkg from 'node-disk-info'

export const name = 'dsh-storage-manager'
export const inject = ['webServer']

const ROUTE = '/dsh-storage/api'
const CACHE_MS = 10 * 60 * 1000
const CONCURRENCY = 6
const MAX_CLEAN_IDS = 200

/**
 * Deletability tiers. Every scanned item carries exactly one; the panel
 * renders them as labeled classes (filter chips, summary cards, row badges).
 * `cleanRoute` refuses everything except the first two tiers.
 */
const BLOCKED = 'blocked'
const CAUTION = 'caution'
const REBUILD = 'rebuild'
const INSTANT = 'instant'

const TIERS = [
  { id: INSTANT, order: 1, label: '放心删', en: 'Instant', icon: '✓', description: '缓存、日志、临时残留、旧备份；删除零代价，需要时自动重建' },
  { id: REBUILD, order: 2, label: '可重建', en: 'Rebuildable', icon: '↻', description: '依赖与构建产物；删除后需重新安装/构建才能恢复' },
  { id: CAUTION, order: 3, label: '需确认', en: 'Confirm first', icon: '!', description: '会话、附件、登录态、模型；有实质代价，逐项确认后再删' },
  { id: BLOCKED, order: 4, label: '禁止删除', en: 'Protected', icon: '✕', description: 'DSH 本体、运行时、凭据、规则文件；删除会让 DSH 失效或丢数据' },
]
const TIER_IDS = TIERS.map((tier) => tier.id)

const CATEGORY_LABELS = {
  install: 'DSH 本体',
  home: 'DSH 数据目录',
  appdata: '系统应用数据',
  workspace: '工作区临时产物',
  outputs: '产出物',
}

/* ---------------------------- DSH path taxonomy --------------------------- */

/** Names under `~/.dsh` with a known meaning; anything unknown stays "caution". */
const HOME_RULES = new Map([
  ['cache', { safety: INSTANT, reason: '可重建缓存（视觉工具、附件缓存、技能源），删除后自动重生成' }],
  ['resume_build', { safety: INSTANT, reason: '会话恢复用的临时构建产物' }],
  ['dsh-runtimes', { safety: BLOCKED, reason: '当前会话正在使用的 Python/Node/pnpm 运行时，删除会立即让 DSH 失效' }],
  ['profiles', { safety: CAUTION, reason: 'profile 配置与已装插件（含 node_modules）；删除等于卸载全部插件，且需重启才能恢复' }],
  ['sessions', { safety: CAUTION, reason: '会话历史与工具调用日志，是对话可回放/可续接的唯一来源' }],
  ['attachments', { safety: CAUTION, reason: '会话附件原文件（你上传的图片/文档）' }],
  ['storages', { safety: CAUTION, reason: '插件的持久化状态（待办、目标、笔记等）' }],
  ['skills', { safety: CAUTION, reason: '已安装的技能包' }],
  ['agent-team', { safety: CAUTION, reason: 'AgentTeams 的成员与任务存档' }],
  ['dsh-builtin-browser-host', { safety: CAUTION, reason: '内嵌浏览器（Edge）用户目录，含登录态与缓存；清掉会丢网页登录' }],
  ['speech-to-text', { safety: CAUTION, reason: '语音识别模型（SenseVoice，约 230MB），删除后需要重新下载' }],
  ['our-free-model', { safety: CAUTION, reason: '免费模型网关的运行时、统计与回滚包' }],
  ['dsh-ntr', { safety: CAUTION, reason: 'NTR 插件的 ACP 运行时与代理配置' }],
  ['dsh-orb', { safety: CAUTION, reason: 'Orb 桌宠的 Electron 运行时与角色数据' }],
  ['dsh-ops', { safety: CAUTION, reason: 'Ops 的 bash IPC 与 ACL 备份；bash 会话进行中删除会打断正在跑的命令' }],
  ['dsh-market', { safety: CAUTION, reason: '插件市场的本地索引与缓存' }],
  ['heartbeat-data', { safety: CAUTION, reason: '心跳/定时任务的数据' }],
  ['im', { safety: CAUTION, reason: 'IM 渠道（微信等）的会话数据' }],
  ['integrations', { safety: CAUTION, reason: '第三方集成配置' }],
  ['llm-deepseek', { safety: CAUTION, reason: 'DeepSeek 渠道的登录/凭据状态' }],
  ['openai-gateway', { safety: CAUTION, reason: 'OpenAI 兼容网关的数据' }],
  ['orbis', { safety: CAUTION, reason: 'Orbis 组件数据' }],
  ['dsh_orb', { safety: CAUTION, reason: 'Orb 组件的旧数据目录' }],
  ['workbuddy-vault', { safety: CAUTION, reason: 'WorkBuddy 的凭据保险箱' }],
  ['channel-pack', { safety: CAUTION, reason: '渠道包状态' }],
  ['.xdpool', { safety: CAUTION, reason: 'xdpool 的本地状态' }],
  ['.credentials.yaml', { safety: BLOCKED, reason: '全局凭据文件，删除会丢所有渠道的登录' }],
  ['AGENTS.md', { safety: BLOCKED, reason: '全局规则文件，删除会丢掉你的复用优先约定' }],
])

const INSTALL_BLOCKED = new Set([
  'DeepSeek Harness.exe', 'Uninstall DeepSeek Harness.exe', 'resources', 'locales',
  'Uninstall DeepSeek Harness', 'version', 'LICENSE.electron.txt', 'LICENSES.chromium.html',
])

function installRoot() {
  if (typeof process.resourcesPath === 'string' && process.resourcesPath.length > 0) {
    const root = dirname(process.resourcesPath)
    if (existsSync(join(root, 'resources'))) return root
  }
  // A plain `node` boot has execPath inside the bundled runtime; walk up until
  // the directory that actually holds `resources/` + `version` shows up.
  const seen = new Set()
  let cursor = dirname(process.execPath)
  for (let depth = 0; depth < 8; depth += 1) {
    if (!seen.has(cursor)) {
      seen.add(cursor)
      if (existsSync(join(cursor, 'resources')) && existsSync(join(cursor, 'version'))) return cursor
    }
    const parent = dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }
  return dirname(process.execPath)
}

function homeRoot() {
  const env = process.env.DSH_HOME
  if (typeof env === 'string' && env.length > 0) return env
  return join(homedir(), '.dsh')
}

/* -------------------------- workspace discovery ------------------------- */

function decodeWorkspaceDir(name) {
  if (!name.startsWith('--') || !name.endsWith('--') || name.length < 6) return null
  let body = name.slice(2, -2)
  body = body.replace(/~([0-9a-fA-F]{4})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)))
  if (!/^[A-Za-z]-/.test(body)) return null
  const rest = body.slice(2).split('-').join('\\')
  return `${body[0]}:\\${rest}`
}

async function knownWorkspaces(config) {
  const found = new Map()
  for (const raw of Array.isArray(config.workspaces) ? config.workspaces : []) {
    if (typeof raw !== 'string' || raw.length === 0) continue
    const path = raw.replace(/[\\/]+$/, '')
    found.set(path.toLowerCase(), { path })
  }
  // DSH records one directory per workspace under sessions/, named after the
  // workspace path. Decoding is ambiguous for names containing '-' or '_', so
  // a candidate only counts when it actually exists on disk.
  try {
    const entries = await readdir(join(homeRoot(), 'sessions'), { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const decoded = decodeWorkspaceDir(entry.name)
      if (decoded === null) continue
      const key = decoded.toLowerCase()
      if (found.has(key)) continue
      try {
        const st = await lstat(decoded)
        if (st.isDirectory()) found.set(key, { path: decoded })
      } catch {
        /* candidate did not exist */
      }
    }
  } catch {
    /* no sessions directory */
  }
  return [...found.values()].map((entry) => entry.path)
}

const WS_SAFE_DIRS = new Set(['__pycache__', '.pytest_cache', '.mypy_cache', '.cache', '.ruff_cache', '.tox', '.nyc_output'])
const WS_REBUILD_DIRS = new Map([
  ['node_modules', '依赖目录，删除后需要重新安装依赖'],
  ['.venv', 'Python 虚拟环境，删除后需要重建'],
  ['venv', 'Python 虚拟环境，删除后需要重建'],
  ['dist', '构建产物，可重新构建'],
  ['build', '构建产物，可重新构建'],
  ['out', '构建产物，可重新构建'],
  ['.next', '前端构建缓存，可重新构建'],
  ['.nuxt', '前端构建缓存，可重新构建'],
  ['.turbo', 'Turborepo 缓存'],
  ['.parcel-cache', 'Parcel 构建缓存'],
  ['target', '编译产物目录'],
  ['coverage', '测试覆盖率报告'],
])
const PIP_TEMP_RE = /^pip-(build-tracker|ephem-wheel-cache|install|metadata|unpack)[-_]/
const LOG_FILE_RE = /\.(log|tmp|bak|old|dmp)$/i

/* ----------------------------- classification ---------------------------- */

function classifyInstall(entry) {
  if (entry.name === 'debug.log' || LOG_FILE_RE.test(entry.name)) {
    return { safety: INSTANT, reason: '运行日志，可随时删除' }
  }
  if (INSTALL_BLOCKED.has(entry.name)) {
    return { safety: BLOCKED, reason: 'DSH 可执行文件/运行时资源，删除会导致应用无法启动' }
  }
  if (/\.(asar|dll|pak|dat|bin|exe|ico|png|yml)$/i.test(entry.name) || entry.isDirectory()) {
    return { safety: BLOCKED, reason: '应用本体文件，删除会导致 DSH 无法启动' }
  }
  return { safety: CAUTION, reason: '应用附带文件，删除前请确认用途' }
}

function classifyHome(name) {
  const rule = HOME_RULES.get(name)
  if (rule !== undefined) return rule
  if (name.startsWith('.')) return { safety: CAUTION, reason: '未识别的隐藏配置，删除前请确认用途' }
  return { safety: CAUTION, reason: '未识别的 DSH 数据目录，删除前请确认用途' }
}

function classifyWorkspaceChild(name, isDirectory) {
  if (isDirectory) {
    const instant = WS_SAFE_DIRS.has(name)
    if (instant) return { safety: INSTANT, reason: '解释器/测试缓存，可安全重建' }
    const rebuild = WS_REBUILD_DIRS.get(name)
    if (rebuild !== undefined) return { safety: REBUILD, reason: rebuild }
    if (PIP_TEMP_RE.test(name)) return { safety: INSTANT, reason: 'pip 安装遗留的临时目录' }
    return null
  }
  if (PIP_TEMP_RE.test(name) || LOG_FILE_RE.test(name)) {
    return { safety: INSTANT, reason: '临时文件/日志' }
  }
  return null
}

/* ------------------------------ disk free -------------------------------- */

async function disks() {
  const out = []
  // node-disk-info shells out to wmic, which Windows 11 24H2 no longer ships;
  // only try it when the binary is really there, otherwise suppress the noise.
  const wmic = process.env.SystemRoot !== undefined
    ? join(process.env.SystemRoot, 'System32', 'wbem', 'wmic.exe')
    : 'C:\\Windows\\System32\\wbem\\wmic.exe'
  if (existsSync(wmic)) {
    try {
      const list = await diskInfoPkg.getDiskInfo()
      for (const drive of list) {
        const filesystem = String(drive.filesystem ?? '').replace(/\\$/, '')
        if (!/^[A-Za-z]:/.test(filesystem)) continue
        out.push({
          drive: filesystem.toUpperCase(),
          total: Number(drive.blocks) || Number(drive.capacity) || 0,
          used: Number(drive.used) || 0,
          free: Number(drive.available) || 0,
        })
      }
    } catch {
      /* fall through to statfs */
    }
  }
  if (out.length === 0) {
    for (const letter of ['C', 'D', 'E']) {
      try {
        const st = statfsSync(`${letter}:\\`)
        const total = Number(st.blocks) * Number(st.bsize)
        const free = Number(st.bfree) * Number(st.bsize)
        if (total > 0) out.push({ drive: `${letter}:`, total, used: total - free, free })
      } catch {
        /* drive does not exist */
      }
    }
  }
  return out
}

/* -------------------------------- scanning ------------------------------- */

function hashPath(path) {
  return createHash('sha1').update(path).digest('hex').slice(0, 16)
}

async function measure(path) {
  try {
    const st = await lstat(path)
    if (!st.isDirectory()) return st.size
    const bytes = await folderSize.loose(path)
    return typeof bytes === 'number' && Number.isFinite(bytes) ? bytes : 0
  } catch {
    return 0
  }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  const runners = new Array(Math.max(1, Math.min(limit, items.length))).fill(0).map(async () => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

async function collectDescriptors(config) {
  const descriptors = []
  const roots = []

  const install = installRoot()
  roots.push({ id: 'install', label: CATEGORY_LABELS.install, path: install })
  try {
    for (const entry of await readdir(install, { withFileTypes: true })) {
      const rule = classifyInstall(entry)
      descriptors.push({
        path: join(install, entry.name),
        label: entry.name,
        category: 'install',
        kind: entry.isDirectory() ? 'dir' : 'file',
        ...rule,
      })
    }
  } catch (error) {
    descriptors.push({ path: install, label: '（安装目录不可读）', category: 'install', kind: 'dir', safety: CAUTION, reason: String(error) })
  }

  const home = homeRoot()
  roots.push({ id: 'home', label: CATEGORY_LABELS.home, path: home })
  try {
    for (const entry of await readdir(home, { withFileTypes: true })) {
      const rule = classifyHome(entry.name)
      descriptors.push({
        path: join(home, entry.name),
        label: entry.name,
        category: 'home',
        kind: entry.isDirectory() ? 'dir' : 'file',
        ...rule,
      })
    }
  } catch (error) {
    descriptors.push({ path: home, label: '（数据目录不可读）', category: 'home', kind: 'dir', safety: CAUTION, reason: String(error) })
  }

  // Skills and installed plugins, one entry each. `~/.dsh/skills/<name>` is a
  // plain directory per skill; profiles/<name>/node_modules/<pkg> holds the
  // installed plugin packages (link: deps point outside, pnpm virtual store
  // holds the rest). Per-skill / per-plugin rows are what a user actually
  // decides about; the parent directories stay coarse-tier under home.
  const pushHome = (path, label, kind, safety, reason) => {
    descriptors.push({ path, label, category: 'home', kind, safety, reason })
  }
  try {
    const skillsDir = join(home, 'skills')
    for (const skill of await readdir(skillsDir, { withFileTypes: true })) {
      if (!skill.isDirectory() || skill.isSymbolicLink()) continue
      pushHome(join(skillsDir, skill.name), `skills/${skill.name}`, 'dir', CAUTION,
        '单个技能包：含操作手册与脚本；删除后该技能从会话目录消失，需重新安装')
    }
  } catch {
    /* no skills dir */
  }
  try {
    // List only the packages the user actually installed (profile manifest
    // dependencies), not every transitive dep under node_modules. pnpm links
    // `node_modules/<scope>/<name>` → virtual store; the manifest names the
    // real units a user decides about.
    const packageJsonPath = join(home, 'profiles', 'desktop', 'package.json')
    const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8'))
    const pluginsDir = join(home, 'profiles', 'desktop', 'node_modules')
    for (const [name, spec] of Object.entries(manifest.dependencies ?? {})) {
      if (typeof spec !== 'string') continue
      const link = spec.startsWith('link:')
      let path
      if (link) {
        // `link:` is 5 chars; what follows may be an absolute path (`D:/…`,
        // `C:\…`) or profile-relative (`./vendor/…`).
        const target = spec.slice(5).replaceAll('/', sep)
        path = isAbsolute(target) ? target : join(home, 'profiles', 'desktop', target)
      } else {
        const [scope, pkg] = name.startsWith('@') ? name.split('/') : [null, name]
        path = scope === null ? join(pluginsDir, pkg) : join(pluginsDir, scope, pkg)
      }
      const st = await lstat(path).catch(() => null)
      if (st === null) continue
      pushHome(path, `插件 ${name}${link ? '（link）' : ''}`, 'dir', CAUTION,
        link
          ? '单个已装插件（link 安装，源码在工作区）：删除等于卸载该插件，需重启恢复'
          : '单个已装插件：删除等于卸载该插件，需重启恢复')
    }
  } catch {
    /* no profile manifest */
  }

  // profile-level leftovers: cordis.patch.yml.bak-*, package.json.bak-*, …
  const profiles = join(home, 'profiles')
  try {
    for (const profile of await readdir(profiles, { withFileTypes: true })) {
      if (!profile.isDirectory()) continue
      const profilePath = join(profiles, profile.name)
      for (const file of await readdir(profilePath, { withFileTypes: true })) {
        if (file.isDirectory() || !LOG_FILE_RE.test(file.name)) continue
        descriptors.push({
          path: join(profilePath, file.name),
          label: `${profile.name}/${file.name}`,
          category: 'home',
          kind: 'file',
          safety: INSTANT,
          reason: 'profile 配置的旧备份（.bak），确认旧版本不再需要后可删',
        })
      }
    }
  } catch {
    /* no profiles dir */
  }

  const local = process.env.LOCALAPPDATA
  const roaming = process.env.APPDATA
  const appTargets = []
  if (local !== undefined) {
    appTargets.push(
      { path: join(local, '@deepseek-aidsh-desktop-updater'), label: '更新包缓存（installer/pending）', safety: INSTANT, reason: '历史更新安装包，可删除' },
      { path: join(local, 'dsh-desktop-updater'), label: '桌面端更新器缓存', safety: INSTANT, reason: '更新器下载缓存，可删除' },
      { path: join(local, 'dsh-homework', 'edge-profile'), label: '作业插件的浏览器配置', safety: CAUTION, reason: '学习通等页面的登录态与缓存' },
    )
  }
  if (roaming !== undefined) {
    appTargets.push(
      { path: join(roaming, 'dsh-desktop'), label: 'Electron 用户数据（Roaming）', safety: CAUTION, reason: '窗口状态、本地存储与缓存' },
    )
    const deepseek = join(roaming, '@deepseek-ai', 'dsh-desktop')
    for (const name of ['Cache', 'Code Cache', 'GPUCache', 'DawnCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'GrShaderCache', 'ShaderCache', 'Service Worker', 'Crashpad', 'blob_storage']) {
      appTargets.push({ path: join(deepseek, name), label: `Electron 缓存 · ${name}`, safety: INSTANT, reason: 'Chromium 缓存/本地存储，可重建' })
    }
  }
  roots.push({ id: 'appdata', label: CATEGORY_LABELS.appdata, path: local ?? roaming ?? '' })
  for (const target of appTargets) {
    if ((await lstat(target.path).catch(() => null)) === null) continue
    descriptors.push({ path: target.path, label: target.label, category: 'appdata', kind: 'dir', safety: target.safety, reason: target.reason })
  }

  const workspaces = await knownWorkspaces(config)
  const homeKey = home.toLowerCase()
  const installKey = install.toLowerCase()
  const insideOwn = (path) => {
    const key = path.toLowerCase()
    return key === homeKey || key.startsWith(`${homeKey}\\`) || key === installKey || key.startsWith(`${installKey}\\`)
  }
  for (const workspace of workspaces) {
    // A "workspace" that is really DSH's own data (profiles/…) is already
    // counted under home; scanning it twice would let the panel delete the
    // plugin node_modules under a misleading label.
    if (insideOwn(workspace)) continue
    roots.push({ id: `ws:${hashPath(workspace)}`, label: `工作区 · ${basename(workspace) || workspace}`, path: workspace })
    let entries = []
    try {
      entries = await readdir(workspace, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const rule = classifyWorkspaceChild(entry.name, entry.isDirectory())
      if (rule !== null) {
        descriptors.push({
          path: join(workspace, entry.name),
          label: `${basename(workspace)}/${entry.name}`,
          category: 'workspace',
          kind: entry.isDirectory() ? 'dir' : 'file',
          ...rule,
        })
        continue
      }
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      // Second level: real projects keep node_modules/dist/out inside their own
      // folder (remotion/node_modules), which the first level alone never sees.
      let children = []
      try {
        children = await readdir(join(workspace, entry.name), { withFileTypes: true })
      } catch {
        continue
      }
      for (const child of children) {
        if (!child.isDirectory() || child.isSymbolicLink()) continue
        const nested = classifyWorkspaceChild(child.name, true)
        if (nested === null) continue
        descriptors.push({
          path: join(workspace, entry.name, child.name),
          label: `${basename(workspace)}/${entry.name}/${child.name}`,
          category: 'workspace',
          kind: 'dir',
          ...nested,
        })
      }
    }
  }

  // Explicitly declared output directories (config.outputDirs, e.g. the folder
  // a render pipeline copies finished MP4s into). These are the user's *work
  // products*. A declared directory is drilled one level down: each child
  // directory and loose file becomes its own caution-tier entry (so a parent
  // "考研资料" lists 视频/ 数学/ 408/ and the scattered HTML reports
  // separately), while a declared *file* is one entry itself.
  const outputDirs = Array.isArray(config.outputDirs) ? config.outputDirs : []
  if (outputDirs.length > 0) {
    roots.push({ id: 'outputs', label: CATEGORY_LABELS.outputs, path: '' })
    const pushOutput = (path, label, kind) => {
      descriptors.push({
        path,
        label,
        category: 'outputs',
        kind,
        safety: CAUTION,
        reason: '产线成品（config.outputDirs 声明）：最终成果，删除前务必确认已有备份或不再需要',
      })
    }
    for (const raw of outputDirs) {
      if (typeof raw !== 'string' || raw.length === 0) continue
      const path = raw.replace(/[\\/]+$/, '')
      const key = path.toLowerCase()
      if (insideOwn(key)) continue
      if (workspaces.some((ws) => ws.toLowerCase() === key)) continue
      const st = await lstat(path).catch(() => null)
      if (st === null) continue
      if (!st.isDirectory()) {
        pushOutput(path, basename(path) || path, 'file')
        continue
      }
      // One level down: children are the real units a user deletes
      // (视频/, 数学/, a single HTML report). The declared root itself is
      // not listed — deleting it wholesale from a "storage cleaner" is
      // exactly the accident this tier exists to prevent.
      let children = []
      try {
        children = await readdir(path, { withFileTypes: true })
      } catch {
        continue
      }
      const rootLabel = basename(path) || path
      for (const child of children) {
        if (child.isSymbolicLink()) continue
        pushOutput(join(path, child.name), `${rootLabel}/${child.name}`, child.isDirectory() ? 'dir' : 'file')
      }
    }
  }

  // A parent workspace (e.g. Desktop) descends one level and can reach a
  // project that is itself a recognised workspace (Desktop/408); keep the
  // first descriptor so the same path never appears — or gets measured — twice.
  const seenPaths = new Set()
  const unique = []
  for (const descriptor of descriptors) {
    const key = descriptor.path.toLowerCase()
    if (seenPaths.has(key)) continue
    seenPaths.add(key)
    unique.push(descriptor)
  }

  return { descriptors: unique, roots }
}

function startScan(config) {
  fromCache = null
  job = {
    id: ++jobSeq,
    status: 'running',
    startedAt: Date.now(),
    done: 0,
    total: 0,
    current: '收集扫描目标…',
    error: null,
  }
  const started = Date.now()
  void (async () => {
    try {
      const { descriptors, roots } = await collectDescriptors(config)
      job.total = descriptors.length
      const items = await mapLimit(descriptors, CONCURRENCY, async (descriptor, index) => {
        job.done = index
        job.current = descriptor.label
        const size = await measure(descriptor.path)
        return {
          id: hashPath(descriptor.path),
          path: descriptor.path,
          label: descriptor.label,
          category: descriptor.category,
          kind: descriptor.kind,
          safety: descriptor.safety,
          reason: descriptor.reason,
          size,
        }
      })
      items.sort((a, b) => b.size - a.size)
      const totals = Object.fromEntries(TIER_IDS.map((id) => [id, 0]))
      totals.all = 0
      const counts = Object.fromEntries(TIER_IDS.map((id) => [id, 0]))
      counts.all = items.length
      for (const item of items) {
        totals.all += item.size
        totals[item.safety] = (totals[item.safety] ?? 0) + item.size
        counts[item.safety] = (counts[item.safety] ?? 0) + 1
      }
      fromCache = {
        generatedAt: Date.now(),
        scanMs: Date.now() - started,
        installRoot: installRoot(),
        homeRoot: homeRoot(),
        roots,
        tiers: TIERS,
        items,
        totals,
        counts,
      }
      job.status = 'done'
      job.done = job.total
      job.current = ''
    } catch (error) {
      job.status = 'error'
      job.error = error instanceof Error ? error.message : String(error)
    }
  })()
  return job
}

/* -------------------------------- routes --------------------------------- */

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function loopbackAuthority(host) {
  if (typeof host !== 'string') return false
  const lower = host.toLowerCase()
  const name = lower.startsWith('[') ? lower.slice(0, lower.indexOf(']') + 1) : lower.split(':')[0]
  return name === '127.0.0.1' || name === 'localhost' || name === '[::1]'
}

function sameOrigin(req) {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const host = req.headers.host
  if (host !== undefined && !loopbackAuthority(host)) return false
  const origin = req.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

async function readJsonBody(req, maxBytes = 64 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maxBytes) throw new Error('request body too large')
    chunks.push(buffer)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function stateRoute(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'GET only' })
  const payload = {
    result: fromCache,
    stale: fromCache === null,
    job: job === null ? null : { id: job.id, status: job.status, done: job.done, total: job.total, current: job.current, error: job.error, startedAt: job.startedAt },
    cachedMs: fromCache === null ? 0 : Date.now() - fromCache.generatedAt,
    cacheTtlMs: CACHE_MS,
    disks: await disks(),
  }
  return sendJson(res, 200, payload)
}

async function scanRoute(req, res, config) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' })
  if (!sameOrigin(req)) return sendJson(res, 403, { error: 'cross-origin request rejected' })
  const fresh = startScan(config)
  return sendJson(res, 202, { job: { id: fresh.id, status: fresh.status } })
}

/** Re-check a scanned id against the live scan; the client never sends a path. */
function resolveItems(ids) {
  if (fromCache === null) return { error: '请先扫描' }
  const byId = new Map(fromCache.items.map((item) => [item.id, item]))
  const selected = []
  for (const id of ids) {
    const item = byId.get(id)
    if (item === undefined) continue
    selected.push(item)
  }
  return { items: selected }
}

async function cleanRoute(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' })
  if (!sameOrigin(req)) return sendJson(res, 403, { error: 'cross-origin request rejected' })

  let body
  try {
    body = await readJsonBody(req)
  } catch (error) {
    return sendJson(res, 400, { error: String(error instanceof Error ? error.message : error) })
  }
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string') : []
  if (ids.length === 0) return sendJson(res, 400, { error: '没有选中任何条目' })
  if (ids.length > MAX_CLEAN_IDS) return sendJson(res, 400, { error: `一次最多清理 ${MAX_CLEAN_IDS} 项` })
  if (body.confirm !== true) return sendJson(res, 400, { error: '缺少确认标记' })

  const resolved = resolveItems(ids)
  if (resolved.error !== undefined) return sendJson(res, 409, { error: resolved.error })

  const cleaned = []
  const failed = []
  let bytes = 0
  for (const item of resolved.items) {
    // Only the two lower tiers may pass the gate; caution items are allowed
    // because the client has already shown the per-item confirm dialog.
    if (!(item.safety === INSTANT || item.safety === REBUILD || item.safety === CAUTION)) {
      failed.push({ id: item.id, path: item.path, error: '该条目被标记为禁止删除' })
      continue
    }
    try {
      await trash(item.path, { glob: false })
      cleaned.push({ id: item.id, path: item.path, size: item.size })
      bytes += item.size
    } catch (error) {
      failed.push({ id: item.id, path: item.path, error: error instanceof Error ? error.message : String(error) })
    }
  }
  // The measured sizes are stale after a deletion; force a fresh scan next time.
  fromCache = null
  return sendJson(res, 200, { cleaned, failed, bytes })
}

async function openRoute(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' })
  if (!sameOrigin(req)) return sendJson(res, 403, { error: 'cross-origin request rejected' })
  let body
  try {
    body = await readJsonBody(req)
  } catch (error) {
    return sendJson(res, 400, { error: String(error instanceof Error ? error.message : error) })
  }
  const resolved = resolveItems([String(body.id ?? '')])
  if (resolved.items === undefined || resolved.items.length === 0) return sendJson(res, 404, { error: '条目不存在，请重新扫描' })
  const target = resolved.items[0].path
  execFile('explorer.exe', ['/select,', target], { windowsHide: false }, () => {})
  return sendJson(res, 200, { ok: true })
}

/* -------------------------------- plugin --------------------------------- */

let fromCache = null
let job = null
let jobSeq = 0

export function apply(ctx, rawConfig) {
  const config = {
    workspaces: Array.isArray(rawConfig?.workspaces) ? rawConfig.workspaces : [],
    outputDirs: Array.isArray(rawConfig?.outputDirs) ? rawConfig.outputDirs : [],
  }

  ctx.inject(['webServer'], (hostCtx) => {
    const webServer = hostCtx.get('webServer')
    if (webServer === undefined) {
      console.warn('[dsh-storage-manager] webServer unavailable; storage API not mounted')
      return
    }
    const offs = [
      webServer.register({ kind: 'exact', path: `${ROUTE}/state`, handler: (req, res) => stateRoute(req, res) }),
      webServer.register({ kind: 'exact', path: `${ROUTE}/scan`, handler: (req, res) => scanRoute(req, res, config) }),
      webServer.register({ kind: 'exact', path: `${ROUTE}/clean`, handler: (req, res) => cleanRoute(req, res) }),
      webServer.register({ kind: 'exact', path: `${ROUTE}/open`, handler: (req, res) => openRoute(req, res) }),
    ]
    ctx.effect(() => () => {
      for (const off of offs) off()
    }, 'dsh-storage-manager: routes')
  })
}