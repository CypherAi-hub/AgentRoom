"use client";

import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";

const TOKEN = {
  surface: "#0F0F0F",
  borderSubtle: "#1F1F1F",
  textPrimary: "#F5F5F5",
  textMuted: "#A0A0A0",
};

export type FaqItem = { q: string; a: string };

export const DEFAULT_FAQ: FaqItem[] = [
  {
    q: "What counts as a credit?",
    a: "One credit roughly equals one second of agent-controlled VM time, plus tiny costs for actions like screenshots and tool calls. Boot is 5 credits; running is 2 credits/min.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your billing page in one click. You keep any unused credits and your runs stay accessible.",
  },
  {
    q: "Is there a free tier?",
    a: "Yes — 30 minutes of VM time, 1 concurrent sandbox, no credit card required. Enough to see real agent work end-to-end.",
  },
  {
    q: "Do credits expire?",
    a: "Credit packs never expire. Pro plan included usage resets monthly with your billing cycle.",
  },
  {
    q: "What happens if I hit my limit?",
    a: "Agents auto-stop cleanly and we notify you. No surprise overage — you choose whether to top up or wait until next cycle.",
  },
  {
    q: "Is my data secure?",
    a: "Each run executes in an isolated sandbox that is destroyed on completion. We don't train on your data and you can delete recordings anytime.",
  },
  {
    q: "Can I bring my own model?",
    a: "Pro and Credits plans support BYO API keys for Anthropic, OpenAI, and OpenRouter — usage is billed by your provider, not us.",
  },
];

function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!contentRef.current) return;
    setHeight(contentRef.current.scrollHeight);
  }, [item.a]);

  return (
    <div
      className="rounded-[12px] border"
      style={{ background: TOKEN.surface, borderColor: TOKEN.borderSubtle }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span
          className="font-medium"
          style={{ color: TOKEN.textPrimary, fontSize: 15 }}
        >
          {item.q}
        </span>
        <Plus
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-300 ease-out"
          style={{
            color: TOKEN.textMuted,
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        />
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: open ? height : 0 }}
      >
        <div ref={contentRef} className="px-5 pb-5">
          <p style={{ color: TOKEN.textMuted, fontSize: 14, lineHeight: 1.65 }}>
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection({ items = DEFAULT_FAQ }: { items?: FaqItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <FaqRow key={item.q} item={item} />
      ))}
    </div>
  );
}

export default FaqSection;
