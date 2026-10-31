import { COMPANY } from '../config/company.js';
import { strings } from '../i18n/fa.js';

// Builds the search-engine content written into index.html at build time (see vite.config.js):
// the page title and description, a visually hidden Persian summary of the company and its
// products, and Organization structured data. Crawlers read it without running the 3D game.

/**
 * Escapes text for use inside HTML.
 * @param {string} text - Plain text.
 * @returns {string} HTML-safe text.
 */
const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  );

/**
 * Title and description tags.
 * @returns {string} HTML for the head.
 */
export function seoHead() {
  return [
    `<title>${escapeHtml(strings.seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(strings.seo.description)}" />`,
  ].join('\n    ');
}

/**
 * Visually hidden summary of the company, its products and contact details.
 * @returns {string} HTML for the body.
 */
export function seoSummary() {
  const { contact, about, products } = COMPANY;
  const items = products
    .map((p) => `<li><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description)}</p></li>`)
    .join('');
  const address = strings.landing.fullAddress(contact.address, contact.city);
  return `<section class="sr-only" aria-label="${escapeHtml(strings.seo.summaryLabel)}">
      <h1>${escapeHtml(COMPANY.name)}</h1>
      <p>${escapeHtml(COMPANY.tagline)}</p>
      <p>${escapeHtml(about.history)}</p>
      <h2>${escapeHtml(strings.seo.productsHeading)}</h2>
      <ul>${items}</ul>
      <h2>${escapeHtml(strings.landing.sections.contact)}</h2>
      <p>${escapeHtml(address)}</p>
      <p>${escapeHtml(`${strings.landing.phone}: ${contact.phone}`)}</p>
      <p>${escapeHtml(`${strings.landing.email}: ${contact.email}`)}</p>
    </section>`;
}

/**
 * Organization structured data (schema.org JSON-LD).
 * @returns {string} Script tag.
 */
export function seoStructuredData() {
  const { contact } = COMPANY;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY.name,
    description: COMPANY.tagline,
    url: contact.website,
    email: contact.email,
    telephone: contact.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contact.address,
      addressLocality: contact.city,
      addressCountry: 'IR',
    },
    sameAs: contact.socials.map((social) => social.url),
  };
  // "<" is escaped so no value can close the script tag early.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}
