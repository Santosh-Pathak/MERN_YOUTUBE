import { Router } from "express";
import { loginUser , registerUser , logoutUser,refreshAccessToken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
        name  : "coverImage",
        maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
//SECURED ROUTER
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
// here verifyJWT is  a middlwware which is used to validate the user ans succcessfully logout the user 
// in middlewares (next) is used with req,res ? because here we have seeen that verifyJWt is used before logoutUser 
// to verify that the user is Valid
// next batata h ki pehle verifyJWT run karo and then logoutUser Run karo

export default router;

// Article for differencebetween accces token and refresh token




