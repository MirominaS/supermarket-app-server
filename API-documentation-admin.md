# Admin Endpoints

### Admin Authentication

| Name | Method | API | Body |
| --- | --- | --- | --- |
| Login | `POST` | `http://localhost:5007/api/admin/auth/login` | `{"email":admin@supermarket.com", "password": "123456"}`|
| Logout | `POST`  |`http://localhost:5007/api/admin/auth/logout` | - |
| Refresh token |`POST`| `http://localhost:5007/api/admin/auth/refresh` | `{"refreshToken": "REFRESH_TOKEN"}` |


### Admin Category
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Create Category | `POST `| `http://localhost:5007/api/admin/categories` | `{"name": "Soft Drinks","description": "Soft drinks, juices and water", "image": "https://example.com/beverages.jpg"}` |
| Get All Categories | `GET` | `http://localhost:5007/api/admin/categories` | - |
| Get category by ID | `GET`| `http://localhost:5007/api/admin/categories/:id` | - |
| Update Category | `PUT` | `http://localhost:5007/api/admin/categories/:id` |`{"name": "Groceries", "description": "Rice, flour and other grocery products", "image": "https://example.com/new-image.jpg", "isActive": true}`|
| Delete Category | `DELETE` | `http://localhost:5007/api/admin/categories/:id`| - |
| Bulk Import | `POST` | `http://localhost:5007/api/admin/categories/bulk-import` | `form-data - key: file-> value: book.xlsl`|

### Admin Dashboard
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Overview | `GET` | `http://localhost:5007/api/admin/dashboard/overview?period=month`| `month, year, week, today, startDate, endDate` |
| Revenue Chart | `GET` | `http://localhost:5007/api/admin/dashboard/revenue-chart?period=week` | `month, year, week, today, startDate, endDate` |
| Order analysis | `GET` | `http://localhost:5007/api/admin/dashboard/orders?period=today` | `month, year, week, today, startDate, endDate` |
| Payment analysis | `GET`| `http://localhost:5007/api/admin/dashboard/payments?period=today` | `month, year, week, today, startDate, endDate` |
| Top Products | `GET` | `http://localhost:5007/api/admin/dashboard/top-products` | `month, year, week, today, startDate, endDate` |
| Category Analysis |`GET` | `http://localhost:5007/api/admin/dashboard/categories?startDate=2026-08-01&endDate=2026-08-17` | `month, year, week, today, startDate, endDate` |
| Inventory Analysis | `GET` | `http://localhost:5007/api/admin/dashboard/inventory` | `month, year, week, today, startDate, endDate` |
| Inventory movements Analysis | `GET` | `http://localhost:5007/api/admin/dashboard/inventory-movements` | `month, year, week, today, startDate, endDate`|

### Admin Inventory
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Inventory adjustment | `POST` | `http://localhost:5007/api/admin/inventory/adjust` | `{"productId":"6a79c6657b040cbc7da836d0", "variantId":"6a79ccbb7de7ba973c1f1ffb",  "movementType": "OUT", "quantity": 62, "reason": "Damaged products",  "referenceType": "ADJUSTMENT"}` |
| Get Inventory Summary | `GET` | `http://localhost:5007/api/admin/inventory/summary` | - |
| Get Low Stock | `GET` | `http://localhost:5007/api/admin/inventory/low-stock` | - |
| Get Inventory History | `GET`| `http://localhost:5007/api/admin/inventory/history` | - |

