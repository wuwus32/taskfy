import {
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
} from '../generated/api';

/**
 * Sprawdza indywidualne warunki dla zniżki (nowy system dynamicznych warunków)
 * @param {Array} conditions - Tablica warunków
 * @param {Object} input - Input z danymi koszyka
 * @returns {boolean} - Czy wszystkie warunki są spełnione
 */
function checkIndividualConditions(conditions, input) {
  console.log(`🔍 DEBUG checkIndividualConditions called with ${conditions?.length || 0} conditions`);
  console.log(`🔍 DEBUG conditions:`, JSON.stringify(conditions, null, 2));
  
  if (!conditions || conditions.length === 0) {
    console.log("✅ No individual conditions to check - returning true");
    return true; // Brak warunków = zawsze spełnione
  }

  const cart = input.cart;
  // Użyj daty ze strefy czasowej sklepu zamiast serwera
  const shopLocalDate = input.shop?.localTime?.date;
  const currentDate = shopLocalDate ? new Date(shopLocalDate) : new Date();
  
  console.log(`🕐 [TIMEZONE DEBUG] Shop localDate: ${shopLocalDate}, currentDate: ${currentDate.toISOString()}, Day: ${currentDate.getDay()}`);
  
  // Debug cart info
  const totalQuantity = cart.lines.reduce((total, line) => total + line.quantity, 0);
  console.log(`🔍 DEBUG cart info: totalQuantity=${totalQuantity}, linesCount=${cart.lines.length}`);

  for (const condition of conditions) {
    const { type, operator, value } = condition;
    
    switch (type) {
      case 'cart_total': {
        const cartTotal = cart.lines.reduce((total, line) => {
          return total + parseFloat(line.cost.subtotalAmount.amount);
        }, 0);
        
        const conditionValue = parseFloat(value);
        if (!evaluateNumericCondition(cartTotal, operator, conditionValue)) {
          console.log(`❌ Cart total condition failed: ${cartTotal} ${operator} ${conditionValue}`);
          return false;
        }
        break;
      }
      
      case 'country': {
        const deliveryAddress = cart.deliveryGroups?.[0]?.deliveryAddress;
        const customerCountry = deliveryAddress?.countryCode;
        
        if (!customerCountry) {
          console.log("❌ Country condition failed: no delivery address");
          return false;
        }
        
        const allowedCountries = value.split(',').map(code => code.trim());
        if (!evaluateListCondition(customerCountry, operator, allowedCountries)) {
          console.log(`❌ Country condition failed: ${customerCountry} not in ${allowedCountries}`);
          return false;
        }
        break;
      }
      
      case 'cart_quantity': {
        const totalQuantity = cart.lines.reduce((total, line) => total + line.quantity, 0);
        const conditionValue = parseInt(value);
        
        // SZCZEGÓŁOWE DEBUGOWANIE
        console.log(`🔍 DEBUG cart_quantity: value="${value}", conditionValue=${conditionValue}, isNaN=${isNaN(conditionValue)}`);
        console.log(`🔍 DEBUG comparison: totalQuantity=${totalQuantity}, operator="${operator}", conditionValue=${conditionValue}`);
        
        // Sprawdź czy conditionValue jest poprawną liczbą
        if (isNaN(conditionValue)) {
          console.log(`❌ Cart quantity condition failed: invalid value "${value}" (parsed as NaN)`);
          return false;
        }
        
        const result = evaluateNumericCondition(totalQuantity, operator, conditionValue);
        console.log(`🔍 DEBUG result: evaluateNumericCondition(${totalQuantity}, "${operator}", ${conditionValue}) = ${result}`);
        
        if (!result) {
          console.log(`❌ Cart quantity condition failed: ${totalQuantity} ${operator} ${conditionValue}`);
          return false;
        }
        break;
      }
      
      case 'postal_code': {
        let customerZip = null;
        
        // Spróbuj różne źródła kodu pocztowego
        if (cart.deliveryGroups?.[0]?.deliveryAddress?.zip?.trim()) {
          customerZip = cart.deliveryGroups[0].deliveryAddress.zip.trim();
        }
        
        const attributesToCheck = ['checkoutPostalCode', 'shippingZip', 'postalCode', 'zipCode'];
        for (const attrKey of attributesToCheck) {
          if (!customerZip && cart[attrKey]?.value?.trim()) {
            customerZip = cart[attrKey].value.trim();
            break;
          }
        }
        
        if (!customerZip) {
          console.log("❌ Postal code condition failed: no postal code found");
          return false;
        }
        
        if (!evaluateStringCondition(customerZip, operator, value)) {
          console.log(`❌ Postal code condition failed: ${customerZip} ${operator} ${value}`);
          return false;
        }
        break;
      }
      
      case 'cart_weight': {
        console.log(`🔍 [WEIGHT DEBUG] Checking cart weight condition:`, {
          value,
          operator,
          linesCount: cart.lines.length
        });
        
        const totalWeight = cart.lines.reduce((total, line, index) => {
          const rawWeight = line.merchandise?.weight;
          const weight = parseFloat(rawWeight) || 0;
          const lineWeight = weight * line.quantity;
          
          console.log(`🔍 [WEIGHT DEBUG] Line ${index + 1}:`, {
            productId: line.merchandise?.id,
            quantity: line.quantity,
            rawWeight,
            parsedWeight: weight,
            lineWeight,
            merchandiseType: typeof line.merchandise
          });
          
          return total + lineWeight;
        }, 0);
        
        const conditionValue = parseFloat(value);
        
        console.log(`🔍 [WEIGHT DEBUG] Final calculation:`, {
          totalWeight,
          conditionValue,
          operator,
          passes: evaluateNumericCondition(totalWeight, operator, conditionValue)
        });
        
        if (!evaluateNumericCondition(totalWeight, operator, conditionValue)) {
          console.log(`❌ Cart weight condition failed: ${totalWeight} ${operator} ${conditionValue}`);
          return false;
        }
        break;
      }
      
      case 'customer_tags': {
        const customer = cart.buyerIdentity?.customer;
        
        console.log('🔍 [CUSTOMER_TAGS DEBUG] Customer ID:', customer?.id);
        console.log('🔍 [CUSTOMER_TAGS DEBUG] Customer hasAnyTag:', customer?.hasAnyTag);
        console.log('🔍 [CUSTOMER_TAGS DEBUG] Operator:', operator);
        console.log('🔍 [CUSTOMER_TAGS DEBUG] Required tag pattern:', value);
        
        if (!customer) {
          console.log('⚠️ [CUSTOMER_TAGS DEBUG] No customer found');
          return false;
        }
        
        // hasAnyTag w GraphQL sprawdza czy klient ma którýkolwiek z tagów: 
        // ["VIP", "premium", "stały-klient", "sigma", "wholesale", "employee"]
        const hasKnownTag = customer.hasAnyTag;
        console.log('🔍 [CUSTOMER_TAGS DEBUG] Customer has any known tag:', hasKnownTag);
        
        // Sprawdzamy czy wymagany tag jest w naszej liście sprawdzanych tagów
        const requiredTags = value.split(',').map(tag => tag.trim());
        const knownTags = ["VIP", "premium", "stały-klient", "sigma", "wholesale", "employee"];
        
        const hasRequiredTag = requiredTags.some(tag => 
          knownTags.includes(tag) && hasKnownTag
        );
        
        console.log('🔍 [CUSTOMER_TAGS DEBUG] Required tags:', requiredTags);
        console.log('🔍 [CUSTOMER_TAGS DEBUG] Has required tag:', hasRequiredTag);
        
        if (operator === 'contains') {
          const result = hasRequiredTag;
          console.log(`✅ Customer tags condition (contains) result: ${result}`);
          if (!result) return false;
        } else if (operator === 'not_contains') {
          const result = !hasRequiredTag;
          console.log(`✅ Customer tags condition (not_contains) result: ${result}`);
          if (!result) return false;
        }
        break;
      }
      
      case 'customer_logged_in': {
        const isAuthenticated = cart.buyerIdentity?.isAuthenticated;
        
        console.log('🔍 [CUSTOMER_LOGGED_IN DEBUG] isAuthenticated:', isAuthenticated);
        console.log('🔍 [CUSTOMER_LOGGED_IN DEBUG] Operator:', operator);
        
        if (operator === 'is_logged_in') {
          const result = isAuthenticated === true;
          console.log(`✅ Customer logged in condition (is_logged_in) result: ${result}`);
          if (!result) return false;
        } else if (operator === 'is_not_logged_in') {
          const result = isAuthenticated !== true;
          console.log(`✅ Customer logged in condition (is_not_logged_in) result: ${result}`);
          if (!result) return false;
        }
        break;
      }
      
      case 'order_count': {
        const customer = cart.buyerIdentity?.customer;
        
        console.log('🔍 [ORDER_COUNT DEBUG] Customer ID:', customer?.id);
        console.log('🔍 [ORDER_COUNT DEBUG] Operator:', operator);
        console.log('🔍 [ORDER_COUNT DEBUG] Required order count:', value);
        
        if (!customer) {
          console.log('⚠️ [ORDER_COUNT DEBUG] No customer found, treating as 0 orders');
          // If no customer, treat as 0 orders
          const customerOrderCount = 0;
          const conditionValue = parseInt(value);
          
          if (!evaluateNumericCondition(customerOrderCount, operator, conditionValue)) {
            console.log(`❌ Order count condition failed: ${customerOrderCount} ${operator} ${conditionValue}`);
            return false;
          }
        } else {
          // Customer is available, get order count
          const customerOrderCount = customer.numberOfOrders || 0;
          const conditionValue = parseInt(value);
          
          console.log('🔍 [ORDER_COUNT DEBUG] Customer order count:', customerOrderCount);
          console.log('🔍 [ORDER_COUNT DEBUG] Condition value:', conditionValue);
          
          if (!evaluateNumericCondition(customerOrderCount, operator, conditionValue)) {
            console.log(`❌ Order count condition failed: ${customerOrderCount} ${operator} ${conditionValue}`);
            return false;
          }
          
          console.log(`✅ Order count condition passed: ${customerOrderCount} ${operator} ${conditionValue}`);
        }
        break;
      }
      
      case 'cart_contains': {
        console.log('🔍 [CART_CONTAINS DEBUG] Checking cart contains condition');
        console.log('🔍 [CART_CONTAINS DEBUG] Operator:', operator);
        console.log('🔍 [CART_CONTAINS DEBUG] Value:', value);
        
        // Check if operator is for products
        const isProductOperator = [
          'only_these_products',
          'at_least_one_of_these', 
          'all_of_these_products',
          'none_of_these_products'
        ].includes(operator);
        
        // Check if operator is for collections
        const isCollectionOperator = [
          'only_these_collections',
          'at_least_one_collection',
          'no_products_from_collections'
        ].includes(operator);
        
        let conditionMet = false;
        
        if (isProductOperator) {
          // Handle product operators (existing logic)
          console.log('🔍 [CART_CONTAINS DEBUG] Processing product operator');
          
          // Get product IDs from cart
          const cartProductIds = cart.lines
            .map(line => line.merchandise?.product?.id)
            .filter(Boolean);
          
          console.log('🔍 [CART_CONTAINS DEBUG] Cart product IDs:', cartProductIds);
          
          // Parse required product IDs
          const requiredProductIds = value.split(',').map(id => id.trim()).filter(Boolean);
          
          console.log('🔍 [CART_CONTAINS DEBUG] Required product IDs parsed:', requiredProductIds);
          
          switch (operator) {
            case 'only_these_products': {
              // Koszyk zawiera TYLKO te produkty (i wszystkie z listy)
              const cartHasOnlyThese = cartProductIds.length > 0 &&
                cartProductIds.every(id => requiredProductIds.includes(id)) &&
                requiredProductIds.every(id => cartProductIds.includes(id));
              conditionMet = cartHasOnlyThese;
              console.log('🔍 [CART_CONTAINS DEBUG] only_these_products result:', conditionMet);
              break;
            }
            
            case 'at_least_one_of_these': {
              // Koszyk zawiera co najmniej jeden z tych produktów
              conditionMet = requiredProductIds.some(id => cartProductIds.includes(id));
              console.log('🔍 [CART_CONTAINS DEBUG] at_least_one_of_these result:', conditionMet);
              break;
            }
            
            case 'all_of_these_products': {
              // Koszyk zawiera wszystkie z tych produktów (może mieć też inne)
              conditionMet = requiredProductIds.every(id => cartProductIds.includes(id));
              console.log('🔍 [CART_CONTAINS DEBUG] all_of_these_products result:', conditionMet);
              break;
            }
            
            case 'none_of_these_products': {
              // Koszyk nie zawiera żadnego z tych produktów
              conditionMet = !requiredProductIds.some(id => cartProductIds.includes(id));
              console.log('🔍 [CART_CONTAINS DEBUG] none_of_these_products result:', conditionMet);
              break;
            }
          }
          
        } else if (isCollectionOperator) {
          // Handle collection operators (POPRAWIONA LOGIKA)
          console.log('🔍 [CART_CONTAINS DEBUG] Processing collection operator');
          
          // Parse required collection IDs
          const requiredCollectionIds = value.split(',').map(id => id.trim()).filter(Boolean);
          
          console.log('🔍 [CART_CONTAINS DEBUG] Required collection IDs:', requiredCollectionIds);
          
          // Get all cart products that belong to the specified collections
          const cartProductsFromCollections = cart.lines.filter(line => {
            const product = line.merchandise?.product;
            if (!product) return false;
            
            // Sprawdź czy produkt należy do wymaganych kolekcji
            // inAnyCollection zwraca true jeśli produkt należy do którejkolwiek z przekazanych kolekcji
            return product.inAnyCollection === true;
          });
          
          console.log('🔍 [CART_CONTAINS DEBUG] Products in specified collections:', cartProductsFromCollections.length);
          
          switch (operator) {
            case 'only_these_collections': {
              // Wszystkie produkty w koszyku muszą być z określonych kolekcji
              conditionMet = cart.lines.length > 0 && cart.lines.every(line => {
                const product = line.merchandise?.product;
                if (!product) return false;
                // Sprawdź czy produkt należy do wymaganych kolekcji
                return product.inAnyCollection === true;
              });
              console.log('🔍 [CART_CONTAINS DEBUG] only_these_collections result:', conditionMet);
              break;
            }
            
            case 'at_least_one_collection': {
              // Co najmniej jeden produkt musi być z określonych kolekcji
              conditionMet = cart.lines.some(line => {
                const product = line.merchandise?.product;
                if (!product) return false;
                return product.inAnyCollection === true;
              });
              console.log('🔍 [CART_CONTAINS DEBUG] at_least_one_collection result:', conditionMet);
              break;
            }
            

            
            case 'no_products_from_collections': {
              // Żaden produkt w koszyku nie powinien być z określonych kolekcji
              conditionMet = !cart.lines.some(line => {
                const product = line.merchandise?.product;
                if (!product) return false;
                // inAnyCollection zwraca true jeśli produkt należy do którejkolwiek z kolekcji w $collectionIds
                const belongsToTargetCollections = product.inAnyCollection === true;
                console.log('🔍 [CART_CONTAINS DEBUG] Product', product.id, 'belongs to target collections:', belongsToTargetCollections);
                return belongsToTargetCollections;
              });
              console.log('🔍 [CART_CONTAINS DEBUG] no_products_from_collections result:', conditionMet);
              break;
            }
          }
          
          console.log('✅ [CART_CONTAINS DEBUG] Collection operators now use proper GraphQL data');
          
        } else {
          console.log('🔍 [CART_CONTAINS DEBUG] Unknown operator:', operator);
          conditionMet = false;
        }
        
        if (!conditionMet) {
          console.log(`❌ Cart contains condition failed: ${operator} with value ${value}`);
          return false;
        }
        
        console.log(`✅ Cart contains condition passed: ${operator}`);
        break;
      }
      
      // Legacy support for old cart_contains_products
      case 'cart_contains_products': {
        console.log('🔍 [CART_CONTAINS_PRODUCTS DEBUG] Checking legacy cart contains products condition');
        console.log('🔍 [CART_CONTAINS_PRODUCTS DEBUG] Operator:', operator);
        console.log('🔍 [CART_CONTAINS_PRODUCTS DEBUG] Required product IDs:', value);
        
        // Get product IDs from cart
        const cartProductIds = cart.lines
          .map(line => line.merchandise?.product?.id)
          .filter(Boolean);
        
        console.log('🔍 [CART_CONTAINS_PRODUCTS DEBUG] Cart product IDs:', cartProductIds);
        
        // Parse required product IDs
        const requiredProductIds = value.split(',').map(id => id.trim()).filter(Boolean);
        
        console.log('🔍 [CART_CONTAINS_PRODUCTS DEBUG] Required product IDs parsed:', requiredProductIds);
        
        let conditionMet = false;
        
        switch (operator) {
          case 'only_these_products': {
            // Koszyk zawiera TYLKO te produkty (i wszystkie z listy)
            const cartHasOnlyThese = cartProductIds.length > 0 &&
              cartProductIds.every(id => requiredProductIds.includes(id)) &&
              requiredProductIds.every(id => cartProductIds.includes(id));
            conditionMet = cartHasOnlyThese;
            console.log('🔍 [CART_CONTAINS_PRODUCTS DEBUG] only_these_products result:', conditionMet);
            break;
          }
          
          case 'at_least_one_of_these': {
            // Koszyk zawiera co najmniej jeden z tych produktów
            conditionMet = requiredProductIds.some(id => cartProductIds.includes(id));
            console.log('🔍 [CART_CONTAINS_PRODUCTS DEBUG] at_least_one_of_these result:', conditionMet);
            break;
          }
          
          case 'all_of_these_products': {
            // Koszyk zawiera wszystkie z tych produktów (może mieć też inne)
            conditionMet = requiredProductIds.every(id => cartProductIds.includes(id));
            console.log('🔍 [CART_CONTAINS_PRODUCTS DEBUG] all_of_these_products result:', conditionMet);
            break;
          }
          
          case 'none_of_these_products': {
            // Koszyk nie zawiera żadnego z tych produktów
            conditionMet = !requiredProductIds.some(id => cartProductIds.includes(id));
            console.log('🔍 [CART_CONTAINS_PRODUCTS DEBUG] none_of_these_products result:', conditionMet);
            break;
          }
          
          default:
            console.log('🔍 [CART_CONTAINS_PRODUCTS DEBUG] Unknown operator:', operator);
            conditionMet = false;
        }
        
        if (!conditionMet) {
          console.log(`❌ Cart contains products condition failed: ${operator} with products ${requiredProductIds}`);
          return false;
        }
        
        console.log(`✅ Cart contains products condition passed: ${operator}`);
        break;
      }

      
      default:
        console.log(`⚠️ Unknown condition type: ${type}`);
        break;
    }
  }

  console.log("✅ All individual conditions satisfied");
  return true;
}

