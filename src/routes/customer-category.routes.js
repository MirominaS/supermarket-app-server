import express from "express";

import {
  getCustomerCategories,
  getCustomerCategoryById,
} from "../controllers/customer-category.controller.js";

const router = express.Router();

router.get("/", getCustomerCategories);

router.get("/:id", getCustomerCategoryById);

export default router;