"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { LucideFileText, LucideGlobe, LucideSearch, LucideLoader2, LucidePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Document {
  id: string;
  title: string;
  type: "PDF" | "URL" | "NOTE";
  createdAt: string;
}

export function SourceSelector({ 
  onSelectionChange 
}: { 
  onSelectionChange: (ids: string[]) => void 
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data);
        setLoading(false);
      });
  }, []);

  const toggleDocument = (id: string) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    
    setSelectedIds(newSelection);
    onSelectionChange(newSelection);
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold tracking-tight text-foreground">Active Sources</h2>
        <Badge variant="secondary" className="rounded-md text-[10px] font-bold bg-primary/10 text-primary border-none py-0 h-5">
          {selectedIds.length}
        </Badge>
      </div>

      <div className="relative group px-1">
        <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Filter sources..." 
          className="pl-9 h-9 bg-background border-primary/10 focus-visible:ring-primary/20 rounded-xl text-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2.5 pb-4 px-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
            ))
          ) : filteredDocs.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3 opacity-40">
              <LucideFileText className="w-10 h-10 text-primary/40" />
              <p className="text-[11px] font-medium">No results found</p>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => toggleDocument(doc.id)}
                className={`group flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer w-full overflow-hidden ${
                  selectedIds.includes(doc.id) 
                    ? "bg-primary/[0.04] border-primary/30 shadow-sm" 
                    : "bg-transparent border-transparent hover:bg-primary/[0.02] hover:border-primary/10"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border transition-colors ${
                  selectedIds.includes(doc.id)
                    ? "bg-primary text-primary-foreground border-primary/20"
                    : "bg-background text-primary border-primary/5 group-hover:border-primary/20"
                }`}>
                  {doc.type === "PDF" ? (
                    <LucideFileText className="w-4 h-4" />
                  ) : doc.type === "URL" ? (
                    <LucideGlobe className="w-4 h-4" />
                  ) : (
                    <LucidePlus className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-[12px] font-bold text-foreground truncate leading-tight">{doc.title}</p>
                  <p className="text-[9px] text-muted-foreground font-medium truncate mt-0.5 uppercase tracking-tighter">
                    {doc.type} • {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Checkbox 
                  checked={selectedIds.includes(doc.id)} 
                  className={`h-4 w-4 rounded-full transition-all shrink-0 ${
                    selectedIds.includes(doc.id)
                      ? "border-primary bg-primary"
                      : "opacity-0 group-hover:opacity-100 border-primary/30"
                  }`}
                />
              </div>
            ))
          )}
        </div>
      </ScrollArea>

    </div>

  );
}
