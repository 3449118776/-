// ==========================================================================
// test_v2.js — memory_system Skill V2 完整功能测试
// ==========================================================================

const { main, getInstance, getCurrentWorkName } = require('./entry_v2.js');

async function runTests() {
  console.log('=== MemorySystem Skill V2 测试开始 ===\n');
  let pass = 0, fail = 0;

  function check(name, r, condition) {
    if (condition) { console.log(`✓ ${name}`); pass++; }
    else { console.log(`✗ ${name}: ${r.message}`); fail++; }
  }

  // 测试1: 多作品分库
  let r = await main({ action: 'init_work', workName: '汉末：凉州辞' });
  check('多作品分库-初始化', r, r.success);

  // 测试2: 记录道具
  r = await main({ action: 'record_item', name: '环首刀', owner: '主角', chapterIdx: 0, description: '汉末制式兵器' });
  check('道具记录', r, r.success);

  // 测试3: 记录势力
  r = await main({ action: 'record_faction', name: '韩家', leader: '韩遂', members: ['韩遂', '探子甲'], chapterIdx: 0, status: '凉州豪强' });
  check('势力记录', r, r.success);

  // 测试4: 记录章节（含自动滚动摘要）
  r = await main({
    action: 'record_chapter', chapterIdx: 0,
    summary: '主角穿越汉末凉州，发现韩家阴谋，收编流民六人',
    characters: [
      { name: '主角', role: '主角', status: '穿越者', location: '凉州荒野', emotion: '冷静' },
      { name: '韩遂', role: '反派', status: '布局中', location: '姑臧', emotion: '阴鸷' }
    ],
    foreshadows: [{ text: '韩家探子回城报信', status: '未解' }],
    items: [{ name: '环首刀', owner: '主角', description: '汉末制式兵器' }],
    factions: [{ name: '韩家', leader: '韩遂', members: ['韩遂'], status: '凉州豪强' }]
  });
  check('章节记录+自动摘要', r, r.success);

  // 测试5: 角色状态历史
  r = await main({ action: 'get_character_trajectory', name: '主角' });
  check('角色轨迹', r, r.success && r.data.length > 0);

  // 测试6: 滚动摘要
  r = await main({ action: 'get_rolling_summary' });
  check('滚动摘要', r, r.success && r.data.recent && r.data.recent.length > 0);

  // 测试7: Jaccard检索
  r = await main({ action: 'search_by_keyword', keyword: '韩家阴谋' });
  check('Jaccard检索', r, r.success && r.data.length > 0);

  // 测试8: 实体感知矛盾检测
  r = await main({ action: 'check_consistency' });
  check('一致性检测', r, r.success);

  // 测试9: 自动归档
  r = await main({
    action: 'auto_archive', chapterIdx: 1,
    fullText: '主角带领六人队伍向姑臧进发，途中遭遇羌人小队。',
    extracted: {
      summary: '主角带队进发，遭遇羌人',
      characters: [{ name: '主角', role: '主角', status: '行进中', location: '官道' }],
      foreshadows: [{ text: '羌人小队出现', status: '未解' }]
    }
  });
  check('自动归档', r, r.success);

  // 测试10: 写作建议
  r = await main({ action: 'get_writing_advice' });
  check('写作建议', r, r.success && r.data.length >= 0);

  // 测试11: 多作品切换
  r = await main({ action: 'init_work', workName: '僮谷' });
  check('作品切换-初始化', r, r.success);

  r = await main({ action: 'list_works' });
  check('作品列表', r, r.success && r.data.length >= 2);

  r = await main({ action: 'switch_work', workName: '汉末：凉州辞' });
  check('切回原作品', r, r.success && getCurrentWorkName() === '汉末：凉州辞');

  // 测试12: 导出
  r = await main({ action: 'export' });
  check('数据导出', r, r.success && r.data.anchors);

  // 测试13: 快照
  r = await main({ action: 'snapshot', label: '测试快照' });
  check('快照创建', r, r.success && r.data.snapshotId);

  console.log(`\n=== 测试结果: ${pass}通过, ${fail}失败 ===`);
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => { console.error(e); process.exit(1); });
