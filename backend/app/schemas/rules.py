from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Alignment = Literal["left", "center", "right", "justify"]
LineSpacingType = Literal["single", "one_point_five", "double", "multiple", "fixed"]


class FontRule(BaseModel):
    east_asia: str = Field(default="宋体", description="中文字体")
    ascii: str = Field(default="Times New Roman", description="英文和数字字体")
    size_pt: float = Field(default=12, ge=0.5, le=50, description="字号，单位 pt")
    bold: bool = False
    italic: bool = False
    preserve_emphasis: bool = False


class ParagraphRule(FontRule):
    space_before_pt: float = Field(default=0, ge=0)
    space_after_pt: float = Field(default=0, ge=0)
    line_spacing_type: LineSpacingType = "fixed"
    line_spacing_value: float = Field(default=24, gt=0)
    alignment: Alignment = "left"
    first_line_indent_chars: float = Field(default=0, ge=0)


class DirectoryLevelRule(FontRule):
    indent_chars: float = Field(default=0, ge=0)
    alignment: Alignment = "left"


class DirectoryRule(BaseModel):
    enabled_levels: list[int] = Field(default_factory=lambda: [1, 2, 3])
    title: FontRule = Field(default_factory=lambda: FontRule(east_asia="黑体", ascii="Times New Roman", size_pt=15))
    level1: DirectoryLevelRule = Field(default_factory=lambda: DirectoryLevelRule(size_pt=15, indent_chars=0))
    level2: DirectoryLevelRule = Field(default_factory=lambda: DirectoryLevelRule(size_pt=14, indent_chars=2))
    level3: DirectoryLevelRule = Field(default_factory=lambda: DirectoryLevelRule(size_pt=12, indent_chars=4))


class PageRule(BaseModel):
    size: Literal["A4"] = "A4"
    top_cm: float = 2.5
    bottom_cm: float = 2.5
    left_cm: float = 3
    right_cm: float = 3
    header_cm: float = 2.5
    footer_cm: float = 2.5


class TableRule(FontRule):
    thick_border_pt: float = 1.5
    thin_border_pt: float = 0.75
    width_percent: int = Field(default=100, ge=1, le=100)
    cell_alignment: Alignment = "center"
    line_spacing_type: LineSpacingType = "single"
    line_spacing_value: float = 1


class ImageRule(BaseModel):
    alignment: Alignment = "center"
    space_before_pt: float = 0
    space_after_pt: float = 0
    line_spacing_type: LineSpacingType = "single"
    line_spacing_value: float = 1


class PageNumberRule(FontRule):
    directory_style: Literal["roman"] = "roman"
    body_style: Literal["decimal"] = "decimal"
    alignment: Alignment = "center"
    restart_body_at: int = 1


class HeadingRules(BaseModel):
    level1: ParagraphRule
    level2: ParagraphRule | None = None
    level3: ParagraphRule | None = None
    level4: ParagraphRule | None = None
    level5: ParagraphRule | None = None
    level6: ParagraphRule | None = None
    level7: ParagraphRule | None = None
    level8: ParagraphRule | None = None


class FormulaRule(BaseModel):
    enabled: bool = False
    ai_enhanced_detection: bool = False
    format: Literal["linear", "professional"] = "linear"
    font: str = "Cambria Math"
    size_pt: float = Field(default=12, ge=0.5, le=50)
    alignment: Alignment = "center"
    strip_delimiters: bool = True


class FormattingRules(BaseModel):
    page: PageRule
    body: ParagraphRule
    headings: HeadingRules
    caption: ParagraphRule
    directory: DirectoryRule
    table: TableRule
    image: ImageRule
    formula: FormulaRule = Field(default_factory=FormulaRule)
    page_number: PageNumberRule
    update_fields_on_open: bool = True
