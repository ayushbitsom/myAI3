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
  const inputRef = useRef<HTMLInputElement>(null);

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
    // Allow submission even while streaming
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
    <div className={`flex h-screen items-center justify-center font-sans transition-colors duration-300 relative overflow-hidden ${theme === "dark" ? "dark bg-gray-950" : "bg-white"}`}>
      
      {/* ---------------- NEW: Background Grid Pattern ---------------- */}
      <div className="absolute inset-0 z-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%) pointer-events-none"></div>

      <main className="w-full h-screen relative flex flex-col z-10">
        {/* Compact Fixed Header */}
        <div
          className={`flex-shrink-0 z-40 transition-all duration-300 ${
            isScrolled
              ? "bg-background/70 dark:bg-gray-950/70 backdrop-blur-2xl shadow-lg border-b border-border/60 dark:border-gray-800/60"
              : "bg-background/50 dark:bg-gray-950/50 backdrop-blur-md border-b border-border/40 dark:border-gray-800/40"
          }`}
        >
          <div className="relative overflow-visible py-2.5 px-4">
            <ChatHeader>
              <ChatHeaderBlock>
                <div className="flex items-center gap-2">
                  {/* Theme toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-8 rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group"
                    onClick={toggleTheme}
                  >
                    {theme === "light" ? (
                      <Moon className="size-3.5 text-gray-600 group-hover:text-primary transition-colors" />
                    ) : (
                      <Sun className="size-3.5 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                    )}
                  </Button>
                </div>
              </ChatHeaderBlock>
              
              <ChatHeaderBlock className="justify-center items-center gap-2.5">
                <div className="relative">
                  <Avatar className="size-8 ring-2 ring-primary/70 dark:ring-primary/50 shadow-lg transition-all duration-300 hover:scale-110">
                    <AvatarImage src="/logo.png" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                      <Image src="/logo.png" alt="Logo" width={32} height={32} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-green-500 dark:bg-green-400 rounded-full border-2 border-background dark:border-gray-950 animate-pulse"></div>
                </div>
                <div className="flex flex-col leading-tight">
                  <p className="tracking-tight font-bold text-sm flex items-center gap-1.5">
                    <Sparkles className="size-3 text-primary dark:text-primary/90 animate-pulse" />
                    {AI_NAME}
                  </p>
                  <p className="text-[10px] text-muted-foreground dark:text-gray-400 font-medium">
                    Digital Marketing AI
                  </p>
                </div>
              </ChatHeaderBlock>
              
              <ChatHeaderBlock className="justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1.5 text-xs hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 hidden sm:flex border-primary/30 dark:border-primary/20 hover:border-primary/50 hover:shadow-md group h-7 px-3"
                  onClick={clearChat}
                >
                  <Plus className="size-3.5 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="font-semibold">{CLEAR_CHAT_TEXT}</span>
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>

        {/* Scrollable content with proper spacing */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 bg-transparent"
        >
          <div className="flex flex-col items-center justify-start min-h-full gap-5 max-w-4xl mx-auto pb-4">
            {/* Compact Premium Hero Card */}
            <section className="w-full animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="relative group">
                {/* Gradient border effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-[24px] opacity-20 dark:opacity-30 blur-lg group-hover:opacity-30 dark:group-hover:opacity-40 transition-all duration-500"></div>
                
                <div className="relative bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 border-2 border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-xl hover:shadow-primary/10 dark:hover:shadow-primary/20 transition-all duration-500 px-5 sm:px-7 py-5 sm:py-6 space-y-4 backdrop-blur-xl">
                  {/* Compact Header */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <div className="px-2.5 py-0.5 bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-full">
                            <p className="text-[10px] font-bold text-primary dark:text-primary/90 flex items-center gap-1">
                              <Zap className="size-2.5" />
                              AI-POWERED
                            </p>
                          </div>
                          <div className="px-2.5 py-0.5 bg-green-500/10 dark:bg-green-400/20 border border-green-500/20 dark:border-green-400/30 rounded-full">
                            <p className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                              <Shield className="size-2.5" />
                              SECURE
                            </p>
                          </div>
                        </div>
                        <h1 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent leading-tight">
                          MyAI3 – Digital Marketing Copilot
                        </h1>
                        <p className="text-xs font-semibold text-primary dark:text-primary/90 mt-0.5">
                          For Small Businesses
                        </p>
                      </div>
                      <TrendingUp className="size-6 text-primary/40 dark:text-primary/30 animate-pulse hidden sm:block flex-shrink-0" />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                      Get practical, step-by-step help with your online marketing. Trained on the latest books, reports, and trend studies.
                    </p>
                  </div>

                  {/* Compact Two-column features with FIXED bullet alignment */}
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="space-y-2 p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                      <h2 className="font-bold text-xs mb-2 flex items-center gap-1.5 text-gray-900 dark:text-white">
                        <span className="size-1.5 rounded-full bg-primary animate-pulse flex-shrink-0"></span>
                        I can help you with:
                      </h2>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300 group">
                          <span className="text-primary mt-[2px] text-sm group-hover:scale-125 transition-transform flex-shrink-0 leading-none">•</span>
                          <span className="font-medium leading-snug">SEO &amp; local search</span>
                        </li>
                        <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300 group">
                          <span className="text-primary mt-[2px] text-sm group-hover:scale-125 transition-transform flex-shrink-0 leading-none">•</span>
                          <span className="font-medium leading-snug">Social media calendars</span>
                        </li>
                        <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300 group">
                          <span className="text-primary mt-[2px] text-sm group-hover:scale-125 transition-transform flex-shrink-0 leading-none">•</span>
                          <span className="font-medium leading-snug">Email &amp; WhatsApp campaigns</span>
                        </li>
                        <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300 group">
                          <span className="text-primary mt-[2px] text-sm group-hover:scale-125 transition-transform flex-shrink-0 leading-none">•</span>
                          <span className="font-medium leading-snug">Paid ads for small budgets</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2 p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 dark:border-primary/30">
                      <h2 className="font-bold text-xs mb-2 flex items-center gap-1.5 text-gray-900 dark:text-white">
                        <span className="size-1.5 rounded-full bg-primary animate-pulse flex-shrink-0"></span>
                        Great first questions:
                      </h2>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300 group">
                          <span className="text-primary mt-[2px] text-sm group-hover:scale-125 transition-transform flex-shrink-0 leading-none">•</span>
                          <span className="font-medium leading-snug">Instagram plan for my business</span>
                        </li>
                        <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300 group">
                          <span className="text-primary mt-[2px] text-sm group-hover:scale-125 transition-transform flex-shrink-0 leading-none">•</span>
                          <span className="font-medium leading-snug">Use ₹10k/month budget</span>
                        </li>
                        <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300 group">
                          <span className="text-primary mt-[2px] text-sm group-hover:scale-125 transition-transform flex-shrink-0 leading-none">•</span>
                          <span className="font-medium leading-snug">SEO vs. online ads</span>
                        </li>
                        <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300 group">
                          <span className="text-primary mt-[2px] text-sm group-hover:scale-125 transition-transform flex-shrink-0 leading-none">•</span>
                          <span className="font-medium leading-snug">More Google reviews</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {!hasUserMessages && (
                    <div className="pt-1 px-3 py-2 bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 dark:from-primary/20 dark:via-purple-500/20 dark:to-primary/20 border border-primary/20 dark:border-primary/30 rounded-lg shadow-inner">
                      <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium flex items-start gap-1.5">
                        <span className="text-sm flex-shrink-0">💡</span>
                        <span>
                          <span className="font-bold text-primary dark:text-primary/90">Pro Tip:</span> Click a suggestion below or ask like you're texting a friend!
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Messages */}
            <section className="w-full flex flex-col gap-3">
              {isClient ? (
                <>
                  <MessageWall
                    messages={messages}
                    status={status}
                    durations={durations}
                    onDurationChange={handleDurationChange}
                  />
                  {status === "submitted" && (
                    <div className="flex justify-start w-full px-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 dark:bg-primary/20 rounded-full border border-primary/20 dark:border-primary/30">
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                        <span className="text-xs font-semibold text-primary dark:text-primary/90">Analyzing...</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-center w-full py-6">
                  <Loader2 className="size-5 animate-spin text-primary" />
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
            className="fixed bottom-[140px] right-5 z-50 rounded-full shadow-2xl hover:shadow-primary/30 dark:hover:shadow-primary/40 hover:scale-110 active:scale-95 transition-all duration-300 gap-2 px-5 sm:hidden bg-gradient-to-r from-primary to-primary/90 font-bold group h-11"
          >
            <Plus className="size-4 group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm">New</span>
          </Button>
        )}

        {/* Compact Premium Input Area */}
        <div className="flex-shrink-0 z-50 bg-gradient-to-t from-background/95 via-background/90 to-transparent dark:from-gray-950/95 dark:via-gray-950/90 backdrop-blur-2xl border-t border-gray-200/60 dark:border-gray-800/60 pt-3 pb-2 shadow-xl">
          <div className="w-full px-4 sm:px-5 flex flex-col items-center gap-2.5 relative overflow-visible max-w-4xl mx-auto">
            {/* Quick-start chips */}
            {!hasUserMessages && (
              <div className="w-full flex flex-wrap gap-2 justify-center animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                {QUICK_START_QUESTIONS.map((q, idx) => (
                  <Button
                    key={q.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 h-auto whitespace-normal leading-snug hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary/40 dark:hover:border-primary/50 hover:scale-105 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg border font-semibold group bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
                    onClick={() => handleQuickQuestion(q.text)}
                    disabled={status === "streaming" || status === "submitted"}
                    style={{
                      animationDelay: `${idx * 100}ms`,
                    }}
                  >
                    {q.icon && <span className="mr-1.5 text-sm group-hover:scale-125 transition-transform">{q.icon}</span>}
                    {q.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Compact Input bar - ENABLED even while streaming */}
            <div className="w-full">
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
                            ref={inputRef}
                            id="chat-form-message"
                            className="h-12 pr-16 pl-5 bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-gray-50 backdrop-blur-xl rounded-[20px] shadow-xl border-2 border-gray-300/60 dark:border-gray-600/60 focus:border-primary/60 dark:focus:border-primary/50 focus:shadow-primary/20 dark:focus:shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:border-primary/40 dark:hover:border-primary/40 text-sm font-medium"
                            placeholder="Ask about digital marketing (SEO, social, ads, email)…"
                            disabled={false}
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmitWrapper();
                              }
                            }}
                          />
                          {(status === "ready" || status === "error" || status === "streaming") && (
                            <Button
                              className="absolute right-2 top-2 rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 size-8 bg-gradient-to-r from-primary to-primary/90"
                              type="button"
                              disabled={!field.value.trim()}
                              size="icon"
                              onClick={handleSubmitWrapper}
                            >
                              <ArrowUp className="size-4 font-bold" />
                            </Button>
                          )}
                          {status === "submitted" && (
                            <Button
                              className="absolute right-2 top-2 rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 size-8"
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

          {/* Compact Footer */}
          <div className="w-full px-5 py-2 items-center flex justify-center text-[10px] text-gray-600 dark:text-gray-400 bg-gray-50/60 dark:bg-gray-900/60 backdrop-blur-md border-t border-gray-200/30 dark:border-gray-800/30 font-medium mt-2">
            <span className="flex items-center gap-1 flex-wrap justify-center">
              © {new Date().getFullYear()} {OWNER_NAME}
              <span className="hidden sm:inline">•</span>
              <Link href="/terms" className="underline hover:text-primary dark:hover:text-primary/90 transition-colors font-semibold">
                Terms
              </Link>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-0.5">
                Powered by
                <Link href="https://ringel.ai/" className="underline hover:text-primary dark:hover:text-primary/90 transition-colors font-semibold inline-flex items-center gap-0.5">
                  Ringel.AI <Sparkles className="size-2.5" />
                </Link>
              </span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
