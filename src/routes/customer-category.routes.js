import express from "express";

import {
  getCustomerCategories,
  getCustomerCategoryById,
  getCustomerCategoryBySlug,
  searchCustomerCategories,
} from "../controllers/customer-category.controller.js";

const router = express.Router();

router.get("/", getCustomerCategories);

router.get("/search", searchCustomerCategories);

router.get("/slug/:slug", getCustomerCategoryBySlug);

router.get("/:id", getCustomerCategoryById);

export default router;
