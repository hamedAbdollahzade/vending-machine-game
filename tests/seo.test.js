import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPANY } from '../src/config/company.js';
import { seoHead, seoStructuredData, seoSummary } from '../src/utils/seoSummary.js';

test('The page head carries the company title and description', () => {
  const head = seoHead();
  assert.ok(head.includes(`<title>${COMPANY.name}`));
  assert.match(head, /<meta name="description" content="[^"]+"/);
});

test('The hidden summary lists the company, every product and the contact details', () => {
  const summary = seoSummary();
  assert.ok(summary.startsWith('<section class="sr-only"'));
  for (const product of COMPANY.products) assert.ok(summary.includes(product.name));
  assert.ok(summary.includes(COMPANY.contact.email));
});

test('Structured data is valid JSON-LD for the organization', () => {
  const json = seoStructuredData().replace(/^<script[^>]*>|<\/script>$/g, '');
  const data = JSON.parse(json);
  assert.equal(data['@type'], 'Organization');
  assert.equal(data.name, COMPANY.name);
  assert.equal(data.address.addressLocality, COMPANY.contact.city);
});
