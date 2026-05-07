import { Copy, FolderOpen, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { countWords } from "@/lib/reader/text-cleanup";
import type { SavedReadingSession } from "@/lib/reader/types";

type SessionsPanelProps = {
  sessions: SavedReadingSession[];
  activeSessionId: string | null;
  defaultTitle: string;
  t: (key: TranslationKey) => string;
  onSave: (title: string, mode: "new" | "update") => void;
  onOpen: (session: SavedReadingSession) => void;
  onRename: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const PAGE_SIZE = 8;

const SessionsPanel = ({
  sessions,
  activeSessionId,
  defaultTitle,
  t,
  onSave,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onNew,
}: SessionsPanelProps) => {
  const [title, setTitle] = useState(defaultTitle);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setTitle(defaultTitle);
  }, [defaultTitle]);

  const sortedSessions = useMemo(
    () => {
      const safeQuery = query.trim().toLowerCase();
      return [...sessions]
        .filter((session) => !safeQuery || `${session.title} ${session.sourceMeta.sourceTitle ?? ""}`.toLowerCase().includes(safeQuery))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    [query, sessions]
  );
  const visibleSessions = sortedSessions.slice(0, visibleCount);

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-border/80 bg-background/70 p-3">
        <label htmlFor="session-title" className="mb-2 block text-sm font-medium">
          {t("sessionName")}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id="session-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Button onClick={() => onSave(title, "new")}>
            <Save className="h-4 w-4" />
            {t("saveAsNewSession")}
          </Button>
          {activeSessionId ? (
            <Button variant="outline" onClick={() => onSave(title, "update")}>
              {t("updateSession")}
            </Button>
          ) : null}
          <Button variant="outline" onClick={onNew}>
            {t("newSession")}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} className="pl-9" />
      </div>

      <div className="rounded-lg border border-border bg-background/70 p-2">
        <div className="space-y-2">
          {visibleSessions.map((session) => {
            const active = session.id === activeSessionId;
            const isEditing = editingId === session.id;

            return (
              <article
                key={session.id}
                className={`rounded-lg border p-3 ${active ? "border-primary bg-primary/8" : "border-border/80 bg-card"}`}
              >
                <div className="mb-3 min-w-0">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} />
                      <Button
                        size="sm"
                        onClick={() => {
                          onRename(session.id, editingTitle);
                          setEditingId(null);
                        }}
                      >
                        {t("saveSession")}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-sm font-semibold">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("lastUpdated")} {formatDate(session.updatedAt)} · {countWords(session.text)} {t("words")}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onOpen(session)}>
                    <FolderOpen className="h-4 w-4" />
                    {t("open")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(session.id);
                      setEditingTitle(session.title);
                    }}
                  >
                    {t("rename")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDuplicate(session.id)}>
                    <Copy className="h-4 w-4" />
                    {t("duplicate")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(session.id)}>
                    <Trash2 className="h-4 w-4" />
                    {t("delete")}
                  </Button>
                </div>
              </article>
            );
          })}

          {sortedSessions.length === 0 ? (
            <p className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
              {t("noSessions")}
            </p>
          ) : null}
        </div>
        {visibleCount < sortedSessions.length ? (
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}>
            {t("showMore")}
          </Button>
        ) : null}
      </div>
    </section>
  );
};

export default SessionsPanel;
