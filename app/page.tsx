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
import {
  AI_NAME,
  CLEAR_CHAT_TEXT,
  OWNER_NAME,
  WELCOME_MESSAGE,
} from "@/config";
import Image from "next/image";
import Link from "next/link";

// ----------------- form + storage schema -----------------

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = "chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): {
  messages: UIMessage[];
  durations: Record<string, number>;
} => {
  if (typeof window === "undefined") return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };

    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (error) {
    console.error("Failed to load messages from localStorage:", error);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (
  messages: UIMessage[],
  durations: Record<string, number>
) => {
  if (typeof window === "undefined") return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save messages to localStorage:", error);
  }
};

// ----------------- quick-start questions -----------------

const QUICK_START_QUESTIONS: { label: string; text: string }[] = [
  {
    label: "Create a 1-week Instagram plan for my bakery",
    text: "Create a 1-week Instagram content plan for my neighborhood bakery, including post ideas, captions, and basic hashtags.",
  },
  {
    label: "How should I use a ₹10,000 monthly budget?",
    text: "I have a ₹10,000 monthly marketing budget for my small business. How should I split it between ads, content, and email?",
  },
  {
    label: "Write a welcome email for new customers",
    text: "Write a warm, friendly welcome email for new customers joining my mailing list for a small local service business.",
  },
  {
    label: "5 Google My Business post ideas for a café",
    text: "Give me 5 Google My Business post ideas for a local café to increase footfall and reviews.",
  },
];

// ----------------- main component -----------------

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);

  const stored =
    typeof window !== "undefined"
      ? loadMessagesFromStorage()
      : { messages: [], durations: {} };

  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prev) => ({ ...prev, [key]: duration }));
  };

  // initial assistant message
  useEffect(() => {
    if (
      isClient &&
      initialMessages.length === 0 &&
      !welcomeMessageShownRef.current
    ) {
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: WELCOME_MESSAGE,
          },
        ],
      };
      setMessages([welcomeMessage]);
      saveMessagesToStorage([welcomeMessage], {});
      welcomeMessageShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    if (!data.message.trim()) return;
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations: Record<string, number> = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    toast.success("Chat cleared");
  }

  function handleQuickQuestion(text: string) {
    sendMessage({ text });
  }

  const hasUserMessages = messages.some((m) => m.role === "user");

  return (
    <div className="flex h-screen items-center justify-center font-sans dark:bg-black">
      <main className="w-full dark:bg-black h-screen relative">
        {/* Top header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-linear-to-b from-background via-background/60 to-transparent dark:bg-black/95 overflow-visible pb-6 border-b border-border/40">
          <div className="relative overflow-visible">
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="justify-center items-center gap-3">
                <Avatar className="size-9 ring-2 ring-primary/70 shadow-sm">
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback>
                    <Image src="/logo.png" alt="Logo" width={36} height={36} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-tight">
                  <p className="tracking-tight font-semibold">
                    Chat with {AI_NAME}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Digital Marketing Copilot for Small Businesses
                  </p>
                </div>
              </ChatHeaderBlock>
              <ChatHeaderBlock className="justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1"
                  onClick={clearChat}
                >
                  <Plus className="size-4" />
                  {CLEAR_CHAT_TEXT}
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[112px] pb-[170px] bg-gradient-to-b from-background via-background to-muted/40">
          <div className="flex flex-col items-center justify-start min-h-full gap-6">
            {/* Hero / marketing card */}
            <section className="w-full max-w-3xl">
              <div className="bg-card border border-border/60 rounded-3xl shadow-sm px-6 sm:px-8 py-6 sm:py-7 space-y-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                    MyAI3 – Digital Marketing Copilot for Small Businesses
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Get practical, step-by-step help with your online marketing.
                    I’m trained on books, reports, and trend studies about
                    digital marketing – especially for small and local
                    businesses.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <h2 className="font-semibold mb-1.5">I can help you with:</h2>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>SEO &amp; local search visibility</li>
                      <li>Instagram &amp; Facebook content calendars</li>
                      <li>Email campaigns and WhatsApp broadcasts</li>
                      <li>Simple ads that fit a small budget</li>
                    </ul>
                  </div>
                  <div>
                    <h2 className="font-semibold mb-1.5">Great first questions:</h2>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Create a 1-week IG plan for my bakery</li>
                      <li>How do I spend ₹10k/month wisely?</li>
                      <li>Explain SEO vs. running ads</li>
                      <li>Ideas to get more reviews online</li>
                    </ul>
                  </div>
                </div>

                {!hasUserMessages && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Tip: Click one of the suggestions below, or ask in simple
                    language like you’re texting a friend.
                  </p>
                )}
              </div>
            </section>

            {/* Messages */}
            <section className="w-full max-w-3xl flex flex-col gap-3">
              {isClient ? (
                <>
                  <MessageWall
                    messages={messages}
                    status={status}
                    durations={durations}
                    onDurationChange={handleDurationChange}
                  />
                  {status === "submitted" && (
                    <div className="flex justify-start max-w-3xl w-full">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-center max-w-2xl w-full py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Input + quick-start buttons */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-linear-to-t from-background via-background/70 to-transparent dark:bg-black overflow-visible pt-4">
          <div className="w-full px-5 pb-2 flex flex-col items-center gap-3 relative overflow-visible">
            <div className="message-fade-overlay" />

            {/* Quick-start chips */}
            <div className="max-w-3xl w-full flex flex-wrap gap-2 justify-center mb-1">
              {QUICK_START_QUESTIONS.map((q) => (
                <Button
                  key={q.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs sm:text-[13px] px-3 py-1 h-auto whitespace-normal leading-snug"
                  onClick={() => handleQuickQuestion(q.text)}
                  disabled={status === "streaming" || status === "submitted"}
                >
                  {q.label}
                </Button>
              ))}
            </div>

            {/* Input bar */}
            <div className="max-w-3xl w-full">
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel
                          htmlFor="chat-form-message"
                          className="sr-only"
                        >
                          Message
                        </FieldLabel>
                        <div className="relative h-13">
                          <Input
                            {...field}
                            id="chat-form-message"
                            className="h-15 pr-15 pl-5 bg-card rounded-[20px] shadow-sm border border-border/70"
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
                          {(status === "ready" || status === "error") && (
                            <Button
                              className="absolute right-3 top-3 rounded-full"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}
                          {(status === "streaming" ||
                            status === "submitted") && (
                            <Button
                              className="absolute right-2 top-2 rounded-full"
                              size="icon"
                              type="button"
                              onClick={() => {
                                stop();
                              }}
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
          </div>

          {/* Footer */}
          <div className="w-full px-5 py-3 items-center flex justify-center text-xs text-muted-foreground bg-background/80 backdrop-blur">
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
      </main>
    </div>
  );
}
