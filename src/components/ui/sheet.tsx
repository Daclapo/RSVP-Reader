import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

type SheetProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function Sheet({ open, defaultOpen = false, onOpenChange, children }: SheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) setInternalOpen(value);
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange]
  );

  return <SheetContext.Provider value={{ open: currentOpen, setOpen }}>{children}</SheetContext.Provider>;
}

function useSheetContext() {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error("Sheet components must be used within Sheet");
  return context;
}

function SheetTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  const { setOpen } = useSheetContext();
  return (
    <button type="button" className={className} onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

function SheetPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function SheetContent({
  className,
  side = "right",
  children,
}: {
  className?: string;
  side?: "left" | "right";
  children: React.ReactNode;
}) {
  const { open, setOpen } = useSheetContext();
  if (!open) return null;

  return (
    <SheetPortal>
      <div className="fixed inset-0 z-50">
        <button type="button" className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} aria-label="Close sheet" />
        <section
          className={cn(
            "absolute top-0 h-full w-[min(92vw,26rem)] border-border bg-card p-5 shadow-xl",
            side === "right" ? "right-0 border-l" : "left-0 border-r",
            className
          )}
        >
          {children}
        </section>
      </div>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function SheetClose({ children, className }: { children: React.ReactNode; className?: string }) {
  const { setOpen } = useSheetContext();
  return (
    <button type="button" className={className} onClick={() => setOpen(false)}>
      {children}
    </button>
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
};
