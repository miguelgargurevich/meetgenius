"use client";

import * as React from "react";
import Link from "next/link";
import { Send, Sparkles, MessageSquareText } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, Spinner } from "@/components/ui/misc";
import { api } from "@/lib/api-client";

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; title: string }[];
}

const SUGGESTIONS = [
  "¿Qué acuerdos tuvimos con el proveedor CRM?",
  "¿Qué tareas siguen pendientes?",
  "¿Qué riesgos se mencionaron este mes?",
  "Resume todas las reuniones de junio.",
];

export default function ChatPage() {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post<{ answer: string; sources: { id: string; title: string }[] }>(
        "/api/chat",
        { question, history },
      );
      setMessages((m) => [...m, { role: "assistant", content: res.answer, sources: res.sources }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${(e as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Ask MeetGenius"
        description="Pregunta en lenguaje natural sobre el historial de tus reuniones."
      />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-6">
        <div className="flex-1 space-y-6 overflow-y-auto py-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--primary)]">
                <Sparkles className="size-7 text-white" />
              </div>
              <h2 className="text-lg font-semibold">¿En qué puedo ayudarte?</h2>
              <p className="mt-1 max-w-md text-sm text-[var(--muted-foreground)]">
                Consulto tus reuniones completadas para responder con contexto real.
              </p>
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-lg border border-[var(--border)] p-3 text-left text-sm transition-colors hover:bg-[var(--accent)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "assistant" && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]">
                  <Sparkles className="size-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border border-[var(--border)] bg-[var(--card)]"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-2">
                    {m.sources.map((s) => (
                      <Link
                        key={s.id}
                        href={`/meetings/${s.id}`}
                        className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        <MessageSquareText className="mr-1 inline size-3" />
                        {s.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {m.role === "user" && <Avatar name="Usuario Demo" />}
            </motion.div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-[var(--primary)]">
                <Sparkles className="size-4 text-white" />
              </div>
              <Spinner className="text-[var(--muted-foreground)]" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 pb-6 pt-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta…"
            className="h-11"
          />
          <Button type="submit" size="lg" disabled={loading || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