### Admin offer
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Create Offer| `POST` | `http://localhost:5007/api/admin/offers` | `SINGLE OFFER - {"name": "Butter Bun 250g","type": "SINGLE","startDate": "2026-08-10T00:00:00.000Z",  "endDate": "2026-08-20T23:59:59.000Z",  "items": [ {"product": "6a75ce2b90169e281123abac", "variant": "6a75d0fb90169e281123abae", "price": 200  }]}  COMBO OFFER -  { "name": "Breakfast Combo",  "type": "COMBO", "startDate": "2026-08-10T00:00:00.000Z",  "endDate": "2026-08-20T23:59:59.000Z", "items": [ { "product": "PRODUCT_ID_1", "variant": "VARIANT_ID_1", "price": 200}, { "product": "PRODUCT_ID_2","variant": "VARIANT_ID_2", "price": 300    }  ]}` |
| Get all offers | `GET` | `http://localhost:5007/api/admin/offers` | - |
| Get offer by Id | `GET` | `http://localhost:5007/api/admin/offers/:id` | - |
| Update offer | `PUT` | `http://localhost:5007/api/admin/offers/:id` | `{ "name": "Updated Breakfast Combo"}`,`{"startDate": "2026-08-12T00:00:00.000Z",  "endDate": "2026-08-30T23:59:59.000Z"}`, `{ "items": [ { "product": "6a75ce2b90169e281123abac", "variant": "6a75d0fb90169e281123abae", "price": 190 }]}`,`{"isActive": true}`, `{"type": "DISCOUNT"}`|
| Delete offer | `DELETE` | `http://localhost:5007/api/admin/offers/:id` | - |

### Admin order
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Get   orders| `GET` | `http://localhost:5007/api/admin/orders` | - |
| Get order by id | `GET`| `http://localhost:5007/api/admin/orders/:id`| - |
| Update order status | `PATCH` | `http://localhost:5007/api/admin/orders/:id/status` | `{ "status": "READY"}` |
| Cancel order | `PATCH` | `http://localhost:5007/api/admin/orders/:id/cancel` | -|
| Delete order | `DELETE` | `http://localhost:5007/api/admin/orders/:id` | - |
| Export orders | `GET` | `http://localhost:5007/api/admin/orders/export` | - |

### Admin Payment Setting
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Add stripe Keys | `PUT` | `http://localhost:5007/api/admin/payment-settings` | `{ "provider": "STRIPE", "secretKey":"S_KEY", "publishableKey": "P_KEY", "webhookSecret": "W_KEY"}`|
| Get Stripe Keys |  `GET` | `http://localhost:5007/api/admin/payment-settings` | - |

### Admin Product Endpoints
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Create Product | `POST` | `http://localhost:5007/api/admin/products` | `//product with variant -  { "name": "Coco-cola",  "description": "Softderink for freshness", "category": "6a6b5ff51cf27d50f594ca9e" } //product without variant - {  "name": "Samba Rice",  "description": "Premium samba rice",   "category": "6a6b5ff51cf27d50f594ca9e",   "hasVariants": false,  "price": 320,  "costPrice": 280,  "stock": 100,  "unit": "kg"}`|
| Get All Product | `GET` | `http://localhost:5007/api/admin/products` | - |
| Get Product by ID | `GET` | `http://localhost:5007/api/admin/products/:id` | - |
| Update Product | `PUT` | `http://localhost:5007/api/admin/products/:id` | `{ "name": "Chocolate Biscuit",     "description": "Dark Chocolate biscuit with less sugar",    "category": "6a6b5ff61cf27d50f594caa4", "isActive": true}` |
| Delete Product | `DELETE` | `http://localhost:5007/api/admin/products/:id`| -|
| Product Bulk import | `POST` | `http://localhost:5007/api/admin/products/bulk-import` | `form-data-> KEY:FILE, VALUE:Book.xlsx` |

### Admin Product variant
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Create Variant | `POST` | `http://localhost:5007/api/admin/products/:productId/variants` | `{ "name": "1L", "sku":"COKE-1L",  "barcode": "123456790",  "price": 280,  "costPrice": 230,  "stock": 30,  "unit": "bottle",  "isDefault": false}` |
| Get all variants | `GET` | `http://localhost:5007/api/admin/products/:id/variants` | - |
| Get variant by ID | `GET`| `http://localhost:5007/api/admin/products/:id/variants/:variantId` | - |
| Update variant | `PUT` | `http://localhost:5007/api/admin/products/:id/variants/:variantId` | `{"name": "Butter Bun 100g", "sku": "BTRBN001", "barcode": "1234567890123", "price": 120, "costPrice": 90,"stock": 80, "unit": "gram",  "isDefault": false}` |
| Delete variant | `DELETE` | `http://localhost:5007/api/admin/products/:id/variants/:variantId` | - |

### Admin User
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Get all users | `GET` | `http://localhost:5007/api/admin/users` | - |
| Get users pagination | `GET` | `http://localhost:5007/api/admin/users?page=2&limit=5` | --- |
| Get User by searching-(name, email, phone) | `GET` | `http://localhost:5007/api/admin/users?search=john` | - |
| Get users by role| `GET` | `http://localhost:5007/api/admin/users?role=CUSTOMER` | - |
| Get Users filter by active status | `GET` | `http://localhost:5007/api/admin/users?isActive=false` | - |
| Get Users Combined filters | `GET` |`http://localhost:5007/api/admin/users?page=1&limit=10&search=john&role=CUSTOMER&isActive=true`| - |
| Get user by id | `GET` |`http://localhost:5007/api/admin/users/:id` | --- |
| Change the status of a user| `PATCH` | `http://localhost:5007/api/admin/users/:id/status` | `{ "isActive": true}` |

### Admin Purchase from Suppliers
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Create purchase | `POST` |`http://localhost:5007/api/admin/purchases` | `{"supplier": "6a742d80b327fd67e86000b0",  "items": [ {"product": "6a75ce2b90169e281123abac","variant": "6a75d0fb90169e281123abae","quantity": 20, "costPrice": 150    }  ], "discount": 50,  "notes": "First purchase from supplier"}` |
| Get all purchase | `GET` | `http://localhost:5007/api/admin/purchases` | - |
| Get Purchase by id | `GET` | `http://localhost:5007/api/admin/purchases/:id` | --- |
| Update Purchase | `PUT` | `http://localhost:5007/api/admin/purchases/:id` | `{"discount": 70,"notes": "Updated purchase order"}` |
| Mark Purchase as Ordered | `PATCH` | `http://localhost:5007/api/admin/purchases/:id/order` | `{"discount": 70, "notes": "Updated purchase order"}` |
| Receive Purchase | `PATCH` | `http://localhost:5007/api/admin/purchases/:id/receive` | `{ "receivedItems": [  {      "productId": "6a75ce2b90169e281123abac", "variantId": "6a75d0fb90169e281123abae", "quantity": 20  } ]}` |

### Admin Supplier
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Create supplier | `POST` | `http://localhost:5007/api/admin/suppliers` | `{ "name": "ABC Distributors", "code":"SUP001",  "contactPerson": "John Perera","email":"john@abcdistributors.com", "phoneNumber":"0771234567","address":"Colombo,Sri Lanka","notes": "Main grocery supplier"}`|
| Get all suppliers | `GET` | `http://localhost:5007/api/admin/suppliers` | - |
| Get supplier by id | `GET` | `http://localhost:5007/api/admin/suppliers/:id` | - |
| update supplier | `PATCH`| `http://localhost:5007/api/admin/suppliers/:id` | `{"isActive": true}` |
| Delete | `DELETE` | `http://localhost:5007/api/admin/suppliers/id` | - |

### Admin Inventory
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Adjust Stock | `POST` | `http://localhost:5007/api/admin/inventory/adjust` | `{"productId": "PRODUCT_ID",  "movementType": "IN",  "quantity": 50,  "reason": "New stock received",  "referenceType": "PURCHASE", "notes": "Supplier delivery"}`|
| Get Inventory Summary | `GET` | `http://localhost:5007/api/admin/inventory/summary` | - |
| Get Low Stock | `GET` | `http://localhost:5007/api/admin/inventory/low-stock` | - |
| Get History | `GET` | `http://localhost:5007/api/admin/inventory/history` | - |

