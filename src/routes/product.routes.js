import express from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import variantRoutes from "./product-variant.routes.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

import upload from "../middleware/bulk-upload.middleware.js";
import { parseExcel } from "../middleware/excel-parser.middleware.js";
import { bulkImportProductsAndVariants } from "../controllers/product-bulk.controller.js";

const router = express.Router();

router.use(authenticate, authorizeRoles("ADMIN"));

router.post("/", createProduct);

router.post(
  "/bulk-import",
  upload.single("file"),
  parseExcel,
  bulkImportProductsAndVariants,
);
router.get("/", getProducts);

router.use("/:productId/variants", variantRoutes);

router.get("/:id", getProductById);

router.put("/:id", updateProduct);

router.delete("/:id", deleteProduct);

export default router;
