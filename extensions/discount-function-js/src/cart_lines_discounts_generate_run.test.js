import {describe, it, expect} from "vitest";

import {cartLinesDiscountsGenerateRun} from "./cart_lines_discounts_generate_run";
import {
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
  DiscountClass,
} from "../generated/api";

/**
  * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
  */

describe("cartLinesDiscountsGenerateRun", () => {
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
      deliveryGroups: [{
        deliveryAddress: {
          zip: "00-001",
          city: "Warsaw",
          countryCode: "PL"
        }
      }],
      buyerIdentity: {
        isAuthenticated: false,
        customer: null
      }
    },
    shop: {
      legacyMetafield: {
        value: JSON.stringify([
          {
            id: "1",
            name: "Test Order Discount",
            description: "10% OFF ORDER",
            discountClass: "ORDER",
            value: 10,
            active: true,
            activationMethod: "automatic",
            minimumAmount: 0,
            conditions: []
          },
          {
            id: "2", 
            name: "Test Product Discount",
            description: "20% OFF PRODUCT",
            discountClass: "PRODUCT",
            value: 20,
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

    const result = cartLinesDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(0);
  });

  it("returns only order discount when only order discount class is present", () => {
    const input = {
      ...baseInput,
      discount: {
        discountClasses: ["ORDER"],
      },
    };

    const result = cartLinesDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      orderDiscountsAdd: {
        candidates: [
          {
            message: "10% OFF ORDER",
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: [],
                },
              },
            ],
            value: {
              percentage: {
                value: 10,
              },
            },
          },
        ],
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });
  });

  it("returns only product discount when only product discount class is present", () => {
    const input = {
      ...baseInput,
      discount: {
        discountClasses: ["PRODUCT"],
      },
    };

    const result = cartLinesDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      productDiscountsAdd: {
        candidates: [
          {
            message: "20% OFF PRODUCT",
            targets: [
              {
                cartLine: {
                  id: "gid://shopify/CartLine/0",
                },
              },
            ],
            value: {
              percentage: {
                value: 20,
              },
            },
          },
        ],
        selectionStrategy: ProductDiscountSelectionStrategy.First,
      },
    });
  });

  it("returns both discounts when both discount classes are present", () => {
    const input = {
      ...baseInput,
      discount: {
        discountClasses: ["ORDER", "PRODUCT"],
      },
    };

    const result = cartLinesDiscountsGenerateRun(input);
    expect(result.operations).toHaveLength(2);
    expect(result.operations[0]).toMatchObject({
      orderDiscountsAdd: {
        candidates: [
          {
            message: "10% OFF ORDER",
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: [],
                },
              },
            ],
            value: {
              percentage: {
                value: 10,
              },
            },
          },
        ],
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });

    expect(result.operations[1]).toMatchObject({
      productDiscountsAdd: {
        candidates: [
          {
            message: "20% OFF PRODUCT",
            targets: [
              {
                cartLine: {
                  id: "gid://shopify/CartLine/0",
                },
              },
            ],
            value: {
              percentage: {
                value: 20,
              },
            },
          },
        ],
        selectionStrategy: ProductDiscountSelectionStrategy.First,
      },
    });
  });
});