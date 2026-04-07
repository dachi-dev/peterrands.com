#!/usr/bin/env node
/**
 * Create Stripe recurring Products, Prices, and Payment Links for all Pet Errands
 * subscription services, then print a JSON block ready to paste into each
 * page's PAYMENT_LINKS constant.
 *
 * USAGE:
 *   1. npm install stripe
 *   2. Run in TEST mode first to verify:
 *        STRIPE_SECRET_KEY=sk_test_xxx node scripts/create-stripe-products.js
 *   3. When happy, run in LIVE mode:
 *        STRIPE_SECRET_KEY=sk_live_xxx node scripts/create-stripe-products.js
 *
 * NOTE: Running this script multiple times creates duplicate products/prices
 * in Stripe. Run once per environment (test, live), save the output, and
 * archive or delete old duplicates in the Stripe Dashboard if needed.
 *
 * To customize pricing, edit the CATALOG constant below.
 */

const Stripe = require('stripe');

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('ERROR: STRIPE_SECRET_KEY env var is required.');
  console.error('Example: STRIPE_SECRET_KEY=sk_test_xxx node scripts/create-stripe-products.js');
  process.exit(1);
}

const mode = key.startsWith('sk_live_') ? 'LIVE' : key.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN';
console.error(`Running in ${mode} mode\n`);

const stripe = Stripe(key);

// ---------------------------------------------------------------------------
// Catalog — edit prices here. Amounts are in cents.
// ---------------------------------------------------------------------------
const CATALOG = {
  'waste-pickup': {
    productName: 'Pet Waste Pickup',
    productDescription: 'Monthly pet waste removal for your yard in Manvel, TX and the greater Houston area.',
    tiers: [
      { key: 'lite',     nickname: 'Lite',     amount: 2500, description: 'Biweekly yard cleanup, up to 2 dogs' },
      { key: 'basic',    nickname: 'Basic',    amount: 3500, description: 'Weekly yard cleanup, up to 2 dogs' },
      { key: 'standard', nickname: 'Standard', amount: 5900, description: 'Twice-weekly cleanup, unlimited dogs, deodorizer' },
      { key: 'premium',  nickname: 'Premium',  amount: 8900, description: 'Three visits per week, unlimited dogs, deodorizer' },
    ],
  },
  'dog-walking': {
    productName: 'Dog Walking',
    productDescription: '30-minute dog walks in Manvel, TX and the greater Houston area. 1 to 5 walks per week.',
    tiers: [
      { key: 'lite',     nickname: 'Lite',     amount: 7900,  description: '1 walk per week, 30 minutes' },
      { key: 'basic',    nickname: 'Basic',    amount: 14900, description: '2 walks per week, 30 minutes' },
      { key: 'standard', nickname: 'Standard', amount: 20900, description: '3 walks per week, 30 minutes' },
      { key: 'premium',  nickname: 'Premium',  amount: 32900, description: '5 walks per week (weekdays), 30 minutes' },
    ],
  },
  'dog-relief': {
    productName: 'Dog Relief Visits',
    productDescription: '15-minute potty-break visits in Manvel, TX and the greater Houston area. 2 to 7 visits per week.',
    tiers: [
      { key: 'lite',     nickname: 'Lite',     amount: 9900,  description: '2 potty visits per week, 15 minutes each' },
      { key: 'basic',    nickname: 'Basic',    amount: 13900, description: '3 potty visits per week, 15 minutes each' },
      { key: 'standard', nickname: 'Standard', amount: 19900, description: '5 potty visits per week (weekdays), 15 minutes each' },
      { key: 'premium',  nickname: 'Premium',  amount: 26900, description: '7 potty visits per week (daily), 15 minutes each' },
    ],
  },
};

// ---------------------------------------------------------------------------

async function provision() {
  const output = {};

  for (const [serviceKey, service] of Object.entries(CATALOG)) {
    console.error(`\n${service.productName}`);
    console.error('─'.repeat(service.productName.length));

    // Create product
    const product = await stripe.products.create({
      name: service.productName,
      description: service.productDescription,
    });
    console.error(`  Product: ${product.id}`);

    output[serviceKey] = {};

    for (const tier of service.tiers) {
      // Create recurring monthly price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.amount,
        currency: 'usd',
        recurring: { interval: 'month' },
        nickname: tier.nickname,
        metadata: {
          service: serviceKey,
          tier: tier.key,
          description: tier.description,
        },
      });

      // Create a payment link for this price
      const link = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: {
          service: serviceKey,
          tier: tier.key,
        },
        // Optional: after_completion redirect to success page
        after_completion: {
          type: 'redirect',
          redirect: { url: 'https://peterrands.com/success.html' },
        },
      });

      output[serviceKey][tier.key] = link.url;
      const dollars = (tier.amount / 100).toFixed(2);
      console.error(`  ${tier.nickname.padEnd(10)} $${dollars.padEnd(7)} ${link.url}`);
    }
  }

  console.error('\n' + '='.repeat(60));
  console.error('Paste these into the PAYMENT_LINKS constant on each page:');
  console.error('='.repeat(60) + '\n');

  for (const [serviceKey, tiers] of Object.entries(output)) {
    console.error(`// ${serviceKey}/index.html`);
    console.error('const PAYMENT_LINKS = {');
    for (const [tierKey, url] of Object.entries(tiers)) {
      console.error(`  ${tierKey.padEnd(9)} '${url}',`);
    }
    console.error('};\n');
  }

  // Also emit machine-readable JSON to stdout
  console.log(JSON.stringify(output, null, 2));
}

provision().catch((err) => {
  console.error('\nFAILED:', err.message);
  if (err.raw) console.error(err.raw);
  process.exit(1);
});
