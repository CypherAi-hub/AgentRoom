"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { createRoomAction } from "@/app/(app)/rooms/actions";

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
          <div className="relative w-full max-w-md rounded-lg border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">Create a new room</h2>
                <p className="mt-1 text-sm text-muted-foreground">Rooms group runs and agents by project.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>
            <form action={action} className="flex flex-col gap-4">
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
