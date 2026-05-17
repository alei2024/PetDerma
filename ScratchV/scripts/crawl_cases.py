"""
宠物皮肤病案例图片爬虫 — 从百度图片搜索下载真实病例参考图。

数据源:
  1. Baidu 图片搜索 (在中国可访问, 无需 API Key)
  2. Bing 图片搜索 (备选)

用法::

    python ScratchV/scripts/crawl_cases.py
    python ScratchV/scripts/crawl_cases.py --per-disease 8
    python ScratchV/scripts/crawl_cases.py --source baidu
"""

from __future__ import annotations

import argparse
import logging
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

# ── 搜索关键词（按疾病分类） ──
SEARCH_QUERIES: Dict[str, dict] = {
    "fungal": {
        "name_cn": "真菌感染",
        "queries": [
            "狗真菌感染皮肤病",
            "猫癣皮肤病",
            "宠物皮癣真菌",
            "狗钱癣",
            "ringworm dog skin",
        ],
    },
    "dermatitis": {
        "name_cn": "皮炎",
        "queries": [
            "狗皮炎症状",
            "猫皮肤炎",
            "犬过敏性皮炎",
            "宠物皮肤病红斑",
            "canine dermatitis",
        ],
    },
    "eczema": {
        "name_cn": "湿疹",
        "queries": [
            "狗湿疹皮肤病",
            "犬湿疹图片",
            "宠物湿疹渗液",
            "狗热斑皮肤病",
            "moist dermatitis dog",
        ],
    },
    "allergy": {
        "name_cn": "过敏",
        "queries": [
            "狗过敏皮肤病",
            "猫荨麻疹",
            "宠物皮肤过敏",
            "犬食物过敏皮肤",
            "dog hives skin allergy",
        ],
    },
    "mite": {
        "name_cn": "螨虫",
        "queries": [
            "狗螨虫皮肤病",
            "犬蠕形螨病",
            "猫疥螨",
            "宠物疥癣",
            "sarcoptic mange dog",
        ],
    },
    "ringworm": {
        "name_cn": "癣病",
        "queries": [
            "狗癣病图片",
            "猫癣症状",
            "宠物真菌感染掉毛",
            "动物皮肤癣菌病",
            "circular hair loss dog",
        ],
    },
    "healthy": {
        "name_cn": "健康",
        "queries": [
            "健康宠物毛发",
            "狗正常皮肤",
            "猫健康皮毛",
            "宠物光滑毛发",
            "healthy dog coat",
        ],
    },
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}


