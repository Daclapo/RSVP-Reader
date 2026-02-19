import { useMemo, useState } from "react";
import { Expand, Link2, Library, Plus, Trash2, Type, Upload } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatFileSize } from "@/lib/reader/file-extract";
import type { ProxyStructuredResponse, StructuredHeading } from "@/lib/reader/types";

type InputMode = "paste" | "upload" | "url" | "library";
type MergeStrategy = "replace" | "append";

type UrlQueueItem = {
  id: string;
  url: string;
  status: "idle" | "loading" | "done" | "error";
  title?: string | null;
  error?: string;
  text?: string;
  headings?: StructuredHeading[];
};

type TabbedInputProps = InputManagerProps;

const toId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeUrlInput = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const composeFromFiles = (documents: UploadedDocument[]) =>
  documents
    .filter((document) => document.text.trim().length > 0)
    .map((document) => `# ${document.name}\n\n${document.text.trim()}`)
    .join("\n\n---\n\n");

const composeFromUrls = (items: UrlQueueItem[]) =>
  items
    .filter((item) => item.text && item.text.trim().length > 0)
    .map((item) => `# ${item.title || item.url}\n\n${item.text?.trim()}`)
    .join("\n\n---\n\n");

const mergeText = (existing: string, incoming: string, strategy: MergeStrategy) => {
  if (!incoming.trim()) return existing;
  if (strategy === "replace" || !existing.trim()) return incoming;
  return `${existing.trim()}\n\n---\n\n${incoming.trim()}`;
};

const TabbedInput = ({ text, onTextChange, onSourceMetaChange }: TabbedInputProps) => {
  const [mode, setMode] = useState<InputMode>("paste");
  const [editorOpen, setEditorOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlQueue, setUrlQueue] = useState<UrlQueueItem[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);

  const urlCount = urlQueue.length;
  const importedUrlCount = urlQueue.filter((item) => item.status === "done" && item.text).length;

  const queueUrls = () => {
    const urls = normalizeUrlInput(urlInput);
    if (urls.length === 0) {
      toast.error("Paste at least one URL (one per line).");
      return;
    }

    const newItems = urls.map((url) => ({ id: toId(), url, status: "idle" as const }));
    setUrlQueue((previous) => [...previous, ...newItems]);
    setUrlInput("");
    toast.success(`${newItems.length} URL(s) added to queue.`);
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
        if (!response.ok) {
          const errorData = await response.json();
          updatedQueue[updatedQueue.length - 1] = {
            ...item,
            status: "error",
            error: errorData.error || "Fetch failed",
          };
          setUrlQueue([...updatedQueue, ...urlQueue.slice(updatedQueue.length)]);
          continue;
        }

        const payload = (await response.json()) as ProxyStructuredResponse;
        updatedQueue[updatedQueue.length - 1] = {
          ...item,
          status: "done",
          title: payload.sourceTitle,
          text: payload.text,
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
      toast.error("No readable text was imported from the queued URLs.");
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
      documents: documents.map((document) => ({
        name: document.name,
        sizeBytes: document.sizeBytes,
        type: document.type,
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
        <TabsList className="grid w-full grid-cols-4 gap-1 p-1">
          <TabsTrigger value="paste">
            <Type className="h-4 w-4" />
            Paste
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link2 className="h-4 w-4" />
            URL
          </TabsTrigger>
          <TabsTrigger value="library">
            <Library className="h-4 w-4" />
            Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paste" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Paste or edit your reading source in the editor below.</p>
            <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
              <Expand className="h-4 w-4" />
              Expand editor
            </Button>
          </div>

          <Textarea
            value={text}
            onChange={(event) => {
              onTextChange(event.target.value);
              onSourceMetaChange({ kind: "paste", sourceTitle: "Pasted text" });
            }}
            className="min-h-[28rem] resize-y bg-background"
            placeholder="Paste your text here..."
          />

          <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
            <DialogContent className="max-w-6xl">
              <DialogHeader>
                <DialogTitle>Expanded text editor</DialogTitle>
                <DialogDescription>
                  Use this full-size editor for long passages before opening Reader mode.
                </DialogDescription>
              </DialogHeader>

              <Textarea
                value={text}
                onChange={(event) => {
                  onTextChange(event.target.value);
                  onSourceMetaChange({ kind: "paste", sourceTitle: "Pasted text" });
                }}
                className="min-h-[70vh] resize-none"
                placeholder="Paste your text here..."
              />

              <DialogFooter>
                <DialogClose className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium">
                  Close
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="upload" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Import multiple files and then replace or append them into the editor.
          </p>

          <FileDropzone documents={documents} onDocumentsChange={setDocuments} />

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-sm text-muted-foreground">{fileSummary}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => applyDocuments("append")}>
                Append files
              </Button>
              <Button onClick={() => applyDocuments("replace")}>Replace with files</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="url" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Paste one URL per line. You can queue and import multiple URLs at once.
          </p>

          <div className="rounded-xl border border-border bg-background/70 p-4">
            <label htmlFor="source-urls" className="mb-2 block text-sm font-medium">
              URL list
            </label>
            <Textarea
              id="source-urls"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              className="min-h-24"
              placeholder={`https://example.com/article-1\nhttps://example.com/article-2`}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={queueUrls}>
                <Plus className="h-4 w-4" />
                Add URLs
              </Button>
              <Button variant="outline" onClick={() => importAllUrls("append")} disabled={isLoadingUrls}>
                Append imported URLs
              </Button>
              <Button onClick={() => importAllUrls("replace")} disabled={isLoadingUrls}>
                {isLoadingUrls ? "Importing..." : "Replace with imported URLs"}
              </Button>
              <Button variant="ghost" onClick={() => setUrlQueue([])} disabled={urlCount === 0 || isLoadingUrls}>
                <Trash2 className="h-4 w-4" />
                Clear queue
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/70 p-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Queue: {urlCount} URL(s) · Imported: {importedUrlCount}
            </p>
            <ScrollArea className="h-44">
              <div className="space-y-1">
                {urlQueue.map((item) => (
                  <div key={item.id} className="rounded-md border border-border/70 p-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-all text-foreground">{item.url}</p>
                        <p className="text-muted-foreground">
                          {item.status === "idle" && "Queued"}
                          {item.status === "loading" && "Loading..."}
                          {item.status === "done" && `Imported${item.title ? ` · ${item.title}` : ""}`}
                          {item.status === "error" && `Error · ${item.error || "Could not import"}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-accent/40"
                        onClick={() => setUrlQueue((previous) => previous.filter((entry) => entry.id !== item.id))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {urlQueue.length === 0 ? (
                  <p className="rounded-md border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                    No URLs in queue.
                  </p>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="library" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Browse public-domain classics and load one into the reader in a single click.
          </p>
          <BookLibrary onTextChange={onTextChange} onSourceMetaChange={onSourceMetaChange} />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default TabbedInput;
