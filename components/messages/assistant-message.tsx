"use client";

import { UIMessage, ToolCallPart, ToolResultPart } from "ai";
import { Response } from "@/components/ai-elements/response";
import { ReasoningPart } from "./reasoning-part";
import { ToolCall, ToolResult } from "./tool-call";
import { useState } from "react";
import { Check, Copy, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

/**
 * A sub-component to handle the text part of the message
 * This allows us to manage the "Copy" state independently for each block
 */
function AssistantTextPart({ text, isStreaming }: { text: string; isStreaming: boolean }) {
    const [isCopied, setIsCopied] = useState(false);
@@ -28,11 +27,9 @@
            {/* The Markdown Text Response */}
            <Response>{text}</Response>

            {/* Premium Action Toolbar (Visible on Hover or Mobile) */}
            {/* Copy Button - Only visible when not streaming and text is long enough */}
            {!isStreaming && text.length > 5 && (
                <div className="mt-3 flex items-center gap-3 border-t border-gray-100 dark:border-gray-800 pt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 ease-in-out">
                    
                    {/* Copy Button */}
                <div className="mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 ease-in-out">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700/50 hover:border-primary/30 hover:shadow-sm"
@@ -50,18 +47,6 @@
                            </>
                        )}
                    </button>

                    <div className="flex-1"></div>

                    {/* Feedback Buttons (Visual Only - Adds 'Pro' Feel) */}
                    <div className="flex items-center gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors" title="Good response">
                            <ThumbsUp className="size-3" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Bad response">
                            <ThumbsDown className="size-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
@@ -78,46 +63,46 @@
                    const duration = durations?.[durationKey];

                    if (part.type === "text") {
                        // Use our new premium text component
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
