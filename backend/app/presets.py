from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.schemas.rules import FormattingRules


def font_rule(
    east_asia: str = "宋体",
    ascii_font: str = "Times New Roman",
    size_pt: float = 12,
    bold: bool = False,
    italic: bool = False,
    preserve_emphasis: bool = False,
) -> dict[str, Any]:
    return {
        "east_asia": east_asia,
        "ascii": ascii_font,
        "size_pt": size_pt,
        "bold": bold,
        "italic": italic,
        "preserve_emphasis": preserve_emphasis,
    }


def paragraph_rule(
    *,
    east_asia: str = "宋体",
    ascii_font: str = "Times New Roman",
    size_pt: float = 12,
    bold: bool = False,
    italic: bool = False,
    preserve_emphasis: bool = False,
    space_before_pt: float = 0,
    space_after_pt: float = 0,
    line_spacing_type: str = "fixed",
    line_spacing_value: float = 24,
    alignment: str = "left",
    first_line_indent_chars: float = 0,
) -> dict[str, Any]:
    return {
        **font_rule(east_asia, ascii_font, size_pt, bold, italic, preserve_emphasis),
        "space_before_pt": space_before_pt,
        "space_after_pt": space_after_pt,
        "line_spacing_type": line_spacing_type,
        "line_spacing_value": line_spacing_value,
        "alignment": alignment,
        "first_line_indent_chars": first_line_indent_chars,
    }


def directory_level_rule(
    *,
    size_pt: float,
    indent_chars: float,
    east_asia: str = "宋体",
    ascii_font: str = "Times New Roman",
    bold: bool = False,
    italic: bool = False,
    preserve_emphasis: bool = False,
    alignment: str = "left",
) -> dict[str, Any]:
    return {
        **font_rule(east_asia, ascii_font, size_pt, bold, italic, preserve_emphasis),
        "indent_chars": indent_chars,
        "alignment": alignment,
    }


LEVEL3_HEADING = paragraph_rule(
    east_asia="宋体",
    ascii_font="Times New Roman",
    size_pt=12,
    space_before_pt=0,
    space_after_pt=0,
    line_spacing_type="fixed",
    line_spacing_value=24,
    alignment="left",
)


DEFAULT_RULES: dict[str, Any] = {
    "page": {
        "size": "A4",
        "top_cm": 2.5,
        "bottom_cm": 2.5,
        "left_cm": 3,
        "right_cm": 3,
        "header_cm": 2.5,
        "footer_cm": 2.5,
    },
    "body": paragraph_rule(
        east_asia="宋体",
        ascii_font="Times New Roman",
        size_pt=12,
        space_before_pt=0,
        space_after_pt=0,
        line_spacing_type="fixed",
        line_spacing_value=24,
        alignment="justify",
        first_line_indent_chars=2,
    ),
    "headings": {
        "level1": paragraph_rule(
            east_asia="黑体",
            ascii_font="Times New Roman",
            size_pt=15,
            space_before_pt=12,
            space_after_pt=12,
            line_spacing_type="fixed",
            line_spacing_value=24,
            alignment="left",
        ),
        "level2": paragraph_rule(
            east_asia="宋体",
            ascii_font="Times New Roman",
            size_pt=14,
            space_before_pt=12,
            space_after_pt=0,
            line_spacing_type="fixed",
            line_spacing_value=24,
            alignment="left",
        ),
        "level3": deepcopy(LEVEL3_HEADING),
    },
    "caption": paragraph_rule(
        east_asia="宋体",
        ascii_font="Times New Roman",
        size_pt=10.5,
        space_before_pt=0,
        space_after_pt=0,
        line_spacing_type="fixed",
        line_spacing_value=24,
        alignment="left",
    ),
    "directory": {
        "enabled_levels": [1, 2, 3],
        "title": font_rule(east_asia="黑体", ascii_font="Times New Roman", size_pt=15),
        "level1": directory_level_rule(size_pt=15, indent_chars=0),
        "level2": directory_level_rule(size_pt=14, indent_chars=2),
        "level3": directory_level_rule(size_pt=12, indent_chars=4),
    },
    "table": {
        **font_rule(east_asia="宋体", ascii_font="Times New Roman", size_pt=10.5),
        "thick_border_pt": 1.5,
        "thin_border_pt": 0.75,
        "width_percent": 100,
        "cell_alignment": "center",
        "line_spacing_type": "single",
        "line_spacing_value": 1,
    },
    "image": {
        "alignment": "center",
        "space_before_pt": 0,
        "space_after_pt": 0,
        "line_spacing_type": "single",
        "line_spacing_value": 1,
    },
    "formula": {
        "enabled": False,
        "ai_enhanced_detection": False,
        "format": "linear",
        "font": "Cambria Math",
        "size_pt": 12,
        "alignment": "center",
        "strip_delimiters": True,
    },
    "page_number": {
        **font_rule(east_asia="Times New Roman", ascii_font="Times New Roman", size_pt=12),
        "directory_style": "roman",
        "body_style": "decimal",
        "alignment": "center",
        "restart_body_at": 1,
    },
    "update_fields_on_open": True,
}


def merge_rules(custom_rules: dict[str, Any] | None = None) -> FormattingRules:
    merged = deepcopy(DEFAULT_RULES)
    if custom_rules:
        _deep_merge(merged, custom_rules)
    return FormattingRules.model_validate(merged)


def _deep_merge(base: dict[str, Any], updates: dict[str, Any]) -> None:
    for key, value in updates.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            _deep_merge(base[key], value)
        else:
            base[key] = value
