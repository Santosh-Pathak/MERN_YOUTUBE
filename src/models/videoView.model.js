import mongoose, { Schema } from "mongoose";

const videoViewSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastViewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Prevent multiple docs per (video,user) so we can debounce cleanly.
videoViewSchema.index({ video: 1, user: 1 }, { unique: true });

export const VideoView = mongoose.model("VideoView", videoViewSchema);

