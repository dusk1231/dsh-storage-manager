window.__ModuleLoader__.load({
  id: 'dsh-storage-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const BASE = '/dsh-storage/api'
    const PANEL_ID = 'dsh-storage'
    const NS = 'dsh-storage'

    // 408 工作台主题（与侧边栏其它面板一致）：深渊黑灰底、霓虹黄绿强调、猩红告警。
    const INK = {
      neon: '#A2D332',
      charcoal: '#1C1E21',
      abyss: '#141619',
      card: '#222529',
      card2: '#262a30',
      mist: '#E3E5E6',
      moss: '#4B6B3F',
      crimson: '#D82B22',
      amber: '#E0A93B',
    }

    const CSS = `
.dst-root { height: 100%; overflow-y: auto; box-sizing: border-box; color: ${INK.mist};
  background: ${INK.abyss}; font-family: inherit; --dst-line: rgba(227,229,230,0.12); }
.dst-root * { box-sizing: border-box; }
.dst-page { max-width: 1180px; margin: 0 auto; padding: 24px 26px 40px; }

.dst-head { display: flex; flex-wrap: wrap; gap: 18px; justify-content: space-between; align-items: flex-end;
  padding: 18px 22px; border-radius: 16px; border: 1px solid var(--dst-line);
  background: linear-gradient(140deg, rgba(38,42,48,0.92), rgba(28,30,33,0.7)); }
.dst-eyebrow { display: flex; align-items: center; gap: 8px; font-size: 10.5px; letter-spacing: 0.2em;
  text-transform: uppercase; color: rgba(227,229,230,0.55); }
.dst-dot { width: 6px; height: 6px; border-radius: 99px; background: ${INK.neon}; box-shadow: 0 0 10px ${INK.neon}; }
.dst-title { margin: 6px 0 4px; font-size: 21px; font-weight: 700; letter-spacing: -0.01em; }
.dst-sub { font-size: 12px; color: rgba(227,229,230,0.62); line-height: 1.6; }
.dst-head-side { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.dst-total { display: flex; align-items: baseline; gap: 6px; }
.dst-total b { font-size: 26px; line-height: 1; color: ${INK.neon}; font-variant-numeric: tabular-nums; }
.dst-total span { font-size: 11px; color: rgba(227,229,230,0.55); }
.dst-disks { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.dst-disk { border: 1px solid var(--dst-line); border-radius: 999px; padding: 4px 10px; font-size: 10.5px;
  background: rgba(20,22,25,0.6); color: rgba(227,229,230,0.72); font-variant-numeric: tabular-nums; }

.dst-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
.dst-card { border: 1px solid var(--dst-line); border-radius: 14px; padding: 13px 15px; background: ${INK.card};
  display: flex; flex-direction: column; gap: 4px; }
.dst-card b { font-size: 19px; font-variant-numeric: tabular-nums; }
.dst-card small { font-size: 10.5px; color: rgba(227,229,230,0.55); }
.dst-card .dst-card-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700;
  border-radius: 999px; padding: 2px 8px; border: 1px solid; width: fit-content; }
.dst-card.t-instant b { color: ${INK.neon}; }
.dst-card.t-instant .dst-card-tag { color: ${INK.neon}; border-color: rgba(162,211,50,0.45); background: rgba(162,211,50,0.08); }
.dst-card.t-rebuild b { color: #7FB8E8; }
.dst-card.t-rebuild .dst-card-tag { color: #7FB8E8; border-color: rgba(127,184,232,0.4); background: rgba(127,184,232,0.08); }
.dst-card.t-caution b { color: ${INK.amber}; }
.dst-card.t-caution .dst-card-tag { color: ${INK.amber}; border-color: rgba(224,169,59,0.45); background: rgba(224,169,59,0.08); }
.dst-card.t-blocked b { color: #F4786F; }
.dst-card.t-blocked .dst-card-tag { color: #F4786F; border-color: rgba(216,43,34,0.5); background: rgba(216,43,34,0.1); }
.dst-card.is-clickable { cursor: pointer; transition: border-color 160ms, transform 120ms; }
.dst-card.is-clickable:hover { border-color: rgba(162,211,50,0.4); }
.dst-card.is-active { border-color: ${INK.neon}; box-shadow: 0 0 0 1px rgba(162,211,50,0.25); }

.dst-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 16px 0 12px; }
.dst-chip { border: 1px solid var(--dst-line); border-radius: 999px; padding: 6px 12px; font-size: 11.5px;
  background: rgba(34,37,41,0.8); color: rgba(227,229,230,0.78); cursor: pointer; font-family: inherit; }
.dst-chip.is-on { border-color: ${INK.neon}; color: ${INK.neon}; background: rgba(162,211,50,0.1); }
.dst-gap { flex: 1 1 auto; }
.dst-btn { border: 1px solid ${INK.neon}; border-radius: 10px; padding: 7px 15px; font-size: 12px; font-weight: 600;
  background: rgba(162,211,50,0.14); color: ${INK.neon}; cursor: pointer; font-family: inherit;
  transition: background 160ms, border-color 160ms; }
.dst-btn:hover:not(:disabled) { background: rgba(162,211,50,0.24); }
.dst-btn:disabled { opacity: 0.45; cursor: default; }
.dst-btn.is-danger { border-color: ${INK.crimson}; color: #F4786F; background: rgba(216,43,34,0.12); }
.dst-btn.is-danger:hover:not(:disabled) { background: rgba(216,43,34,0.2); }

.dst-progress { margin: 10px 0 14px; padding: 10px 14px; border-radius: 12px; border: 1px dashed rgba(162,211,50,0.35);
  background: rgba(162,211,50,0.05); font-size: 11.5px; color: rgba(227,229,230,0.75);
  display: flex; align-items: center; gap: 10px; }
.dst-progress-bar { flex: 1 1 auto; height: 4px; border-radius: 99px; background: rgba(227,229,230,0.12); overflow: hidden; }
.dst-progress-fill { height: 100%; background: ${INK.neon}; transition: width 240ms; }

.dst-notice { margin: 10px 0 14px; padding: 10px 14px; border-radius: 12px; font-size: 11.5px; line-height: 1.6;
  display: flex; gap: 10px; align-items: flex-start; }
.dst-notice.is-ok { border: 1px solid rgba(162,211,50,0.4); background: rgba(162,211,50,0.07); color: #CFE9A0; }
.dst-notice.is-bad { border: 1px solid rgba(216,43,34,0.45); background: rgba(216,43,34,0.08); color: #F4A9A3; }
.dst-notice button { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; font-size: 13px; }

.dst-group { margin-top: 18px; }
.dst-group-head { display: flex; align-items: baseline; gap: 8px; padding: 0 4px 8px; }
.dst-group-head b { font-size: 13px; font-weight: 600; }
.dst-group-head span { font-size: 10.5px; color: rgba(227,229,230,0.5); font-variant-numeric: tabular-nums; }

.dst-table { border: 1px solid var(--dst-line); border-radius: 14px; overflow: hidden; background: ${INK.card2}; }
.dst-row { display: grid; grid-template-columns: 30px minmax(0, 1fr) 92px 104px 74px; align-items: center; gap: 8px;
  padding: 9px 12px; border-top: 1px solid var(--dst-line); }
.dst-row:first-child { border-top: none; }
.dst-row.head { background: ${INK.charcoal}; font-size: 10.5px; letter-spacing: 0.06em; color: rgba(227,229,230,0.5);
  text-transform: uppercase; }
.dst-row.is-blocked { background: rgba(216,43,34,0.045); }
.dst-row input[type="checkbox"] { accent-color: ${INK.neon}; width: 15px; height: 15px; cursor: pointer; }
.dst-row input[type="checkbox"]:disabled { cursor: default; }
.dst-name { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dst-name b { font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dst-name code { font-size: 10.5px; color: rgba(227,229,230,0.45); overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; font-family: inherit; }
.dst-badge { justify-self: start; font-size: 10px; border-radius: 999px; padding: 3px 9px; border: 1px solid; white-space: nowrap; }
.dst-badge i { font-style: normal; margin-right: 4px; font-weight: 700; }
.dst-badge.instant { color: ${INK.neon}; border-color: rgba(162,211,50,0.45); background: rgba(162,211,50,0.08); }
.dst-badge.rebuild { color: #7FB8E8; border-color: rgba(127,184,232,0.4); background: rgba(127,184,232,0.08); }
.dst-badge.caution { color: ${INK.amber}; border-color: rgba(224,169,59,0.45); background: rgba(224,169,59,0.08); }
.dst-badge.blocked { color: #F4786F; border-color: rgba(216,43,34,0.5); background: rgba(216,43,34,0.1); }
.dst-size { text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; color: rgba(227,229,230,0.86); }
.dst-act { justify-self: end; }
.dst-link { background: none; border: none; color: rgba(227,229,230,0.55); font-size: 11px; cursor: pointer; padding: 2px 4px; }
.dst-link:hover { color: ${INK.neon}; }
.dst-reason { grid-column: 2 / -1; font-size: 10.5px; color: rgba(227,229,230,0.42); padding-left: 36px; margin-top: -2px; }
.dst-empty { padding: 40px 20px; text-align: center; font-size: 12px; color: rgba(227,229,230,0.45); }

.dst-mask { position: fixed; inset: 0; z-index: 60; background: rgba(10,11,13,0.72); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 24px; }
.dst-modal { width: min(620px, 100%); max-height: 82vh; overflow-y: auto; border-radius: 16px; border: 1px solid var(--dst-line);
  background: ${INK.charcoal}; padding: 20px 22px; box-shadow: 0 24px 60px -24px #000; }
.dst-modal h3 { margin: 0 0 8px; font-size: 15px; }
.dst-modal p { margin: 0 0 12px; font-size: 12px; line-height: 1.7; color: rgba(227,229,230,0.7); }
.dst-modal ul { margin: 0 0 14px; padding: 10px 12px 10px 26px; border-radius: 10px; background: rgba(20,22,25,0.7);
  font-size: 11px; line-height: 1.8; color: rgba(227,229,230,0.62); max-height: 200px; overflow-y: auto; }
.dst-modal li b { color: ${INK.mist}; font-weight: 600; }
.dst-modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
.dst-warn { border-radius: 10px; border: 1px solid rgba(216,43,34,0.35); background: rgba(216,43,34,0.07);
  padding: 9px 12px; font-size: 11px; color: #F4A9A3; margin-bottom: 14px; }

@media (max-width: 760px) { .dst-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dst-row { grid-template-columns: 26px minmax(0, 1fr) 80px 56px; } .dst-badge { display: none; } }
`

    const T = {
      zh: {
        'meta.title': 'DSH 存储管家',
        'meta.description': '统计 DSH 本体、数据目录、系统应用数据与工作区临时产物的占用，并把可清理项移入回收站。',
        'entry.label': '存储',
        'title': 'DSH 存储管家',
        'sub': '本体 + 数据目录 + 应用数据 + 工作区临时产物；删除走回收站，可还原。',
        'total': '合计占用',
        'tier.instant': '放心删',
        'tier.rebuild': '可重建',
        'tier.caution': '需确认',
        'tier.blocked': '禁止删除',
        'tierDesc.instant': '缓存、日志、临时残留、旧备份；删除零代价，需要时自动重建',
        'tierDesc.rebuild': '依赖与构建产物；删除后需重新安装/构建才能恢复',
        'tierDesc.caution': '会话、附件、登录态、模型；有实质代价，逐项确认后再删',
        'tierDesc.blocked': 'DSH 本体、运行时、凭据、规则文件；删除会让 DSH 失效或丢数据',
        'items': '项',
        'selectAllTier': '全选该级',
        'groupTier': '按等级分组',
        'groupCategory': '按位置分组',
        'filter.all': '全部',
        'scan': '扫描',
        'scanning': '扫描中…',
        'clean': '清理所选',
        'cleanN': '清理所选（{n} 项 · {size}）',
        'open': '定位',
        'empty': '还没有扫描结果。点「扫描」开始统计。',
        'group.install': 'DSH 本体（安装目录）',
        'group.home': 'DSH 数据目录（~/.dsh）',
        'group.appdata': '系统应用数据',
        'group.workspace': '工作区临时产物',
        'group.outputs': '产出物',
        'group.skills': '技能',
        'group.plugins': '插件',
        'group.instant': '🟢 放心删',
        'group.rebuild': '🩹 可重建',
        'group.caution': '🟡 需确认',
        'group.blocked': '🔴 禁止删除',
        'col.item': '条目',
        'col.size': '占用',
        'col.tier': '等级',
        'safety.instant': '放心删',
        'safety.rebuild': '可重建',
        'safety.caution': '需确认',
        'safety.blocked': '禁止删除',
        'confirm.title': '移入回收站？',
        'confirm.body': '以下 {n} 项将移入 Windows 回收站，释放约 {size}。回收站未清空之前都可以还原。',
        'confirm.warn': '含「需确认」级条目时请逐项核对；仍在使用的目录（如进行中的 bash 会话）请先停用。',
        'confirm.cancel': '取消',
        'confirm.ok': '移入回收站',
        'confirm.busy': '处理中…',
        'notice.cleaned': '已移入回收站 {n} 项，释放 {size}。',
        'notice.failed': '{n} 项失败，展开查看原因。',
        'notice.cleanedSome': '已移入回收站 {ok} 项（{size}），{bad} 项失败。',
        'notice.scanFailed': '扫描失败：{msg}',
        'notice.cleanFailed': '清理失败：{msg}',
        'progress': '正在统计',
        'scanAge': '上次扫描 {age} 前',
        'disk.free': '剩余 {free}',
        'unverified': '',
      },
      en: {
        'meta.title': 'DSH Storage Butler',
        'meta.description': 'Measures DSH itself, its home data, system app data and workspace leftovers, and moves cleanable items to the Recycle Bin.',
        'entry.label': 'Storage',
        'title': 'DSH Storage Butler',
        'sub': 'Install + home data + app data + workspace leftovers. Deletion goes to the Recycle Bin.',
        'total': 'Total footprint',
        'tier.instant': 'Instant',
        'tier.rebuild': 'Rebuildable',
        'tier.caution': 'Confirm first',
        'tier.blocked': 'Protected',
        'tierDesc.instant': 'Caches, logs, temp leftovers, old backups. Zero cost, rebuilt automatically.',
        'tierDesc.rebuild': 'Dependencies and build output. Restored by reinstalling/rebuilding.',
        'tierDesc.caution': 'Sessions, attachments, logins, models. Real cost — confirm each item.',
        'tierDesc.blocked': 'DSH itself, runtimes, credentials, rule files. Removing breaks DSH or loses data.',
        'items': 'items',
        'selectAllTier': 'Select all in tier',
        'groupTier': 'Group by tier',
        'groupCategory': 'Group by location',
        'filter.all': 'All',
        'scan': 'Scan',
        'scanning': 'Scanning…',
        'clean': 'Clean selected',
        'cleanN': 'Clean {n} · {size}',
        'open': 'Reveal',
        'empty': 'No scan yet. Press “Scan”.',
        'group.install': 'DSH install directory',
        'group.home': 'DSH home (~/.dsh)',
        'group.appdata': 'System app data',
        'group.workspace': 'Workspace leftovers',
        'group.outputs': 'Outputs',
        'group.skills': 'Skills',
        'group.plugins': 'Plugins',
        'group.instant': 'Instant',
        'group.rebuild': 'Rebuildable',
        'group.caution': 'Confirm first',
        'group.blocked': 'Protected',
        'col.item': 'Item',
        'col.size': 'Size',
        'col.tier': 'Tier',
        'safety.instant': 'instant',
        'safety.rebuild': 'rebuild',
        'safety.caution': 'confirm',
        'safety.blocked': 'protected',
        'confirm.title': 'Move to Recycle Bin?',
        'confirm.body': '{n} items (~{size}) go to the Windows Recycle Bin. Restorable until the bin is emptied.',
        'confirm.warn': 'Check “confirm first” items individually. Stop anything still in use first.',
        'confirm.cancel': 'Cancel',
        'confirm.ok': 'Move to Recycle Bin',
        'confirm.busy': 'Working…',
        'notice.cleaned': 'Moved {n} items to the Recycle Bin ({size} reclaimed).',
        'notice.failed': '{n} failed.',
        'notice.cleanedSome': 'Moved {ok} ({size}); {bad} failed.',
        'notice.scanFailed': 'Scan failed: {msg}',
        'notice.cleanFailed': 'Clean failed: {msg}',
        'progress': 'Measuring',
        'scanAge': 'scanned {age} ago',
        'disk.free': '{free} free',
        'unverified': '',
      },
    }

    let activeLocale = 'zh'
    function dict() {
      return T[currentLocale()] ?? T.zh
    }
    function currentLocale() {
      return T[activeLocale] === undefined ? 'zh' : activeLocale
    }
    function tr(key, vars) {
      let text = dict()[key] ?? T.zh[key] ?? key
      if (vars !== undefined) {
        for (const [name, value] of Object.entries(vars)) text = text.replace(`{${name}}`, String(value))
      }
      return text
    }

    function fmtBytes(bytes) {
      const n = Number(bytes) || 0
      if (n < 1024) return `${n} B`
      const units = ['KB', 'MB', 'GB', 'TB']
      let value = n / 1024
      let index = 0
      while (value >= 1024 && index < units.length - 1) {
        value /= 1024
        index += 1
      }
      return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`
    }

    function fmtAge(ms) {
      const minutes = Math.max(0, Math.floor(ms / 60000))
      if (minutes < 1) return '几秒'
      if (minutes < 60) return `${minutes} 分钟`
      return `${Math.floor(minutes / 60)} 小时`
    }

    // 等级标签（与宿主 TIERS 对齐；宿主返回 tiers 时以其为准）。
    const TIER_FALLBACK = [
      { id: 'instant', label: '放心删', en: 'Instant', icon: '✓' },
      { id: 'rebuild', label: '可重建', en: 'Rebuildable', icon: '↻' },
      { id: 'caution', label: '需确认', en: 'Confirm first', icon: '!' },
      { id: 'blocked', label: '禁止删除', en: 'Protected', icon: '✕' },
    ]

    async function getState() {
      const response = await fetch(`${BASE}/state`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`state ${response.status}`)
      return response.json()
    }

    async function postJson(path, body) {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
      return payload
    }

    function StyleTag() {
      return h('style', { 'data-dsh-storage': '1' }, CSS)
    }

    function PanelIcon({ size = 16, active = false }) {
      const tone = active ? INK.neon : 'rgba(227,229,230,0.78)'
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true,
        style: { display: 'block', overflow: 'visible' },
      },
        h('circle', { cx: 12, cy: 12, r: 8.6, fill: 'none', stroke: tone, strokeWidth: 1.5 }),
        h('path', { d: 'M12 3.4 A 8.6 8.6 0 0 1 20.4 14', fill: 'none', stroke: active ? INK.neon : INK.moss, strokeWidth: 2.4, strokeLinecap: 'round' }),
        h('circle', { cx: 12, cy: 12, r: 3.1, fill: 'none', stroke: tone, strokeWidth: 1.3, opacity: 0.75 }),
      )
    }

    function StoragePanel() {
      const [state, setState] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [filter, setFilter] = React.useState('all')
      const [groupBy, setGroupBy] = React.useState('category')
      const [tierFilter, setTierFilter] = React.useState(null)
      const [selection, setSelection] = React.useState(() => new Set())
      const [confirmOpen, setConfirmOpen] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [notice, setNotice] = React.useState(null)

      const refresh = React.useCallback(async () => {
        try {
          const next = await getState()
          setState(next)
          setError(null)
          return next
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
          return null
        }
      }, [])

      const startScan = React.useCallback(async () => {
        setBusy(true)
        setNotice(null)
        try {
          await postJson(`${BASE}/scan`, {})
          await refresh()
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setBusy(false)
        }
      }, [refresh])

      // First paint: load cached state, and start a scan when nothing is cached yet.
      React.useEffect(() => {
        void (async () => {
          const next = await refresh()
          if (next !== null && next.result === null && (next.job === null || next.job.status !== 'running')) {
            await startScan()
          }
        })()
      }, [refresh, startScan])

      // While the host reports a running job, follow its progress.
      const running = state?.job?.status === 'running'
      React.useEffect(() => {
        if (!running) return undefined
        const timer = setInterval(() => { void refresh() }, 900)
        return () => clearInterval(timer)
      }, [running, refresh])

      const result = state?.result ?? null
      const tiers = (result?.tiers !== undefined && Array.isArray(result.tiers) && result.tiers.length > 0)
        ? result.tiers
        : TIER_FALLBACK
      const tierOf = (safety) => tiers.find((tier) => tier.id === safety) ?? { id: safety ?? 'caution', label: safety, icon: '?' }

      const items = result?.items ?? []
      const visible = items
        .filter((item) => filter === 'all' || item.category === filter)
        .filter((item) => tierFilter === null || item.safety === tierFilter)
      const selectedItems = visible.filter((item) => selection.has(item.id))
      const selectedBytes = selectedItems.reduce((sum, item) => sum + item.size, 0)

      const groups = []
      if (groupBy === 'tier') {
        const byTier = new Map()
        for (const item of visible) {
          if (!byTier.has(item.safety)) byTier.set(item.safety, [])
          byTier.get(item.safety).push(item)
        }
        for (const tier of tiers) {
          const list = byTier.get(tier.id)
          if (list === undefined || list.length === 0) continue
          list.sort((a, b) => b.size - a.size)
          groups.push({ key: tier.id, list, bytes: list.reduce((sum, item) => sum + item.size, 0) })
        }
      } else {
        const byCategory = new Map()
        for (const item of visible) {
          if (!byCategory.has(item.category)) byCategory.set(item.category, [])
          byCategory.get(item.category).push(item)
        }
        for (const category of ['install', 'home', 'appdata', 'workspace', 'outputs', 'skills', 'plugins']) {
          const list = byCategory.get(category)
          if (list === undefined || list.length === 0) continue
          list.sort((a, b) => b.size - a.size)
          groups.push({ key: category, list, bytes: list.reduce((sum, item) => sum + item.size, 0) })
        }
      }

      function toggle(id) {
        setSelection((previous) => {
          const next = new Set(previous)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }

      function toggleAll(ids) {
        setSelection((previous) => {
          const next = new Set(previous)
          const allOn = ids.length > 0 && ids.every((id) => next.has(id))
          for (const id of ids) {
            if (allOn) next.delete(id)
            else next.add(id)
          }
          return next
        })
      }

      async function doClean() {
        setBusy(true)
        try {
          const ids = [...selection]
          const payload = await postJson(`${BASE}/clean`, { ids, confirm: true })
          const cleaned = payload.cleaned ?? []
          const failed = payload.failed ?? []
          if (failed.length === 0) {
            setNotice({ kind: 'ok', text: tr('notice.cleaned', { n: cleaned.length, size: fmtBytes(payload.bytes) }), detail: null })
          } else if (cleaned.length === 0) {
            setNotice({ kind: 'bad', text: tr('notice.failed', { n: failed.length }), detail: failed.map((f) => `${f.path} — ${f.error}`).join('\n') })
          } else {
            setNotice({ kind: 'bad', text: tr('notice.cleanedSome', { ok: cleaned.length, size: fmtBytes(payload.bytes), bad: failed.length }), detail: failed.map((f) => `${f.path} — ${f.error}`).join('\n') })
          }
          setSelection(new Set())
          setConfirmOpen(false)
          await refresh()
          await startScan()
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause)
          setNotice({ kind: 'bad', text: tr('notice.cleanFailed', { msg: message }), detail: null })
        } finally {
          setBusy(false)
        }
      }

      async function reveal(id) {
        try {
          await postJson(`${BASE}/open`, { id })
        } catch {
          /* Explorer failing to open is not worth a modal */
        }
      }

      function safetyLabel(safety) {
        return tr(`safety.${safety}`)
      }

      const tierClass = (safety) => (tiers.some((tier) => tier.id === safety) ? safety : 'caution')
      const diskChips = (state?.disks ?? []).map((disk) => h('span', { key: disk.drive, className: 'dst-disk' },
        `${disk.drive} ${tr('disk.free', { free: fmtBytes(disk.free) })}`))

      const job = state?.job
      const jobPercent = job !== null && job !== undefined && job.total > 0 ? Math.round((job.done / job.total) * 100) : 0

      return h('div', { className: 'dst-root' },
        h(StyleTag),
        h('div', { className: 'dst-page' },
          h('div', { className: 'dst-head' },
            h('div', { className: 'dst-head-main' },
              h('div', { className: 'dst-eyebrow' }, h('i', { className: 'dst-dot' }), 'DSH STORAGE'),
              h('h1', { className: 'dst-title' }, tr('title')),
              h('div', { className: 'dst-sub' }, tr('sub')),
            ),
            h('div', { className: 'dst-head-side' },
              h('div', { className: 'dst-total' },
                h('b', null, result === null ? '—' : fmtBytes(result.totals.all)),
                h('span', null, tr('total')),
              ),
              h('div', { className: 'dst-disks' }, diskChips),
            ),
          ),

          h('div', { className: 'dst-cards' },
            tiers.map((tier) => h('div', {
              key: tier.id,
              className: `dst-card t-${tier.id} is-clickable${tierFilter === tier.id ? ' is-active' : ''}`,
              title: tier.description ?? tr(`tierDesc.${tier.id}`),
              onClick: () => setTierFilter((previous) => (previous === tier.id ? null : tier.id)),
            },
              h('span', { className: 'dst-card-tag' }, `${tier.icon ?? ''} ${tr(`tier.${tier.id}`)}`),
              h('b', null, result === null ? '—' : fmtBytes(result.totals[tier.id])),
              h('small', null, `${result === null ? 0 : (result.counts[tier.id] ?? 0)} ${tr('items')}`),
            )),
            h('div', { className: 'dst-card' },
              h('b', null, fmtBytes(state?.disks?.reduce((sum, disk) => sum + disk.free, 0) ?? 0)),
              h('small', null, '磁盘剩余（合计）'),
            ),
          ),

          h('div', { className: 'dst-bar' },
            ['all', 'install', 'home', 'appdata', 'workspace', 'outputs', 'skills', 'plugins'].map((key) => h('button', {
              key, type: 'button', className: `dst-chip${filter === key ? ' is-on' : ''}`,
              onClick: () => setFilter(key),
            }, key === 'all' ? tr('filter.all') : tr(`group.${key}`))),
            h('div', { className: 'dst-gap' }),
            tierFilter !== null && h('button', {
              type: 'button', className: 'dst-chip is-on',
              onClick: () => setTierFilter(null),
            }, `${tierOf(tierFilter).icon ?? ''} ${tr(`tier.${tierFilter}`)} ×`),
            h('button', {
              type: 'button', className: `dst-chip${groupBy === 'tier' ? ' is-on' : ''}`,
              onClick: () => setGroupBy((previous) => (previous === 'tier' ? 'category' : 'tier')),
            }, groupBy === 'tier' ? tr('groupCategory') : tr('groupTier')),
            result !== null && h('span', { className: 'dst-sub' }, tr('scanAge', { age: fmtAge(state.cachedMs) })),
            h('button', {
              type: 'button', className: 'dst-btn', disabled: busy || running,
              onClick: () => { void startScan() },
            }, running ? tr('scanning') : tr('scan')),
            h('button', {
              type: 'button', className: 'dst-btn is-danger',
              disabled: busy || selectedItems.length === 0,
              onClick: () => setConfirmOpen(true),
            }, tr('cleanN', { n: selectedItems.length, size: fmtBytes(selectedBytes) })),
          ),

          running && h('div', { className: 'dst-progress' },
            h('span', null, `${tr('progress')} ${job.done}/${job.total}`),
            h('div', { className: 'dst-progress-bar' }, h('div', { className: 'dst-progress-fill', style: { width: `${jobPercent}%` } })),
            h('span', null, job.current ?? ''),
          ),

          error !== null && h('div', { className: 'dst-notice is-bad' },
            h('span', null, error),
            h('button', { type: 'button', onClick: () => setError(null) }, '×'),
          ),

          notice !== null && h('div', { className: `dst-notice ${notice.kind === 'ok' ? 'is-ok' : 'is-bad'}` },
            h('div', null,
              h('div', null, notice.text),
              notice.detail !== null && h('pre', { style: { margin: '6px 0 0', fontSize: 10.5, whiteSpace: 'pre-wrap', opacity: 0.8 } }, notice.detail),
            ),
            h('button', { type: 'button', onClick: () => setNotice(null) }, '×'),
          ),

          result === null && running === false && h('div', { className: 'dst-empty' }, tr('empty')),

          groups.map((group) => {
            const ids = group.list.filter((item) => item.safety !== 'blocked').map((item) => item.id)
            const allOn = ids.length > 0 && ids.every((id) => selection.has(id))
            const tier = groupBy === 'tier' ? tierOf(group.key) : null
            return h('div', { key: `${groupBy}:${group.key}`, className: 'dst-group' },
              h('div', { className: 'dst-group-head' },
                tier !== null
                  ? h('span', { className: `dst-badge ${tierClass(tier.id)}` }, `${tier.icon ?? ''} ${tr(`tier.${tier.id}`)}`)
                  : null,
                h('b', null, tr(`group.${group.key}`)),
                h('span', null, `${group.list.length} ${tr('items')} · ${fmtBytes(group.bytes)}`),
              ),
              h('div', { className: 'dst-table' },
                h('div', { className: 'dst-row head' },
                  h('input', {
                    type: 'checkbox', 'aria-label': 'select all',
                    checked: allOn,
                    onChange: () => toggleAll(ids),
                  }),
                  h('span', null, tr('col.item')),
                  h('span', null, tr('col.tier')),
                  h('span', null, tr('col.size')),
                  h('span', null, ''),
                ),
                group.list.flatMap((item) => {
                  const itemTier = tierOf(item.safety)
                  return [
                    h('div', { key: item.id, className: `dst-row${item.safety === 'blocked' ? ' is-blocked' : ''}` },
                      h('input', {
                        type: 'checkbox', 'aria-label': item.label,
                        checked: selection.has(item.id),
                        disabled: item.safety === 'blocked',
                        onChange: () => toggle(item.id),
                      }),
                      h('div', { className: 'dst-name' },
                        h('b', { title: item.path }, item.label),
                        h('code', { title: item.path }, item.path),
                      ),
                      h('span', { className: `dst-badge ${tierClass(item.safety)}` },
                        h('i', null, itemTier.icon ?? ''),
                        safetyLabel(item.safety)),
                      h('span', { className: 'dst-size' }, fmtBytes(item.size)),
                      h('div', { className: 'dst-act' },
                        h('button', { type: 'button', className: 'dst-link', onClick: () => { void reveal(item.id) } }, tr('open')),
                      ),
                    ),
                    item.reason !== undefined && item.reason !== '' && h('div', { key: `${item.id}-reason`, className: 'dst-reason' }, item.reason),
                  ]
                }),
              ),
            )
          }),

          confirmOpen && h('div', { className: 'dst-mask', onClick: (event) => { if (event.target === event.currentTarget) setConfirmOpen(false) } },
            h('div', { className: 'dst-modal', role: 'dialog', 'aria-modal': true },
              h('h3', null, tr('confirm.title')),
              h('p', null, tr('confirm.body', { n: selectedItems.length, size: fmtBytes(selectedBytes) })),
              h('div', { className: 'dst-warn' }, tr('confirm.warn')),
              h('ul', null, selectedItems.slice(0, 40).map((item) => h('li', { key: item.id },
                h('b', null, item.label), ` — ${fmtBytes(item.size)}`, item.safety === 'caution' ? h('b', { style: { color: INK.amber } }, ' · 需确认') : null,
              ))),
              selectedItems.length > 40 && h('p', null, `… 另有 ${selectedItems.length - 40} 项`),
              h('div', { className: 'dst-modal-actions' },
                h('button', { type: 'button', className: 'dst-btn', disabled: busy, onClick: () => setConfirmOpen(false) }, tr('confirm.cancel')),
                h('button', { type: 'button', className: 'dst-btn is-danger', disabled: busy, onClick: () => { void doClean() } },
                  busy ? tr('confirm.busy') : tr('confirm.ok')),
              ),
            )),
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, T), 'dsh-storage: dictionaries')

        const locale = ctx.get('locale')
        const syncLocale = () => {
          try {
            activeLocale = locale.getSnapshot().active
          } catch {
            activeLocale = 'zh'
          }
        }
        syncLocale()
        ctx.effect(() => ctx.on('locale/change', syncLocale), 'dsh-storage: locale sync')

        const label = () => tr('entry.label')

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 50,
          label,
          locale: NS,
        }, PanelIcon))

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, StoragePanel))
      },
    }
  },
})