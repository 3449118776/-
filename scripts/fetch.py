#!/usr/bin/env python3
import os
import re
import requests
from bs4 import BeautifulSoup
import argparse

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def get_html(url, retries=3):
    headers = {"User-Agent": USER_AGENT}
    for _ in range(retries):
        try:
            response = requests.get(url, headers=headers, timeout=15)
            response.encoding = response.apparent_encoding
            return response.text
        except Exception as e:
            print(f"获取页面失败: {e}")
    return None

def parse_book_info(html):
    soup = BeautifulSoup(html, "html.parser")
    book_info = {
        "title": "",
        "author": "",
        "category": "",
        "intro": "",
        "chapters": []
    }
    
    title_tag = soup.find("h1") or soup.find("title")
    if title_tag:
        book_info["title"] = title_tag.get_text(strip=True).replace("_笔趣阁", "").replace("_顶点小说", "").replace("-笔趣阁", "")
    
    meta_author = soup.find("meta", property="og:novel:author") or soup.find("meta", {"name": "author"})
    if meta_author:
        book_info["author"] = meta_author.get("content", "").strip()
    
    meta_category = soup.find("meta", property="og:novel:category")
    if meta_category:
        book_info["category"] = meta_category.get("content", "").strip()
    
    intro_div = soup.find("div", id="intro") or soup.find("div", class_="intro") or soup.find("div", class_="book-intro")
    if intro_div:
        book_info["intro"] = intro_div.get_text(strip=True)[:500]
    
    return book_info

def extract_chapters(html, base_url):
    chapters = []
    soup = BeautifulSoup(html, "html.parser")
    
    list_divs = ["#list", ".listmain", ".list", ".chapter-list", "#chapter-list", ".book_list"]
    for selector in list_divs:
        list_div = soup.select_one(selector)
        if list_div:
            links = list_div.find_all("a", href=True)
            for link in links:
                chapter_title = link.get_text(strip=True)
                chapter_url = link["href"]
                if not chapter_url.startswith("http"):
                    if chapter_url.startswith("//"):
                        chapter_url = "https:" + chapter_url
                    elif chapter_url.startswith("/"):
                        chapter_url = base_url.split("/")[0] + "//" + base_url.split("/")[2] + chapter_url
                    else:
                        chapter_url = base_url.rsplit("/", 1)[0] + "/" + chapter_url
                if chapter_title and chapter_url not in [c["url"] for c in chapters]:
                    chapters.append({"title": chapter_title, "url": chapter_url})
            break
    
    return chapters

def get_chapter_content(html):
    soup = BeautifulSoup(html, "html.parser")
    
    content_selectors = [
        "#content", ".content", "#chaptercontent", ".chapter-content",
        ".read-content", ".article-content", "#article_content",
        ".text", ".novel-content", ".book-content"
    ]
    
    for selector in content_selectors:
        content_div = soup.select_one(selector)
        if content_div:
            content = ""
            for child in content_div.children:
                if child.name == "p":
                    text = child.get_text(strip=True)
                    if text and text != "笔趣阁" and text != "顶点小说" and not text.startswith("手机阅读"):
                        content += text + "\n\n"
                elif child.name == "div":
                    continue
                else:
                    text = str(child).strip()
                    if text and len(text) > 10:
                        content += text + "\n\n"
            
            if not content:
                content = content_div.get_text(strip=True)
            
            content = re.sub(r'[笔趣阁|顶点小说|手机阅读|m.biquge.com|www.biquge.com.cn]', '', content)
            content = re.sub(r'^\s*[本章完|本章结束]', '', content)
            content = re.sub(r'\n{3,}', '\n\n', content)
            
            return content.strip()
    
    return ""

def fetch_novel(url):
    print(f"开始抓取: {url}")
    
    html = get_html(url)
    if not html:
        print("无法获取页面")
        return None
    
    book_info = parse_book_info(html)
    chapters = extract_chapters(html, url)
    
    if not book_info["title"]:
        print("无法解析书名")
        return None
    
    if not chapters:
        print("无法解析章节列表")
        return None
    
    book_info["chapters"] = chapters
    print(f"书名: {book_info['title']}")
    print(f"作者: {book_info['author']}")
    print(f"分类: {book_info['category']}")
    print(f"章节数: {len(chapters)}")
    
    all_content = f"书名：{book_info['title']}\n作者：{book_info['author']}\n分类：{book_info['category']}\n\n简介：\n{book_info['intro']}\n\n"
    
    for i, chapter in enumerate(chapters, 1):
        print(f"正在下载第 {i}/{len(chapters)} 章: {chapter['title']}")
        chapter_html = get_html(chapter["url"])
        if chapter_html:
            content = get_chapter_content(chapter_html)
            if content:
                all_content += f"=== {chapter['title']} ===\n\n{content}\n\n"
            else:
                print(f"  章节内容为空")
    
    return {
        "title": book_info["title"],
        "author": book_info["author"],
        "category": book_info["category"],
        "content": all_content,
        "chapter_count": len(chapters)
    }

def save_novel(novel, output_dir="library"):
    category_map = {
        "玄幻": "玄幻", "奇幻": "奇幻", "仙侠": "仙侠", "武侠": "武侠",
        "都市": "都市", "言情": "言情", "历史": "历史", "科幻": "科幻",
        "悬疑": "悬疑", "恐怖": "恐怖", "网游": "网游", "穿越": "穿越",
        "重生": "重生", "系统": "系统"
    }
    
    category = category_map.get(novel["category"], "其他")
    category_dir = os.path.join(output_dir, category)
    os.makedirs(category_dir, exist_ok=True)
    
    filename = f"{novel['title']}.txt"
    filepath = os.path.join(category_dir, filename)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(novel["content"])
    
    print(f"\n小说已保存到: {filepath}")
    return filepath

def main():
    parser = argparse.ArgumentParser(description='网文抓取工具')
    parser.add_argument('url', help='小说目录页URL')
    parser.add_argument('--output', '-o', default='library', help='输出目录')
    args = parser.parse_args()
    
    novel = fetch_novel(args.url)
    if novel:
        save_novel(novel, args.output)
        print(f"抓取完成！共 {novel['chapter_count']} 章")

if __name__ == "__main__":
    main()