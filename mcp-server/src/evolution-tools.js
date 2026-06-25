/**
 * 文心笔匠 MCP - 进化系统工具
 *
 * 提供进化计数器管理、自动触发规则提炼、偏好升级等能力
 */

import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { toolResponse, handleError, formatMarkdown, formatJson } from './shared.js';
import { mergeRuleToModule, checkPendingRules, autoMergeAllPendingRules } from './rule-merge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = join(__dirname, '..', '..');
const GROWTH_DIR = join(WORKSPACE_ROOT, 'growth', 'growth');

const ResponseFormatEnum = z.enum(['markdown', 'json']).default('markdown');

// ============================================================
// 进化计数器管理
// ============================================================

/** 加载进化计数器 */
function loadEvolutionCounter() {
  const counterPath = join(GROWTH_DIR, 'evolution-counter.json');
  if (!existsSync(counterPath)) {
    return {
      thresholds: {
        successForRule: 3,
        failForAntiPattern: 2,
        preferenceForConfirm: 2,
        ruleVerificationForConfirm: 3,
        ruleVerificationForDiscard: 2
      },
      problemTypeCounter: {},
      preferenceCounter: { style: {}, content: {}, interaction: {} },
      ruleVerificationCounter: { 'writing-rules': {}, 'quality-rules': {}, 'anti-patterns': {} },
      triggerHistory: [],
      statistics: { totalCases: 0, totalSuccess: 0, totalFail: 0, evolutionLevel: 'Lv.1', evolutionPoints: 0 }
    };
  }
  try {
    return JSON.parse(readFileSync(counterPath, 'utf-8'));
  } catch (e) {
    console.error('加载进化计数器失败:', e.message);
    return null;
  }
}

