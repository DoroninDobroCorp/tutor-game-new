import { Request, Response } from "express";
import { AppError } from "../utils/errors";
import prisma from "../db";

export const getUnreadSummary = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Not authenticated", 401);
  }
  const currentUserId = req.user.userId;

  try {
    const unreadCounts = await prisma.message.groupBy({
      by: ["senderId"],
      where: {
        recipientId: currentUserId,
        read: false,
      },
      _count: {
        id: true,
      },
    });

    const summary = unreadCounts.reduce(
      (acc, item) => {
        acc[item.senderId] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching unread summary:", error);
    throw new AppError("Failed to get unread message summary", 500);
  }
};
