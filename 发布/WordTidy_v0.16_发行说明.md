# WordTidy v0.16

WordTidy v0.16 聚焦 AI 模式稳定性、默认规则加载韧性和排版队列布局体验。

## 更新内容

- 修复 DeepSeek 返回顶层数组 JSON 时导致的 `list.get` 崩溃。
- AI 模式结构识别增加 JSON 代码块、索引映射、空内容和无效标签容错。
- DeepSeek 连接测试和实际识别统一使用默认模型 `deepseek-v4-flash`。
- 默认规则接口暂不可用时，前端自动使用本地内置默认规则，不再显示阻塞式“默认规则加载失败”。
- 排版队列改为内部滚动，避免队列文件高度影响右侧“排版规则 / 预览 / 手动设置 / 高级 JSON”区域。
- 增加 DeepSeek 响应解析回归测试。
- 前端、后端、构建脚本、GitHub Actions 和发布说明统一到 `0.16`。

## 程序包说明

- Windows：解压 `WordTidy_v0.16_Windows_executable.zip` 后运行 `WordTidy.exe`。
- macOS：解压 `WordTidy_v0.16_macOS_executable.zip` 后运行 `WordTidy`。
- `.doc` 转 `.docx`、`.docx` 转 PDF 仍需要本机安装 LibreOffice。
- AI模式需要配置 DeepSeek API key 或后端环境变量。
