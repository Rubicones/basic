/**
 * The company behind the site, once.
 *
 * The footer, the legal pages and the policies' own text all name it; a phone
 * number that changes in one place and not another is exactly the kind of error
 * a legal notice must not have. The values are registry data and stay in Latin
 * script in every locale — they have to match the business register verbatim.
 */
export const COMPANY = {
  legalName: "BASIC COFFEE & BREAKFAST DOO BEOGRAD",
  brand: "basic",
  street: "Admirala Geprata 10",
  postcode: "11000",
  city: "Beograd",
  /** Matični broj — the company registration number. */
  mb: "22056328",
  /** Poreski identifikacioni broj — the tax number. */
  pib: "114689438",
  /** The street address on Google Maps — the footer links the address to it. */
  mapsHref:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("Admirala Geprata 10, 11000 Beograd, Serbia"),
  phone: "+381 61 703 8255",
  phoneHref: "tel:+381617038255",
  email: "basiccoffeers@gmail.com",
} as const;
