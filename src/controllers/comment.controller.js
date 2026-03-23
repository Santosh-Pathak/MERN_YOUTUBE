import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid videoId");
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const [topLevelComments, total] = await Promise.all([
      Comment.find({ video: videoId, replyTo: null })
        .populate("owner", "username fullName avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Comment.countDocuments({ video: videoId, replyTo: null }),
    ]);

    const topIds = topLevelComments.map((c) => c._id);

    const replies = await Comment.find({
      video: videoId,
      replyTo: { $in: topIds },
    })
      .populate("owner", "username fullName avatar")
      .sort({ createdAt: 1 });

    const repliesByParent = new Map();
    for (const r of replies) {
      const key = String(r.replyTo);
      if (!repliesByParent.has(key)) repliesByParent.set(key, []);
      repliesByParent.get(key).push(r);
    }

    const commentsWithReplies = topLevelComments.map((c) => {
      const key = String(c._id);
      return { ...c.toObject(), replies: repliesByParent.get(key) || [] };
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        { comments: commentsWithReplies, total, page: pageNum, limit: limitNum },
        "Video comments fetched successfully"
      )
    );
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content, replyTo } = req.body;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid videoId");
    }
    if (!content || !String(content).trim()) {
      throw new ApiError(400, "content is required");
    }

    let replyToId = null;
    if (replyTo) {
      if (!isValidObjectId(replyTo)) {
        throw new ApiError(400, "Invalid replyTo commentId");
      }
      const parent = await Comment.findById(replyTo).select("video");
      if (!parent) {
        throw new ApiError(404, "Parent comment not found");
      }
      if (String(parent.video) !== String(videoId)) {
        throw new ApiError(400, "Parent comment does not belong to this video");
      }
      replyToId = replyTo;
    }

    const created = await Comment.create({
      content: String(content),
      video: videoId,
      owner: req.user._id,
      replyTo: replyToId,
    });

    const populated = await created.populate("owner", "username fullName avatar");

    return res.status(201).json(
      new ApiResponse(201, populated, "Comment added successfully")
    );
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(commentId)) {
      throw new ApiError(400, "Invalid commentId");
    }
    if (!content || !String(content).trim()) {
      throw new ApiError(400, "content is required");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");
    if (!comment.owner || String(comment.owner) !== String(req.user._id)) {
      throw new ApiError(403, "Not authorized to update this comment");
    }

    comment.content = String(content);
    await comment.save({ validateBeforeSave: false });

    const populated = await Comment.findById(commentId).populate(
      "owner",
      "username fullName avatar"
    );

    return res.status(200).json(
      new ApiResponse(200, populated, "Comment updated successfully")
    );
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
      throw new ApiError(400, "Invalid commentId");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    if (!comment.owner || String(comment.owner) !== String(req.user._id)) {
      throw new ApiError(403, "Not authorized to delete this comment");
    }

    // Remove likes on this comment.
    await Like.deleteMany({ comment: commentId });

    // If this is a top-level comment, also delete its direct replies (one level).
    const replyIds = await Comment.find({ replyTo: commentId }).select("_id");
    const replyIdList = replyIds.map((d) => d._id);
    if (replyIdList.length > 0) {
      await Like.deleteMany({ comment: { $in: replyIdList } });
      await Comment.deleteMany({ replyTo: commentId });
    }

    await Comment.deleteOne({ _id: commentId });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment deleted successfully"));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }