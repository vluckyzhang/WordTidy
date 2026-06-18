import { ChangeEvent, DragEvent, FormEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  Code2,
  ExternalLink,
  FileInput,
  Download,
  Eye,
  FileJson,
  FileText,
  Github,
  HeartHandshake,
  Heading,
  Info,
  Loader2,
  Mail,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  Sigma,
  Sparkles,
  Table2,
  Type,
  UploadCloud,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type OutputFormat = "docx" | "pdf";
type Mode = "standard" | "ai";
type Alignment = "left" | "center" | "right" | "justify";
type LineSpacingType = "single" | "one_point_five" | "double" | "multiple" | "fixed";
type RuleTab = "preview" | "settings" | "json";
type RuleCategory = "page" | "body" | "headings" | "caption" | "directory" | "formula" | "visuals" | "pageNumber";
type FontSizeUnit = "pt" | "word";
type FormulaFormat = "linear" | "professional";
type DeepSeekConnectionStatus = "idle" | "checking" | "connected" | "failed";
type QueueFileStatus = "pending" | "processing" | "done" | "failed";

type FontRule = {
  east_asia: string;
  ascii: string;
  size_pt: number;
  bold: boolean;
  italic: boolean;
  preserve_emphasis: boolean;
};

type ParagraphRule = FontRule & {
  space_before_pt: number;
  space_after_pt: number;
  line_spacing_type: LineSpacingType;
  line_spacing_value: number;
  alignment: Alignment;
  first_line_indent_chars: number;
};

type DirectoryLevelRule = FontRule & {
  indent_chars: number;
  alignment: Alignment;
};

type DirectoryRule = {
  enabled_levels: number[];
  title: FontRule;
  level1: DirectoryLevelRule;
  level2: DirectoryLevelRule;
  level3: DirectoryLevelRule;
};

type PageRule = {
  size: "A4";
  top_cm: number;
  bottom_cm: number;
  left_cm: number;
  right_cm: number;
  header_cm: number;
  footer_cm: number;
};

type TableRule = FontRule & {
  thick_border_pt: number;
  thin_border_pt: number;
  width_percent: number;
  cell_alignment: Alignment;
  line_spacing_type: LineSpacingType;
  line_spacing_value: number;
};

type ImageRule = {
  alignment: Alignment;
  space_before_pt: number;
  space_after_pt: number;
  line_spacing_type: LineSpacingType;
  line_spacing_value: number;
};

type FormulaRule = {
  enabled: boolean;
  ai_enhanced_detection: boolean;
  format: FormulaFormat;
  font: string;
  size_pt: number;
  alignment: Alignment;
  strip_delimiters: boolean;
};

type PageNumberRule = FontRule & {
  directory_style: "roman";
  body_style: "decimal";
  alignment: Alignment;
  restart_body_at: number;
};

type FormattingRules = {
  page: PageRule;
  body: ParagraphRule;
  headings: {
    level1: ParagraphRule;
    level2: ParagraphRule | null;
    level3: ParagraphRule | null;
    level4?: ParagraphRule | null;
    level5?: ParagraphRule | null;
    level6?: ParagraphRule | null;
    level7?: ParagraphRule | null;
    level8?: ParagraphRule | null;
  };
  caption: ParagraphRule;
  directory: DirectoryRule;
  table: TableRule;
  image: ImageRule;
  formula: FormulaRule;
  page_number: PageNumberRule;
  update_fields_on_open: boolean;
};

type DownloadState = {
  id: string;
  originalName: string;
  url: string;
  fileName: string;
  size: number;
  warnings: string[];
};

type QueuedFile = {
  id: string;
  file: File;
  status: QueueFileStatus;
  message?: string;
};

type NumberFieldProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

type SelectFieldProps<T extends string> = {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
};

type FontFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fonts: string[];
  fontsLoaded: boolean;
  isLoadingFonts: boolean;
  onLoadFonts: () => void;
};

