from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx
from docx import Document


class DeepSeekResult(dict[int, str]):
    pass


VALID_LABELS = {
    "heading1",
    "heading2",
    "heading3",
    "heading4",
    "heading5",
    "heading6",
    "heading7",
    "heading8",
    "caption",
    "body",
}
DEFAULT_MODEL = "deepseek-v4-flash"


async def classify_docx_with_deepseek(docx_path: Path, api_key: str | None = None) -> tuple[DeepSeekResult, list[str]]:
    api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        return DeepSeekResult(), ["未设置 DEEPSEEK_API_KEY，AI 模式已回退为本地启发式识别。"]

    paragraphs = _extract_paragraphs(docx_path)
    if not paragraphs:
        return DeepSeekResult(), ["文档中没有可供 AI 识别的段落。"]

    payload = {
        "model": _deepseek_model(),
        "temperature": 0,
        "max_tokens": int(os.getenv("DEEPSEEK_MAX_TOKENS", "4096")),
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是 Word 文档结构识别器。只返回 JSON 对象。"
                    "把段落分类为 heading1、heading2、heading3、heading4、heading5、heading6、heading7、heading8、caption、body。"
                    "不要生成 Word 内容，不要改写原文。"
                    '输出示例：{"paragraphs":[{"index":0,"type":"heading1"},{"index":1,"type":"body"}]}'
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
    return _parse_deepseek_labels(content)


async def test_deepseek_connection(api_key: str | None = None) -> tuple[bool, str]:
    api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        return False, "未提供 DeepSeek API key。"

    payload = {
        "model": _deepseek_model(),
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


def _deepseek_model() -> str:
    return os.getenv("DEEPSEEK_MODEL", DEFAULT_MODEL)


def _parse_deepseek_labels(content: str | None) -> tuple[DeepSeekResult, list[str]]:
    labels = DeepSeekResult()
    if not content or not content.strip():
        return labels, ["DeepSeek 返回内容为空，AI 模式已回退为本地启发式识别。"]

    try:
        parsed = json.loads(_strip_json_fence(content))
    except json.JSONDecodeError as exc:
        return labels, [f"DeepSeek 返回内容不是有效 JSON（{exc.msg}），AI 模式已回退为本地启发式识别。"]

    items = _extract_label_items(parsed)
    if items is None:
        return labels, ["DeepSeek 返回 JSON 未包含 paragraphs 数组，AI 模式已回退为本地启发式识别。"]

    skipped = 0
    for item in items:
        if not isinstance(item, dict):
            skipped += 1
            continue
        try:
            index = int(item["index"])
            label = str(item.get("type") or item.get("label") or "").strip()
        except (KeyError, TypeError, ValueError):
            skipped += 1
            continue
        if label in VALID_LABELS:
            labels[index] = label
        else:
            skipped += 1

    warnings = [f"AI 已识别 {len(labels)} 个段落。"]
    if skipped:
        warnings.append(f"DeepSeek 返回中有 {skipped} 条段落标签无效，已忽略。")
    return labels, warnings


def _strip_json_fence(content: str) -> str:
    stripped = content.strip()
    if not stripped.startswith("```"):
        return stripped
    lines = stripped.splitlines()
    if len(lines) >= 3 and lines[0].lstrip("`").strip().lower() in {"json", ""} and lines[-1].strip() == "```":
        return "\n".join(lines[1:-1]).strip()
    return stripped


def _extract_label_items(parsed: Any) -> list[Any] | None:
    if isinstance(parsed, list):
        return parsed
    if not isinstance(parsed, dict):
        return None
    for key in ("paragraphs", "items", "results", "labels"):
        value = parsed.get(key)
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            return [{"index": index, "type": label} for index, label in value.items()]
    if "index" in parsed and ("type" in parsed or "label" in parsed):
        return [parsed]
    return None


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
