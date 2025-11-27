"use client";

import { UIMessage, ToolCallPart, ToolResultPart } from "ai";
import { Response } from "@/components/ai-elements/response";
import { ReasoningPart } from "./reasoning-part";
import { ToolCall, ToolResult } from "./tool-call";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

/**
 * A sub-component to handle the text part of the message
 */
function AssistantTextPart({ text, isStreaming }: { text: string; isStreaming: boolean }) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="group relative w-full">
            {/* The Markdown Text Response */}
            <Response>{text}</Response>

            {/* Copy Button - Only visible when not streaming and text is long enough */}
            {!isStreaming && text.length > 5 && (
                <div className="mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 ease-in-out">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700/50 hover:border-primary/30 hover:shadow-sm"
                        title="Copy to clipboard"
                    >
                        {isCopied ? (
                            <>
                                <Check className="size-3 text-green-500" />
                                <span className="text-green-600 dark:text-green-400">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy className="size-3" />
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

export function AssistantMessage({ message, status, isLastMessage, durations, onDurationChange }: { message: UIMessage; status?: string; isLastMessage?: boolean; durations?: Record<string, number>; onDurationChange?: (key: string, duration: number) => void }) {
    return (
        <div className="w-full">
            <div className="text-sm flex flex-col gap-4">
                {message.parts.map((part, i) => {
                    const isStreaming = status === "streaming" && isLastMessage && i === message.parts.length - 1;
                    const durationKey = `${message.id}-${i}`;
                    const duration = durations?.[durationKey];

                    if (part.type === "text") {
                        // Use our new clean text component
                        return (
                            <AssistantTextPart 
                                key={`${message.id}-${i}`} 
                                text={part.text} 
                                isStreaming={!!isStreaming} 
                            />
                        );
                    } else if (part.type === "reasoning") {
                        return (
                            <ReasoningPart
                                key={`${message.id}-${i}`}
                                part={part}
                                isStreaming={isStreaming}
                                duration={duration}
                                onDurationChange={onDurationChange ? (d) => onDurationChange(durationKey, d) : undefined}
                            />
                        );
                    } else if (
                        part.type.startsWith("tool-") || part.type === "dynamic-tool"
                    ) {
                        if ('state' in part && part.state === "output-available") {
                            return (
                                <ToolResult
                                    key={`${message.id}-${i}`}
                                    part={part as unknown as ToolResultPart}
                                />
                            );
                        } else {
                            return (
                                <ToolCall
                                    key={`${message.id}-${i}`}
                                    part={part as unknown as ToolCallPart}
                                />
                            );
                        }
                    }
                    return null;
                })}
            </div>
        </div>
    )
}
