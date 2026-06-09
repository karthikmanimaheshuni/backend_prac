import {Router} from 'express';
import {registerUser} from '../controllers/user.js';
import {upload} from '../middlewares/multer.js';
import { 
    loginUser,
    logoutUser,
    registerUser,
    refreshAccessToken,
    changeCurrentUserPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getWatchHistory,
    getUserChannelProfile

} from '../controllers/user.js';

const router = Router();

router.route("/register").post(
    upload.fields([
        {name:"avatar",maxCount:1},
        {name:"coverImage",maxCount:1}
    ]),
    registerUser//upload.fields is a middleware 
);

router.route("/login").post(loginUser);


//secured route, only accessible to authenticated users
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refreshtoken").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT,changeCurrentUserPassword);
router.route("/current-user").get(verifyJWT,getCurrentUser);
router.route("/update-account").patch(verifyJWT,updateAccountDetails);
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar);
router.route("/update-cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage);
router.route("/c/:username").get(verifyJWT,getUserChannelProfile);
router.route("/watch-history").get(verifyJWT,getWatchHistory);


export default router;