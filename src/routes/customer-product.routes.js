import express from "express";

import {
  getCustomerProducts,
  getCustomerProductById,
  searchCustomerProducts,
} from "../controllers/customer-product.controller.js";

const router = express.Router();

router.get("/", getCustomerProducts);

router.get("/search", searchCustomerProducts);

router.get("/:id", getCustomerProductById);

export default router;
