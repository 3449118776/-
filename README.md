# 小说仓库

一个简单的网文仓库管理系统，支持分类存储、搜索、统计。

## 目录结构

```
library/
├── metadata.json       # 元数据文件
├── 玄幻/              # 分类文件夹
├── 都市/
├── 仙侠/
├── 奇幻/
├── 科幻/
├── 悬疑/
├── 历史/
├── 言情/
├── 武侠/
├── 恐怖/
├── 网游/
├── 穿越/
├── 重生/
└── 系统/
```

## 可用分类

- 玄幻、都市、仙侠、奇幻、科幻
- 悬疑、历史、言情、武侠、恐怖
- 网游、穿越、重生、系统

## 使用方法

### 列出所有小说（按评分排序）

```bash
python3 scripts/library.py list
```

### 添加小说

```bash
python3 scripts/library.py add \
  --title "书名" \
  --author "作者" \
  --category "分类" \
  --source "来源链接" \
  --words 100000 \
  --status "连载/完结" \
  --rating 9.5 \
  --tags 标签1 标签2 标签3
```

### 搜索小说

```bash
python3 scripts/library.py search 关键词
```

### 查看统计

```bash
python3 scripts/library.py stats
```

### 查看分类

```bash
python3 scripts/library.py categories
```

### 删除小说

```bash
python3 scripts/library.py delete --title "书名"
```

## 示例

```bash
# 添加一本小说
python3 scripts/library.py add --title "凡人修仙传" --author "忘语" --category "仙侠" --rating 9.5

# 搜索
python3 scripts/library.py search 修仙

# 查看统计
python3 scripts/library.py stats
```