/**
 * Sprawdza warunki numeryczne
 */
function evaluateNumericCondition(actualValue, operator, conditionValue) {
  switch (operator) {
    case 'greater_than_or_equal':
      return actualValue >= conditionValue;
    case 'less_than_or_equal':
      return actualValue <= conditionValue;
    case 'greater_than':
      return actualValue > conditionValue;
    case 'less_than':
      return actualValue < conditionValue;
    case 'equals':
      return actualValue === conditionValue;
    case 'not_equals':
      return actualValue !== conditionValue;
    default:
      return false;
  }
}

/**
 * Sprawdza warunki tekstowe
 */
function evaluateStringCondition(actualValue, operator, conditionValue) {
  switch (operator) {
    case 'equals':
      return actualValue === conditionValue;
    case 'not_equals':
      return actualValue !== conditionValue;
    case 'contains':
      return actualValue.toLowerCase().includes(conditionValue.toLowerCase());
    case 'not_contains':
      return !actualValue.toLowerCase().includes(conditionValue.toLowerCase());
    default:
      return false;
  }
}

/**
 * Sprawdza warunki listowe
 */
function evaluateListCondition(actualValue, operator, allowedValues) {
  switch (operator) {
    case 'equals':
      return allowedValues.includes(actualValue);
    case 'not_equals':
      return !allowedValues.includes(actualValue);
    default:
      return false;
  }
}



