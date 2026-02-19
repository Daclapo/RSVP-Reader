import { useCallback, useMemo, useState } from "react";
import { FileText, Trash2, UploadCloud, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { extractFileDocument, formatFileSize, supportedUploadMessage } from "@/lib/reader/file-extract";

export type UploadedDocument = {
  id: string;
  name: string;
  sizeBytes: number;
  type: string;
  text: string;
  warning?: string;
};

type FileDropzoneProps = {
  documents: UploadedDocument[];
  onDocumentsChange: (documents: UploadedDocument[]) => void;
};

const toId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const FileDropzone = ({ documents, onDocumentsChange }: FileDropzoneProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsLoading(true);
      setStatus(`Processing ${acceptedFiles.length} file(s)...`);

      const extracted: UploadedDocument[] = [];
      for (const file of acceptedFiles) {
        try {
          const parsed = await extractFileDocument(file);
          extracted.push({
            id: toId(),
            name: parsed.fileName,
            sizeBytes: parsed.sizeBytes,
            type: parsed.extension || parsed.mimeType,
            text: parsed.text,
            warning: parsed.warning,
          });
        } catch (error) {
          console.error("File extraction failed:", error);
          extracted.push({
            id: toId(),
            name: file.name,
            sizeBytes: file.size,
            type: file.type || "unknown",
            text: "",
            warning: "This file could not be parsed.",
          });
        }
      }

      onDocumentsChange([...documents, ...extracted]);
      setStatus(`${extracted.length} file(s) imported.`);
      setIsLoading(false);
    },
    [documents, onDocumentsChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt", ".text", ".md", ".markdown"],
      "text/html": [".html", ".htm"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.oasis.opendocument.text": [".odt"],
      "application/epub+zip": [".epub"],
    },
    maxFiles: 40,
  });

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => a.name.localeCompare(b.name)),
    [documents]
  );

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-colors ${
          isDragActive ? "border-primary bg-primary/8" : "border-border bg-muted/30"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mb-3 h-8 w-8 text-muted-foreground" />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{status || "Processing files..."}</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              {isDragActive ? "Drop files here" : "Drag and drop multiple files, or click to browse"}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>{supportedUploadMessage}</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{documents.length} file(s) queued</p>
        {documents.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => onDocumentsChange([])}>
            <Trash2 className="h-4 w-4" />
            Clear list
          </Button>
        ) : null}
      </div>

      <ScrollArea className="h-52 rounded-xl border border-border bg-background/70 p-2">
        <div className="space-y-1">
          {sortedDocuments.map((document) => (
            <article key={document.id} className="rounded-md border border-border/70 bg-card p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{document.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(document.sizeBytes)} · {document.type || "unknown"}
                  </p>
                  {document.warning ? (
                    <p className="mt-1 text-xs text-amber-700">{document.warning}</p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDocumentsChange(documents.filter((item) => item.id !== document.id))}
                  aria-label={`Remove ${document.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}

          {documents.length === 0 ? (
            <p className="rounded-md border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
              No files imported yet.
            </p>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FileDropzone;
