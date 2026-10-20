import express from "express";

import {
  getCustomerProducts,
  getCustomerProductById,
  getCustomerProductBySlug,
  searchCustomerProducts,
  getCustomerBrands,
} from "../controllers/customer-product.controller.js";

const router = express.Router();

router.get("/", getCustomerProducts);

router.get("/search", searchCustomerProducts);

router.get("/slug/:slug", getCustomerProductBySlug);

router.get("/brands", getCustomerBrands);

router.get("/:id", getCustomerProductById);

export default router;
