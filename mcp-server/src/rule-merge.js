/**
 * 文心笔匠 MCP - 规则自动合入模块
 *
 * 将验证成功的规则自动写入对应的模块文件
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = join(__dirname, '..', '..');
const MODULES_DIR = join(WORKSPACE_ROOT, 'modules', 'modules');
const GROWTH_DIR = join(WORKSPACE_ROOT, 'growth', 'growth');
const RULE_LIBRARY_DIR = join(GROWTH_DIR, 'rule-library');

// 模块文件映射
const MODULE_FILE_MAP = {
  'world_building': '01-world-building.md',
  'character_design': '02-character-design.md',
  'plot_architecture': '03-plot-architecture.md',
  'text_quality': '04-text-quality.md',
  'web_novel': '05-web-novel.md',
  'advanced_tools': '06-advanced-tools.md'
};

// 规则分类到模块的映射
const RULE_TO_MODULE_MAP = {
  'writing-rules': 'text_quality',
  'quality-rules': 'text_quality',
  'anti-patterns': 'text_quality',
  'web-novel-rules': 'web_novel',
  'plot-rules': 'plot_architecture',
  'character-rules': 'character_design',
  'world-rules': 'world_building'
};

/**
 * 合入规则到模块文件
 * @param {Object} rule - 规则对象
 * @returns {Object} - 合入结果
 */
export function mergeRuleToModule(rule) {
  const result = { success: false, message: '', targetFile: '', section: '' };

  try {
    // 确定目标模块文件
    const moduleKey = RULE_TO_MODULE_MAP[rule.category] || 'text_quality';
    const moduleFile = MODULE_FILE_MAP[moduleKey];
    const modulePath = join(MODULES_DIR, moduleFile);

    if (!existsSync(modulePath)) {
      result.message = `目标模块文件不存在: ${moduleFile}`;
      return result;
    }

    result.targetFile = moduleFile;

    // 读取模块文件内容
    let moduleContent = readFileSync(modulePath, 'utf-8');

    // 构建规则文本
    const ruleText = buildRuleText(rule);

    // 确定插入位置（在对应章节末尾或文件末尾）
    const insertPosition = findInsertPosition(moduleContent, rule.category, rule.subCategory);

    // 插入规则
    if (insertPosition === 'end') {
      moduleContent += '\n\n' + ruleText;
    } else {
      const before = moduleContent.substring(0, insertPosition);
      const after = moduleContent.substring(insertPosition);
      moduleContent = before + ruleText + '\n\n' + after;
    }

    // 写入文件
    writeFileSync(modulePath, moduleContent, 'utf-8');

    // 更新规则库索引
    updateRuleLibraryIndex(rule);

    result.success = true;
    result.message = `规则已合入 ${moduleFile}`;
    result.section = rule.subCategory || '通用';

    return result;
  } catch (e) {
    result.message = `合入失败: ${e.message}`;
    return result;
  }
}

/**
 * 构建规则文本
 */
