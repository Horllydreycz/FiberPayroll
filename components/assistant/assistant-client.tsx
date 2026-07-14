"use client";

import * as React from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { askAssistant } from "@/app/actions/assistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "How much are we paying this month?",
  "Which employees haven't been paid?",
  "What's our treasury balance?",
  "Predict next month's payroll expenses",
];

export function AssistantClient() {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const answer = await askAssistant(question);
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Something went wrong — try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex h-[70vh] max-h-[640px] min-h-[420px] flex-col overflow-hidden">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="my-auto flex flex-col items-center gap-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              Ask anything about your payroll — answers come from your live data.
            </p>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              m.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start border bg-background",
            )}
          >
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 self-start text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> checking the books…
          </div>
        )}
        <div ref={endRef} />
      </CardContent>
      <div className="flex gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(input)}
          placeholder="Ask about payroll, balances, forecasts…"
          disabled={busy}
        />
        <Button onClick={() => ask(input)} disabled={busy || !input.trim()} size="icon">
          <Send />
        </Button>
      </div>
    </Card>
  );
}
