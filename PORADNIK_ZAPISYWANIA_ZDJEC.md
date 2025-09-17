# 📸 SZCZEGÓŁOWY PORADNIK: Zapisywanie i wyświetlanie zdjęć w aplikacji Taskfy

## 🎯 Cel tego poradnika

Ten poradnik pokazuje **dokładny proces** zapisywania zdjęć w `app._index.jsx` i wyświetlania ich w extensionie Taskfy. Obejmuje kompletny flow od uploadu pliku do wyświetlenia w sklepie.

## 🏗️ Architektura systemu

### 1. **Flow danych:**
```
Usuario → Upload w app._index.jsx → Konwersja do base64 → Zapisanie w state → 
Wywołanie API → Shopify metafields → Extension pobiera dane → Wyświetlenie w sklepie
```

### 2. **Składniki systemu:**
- **App (app._index.jsx)**: Interface administratora do uploadu zdjęć
- **Metafields**: Shopify storage dla danych aplikacji
- **Extension (star_rating.liquid)**: Wyświetlanie zdjęć w sklepie
- **GraphQL API**: Komunikacja z Shopify

## 📋 Krok po kroku: Implementacja systemu zdjęć

### **KROK 1: Przygotowanie state'u dla zdjęć**

W `app._index.jsx` znajdź lub dodaj state do zarządzania zdjęciami:

```javascript
// Stan dla panelu ustawień (już istnieje w aplikacji)
const [panelSettings, setPanelSettings] = useState({
  // ... inne ustawienia
  circleImageUrl: '', // Zdjęcie dla przycisku koła
  cartValueBackgroundImage: '', // Zdjęcie tła nagłówka
  highestDiscountBackgroundImage: '', // Zdjęcie tła podgłówka
  footerBackgroundImage: '', // Zdjęcie tła stopki
});

// Stan dla zniżek (już istnieje w aplikacji)
const [newDiscount, setNewDiscount] = useState({
  // ... inne pola
  imageUrl: '', // Zdjęcie ikony zniżki
  backgroundImage: '', // Zdjęcie tła zniżki
});
```

### **KROK 2: Funkcje konwersji zdjęć do base64**

Aplikacja używa funkcji pomocniczej do konwersji plików na base64:

```javascript
// Funkcja pomocnicza do konwersji pliku na base64
const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
```

### **KROK 3: Implementacja funkcji upload dla różnych rodzajów zdjęć**

#### **A) Upload zdjęcia dla przycisku koła:**

```javascript
const handleCircleImageDrop = useCallback((files) => {
  const file = files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64Data = e.target.result;
    setPanelSettings(prev => ({
      ...prev,
      circleImageUrl: base64Data
    }));
  };
  reader.readAsDataURL(file);
}, []);
```

#### **B) Upload zdjęcia tła nagłówka:**

```javascript
const handleHeaderImageDrop = useCallback((files) => {
  const file = files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64Data = e.target.result;
    setPanelSettings(prev => ({
      ...prev,
      cartValueBackgroundImage: base64Data
    }));
  };
  reader.readAsDataURL(file);
}, []);
```

#### **C) Upload zdjęcia dla ikony zniżki:**

```javascript
const handleImageDrop = useCallback((files) => {
  const file = files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64Data = e.target.result;
    setNewDiscount(prev => ({
      ...prev,
      imageUrl: base64Data
    }));
  };
  reader.readAsDataURL(file);
}, []);
```

### **KROK 4: Komponenty upload w UI**

#### **A) Dropzone dla zdjęć:**

```javascript
// W renderze komponentu
<DropZone onDrop={handleCircleImageDrop} accept="image/*">
  {panelSettings.circleImageUrl ? (
    <div style={{ position: 'relative', textAlign: 'center' }}>
      <img
        src={panelSettings.circleImageUrl}
        alt="Circle button"
        style={{
          maxWidth: '100px',
          maxHeight: '100px',
          borderRadius: '8px'
        }}
      />
      <Button
        onClick={handleRemoveCircleImage}
        destructive
        size="small"
        style={{ marginTop: '8px' }}
      >
        Usuń zdjęcie
      </Button>
    </div>
  ) : (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <Text as="p">Przeciągnij zdjęcie lub kliknij aby wybrać</Text>
      <Text as="p" variant="bodyMd" color="subdued">
        Obsługiwane formaty: JPG, PNG, GIF
      </Text>
    </div>
  )}
</DropZone>
```

