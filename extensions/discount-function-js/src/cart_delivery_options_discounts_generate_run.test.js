import {describe, it, expect} from "vitest";

import {cartDeliveryOptionsDiscountsGenerateRun} from "./cart_delivery_options_discounts_generate_run";
import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
} from "../generated/api";

/**
  * @typedef {import("../generated/api").CartDeliveryOptionsDiscountsGenerateRunResult} CartDeliveryOptionsDiscountsGenerateRunResult
  * @typedef {import("../generated/api").DeliveryInput} DeliveryInput
  */

describe("cartDeliveryOptionsDiscountsGenerateRun", () => {
  const baseInput = {
    cart: {
      lines: [
        {
          id: "gid://shopify/CartLine/0",
          quantity: 1,
          cost: {
            subtotalAmount: {
              amount: "100.00",
            },
          },
          merchandise: {
            id: "gid://shopify/ProductVariant/1",
            weight: 1.0,
            product: {
              id: "gid://shopify/Product/1",
              inAnyCollection: false
            }
          }
        },
      ],
      deliveryGroups: [
        {
          id: "gid://shopify/DeliveryGroup/0",
          deliveryAddress: {
            zip: "00-001",
            city: "Warsaw",
            countryCode: "PL"
          },
          deliveryOptions: [
            {
              handle: "standard",
              cost: {
                amount: "10.00"
              }
            }
          ]
        },
      ],
      buyerIdentity: {
        isAuthenticated: false,
        customer: null
      },
      attribute: {
        value: null
      }
    },
    shop: {
      metafield: {
        value: JSON.stringify([
          {
            id: "1",
            name: "Test Shipping Discount",
            description: "FREE SHIPPING",
            discountClass: "SHIPPING",
            value: 100,
            active: true,
            activationMethod: "automatic",
            minimumAmount: 0,
            conditions: []
          }
        ])
      },
      localTime: {
        date: new Date().toISOString()
      }
    },
    discount: {
      discountClasses: [],
    },
  };

  it("returns empty operations when no discount classes are present", () => {
    const input = {
      ...baseInput,
      discount: {
        discountClasses: [],
      },
    };

    const result = cartDeliveryOptionsDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(0);
  });

  it("returns delivery discount when shipping discount class is present", () => {
    const input = {
      ...baseInput,
      discount: {
        discountClasses: ["SHIPPING"],
      },
    };

    const result = cartDeliveryOptionsDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      deliveryDiscountsAdd: {
        candidates: [
          {
            message: "FREE DELIVERY",
            targets: [
              {
                deliveryGroup: {
                  id: "gid://shopify/DeliveryGroup/0",
                },
              },
            ],
            value: {
              percentage: {
                value: 100,
              },
            },
          },
        ],
        selectionStrategy: DeliveryDiscountSelectionStrategy.All,
      },
    });
  });

  it("returns empty operations when no cart lines are present", () => {
    const input = {
      cart: {
        lines: [],
        deliveryGroups: [],
        buyerIdentity: {
          isAuthenticated: false,
          customer: null
        },
        attribute: {
          value: null
        }
      },
      shop: {
        metafield: {
          value: JSON.stringify([])
        },
        localTime: {
          date: new Date().toISOString()
        }
      },
      discount: {
        discountClasses: ["SHIPPING"],
      },
    };

    const result = cartDeliveryOptionsDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(0);
  });
});