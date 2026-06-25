/**
 * 文心笔匠 MCP Server - Cloudflare Workers 版
 *
 * 部署: npx wrangler deploy
 * 端点: POST /mcp
 *
 * 工具列表（12个）:
 *   写作方法论（6个）: world_building / character_design / plot_architecture / text_quality / web_novel / advanced_tools
 *   质量保障（3个）: pre_writing_checklist / quality_gate / ai_common_mistakes
 *   记忆系统（3个）: memory_save / memory_load / memory_list
 *   工具（1个）: list_tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

// ============================================================
// 模块文档（内联）
// ============================================================
const MODULES = {
  world_building: {
    title: '世界观构建方法论',
    content: `# 世界观构建方法论

## 核心六维模型

### 1. 力量体系
- **来源**：力量从哪来？（天地灵气/血脉/科技/信仰）
- **代价**：使用力量要付出什么？（寿元/理智/情感/身体负担）
- **限制**：什么情况下用不了？（禁魔区/封印/能量耗尽）
- **成长路径**：从弱到强分几个阶段？每个阶段的标志是什么？
- **天花板**：最强能到什么程度？有没有绝对上限？

### 2. 势力格局
- **主要势力**：3-5个核心势力，各有什么特点？
- **关系网络**：谁和谁结盟？谁和谁敌对？谁在中间摇摆？
- **利益冲突**：各方在争什么？（资源/地盘/权力/信仰）
- **势力平衡**：为什么没有一方独大？（互相牵制/外部威胁/代价）

### 3. 地理环境
- **地形地貌**：有哪些重要的地理区域？
- **气候条件**：各地的气候如何？影响人们的生活方式吗？
- **交通方式**：人们怎么出行？速度如何？成本如何？
- **资源分布**：重要资源在哪里？为什么重要？

### 4. 社会结构
- **阶层划分**：社会分几层？怎么决定一个人的阶层？
- **政治制度**：谁在统治？统治的合法性来自哪里？
- **风俗文化**：人们有什么独特的习俗/节日/禁忌？
- **价值观**：这个世界的人最看重什么？（力量/财富/名誉/长生）

### 5. 历史背景
- **关键事件**：历史上有哪些影响深远的大事件？
- **传说神话**：人们相信哪些传说？哪些是真的？
- **未解之谜**：有什么历史谜团？跟主线有关吗？
- **时代变迁**：现在的时代跟过去有什么不同？

### 6. 代价与限制
- 任何能力都有代价，没有免费的午餐
- 限制比能力更重要——限制创造张力
- 世界观的规则一旦定下，就不要轻易打破

## 构建原则
1. **从故事倒推**：先想清楚故事需要什么设定，再补充其他
2. **服务剧情**：每个设定都应该对剧情或人物有作用
3. **留空白**：不要把所有东西都写死，留着后续展开
4. **自洽优先**：不用完美，但要能自圆其说
5. **细节真实**：小处真实，大处可信

## 常见问题
❌ 设定堆砌：写了一大堆设定，剧情里一个都用不上
❌ 前后矛盾：前面说A规则，后面又出现B规则
❌ 没有限制：主角的能力没有上限，越写越崩
✅ 够用就好：设定不用多，够用、能用、用得好就行`
  },
  character_design: {
    title: '人物设计方法论',
    content: `# 人物设计方法论

## 七层人物模型

### 1. 基础信息
- 姓名（有含义吗？）
- 年龄（生理年龄 vs 心理年龄）
- 外貌（让人记住的1-2个特征）
- 身份/职业（社会角色）
- 口头禅/习惯性动作

### 2. 核心动机
- 表层目标：他/她**想要**什么？
- 深层需求：他/她**真正需要**什么？
- 动机来源：为什么想要这个？（童年创伤/人生遗憾/执念）
- 动机越具体，人物越立体

### 3. 性格特质
3-5个核心特质（正面+负面都要有）：
- 正面特质：勇敢/善良/聪明/坚韧…
- 负面特质：冲动/多疑/傲慢/自私…
- 灰色地带：没有绝对的好人坏人

### 4. 弱点缺陷
- 致命弱点：可能害了他/她的那个缺点
- 内心恐惧：最怕什么？（失败/失去/孤独/死亡）
- 心理创伤：过去留下了什么阴影？
- 有弱点的人才真实，才让读者关心

### 5. 能力特长
- 擅长什么？（战斗/智谋/社交/生存）
- 不擅长什么？（要有明显短板）
- 能力怎么来的？（天赋/训练/奇遇）
- 能力的代价/限制是什么？

### 6. 背景故事
- 家庭背景：父母是谁？关系如何？
- 成长经历：从小到大的关键节点
- 转折事件：什么事改变了他/她？
- 背景故事决定了人物的现在

### 7. 人物弧光
- 起点状态：故事开始时他/她是什么样？
- 转折点：什么事件让他/她开始改变？
- 终点状态：故事结束时他/她变成了什么样？
- 变好/变坏/没变但成长了，都可以

## 人物关系设计
- **关系网**：主角和其他角色是什么关系？
- **关系变化**：关系是静态的还是动态的？
- **关系张力**：关系里有什么矛盾/暧昧/秘密？
- 没有完美的关系，有张力才好看

## 设计原则
1. **没有完美的人**：有缺陷才真实，才可爱
2. **矛盾性 = 魅力**：一个人可以同时勇敢又胆小
3. **动机驱动行为**：人物做什么都要有原因
4. **言行一致**：说话做事要符合人物性格
5. **给人物缺点**：缺点比优点更让人记住`
  },
  plot_architecture: {
    title: '剧情架构方法论',
    content: `# 剧情架构方法论

## 三幕式结构

### 第一幕（约25%）：铺垫
- **开场**：展示主角的日常生活，建立代入感
- **激励事件**：打破日常的那个事件，把主角卷进去
- **挣扎**：主角想回到正常生活，但做不到
- **第一转折点**：主角下定决心，主动踏入冒险

### 第二幕（约50%）：上升
- **上升动作**：一个接一个的挑战，难度递增
- **中点**：剧情的中间点，局势发生重要变化
  - 假性胜利：主角以为赢了，其实是陷阱
  - 假性失败：主角以为输了，但获得了关键东西
- **最低点**：主角最惨的时候，一切似乎都完了
- **第二转折点**：主角找到新方向，鼓起勇气做最后一搏

### 第三幕（约25%）：高潮
- **最终挑战**：最大的难关
- **高潮**：决战/真相大白/终极对决
- **结局**：事情结束了，世界变成什么样了？
- **余韵**：主角后来怎么样了？给读者留下什么？

## 伏笔三层网络

### 表层伏笔
- 范围：章内或几章内回收
- 作用：营造阅读快感
- 例子：前面提了一句"刀上有毒"，后面就用到了

### 中层伏笔
- 范围：卷内回收
- 作用：剧情连贯感
- 例子：第一卷提到的神秘人，卷末揭晓身份

### 深层伏笔
- 范围：全书回收
- 作用：整体震撼感
- 例子：第一章的某个细节，大结局才揭晓真相

## 节奏控制
- **张弛有度**：战斗→过渡→战斗→过渡，不能一直紧
- **每章一个推进点**：剧情/人物/信息，至少推进一样
- **章末钩子**：每章结尾留悬念，让读者想看下一章
- **变速**：重要场景慢写，过渡场景快写

## 冲突设计
冲突 = 欲望 + 阻碍
- 内心冲突：角色自己跟自己斗
- 人际冲突：角色跟别人斗
- 环境冲突：角色跟环境/命运斗
- 多层冲突叠加，才够好看

## 设计原则
1. **因果链清晰**：每件事的发生都有原因
2. **意料之外，情理之中**：反转要惊讶但合理
3. **没有巧合解决问题**：巧合可以制造问题，不能解决问题
4. **压力层层递进**：挑战越来越大， stakes 越来越高
5. **每个场景都要有目的**：没用的场景就删掉`
  },
  text_quality: {
    title: '正文写作与质量方法论',
    content: `# 正文写作与质量方法论

## 白金作家创作法则

### 1. Show, Don't Tell（展示，不要告知）
❌ 他很生气。
✅ 他拳头攥得指节发白，指缝里渗出血来。

❌ 她很漂亮。
✅ 她推门进来的时候，整个屋子的声音都停了一下。

核心原则：用动作/细节/场景让读者**感受**到，而不是直接**告诉**读者。

### 2. 冰山对话
- 对话只说水面上的30%
- 剩下70%在水面下（潜台词/情绪/关系）
- 好的对话，每一句都有两层意思

### 3. 节奏波浪
- 有张有弛，不能一直紧也不能一直松
- 紧张场景之后要有缓冲
- 平淡场景里要有暗流

### 4. 具体而非抽象
- "他跑得很快" → "风刮得脸疼，耳边全是呼呼的声音"
- "房间很乱" → "地上扔着三只袜子，碗碟堆在水池里发臭"
- 越具体，越有画面感

## 17维质量评估
1. 人物塑造：立不立体？真不真实？
2. 情节推进：有没有推进？节奏好不好？
3. 对话质量：有没有信息量？符不符合人物？
4. 节奏控制：张弛有度吗？会不会拖？
5. 画面感：能不能在脑子里演出来？
6. 情绪感染力：读者能共情吗？
7. 设定融合：设定自然不生硬？
8. 伏笔设计：伏笔好不好？会不会突兀？
9. 冲突张力：有没有张力？够不够紧？
10. 逻辑严密：有没有bug？自洽吗？
11. 文风风格：有没有自己的风格？
12. 开篇吸引力：开头能抓住人吗？
13. 结尾余韵：结尾留钩子了吗？
14. 信息量：密度够吗？有没有水？
15. 创新性：有没有新意？
16. 代入感：读者能代入吗？
17. 整体完成度：整体感觉怎么样？

## 常见问题
❌ 形容词堆砌：很/非常/特别，一堆空话
❌ 流水账：平铺直叙，没有起伏
❌ 对话废话：正确的废话，说了等于没说
❌ 全知视角：角色什么都知道，像开了上帝视角
❌ 情绪直接说："他很伤心""她非常愤怒"
✅ 用细节代替形容词，用动作表现情绪`
  },
  web_novel: {
    title: '网文特化方法论',
    content: `# 网文特化方法论

## 黄金三章

### 第1章：钩子 + 登场 + 危机
- **开头钩子**：第一句就要抓住人（从冲突最激烈的地方开始）
- **主角登场**：让读者快速认识主角，建立代入感
- **危机/悬念**：第一章结尾要有麻烦/悬念，让读者想看下一章
- 不要从起床开始写！不要从起床开始写！不要从起床开始写！

### 第2章：金手指 + 小爽点
- **金手指亮相**：主角的特殊能力/优势是什么？
- **第一个小爽点**：用金手指小秀一把，让读者尝到甜头
- **继续铺垫**：世界观/人物关系慢慢展开

### 第3章：明确目标 + 大钩子
- **主线目标**：主角要干什么？读者要知道追什么
- **第一个大钩子**：第三章结尾抛个大悬念/大危机
- 让读者"再看一章就睡"变成"天怎么亮了"

## 爽感工程

### 期待感
- 先铺垫：让读者知道"主角要干一件大事"
- 再兑现：事情干成了，爽感就来了
- 铺垫越足，兑现时越爽

### 反差感
- 压抑越狠，反弹越爽
- 先让主角受委屈/被看不起，再打脸
- 反差越大，爽感越强

### 节奏感
- 小爽不断：每几章就有一个小爽点
- 大爽定期：每卷/每个阶段有一个大高潮
- 爽点之间用过渡和铺垫连接

### 代入感
- 主角的处境读者能理解
- 主角的目标读者能认同
- 主角的爽点读者能共情

## 章尾钩子设计

### 悬念型
"他转过身，看到了……"
"下一秒，门被推开了。"

### 反转型
"原来，这一切都是……"
"他一直找的人，竟然就在眼前。"

### 危机型
"就在这时，门外传来了脚步声。"
"他忽然意识到——自己上当了。"

### 揭秘型
"他终于知道了真相，但已经太晚了。"
"答案，比他想象的更可怕。"

## 毒点检测
❌ 圣母心：该杀不杀，妇人之仁
❌ 降智反派：反派强行变蠢给主角送经验
❌ 憋屈：一直受虐不反击
❌ 后宫种马：见一个收一个
❌ 剧情注水：一章下来什么都没发生
❌ 设定吃书：前后设定矛盾
✅ 爽，但不无脑；强，但有代价`
  },
  advanced_tools: {
    title: '高级写作工具指南',
    content: `# 高级写作工具指南

## 世界逻辑一致性检测

### 检测清单
1. **力量体系自洽吗？**
   - 能力的来源、代价、限制，前后一致吗？
   - 有没有突然出现新的能力规则？

2. **时间线对得上吗？**
   - 事件发生的先后顺序对吗？
   - 距离上一个事件过了多久？合理吗？

3. **地理逻辑对吗？**
   - 从A地到B地需要多久？合理吗？
   - 地形/气候描述一致吗？

4. **社会逻辑合理吗？**
   - 人们的行为符合这个世界的规则吗？
   - 经济/政治/文化逻辑自洽吗？

### 检测方法
- 列时间线：把重要事件按时间排出来
- 画地图：把重要地点标出来，算距离和时间
- 对照检查：新内容写完，对照设定档案检查

## 因果逻辑检测

### 因果链检查
\`\`\`
事件A → 导致 → 事件B → 导致 → 事件C
\`\`\`
- 每个环节都合理吗？
- 有没有"为了剧情需要"强行发生的事？
- 角色的行为有动机吗？

### 常见逻辑漏洞
❌ 反派降智：明明可以直接杀，非要废话
❌ 巧合救场：正好有人来救/正好捡到宝物
❌ 信息差消失：角色突然知道了不该知道的事
❌ 动机不明：做这件事到底图什么？

## 深层人设矛盾生成

### 矛盾类型
- **想做 vs 不敢做**：想报仇但怕死
- **表面 vs 内心**：嘴上说不在乎，心里很在意
- **理智 vs 情感**：明知道不对，但控制不住
- **自我认知 vs 真实自我**：以为自己是这样，其实不是

### 生成方法
1. 给人物一个核心特质
2. 给这个特质加一个"反面"
3. 找到什么时候反面会露出来
4. 让这两面在剧情中冲突

## 伏笔网络设计

### 伏笔矩阵
| 伏笔 | 埋设位置 | 回收位置 | 作用 |
|------|---------|---------|------|
| 神秘玉佩 | 第3章 | 第50章 | 身世之谜 |
| 老者的话 | 第1章 | 第100章 | 终极真相 |
| 伤疤 | 第10章 | 第30章 | 人物过去 |

### 埋设技巧
- 轻描淡写：埋的时候不要太刻意
- 多次暗示：同一个伏笔可以暗示多次
- 误导：埋的时候让读者以为是别的意思

## 题材特化引擎

不同题材的重点不同：
- **玄幻/修真**：力量体系+升级节奏+爽感
- **都市**：代入感+打脸节奏+行业细节
- **科幻**：设定硬度+逻辑自洽+哲思
- **历史**：时代感+人物命运+历史大势
- **悬疑**：悬念密度+线索公平+反转质量`
  }
};

// ============================================================
// 质量保障文档（内联）
// ============================================================
const QUALITY_DOCS = {
  'pre-writing-checklist': `# 写前检查清单

动笔前快速过一遍这 10 条：

1. 上一章结尾是什么？本章开头衔接上了吗？
2. 主角现在在哪？在干嘛？状态对吗？（伤势/心情/目标）
3. 这章要推进什么？（剧情/人物/信息，至少占一样）
4. 有没有吃书？（设定/人名/时间线/地点）
5. 角色说话符合性格吗？动机合理吗？
6. 当前有哪些伏笔？有没有该回收的？
7. 结尾有钩子吗？钩子够不够强？
8. 有没有水字数的内容？删掉会影响故事吗？
9. 情绪是具体的还是空泛的？（Show, Don't Tell）
10. 这章删掉，故事受影响吗？（不受影响就是水）

## 完整检查流程
1. 加载当前状态（角色在哪？什么状态？）
2. 回顾前3章发生了什么
3. 确认本章目标（要推进什么？）
4. 对照设定档案（人设/世界观/关系）
5. 开始写

---
记住：动笔前先"读懂"前面的内容，再写后面的。`,

  'quality-gate': `# 质量门禁系统

写完打分，低于 70 分不许交付。

## 10 项快速评分（每项 10 分）

| # | 检查项 | 满分 |
|---|--------|:----:|
| 1 | 没有吃书（人名/时间/地点/设定都对） | 10 |
| 2 | 有实质性推进（剧情/人物/信息至少占一样） | 10 |
| 3 | 没有水字数（删掉会影响故事） | 10 |
| 4 | 角色说话有辨识度（去掉名字也能猜） | 10 |
| 5 | 动机合理（角色行为有原因） | 10 |
| 6 | 有画面感（不是"很/非常/特别"堆出来的） | 10 |
| 7 | 有起伏（不是平铺直叙） | 10 |
| 8 | 结尾有钩子（想看下一章） | 10 |
| 9 | 反派智商在线（不是强行降智） | 10 |
| 10 | 没有正确的废话和喊口号 | 10 |

## 评分等级
- 90-100分：S级，惊艳，可以直接交付
- 80-89分：A级，良好，微调后交付
- 70-79分：B级，及格，修改后交付
- 60-69分：C级，不及格，问题较多，大修
- 60分以下：D级，重写

## 三条红线（碰了直接重写）
1. 吃书红线：设定前后矛盾
2. 水字数红线：一章下来什么都没推进
3. AI味红线：全是正确的废话、喊口号、形容词堆砌`,

  'ai-common-mistakes': `# AI 常犯错误实例库

## 偷懒敷衍类

### 1. 水字数：空洞环境描写
❌ 夜很深，月光很亮，风轻轻地吹。
✅ 三更天，乱葬岗。张三靠在墓碑后面，攥着窝头，盯着前面那扇门。

### 2. 废话：正确的废话对话
❌ "师兄说得对。""此事非同小可。"
✅ （每个人说话有自己的风格，每句都有信息增量）

### 3. 偷懒：形容词堆砌
❌ 他非常生气。她特别漂亮。
✅ 他拳头攥得发白。她进门时，整个屋子静了一下。

### 4. 没辨识度：所有人说话一个味儿
❌ 去掉名字分不清是谁说的
✅ 每个人的说话方式、用词、节奏都不一样

## 逻辑崩坏类

### 5. 降智：反派突然变蠢
❌ 抓住主角不杀，非要聊天等救兵
✅ 反派不赢是因为信息差/代价/运气，不是因为蠢

### 6. 巧合：太巧了吧
❌ 正好遇到救星/正好捡到宝物
✅ 巧合只能制造问题，不能解决问题

### 7. 动机：行为不合理
❌ 角色做一件事，读者不知道为什么
✅ 每个重要行为，都要有动机

## 人设崩塌类

### 8. 性格突变
❌ 前一章还胆小，后一章就拼命
✅ 性格转变要有触发事件、有过程、有代价

### 9. 能力膨胀
❌ 突然就厉害了，没有过程
✅ 获得能力要有代价、有过程、有上限

## 情绪虚假类

### 10. 情绪直接说
❌ "他很伤心。""她非常愤怒。"
✅ 用动作、细节、生理反应表现情绪

### 11. 空喊口号
❌ "我不会输的！""我一定会保护你的！"
✅ 少说多做，用行动证明

## 开头结尾类

### 12. 烂开头：从起床开始
❌ 清晨，阳光照进来，他睁开眼睛……
✅ 第一句就扔炸弹：刀架在脖子上的时候，张三醒了。

### 13. 烂结尾：没有钩子
❌ 他转身走了。夕阳下，背影越拉越长。
✅ 走到门口他忽然停下，回头笑了笑："你爹不是我杀的。"

---
对照这份清单，写完检查一遍，大多数问题都能避免。`,

  'consistency-checker': `# 一致性校验系统（防吃书）

## 第一级：低级错误（30秒速查）
- [ ] 角色名字写对了吗？（同音字/形近字）
- [ ] 称谓/称呼对吗？（师兄/大哥/名字）
- [ ] 时间线对吗？（昨天/上个月/三年前）
- [ ] 地点对吗？（有没有瞬移？）
- [ ] 伤势/状态对吗？（上一章重伤，这章活蹦乱跳？）
- [ ] 道具/物品对吗？（丢了的东西又拿出来用？）

## 第二级：设定一致性（2分钟）
- [ ] 力量体系规则被打破了吗？
- [ ] 角色性格前后一致吗？
- [ ] 角色能力在合理范围内吗？
- [ ] 角色知道的信息合理吗？（不是全知）
- [ ] 人物关系状态对吗？

## 第三级：剧情连贯性（3分钟）
- [ ] 因果链合理吗？（每件事有原因吗？）
- [ ] 伏笔有在推进吗？
- [ ] 剧情有推进吗？还是原地踏步？
- [ ] 跟上一章衔接上了吗？

## 10种常见吃书类型
1. 人名吃书：张三/张山 混用
2. 时间吃书：时间线混乱
3. 地点吃书：瞬移、距离错乱
4. 能力吃书：能力时有时无
5. 性格吃书：人设崩塌
6. 关系吃书：关系突变
7. 设定吃书：世界观规则前后矛盾
8. 道具吃书：物品凭空出现/消失
9. 伤势吃书：伤好得太快
10. 记忆吃书：角色忘/记得不该忘的事

---
宁可不写，也不能写错。发现不一致，先修正再继续。`
};

// ============================================================
// 工具注册
// ============================================================

function registerTools(server, env) {
  const KV = env?.WENXIN_MEMORY;
  const GROWTH_KV = env?.WENXIN_GROWTH;

  // ---- 写作模块工具 ----
  for (const [key, mod] of Object.entries(MODULES)) {
    const toolName = `wenxin_${key}_guide`;
    server.registerTool(
      toolName,
      {
        title: mod.title,
        description: `获取${mod.title}，用于指导写作方向、提供方法论参考。`,
        inputSchema: z.object({
          response_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式')
        }).strict(),
        annotations: { readOnlyHint: true }
      },
      async ({ response_format }) => {
        if (response_format === 'json') {
          return {
            content: [{ type: 'text', text: JSON.stringify({ module: key, title: mod.title, content_length: mod.content.length }, null, 2) }]
          };
        }
        return { content: [{ type: 'text', text: mod.content }] };
      }
    );
  }

  // ---- 质量保障工具 ----
  for (const [key, doc] of Object.entries(QUALITY_DOCS)) {
    const toolName = `wenxin_${key.replace(/-/g, '_')}`;
    const title = key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    server.registerTool(
      toolName,
      {
        title: title,
        description: `写作质量保障工具：${title}`,
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
        description: '保存作品记忆数据到 KV 存储（人设/设定/章节摘要等）。',
        inputSchema: z.object({
          workName: z.string().describe('作品名称，用作命名空间'),
          key: z.string().describe('记忆键名，如 character_zhangsan / chapter_001 / world_setting'),
          value: z.string().describe('记忆内容，JSON格式字符串')
        }).strict(),
        annotations: { readOnlyHint: false }
      },
      async ({ workName, key, value }) => {
        const fullKey = `${workName}:${key}`;
        await KV.put(fullKey, value);
        return { content: [{ type: 'text', text: `✅ 已保存记忆\n- 作品: ${workName}\n- 键名: ${key}\n- 大小: ${value.length} 字符` }] };
      }
    );

    server.registerTool(
      'wenxin_memory_load',
      {
        title: '加载记忆',
        description: '从 KV 存储加载指定的作品记忆。',
        inputSchema: z.object({
          workName: z.string().describe('作品名称'),
          key: z.string().describe('记忆键名')
        }).strict(),
        annotations: { readOnlyHint: true }
      },
      async ({ workName, key }) => {
        const fullKey = `${workName}:${key}`;
        const value = await KV.get(fullKey);
        if (!value) {
          return { content: [{ type: 'text', text: `⚠️ 未找到记忆\n- 作品: ${workName}\n- 键名: ${key}\n\n该记忆尚未保存。` }] };
        }
        return { content: [{ type: 'text', text: value }] };
      }
    );

    server.registerTool(
      'wenxin_memory_list',
      {
        title: '列出记忆',
        description: '列出某作品的所有记忆键，看看存了哪些东西。',
        inputSchema: z.object({
          workName: z.string().describe('作品名称')
        }).strict(),
        annotations: { readOnlyHint: true }
      },
      async ({ workName }) => {
        const prefix = `${workName}:`;
        const result = await KV.list({ prefix });
        const keys = result.keys.map(k => k.name.replace(prefix, ''));
        if (keys.length === 0) {
          return { content: [{ type: 'text', text: `⚠️ 作品「${workName}」暂无记忆数据。\n\n建议先保存：\n- 世界观设定\n- 主要角色档案\n- 章节摘要` }] };
        }
        return {
          content: [{
            type: 'text',
            text: `**作品「${workName}」记忆列表 (${keys.length}条):**\n\n` + keys.map(k => `- ${k}`).join('\n')
          }]
        };
      }
    );

    server.registerTool(
      'wenxin_memory_delete',
      {
        title: '删除记忆',
        description: '删除指定的作品记忆数据。',
        inputSchema: z.object({
          workName: z.string().describe('作品名称'),
          key: z.string().describe('记忆键名')
        }).strict(),
        annotations: { readOnlyHint: false }
      },
      async ({ workName, key }) => {
        const fullKey = `${workName}:${key}`;
        await KV.delete(fullKey);
        return { content: [{ type: 'text', text: `🗑️ 已删除记忆: ${fullKey}` }] };
      }
    );
  }

  // ---- 进化系统工具 ----
  if (GROWTH_KV) {
    server.registerTool(
      'wenxin_evolution_status',
      {
        title: '进化状态',
        description: '查看进化系统当前状态、等级和统计数据。',
        inputSchema: z.object({}).strict(),
        annotations: { readOnlyHint: true }
      },
      async () => {
        const data = await GROWTH_KV.get('evolution-counter');
        if (!data) {
          return { content: [{ type: 'text', text: '⚠️ 进化计数器未初始化。\n\n首次使用时，请先记录一个进化事件。' }] };
        }
        const c = JSON.parse(data);
        return {
          content: [{
            type: 'text',
            text: `## 进化系统状态\n\n- **等级**: ${c.statistics?.evolutionLevel || 'Lv.1'}\n- **积分**: ${c.statistics?.evolutionPoints || 0}\n- **总案例数**: ${c.statistics?.totalCases || 0}\n- **确认偏好**: ${c.statistics?.confirmedPreferences || 0}\n- **进化规则**: ${c.statistics?.mergedRules || 0}`
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
      description: '显示文心笔匠 MCP Server 提供的所有可用工具。',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true }
    },
    async () => {
      const moduleTools = Object.keys(MODULES).map(k => ({ name: `wenxin_${k}_guide`, type: '写作方法论' }));
      const qualityTools = Object.keys(QUALITY_DOCS).map(k => ({ name: `wenxin_${k.replace(/-/g, '_')}`, type: '质量保障' }));
      const memoryTools = KV
        ? ['wenxin_memory_save', 'wenxin_memory_load', 'wenxin_memory_list', 'wenxin_memory_delete'].map(n => ({ name: n, type: '记忆系统' }))
        : [];
      const evolutionTools = GROWTH_KV ? [{ name: 'wenxin_evolution_status', type: '进化系统' }] : [];
      const allTools = [...moduleTools, ...qualityTools, ...memoryTools, ...evolutionTools, { name: 'wenxin_list_tools', type: '工具' }];

      const grouped = {};
      for (const t of allTools) {
        if (!grouped[t.type]) grouped[t.type] = [];
        grouped[t.type].push(t.name);
      }

      let text = `## 文心笔匠 MCP Server 工具列表 (${allTools.length}个)\n\n`;
      for (const [type, names] of Object.entries(grouped)) {
        text += `### ${type} (${names.length}个)\n`;
        for (const n of names) {
          text += `- \`${n}\`\n`;
        }
        text += '\n';
      }
      return { content: [{ type: 'text', text }] };
    }
  );
}

// ============================================================
// Worker 入口
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, mcp-session-id, mcp-protocol-version',
      'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 健康检查
    if (url.pathname === '/health' && request.method === 'GET') {
      return Response.json({
        status: 'ok',
        server: 'wenxin-bijiang-mcp-server',
        version: '1.2.0',
        mode: 'cloudflare-workers',
        kv_memory: env.WENXIN_MEMORY ? 'enabled' : 'disabled',
        kv_growth: env.WENXIN_GROWTH ? 'enabled' : 'disabled',
        tools_count: {
          modules: Object.keys(MODULES).length,
          quality: Object.keys(QUALITY_DOCS).length,
          memory: env.WENXIN_MEMORY ? 4 : 0,
          evolution: env.WENXIN_GROWTH ? 1 : 0
        },
        timestamp: Date.now()
      }, { headers: corsHeaders });
    }

    // MCP 端点
    if (url.pathname === '/mcp') {
      const server = new McpServer({
        name: 'wenxin-bijiang-mcp-server',
        version: '1.2.0'
      });
      registerTools(server, env);

      const transport = new WebStandardStreamableHTTPServerTransport({
        enableJsonResponse: true
      });

      await server.connect(transport);
      return transport.handleRequest(request);
    }

    // 根路径：简单说明
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(
        '# 文心笔匠 MCP Server\n\n' +
        '状态: ✅ 运行中\n' +
        `版本: 1.2.0\n` +
        `模式: Cloudflare Workers\n\n` +
        '## 端点\n' +
        '- GET  /health    健康检查\n' +
        '- POST /mcp       MCP Streamable HTTP 端点\n\n' +
        '## 配置方法\n' +
        '在 MCP 客户端配置中添加：\n' +
        '```json\n' +
        '{\n  "mcpServers": {\n    "wenxin-bijiang": {\n      "url": "https://你的域名/mcp"\n    }\n  }\n}\n' +
        '```\n',
        {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            ...corsHeaders
          }
        }
      );
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
