import { COMPANY } from '@/config/company.js';
import { ASSETS } from '@/config/assets.js';
import { FACTORY } from '@/constants/locations.js';
import { strings } from '@/i18n/fa.js';
import { toLatLon } from '@/utils/geo.js';
import { mapLinks } from '@/utils/mapLinks.js';

const { contact, about } = COMPANY;
const text = strings.landing;
const links = mapLinks(toLatLon(FACTORY.center.x, FACTORY.center.z));
const LINK = 'text-primary underline underline-offset-4';

/**
 * Company history and values.
 * @returns {import('react').ReactElement} Section body.
 */
function AboutBody() {
  return (
    <>
      <p>{about.history}</p>
      <h3 className="mt-4 font-bold">{text.values}</h3>
      <ul className="mt-2 list-inside list-disc">
        {about.values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </>
  );
}

/**
 * Phone, email and website.
 * @returns {import('react').ReactElement} Section body.
 */
function ContactBody() {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
      <dt className="opacity-70">{text.phone}</dt>
      <dd dir="ltr" className="text-end">
        <a className={LINK} href={`tel:${contact.phone}`}>
          {contact.phone}
        </a>
      </dd>
      <dt className="opacity-70">{text.email}</dt>
      <dd dir="ltr" className="text-end">
        <a className={LINK} href={`mailto:${contact.email}`}>
          {contact.email}
        </a>
      </dd>
      <dt className="opacity-70">{text.website}</dt>
      <dd dir="ltr" className="text-end">
        <a className={LINK} href={contact.website} target="_blank" rel="noreferrer">
          {contact.website.replace(/^https?:\/\//, '')}
        </a>
      </dd>
    </dl>
  );
}

/**
 * Postal address with links to open the factory on a map.
 * @returns {import('react').ReactElement} Section body.
 */
function AddressBody() {
  return (
    <>
      <p>{text.fullAddress(contact.address, contact.city)}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a className="start-chip" href={links.osm} target="_blank" rel="noreferrer">
          {`${text.openMap} · OpenStreetMap`}
        </a>
        <a className="start-chip" href={links.google} target="_blank" rel="noreferrer">
          {`${text.openMap} · Google`}
        </a>
      </div>
    </>
  );
}

/**
 * Frequently asked questions as expandable rows.
 * @returns {import('react').ReactElement} Section body.
 */
function FaqBody() {
  return about.faq.map(({ question, answer }) => (
    <details key={question} className="border-b border-white/10 py-2">
      <summary className="cursor-pointer font-bold">{question}</summary>
      <p className="mt-2 opacity-80">{answer}</p>
    </details>
  ));
}

/**
 * Open positions.
 * @returns {import('react').ReactElement} Section body.
 */
function CareersBody() {
  return (
    <ul className="grid gap-3">
      {about.careers.map(({ title, note }) => (
        <li key={title}>
          <strong>{title}</strong>
          <p className="opacity-80">{note}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Photo grid, or a note while there are no photos yet.
 * @returns {import('react').ReactElement} Section body.
 */
function GalleryBody() {
  if (!ASSETS.gallery.length) return <p className="opacity-80">{text.galleryEmpty}</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {ASSETS.gallery.map(({ src, alt }) => (
        <img key={src} src={src} alt={alt} loading="lazy" className="rounded" />
      ))}
    </div>
  );
}

/**
 * Social network links.
 * @returns {import('react').ReactElement} Section body.
 */
function SocialBody() {
  return (
    <div className="flex flex-wrap gap-3">
      {contact.socials.map(({ id, label, url }) => (
        <a key={id} className="start-chip" href={url} target="_blank" rel="noreferrer">
          {label}
        </a>
      ))}
    </div>
  );
}

// Body component for each section key used by InfoSheet.
export const SECTION_BODIES = {
  about: AboutBody,
  contact: ContactBody,
  address: AddressBody,
  faq: FaqBody,
  careers: CareersBody,
  gallery: GalleryBody,
  social: SocialBody,
};
