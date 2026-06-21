from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Literal
from urllib.parse import quote

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from app.presets import DEFAULT_RULES, merge_rules
from app.services.converter import LibreOfficeUnavailable, convert_with_libreoffice
from app.services.deepseek import classify_docx_with_deepseek, test_deepseek_connection
from app.services.document_importer import text_to_docx
from app.services.fonts import list_installed_fonts
from app.services.formatter import format_docx

app = FastAPI(title="WordTidy API", version="0.16")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-WordTidy-Warnings"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/rules/default")
def get_default_rules() -> dict:
    return DEFAULT_RULES


@app.get("/api/fonts")
def get_fonts() -> dict[str, list[str]]:
    return {"fonts": list_installed_fonts()}


@app.post("/api/deepseek/test")
async def test_deepseek(api_key: str | None = Form(None)):
    ok, message = await test_deepseek_connection(api_key)
    if not ok:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "ok", "message": message}


@app.post("/api/format")
async def format_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    rules_json: str | None = Form(None),
    output_format: Literal["docx", "pdf"] = Form("docx"),
    mode: Literal["standard", "ai"] = Form("standard"),
    insert_directories: bool = Form(False),
    deepseek_api_key: str | None = Form(None),
):
    filename = file.filename or "待排版文档.docx"
    suffix = Path(filename).suffix.lower()
    if suffix not in {".docx", ".doc", ".txt", ".md"}:
        raise HTTPException(status_code=400, detail="仅支持 .docx、.doc、.txt 和 .md 文件。")

    custom_rules = _parse_rules(rules_json)
    try:
        rules = merge_rules(custom_rules)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=json.loads(exc.json())) from exc
    if mode != "ai":
        rules.formula.ai_enhanced_detection = False

    workspace = Path(tempfile.mkdtemp(prefix="wordtidy_"))
    background_tasks.add_task(shutil.rmtree, workspace, ignore_errors=True)

    source_path = workspace / filename
    with source_path.open("wb") as target:
        shutil.copyfileobj(file.file, target)

    warnings: list[str] = []
    try:
        docx_source = source_path
        if suffix == ".doc":
            docx_source = convert_with_libreoffice(source_path, workspace / "converted", "docx")
            warnings.append(".doc 文件已通过 LibreOffice 转换为 .docx 后处理。")
        elif suffix in {".txt", ".md"}:
            docx_source = text_to_docx(source_path, workspace / "converted" / f"{Path(filename).stem}.docx", suffix)
            warnings.append(f"{suffix} 文件已转换为 .docx 后处理。")

        labels = {}
        if mode == "ai":
            labels, ai_warnings = await classify_docx_with_deepseek(docx_source, deepseek_api_key)
            warnings.extend(ai_warnings)

        output_docx = workspace / f"已排版_{Path(filename).stem}.docx"
        warnings.extend(format_docx(docx_source, output_docx, rules, labels, insert_directories))

        if output_format == "pdf":
            output_path = convert_with_libreoffice(output_docx, workspace / "pdf", "pdf")
            media_type = "application/pdf"
            download_name = f"已排版_{Path(filename).stem}.pdf"
        else:
            output_path = output_docx
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            download_name = output_docx.name
    except LibreOfficeUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"排版处理失败：{exc}") from exc

    quoted_name = quote(download_name)
    headers = {
        "X-WordTidy-Warnings": quote(json.dumps(warnings, ensure_ascii=False)),
        "Content-Disposition": f"attachment; filename*=UTF-8''{quoted_name}",
    }
    return FileResponse(
        path=output_path,
        media_type=media_type,
        filename=download_name,
        headers=headers,
        background=background_tasks,
    )


def _parse_rules(rules_json: str | None) -> dict | None:
    if not rules_json or not rules_json.strip():
        return None
    try:
        parsed = json.loads(rules_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"规则 JSON 格式错误：{exc.msg}") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=400, detail="规则 JSON 顶层必须是对象。")
    return parsed


def _frontend_static_dir() -> Path | None:
    candidates: list[Path] = []
    configured = os.getenv("WORDTIDY_STATIC_DIR")
    if configured:
        candidates.append(Path(configured))
    bundle_base = getattr(sys, "_MEIPASS", None)
    if bundle_base:
        candidates.append(Path(bundle_base) / "frontend_dist")
    project_root = Path(__file__).resolve().parents[2]
    candidates.append(project_root / "frontend" / "dist")

    for candidate in candidates:
        if (candidate / "index.html").is_file():
            return candidate
    return None


static_dir = _frontend_static_dir()
if static_dir:
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
