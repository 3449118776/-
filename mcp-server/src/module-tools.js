/**
 * 文心笔匠 MCP - 创作模块工具
 *
 * 提供六大写作模块的方法论查询工具
 */

import { z } from 'zod';
import { loadModuleDoc, listModules, loadSkillDoc, loadGrowthDoc, toolResponse, handleError, formatMarkdown, formatJson } from './shared.js';

const ResponseFormatEnum = z.enum(['markdown', 'json']).default('markdown');

export const moduleTools = [
  // ============================================================
  // 1. 世界观构建
  // ============================================================
  {
    name: 'wenxin_world_building_guide',
    config: {
      title: '世界观构建指南',
      description: `获取小说世界观构建的完整方法论，包括力量体系、势力格局、地理环境、社会结构、历史背景等维度的设计指导。

Args:
  (none)

Returns:
  Markdown: 世界观构建指南全文

Examples:
  - Use when: "帮我设计一个修真世界的世界观"
  - Use when: 用户涉及世界观/设定/世界逻辑时`,
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const content = loadModuleDoc('world_building_guide');
        if (!content) return toolResponse('⚠️ 世界观构建指南暂未加载。请确保模块文件存在。');
        if (response_format === 'json') return toolResponse(formatJson({ module: 'world_building_guide', length: content.length }), { module: 'world_building_guide', content_length: content.length });
        // 截断到合适长度
        const truncated = content.length > 20000 ? content.substring(0, 20000) + '\n\n...(内容过长已截断)' : content;
        return toolResponse(truncated);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 2. 人物设计
  // ============================================================
  {
    name: 'wenxin_character_design_guide',
    config: {
      title: '人物设计指南',
      description: `获取小说人物设计的完整方法论，包括基础信息、核心动机、性格特质、弱点缺陷、能力特长、背景故事、人物弧光等维度的设计指导。

Args:
  (none)

Returns:
  Markdown: 人物设计指南全文`,
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const content = loadModuleDoc('character_design_guide');
        if (!content) return toolResponse('⚠️ 人物设计指南暂未加载。请确保模块文件存在。');
        if (response_format === 'json') return toolResponse(formatJson({ module: 'character_design_guide', length: content.length }));
        const truncated = content.length > 20000 ? content.substring(0, 20000) + '\n\n...(内容过长已截断)' : content;
        return toolResponse(truncated);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 3. 剧情架构
  // ============================================================
  {
    name: 'wenxin_plot_architecture_guide',
    config: {
      title: '剧情架构指南',
      description: `获取小说剧情架构的完整方法论，包括三幕式结构、每卷得失三问、三层伏笔网络、节奏控制、钩子强度等设计指导。

Args:
  (none)

Returns:
  Markdown: 剧情架构指南全文`,
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const content = loadModuleDoc('plot_architecture_guide');
        if (!content) return toolResponse('⚠️ 剧情架构指南暂未加载。');
        if (response_format === 'json') return toolResponse(formatJson({ module: 'plot_architecture_guide', length: content.length }));
        const truncated = content.length > 20000 ? content.substring(0, 20000) + '\n\n...(内容过长已截断)' : content;
        return toolResponse(truncated);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 4. 正文质量
  // ============================================================
  {
    name: 'wenxin_text_quality_guide',
    config: {
      title: '正文质量指南',
      description: `获取正文写作与质量提升的完整方法论，包括白金作家创作法则、17维度质量评估、风格分析与蒸馏、反陈词滥调等技术。

Args:
  (none)

Returns:
  Markdown: 正文质量指南全文`,
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const content = loadModuleDoc('text_quality_guide');
        if (!content) return toolResponse('⚠️ 正文质量指南暂未加载。');
        if (response_format === 'json') return toolResponse(formatJson({ module: 'text_quality_guide', length: content.length }));
        const truncated = content.length > 20000 ? content.substring(0, 20000) + '\n\n...(内容过长已截断)' : content;
        return toolResponse(truncated);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 5. 网文特化
  // ============================================================
  {
    name: 'wenxin_web_novel_guide',
    config: {
      title: '网文特化指南',
      description: `获取网络小说创作的特化方法论，包括平台选型、黄金三章、爽感工程、日更节奏、人设工厂、细纲生成、章尾钩子、数据复盘等10大模块。

Args:
  (none)

Returns:
  Markdown: 网文特化指南全文`,
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const content = loadModuleDoc('web_novel_guide');
        if (!content) return toolResponse('⚠️ 网文特化指南暂未加载。');
        if (response_format === 'json') return toolResponse(formatJson({ module: 'web_novel_guide', length: content.length }));
        const truncated = content.length > 20000 ? content.substring(0, 20000) + '\n\n...(内容过长已截断)' : content;
        return toolResponse(truncated);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 6. 高级工具
  // ============================================================
  {
    name: 'wenxin_advanced_tools_guide',
    config: {
      title: '高级工具指南',
      description: `获取高级创作工具的完整方法论，包括因果逻辑检测、题材特化引擎等。

Args:
  (none)

Returns:
  Markdown: 高级工具指南全文`,
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const content = loadModuleDoc('advanced_tools_guide');
        if (!content) return toolResponse('⚠️ 高级工具指南暂未加载。');
        if (response_format === 'json') return toolResponse(formatJson({ module: 'advanced_tools_guide', length: content.length }));
        const truncated = content.length > 20000 ? content.substring(0, 20000) + '\n\n...(内容过长已截断)' : content;
        return toolResponse(truncated);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 7. 列出模块
  // ============================================================
  {
    name: 'wenxin_list_modules',
    config: {
      title: '列出写作模块',
      description: '列出所有可用的写作模块及其简介。',
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const modules = listModules();
        if (response_format === 'json') return toolResponse(formatJson(modules), modules);
        const body = modules.length > 0
          ? modules.map((m, i) => `${i + 1}. **${m.name}** (${m.file})`).join('\n')
          : '暂无写作模块。';
        return toolResponse(formatMarkdown('写作模块列表', [
          { title: `共 ${modules.length} 个模块`, body }
        ]), modules);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 8. 获取 SKILL 定义
  // ============================================================
  {
    name: 'wenxin_get_skill_definition',
    config: {
      title: '获取 SKILL 定义',
      description: '获取文心笔匠的完整 SKILL 定义文档，包含路由调度、MCP 工具索引、偏好管理规则等。',
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const content = loadSkillDoc();
        if (!content) return toolResponse('⚠️ SKILL.md 文件不存在。');
        if (response_format === 'json') return toolResponse(formatJson({ length: content.length }));
        const truncated = content.length > 25000 ? content.substring(0, 25000) + '\n\n...(内容过长已截断)' : content;
        return toolResponse(truncated);
      } catch (e) { return handleError(e); }
    }
  }
];

/** 注册所有模块工具到 MCP 服务器 */
export function registerModuleTools(server) {
  for (const tool of moduleTools) {
    server.registerTool(tool.name, tool.config, tool.handler);
  }
}