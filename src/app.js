import express from "express";
import cors from "cors";

import adminRoutes from "./routes/admin.routes.js";
import adminAuthRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import offerRoutes from "./routes/offer.routes.js";
import adminOrderRoutes from "./routes/order.routes.js";
import salesRoutes from "./routes/sales.routes.js";
import userRoutes from "./routes/user.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import customerAuthRoutes from "./routes/customer-auth.routes.js";
import customerCategoryRoutes from "./routes/customer-category.routes.js";
import customerProductRoutes from "./routes/customer-product.routes.js";
import customerOfferRoutes from "./routes/customer-offer.routes.js";
import customerCartRoutes from "./routes/customer-cart.routes.js";
import customerOrderRoutes from "./routes/customer-order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import customerAddressRoutes from "./routes/customer-address.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import customerWishlistRoutes from "./routes/customer-wishlist.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";
import paymentSettingsRoutes from "./routes/payment-settings.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";

const app = express();
app.use(cors());

app.use(express.json());

app.use("/api/admin", adminRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/products", productRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin/offers", offerRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/sales", salesRoutes);
app.use("/api/admin/users", userRoutes);
app.use("/api/admin/customers", customerRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/admin/inventory", inventoryRoutes);
app.use("/api/admin/suppliers", supplierRoutes);
app.use("/api/admin/purchases", purchaseRoutes);
app.use("/api/admin/payment-settings", paymentSettingsRoutes);

app.use("/api/customer/auth", customerAuthRoutes);
app.use("/api/customer/categories", customerCategoryRoutes);
app.use("/api/customer/products", customerProductRoutes);
app.use("/api/customer/offers", customerOfferRoutes);
app.use("/api/customer/carts", customerCartRoutes);
app.use("/api/customer/orders", customerOrderRoutes);
app.use("/api/customer/addresses", customerAddressRoutes);
app.use("/api/customer/wishlist", customerWishlistRoutes);

app.use("/api/media", mediaRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/invoices", invoiceRoutes);
app.get("/", (req, res) => {
  res.send("Server is running");
});

export default app;
