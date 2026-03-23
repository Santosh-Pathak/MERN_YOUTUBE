import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadInCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getCookieOptions = (isRefreshToken = false) => {
  const isProduction = process.env.NODE_ENV === "production";

  if (isRefreshToken) {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/api/v1/users/refresh-token",
    };
  }

  return {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
  };
};

const signAndPersistTokens = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, userName, password } = req.body;

  if (!fullName || !email || !userName || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username: userName }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists with email/username");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadInCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadInCloudinary(coverImageLocalPath)
    : null;

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
  }

  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    username: userName.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;

  if ((!email && !userName) || !password) {
    throw new ApiError(400, "Email/username and password are required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username: userName }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isValidPassword = await user.isPasswordCorrect(password);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid password/credentials");
  }

  const { accessToken, refreshToken } = await signAndPersistTokens(user);

  const refreshCookieOptions = getCookieOptions(true);
  const accessCookieOptions = getCookieOptions(false);

  res
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: await User.findById(user._id).select("-password -refreshToken"), accessToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  res
    .clearCookie("refreshToken", getCookieOptions(true))
    .clearCookie("accessToken", getCookieOptions(false))
    .status(200)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request: missing refresh token");
  }

  const refreshSecret =
    process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET;

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, refreshSecret);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decoded?.id);
  if (!user) {
    throw new ApiError(401, "Invalid refresh token user");
  }

  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Refresh token expired or used");
  }

  const newAccessToken = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  res
    .cookie("refreshToken", newRefreshToken, getCookieOptions(true))
    .cookie("accessToken", newAccessToken, getCookieOptions(false))
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken: newAccessToken },
        "Access token refreshed successfully"
      )
    );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldpassword, newpassword } = req.body;

  if (!oldpassword || !newpassword) {
    throw new ApiError(400, "oldpassword and newpassword are required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isValidPassword = await user.isPasswordCorrect(oldpassword);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid old password");
  }

  user.password = newpassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email, phone } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (fullName) user.fullName = fullName;
  if (email) user.email = email.toLowerCase();
  if (phone) user.phone = phone;

  await user.save({ validateBeforeSave: false });

  const updated = await User.findById(user._id).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadInCloudinary(avatarLocalPath);
  if (!avatar?.url) {
    throw new ApiError(400, "Avatar upload failed");
  }

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  const coverImage = await uploadInCloudinary(coverImageLocalPath);
  if (!coverImage?.url) {
    throw new ApiError(400, "Cover image upload failed");
  }

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.findOne({ username: username.toLowerCase() }).select(
    "username fullName avatar coverImage email"
  );

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel, "Channel profile fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  // For Step 1, keep it simple and just return populated history if possible.
  const user = await User.findById(req.user._id).populate({
    path: "watchHistory",
    select: "title thumbnail views duration createdAt",
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user?.watchHistory || [],
        "Watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};

