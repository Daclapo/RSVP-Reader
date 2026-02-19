import * as React from "react";
import { cn } from "@/lib/utils";

type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
};

export function Select({ value, onValueChange, className, children, disabled }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      disabled={disabled}
    >
      {children}
    </select>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}
