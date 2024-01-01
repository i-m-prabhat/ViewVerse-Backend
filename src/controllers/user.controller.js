import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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


export { registerUser };