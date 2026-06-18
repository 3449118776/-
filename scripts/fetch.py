#!/usr/bin/env python3
import os
import re
import requests
from bs4 import BeautifulSoup

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

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

def parse_biquge(url):
    html = get_html(url)
    if not html:
        return None
    
    soup = BeautifulSoup(html, "html.parser")
    
    title = soup.find("h1")
    title = title.get_text(strip=True) if title else "未知书名"
    
    author = soup.find("meta", property="og:novel:author")
    author = author["content"] if author else "未知作者"
    
    category = soup.find("meta", property="og:novel:category")
    category = category["content"] if category else "其他"
    
    intro = soup.find("div", id="intro")
    intro = intro.get_text(strip=True) if intro else ""
    
    chapters = []
    list_div = soup.find("div", id="list") or soup.find("div", class_="listmain")
    if list_div:
        links = list_div.find_all("a")
        for link in links:
            chapter_title = link.get_text(strip=True)
            chapter_url = link["href"]
            if not chapter_url.startswith("http"):
                chapter_url = url.rsplit("/", 1)[0] + "/" + chapter_url
            chapters.append({"title": chapter_title, "url": chapter_url})
    
    return {
        "title": title,
        "author": author,
        "category": category,
        "intro": intro,
        "chapters": chapters
    }

def parse_biququ(url):
    html = get_html(url)
    if not html:
        return None
    
    soup = BeautifulSoup(html, "html.parser")
    
    title = soup.find("h1")
    title = title.get_text(strip=True) if title else "未知书名"
    
    info = soup.find("div", class_="info")
    author = "未知作者"
    category = "其他"
    if info:
        spans = info.find_all("span")
        for span in spans:
            text = span.get_text(strip=True)
            if "作者" in text:
                author = text.replace("作者：", "")
            if "分类" in text:
                category = text.replace("分类：", "")
    
    intro = soup.find("div", class_="intro")
    intro = intro.get_text(strip=True) if intro else ""
    
    chapters = []
    list_div = soup.find("div", class_="list")
    if list_div:
        links = list_div.find_all("a")
        for link in links:
            chapter_title = link.get_text(strip=True)
            chapter_url = link["href"]
            if not chapter_url.startswith("http"):
                chapter_url = url.rsplit("/", 1)[0] + "/" + chapter_url
            chapters.append({"title": chapter_title, "url": chapter_url})
    
    return {
        "title": title,
        "author": author,
        "category": category,
        "intro": intro,
        "chapters": chapters
    }

def get_chapter_content(url):
    html = get_html(url)
    if not html:
        return None
    
    soup = BeautifulSoup(html, "html.parser")
    
    content = ""
    content_div = soup.find("div", id="content") or soup.find("div", class_="content")
    
    if content_div:
        for p in content_div.find_all("p"):
            text = p.get_text(strip=True)
            if text and text != "笔趣阁":
                content += text + "\n\n"
    
    if not content:
        content = content_div.get_text(strip=True) if content_div else ""
    
    return content.strip()

def fetch_novel(url):
    print(f"开始抓取: {url}")
    
    if "biquge" in url.lower():
        novel = parse_biquge(url)
    elif "biququ" in url.lower():
        novel = parse_biququ(url)
    else:
        novel = parse_biquge(url)
    
    if not novel or not novel["chapters"]:
        print("无法解析小说信息")
        return None
    
    print(f"书名: {novel['title']}")
    print(f"作者: {novel['author']}")
    print(f"分类: {novel['category']}")
    print(f"章节数: {len(novel['chapters'])}")
    
    all_content = f"书名：{novel['title']}\n作者：{novel['author']}\n分类：{novel['category']}\n\n简介：\n{novel['intro']}\n\n"
    
    for i, chapter in enumerate(novel["chapters"], 1):
        print(f"正在下载第 {i}/{len(novel['chapters'])} 章: {chapter['title']}")
        content = get_chapter_content(chapter["url"])
        if content:
            all_content += f"=== {chapter['title']} ===\n\n{content}\n\n"
    
    return {
        "title": novel["title"],
        "author": novel["author"],
        "category": novel["category"],
        "content": all_content,
        "chapter_count": len(novel["chapters"])
    }

def save_novel(novel, output_dir="library"):
    category = novel["category"]
    category_dir = os.path.join(output_dir, category)
    os.makedirs(category_dir, exist_ok=True)
    
    filename = f"{novel['title']}.txt"
    filepath = os.path.join(category_dir, filename)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(novel["content"])
    
    print(f"小说已保存到: {filepath}")
    return filepath

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("用法: python3 fetch.py <小说目录页URL>")
        print("示例: python3 fetch.py https://www.biququ.com/book/12345/")
        sys.exit(1)
    
    url = sys.argv[1]
    novel = fetch_novel(url)
    if novel:
        save_novel(novel)