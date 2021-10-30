import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import Factory from "../tests/factory.js";
import placeOrder from "./placeOrder.js";

const payment = {
  _id: "PAYMENT_ID",
  method: "debit",
  mode: "pay",
  processor: "PAYMENT1",
  riskLevel: "normal",
  status: "payment-pending",
  transactionId: "TRANSACTION_ID",
  transactions: []
};

const mockFulfillmentMethod = () => {
  const selectedFulfillmentMethodId = "METHOD_ID";
  return {
    _id: selectedFulfillmentMethodId,
    carrier: "CARRIER",
    label: "LABEL",
    name: "METHOD1"
  };
};

const mockProductAndVariant = () => {
  const catalogProduct = Factory.CatalogProduct.makeOne();
  const catalogProductVariant = Factory.CatalogProductVariant.makeOne();
  return {
    catalogProduct,
    catalogProductVariant
  };
};

const mockFindProductAndVariant = (catalogProduct, variant) => {
  mockContext.queries.findProductAndVariant = jest.fn().mockName("findProductAndVariant");
  mockContext.queries.findProductAndVariant.mockReturnValueOnce({
    catalogProduct,
    variant
  });
};

const mockGetVariantPrice = (variantPrice) => {
  mockContext.queries.getVariantPrice = jest.fn().mockName("getVariantPrice");
  mockContext.queries.getVariantPrice.mockReturnValueOnce({
    price: variantPrice
  });
};

const mockInventoryForProductConfiguration = () => {
  mockContext.queries.inventoryForProductConfiguration = jest.fn().mockName("inventoryForProductConfiguration");
  mockContext.queries.inventoryForProductConfiguration.mockReturnValueOnce({
    canBackorder: true,
    inventoryAvailableToSell: 10
  });
};

const mockGetFulfillmentMethodsWithQuotes = (selectedFulfillmentMethod) => {
  mockContext.queries.getFulfillmentMethodsWithQuotes = jest.fn().mockName("getFulfillmentMethodsWithQuotes");
  mockContext.queries.getFulfillmentMethodsWithQuotes.mockReturnValueOnce([{
    method: selectedFulfillmentMethod,
    handlingPrice: 0,
    shippingPrice: 0,
    rate: 0
  }]);
};

const mockPaymentMethodsByShopId = (paymentMethods) => {
  mockContext.queries.shopById = jest.fn().mockName("shopById");
  mockContext.queries.shopById.mockReturnValueOnce({
    availablePaymentMethods: paymentMethods
  });
};

const mockPayment = (paymentMethod, amount) => {
  const mockCreateAuthorizedPayment = jest.fn().mockName("createAuthorizedPayment");
  mockCreateAuthorizedPayment.mockReturnValueOnce(Promise.resolve({
    ...payment,
    amount,
    createdAt: new Date(),
    name: paymentMethod.name,
    displayName: paymentMethod.name,
    paymentPluginName: paymentMethod.pluginName,
    shopId: "shopID"
  }));

  mockContext.queries.getPaymentMethodConfigByName = jest.fn().mockName("getPaymentMethodConfigByName");
  mockContext.queries.getPaymentMethodConfigByName.mockReturnValueOnce({
    pluginName: paymentMethod.pluginName,
    name: paymentMethod.name,
    canRefund: true,
    displayName: paymentMethod.name,
    functions: {
      createAuthorizedPayment: mockCreateAuthorizedPayment
    }
  });
};

beforeEach(() => {
  jest.resetAllMocks();
  mockContext.getFunctionsOfType.mockReturnValue([]);
});

test("throws if order isn't supplied", async () => {
  await expect(placeOrder(mockContext, {})).rejects.toThrowErrorMatchingSnapshot();
});

