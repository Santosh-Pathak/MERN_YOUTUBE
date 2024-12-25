import { json } from "body-parser";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadInCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { jwt } from "jsonwebtoken";

const generateAccessTokenHere = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await generateAccessToken();
    return { accessToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Somethign Went wrong While Generating Access Token"
    );
  }
};

const generateRefreshTokenHere = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await generateRefreshToken();

    user.refreshToken == refreshToken;
    user.save({ ValidateBeforSave: false });

    return { accessToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Somethign Went wrong While Generating Refresh Token"
    );
  }
};

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
  const existedUser = await User.findOne({
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

const loginUser = asyncHandler(async (req, res) => {
  //req body->data
  //username or email
  //find the user
  //password check
  //access and refresh token geenrate
  //send cookie

  const { email, password, userName } = req.body;
  if (!userName || !email) {
    throw new ApiError(400, " Email or Username is Required");
  }

  const user = await User.findOne({ $or: [{ email }, { userName }] });
  if (!user) {
    throw new ApiError(404, "User Doesn't exist");
  }

  //password check
  const isValidPassword = await user.isPassWordCorrect(password);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid Password/Credentails ");
  }

  //access and refresh token generate
  const accessToken = await generateAccessTokenHere(user._id);
  const refreshToken = await generateRefreshTokenHere(user._id);

  //send cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("acccesToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: user,
          accessToken,
          refreshToken,
        },
        "user Loggde in Succesfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refrshToken", options)
    .json(new ApiResponse(200, {}, "User Loggewd Out Succesfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "UnAuthorised Request");
  }
  try {
    const decodedTojken = jwt.verify(
      incomingRefreshToken,
      process.env.$setREFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedTojken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is Expired or Used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const newaccessToken = await generateAccessTokenHere(user._id);
    const newrefreshToken = await generateRefreshTokenHere(user?.id);

    return res
      .status(200)
      .cookie("acccesToken", newaccessToken)
      .cookie("refreshToken", newrefreshToken)
      .json(
        new ApiResponse(
          200,
          { newaccessToken, newrefreshToken },
          "Access Token and Refresh Token Generated Succesfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});
export { registerUser, loginUser, logoutUser,refreshAccessToken };
