import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

dotenv.config();

const products = [
  {
    name: "Coca Cola 2L",
    description: "Coca Cola soft drink 2 liter bottle",
    sku: "COKE-2L",
    category: "Beverages",
    price: 450,
    stock: 100,
    unit: "pcs",
    image: "coca-cola-2l.jpg",
    isActive: true,
  },
  {
    name: "Pepsi 1L",
    description: "Pepsi soft drink 1 liter bottle",
    sku: "PEPSI-1L",
    category: "Beverages",
    price: 430,
    stock: 80,
    unit: "pcs",
    image: "pepsi-1l.jpg",
    isActive: true,
  },
  {
    name: "White Rice 5kg",
    description: "Premium quality white rice",
    sku: "RICE-WHITE-5KG",
    category: "Groceries",
    price: 1450,
    stock: 50,
    unit: "bag",
    image: "white-rice-5kg.jpg",
    isActive: true,
  },
  {
    name: "Sugar 1kg",
    description: "Refined white sugar",
    sku: "SUGAR-1KG",
    category: "Groceries",
    price: 280,
    stock: 120,
    unit: "kg",
    image: "sugar-1kg.jpg",
    isActive: true,
  },
  {
    name: "Milk Powder 400g",
    description: "Full cream milk powder",
    sku: "MILK-POWDER-400G",
    category: "Dairy",
    price: 980,
    stock: 60,
    unit: "pcs",
    image: "milk-powder-400g.jpg",
    isActive: true,
  },
  {
    name: "Fresh Milk 1L",
    description: "Fresh full cream milk",
    sku: "FRESH-MILK-1L",
    category: "Dairy",
    price: 520,
    stock: 40,
    unit: "pcs",
    image: "fresh-milk-1l.jpg",
    isActive: true,
  },
  {
    name: "Potato 1kg",
    description: "Fresh potatoes",
    sku: "POTATO-1KG",
    category: "Vegetables",
    price: 420,
    stock: 75,
    unit: "kg",
    image: "potato-1kg.jpg",
    isActive: true,
  },
  {
    name: "Red Onion 1kg",
    description: "Fresh red onions",
    sku: "ONION-RED-1KG",
    category: "Vegetables",
    price: 380,
    stock: 65,
    unit: "kg",
    image: "red-onion-1kg.jpg",
    isActive: true,
  },
  {
    name: "Bread 450g",
    description: "Fresh sliced white bread",
    sku: "BREAD-450G",
    category: "Bakery",
    price: 220,
    stock: 30,
    unit: "pcs",
    image: "bread-450g.jpg",
    isActive: true,
  },
  {
    name: "Chocolate Biscuit 200g",
    description: "Chocolate flavored biscuits",
    sku: "BISCUIT-CHOC-200G",
    category: "Snacks",
    price: 350,
    stock: 90,
    unit: "pcs",
    image: "chocolate-biscuit-200g.jpg",
    isActive: true,
  },
];

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.");

    for (const product of products) {
      // Check whether product already exists
      const existingProduct = await Product.findOne({
        sku: product.sku,
      });

      if (existingProduct) {
        console.log(
          `Product already exists: ${product.name}`
        );
        continue;
      }

      // Find category by name
      const category = await Category.findOne({
        name: product.category,
      });

      // Stop if category does not exist
      if (!category) {
        console.log(
          `Category not found: ${product.category}`
        );
        continue;
      }

      // Create product using category ObjectId
      await Product.create({
        ...product,
        category: category._id,
      });

      console.log(
        `Product created: ${product.name}`
      );
    }

    console.log("Product seeding completed.");
  } catch (error) {
    console.error(
      "Product seeding failed:",
      error
    );
  } finally {
    await mongoose.disconnect();

    console.log("MongoDB connection closed.");
  }
};

seedProducts();

