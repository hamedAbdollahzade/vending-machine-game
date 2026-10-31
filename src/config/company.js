// Everything about the company in one place: name, colours, contact details, history and the
// product line. Replace the values marked `TODO(company)` with real content; nothing else in the
// game needs to change. Colours are plain hex so both CSS (styles/gameTheme.js) and Three.js
// materials can use them.
import { ASSETS } from './assets.js';

/**
 * @typedef {object} Product
 * @property {string} id - Stable id used by the showroom and missions.
 * @property {string} name - Full product name.
 * @property {string} shortLabel - Short label for buttons.
 * @property {number} channels - Number of product channels.
 * @property {string} priceLabel - Price as shown to people.
 * @property {number} priceNumeric - Price in rial.
 * @property {string} description - One or two sentences.
 * @property {string[]} highlights - Key specs, shown as a list.
 * @property {string} image - Main image path, from config/assets.js.
 * @property {string} imageAlt - Alternative colour image path.
 * @property {string} gif - Animated view path.
 */

// Brand palette derived from the primary colour #00a693. On the dark game surfaces the primary is
// used for accents and text (contrast 6.0:1 on `surface`); buttons filled with the primary use the
// dark `onPrimary` text (contrast 5.5:1).
const COLORS = {
  primary: '#00a693',
  primaryLight: '#33b8a9',
  primaryLighter: '#9fe0d6',
  primaryDark: '#007d6e',
  primaryDarker: '#00473f',
  onPrimary: '#03221e',
  surface: '#0b1614',
  surfaceRaised: '#13231f',
  surfaceDeep: '#060c0b',
  text: '#ecf2ee',
  textMuted: '#a9bdb6',
  accent: '#f2c94c',
  danger: '#ff6b5e',
};

export const COMPANY = {
  name: 'شرکت روبات مارکت',
  shortName: 'روبات مارکت',
  tagline: 'سازندهٔ دستگاه‌های وندینگ هوشمند',
  colors: COLORS,
  // TODO(company): real postal address, phone, email, website and social links.
  contact: {
    address: 'بزرگراه مشهد–چناران، خیابان کاله، کنار پارک علم و فناوری خراسان',
    city: 'مشهد',
    phone: '۰۵۱-۰۰۰۰۰۰۰۰',
    email: 'info@example.com',
    website: 'https://example.com',
    socials: [
      { id: 'instagram', label: 'اینستاگرام', url: 'https://instagram.com/' },
      { id: 'telegram', label: 'تلگرام', url: 'https://t.me/' },
      { id: 'linkedin', label: 'لینکدین', url: 'https://linkedin.com/' },
    ],
  },
  // TODO(company): real history, values, FAQ and open positions.
  about: {
    history: 'متن کوتاه تاریخچهٔ شرکت اینجا قرار می‌گیرد.',
    values: ['کیفیت ساخت', 'پشتیبانی شبانه‌روزی', 'فناوری بومی'],
    faq: [{ question: 'پرسش نمونه؟', answer: 'پاسخ نمونه.' }],
    careers: [{ title: 'عنوان شغل نمونه', note: 'توضیح کوتاه' }],
  },
  /** @type {Product[]} Display prices in rial; independent of the in-game snack economy. */
  products: [
    {
      id: 'rm-35',
      category: 'warm-vending',
      name: 'روبات مارکت ۳۵ کانال',
      shortLabel: '۳۵ کانال',
      channels: 35,
      priceLabel: '4,680,000,000 ریال',
      priceNumeric: 4680000000,
      description:
        'یخچالدار، ۳۵ کانال اختصاصی، سیستم خنک‌کننده قدرتمند، تحویل نرم، مدیریت آنلاین ۲۴ ساعته.',
      highlights: ['یخچالدار', '۳۵ کانال اختصاصی', 'تحویل نرم', 'مدیریت آنلاین ۲۴ ساعته'],
      ...ASSETS.products['rm-35'],
    },
    {
      id: 'rm-48',
      category: 'warm-vending',
      name: 'روبات مارکت ۴۸ کانال',
      shortLabel: '۴۸ کانال',
      channels: 48,
      priceLabel: '5,480,000,000 ریال',
      priceNumeric: 5480000000,
      description: 'یخچالدار، ۴۸ کانال اختصاصی، قابلیت‌های پیشرفته مدیریت آنلاین و تحویل کالا.',
      highlights: ['یخچالدار', '۴۸ کانال اختصاصی', 'مدیریت آنلاین پیشرفته', 'تحویل هوشمند کالا'],
      ...ASSETS.products['rm-48'],
    },
    {
      id: 'rm-60',
      category: 'warm-vending',
      name: 'روبات مارکت ۶۰ کانال',
      shortLabel: '۶۰ کانال',
      channels: 60,
      priceLabel: '5,980,000,000 ریال',
      priceNumeric: 5980000000,
      description: 'یخچالدار، ۶۰ کانال اختصاصی برای کسب‌وکارهای پرتردد.',
      highlights: ['یخچالدار', '۶۰ کانال اختصاصی', 'مناسب اماکن پرتردد', 'ظرفیت بالا'],
      ...ASSETS.products['rm-60'],
    },
  ],
};
