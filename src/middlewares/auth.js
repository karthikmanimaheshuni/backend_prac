import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';
import {User} from '../models/User.js';

export const verifyJWT = asyncHandler(async(req,res,next)=>{
    req.cookies?.accessToken || 
    req.header("Authorization")?.replace("Bearer","");//then we got token(Bearer <token>)
    if(!token){
        throw new ApiError("Unauthorized request",401);
    }
    try{
        const decoded = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded?._id)
        .select("-password -refreshToken");
        if(!user){
            throw new ApiError("Unauthorized request",401);
        }
        req.user = user;
        next();//next middleware or controller will be executed
    }catch(error){
        throw new ApiError("Unauthorized request",401);
    }
})