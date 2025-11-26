"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME } from "@/config";
import Image from "next/image";
import Link from "next/link";


// ------------------------------
// FORM VALIDATION
// ------------------------------
const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});


// ------------------------------
// LOCAL STORAGE CHAT PERSISTENCE
// ------------------------------
const STORAGE_KEY = 'chat-messages';

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): StorageData => {
  if (typeof window === 'undefined') return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };
    return JSON.parse(stored);
  } catch {
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (messages: UIMessage[], durations: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, durations }));
};


// ------------------------------
// HERO CONTENT (STATIC TEXT)
// ------------------------------
const helpPoints = [
  "SEO & local search visibility for your shop/service",
  "Instagram & Facebook content calendars that fit your budget",
  "Simple email & WhatsApp campaigns to nurture customers",
  "Easy paid ads for small budgets (Google, Meta, etc.)",
];

const heroQuestions = [
  "1-week Instagram plan for my business",
  "Spend ₹10k/month on marketing wisely",
  "SEO vs Ads for my local business",
  "Get more Google reviews & visibility",
];

const quickActions = [
  "Create a 1-week Instagram plan for my bakery",
  "Plan a ₹10,000 digital marketing budget for my small business",
  "Write a welcome email for new customers",
  "Give me 5 post ideas for my café’s Google Business Profile"
];


// ------------------------------
// COMPONENT STARTS
// ------------------------------
export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [hasUserMsg, setHasUserMsg] = useState(false);

  const stored = typeof window !== 'undefined' ? loadMessagesFromStorage() : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  // On mount
  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
  }, []);

  // Track when user sends first message → hide quick-actions
  useEffect(() => {
    const userHasSent = messages.some((m) => m.role === "user");
    setHasUserMsg(userHasSent);
  }, [messages]);

  // Sync to localStorage
  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [messages, durations, isClient]);


  const handleDurationChange = (id: string, duration: number) => {
    setDurations((d) => ({ ...d, [id]: duration }));
  };


  // ------------------------------
  // FORM SETUP
  // ------------------------------
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    setMessages([]);
    setDurations({});
    saveMessagesToStorage([], {});
    toast.success("Chat cleared");
    setHasUserMsg(false);
  }


  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <div className="flex h-screen items-center justify-center font-sans dark:bg-black">
      <main className="w-full dark:bg-black h-screen relative">

        {/* ---------------- TOP HEADER ---------------- */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 dark:bg-black backdrop-blur-xl pb-4">
          <ChatHeader>
            <ChatHeaderBlock />
            <ChatHeaderBlock className="justify-center items-center">
              <Avatar className="size-8 ring-1 ring-primary">
                <AvatarImage src="/logo.png" />
                <AvatarFallback>
                  <Image src="/logo.png" alt="Logo" width={36} height={36} />
                </AvatarFallback>
              </Avatar>
              <p className="tracking-tight">Chat with {AI_NAME}</p>
            </ChatHeaderBlock>
            <ChatHeaderBlock className="justify-end">
              <Button variant="outline" size="sm" onClick={clearChat}>
                {CLEAR_CHAT_TEXT}
              </Button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* ---------------- MAIN SCROLL AREA ---------------- */}
        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[100px] pb-[150px]">

          {/* ---------------- HERO SECTION (only before chatting) ---------------- */}
          {isClient && !hasUserMsg && (
            <section className="w-full flex justify-center mb-5">
              <div className="max-w-4xl w-full rounded-3xl border bg-card p-6 md:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">

                  {/* LEFT SIDE */}
                  <div className="flex-1 space-y-3">
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                      MyAI3 – Digital Marketing Copilot for Small Businesses
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground">
                      Practical, step-by-step help for online marketing — based on books,
                      reports, and trend studies for small and local businesses.
                    </p>

                    <p className="font-semibold">I can help you with:</p>
                    <ul className="space-y-1.5">
                      {helpPoints.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-muted-foreground text-sm">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* RIGHT SIDE */}
                  <div className="w-full md:w-80 space-y-2">
                    <p className="font-semibold">Great first questions:</p>
                    <ul className="space-y-1.5">
                      {heroQuestions.map((q) => (
                        <li key={q} className="flex gap-2 text-muted-foreground text-sm">
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

          {/* ---------------- QUICK ACTION CHIPS (hide after first msg) ---------------- */}
          {isClient && !hasUserMsg && (
            <div className="w-full flex flex-wrap justify-center gap-2 mb-5">
              {quickActions.map((a) => (
                <Button
                  key={a}
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    sendMessage({ text: a });
                    setHasUserMsg(true);
                  }}
                >
                  {a}
                </Button>
              ))}
            </div>
          )}

          {/* ---------------- MESSAGE WALL ---------------- */}
          <div className="flex justify-center">
            <MessageWall
              messages={messages}
              status={status}
              durations={durations}
              onDurationChange={handleDurationChange}
            />
          </div>

          {status === "submitted" && (
            <div className="flex justify-start max-w-3xl w-full">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* ---------------- CHAT INPUT SECTION ---------------- */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 dark:bg-black backdrop-blur-xl pt-6 pb-3 px-5 z-50">
          <div className="max-w-3xl mx-auto w-full">
            <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="message"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="chat-form-message" className="sr-only">
                        Message
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          {...field}
                          id="chat-form-message"
                          className="h-15 pr-16 pl-5 bg-card rounded-[20px]"
                          placeholder="Ask me anything about your small-business marketing (SEO, Instagram, ads, email)…"
                          disabled={status === "streaming"}
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
                            type="submit"
                            disabled={!field.value.trim()}
                            size="icon"
                            className="absolute right-3 top-3 rounded-full"
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                        )}
                        {status === "streaming" && (
                          <Button
                            size="icon"
                            onClick={stop}
                            className="absolute right-3 top-3 rounded-full"
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

            <div className="w-full py-2 text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} {OWNER_NAME} — Powered by{" "}
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
