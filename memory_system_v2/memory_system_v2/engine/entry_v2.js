// ==========================================================================
// entry_v2.js — memory_system Skill 统一调用入口（完整版）
// 覆盖评估文档全部9个待加强点：
// 1. 本地JSON持久化（Node环境）
// 2. 多作品分库（workName作为文件名）
// 3. 补全道具/势力/滚动摘要写入方法
// 4. Jaccard相似度检索（替代纯字符串匹配）
// 5. 实体感知的矛盾检测（V2）
// 6. 自动归档动作（auto_archive）
// 7. 滚动摘要自动生成
// 8. 角色状态历史追踪
// 9. 阈值可配置（从config.json读取）
// ==========================================================================

const MemorySkill = require('./MemorySkill_v2.js');

// 尝试加载fs模块（Node环境）
let fs = null;
let pathLib = null;
try { fs = require('fs'); pathLib = require('path'); } catch (e) { /* 浏览器环境，无fs/path */ }

// 配置
let _config = {
  thresholds: {
    foreshadowOverdueChapters: 30,
    memoryDensityLow: 2,
    memoryDensityGood: 5,
    emotionVarianceHigh: 0.5,
    emotionVarianceLow: 0.1,
    characterMissingChapters: 10,
    maxSearchResults: 20,
    maxSnapshots: 10
  },
  defaults: {
    recentContextLimit: 4,
    characterRole: '配角',
    foreshadowStatus: '未解',
    dataDir: './data',
    autoSave: true
  }
};

// 加载配置（并做深合并）
try {
  if (fs && fs.existsSync('./config.json')) {
    const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
    _config = {
      thresholds: { ..._config.thresholds, ...(cfg.thresholds || {}) },
      defaults: { ..._config.defaults, ...(cfg.defaults || {}) },
      ..._config,
      ...cfg
    };
  }
} catch (e) { /* 使用默认配置 */ }

// 环境变量覆盖 dataDir（在安全的环境下）
if (typeof process !== 'undefined' && process && process.env && process.env.DATA_DIR) {
  _config.defaults.dataDir = process.env.DATA_DIR;
}

// 全局记忆实例管理
let _memoryInstance = null;
let _currentWorkName = 'default';

// 获取数据文件路径
function getDataPath(workName) {
  const dir = _config.defaults.dataDir || './data';
  const fname = `${workName || 'default'}.json`;
  if (pathLib) return pathLib.join(dir, fname);
  return `${dir}/${fname}`;
}

// 确保目录存在
function ensureDir(dir) {
  if (!fs || !dir) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 加载记忆数据
function loadMemory(workName) {
  // MemorySkill 在 MemorySkill_v2.js 中定义了 prototype，应该作为构造函数使用
  let ms = null;
  try {
    if (typeof MemorySkill === 'function') ms = new MemorySkill();
    else ms = MemorySkill && MemorySkill.default ? new MemorySkill.default() : {};
  } catch (e) {
    ms = {};
  }

  if (!fs) return ms;

  const path = getDataPath(workName);
  if (fs.existsSync(path)) {
    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
      if (ms && typeof ms.import === 'function') ms.import(data);
    } catch (e) {
      console.error('加载记忆数据失败:', e && e.message ? e.message : e);
    }
  }
  return ms;
}

// 保存记忆数据
function saveMemory(ms, workName) {
  if (!fs) return false;

  ensureDir(_config.defaults.dataDir || './data');
  const path = getDataPath(workName);
  try {
    const data = (ms && typeof ms.export === 'function') ? ms.export() : ms;
    fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('保存记忆数据失败:', e && e.message ? e.message : e);
    return false;
  }
}

// 获取或创建记忆实例
function getMemoryInstance(workName) {
  if (!_memoryInstance || workName !== _currentWorkName) {
    _memoryInstance = loadMemory(workName);
    _currentWorkName = workName || 'default';
  }
  return _memoryInstance;
}

