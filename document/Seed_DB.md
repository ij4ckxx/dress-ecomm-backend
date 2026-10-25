# Task: Reset Database and Seed Complete Ecommerce Test Data

I want to completely reset the existing database and populate it with fresh, realistic ecommerce data. The goal is to test the entire customer and admin experience with properly connected data.

**Important:** Inspect the existing codebase, Prisma schema, database relationships, and seed scripts before making any changes. Reuse the existing architecture and do not break existing functionality.

## 1. Reset the Database

- Clear all existing application data from the database.
- Respect foreign key constraints and delete records in the correct order.
- Preserve the existing database schema, migrations, configuration, and environment settings.
- Do not drop or recreate the database itself unless absolutely necessary.
- Do not modify or delete existing schema models or migrations just to reset the data.
- Use the existing ORM and database tooling.
- Make sure the reset targets the intended development/test database, not production.
- Perform the reset and seeding process safely, preferably within a transaction where supported.

## 2. Create 6 Main Categories

Create exactly **6 main product categories**, each with a suitable image.

- Use realistic category names relevant to the existing dress ecommerce application.
- Assign an appropriate image to every category.
- Follow the existing image storage conventions, such as Cloudinary or the current image provider.
- Ensure image URLs are valid and compatible with the existing frontend.
- Use unique, meaningful slugs and populate all required fields.

## 3. Create Nested Categories and Subcategories

Create approximately **3–5 subcategories under applicable main categories**.

- Some categories should contain subcategories, while others should have no subcategories.
- For selected subcategories, add another level of nested subcategories.
- Maintain valid parent-child relationships using the existing database schema.
- Ensure that categories without subcategories are handled correctly.
- Avoid duplicate names or slugs within the relevant scope.
- Make sure the category hierarchy works correctly with the existing category APIs, navigation, filtering, and admin management pages.

The final data should represent a realistic hierarchical ecommerce catalog rather than a flat collection of categories.

## 4. Create Exactly 110 Products

Seed **110 distinct products** across the category hierarchy.

Each product should have realistic data according to the existing Prisma schema, including applicable fields such as:

- Product name and slug
- Description
- Price and sale price, where supported
- Product images
- Category and subcategory relationships
- SKU or product identifier
- Stock quantity and availability
- Product status and visibility
- Variants such as size and color, if supported
- Other required fields defined by the existing schema

Requirements:

- Distribute products across different categories and subcategories.
- Include a realistic variety of dresses, clothing styles, colors, sizes, and price ranges.
- Use unique slugs and SKUs where required.
- Ensure all required relations and constraints are satisfied.
- Use valid image URLs from the existing image provider or another suitable source.
- Ensure the products can be displayed correctly on the customer-facing storefront and admin dashboard.
- Do not create 110 copies of the same product with minor name changes.
- Ensure the product count is exactly 110 after seeding.

## 5. Configure the Super Admin

Read the existing `document/admin/SUPER_ADMIN.md` file carefully.

Follow its documented instructions to configure the super admin account.

- Use the existing authentication and authorization implementation.
- Follow the documented super admin creation process and required fields.
- Ensure the account has the correct super admin role and permissions.
- Use the existing secure password hashing and authentication mechanisms.
- Do not hardcode credentials into application source code or expose secrets in logs.
- Do not bypass existing authorization checks.
- Verify that the super admin can log in and access the intended admin functionality.

Do not invent additional super admin credentials or permissions that conflict with the documentation.

## 6. Create Exactly 4 Orders

Create **4 realistic orders** associated with valid customer accounts and existing products.

Follow the existing order schema and business logic.

- Ensure each order has valid customer, address, product, and order-item relationships as required.
- Use realistic quantities, prices, totals, shipping details, and payment information supported by the schema.
- Use different order statuses supported by the existing implementation so that various admin workflows can be tested.
- Include relevant payment statuses and methods supported by the application.
- Ensure order totals are consistent with their line items, discounts, shipping charges, and taxes where applicable.
- Use valid order numbers and unique identifiers.
- Ensure stock quantities and order records remain consistent with the application's existing inventory rules.
- Create customer accounts for the orders if necessary, following the existing account model.
- Do not create inconsistent or orphaned records.

Use the existing order creation logic or service where practical so that important business rules are respected.

## 7. Verify the Customer and Admin Workflows

After seeding, verify that the generated data works throughout the application.

### Customer-facing functionality

- Category and nested category navigation
- Product listing and product details
- Product images and product variants
- Product availability and stock display
- Existing search, sorting, and filtering functionality
- Customer accounts and order history, where supported

### Admin functionality

- Super admin login and authorization
- Category and nested category listings
- Product listings, details, stock, and status
- Customer records
- All 4 orders, including their statuses and totals
- Order management and supported status transitions
- Dashboard statistics and summary cards
- Pagination, filtering, and search
- Any existing admin pages that depend on seeded database records

Do not assume the data is correct merely because the seed script completes. Verify that the existing APIs and admin UI can retrieve and display the records correctly.

## 8. Seed Script Requirements

Implement or update the existing seed script rather than creating unnecessary duplicate scripts.

- Keep the seed data organized and maintainable.
- Reuse existing models, services, utilities, and validation rules where appropriate.
- Make the process deterministic so that the expected record counts can be reproduced.
- Use transactions where supported and appropriate.
- Handle foreign key dependencies in the correct order.
- Ensure the reset-and-seed process does not create duplicate records on repeated execution.
- Report meaningful errors when seeding fails.
- Do not weaken validation or database constraints to make the seed script succeed.

## 9. Final Verification

After completing the implementation, verify and report:

- Total main categories: **6**
- Total products: **110**
- Total orders: **4**
- Total nested category and subcategory counts
- Super admin configuration and authorization status
- Whether all seeded images and relationships are valid
- Whether the customer and admin workflows were tested successfully
- Any remaining issues or limitations

Run the available linting, type checks, tests, and relevant database validations where applicable.

## Final Instruction

Reset the existing development/test data and populate it with a complete, realistic ecommerce dataset. The customer storefront and admin panel must both work with the new data.

**Preserve the existing schema, business logic, authentication, APIs, and frontend functionality. Do not make unrelated changes. Inspect first, implement carefully, seed the data, and verify the results before declaring the task complete.**