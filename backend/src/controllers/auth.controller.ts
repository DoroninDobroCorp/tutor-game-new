import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {
  register,
  login,
  getCurrentUser,
  refreshTokens,
  blacklistToken,
} from "../services/auth.service";
import { AppError } from "../utils/errors";
import { config } from "../config/env";

// Simple password validation
const validatePassword = (password: string) => {
  if (password.length < 4) {
    throw new AppError("Password must be at least 4 characters long", 400);
  }
};

export const registerHandler = async (req: Request, res: Response) => {
  console.log("Registration request received");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  try {
    let { email, password, role, firstName, lastName } = req.body;

    // If firstName and lastName are not provided, generate defaults
    if (!firstName || !lastName) {
      console.log("Name fields not provided, generating defaults");
      // Use first part of email as first name
      firstName = email.split("@")[0] || "User";
      // Use role as last name
      lastName = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    }

    // Validate required fields
    if (!email || !password || !role) {
      throw new AppError("Email, password, and role are required", 400);
    }

    console.log("Processing registration for:", {
      email,
      role,
      firstName,
      lastName,
    });

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError("Invalid email format", 400);
    }

    // Validate role
    if (!["TEACHER", "STUDENT"].includes(role)) {
      throw new AppError("Invalid role. Must be TEACHER or STUDENT", 400);
    }

    // Validate password
    validatePassword(password);

    console.log("Attempting to register user:", {
      email,
      role,
      firstName,
      lastName,
    });
    const { user, accessToken, refreshToken } = await register(
      email,
      password,
      role as "TEACHER" | "STUDENT",
      firstName,
      lastName,
    );
    console.log("User registered successfully:", user.id);

    // Set refresh token in HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/auth/refresh",
    });

    // Format response to match frontend expectations (without refresh token)
    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          role: user.role.toLowerCase() as "student" | "teacher",
          avatar: undefined,
        },
        accessToken,
      },
    };

    console.log(
      "Sending registration response (without refresh token in body)",
    );
    return res.status(201).json(response);
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error during registration",
    });
  }
};

export const loginHandler = async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  console.log(`Login attempt from IP: ${ip}`);

  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Please provide email and password", 400);
  }

  try {
    console.log(`Attempting to log in user: ${email}`);
    const { user, accessToken, refreshToken } = await login(
      email,
      password,
      ip,
    );

    // Set secure HTTP-only cookie for refresh token
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/auth/refresh",
    });

    // Set security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );

    console.log(`Login successful for user: ${user.id}`);
    // Prepare user data for response
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.toLowerCase(),
    };

    // Set refresh token in HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/auth/refresh",
    });

    // Prepare response with only the access token
    const response = {
      success: true,
      data: {
        user: userData,
        accessToken,
      },
    };

    console.log("Sending login response (without refresh token in body)");
    res.json(response);
  } catch (error: any) {
    console.error(`Login failed for IP ${ip}:`, error.message);
    // Let the error handling middleware handle the error
    throw error;
  }
};

export const getMeHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Not authenticated", 401);
  }

  const user = await getCurrentUser(req.user.userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Create standardized user object with lowercase role
  const userData = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.toLowerCase(),
  };

  res.json({
    success: true,
    data: { user: userData },
  });
};

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get the refresh token from cookies
    const refreshToken = req.cookies?.refreshToken;

    // Add the refresh token to blacklist if it exists
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
          exp: number;
        };
        await blacklistToken(refreshToken, new Date(decoded.exp * 1000));
      } catch (error) {
        console.error("Error blacklisting refresh token:", error);
      }
    }

    // Get the access token from the authorization header
    const accessToken = req.headers.authorization?.split(" ")[1];

    // Add the access token to blacklist if it exists
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, config.jwtSecret) as {
          exp: number;
        };
        await blacklistToken(accessToken, new Date(decoded.exp * 1000));
      } catch (error) {
        console.error("Error blacklisting access token:", error);
      }
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh",
    });

    // Set security headers
    res.setHeader("Clear-Site-Data", '"cookies", "storage"');
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.status(200).json({
      success: true,
      message: "Successfully logged out",
    });
  } catch (error) {
    console.error("Logout error:", error);
    next(error);
  }
};

export const refreshTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Try to get refresh token from cookies first
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new AppError("Refresh token is required", 400);
  }

  try {
    // Get the old refresh token's expiration before it's blacklisted
    let oldTokenExp;
    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
        exp: number;
      };
      oldTokenExp = new Date(decoded.exp * 1000);
    } catch (error) {
      console.error("Error decoding refresh token:", error);
      throw new AppError("Invalid refresh token", 401);
    }

    // Get new tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await refreshTokens(refreshToken);

    // Blacklist the old refresh token
    try {
      await blacklistToken(refreshToken, oldTokenExp);
    } catch (error) {
      console.error("Error blacklisting old refresh token:", error);
      // Don't fail the request if blacklisting fails
    }

    // Set new refresh token in HTTP-only cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/auth/refresh",
    });

    // Set security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );

    res.json({
      success: true,
      data: {
        accessToken,
        // Don't send new refresh token in response body - it's in the cookie
      },
    });
  } catch (error) {
    // Clear the invalid refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh",
    });

    console.error("Refresh token error:", error);
    throw new AppError("Invalid or expired refresh token", 401);
  }
};
