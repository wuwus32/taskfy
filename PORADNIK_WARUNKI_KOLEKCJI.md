# Poradnik: Dodawanie warunków kolekcji do Shopify Discount Functions

## Wprowadzenie

Ten poradnik pokazuje, jak zaimplementować warunki dotyczące kolekcji produktów w Shopify Function (discount function), która przyznaje zniżkę tylko wtedy, gdy spełnione są określone warunki dotyczące produktów z danej kolekcji w koszyku.

## Dostępne warunki kolekcji

1. **co najmniej jeden produkt z kolekcji** - koszyk ma co najmniej jeden produkt z danej kolekcji
2. **żaden produkt z kolekcji** - koszyk NIE posiada produktu z danej kolekcji  
3. **wszystkie produkty z kolekcji** - koszyk posiada WSZYSTKIE produkty z danej kolekcji
4. **tylko produkty z kolekcji** - koszyk posiada produkty JEDYNIE z danej kolekcji

## Krok 1: Konfiguracja zapytania GraphQL

### 1.1 Aktualizacja pliku GraphQL

W pliku `src/cart_lines_discounts_generate_run.graphql` dodaj obsługę kolekcji:

```graphql
query CartLinesDiscountsGenerateRun($collectionIds: [ID!]) {
  cart {
    lines {
      id
      quantity
      cost {
        subtotalAmount {
          amount
        }
      }
      merchandise {
        ... on ProductVariant {
          id
          weight
          product {
            id
            inAnyCollection(ids: $collectionIds)
            inCollections(ids: $collectionIds) {
              id
              title
            }
          }
        }
      }
    }
    # ... reszta zapytania
  }
  # ... reszta zapytania
}
```

**Kluczowe pola:**
- `inAnyCollection(ids: $collectionIds)` - zwraca `true` jeśli produkt należy do którejkolwiek z przekazanych kolekcji
- `inCollections(ids: $collectionIds)` - zwraca szczegółowe informacje o kolekcjach do których należy produkt

### 1.2 Konfiguracja zmiennych w shopify.extension.toml

Dodaj sekcję `[extensions.input.variables]` do pliku `shopify.extension.toml`:

```toml
api_version = "2025-04"

[[extensions]]
name = "t:name"
handle = "taskfy-advanced-discounts"
type = "function"
discount_classes = ["ORDER", "PRODUCT", "SHIPPING"]

description = "t:description"

  [[extensions.targeting]]
  target = "cart.lines.discounts.generate.run"
  input_query = "src/cart_lines_discounts_generate_run.graphql"
  export = "cart-lines-discounts-generate-run"

  [extensions.input.variables]
  namespace = "$app:discount"
  key = "input-variables"

  [extensions.build]
  command = ""
  path = "dist/function.wasm"
```

## Krok 2: Implementacja logiki w JavaScript

### 2.1 Dodanie warunków kolekcji do funkcji

W pliku `src/cart_lines_discounts_generate_run.js` dodaj obsługę warunków kolekcji w funkcji `checkIndividualConditions`:

