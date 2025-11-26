"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader, ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  message: z.string().min(1, "Message cannot be empty.").max(2000),
});

const STORAGE_KEY = "chat-messages";

type StorageData = { messages: UIMessage[]; durations: Record<string, number> };

const loadMessagesFromStorage = (): StorageData => {
  if (typeof window === "undefined") return { messages: [], durations: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], durations: {} };
    const parsed = JSON.parse(raw);
    return { messages: parsed.messages || [], durations: parsed.durations || {} };
  } catch {
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (messages: UIMessage[], durations: Record<string, number>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, durations }));
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeShownRef = useRef(false);

  const stored = typeof window !== "undefined" ? loadMessagesFromStorage() : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({ messages: initialMessages });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isClient) saveMessagesToStorage(messages, durations);
  }, [messages, durations, isClient]);

  const handleDurationChange = (key: string, duration: number) =>
    setDurations((prev) => ({ ...prev, [key]: duration }));

  useEffect(() => {
    if (isClient && initialMessages.length === 0 && !welcomeShownRef.current) {
      const welcome: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [{ type: "text", text: WELCOME_MESSAGE }],
      };
      setMessages([welcome]);
      saveMessagesToStorage([welcome], {});
      welcomeShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    sendMessage({ text: data.message });
    form.reset();
  };

  const clearChat = () => {
    setMessages([]);
    setDurations({});
    saveMessagesToStorage([], {});
    toast.success("Chat cleared");
  };

  // ===== Digital-marketing–focused content =====
  const quickPrompts = [
    "Create a 1-week Instagram plan for my bakery",
    "Plan a ₹10,000 digital marketing budget for my small business",
    "Write a welcome email for new customers",
    "Give me 5 post ideas for my café’s Google Business Profile",
  ];

  // Keep each to a single line by making them short (no wrapping needed).
  const heroQuestions = [
    "1-week Instagram plan for my business",
    "Spend ₹10k/month on marketing wisely",
    "SEO vs Ads for my local business",
    "Get more Google reviews & visibility",
  ];

  const helpPoints = [
    "SEO & local search visibility for your shop/service",
    "Instagram & Facebook content calendars that fit your budget",
    "Simple email & WhatsApp campaigns to nurture customers",
    "Easy paid ads for small budgets (Google, Meta, etc.)",
  ];

  const hasUserMsg = messages.some((m) => m.role === "user");
  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-screen items-center justify-center font-sans dark:bg-black">
      <main className="w-full h-screen relative">
        {/* Header: now sticky + subtle border; no gradient overlay line */}
        <div className="sticky top-0 z-50 bg-background border-b">
          <ChatHeader>
            <ChatHeaderBlock />
            <ChatHeaderBlock className="justify-center items-center gap-2">
              <Avatar className="size-8 ring-1 ring-primary">
                <AvatarImage src="/logo.png" />
                <AvatarFallback>
                  <Image src="/logo.png" alt="Logo" width={36} height={36} />
                </AvatarFallback>
              </Avatar>
              <div className="leading-tight">
                <p className="text-sm font-medium">Chat with {AI_NAME}</p>
                <p className="text-[11px] text-muted-foreground">
                  Digital Marketing Copilot for Small Businesses
                </p>
              </div>
            </ChatHeaderBlock>
            <ChatHeaderBlock className="justify-end">
              <Button variant="outline" size="sm" onClick={clearChat}>
                <Plus className="size-4" />
                {CLEAR_CHAT_TEXT}
              </Button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* Scroll area */}
        <div className="h-[calc(100vh-112px)] overflow-y-auto px-5 pt-5 pb-[150px]">
          {/* Hero card only before the first user message */}
          {isClient && !hasUserMsg && (
            <section className="w-full flex justify-center mb-5">
              <div className="max-w-4xl w-full rounded-3xl border bg-card p-6 md:p-8 shadow-sm">
                <div className="grid md:grid-cols-2 gap-6 md:gap-10">
                  <div className="space-y-3">
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                      MyAI3 – Digital Marketing Copilot for Small Businesses
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground">
                      Practical, step-by-step help for online marketing—grounded in books,
                      reports, and trend studies for small and local businesses.
                    </p>
                    <div className="space-y-2">
                      <p className="font-semibold text-sm md:text-base">I can help you with:</p>
                      <ul className="space-y-1.5">
                        {helpPoints.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-sm md:text-base">Great first questions:</p>
                    <ul className="space-y-1.5">
                      {heroQuestions.map((q) => (
                        <li key={q} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          <span className="whitespace-nowrap">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Messages */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-3xl">
              {isClient ? (
                <>
                  <MessageWall
                    messages={messages}
                    status={status}
                    durations={durations}
                    onDurationChange={handleDurationChange}
                  />
                  {status === "submitted" && (
                    <div className="flex justify-start">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-center">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Input area (with chips that hide immediately on first send) */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="w-full px-5 pt-3 pb-1 flex flex-col items-center gap-3">
            {isClient && !hasUserMsg && status === "ready" && (
              <div className="max-w-3xl w-full flex flex-wrap justify-center gap-2">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="px-4 py-2 rounded-full border bg-card text-xs md:text-sm hover:bg-accent transition text-muted-foreground"
                    onClick={() => sendMessage({ text: p })}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="max-w-3xl w-full">
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="msg" className="sr-only">
                          Message
                        </FieldLabel>
                        <div className="relative">
                          <Input
                            {...field}
                            id="msg"
                            className="h-14 pr-14 pl-5 bg-card rounded-[20px]"
                            placeholder="Ask me anything about your small business marketing (SEO, social, ads, email)…"
                            disabled={status === "streaming"}
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                          />
                          {!isStreaming ? (
                            <Button
                              className="absolute right-2 top-2 rounded-full"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          ) : (
                            <Button
                              className="absolute right-2 top-2 rounded-full"
                              size="icon"
                              type="button"
                              onClick={() => stop()}
                            >
                              <Square className="size-4" />
                            </Button>
                          )}
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>

            <div className="w-full px-5 py-2 text-xs text-muted-foreground flex justify-center">
              © {new Date().getFullYear()} {OWNER_NAME}&nbsp;
              <Link href="/terms" className="underline">
                Terms of Use
              </Link>
              &nbsp;Powered by&nbsp;
              <Link href="https://ringel.ai/" className="underline">
                Ringel.AI
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
