import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "../models/category.model.js";

dotenv.config();

const categories = [
  {
    name: "Beverages",
    description: "Soft drinks, juices, water and other beverages",
    image: "beverages.jpg",
  },
  {
    name: "Groceries",
    description: "Rice, sugar, flour and other grocery products",
    image: "groceries.jpg",
  },
  {
    name: "Dairy",
    description: "Milk, cheese, yogurt and other dairy products",
    image: "dairy.jpg",
  },
  {
    name: "Vegetables",
    description: "Fresh vegetables",
    image: "vegetables.jpg",
  },
  {
    name: "Fruits",
    description: "Fresh fruits",
    image: "fruits.jpg",
  },
  {
    name: "Bakery",
    description: "Bread, buns, cakes and bakery products",
    image: "bakery.jpg",
  },
  {
    name: "Snacks",
    description: "Biscuits, chips and other snacks",
    image: "snacks.jpg",
  },
  {
    name: "Household",
    description: "Household cleaning and utility products",
    image: "household.jpg",
  },
  {
    name: "Personal Care",
    description: "Personal hygiene and care products",
    image: "personal-care.jpg",
  },
];

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.");

    for (const category of categories) {
      const existingCategory = await Category.findOne({
        name: category.name,
      });

      if (existingCategory) {
        console.log(
          `Category already exists: ${category.name}`
        );
        continue;
      }

      await Category.create(category);

      console.log(
        `Category created: ${category.name}`
      );
    }

    console.log("Category seeding completed.");
  } catch (error) {
    console.error(
      "Category seeding failed:",
      error
    );
  } finally {
    await mongoose.disconnect();

    console.log("MongoDB connection closed.");
  }
};

seedCategories();