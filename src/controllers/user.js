import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/User.js';
import {uploadImageToCloudinary} from '../utils/cloudinary.js';

const registerUser = asyncHandler(async(req,res)=>{
    //get user details from frontend 
    //validation of the user details 
    //check if user already exists in the database
    //check for images,avatar
    //upload images to cloudinary and get the urls
    //create a new user in the database
    //remove password and refresh token from response 
    //check for user creation 
    //return res.

    const {username,email,fullName,password} = req.body;

    if([fullName,email,username,password].some((field)=>field?.trim()==="")){
        throw new ApiError("All fields are required",400);
    }
    //check if user already exists in the database
    const existingUser = await User.findOne({$or:[{email},{username}]});
    if(existingUser){
        throw new ApiError("User already exists with this email or username",400);
    }
    //check for images,avatar
    if(!req.files || !req.files.avatar || req.files.avatar.length === 0){
        throw new ApiError("Avatar image is required",400);
    }
    const avatarFile = req.files.avatar[0];
    const coverImageFile = req.files.coverImage ? req.files.coverImage[0] : null;

    if(!avatarFile){
        throw new ApiError("Avatar image is required",400);
    }

    //upload images to cloudinary and get the urls
    const avatar = await uploadImageToCloudinary(avatarFile.path,"avatars");
    const coverImage = await uploadImageToCloudinary(coverImageFile.path,"coverImages");

    if(!avatar){
        throw new ApiError("Failed to upload avatar image",500);
    }

    //create a new user in the database
    const newUser = await User.create({
        username:username.toLowerCase(),
        email,
        fullName,
        password,
        avatar:avatar.secure_url,
        coverImage:coverImage ? coverImage.secure_url : undefined
    });

    if(!newUser){
        throw new ApiError("Failed to create user",500);
    }

    //remove password and refresh token from response 
    newUser.password = undefined;
    newUser.refreshToken = undefined;

    //check for user creation 
    if(!newUser){
        throw new ApiError("Failed to create user",500);
    }

    //return res.
    return res.status(201).json(
        new ApiResponse(201,"User registered successfully",newUser)
    );

})



export {registerUser};