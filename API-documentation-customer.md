# Customer Endpoints

### Customer Auth
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Register-Request OTP | `POST` | `http://localhost:5007/api/customer/auth/request-otp` | `{"fullName": "FULL_NAME", "email": "test@gmail.com", "phoneNumber": "0771234578", "password": "Password123#", "verificationType": "EMAIL"}` |
| Register-Verify OTP | `POST` | `http://localhost:5007/api/customer/auth/verify-otp` | `{"email": "test@gmail.com", "otp":"OTP",    "verificationType": "EMAIL"}`|
| Login | `POST` | `http://localhost:5007/api/customer/auth/login` | `{ "email": "test@gmail.com",  "password": "Password123#"}` |
| Logout | `POST` | `http://localhost:5007/api/customer/auth/logout` | - |
| Get Customer Profile | `GET` | `http://localhost:5007/api/customer/auth/profile` | - |
| Update Customer Profile | `PUT` | `http://localhost:5007/api/customer/auth/profile` | `{"fullName":"Sri Miro"}` |
| Forget Password-Request OTP | `POST` | `http://localhost:5007/api/customer/auth/forgot-password/request-otp` | `{"email": "smirona16@gmail.com"}` |
| Forget Password-Verify OTP | `POST` | `http://localhost:5007/api/customer/auth/forgot-password/verify-otp` | `{"email": "smirona16@gmail.com", "otp": "396867"}` |
| Forget Password-Rest Password | `POST` | `http://localhost:5007/api/customer/auth/forgot-password/reset` | `{  "resetToken": "RESET_TOKEN",  "newPassword": NEW PASSWORD"}` |
| Change Password | `POST` | `http://localhost:5007/api/customer/auth/change-password` | `{ "currentPassword": "123456789", "newPassword":"Password12#"}`|
| Delete Account | `DELETE` | `http://localhost:5007/api/customer/auth/delete-account` | - |
| Change Phone Number-Request OTP | `POST` | `http://localhost:5007/api/customer/auth/change-phone/request` | `-` |
| Change Phone Number-Verify OTP | `POST` | `http://localhost:5007/api/customer/auth/change-phone/verify` | `{"otp": "871383"}` |
| Change Phone Number | `POST` | `http://localhost:5007/api/customer/auth/change-phone/confirm` | `{"verificationToken":"VERIFICATION_TOKEN", "phoneNumber": "0771234567"}` |

### Customer Category
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Get All Categories | `GET` | `http://localhost:5007/api/customer/categories` | - |
| Get Category by ID | `GET` | `http://localhost:5007/api/customer/categories/:id` | - |
| Get All Categories | `GET` | `http://localhost:5007/api/customer/categories/search?q=beV` | `KEY:q`, `VALUE:beVerages` |

### Customer Offer
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Get All Offer | `GET` | `http://localhost:5007/api/customer/offers` | - |
| Get Offer by ID | `GET` | `http://localhost:5007/api/customer/offers/:id` | - |

### Customer Product 
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Get All Products | `GET` | `http://localhost:5007/api/customer/products` | --- |
| Get Product by ID | `GET` | `http://localhost:5007/api/customer/products/:id` | --- |
| Get Product Pagination | `GET`| `http://localhost:5007/api/customer/products?page=1&limit=5` | --- |
| Get Products sort(oldest, newest)| `GET` | `http://localhost:5007/api/customer/products?sort=oldest` | --- |
| Get products by category | `GET` | `http://localhost:5007/api/customer/products?category=id` | --- |
| Get Products Combined filter | `GET` | `http://localhost:5007/api/customer/products?search=cola&category=id&page=1&limit=5&sort=name_asc` | --- |
| Search Products | `GET` | `http://localhost:5007/api/customer/products/search?q=milk` | --- |

### Customer Order
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Create Customer Order | `POST` | `http://localhost:5007/api/customer/orders` | `//product without variant{  "items": [  { "productId": "ID", "quantity": 2  } ], "paymentMethod": "CASH",  "deliveryAddress": {"address": "123 Main Street, Colombo", "contactName": "John Doe", "contactPhone": "0771234567",   "instructions": "Please call when you arrive.",  "location": {  "type": "Point",    "coordinates": [ 79.8612, 6.9271 ]}}}`, `//product with variant{  "items": [    {      "productId": "68abc1234567890123456789",      "variantId": "68def1234567890123456789",      "quantity": 2    }  ],  "paymentMethod": "CASH",  "deliveryAddress": {    "address": "123 Main Street, Colombo",    "contactName": "John Doe",    "contactPhone": "0771234567",    "instructions": "Please call when you arrive.",    "location": {      "type": "Point",      "coordinates": [        79.8612,        6.9271      ]    }  }}` |
| Get all orders | `GET` | `http://localhost:5007/api/customer/orders` | - |
| Get order by ID | `GET` | `http://localhost:5007/api/customer/orders/:id` | - |
| Cancel Order | `PATCH` | `http://localhost:5007/api/customer/orders/:id`  | - |

### Customer wishlist
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Add to wishlist | `POST` | `http://localhost:5007/api/customer/wishlist` | `{"productId": "PRODUCT_ID"}`|
| Get all wish-listed products | `GET` | `http://localhost:5007/api/customer/wishlist` | - |
| Check whether a product is wish-listed | `GET` | `http://localhost:5007/api/customer/wishlist/:productId` | - |
| Remove product from wish-list | `DELETE` | `http://localhost:5007/api/customer/wishlist/:productId` | - |


### Customer Address
| Name | Method | API | Body |
| --- | --- | --- | --- |
|Create Customer Address | `POST` | `http://localhost:5007/api/customer/addresses` | `{"label":"Home","houseNumber":"25A","street":"Main Street","landmark":"Near the bus stand","city":"Jaffna","country":"Sri Lanka","specialInstruction":"Call before delivery"}` |
| Get All Customer Addresses | `GET` | `http://localhost:5007/api/customer/addresses` | - |
| Get Customer Address By ID | `GET` |  `http://localhost:5007/api/customer/addresses/:id` | -|
| Update Customer Address | `PUT` |  `http://localhost:5007/api/customer/addresses/:id` | `{"label":"Office","houseNumber":"10","street":"Hospital Road","landmark":"Near the hospital","city":"Jaffna","country":"Sri Lanka","specialInstruction":"Deliver to reception"}`|
| Delete Customer Address | `DELETE` |  `http://localhost:5007/api/customer/addresses/:id` | -|