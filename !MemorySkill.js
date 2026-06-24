// ==========================================================================
// !MemorySkill.js — 独立记忆推理引擎（零依赖，单文件即用）
// 不依赖任何外部代码，内置完整记忆存储与推理体系
// ==========================================================================
// 使用方式：
//   1. 引入本文件即可：<script src="!MemorySkill.js"></script>
//   2. 创建实例：        const ms = new MemorySkill();
//   3. 写入记忆：        ms.remember('角色', '张三', { chapter: 1, text: '张三登场，是一位剑客' });
//   4. 推理分析：        ms.reasoning.detectPatterns();
//   5. 一键全分析：      ms.fullAnalysis();
// ==========================================================================

var MemorySkill = (function () {
  'use strict';

  // ==========================================================================
  // === PART 0：核心记忆存储 ==================================================
  // ==========================================================================

  function MemorySkill() {
    // 记忆锚点分类存储
    this._anchors = {
      core: [],           // 核心事实
      characterTags: [],  // 角色标志
      relationships: [],  // 关系变化
      items: [],          // 道具
      locations: [],      // 地点
      promises: [],       // 承诺禁忌
      timeline: [],       // 时间线
      hooks: [],          // 钩子/爽点
      emotionTrack: [],   // 情感追踪
      dialogues: [],      // 名台词
      chapterContext: [], // 章节上下文
      scenes: []          // 场景
    };

    // 章节索引：每章摘要
    this._chapterIndex = [];

    // 角色档案
    this._characterProfiles = {};

    // 角色身份
    this._charRoles = {};

    // 角色当前状态
    this._charStates = [];

    // 伏笔台账
    this._foreshadowLedger = [];

    // 道具台账
    this._itemLedger = [];

    // 势力图谱
    this._factionGraph = {};

    // 时间线事件
    this._timelineEvents = [];

    // 情节线索
    this._plotThreads = [];

    // 滚动摘要（多层压缩）
    this._rollingSummary = { recent: '', milestones: '', eras: '' };

    // 卷记忆
    this._volumeMemories = [];

    // 角色历史
    this._characterHistory = {};

    // 快照
    this._snapshots = [];

    // 元信息
    this._meta = {
      title: '未命名',
      createdAt: Date.now(),
      totalChapters: 0
    };
  }

  // ---- 写入记忆 ----
  MemorySkill.prototype.remember = function (category, text, options) {
    options = options || {};
    var entry = {
      text: text || '',
      chapterIdx: options.chapter != null ? options.chapter : (this._meta.totalChapters || 0),
      timestamp: Date.now(),
      charName: options.charName || '',
      status: options.status || '',
      tags: options.tags || []
    };

    if (this._anchors[category]) {
      this._anchors[category].push(entry);
    }

    // 自动更新章节索引
    if (options.chapter != null && options.chapter >= (this._chapterIndex.length > 0 ? this._chapterIndex[this._chapterIndex.length - 1].chapterIdx + 1 : 0)) {
      this._chapterIndex.push({
        chapterIdx: options.chapter,
        summary: (this._chapterIndex.length > 0 ? this._chapterIndex[this._chapterIndex.length - 1].summary + ' ' : '') + text
      });
      this._meta.totalChapters = Math.max(this._meta.totalChapters, options.chapter + 1);
    }

    return entry;
  };

  // ---- 批量写入章节摘要 ----
  MemorySkill.prototype.recordChapter = function (chapterIdx, summary) {
    // 更新或新增章节索引
    var existing = this._chapterIndex.find(function (c) { return c.chapterIdx === chapterIdx; });
    if (existing) {
      existing.summary = summary;
    } else {
      this._chapterIndex.push({ chapterIdx: chapterIdx, summary: summary });
    }
    this._chapterIndex.sort(function (a, b) { return a.chapterIdx - b.chapterIdx; });
    this._meta.totalChapters = Math.max(this._meta.totalChapters, chapterIdx + 1);
  };

  // ---- 记录角色 ----
  MemorySkill.prototype.recordCharacter = function (name, role, info) {
    role = role || '配角';
    info = info || {};
    if (!this._characterProfiles[name]) {
      this._characterProfiles[name] = {
        firstSeen: info.chapter || 0,
        lastSeen: info.chapter || 0,
        milestones: [],
        currentStatus: info.status || '未知',
        location: info.location || '未知',
        emotion: info.emotion || '中性'
      };
    } else {
      if (info.chapter != null) this._characterProfiles[name].lastSeen = info.chapter;
      if (info.status) this._characterProfiles[name].currentStatus = info.status;
      if (info.location) this._characterProfiles[name].location = info.location;
      if (info.emotion) this._characterProfiles[name].emotion = info.emotion;
    }
    if (info.milestone) this._characterProfiles[name].milestones.push(info.milestone);
    this._charRoles[name] = role;
  };

  // ---- 记录伏笔 ----
  MemorySkill.prototype.recordForeshadow = function (chapterIdx, text, status) {
    this._foreshadowLedger.push({
      chapterIdx: chapterIdx,
      text: text,
      status: status || '未解',
      createdAt: Date.now()
    });
  };

  // ---- 记录时间线 ----
  MemorySkill.prototype.recordTimeline = function (chapterIdx, text) {
    this._timelineEvents.push({ chapterIdx: chapterIdx, text: text, timestamp: Date.now() });
  };

  // ---- 记录情节线索 ----
  MemorySkill.prototype.recordPlotThread = function (title, status) {
    this._plotThreads.push({ title: title, status: status || '待解', createdAt: Date.now() });
  };

  // ---- 设置标题 ----
  MemorySkill.prototype.setTitle = function (title) {
    this._meta.title = title;
  };

  // ---- 导出全部记忆 ----
  MemorySkill.prototype.export = function () {
    return JSON.parse(JSON.stringify({
      anchors: this._anchors,
      chapterIndex: this._chapterIndex,
      characterProfiles: this._characterProfiles,
      charRoles: this._charRoles,
      charStates: this._charStates,
      foreshadowLedger: this._foreshadowLedger,
      itemLedger: this._itemLedger,
      factionGraph: this._factionGraph,
      timelineEvents: this._timelineEvents,
      plotThreads: this._plotThreads,
      rollingSummary: this._rollingSummary,
      volumeMemories: this._volumeMemories,
      characterHistory: this._characterHistory,
      meta: this._meta
    }));
  };

  // ---- 导入记忆 ----
  MemorySkill.prototype.import = function (data) {
    if (data.anchors) this._anchors = data.anchors;
    if (data.chapterIndex) this._chapterIndex = data.chapterIndex;
    if (data.characterProfiles) this._characterProfiles = data.characterProfiles;
    if (data.charRoles) this._charRoles = data.charRoles;
    if (data.charStates) this._charStates = data.charStates;
    if (data.foreshadowLedger) this._foreshadowLedger = data.foreshadowLedger;
    if (data.itemLedger) this._itemLedger = data.itemLedger;
    if (data.factionGraph) this._factionGraph = data.factionGraph;
    if (data.timelineEvents) this._timelineEvents = data.timelineEvents;
    if (data.plotThreads) this._plotThreads = data.plotThreads;
    if (data.rollingSummary) this._rollingSummary = data.rollingSummary;
    if (data.volumeMemories) this._volumeMemories = data.volumeMemories;
    if (data.characterHistory) this._characterHistory = data.characterHistory;
    if (data.meta) this._meta = data.meta;
  };

  // ==========================================================================
  // === PART 1：基础工具 ======================================================
  // ==========================================================================

  function tokenize(text) {
    if (!text) return [];
    text = String(text).replace(/[\s\u3000]+/g, ' ');
    var segs = text.split(/[，。！？！？：；、,.!?;:\s]+/).filter(Boolean);
    var tokens = [];
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      for (var j = 0; j < s.length; j++) {
        if (/[a-zA-Z0-9]/.test(s[j])) {
          var k = j;
          while (k < s.length && /[a-zA-Z0-9]/.test(s[k])) k++;
          tokens.push(s.substring(j, k));
          j = k - 1;
        } else {
          tokens.push(s[j]);
          if (j + 1 < s.length) tokens.push(s.substring(j, j + 2));
        }
      }
    }
    return tokens;
  }

  function jaccard(a, b) {
    if (!a || !b) return 0;
    var sa = {}, sb = {};
    for (var i = 0; i < a.length; i++) sa[a[i]] = (sa[a[i]] || 0) + 1;
    for (var j = 0; j < b.length; j++) sb[b[j]] = (sb[b[j]] || 0) + 1;
    var inter = 0, union = 0;
    var all = {};
    for (var k in sa) all[k] = true;
    for (var kk in sb) all[kk] = true;
    for (var kkk in all) {
      inter += Math.min(sa[kkk] || 0, sb[kkk] || 0);
      union += Math.max(sa[kkk] || 0, sb[kkk] || 0);
    }
    return union > 0 ? inter / union : 0;
  }

  // ==========================================================================
  // === PART 2：记忆推理引擎 ==================================================
  // ==========================================================================

  MemorySkill.prototype._reasoning = {
    // ---- 因果推断 ----
    inferCausality: function (ms, eventA, eventB) {
      var allEvents = [];
      ms._chapterIndex.forEach(function (ci) { allEvents.push({ text: ci.summary, chapter: ci.chapterIdx, source: 'chapter' }); });
      ms._timelineEvents.forEach(function (te) { allEvents.push({ text: te.text, chapter: te.chapterIdx, source: 'timeline' }); });
      ms._foreshadowLedger.forEach(function (fl) { allEvents.push({ text: fl.text, chapter: fl.chapterIdx, source: 'foreshadow' }); });

      var tokensA = tokenize(eventA), tokensB = tokenize(eventB);
      var chain = [];
      allEvents.sort(function (a, b) { return a.chapter - b.chapter; });
      for (var i = 0; i < allEvents.length; i++) {
        var simA = jaccard(tokensA, tokenize(allEvents[i].text));
        var simB = jaccard(tokensB, tokenize(allEvents[i].text));
        if (simA > 0.2 || simB > 0.2) {
          chain.push({ event: allEvents[i].text.substring(0, 80), chapter: allEvents[i].chapter, similarityToA: simA, similarityToB: simB });
        }
      }
      return { chain: chain, confidence: chain.length > 1 ? 0.7 : 0.1, intermediateEvents: chain.length };
    },

    // ---- 模式识别 ----
    detectPatterns: function (ms) {
      var summaries = ms._chapterIndex.filter(function (c) { return c.summary && c.summary.length > 10; });
      if (summaries.length < 5) return [];

      var templates = [
        { name: '升级打怪', keywords: ['突破', '晋升', '击败', '战胜', '修炼', '提升', '实力', '境界'], min: 3 },
        { name: '寻宝奇遇', keywords: ['发现', '找到', '获得', '奇遇', '机缘', '传承', '宝物', '秘境'], min: 3 },
        { name: '复仇归来', keywords: ['复仇', '报仇', '雪恨', '归来', '回归', '仇恨'], min: 2 },
        { name: '身份揭晓', keywords: ['真相', '身份', '原来', '竟然是', '身世', '秘密', '揭晓'], min: 2 },
        { name: '英雄救美', keywords: ['救下', '保护', '挡在', '出手', '救走'], min: 2 },
        { name: '势力冲突', keywords: ['对抗', '对峙', '冲突', '大战', '厮杀', '围攻', '决裂'], min: 2 },
        { name: '修炼瓶颈', keywords: ['瓶颈', '卡住', '无法突破', '停滞', '障碍'], min: 2 },
        { name: '以弱胜强', keywords: ['越级', '实力悬殊', '不可思议', '奇迹', '逆转', '逆袭'], min: 2 }
      ];

      var patterns = [];
      for (var p = 0; p < templates.length; p++) {
        var pt = templates[p];
        var matches = [];
        for (var s = 0; s < summaries.length; s++) {
          var cnt = 0;
          for (var k = 0; k < pt.keywords.length; k++) { if (summaries[s].summary.indexOf(pt.keywords[k]) >= 0) cnt++; }
          if (cnt >= 2) matches.push(summaries[s].chapterIdx);
        }
        if (matches.length >= pt.min) {
          patterns.push({ pattern: pt.name, occurrences: matches.length, chapters: matches, density: (matches.length / summaries.length * 100).toFixed(1) + '%' });
        }
      }
      return patterns.sort(function (a, b) { return b.occurrences - a.occurrences; });
    },

    // ---- 缺口检测 ----
    detectGaps: function (ms) {
      var gaps = [];
      var chapters = ms._chapterIndex;
      var charNames = Object.keys(ms._characterProfiles);

      // 角色失踪
      if (chapters.length > 10) {
        for (var c = 0; c < Math.min(charNames.length, 20); c++) {
          var name = charNames[c];
          var profile = ms._characterProfiles[name];
          if (profile && profile.lastSeen != null) {
            var latestChapter = chapters.length > 0 ? chapters[chapters.length - 1].chapterIdx : 0;
            if (latestChapter - profile.lastSeen > 10 && profile.firstSeen != null && profile.firstSeen < profile.lastSeen) {
              gaps.push({ type: '角色失踪', entity: name, detail: name + '已' + (latestChapter - profile.lastSeen) + '章未出场', severity: 'medium' });
            }
          }
        }
      }

      // 伏笔过期
      var unresolved = ms._foreshadowLedger.filter(function (f) { return f.status !== '已解'; });
      var latestCh = chapters.length > 0 ? chapters[chapters.length - 1].chapterIdx : 0;
      for (var f = 0; f < unresolved.length; f++) {
        if (latestCh - (unresolved[f].chapterIdx || 0) > 30) {
          gaps.push({ type: '伏笔过期', entity: '伏笔', detail: '第' + (unresolved[f].chapterIdx + 1) + '章伏笔已过' + (latestCh - unresolved[f].chapterIdx) + '章未解', severity: 'high' });
        }
      }

      return gaps;
    },

    // ---- 矛盾检测 ----
    detectContradictions: function (ms) {
      var contradictions = [];
      var coreFacts = ms._anchors.core.map(function (a) { return { text: a.text, chapter: a.chapterIdx }; });

      var conflictPairs = [
        { a: '活着', b: '死亡', label: '生死矛盾' },
        { a: '朋友', b: '敌人', label: '敌友矛盾' },
        { a: '拥有', b: '失去', label: '得失矛盾' },
        { a: '强大', b: '弱小', label: '强弱矛盾' },
        { a: '知道', b: '不知道', label: '知情矛盾' }
      ];

      for (var i = 0; i < coreFacts.length; i++) {
        for (var j = i + 1; j < coreFacts.length; j++) {
          for (var cp = 0; cp < conflictPairs.length; cp++) {
            var pair = conflictPairs[cp];
            if (coreFacts[i].text.indexOf(pair.a) >= 0 && coreFacts[j].text.indexOf(pair.b) >= 0) {
              var common = tokenize(coreFacts[i].text).filter(function (t) { return tokenize(coreFacts[j].text).indexOf(t) >= 0 && t.length >= 2; });
              if (common.length >= 1) {
                contradictions.push({ type: pair.label, entity: common.slice(0, 3).join('、'), factA: coreFacts[i].text.substring(0, 50), factB: coreFacts[j].text.substring(0, 50), severity: 'high' });
              }
            }
          }
        }
      }
      return contradictions;
    }
  };

  // ==========================================================================
  // === PART 3：记忆预测引擎 ==================================================
  // ==========================================================================

  MemorySkill.prototype._prediction = {
    predictNext: function (ms) {
      var predictions = [];
      var latestChapter = ms._chapterIndex.length > 0 ? ms._chapterIndex[ms._chapterIndex.length - 1].chapterIdx : 0;

      // 伏笔预测
      var unresolved = ms._foreshadowLedger.filter(function (f) { return f.status !== '已解'; });
      var overdue = unresolved.filter(function (f) { return latestChapter - f.chapterIdx > 20; });
      if (overdue.length > 0) {
        predictions.push({ type: '伏笔回收', priority: 'high', detail: overdue.length + '个伏笔过期超过20章，建议回收' });
      } else if (unresolved.length > 0) {
        predictions.push({ type: '伏笔推进', priority: 'medium', detail: unresolved.length + '个未解伏笔可推进' });
      }

      // 线索预测
      var pending = ms._plotThreads.filter(function (t) { return t.status === '待解'; });
      if (pending.length > 0) {
        predictions.push({ type: '线索推进', priority: 'medium', detail: pending.length + '条待解情节线索' });
      }

      // 节奏预测
      if (ms._chapterIndex.length >= 10) {
        var recent = ms._chapterIndex.slice(-10).map(function (c) { return c.summary; });
        var actionWords = ['战斗', '击败', '突破', '杀', '斩', '攻击', '对抗', '冲突', '厮杀'];
        var calmWords = ['修炼', '对话', '休息', '日常', '平静', '交易', '思考', '准备'];
        var actionCount = 0, calmCount = 0;
        for (var s = 0; s < recent.length; s++) {
          for (var a = 0; a < actionWords.length; a++) { if (recent[s].indexOf(actionWords[a]) >= 0) { actionCount++; break; } }
          for (var cw = 0; cw < calmWords.length; cw++) { if (recent[s].indexOf(calmWords[cw]) >= 0) { calmCount++; break; } }
        }
        if (actionCount > 7) predictions.push({ type: '节奏调控', priority: 'medium', detail: '最近10章战斗密集（' + actionCount + '/10），建议过渡章节' });
        else if (calmCount > 7) predictions.push({ type: '节奏调控', priority: 'medium', detail: '最近10章偏平静（' + calmCount + '/10），建议安排冲突' });
      }

      return predictions.sort(function (a, b) { var o = { 'high': 0, 'medium': 1, 'low': 2 }; return (o[a.priority] || 1) - (o[b.priority] || 1); });
    }
  };

  // ==========================================================================
  // === PART 4：叙事一致性引擎 ================================================
  // ==========================================================================

  MemorySkill.prototype._consistency = {
    checkCharacter: function (ms) {
      var issues = [];
      var contradictionPairs = [
        ['善良', '残忍'], ['懦弱', '勇敢'], ['冷静', '暴躁'],
        ['聪明', '愚笨'], ['富有', '贫穷'], ['忠诚', '背叛']
      ];

      for (var name in ms._characterProfiles) {
        var tagTexts = ms._anchors.characterTags.filter(function (a) { return (a.charName || a.text).indexOf(name) >= 0; }).map(function (t) { return t.text; });
        for (var cp = 0; cp < contradictionPairs.length; cp++) {
          var hasA = tagTexts.some(function (t) { return t.indexOf(contradictionPairs[cp][0]) >= 0; });
          var hasB = tagTexts.some(function (t) { return t.indexOf(contradictionPairs[cp][1]) >= 0; });
          if (hasA && hasB) issues.push({ type: '角色矛盾', character: name, detail: name + '同时具有"' + contradictionPairs[cp][0] + '"和"' + contradictionPairs[cp][1] + '"', severity: 'medium' });
        }
      }
      return { score: Math.max(0, 100 - issues.length * 10), issues: issues };
    },

    checkTimeline: function (ms) {
      var issues = [];
      var sorted = ms._timelineEvents.slice().sort(function (a, b) { return (a.chapterIdx || 0) - (b.chapterIdx || 0); });
      for (var i = 1; i < sorted.length; i++) {
        if ((sorted[i].chapterIdx || 0) < (sorted[i - 1].chapterIdx || 0)) {
          issues.push({ type: '时间线错乱', detail: '时间线事件顺序异常', severity: 'low' });
        }
      }
      return { score: Math.max(0, 100 - issues.length * 5), issues: issues };
    },

    fullCheck: function (ms) {
      return {
        character: this.checkCharacter(ms),
        timeline: this.checkTimeline(ms),
        contradictions: ms._reasoning.detectContradictions(ms)
      };
    }
  };

  // ==========================================================================
  // === PART 5：情感弧线引擎 ==================================================
  // ==========================================================================

  MemorySkill.prototype._emotionArc = (function () {
    var emotionMap = {
      '喜悦': 1.0, '高兴': 0.9, '开心': 0.8, '欢喜': 0.9, '兴奋': 0.8, '激动': 0.7, '满意': 0.6,
      '平静': 0.0, '淡然': 0.0, '从容': 0.0, '冷静': 0.0, '镇定': 0.0,
      '悲伤': -0.8, '难过': -0.7, '伤心': -0.9, '痛哭': -1.0, '哭泣': -0.9, '落泪': -0.8,
      '愤怒': -0.7, '暴怒': -1.0, '恼怒': -0.6, '怒火': -0.8,
      '恐惧': -0.9, '害怕': -0.8, '畏惧': -0.8, '惊惧': -0.9, '骇然': -0.7,
      '绝望': -1.0, '崩溃': -0.9, '心死': -1.0,
      '惊讶': 0.0, '震惊': -0.3, '惊愕': -0.2, '诧异': 0.0,
      '悔恨': -0.8, '愧疚': -0.7, '羞耻': -0.6,
      '坚定': 0.4, '毅然': 0.5, '决绝': 0.3,
      '疑惑': -0.1, '怀疑': -0.2, '困惑': -0.1
    };

    function computeValence(text) {
      var total = 0, count = 0;
      for (var emo in emotionMap) { if (text.indexOf(emo) >= 0) { total += emotionMap[emo]; count++; } }
      return count > 0 ? total / count : 0;
    }

    function dominantEmotion(text) {
      var best = '中性', bestScore = 0;
      for (var emo in emotionMap) { if (text.indexOf(emo) >= 0 && Math.abs(emotionMap[emo]) > bestScore) { bestScore = Math.abs(emotionMap[emo]); best = emo; } }
      return best;
    }

    return {
      trackCharacter: function (ms, charName) {
        var allAnchors = ms._anchors.emotionTrack.concat(ms._anchors.characterTags).filter(function (a) {
          return (a.text || '').indexOf(charName) >= 0 || (a.charName || '').indexOf(charName) >= 0;
        });
        allAnchors.sort(function (a, b) { return (a.chapterIdx || 0) - (b.chapterIdx || 0); });

        var arc = [];
        for (var i = 0; i < allAnchors.length; i++) {
          var text = allAnchors[i].text || '';
          arc.push({ chapter: allAnchors[i].chapterIdx || 0, text: text.substring(0, 50), valence: computeValence(text), emotion: dominantEmotion(text) });
        }

        var turningPoints = [];
        for (var j = 2; j < arc.length; j++) {
          var v0 = arc[j - 2].valence, v1 = arc[j - 1].valence, v2 = arc[j].valence;
          if ((v0 < v1 && v1 < v2) || (v0 > v1 && v1 > v2)) {
            if (Math.abs(v2 - v0) > 1.0) {
              turningPoints.push({ chapter: arc[j].chapter, from: arc[j - 2].emotion, to: arc[j].emotion, direction: v2 > v0 ? '上升' : '下降' });
            }
          }
        }

        return { character: charName, arc: arc, turningPoints: turningPoints, overallTrend: arc.length >= 2 ? (arc[arc.length - 1].valence - arc[0].valence > 0 ? '上升' : '下降') : '平稳' };
      },

      analyzeGlobal: function (ms) {
        var chapters = ms._chapterIndex;
        if (chapters.length < 5) return null;

        var chapterEmotions = chapters.map(function (ch) {
          return { chapter: ch.chapterIdx, valence: computeValence(ch.summary), emotion: dominantEmotion(ch.summary) };
        });

        var valences = chapterEmotions.map(function (e) { return e.valence; });
        var avg = valences.reduce(function (a, b) { return a + b; }, 0) / valences.length;
        var variance = valences.reduce(function (a, b) { return a + (b - avg) * (b - avg); }, 0) / valences.length;

        return {
          chapterEmotions: chapterEmotions, averageValence: avg, variance: variance,
          rollerCoaster: variance > 0.5, monotonous: variance < 0.1 && chapters.length > 10,
          advice: variance > 0.5 ? '情感波动过大，建议加入缓冲章节' : variance < 0.1 && chapters.length > 10 ? '情感变化过少，建议增加起伏' : '情感节奏健康'
        };
      }
    };
  })();

  // ==========================================================================
  // === PART 6：伏笔智能管理 ==================================================
  // ==========================================================================

  MemorySkill.prototype._foreshadow = {
    autoLink: function (ms) {
      var links = [];
      for (var f = 0; f < ms._foreshadowLedger.length; f++) {
        var fore = ms._foreshadowLedger[f];
        if (fore.status === '已解') continue;
        var foreTokens = tokenize(fore.text);
        if (foreTokens.length === 0) continue;

        for (var c = 0; c < ms._chapterIndex.length; c++) {
          var ch = ms._chapterIndex[c];
          if (ch.chapterIdx <= fore.chapterIdx) continue;
          var sim = jaccard(foreTokens, tokenize(ch.summary));
          if (sim > 0.25) {
            links.push({ foreshadow: fore.text.substring(0, 50), foreshadowChapter: fore.chapterIdx, possibleResolution: ch.summary.substring(0, 50), resolutionChapter: ch.chapterIdx, similarity: sim });
          }
        }
      }
      return links.sort(function (a, b) { return b.similarity - a.similarity; });
    },

    getHealth: function (ms) {
      var total = ms._foreshadowLedger.length;
      var resolved = ms._foreshadowLedger.filter(function (f) { return f.status === '已解'; }).length;
      var unresolved = total - resolved;
      var latestChapter = ms._chapterIndex.length > 0 ? ms._chapterIndex[ms._chapterIndex.length - 1].chapterIdx : 0;
      var overdue = ms._foreshadowLedger.filter(function (f) { return f.status !== '已解' && (latestChapter - f.chapterIdx) > 30; });

      return {
        total: total, resolved: resolved, unresolved: unresolved,
        resolutionRate: total > 0 ? (resolved / total * 100).toFixed(1) + '%' : 'N/A',
        overdue: overdue.length,
        health: unresolved === 0 ? 'excellent' : overdue.length > 3 ? 'critical' : overdue.length > 0 ? 'warning' : 'good',
        advice: overdue.length > 3 ? '有' + overdue.length + '个伏笔过期超过30章！' : overdue.length > 0 ? '有' + overdue.length + '个伏笔过期' : '伏笔管理良好'
      };
    }
  };

  // ==========================================================================
  // === PART 7：记忆图谱推理 ==================================================
  // ==========================================================================

  MemorySkill.prototype._graph = {
    build: function (ms) {
      var nodes = [], edges = [];
      var charNames = Object.keys(ms._characterProfiles);

      // 角色节点
      for (var i = 0; i < charNames.length; i++) {
        nodes.push({ id: 'char_' + i, label: charNames[i], type: 'character', role: ms._charRoles[charNames[i]] || '配角' });
      }

      // 地点节点
      var locNames = {};
      for (var l = 0; l < ms._anchors.locations.length; l++) {
        var text = ms._anchors.locations[l].text || '';
        var match = text.match(/([\u4e00-\u9fa5]{2,6}(?:城|镇|村|国|界|域|山|谷|林|海|洞|府|宫|殿|阁|楼|院|堂))/);
        if (match) locNames[match[1]] = (locNames[match[1]] || 0) + 1;
      }
      var topLocs = Object.keys(locNames).sort(function (a, b) { return locNames[b] - locNames[a]; }).slice(0, 15);
      for (var tl = 0; tl < topLocs.length; tl++) {
        nodes.push({ id: 'loc_' + tl, label: topLocs[tl], type: 'location', weight: locNames[topLocs[tl]] });
      }

      // 关系边
      for (var r = 0; r < ms._anchors.relationships.length; r++) {
        var rtext = ms._anchors.relationships[r].text || '';
        var involved = [];
        for (var ci = 0; ci < charNames.length; ci++) { if (rtext.indexOf(charNames[ci]) >= 0) involved.push(ci); }
        for (var a = 0; a < involved.length; a++) {
          for (var b = a + 1; b < involved.length; b++) {
            edges.push({ source: 'char_' + involved[a], target: 'char_' + involved[b], type: 'relationship', label: rtext.substring(0, 20) });
          }
        }
      }

      return { nodes: nodes, edges: edges };
    },

    rankNodes: function (ms, iterations) {
      var graph = this.build(ms);
      iterations = iterations || 20;
      var damping = 0.85;
      var ranks = {};
      for (var n = 0; n < graph.nodes.length; n++) ranks[graph.nodes[n].id] = 1.0 / graph.nodes.length;

      var adj = {};
      for (var e = 0; e < graph.edges.length; e++) {
        if (!adj[graph.edges[e].source]) adj[graph.edges[e].source] = [];
        if (!adj[graph.edges[e].target]) adj[graph.edges[e].target] = [];
        adj[graph.edges[e].source].push(graph.edges[e].target);
        adj[graph.edges[e].target].push(graph.edges[e].source);
      }

      for (var iter = 0; iter < iterations; iter++) {
        var newRanks = {};
        for (var n2 = 0; n2 < graph.nodes.length; n2++) {
          var id = graph.nodes[n2].id, sum = 0;
          var neighbors = adj[id] || [];
          for (var nb = 0; nb < neighbors.length; nb++) {
            sum += (ranks[neighbors[nb]] || 0) / ((adj[neighbors[nb]] || []).length || 1);
          }
          newRanks[id] = (1 - damping) / graph.nodes.length + damping * sum;
        }
        ranks = newRanks;
      }

      return graph.nodes.map(function (n) { return { label: n.label, type: n.type, rank: ranks[n.id] || 0 }; }).sort(function (a, b) { return b.rank - a.rank; });
    }
  };

  // ==========================================================================
  // === PART 8：记忆质量评估 ==================================================
  // ==========================================================================

  MemorySkill.prototype._quality = {
    analyzeDensity: function (ms) {
      var totalChapters = ms._chapterIndex.length;
      if (totalChapters === 0) return null;

      var totalAnchors = 0;
      var anchorCounts = {};
      for (var k in ms._anchors) {
        anchorCounts[k] = ms._anchors[k].length;
        totalAnchors += anchorCounts[k];
      }

      return {
        totalChapters: totalChapters, totalAnchors: totalAnchors, anchorTypes: anchorCounts,
        characters: Object.keys(ms._characterProfiles).length,
        foreshadows: ms._foreshadowLedger.length, timelineEvents: ms._timelineEvents.length,
        anchorsPerChapter: (totalAnchors / totalChapters).toFixed(1),
        health: totalAnchors / Math.max(1, totalChapters) < 2 ? 'low' : totalAnchors / Math.max(1, totalChapters) < 5 ? 'medium' : 'good'
      };
    },

    computeEntropy: function (ms) {
      var allTexts = [];
      for (var k in ms._anchors) { ms._anchors[k].forEach(function (a) { allTexts.push(a.text); }); }
      if (allTexts.length === 0) return 0;

      var wordFreq = {}, totalWords = 0;
      for (var i = 0; i < allTexts.length; i++) {
        var tokens = tokenize(allTexts[i]);
        for (var t = 0; t < tokens.length; t++) { wordFreq[tokens[t]] = (wordFreq[tokens[t]] || 0) + 1; totalWords++; }
      }
      var entropy = 0;
      for (var w in wordFreq) { var p = wordFreq[w] / totalWords; entropy -= p * Math.log2(p); }
      return entropy;
    },

    checkCoverage: function (ms) {
      var chapters = ms._chapterIndex;
      if (chapters.length === 0) return null;
      var coverage = [], gaps = [];

      for (var i = 0; i < chapters.length; i++) {
        var chIdx = chapters[i].chapterIdx;
        var hasCore = false, hasChar = false, hasLoc = false;
        for (var k in ms._anchors) {
          for (var a = 0; a < ms._anchors[k].length; a++) {
            if (ms._anchors[k][a].chapterIdx === chIdx) {
              if (k === 'core') hasCore = true;
              if (k === 'characterTags') hasChar = true;
              if (k === 'locations') hasLoc = true;
            }
          }
        }
        var score = (hasCore ? 2 : 0) + (hasChar ? 1 : 0) + (hasLoc ? 1 : 0);
        coverage.push({ chapter: chIdx, score: score, max: 4 });
        if (score <= 1) gaps.push({ chapter: chIdx, detail: '第' + (chIdx + 1) + '章记忆覆盖不足（' + score + '/4）' });
      }

      var avgScore = coverage.reduce(function (a, b) { return a + b.score; }, 0) / coverage.length;
      return { coverage: coverage, gaps: gaps, averageScore: avgScore.toFixed(1), totalGaps: gaps.length, health: avgScore >= 3.5 ? 'excellent' : avgScore >= 2 ? 'good' : 'poor' };
    }
  };

  // ==========================================================================
  // === PART 9：写作建议生成 ==================================================
  // ==========================================================================

  MemorySkill.prototype._advisor = {
    generate: function (ms) {
      var advice = [];

      var gaps = ms._reasoning.detectGaps(ms);
      for (var g = 0; g < Math.min(gaps.length, 5); g++) {
        if (gaps[g].severity === 'high') advice.push({ priority: 'high', category: '缺口填补', detail: gaps[g].detail });
      }

      var predictions = ms._prediction.predictNext(ms);
      for (var p = 0; p < Math.min(predictions.length, 3); p++) {
        if (predictions[p].priority === 'high') advice.push({ priority: 'high', category: '情节预测', detail: predictions[p].detail });
      }

      var contradictions = ms._reasoning.detectContradictions(ms);
      for (var c = 0; c < Math.min(contradictions.length, 3); c++) {
        advice.push({ priority: 'high', category: '矛盾修复', detail: contradictions[c].type + '：' + contradictions[c].entity });
      }

      var emotion = ms._emotionArc.analyzeGlobal(ms);
      if (emotion && emotion.advice) advice.push({ priority: emotion.monotonous ? 'medium' : 'low', category: '情感节奏', detail: emotion.advice });

      var foreReport = ms._foreshadow.getHealth(ms);
      if (foreReport && foreReport.health !== 'excellent') {
        advice.push({ priority: foreReport.health === 'critical' ? 'high' : 'medium', category: '伏笔管理', detail: foreReport.advice });
      }

      var density = ms._quality.analyzeDensity(ms);
      if (density && density.health === 'low') advice.push({ priority: 'medium', category: '记忆密度', detail: '每章平均仅' + density.anchorsPerChapter + '个记忆锚点' });

      var coverage = ms._quality.checkCoverage(ms);
      if (coverage && coverage.totalGaps > 0) advice.push({ priority: 'medium', category: '记忆覆盖', detail: coverage.totalGaps + '章记忆覆盖不足' });

      return advice.sort(function (a, b) { var o = { 'high': 0, 'medium': 1, 'low': 2 }; return (o[a.priority] || 1) - (o[b.priority] || 1); });
    }
  };

  // ==========================================================================
  // === PART 10：记忆诊断 =====================================================
  // ==========================================================================

  MemorySkill.prototype._diagnostics = {
    fullCheck: function (ms) {
      var checks = [
        { name: '记忆锚点', status: ms._getTotalAnchors() > 0 ? 'pass' : 'warn', detail: '共' + ms._getTotalAnchors() + '条' },
        { name: '章节索引', status: ms._chapterIndex.length > 0 ? 'pass' : 'warn', detail: '共' + ms._chapterIndex.length + '章' },
        { name: '角色档案', status: Object.keys(ms._characterProfiles).length > 0 ? 'pass' : 'warn', detail: Object.keys(ms._characterProfiles).length + '个角色' },
        { name: '伏笔管理', status: ms._foreshadowLedger.length > 0 ? 'pass' : 'warn', detail: ms._foreshadowLedger.length + '个伏笔' },
        { name: '时间线', status: ms._timelineEvents.length > 0 ? 'pass' : 'warn', detail: ms._timelineEvents.length + '条事件' },
        { name: '情节线索', status: ms._plotThreads.length > 0 ? 'pass' : 'warn', detail: ms._plotThreads.length + '条线索' }
      ];

      var passCount = checks.filter(function (c) { return c.status === 'pass'; }).length;
      return { status: passCount >= 4 ? 'healthy' : passCount >= 2 ? 'warning' : 'critical', score: Math.round(passCount / checks.length * 100), checks: checks };
    }
  };

  MemorySkill.prototype._getTotalAnchors = function () {
    var total = 0;
    for (var k in this._anchors) total += this._anchors[k].length;
    return total;
  };

  // ==========================================================================
  // === PART 11：跨作品记忆迁移 ==============================================
  // ==========================================================================

  MemorySkill.prototype._crossWork = {
    extractFingerprint: function (ms) {
      return {
        title: ms._meta.title,
        totalChapters: ms._chapterIndex.length,
        patterns: ms._reasoning.detectPatterns(ms).slice(0, 5).map(function (p) { return p.pattern; }),
        emotion: ms._emotionArc.analyzeGlobal(ms),
        density: ms._quality.analyzeDensity(ms),
        characterCount: Object.keys(ms._characterProfiles).length,
        foreshadowCount: ms._foreshadowLedger.length,
        timestamp: Date.now()
      };
    },

    compare: function (msA, msB) {
      var fpA = this.extractFingerprint(msA), fpB = this.extractFingerprint(msB);
      if (!fpA || !fpB) return null;
      var common = fpA.patterns.filter(function (p) { return fpB.patterns.indexOf(p) >= 0; });
      return {
        workA: fpA.title, workB: fpB.title,
        commonPatterns: common,
        uniqueToA: fpA.patterns.filter(function (p) { return fpB.patterns.indexOf(p) < 0; }),
        uniqueToB: fpB.patterns.filter(function (p) { return fpA.patterns.indexOf(p) < 0; }),
        similarity: fpA.patterns.length > 0 ? (common.length / Math.max(fpA.patterns.length, fpB.patterns.length) * 100).toFixed(0) + '%' : '0%'
      };
    }
  };

  // ==========================================================================
  // === PART 12：记忆快照与回滚 ==============================================
  // ==========================================================================

  MemorySkill.prototype.snapshot = function (label) {
    var snap = {
      id: 'snap_' + Date.now(),
      label: label || '快照',
      timestamp: Date.now(),
      data: this.export()
    };
    this._snapshots.push(snap);
    if (this._snapshots.length > 10) this._snapshots = this._snapshots.slice(-10);
    return snap.id;
  };

  MemorySkill.prototype.listSnapshots = function () {
    return this._snapshots.map(function (s) { return { id: s.id, label: s.label, timestamp: s.timestamp }; });
  };

  MemorySkill.prototype.rollback = function (snapshotId) {
    var snap = this._snapshots.find(function (s) { return s.id === snapshotId; });
    if (!snap) return false;
    this.snapshot('自动备份（回滚前）');
    this.import(snap.data);
    return true;
  };

  MemorySkill.prototype.diffSnapshots = function (idA, idB) {
    var snapA = this._snapshots.find(function (s) { return s.id === idA; });
    var snapB = this._snapshots.find(function (s) { return s.id === idB; });
    if (!snapA || !snapB) return null;

    var totalA = 0, totalB = 0;
    for (var k in snapA.data.anchors) totalA += (snapA.data.anchors[k] || []).length;
    for (var kk in snapB.data.anchors) totalB += (snapB.data.anchors[kk] || []).length;

    return {
      anchorsDelta: totalB - totalA,
      chaptersDelta: (snapB.data.chapterIndex || []).length - (snapA.data.chapterIndex || []).length,
      foreshadowsDelta: (snapB.data.foreshadowLedger || []).length - (snapA.data.foreshadowLedger || []).length
    };
  };

  // ==========================================================================
  // === 公开 API（挂载到原型）=================================================
  // ==========================================================================

  // 将内部引擎暴露为公开属性
  MemorySkill.prototype.reasoning = null;      // 在构造时初始化
  MemorySkill.prototype.prediction = null;
  MemorySkill.prototype.consistency = null;
  MemorySkill.prototype.emotionArc = null;
  MemorySkill.prototype.foreshadow = null;
  MemorySkill.prototype.graph = null;
  MemorySkill.prototype.quality = null;
  MemorySkill.prototype.advisor = null;
  MemorySkill.prototype.diagnostics = null;
  MemorySkill.prototype.crossWork = null;

  // 一键全分析
  MemorySkill.prototype.fullAnalysis = function () {
    return {
      patterns: this._reasoning.detectPatterns(this),
      gaps: this._reasoning.detectGaps(this),
      contradictions: this._reasoning.detectContradictions(this),
      predictions: this._prediction.predictNext(this),
      consistency: this._consistency.fullCheck(this),
      emotion: this._emotionArc.analyzeGlobal(this),
      foreshadowHealth: this._foreshadow.getHealth(this),
      quality: this._quality.analyzeDensity(this),
      coverage: this._quality.checkCoverage(this),
      advice: this._advisor.generate(this),
      health: this._diagnostics.fullCheck(this),
      fingerprint: this._crossWork.extractFingerprint(this)
    };
  };

  // 快捷：分析单个角色情感
  MemorySkill.prototype.trackEmotion = function (charName) {
    return this._emotionArc.trackCharacter(this, charName);
  };

  // 快捷：构建记忆图谱
  MemorySkill.prototype.buildGraph = function () {
    return this._graph.build(this);
  };

  // 快捷：节点排名
  MemorySkill.prototype.rankNodes = function (iterations) {
    return this._graph.rankNodes(this, iterations);
  };

  // 快捷：因果推断
  MemorySkill.prototype.inferCausality = function (eventA, eventB) {
    return this._reasoning.inferCausality(this, eventA, eventB);
  };

  // 快捷：自动关联伏笔
  MemorySkill.prototype.autoLinkForeshadows = function () {
    return this._foreshadow.autoLink(this);
  };

  // 快捷：比较两部作品
  MemorySkill.compare = function (msA, msB) {
    return msA._crossWork.compare(msA, msB);
  };

  // ---- 工厂函数：创建实例时自动绑定公开 API ----
  var originalConstructor = MemorySkill;

  function createInstance() {
    var ms = new originalConstructor();

    // 绑定公开引擎引用
    ms.reasoning = {
      inferCausality: function (a, b) { return ms._reasoning.inferCausality(ms, a, b); },
      detectPatterns: function () { return ms._reasoning.detectPatterns(ms); },
      detectGaps: function () { return ms._reasoning.detectGaps(ms); },
      detectContradictions: function () { return ms._reasoning.detectContradictions(ms); }
    };

    ms.prediction = {
      predictNext: function () { return ms._prediction.predictNext(ms); }
    };

    ms.consistency = {
      fullCheck: function () { return ms._consistency.fullCheck(ms); }
    };

    ms.emotionArc = {
      trackCharacter: function (name) { return ms._emotionArc.trackCharacter(ms, name); },
      analyzeGlobal: function () { return ms._emotionArc.analyzeGlobal(ms); }
    };

    ms.foreshadow = {
      autoLink: function () { return ms._foreshadow.autoLink(ms); },
      getHealth: function () { return ms._foreshadow.getHealth(ms); }
    };

    ms.graph = {
      build: function () { return ms._graph.build(ms); },
      rankNodes: function (iter) { return ms._graph.rankNodes(ms, iter); }
    };

    ms.quality = {
      analyzeDensity: function () { return ms._quality.analyzeDensity(ms); },
      computeEntropy: function () { return ms._quality.computeEntropy(ms); },
      checkCoverage: function () { return ms._quality.checkCoverage(ms); }
    };

    ms.advisor = {
      generate: function () { return ms._advisor.generate(ms); }
    };

    ms.diagnostics = {
      fullCheck: function () { return ms._diagnostics.fullCheck(ms); }
    };

    ms.crossWork = {
      extractFingerprint: function () { return ms._crossWork.extractFingerprint(ms); },
      compare: function (other) { return ms._crossWork.compare(ms, other); }
    };

    return ms;
  }

  // 静态方法：比较两个实例
  createInstance.compare = function (msA, msB) {
    return msA._crossWork.compare(msA, msB);
  };

  return createInstance;
})();

// 全局挂载
window.MemorySkill = MemorySkill;