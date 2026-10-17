# Maison De Élégance — Dress & Fashion E-Commerce Backend

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-v5.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-v6.4-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20DB-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-0C2340?logo=razorpay&logoColor=white)](https://razorpay.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A modular, high-performance RESTful API service built for luxury apparel, designer dresses, and fashion e-commerce. Built with **Node.js**, **Express 5**, and **Prisma ORM**, strictly following clean **function-based architecture** and enterprise-grade transactional e-commerce practices.

---

## Table of Contents

- [Overview](#overview)
- [Key Architectural Highlights](#key-architectural-highlights)
- [Core Features](#core-features)
  - [Storefront & Customer Features](#storefront--customer-features)
  - [Admin & Back-Office Operations](#admin--back-office-operations)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [API Route Map](#api-route-map)
- [Security & Performance](#security--performance)
- [Deployment](#deployment)
- [Contributing & Code Standards](#contributing--code-standards)
- [License](#license)

---

## Overview

**Maison De Élégance Backend** powers both luxury storefront user experiences and comprehensive administrative back-office operations. It handles product catalog management with multi-variant sizing and colors, real-time inventory reservation, multi-channel payment reconciliation (Razorpay & Cash on Delivery), order fulfillment workflows, and automated customer transactional notifications.

---

## Key Architectural Highlights

- **Pure Functional Architecture:** 100% function-based service and controller design (**zero classes**) with strict separation of concerns, explicit parameter passing, and stateless request execution.
- **Prisma Schema Folder:** Structured multi-file schema architecture using Prisma's `prismaSchemaFolder` preview feature, isolating domain models across `auth`, `catalog`, `cart`, `order`, `promotion`, `address`, and `settings`.
- **Dual API Route Compatibility:** Seamlessly resolves requests under both the versioned `/api/v1` namespace and the `/api` alias for frontend convenience.
- **Strict Data Validation:** Comprehensive input schema validation powered by **Zod** across every route before reaching service handlers.
- **Automated Communication Engine:** Event-driven email dispatches for order confirmations, COD admin alerts, password resets, and concierge inquiries via Nodemailer SMTP.

---

## Core Features

### Storefront & Customer Features

- **Authentication & Account Security:**
  - JWT access tokens with rotating, cryptographically hashed refresh tokens.
  - Self-service password recovery flow with single-use, 1-hour time-limited cryptographic tokens.
  - Anti-enumeration security protection on customer lookup endpoints.
  - Password updates, address book management, and user profile settings.

- **Catalog & Merchandising:**
  - Multi-variant garment catalog (Sizes: XS–3XL, Custom, Colors, Fabrics, SKUs, Barcodes).
  - Categorization with hierarchical parent/child categories and slug-based lookup.
  - Curated seasonal collections (e.g., Bridal, Evening Wear, Festive Luxe).
  - Rich search, multi-facet filtering (price, category, availability), and sorting.

- **Shopping Cart & Wishlist:**
  - Persistent cart state for both authenticated users and guest sessions.
  - Dynamic subtotal, tax calculation, and instant stock availability verification.
  - Customer wishlist management for saving favorite garments.

- **Checkout & Payments:**
  - BigCommerce-style transactional checkout flow with atomic inventory checks.
  - **Razorpay Integration:** Order creation and cryptographically verified HMAC signature validation.
  - **Cash on Delivery (COD):** Post-order operational verification and staff alert workflow.
  - Real-time coupon and promotional discount engine with usage caps and minimum spend validation.

- **Customer Concierge:**
  - Public inquiry submission for custom measurements and bespoke fashion consultations.
  - Automated dual-email notification to store support and customer acknowledgment.

---

### Admin & Back-Office Operations

- **Role-Based Access Control (RBAC):** Tiered roles (`SUPER_ADMIN`, `ADMIN`, `STAFF`) with isolated routes.
- **Product & Variant Management:** Full CRUD operations for products, variants, images, pricing, and tags.
- **Inventory & Stock Ledger:** Track stock levels, set low-stock thresholds, and view audit trail records.
- **Order Lifecycle Management:** Order state machine (`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED` / `CANCELLED`), courier tracking ID assignment, and status dispatch emails.
- **Promotions & Coupon Studio:** Percentage and fixed-amount coupons, flash sales, validity windows, and per-user limits.
- **Storefront Settings & Audit Logs:** Manage store metadata, policy configurations, banner texts, and tamper-evident administrative action logging.

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v18+) (ES Modules) | High-throughput asynchronous runtime |
| **Framework** | Express.js (v5.2) | HTTP routing and middleware framework |
| **Database** | PostgreSQL (Neon Serverless) | ACID-compliant relational persistence |
| **ORM** | Prisma (v6.4) | Type-safe query building and multi-file schema management |
| **Validation** | Zod (v4.6) | Runtime schema validation for requests |
| **Authentication** | JWT (`jsonwebtoken`) & `bcryptjs` | Access/Refresh tokens & secure password hashing |
| **Payments** | Razorpay SDK (v2.9) | Order orchestration & webhook signature verification |
| **Notifications** | Nodemailer (v10.1) | Transactional HTML email dispatches via SMTP |
| **Security** | Helmet, CORS, Express-Rate-Limit | Header hardening, CORS rules, and rate protection |
| **Caching** | Node-Cache (v5.1) | In-memory key-value caching for frequent queries |

---

## Project Directory Structure

```text
dress-ecomm-backend/
├── document/                   # API contracts, workflows & technical specifications
│   ├── customer/               # Storefront & checkout API integration guides
│   ├── 16.missing_apis.md      # Gap analysis & feature implementation roadmap
│   └── CODE_STRUCTURE.md       # Architectural principles (Functional, Zero Classes)
├── prisma/
│   └── schema/                 # Modular domain schema files (prismaSchemaFolder)
│       ├── address.prisma      # Customer addresses & shipping locations
│       ├── auth.prisma         # Users, refresh tokens & password reset tokens
│       ├── base.prisma         # Generator & datasource configuration
│       ├── cart.prisma         # Shopping cart & line item models
│       ├── catalog.prisma      # Products, variants, categories & collections
│       ├── order.prisma        # Orders, order items & payment transactions
│       ├── promotion.prisma    # Coupons, discounts & campaigns
│       └── settings.prisma     # Store settings, audit logs & customer inquiries
├── src/
│   ├── config/                 # Environment validation, database client & constants
│   ├── constants/              # HTTP status codes & business logic constants
│   ├── controllers/            # Route controllers (admin/ & client/)
│   ├── middlewares/            # Auth guards, role checks, error handlers & rate limiters
│   ├── routes/                 # Express route definitions
│   │   ├── admin/              # Back-office admin endpoints (/admin/*)
│   │   ├── client/             # Customer storefront endpoints
│   │   ├── auth.routes.js      # Authentication & recovery endpoints
│   │   └── index.js            # Unified route aggregator
│   ├── services/               # Core business logic & database queries
│   │   ├── admin/              # Admin services (catalog, inventory, orders, analytics)
│   │   ├── client/             # Client services (checkout, cart, payments, customer)
│   │   └── notification/       # SMTP transactional email services
│   ├── utils/                  # Standardized response formatters & crypto helpers
│   ├── validators/             # Zod validation schemas
│   └── server.js               # Application bootstrap & Express server setup
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** `v18.0.0` or higher
- **npm** `v9.0.0` or higher
- **PostgreSQL** database instance (or [Neon](https://neon.tech/) serverless PostgreSQL)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ij4ckxx/dress-ecomm-backend.git
   cd dress-ecomm-backend
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```
   *(The `postinstall` hook will automatically generate the Prisma client).*

---

### Environment Configuration

Create a `.env` file in the root directory by referencing the template below. Replace the placeholder values with your environment configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1
CLIENT_URL=http://localhost:3000

# Database Configuration (PostgreSQL / Neon)
DATABASE_URL="postgresql://username:password@hostname:5432/database_name?sslmode=require"
DIRECT_URL="postgresql://username:password@hostname:5432/database_name?sslmode=require"

# JWT Authentication
JWT_ACCESS_SECRET="your_jwt_access_secret_here"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_here"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET="your_secure_cookie_secret_here"

# Razorpay Payment Gateway (Test or Live)
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret"

# SMTP Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
SUPPORT_EMAIL="concierge@maisondeelegance.com"
```

> [!WARNING]
> Never commit actual credentials, database connection strings, or secret keys to version control. Always keep your `.env` file in `.gitignore`.

---

### Database Setup

Synchronize your Prisma schemas with your database:

```bash
# Push schema changes to your database
npx prisma db push

# Re-generate the Prisma Client
npx prisma generate
```

---

### Running the Application

- **Development Mode (with Nodemon hot-reload):**
  ```bash
  npm run dev
  ```

- **Production Mode:**
  ```bash
  npm start
  ```

- **Verify Server Health:**
  ```bash
  curl http://localhost:5000/api/v1/health
  ```
  Expected output:
  ```json
  {"status":"ok","message":"E-commerce API is running"}
  ```

---

## API Route Map

All endpoints are accessible via both `/api/v1` and `/api`.

### Storefront / Public Routes

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/register` | Register new customer account | No |
| `POST` | `/api/v1/auth/login` | Authenticate customer / admin & issue tokens | No |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset email (1-hr token) | No |
| `POST` | `/api/v1/auth/reset-password` | Reset password using one-time token | No |
| `POST` | `/api/v1/auth/refresh-token` | Exchange refresh token for new access token | No |
| `GET` | `/api/v1/products` | Browse & filter catalog products | No |
| `GET` | `/api/v1/products/:idOrSlug` | Retrieve product details with variants & stock | No |
| `GET` | `/api/v1/categories` | Retrieve hierarchical category tree | No |
| `GET` | `/api/v1/collections` | Browse curated collections | No |
| `POST` | `/api/v1/contact` | Submit concierge / custom sizing inquiry | No |
| `POST` | `/api/v1/coupons/validate` | Validate coupon code against cart value | Optional |
| `GET` | `/api/v1/cart` | Get current customer / guest cart | Optional |
| `POST` | `/api/v1/cart/items` | Add item variant to cart | Optional |
| `POST` | `/api/v1/checkout/summary` | Calculate taxes, shipping, & final total | Optional |
| `POST` | `/api/v1/checkout` | Place order (Razorpay or COD) | Optional |
| `POST` | `/api/v1/payments/verify` | Verify Razorpay payment signature | Yes |
| `GET` | `/api/v1/orders` | Customer order history | Yes |
| `GET` | `/api/v1/customer/profile` | Customer profile & account details | Yes |

### Back-Office / Admin Routes (`/api/v1/admin/*`)

| Module | Endpoint Prefix | Capabilities |
| :--- | :--- | :--- |
| **Catalog** | `/admin/products` | Create, update, delete products, variants & images |
| **Categories** | `/admin/categories` | Category hierarchy management & reordering |
| **Collections**| `/admin/collections` | Curate seasonal looks & featured collections |
| **Inventory**  | `/admin/inventory` | Stock adjustments, low-stock alerts, & audit history |
| **Orders**     | `/admin/orders` | Order processing, courier assignment & status updates |
| **Promotions** | `/admin/coupons` | Discount rules, validity periods & customer limits |
| **Settings**   | `/admin/settings` | Global store settings & feature switches |
| **Audit Logs** | `/admin/audit-logs` | Administrative activity logs & change tracking |
| **Analytics**  | `/admin/analytics` | Revenue telemetry, top sellers, & cart analytics |

---

## Security & Performance

- **Rate Limiting:** Public endpoints (e.g., authentication, password recovery) are rate-limited via `express-rate-limit` to prevent brute force and email enumeration attacks.
- **Secure Token Storage:** Refresh tokens are cryptographically hashed using SHA-256 before database storage.
- **Header Protection:** Equipped with `helmet` to set HTTP security headers (XSS, CSP, HSTS, frame options).
- **CORS Protection:** Configured with origin reflection to permit requests only from configured frontend domains.
- **Atomic Operations:** Critical checkout and inventory deductions execute inside Prisma transactions (`prisma.$transaction`) to prevent overselling.

---

## Deployment

The application is structured for cloud platforms (such as Render, Railway, AWS ECS, or DigitalOcean):

1. **Build Command:**
   ```bash
   npm install
   ```
   *(Runs `postinstall: prisma generate` automatically)*

2. **Start Command:**
   ```bash
   npm start
   ```

3. **Required Environment Variables:**
   Ensure all variables listed in the [Environment Configuration](#environment-configuration) section are configured in your deployment platform's environment settings.

---

## Contributing & Code Standards

- **Strict Functional Paradigm:** Do not introduce ES6 classes. All services, utilities, and controllers must be exported as functions.
- **Single Responsibility:** Keep controllers focused on HTTP concerns (request parsing, response formatting) and services focused on business logic.
- **Explicit Error Handling:** Use custom `AppError` and predefined HTTP status codes from `constants/httpStatusCodes.js`.

---

## License

This project is licensed under the [ISC License](file:///Users/jegannathan.m/Projects/dress-ecomm-backend/LICENSE).