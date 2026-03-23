import { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const normalizeReactionType = (reactionType) => {
  const val = String(reactionType || "").toLowerCase();
  if (val !== "like" && val !== "dislike") return "like";
  return val;
};

const toggleLikeForTarget = async ({
  where,
  reactionType,
  createFields,
  oppositeReactionType,
}) => {
  const existing = await Like.findOne({ ...where, reactionType });
  if (existing) {
    await Like.deleteOne({ _id: existing._id });
    return { isActive: false, reactionType: null };
  }

  // Mutual exclusivity: remove opposite reaction before creating the new one.
  if (oppositeReactionType) {
    await Like.deleteMany({ ...where, reactionType: oppositeReactionType });
  }

  await Like.create({ ...createFields, reactionType });
  return { isActive: true, reactionType };
};

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const reactionType = normalizeReactionType(
    req.body?.reactionType || req.body?.type
  );
  const oppositeReactionType = reactionType === "like" ? "dislike" : "like";

  const video = await Video.findById(videoId).select("isPublished");
  if (!video) throw new ApiError(404, "Video not found");
  if (!video.isPublished) throw new ApiError(404, "Video not found");

  const result = await toggleLikeForTarget({
    where: { video: videoId, likedBy: req.user._id },
    reactionType,
    oppositeReactionType,
    createFields: { video: videoId, likedBy: req.user._id },
  });

  return res.status(200).json(new ApiResponse(200, result, "Video reaction updated successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const existing = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
    reactionType: "like",
  });

  if (existing) {
    await Like.deleteOne({ _id: existing._id });
    return res
      .status(200)
      .json(new ApiResponse(200, { isActive: false }, "Comment unliked successfully"));
  }

  await Like.create({
    comment: commentId,
    likedBy: req.user._id,
    reactionType: "like",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { isActive: true }, "Comment liked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }

  const existing = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
    reactionType: "like",
  });

  if (existing) {
    await Like.deleteOne({ _id: existing._id });
    return res
      .status(200)
      .json(new ApiResponse(200, { isActive: false }, "Tweet unliked successfully"));
  }

  await Like.create({
    tweet: tweetId,
    likedBy: req.user._id,
    reactionType: "like",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { isActive: true }, "Tweet liked successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.max(Number(limit) || 12, 1);
  const skip = (pageNum - 1) * limitNum;

  const [total, likedLikes] = await Promise.all([
    Like.countDocuments({ likedBy: req.user._id, reactionType: "like" }),
    Like.find({ likedBy: req.user._id, reactionType: "like" })
      .populate({
        path: "video",
        select: "title thumbnail views duration isPublished createdAt owner",
        populate: { path: "owner", select: "username fullName avatar" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
  ]);

  const likedVideos = likedLikes.map((l) => l.video).filter(Boolean);

  return res.status(200).json(
    new ApiResponse(
      200,
      { likedVideos, total, page: pageNum, limit: limitNum },
      "Liked videos fetched successfully"
    )
  );
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
};

