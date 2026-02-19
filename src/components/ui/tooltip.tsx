import * as React from "react";
import { cn } from "@/lib/utils";

type TooltipContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <TooltipContext.Provider value={{ open, setOpen }}>{children}</TooltipContext.Provider>;
}

function useTooltipContext() {
  const context = React.useContext(TooltipContext);
  if (!context) throw new Error("Tooltip components must be used within Tooltip");
  return context;
}

function TooltipTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  const { setOpen } = useTooltipContext();

  return (
    <span
      className={className}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
    </span>
  );
}

function TooltipContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open } = useTooltipContext();
  if (!open) return null;

  return (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-50 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md",
        className
      )}
    >
      {children}
    </span>
  );
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