/** 保存进化计数器 */
function saveEvolutionCounter(counter) {
  const counterPath = join(GROWTH_DIR, 'evolution-counter.json');
  try {
    counter.lastUpdated = new Date().toISOString().split('T')[0];
    writeFileSync(counterPath, JSON.stringify(counter, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('保存进化计数器失败:', e.message);
    return false;
  }
}

/** 更新问题类型计数器 */
function updateProblemCounter(counter, problemType, resultType, caseId) {
  if (!counter.problemTypeCounter[problemType]) {
    counter.problemTypeCounter[problemType] = {
      success: 0, fail: 0, adjust: 0,
      lastSuccessDate: null, lastFailDate: null,
      relatedCases: [], potentialRule: null, status: 'none'
    };
  }

  const pc = counter.problemTypeCounter[problemType];
  const today = new Date().toISOString().split('T')[0];

  if (resultType === 'success') {
    pc.success += 1;
    pc.lastSuccessDate = today;
    pc.relatedCases.push(caseId);
    counter.statistics.totalSuccess += 1;
  } else if (resultType === 'fail') {
    pc.fail += 1;
    pc.lastFailDate = today;
    pc.relatedCases.push(caseId);
    counter.statistics.totalFail += 1;
  } else if (resultType === 'adjust') {
    pc.adjust += 1;
    counter.statistics.totalAdjust += 1;
  }

  counter.statistics.totalCases += 1;
  counter.statistics.evolutionPoints += resultType === 'success' ? 10 : (resultType === 'fail' ? 5 : 3);

  // 更新进化等级
  const points = counter.statistics.evolutionPoints;
  if (points >= 1000) counter.statistics.evolutionLevel = 'Lv.10';
  else if (points >= 500) counter.statistics.evolutionLevel = 'Lv.5';
  else if (points >= 200) counter.statistics.evolutionLevel = 'Lv.3';
  else if (points >= 50) counter.statistics.evolutionLevel = 'Lv.2';
  else counter.statistics.evolutionLevel = 'Lv.1';

  return checkThreshold(counter, problemType, resultType);
}

/** 检查是否达到阈值 */
function checkThreshold(counter, problemType, resultType) {
  const thresholds = counter.thresholds;
  const pc = counter.problemTypeCounter[problemType];
  const triggers = [];

  // 成功案例达到阈值 → 提醒提炼规则
  if (resultType === 'success' && pc.success >= thresholds.successForRule) {
    triggers.push({
      type: 'rule_extraction',
      problemType,
      message: `「${problemType}」成功案例已达 ${pc.success} 次，建议检查是否可提炼新规则`,
      priority: 'high',
      relatedCases: pc.relatedCases.slice(-thresholds.successForRule)
    });
    pc.status = 'rule_pending';
  }

  // 失败案例达到阈值 → 提醒写入反模式
  if (resultType === 'fail' && pc.fail >= thresholds.failForAntiPattern) {
    triggers.push({
      type: 'anti_pattern',
      problemType,
      message: `「${problemType}」失败案例已达 ${pc.fail} 次，建议分析失败模式，写入反模式库`,
      priority: 'high',
      relatedCases: pc.relatedCases.slice(-thresholds.failForAntiPattern)
    });
  }

  if (triggers.length > 0) {
    counter.triggerHistory.push({
      date: new Date().toISOString(),
      triggers
    });
  }

  return triggers;
}

/** 更新偏好计数器 */
function updatePreferenceCounter(counter, preferenceType, preferenceKey, preferenceValue) {
  if (!counter.preferenceCounter[preferenceType]) {
    counter.preferenceCounter[preferenceType] = {};
  }

  const pc = counter.preferenceCounter[preferenceType];
  const key = `${preferenceKey}:${preferenceValue}`;

  if (!pc[key]) {
    pc[key] = { count: 0, status: 'observing', firstSeen: new Date().toISOString(), lastSeen: null };
  }

  pc[key].count += 1;
  pc[key].lastSeen = new Date().toISOString();

  // 检查是否达到确认阈值
  const triggers = [];
  if (pc[key].count >= counter.thresholds.preferenceForConfirm && pc[key].status === 'observing') {
    pc[key].status = 'confirmed';
    triggers.push({
      type: 'preference_confirm',
      preferenceType,
      preferenceKey,
      preferenceValue,
      message: `偏好「${preferenceKey}: ${preferenceValue}」已确认（出现 ${pc[key].count} 次）`,
      priority: 'medium'
    });
    counter.statistics.totalPreferencesConfirmed += 1;
  }

  return triggers;
}

/** 更新规则验证计数器 */
function updateRuleVerificationCounter(counter, ruleCategory, ruleId, verified) {
  if (!counter.ruleVerificationCounter[ruleCategory]) {
    counter.ruleVerificationCounter[ruleCategory] = {};
  }

  const rc = counter.ruleVerificationCounter[ruleCategory];
  if (!rc[ruleId]) {
    rc[ruleId] = { verifiedCount: 0, failedCount: 0, status: 'verifying' };
  }

  if (verified) {
    rc[ruleId].verifiedCount += 1;
  } else {
    rc[ruleId].failedCount += 1;
  }

  const triggers = [];

  // 验证成功达到阈值 → 升级为已确认
  if (rc[ruleId].verifiedCount >= counter.thresholds.ruleVerificationForConfirm) {
    rc[ruleId].status = 'confirmed';
    triggers.push({
      type: 'rule_confirm',
      ruleCategory,
      ruleId,
      message: `规则「${ruleId}」验证成功 ${rc[ruleId].verifiedCount} 次，建议合入模块`,
      priority: 'high'
    });
    counter.statistics.totalRulesGenerated += 1;
  }

  // 验证失败达到阈值 → 废弃
  if (rc[ruleId].failedCount >= counter.thresholds.ruleVerificationForDiscard) {
    rc[ruleId].status = 'discarded';
    triggers.push({
      type: 'rule_discard',
      ruleCategory,
      ruleId,
      message: `规则「${ruleId}」验证失败 ${rc[ruleId].failedCount} 次，建议废弃`,
      priority: 'medium'
    });
  }

  return triggers;
}

// ============================================================
// MCP 工具定义
// ============================================================

export const evolutionTools = [
  // ============================================================
  // 1. 记录进化事件
  // ============================================================
  {
    name: 'wenxin_record_evolution',
    config: {
      title: '记录进化事件',
      description: `记录一次进化事件（成功/失败/调整案例），自动更新计数器，检查阈值触发。

Args:
  - eventType (string): 事件类型 - success / fail / adjust / preference / rule_verify
  - problemType (string): 问题类型 - dialogue-polish / rhythm-adjust / character-polish 等
  - caseId (string): 案例ID（如 CASE-001）
  - details (object): 详细信息

Returns:
  触发提醒列表（如果达到阈值）`,
      inputSchema: z.object({
        eventType: z.enum(['success', 'fail', 'adjust', 'preference', 'rule_verify']).describe('事件类型'),
        problemType: z.string().describe('问题类型'),
        caseId: z.string().optional().describe('案例ID'),
        details: z.object({
          preferenceType: z.string().optional().describe('偏好类型（style/content/interaction）'),
          preferenceKey: z.string().optional().describe('偏好键'),
          preferenceValue: z.string().optional().describe('偏好值'),
          ruleCategory: z.string().optional().describe('规则分类'),
          ruleId: z.string().optional().describe('规则ID'),
          verified: z.boolean().optional().describe('是否验证成功')
        }).optional().describe('详细信息'),
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    handler: async ({ eventType, problemType, caseId, details, response_format }) => {
      try {
        const counter = loadEvolutionCounter();
        if (!counter) return toolResponse('⚠️ 进化计数器不可用');

        let triggers = [];

        if (eventType === 'success' || eventType === 'fail' || eventType === 'adjust') {
          triggers = updateProblemCounter(counter, problemType, eventType, caseId || 'unknown');
        } else if (eventType === 'preference' && details) {
          triggers = updatePreferenceCounter(counter, details.preferenceType, details.preferenceKey, details.preferenceValue);
        } else if (eventType === 'rule_verify' && details) {
          triggers = updateRuleVerificationCounter(counter, details.ruleCategory, details.ruleId, details.verified);
        }

        saveEvolutionCounter(counter);

        if (response_format === 'json') return toolResponse(formatJson({ eventType, triggers, statistics: counter.statistics }), { triggers, statistics: counter.statistics });

        const sections = [
          { title: '事件已记录', body: `类型: ${eventType} | 问题: ${problemType}` },
          { title: '进化统计', body: `等级: ${counter.statistics.evolutionLevel} | 积分: ${counter.statistics.evolutionPoints}` }
        ];

        if (triggers.length > 0) {
          sections.push({
            title: '⚡ 触发提醒',
            body: triggers.map(t => `- [${t.priority}] ${t.message}`).join('\n')
          });
        }

        return toolResponse(formatMarkdown('进化记录', sections), { triggers, statistics: counter.statistics });
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 2. 查看进化状态
  // ============================================================
  {
    name: 'wenxin_get_evolution_status',
    config: {
      title: '查看进化状态',
      description: `查看当前进化系统的整体状态，包括等级、积分、各类计数器、触发历史等。`,
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const counter = loadEvolutionCounter();
        if (!counter) return toolResponse('⚠️ 进化计数器不可用');

        if (response_format === 'json') return toolResponse(formatJson(counter), counter);

        const sections = [
          { title: '进化等级', body: `${counter.statistics.evolutionLevel} | 积分: ${counter.statistics.evolutionPoints}` },
          { title: '案例统计', body: `成功: ${counter.statistics.totalSuccess} | 失败: ${counter.statistics.totalFail} | 调整: ${counter.statistics.totalAdjust}` },
          { title: '偏好确认', body: `已确认偏好: ${counter.statistics.totalPreferencesConfirmed}` },
          { title: '规则生成', body: `已生成规则: ${counter.statistics.totalRulesGenerated}` }
        ];

        // 显示各问题类型的计数
        const problemTypes = Object.keys(counter.problemTypeCounter || {});
        if (problemTypes.length > 0) {
          sections.push({
            title: '问题类型计数',
            body: problemTypes.map(pt => {
              const pc = counter.problemTypeCounter[pt];
              return `- **${pt}**: 成功 ${pc.success} / 失败 ${pc.fail} / 状态 ${pc.status || 'none'}`;
            }).join('\n')
          });
        }

        // 显示最近的触发历史
        const history = counter.triggerHistory || [];
        if (history.length > 0) {
          const recent = history.slice(-5);
          sections.push({
            title: '最近触发',
            body: recent.map(h => `${h.date}: ${h.triggers.map(t => t.type).join(', ')}`).join('\n')
          });
        }

        return toolResponse(formatMarkdown('进化状态', sections), counter);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 3. 检查阈值触发
  // ============================================================
  {
    name: 'wenxin_check_thresholds',
    config: {
      title: '检查阈值触发',
      description: `检查所有计数器是否达到阈值，返回需要处理的触发提醒。`,
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const counter = loadEvolutionCounter();
        if (!counter) return toolResponse('⚠️ 进化计数器不可用');

        const triggers = [];
        const thresholds = counter.thresholds;

        // 检查问题类型计数器
        for (const pt of Object.keys(counter.problemTypeCounter || {})) {
          const pc = counter.problemTypeCounter[pt];
          if (pc.success >= thresholds.successForRule && pc.status !== 'rule_extracted') {
            triggers.push({
              type: 'rule_extraction',
              problemType: pt,
              count: pc.success,
              message: `「${pt}」成功案例已达阈值，建议提炼规则`,
              priority: 'high'
            });
          }
          if (pc.fail >= thresholds.failForAntiPattern) {
            triggers.push({
              type: 'anti_pattern',
              problemType: pt,
              count: pc.fail,
              message: `「${pt}」失败案例已达阈值，建议写入反模式`,
              priority: 'high'
            });
          }
        }

        // 检查偏好计数器
        for (const pType of Object.keys(counter.preferenceCounter || {})) {
          for (const key of Object.keys(counter.preferenceCounter[pType] || {})) {
            const pc = counter.preferenceCounter[pType][key];
            if (pc.count >= thresholds.preferenceForConfirm && pc.status === 'observing') {
              triggers.push({
                type: 'preference_confirm',
                preferenceType: pType,
                key,
                count: pc.count,
                message: `偏好「${key}」达到确认阈值`,
                priority: 'medium'
              });
            }
          }
        }

        // 检查规则验证计数器
        for (const rCat of Object.keys(counter.ruleVerificationCounter || {})) {
          for (const rId of Object.keys(counter.ruleVerificationCounter[rCat] || {})) {
            const rc = counter.ruleVerificationCounter[rCat][rId];
            if (rc.verifiedCount >= thresholds.ruleVerificationForConfirm && rc.status === 'verifying') {
              triggers.push({
                type: 'rule_confirm',
                ruleCategory: rCat,
                ruleId: rId,
                count: rc.verifiedCount,
                message: `规则「${rId}」验证成功，建议合入模块`,
                priority: 'high'
              });
            }
            if (rc.failedCount >= thresholds.ruleVerificationForDiscard) {
              triggers.push({
                type: 'rule_discard',
                ruleCategory: rCat,
                ruleId: rId,
                count: rc.failedCount,
                message: `规则「${rId}」验证失败，建议废弃`,
                priority: 'medium'
              });
            }
          }
        }

        if (response_format === 'json') return toolResponse(formatJson({ triggers, count: triggers.length }), { triggers, count: triggers.length });

        if (triggers.length === 0) {
          return toolResponse('✅ 当前无阈值触发，进化系统正常运行。', { triggers: [], count: 0 });
        }

        const sections = [
          { title: `发现 ${triggers.length} 个触发`, body: '' },
          { title: '高优先级', body: triggers.filter(t => t.priority === 'high').map(t => `- [${t.type}] ${t.message}`).join('\n') || '无' },
          { title: '中优先级', body: triggers.filter(t => t.priority === 'medium').map(t => `- [${t.type}] ${t.message}`).join('\n') || '无' }
        ];

        return toolResponse(formatMarkdown('阈值检查', sections), { triggers, count: triggers.length });
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 4. 标记规则已处理
  // ============================================================
  {
    name: 'wenxin_mark_rule_processed',
    config: {
      title: '标记规则已处理',
      description: `标记某个规则触发已被处理（已提炼/已合入/已废弃），更新计数器状态。`,
      inputSchema: z.object({
        problemType: z.string().describe('问题类型'),
        action: z.enum(['extracted', 'merged', 'discarded']).describe('处理动作'),
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    handler: async ({ problemType, action, response_format }) => {
      try {
        const counter = loadEvolutionCounter();
        if (!counter) return toolResponse('⚠️ 进化计数器不可用');

        if (!counter.problemTypeCounter[problemType]) {
          return toolResponse(`⚠️ 问题类型「${problemType}」不存在`);
        }

        const pc = counter.problemTypeCounter[problemType];

        if (action === 'extracted') {
          pc.status = 'rule_extracted';
          pc.potentialRule = `RULE-${problemType}-${Date.now()}`;
        } else if (action === 'merged') {
          pc.status = 'rule_merged';
          counter.statistics.totalRulesGenerated += 1;
        } else if (action === 'discarded') {
          pc.status = 'discarded';
        }

        saveEvolutionCounter(counter);

        if (response_format === 'json') return toolResponse(formatJson({ problemType, action, status: pc.status }), { problemType, action, status: pc.status });

        return toolResponse(formatMarkdown('规则已处理', [
          { title: '问题类型', body: problemType },
          { title: '处理动作', body: action },
          { title: '新状态', body: pc.status }
        ]), { problemType, action, status: pc.status });
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 5. 检查待合入规则
  // ============================================================
  {
    name: 'wenxin_check_pending_rules',
    config: {
      title: '检查待合入规则',
      description: `检查规则库中所有已确认但尚未合入模块的规则，返回待合入列表。`,
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const pendingRules = checkPendingRules();

        if (response_format === 'json') return toolResponse(formatJson({ pendingRules, count: pendingRules.length }), { pendingRules, count: pendingRules.length });

        if (pendingRules.length === 0) {
          return toolResponse('✅ 没有待合入的规则。', { pendingRules: [], count: 0 });
        }

        const sections = [
          { title: `发现 ${pendingRules.length} 条待合入规则`, body: '' },
          { title: '规则列表', body: pendingRules.map(r => `- **${r.name}** (${r.category}) - 验证 ${r.verifiedCount} 次`).join('\n') }
        ];

        return toolResponse(formatMarkdown('待合入规则', sections), { pendingRules, count: pendingRules.length });
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 6. 自动合入规则
  // ============================================================
  {
    name: 'wenxin_auto_merge_rules',
    config: {
      title: '自动合入规则',
      description: `自动将所有已确认的规则合入对应的模块文件。合入后规则将永久生效。`,
      inputSchema: z.object({
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    handler: async ({ response_format }) => {
      try {
        const result = autoMergeAllPendingRules();

        if (response_format === 'json') return toolResponse(formatJson(result), result);

        const sections = [
          { title: '合入结果', body: result.message },
          { title: '统计', body: `待合入: ${result.pending} | 成功: ${result.merged} | 失败: ${result.failed || 0}` }
        ];

        if (result.details && result.details.length > 0) {
          sections.push({
            title: '详情',
            body: result.details.map(d => `- ${d.ruleName}: ${d.success ? '✅ 成功' : '❌ ' + d.message}`).join('\n')
          });
        }

        return toolResponse(formatMarkdown('规则合入', sections), result);
      } catch (e) { return handleError(e); }
    }
  },

  // ============================================================
  // 7. 手动合入单条规则
  // ============================================================
  {
    name: 'wenxin_merge_single_rule',
    config: {
      title: '手动合入单条规则',
      description: `手动将一条规则合入模块文件。适用于需要精确控制合入位置的场景。`,
      inputSchema: z.object({
        ruleId: z.string().describe('规则ID'),
        ruleName: z.string().describe('规则名称'),
        ruleCategory: z.string().describe('规则分类（writing-rules/quality-rules/anti-patterns等）'),
        ruleContent: z.string().describe('规则内容'),
        verifiedCount: z.number().default(3).describe('验证次数'),
        applicableScenarios: z.string().optional().describe('适用场景'),
        examples: z.array(z.string()).optional().describe('示例'),
        cautions: z.array(z.string()).optional().describe('注意事项'),
        response_format: ResponseFormatEnum.describe('输出格式')
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    handler: async ({ ruleId, ruleName, ruleCategory, ruleContent, verifiedCount, applicableScenarios, examples, cautions, response_format }) => {
      try {
        const rule = {
          id: ruleId,
          name: ruleName,
          category: ruleCategory,
          content: ruleContent,
          verifiedCount,
          applicableScenarios,
          examples,
          cautions
        };

        const result = mergeRuleToModule(rule);

        if (response_format === 'json') return toolResponse(formatJson(result), result);

        if (result.success) {
          return toolResponse(formatMarkdown('规则合入成功', [
            { title: '规则名称', body: ruleName },
            { title: '目标文件', body: result.targetFile },
            { title: '插入位置', body: result.section }
          ]), result);
        } else {
          return toolResponse(formatMarkdown('规则合入失败', [
            { title: '错误信息', body: result.message }
          ]), result);
        }
      } catch (e) { return handleError(e); }
    }
  }
];

/** 注册所有进化工具到 MCP 服务器 */
export function registerEvolutionTools(server) {
  for (const tool of evolutionTools) {
    server.registerTool(tool.name, tool.config, tool.handler);
  }
}