#### **B) Funkcja usuwania zdjęć:**

```javascript
const handleRemoveCircleImage = () => {
  setPanelSettings(prev => ({ ...prev, circleImageUrl: '' }));
};

const handleRemoveHeaderImage = () => {
  setPanelSettings(prev => ({ ...prev, cartValueBackgroundImage: '' }));
};
```

### **KROK 5: Zapisywanie zdjęć do Shopify Metafields**

#### **A) Funkcja zapisywania ustawień panelu:**

```javascript
const savePanelSettings = async (settingsToSave) => {
  console.log('💾 Zapisywanie ustawień panelu z zdjęciami...');
  
  try {
    // Przygotuj dane do zapisu w metafields
    const metafieldsData = [];
    
    // Mapowanie pól z lokalnymi kluczami
    const settingsMapping = [
      { field: 'circleImageUrl', key: 'circle_image_url' },
      { field: 'cartValueBackgroundImage', key: 'cart_value_background_image' },
      { field: 'highestDiscountBackgroundImage', key: 'highest_discount_background_image' },
      { field: 'footerBackgroundImage', key: 'footer_background_image' },
      // ... inne pola
    ];

    // Dla każdego ustawienia utwórz metafield
    settingsMapping.forEach(({ field, key }) => {
      if (settingsToSave[field] !== undefined) {
        metafieldsData.push({
          namespace: 'taskify_panel',
          key: key,
          value: settingsToSave[field].toString(),
          type: 'single_line_text_field'
        });
      }
    });

    // Wywołaj mutację GraphQL
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const result = await callShopify(mutation, {
      metafields: metafieldsData
    });

    if (result.metafieldsSet?.userErrors?.length > 0) {
      console.error('❌ Błędy zapisywania zdjęć:', result.metafieldsSet.userErrors);
      throw new Error('Błąd zapisywania zdjęć do metafields');
    }

    console.log('✅ Zdjęcia zapisane pomyślnie do metafields');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Błąd zapisywania zdjęć:', error);
    throw error;
  }
};
```

### **KROK 6: Pobieranie zdjęć z Metafields**

#### **A) Funkcja wczytywania ustawień:**

```javascript
const loadPanelSettings = async () => {
  console.log('📥 Ładowanie ustawień panelu z zdjęciami...');
  
  try {
    const query = `
      query getPanelSettings {
        shop {
          metafields(first: 50, namespace: "taskify_panel") {
            edges {
              node {
                id
                key
                value
                type
              }
            }
          }
        }
      }
    `;

    const data = await callShopify(query);
    const metafields = data.shop?.metafields?.edges || [];
    
    // Inicjalizuj ustawienia z domyślnymi wartościami
    const updatedSettings = {
      circleImageUrl: '',
      cartValueBackgroundImage: '',
      highestDiscountBackgroundImage: '',
      footerBackgroundImage: '',
      // ... inne ustawienia
    };

    // Przetwórz metafields na ustawienia
    metafields.forEach(({ node }) => {
      switch (node.key) {
        case 'circle_image_url':
          updatedSettings.circleImageUrl = node.value;
          break;
        case 'cart_value_background_image':
          updatedSettings.cartValueBackgroundImage = node.value;
          break;
        case 'highest_discount_background_image':
          updatedSettings.highestDiscountBackgroundImage = node.value;
          break;
        case 'footer_background_image':
          updatedSettings.footerBackgroundImage = node.value;
          break;
        // ... inne przypadki
      }
    });

    setPanelSettings(updatedSettings);
    console.log('✅ Ustawienia z zdjęciami załadowane:', updatedSettings);
    
  } catch (error) {
    console.error('❌ Błąd ładowania zdjęć:', error);
  }
};
```

### **KROK 7: Wyświetlanie zdjęć w Extension**

W pliku `extensions/taskify/blocks/star_rating.liquid` zdjęcia są pobierane z metafields:

#### **A) Pobieranie zdjęć z metafields:**

```liquid
{%- comment -%}
Pobieranie zdjęć z metafields sklepu
{%- endcomment -%}
{% assign circle_image_url = shop.metafields.taskify_panel.circle_image_url.value | default: '' %}
{% assign cart_value_background_image = shop.metafields.taskify_panel.cart_value_background_image.value | default: '' %}
{% assign highest_discount_background_image = shop.metafields.taskify_panel.highest_discount_background_image.value | default: '' %}
{% assign footer_background_image = shop.metafields.taskify_panel.footer_background_image.value | default: '' %}
```

