import express from "express";

import {
  getCustomerProducts,
  getCustomerProductById,
} from "../controllers/customer-product.controller.js";

const router = express.Router();

router.get("/", getCustomerProducts);

router.get("/:id", getCustomerProductById);

export default router;