```javascript
case 'cart_contains': {
  // Sprawdź czy operator dotyczy kolekcji
  const isCollectionOperator = [
    'only_these_collections',
    'at_least_one_collection',
    'no_products_from_collections'
  ].includes(condition.operator);
  
  if (isCollectionOperator) {
    console.log('🔍 [CART_CONTAINS DEBUG] Processing collection operator');
    
    // Parse required collection IDs
    const requiredCollectionIds = condition.value.split(',').map(id => id.trim()).filter(Boolean);
    
    // Get all cart products that belong to the specified collections
    const cartProductsFromCollections = cart.lines.filter(line => {
      const product = line.merchandise?.product;
      if (!product) return false;
      return product.inAnyCollection === true;
    });
    
    let conditionMet = false;
    
    switch (condition.operator) {
      case 'only_these_collections': {
        // Wszystkie produkty w koszyku muszą być z określonych kolekcji
        conditionMet = cart.lines.length > 0 && cart.lines.every(line => {
          const product = line.merchandise?.product;
          if (!product) return false;
          return product.inAnyCollection === true;
        });
        break;
      }
      
      case 'at_least_one_collection': {
        // Co najmniej jeden produkt musi być z określonych kolekcji
        conditionMet = cart.lines.some(line => {
          const product = line.merchandise?.product;
          if (!product) return false;
          return product.inAnyCollection === true;
        });
        break;
      }
      

      
      case 'no_products_from_collections': {
        // Żaden produkt w koszyku nie powinien być z określonych kolekcji
        conditionMet = !cart.lines.some(line => {
          const product = line.merchandise?.product;
          if (!product) return false;
          return product.inAnyCollection === true;
        });
        break;
      }
    }
    
    if (!conditionMet) {
      console.log(`❌ Collection condition failed: ${condition.operator} with value ${condition.value}`);
      return false;
    }
    
    console.log(`✅ Collection condition passed: ${condition.operator}`);
  }
  
  // ... obsługa innych operatorów cart_contains
  break;
}
```

## Krok 3: Konfiguracja aplikacji głównej

### 3.1 Dodanie metafield input variables przy tworzeniu zniżki

W głównej aplikacji (`app._index.jsx`), w funkcji `handleCreateDiscount`, dodaj tworzenie metafield z `collectionIds`:

```javascript
// Pobierz collectionIds z warunków kolekcji dla zapytania GraphQL
const collectionIds = [];
if (discountData.conditions) {
  discountData.conditions.forEach(condition => {
    if (condition.type === 'cart_contains' && condition.value) {
      const isCollectionOperator = [
        'only_these_collections',
        'at_least_one_collection',
        'no_products_from_collections'
      ].includes(condition.operator);
      
      if (isCollectionOperator) {
        const conditionCollectionIds = condition.value.split(',').map(id => id.trim()).filter(Boolean);
        collectionIds.push(...conditionCollectionIds);
      }
    }
  });
}

// Metafield dla input variables zapytania GraphQL (dla Shopify Functions)
const inputVariablesValue = {
  collectionIds: Array.from(new Set(collectionIds)) // usuń duplikaty
};

// Przy tworzeniu metafields, dodaj input variables:
const metafieldResult = await callShopify(metafieldMutation, {
  metafields: [
    {
      ownerId: shopifyDiscountId,
      namespace: "$app:taskify-discounts",
      key: "function-configuration",
      type: "json",
      value: JSON.stringify(metafieldValue)
    },
    {
      ownerId: shopifyDiscountId,
      namespace: "$app:discount",
      key: "input-variables",
      type: "json",
      value: JSON.stringify(inputVariablesValue)
    }
  ]
});
```

### 3.2 Funkcja aktualizacji metafield dla istniejących zniżek

```javascript
// FUNKCJA POMOCNICZA DO AKTUALIZACJI METAFIELD INPUT VARIABLES NA ISTNIEJĄCYCH ZNIŻKACH
const updateDiscountInputVariables = async (discount) => {
  if (!discount.shopifyDiscountId) {
    console.log("🔍 Skipping metafield update - no Shopify discount ID for:", discount.name);
    return;
  }

  try {
    // Pobierz collectionIds z warunków kolekcji
    const collectionIds = [];
    if (discount.conditions) {
      discount.conditions.forEach(condition => {
        if (condition.type === 'cart_contains' && condition.value) {
          const isCollectionOperator = [
            'only_these_collections',
            'at_least_one_collection',
            'no_products_from_collections'
          ].includes(condition.operator);
          
          if (isCollectionOperator) {
            const conditionCollectionIds = condition.value.split(',').map(id => id.trim()).filter(Boolean);
            collectionIds.push(...conditionCollectionIds);
          }
        }
      });
    }

    const inputVariablesValue = {
      collectionIds: Array.from(new Set(collectionIds)) // usuń duplikaty
    };

    const metafieldMutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;
    
    const metafieldResult = await callShopify(metafieldMutation, {
      metafields: [
        {
          ownerId: discount.shopifyDiscountId,
          namespace: "$app:discount",
          key: "input-variables",
          type: "json",
          value: JSON.stringify(inputVariablesValue)
        }
      ]
    });
    
    if (metafieldResult.metafieldsSet?.userErrors?.length > 0) {
      console.warn("⚠️ Błąd aktualizacji input variables metafield:", metafieldResult.metafieldsSet.userErrors);
    } else {
      console.log(`✅ Zaktualizowano input variables metafield dla zniżki: ${discount.name}`);
    }
  } catch (error) {
    console.warn(`⚠️ Nie udało się zaktualizować input variables dla zniżki ${discount.name}:`, error);
  }
};
```

