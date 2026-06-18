from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx
from docx import Document


class DeepSeekResult(dict[int, str]):
    pass


async def classify_docx_with_deepseek(docx_path: Path, api_key: str | None = None) -> tuple[DeepSeekResult, list[str]]:
    api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        return DeepSeekResult(), ["未设置 DEEPSEEK_API_KEY，AI 模式已回退为本地启发式识别。"]

    paragraphs = _extract_paragraphs(docx_path)
    if not paragraphs:
        return DeepSeekResult(), ["文档中没有可供 AI 识别的段落。"]

    payload = {
        "model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是 Word 文档结构识别器。只返回 JSON。"
                    "把段落分类为 heading1、heading2、heading3、heading4、heading5、heading6、heading7、heading8、caption、body。"
                    "不要生成 Word 内容，不要改写原文。"
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "schema": {
                            "paragraphs": [
                                {"index": 0, "type": "heading1|heading2|heading3|heading4|heading5|heading6|heading7|heading8|caption|body"}
                            ]
                        },
                        "paragraphs": paragraphs[:160],
                    },
                    ensure_ascii=False,
                ),
            },
        ],
    }

    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
        response.raise_for_status()

    content = response.json()["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    labels = DeepSeekResult()
    for item in parsed.get("paragraphs", []):
        try:
            index = int(item["index"])
            label = str(item["type"]).strip()
        except (KeyError, TypeError, ValueError):
            continue
        if label in {"heading1", "heading2", "heading3", "heading4", "heading5", "heading6", "heading7", "heading8", "caption", "body"}:
            labels[index] = label

    return labels, [f"AI 已识别 {len(labels)} 个段落。"]


async def test_deepseek_connection(api_key: str | None = None) -> tuple[bool, str]:
    api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        return False, "未提供 DeepSeek API key。"

    payload = {
        "model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        "temperature": 0,
        "max_tokens": 4,
        "messages": [{"role": "user", "content": "ping"}],
    }
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        return False, f"连接失败：DeepSeek 返回 HTTP {exc.response.status_code}。"
    except httpx.HTTPError as exc:
        return False, f"连接失败：{exc}"

    return True, "DeepSeek API key 可用。"


def _extract_paragraphs(docx_path: Path) -> list[dict[str, Any]]:
    document = Document(str(docx_path))
    extracted: list[dict[str, Any]] = []
    for index, paragraph in enumerate(document.paragraphs):
        text = paragraph.text.strip()
        if not text:
            continue
        extracted.append(
            {
                "index": index,
                "text": text[:600],
                "style": paragraph.style.name if paragraph.style is not None else "",
            }
        )
    return extracted
