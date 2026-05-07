import { useMemo, useState } from "react";
import Image from "next/image";
import { Eraser, Link2, Library, Maximize2, Plus, Search, Trash2, Type, Upload, X } from "lucide-react";
import { toast } from "react-hot-toast";
import BookLibrary from "./BookLibrary";
import FileDropzone, { type UploadedDocument } from "./FileDropzone";
import type { InputManagerProps } from "./InputManager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { formatFileSize } from "@/lib/reader/file-extract";
import { cleanReadingText, countWords, detectTextFormat } from "@/lib/reader/text-cleanup";
import type { Locale, ProxyStructuredResponse, SourceMeta, StructuredHeading } from "@/lib/reader/types";

type InputMode = "paste" | "upload" | "url" | "library";
type MergeStrategy = "replace" | "append";

type UrlQueueItem = {
  id: string;
  url: string;
  status: "idle" | "loading" | "done" | "error";
  title?: string | null;
  error?: string;
  text?: string;
  wordCount?: number;
  headings?: StructuredHeading[];
};

type WikipediaSearchResult = {
  title: string;
  description: string;
  url: string;
};

type TabbedInputProps = InputManagerProps & {
  locale: Locale;
  t: (key: TranslationKey) => string;
};

const toId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const QUEUE_PAGE_SIZE = 8;
const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

const normalizeUrlInput = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const readJsonResponse = async <T,>(response: Response): Promise<T & { error?: string }> => {
  const text = await response.text();
  if (!text) return {} as T & { error?: string };
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return {
      error: response.ok ? "The server returned an unreadable response." : `Server returned ${response.status}: ${text.slice(0, 140)}`,
    } as T & { error?: string };
  }
};

const wikiApiBase = (lang: Locale) => `https://${lang === "es" ? "es" : "en"}.wikipedia.org/w/api.php`;

const composeFromFiles = (documents: UploadedDocument[]) =>
  documents
    .filter((document) => document.text.trim().length > 0)
    .map((document) => `# ${document.name}\n\n${cleanReadingText(document.text)}`)
    .join("\n\n---\n\n");

const composeFromUrls = (items: UrlQueueItem[]) =>
  items
    .filter((item) => item.text && item.text.trim().length > 0)
    .map((item) => `# ${item.title || item.url}\n\n${cleanReadingText(item.text ?? "")}`)
    .join("\n\n---\n\n");

const mergeText = (existing: string, incoming: string, strategy: MergeStrategy) => {
  if (!incoming.trim()) return existing;
  if (strategy === "replace" || !existing.trim()) return incoming;
  return `${existing.trim()}\n\n---\n\n${incoming.trim()}`;
};

