import { useMemo, useState } from "react";
import { BookOpenText, Download, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { libraryBooks } from "@/lib/library/books";
import { cleanReadingText, countWords } from "@/lib/reader/text-cleanup";
import type { Locale, ProxyStructuredResponse, SourceMeta } from "@/lib/reader/types";

type BookLibraryProps = {
  onTextChange: (text: string) => void;
  onSourceMetaChange: (meta: SourceMeta) => void;
  locale: Locale;
  t: (key: TranslationKey) => string;
};
const PAGE_SIZE = 24;

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

const BookLibrary = ({ onTextChange, onSourceMetaChange, locale, t }: BookLibraryProps) => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredBooks = useMemo(() => {
    const safeQuery = query.trim().toLowerCase();
    const localeAwareBooks = libraryBooks.filter((book) => book.language === locale || book.language === "en");
    if (!safeQuery) return localeAwareBooks;

    return localeAwareBooks.filter((book) => `${book.title} ${book.author} ${book.language}`.toLowerCase().includes(safeQuery));
  }, [locale, query]);
  const visibleBooks = filteredBooks.slice(0, visibleCount);

  const handleBookFetch = async (title: string, url: string) => {
    setIsLoading(title);
    const toastId = toast.loading(`Loading ${title}...`);

    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}&format=structured`);
      const payload = await readJsonResponse<ProxyStructuredResponse>(response);
      if (!response.ok) {
        toast.error(`Could not load ${title}: ${payload.error ?? "Fetch failed"}`, { id: toastId });
        return;
      }

      const cleaned = cleanReadingText(payload.text);
      onTextChange(cleaned);
      onSourceMetaChange({
        kind: "library",
        sourceTitle: title,
        sourceUrl: url,
        headings: payload.headings,
        sourceUrls: [url],
        wordCount: countWords(cleaned),
        textFormat: "plain",
      });

      toast.success(`${title} loaded`, { id: toastId });
    } catch (error) {
      console.error(`Error loading ${title}:`, error);
      toast.error(`Could not load ${title}`, { id: toastId });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-border bg-background/70 p-2">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {visibleBooks.map((book) => (
              <article key={book.title} className="flex min-w-0 items-center gap-2 rounded-md border border-border/80 bg-card px-2.5 py-2">
                <BookOpenText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">{book.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{book.author}</span>
                    <span className="rounded border border-border/70 px-1 uppercase">{book.language}</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleBookFetch(book.title, book.url)}
                  disabled={!!isLoading}
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 px-2"
                  aria-label={`${t("useText")}: ${book.title}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </article>
          ))}

          {filteredBooks.length === 0 ? (
            <p className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
              {t("noBooks")}
            </p>
          ) : null}
        </div>
        {visibleCount < filteredBooks.length ? (
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}>
            {t("showMore")}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default BookLibrary;