## Krok 4: Przykłady użycia

### 4.1 Warunek: "Co najmniej jeden produkt z kolekcji"

```javascript
const condition = {
  type: 'cart_contains',
  operator: 'at_least_one_collection',
  value: 'gid://shopify/Collection/123456789' // ID kolekcji
};
```

### 4.2 Warunek: "Tylko produkty z kolekcji"

```javascript
const condition = {
  type: 'cart_contains',
  operator: 'only_these_collections',
  value: 'gid://shopify/Collection/123456789,gid://shopify/Collection/987654321' // Wiele kolekcji oddzielonych przecinkami
};
```

### 4.3 Warunek: "Żaden produkt z kolekcji"

```javascript
const condition = {
  type: 'cart_contains',
  operator: 'no_products_from_collections',
  value: 'gid://shopify/Collection/123456789'
};
```



## Krok 5: Testowanie

### 5.1 Przykładowy input JSON dla testów

```json
{
  "cart": {
    "lines": [
      {
        "id": "gid://shopify/CartLine/1",
        "merchandise": {
          "__typename": "ProductVariant",
          "product": {
            "id": "gid://shopify/Product/111",
            "inAnyCollection": true,
            "inCollections": [
              {
                "id": "gid://shopify/Collection/123456789",
                "title": "Kolekcja testowa"
              }
            ]
          }
        }
      }
    ]
  },
  "discount": {
    "discountClasses": ["PRODUCT"],
    "metafield": {
      "value": "{\"collectionIds\": [\"gid://shopify/Collection/123456789\"]}"
    }
  }
}
```

### 5.2 Weryfikacja działania

1. **Logi w funkcji** - sprawdź logi w Shopify Admin > Settings > Functions
2. **Test w koszyku** - dodaj produkty do koszyka i sprawdź czy zniżka się aktywuje
3. **Debugowanie** - użyj `console.log` do śledzenia wartości `inAnyCollection` i `inCollections`

## Krok 6: Wdrożenie

### 6.1 Deploy funkcji

```bash
shopify app deploy
```

### 6.2 Weryfikacja w Shopify Admin

1. Przejdź do **Shopify Admin > Settings > Functions**
2. Sprawdź czy funkcja jest wdrożona
3. Przetestuj z rzeczywistymi produktami i kolekcjami

## Ważne uwagi

1. **Limity**: Shopify ogranicza zmienne zapytania GraphQL do maksymalnie 100 elementów w liście
2. **Performance**: Im więcej collectionIds, tym wolniejsze zapytanie - używaj minimalnej liczby potrzebnych kolekcji
3. **Fallback**: Zawsze implementuj fallback dla przypadków, gdy dane o kolekcjach nie są dostępne
4. **Debugowanie**: Używaj szczegółowego logowania do debugowania warunków kolekcji

## Najczęstsze problemy

1. **Błąd "inAnyCollection not found"** - sprawdź czy zapytanie GraphQL ma poprawnie zdefiniowaną zmienną `$collectionIds`
2. **Input variables nie działają** - sprawdź namespace i key w `shopify.extension.toml`
3. **Zniżka nie aktywuje się** - sprawdź logi funkcji w Shopify Admin
4. **Metafield nie zapisuje się** - sprawdź czy ID zniżki jest poprawne

Powodzenia z implementacją warunków kolekcji w Shopify Functions! 🚀 