const TabbedInput = ({ text, sourceMeta, onTextChange, onSourceMetaChange, locale, t }: TabbedInputProps) => {
  const [mode, setMode] = useState<InputMode>("paste");
  const [editorOpen, setEditorOpen] = useState(false);
  const [singleUrl, setSingleUrl] = useState("");
  const [loadedUrlSummary, setLoadedUrlSummary] = useState<string>("");
  const [urlInput, setUrlInput] = useState("");
  const [urlQueue, setUrlQueue] = useState<UrlQueueItem[]>([]);
  const [wikipediaQuery, setWikipediaQuery] = useState("");
  const [wikipediaLanguage, setWikipediaLanguage] = useState<Locale>(locale);
  const [wikipediaResults, setWikipediaResults] = useState<WikipediaSearchResult[]>([]);
  const [isSearchingWikipedia, setIsSearchingWikipedia] = useState(false);
  const [isLoadingWikipedia, setIsLoadingWikipedia] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);
  const [visibleUrlCount, setVisibleUrlCount] = useState(QUEUE_PAGE_SIZE);

  const urlCount = urlQueue.length;
  const importedUrlCount = urlQueue.filter((item) => item.status === "done" && item.text).length;
  const detectedFormat = useMemo(() => detectTextFormat(text), [text]);
  const selectedFormat: NonNullable<SourceMeta["textFormat"]> = sourceMeta.textFormat ?? detectedFormat;
  const visibleUrlQueue = urlQueue.slice(0, visibleUrlCount);

  const searchWikipedia = async () => {
    const query = wikipediaQuery.trim();
    if (!query) {
      toast.error(t("wikipediaPlaceholder"));
      return;
    }

    setIsSearchingWikipedia(true);
    try {
      const response = await fetch(`/api/wikipedia?action=search&lang=${wikipediaLanguage}&q=${encodeURIComponent(query)}`);
      let payload = await readJsonResponse<{ results?: WikipediaSearchResult[] }>(response);
      if (!response.ok) {
        const directUrl = new URL(wikiApiBase(wikipediaLanguage));
        directUrl.search = new URLSearchParams({
          action: "opensearch",
          search: query,
          namespace: "0",
          limit: "8",
          redirects: "resolve",
          format: "json",
          origin: "*",
        }).toString();
        const directResponse = await fetch(directUrl);
        if (directResponse.ok) {
          const directPayload = (await directResponse.json()) as [string, string[], string[], string[]];
          payload = {
            results: directPayload[1].map((title, index) => ({
              title,
              description: directPayload[2][index] ?? "",
              url: directPayload[3][index] ?? "",
            })),
          };
        }
      }
      if (!response.ok) {
        if (!payload.results) {
          toast.error(payload.error || "Wikipedia search failed.");
          return;
        }
      }
      setWikipediaResults(payload.results ?? []);
    } catch (error) {
      console.error("Wikipedia search failed:", error);
      toast.error("Wikipedia search failed.");
    } finally {
      setIsSearchingWikipedia(false);
    }
  };

  const loadWikipediaArticle = async (result: WikipediaSearchResult) => {
    setIsLoadingWikipedia(true);
    try {
      const response = await fetch(`/api/wikipedia?action=page&lang=${wikipediaLanguage}&title=${encodeURIComponent(result.title)}`);
      const payload = await readJsonResponse<ProxyStructuredResponse>(response);
      if (!response.ok) {
        toast.error(payload.error || "Could not load this Wikipedia article.");
        return;
      }

      const cleaned = cleanReadingText(payload.text);
      onTextChange(cleaned);
      onSourceMetaChange({
        kind: "wikipedia",
        sourceTitle: payload.sourceTitle ?? result.title,
        sourceUrl: payload.canonicalUrl || result.url,
        sourceUrls: [payload.canonicalUrl || result.url],
        headings: payload.headings,
        wordCount: countWords(cleaned),
        textFormat: "markdown",
        warnings: ["Wikipedia content is available under Creative Commons Attribution-ShareAlike; keep attribution when reusing it."],
      });
      toast.success(`${payload.sourceTitle ?? result.title} loaded.`);
    } catch (error) {
      console.error("Wikipedia article load failed:", error);
      toast.error("Could not load this Wikipedia article.");
    } finally {
      setIsLoadingWikipedia(false);
    }
  };

  const queueUrls = () => {
    const urls = normalizeUrlInput(urlInput);
    if (urls.length === 0) {
      toast.error("Paste at least one URL (one per line).");
      return;
    }

    const invalidUrls = urls.filter((url) => !isValidUrl(url));
    if (invalidUrls.length > 0) {
      toast.error(`Invalid URL: ${invalidUrls[0]}`);
      return;
    }

    const existingUrls = new Set(urlQueue.map((item) => item.url));
    const newItems = urls
      .filter((url) => !existingUrls.has(url))
      .map((url) => ({ id: toId(), url, status: "idle" as const }));
    if (newItems.length === 0) {
      toast.error("All URLs are already queued.");
      return;
    }
    setUrlQueue((previous) => [...previous, ...newItems]);
    setUrlInput("");
    toast.success(`${newItems.length} URL(s) added to queue.`);
  };

  const importSingleUrl = async () => {
    const url = singleUrl.trim();
    if (!url) {
      toast.error("Paste one URL before importing.");
      return;
    }
    if (!isValidUrl(url)) {
      toast.error(`Invalid URL: ${url}`);
      return;
    }

    setIsLoadingUrls(true);
    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}&format=structured`);
      const payload = await readJsonResponse<ProxyStructuredResponse>(response);
      if (!response.ok) {
        toast.error(payload.error || "Could not import this URL.");
        return;
      }

      const cleaned = cleanReadingText(payload.text);
      const title = payload.sourceTitle || url;
      onTextChange(`# ${title}\n\n${cleaned}`);
      onSourceMetaChange({
        kind: "url",
        sourceTitle: title,
        sourceUrl: url,
        sourceUrls: [url],
        headings: payload.headings,
        wordCount: countWords(cleaned),
        textFormat: "markdown",
      });
      setLoadedUrlSummary(`${title} · ${countWords(cleaned)} ${t("words")}`);
      toast.success(`${title} loaded.`);
    } catch (error) {
      console.error("URL import failed:", error);
      toast.error("Network error while importing this URL.");
    } finally {
      setIsLoadingUrls(false);
    }
  };

  const importAllUrls = async (strategy: MergeStrategy) => {
    if (urlQueue.length === 0) {
      toast.error("Add URLs before importing.");
      return;
    }

    setIsLoadingUrls(true);

    const updatedQueue: UrlQueueItem[] = [];
    for (const item of urlQueue) {
      try {
        updatedQueue.push({ ...item, status: "loading" });
        setUrlQueue([...updatedQueue, ...urlQueue.slice(updatedQueue.length)]);

        const response = await fetch(`/api/proxy?url=${encodeURIComponent(item.url)}&format=structured`);
        const payload = await readJsonResponse<ProxyStructuredResponse>(response);
        if (!response.ok) {
          updatedQueue[updatedQueue.length - 1] = {
            ...item,
            status: "error",
            error: payload.error || "Fetch failed",
          };
          setUrlQueue([...updatedQueue, ...urlQueue.slice(updatedQueue.length)]);
          continue;
        }

        const cleaned = cleanReadingText(payload.text);
        updatedQueue[updatedQueue.length - 1] = {
          ...item,
          status: "done",
          title: payload.sourceTitle,
          text: cleaned,
          wordCount: countWords(cleaned),
          headings: payload.headings,
        };

        setUrlQueue([...updatedQueue, ...urlQueue.slice(updatedQueue.length)]);
      } catch (error) {
        console.error("URL import failed:", error);
        updatedQueue[updatedQueue.length - 1] = {
          ...item,
          status: "error",
          error: "Network error",
        };
        setUrlQueue([...updatedQueue, ...urlQueue.slice(updatedQueue.length)]);
      }
    }

    setUrlQueue(updatedQueue);
    const imported = updatedQueue.filter((entry) => entry.status === "done" && entry.text);
    const mergedText = composeFromUrls(imported);

    if (!mergedText) {
      toast.error("No article text could be extracted. The page may block reading mode; try the single URL flow or paste the text manually.");
      setIsLoadingUrls(false);
      return;
    }

    const mergedHeadings = imported.flatMap((entry) => entry.headings ?? []);

    onTextChange(mergeText(text, mergedText, strategy));
    onSourceMetaChange({
      kind: "url",
      sourceTitle: imported.length === 1 ? imported[0].title || imported[0].url : `${imported.length} imported URLs`,
      sourceUrl: imported.length === 1 ? imported[0].url : null,
      sourceUrls: imported.map((entry) => entry.url),
      headings: mergedHeadings,
      wordCount: countWords(mergedText),
      textFormat: "markdown",
      warnings: updatedQueue.filter((entry) => entry.status === "error").map((entry) => `${entry.url}: ${entry.error ?? "Error"}`),
    });

    toast.success(`${imported.length} URL(s) imported.`);
    setIsLoadingUrls(false);
  };

  const applyDocuments = (strategy: MergeStrategy) => {
    if (documents.length === 0) {
      toast.error("Add files before applying them.");
      return;
    }

    const merged = composeFromFiles(documents);
    if (!merged.trim()) {
      toast.error("No readable text was extracted from the imported files.");
      return;
    }

    onTextChange(mergeText(text, merged, strategy));
    onSourceMetaChange({
      kind: "upload",
      sourceTitle: documents.length === 1 ? documents[0].name : `${documents.length} uploaded documents`,
      wordCount: countWords(merged),
      textFormat: "markdown",
      warnings: documents.map((document) => document.warning).filter((warning): warning is string => Boolean(warning)),
      documents: documents.map((document) => ({
        name: document.name,
        sizeBytes: document.sizeBytes,
        type: document.type,
        wordCount: document.wordCount,
        warning: document.warning,
      })),
    });

    toast.success(`${documents.length} file(s) applied.`);
  };

  const fileSummary = useMemo(() => {
    if (documents.length === 0) return "No files queued";
    const totalBytes = documents.reduce((sum, doc) => sum + doc.sizeBytes, 0);
    return `${documents.length} file(s), ${formatFileSize(totalBytes)} total`;
  }, [documents]);

  return (
    <section className="space-y-4">
      <Tabs value={mode} onValueChange={(value) => setMode(value as InputMode)}>
        <TabsList className="grid h-auto w-full grid-cols-4 gap-1 p-1">
          <TabsTrigger value="paste">
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">{t("paste")}</span>
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{t("upload")}</span>
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("urlOrWikipedia")}</span>
          </TabsTrigger>
          <TabsTrigger value="library">
            <Library className="h-4 w-4" />
            <span className="hidden sm:inline">{t("library")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="min-h-[32rem] space-y-3">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <p className="text-sm text-muted-foreground">
              {countWords(text)} {t("words")} · {selectedFormat === "markdown" ? "Markdown" : "Plain text"}
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                {t("textFormat")}
                <select
                  value={selectedFormat}
                  onChange={(event) => onSourceMetaChange({ kind: "paste", sourceTitle: "Pasted text", textFormat: event.target.value as SourceMeta["textFormat"] })}
                  className="h-9 appearance-none rounded-md border border-input bg-background py-1 pl-2 pr-9 text-sm text-foreground"
                  style={{ backgroundImage: selectChevron, backgroundPosition: "right 0.65rem center", backgroundRepeat: "no-repeat" }}
                >
                  <option value="plain">{t("plainText")}</option>
                  <option value="markdown">{t("markdown")}</option>
                </select>
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onTextChange(cleanReadingText(text));
                  toast.success(t("cleanedText"));
                }}
              >
                <Eraser className="h-4 w-4" />
                {t("cleanedText")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onTextChange("");
                  onSourceMetaChange({ kind: "paste", sourceTitle: "Pasted text", wordCount: 0 });
                  toast.success(t("clearText"));
                }}
              >
                <X className="h-4 w-4" />
                {t("clearText")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
                <Maximize2 className="h-4 w-4" />
                {t("expandEditor")}
              </Button>
            </div>
          </div>

          <Textarea
            value={text}
            onChange={(event) => {
              onTextChange(event.target.value);
              onSourceMetaChange({ kind: "paste", sourceTitle: "Pasted text", textFormat: selectedFormat });
            }}
            className="min-h-[min(34rem,46vh)] max-h-[50vh] resize-none overflow-y-auto bg-background"
            placeholder={t("textPlaceholder")}
          />
          <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
            <DialogContent className="max-w-[min(96vw,72rem)]">
              <DialogHeader>
                <DialogTitle>{t("expandedEditor")}</DialogTitle>
                <DialogDescription>{countWords(text)} {t("words")}</DialogDescription>
              </DialogHeader>

              <Textarea
                value={text}
                onChange={(event) => {
                  onTextChange(event.target.value);
                  onSourceMetaChange({ kind: "paste", sourceTitle: "Pasted text", textFormat: selectedFormat });
                }}
                className="h-[72vh] resize-none overflow-y-auto"
                placeholder={t("textPlaceholder")}
              />

              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    onTextChange("");
                    onSourceMetaChange({ kind: "paste", sourceTitle: "Pasted text", wordCount: 0 });
                    toast.success(t("clearText"));
                  }}
                >
                  <X className="h-4 w-4" />
                  {t("clearText")}
                </Button>
                <DialogClose className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium">
                  {t("close")}
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="upload" className="min-h-[32rem] space-y-3">
          <FileDropzone documents={documents} onDocumentsChange={setDocuments} t={t} />

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-sm text-muted-foreground">{fileSummary}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => applyDocuments("append")}>
                {t("appendFiles")}
              </Button>
              <Button onClick={() => applyDocuments("replace")}>{t("replaceFiles")}</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="url" className="min-h-[32rem] space-y-3">
          <div className="rounded-xl border border-border bg-background/70 p-4">
            <label htmlFor="single-source-url" className="mb-2 block text-sm font-medium">
              {t("singleUrl")}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="single-source-url"
                value={singleUrl}
                onChange={(event) => setSingleUrl(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="https://example.com/article"
              />
              <Button onClick={importSingleUrl} disabled={isLoadingUrls}>
                {isLoadingUrls ? t("importing") : t("loadUrl")}
              </Button>
            </div>
            {loadedUrlSummary ? (
              <p className="mt-3 rounded-md border border-border/70 bg-muted/30 p-2 text-sm text-muted-foreground">
                {t("loadedSource")}: {loadedUrlSummary}
              </p>
            ) : null}
          </div>

          <details className="rounded-xl border border-border bg-background/70 p-4">
            <summary className="cursor-pointer text-sm font-medium">{t("multipleUrls")}</summary>
            <div className="mt-3">
              <label htmlFor="source-urls" className="mb-2 block text-sm font-medium">
                {t("urlList")}
              </label>
            <Textarea
              id="source-urls"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              className="h-24 resize-none"
              placeholder={t("urlPlaceholder")}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={queueUrls}>
                <Plus className="h-4 w-4" />
                {t("addUrls")}
              </Button>
              <Button variant="outline" onClick={() => importAllUrls("append")} disabled={isLoadingUrls}>
                {t("appendImportedUrls")}
              </Button>
              <Button onClick={() => importAllUrls("replace")} disabled={isLoadingUrls}>
                {isLoadingUrls ? t("importing") : t("replaceImportedUrls")}
              </Button>
              <Button variant="ghost" onClick={() => setUrlQueue([])} disabled={urlCount === 0 || isLoadingUrls}>
                <Trash2 className="h-4 w-4" />
                {t("clearQueue")}
              </Button>
            </div>
            </div>
          </details>

          <div className="rounded-xl border border-border bg-background/70 p-3">
            <p className="mb-2 text-xs text-muted-foreground">
              {t("queue")}: {urlCount} · {t("imported")}: {importedUrlCount}
            </p>
            <div className="space-y-1">
                {visibleUrlQueue.map((item) => (
                  <div key={item.id} className="rounded-md border border-border/70 p-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-all text-foreground">{item.url}</p>
                        <p className="text-muted-foreground">
                          {item.status === "idle" && "Queued"}
                          {item.status === "loading" && "Loading..."}
                          {item.status === "done" && `${t("imported")}${item.title ? ` · ${item.title}` : ""} · ${item.wordCount ?? 0} ${t("words")}`}
                          {item.status === "error" && `Error · ${item.error || "Could not import"}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-accent/40"
                        onClick={() => setUrlQueue((previous) => previous.filter((entry) => entry.id !== item.id))}
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </div>
                ))}

                {urlQueue.length === 0 ? (
                  <p className="rounded-md border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                    {t("noUrls")}
                  </p>
                ) : null}
              </div>
            {visibleUrlCount < urlQueue.length ? (
              <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setVisibleUrlCount((value) => value + QUEUE_PAGE_SIZE)}>
                {t("showMore")}
              </Button>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-background/70 p-4">
            <div className="mb-3 flex items-center gap-3">
              <Image src="/wikipedia-small-logo-png-1000x256.png" alt={t("wikipedia")} width={208} height={54} className="h-8 w-auto max-w-[13rem] object-contain" />
            </div>
            <div className="grid gap-2 lg:grid-cols-[10rem_minmax(0,1fr)_auto]">
              <label className="space-y-1 text-sm">
                <span className="font-medium">{t("wikipediaLanguage")}</span>
                <select
                  value={wikipediaLanguage}
                  onChange={(event) => setWikipediaLanguage(event.target.value as Locale)}
                  className="h-10 w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-10 text-sm"
                  style={{ backgroundImage: selectChevron, backgroundPosition: "right 0.75rem center", backgroundRepeat: "no-repeat" }}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">{t("wikipediaSearch")}</span>
                <input
                  value={wikipediaQuery}
                  onChange={(event) => setWikipediaQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") searchWikipedia();
                  }}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={t("wikipediaPlaceholder")}
                />
              </label>
              <Button className="self-end" onClick={searchWikipedia} disabled={isSearchingWikipedia}>
                <Search className="h-4 w-4" />
                {isSearchingWikipedia ? t("loading") : t("search")}
              </Button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {wikipediaResults.map((result) => (
              <article key={result.url || result.title} className="flex flex-col gap-3 rounded-lg border border-border/80 bg-background/70 p-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-sm font-semibold">{result.title}</h3>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                    {result.description || result.url}
                  </p>
                </div>
                <Button className="mt-auto self-start" size="sm" onClick={() => loadWikipediaArticle(result)} disabled={isLoadingWikipedia}>
                  {isLoadingWikipedia ? t("loading") : t("loadWikipedia")}
                </Button>
              </article>
            ))}
          </div>

          {wikipediaResults.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{t("noWikipediaResults")}</p>
          ) : null}
        </TabsContent>

        <TabsContent value="library" className="min-h-[32rem] space-y-3">
          <BookLibrary onTextChange={onTextChange} onSourceMetaChange={onSourceMetaChange} locale={locale} t={t} />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default TabbedInput;
