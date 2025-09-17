# 🔄 Synchronizacja Dwukierunkowa - Dokumentacja

## 📋 Przegląd

Nowa funkcjonalność synchronizacji dwukierunkowej zapewnia bezpieczne zarządzanie zniżkami między aplikacją Taskify a panelem Shopify. System automatycznie utrzymuje spójność danych i chroni przed przypadkowym usunięciem zniżek stworzonych przez inne aplikacje.

## 🔐 Zabezpieczenia

### 1. Identyfikacja Zniżek Naszej Aplikacji

```javascript
const isDiscountCreatedByOurApp = (shopifyDiscount) => {
  // Sprawdź czy to zniżka typu App z naszym functionId
  if (shopifyDiscount.automaticDiscount?.__typename === 'DiscountAutomaticApp') {
    const appHandle = shopifyDiscount.automaticDiscount.appDiscountType?.app?.handle;
    if (appHandle && (appHandle.includes('taskify') || appHandle.includes('taskfy'))) {
      return true;
    }
  }
  
  // Sprawdź prefix/suffix w tytule
  const title = shopifyDiscount.automaticDiscount?.title;
  if (title && (title.includes('[Taskify]') || title.startsWith('Taskify:'))) {
    return true;
  }
  
  return false;
};
```

### 2. Automatyczne Oznaczanie Nowych Zniżek

Wszystkie nowe zniżki tworzone przez aplikację są automatycznie oznaczane prefiksem `[Taskify]`:

```javascript
const shopifyTitle = `[Taskify] ${discountName.trim()}`;
```

## 🔄 Mechanizmy Synchronizacji

### 1. Synchronizacja Metafields → Shopify

**Automatyczna przy ładowaniu aplikacji:**
- Sprawdza czy zniżki z metafields istnieją w Shopify
- Usuwa z metafields zniżki które nie istnieją w Shopify
- Zachowuje zniżki lokalne (bez `shopifyDiscountId`)

### 2. Synchronizacja Shopify → Metafields

**Manualna przez przycisk "Synchronizuj dwukierunkowo":**
- Znajduje osierocone zniżki w Shopify (bez odpowiadających metafields)
- **BEZPIECZNIE** usuwa tylko zniżki stworzone przez naszą aplikację
- Nie dotyka zniżek stworzonych przez inne aplikacje lub ręcznie

### 3. Bezpieczne Usuwanie

**Przycisk "Usuń" w aplikacji:**
- Zawsze usuwa z metafields
- Usuwa z Shopify TYLKO jeśli zniżka została stworzona przez naszą aplikację
- Wyświetla odpowiednie komunikaty o statusie operacji

## 🎯 Funkcje

### `cleanupOrphanedShopifyDiscounts()`

Główna funkcja czyszczenia osieroconych zniżek:

```javascript
const cleanupOrphanedShopifyDiscounts = async () => {
  // 1. Pobierz wszystkie zniżki z Shopify
  // 2. Pobierz zniżki z metafields  
  // 3. Znajdź osierocone zniżki (tylko nasze!)
  // 4. Bezpiecznie usuń osierocone zniżki
  return deletedCount;
};
```

### `handleDeleteSingleDiscount()`

Ulepszona funkcja usuwania z zabezpieczeniami:

```javascript
const handleDeleteSingleDiscount = async (discountId, discountDescription) => {
  // 1. Znajdź zniżkę w lokalnym stanie
  // 2. Sprawdź w Shopify z weryfikacją bezpieczeństwa
  // 3. Usuń z Shopify TYLKO jeśli to nasza zniżka
  // 4. ZAWSZE usuń z metafields
};
```

## 🖱️ Interfejs Użytkownika

### Przycisk Synchronizacji

Dodany w sekcji "Lista Zniżek":

```jsx
<Button 
  onClick={syncDiscountsWithShopify}
  variant="secondary"
  size="slim"
  loading={isSyncing}
>
  🔄 Synchronizuj dwukierunkowo
</Button>
```

### Komunikaty

- ✅ `Synchronizacja zakończona - wszystko zsynchronizowane`
- ✅ `Synchronizacja zakończona - usunięto X osieroconych zniżek z Shopify`
- ⚠️ `Zniżka w Shopify nie została stworzona przez naszą aplikację - usuwam tylko z metafields`
- 🛡️ `BEZPIECZEŃSTWO: Zniżka nie została stworzona przez naszą aplikację - pomijam usuwanie z Shopify`

## 🔍 Logowanie i Debugowanie

System zawiera szczegółowe logowanie:

```javascript
console.log(`🔍 Znaleziono ${ourAppDiscounts.length} zniżek stworzonych przez naszą aplikację`);
console.log(`🗑️ Znaleziono ${orphanedDiscounts.length} osieroconych zniżek do usunięcia`);
console.log(`✅ Zniżka stworzona przez naszą aplikację: ${title}`);
console.log(`❌ Zniżka NIE została stworzona przez naszą aplikację: ${title}`);
```

## 🚀 Korzyści

1. **Bezpieczeństwo**: Chroni przed usunięciem zniżek innych aplikacji
2. **Automatyzacja**: Automatyczne czyszczenie podczas ładowania
3. **Kontrola**: Ręczna synchronizacja na żądanie
4. **Przejrzystość**: Szczegółowe logi i komunikaty
5. **Niezawodność**: Dwukierunkowa synchronizacja zapewnia spójność

## ⚠️ Ważne Uwagi

1. **Oznaczanie zniżek**: Wszystkie nowe zniżki są oznaczane `[Taskify]`
2. **Tylko nasze zniżki**: System usuwa z Shopify tylko zniżki stworzone przez aplikację
3. **Metafields zawsze**: Usuwanie z metafields zawsze następuje, niezależnie od statusu w Shopify
4. **Automatyka przy starcie**: Synchronizacja metafields→Shopify działa automatycznie
5. **Ręczna kontrola**: Synchronizacja Shopify→metafields wymaga ręcznego uruchomienia

## 🔧 Konfiguracja

Aby dostosować identyfikację aplikacji, zmień w funkcji `isDiscountCreatedByOurApp()`:

```javascript
// Sprawdź handle aplikacji
if (appHandle && (appHandle.includes('twoja-aplikacja'))) {
  return true;
}

// Sprawdź prefix w tytule
if (title && (title.includes('[TwojaApp]'))) {
  return true;
}
```

---

**Status:** ✅ Zaimplementowane i przetestowane  
**Wersja:** 1.0  
**Data:** $(date) 