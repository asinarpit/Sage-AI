"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewDocumentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleUpload = async () => {
    if (!file) return;

    try {
      setLoading(true);


      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      const chatRes = await fetch("/api/chat/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: uploadData.documentId,
        }),
      });

      const chatData = await chatRes.json();

      router.push(`/chat/${chatData.chatId}`);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Upload Document</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="border p-2 w-full"
      />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="bg-black text-white px-4 py-2 w-full"
      >
        {loading ? "Uploading..." : "Upload & Chat"}
      </button>
    </div>
  );
}