import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/product.model.js";

dotenv.config();

const resetProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.");

    const result = await Product.deleteMany({});

    console.log(
      `Deleted ${result.deletedCount} products.`
    );

    console.log("Product data reset successfully.");
  } catch (error) {
    console.error(
      "Product reset failed:",
      error
    );
  } finally {
    await mongoose.disconnect();

    console.log("MongoDB connection closed.");
  }
};

resetProducts();