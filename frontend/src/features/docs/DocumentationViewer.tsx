import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  FileText,
  Shield,
  Palette,
  Layers,
  X,
  Search,
  Eye,
  Code2,
  LoaderCircle,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';

type DocKey = 'SRS' | 'SECURITY' | 'UI' | 'DIAGRAMS';

interface DocMeta {
  path: string;
  name: string;
  title: string;
  icon: LucideIcon;
}

interface DocumentationViewerProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerSignalR: (
    title: string,
    message: string,
    severity: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
}

const DOC_FILES: Record<DocKey, DocMeta> = {
  SRS: {
    path: '/SRS.md',
    name: 'SRS.md',
    title: 'Texnik Topshiriq (SRS)',
    icon: FileText,
  },
  SECURITY: {
    path: '/SECURITY_RBAC.md',
    name: 'SECURITY_RBAC.md',
    title: 'Xavfsizlik & Qatʻiy RBAC',
    icon: Shield,
  },
  UI: {
    path: '/UI_DESIGN_SYSTEM.md',
    name: 'UI_DESIGN_SYSTEM.md',
    title: 'macOS UI/UX Dizayn Tizimi',
    icon: Palette,
  },
  DIAGRAMS: {
    path: '/DIAGRAMS.md',
    name: 'DIAGRAMS.md',
    title: 'Tizim Diagrammalari (Alohida)',
    icon: Layers,
  },
};

