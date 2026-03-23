import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    channel: { type: Schema.Types.ObjectId, ref: "User", required: true },
    video: { type: Schema.Types.ObjectId, ref: "Video", required: true },
    type: {
      type: String,
      enum: ["new_video"],
      default: "new_video",
    },
    message: { type: String, default: "" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One notification per user/video pair (avoid duplicates).
notificationSchema.index({ user: 1, video: 1 }, { unique: true });

export const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

