import { BookOpenCheck, Check, Github, Palette, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReaderTheme } from "@/lib/reader/types";

const themeLabels: Record<ReaderTheme, string> = {
  slate: "Slate",
  linen: "Linen",
  sepia: "Sepia",
  midnight: "Midnight",
  forest: "Forest",
  dawn: "Dawn",
  arctic: "Arctic",
};

type HeaderProps = {
  theme: ReaderTheme;
  onThemeChange: (theme: ReaderTheme) => void;
  onOpenReader: () => void;
};

const repositoryUrl = "https://github.com/daclapo/rsvp-formatter";

const Header = ({ theme, onThemeChange, onOpenReader }: HeaderProps) => {
  return (
    <header className="mx-auto w-full max-w-[120rem] px-4 pt-5 pb-3">
      <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rapid visual reading</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">RSVP Formatter</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Import text, generate a navigable outline, and read in ORP, line flow, or chunk mode.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/40">
                <Palette className="h-4 w-4" />
                Theme: {themeLabels[theme]}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Color presets</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(themeLabels) as ReaderTheme[]).map((option) => (
                  <DropdownMenuItem key={option} onSelect={() => onThemeChange(option)}>
                    <div className="flex w-full items-center justify-between">
                      <span>{themeLabels[option]}</span>
                      {option === theme ? <Check className="h-4 w-4" /> : null}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" onClick={onOpenReader} className="bg-primary text-primary-foreground shadow-sm">
              <Play className="h-4 w-4" />
              Reader mode
            </Button>

            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent/50"
              aria-label="Open repository"
            >
              <Github className="h-4 w-4" />
            </a>

            <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
              <BookOpenCheck className="h-3.5 w-3.5" />
              Space to play/pause
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
