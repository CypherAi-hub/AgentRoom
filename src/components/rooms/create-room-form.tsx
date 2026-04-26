"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { createRoomAction } from "@/app/(app)/rooms/actions";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create room"}
    </Button>
  );
}

export function CreateRoomDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createRoomAction, { error: null });
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;

    function getFocusable(): HTMLElement[] {
      const root = dialogRef.current;
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
        if (el.hasAttribute("disabled")) return false;
        if (el.getAttribute("aria-hidden") === "true") return false;
        return el.offsetParent !== null || el === document.activeElement;
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = getFocusable();
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const root = dialogRef.current;

      if (!root || !active || !root.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  return (
    <>
      <Button type="button" variant="default" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New room
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-room-title"
            className="relative w-full max-w-md rounded-lg border bg-card p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 id="create-room-title" className="text-base font-semibold">Create a new room</h2>
                <p className="mt-1 text-sm text-muted-foreground">Rooms group runs and agents by project.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>
            {/*
             * key={open ? "open" : "closed"} forces React to remount the form
             * each time the modal opens, clearing any previous input values.
             */}
            <form key={open ? "open" : "closed"} action={action} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="name">
                Name
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  maxLength={80}
                  autoFocus
                  className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-emerald-300/50"
                  placeholder="e.g. Auth refactor"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="description">
                Description
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  maxLength={400}
                  className="resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-emerald-300/50"
                  placeholder="What is this room for? (optional)"
                />
              </label>
              {state.error ? (
                <p role="alert" className="rounded-md border border-red-300/30 bg-red-300/[0.06] px-3 py-2 text-sm text-red-200">
                  {state.error}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
