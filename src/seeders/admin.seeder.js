import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/user.model.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.");

    const existingAdmin = await User.findOne({
      email: "admin@supermarket.com",
    });

    if (existingAdmin) {
      console.log("Admin already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash("123456", 12);

    const admin = await User.create({
      fullName: "Supermarket Admin",
      email: "admin@supermarket.com",
      phoneNumber: "0771234567",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    });

    console.log("Admin created successfully.");
    console.log("Admin ID:", admin._id);
    console.log("Admin Email:", admin.email);
    console.log("Admin Role:", admin.role);
  } catch (error) {
    console.error("Admin seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

seedAdmin();