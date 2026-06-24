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
try { fs = require('fs'); } catch (e) { /* 浏览器环境，无fs */ }

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

// 加载配置
try {
  if (fs && fs.existsSync('./config.json')) {
    const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
    _config = { ..._config, ...cfg };
  }
} catch (e) { /* 使用默认配置 */ }

// 环境变量覆盖 dataDir
if (process.env.DATA_DIR) {
  _config.defaults.dataDir = process.env.DATA_DIR;
}

// 全局记忆实例管理
let _memoryInstance = null;
let _currentWorkName = 'default';

// 获取数据文件路径
function getDataPath(workName) {
  const dir = _config.defaults.dataDir || './data';
  return `${dir}/${workName || 'default'}.json`;
}

// 确保目录存在
function ensureDir(dir) {
  if (!fs) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 加载记忆数据
function loadMemory(workName) {
  const ms = MemorySkill();
  if (!fs) return ms;

  const path = getDataPath(workName);
  if (fs.existsSync(path)) {
    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
      ms.import(data);
    } catch (e) {
      console.error('加载记忆数据失败:', e.message);
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
    const data = ms.export();
    fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('保存记忆数据失败:', e.message);
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
  const { action, ...args } = params;
  const workName = args.workName || _currentWorkName || 'default';
  const ms = getMemoryInstance(workName);
  let result = { success: false, action, data: null, message: '' };

  try {
    switch (action) {
      // ===== 初始化类 =====
      case 'init_work':
        _memoryInstance = MemorySkill();
        if (args.workName) {
          _memoryInstance.setTitle(args.workName);
          _currentWorkName = args.workName;
        }
        if (_config.defaults.autoSave && fs) {
          saveMemory(_memoryInstance, _currentWorkName);
        }
        result.success = true;
        result.message = `作品「${_currentWorkName}」记忆库已初始化${fs ? '并持久化' : ''}`;
        break;

      // ===== 写入类 =====
      case 'record_chapter':
        ms.recordChapter(args.chapterIdx, args.summary);
        if (args.characters) {
          args.characters.forEach(c => {
            ms.recordCharacter(c.name, c.role || _config.defaults.characterRole, {
              chapter: args.chapterIdx,
              status: c.status || '',
              location: c.location || '',
              emotion: c.emotion || '',
              milestone: c.milestone || ''
            });
            ms.recordCharacterState(c.name, args.chapterIdx, c);
          });
        }
        if (args.foreshadows) {
          args.foreshadows.forEach(f => {
            ms.recordForeshadow(args.chapterIdx, f.text, f.status || _config.defaults.foreshadowStatus);
          });
        }
        if (args.items) {
          args.items.forEach(item => {
            ms.recordItem(item.name, item.owner || '', args.chapterIdx, item.description || '');
          });
        }
        if (args.factions) {
          args.factions.forEach(f => {
            ms.recordFaction(f.name, f.leader || '', f.members || [], args.chapterIdx, f.status || '');
          });
        }
        // 自动更新滚动摘要
        ms.updateRollingSummary(args.chapterIdx, args.summary || '');

        if (_config.defaults.autoSave && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `第${args.chapterIdx + 1}章记忆已归档`;
        break;

      case 'record_character':
        ms.recordCharacter(args.name, args.role || _config.defaults.characterRole, args.info || {});
        if (args.info && args.info.chapter != null) {
          ms.recordCharacterState(args.name, args.info.chapter, args.info);
        }
        if (_config.defaults.autoSave && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `角色「${args.name}」档案已更新`;
        break;

      case 'record_foreshadow':
        ms.recordForeshadow(args.chapterIdx, args.text, args.status || _config.defaults.foreshadowStatus);
        if (_config.defaults.autoSave && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `伏笔已记录`;
        break;

      case 'record_item':
        ms.recordItem(args.name, args.owner || '', args.chapterIdx || 0, args.description || '');
        if (_config.defaults.autoSave && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `道具「${args.name}」已记录`;
        break;

      case 'record_faction':
        ms.recordFaction(args.name, args.leader || '', args.members || [], args.chapterIdx || 0, args.status || '');
        if (_config.defaults.autoSave && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `势力「${args.name}」已记录`;
        break;

      case 'add_anchor':
        ms.remember(args.category, args.text, args.options || {});
        if (_config.defaults.autoSave && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `记忆锚点已写入`;
        break;

      // ===== 自动归档 =====
      case 'auto_archive':
        ms.autoArchive(
          args.chapterIdx,
          args.fullText || '',
          args.extracted || {}
        );
        if (_config.defaults.autoSave && fs) saveMemory(ms, workName);
        result.success = true;
        result.message = `第${args.chapterIdx + 1}章自动归档完成`;
        break;

      // ===== 检索类 =====
      case 'load_base':
        result.data = {
          title: ms._meta.title,
          totalChapters: ms._meta.totalChapters,
          characters: ms._characterProfiles,
          coreFacts: ms._anchors.core,
          factions: ms._factionGraph,
          locations: ms._anchors.locations,
          items: ms._anchors.items,
          relationships: ms._anchors.relationships,
          rollingSummary: ms._rollingSummary
        };
        result.success = true;
        break;

      case 'get_recent_context':
        const limit = args.limit || _config.defaults.recentContextLimit || 4;
        result.data = ms._chapterIndex.slice(-limit).map(c => ({
          chapter: c.chapterIdx,
          summary: c.summary
        }));
        result.success = true;
        break;

      case 'search_character':
        const profile = ms._characterProfiles[args.name];
        const trajectory = ms.getCharacterTrajectory(args.name);
        result.data = profile ? {
          name: args.name,
          role: ms._charRoles[args.name] || '未知',
          profile: profile,
          trajectory: trajectory,
          relatedAnchors: Object.keys(ms._anchors).reduce((acc, key) => {
            acc[key] = ms._anchors[key].filter(a =>
              (a.text || '').indexOf(args.name) >= 0 || (a.charName || '').indexOf(args.name) >= 0
            );
            return acc;
          }, {})
        } : null;
        result.success = !!profile;
        result.message = profile ? `已找到角色「${args.name}」` : `未找到角色「${args.name}」`;
        break;

      case 'search_foreshadows':
        let foreshadows = ms._foreshadowLedger;
        if (args.status && args.status !== '全部') {
          foreshadows = foreshadows.filter(f => f.status === args.status);
        }
        if (args.overdueOnly) {
          const latest = ms._chapterIndex.length > 0 ? ms._chapterIndex[ms._chapterIndex.length - 1].chapterIdx : 0;
          foreshadows = foreshadows.filter(f => f.status !== '已解' && latest - f.chapterIdx > _config.thresholds.foreshadowOverdueChapters);
        }
        result.data = foreshadows;
        result.success = true;
        result.message = `找到${foreshadows.length}个伏笔`;
        break;

      case 'search_by_keyword':
        // 优先使用V2 Jaccard检索
        if (typeof ms.searchByKeywordV2 === 'function') {
          result.data = ms.searchByKeywordV2(args.keyword, args.maxResults || _config.thresholds.maxSearchResults);
        } else {
          // 降级到基础检索
          const keyword = args.keyword;
          const matches = [];
          Object.keys(ms._anchors).forEach(key => {
            ms._anchors[key].forEach(a => {
              if ((a.text || '').indexOf(keyword) >= 0) {
                matches.push({ category: key, ...a });
              }
            });
          });
          ms._chapterIndex.forEach(c => {
            if (c.summary.indexOf(keyword) >= 0) {
              matches.push({ category: 'chapter', chapterIdx: c.chapterIdx, text: c.summary });
            }
          });
          result.data = matches.slice(0, _config.thresholds.maxSearchResults);
        }
        result.success = true;
        result.message = `找到${result.data.length}条匹配`;
        break;

      case 'get_rolling_summary':
        result.data = ms._rollingSummary;
        result.success = true;
        break;

      case 'get_character_trajectory':
        result.data = ms.getCharacterTrajectory(args.name);
        result.success = true;
        result.message = `角色「${args.name}」轨迹共${result.data.length}条记录`;
        break;

      // ===== 分析类 =====
      case 'full_analysis':
        result.data = ms.fullAnalysis();
        result.success = true;
        break;

      case 'check_consistency':
        // 优先使用V2矛盾检测
        if (typeof ms._reasoning.detectContradictionsV2 === 'function') {
          const charCheck = ms.consistency.fullCheck();
          result.data = {
            ...charCheck,
            contradictions: ms._reasoning.detectContradictionsV2(ms)
          };
        } else {
          result.data = ms.consistency.fullCheck();
        }
        result.success = true;
        break;

      case 'get_writing_advice':
        result.data = ms.advisor.generate();
        result.success = true;
        break;

      case 'track_emotion':
        result.data = ms.trackEmotion(args.charName);
        result.success = true;
        break;

      // ===== 管理类 =====
      case 'snapshot':
        const snapId = ms.snapshot(args.label || '手动快照');
        if (_config.defaults.autoSave && fs) saveMemory(ms, workName);
        result.data = { snapshotId: snapId };
        result.success = true;
        result.message = `快照已创建`;
        break;

      case 'rollback':
        const rolled = ms.rollback(args.snapshotId);
        if (rolled && _config.defaults.autoSave && fs) saveMemory(ms, workName);
        result.success = rolled;
        result.message = rolled ? `已回滚` : '回滚失败';
        break;

      case 'export':
        result.data = ms.export();
        result.success = true;
        result.message = '记忆数据导出完成';
        break;

      case 'import':
        if (args.data) {
          ms.import(args.data);
          if (_config.defaults.autoSave && fs) saveMemory(ms, workName);
          result.success = true;
          result.message = '记忆数据导入完成';
        } else {
          result.message = '缺少data参数';
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
        if (args.workName) {
          _memoryInstance = loadMemory(args.workName);
          _currentWorkName = args.workName;
          result.success = true;
          result.message = `已切换到作品「${args.workName}」`;
        } else {
          result.message = '缺少workName参数';
        }
        break;

      case 'delete_work':
        if (fs && args.workName) {
          const path = getDataPath(args.workName);
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
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
    result.message = `调用失败: ${e.message}`;
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
