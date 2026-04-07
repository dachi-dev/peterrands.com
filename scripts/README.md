# Pet Errands Scripts

## create-stripe-products.js

Programmatically provisions Stripe Products, recurring Prices, and Payment
Links for Pet Errands subscription services. Output is pre-formatted so you
can paste each service's `PAYMENT_LINKS` constant directly into its page.

### Prerequisites

```bash
npm install stripe
```

### Usage

**Always run in TEST mode first** to verify the output before going live:

```bash
STRIPE_SECRET_KEY=sk_test_xxx node scripts/create-stripe-products.js
```

Then run in LIVE mode:

```bash
STRIPE_SECRET_KEY=sk_live_xxx node scripts/create-stripe-products.js
```

The script prints the generated payment links to stderr in a human-readable
block, and to stdout as JSON (so you can redirect it to a file).

```bash
STRIPE_SECRET_KEY=sk_test_xxx node scripts/create-stripe-products.js > links.json
```

### What it creates

For each service in the `CATALOG` constant (waste-pickup, dog-walking,
dog-relief), the script creates:

- 1 Stripe Product
- 4 recurring monthly Prices (Lite / Basic / Standard / Premium)
- 4 Payment Links, one per price

Each Payment Link redirects to `https://peterrands.com/success.html` on
completion.

### Important notes

- **Non-idempotent.** Running the script twice creates duplicate products and
  prices. Run once per environment (test, live) and save the output. Clean up
  duplicates in the Stripe Dashboard if needed.
- **Editing pricing.** Update the `CATALOG` constant at the top of the script.
  Amounts are in cents.
- **Metadata.** Each price and payment link gets `service` and `tier` metadata
  so you can filter them later in the Stripe Dashboard or via the API.

### After running

Copy the printed `PAYMENT_LINKS` blocks into:

- `waste-pickup/index.html`
- `dog-walking/index.html`
- `dog-relief/index.html`

Reload the pages and the "Get Started" buttons will route to the correct
Stripe checkout for each tier.