// 主入口
async function main(params) {
  const { action, ...args } = params || {};
  const workName = args && args.workName ? args.workName : _currentWorkName || 'default';
  const ms = getMemoryInstance(workName) || {};
  let result = { success: false, action, data: null, message: '' };

  try {
    switch (action) {
      // ===== 初始化类 =====
      case 'init_work':
        _memoryInstance = (typeof MemorySkill === 'function') ? new MemorySkill() : (MemorySkill && MemorySkill.default ? new MemorySkill.default() : {});
        if (args && args.workName && typeof _memoryInstance.setTitle === 'function') {
          _memoryInstance.setTitle(args.workName);
          _currentWorkName = args.workName;
        }
        if ((_config.defaults && _config.defaults.autoSave) && fs) {
          saveMemory(_memoryInstance, _currentWorkName);
        }
        result.success = true;
        result.message = `作品「${_currentWorkName}」记忆库已初始化${fs ? '并持久化' : ''}`;
        break;

      // ===== 写入类 =====
      case 'record_chapter': {
        const idx = Number(args && args.chapterIdx) || 0;
        if (ms && typeof ms.recordChapter === 'function') ms.recordChapter(idx, args.summary);
        if (args && Array.isArray(args.characters) && typeof ms.recordCharacter === 'function') {
          args.characters.forEach(c => {
            try {
              ms.recordCharacter(c.name, c.role || _config.defaults.characterRole, {
                chapter: idx,
                status: c.status || '',
                location: c.location || '',
                emotion: c.emotion || '',
                milestone: c.milestone || ''
              });
              if (typeof ms.recordCharacterState === 'function') ms.recordCharacterState(c.name, idx, c);
            } catch (e) { /* 忽略单个角色错误 */ }
          });
        }
        if (args && Array.isArray(args.foreshadows) && typeof ms.recordForeshadow === 'function') {
          args.foreshadows.forEach(f => {
            try { ms.recordForeshadow(idx, f.text, f.status || _config.defaults.foreshadowStatus); } catch (e) {}
          });
        }
        if (args && Array.isArray(args.items) && typeof ms.recordItem === 'function') {
          args.items.forEach(item => {
            try { ms.recordItem(item.name, item.owner || '', idx, item.description || ''); } catch (e) {}
          });
        }
        if (args && Array.isArray(args.factions) && typeof ms.recordFaction === 'function') {
          args.factions.forEach(f => {
            try { ms.recordFaction(f.name, f.leader || '', f.members || [], idx, f.status || ''); } catch (e) {}
          });
        }
        // 自动更新滚动摘要
        if (typeof ms.updateRollingSummary === 'function') ms.updateRollingSummary(idx, args.summary || '');

        if ((_config.defaults && _config.defaults.autoSave) && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `第${idx + 1}章记忆已归档`;
        break;
      }

      case 'record_character': {
        if (ms && typeof ms.recordCharacter === 'function') ms.recordCharacter(args.name, args.role || _config.defaults.characterRole, args.info || {});
        if (args.info && args.info.chapter != null && typeof ms.recordCharacterState === 'function') {
          const idx = Number(args.info.chapter) || 0;
          ms.recordCharacterState(args.name, idx, args.info);
        }
        if ((_config.defaults && _config.defaults.autoSave) && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `角色「${args.name}」档案已更新`;
        break;
      }

      case 'record_foreshadow':
        if (typeof ms.recordForeshadow === 'function') ms.recordForeshadow(Number(args.chapterIdx) || 0, args.text, args.status || _config.defaults.foreshadowStatus);
        if ((_config.defaults && _config.defaults.autoSave) && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `伏笔已记录`;
        break;

      case 'record_item':
        if (typeof ms.recordItem === 'function') ms.recordItem(args.name, args.owner || '', Number(args.chapterIdx) || 0, args.description || '');
        if ((_config.defaults && _config.defaults.autoSave) && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `道具「${args.name}」已记录`;
        break;

      case 'record_faction':
        if (typeof ms.recordFaction === 'function') ms.recordFaction(args.name, args.leader || '', args.members || [], Number(args.chapterIdx) || 0, args.status || '');
        if ((_config.defaults && _config.defaults.autoSave) && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `势力「${args.name}」已记录`;
        break;

      case 'add_anchor':
        if (typeof ms.remember === 'function') ms.remember(args.category, args.text, args.options || {});
        if ((_config.defaults && _config.defaults.autoSave) && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `记忆锚点已写入`;
        break;

      // ===== 自动归档 =====
      case 'auto_archive':
        if (typeof ms.autoArchive === 'function') {
          ms.autoArchive(Number(args.chapterIdx) || 0, args.fullText || '', args.extracted || {});
        }
        if ((_config.defaults && _config.defaults.autoSave) && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `第${(Number(args.chapterIdx) || 0) + 1}章自动归档完成`;
        break;

      // ===== 检索类 =====
      case 'load_base':
        result.data = {
          title: (ms && ms._meta && ms._meta.title) || '',
          totalChapters: (ms && ms._meta && ms._meta.totalChapters) || 0,
          characters: ms && ms._characterProfiles ? ms._characterProfiles : {},
          coreFacts: (ms && ms._anchors && ms._anchors.core) ? ms._anchors.core : [],
          factions: ms && ms._factionGraph ? ms._factionGraph : {},
          locations: (ms && ms._anchors && ms._anchors.locations) ? ms._anchors.locations : [],
          items: (ms && ms._anchors && ms._anchors.items) ? ms._anchors.items : [],
          relationships: (ms && ms._anchors && ms._anchors.relationships) ? ms._anchors.relationships : [],
          rollingSummary: ms && ms._rollingSummary ? ms._rollingSummary : ''
        };
        result.success = true;
        break;

      case 'get_recent_context': {
        const limit = Number(args.limit) || (_config.defaults && _config.defaults.recentContextLimit) || 4;
        const chapterIndex = Array.isArray(ms && ms._chapterIndex) ? ms._chapterIndex : [];
        result.data = chapterIndex.slice(-limit).map(c => ({
          chapter: c.chapterIdx,
          summary: c.summary
        }));
        result.success = true;
        break;
      }

      case 'search_character': {
        const profile = (ms && ms._characterProfiles) ? ms._characterProfiles[args.name] : null;
        const trajectory = (ms && typeof ms.getCharacterTrajectory === 'function') ? ms.getCharacterTrajectory(args.name) : [];
        const roleMap = ms && (ms._charRoles || ms._characterRoles) ? (ms._charRoles || ms._characterRoles) : {};
        result.data = profile ? {
          name: args.name,
          role: roleMap[args.name] || '未知',
          profile: profile,
          trajectory: trajectory,
          relatedAnchors: Object.keys(ms && ms._anchors ? ms._anchors : {}).reduce((acc, key) => {
            acc[key] = (ms._anchors[key] || []).filter(a =>
              ((a.text || '').indexOf(args.name) >= 0) || ((a.charName || '').indexOf(args.name) >= 0)
            );
            return acc;
          }, {})
        } : null;
        result.success = !!profile;
        result.message = profile ? `已找到角色「${args.name}」` : `未找到角色「${args.name}」`;
        break;
      }

      case 'search_foreshadows': {
        let foreshadows = Array.isArray(ms && ms._foreshadowLedger) ? ms._foreshadowLedger : [];
        if (args.status && args.status !== '全部') {
          foreshadows = foreshadows.filter(f => f.status === args.status);
        }
        if (args.overdueOnly) {
          const latest = (Array.isArray(ms && ms._chapterIndex) && ms._chapterIndex.length > 0) ? ms._chapterIndex[ms._chapterIndex.length - 1].chapterIdx : 0;
          foreshadows = foreshadows.filter(f => f.status !== '已解' && latest - (f.chapterIdx || 0) > (_config.thresholds && _config.thresholds.foreshadowOverdueChapters ? _config.thresholds.foreshadowOverdueChapters : 30));
        }
        result.data = foreshadows;
        result.success = true;
        result.message = `找到${foreshadows.length}个伏笔`;
        break;
      }

      case 'search_by_keyword': {
        // 优先使用V2 Jaccard检索
        let matches = [];
        try {
          if (ms && typeof ms.searchByKeywordV2 === 'function') {
            matches = ms.searchByKeywordV2(args.keyword, args.maxResults || (_config.thresholds && _config.thresholds.maxSearchResults) || 20) || [];
          } else {
            // 降级到基础检索
            const keyword = args.keyword || '';
            matches = [];
            Object.keys(ms && ms._anchors ? ms._anchors : {}).forEach(key => {
              (ms._anchors[key] || []).forEach(a => {
                if ((a.text || '').indexOf(keyword) >= 0) {
                  matches.push({ category: key, ...a });
                }
              });
            });
            (Array.isArray(ms && ms._chapterIndex) ? ms._chapterIndex : []).forEach(c => {
              if ((c.summary || '').indexOf(keyword) >= 0) {
                matches.push({ category: 'chapter', chapterIdx: c.chapterIdx, text: c.summary });
              }
            });
            matches = matches.slice(0, (_config.thresholds && _config.thresholds.maxSearchResults) || 20);
          }
        } catch (e) {
          matches = [];
        }
        result.data = matches;
        result.success = true;
        result.message = `找到${(result.data && result.data.length) || 0}条匹配`;
        break;
      }

      case 'get_rolling_summary':
        result.data = ms && ms._rollingSummary ? ms._rollingSummary : '';
        result.success = true;
        break;

      case 'get_character_trajectory':
        result.data = (ms && typeof ms.getCharacterTrajectory === 'function') ? ms.getCharacterTrajectory(args.name) : [];
        result.success = true;
        result.message = `角色「${args.name}」轨迹共${(result.data && result.data.length) || 0}条记录`;
        break;

      // ===== 分析类 =====
      case 'full_analysis':
        result.data = (ms && typeof ms.fullAnalysis === 'function') ? ms.fullAnalysis() : {};
        result.success = true;
        break;

      case 'check_consistency': {
        // 优先使用V2矛盾检测
        if (ms && ms._reasoning && typeof ms._reasoning.detectContradictionsV2 === 'function') {
          const charCheck = (ms && ms.consistency && typeof ms.consistency.fullCheck === 'function') ? ms.consistency.fullCheck() : {};
          result.data = {
            ...charCheck,
            contradictions: ms._reasoning.detectContradictionsV2(ms)
          };
        } else {
          result.data = (ms && ms.consistency && typeof ms.consistency.fullCheck === 'function') ? ms.consistency.fullCheck() : {};
        }
        result.success = true;
        break;
      }

      case 'get_writing_advice':
        result.data = (ms && ms.advisor && typeof ms.advisor.generate === 'function') ? ms.advisor.generate() : [];
        result.success = true;
        break;

      case 'track_emotion':
        result.data = (ms && typeof ms.trackEmotion === 'function') ? ms.trackEmotion(args.charName) : [];
        result.success = true;
        break;

      // ===== 管理类 =====
      case 'snapshot': {
        const snapId = (ms && typeof ms.snapshot === 'function') ? ms.snapshot(args.label || '手动快照') : null;
        if ((_config.defaults && _config.defaults.autoSave) && fs) saveMemory(ms, workName);
        result.data = { snapshotId: snapId };
        result.success = true;
        result.message = `快照已创建`;
        break;
      }

      case 'rollback': {
        const rolled = (ms && typeof ms.rollback === 'function') ? ms.rollback(args.snapshotId) : false;
        if (rolled && (_config.defaults && _config.defaults.autoSave) && fs) saveMemory(ms, workName);
        result.success = !!rolled;
        result.message = rolled ? `已回滚` : '回滚失败';
        break;
      }

      case 'export':
        result.data = (ms && typeof ms.export === 'function') ? ms.export() : ms;
        result.success = true;
        result.message = '记忆数据导出完成';
        break;

      case 'import':
        if (args && args.data && ms && typeof ms.import === 'function') {
          ms.import(args.data);
          if ((_config.defaults && _config.defaults.autoSave) && fs) saveMemory(ms, workName);
          result.success = true;
          result.message = '记忆数据导入完成';
        } else {
          result.message = '缺少data参数或导入函数不可用';
        }
        break;

      case 'list_works':
        if (fs) {
          const dir = _config.defaults.dataDir || './data';
          ensureDir(dir);
          const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
          result.data = files.map(f => f.replace('.json', ''));
        } else {
          result.data = [workName];
        }
        result.success = true;
        result.message = `共${result.data.length}个作品库`;
        break;

      case 'switch_work':
        if (args && args.workName) {
          _memoryInstance = loadMemory(args.workName);
          _currentWorkName = args.workName;
          result.success = true;
          result.message = `已切换到作品「${args.workName}」`;
        } else {
          result.message = '缺少workName参数';
        }
        break;

      case 'delete_work':
        if (fs && args && args.workName) {
          const p = getDataPath(args.workName);
          if (fs.existsSync(p)) {
            fs.unlinkSync(p);
            result.success = true;
            result.message = `作品「${args.workName}」已删除`;
          } else {
            result.message = '作品不存在';
          }
        } else {
          result.message = fs ? '缺少workName参数' : '浏览器环境不支持删除';
        }
        break;

      default:
        result.message = `未知动作: ${action}`;
    }

    return result;
  } catch (e) {
    // 返回更详细的错误信息以便调试，但避免泄露敏感数据
    result.message = `调用失败: ${e && e.message ? e.message : e}`;
    result.debug = (e && e.stack) ? e.stack : null;
    return result;
  }
}

// 获取当前实例
function getInstance() {
  return getMemoryInstance(_currentWorkName);
}

// 获取当前作品名
function getCurrentWorkName() {
  return _currentWorkName;
}

module.exports = { main, getInstance, getCurrentWorkName };