### Notifications
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Get all notifications | `GET` | `http://localhost:5007/api/notifications` | - |
| Get notification by ID | `GET` |`http://localhost:5007/api/notifications` | - |
| Mark one notification as read | `PATCH` | `http://localhost:5007/api/notifications/:id/read` | - |
|Mark all notifications as read | `PATCH` | `http://localhost:5007/api/notifications/read-all` | - |
|Delete notification | `DELETE` | `http://localhost:5007/api/notifications/:id` | - |


### Invoice
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Get Invoices-ADMIN | `GET`| `http://localhost:5007/api/invoices/admin`  | - |
| Get Invoice by ID-ADMIN | `GET`| `http://localhost:5007/api/invoices/admin/:id` | - |
| Download Invoice-ADMIN | `GET`| `http://localhost:5007/api/invoices/admin/:id/pdf` | - |
| Get my Invoices-CUST |  `GET` | `http://localhost:5007/api/invoices/customer`| - |
| Get my Invoice by Id-CUST | `GET` | `http://localhost:5007/api/invoices/customer/:id`| - |
| Download my Invoice by Id-CUST | `GET` | `http://localhost:5007/api/invoices/customer/:id/pdf`| - |

### Sales
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Get all sales | `GET`| `http://localhost:5007/api/admin/sales` | - |
| Dashboard sales summary | `GET` | `http://localhost:5007/api/admin/sales/summary` | - |
| Revenue report | `GET` |`http://localhost:5007/api/admin/sales/revenue` | - |
| Sold products report | `GET` |`http://localhost:5007/api/admin/sales/products` | - |
| Category sales report | `GET` | `http://localhost:5007/api/admin/sales/categories` | - |
| Export sales | `GET` | `http://localhost:5007/api/admin/sales/export` | - |
| Get single sale | `GET` | `http://localhost:5007/api/admin/sales/:id` | - |

### Payment
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Create Payment Checkout-CUST | `POST` | `http://localhost:5007/api/payments/checkout`| `{"orderId": "ORDER_ID"}` |
| Confirm Successful Payment-CUST | `POST` |  `http://localhost:5007/api/payments/success` | `{"sessionId": "cs_test_STRIPE_SESSION_ID"}` |
| Get All Payments-ADMIN | `GET` |  `http://localhost:5007/api/payments` | - |
| Get Payment By ID-ADMIN | `GET` |  `http://localhost:5007/api/payments/:id` | - |

### Media
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Upload image| `POST` | `http://localhost:5007/api/media/upload` | - |
| Get Image url | `GET` | `http://localhost:5007/api/media/:id/url` | -|
| Get profile image url | `GET` | `http://localhost:5007/api/media/profile/:id/url` | - |
| Update image | `PATCH` | `http://localhost:5007/api/media/:id` | - |
| Delete image | `DELETE` | `http://localhost:5007/api/media/:id` | - |

### Customers
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Get all customers |`GET` | `http://localhost:5007/api/customers` | - |
|Search customers | `GET` | `http://localhost:5007/api/customers?search=john` | - |
|Get customers with pagination | `GET` | `http://localhost:5007/api/customers?page=1&limit=10` | - |
| Filter active customers| `GET` | `http://localhost:5007/api/customers?isActive=true` |- |
|Get customer by ID | `GET` | `http://localhost:5007/api/customers/:id` | - |
| Get customer's orders | `GET` | `http://localhost:5007/api/customers/:id/orders` | - |
| Get customer's sales | `GET` | `http://localhost:5007/api/customers/:id/sales` | - |
|Get customer summary| `GET` | `http://localhost:5007/api/customers/:id/summary`| - |
| Activate customer | `PATCH` | `http://localhost:5007/api/customers/:id/status` | `{"isActive": true}` |
| Deactivate customer | `PATCH` | `http://localhost:5007/api/customers/:id/status` | `{"isActive": false}` |
| Get account closure reasons and counts | `GET` | `http://localhost:5007/api/customers/closure-reasons` | - |
| --- | --- | --- | --- |