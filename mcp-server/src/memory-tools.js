/**
 * 文心笔匠 MCP - 记忆系统工具
 *
 * 提供结构化记忆引擎的 MCP 工具接口
 */

import { z } from 'zod';
import { memoryAction, checkMemoryData, toolResponse, handleError, formatMarkdown, formatJson } from './shared.js';

// ============================================================
// Zod Schema 定义
// ============================================================

const WorkNameSchema = z.string().min(1).max(100).describe('作品名称，如 "汉末：凉州辞"');
const ChapterIdxSchema = z.number().int().min(0).describe('章节索引（从0开始）');
const CharNameSchema = z.string().min(1).max(50).describe('角色名称');

export const memoryTools = [
  // ============================================================
  // 1. 初始化作品
  // ============================================================
  {
    name: 'wenxin_init_work',
    config: {
      title: '初始化作品记忆库',
      description: `创建一个新的作品记忆库，用于结构化存储小说创作过程中的所有设定与记忆。

Args:
  - workName (string): 作品名称，如 "汉末：凉州辞"

Returns:
  Markdown: 初始化结果

Examples:
  - Use when: "开始写一本新小说《仙剑奇侠传》" -> params with workName="仙剑奇侠传"
  - Don't use when: 已有作品需要继续创作（使用 wenxin_switch_work 切换）`,
      inputSchema: z.object({
        workName: WorkNameSchema.describe('作品名称'),
        response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    handler: async ({ workName, response_format }) => {
      try {
        const r = await memoryAction('init_work', { workName });
        if (response_format === 'json') {
          return toolResponse(formatJson(r), r);
        }
        return toolResponse(formatMarkdown('初始化作品记忆库', [
          { title: '操作结果', body: r.message },
          { title: '作品名称', body: `**${workName}**` }
        ]), r);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 2. 记录章节
  // ============================================================
  {
    name: 'wenxin_record_chapter',
    config: {
      title: '记录章节记忆',
      description: `记录一个章节的核心信息，包括章节摘要、出场角色、伏笔、道具、势力等，自动更新滚动摘要。

Args:
  - chapterIdx (number): 章节索引（从0开始）
  - summary (string): 章节摘要/概要
  - characters (array, optional): 本章出场角色列表，每项含 name/role/status/location/emotion
  - foreshadows (array, optional): 本章设置的伏笔列表，每项含 text/status
  - items (array, optional): 本章出现的道具列表，每项含 name/owner/description
  - factions (array, optional): 本章涉及的势力列表，每项含 name/leader/members/status

Returns:
  Markdown: 记录结果摘要

Examples:
  - Use when: "写完第3章了，记录一下" -> params with chapterIdx=2 and summary="..."
  - Use when: 正文生成后必须记录`,
      inputSchema: z.object({
        chapterIdx: ChapterIdxSchema.describe('章节索引（从0开始）'),
        summary: z.string().min(1).max(2000).describe('章节概要/摘要'),
        characters: z.array(z.object({
          name: z.string().describe('角色名'),
          role: z.string().optional().describe('角色身份（主角/反派/配角等）'),
          status: z.string().optional().describe('当前状态'),
          location: z.string().optional().describe('所在位置'),
          emotion: z.string().optional().describe('情绪状态')
        })).optional().describe('本章出场角色列表'),
        foreshadows: z.array(z.object({
          text: z.string().describe('伏笔描述'),
          status: z.string().optional().describe('伏笔状态（未解/已解）')
        })).optional().describe('本章设置的伏笔'),
        items: z.array(z.object({
          name: z.string().describe('道具名'),
          owner: z.string().optional().describe('持有者'),
          description: z.string().optional().describe('道具描述')
        })).optional().describe('本章出现的道具'),
        factions: z.array(z.object({
          name: z.string().describe('势力名称'),
          leader: z.string().optional().describe('首领'),
          members: z.array(z.string()).optional().describe('成员列表'),
          status: z.string().optional().describe('势力状态')
        })).optional().describe('本章涉及的势力'),
        response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
    },
    handler: async (params) => {
      try {
        const { chapterIdx, summary, characters, foreshadows, items, factions, response_format } = params;
        const r = await memoryAction('record_chapter', {
          chapterIdx, summary, characters, foreshadows, items, factions
        });
        if (response_format === 'json') return toolResponse(formatJson(r), r);
        return toolResponse(formatMarkdown('记录章节记忆', [
          { title: `第${chapterIdx + 1}章`, body: summary },
          { title: '操作结果', body: r.message }
        ]), r);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 3. 记录角色
  // ============================================================
  {
    name: 'wenxin_record_character',
    config: {
      title: '记录角色档案',
      description: `记录或更新一个角色的档案信息，包括身份、状态、位置、情绪等。

Args:
  - name (string): 角色名称
  - role (string, optional): 角色身份（主角/反派/配角等）
  - info (object): 角色信息
    - chapter (number): 当前章节
    - status (string): 当前状态
    - location (string): 当前位置
    - emotion (string): 情绪状态
    - milestone (string, optional): 角色里程碑事件

Returns:
  Markdown: 记录结果`,
      inputSchema: z.object({
        name: CharNameSchema.describe('角色名称'),
        role: z.string().optional().describe('角色身份（主角/反派/配角等）'),
        info: z.object({
          chapter: z.number().int().min(0).describe('当前章节索引'),
          status: z.string().optional().describe('当前状态'),
          location: z.string().optional().describe('当前位置'),
          emotion: z.string().optional().describe('情绪'),
          milestone: z.string().optional().describe('里程碑事件')
        }).describe('角色信息'),
        response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
    },
    handler: async ({ name, role, info, response_format }) => {
      try {
        const r = await memoryAction('record_character', { name, role, info });
        if (response_format === 'json') return toolResponse(formatJson(r), r);
        return toolResponse(formatMarkdown('记录角色档案', [
          { title: `角色: ${name}`, body: `身份: ${role || '配角'}` },
          { title: '状态', body: `${info.status || '未知'} · ${info.location || '未知'}` },
          { title: '操作结果', body: r.message }
        ]), r);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 4. 搜索记忆
  // ============================================================
  {
    name: 'wenxin_search_memory',
    config: {
      title: '搜索记忆',
      description: `通过关键词搜索记忆库中的所有相关内容，包括角色、设定、事件、伏笔等。使用 Jaccard 相似度算法进行语义匹配。

Args:
  - keyword (string): 搜索关键词
  - maxResults (number, optional): 最大返回结果数（默认20）

Returns:
  Markdown: 匹配结果列表`,
      inputSchema: z.object({
        keyword: z.string().min(1).max(200).describe('搜索关键词'),
        maxResults: z.number().int().min(1).max(100).default(20).describe('最大返回结果数'),
        response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ keyword, maxResults, response_format }) => {
      try {
        const r = await memoryAction('search_by_keyword', { keyword, maxResults });
        const matches = r.data || [];
        if (response_format === 'json') return toolResponse(formatJson(r), r);
        if (matches.length === 0) {
          return toolResponse(`未找到与"${keyword}"相关的记忆。`, r);
        }
        const sections = matches.slice(0, 20).map(m => ({
          title: `[${m.category}] ${m.text ? m.text.substring(0, 80) : '无内容'}`,
          body: m.chapter != null ? `第${m.chapter + 1}章 | 相似度: ${(m.similarity || 0).toFixed(2)}` : (m.chapterIdx != null ? `第${m.chapterIdx + 1}章` : '')
        }));
        return toolResponse(formatMarkdown(`搜索结果: "${keyword}"`, [
          { title: `共 ${matches.length} 条匹配`, body: '' },
          ...sections
        ]), r);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 5. 加载基础记忆
  // ============================================================
  {
    name: 'wenxin_load_base',
    config: {
      title: '加载基础记忆上下文',
      description: `在写作前加载作品的基础记忆数据，包括作品标题、角色档案、核心事实、势力图谱、近期章节摘要等。是每次写作前必须调用的工具。

Args:
  - workName (string, optional): 作品名称，默认使用当前作品

Returns:
  Markdown: 当前作品记忆概览`,
      inputSchema: z.object({
        workName: z.string().optional().describe('作品名称（可选，默认当前作品）'),
        response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ workName, response_format }) => {
      try {
        const r = await memoryAction('load_base', { workName });
        const data = r.data || {};
        if (response_format === 'json') return toolResponse(formatJson(data), data);

        const sections = [];
        sections.push({ title: '作品信息', body: `**${data.title || '未命名'}** | 共 ${data.totalChapters || 0} 章` });

        const chars = data.characters || {};
        const charNames = Object.keys(chars);
        if (charNames.length > 0) {
          sections.push({
            title: `角色档案 (${charNames.length})`,
            body: charNames.slice(0, 15).map(n => {
              const c = chars[n];
              return `- **${n}**: ${c.currentStatus || '状态未知'} @ ${c.location || '未知位置'}`;
            }).join('\n') + (charNames.length > 15 ? `\n...及其他${charNames.length - 15}个角色` : '')
          });
        }

        const factions = data.factions || {};
        const factionNames = Object.keys(factions);
        if (factionNames.length > 0) {
          sections.push({
            title: `势力图谱 (${factionNames.length})`,
            body: factionNames.map(n => {
              const f = factions[n];
              return `- **${n}**: 首领 ${f.leader || '未知'} | ${f.status || ''}`;
            }).join('\n')
          });
        }

        const rolling = data.rollingSummary;
        if (rolling && rolling.recent) {
          sections.push({ title: '近期摘要', body: rolling.recent.substring(0, 500) });
        }

        return toolResponse(formatMarkdown('记忆上下文', sections), data);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 5b. 分层加载上下文（静态/半静态/动态）
  // ============================================================
  {
    name: 'wenxin_load_context',
    config: {
      title: '分层加载记忆上下文',
      description: `按静态/半静态/动态三级分层加载作品记忆数据。

层级说明：
  - static (静态): 核心设定、角色档案、势力图谱、地点 — 几乎不变，每次必带
  - semi_static (半静态): 伏笔、道具、时间线、情节线索、关系变化 — 偶尔更新，按需加载
  - dynamic (动态): 章节索引、滚动摘要、情感追踪 — 每章更新，滚动替换
  - all (全部): 加载所有层级

Args:
  - layer (string): 层级 — "static" | "semi_static" | "dynamic" | "all"（默认"all"）
  - workName (string, optional): 作品名称

Returns:
  Markdown: 按层级组织的记忆上下文`,
      inputSchema: z.object({
        layer: z.enum(['static', 'semi_static', 'dynamic', 'all']).default('all').describe('数据层级'),
        workName: z.string().optional().describe('作品名称（可选，默认当前作品）'),
        response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ layer, workName, response_format }) => {
      try {
        const r = await memoryAction('get_context_by_layer', { layer, workName });
        const data = r.data || {};
        if (response_format === 'json') return toolResponse(formatJson(data), data);

        const sections = [];

        // 静态层概览
        const st = data.static;
        if (st) {
          const charCount = Object.keys(st.characters || {}).length;
          const factionCount = Object.keys(st.factions || {}).length;
          sections.push({
            title: `📌 静态设定`,
            body: [
              `**${st.title || '未命名'}** | 已写 ${st.totalChapters || 0} 章`,
              `角色: ${charCount} 人 | 势力: ${factionCount} 个`,
              `核心事实: ${(st.coreFacts || []).length} 条 | 地点: ${(st.locations || []).length} 处`
            ].join('\n')
          });
        }

        // 半静态层概览
        const ss = data.semi_static;
        if (ss) {
          const unresolved = (ss.foreshadows || []).filter(f => f.status !== '已解').length;
          const pendingThreads = (ss.plotThreads || []).filter(t => t.status === '待解').length;
          sections.push({
            title: `📋 半静态`,
            body: [
              `伏笔: ${unresolved} 个未解 / ${(ss.foreshadows || []).length} 个总计`,
              `情节线索: ${pendingThreads} 条待解`,
              `时间线事件: ${(ss.timelineEvents || []).length} 条`
            ].join('\n')
          });
        }

        // 动态层概览
        const dy = data.dynamic;
        if (dy) {
          const totalCh = (dy.chapterIndex || []).length;
          const recentSummary = dy.rollingSummary ? dy.rollingSummary.recent || '' : '';
          sections.push({
            title: `🔄 动态 (${totalCh} 章)`,
            body: recentSummary.substring(0, 300) || '暂无章节数据'
          });
        }

        if (sections.length === 0) {
          sections.push({ title: '无数据', body: '该作品暂无记忆数据' });
        }

        return toolResponse(formatMarkdown('分层记忆上下文', sections), data);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 6. 记忆一致性检查
  // ============================================================
  {
    name: 'wenxin_check_consistency',
    config: {
      title: '记忆一致性检查（体检）',
      description: `对整个记忆库进行全面一致性检查，包括角色矛盾检测、时间线错乱检测、敌友矛盾、生死矛盾等。帮助发现创作中的逻辑漏洞。

Args:
  (none)

Returns:
  Markdown: 检查报告`,
      inputSchema: z.object({
        response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const r = await memoryAction('check_consistency');
        const report = r.data || {};
        if (response_format === 'json') return toolResponse(formatJson(report), report);

        const sections = [];
        const chars = report.character || {};
        sections.push({
          title: '角色一致性',
          body: `评分: ${chars.score || 'N/A'}/100\n问题: ${(chars.issues || []).length} 个`
        });
        if ((chars.issues || []).length > 0) {
          chars.issues.forEach(issue => {
            sections.push({ title: `⚠️ ${issue.type}`, body: issue.detail });
          });
        }

        const timeline = report.timeline || {};
        sections.push({
          title: '时间线',
          body: `评分: ${timeline.score || 'N/A'}/100\n问题: ${(timeline.issues || []).length} 个`
        });

        const contradictions = report.contradictions || [];
        if (contradictions.length > 0) {
          sections.push({ title: `矛盾检测 (${contradictions.length})`, body: '' });
          contradictions.slice(0, 10).forEach(c => {
            sections.push({ title: `🔴 ${c.type}`, body: `实体: ${c.entity}\n- ${c.factA}\n- ${c.factB}` });
          });
        }

        if ((chars.issues || []).length === 0 && contradictions.length === 0) {
          sections.push({ title: '✅ 检查通过', body: '未发现一致性问题' });
        }
        return toolResponse(formatMarkdown('一致性检查报告', sections), report);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 7. 完整分析
  // ============================================================
  {
    name: 'wenxin_full_analysis',
    config: {
      title: '完整记忆分析报告',
      description: `对记忆库进行全方面分析，包括剧情模式识别、漏洞检测、矛盾检测、情节预测、情感弧线分析、记忆质量评估、写作建议等。

Args:
  (none)

Returns:
  Markdown: 完整分析报告`,
      inputSchema: z.object({
        response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const r = await memoryAction('full_analysis');
        const analysis = r.data || {};
        if (response_format === 'json') return toolResponse(formatJson(analysis), analysis);

        const sections = [];
        const health = analysis.health || {};
        sections.push({ title: '系统健康度', body: `状态: ${health.status || '未知'} | 评分: ${health.score || 0}/100` });

        const patterns = analysis.patterns || [];
        if (patterns.length > 0) {
          sections.push({
            title: '剧情模式',
            body: patterns.map(p => `- **${p.pattern}**: 出现${p.occurrences}次 (密度${p.density})`).join('\n')
          });
        }

        const gaps = analysis.gaps || [];
        if (gaps.length > 0) {
          sections.push({
            title: `漏洞检测 (${gaps.length})`,
            body: gaps.slice(0, 10).map(g => `- [${g.severity}] ${g.type}: ${g.detail}`).join('\n')
          });
        }

        const predictions = analysis.predictions || [];
        if (predictions.length > 0) {
          sections.push({
            title: '情节预测',
            body: predictions.slice(0, 5).map(p => `- [${p.priority}] ${p.type}: ${p.detail}`).join('\n')
          });
        }

        const advice = analysis.advice || [];
        if (advice.length > 0) {
          sections.push({
            title: '写作建议',
            body: advice.slice(0, 10).map(a => `- [${a.priority}] ${a.category}: ${a.detail}`).join('\n')
          });
        }

        return toolResponse(formatMarkdown('完整分析报告', sections), analysis);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 8. 列出作品
  // ============================================================
  {
    name: 'wenxin_list_works',
    config: {
      title: '列出作品列表',
      description: '列出所有已创建的记忆库作品列表。',
      inputSchema: z.object({
        response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const r = await memoryAction('list_works');
        const works = r.data || [];
        if (response_format === 'json') return toolResponse(formatJson(works), works);
        if (works.length === 0) return toolResponse('暂无作品记忆库。', works);
        return toolResponse(formatMarkdown('作品列表', [
          { title: `共 ${works.length} 个作品`, body: works.map((w, i) => `${i + 1}. **${w}**`).join('\n') }
        ]), works);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 9. 切换作品
  // ============================================================
  {
    name: 'wenxin_switch_work',
    config: {
      title: '切换作品',
      description: '切换到另一个已存在的作品记忆库。',
      inputSchema: z.object({
        workName: WorkNameSchema.describe('要切换到的作品名称'),
        response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ workName, response_format }) => {
      try {
        const r = await memoryAction('switch_work', { workName });
        if (response_format === 'json') return toolResponse(formatJson(r), r);
        return toolResponse(formatMarkdown('切换作品', [
          { title: '结果', body: r.message }
        ]), r);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 10. 情感追踪
  // ============================================================
  {
    name: 'wenxin_track_emotion',
    config: {
      title: '追踪角色情感弧线',
      description: '分析指定角色的情感变化轨迹，识别情感转折点。',
      inputSchema: z.object({
        charName: CharNameSchema.describe('角色名称'),
        response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ charName, response_format }) => {
      try {
        const r = await memoryAction('track_emotion', { charName });
        const arc = r.data || {};
        if (response_format === 'json') return toolResponse(formatJson(arc), arc);
        const sections = [
          { title: `角色: ${arc.character || charName}`, body: `总体趋势: ${arc.overallTrend || '平稳'}` },
          { title: '情感转折点', body: (arc.turningPoints || []).length > 0
            ? arc.turningPoints.map(tp => `- 第${tp.chapter + 1}章: ${tp.from} → ${tp.to} (${tp.direction})`).join('\n')
            : '暂无明显的转折点' }
        ];
        return toolResponse(formatMarkdown('情感弧线', sections), arc);
      } catch (e) { return handleError(e); }
    }
  }
];

/** 注册所有记忆工具到 MCP 服务器 */
export function registerMemoryTools(server) {
  for (const tool of memoryTools) {
    server.registerTool(tool.name, tool.config, tool.handler);
  }
}