export const DocumentationViewer: React.FC<DocumentationViewerProps> = ({
  isOpen,
  onClose,
  onTriggerSignalR,
}) => {
  const [activeDoc, setActiveDoc] = useState<DocKey>('SRS');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load markdown document safely
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const file = DOC_FILES[activeDoc];

    setLoading(true);
    setLoadError(null);

    fetch(file.path, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Hujjat topilmadi (HTTP ${res.status})`);
        }
        const text = await res.text();
        const trimmed = text.trim();
        if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
          throw new Error(`${file.name} fayli public/ papkasida mavjud emas.`);
        }
        setContent(text);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const msg =
          err instanceof Error ? err.message : 'Faylni yuklashda kutilmagan xatolik yuz berdi.';
        setLoadError(msg);
        setContent('');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [activeDoc, isOpen]);

  const matchCount = useMemo(() => {
    const q = searchQuery.trim();
    if (!q || !content) return 0;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = content.match(new RegExp(escaped, 'gi'));
    return matches ? matches.length : 0;
  }, [content, searchQuery]);

  const docStats = useMemo(() => {
    if (!content) return { lines: 0, words: 0 };
    const lines = content.split('\n').length;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    return { lines, words };
  }, [content]);

  if (!isOpen) return null;

  const currentFile = DOC_FILES[activeDoc];

  const handleDownload = () => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onTriggerSignalR('Fayl Yuklandi', `${currentFile.name} muvaffaqiyatli saqlandi`, 'success');
  };

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onTriggerSignalR('Nusxa Olindi', `${currentFile.name} xotiraga nusxalandi`, 'info');
    } catch {
      onTriggerSignalR('Xatolik', 'Matnni nusxalab boʻlmadi', 'warning');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-6 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="DentaCore Hujjatlar Kutubxonasi"
    >
      <div className="mac-glass rounded-3xl max-w-5xl w-full h-[92vh] flex flex-col bg-white/85 backdrop-blur-2xl border border-white/85 shadow-2xl shadow-slate-950/25 overflow-hidden">
        {/* macOS Window Chrome Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-2 bg-white/60 select-none">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={onClose}
                title="Yopish (Esc)"
                aria-label="Yopish"
                className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:brightness-90 transition-all cursor-pointer"
              />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>
            <div className="h-4 w-px bg-slate-300/80 hidden sm:block" />
            <span className="font-extrabold text-xs text-slate-800 tracking-tight truncate">
              DentaCore — Tizim Arxitekturasi va Hujjatlar Kutubxonasi
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!content || loading}
              className="px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white text-slate-700 text-xs font-semibold border border-slate-200/80 shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Nusxalandi' : 'Nusxa Olish'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!content || loading}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentFile.name} Yuklab Olish</span>
              <span className="sm:hidden">.md</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Oynani yopish"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Selector Segmented Tabs + Search + Mode Switch */}
        <div className="px-4 py-2.5 border-b border-slate-200/60 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70">
          <div className="flex items-center overflow-x-auto max-w-full p-1 rounded-2xl bg-slate-200/65 backdrop-blur-md border border-white/70">
            {(Object.keys(DOC_FILES) as DocKey[]).map((key) => {
              const item = DOC_FILES[key];
              const Icon = item.icon;
              const isActive = activeDoc === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveDoc(key)}
                  className={`flex shrink-0 items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-600' : 'text-slate-500'}`} />
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            {/* Search within document */}
            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hujjatdan qidirish..."
                className="w-full pl-8 pr-14 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
              {searchQuery && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                    {matchCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Qidiruvni tozalash"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Preview / Raw Toggle */}
            <div className="inline-flex p-1 rounded-xl bg-slate-200/65 border border-white/70 text-[11px] font-bold shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('formatted')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'formatted'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3 h-3 text-teal-600" />
                <span>O‘qish</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'raw'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3 h-3 text-teal-600" />
                <span>Markdown</span>
              </button>
            </div>
          </div>
        </div>

        {/* Document Body Reader */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-gradient-to-b from-white/50 to-slate-50/70 text-slate-800 text-xs md:text-sm leading-relaxed font-sans select-text">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
                <LoaderCircle className="w-6 h-6 animate-spin text-teal-600" />
                <span className="text-xs font-medium">{currentFile.name} yuklanmoqda...</span>
              </div>
            ) : loadError ? (
              <div className="p-6 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold">Hujjatni ochib bo‘lmadi</p>
                  <p>{loadError}</p>
                  <p className="text-rose-600/80 font-mono pt-1">Manzil: {currentFile.path}</p>
                </div>
              </div>
            ) : viewMode === 'raw' ? (
              <pre className="font-mono text-xs whitespace-pre-wrap bg-white/95 p-6 rounded-2xl border border-slate-200/80 shadow-xs text-slate-800 leading-relaxed">
                {highlightText(content, searchQuery)}
              </pre>
            ) : (
              <article className="bg-white/95 p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <MarkdownContent text={content} query={searchQuery} />
              </article>
            )}
          </div>
        </div>

        {/* macOS Bottom Status Bar */}
        <div className="px-5 py-2 border-t border-slate-200/70 bg-white/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span>Manzil:</span>
            <code className="text-teal-700 font-bold bg-teal-50/80 px-2 py-0.5 rounded border border-teal-200/60">
              {currentFile.path}
            </code>
          </div>
          <div className="flex items-center gap-4">
            <span>{docStats.lines} qator</span>
            <span>{docStats.words} so‘z</span>
            <span className="text-slate-400">UTF-8 · Markdown</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Helper: Highlight search query occurrences */
function highlightText(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={idx} className="bg-amber-200/90 text-slate-950 rounded px-0.5 font-semibold">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/* Lightweight Zero-Dependency Markdown Renderer for SRS & Diagrams */
const MarkdownContent: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const blocks = useMemo(() => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLang = '';
    let codeLines: string[] = [];

    lines.forEach((line, index) => {
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLang = line.trim().slice(3).trim();
          codeLines = [];
        } else {
          inCodeBlock = false;
          elements.push(
            <div
              key={`code-${index}`}
              className="my-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 text-slate-100"
            >
              {codeLang && (
                <div className="px-3.5 py-1 bg-slate-800 text-[10px] font-mono uppercase tracking-wider text-teal-300 border-b border-slate-700">
                  {codeLang}
                </div>
              )}
              <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed">
                {highlightText(codeLines.join('\n'), query)}
              </pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      if (line.startsWith('# ')) {
        elements.push(
          <h1
            key={index}
            className="text-xl sm:text-2xl font-black text-slate-900 border-b border-slate-200 pb-2.5 pt-2"
          >
            {highlightText(line.slice(2), query)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-base sm:text-lg font-extrabold text-teal-800 pt-4">
            {highlightText(line.slice(3), query)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-sm sm:text-base font-bold text-slate-800 pt-2.5">
            {highlightText(line.slice(4), query)}
          </h3>
        );
      } else if (line.trim() === '---') {
        elements.push(<hr key={index} className="my-4 border-slate-200" />);
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={index}
            className="border-l-4 border-teal-500 bg-teal-50/50 px-4 py-2 rounded-r-xl text-slate-700 italic text-xs sm:text-sm"
          >
            {highlightText(line.slice(2), query)}
          </blockquote>
        );
      } else if (/^[-*]\s+/.test(line.trim())) {
        elements.push(
          <div key={index} className="flex items-start gap-2 pl-2 text-slate-700">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
            <span>{highlightText(line.trim().replace(/^[-*]\s+/, ''), query)}</span>
          </div>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={index} className="h-1.5" />);
      } else {
        elements.push(
          <p key={index} className="text-slate-700 leading-relaxed">
            {highlightText(line, query)}
          </p>
        );
      }
    });

    return elements;
  }, [text, query]);

  return <>{blocks}</>;
};