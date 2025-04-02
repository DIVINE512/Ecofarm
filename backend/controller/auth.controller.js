import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(`refreshToken:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60);
};

const setCookie = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const signup = async (req, res) => {
  const { email, name, password } = req.body;

  try {
    if (!email || !name || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await User.create({ email, name, password });

    const { accessToken, refreshToken } = generateTokens(user._id);
    await storeRefreshToken(user._id, refreshToken);

    setCookie(res, accessToken, refreshToken);

    return res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "User created successfully",
    });

  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken ; 
        if(refreshToken){
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const userId = decoded.userId;
        await redis.del(`refreshToken:${userId}`);
    }
       res.clearCookie("accessToken");
       res.clearCookie("refreshToken");
       res.json({message:"Logout successful"});
   } catch (error) {
        console.log("Error while logout", error.message);
        res.status(500).json({message : "server error", error : error.message});
   }
};

export const login = async (req, res) => {

    try {
        const {email , password} = req.body;
        const user = await User.findOne({email});
        if(user && (await user.comparePassword(password))){
            const {accessToken , refreshToken} = generateTokens(user._id);  
            await storeRefreshToken(user._id, refreshToken);
            setCookie(res, accessToken, refreshToken);
            
            res.json({
              _id : user._id,
              email : user.email,
              name : user.name,
              role : user.role
            })
        }else{
          res.status(401).json({ message: "Invalid email or password" });

        }
    } catch (error) {
        console.log("Error while login", error.message);
        res.status(500).json({message : "server error", error : error.message});
    }

   
};

// this will refresh access token
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized, no refresh token found" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: "Refresh token expired" });
      }
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const storedToken = await redis.get(`refreshToken:${decoded.userId}`);
    if (storedToken !== refreshToken) {
      return res.status(401).json({ message: "Unauthorized, invalid refresh token" });
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: "Access token refreshed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const getProfile = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.log("Error while getting profile", error.message);
    res.status(500).json({ message: "server error", error: error.message });
  }}