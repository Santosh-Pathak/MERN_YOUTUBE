import { json } from "body-parser";
import asyncHandler from "../utils/asyncHandler";

const registerUser = asyncHandler(async (req, res) => {
    return res.status(201).json({
    message: "User registered successfully"
  });
});

export { registerUser };
