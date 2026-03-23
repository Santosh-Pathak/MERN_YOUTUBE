import { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { VideoView } from "../models/videoView.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadInCloudinary } from "../utils/cloudinary.js";

const parseNumberOrDefault = (value, defaultValue) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
};

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean);
  }
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
};

const canAccessUnpublishedVideo = (video, reqUser) => {
  if (!video || video.isPublished) return true;
  if (!reqUser) return false;
  return String(video.owner?._id || video.owner) === String(reqUser._id);
};

const incrementViewsDebounced = async (video, req) => {
  // Debounce only for authenticated users.
  if (!req.user?._id) {
    video.views += 1;
    await video.save({ validateBeforeSave: false });
    return;
  }

  const now = new Date();
  const viewWindowMs = 30 * 1000;

  const existingView = await VideoView.findOne({
    video: video._id,
    user: req.user._id,
  });

  if (!existingView) {
    await VideoView.create({
      video: video._id,
      user: req.user._id,
      lastViewedAt: now,
    });
    video.views += 1;
    await video.save({ validateBeforeSave: false });
    return;
  }

  const last = existingView.lastViewedAt || new Date(0);
  if (now.getTime() - last.getTime() >= viewWindowMs) {
    existingView.lastViewedAt = now;
    await existingView.save({ validateBeforeSave: false });
    video.views += 1;
    await video.save({ validateBeforeSave: false });
  }
};

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    category,
    tags,
  } = req.query;

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.max(Number(limit) || 12, 1);
  const skip = (pageNum - 1) * limitNum;

  const sort = { [sortBy]: sortType === "asc" ? 1 : -1 };

  const filters = { isPublished: true };

  if (query) {
    filters.title = { $regex: String(query), $options: "i" };
  }
  if (category) {
    filters.category = String(category);
  }
  if (tags) {
    const tagList = parseTags(tags);
    if (tagList.length > 0) {
      filters.tags = { $in: tagList };
    }
  }

  const [videos, total] = await Promise.all([
    Video.find(filters)
      .populate("owner", "username fullName avatar")
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Video.countDocuments(filters),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videos, total, page: pageNum, limit: limitNum },
        "Videos fetched successfully"
      )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, category, tags, duration } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "title and description are required");
  }

  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath) throw new ApiError(400, "videoFile is required");
  if (!thumbnailLocalPath)
    throw new ApiError(400, "thumbnail is required");

  const uploadedVideo = await uploadInCloudinary(videoLocalPath);
  const uploadedThumbnail = await uploadInCloudinary(thumbnailLocalPath);

  if (!uploadedVideo?.url || !uploadedThumbnail?.url) {
    throw new ApiError(400, "Video/thumbnail upload failed");
  }

  const created = await Video.create({
    title,
    description,
    category: category ? String(category) : "",
    tags: parseTags(tags),
    duration: duration ? parseNumberOrDefault(duration, 0) : 0,
    videoFile: uploadedVideo.url,
    thumbnail: uploadedThumbnail.url,
    owner: req.user._id,
    isPublished: true,
  });

  return res.status(201).json(
    new ApiResponse(201, created, "Video published successfully")
  );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "username fullName avatar"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!canAccessUnpublishedVideo(video, req.user)) {
    throw new ApiError(404, "Video not found");
  }

  await incrementViewsDebounced(video, req);

  const [likeCount, dislikeCount] = await Promise.all([
    Like.countDocuments({ video: video._id, reactionType: "like" }),
    Like.countDocuments({ video: video._id, reactionType: "dislike" }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      { video, likeCount, dislikeCount },
      "Video fetched successfully"
    )
  );
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  if (!req.user || String(video.owner) !== String(req.user._id)) {
    throw new ApiError(403, "Not authorized to update this video");
  }

  const { title, description, category, tags, duration } = req.body;

  if (title) video.title = title;
  if (description) video.description = description;
  if (category) video.category = String(category);
  if (tags !== undefined) video.tags = parseTags(tags);
  if (duration !== undefined)
    video.duration = parseNumberOrDefault(duration, 0);

  if (req.file?.path) {
    const uploadedThumbnail = await uploadInCloudinary(req.file.path);
    if (!uploadedThumbnail?.url) {
      throw new ApiError(400, "Thumbnail upload failed");
    }
    video.thumbnail = uploadedThumbnail.url;
  }

  await video.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  if (!req.user || String(video.owner) !== String(req.user._id)) {
    throw new ApiError(403, "Not authorized to delete this video");
  }

  await VideoView.deleteMany({ video: video._id });
  await video.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  if (!req.user || String(video.owner) !== String(req.user._id)) {
    throw new ApiError(403, "Not authorized to update publish status");
  }

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(200, video, "Publish status updated successfully")
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};