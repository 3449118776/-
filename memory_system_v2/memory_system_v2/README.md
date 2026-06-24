# memory_system — 网文创作记忆系统 Skill V2

## V2 升级点（覆盖评估文档9个待加强点）

| # | 问题 | 解决方案 | 对应文件 |
|---|------|----------|----------|
| 1 | 缺少本地持久化 | Node环境自动fs.writeFile保存，初始化自动读取 | entry_v2.js |
| 2 | 多作品分库未落地 | workName作为文件名，每个作品独立JSON，支持list/switch/delete | entry_v2.js |
| 3 | 道具/势力/滚动摘要无方法 | 新增recordItem、recordFaction、updateRollingSummary、autoArchive | MemorySkill_v2.js |
| 4 | 检索召回精度低 | searchByKeywordV2使用Jaccard相似度替代纯字符串匹配 | MemorySkill_v2.js |
| 5 | 矛盾检测易误判 | detectContradictionsV2先提取共同实体，只对比同一实体的对立属性 | MemorySkill_v2.js |
| 6 | 缺少自动归档 | 新增auto_archive action，支持从正文一键提取归档 | entry_v2.js |
| 7 | 滚动摘要自动生成 | 每record_chapter自动更新recent/milestones/eras三层摘要 | MemorySkill_v2.js |
| 8 | 角色状态历史追踪 | 新增recordCharacterState、getCharacterTrajectory | MemorySkill_v2.js |
| 9 | 阈值不可配置 | config.json支持自定义所有阈值，entry自动读取 | config.json |

## 文件结构
```
memory_system_v2/
├── SKILL.md              # AI 可读技能说明（19个 action）
├── entry_v2.js           # 统一调用入口（本地持久化 + 多作品分库）
├── MemorySkill_v2.js     # 核心引擎（补全道具/势力/摘要/检索/矛盾检测）
├── config.json           # 可配置阈值
├── package.json          # 包信息
├── test_v2.js            # 功能测试（13项覆盖）
├── README.md             # 使用说明
└── data/
    └── default.json      # 默认记忆数据
```

## 快速开始
```javascript
const { main } = require('./entry_v2.js');

// 初始化作品（自动创建独立存储文件）
await main({ action: 'init_work', workName: '汉末：凉州辞' });

// 记录章节（自动更新滚动摘要、角色轨迹）
await main({
  action: 'record_chapter',
  chapterIdx: 0,
  summary: '主角穿越凉州，发现韩家阴谋',
  characters: [{ name: '韩遂', role: '反派', status: '布局中' }],
  foreshadows: [{ text: '韩家探子回城', status: '未解' }],
  items: [{ name: '环首刀', owner: '主角' }],
  factions: [{ name: '韩家', leader: '韩遂', status: '凉州豪强' }]
});

// 自动归档（从正文一键提取）
await main({
  action: 'auto_archive',
  chapterIdx: 1,
  fullText: '正文内容...',
  extracted: {
    summary: '本章核心剧情',
    characters: [{ name: '主角', status: '行进中' }],
    foreshadows: [{ text: '新伏笔', status: '未解' }]
  }
});

// Jaccard检索
await main({ action: 'search_by_keyword', keyword: '韩家阴谋' });

// 获取写作建议
await main({ action: 'get_writing_advice' });
```
