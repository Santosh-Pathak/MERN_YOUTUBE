import { json } from "body-parser";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadInCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandler(async (req, res) => {
  // check whether request is going on postman
  //   return res.status(200).json({
  //   message: "User registered successfully"
  // });
  // steps to validate user (ALGORITHM)
  // get user details from frontend
  // validation - not empty
  // check if user already exists : username , email.(unique)
  // check for images ,check for avatar
  // upload them to cloudinary,avatar
  // create user  object (create entry call in db) in database
  // remove password amd refresh token field from response
  // check for user creation (return result YES  / NO)
  // Simulate user creation (replace with database logic)
  // return res.status(201).json({ message: "User registered successfully", user: { userName, email } });

  // const { fullName, email, userName, password } = req.body;
  // console.log(email);
  const { fullName, email, userName, password } = req.body;
  console.log(email);

  //METHOD -1 TO VALIDATE
  // if(fullName=="")
  // {
  //   throw new ApiError(400 , "FullName is required");
  // }

  //METHOD 2 (ADVANCE )
  if (
    [fullName, email, userName, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All Fields are Required");
  }

  // check of user already exist in databbase
  const existedUser = User.findOne({
    $or: [{ email }, { userName }],
  });
  if (existedUser) {
    throw new ApiError(409, "User Already Exits with UserName/Email");
  }
  //check for imahes and avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File is Required");
  }
  //upload On Clodinary
  const avatar = await uploadInCloudinary(avatarLocalPath);
  const coverImage = await uploadInCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar File is Required");
  }

  //create User Object and Make a entry in DataBase
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    userName: userName.toLowerCase(),
  });

  const createdUSer = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUSer) {
    throw new ApiError(500, " Something went Wrong while Registering the User");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUSer, "User Created Succesfully"));
});

export default registerUser;
