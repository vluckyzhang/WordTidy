from __future__ import annotations

import json
from pathlib import Path
from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch

from app.services.deepseek import classify_docx_with_deepseek


class _FakeResponse:
    def __init__(self, content: str) -> None:
        self._content = content

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {"choices": [{"message": {"content": self._content}}]}


class _FakeAsyncClient:
    response_content = ""

    def __init__(self, *args, **kwargs) -> None:
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback) -> None:
        return None

    async def post(self, *args, **kwargs) -> _FakeResponse:
        return _FakeResponse(self.response_content)


class DeepSeekClassificationTests(IsolatedAsyncioTestCase):
    async def test_accepts_top_level_paragraph_array(self) -> None:
        _FakeAsyncClient.response_content = json.dumps(
            [
                {"index": 0, "type": "heading1"},
                {"index": "1", "type": "body"},
            ],
            ensure_ascii=False,
        )

        with (
            patch("app.services.deepseek._extract_paragraphs", return_value=[{"index": 0, "text": "标题", "style": ""}]),
            patch("app.services.deepseek.httpx.AsyncClient", _FakeAsyncClient),
        ):
            labels, warnings = await classify_docx_with_deepseek(Path("示例.docx"), api_key="sk-test")

        self.assertEqual(labels, {0: "heading1", 1: "body"})
        self.assertEqual(warnings, ["AI 已识别 2 个段落。"])
