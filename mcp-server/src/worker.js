/**
 * 文心笔匠 MCP Server - Cloudflare Workers 版
 *
 * 部署: npx wrangler deploy
 * 端点: POST /mcp
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

// ============================================================
// 内联模块文档
// ============================================================
const MODULES = {
  world_building: {
    title: '世界观构建方法论',
    content: `# 世界观构建方法论

## 核心六维
1. **力量体系**：来源、代价、限制、成长路径
2. **势力格局**：主要势力、关系网络、利益冲突
3. **地理环境**：地形、气候、交通、资源分布
4. **社会结构**：阶层、制度、风俗、价值观
5. **历史背景**：关键事件、传说神话、未解之谜
6. **代价与限制**：任何能力都有代价

## 构建原则
- 从"故事需要什么"倒推，不要为了设定而设定
- 每个设定都要服务于剧情或人物
- 留空白，不要把所有东西都写死`
  },
  character_design: {
    title: '人物设计方法论',
    content: `# 人物设计方法论

## 七层人物模型
1. **基础信息**：姓名、年龄、外貌、身份
2. **核心动机**：他/她最想要什么？
3. **性格特质**：3-5个核心特质（正面+负面）
4. **弱点缺陷**：致命弱点、内心恐惧
5. **能力特长**：擅长什么、不擅长什么
6. **背景故事**：过去经历如何塑造了现在的他/她
7. **人物弧光**：故事结束时，他/她变成了什么样？

## 设计原则
- 没有完美的人，有缺陷才真实
- 动机越具体，人物越立体
- 矛盾性 = 魅力`
  },
  plot_architecture: {
    title: '剧情架构方法论',
    content: `# 剧情架构方法论

## 三幕式结构
- **第一幕（25%）**：铺垫、激励事件、第一转折点
- **第二幕（50%）**：上升动作、中点、第二转折点
- **第三幕（25%）**：高潮、结局

## 伏笔三层网络
1. **表层伏笔**：章内/几章内回收
2. **中层伏笔**：卷内回收
3. **深层伏笔**：全书回收

## 节奏控制
- 张弛有度：战斗→过渡→战斗→过渡
- 每章至少一个推进点
- 章末必须有钩子`
  },
  text_quality: {
    title: '正文写作与质量方法论',
    content: `# 正文写作与质量方法论

## 白金作家创作法则
1. **Show, Don't Tell**：用动作/细节代替形容词
2. **冰山对话**：对话只说30%，剩下70%在水面下
3. **节奏波浪**：有张有弛，不能一直紧也不能一直松
4. **具体而非抽象**："他拳头攥得发白" > "他很生气"

## 常见问题
- 形容词堆砌：很/非常/特别 → 换成具体描写
- 对话废话：去掉正确的废话，每句都要有信息
- 流水账：加冲突、加意外、加反转`
  },
  web_novel: {
    title: '网文特化方法论',
    content: `# 网文特化方法论

## 黄金三章
- **第1章**：钩子+主角登场+危机/悬念
- **第2章**：金手指/核心设定亮相+第一个小爽点
- **第3章**：明确主线目标+第一个大钩子

## 爽感工程
- **期待感**：先铺垫，再兑现
- **反差感**：压抑越狠，反弹越爽
- **节奏感**：小爽不断，大爽定期
- **代入感**：读者能代入主角

## 章尾钩子
- 悬念型："他转过身，看到了……"
- 反转型："原来，这一切都是……"
- 危机型："就在这时，门外传来了脚步声……"`
  }
};

// ============================================================
// 质量保障文档（内联）
// ============================================================
const QUALITY_DOCS = {
  'pre-writing-checklist': `# 写前检查清单（速查版）

动笔前快速过一遍这 10 条：

1. 上一章结尾是什么？本章开头衔接上了吗？
2. 主角现在在哪？在干嘛？状态对吗？
3. 这章要推进什么？（剧情/人物/信息，至少占一样）
4. 有没有吃书？（设定/人名/时间线）
5. 角色说话符合性格吗？
6. 动机合理吗？
7. 结尾有钩子吗？
8. 有没有水字数的内容？
9. 情绪是具体的还是空泛的？
10. 删掉这章，故事受影响吗？`,

  'quality-gate': `# 质量门禁（速查版）

写完打分，低于 70 分不许交付。

## 10 项快速评分（每项 10 分）
1. 没有吃书（人名/时间/地点/设定都对）
2. 有实质性推进（剧情/人物/信息至少占一样）
3. 没有水字数（删掉会影响故事）
4. 角色说话有辨识度（去掉名字也能猜）
5. 动机合理（角色行为有原因）
6. 有画面感（不是"很/非常/特别"堆出来的）
7. 有起伏（不是平铺直叙）
8. 结尾有钩子（想看下一章）
9. 反派智商在线（不是强行降智）
10. 没有正确的废话和喊口号

9-10条 ✓ → A级，可以交付
7-8条 ✓ → B级，修改一下
6条以下 → 重写`,

  'ai-common-mistakes': `# AI 常犯错误（速查版）

## 偷懒类
❌ 空洞环境描写凑字数 → 每句都要有信息
❌ 正确的废话对话 → 每句都要有信息增量
❌ 形容词堆砌（很/非常/特别） → 换成具体动作/细节
❌ 所有人说话一个味儿 → 给每个人说话风格

## 逻辑类
❌ 反派强行降智 → 反派不赢是因为信息差/代价/运气
❌ 巧合开挂 → 巧合只能制造问题，不能解决问题
❌ 动机不明 → 每个重要行为都要有原因

## 情绪类
❌ 直接说情绪（他很生气） → 用动作/生理反应表现
❌ 空喊口号（我不会输的！） → 用行动证明`
};

// ============================================================
// 工具注册
// ============================================================

function registerTools(server, env) {
  const KV = env?.WENXIN_MEMORY;
  const GROWTH_KV = env?.WENXIN_GROWTH;

  // ---- 模块工具 ----
  for (const [key, mod] of Object.entries(MODULES)) {
    const toolName = `wenxin_${key}_guide`;
    server.registerTool(
      toolName,
      {
        title: mod.title,
        description: `获取${mod.title}，用于指导写作方向。`,
        inputSchema: z.object({}).strict(),
        annotations: { readOnlyHint: true }
      },
      async () => {
        return { content: [{ type: 'text', text: mod.content }] };
      }
    );
  }

  // ---- 质量保障工具 ----
  for (const [key, doc] of Object.entries(QUALITY_DOCS)) {
    const toolName = `wenxin_${key.replace(/-/g, '_')}`;
    server.registerTool(
      toolName,
      {
        title: key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: `写作质量保障：${key}`,
        inputSchema: z.object({}).strict(),
        annotations: { readOnlyHint: true }
      },
      async () => {
        return { content: [{ type: 'text', text: doc }] };
      }
    );
  }

  // ---- KV 记忆工具 ----
  if (KV) {
    server.registerTool(
      'wenxin_memory_save',
      {
        title: '保存记忆',
        description: '保存作品记忆数据到 KV 存储',
        inputSchema: z.object({
          workName: z.string(),
          key: z.string(),
          value: z.string()
        }).strict(),
        annotations: { readOnlyHint: false }
      },
      async ({ workName, key, value }) => {
        const fullKey = `${workName}:${key}`;
        await KV.put(fullKey, value);
        return { content: [{ type: 'text', text: `✅ 已保存: ${fullKey}` }] };
      }
    );

    server.registerTool(
      'wenxin_memory_load',
      {
        title: '加载记忆',
        description: '从 KV 存储加载作品记忆',
        inputSchema: z.object({
          workName: z.string(),
          key: z.string()
        }).strict(),
        annotations: { readOnlyHint: true }
      },
      async ({ workName, key }) => {
        const fullKey = `${workName}:${key}`;
        const value = await KV.get(fullKey);
        if (!value) return { content: [{ type: 'text', text: `⚠️ 未找到: ${fullKey}` }] };
        return { content: [{ type: 'text', text: value }] };
      }
    );

    server.registerTool(
      'wenxin_memory_list',
      {
        title: '列出记忆',
        description: '列出作品的所有记忆键',
        inputSchema: z.object({ workName: z.string() }).strict(),
        annotations: { readOnlyHint: true }
      },
      async ({ workName }) => {
        const prefix = `${workName}:`;
        const result = await KV.list({ prefix });
        const keys = result.keys.map(k => k.name.replace(prefix, ''));
        return {
          content: [{
            type: 'text',
            text: keys.length > 0
              ? `**${workName}** (${keys.length}条):\n` + keys.map(k => `- ${k}`).join('\n')
              : `⚠️ ${workName} 暂无记忆数据`
          }]
        };
      }
    );
  }

  // ---- 进化系统工具 ----
  if (GROWTH_KV) {
    server.registerTool(
      'wenxin_evolution_status',
      {
        title: '进化状态',
        description: '查看进化系统当前状态',
        inputSchema: z.object({}).strict(),
        annotations: { readOnlyHint: true }
      },
      async () => {
        const data = await GROWTH_KV.get('evolution-counter');
        if (!data) return { content: [{ type: 'text', text: '⚠️ 进化计数器未初始化' }] };
        const c = JSON.parse(data);
        return {
          content: [{
            type: 'text',
            text: `等级: ${c.statistics?.evolutionLevel || 'Lv.1'}\n积分: ${c.statistics?.evolutionPoints || 0}\n总案例: ${c.statistics?.totalCases || 0}`
          }]
        };
      }
    );
  }

  // ---- 工具列表 ----
  server.registerTool(
    'wenxin_list_tools',
    {
      title: '列出所有工具',
      description: '显示所有可用工具',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true }
    },
    async () => {
      const tools = [
        ...Object.keys(MODULES).map(k => `wenxin_${k}_guide`),
        ...Object.keys(QUALITY_DOCS).map(k => `wenxin_${k.replace(/-/g, '_')}`),
        ...(KV ? ['wenxin_memory_save', 'wenxin_memory_load', 'wenxin_memory_list'] : []),
        ...(GROWTH_KV ? ['wenxin_evolution_status'] : [])
      ];
      return {
        content: [{
          type: 'text',
          text: `**可用工具 (${tools.length}个):**\n` + tools.map(t => `- \`${t}\``).join('\n')
        }]
      };
    }
  );
}

// ============================================================
// Worker 入口
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return Response.json({
        status: 'ok',
        server: 'wenxin-bijiang-mcp-server',
        version: '1.1.0',
        mode: 'cloudflare-workers',
        kv_memory: env.WENXIN_MEMORY ? 'enabled' : 'disabled',
        kv_growth: env.WENXIN_GROWTH ? 'enabled' : 'disabled',
        timestamp: Date.now()
      }, { headers: cors });
    }

    if (url.pathname === '/mcp' && (request.method === 'POST' || request.method === 'GET')) {
      const server = new McpServer({
        name: 'wenxin-bijiang-mcp-server',
        version: '1.1.0'
      });
      registerTools(server, env);

      const transport = new WebStandardStreamableHTTPServerTransport({
        enableJsonResponse: true
      });

      await server.connect(transport);
      return transport.handleRequest(request);
    }

    return new Response('Not Found', { status: 404, headers: cors });
  }
};
