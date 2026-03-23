import { isValidObjectId } from "mongoose";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, unreadOnly } = req.query;
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.max(Number(limit) || 12, 1);
  const skip = (pageNum - 1) * limitNum;

  const filter = { user: req.user._id };
  if (unreadOnly === "true" || unreadOnly === true) {
    filter.isRead = false;
  }

  const [unreadCount, total, items] = await Promise.all([
    Notification.countDocuments({ user: req.user._id, isRead: false }),
    Notification.countDocuments(filter),
    Notification.find(filter)
      .populate("channel", "username fullName avatar")
      .populate("video", "title thumbnail views createdAt owner")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        unreadCount,
        notifications: items,
        total,
        page: pageNum,
        limit: limitNum,
      },
      "Notifications fetched successfully"
    )
  );
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "All notifications marked as read"));
});

const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  if (!isValidObjectId(notificationId)) {
    throw new ApiError(400, "Invalid notificationId");
  }

  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, user: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!updated) {
    throw new ApiError(404, "Notification not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Notification marked as read"));
});

export { getMyNotifications, markAllAsRead, markAsRead };

