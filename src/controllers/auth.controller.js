import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import RefreshToken from "../models/refresh-token.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { hashToken } from "../utils/hash-token.js";

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check role
    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access is required.",
      });
    }

    // Check active status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive.",
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    //hash token
    const refreshTokenHash = hashToken(refreshToken);

    // Refresh token expiry
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Store refresh token
    await RefreshToken.create({
      user: user._id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExpiry,
    });

    return res.status(200).json({
      success: true,
      message: "Admin login successful.",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

export const adminRefreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    // Verify JWT
    let decoded;

    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token.",
      });
    }

    // Make sure this is actually a refresh token
    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    // Hash received token
    const refreshTokenHash = hashToken(refreshToken);

    // Check token exists in database
    const storedToken = await RefreshToken.findOne({
      tokenHash: refreshTokenHash,
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token has been revoked or does not exist.",
      });
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({
        _id: storedToken._id,
      });

      return res.status(401).json({
        success: false,
        message: "Refresh token has expired.",
      });
    }

    // Find user
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    // Check active status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive.",
      });
    }

    // Check role
    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access is required.",
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
      accessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

export const adminLogout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    const refreshTokenHash = hashToken(refreshToken);
    await RefreshToken.deleteOne({
      tokenHash: refreshTokenHash,
    });

    return res.status(200).json({
      success: true,
      message: "Admin logged out successfully.",
    });
  } catch (error) {
    console.error("Admin logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};


export const staffLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    const user = await User.findOne({
      username: username.trim().toLowerCase(),
      role: { $in: ["MANAGER", "CASHIER"] },
    }).select("+password");

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      user: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ),
    });

    return res.status(200).json({
      success: true,
      message: "Staff login successful.",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        managerName: user.managerName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Staff login error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};
