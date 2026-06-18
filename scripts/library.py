#!/usr/bin/env python3
import os
import json
import argparse
from datetime import datetime
from collections import defaultdict

LIBRARY_PATH = '/workspace/library'
BOOKS_PATH = os.path.join(LIBRARY_PATH, 'books')
METADATA_FILE = os.path.join(LIBRARY_PATH, 'metadata.json')

def load_metadata():
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "books": [],
        "categories": ["玄幻", "都市", "仙侠", "奇幻", "科幻", "悬疑", "历史", "言情", "武侠", "恐怖", "网游", "穿越", "重生", "系统"],
        "stats": {"total_books": 0, "total_words": 0, "last_update": ""}
    }

def save_metadata(data):
    data["stats"]["last_update"] = datetime.now().isoformat()
    data["stats"]["total_books"] = len(data["books"])
    data["stats"]["total_words"] = sum(book.get("word_count", 0) for book in data["books"])
    with open(METADATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def add_book(title, author, category, source, word_count=0, status='连载', rating=0, tags=None):
    data = load_metadata()
    if category not in data["categories"]:
        print(f"错误：分类 '{category}' 不存在")
        return False
    
    book_id = f"{author}-{title}"[:50].replace(' ', '-')
    book = {
        "id": book_id,
        "title": title,
        "author": author,
        "category": category,
        "source": source,
        "word_count": word_count,
        "status": status,
        "rating": rating,
        "tags": tags or [],
        "added_at": datetime.now().isoformat(),
        "file_path": f"{category}/{title}.txt"
    }
    data["books"].append(book)
    save_metadata(data)
    
    txt_path = os.path.join(BOOKS_PATH, category, f"{title}.txt")
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(f"书名：{title}\n作者：{author}\n来源：{source}\n状态：{status}\n字数：{word_count}\n\n")
    
    print(f"已添加：《{title}》 - {author}")
    return True

def list_books(category=None, sort_by='rating', reverse=True):
    data = load_metadata()
    books = data["books"]
    
    if category:
        books = [b for b in books if b["category"] == category]
    
    if sort_by == 'rating':
        books.sort(key=lambda x: x["rating"], reverse=reverse)
    elif sort_by == 'words':
        books.sort(key=lambda x: x["word_count"], reverse=reverse)
    elif sort_by == 'added':
        books.sort(key=lambda x: x["added_at"], reverse=reverse)
    
    if not books:
        print("暂无小说")
        return
    
    print(f"\n{'书名':<20} {'作者':<10} {'分类':<6} {'字数':>10} {'评分':>4} {'状态'}")
    print("-" * 80)
    for book in books:
        print(f"{book['title']:<20} {book['author']:<10} {book['category']:<6} {book['word_count']:>10,} {book['rating']:>4.1f} {book['status']}")
    print()

def search_books(keyword):
    data = load_metadata()
    results = []
    for book in data["books"]:
        if keyword.lower() in book["title"].lower() or \
           keyword.lower() in book["author"].lower() or \
           keyword.lower() in ' '.join(book["tags"]).lower():
            results.append(book)
    
    if results:
        print(f"\n找到 {len(results)} 本相关小说：")
        for book in results:
            print(f"《{book['title']}》 - {book['author']} [{book['category']}]")
            if book['tags']:
                print(f"  标签：{'、'.join(book['tags'])}")
    else:
        print(f"未找到包含 '{keyword}' 的小说")

def show_stats():
    data = load_metadata()
    stats = data["stats"]
    
    print(f"\n📚 小说仓库统计")
    print(f"总小说数：{stats['total_books']}")
    print(f"总字数：{stats['total_words']:,}")
    print(f"最后更新：{stats['last_update'][:19].replace('T', ' ')}")
    
    category_counts = defaultdict(int)
    for book in data["books"]:
        category_counts[book["category"]] += 1
    
    print("\n分类分布：")
    for cat, count in sorted(category_counts.items()):
        print(f"  {cat}: {count} 本")

def show_categories():
    data = load_metadata()
    print("\n可用分类：")
    for cat in data["categories"]:
        print(f"  • {cat}")

def delete_book(title):
    data = load_metadata()
    book = next((b for b in data["books"] if b["title"] == title), None)
    
    if not book:
        print(f"未找到《{title}》")
        return
    
    data["books"].remove(book)
    save_metadata(data)
    
    txt_path = os.path.join(LIBRARY_PATH, book["file_path"])
    if os.path.exists(txt_path):
        os.remove(txt_path)
    
    print(f"已删除：《{title}》")

def main():
    parser = argparse.ArgumentParser(description='小说仓库管理工具')
    subparsers = parser.add_subparsers(dest='command', help='命令')
    
    add_parser = subparsers.add_parser('add', help='添加小说')
    add_parser.add_argument('--title', required=True, help='书名')
    add_parser.add_argument('--author', required=True, help='作者')
    add_parser.add_argument('--category', required=True, help='分类')
    add_parser.add_argument('--source', help='来源链接')
    add_parser.add_argument('--words', type=int, default=0, help='字数')
    add_parser.add_argument('--status', default='连载', help='状态')
    add_parser.add_argument('--rating', type=float, default=0, help='评分')
    add_parser.add_argument('--tags', nargs='*', help='标签列表')
    
    subparsers.add_parser('list', help='列出所有小说')
    subparsers.add_parser('categories', help='显示所有分类')
    subparsers.add_parser('stats', help='显示统计信息')
    
    search_parser = subparsers.add_parser('search', help='搜索小说')
    search_parser.add_argument('keyword', help='搜索关键词')
    
    delete_parser = subparsers.add_parser('delete', help='删除小说')
    delete_parser.add_argument('--title', required=True, help='书名')
    
    args = parser.parse_args()
    
    if args.command == 'add':
        add_book(args.title, args.author, args.category, args.source or '', 
                 args.words, args.status, args.rating, args.tags)
    elif args.command == 'list':
        list_books()
    elif args.command == 'search':
        search_books(args.keyword)
    elif args.command == 'stats':
        show_stats()
    elif args.command == 'categories':
        show_categories()
    elif args.command == 'delete':
        delete_book(args.title)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()