#### **B) Używanie zdjęć w CSS:**

```liquid
<style>
  /* Przycisk koła z własnym zdjęciem */
  .taskify-circle-button {
    position: fixed;
    /* ... pozycjonowanie */
    {% if circle_image_url != blank %}
      background-image: url('{{ circle_image_url }}');
      background-size: cover;
      background-position: center;
    {% else %}
      background-color: {{ circle_background_color }};
    {% endif %}
  }

  /* Tło nagłówka */
  .taskify-header {
    {% if cart_value_background_image != blank %}
      background-image: url('{{ cart_value_background_image }}');
      background-size: cover;
      background-position: center;
    {% else %}
      background-color: {{ header_background_color }};
    {% endif %}
  }

  /* Tło stopki */
  .taskify-footer {
    {% if footer_background_image != blank %}
      background-image: url('{{ footer_background_image }}');
      background-size: cover;
      background-position: center;
    {% else %}
      background-color: {{ footer_background }};
    {% endif %}
  }
</style>
```

#### **C) Wyświetlanie zdjęć w HTML:**

```liquid
<!-- Przycisk koła -->
<button class="taskify-circle-button" onclick="toggleTaskifyPanel()">
  {% if circle_image_url == blank %}
    <!-- Domyślny tekst/ikona jeśli brak zdjęcia -->
    <span style="color: white; font-size: 24px;">💰</span>
  {% endif %}
</button>

<!-- Sekcja z tłem -->
<div class="taskify-header" style="padding: 20px;">
  <h3>Wartość koszyka</h3>
</div>
```

## 🔧 Najważniejsze funkcje pomocnicze

### **1. Walidacja plików:**

```javascript
const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Nieobsługiwany format pliku. Używaj JPG, PNG, GIF lub WebP.');
  }

  if (file.size > maxSize) {
    throw new Error('Plik jest za duży. Maksymalny rozmiar to 5MB.');
  }

  return true;
};
```

### **2. Kompresja zdjęć:**

```javascript
const compressImage = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};
```

### **3. Podgląd zdjęć:**

```javascript
const ImagePreview = ({ imageUrl, onRemove, alt }) => {
  if (!imageUrl) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img
        src={imageUrl}
        alt={alt}
        style={{
          maxWidth: '200px',
          maxHeight: '200px',
          objectFit: 'cover',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}
      />
      <button
        onClick={onRemove}
        style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          background: 'rgba(255,255,255,0.8)',
          border: 'none',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        ×
      </button>
    </div>
  );
};
```

## 📊 Debugowanie i monitorowanie

### **1. Logi w konsoli:**

```javascript
// W funkcji upload
console.log('📸 Rozpoczynam upload zdjęcia:', file.name);
console.log('📏 Rozmiar pliku:', file.size, 'bajtów');
console.log('🎨 Typ pliku:', file.type);

// Po konwersji
console.log('✅ Zdjęcie skonwertowane do base64, długość:', base64Data.length);

// Podczas zapisu
console.log('💾 Zapisuję zdjęcie do metafields...');
console.log('✅ Zdjęcie zapisane pomyślnie');
```

### **2. Obsługa błędów:**

```javascript
const handleImageUpload = async (file) => {
  try {
    // Walidacja
    validateImageFile(file);
    
    // Kompresja (opcjonalnie)
    const compressedFile = await compressImage(file);
    
    // Konwersja do base64
    const base64Data = await convertToBase64(compressedFile || file);
    
    // Aktualizacja state
    setNewDiscount(prev => ({
      ...prev,
      imageUrl: base64Data
    }));
    
    showToast('✅ Zdjęcie zostało przesłane pomyślnie');
    
  } catch (error) {
    console.error('❌ Błąd uploadu zdjęcia:', error);
    showToast(`❌ Błąd: ${error.message}`);
  }
};
```

## 🚀 Optymalizacje wydajności

### **1. Lazy loading zdjęć:**

```liquid
<img
  src="{{ image_url }}"
  alt="{{ alt_text }}"
  loading="lazy"
  style="max-width: 100%; height: auto;"
/>
```

### **2. Responsywne zdjęcia:**

```liquid
<style>
  .responsive-image {
    max-width: 100%;
    height: auto;
    display: block;
  }
  
  @media (max-width: 768px) {
    .responsive-image {
      max-width: 200px;
    }
  }
</style>
```

### **3. Fallback dla brakujących zdjęć:**