test("places an anonymous $0 order with no cartId and no payments", async () => {
  mockContext.accountId = null;

  const selectedFulfillmentMethod = mockFulfillmentMethod();
  const { catalogProduct, catalogProductVariant } = mockProductAndVariant();
  mockFindProductAndVariant(catalogProduct, catalogProductVariant);
  mockGetVariantPrice(0);
  mockInventoryForProductConfiguration();
  mockGetFulfillmentMethodsWithQuotes(selectedFulfillmentMethod);
  mockPaymentMethodsByShopId(["PAYMENT1"]);

  const orderInput = Factory.orderInputSchema.makeOne({
    billingAddress: null,
    cartId: null,
    currencyCode: "USD",
    email: "valid@email.address",
    ordererPreferredLanguage: "en",
    fulfillmentGroups: Factory.orderFulfillmentGroupInputSchema.makeMany(1, {
      items: Factory.orderItemInputSchema.makeMany(1, {
        quantity: 1,
        price: 0
      }),
      selectedFulfillmentMethodId: selectedFulfillmentMethod._id,
      totalPrice: 0
    })
  });

  const { orders, token } = await placeOrder(mockContext, {
    order: orderInput
  });

  const [order] = orders;

  expect(order).toEqual({
    _id: jasmine.any(String),
    accountId: null,
    anonymousAccessTokens: [
      { hashedToken: jasmine.any(String), createdAt: jasmine.any(Date) }
    ],
    billingAddress: null,
    cartId: null,
    createdAt: jasmine.any(Date),
    currencyCode: orderInput.currencyCode,
    customFields: {},
    discounts: [],
    email: orderInput.email,
    ordererPreferredLanguage: "en",
    payments: [],
    referenceId: jasmine.any(String),
    shipping: [
      {
        _id: jasmine.any(String),
        address: undefined,
        invoice: {
          currencyCode: orderInput.currencyCode,
          discounts: 0,
          effectiveTaxRate: 0,
          shipping: 0,
          subtotal: 0,
          surcharges: 0,
          taxableAmount: 0,
          taxes: 0,
          total: 0
        },
        itemIds: [order.shipping[0].items[0]._id],
        items: [
          {
            _id: jasmine.any(String),
            addedAt: jasmine.any(Date),
            attributes: [
              {
                label: "mockAttributeLabel",
                value: "mockOptionTitle"
              }
            ],
            createdAt: jasmine.any(Date),
            optionTitle: catalogProductVariant.optionTitle,
            parcel: undefined,
            price: {
              amount: 0,
              currencyCode: orderInput.currencyCode
            },
            productId: catalogProduct.productId,
            productSlug: catalogProduct.slug,
            productTagIds: catalogProduct.tagIds,
            productType: catalogProduct.type,
            productVendor: catalogProduct.vendor,
            quantity: 1,
            shopId: catalogProduct.shopId,
            subtotal: 0,
            title: catalogProduct.title,
            updatedAt: jasmine.any(Date),
            variantId: catalogProductVariant.variantId,
            variantTitle: catalogProductVariant.title,
            workflow: {
              status: "new",
              workflow: [
                "coreOrderWorkflow/created",
                "coreItemWorkflow/removedFromInventoryAvailableToSell"
              ]
            }
          }
        ],
        shipmentMethod: {
          ...selectedFulfillmentMethod,
          group: undefined,
          currencyCode: orderInput.currencyCode,
          handling: 0,
          rate: 0
        },
        shopId: orderInput.shopId,
        totalItemQuantity: 1,
        type: "shipping",
        workflow: {
          status: "new",
          workflow: [
            "new"
          ]
        }
      }
    ],
    shopId: orderInput.shopId,
    surcharges: [],
    totalItemQuantity: 1,
    updatedAt: jasmine.any(Date),
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  });

  expect(token).toEqual(jasmine.any(String));
});

