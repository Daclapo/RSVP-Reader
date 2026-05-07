import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

type DialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function Dialog({ open, defaultOpen = false, onOpenChange, children }: DialogProps) {
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

  return <DialogContext.Provider value={{ open: currentOpen, setOpen }}>{children}</DialogContext.Provider>;
}

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("Dialog components must be used within Dialog");
  return context;
}

function DialogTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  const { setOpen } = useDialogContext();

  return (
    <button type="button" className={className} onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function DialogOverlay({ className }: { className?: string }) {
  return <div className={cn("fixed inset-0 bg-black/50", className)} />;
}

function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, setOpen } = useDialogContext();

  if (!open) return null;

  return (
    <DialogPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <DialogOverlay />
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute inset-0 z-[1]"
          onClick={() => setOpen(false)}
        />
        <div className={cn("relative z-10 w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-xl", className)}>
          {children}
        </div>
      </div>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex items-center justify-end gap-2", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function DialogClose({ children, className }: { children: React.ReactNode; className?: string }) {
  const { setOpen } = useDialogContext();
  return (
    <button type="button" className={className} onClick={() => setOpen(false)}>
      {children}
    </button>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
