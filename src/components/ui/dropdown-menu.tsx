import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

type DropdownMenuProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function DropdownMenu({ open, onOpenChange, children }: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) setInternalOpen(value);
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange]
  );

  return (
    <DropdownMenuContext.Provider value={{ open: currentOpen, setOpen, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

function useDropdownMenu() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("Dropdown components must be inside DropdownMenu");
  return context;
}

function DropdownMenuTrigger({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, setOpen, triggerRef } = useDropdownMenu();

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-expanded={open}
      className={className}
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
  );
}

function DropdownMenuContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, setOpen, triggerRef } = useDropdownMenu();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (contentRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open, setOpen, triggerRef]);

  React.useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      setPosition({
        top: (rect?.bottom ?? 0) + 8,
        left: rect?.left ?? 0,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, triggerRef]);

  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div
      ref={contentRef}
      className={cn(
        "fixed z-[70] min-w-44 rounded-lg border border-border bg-popover p-1 shadow-lg",
        className
      )}
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>,
    document.body
  );
}

function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 h-px bg-border", className)} />;
}

function DropdownMenuItem({
  className,
  onSelect,
  children,
}: {
  className?: string;
  onSelect?: () => void;
  children: React.ReactNode;
}) {
  const { setOpen } = useDropdownMenu();

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center rounded-md px-2 py-1.5 text-sm text-left text-foreground hover:bg-accent/50",
        className
      )}
      onClick={() => {
        onSelect?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
};