/**
 * @typedef {import("../generated/api").CartInput} CartInput
  * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
  */

/**
 * Sprawdza czy rabat spełnia indywidualne warunki (nowy system)
 * @param {Object} discount - Rabat z warunkami
 * @param {Object} input - Input z danymi koszyka
 * @returns {boolean} - Czy warunki są spełnione
 */
function checkBasicConditions(discount, input) {
  // Sprawdź czy rabat ma indywidualne warunki (nowy format)
  if (discount.conditions && Array.isArray(discount.conditions)) {
    return checkIndividualConditions(discount.conditions, input);
  }
  
  // Fallback dla starych warunków globalnych (kompatybilność wsteczna)
  if (!discount.basicConditions) {
    return true; // Brak warunków = zawsze spełnione
  }

  const conditions = discount.basicConditions;
  const cart = input.cart;
  // Użyj daty ze strefy czasowej sklepu zamiast serwera
  const shopLocalDate = input.shop?.localTime?.date;
  const currentDate = shopLocalDate ? new Date(shopLocalDate) : new Date();
  
  console.log(`🕐 [TIMEZONE DEBUG OLD] Shop localDate: ${shopLocalDate}, currentDate: ${currentDate.toISOString()}, Day: ${currentDate.getDay()}`);

  // 1. SPRAWDŹ KRAJ (Country) - PODSTAWOWY WARUNEK
  if (conditions.countryEnabled && conditions.allowedCountries?.length > 0) {
    const deliveryAddress = cart.deliveryGroups?.[0]?.deliveryAddress;
    const customerCountry = deliveryAddress?.countryCode;
    
    if (!customerCountry) {
      console.log("❌ Country required but delivery address not provided");
      return false;
    }
    
    if (!conditions.allowedCountries.includes(customerCountry)) {
      console.log(`❌ Country ${customerCountry} not in allowed list: ${conditions.allowedCountries}`);
      return false;
    }
    
    console.log(`✅ Country ${customerCountry} is allowed`);
  }

  // 2. SPRAWDŹ WARTOŚĆ KOSZYKA (Cart total amount)
  if (conditions.cartTotalEnabled && conditions.minimumAmount) {
    const cartTotal = cart.lines.reduce((total, line) => {
      return total + parseFloat(line.cost.subtotalAmount.amount);
    }, 0);
    
    const minimumAmount = parseFloat(conditions.minimumAmount);
    if (cartTotal < minimumAmount) {
      console.log(`❌ Cart total ${cartTotal} less than minimum ${minimumAmount}`);
      return false;
    }
    
    console.log(`✅ Cart total ${cartTotal} meets minimum ${minimumAmount}`);
  }

  // 3. SPRAWDŹ ILOŚĆ PRODUKTÓW (Cart quantity)
  if (conditions.cartQuantityEnabled && conditions.minimumQuantity) {
    const totalQuantity = cart.lines.reduce((total, line) => total + line.quantity, 0);
    const minimumQuantity = parseInt(conditions.minimumQuantity);
    
    if (totalQuantity < minimumQuantity) {
      console.log(`❌ Cart quantity ${totalQuantity} less than minimum ${minimumQuantity}`);
      return false;
    }
    
    console.log(`✅ Cart quantity ${totalQuantity} meets minimum ${minimumQuantity}`);
  }

  // STARE WARUNKI (do usunięcia) - kod pocztowy (NOWA STRATEGIA)
  if (conditions.postalCodeEnabled && conditions.allowedPostalCodes) {
    let customerZip = null;
    
    // 1. USUNIĘTE - buyerIdentity.deliveryAddressPreferences nie istnieje w API
    
    // 2. Sprawdź delivery address
    if (!customerZip && cart.deliveryGroups?.[0]?.deliveryAddress?.zip?.trim()) {
      customerZip = cart.deliveryGroups[0].deliveryAddress.zip.trim();
    }
    
         // 3. Sprawdź dostępne cart attributes (PRIORYTET dla checkoutPostalCode)
     const attributesToCheck = ['checkoutPostalCode', 'shippingZip', 'postalCode', 'zipCode', 'deliveryPostalCode'];
     for (const attrKey of attributesToCheck) {
       if (!customerZip && cart[attrKey]?.value?.trim()) {
         customerZip = cart[attrKey].value.trim();
         break;
       }
     }
    
         // 4. Regex fallback z address1
     if (!customerZip && cart.deliveryGroups?.[0]?.deliveryAddress?.address1) {
       const zipMatch = cart.deliveryGroups[0].deliveryAddress.address1.match(/\b\d{2}-\d{3}\b/);
       if (zipMatch) {
         customerZip = zipMatch[0];
       }
     }

    if (!customerZip) {
      console.log("❌ Postal code required but not provided (checked all sources)");
      return false;
    }

    const allowedCodes = conditions.allowedPostalCodes.split(',').map(code => code.trim());
    const isAllowed = allowedCodes.some(allowedCode => {
      if (allowedCode.includes('*')) {
        // Wildcard matching (np. "10-*" matches "10-123")
        const pattern = allowedCode.replace('*', '.*');
        const regex = new RegExp(`^${pattern}$`, 'i');
        return regex.test(customerZip);
      } else {
        // Exact match
        return allowedCode.toLowerCase() === customerZip.toLowerCase();
      }
    });

    if (!isAllowed) {
      console.log(`❌ Postal code ${customerZip} not in allowed list: ${conditions.allowedPostalCodes}`);
      return false;
    }
  }

  // Sprawdź warunki produktowe - waga
  if (conditions.weightEnabled) {
    const minWeight = parseFloat(conditions.minWeight) || 0;
    const maxWeight = parseFloat(conditions.maxWeight) || Infinity;
    
    console.log(`🔍 [LEGACY WEIGHT DEBUG] Weight conditions:`, {
      weightEnabled: conditions.weightEnabled,
      minWeight,
      maxWeight,
      linesCount: cart.lines.length
    });
    
    const totalWeight = cart.lines.reduce((total, line, index) => {
      const rawWeight = line.merchandise?.weight;
      const weight = parseFloat(rawWeight) || 0;
      const lineWeight = weight * line.quantity;
      
      console.log(`🔍 [LEGACY WEIGHT DEBUG] Line ${index + 1}:`, {
        productId: line.merchandise?.id,
        quantity: line.quantity,
        rawWeight,
        parsedWeight: weight,
        lineWeight
      });
      
      return total + lineWeight;
    }, 0);

    console.log(`🔍 [LEGACY WEIGHT DEBUG] Total weight check:`, {
      totalWeight,
      minWeight,
      maxWeight,
      inRange: totalWeight >= minWeight && totalWeight <= maxWeight
    });

    if (totalWeight < minWeight || totalWeight > maxWeight) {
      console.log(`❌ Total weight ${totalWeight} not in range ${minWeight}-${maxWeight}`);
      return false;
    }
  }

  // Sprawdź warunki produktowe - tagi (TYMCZASOWO WYŁĄCZONE - brak dostępu do tagów w Functions)
  if (conditions.productTagsEnabled && conditions.requiredProductTags) {
    console.log(`⚠️ Product tags checking not available in Shopify Functions - skipping`);
    // return false; // Tymczasowo nie blokujemy
  }

  // Sprawdź warunki klienta - tagi (TYMCZASOWO WYŁĄCZONE - brak dostępu do tagów w Functions)
  if (conditions.customerTagsEnabled && conditions.requiredCustomerTags) {
    console.log(`⚠️ Customer tags checking not available in Shopify Functions - skipping`);
    // return false; // Tymczasowo nie blokujemy
  }



  console.log("✅ All basic conditions satisfied");
  return true;
}