```liquid
{% if image_url != blank %}
  <img src="{{ image_url }}" alt="{{ alt_text }}" />
{% else %}
  <div class="image-placeholder">
    <span>Brak zdjęcia</span>
  </div>
{% endif %}
```

## 🎯 Przykład kompletnej implementacji

### **1. Komponenta w app._index.jsx:**

```javascript
const ImageUploadSection = () => {
  return (
    <Card sectioned title="Zdjęcia">
      <BlockStack gap="400">
        
        {/* Upload dla przycisku koła */}
        <FormLayout>
          <FormLayout.Group>
            <Text as="h3" variant="headingMd">Zdjęcie przycisku koła</Text>
            <DropZone onDrop={handleCircleImageDrop} accept="image/*">
              {panelSettings.circleImageUrl ? (
                <ImagePreview
                  imageUrl={panelSettings.circleImageUrl}
                  onRemove={handleRemoveCircleImage}
                  alt="Przycisk koła"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Text as="p">Przeciągnij zdjęcie lub kliknij aby wybrać</Text>
                </div>
              )}
            </DropZone>
          </FormLayout.Group>
        </FormLayout>

        {/* Upload dla tła nagłówka */}
        <FormLayout>
          <FormLayout.Group>
            <Text as="h3" variant="headingMd">Tło nagłówka</Text>
            <DropZone onDrop={handleHeaderImageDrop} accept="image/*">
              {panelSettings.cartValueBackgroundImage ? (
                <ImagePreview
                  imageUrl={panelSettings.cartValueBackgroundImage}
                  onRemove={handleRemoveHeaderImage}
                  alt="Tło nagłówka"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Text as="p">Przeciągnij zdjęcie lub kliknij aby wybrać</Text>
                </div>
              )}
            </DropZone>
          </FormLayout.Group>
        </FormLayout>

        {/* Przycisk zapisu */}
        <Button
          primary
          onClick={handlePanelSettingsSave}
          loading={isLoading}
        >
          Zapisz zdjęcia
        </Button>

      </BlockStack>
    </Card>
  );
};
```

### **2. Fragment w star_rating.liquid:**

```liquid
{%- comment -%}
Pobieranie zdjęć z metafields
{%- endcomment -%}
{% assign circle_image_url = shop.metafields.taskify_panel.circle_image_url.value | default: '' %}
{% assign header_bg_image = shop.metafields.taskify_panel.cart_value_background_image.value | default: '' %}

<style>
  .taskify-circle-button {
    /* ... pozycjonowanie ... */
    {% if circle_image_url != blank %}
      background-image: url('{{ circle_image_url }}');
      background-size: cover;
      background-position: center;
    {% else %}
      background-color: {{ circle_background_color }};
    {% endif %}
  }
</style>

<button class="taskify-circle-button" onclick="toggleTaskifyPanel()">
  {% if circle_image_url == blank %}
    💰
  {% endif %}
</button>
```

## 🔍 Rozwiązywanie problemów

### **Najczęstsze problemy:**

1. **Zdjęcie się nie wyświetla:**
   - Sprawdź czy base64 jest poprawnie zapisany
   - Sprawdź czy metafield został zapisany
   - Sprawdź składnię Liquid w extension

2. **Błąd "Too large":**
   - Użyj kompresji zdjęć
   - Ogranicz rozmiar pliku do 5MB

3. **Zdjęcie się nie ładuje:**
   - Sprawdź format pliku (JPG, PNG, GIF, WebP)
   - Sprawdź czy nie ma błędów w base64

### **Przydatne komendy debug:**

```javascript
// Sprawdzanie rozmiaru base64
console.log('Base64 size:', base64Data.length, 'characters');

// Sprawdzanie czy to prawidłowy base64
const isValidBase64 = base64Data.startsWith('data:image/');
console.log('Valid base64:', isValidBase64);

// Sprawdzanie metafields
console.log('Current settings:', panelSettings);
```

## 🎉 Podsumowanie

Ten system pozwala na:
- ✅ Upload zdjęć przez interface administratora
- ✅ Automatyczną konwersję do base64
- ✅ Zapisywanie w Shopify metafields
- ✅ Wyświetlanie w extension sklepu
- ✅ Responsywne zarządzanie zdjęciami
- ✅ Obsługę błędów i walidację

**Pamiętaj:** Zawsze testuj zmiany w środowisku developerskim przed wdrożeniem do produkcji! 