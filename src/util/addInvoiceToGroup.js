import accounting from "accounting-js";

/**
 * @summary The taxes support two pricing modes: pre-tax after-tax pricing.
 * When pre-tax is enabled, all defined prices of products, shipment and surcharges the tax is calculated onto do not
 * include the tax.
 *
 * Pre-tax Pricing Example: Product costs 100$ and shipping is 5$. The total price not including tax is 105$.
 * An example tax of 20% is calculated for the 105$ and the total becomes 105$ + 20% * 105$ = 126$
 *
 * After-tax Pricing Example: Product costs 100$ and shipping is 5$. When a tax of 20% is used for the shop with the
 * after-tax pricing model this means the 20% tax is already included in the 105$ total price. In this case the total
 * tax should not be added to the combined total.
 * @param {Object[]} taxes - List of all applied taxes for the order
 * @returns {number} tax total for all pre-tax pricing taxes.
 */
function calculatePreTaxPricingTaxTotal(taxes) {
  let preTaxPricingTaxTotal = 0;

  if (!taxes) return 0;

  for (const { tax, customFields } of taxes) {
    if (tax === null) return 0;
    if (!customFields || !customFields.afterTaxPricing) preTaxPricingTaxTotal += tax;
  }

  return preTaxPricingTaxTotal;
}

/**
 * @summary Calculate final shipping, discounts, surcharges, and taxes; builds an invoice object
 *   with the totals on it; and sets group.invoice.
 * @param {String} currencyCode Currency code of totals
 * @param {Object} group The fulfillment group to be mutated
 * @param {Number} groupDiscountTotal Total discount amount for group
 * @param {Number} groupSurchargeTotal Total surcharge amount for group
 * @param {Number} taxableAmount Total taxable amount for group
 * @param {Number} taxTotal Total tax for group
 * @returns {undefined}
 */
export default function addInvoiceToGroup({
  currencyCode,
  group,
  groupDiscountTotal,
  groupSurchargeTotal,
  taxableAmount,
  taxTotal
}) {
  // Items
  const itemTotal = +accounting.toFixed(group.items.reduce((sum, item) => (sum + item.subtotal), 0), 3);

  let taxes;
  if (group.taxSummary) {
    ({ taxes } = group.taxSummary);
  }

  // Taxes
  const effectiveTaxRate = taxableAmount > 0 ? taxTotal / taxableAmount : 0;
  const preTaxPricingTaxTotal = calculatePreTaxPricingTaxTotal(taxes);

  // Fulfillment
  const shippingTotal = group.shipmentMethod.rate || 0;
  const handlingTotal = group.shipmentMethod.handling || 0;
  const fulfillmentTotal = shippingTotal + handlingTotal;

  // Totals
  // To avoid rounding errors, be sure to keep this calculation the same between here and
  // `buildOrderInputFromCart.js` in the client code.
  const total = +accounting.toFixed(Math.max(0, itemTotal + fulfillmentTotal + preTaxPricingTaxTotal + groupSurchargeTotal - groupDiscountTotal), 3);

  group.invoice = {
    currencyCode,
    discounts: groupDiscountTotal,
    effectiveTaxRate,
    shipping: fulfillmentTotal,
    subtotal: itemTotal,
    surcharges: groupSurchargeTotal,
    taxableAmount,
    taxes: taxTotal,
    total
  };
}
