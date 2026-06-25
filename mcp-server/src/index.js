#!/usr/bin/env node
/**
 * 文心笔匠 MCP Server - stdio 模式入口
 *
 * 用于本地 AI 客户端（如 Trae IDE）的 stdio 传输模式
 *
 * 使用方式:
 *   启动: node src/index.js
 *   MCP 客户端配置:
 *     {
 *       "mcpServers": {
 *         "wenxin-bijiang": {
 *           "command": "node",
 *           "args": ["mcp-server/src/index.js"],
 *           "cwd": "/workspace"
 *         }
 *       }
 *     }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerMemoryTools } from './memory-tools.js';
import { registerModuleTools } from './module-tools.js';
import { registerEvolutionTools } from './evolution-tools.js';

// 创建 MCP 服务器实例
const server = new McpServer({
  name: 'wenxin-bijiang-mcp-server',
  version: '1.1.0',
  description: '文心笔匠 AI 写作助手 MCP Server - 结构化记忆系统、写作方法论、进化学习系统'
});

// 注册所有工具
registerMemoryTools(server);
registerModuleTools(server);
registerEvolutionTools(server);

// 启动 stdio 传输
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ 文心笔匠 MCP Server 已启动 (stdio 模式)');
    console.error(`   已注册 ${server._registeredTools?.size || '很多'} 个工具`);
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
}

main();