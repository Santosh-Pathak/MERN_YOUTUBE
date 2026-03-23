import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// NOTE: Step 1 only needs the server to boot and auth endpoints to work.
// These handlers are placeholders for now (no TODO blocks / no syntax errors).

const toggleVideoLike = asyncHandler(async (req, res) => {
  throw new ApiError(501, "toggleVideoLike not implemented yet");
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  throw new ApiError(501, "toggleCommentLike not implemented yet");
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  throw new ApiError(501, "toggleTweetLike not implemented yet");
});

const getLikedVideos = asyncHandler(async (req, res) => {
  throw new ApiError(501, "getLikedVideos not implemented yet");
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
};

