import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import { fs } from "fs";

// this config will give the permission to upload the file  otherwise how will it know which one which account is logging and what is the username
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  cloud_api_key: process.env.CLOUDINARY_API_KEY,
  cloud_api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadInCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload the file in cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    //file has been successfully uploaded
    console.log("File is Uploadede on Cloudinary", response.url);
    return response;
    
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locaally saved temporary files as th eupload operation got failed
    return null;
  }
};

export default { uploadInCloudinary };
