import { ChatBox } from "@/components/chat/chat-box";
import { prisma } from "@/lib/db/prisma";

interface PageProps {
  params: Promise<{
    chatId: string;
  }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat) {
    return <div>Chat not found</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Chat</h1>

      <ChatBox
        documentId={chat.documentId!}
        chatId={chat.id}
      />
    </div>
  );
}