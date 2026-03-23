import { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description = "", visibility = "private" } = req.body;

    if (!name || !String(name).trim()) {
      throw new ApiError(400, "Playlist name is required");
    }

    const playlist = await Playlist.create({
      owner: req.user._id,
      name: String(name),
      description: String(description || ""),
      visibility: visibility === "public" ? "public" : "private",
      videos: [],
    });

    return res
      .status(201)
      .json(new ApiResponse(201, playlist, "Playlist created successfully"));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }

    if (!req.user || String(req.user._id) !== String(userId)) {
      throw new ApiError(403, "Not authorized");
    }

    const playlists = await Playlist.find({ owner: userId }).sort({ createdAt: -1 });
    return res
      .status(200)
      .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlistId");
    }

    const playlist = await Playlist.findById(playlistId)
      .populate("videos", "title thumbnail views createdAt")
      .populate("owner", "username fullName avatar");

    if (!playlist) {
      throw new ApiError(404, "Playlist not found");
    }

    if (String(playlist.owner?._id) !== String(req.user?._id)) {
      if (playlist.visibility !== "public") {
        throw new ApiError(404, "Playlist not found");
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid playlistId/videoId");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    if (!req.user || String(playlist.owner) !== String(req.user._id)) {
      throw new ApiError(403, "Not authorized");
    }

    const video = await Video.findById(videoId).select("_id isPublished");
    if (!video || (!video.isPublished && playlist.visibility !== "public")) {
      throw new ApiError(404, "Video not found");
    }

    const updated = await Playlist.findByIdAndUpdate(
      playlistId,
      { $addToSet: { videos: videoId } },
      { new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updated, "Video added to playlist"));
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid playlistId/videoId");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    if (!req.user || String(playlist.owner) !== String(req.user._id)) {
      throw new ApiError(403, "Not authorized");
    }

    const updated = await Playlist.findByIdAndUpdate(
      playlistId,
      { $pull: { videos: videoId } },
      { new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updated, "Video removed from playlist"));
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlistId");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    if (!req.user || String(playlist.owner) !== String(req.user._id)) {
      throw new ApiError(403, "Not authorized");
    }

    await Playlist.deleteOne({ _id: playlistId });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description, visibility } = req.body;

    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlistId");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    if (!req.user || String(playlist.owner) !== String(req.user._id)) {
      throw new ApiError(403, "Not authorized");
    }

    if (name !== undefined) {
      if (!String(name).trim()) throw new ApiError(400, "name cannot be empty");
      playlist.name = String(name);
    }
    if (description !== undefined) {
      playlist.description = String(description || "");
    }
    if (visibility !== undefined) {
      playlist.visibility = visibility === "public" ? "public" : "private";
    }

    await playlist.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}