/**
 * cartLinesDiscountsGenerateRun
 * @param {CartInput} input - The CartInput
 * @returns {CartLinesDiscountsGenerateRunResult} - The function result with discounts.
  */
export function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  // Sprawdź dostępne klasy zniżek (dla kombinacji zniżek)
  const discountClasses = input.discount?.discountClasses || [];
  console.log(`🔍 [DISCOUNT CLASSES] Available discount classes:`, discountClasses);
  
  // Sprawdź czy funkcja powinna działać - ORDER lub PRODUCT
  const hasOrderDiscountClass = discountClasses.includes('ORDER');
  const hasProductDiscountClass = discountClasses.includes('PRODUCT');
  
  console.log(`🔍 [DISCOUNT CLASSES] hasOrderDiscountClass: ${hasOrderDiscountClass}, hasProductDiscountClass: ${hasProductDiscountClass}`);
  
  // Jeśli nie ma odpowiednich klas zniżek, nie działaj
  if (!hasOrderDiscountClass && !hasProductDiscountClass) {
    console.log(`❌ [DISCOUNT CLASSES] No ORDER or PRODUCT discount classes available`);
    return { operations: [] };
  }

  // SPRAWDZENIE KODU RABATOWEGO - NOWA LOGIKA
  console.log(`🔍 [DISCOUNT CODE DEBUG] triggeringDiscountCode:`, input.triggeringDiscountCode || "BRAK");

  // Sprawdź czy adres dostawy jest już podany
  const deliveryGroup = input.cart.deliveryGroups?.[0];
  const deliveryAddress = deliveryGroup?.deliveryAddress;
  
  // NOWA STRATEGIA: Spróbuj pobrać kod pocztowy z WSZYSTKICH możliwych źródeł
  let customerZip = null;
  let zipSource = "NONE";
  
  // 1. USUNIĘTE - buyerIdentity.deliveryAddressPreferences nie istnieje w API
  
  // 2. Główne źródło - delivery address (może być puste na początku)
  if (!customerZip && deliveryAddress?.zip?.trim()) {
    customerZip = deliveryAddress.zip.trim();
    zipSource = "deliveryGroups.deliveryAddress";
  }
  
  // 3. Cart attributes - sprawdź dostępne warianty (NOWY: checkoutPostalCode na początku!)
  const attributesToCheck = [
    { key: 'checkoutPostalCode', name: 'checkout_postal_code' }, // PRIORYTET - z naszego skryptu
    { key: 'shippingZip', name: 'shipping_zip' },
    { key: 'postalCode', name: 'postal_code' },
    { key: 'zipCode', name: 'zip_code' },
    { key: 'deliveryPostalCode', name: 'delivery_postal_code' }
  ];
  
  for (const attr of attributesToCheck) {
    if (!customerZip && input.cart[attr.key]?.value?.trim()) {
      customerZip = input.cart[attr.key].value.trim();
      zipSource = `cart.attribute.${attr.name}`;
      break;
    }
  }
  
  // 4. Fallback - sprawdź czy kod pocztowy jest w address1 (pattern XX-XXX dla Polski)
  if (!customerZip && deliveryAddress?.address1) {
    const zipMatch = deliveryAddress.address1.match(/\b\d{2}-\d{3}\b/);
    if (zipMatch) {
      customerZip = zipMatch[0];
      zipSource = "deliveryAddress.address1.regex";
    }
  }
  
  // 5. USUNIĘTE - buyerIdentity.deliveryAddressPreferences nie istnieje w API

  // DEBUG: Sprawdź co funkcja widzi - PODSTAWOWE INFORMACJE
  const debugInfo = {
    // Podstawowe informacje
    hasDeliveryGroups: !!input.cart.deliveryGroups?.length,
    hasDeliveryAddress: !!deliveryAddress,
    
    // Szczegóły adresu z deliveryGroups - TYLKO KRAJ I MIASTO
    deliveryAddress: deliveryAddress ? {
      city: deliveryAddress.city,
      countryCode: deliveryAddress.countryCode,
      provinceCode: deliveryAddress.provinceCode
    } : null,
    
    // Informacje o kliencie
    hasCustomer: !!input.cart.buyerIdentity?.customer,
    customerId: input.cart.buyerIdentity?.customer?.id || "BRAK",
    
    // Pozostałe
    deliveryGroupsCount: input.cart.deliveryGroups?.length || 0,
    linesCount: input.cart.lines?.length || 0
  };

  // Pobierz konfigurację zniżki z shop metafield
  let activeDiscounts = [];
  let collectionIds = [];
  
  // Pobierz zniżki z shop metafield
  const legacyMetafield = input.shop.legacyMetafield;
  if (legacyMetafield && legacyMetafield.value) {
    try {
      activeDiscounts = JSON.parse(legacyMetafield.value);
      console.log(`🔍 DEBUG: Loaded ${activeDiscounts.length} discounts from SHOP metafield`);
      
      // Pobierz wszystkie collectionIds z aktywnych zniżek
      const allCollectionIds = new Set();
      activeDiscounts.forEach(discount => {
        if (discount.active && discount.conditions) {
          discount.conditions.forEach(condition => {
            if (condition.type === 'cart_contains' && condition.value) {
              // Sprawdź czy to warunek kolekcji
              const isCollectionOperator = [
                'only_these_collections',
                'at_least_one_collection',
                'no_products_from_collections'
              ].includes(condition.operator);
              
              if (isCollectionOperator) {
                const conditionCollectionIds = condition.value.split(',').map(id => id.trim()).filter(Boolean);
                conditionCollectionIds.forEach(id => allCollectionIds.add(id));
              }
            }
          });
        }
      });
      
      collectionIds = Array.from(allCollectionIds);
      console.log(`🔍 DEBUG: Extracted ${collectionIds.length} collection IDs from discounts:`, collectionIds);
      
    } catch (error) {
      console.log(`❌ Error parsing legacyMetafield:`, error);
      activeDiscounts = [];
    }
  }
  
  console.log(`🔍 DEBUG: Final activeDiscounts count: ${activeDiscounts.length}`);

  // Jeśli nadal brak zniżek, zakończ
  if (activeDiscounts.length === 0) {
    console.log("❌ No active discounts found");
    return { operations: [] };
  }
  


  // Filtruj tylko aktywne rabaty które pasują do dostępnych klas zniżek
  const activeOrderDiscounts = activeDiscounts.filter(d => 
    d.active && d.discountClass === 'ORDER' && hasOrderDiscountClass
  );
  const activeProductDiscounts = activeDiscounts.filter(d => 
    d.active && d.discountClass === 'PRODUCT' && hasProductDiscountClass
  );

  console.log(`🔍 [DISCOUNT CLASSES] Filtered discounts - ORDER: ${activeOrderDiscounts.length}, PRODUCT: ${activeProductDiscounts.length}`);

  // Jeśli brak aktywnych rabatów, nie wyświetlaj nic
  if (activeOrderDiscounts.length === 0 && activeProductDiscounts.length === 0) {
    return { operations: [] };
  }

  // Oblicz całkowitą wartość koszyka
  const cartTotal = input.cart.lines.reduce((total, line) => {
    return total + parseFloat(line.cost.subtotalAmount.amount);
  }, 0);

  const operations = [];

  // Dodaj rabaty na zamówienie - ZAWSZE pokazuj rabat, ale 0% gdy warunki nie spełnione
  activeOrderDiscounts.forEach(discount => {
    // SPRAWDZENIE KODU RABATOWEGO - KLUCZOWA LOGIKA
    if (discount.activationMethod === 'discount_code') {
      const requiredCode = discount.discountCode;
      const providedCode = input.triggeringDiscountCode;
      
      console.log(`🔍 [CODE CHECK] Discount "${discount.name}":`, {
        activationMethod: discount.activationMethod,
        requiredCode: requiredCode,
        providedCode: providedCode || "BRAK",
        codesMatch: requiredCode === providedCode
      });
      
      // Jeśli zniżka wymaga kodu, ale kod nie został wpisany lub się nie zgadza
      if (!providedCode || providedCode !== requiredCode) {
        console.log(`❌ [CODE CHECK] Skipping discount "${discount.name}" - kod rabatowy nie pasuje`);
        return; // Pomiń tę zniżkę
      }
      
      console.log(`✅ [CODE CHECK] Code matches for discount "${discount.name}"`);
    } else {
      console.log(`✅ [CODE CHECK] Discount "${discount.name}" is automatic - no code required`);
    }
    // DEBUG: Sprawdź każdy rabat
    let debugSteps = [];
    let discountValue = 0; // Domyślnie 0%
    
    // Sprawdź minimum amount – jeśli nie spełnione, pomiń ten rabat (nie pokazuj w checkout)
    if (cartTotal < parseFloat(discount.minimumAmount || 0)) {
      console.log(`❌ [ORDER] Skipping discount "${discount.name}" - minimum amount not met`);
      return;
    } else {
      debugSteps.push(`Min: OK (${cartTotal} >= ${discount.minimumAmount})`);
      
      // Sprawdź warunki - użyj nowego systemu jeśli dostępny
      let conditionsOK = true;
      console.log(`🔍 DEBUG checking conditions for discount "${discount.title}":`, {
        hasConditions: !!discount.conditions,
        conditionsLength: discount.conditions?.length || 0,
        conditions: discount.conditions || [],
        hasBasicConditions: !!discount.basicConditions,
        basicConditionsKeys: Object.keys(discount.basicConditions || {})
      });
      
      if (discount.conditions && Array.isArray(discount.conditions) && discount.conditions.length > 0) {
        // Nowy system warunków – dla ORDER ignorujemy country oraz postal_code
        console.log(`🔍 DEBUG: Using NEW conditions system for discount "${discount.title}" (ORDER) - ignoring country/postal_code`);
        const filteredConditions = discount.conditions.filter(c => c?.type !== 'country' && c?.type !== 'postal_code');
        conditionsOK = checkIndividualConditions(filteredConditions, input);
        debugSteps.push(conditionsOK ? "NewConditions(ORDER): OK" : "NewConditions(ORDER): FAILED");
      } else if (discount.basicConditions && Object.keys(discount.basicConditions).length > 0) {
        // Stary system warunków – dla ORDER ignorujemy countryEnabled oraz postalCodeEnabled
        console.log(`🔍 DEBUG: Using BASIC conditions system for discount "${discount.title}" (ORDER) - ignoring country/postal`);
        const discountForOrder = {
          ...discount,
          basicConditions: {
            ...discount.basicConditions,
            countryEnabled: false,
            postalCodeEnabled: false,
          },
        };
        conditionsOK = checkBasicConditions(discountForOrder, input);
        debugSteps.push(conditionsOK ? "BasicConditions(ORDER): OK" : "BasicConditions(ORDER): FAILED");
      } else {
        // Brak warunków - rabat zawsze aktywny
        console.log(`🔍 DEBUG: No conditions found for discount "${discount.title}" - always active`);
        debugSteps.push("NoConditions: OK");
      }
      
      if (!conditionsOK) {
        console.log(`❌ [ORDER] Skipping discount "${discount.name}" - conditions not met`);
        return; // Pomiń rabat jeśli warunki nie spełnione
      } else {
        // Obsługa różnych typów zniżek
        console.log(`🔍 DEBUG: Discount value calculation for "${discount.title}":`, {
          discountValueType: discount.discountValueType,
          discountAmount: discount.discountAmount,
          value: discount.value,
          cartTotal: cartTotal
        });
        
        if (discount.discountValueType === 'fixed_amount' && discount.discountAmount > 0) {
          // Dla stałej kwoty, oblicz procent na podstawie wartości koszyka
          discountValue = cartTotal > 0 ? Math.min((discount.discountAmount / cartTotal) * 100, 100) : 0;
          console.log(`✅ DEBUG: Fixed amount discount calculated: ${discountValue}%`);
        } else {
          // Dla procentowej lub starszego systemu
          discountValue = discount.value; // Ustaw prawdziwy rabat procentowy
          console.log(`✅ DEBUG: Percentage discount used: ${discountValue}%`);
        }
      }
    }

    // Utwórz wiadomość rabatu (tylko aktywne)
    let discountMessage;
    if (discount.discountValueType === 'fixed_amount' && discount.discountAmount > 0) {
      discountMessage = discount.description || `${discount.discountAmount} ${discount.currencyCode || 'USD'} OFF ORDER`;
    } else {
      discountMessage = discount.description || `${discount.value}% OFF ORDER`;
    }

    operations.push({
      orderDiscountsAdd: {
        candidates: [
          {
            message: discountMessage,
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: [],
                },
              },
            ],
            value: {
              percentage: {
                value: discountValue,
              },
            },
          },
        ],
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });
  });

  // Dodaj rabaty na produkty - dla każdego produktu
  activeProductDiscounts.forEach(discount => {
    // SPRAWDZENIE KODU RABATOWEGO - KLUCZOWA LOGIKA
    if (discount.activationMethod === 'discount_code') {
      const requiredCode = discount.discountCode;
      const providedCode = input.triggeringDiscountCode;
      
      console.log(`🔍 [PRODUCT CODE CHECK] Discount "${discount.name}":`, {
        activationMethod: discount.activationMethod,
        requiredCode: requiredCode,
        providedCode: providedCode || "BRAK",
        codesMatch: requiredCode === providedCode
      });
      
      // Jeśli zniżka wymaga kodu, ale kod nie został wpisany lub się nie zgadza
      if (!providedCode || providedCode !== requiredCode) {
        console.log(`❌ [PRODUCT CODE CHECK] Skipping discount "${discount.name}" - kod rabatowy nie pasuje`);
        return; // Pomiń tę zniżkę
      }
      
      console.log(`✅ [PRODUCT CODE CHECK] Code matches for discount "${discount.name}"`);
    } else {
      console.log(`✅ [PRODUCT CODE CHECK] Discount "${discount.name}" is automatic - no code required`);
    }
    
    let discountValue = 0; // Domyślnie 0%
    
    // Sprawdź minimum amount – jeśli nie spełnione, pomiń tę zniżkę
    if (cartTotal < parseFloat(discount.minimumAmount || 0)) {
      console.log(`❌ [PRODUCT] Skipping discount "${discount.name}" - minimum amount not met`);
      return;
    } else {
      // Sprawdź warunki - użyj nowego systemu jeśli dostępny
      let conditionsOK = true;
      console.log(`🔍 DEBUG checking conditions for PRODUCT discount "${discount.title}":`, {
        hasConditions: !!discount.conditions,
        conditionsLength: discount.conditions?.length || 0,
        conditions: discount.conditions || [],
        hasBasicConditions: !!discount.basicConditions,
        basicConditionsKeys: Object.keys(discount.basicConditions || {})
      });
      
      if (discount.conditions && Array.isArray(discount.conditions) && discount.conditions.length > 0) {
        // Nowy system warunków
        console.log(`🔍 DEBUG: Using NEW conditions system for PRODUCT discount "${discount.title}"`);
        conditionsOK = checkIndividualConditions(discount.conditions, input);
      } else if (discount.basicConditions && Object.keys(discount.basicConditions).length > 0) {
        // Stary system warunków (fallback)
        console.log(`🔍 DEBUG: Using BASIC conditions system for PRODUCT discount "${discount.title}"`);
        conditionsOK = checkBasicConditions(discount, input);
      } else {
        // Brak warunków - rabat zawsze aktywny
        console.log(`🔍 DEBUG: No conditions found for PRODUCT discount "${discount.title}" - always active`);
      }
      
      if (!conditionsOK) {
        console.log(`❌ [PRODUCT] Skipping discount "${discount.name}" - conditions not met`);
        return; // Pomiń rabat jeśli warunki nie spełnione
      } else {
        // Obsługa różnych typów zniżek
        console.log(`🔍 DEBUG: Discount value calculation for "${discount.title}":`, {
          discountValueType: discount.discountValueType,
          discountAmount: discount.discountAmount,
          value: discount.value,
          cartTotal: cartTotal
        });
        
        if (discount.discountValueType === 'fixed_amount' && discount.discountAmount > 0) {
          // Dla stałej kwoty, oblicz procent na podstawie wartości koszyka
          discountValue = cartTotal > 0 ? Math.min((discount.discountAmount / cartTotal) * 100, 100) : 0;
          console.log(`✅ DEBUG: Fixed amount discount calculated: ${discountValue}%`);
        } else {
          // Dla procentowej lub starszego systemu
          discountValue = discount.value; // Ustaw prawdziwy rabat procentowy
          console.log(`✅ DEBUG: Percentage discount used: ${discountValue}%`);
        }
      }
    }

    // Utwórz wiadomość rabatu (tylko aktywne)
    let discountMessage;
    discountMessage = discount.description || `${discount.value}% OFF PRODUCTS`;

    operations.push({
      productDiscountsAdd: {
        candidates: [
          {
            message: discountMessage,
            targets: [
              {
                cartLine: {
                  id: "gid://shopify/CartLine/0",
                },
              },
            ],
            value: {
              percentage: {
                value: discountValue,
              },
            },
          },
        ],
        selectionStrategy: ProductDiscountSelectionStrategy.First,
      },
    });
  });

  // Jeśli brak operacji, nie wyświetlaj nic
  if (operations.length === 0) {
    return { operations: [] };
  }

  return { operations };
}