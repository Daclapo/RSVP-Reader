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
      className={cn("h-6 w-full cursor-pointer", className)}
      style={{ accentColor: "var(--primary)" }}
    />
  );
}
