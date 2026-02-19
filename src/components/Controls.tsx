import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { ReaderSettings } from "@/lib/reader/types";

type ControlsProps = {
  settings: ReaderSettings;
  isPlaying: boolean;
  isAtEnd: boolean;
  progress: number;
  timeLeft: number;
  onPlayPause: () => void;
  onReset: () => void;
  onSettingsChange: (patch: Partial<ReaderSettings>) => void;
  onResetStyle: () => void;
};

const Controls = ({
  settings,
  isPlaying,
  isAtEnd,
  progress,
  timeLeft,
  onPlayPause,
  onReset,
  onSettingsChange,
  onResetStyle,
}: ControlsProps) => {
  return (
    <Card className="bg-card/95">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Playback controls</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onPlayPause}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? "Pause" : isAtEnd ? "Restart" : "Play"}
          </Button>

          <Button onClick={onReset} variant="secondary">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>

          <Button variant="outline" onClick={onResetStyle}>
            Reset style
          </Button>
        </div>

        <section className="rounded-lg border border-border/80 bg-background/70 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress)}% complete</span>
            <span>~{timeLeft} min left</span>
          </div>
          <Progress value={progress} />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-lg border border-border/80 bg-background/70 p-3">
            <Label htmlFor="mode">Reading mode</Label>
            <Select value={settings.mode} onValueChange={(value) => onSettingsChange({ mode: value as ReaderSettings["mode"] })}>
              <SelectItem value="orp-word">ORP word</SelectItem>
              <SelectItem value="line-flow">Line flow</SelectItem>
              <SelectItem value="chunk">Chunk (3-5 words)</SelectItem>
            </Select>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor="wpm">Speed</Label>
                <span>{settings.wpm} WPM</span>
              </div>
              <Slider id="wpm" min={100} max={1200} step={10} value={[settings.wpm]} onValueChange={(value) => onSettingsChange({ wpm: value[0] ?? settings.wpm })} />
            </div>

            {settings.mode === "chunk" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label htmlFor="chunk-size">Chunk size</Label>
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
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label htmlFor="focus-window">Focus window</Label>
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
            ) : null}
          </section>

          <section className="space-y-3 rounded-lg border border-border/80 bg-background/70 p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor="font-size">Font size</Label>
                <span>{settings.fontSize}</span>
              </div>
              <Slider id="font-size" min={2} max={12} step={1} value={[settings.fontSize]} onValueChange={(value) => onSettingsChange({ fontSize: value[0] ?? settings.fontSize })} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor="line-height">Line height</Label>
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
                <Label htmlFor="letter-spacing">Letter spacing</Label>
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
                <Label htmlFor="word-spacing">Word spacing</Label>
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

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="viewer-bg">Viewer background</Label>
                <input
                  id="viewer-bg"
                  type="color"
                  value={settings.viewerBg}
                  onChange={(event) => onSettingsChange({ viewerBg: event.target.value })}
                  className="h-9 w-full cursor-pointer rounded-md border border-border bg-transparent"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="viewer-fg">Viewer text</Label>
                <input
                  id="viewer-fg"
                  type="color"
                  value={settings.viewerFg}
                  onChange={(event) => onSettingsChange({ viewerFg: event.target.value })}
                  className="h-9 w-full cursor-pointer rounded-md border border-border bg-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/70 p-2">
              <Label htmlFor="auto-zen" className="text-sm">
                Auto zen mode on play
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
