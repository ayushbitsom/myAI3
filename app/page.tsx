"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square, Sparkles, Moon, Sun, Zap, Shield, TrendingUp } from "lucide-react";
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
const THEME_KEY = "chat-theme";

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

const loadTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return (stored as "light" | "dark") || "light";
  } catch {
    return "light";
  }
};

const saveTheme = (theme: "light" | "dark") => {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
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
  const [theme, setTheme] = useState<"light" | "dark">("light");
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
    const savedTheme = loadTheme();
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
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

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    saveTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    toast.success(`Switched to ${newTheme} mode`);
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
    welcomeMessageShownRef.current = false;
    toast.success("Chat cleared successfully");
    
    // Re-add welcome message
    setTimeout(() => {
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
    }, 100);
  }

  function handleQuickQuestion(text: string) {
    sendMessage({ text });
  }

  const hasUserMessages = messages.some((m) => m.role === "user");

  return (
    <div className={`flex h-screen items-center justify-center font-sans transition-colors duration-300 ${theme === "dark" ? "dark bg-gradient-to-br from-gray-950 via-gray-900 to-black" : "bg-gradient-to-br from-gray-50 via-white to-gray-100"}`}>
      <main className="w-full h-screen relative">
        {/* Fixed Header with blur effect and premium styling */}
        <div
          className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
            isScrolled
              ? "bg-background/70 dark:bg-gray-950/70 backdrop-blur-2xl shadow-2xl border-b border-border/60 dark:border-gray-800/60"
              : "bg-background/50 dark:bg-gray-950/50 backdrop-blur-md border-b border-border/40 dark:border-gray-800/40"
          }`}
        >
          <div className="relative overflow-visible py-4 px-4">
            <ChatHeader>
              <ChatHeaderBlock>
                <div className="flex items-center gap-2">
                  {/* Theme toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-9 rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group"
                    onClick={toggleTheme}
                  >
                    {theme === "light" ? (
                      <Moon className="size-4 text-gray-600 group-hover:text-primary transition-colors" />
                    ) : (
                      <Sun className="size-4 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                    )}
                  </Button>
                </div>
              </ChatHeaderBlock>
              
              <ChatHeaderBlock className="justify-center items-center gap-3">
                <div className="relative">
                  <Avatar className="size-10 ring-2 ring-primary/70 dark:ring-primary/50 shadow-2xl transition-all duration-300 hover:scale-110 hover:ring-4">
                    <AvatarImage src="/logo.png" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                      <Image src="/logo.png" alt="Logo" width={40} height={40} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-green-500 dark:bg-green-400 rounded-full border-2 border-background dark:border-gray-950 animate-pulse"></div>
                </div>
                <div className="flex flex-col leading-tight">
                  <p className="tracking-tight font-bold text-base flex items-center gap-2">
                    <Sparkles className="size-4 text-primary dark:text-primary/90 animate-pulse" />
                    Chat with {AI_NAME}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium">
                    Digital Marketing Copilot • AI-Powered
                  </p>
                </div>
              </ChatHeaderBlock>
              
              <ChatHeaderBlock className="justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-2 hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 hidden sm:flex border-primary/30 dark:border-primary/20 hover:border-primary/50 hover:shadow-lg group"
                  onClick={clearChat}
                >
                  <Plus className="size-4 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="font-semibold">{CLEAR_CHAT_TEXT}</span>
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollContainerRef}
          className="h-screen overflow-y-auto px-4 sm:px-5 py-4 w-full pt-24 pb-[200px] bg-transparent"
        >
          <div className="flex flex-col items-center justify-start min-h-full gap-6">
            {/* Premium Hero Card */}
            <section className="w-full max-w-4xl animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="relative group">
                {/* Gradient border effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-[28px] opacity-20 dark:opacity-30 blur-xl group-hover:opacity-30 dark:group-hover:opacity-40 transition-all duration-500"></div>
                
                <div className="relative bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 border-2 border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-2xl hover:shadow-primary/10 dark:hover:shadow-primary/20 transition-all duration-500 px-6 sm:px-10 py-7 sm:py-9 space-y-6 backdrop-blur-xl">
                  {/* Header with badges */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="px-3 py-1 bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-full">
                            <p className="text-xs font-bold text-primary dark:text-primary/90 flex items-center gap-1.5">
                              <Zap className="size-3" />
                              AI-POWERED
                            </p>
                          </div>
                          <div className="px-3 py-1 bg-green-500/10 dark:bg-green-400/20 border border-green-500/20 dark:border-green-400/30 rounded-full">
                            <p className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                              <Shield className="size-3" />
                              SECURE
                            </p>
                          </div>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent leading-tight">
                          MyAI3 – Digital Marketing Copilot
                        </h1>
                        <p className="text-sm font-semibold text-primary dark:text-primary/90 mt-1">
                          For Small Businesses
                        </p>
                      </div>
                      <TrendingUp className="size-8 text-primary/40 dark:text-primary/30 animate-pulse hidden sm:block" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                      Get practical, step-by-step help with your online marketing. Trained on the latest books, reports, and trend studies about digital marketing – especially for small and local businesses.
                    </p>
                  </div>

                  {/* Two-column features */}
                  <div className="grid gap-5 sm:grid-cols-2 text-sm">
                    <div className="space-y-3 p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                      <h2 className="font-bold text-base mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                        I can help you with:
                      </h2>
                      <ul className="space-y-2.5 text-gray-700 dark:text-gray-300">
                        <li className="flex items-start gap-2.5 group">
                          <span className="text-primary mt-0.5 text-base group-hover:scale-125 transition-transform">•</span>
                          <span className="font-medium">SEO &amp; local search visibility</span>
                        </li>
                        <li className="flex items-start gap-2.5 group">
                          <span className="text-primary mt-0.5 text-base group-hover:scale-125 transition-transform">•</span>
                          <span className="font-medium">Instagram &amp; Facebook content calendars</span>
                        </li>
                        <li className="flex items-start gap-2.5 group">
                          <span className="text-primary mt-0.5 text-base group-hover:scale-125 transition-transform">•</span>
                          <span className="font-medium">Email and WhatsApp campaigns</span>
                        </li>
                        <li className="flex items-start gap-2.5 group">
                          <span className="text-primary mt-0.5 text-base group-hover:scale-125 transition-transform">•</span>
                          <span className="font-medium">Simple paid ads for small budgets</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="space-y-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 dark:border-primary/30">
                      <h2 className="font-bold text-base mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                        <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                        Great first questions:
                      </h2>
                      <ul className="space-y-2.5 text-gray-700 dark:text-gray-300">
                        <li className="flex items-start gap-2.5 group">
                          <span className="text-primary mt-0.5 text-base group-hover:scale-125 transition-transform">•</span>
                          <span className="font-medium">Create a 1-week Instagram plan for my business</span>
                        </li>
                        <li className="flex items-start gap-2.5 group">
                          <span className="text-primary mt-0.5 text-base group-hover:scale-125 transition-transform">•</span>
                          <span className="font-medium">How to use a ₹10k/month marketing budget?</span>
                        </li>
                        <li className="flex items-start gap-2.5 group">
                          <span className="text-primary mt-0.5 text-base group-hover:scale-125 transition-transform">•</span>
                          <span className="font-medium">Explain SEO vs. running online ads</span>
                        </li>
                        <li className="flex items-start gap-2.5 group">
                          <span className="text-primary mt-0.5 text-base group-hover:scale-125 transition-transform">•</span>
                          <span className="font-medium">Get more Google reviews &amp; visibility</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {!hasUserMessages && (
                    <div className="pt-2 px-4 py-3 bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 dark:from-primary/20 dark:via-purple-500/20 dark:to-primary/20 border-2 border-primary/20 dark:border-primary/30 rounded-xl shadow-inner">
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-medium flex items-start gap-2">
                        <span className="text-base">💡</span>
                        <span>
                          <span className="font-bold text-primary dark:text-primary/90">Pro Tip:</span> Click one of the suggestions below, or ask in simple language like you're texting a friend. Everything is focused on digital marketing strategies that work.
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Messages - Always visible */}
            <section className="w-full max-w-4xl flex flex-col gap-4">
              {isClient ? (
                <>
                  <MessageWall
                    messages={messages}
                    status={status}
                    durations={durations}
                    onDurationChange={handleDurationChange}
                  />
                  {status === "submitted" && (
                    <div className="flex justify-start max-w-4xl w-full px-2">
                      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-primary/10 dark:bg-primary/20 rounded-full border border-primary/20 dark:border-primary/30">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span className="text-sm font-semibold text-primary dark:text-primary/90">Analyzing your request...</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-center max-w-2xl w-full py-8">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Fixed New Chat Button - Bottom Right (Mobile) */}
        {hasUserMessages && (
          <Button
            onClick={clearChat}
            size="lg"
            className="fixed bottom-32 right-6 z-50 rounded-full shadow-2xl hover:shadow-primary/30 dark:hover:shadow-primary/40 hover:scale-110 active:scale-95 transition-all duration-300 gap-2 px-6 sm:hidden bg-gradient-to-r from-primary to-primary/90 font-bold group"
          >
            <Plus className="size-5 group-hover:rotate-90 transition-transform duration-300" />
            <span>New</span>
          </Button>
        )}

        {/* Premium Input Area */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background/95 via-background/90 to-transparent dark:from-gray-950/95 dark:via-gray-950/90 backdrop-blur-2xl border-t-2 border-gray-200/60 dark:border-gray-800/60 pt-5 shadow-2xl">
          <div className="w-full px-4 sm:px-5 pb-3 flex flex-col items-center gap-4 relative overflow-visible">
            {/* Quick-start chips */}
            {!hasUserMessages && (
              <div className="max-w-4xl w-full flex flex-wrap gap-2.5 justify-center mb-1 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                {QUICK_START_QUESTIONS.map((q, idx) => (
                  <Button
                    key={q.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs sm:text-sm px-4 sm:px-5 py-2.5 h-auto whitespace-normal leading-snug hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary/40 dark:hover:border-primary/50 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl border-2 font-semibold group"
                    onClick={() => handleQuickQuestion(q.text)}
                    disabled={status === "streaming" || status === "submitted"}
                    style={{
                      animationDelay: `${idx * 100}ms`,
                    }}
                  >
                    {q.icon && <span className="mr-2 text-base group-hover:scale-125 transition-transform">{q.icon}</span>}
                    {q.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Premium Input bar */}
            <div className="max-w-4xl w-full">
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
                        <div className="relative">
                          <Input
                            {...field}
                            id="chat-form-message"
                            className="h-16 pr-20 pl-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[26px] shadow-2xl border-2 border-gray-300/60 dark:border-gray-700/60 focus:border-primary/60 dark:focus:border-primary/50 focus:shadow-primary/20 dark:focus:shadow-primary/30 transition-all duration-300 hover:shadow-2xl hover:border-primary/40 dark:hover:border-primary/40 text-base font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            placeholder="Ask me anything about digital marketing (SEO, social media, ads, email)…"
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
                              className="absolute right-2.5 top-2.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 size-11 bg-gradient-to-r from-primary to-primary/90"
                              type="button"
                              disabled={!field.value.trim()}
                              size="icon"
                              onClick={handleSubmitWrapper}
                            >
                              <ArrowUp className="size-5 font-bold" />
                            </Button>
                          )}
                          {(status === "streaming" ||
                            status === "submitted") && (
                            <Button
                              className="absolute right-2.5 top-2.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 size-11"
                              size="icon"
                              variant="destructive"
                              type="button"
                              onClick={() => {
                                stop();
                              }}
                            >
                              <Square className="size-5" />
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

          {/* Premium Footer */}
          <div className="w-full px-5 py-3.5 items-center flex justify-center text-xs text-gray-600 dark:text-gray-400 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 font-medium">
            <span className="flex items-center gap-1 flex-wrap justify-center">
              © {new Date().getFullYear()} {OWNER_NAME}
              <span className="hidden sm:inline">•</span>
              <Link href="/terms" className="underline hover:text-primary dark:hover:text-primary/90 transition-colors font-semibold">
                Terms of Use
              </Link>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                Powered by
                <Link href="https://ringel.ai/" className="underline hover:text-primary dark:hover:text-primary/90 transition-colors font-semibold inline-flex items-center gap-1">
                  Ringel.AI <Sparkles className="size-3" />
                </Link>
              </span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
