import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'


const generateAccessAndRefreshTokens = async (userId) =>
{
    try
    {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); // To bypass the token validation since we are generating tokens here

        return { accessToken, refreshToken };

    } catch (error)
    {
        throw new ApiError({
            statusCode: 500,
            message: "Something went wrong while generating access token and refresh token!"
        });
    }
};


const registerUser = asyncHandler(async (req, res) =>
{
    const { fullName, email, username, password } = req.body;
    console.log(req.body);
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    )
    {
        throw new ApiError(400, "All fields are Required");
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existedUser)
    {
        if (existedUser.username === username)
        {
            throw new ApiError(409, `Username ${username} already exists`);
        } else
        {
            throw new ApiError(409, `Email ${email} has been used`);
        }
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
    {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath)
    {
        throw new ApiError(400, "Avatar image is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar)
    {
        throw new ApiError(400, "Avatar image is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser)
    {
        throw new ApiError({
            statusCode: 500,
            message: "Something went wrong while registering the user!"
        });
    }



    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully!")
    )
});



const loginUser = asyncHandler(async (req, res) =>
{
    const { email, username, password } = req.body;
    if (!username && !email)
    {
        throw new ApiError(400, "Username or Email field cannot be empty!");
    }

    // if (!(username || email))
    // {
    //     throw new ApiError(400, "Username or Email field cannot be empty!");
    // }

    const userdata = await User.findOne({
        $or: [
            { 'email': email },
            { 'username': username?.toLowerCase() }
        ]
    });

    if (!userdata)
    {
        throw new ApiError(400, "user does not exists.");
    }

    const isPasswordValid = await userdata.isPasswordCorrect(password);

    if (!isPasswordValid)
    {
        throw new ApiError(400, "Invalid Password Provided!");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(userdata._id);

    const loggedInUser = await User.findById(userdata._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Logged In Successfully!"
            )
        );
});


const logoutUser = asyncHandler(async (req, res) =>
{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User Logged Out Successfully!"
            )
        );
});


const refreshAccessToken = asyncHandler(async (req, res) =>
{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken)
    {
        throw new ApiError(401, "unauthorized request")
    }

    try
    {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user)
        {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken)
        {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error)
    {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})


const changeCurrentPassword = asyncHandler(async (req, res) =>
{
    const { oldPassword, newPassword } = req.body



    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect)
    {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = asyncHandler(async (req, res) =>
{
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ))
})


const updateAccountDetails = asyncHandler(async (req, res) =>
{
    const { fullName, email } = req.body

    if (!fullName || !email)
    {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        { new: true }

    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
});



const updateUserAvatar = asyncHandler(async (req, res) =>
{
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath)
    {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url)
    {
        throw new ApiError(400, "Error while uploading on avatar")

    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar image updated successfully")
        )
})


const updateUserCoverImage = asyncHandler(async (req, res) =>
{
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath)
    {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url)
    {
        throw new ApiError(400, "Error while uploading on avatar")

    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover image updated successfully")
        )
})



export
{
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};