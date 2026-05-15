# WayBill

A lightweight waybill tracking website with user request submission, admin-issued tracking codes, and shipment tracking.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open the app in your browser:
   ```
   http://localhost:3000
   ```

## How it works

- Users submit their contact details and shipment origin/destination from the home page.
- Users can track their request using the request ID and email (shows pending status).
- Admin reviews pending requests on `admin.html`, issues a tracking code, and activates the shipment.
- The admin email is set to `olaoseibikan232@gmail.com`.
- Users track their active shipments using the issued code and email on the home page.