class BaiduImageCrawler:
    """
    从百度图片搜索下载图片。
    """

    def __init__(self, output_dir: str, per_disease: int = 5):
        self.output_dir = Path(output_dir)
        self.per_disease = per_disease
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.stats: Dict[str, int] = {}
        # 初始化 session（获取 cookie）
        self._init_session()

    def _init_session(self):
        """访问百度首页以获取 cookies。"""
        try:
            self.session.get("https://www.baidu.com", timeout=15)
        except Exception as e:
            logger.warning("初始化百度会话失败: %s", e)

    def crawl(self) -> int:
        """执行爬取流程。"""
        total = 0

        for dir_name, info in SEARCH_QUERIES.items():
            disease_cn = info["name_cn"]
            queries = info["queries"]
            disease_dir = self.output_dir / dir_name
            disease_dir.mkdir(exist_ok=True)

            existing = len(list(disease_dir.glob("*.*")))
            if existing >= self.per_disease:
                logger.info("[%s] 已有 %d 张，跳过", disease_cn, existing)
                self.stats[disease_cn] = existing
                total += existing
                continue

            needed = self.per_disease - existing
            downloaded = 0
            seen_urls: set = set()

            for query in queries:
                if downloaded >= needed:
                    break

                logger.info("[%s] 搜索: %s", disease_cn, query)
                urls = self._search_images(query, count=needed - downloaded + 5)

                for img_url in urls:
                    if downloaded >= needed:
                        break
                    if img_url in seen_urls:
                        continue
                    seen_urls.add(img_url)

                    if self._download_image(img_url, disease_dir, dir_name, downloaded + 1):
                        downloaded += 1
                        logger.info("[%s] ✅ (%d/%d)", disease_cn, downloaded, needed)
                        time.sleep(0.5)  # 礼貌延迟

                time.sleep(1)  # 查询间隔

            self.stats[disease_cn] = existing + downloaded
            total += downloaded
            logger.info("[%s] 完成: 本次下载 %d 张", disease_cn, downloaded)
            time.sleep(1)

        # 打印汇总
        self._print_summary(total)
        return total

    def _search_images(self, query: str, count: int = 10) -> List[str]:
        """
        调用百度图片搜索 API 获取图片 URL。
        """
        params = {
            "tn": "resultjson_com",
            "word": query,
            "pn": 0,
            "rn": min(count, 60),
            "ie": "utf-8",
        }
        try:
            resp = self.session.get(
                "https://image.baidu.com/search/acjson",
                params=params,
                timeout=15,
            )
            if resp.status_code != 200:
                logger.warning("  百度 API 返回 %d", resp.status_code)
                return []

            data = resp.json()
            results = data.get("data", [])
            urls = []
            for item in results:
                if not isinstance(item, dict):
                    continue
                # 优先取中等尺寸，其次缩略图
                url = (
                    item.get("middleURL")
                    or item.get("thumbURL")
                    or item.get("hoverURL")
                    or ""
                )
                if url and url.startswith("http"):
                    urls.append(url)

            return urls

        except Exception as e:
            logger.warning("  百度搜索失败: %s", e)
            return []

    def _download_image(
        self, img_url: str, disease_dir: Path, prefix: str, index: int
    ) -> bool:
        """
        下载单张图片，自动检测扩展名。
        """
        try:
            resp = self.session.get(img_url, timeout=20, stream=True)
            if resp.status_code != 200:
                return False

            # 从 Content-Type 或 URL 推断扩展名
            content_type = resp.headers.get("content-type", "")
            ext = self._guess_extension(content_type, img_url)

            # 验证内容
            content = resp.content
            if len(content) < 1000:
                logger.warning("  图片太小 (%d bytes)，跳过", len(content))
                return False

            fname = f"{prefix}_{index:02d}{ext}"
            fpath = disease_dir / fname
            fpath.write_bytes(content)
            return True

        except Exception as e:
            logger.warning("  下载失败: %s", e)
            return False

    @staticmethod
    def _guess_extension(content_type: str, url: str) -> str:
        ext_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".jpg",
            "image/gif": ".gif",
        }
        for ct, ext in ext_map.items():
            if ct in content_type:
                return ext
        # URL 回退
        m = re.search(r"\.(jpg|jpeg|png|gif|webp)(?:\?|$)", url, re.I)
        if m:
            raw = m.group(1).lower()
            return ".jpg" if raw in ("jpeg", "webp") else f".{raw}"
        return ".jpg"

    def _print_summary(self, total: int):
        print("\n" + "=" * 50)
        print("  爬取结果汇总")
        print("=" * 50)
        for disease_cn, count in sorted(self.stats.items()):
            bar = "█" * min(count, 20)
            print(f"  {disease_cn}: {count:>2d} 张 {bar}")
        print(f"  {'合计':>8s}: {total:>2d} 张")
        print(f"  目录: {self.output_dir}")


# ──────────────────────────────────────────────
# CLI 入口
# ──────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="PetDerma 病例图片爬虫")
    parser.add_argument(
        "--output-dir",
        default="images_cases",
        help="图片输出目录 (默认: images_cases)",
    )
    parser.add_argument(
        "--per-disease",
        type=int,
        default=5,
        help="每种疾病下载几张 (默认: 5)",
    )
    parser.add_argument(
        "--source",
        choices=["baidu"],
        default="baidu",
        help="数据源 (目前仅支持 baidu)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-5s | %(message)s",
    )

    crawler = BaiduImageCrawler(
        output_dir=args.output_dir, per_disease=args.per_disease
    )
    crawler.crawl()


if __name__ == "__main__":
    main()
