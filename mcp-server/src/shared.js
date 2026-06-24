/**
 * MCP Server for 文心笔匠 - Shared Utilities
 *
 * 共享工具函数：错误处理、响应格式化、记忆系统适配
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = join(__dirname, '..', '..');

// ============================================================
// 路径与文件工具
// ============================================================

/** 获取项目根目录 */
export function getRoot() {
  return WORKSPACE_ROOT;
}

/** 加载 Markdown 模块文档 */
export function loadModuleDoc(moduleName) {
  const modulesDir = join(WORKSPACE_ROOT, 'modules', 'modules');
  const fileMap = {
    world_building_guide: '01-world-building.md',
    character_design_guide: '02-character-design.md',
    plot_architecture_guide: '03-plot-architecture.md',
    text_quality_guide: '04-text-quality.md',
    web_novel_guide: '05-web-novel.md',
    advanced_tools_guide: '06-advanced-tools.md'
  };
  const fileName = fileMap[moduleName];
  if (!fileName) return null;
  const filePath = join(modulesDir, fileName);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf-8');
}

/** 列出所有模块 */
export function listModules() {
  const modulesDir = join(WORKSPACE_ROOT, 'modules', 'modules');
  if (!existsSync(modulesDir)) return [];
  return readdirSync(modulesDir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      file: f,
      name: f.replace(/^\d+-/, '').replace(/\.md$/, ''),
      path: join(modulesDir, f)
    }));
}

/** 加载 SKILL.md */
export function loadSkillDoc() {
  const path = join(WORKSPACE_ROOT, 'SKILL.md');
  return existsSync(path) ? readFileSync(path, 'utf-8') : null;
}

/** 加载成长系统内容 */
export function loadGrowthDoc(subpath) {
  const fullPath = join(WORKSPACE_ROOT, 'growth', 'growth', subpath || '');
  if (!existsSync(fullPath)) return null;
  if (statSync(fullPath).isDirectory()) {
    return readdirSync(fullPath)
      .filter(f => f.endsWith('.md'))
      .map(f => ({ file: f, content: readFileSync(join(fullPath, f), 'utf-8') }));
  }
  return readFileSync(fullPath, 'utf-8');
}

// ============================================================
// 记忆系统适配器
// ============================================================

let memoryEngine = null;

/** 动态加载记忆引擎 */
export async function getMemoryEngine() {
  if (memoryEngine) return memoryEngine;
  try {
    const entryPath = join(WORKSPACE_ROOT, 'memory_system_v2', 'memory_system_v2', 'engine', 'entry_v2.js');
    if (existsSync(entryPath)) {
      const mod = await import(entryPath);
      memoryEngine = mod;
      return memoryEngine;
    }
  } catch (e) {
    console.error('无法加载记忆引擎:', e.message);
  }
  return null;
}

/** 执行记忆系统操作 */
export async function memoryAction(action, params = {}) {
  const engine = await getMemoryEngine();
  if (!engine || typeof engine.main !== 'function') {
    return { success: false, message: '记忆引擎不可用', data: null };
  }
  try {
    const result = await engine.main({ action, ...params });
    return result;
  } catch (e) {
    return { success: false, message: `记忆操作失败: ${e.message}`, data: null };
  }
}

/** 检测是否存在默认的记忆数据 */
export function checkMemoryData() {
  const dataDir = join(WORKSPACE_ROOT, 'memory_system_v2', 'memory_system_v2', 'engine', 'data');
  if (!existsSync(dataDir)) return false;
  const files = readdirSync(dataDir).filter(f => f.endsWith('.json'));
  return files.length > 0;
}

// ============================================================
// 格式化工具
// ============================================================

const CHARACTER_LIMIT = 25000;

/** 格式化 Markdown 响应（含截断保护） */
export function formatMarkdown(title, sections) {
  const lines = [`# ${title}`, ''];
  for (const section of sections) {
    if (section.title) lines.push(`## ${section.title}`, '');
    if (section.body) lines.push(section.body, '');
  }
  const text = lines.join('\n');
  if (text.length > CHARACTER_LIMIT) {
    return text.substring(0, CHARACTER_LIMIT) + '\n\n...(响应过长已截断)';
  }
  return text;
}

/** 格式化 JSON 响应（含截断保护） */
export function formatJson(data) {
  const text = JSON.stringify(data, null, 2);
  if (text.length > CHARACTER_LIMIT) {
    return text.substring(0, CHARACTER_LIMIT) + '\n\n...(响应过长已截断)';
  }
  return text;
}

/** 构建工具响应 */
export function toolResponse(textContent, structuredData) {
  const response = {
    content: [{ type: 'text', text: textContent }]
  };
  if (structuredData !== undefined) {
    response.structuredContent = structuredData;
  }
  return response;
}

// ============================================================
// 错误处理
// ============================================================

export function handleError(error) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error('MCP Error:', msg);
  return {
    content: [{ type: 'text', text: `错误: ${msg}` }]
  };
}