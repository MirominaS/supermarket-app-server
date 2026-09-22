# Customer Endpoints

### Customer Auth
| Name | Method | API | Body |
| --- | --- | --- | --- |
| Register-Request OTP | `POST` | `http://localhost:5007/api/customer/auth/request-otp` | `{"fullName": "FULL_NAME", "email": "test@gmail.com", "phoneNumber": "0771234578", "password": "Password123#", "confirmPassword": "Password123#", "verificationType": "EMAIL"}` |
| Register-Verify OTP | `POST` | `http://localhost:5007/api/customer/auth/verify-otp` | `{"email": "test@gmail.com", "otp":"OTP",    "verificationType": "EMAIL"}`|
| Login | `POST` | `http://localhost:5007/api/customer/auth/login` | `{ "email": "test@gmail.com",  "password": "Password123#"}` |
| Logout | `POST` | `http://localhost:5007/api/customer/auth/logout` | - |
| Get Customer Profile | `GET` | `http://localhost:5007/api/customer/auth/profile` | - |
| Update Customer Profile | `PUT` | `http://localhost:5007/api/customer/auth/profile` | `{"fullName":"Sri Miro"}` |
| Forget Password-Request OTP | `POST` | `http://localhost:5007/api/customer/auth/forgot-password/request-otp` | `{"email": "smirona16@gmail.com"}` |
| Forget Password-Rest Password | `POST` | `http://localhost:5007/api/customer/auth/forgot-password/reset` | `{"email": "test@gmail.com",    "otp": "396867", "newPassword": "123456789", "confirmPassword": "123456789"}` |
| Change Password | `POST` | `http://localhost:5007/api/customer/auth/change-password` | `{ "currentPassword": "123456789", "newPassword":"Password12#", "confirmPassword": "Password12#"}`|
| Delete Account | `DELETE` | `http://localhost:5007/api/customer/auth/delete-account` | - |
| Change Email-Request OTP | `POST` | `http://localhost:5007/api/customer/auth/change-email/request` | `{"newEmail": "test2@gmail.com"}`|
| Change Email-Verify OTP | `POST` | `http://localhost:5007/api/customer/auth/change-email/verify` | `{"otp": "543386"}` |
| Change Phone Number-Request OTP | `POST` | `http://localhost:5007/api/customer/auth/change-phone/request` | `{"phoneNumber": "+94771234568"}` |
| Change Phone Number-Verify OTP | `POST` | `http://localhost:5007/api/customer/auth/change-phone/verify` | `{"otp": "871383"}` |

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