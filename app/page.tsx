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
    setDurations((prevDurations) => {
      const newDurations = { ...prevDurations };
      newDurations[key] = duration;
      return newDurations;
    });
  };

  // Show welcome message only once, when there is no previous chat
  useEffect(() => {
    if (isClient && initialMessages.length === 0 && !welcomeMessageShownRef.current) {
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
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    toast.success("Chat cleared");
  }

  // --- NEW: digital-marketing focused quick prompts and hero content ---

  const suggestedPrompts = [
    "Create a 1-week Instagram plan for my bakery",
    "Plan a ₹10,000 digital marketing budget for my small business",
    "Write a welcome email for new customers",
    "Give me 5 post ideas for my café’s Google Business Profile",
  ];

  const helpPoints = [
    "SEO & local search visibility for your shop or service",
    "Instagram & Facebook content calendars that fit your budget",
    "Simple email and WhatsApp campaigns to nurture customers",
    "Easy paid ads for small monthly budgets (Google, Meta, etc.)",
  ];

  const greatQuestions = [
    "Plan a 1-week Instagram content calendar for my small business",
    "How should I spend a ₹10k/month budget on digital marketing?",
    "SEO vs online ads – which is better for my local business?",
    "How can I get more Google reviews and local online visibility?",
  ];

  const hasStartedChat = messages.some((m) => m.role === "user");

  return (
    <div className="flex h-screen items-center justify-center font-sans dark:bg-black">
      <main className="w-full dark:bg-black h-screen relative">
        {/* HEADER */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-linear-to-b from-background via-background/50 to-transparent dark:bg-black overflow-visible pb-4 border-b border-border/40">
          <div className="relative overflow-visible">
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="justify-center items-center gap-2">
                <Avatar className="size-8 ring-1 ring-primary">
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback>
                    <Image src="/logo.png" alt="Logo" width={36} height={36} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-tight">
                  <p className="tracking-tight text-sm font-medium">
                    Chat with {AI_NAME}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Digital Marketing Copilot for Small Businesses
                  </p>
                </div>
              </ChatHeaderBlock>
              <ChatHeaderBlock className="justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={clearChat}
                >
                  <Plus className="size-4" />
                  {CLEAR_CHAT_TEXT}
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>

        {/* MAIN SCROLL AREA */}
        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[104px] pb-[150px]">
          <div className="flex flex-col items-center justify-start min-h-full gap-4">
            {/* HERO CARD – only when chat has not started */}
            {isClient && !hasStartedChat && (
              <section className="w-full flex justify-center">
                <div className="max-w-4xl w-full rounded-3xl border bg-card p-6 md:p-8 shadow-sm">
                  <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-start">
                    <div className="space-y-3">
                      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                        MyAI3 – Digital Marketing Copilot for Small Businesses
                      </h1>
                      <p className="text-sm md:text-base text-muted-foreground">
                        Get practical, step-by-step help with your online marketing. I’m
                        trained on books, reports, and trend studies about digital
                        marketing – especially for small and local businesses.
                      </p>
                      <div className="space-y-2">
                        <p className="font-semibold text-sm md:text-base">
                          I can help you with:
                        </p>
                        <ul className="space-y-1.5">
                          {helpPoints.map((point) => (
                            <li
                              key={point}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-sm md:text-base">
                        Great first questions:
                      </p>
                      <ul className="space-y-1.5">
                        {greatQuestions.map((q) => (
                          <li
                            key={q}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                            {/* Force each question to stay on a single line */}
                            <span className="whitespace-nowrap">{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* CHAT MESSAGES */}
            <div className="flex flex-col items-center justify-end w-full max-w-3xl">
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
                <div className="flex justify-center max-w-2xl w-full">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* INPUT + QUICK PROMPTS */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-linear-to-t from-background via-background/70 to-transparent dark:bg-black/95 pt-4">
          <div className="w-full px-5 pt-2 pb-1 flex flex-col items-center gap-3">
            {/* Quick suggestion chips – only before first user message */}
            {isClient && !hasStartedChat && (
              <div className="max-w-3xl w-full flex flex-wrap justify-center gap-2 pb-1">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="px-4 py-2 rounded-full border bg-card text-xs md:text-sm hover:bg-accent transition text-muted-foreground"
                    onClick={() => sendMessage({ text: prompt })}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div className="message-fade-overlay" />
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
                            className="h-15 pr-15 pl-5 bg-card rounded-[20px]"
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
                          {(status === "streaming" || status === "submitted") && (
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
          <div className="w-full px-5 py-3 items-center flex justify-center text-xs text-muted-foreground">
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
