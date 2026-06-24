#!/usr/bin/env node
/**
 * 文心笔匠 MCP Server - HTTP 模式入口
 *
 * 用于云端部署（如 Cloudflare Workers / 自有服务器）的 HTTP 传输模式
 *
 * 使用方式:
 *   启动: node src/http-server.js
 *   访问: POST http://localhost:3000/mcp
 *   健康检查: GET http://localhost:3000/health
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { registerMemoryTools } from './memory-tools.js';
import { registerModuleTools } from './module-tools.js';

// 创建 MCP 服务器实例
const server = new McpServer({
  name: 'wenxin-bijiang-mcp-server',
  version: '1.0.0',
  description: '文心笔匠 AI 写作助手 MCP Server'
});

// 注册所有工具
registerMemoryTools(server);
registerModuleTools(server);

const app = express();
app.use(express.json());

// ============================================================
// MCP 端点
// ============================================================
app.post('/mcp', async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on('close', () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP 请求处理失败:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: `MCP 请求处理失败: ${error.message}` });
    }
  }
});

// ============================================================
// 健康检查
// ============================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'wenxin-bijiang-mcp-server',
    version: '1.0.0',
    tools: {
      memory: 10,
      modules: 8
    },
    timestamp: Date.now()
  });
});

// ============================================================
// 工具列表（人类可读）
// ============================================================
app.get('/tools', (req, res) => {
  const tools = [
    ...['wenxin_init_work', 'wenxin_record_chapter', 'wenxin_record_character', 'wenxin_search_memory',
      'wenxin_load_base', 'wenxin_check_consistency', 'wenxin_full_analysis', 'wenxin_list_works',
      'wenxin_switch_work', 'wenxin_track_emotion'].map(n => ({ name: n, type: 'memory' })),
    ...['wenxin_world_building_guide', 'wenxin_character_design_guide', 'wenxin_plot_architecture_guide',
      'wenxin_text_quality_guide', 'wenxin_web_novel_guide', 'wenxin_advanced_tools_guide',
      'wenxin_list_modules', 'wenxin_get_skill_definition'].map(n => ({ name: n, type: 'module' }))
  ];
  res.json({ total: tools.length, tools });
});

const PORT = parseInt(process.env.PORT || '3000');
app.listen(PORT, () => {
  console.error(`✅ 文心笔匠 MCP Server 已启动 (HTTP 模式)`);
  console.error(`   MCP 端点: POST http://localhost:${PORT}/mcp`);
  console.error(`   健康检查: GET  http://localhost:${PORT}/health`);
  console.error(`   工具列表: GET  http://localhost:${PORT}/tools`);
});