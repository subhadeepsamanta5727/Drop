# AlphaDrop backend

1. Copy `.env.example` to `.env` and set MongoDB, JWT, Razorpay, and Cloudinary credentials.
2. Run `npm.cmd install`, then `npm.cmd run dev` from this folder.
3. Verify `GET /api/health`.

Key endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/payment/create-order`, `POST /api/webhook/razorpay`, `GET /api/dashboard/subscription`, `GET /api/dashboard/onetime`, and `GET /api/dashboard/download/:contentId/:fileId`. All routes except auth, webhook, and health require `Authorization: Bearer <token>`.

Admin content upload: `POST /api/admin/upload-daily` as multipart form-data with one or more `files`, `title`, `targetTier`, and optional `notes`. New files are held in memory during the request, uploaded to Cloudinary, and saved with their secure URL and public ID. Downloads remain protected by the API entitlement checks before redirecting to Cloudinary.

Required Cloudinary variables:

`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
