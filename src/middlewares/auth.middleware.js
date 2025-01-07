import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { jwt } from "jsonwebtoken";
import { User } from "../models/user.models";

export const verifyJWT = asyncHandler(async (req, __, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized Request");
    }

    const decodedToken = await jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.find(decodedToken?._id).select(
      "-passowrd -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access TOken");
    }
    
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access TOken");

  }
});