function buildRuleText(rule) {
  const lines = [];

  lines.push(`### ${rule.name}`);
  lines.push('');
  lines.push(`> 来源: 从 ${rule.sourceCases?.length || 0} 个案例中提炼 | 验证次数: ${rule.verifiedCount || 0} | 合入日期: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');
  lines.push(`**适用场景**: ${rule.applicableScenarios || '通用'}`);
  lines.push('');
  lines.push(`**规则内容**:`);
  lines.push('');
  lines.push(rule.content);
  lines.push('');

  if (rule.examples && rule.examples.length > 0) {
    lines.push(`**示例**:`);
    lines.push('');
    for (const example of rule.examples) {
      lines.push(`- ${example}`);
    }
    lines.push('');
  }

  if (rule.cautions && rule.cautions.length > 0) {
    lines.push(`**注意事项**:`);
    lines.push('');
    for (const caution of rule.cautions) {
      lines.push(`- ${caution}`);
    }
    lines.push('');
  }

  lines.push(`**规则编号**: ${rule.id}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * 找到插入位置
 */
function findInsertPosition(content, category, subCategory) {
  // 尝试找到对应章节
  if (subCategory) {
    const sectionPattern = new RegExp(`##+\\s*${subCategory}`, 'i');
    const match = content.match(sectionPattern);
    if (match && match.index !== undefined) {
      // 找到章节，在章节末尾插入
      const nextSectionPattern = /##+\s/g;
      const nextMatch = content.substring(match.index + 1).match(nextSectionPattern);
      if (nextMatch) {
        return match.index + 1 + nextMatch.index;
      }
    }
  }

  // 尝试找到分类标记
  const categoryPattern = new RegExp(`<!--\\s*${category}\\s*-->`, 'i');
  const categoryMatch = content.match(categoryPattern);
  if (categoryMatch && categoryMatch.index !== undefined) {
    return categoryMatch.index + categoryMatch[0].length;
  }

  // 默认插入到文件末尾
  return 'end';
}

/**
 * 更新规则库索引
 */
function updateRuleLibraryIndex(rule) {
  const indexPath = join(RULE_LIBRARY_DIR, 'index.md');

  if (!existsSync(indexPath)) {
    return;
  }

  let indexContent = readFileSync(indexPath, 'utf-8');

  // 更新统计
  const statsPattern = /(\|\\s*写作技法规则\\s*\\|\\s*)(\\d+)(\\s*\\|\\s*)(\\d+)(\\s*\\|\\s*)(\\d+)(\\s*\\|\\s*)(\\d+)(\\s*\\|\\s*)(\\d+)(\\s*\\|)/;
  if (rule.category === 'writing-rules') {
    indexContent = indexContent.replace(statsPattern, (match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10) => {
      const merged = parseInt(p6) + 1;
      const total = parseInt(p10) + 1;
      return `${p1}${p2}${p3}${p4}${p5}${merged}${p7}${p8}${p9}${total}${p10}`;
    });
  }

  // 在规则列表中添加条目
  const listPattern = /(\\|\\s*—\\s*\\|\\s*—\\s*\\|\\s*—\\s*\\|\\s*—\\s*\\|\\s*—\\s*\\|\\s*—\\s*\\|\\s*—\\s*\\|\\s*—\\s*\\|)/;
  const newRow = `| ${rule.id} | ${rule.name} | ${rule.category} | ⭐已合入模块 | ${rule.verifiedCount || 3}+ | ${rule.firstDiscovered || '-'} | ${new Date().toISOString().split('T')[0]} | ${MODULE_FILE_MAP[RULE_TO_MODULE_MAP[rule.category]] || '-'} |`;
  indexContent = indexContent.replace(listPattern, newRow + '\n' + listPattern[0]);

  writeFileSync(indexPath, indexContent, 'utf-8');
}

/**
 * 批量合入规则
 * @param {Array} rules - 规则数组
 * @returns {Object} - 批量合入结果
 */
export function batchMergeRules(rules) {
  const results = {
    total: rules.length,
    success: 0,
    failed: 0,
    details: []
  };

  for (const rule of rules) {
    const result = mergeRuleToModule(rule);
    results.details.push({
      ruleId: rule.id,
      ruleName: rule.name,
      ...result
    });

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
    }
  }

  return results;
}

/**
 * 检查待合入规则
 * @returns {Array} - 待合入的规则列表
 */
export function checkPendingRules() {
  const pendingRules = [];

  // 检查各规则库文件
  const ruleFiles = ['writing-rules.md', 'quality-rules.md', 'anti-patterns.md'];

  for (const file of ruleFiles) {
    const filePath = join(RULE_LIBRARY_DIR, file);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf-8');

    // 查找状态为"已确认"的规则
    const confirmedPattern = /###\\s+(.+?)\\n[^]*?状态[:\\s]+✅已确认/g;
    const matches = content.matchAll(confirmedPattern);

    for (const match of matches) {
      const ruleName = match[1];
      const ruleContent = match[0];

      // 提取验证次数
      const verifiedPattern = /验证案例[:\\s]+(\\d+)/;
      const verifiedMatch = ruleContent.match(verifiedPattern);
      const verifiedCount = verifiedMatch ? parseInt(verifiedMatch[1]) : 0;

      if (verifiedCount >= 3) {
        pendingRules.push({
          name: ruleName,
          category: file.replace('.md', ''),
          verifiedCount,
          content: ruleContent,
          sourceFile: file
        });
      }
    }
  }

  return pendingRules;
}

/**
 * 自动合入所有待合入规则
 * @returns {Object} - 合入结果
 */
export function autoMergeAllPendingRules() {
  const pendingRules = checkPendingRules();

  if (pendingRules.length === 0) {
    return {
      message: '没有待合入的规则',
      pending: 0,
      merged: 0
    };
  }

  // 为每个规则生成ID
  for (const rule of pendingRules) {
    rule.id = `RULE-${rule.category}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  const results = batchMergeRules(pendingRules);

  return {
    message: `发现 ${pendingRules.length} 条待合入规则，成功合入 ${results.success} 条`,
    pending: pendingRules.length,
    merged: results.success,
    failed: results.failed,
    details: results.details
  };
}