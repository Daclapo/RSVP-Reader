import * as React from "react";
import { cn } from "@/lib/utils";

type SliderProps = {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  id?: string;
};

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled,
  id,
}: SliderProps) {
  const numericValue = value[0] ?? min;
  const safeRange = Math.max(max - min, 1);
  const percent = ((numericValue - min) / safeRange) * 100;

  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={numericValue}
      onChange={(event) => onValueChange([Number(event.target.value)])}
      disabled={disabled}
      className={cn("h-2 w-full cursor-pointer appearance-none rounded-full", className)}
      style={{
        background: `linear-gradient(90deg, var(--primary) ${percent}%, var(--muted) ${percent}%)`,
      }}
    />
  );
}
