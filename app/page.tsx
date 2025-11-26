"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square, Sparkles } from "lucide-react";
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

const QUICK_START_QUESTIONS: { label: string; text: string; icon?: string }[] = [
  {
    label: "Create a 1-week Instagram plan for my bakery",
    text: "Create a detailed 1-week Instagram content plan for my neighborhood bakery, including post ideas, captions, and basic hashtags. Focus only on digital marketing tactics.",
    icon: "📸",
  },
  {
    label: "Use a ₹10,000 digital marketing budget wisely",
    text: "I have a ₹10,000 monthly DIGITAL MARKETING budget for my small business. Propose a split across online channels like paid ads, social media content, email/WhatsApp marketing, and SEO, with clear percentages and reasoning.",
    icon: "💰",
  },
  {
    label: "Write a welcome email for new customers",
    text: "Write a warm, friendly welcome email for new customers who joined my email list after seeing my online ads or social media posts. Keep it short and marketing-focused.",
    icon: "✉️",
  },
  {
    label: "Give me 5 post ideas for my café's Google Business Profile",
    text: "Give me 5 post ideas for my café's (Google Business Profile), a local café to increase visits, reviews, and online visibility. Focus only on digital marketing ideas.",
    icon: "☕",
  },
];

// ----------------- main component -----------------

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [isScrolled, setIsScrolled] = useState(false);
  const welcomeMessageShownRef = useRef<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Handle scroll for header blur effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 20);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

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

  function handleSubmitWrapper(e?: React.FormEvent) {
    if (e) e.preventDefault();
    form.handleSubmit(onSubmit)();
  }

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations: Record<string, number> = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    toast.success("Chat cleared successfully");
  }

  function handleQuickQuestion(text: string) {
    sendMessage({ text });
  }

  const hasUserMessages = messages.some((m) => m.role === "user");

  return (
    <div className="flex h-screen items-center justify-center font-sans dark:bg-black">
      <main className="w-full dark:bg-black h-screen relative">
        {/* Fixed Header with blur effect */}
        <div
          className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
            isScrolled
              ? "bg-background/80 backdrop-blur-xl shadow-md border-b border-border/60"
              : "bg-background border-b border-border/40"
          }`}
        >
          <div className="relative overflow-visible py-3">
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="justify-center items-center gap-3">
                <Avatar className="size-9 ring-2 ring-primary/70 shadow-lg transition-transform hover:scale-105">
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback>
                    <Image src="/logo.png" alt="Logo" width={36} height={36} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-tight">
                  <p className="tracking-tight font-semibold flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" />
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
                  className="cursor-pointer gap-1.5 hover:bg-primary/10 transition-colors hidden sm:flex"
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
        <div
          ref={scrollContainerRef}
          className="h-screen overflow-y-auto px-5 py-4 w-full pt-20 pb-[180px] bg-gradient-to-b from-background via-background to-muted/20"
        >
          <div className="flex flex-col items-center justify-start min-h-full gap-6">
            {/* Hero / marketing card with animation */}
            <section className="w-full max-w-3xl animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="bg-gradient-to-br from-card via-card to-card/80 border border-border/60 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 px-6 sm:px-8 py-6 sm:py-7 space-y-5 backdrop-blur-sm">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    MyAI3 – Digital Marketing Copilot for Small Businesses
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Get practical, step-by-step help with your online marketing.
                    I'm trained on books, reports, and trend studies about
                    digital marketing – especially for small and local
                    businesses.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div className="space-y-2">
                    <h2 className="font-semibold mb-2 flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary"></span>
                      I can help you with:
                    </h2>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>SEO &amp; local search visibility</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Instagram &amp; Facebook content calendars</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Email and WhatsApp campaigns</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Simple paid ads for small budgets</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-semibold mb-2 flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary"></span>
                      Great first questions:
                    </h2>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>
                          Create a 1-week Instagram plan for my small business
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>
                          How should I use a ₹10k/month digital marketing budget?
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>
                          Explain SEO vs. running online ads for my business
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>
                          Ideas to get more Google reviews and online visibility
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                {!hasUserMessages && (
                  <div className="pt-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-xl">
                    <p className="text-xs text-muted-foreground">
                      💡 <span className="font-medium">Tip:</span> Click one of the suggestions below, or ask in simple
                      language like you're texting a friend. Everything is focused
                      on digital marketing.
                    </p>
                  </div>
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
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
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

        {/* Fixed New Chat Button - Bottom Right */}
        {hasUserMessages && (
          <Button
            onClick={clearChat}
            size="lg"
            className="fixed bottom-28 right-6 z-50 rounded-full shadow-2xl hover:shadow-primary/20 hover:scale-105 transition-all duration-300 gap-2 px-5 sm:hidden"
          >
            <Plus className="size-5" />
            New
          </Button>
        )}

        {/* Input + quick-start buttons */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-xl border-t border-border/40 pt-4">
          <div className="w-full px-5 pb-2 flex flex-col items-center gap-3 relative overflow-visible">
            {/* Quick-start chips – only BEFORE first user message */}
            {!hasUserMessages && (
              <div className="max-w-3xl w-full flex flex-wrap gap-2 justify-center mb-1 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                {QUICK_START_QUESTIONS.map((q, idx) => (
                  <Button
                    key={q.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs sm:text-[13px] px-4 py-2 h-auto whitespace-normal leading-snug hover:bg-primary/10 hover:border-primary/30 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => handleQuickQuestion(q.text)}
                    disabled={status === "streaming" || status === "submitted"}
                    style={{
                      animationDelay: `${idx * 100}ms`,
                    }}
                  >
                    {q.icon && <span className="mr-1.5">{q.icon}</span>}
                    {q.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div className="max-w-3xl w-full">
              <div id="chat-form">
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
                            className="h-14 pr-16 pl-5 bg-card/80 backdrop-blur-sm rounded-[22px] shadow-lg border-2 border-border/70 focus:border-primary/50 focus:shadow-primary/20 transition-all duration-200 hover:shadow-xl"
                            placeholder="Ask me anything about your small business DIGITAL marketing (SEO, social, ads, email)…"
                            disabled={status === "streaming"}
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmitWrapper();
                              }
                            }}
                          />
                          {(status === "ready" || status === "error") && (
                            <Button
                              className="absolute right-2 top-2 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
                              type="button"
                              disabled={!field.value.trim()}
                              size="icon"
                              onClick={handleSubmitWrapper}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}
                          {(status === "streaming" ||
                            status === "submitted") && (
                            <Button
                              className="absolute right-2 top-2 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
                              size="icon"
                              variant="destructive"
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
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="w-full px-5 py-3 items-center flex justify-center text-xs text-muted-foreground bg-background/60 backdrop-blur-sm border-t border-border/20">
            © {new Date().getFullYear()} {OWNER_NAME}&nbsp;
            <Link href="/terms" className="underline hover:text-primary transition-colors">
              Terms of Use
            </Link>
            &nbsp;Powered by&nbsp;
            <Link href="https://ringel.ai/" className="underline hover:text-primary transition-colors">
              Ringel.AI
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
