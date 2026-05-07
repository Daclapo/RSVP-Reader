import { Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { ReaderBookmark } from "@/lib/reader/types";

type BookmarksPanelProps = {
  bookmarks: ReaderBookmark[];
  t: (key: TranslationKey) => string;
  onAdd: () => void;
  onGoTo: (bookmark: ReaderBookmark) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
};

const BookmarksPanel = ({ bookmarks, t, onAdd, onGoTo, onRename, onDelete }: BookmarksPanelProps) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{t("bookmarks")}</h3>
        <Button size="sm" onClick={onAdd}>
          <Bookmark className="h-4 w-4" />
          {t("addBookmark")}
        </Button>
      </div>

      <div className="space-y-2">
        {bookmarks.map((bookmark) => (
          <article key={bookmark.id} className="flex flex-col gap-2 rounded-lg border border-border/80 bg-background/70 p-2 sm:flex-row sm:items-center">
            <Input value={bookmark.label} onChange={(event) => onRename(bookmark.id, event.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onGoTo(bookmark)}>
                {t("go")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(bookmark.id)} aria-label={t("delete")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}

        {bookmarks.length === 0 ? (
          <p className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">{t("noBookmarks")}</p>
        ) : null}
      </div>
    </section>
  );
};

export default BookmarksPanel;
