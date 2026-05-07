import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { readerFontStacks } from "@/lib/reader/fonts";
import { READING_PRESETS } from "@/lib/reader/presets";
import type { PunctuationPauseMode, ReaderFontFamily, ReaderSettings, ReadingPreset } from "@/lib/reader/types";

type ControlsProps = {
  settings: ReaderSettings;
  isPlaying: boolean;
  isAtEnd: boolean;
  progress: number;
  timeLeft: number;
  currentPage: number;
  totalPages: number;
  t: (key: TranslationKey) => string;
  onPlayPause: () => void;
  onReset: () => void;
  onPageChange: (page: number) => void;
  onProgressChange: (progress: number) => void;
  onSettingsChange: (patch: Partial<ReaderSettings>) => void;
  onPresetChange: (preset: ReadingPreset) => void;
  onResetStyle: () => void;
};

const Controls = ({
  settings,
  isPlaying,
  isAtEnd,
  progress,
  timeLeft,
  currentPage,
  totalPages,
  t,
  onPlayPause,
  onReset,
  onPageChange,
  onProgressChange,
  onSettingsChange,
  onPresetChange,
  onResetStyle,
}: ControlsProps) => {
  const [pageInput, setPageInput] = useState(String(currentPage));
  const fontOptions: Array<{ value: ReaderFontFamily; label: string }> = [
    { value: "serif", label: "Serif" },
    { value: "sans", label: "Sans" },
    { value: "arial", label: "Arial" },
    { value: "open-sans", label: "Open Sans" },
    { value: "times", label: "Times New Roman" },
    { value: "georgia", label: "Georgia" },
    { value: "baskerville", label: "Baskerville" },
    { value: "garamond", label: "Garamond" },
    { value: "literata", label: "Literata" },
    { value: "merriweather", label: "Merriweather" },
    { value: "lora", label: "Lora" },
    { value: "crimson", label: "Crimson Text" },
    { value: "raleway", label: "Runway / Raleway" },
    { value: "mono", label: "Mono" },
  ];
  const modes: Array<{ value: ReaderSettings["mode"]; label: string }> = [
    { value: "orp-word", label: "ORP" },
    { value: "line-flow", label: t("lineFlow") },
    { value: "chunk", label: t("chunk") },
    { value: "ebook", label: t("ebook") },
  ];

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  return (
    <Card className="bg-card/95">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("playbackControls")}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <section className="space-y-2">
          <Label>{t("readingMode")}</Label>
          <div className="grid gap-2 sm:grid-cols-4">
            {modes.map((mode) => (
              <Button
                key={mode.value}
                variant={settings.mode === mode.value ? "default" : "outline"}
                onClick={() => onSettingsChange({ mode: mode.value })}
              >
                {mode.label}
              </Button>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <Button className="h-9" onClick={onPlayPause}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? t("pause") : isAtEnd ? t("restart") : t("play")}
          </Button>

          <Button className="h-9" onClick={onReset} variant="secondary">
            <RotateCcw className="h-4 w-4" />
            {t("reset")}
          </Button>

          <Button className="h-9" variant="outline" onClick={onResetStyle}>
            {t("resetStyle")}
          </Button>
        </div>

        <section className="rounded-md border border-border/80 bg-background/70 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{t("readingProgress")} · {Math.round(progress)}% {t("complete")}</span>
            <span>~{timeLeft} {t("minLeft")}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={(event) => onProgressChange(Number(event.target.value))}
            className="h-6 w-full cursor-pointer accent-[var(--primary)]"
            aria-label={t("readingProgress")}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {t("page")} {currentPage}/{Math.max(totalPages, 1)}
            </p>
            <div className="flex items-center gap-1">
              <Input
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onPageChange(Number(pageInput));
                }}
                className="h-8 w-20"
                aria-label={t("goToPage")}
              />
              <Button variant="outline" size="sm" onClick={() => onPageChange(Number(pageInput))}>
                {t("go")}
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className="space-y-3 rounded-md border border-border/80 bg-background/70 p-3">
            <div className="space-y-2">
            <Label htmlFor="preset">{t("preset")}</Label>
            <Select value={settings.preset} onValueChange={(value) => onPresetChange(value as ReadingPreset)}>
              {READING_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom</SelectItem>
            </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor="wpm">{t("speed")}</Label>
                <span>{settings.wpm} WPM</span>
              </div>
              <Slider id="wpm" min={100} max={1200} step={10} value={[settings.wpm]} onValueChange={(value) => onSettingsChange({ wpm: value[0] ?? settings.wpm })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="punctuation-pause">{t("punctuationPause")}</Label>
              <Select
                value={settings.punctuationPause}
                onValueChange={(value) => onSettingsChange({ punctuationPause: value as PunctuationPauseMode })}
              >
                <SelectItem value="off">{t("off")}</SelectItem>
                <SelectItem value="subtle">{t("subtle")}</SelectItem>
                <SelectItem value="strong">{t("strong")}</SelectItem>
              </Select>
            </div>

            {settings.mode === "chunk" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label htmlFor="chunk-size">{t("chunkSize")}</Label>
                  <span>{settings.chunkSize}</span>
                </div>
                <Slider
                  id="chunk-size"
                  min={3}
                  max={5}
                  step={1}
                  value={[settings.chunkSize]}
                  onValueChange={(value) => onSettingsChange({ chunkSize: value[0] ?? settings.chunkSize })}
                />
              </div>
            ) : null}

            {settings.mode === "line-flow" ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <Label htmlFor="focus-window">{t("focusWindow")}</Label>
                    <span>{settings.focusWindow} lines</span>
                  </div>
                  <Slider
                    id="focus-window"
                    min={1}
                    max={4}
                    step={1}
                    value={[settings.focusWindow]}
                    onValueChange={(value) => onSettingsChange({ focusWindow: value[0] ?? settings.focusWindow })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/70 px-2 py-1.5">
                  <Label htmlFor="word-highlight" className="text-sm">{t("wordHighlight")}</Label>
                  <Switch
                    id="word-highlight"
                    checked={settings.lineFlowWordHighlight}
                    onCheckedChange={(checked) => onSettingsChange({ lineFlowWordHighlight: checked })}
                  />
                </div>
              </>
            ) : null}

            {settings.mode === "ebook" ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <Label htmlFor="ebook-words">{t("ebookWordsPerPage")}</Label>
                    <span>{settings.ebookWordsPerPage}</span>
                  </div>
                  <Slider
                    id="ebook-words"
                    min={80}
                    max={520}
                    step={20}
                    value={[settings.ebookWordsPerPage]}
                    onValueChange={(value) => onSettingsChange({ ebookWordsPerPage: value[0] ?? settings.ebookWordsPerPage })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/70 px-2 py-1.5">
                  <Label htmlFor="ebook-highlight" className="text-sm">{t("ebookAutoHighlight")}</Label>
                  <Switch
                    id="ebook-highlight"
                    checked={settings.ebookAutoHighlight}
                    onCheckedChange={(checked) => onSettingsChange({ ebookAutoHighlight: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/70 px-2 py-1.5">
                  <Label htmlFor="ebook-page-advance" className="text-sm">{t("ebookAutoPageAdvance")}</Label>
                  <Switch
                    id="ebook-page-advance"
                    checked={settings.ebookAutoPageAdvance}
                    onCheckedChange={(checked) => onSettingsChange({ ebookAutoPageAdvance: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/70 px-2 py-1.5">
                  <Label htmlFor="ebook-line-marker" className="text-sm">{t("ebookLineMarker")}</Label>
                  <Switch
                    id="ebook-line-marker"
                    checked={settings.ebookLineMarker}
                    onCheckedChange={(checked) => onSettingsChange({ ebookLineMarker: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("ebookLayout")}</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant={settings.ebookSpread === "single" ? "default" : "outline"}
                      onClick={() => onSettingsChange({ ebookSpread: "single" })}
                    >
                      {t("singlePage")}
                    </Button>
                    <Button
                      variant={settings.ebookSpread === "double" ? "default" : "outline"}
                      onClick={() => onSettingsChange({ ebookSpread: "double" })}
                    >
                      {t("doublePage")}
                    </Button>
                  </div>
                </div>
                {settings.ebookSpread === "single" ? (
                  <div className="space-y-2">
                    <Label>{t("ebookOrientation")}</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant={settings.ebookSinglePageOrientation === "portrait" ? "default" : "outline"}
                        onClick={() => onSettingsChange({ ebookSinglePageOrientation: "portrait" })}
                      >
                        {t("portrait")}
                      </Button>
                      <Button
                        variant={settings.ebookSinglePageOrientation === "landscape" ? "default" : "outline"}
                        onClick={() => onSettingsChange({ ebookSinglePageOrientation: "landscape" })}
                      >
                        {t("landscape")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>

          <section className="space-y-3 rounded-md border border-border/80 bg-background/70 p-3">
            <div className="space-y-2">
              <Label>{t("fontFamily")}</Label>
              <Select
                value={settings.fontFamily}
                onValueChange={(value) => onSettingsChange({ fontFamily: value as ReaderSettings["fontFamily"] })}
              >
                {fontOptions.map((font) => (
                  <SelectItem key={font.value} value={font.value} style={{ fontFamily: readerFontStacks[font.value] }}>
                    {font.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor="font-size">{t("fontSize")}</Label>
                <span>{settings.fontSize}</span>
              </div>
              <Slider id="font-size" min={2} max={12} step={1} value={[settings.fontSize]} onValueChange={(value) => onSettingsChange({ fontSize: value[0] ?? settings.fontSize })} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor="line-height">{t("lineHeight")}</Label>
                <span>{settings.lineHeight.toFixed(2)}</span>
              </div>
              <Slider
                id="line-height"
                min={1}
                max={2}
                step={0.05}
                value={[settings.lineHeight]}
                onValueChange={(value) => onSettingsChange({ lineHeight: value[0] ?? settings.lineHeight })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor="letter-spacing">{t("letterSpacing")}</Label>
                <span>{settings.letterSpacing.toFixed(2)}em</span>
              </div>
              <Slider
                id="letter-spacing"
                min={0}
                max={0.2}
                step={0.01}
                value={[settings.letterSpacing]}
                onValueChange={(value) => onSettingsChange({ letterSpacing: value[0] ?? settings.letterSpacing })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor="word-spacing">{t("wordSpacing")}</Label>
                <span>{settings.wordSpacing.toFixed(2)}em</span>
              </div>
              <Slider
                id="word-spacing"
                min={0}
                max={1}
                step={0.05}
                value={[settings.wordSpacing]}
                onValueChange={(value) => onSettingsChange({ wordSpacing: value[0] ?? settings.wordSpacing })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="viewer-bg">{t("viewerBackground")}</Label>
                <input
                  id="viewer-bg"
                  type="color"
                  value={settings.viewerBg}
                  onChange={(event) => onSettingsChange({ viewerBg: event.target.value })}
                  className="h-9 w-full cursor-pointer rounded-md border border-border bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="viewer-fg">{t("viewerText")}</Label>
                <input
                  id="viewer-fg"
                  type="color"
                  value={settings.viewerFg}
                  onChange={(event) => onSettingsChange({ viewerFg: event.target.value })}
                  className="h-9 w-full cursor-pointer rounded-md border border-border bg-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/70 px-2 py-1.5">
              <Label htmlFor="auto-zen" className="text-sm">
                {t("autoZen")}
              </Label>
              <Switch
                id="auto-zen"
                checked={settings.autoZenOnPlay}
                onCheckedChange={(checked) => onSettingsChange({ autoZenOnPlay: checked })}
              />
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
};

export default Controls;
