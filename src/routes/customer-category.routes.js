import express from "express";

import {
  getCustomerCategories,
  getCustomerCategoryById,
  searchCustomerCategories,
} from "../controllers/customer-category.controller.js";

const router = express.Router();

router.get("/", getCustomerCategories);

router.get("/search", searchCustomerCategories);

router.get("/:id", getCustomerCategoryById);

export default router;
