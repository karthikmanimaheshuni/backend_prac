import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/User.js';
import {uploadImageToCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import {verifyJWT} from '../middlewares/auth.js';



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


const loginUser = asyncHandler(async(req,res)=>{
    //get user details from request body/frontend
    //validation of the user details 
    //check if user exists in the database with email or username
    //if user does not exist,throw error
    //if user exists,compare the password with the hashed password in the database
    //if password is incorrect,throw error
    //if password is correct,generate access token and refresh token
    //save refresh token in the database
    //return access token and refresh token to the frontend

    const {emailOrUsername,password} = req.body;

    if([emailOrUsername,password].some((field)=>field?.trim()==="")){
        throw new ApiError("All fields are required",400);
    }

    //check if user exists in the database with email or username
    const user = await User.findOne(
        {$or:[
            {email:emailOrUsername},
            {username:emailOrUsername}]
        });

    //if user does not exist,throw error
    if(!user){
        throw new ApiError("Invalid email/username or password",401);
    }

    //if user exists,compare the password with the hashed password in the database
    const isPasswordCorrect = await user.isPasswordCorrect(password);

    //if password is incorrect,throw error
    if(!isPasswordCorrect){
        throw new ApiError("Invalid email/username or password",401);
    }

    //if password is correct,generate access token and refresh token
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //save refresh token in the database
    user.refreshToken = refreshToken;
    await user.save();

    const loginedInUser = await User.findById(user._id).select("-password -refreshToken");
    
    const options = {
        httpOnly:true,
        secure:true
    }
    //return access token and refresh token to the frontend
    return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200,"User logged in successfully", {accessToken, refreshToken, loginedInUser})
    );
})

const logoutUser = asyncHandler(async(req,res)=>{
    //get user id from req.user
    //find the user in the database and remove the refresh token
    //clear the cookies
    //return response

    const userId = req.user._id;

    const user = await User.findById(userId);
    if(!user){
        throw new ApiError("User not found",404);
    }

    user.refreshToken = null;//once check with this not worked when used to do with undefined 
    await user.save();

    const options = {
        httpOnly:true,
        secure:true
    }
    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);

    return res.status(200).json(
        new ApiResponse(200,"User logged out successfully")
    );
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookie.refreshToken || 
                                req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError("unauthorized request",401);
    }


    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET);
    
    const user = await User.findById(decodedToken._id);
    if(!user){
        throw new ApiError("unauthorized request",401);
    }
    if(user?.refreshToken !== incomingRefreshToken){
        throw new ApiError("unauthorized request,Request token is used or expired",401);
    }


    const options = {
        httpOnly:true,
        secure:true
    }

    const {accessToken,newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id);

    return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    "Access token refreshed successfully",
                    {accessToken,refreshToken:newRefreshToken}
                )
    );



});

const changeCurrentUserPassword = asyncHandler(async(req,res)=>{

    const {oldPassword,newPassword} = req.body;

    

    const user  = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError("Old password is incorrect",400);
    }
    user.password = newPassword;
    await user.save({validateBeforeSave:false});

    return res.status(200).json(
        new ApiResponse(200,"password changed successfully")
    )

    
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(
        new ApiResponse(200,"Current user fetched Successfully",req.user)
    )
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {email,fullName,} = req.body;

    if(!fullName || !email ){
        throw new ApiError("All fields are required",400);
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {new:true}

    ).select("-password");


    return res
            .status(200)
            .json(
                new ApiResponse(200,"Account details updated successfully",user)
            );
})


const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError("Avatar file is required",400);
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar){
        throw new ApiError("Error while uploading avatar",500);
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password");

    return res
            .status(200)
            .json(
                new ApiResponse(200,"Avatar updated successfully",user)
            );
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path;


    if(!coverImageLocalPath){
        throw new ApiError("Cover image file is required",400);
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage){
        throw new ApiError("Error while uploading coverImage",500);
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password");

    return res
            .status(200)
            .json(
                new ApiResponse(200,"Cover image updated successfully",user)
            );
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{

    const {username} = req.params;

    if(!username?.trim()){
        throw new ApiError("Userame is missing",400);
    }
    const channel = await User.aggregate([
        {
            $match:{username:username?.toLowerCase()}
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{$size:"$subscribers"},
                channelSubscribedToCount:{$size:"$subscribedTo"},
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }

            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                email:1,
                avatar:1,
                coverImage:1,
                subscribersCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1
            }
        }
    ])


    if(!channel || channel.length === 0){
        throw new ApiError("channel  not found",400);
    }

    return res
            .status(200)
            .json(
                new ApiResponse(200,"Channel profile feteched successfully",channel[0])
            )



})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
               _id : new mongoose.Types.ObjectId(req.user?._id)
            }
            
        },{
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
            .status(200)
            .json(
                new ApiResponse(200,"Watch history fetched successfully",user[0].watchHistory)
             );
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentUserPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};