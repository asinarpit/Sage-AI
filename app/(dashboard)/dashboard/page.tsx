"use client";

import { useState } from "react";
import { SourceSelector } from "@/components/documents/source-selector";
import { ChatInterface } from "@/components/chat/chat-interface";
import { Button } from "@/components/ui/button";
import { LucidePlus, LucideZap, LucideInfo, LucideSparkles, LucideMenu, LucideX, LucideLoader2, LucideTrash2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

export default function WorkspacePage() {
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverBin, setIsOverBin] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUrlIngest = async () => {
    if (!urlInput.trim()) return;
    setIsIngesting(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        body: JSON.stringify({ url: urlInput }),
      });
      if (res.ok) {
        toast.success("Source ingested successfully.");
        setUrlInput("");
        window.location.reload();
      }
    } catch (err) {
      toast.error("Failed to ingest source.");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsIngesting(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }
      toast.success(`${files.length} files uploaded and processed.`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverBin(false);
    setIsDragging(false);

    const docId = e.dataTransfer.getData("documentId");
    if (!docId) return;

    setDocToDelete(docId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${docToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Source deleted successfully.");
        window.location.reload();
      } else {
        toast.error("Failed to delete source.");
      }
    } catch (err) {
      toast.error("An error occurred during deletion.");
    } finally {
      setIsDeleting(false);
      setDocToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverBin(true);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full bg-background relative">

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-sidebar border-r flex flex-col p-4 md:p-6 space-y-6 overflow-hidden 
        shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.02)]
        transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold tracking-tight text-foreground">Workspace</h1>
            <p className="text-[11px] text-muted-foreground/80 font-medium">Knowledge Base</p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-lg h-8 w-8 border-primary/20 hover:bg-primary/5 transition-colors"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <LucidePlus className="w-4 h-4 text-primary" />
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg">Add Knowledge Source</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="pdf" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-muted/50 rounded-lg">
                    <TabsTrigger value="pdf" className="text-xs rounded-md">PDF</TabsTrigger>
                    <TabsTrigger value="url" className="text-xs rounded-md">URL</TabsTrigger>
                  </TabsList>
                  <TabsContent value="pdf" className="space-y-4 pt-4">
                    <div className={`border-2 border-dashed border-primary/10 rounded-2xl p-8 text-center space-y-4 transition-all relative group ${isIngesting ? "opacity-60 cursor-wait" : "hover:border-primary/30 hover:bg-primary/5 cursor-pointer"}`}>
                      {!isIngesting && (
                        <Input
                          type="file"
                          accept=".pdf"
                          multiple
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                      )}
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                        {isIngesting ? (
                          <LucideLoader2 className="w-5 h-5 text-primary animate-spin" />
                        ) : (
                          <LucidePlus className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {isIngesting ? "Processing Documents..." : "Upload PDF(s)"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {isIngesting ? "Generating embeddings and syncing..." : "Max 10MB each • Drag & drop"}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="url" className="space-y-3 pt-4">
                    <div className="space-y-2">
                      <Input
                        placeholder="https://example.com/article"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="h-10 rounded-xl border-primary/10 focus-visible:ring-primary/20"
                      />
                      <Button
                        className="w-full h-10 rounded-xl shadow-sm"
                        onClick={handleUrlIngest}
                        disabled={isIngesting || !urlInput}
                      >
                        {isIngesting ? (
                          <>
                            <LucideLoader2 className="w-4 h-4 mr-2 animate-spin" />
                            Ingesting...
                          </>
                        ) : (
                          "Ingest URL"
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                </Tabs>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-lg h-8 w-8 hover:bg-muted/50"
              onClick={() => setIsSidebarOpen(false)}
            >
              <LucideX className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden -mx-2 px-2 relative">
          <SourceSelector
            onSelectionChange={setSelectedSourceIds}
            onDragStateChange={setIsDragging}
          />

          <div className="absolute -bottom-10 -left-10 w-64 h-64 opacity-[0.1] dark:opacity-[0.1] pointer-events-none -rotate-12 select-none">
            <img
              src="/sage-logo.svg"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="p-3 bg-primary/[0.03] rounded-xl border border-primary/10 flex gap-3 group hover:bg-primary/[0.05] transition-colors relative z-10">
          <LucideZap className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
          <div className="text-[11px] space-y-0.5">
            <p className="font-bold text-foreground">Pro Tip</p>
            <p className="text-muted-foreground/90 leading-normal">
              Select multiple sources to compare information across documents.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden bg-background relative">
        <header className="flex items-center justify-between pb-4 md:pb-6 shrink-0 border-b md:border-none mb-4 md:mb-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-lg h-9 w-9 hover:bg-muted/50 -ml-1"
              onClick={() => setIsSidebarOpen(true)}
            >
              <LucideMenu className="w-5 h-5 text-foreground" />
            </Button>
            <div className="h-5 md:h-8 flex items-center">
              <img
                src="/sage-full-logo.svg"
                alt="Sage"
                className="h-full w-auto object-contain dark:invert-0"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <ThemeToggle />
              <div className="h-6 w-px bg-border mx-1" />
            </div>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded-lg" } }} />
          </div>
        </header>

        <div
          className="flex-1 min-h-0 rounded-3xl md:rounded-[3rem] border border-primary/10 shadow-xl overflow-hidden relative"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          >
            <source src="/mp_.mp4" type="video/mp4" />
          </video>
          <div className="relative z-10 h-full p-2 md:p-4">
            <ChatInterface
              selectedSourceIds={selectedSourceIds}
              onAddSource={() => setIsDialogOpen(true)}
            />
          </div>
        </div>
      </div>

      {isDragging && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-end justify-center pb-20 animate-in fade-in slide-in-from-bottom-10 duration-300">
          <div
            className={`
              pointer-events-auto w-56 h-28 rounded-[2rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-2
              ${isOverBin
                ? "bg-destructive/10 border-destructive scale-105"
                : "bg-background/40 backdrop-blur-xl border-foreground/10 shadow-2xl"
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsOverBin(false)}
            onDrop={handleDrop}
          >
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${isOverBin ? "bg-destructive text-white scale-110 rotate-6" : "bg-muted/50 text-muted-foreground"}`}>
              <LucideTrash2 className="w-6 h-6" />
            </div>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isOverBin ? "text-destructive" : "text-muted-foreground/60"}`}>
              {isOverBin ? "Drop now" : "Drag to Delete"}
            </p>
          </div>
        </div>
      )}

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 border-destructive/20">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <LucideTrash2 className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="text-xl font-bold text-center">Delete Source?</DialogTitle>
            <p className="text-sm text-muted-foreground text-center px-2">
              This action cannot be undone. All associated text chunks and semantic insights will be permanently removed.
            </p>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button 
              variant="destructive" 
              className="h-11 rounded-xl font-bold"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <LucideLoader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Confirm Deletion"
              )}
            </Button>
            <Button 
              variant="ghost" 
              className="h-11 rounded-xl text-muted-foreground"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}