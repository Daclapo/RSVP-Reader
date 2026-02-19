import { useMemo, useState } from "react";
import { BookOpenText, Download, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProxyStructuredResponse, SourceMeta } from "@/lib/reader/types";

type BookLibraryProps = {
  onTextChange: (text: string) => void;
  onSourceMetaChange: (meta: SourceMeta) => void;
};

const books = [
  { title: "Pride and Prejudice", author: "Jane Austen", url: "https://www.gutenberg.org/ebooks/1342.txt.utf-8" },
  { title: "Frankenstein; Or, The Modern Prometheus", author: "Mary Shelley", url: "https://www.gutenberg.org/ebooks/84.txt.utf-8" },
  { title: "A Tale of Two Cities", author: "Charles Dickens", url: "https://www.gutenberg.org/ebooks/98.txt.utf-8" },
  { title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", url: "https://www.gutenberg.org/ebooks/1661.txt.utf-8" },
  { title: "The Time Machine", author: "H. G. Wells", url: "https://www.gutenberg.org/ebooks/35.txt.utf-8" },
  { title: "The Picture of Dorian Gray", author: "Oscar Wilde", url: "https://www.gutenberg.org/ebooks/174.txt.utf-8" },
  { title: "Dracula", author: "Bram Stoker", url: "https://www.gutenberg.org/ebooks/345.txt.utf-8" },
  { title: "Moby Dick; or The Whale", author: "Herman Melville", url: "https://www.gutenberg.org/ebooks/2701.txt.utf-8" },
  { title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", url: "https://www.gutenberg.org/ebooks/11.txt.utf-8" },
  { title: "The Strange Case of Dr Jekyll and Mr Hyde", author: "Robert Louis Stevenson", url: "https://www.gutenberg.org/ebooks/43.txt.utf-8" },
  { title: "The War of the Worlds", author: "H. G. Wells", url: "https://www.gutenberg.org/ebooks/36.txt.utf-8" },
  { title: "Treasure Island", author: "Robert Louis Stevenson", url: "https://www.gutenberg.org/ebooks/120.txt.utf-8" },
  { title: "The Call of the Wild", author: "Jack London", url: "https://www.gutenberg.org/ebooks/215.txt.utf-8" },
  { title: "The Hound of the Baskervilles", author: "Arthur Conan Doyle", url: "https://www.gutenberg.org/ebooks/2852.txt.utf-8" },
  { title: "The Count of Monte Cristo", author: "Alexandre Dumas", url: "https://www.gutenberg.org/ebooks/1184.txt.utf-8" },
  { title: "The Republic", author: "Plato", url: "https://www.gutenberg.org/ebooks/1497.txt.utf-8" },
  { title: "The Prince", author: "Niccolo Machiavelli", url: "https://www.gutenberg.org/ebooks/1232.txt.utf-8" },
  { title: "Meditations", author: "Marcus Aurelius", url: "https://www.gutenberg.org/ebooks/2680.txt.utf-8" },
  { title: "Walden", author: "Henry David Thoreau", url: "https://www.gutenberg.org/ebooks/205.txt.utf-8" },
  { title: "Leaves of Grass", author: "Walt Whitman", url: "https://www.gutenberg.org/ebooks/1322.txt.utf-8" },
  { title: "The Scarlet Letter", author: "Nathaniel Hawthorne", url: "https://www.gutenberg.org/ebooks/33.txt.utf-8" },
  { title: "The Jungle Book", author: "Rudyard Kipling", url: "https://www.gutenberg.org/ebooks/35997.txt.utf-8" },
  { title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", url: "https://www.gutenberg.org/ebooks/55.txt.utf-8" },
  { title: "A Christmas Carol", author: "Charles Dickens", url: "https://www.gutenberg.org/ebooks/46.txt.utf-8" },
  { title: "The Secret Garden", author: "Frances Hodgson Burnett", url: "https://www.gutenberg.org/ebooks/113.txt.utf-8" },
  { title: "Heart of Darkness", author: "Joseph Conrad", url: "https://www.gutenberg.org/ebooks/219.txt.utf-8" },
  { title: "The Iliad", author: "Homer", url: "https://www.gutenberg.org/ebooks/6130.txt.utf-8" },
  { title: "The Odyssey", author: "Homer", url: "https://www.gutenberg.org/ebooks/1727.txt.utf-8" },
  { title: "Little Women", author: "Louisa May Alcott", url: "https://www.gutenberg.org/ebooks/514.txt.utf-8" },
  { title: "The Metamorphosis", author: "Franz Kafka", url: "https://www.gutenberg.org/ebooks/5200.txt.utf-8" },
];

const BookLibrary = ({ onTextChange, onSourceMetaChange }: BookLibraryProps) => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredBooks = useMemo(() => {
    const safeQuery = query.trim().toLowerCase();
    if (!safeQuery) return books;

    return books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(safeQuery));
  }, [query]);

  const handleBookFetch = async (title: string, url: string) => {
    setIsLoading(title);
    const toastId = toast.loading(`Loading ${title}...`);

    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}&format=structured`);
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Could not load ${title}: ${errorData.error}`, { id: toastId });
        return;
      }

      const payload = (await response.json()) as ProxyStructuredResponse;
      onTextChange(payload.text);
      onSourceMetaChange({
        kind: "library",
        sourceTitle: title,
        sourceUrl: url,
        headings: payload.headings,
        sourceUrls: [url],
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
          placeholder="Search title or author"
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[30rem] rounded-xl border border-border bg-background/70 p-3">
        <div className="space-y-2">
          {filteredBooks.map((book) => {
            const loading = isLoading === book.title;

            return (
              <article key={book.title} className="rounded-lg border border-border/80 bg-card p-3">
                <div className="mb-3 flex items-start gap-2">
                  <BookOpenText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{book.title}</p>
                    <p className="text-xs text-muted-foreground">{book.author}</p>
                  </div>
                </div>

                <Button
                  onClick={() => handleBookFetch(book.title, book.url)}
                  disabled={!!isLoading}
                  size="sm"
                  className="w-full"
                >
                  <Download className="h-4 w-4" />
                  {loading ? "Loading..." : "Use text"}
                </Button>
              </article>
            );
          })}

          {filteredBooks.length === 0 ? (
            <p className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
              No books match your search.
            </p>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
};

export default BookLibrary;