test("places an anonymous order with payment that requires external action", async () => {
  mockContext.accountId = null;
  const itemPrice = 99;
  const paymentMethod = {
    name: "PAYMENT1",
    pluginName: "payment-plugin"
  };
  const selectedFulfillmentMethod = mockFulfillmentMethod();
  const { catalogProduct, catalogProductVariant } = mockProductAndVariant();
  mockFindProductAndVariant(catalogProduct, catalogProductVariant);
  mockGetVariantPrice(itemPrice);
  mockInventoryForProductConfiguration();
  mockGetFulfillmentMethodsWithQuotes(selectedFulfillmentMethod);
  mockPaymentMethodsByShopId([paymentMethod.name]);
  mockPayment(paymentMethod, itemPrice);

  const orderInput = Factory.orderInputSchema.makeOne({
    billingAddress: null,
    cartId: null,
    currencyCode: "USD",
    email: "valid@email.address",
    ordererPreferredLanguage: "en",
    fulfillmentGroups: Factory.orderFulfillmentGroupInputSchema.makeMany(1, {
      items: Factory.orderItemInputSchema.makeMany(1, {
        quantity: 1,
        price: itemPrice
      }),
      selectedFulfillmentMethodId: selectedFulfillmentMethod._id,
      totalPrice: itemPrice
    })
  });

  const paymentsInput = [
    {
      amount: itemPrice,
      method: paymentMethod.name
    }
  ];

  const { orders, token } = await placeOrder(mockContext, {
    order: orderInput,
    payments: paymentsInput
  });
  const [order] = orders;

  expect(order).toEqual({
    _id: jasmine.any(String),
    accountId: null,
    anonymousAccessTokens: [
      { hashedToken: jasmine.any(String), createdAt: jasmine.any(Date) }
    ],
    billingAddress: null,
    cartId: null,
    createdAt: jasmine.any(Date),
    currencyCode: orderInput.currencyCode,
    customFields: {},
    discounts: [],
    email: orderInput.email,
    ordererPreferredLanguage: "en",
    payments: [{
      ...payment,
      amount: itemPrice,
      currency: jasmine.any(Object),
      currencyCode: "USD",
      createdAt: jasmine.any(Date),
      name: paymentMethod.name,
      displayName: paymentMethod.name,
      paymentPluginName: paymentMethod.pluginName,
      shopId: jasmine.any(String)
    }],
    referenceId: jasmine.any(String),
    shipping: [
      {
        _id: jasmine.any(String),
        address: undefined,
        invoice: {
          currencyCode: orderInput.currencyCode,
          discounts: 0,
          effectiveTaxRate: 0,
          shipping: 0,
          subtotal: itemPrice,
          surcharges: 0,
          taxableAmount: 0,
          taxes: 0,
          total: itemPrice
        },
        itemIds: [order.shipping[0].items[0]._id],
        items: [
          {
            _id: jasmine.any(String),
            addedAt: jasmine.any(Date),
            attributes: [
              {
                label: "mockAttributeLabel",
                value: "mockOptionTitle"
              }
            ],
            createdAt: jasmine.any(Date),
            optionTitle: catalogProductVariant.optionTitle,
            parcel: undefined,
            price: {
              amount: itemPrice,
              currencyCode: orderInput.currencyCode
            },
            productId: catalogProduct.productId,
            productSlug: catalogProduct.slug,
            productTagIds: catalogProduct.tagIds,
            productType: catalogProduct.type,
            productVendor: catalogProduct.vendor,
            quantity: 1,
            shopId: catalogProduct.shopId,
            subtotal: itemPrice,
            title: catalogProduct.title,
            updatedAt: jasmine.any(Date),
            variantId: catalogProductVariant.variantId,
            variantTitle: catalogProductVariant.title,
            workflow: {
              status: "new",
              workflow: [
                "coreOrderWorkflow/created",
                "coreItemWorkflow/removedFromInventoryAvailableToSell"
              ]
            }
          }
        ],
        shipmentMethod: {
          ...selectedFulfillmentMethod,
          group: undefined,
          currencyCode: orderInput.currencyCode,
          handling: 0,
          rate: 0
        },
        shopId: orderInput.shopId,
        totalItemQuantity: 1,
        type: "shipping",
        workflow: {
          status: "new",
          workflow: [
            "new"
          ]
        }
      }
    ],
    shopId: orderInput.shopId,
    surcharges: [],
    totalItemQuantity: 1,
    updatedAt: jasmine.any(Date),
    workflow: {
      status: "awaitingPayment",
      workflow: ["awaitingPayment"]
    }
  });

  expect(token).toEqual(jasmine.any(String));
});
