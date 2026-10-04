/**
 * Pricing utility for calculating regular, sale, offer, effective price and discount percentage
 */

/**
 * Safely converts Decimal or numeric value to a clean float rounded to 2 decimal places
 * @param {any} val
 * @returns {number|null}
 */
const toPriceNumber = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'object' && typeof val.toNumber === 'function' ? val.toNumber() : Number(val);
  return isNaN(num) || num < 0 ? null : Math.round(num * 100) / 100;
};

/**
 * Formats pricing breakdown and calculates effective price and discount percentage
 * @param {any} regularPrice
 * @param {any} [salePrice=null]
 * @param {any} [offerPrice=null]
 * @returns {{ regular: number, sale: number|null, offer: number|null, effective: number, discountPercentage: number }}
 */
export const formatPrice = (regularPrice, salePrice = null, offerPrice = null) => {
  const regular = toPriceNumber(regularPrice) || 0;
  const sale = toPriceNumber(salePrice);
  const offer = toPriceNumber(offerPrice);

  let effective = regular;

  // An offer price takes priority if valid and lower than regular (and lower than sale if sale exists)
  if (offer !== null && offer > 0 && offer < regular) {
    if (sale === null || offer <= sale) {
      effective = offer;
    } else {
      effective = sale;
    }
  } else if (sale !== null && sale > 0 && sale < regular) {
    effective = sale;
  }

  const discountPercentage = regular > effective
    ? Math.round(((regular - effective) / regular) * 100)
    : 0;

  return {
    regular,
    sale,
    offer,
    effective,
    discountPercentage,
  };
};
