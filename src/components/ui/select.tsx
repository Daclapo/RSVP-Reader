import * as React from "react";
import { cn } from "@/lib/utils";

type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
};

const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function Select({ value, onValueChange, className, children, disabled }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      className={cn(
        "h-9 w-full appearance-none rounded-md border border-input bg-background py-1.5 pl-3 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      style={{ backgroundImage: selectChevron, backgroundPosition: "right 0.75rem center", backgroundRepeat: "no-repeat" }}
      disabled={disabled}
    >
      {children}
    </select>
  );
}

export function SelectItem({ value, children, style }: { value: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <option value={value} style={style}>
      {children}
    </option>
  );
}
