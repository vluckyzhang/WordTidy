const 本地默认规则 = {
  page: {
    size: "A4",
    top_cm: 2.5,
    bottom_cm: 2.5,
    left_cm: 3,
    right_cm: 3,
    header_cm: 2.5,
    footer_cm: 2.5
  },
  body: {
    east_asia: "宋体",
    ascii: "Times New Roman",
    size_pt: 12,
    bold: false,
    italic: false,
    preserve_emphasis: false,
    space_before_pt: 0,
    space_after_pt: 0,
    line_spacing_type: "fixed",
    line_spacing_value: 24,
    alignment: "justify",
    first_line_indent_chars: 2
  },
  headings: {
    level1: {
      east_asia: "黑体",
      ascii: "Times New Roman",
      size_pt: 15,
      bold: false,
      italic: false,
      preserve_emphasis: false,
      space_before_pt: 12,
      space_after_pt: 12,
      line_spacing_type: "fixed",
      line_spacing_value: 24,
      alignment: "left",
      first_line_indent_chars: 0
    },
    level2: {
      east_asia: "宋体",
      ascii: "Times New Roman",
      size_pt: 14,
      bold: false,
      italic: false,
      preserve_emphasis: false,
      space_before_pt: 12,
      space_after_pt: 0,
      line_spacing_type: "fixed",
      line_spacing_value: 24,
      alignment: "left",
      first_line_indent_chars: 0
    },
    level3: {
      east_asia: "宋体",
      ascii: "Times New Roman",
      size_pt: 12,
      bold: false,
      italic: false,
      preserve_emphasis: false,
      space_before_pt: 0,
      space_after_pt: 0,
      line_spacing_type: "fixed",
      line_spacing_value: 24,
      alignment: "left",
      first_line_indent_chars: 0
    }
  },
  caption: {
    east_asia: "宋体",
    ascii: "Times New Roman",
    size_pt: 10.5,
    bold: false,
    italic: false,
    preserve_emphasis: false,
    space_before_pt: 0,
    space_after_pt: 0,
    line_spacing_type: "fixed",
    line_spacing_value: 24,
    alignment: "left",
    first_line_indent_chars: 0
  },
  directory: {
    enabled_levels: [1, 2, 3],
    title: {
      east_asia: "黑体",
      ascii: "Times New Roman",
      size_pt: 15,
      bold: false,
      italic: false,
      preserve_emphasis: false
    },
    level1: {
      east_asia: "宋体",
      ascii: "Times New Roman",
      size_pt: 15,
      bold: false,
      italic: false,
      preserve_emphasis: false,
      indent_chars: 0,
      alignment: "left"
    },
    level2: {
      east_asia: "宋体",
      ascii: "Times New Roman",
      size_pt: 14,
      bold: false,
      italic: false,
      preserve_emphasis: false,
      indent_chars: 2,
      alignment: "left"
    },
    level3: {
      east_asia: "宋体",
      ascii: "Times New Roman",
      size_pt: 12,
      bold: false,
      italic: false,
      preserve_emphasis: false,
      indent_chars: 4,
      alignment: "left"
    }
  },
  table: {
    east_asia: "宋体",
    ascii: "Times New Roman",
    size_pt: 10.5,
    bold: false,
    italic: false,
    preserve_emphasis: false,
    thick_border_pt: 1.5,
    thin_border_pt: 0.75,
    width_percent: 100,
    cell_alignment: "center",
    line_spacing_type: "single",
    line_spacing_value: 1
  },
  image: {
    alignment: "center",
    space_before_pt: 0,
    space_after_pt: 0,
    line_spacing_type: "single",
    line_spacing_value: 1
  },
  formula: {
    enabled: false,
    ai_enhanced_detection: false,
    format: "linear",
    font: "Cambria Math",
    size_pt: 12,
    alignment: "center",
    strip_delimiters: true
  },
  page_number: {
    east_asia: "Times New Roman",
    ascii: "Times New Roman",
    size_pt: 12,
    bold: false,
    italic: false,
    preserve_emphasis: false,
    directory_style: "roman",
    body_style: "decimal",
    alignment: "center",
    restart_body_at: 1
  },
  update_fields_on_open: true
};

export default 本地默认规则;