type FontLoaderState = {
  fonts: string[];
  fontsLoaded: boolean;
  isLoadingFonts: boolean;
  onLoadFonts: () => void;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const APP_VERSION = "0.12";
const REPOSITORY_URL = "https://github.com/vluckyzhang/WordTidy";
const TAGS_API = "https://api.github.com/repos/vluckyzhang/WordTidy/tags?per_page=1";
const CONTACT_EMAIL = "vluckyzhang@163.con";
const PROJECT_SLOGAN = "浏览器轻 UI + 后端 Word 排版引擎，上传文档，选择规则，输出规范的 Word 或 PDF。";
const DOCUMENT_FILE_ACCEPT = ".doc,.docx,.md,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain";
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([".doc", ".docx", ".md", ".txt"]);

const sponsorAssets = [
  { label: "微信赞助", src: "/赞助与社群/微信收款码.png" },
  { label: "支付宝赞助", src: "/赞助与社群/支付宝收款码.jpg" }
];

const alignmentOptions: Array<{ label: string; value: Alignment }> = [
  { label: "左对齐", value: "left" },
  { label: "居中", value: "center" },
  { label: "右对齐", value: "right" },
  { label: "两端对齐", value: "justify" }
];

const lineSpacingOptions: Array<{ label: string; value: LineSpacingType }> = [
  { label: "单倍", value: "single" },
  { label: "1.5倍", value: "one_point_five" },
  { label: "2倍", value: "double" },
  { label: "多倍", value: "multiple" },
  { label: "固定值", value: "fixed" }
];

const formulaFormatOptions: Array<{ label: string; value: FormulaFormat }> = [
  { label: "线性", value: "linear" },
  { label: "专用", value: "professional" }
];

const wordFontSizes = [
  { label: "初号", pt: 42 },
  { label: "小初", pt: 36 },
  { label: "一号", pt: 26 },
  { label: "小一", pt: 24 },
  { label: "二号", pt: 22 },
  { label: "小二", pt: 18 },
  { label: "三号", pt: 16 },
  { label: "小三", pt: 15 },
  { label: "四号", pt: 14 },
  { label: "小四", pt: 12 },
  { label: "五号", pt: 10.5 },
  { label: "小五", pt: 9 },
  { label: "六号", pt: 7.5 },
  { label: "小六", pt: 6.5 }
];

const categoryItems: Array<{ key: RuleCategory; label: string; icon: LucideIcon }> = [
  { key: "page", label: "页面", icon: FileText },
  { key: "body", label: "正文", icon: Type },
  { key: "headings", label: "标题", icon: Heading },
  { key: "caption", label: "题注", icon: BookOpenText },
  { key: "directory", label: "目录", icon: FileInput },
  { key: "formula", label: "公式", icon: Sigma },
  { key: "visuals", label: "图表", icon: Table2 },
  { key: "pageNumber", label: "页码", icon: Palette }
];

function App() {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [rules, setRules] = useState<FormattingRules | null>(null);
  const [defaultRules, setDefaultRules] = useState<FormattingRules | null>(null);
  const [rulesText, setRulesText] = useState("");
  const [activeTab, setActiveTab] = useState<RuleTab>("preview");
  const [activeCategory, setActiveCategory] = useState<RuleCategory>("body");
  const [mode, setMode] = useState<Mode>("standard");
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestMessage, setApiKeyTestMessage] = useState("");
  const [apiKeyTestOk, setApiKeyTestOk] = useState<boolean | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("docx");
  const [insertDirectories, setInsertDirectories] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [downloads, setDownloads] = useState<DownloadState[]>([]);
  const [deepseekStatus, setDeepseekStatus] = useState<DeepSeekConnectionStatus>("idle");
  const [deepseekStatusMessage, setDeepseekStatusMessage] = useState("");
  const [installedFonts, setInstalledFonts] = useState<string[]>([]);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isLoadingFonts, setIsLoadingFonts] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSponsorOpen, setIsSponsorOpen] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const downloadUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    void loadDefaultRules();
  }, []);

  useEffect(() => {
    if (mode === "ai") {
      void checkDeepSeekConnection(false);
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      downloadUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      downloadUrlsRef.current = [];
    };
  }, []);

  const canSubmit = useMemo(() => queuedFiles.length > 0 && Boolean(rules) && !isLoading, [queuedFiles.length, rules, isLoading]);

  async function loadDefaultRules() {
    try {
      const response = await fetch(`${API_BASE}/api/rules/default`);
      if (!response.ok) {
        throw new Error("默认规则加载失败");
      }
      const loadedRules = (await response.json()) as FormattingRules;
      setRulesAndText(loadedRules);
      setDefaultRules(cloneRules(loadedRules));
    } catch (err) {
      setError(err instanceof Error ? err.message : "默认规则加载失败");
    }
  }

  async function loadInstalledFonts() {
    if (fontsLoaded || isLoadingFonts) {
      return;
    }
    setIsLoadingFonts(true);
    try {
      const response = await fetch(`${API_BASE}/api/fonts`);
      if (!response.ok) {
        throw new Error("字体列表加载失败");
      }
      const body = await response.json();
      setInstalledFonts(Array.isArray(body.fonts) ? body.fonts : []);
      setFontsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "字体列表加载失败");
    } finally {
      setIsLoadingFonts(false);
    }
  }

  async function checkForUpdates() {
    setIsCheckingUpdate(true);
    setUpdateMessage("");
    try {
      const response = await fetch(TAGS_API, {
        headers: { Accept: "application/vnd.github+json" }
      });
      if (!response.ok) {
        throw new Error("暂时无法检查更新。");
      }
      const tags = await response.json();
      if (!Array.isArray(tags) || tags.length === 0) {
        setUpdateMessage("当前仓库还没有远端标签，0.12 是本地首发版本。");
        return;
      }
      const latestTag = String(tags[0]?.name ?? "").replace(/^v/i, "");
      if (!latestTag) {
        setUpdateMessage("没有读取到最新版本号。");
        return;
      }
      const isNewer = compareVersions(latestTag, APP_VERSION) > 0;
      setUpdateMessage(isNewer ? `发现新版本 v${latestTag}，可前往 GitHub Releases 下载。` : `当前已是最新版本 v${APP_VERSION}。`);
    } catch (err) {
      setUpdateMessage(err instanceof Error ? err.message : "暂时无法检查更新。");
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  function setRulesAndText(nextRules: FormattingRules) {
    const cloned = cloneRules(nextRules);
    setRules(cloned);
    setRulesText(JSON.stringify(cloned, null, 2));
  }

  function updateRules(mutator: (draft: FormattingRules) => void) {
    if (!rules) {
      return;
    }
    const draft = cloneRules(rules);
    mutator(draft);
    setRulesAndText(draft);
    setError("");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
    event.target.value = "";
  }

  function addFiles(fileList: FileList | File[] | null | undefined) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) {
      return;
    }
    const accepted = files.filter(isAllowedDocumentFile);
    const rejected = files.filter((candidate) => !isAllowedDocumentFile(candidate));
    if (accepted.length > 0) {
      setQueuedFiles((current) => {
        const existingKeys = new Set(current.map((item) => fileIdentity(item.file)));
        const nextItems = accepted
          .filter((candidate) => !existingKeys.has(fileIdentity(candidate)))
          .map(createQueuedFile);
        return [...current, ...nextItems];
      });
      setWarnings([]);
    }
    if (rejected.length > 0) {
      setError(`已拒绝 ${rejected.length} 个文件：仅支持 Word、Markdown 和 TXT 文件。`);
      return;
    }
    setError("");
  }

  function onDropFile(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);
    addFiles(event.dataTransfer.files);
  }

  function removeQueuedFile(id: string) {
    if (isLoading) {
      return;
    }
    setQueuedFiles((current) => current.filter((item) => item.id !== id));
    setWarnings((current) => current.filter((warning) => !warning.startsWith(`${id}:`)));
    removeDownloadsForFile(id);
    setError("");
  }

  async function onRulesFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) {
      return;
    }
    try {
      const text = await selected.text();
      const importedRules = normalizeRules(JSON.parse(text), defaultRules);
      setRulesAndText(importedRules);
      setActiveTab("preview");
      setError("");
    } catch {
      setError("导入失败：请选择有效的排版规则 JSON 文件");
    }
  }

  function clearDownloads() {
    downloadUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    downloadUrlsRef.current = [];
    setDownloads([]);
  }

  function removeDownloadsForFile(id: string) {
    setDownloads((current) => {
      const removed = current.filter((item) => item.id === id);
      removed.forEach((item) => {
        URL.revokeObjectURL(item.url);
        downloadUrlsRef.current = downloadUrlsRef.current.filter((url) => url !== item.url);
      });
      return current.filter((item) => item.id !== id);
    });
  }

  function restoreDefaultRules() {
    if (!defaultRules) {
      return;
    }
    setRulesAndText(defaultRules);
    setError("");
    setActiveTab("preview");
  }

  function applyJsonRules() {
    try {
      const parsed = normalizeRules(JSON.parse(rulesText), defaultRules);
      setRulesAndText(parsed);
      setActiveTab("preview");
      setError("");
    } catch {
      setError("规则 JSON 格式错误");
    }
  }

  function formatJsonRules() {
    try {
      const parsed = JSON.parse(rulesText);
      setRulesText(JSON.stringify(parsed, null, 2));
      setError("");
    } catch {
      setError("规则 JSON 格式错误");
    }
  }

  function saveRulesJson() {
    if (!rules) {
      return;
    }
    const content = JSON.stringify(rules, null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `排版规则_${formatDateForFileName(new Date())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function checkDeepSeekConnection(showInlineMessage = false) {
    setIsTestingApiKey(true);
    setDeepseekStatus("checking");
    setDeepseekStatusMessage("");
    if (showInlineMessage) {
      setApiKeyTestMessage("");
      setApiKeyTestOk(null);
    }
    const formData = new FormData();
    const apiKey = deepseekApiKey.trim();
    if (apiKey) {
      formData.append("api_key", apiKey);
    }
    try {
      const response = await fetch(`${API_BASE}/api/deepseek/test`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const detail = await readError(response);
        throw new Error(detail);
      }
      const body = await response.json();
      const message = body.message ?? "DeepSeek API key 可用。";
      setDeepseekStatus("connected");
      setDeepseekStatusMessage(message);
      if (showInlineMessage) {
        setApiKeyTestOk(true);
        setApiKeyTestMessage(message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "DeepSeek API key 测试失败";
      setDeepseekStatus("failed");
      setDeepseekStatusMessage(message);
      if (showInlineMessage) {
        setApiKeyTestOk(false);
        setApiKeyTestMessage(message);
      }
    } finally {
      setIsTestingApiKey(false);
    }
  }

  async function testDeepSeekApiKey() {
    await checkDeepSeekConnection(true);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (queuedFiles.length === 0) {
      setError("请选择 Word、Markdown 或 TXT 文件");
      return;
    }
    if (!rules) {
      setError("排版规则尚未加载");
      return;
    }

    setIsLoading(true);
    setError("");
    setWarnings([]);
    clearDownloads();
    setQueuedFiles((current) => current.map((item) => ({ ...item, status: "pending", message: undefined })));

    const rulesForSubmit = cloneRules(rules);
    if (mode !== "ai") {
      rulesForSubmit.formula.ai_enhanced_detection = false;
    }

    let failedCount = 0;
    try {
      for (const item of queuedFiles) {
        setQueuedFiles((current) => current.map((candidate) =>
          candidate.id === item.id ? { ...candidate, status: "processing", message: "正在排版" } : candidate
        ));

        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("rules_json", JSON.stringify(rulesForSubmit));
        formData.append("output_format", outputFormat);
        formData.append("mode", mode);
        formData.append("insert_directories", String(insertDirectories));
        if (mode === "ai" && deepseekApiKey.trim()) {
          formData.append("deepseek_api_key", deepseekApiKey.trim());
        }

        try {
          const response = await fetch(`${API_BASE}/api/format`, {
            method: "POST",
            body: formData
          });

          if (!response.ok) {
            const detail = await readError(response);
            throw new Error(detail);
          }

          const fileWarnings = parseWarnings(response.headers.get("X-WordTidy-Warnings"));
          if (fileWarnings.length > 0) {
            setWarnings((current) => [...current, ...fileWarnings.map((warning) => `${item.file.name}：${warning}`)]);
          }

          const blob = await response.blob();
          const fileName = getDownloadFileName(response, item.file.name, outputFormat);
          const url = URL.createObjectURL(blob);
          downloadUrlsRef.current.push(url);
          setDownloads((current) => [
            ...current,
            { id: item.id, originalName: item.file.name, url, fileName, size: blob.size, warnings: fileWarnings }
          ]);
          setQueuedFiles((current) => current.map((candidate) =>
            candidate.id === item.id ? { ...candidate, status: "done", message: "已完成" } : candidate
          ));
        } catch (err) {
          failedCount += 1;
          const message = err instanceof Error ? err.message : "排版处理失败";
          setQueuedFiles((current) => current.map((candidate) =>
            candidate.id === item.id ? { ...candidate, status: "failed", message } : candidate
          ));
        }
      }

      if (failedCount > 0) {
        setError(`${failedCount} 个文件处理失败，请查看队列中的失败原因。`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "排版处理失败");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <FileText size={24} aria-hidden="true" />
          <div className="brand-copy">
            <div className="brand-title">
              <h1>WordTidy</h1>
              <span className="brand-slogan">{PROJECT_SLOGAN}</span>
            </div>
            {mode === "ai" && (
              <span
                className={`status ${deepseekStatus === "connected" ? "is-ready" : ""} ${deepseekStatus === "failed" ? "is-error" : ""}`}
                title={deepseekStatusMessage}
              >
                {deepseekStatus === "checking"
                  ? "DeepSeek API 检测中"
                  : deepseekStatus === "connected"
                    ? "DeepSeek API 已连接"
                    : deepseekStatus === "failed"
                      ? "DeepSeek API 未连接"
                      : "DeepSeek API 待检测"}
              </span>
            )}
          </div>
        </div>
        {mode === "ai" && (
          <button
            className="icon-button"
            type="button"
            onClick={() => void checkDeepSeekConnection(false)}
            disabled={isTestingApiKey}
            title="刷新 DeepSeek API 状态"
          >
            {isTestingApiKey ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
          </button>
        )}
      </header>

      <form className="workspace" onSubmit={onSubmit}>
        <section className="panel controls-panel" aria-label="排版设置">
          <label
            className={isDragActive ? "dropzone is-drag-active" : "dropzone"}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={onDropFile}
          >
            <UploadCloud size={34} aria-hidden="true" />
            <span>{queuedFiles.length > 0 ? `已选择 ${queuedFiles.length} 个文件` : "选择 Word、Markdown 或 TXT 文件"}</span>
            <small>支持 .doc、.docx、.md、.txt，可多选或拖动多个文件到此处</small>
            <input type="file" multiple accept={DOCUMENT_FILE_ACCEPT} onChange={onFileChange} />
          </label>

          {queuedFiles.length > 0 && (
            <div className="file-queue" aria-label="待排版文件队列">
              <div className="file-queue-header">
                <span>排版队列</span>
                <small>{queuedFiles.length} 个文件</small>
              </div>
              {queuedFiles.map((item) => (
                <article className={`queue-file is-${item.status}`} key={item.id}>
                  <FileText size={18} aria-hidden="true" />
                  <span>
                    <strong>{item.file.name}</strong>
                    <small>{formatBytes(item.file.size)} · {queueStatusLabel(item.status)}</small>
                    {item.message && <small className={item.status === "failed" ? "queue-message is-error" : "queue-message"}>{item.message}</small>}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQueuedFile(item.id)}
                    disabled={isLoading}
                    aria-label={`删除 ${item.file.name}`}
                    title="删除文件"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          )}

          <div className="field-group">
            <span className="field-label">功能模式</span>
            <div className="segmented">
              <button
                type="button"
                className={mode === "standard" ? "is-active" : ""}
                onClick={() => {
                  setMode("standard");
                  if (rules?.formula.ai_enhanced_detection) {
                    updateRules((draft) => {
                      draft.formula.ai_enhanced_detection = false;
                    });
                  }
                }}
              >
                <Settings2 size={16} aria-hidden="true" />
                标准模式
              </button>
              <button
                type="button"
                className={mode === "ai" ? "is-active ai-mode-button" : "ai-mode-button"}
                onClick={() => setMode("ai")}
              >
                <span className="experiment-badge">实验功能</span>
                <Sparkles size={16} aria-hidden="true" />
                AI模式
              </button>
            </div>
          </div>

          {mode === "ai" && (
            <div className="ai-config">
              <label className="text-field">
                <span>DeepSeek API key</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={deepseekApiKey}
                  onChange={(event) => {
                    setDeepseekApiKey(event.target.value);
                    setApiKeyTestMessage("");
                    setApiKeyTestOk(null);
                    setDeepseekStatus("idle");
                    setDeepseekStatusMessage("");
                  }}
                  placeholder="不填写则使用后端环境变量"
                />
              </label>
              <button className="secondary-action" type="button" onClick={testDeepSeekApiKey} disabled={isTestingApiKey}>
                {isTestingApiKey ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                测试连接
              </button>
              {apiKeyTestMessage && (
                <p className={apiKeyTestOk ? "inline-status is-ok" : "inline-status is-error"}>{apiKeyTestMessage}</p>
              )}
            </div>
          )}

          <div className="field-group">
            <span className="field-label">输出</span>
            <div className="segmented">
              <button
                type="button"
                className={outputFormat === "docx" ? "is-active" : ""}
                onClick={() => setOutputFormat("docx")}
              >
                DOCX
              </button>
              <button
                type="button"
                className={outputFormat === "pdf" ? "is-active" : ""}
                onClick={() => setOutputFormat("pdf")}
              >
                PDF
              </button>
            </div>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={insertDirectories}
              onChange={(event) => setInsertDirectories(event.target.checked)}
            />
            <span>插入目录、图目录、表目录字段</span>
          </label>

          <button className="primary-button" type="submit" disabled={!canSubmit}>
            {isLoading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
            {isLoading ? "队列排版中" : `开始队列排版${queuedFiles.length > 0 ? `（${queuedFiles.length}）` : ""}`}
          </button>

          <div className="project-meta">
            <div className="project-meta-header">
              <span>
                <strong>WordTidy</strong>
                <small>v{APP_VERSION}</small>
              </span>
              <button type="button" onClick={checkForUpdates} disabled={isCheckingUpdate}>
                {isCheckingUpdate ? <Loader2 className="spin" size={14} aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
                检查更新
              </button>
            </div>
            {updateMessage && <p className="meta-status">{updateMessage}</p>}
            <p className="project-about">关于：{PROJECT_SLOGAN}</p>
            <div className="meta-links">
              <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
                <Github size={15} aria-hidden="true" />
                项目地址
                <ExternalLink size={13} aria-hidden="true" />
              </a>
              <button type="button" onClick={() => setIsSponsorOpen(true)}>
                <HeartHandshake size={15} aria-hidden="true" />
                赞助作者
              </button>
            </div>
            <a className="contact-card" href={`mailto:${CONTACT_EMAIL}`}>
              <Mail size={16} aria-hidden="true" />
              <span>
                <strong>联系作者</strong>
                <small>{CONTACT_EMAIL}</small>
              </span>
            </a>
            <p className="copyright">Copyright © 2026 vluckyzhang. Released under the MIT License.</p>
          </div>

          {downloads.length > 0 && (
            <div className="download-list" aria-label="排版结果下载">
              <div className="download-list-header">
                <span>排版结果</span>
                <small>{downloads.length} 个文件已完成</small>
              </div>
              {downloads.map((download) => (
                <a className="download-card" href={download.url} download={download.fileName} key={`${download.id}-${download.fileName}`}>
                  <CheckCircle2 size={20} aria-hidden="true" />
                  <span>
                    <strong>{download.fileName}</strong>
                    <small>{download.originalName} · {formatBytes(download.size)}</small>
                    {download.warnings.length > 0 && <small>{download.warnings.length} 条提示</small>}
                  </span>
                  <Download size={18} aria-hidden="true" />
                </a>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="notice">
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          {error && <p className="error-box">{error}</p>}
        </section>

        <section className="rules-panel" aria-label="排版规则">
          <div className="rules-toolbar">
            <div>
              <h2>排版规则</h2>
              <span className="rules-subtitle">当前规则会直接用于本次排版</span>
            </div>
            <div className="toolbar-actions">
              <label className="secondary-button">
                <FileJson size={16} aria-hidden="true" />
                导入
                <input type="file" accept=".json,application/json" onChange={onRulesFileChange} />
              </label>
              <button type="button" onClick={saveRulesJson} disabled={!rules}>
                <Save size={16} aria-hidden="true" />
                保存
              </button>
              <button type="button" onClick={restoreDefaultRules} disabled={!defaultRules}>
                <RotateCcw size={16} aria-hidden="true" />
                还原
              </button>
            </div>
          </div>

          <div className="rule-tabs" role="tablist" aria-label="规则视图">
            <button
              type="button"
              className={activeTab === "preview" ? "is-active" : ""}
              onClick={() => setActiveTab("preview")}
            >
              <Eye size={16} aria-hidden="true" />
              预览
            </button>
            <button
              type="button"
              className={activeTab === "settings" ? "is-active" : ""}
              onClick={() => setActiveTab("settings")}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              手动设置
            </button>
            <button
              type="button"
              className={activeTab === "json" ? "is-active" : ""}
              onClick={() => setActiveTab("json")}
            >
              <Code2 size={16} aria-hidden="true" />
              高级 JSON
            </button>
          </div>

          {!rules && <div className="empty-state">规则加载中</div>}

          {rules && activeTab === "preview" && <RulesPreview rules={rules} />}

          {rules && activeTab === "settings" && (
            <div className="settings-layout">
              <nav className="category-menu" aria-label="规则分类">
                {categoryItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={activeCategory === item.key ? "is-active" : ""}
                      onClick={() => setActiveCategory(item.key)}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="settings-content">
                {renderSettingsContent(rules, activeCategory, updateRules, mode, {
                  fonts: installedFonts,
                  fontsLoaded,
                  isLoadingFonts,
                  onLoadFonts: loadInstalledFonts
                })}
              </div>
            </div>
          )}

          {rules && activeTab === "json" && (
            <div className="json-panel">
              <div className="json-actions">
                <button type="button" onClick={formatJsonRules}>
                  格式化
                </button>
                <button type="button" onClick={applyJsonRules}>
                  应用 JSON
                </button>
              </div>
              <textarea
                spellCheck={false}
                value={rulesText}
                onChange={(event) => setRulesText(event.target.value)}
                aria-label="排版规则 JSON"
              />
            </div>
          )}
        </section>
      </form>

      {isSponsorOpen && <SponsorModal onClose={() => setIsSponsorOpen(false)} />}
    </main>
  );
}

function SponsorModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="sponsor-modal" role="dialog" aria-modal="true" aria-labelledby="sponsor-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="关闭赞助窗口">
          <X size={18} aria-hidden="true" />
        </button>
        <div className="sponsor-hero">
          <span className="sponsor-mark">
            <HeartHandshake size={24} aria-hidden="true" />
          </span>
          <div>
            <h2 id="sponsor-title">赞助作者</h2>
            <p>如果 WordTidy 对你的论文、报告或批量排版工作有帮助，可以请作者喝杯咖啡。</p>
          </div>
        </div>
        <div className="sponsor-grid">
          {sponsorAssets.map((item) => (
            <article className="qr-card" key={item.label}>
              <img src={item.src} alt={item.label} />
              <h3>{item.label}</h3>
              <p>扫码支持项目维护</p>
            </article>
          ))}
        </div>
        <div className="sponsor-footer">
          <Info size={16} aria-hidden="true" />
          <span>扫码后请核对收款人信息；感谢支持 WordTidy 持续维护。</span>
        </div>
      </section>
    </div>
  );
}

function RulesPreview({ rules }: { rules: FormattingRules }) {
  const items = [
    {
      title: "页面",
      rows: [
        `纸张 ${rules.page.size}`,
        `页边距：上 ${rules.page.top_cm}cm、下 ${rules.page.bottom_cm}cm、左 ${rules.page.left_cm}cm、右 ${rules.page.right_cm}cm`,
        `页眉 ${rules.page.header_cm}cm，页脚 ${rules.page.footer_cm}cm`
      ]
    },
    {
      title: "正文",
      rows: [
        fontSummary(rules.body),
        `段前 ${rules.body.space_before_pt}pt，段后 ${rules.body.space_after_pt}pt，${lineSpacingSummary(rules.body)}`,
        `首行缩进 ${rules.body.first_line_indent_chars} 字符，${alignmentLabel(rules.body.alignment)}`
      ]
    },
    {
      title: "标题",
      rows: activeHeadingEntries(rules).map(
        ([level, rule]) => `${headingLevelLabel(level)}：${fontSummary(rule)}，${lineSpacingSummary(rule)}，${alignmentLabel(rule.alignment)}`
      )
    },
    {
      title: "题注",
      rows: [
        `图题、表题位于图表上方`,
        fontSummary(rules.caption),
        `段前 ${rules.caption.space_before_pt}pt，段后 ${rules.caption.space_after_pt}pt，${lineSpacingSummary(rules.caption)}，${alignmentLabel(rules.caption.alignment)}`
      ]
    },
    {
      title: "目录",
      rows: [
        `显示级别：${rules.directory.enabled_levels.map((level) => `${level}级`).join("、")}`,
        `目录标题：${fontSummary(rules.directory.title)}，居中`,
        `一级 ${rules.directory.level1.indent_chars} 字符缩进，二级 ${rules.directory.level2.indent_chars} 字符缩进，三级 ${rules.directory.level3.indent_chars} 字符缩进`
      ]
    },
    {
      title: "公式",
      rows: [
        rules.formula.enabled ? `${rules.formula.format === "professional" ? "专用" : "线性"}格式，${rules.formula.ai_enhanced_detection ? "AI增强识别" : "基础识别"}` : "未启用",
        `字体 ${rules.formula.font}，${rules.formula.size_pt}pt，${alignmentLabel(rules.formula.alignment)}`,
        rules.formula.strip_delimiters ? "去除 $$ / \\( \\) 分隔符" : "保留公式分隔符"
      ]
    },
    {
      title: "图表",
      rows: [
        `表格：三线表，粗线 ${rules.table.thick_border_pt}pt，细线 ${rules.table.thin_border_pt}pt，宽度 ${rules.table.width_percent}%`,
        "处理表格前清除原有表格格式",
        `表格文字：${fontSummary(rules.table)}，${alignmentLabel(rules.table.cell_alignment)}，${lineSpacingSummary(rules.table)}`,
        `图片：${alignmentLabel(rules.image.alignment)}，${lineSpacingSummary(rules.image)}，段前 ${rules.image.space_before_pt}pt，段后 ${rules.image.space_after_pt}pt`
      ]
    },
    {
      title: "页码",
      rows: [
        `目录页码：罗马数字，正文页码：阿拉伯数字，从 ${rules.page_number.restart_body_at} 开始`,
        `${fontSummary(rules.page_number)}，${alignmentLabel(rules.page_number.alignment)}`,
        rules.update_fields_on_open ? "打开文档时请求更新域" : "不主动请求打开时更新域"
      ]
    }
  ];

  return (
    <div className="preview-grid">
      {items.map((item) => (
        <article className="preview-card" key={item.title}>
          <h3>{item.title}</h3>
          <ul>
            {item.rows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function renderSettingsContent(
  rules: FormattingRules,
  activeCategory: RuleCategory,
  updateRules: (mutator: (draft: FormattingRules) => void) => void,
  mode: Mode,
  fontLoader: FontLoaderState
) {
  if (activeCategory === "page") {
    return (
      <div className="settings-stack">
        <section className="settings-card">
          <h3>页面设置</h3>
          <div className="form-grid">
            <NumberField label="上边距" value={rules.page.top_cm} min={0} step={0.1} unit="cm" onChange={(value) => updateRules((draft) => { draft.page.top_cm = value; })} />
            <NumberField label="下边距" value={rules.page.bottom_cm} min={0} step={0.1} unit="cm" onChange={(value) => updateRules((draft) => { draft.page.bottom_cm = value; })} />
            <NumberField label="左边距" value={rules.page.left_cm} min={0} step={0.1} unit="cm" onChange={(value) => updateRules((draft) => { draft.page.left_cm = value; })} />
            <NumberField label="右边距" value={rules.page.right_cm} min={0} step={0.1} unit="cm" onChange={(value) => updateRules((draft) => { draft.page.right_cm = value; })} />
            <NumberField label="页眉距离" value={rules.page.header_cm} min={0} step={0.1} unit="cm" onChange={(value) => updateRules((draft) => { draft.page.header_cm = value; })} />
            <NumberField label="页脚距离" value={rules.page.footer_cm} min={0} step={0.1} unit="cm" onChange={(value) => updateRules((draft) => { draft.page.footer_cm = value; })} />
          </div>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={rules.update_fields_on_open}
              onChange={(event) => updateRules((draft) => { draft.update_fields_on_open = event.target.checked; })}
            />
            <span>打开文档时请求更新目录和页码域</span>
          </label>
        </section>
      </div>
    );
  }

  if (activeCategory === "body") {
    return (
      <ParagraphEditor
        title="正文"
        rule={rules.body}
        fontLoader={fontLoader}
        onChange={(patch) => updateRules((draft) => { draft.body = { ...draft.body, ...patch }; })}
      />
    );
  }

  if (activeCategory === "headings") {
    return (
      <HeadingEditorList rules={rules} updateRules={updateRules} fontLoader={fontLoader} />
    );
  }

  if (activeCategory === "caption") {
    return (
      <ParagraphEditor
        title="题注"
        rule={rules.caption}
        fontLoader={fontLoader}
        onChange={(patch) => updateRules((draft) => { draft.caption = { ...draft.caption, ...patch }; })}
      />
    );
  }

  if (activeCategory === "directory") {
    return (
      <div className="settings-stack">
        <section className="settings-card">
          <h3>目录范围</h3>
          <div className="check-grid">
            {[1, 2, 3].map((level) => (
              <label className="check-row" key={level}>
                <input
                  type="checkbox"
                  checked={rules.directory.enabled_levels.includes(level)}
                  onChange={(event) =>
                    updateRules((draft) => {
                      const selected = new Set(draft.directory.enabled_levels);
                      if (event.target.checked) {
                        selected.add(level);
                      } else {
                        selected.delete(level);
                      }
                      draft.directory.enabled_levels = Array.from(selected).sort((a, b) => a - b);
                    })
                  }
                />
                <span>{level}级大纲</span>
              </label>
            ))}
          </div>
        </section>
        <FontEditor title="目录标题" rule={rules.directory.title} fontLoader={fontLoader} onChange={(patch) => updateRules((draft) => { draft.directory.title = { ...draft.directory.title, ...patch }; })} />
        <DirectoryLevelEditor title="一级目录" rule={rules.directory.level1} fontLoader={fontLoader} onChange={(patch) => updateRules((draft) => { draft.directory.level1 = { ...draft.directory.level1, ...patch }; })} />
        <DirectoryLevelEditor title="二级目录" rule={rules.directory.level2} fontLoader={fontLoader} onChange={(patch) => updateRules((draft) => { draft.directory.level2 = { ...draft.directory.level2, ...patch }; })} />
        <DirectoryLevelEditor title="三级目录" rule={rules.directory.level3} fontLoader={fontLoader} onChange={(patch) => updateRules((draft) => { draft.directory.level3 = { ...draft.directory.level3, ...patch }; })} />
      </div>
    );
  }

  if (activeCategory === "formula") {
    return <FormulaSettings rules={rules} updateRules={updateRules} mode={mode} fontLoader={fontLoader} />;
  }

  if (activeCategory === "visuals") {
    return (
      <div className="settings-stack">
        <section className="settings-card">
          <h3>表格</h3>
          <FontControls rule={rules.table} fontLoader={fontLoader} onChange={(patch) => updateRules((draft) => { draft.table = { ...draft.table, ...patch }; })} />
          <div className="form-grid">
            <NumberField label="表格宽度" value={rules.table.width_percent} min={1} max={100} step={1} unit="%" onChange={(value) => updateRules((draft) => { draft.table.width_percent = value; })} />
            <NumberField label="粗线" value={rules.table.thick_border_pt} min={0.25} step={0.25} unit="pt" onChange={(value) => updateRules((draft) => { draft.table.thick_border_pt = value; })} />
            <NumberField label="细线" value={rules.table.thin_border_pt} min={0.25} step={0.25} unit="pt" onChange={(value) => updateRules((draft) => { draft.table.thin_border_pt = value; })} />
            <SelectField label="单元格对齐" value={rules.table.cell_alignment} options={alignmentOptions} onChange={(value) => updateRules((draft) => { draft.table.cell_alignment = value; })} />
            <LineSpacingFields rule={rules.table} onChange={(patch) => updateRules((draft) => { draft.table = { ...draft.table, ...patch }; })} />
          </div>
        </section>
        <section className="settings-card">
          <h3>图片</h3>
          <div className="form-grid">
            <SelectField label="对齐方式" value={rules.image.alignment} options={alignmentOptions} onChange={(value) => updateRules((draft) => { draft.image.alignment = value; })} />
            <NumberField label="段前" value={rules.image.space_before_pt} min={0} step={0.5} unit="pt" onChange={(value) => updateRules((draft) => { draft.image.space_before_pt = value; })} />
            <NumberField label="段后" value={rules.image.space_after_pt} min={0} step={0.5} unit="pt" onChange={(value) => updateRules((draft) => { draft.image.space_after_pt = value; })} />
            <LineSpacingFields rule={rules.image} onChange={(patch) => updateRules((draft) => { draft.image = { ...draft.image, ...patch }; })} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="settings-stack">
      <section className="settings-card">
        <h3>页码</h3>
        <FontControls rule={rules.page_number} fontLoader={fontLoader} onChange={(patch) => updateRules((draft) => { draft.page_number = { ...draft.page_number, ...patch }; })} />
        <div className="form-grid">
          <SelectField label="对齐方式" value={rules.page_number.alignment} options={alignmentOptions} onChange={(value) => updateRules((draft) => { draft.page_number.alignment = value; })} />
          <NumberField label="正文起始页码" value={rules.page_number.restart_body_at} min={1} step={1} onChange={(value) => updateRules((draft) => { draft.page_number.restart_body_at = Math.max(1, Math.round(value)); })} />
        </div>
      </section>
    </div>
  );
}

function HeadingEditorList({
  rules,
  updateRules,
  fontLoader
}: {
  rules: FormattingRules;
  updateRules: (mutator: (draft: FormattingRules) => void) => void;
  fontLoader: FontLoaderState;
}) {
  const entries = activeHeadingEntries(rules);
  const missingLevels = [2, 3, 4, 5, 6, 7, 8].filter((level) => !getHeadingRule(rules, level));

  return (
    <div className="settings-stack">
      {entries.map(([level, rule]) => (
        <ParagraphEditor
          key={level}
          title={headingLevelLabel(level)}
          rule={rule}
          fontLoader={fontLoader}
          extraAction={
            level >= 2 ? (
              <button
                className="text-button"
                type="button"
                onClick={() =>
                  updateRules((draft) => {
                    setHeadingRule(draft, level, null);
                  })
                }
              >
                移除
              </button>
            ) : null
          }
          onChange={(patch) =>
            updateRules((draft) => {
              const current = getHeadingRule(draft, level) ?? draft.headings.level3 ?? draft.headings.level1;
              setHeadingRule(draft, level, { ...current, ...patch });
            })
          }
        />
      ))}

      {missingLevels.length > 0 && (
        <section className="settings-card">
          <h3>增加标题级别</h3>
          <div className="button-grid">
            {missingLevels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() =>
                  updateRules((draft) => {
                    setHeadingRule(draft, level, cloneRules(draft.headings.level3 ?? rules.headings.level3 ?? rules.headings.level1));
                  })
                }
              >
                添加{headingLevelLabel(level)}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FormulaSettings({
  rules,
  updateRules,
  mode,
  fontLoader
}: {
  rules: FormattingRules;
  updateRules: (mutator: (draft: FormattingRules) => void) => void;
  mode: Mode;
  fontLoader: FontLoaderState;
}) {
  const aiAvailable = mode === "ai";
  return (
    <div className="settings-stack">
      <section className="settings-card">
        <div className="card-title-row">
          <h3>公式</h3>
          <span className="section-badge">实验功能</span>
        </div>
        <div className="check-grid">
          <label className="check-row">
            <input
              type="checkbox"
              checked={rules.formula.enabled}
              onChange={(event) => updateRules((draft) => { draft.formula.enabled = event.target.checked; })}
            />
            <span>识别未排版公式</span>
          </label>
          <label className={aiAvailable ? "check-row" : "check-row is-disabled"}>
            <input
              type="checkbox"
              checked={aiAvailable && rules.formula.ai_enhanced_detection}
              disabled={!aiAvailable}
              onChange={(event) => updateRules((draft) => { draft.formula.ai_enhanced_detection = event.target.checked; })}
            />
            <span>AI增强识别功能</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={rules.formula.strip_delimiters}
              onChange={(event) => updateRules((draft) => { draft.formula.strip_delimiters = event.target.checked; })}
            />
            <span>去除 $$ / \\( \\) 分隔符</span>
          </label>
        </div>
        {!aiAvailable && <p className="hint-text">AI增强识别功能仅在左侧选择“AI模式”后可用。</p>}
        <div className="form-grid">
          <SelectField label="公式格式" value={rules.formula.format} options={formulaFormatOptions} onChange={(value) => updateRules((draft) => { draft.formula.format = value; })} />
          <FontField
            label="公式字体"
            value={rules.formula.font}
            onChange={(value) => updateRules((draft) => { draft.formula.font = value; })}
            {...fontLoader}
          />
          <FontSizeField value={rules.formula.size_pt} onChange={(value) => updateRules((draft) => { draft.formula.size_pt = value; })} />
          <SelectField label="对齐方式" value={rules.formula.alignment} options={alignmentOptions} onChange={(value) => updateRules((draft) => { draft.formula.alignment = value; })} />
        </div>
      </section>
    </div>
  );
}

function ParagraphEditor({
  title,
  rule,
  onChange,
  extraAction,
  fontLoader
}: {
  title: string;
  rule: ParagraphRule;
  onChange: (patch: Partial<ParagraphRule>) => void;
  extraAction?: ReactNode;
  fontLoader: FontLoaderState;
}) {
  return (
    <section className="settings-card">
      <div className="card-title-row">
        <h3>{title}</h3>
        {extraAction}
      </div>
      <FontControls rule={rule} fontLoader={fontLoader} onChange={onChange} />
      <div className="form-grid">
        <NumberField label="段前" value={rule.space_before_pt} min={0} step={0.5} unit="pt" onChange={(value) => onChange({ space_before_pt: value })} />
        <NumberField label="段后" value={rule.space_after_pt} min={0} step={0.5} unit="pt" onChange={(value) => onChange({ space_after_pt: value })} />
        <LineSpacingFields rule={rule} onChange={onChange} />
        <SelectField label="对齐方式" value={rule.alignment} options={alignmentOptions} onChange={(value) => onChange({ alignment: value })} />
        <NumberField label="首行缩进" value={rule.first_line_indent_chars} min={0} step={0.5} unit="字符" onChange={(value) => onChange({ first_line_indent_chars: value })} />
      </div>
    </section>
  );
}

function DirectoryLevelEditor({
  title,
  rule,
  onChange,
  fontLoader
}: {
  title: string;
  rule: DirectoryLevelRule;
  onChange: (patch: Partial<DirectoryLevelRule>) => void;
  fontLoader: FontLoaderState;
}) {
  return (
    <section className="settings-card">
      <h3>{title}</h3>
      <FontControls rule={rule} fontLoader={fontLoader} onChange={onChange} />
      <div className="form-grid">
        <NumberField label="缩进" value={rule.indent_chars} min={0} step={0.5} unit="字符" onChange={(value) => onChange({ indent_chars: value })} />
        <SelectField label="对齐方式" value={rule.alignment} options={alignmentOptions} onChange={(value) => onChange({ alignment: value })} />
      </div>
    </section>
  );
}

function FontEditor({
  title,
  rule,
  onChange,
  fontLoader
}: {
  title: string;
  rule: FontRule;
  onChange: (patch: Partial<FontRule>) => void;
  fontLoader: FontLoaderState;
}) {
  return (
    <section className="settings-card">
      <h3>{title}</h3>
      <FontControls rule={rule} fontLoader={fontLoader} onChange={onChange} />
    </section>
  );
}

function FontControls({
  rule,
  onChange,
  fontLoader
}: {
  rule: FontRule;
  onChange: (patch: Partial<FontRule>) => void;
  fontLoader: FontLoaderState;
}) {
  return (
    <>
      <div className="form-grid">
        <FontField label="中文字体" value={rule.east_asia} onChange={(value) => onChange({ east_asia: value })} {...fontLoader} />
        <FontField label="英文数字字体" value={rule.ascii} onChange={(value) => onChange({ ascii: value })} {...fontLoader} />
        <FontSizeField value={rule.size_pt} onChange={(value) => onChange({ size_pt: value })} />
      </div>
      <div className="toggle-group">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={rule.bold}
            disabled={rule.preserve_emphasis}
            onChange={(event) => onChange({ bold: event.target.checked })}
          />
          <span>加粗</span>
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={rule.italic}
            disabled={rule.preserve_emphasis}
            onChange={(event) => onChange({ italic: event.target.checked })}
          />
          <span>斜体</span>
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={rule.preserve_emphasis}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? { preserve_emphasis: true, bold: false, italic: false }
                  : { preserve_emphasis: false }
              )
            }
          />
          <span>不改变原文加粗/斜体样式</span>
        </label>
      </div>
    </>
  );
}

function FontField({
  label,
  value,
  onChange,
  fonts,
  fontsLoaded,
  isLoadingFonts,
  onLoadFonts
}: FontFieldProps) {
  const generatedId = useId();
  const listId = `font-list-${generatedId.replace(/:/g, "")}`;
  const status = isLoadingFonts ? "读取中" : fontsLoaded ? `${fonts.length} 款` : "点击读取";

  return (
    <label className="text-field">
      <span>{label}</span>
      <div className="font-field">
        <input
          value={value}
          list={fontsLoaded ? listId : undefined}
          onFocus={onLoadFonts}
          onClick={onLoadFonts}
          onChange={(event) => onChange(event.target.value)}
        />
        <small>{status}</small>
        {fontsLoaded && (
          <datalist id={listId}>
            {fonts.map((font) => (
              <option key={font} value={font} />
            ))}
          </datalist>
        )}
      </div>
    </label>
  );
}

function FontSizeField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [unit, setUnit] = useState<FontSizeUnit>("pt");
  const selectedWordSize = wordSizeLabelForPt(value) ?? nearestWordSize(value).label;

  return (
    <label className="text-field">
      <span>字号</span>
      <div className="size-control">
        <select
          value={unit}
          onChange={(event) => {
            const nextUnit = event.target.value as FontSizeUnit;
            setUnit(nextUnit);
            if (nextUnit === "word") {
              onChange(nearestWordSize(value).pt);
            }
          }}
          aria-label="字号单位"
        >
          <option value="pt">pt</option>
          <option value="word">Word 字号</option>
        </select>
        {unit === "pt" ? (
          <div className="number-input">
            <input
              type="number"
              value={Number.isFinite(value) ? value : 12}
              min={0.5}
              max={50}
              step={0.5}
              onChange={(event) => onChange(clampStep(parseNumber(event.target.value, value), 0.5, 50, 0.5))}
            />
            <small>pt</small>
          </div>
        ) : (
          <select
            value={selectedWordSize}
            onChange={(event) => {
              const option = wordFontSizes.find((item) => item.label === event.target.value);
              if (option) {
                onChange(option.pt);
              }
            }}
            aria-label="Word 字号"
          >
            {wordFontSizes.map((item) => (
              <option key={item.label} value={item.label}>
                {item.label}（{item.pt}pt）
              </option>
            ))}
          </select>
        )}
      </div>
    </label>
  );
}

function LineSpacingFields({
  rule,
  onChange
}: {
  rule: { line_spacing_type: LineSpacingType; line_spacing_value: number };
  onChange: (patch: { line_spacing_type?: LineSpacingType; line_spacing_value?: number }) => void;
}) {
  const fixed = fixedLineSpacingValue(rule);
  const isValueLocked = rule.line_spacing_type === "single" || rule.line_spacing_type === "one_point_five" || rule.line_spacing_type === "double";
  const valueUnit = rule.line_spacing_type === "fixed" ? "pt" : "倍";

  return (
    <>
      <SelectField
        label="行距类型"
        value={rule.line_spacing_type}
        options={lineSpacingOptions}
        onChange={(value) => onChange({ line_spacing_type: value, line_spacing_value: defaultLineSpacingValue(value, rule.line_spacing_value) })}
      />
      <NumberField
        label="行距值"
        value={fixed}
        min={rule.line_spacing_type === "fixed" ? 0.5 : 0.1}
        max={rule.line_spacing_type === "fixed" ? 50 : undefined}
        step={rule.line_spacing_type === "fixed" ? 0.5 : 0.1}
        unit={valueUnit}
        disabled={isValueLocked}
        onChange={(value) =>
          onChange({
            line_spacing_value:
              rule.line_spacing_type === "fixed" ? clampStep(value, 0.5, 50, 0.5) : Math.max(0.1, value)
          })
        }
      />
    </>
  );
}

function NumberField({ label, value, min, max, step = 1, unit, disabled = false, onChange }: NumberFieldProps) {
  return (
    <label className="text-field">
      <span>{label}</span>
      <div className="number-input">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => onChange(parseNumber(event.target.value, value))}
        />
        {unit && <small>{unit}</small>}
      </div>
    </label>
  );
}

function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <label className="text-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") {
      return body.detail;
    }
    return JSON.stringify(body.detail ?? body, null, 2);
  } catch {
    return `请求失败：${response.status}`;
  }
}

function parseWarnings(value: string | null): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [value];
  }
}

function getDownloadFileName(response: Response, originalName: string, outputFormat: OutputFormat) {
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename\*=UTF-8''([^;]+)/);
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }
  const stem = originalName.replace(/\.[^.]+$/, "");
  return `已排版_${stem}.${outputFormat}`;
}

function isAllowedDocumentFile(file: File) {
  return ALLOWED_DOCUMENT_EXTENSIONS.has(getFileExtension(file.name));
}

function getFileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

function fileIdentity(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function createQueuedFile(file: File): QueuedFile {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return {
    id: `${fileIdentity(file)}-${randomPart}`,
    file,
    status: "pending"
  };
}

function queueStatusLabel(status: QueueFileStatus) {
  if (status === "processing") {
    return "处理中";
  }
  if (status === "done") {
    return "已完成";
  }
  if (status === "failed") {
    return "失败";
  }
  return "等待中";
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function compareVersions(left: string, right: string) {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function cloneRules<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeRules(value: unknown, defaults: FormattingRules | null): FormattingRules {
  if (!isPlainObject(value)) {
    throw new Error("规则 JSON 顶层必须是对象");
  }
  if (!defaults) {
    return value as FormattingRules;
  }
  const merged = cloneRules(defaults);
  deepMerge(merged as unknown as Record<string, unknown>, value);
  return merged;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>) {
  Object.entries(source).forEach(([key, value]) => {
    const current = target[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      deepMerge(current, value);
      return;
    }
    target[key] = value;
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampStep(value: number, min: number, max: number, step: number) {
  const clamped = Math.min(max, Math.max(min, value));
  return Math.round(clamped / step) * step;
}

function wordSizeLabelForPt(value: number) {
  return wordFontSizes.find((item) => item.pt === value)?.label;
}

function nearestWordSize(value: number) {
  return wordFontSizes.reduce((nearest, item) =>
    Math.abs(item.pt - value) < Math.abs(nearest.pt - value) ? item : nearest
  );
}

function activeHeadingEntries(rules: FormattingRules): Array<[number, ParagraphRule]> {
  const entries: Array<[number, ParagraphRule]> = [];
  for (let level = 1; level <= 8; level += 1) {
    const rule = getHeadingRule(rules, level);
    if (rule) {
      entries.push([level, rule]);
    }
  }
  return entries;
}

function getHeadingRule(rules: FormattingRules, level: number): ParagraphRule | null {
  return rules.headings[`level${level}` as keyof FormattingRules["headings"]] ?? null;
}

function setHeadingRule(rules: FormattingRules, level: number, rule: ParagraphRule | null) {
  const key = `level${level}` as keyof FormattingRules["headings"];
  rules.headings[key] = rule as never;
}

function headingLevelLabel(level: number) {
  return ["", "一级标题", "二级标题", "三级标题", "四级标题", "五级标题", "六级标题", "七级标题", "八级标题"][level] ?? `${level}级标题`;
}

function defaultLineSpacingValue(type: LineSpacingType, current: number) {
  if (type === "single") {
    return 1;
  }
  if (type === "one_point_five") {
    return 1.5;
  }
  if (type === "double") {
    return 2;
  }
  if (type === "fixed") {
    return 22;
  }
  return current > 0 && current <= 5 ? current : 1.15;
}

function fixedLineSpacingValue(rule: { line_spacing_type: LineSpacingType; line_spacing_value: number }) {
  if (rule.line_spacing_type === "single") {
    return 1;
  }
  if (rule.line_spacing_type === "one_point_five") {
    return 1.5;
  }
  if (rule.line_spacing_type === "double") {
    return 2;
  }
  return rule.line_spacing_value;
}

function alignmentLabel(value: Alignment) {
  return alignmentOptions.find((option) => option.value === value)?.label ?? value;
}

function lineSpacingSummary(rule: { line_spacing_type: LineSpacingType; line_spacing_value: number }) {
  if (rule.line_spacing_type === "fixed") {
    return `固定行距 ${rule.line_spacing_value}pt`;
  }
  if (rule.line_spacing_type === "single") {
    return "单倍行距";
  }
  if (rule.line_spacing_type === "one_point_five") {
    return "1.5倍行距";
  }
  if (rule.line_spacing_type === "double") {
    return "2倍行距";
  }
  return `${rule.line_spacing_value} 倍行距`;
}

function fontSummary(rule: FontRule) {
  const emphasis = rule.preserve_emphasis
    ? "，保留原文加粗/斜体"
    : `${rule.bold ? "，加粗" : ""}${rule.italic ? "，斜体" : ""}`;
  return `中文 ${rule.east_asia}，英文数字 ${rule.ascii}，${rule.size_pt}pt${emphasis}`;
}

function formatDateForFileName(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export default App;
