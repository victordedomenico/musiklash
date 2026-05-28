"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { MessageSquare, Send, X, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ChatMessage = {
  id: string;
  playerId: string;
  username: string;
  text: string;
  at: number;
};

const MAX_MESSAGES = 100;
const MAX_TEXT_LEN = 400;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function RoomChat({
  channelKey,
  roomId,
  userId,
  username,
  defaultOpen = false,
}: {
  channelKey: string;
  roomId: string;
  userId: string;
  username: string;
  defaultOpen?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(defaultOpen);
  const [unread, setUnread] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`${channelKey}:chat:${roomId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "chat-message" }, (msg) => {
        const payload = msg.payload as ChatMessage | undefined;
        if (!payload || !payload.id || !payload.text) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          const next = [...prev, payload];
          return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
        });
        if (!openRef.current && payload.playerId !== userId) {
          setUnread((u) => u + 1);
        }
      })
      .subscribe();

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [channelKey, roomId, userId]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  const send = useCallback(async () => {
    const text = draft.trim().slice(0, MAX_TEXT_LEN);
    if (!text) return;
    if (!channelRef.current) return;
    const message: ChatMessage = {
      id: `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerId: userId,
      username,
      text,
      at: Date.now(),
    };
    setMessages((prev) => {
      const next = [...prev, message];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
    setDraft("");
    await channelRef.current.send({
      type: "broadcast",
      event: "chat-message",
      payload: message,
    });
  }, [draft, userId, username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send();
  };

  const sorted = useMemo(() => messages, [messages]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setUnread(0);
        }}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border px-4 py-2.5 shadow-lg backdrop-blur transition hover:scale-[1.02]"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
        }}
        aria-label="Ouvrir le chat"
      >
        <MessageSquare size={16} className="text-[color:var(--accent)]" />
        <span className="text-sm font-semibold">Chat</span>
        {unread > 0 ? (
          <span
            className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: "var(--accent)", color: "var(--background)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-40 flex w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        className="flex items-center justify-between gap-2 border-b px-4 py-2.5"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-[color:var(--accent)]" />
          <span className="text-sm font-bold">Chat de la room</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 transition hover:bg-[color:var(--surface)]"
            aria-label="Réduire"
            title="Réduire"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 transition hover:bg-[color:var(--surface)]"
            aria-label="Fermer"
            title="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[45vh] min-h-[180px] flex-1 space-y-2 overflow-y-auto px-4 py-3"
      >
        {sorted.length === 0 ? (
          <p className="text-center text-xs text-[color:var(--muted)]">
            Dis bonjour ! Les messages ne sont pas conservés en dehors de la session.
          </p>
        ) : (
          sorted.map((m) => {
            const mine = m.playerId === userId;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <div
                  className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
                  style={{
                    background: mine ? "var(--accent-dim)" : "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {!mine ? (
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)]">
                      {m.username}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words leading-snug">{m.text}</p>
                </div>
                <span className="mt-0.5 text-[10px] text-[color:var(--muted)]">
                  {formatTime(m.at)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t px-3 py-2"
        style={{ borderColor: "var(--border)" }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_TEXT_LEN}
          placeholder="Ton message…"
          className="input flex-1 !py-2 text-sm"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="btn-primary !px-3 !py-2 disabled:opacity-50"
          aria-label="Envoyer"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
