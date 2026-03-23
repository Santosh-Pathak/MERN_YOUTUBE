import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    videos: [{ type: Schema.Types.ObjectId, ref: "Video" }],
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);

