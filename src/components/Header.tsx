import { BookOpen, Check, Download, FileText, Github, Languages, LayoutDashboard, Palette, Play, Settings2, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localeLabels, type TranslationKey } from "@/lib/i18n/dictionaries";
import type { AppView } from "@/lib/navigation/types";
import type { Locale, ReaderTheme } from "@/lib/reader/types";

const themeLabels: Record<ReaderTheme, string> = {
  slate: "Slate",
  linen: "Linen",
  sepia: "Sepia",
  midnight: "Midnight",
  forest: "Forest",
  dawn: "Dawn",
  arctic: "Arctic",
};

const themePreview: Record<ReaderTheme, { bg: string; fg: string; accent: string }> = {
  slate: { bg: "#f6f7fb", fg: "#2d3340", accent: "#496ea8" },
  linen: { bg: "#fbf7ed", fg: "#41372c", accent: "#9a6734" },
  sepia: { bg: "#f2e5cf", fg: "#4f3a2b", accent: "#8a5a2f" },
  midnight: { bg: "#202333", fg: "#edf1f7", accent: "#7ea8d8" },
  forest: { bg: "#edf5ef", fg: "#263d31", accent: "#357652" },
  dawn: { bg: "#fbf1ef", fg: "#4a302f", accent: "#b65347" },
  arctic: { bg: "#f0f7fb", fg: "#263644", accent: "#4d83a8" },
};

type HeaderProps = {
  theme: ReaderTheme;
  locale: Locale;
  activeView: AppView;
  t: (key: TranslationKey) => string;
  onThemeChange: (theme: ReaderTheme) => void;
  onLocaleChange: (locale: Locale) => void;
  onViewChange: (view: AppView) => void;
};

const repositoryUrl = "https://github.com/daclapo/RSVP-Reader";

const Header = ({ theme, locale, activeView, t, onThemeChange, onLocaleChange, onViewChange }: HeaderProps) => {
  const navItems: Array<{ value: AppView; label: string; icon: ReactNode }> = [
    { value: "source", label: t("source"), icon: <BookOpen className="h-4 w-4" /> },
    { value: "reader", label: t("reader"), icon: <Play className="h-4 w-4" /> },
    { value: "classic", label: t("classic"), icon: <LayoutDashboard className="h-4 w-4" /> },
    { value: "sessions", label: t("sessions"), icon: <SlidersHorizontal className="h-4 w-4" /> },
    { value: "settings", label: t("settings"), icon: <Settings2 className="h-4 w-4" /> },
    { value: "docs", label: t("docs"), icon: <FileText className="h-4 w-4" /> },
    { value: "install", label: t("install"), icon: <Download className="h-4 w-4" /> },
  ];

  return (
    <header className="mx-auto w-full max-w-[120rem] px-4 pt-5 pb-3">
      <div className="rounded-lg border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("appTitle")}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {t("appDescription")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-label={item.label}
                  onClick={() => onViewChange(item.value)}
                  className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                    activeView === item.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/40">
                <Palette className="h-4 w-4" />
                {t("theme")}: {themeLabels[theme]}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{t("colorPresets")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(themeLabels) as ReaderTheme[]).map((option) => (
                  <DropdownMenuItem key={option} onSelect={() => onThemeChange(option)} className="p-1">
                    <div
                      className="flex w-full items-center justify-between rounded-md border px-2 py-1.5"
                      style={{
                        backgroundColor: themePreview[option].bg,
                        borderColor: themePreview[option].accent,
                        color: themePreview[option].fg,
                      }}
                    >
                      <span className="text-sm font-medium">{themeLabels[option]}</span>
                      {option === theme ? <Check className="h-4 w-4" style={{ color: themePreview[option].accent }} /> : null}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/40">
                <Languages className="h-4 w-4" />
                {localeLabels[locale]}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(localeLabels) as Locale[]).map((option) => (
                  <DropdownMenuItem key={option} onSelect={() => onLocaleChange(option)}>
                    <div className="flex w-full items-center justify-between">
                      <span>{localeLabels[option]}</span>
                      {option === locale ? <Check className="h-4 w-4" /> : null}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent/50"
              aria-label="Open repository"
            >
              <Github className="h-4 w-4" />
            </a>

          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
