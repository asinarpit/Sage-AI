"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import {
  LucideSend,
  LucideUser,
  LucideLoader2,
  LucideSparkles,
  LucideFileText,
  LucideGlobe,
  LucideBookOpen,
  LucideWrench,
  LucidePlus,
  LucideAlertTriangle,
  LucideRefreshCcw,
} from "lucide-react";

interface Source {
  id: string;
  title: string;
  type: string;
  sourceUrl: string;
  snippet: string;
}

export function ChatInterface({
  selectedSourceIds,
  onAddSource,
}: {
  selectedSourceIds: string[];
  onAddSource?: () => void;
}) {
  const { user } = useUser();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    []
  );

  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || selectedSourceIds.length === 0 || isLoading) return;

    sendMessage({ text: input }, { body: { documentIds: selectedSourceIds } });
    setInput("");
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "URL":
        return <LucideGlobe className="w-3 h-3" />;
      case "NOTE":
        return <LucideBookOpen className="w-3 h-3" />;
      default:
        return <LucideFileText className="w-3 h-3" />;
    }
  };

  // Extract source names from the AI response text as a reliable fallback
  const extractSourcesFromText = (msg: UIMessage): string[] => {
    const textContent = msg.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as any).text || "")
      .join("");

    const sourceRegex = /\[Source:\s*([^\]]+)\]/g;
    const found: string[] = [];
    let match;
    while ((match = sourceRegex.exec(textContent)) !== null) {
      const name = match[1].trim();
      if (!found.includes(name)) found.push(name);
    }
    return found;
  };

  const renderSources = (msg: UIMessage) => {
    // Try metadata first
    const msgMeta = msg.metadata as { sources?: Source[] } | undefined;
    const metaSources = msgMeta?.sources;

    if (metaSources && metaSources.length > 0) {
      const uniqueSources = metaSources.filter(
        (s, i, arr) => arr.findIndex((x) => x.title === s.title) === i
      );

      return (
        <div className="mt-4 pt-4 border-t border-primary/10">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold mb-2.5">
            Citations
          </p>
          <div className="flex flex-wrap gap-2">
            {uniqueSources.map((source) => (
              <Badge
                key={source.id}
                variant="secondary"
                className="text-[10px] gap-1.5 py-1 px-2.5 rounded-md bg-primary/[0.03] hover:bg-primary/[0.08] text-foreground/80 border-none transition-all cursor-pointer"
                title={source.snippet}
              >
                {getSourceIcon(source.type)}
                <span className="max-w-[120px] truncate">{source.title}</span>
              </Badge>
            ))}
          </div>
        </div>
      );
    }

    // Fallback: parse [Source: ...] from the AI text
    const parsedNames = extractSourcesFromText(msg);
    if (parsedNames.length === 0) return null;

    return (
      <div className="mt-4 pt-4 border-t border-primary/10">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold mb-2.5">
          Citations
        </p>
        <div className="flex flex-wrap gap-2">
          {parsedNames.map((name, i) => (
            <Badge
              key={`parsed-${i}`}
              variant="secondary"
              className="text-[10px] gap-1.5 py-1 px-2.5 rounded-md bg-primary/[0.03] hover:bg-primary/[0.08] text-foreground/80 border-none transition-all cursor-pointer"
            >
              <LucideFileText className="w-3 h-3" />
              <span className="max-w-[120px] truncate">{name}</span>
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-full border-none bg-card/80 backdrop-blur-xl shadow-none rounded-3xl md:rounded-[2rem] overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full px-4 md:px-6" viewportRef={scrollRef}>
          <div className="flex flex-col gap-8 py-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary/20 via-primary/5 to-primary/30 border border-primary/20 flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform duration-500">
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                  <img src="/sage-logo.svg" alt="Sage Logo" className="w-11 h-11 drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)] animate-pulse" />
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Workspace Intelligence</h3>
                    <p className="text-[11px] text-muted-foreground max-w-[240px] mx-auto leading-normal">
                      Ready to analyze your selected knowledge sources. Ask anything to begin.
                    </p>
                  </div>
                  
                  {onAddSource && (
                    <Button 
                      onClick={onAddSource}
                      variant="outline" 
                      className="md:hidden rounded-xl h-10 gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all active:scale-95"
                    >
                      <LucidePlus className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-primary">Add Source</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 md:gap-4 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                } group animate-in`}
              >
                <div className="shrink-0 mt-0.5">
                  {msg.role === "user" ? (
                    user?.imageUrl ? (
                      <img 
                        src={user.imageUrl} 
                        alt="Profile" 
                        className="w-7 h-7 md:w-8 md:h-8 rounded-lg object-cover shadow-sm ring-1 ring-primary/10"
                      />
                    ) : (
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                        <LucideUser className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </div>
                    )
                  ) : (
                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-sidebar via-background to-sidebar-accent border border-primary/15 flex items-center justify-center shadow-[0_4px_10px_-2px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden relative group">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img src="/sage-logo.svg" alt="Sage" className="w-4.5 h-4.5 md:w-5.5 md:h-5.5 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)] relative z-10" />
                    </div>
                  )}
                </div>
                
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none border border-primary/10"
                      : "bg-background border border-primary/5 rounded-tl-none"
                  }`}
                >
                  {/* Render message parts */}
                  {msg.parts.map((part, i) => {
                    if (part.type === "text") {
                      if (msg.role === "assistant" && part.text) {
                        return (
                          <div key={`${msg.id}-${i}`} className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-code:bg-muted/50 prose-code:rounded prose-code:text-[11px] prose-pre:bg-muted/30 prose-pre:rounded-xl">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({ ...props }) => (
                                  <div className="my-6 w-full overflow-hidden rounded-xl border border-primary/10 shadow-sm">
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-left" {...props} />
                                    </div>
                                  </div>
                                ),
                                thead: ({ ...props }) => (
                                  <thead className="bg-primary/[0.04] border-b border-primary/10" {...props} />
                                ),
                                th: ({ ...props }) => (
                                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80" {...props} />
                                ),
                                td: ({ ...props }) => (
                                  <td className="px-4 py-3 text-[12px] border-b border-primary/5 last:border-0 font-medium" {...props} />
                                ),
                                tr: ({ ...props }) => (
                                  <tr className="hover:bg-primary/[0.02] transition-colors last:border-0" {...props} />
                                ),
                              }}
                            >
                              {part.text}
                            </ReactMarkdown>
                          </div>
                        );
                      }
                      return (
                        <p key={`${msg.id}-${i}`} className="text-[13px] md:text-sm font-medium leading-relaxed">
                          {part.text || (
                            <span className="flex gap-1 py-1">
                              <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" />
                              <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                              <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                            </span>
                          )}
                        </p>
                      );
                    }
                    
                    if (isToolUIPart(part)) {
                      const toolName = part.type.startsWith("tool-")
                        ? part.type.replace("tool-", "")
                        : "tool";
                      const isDone = part.state === "output-available";
                      
                      const labels: Record<string, string> = {
                        summarizeDocument: "Summarizing document",
                        compareDocuments: "Comparing documents",
                        extractInsights: "Extracting insights",
                        webSearch: "Searching the web",
                      };
                      const label = labels[toolName] || toolName;

                      return (
                        <div
                          key={`${msg.id}-tool-${i}`}
                          className="flex items-center gap-2.5 px-3 py-2 my-2 rounded-xl bg-primary/[0.02] border border-primary/5 text-[11px] font-semibold text-muted-foreground"
                        >
                          {isDone ? (
                            <LucideWrench className="w-3 h-3 text-primary" />
                          ) : (
                            <LucideLoader2 className="w-3 h-3 text-primary animate-spin" />
                          )}
                          <span>{label}{isDone ? " completed" : "..."}</span>
                        </div>
                      );
                    }
                    return null;
                  })}

                  {/* Source Citations */}
                  {msg.role === "assistant" && renderSources(msg)}
                </div>
              </div>
            ))}

            {status === "submitted" &&
              messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3 md:gap-4 flex-row animate-in">
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-sidebar via-background to-sidebar-accent border border-primary/15 flex items-center justify-center shadow-[0_4px_10px_-2px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.1)] shrink-0 overflow-hidden relative">
                    <img src="/sage-logo.svg" alt="Sage" className="w-4.5 h-4.5 md:w-5.5 md:h-5.5 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)] relative z-10" />
                  </div>
                  <div className="bg-background border border-primary/5 shadow-sm rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex gap-1 py-1">
                      <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" />
                      <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

            {/* Error Message rendering */}
            {error && (
              <div className="flex gap-3 md:gap-4 flex-row animate-in slide-in-from-bottom-2 duration-300">
                <div className="w-7 h-7 md:w-9 md:h-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                  <LucideAlertTriangle className="w-4 h-4 md:w-5 h-5 text-destructive" />
                </div>
                <div className="flex flex-col gap-2 max-w-[85%]">
                  <div className="bg-destructive/5 border border-destructive/10 rounded-2xl rounded-tl-none px-4 py-3">
                    <p className="text-xs md:text-sm text-destructive font-medium leading-relaxed">
                      {error.message.includes("429") || error.message.toLowerCase().includes("quota")
                        ? "Sage's brain is taking a breather (API Quota/Rate Limit reached). Please try again in a moment."
                        : "Something went wrong while connecting to Sage. Please try again."}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
                      if (lastUserMessage) {
                        const textContent = lastUserMessage.parts
                          .filter(p => p.type === 'text')
                          .map(p => p.text)
                          .join('');

                        sendMessage(
                          { text: textContent },
                          { body: { documentIds: selectedSourceIds } }
                        );
                      }
                    }}
                    className="w-fit gap-2 text-xs border-destructive/20 hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <LucideRefreshCcw className="w-3 h-3" />
                    Retry Message
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="p-4 md:p-6 bg-background/50 border-t border-primary/5">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center bg-background border border-primary/10 rounded-2xl px-3 py-1.5 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/20"
        >
          <div className="flex items-center gap-2 shrink-0 pr-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary">
              <LucideSparkles className="w-4 h-4 text-primary animate-pulse" />
            </Button>
          </div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedSourceIds.length > 0
                ? "Send a message..."
                : "Select sources to begin..."
            }
            disabled={selectedSourceIds.length === 0 || isLoading}
            className="border-none shadow-none focus-visible:ring-0 bg-transparent h-10 text-sm font-medium pr-10"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || selectedSourceIds.length === 0 || isLoading}
            className="h-8 w-8 text-white rounded-xl bg-gradient-to-b from-primary/90 to-primary shadow-[0_2px_5px_-1px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)] dark:shadow-[0_0_15px_rgba(16,185,129,0.2),inset_0_1px_1px_rgba(255,255,255,0.4)] border-t border-white/20 hover:scale-105 active:scale-95 active:shadow-inner transition-all"
          >
            {isLoading ? (
              <LucideLoader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LucideSend className="w-3.5 h-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
