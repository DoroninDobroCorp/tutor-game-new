import prisma from "../db";
import { WebSocketService } from "./websocket.service";
import { Role } from "@prisma/client";

export const createAndSendMessage = async (
  wsService: WebSocketService,
  senderId: string,
  recipientId: string,
  content: string,
) => {
  try {
    // 1. Create message in DB
    const newMessage = await prisma.message.create({
      data: { content, senderId, recipientId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // 2. Format message for frontend
    const formattedMessage = {
      id: newMessage.id,
      recipientId: newMessage.recipientId,
      senderId: newMessage.senderId,
      senderName:
        `${newMessage.sender.firstName || ""} ${newMessage.sender.lastName || ""}`.trim(),
      senderRole: newMessage.sender.role.toLowerCase() as "student" | "teacher",
      content: newMessage.content,
      timestamp: newMessage.createdAt.toISOString(),
      read: newMessage.read,
    };

    // 3. Emit to both users, so they see the message in real-time
    wsService.emitToUser(senderId, "message", formattedMessage);
    wsService.emitToUser(recipientId, "message", formattedMessage);

    console.log(
      `[Chat Service] Sent system message from ${senderId} to ${recipientId}`,
    );

    return newMessage;
  } catch (error) {
    console.error(
      `[Chat Service] Failed to send system message from ${senderId} to ${recipientId}`,
      error,
    );
    // We don't want to throw an error and stop the main request, so just log it.
  }
};
