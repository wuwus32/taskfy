// REACT AND SHOPIFY POLARIS IMPORTS
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChatIcon,
  SearchIcon
} from '@shopify/polaris-icons';

// SHOPIFY APP BRIDGE IMPORTS

// REMOVED EXTERNAL COMPONENTS - MOVED TO INLINE FUNCTIONS

// INLINE PRODUCT PICKER MODAL COMPONENT
function ProductPickerModal({ 
  open, 
  onClose, 
  onSelect, 
  onFetchProducts,
  initialSelectedProducts = [] 
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [checked, setChecked] = useState(initialSelectedProducts);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to fetch products using callback from parent
  const fetchProducts = useCallback(async () => {
    if (!open || !onFetchProducts) return;
    
   // console.log("🚀 [PRODUCT MODAL] Starting fetchProducts...");
   // console.log("🔍 [PRODUCT MODAL] Search:", search, "Filter:", filter);
    
    setLoading(true);
    setError(null);
    
    try {
      // Build query string based on search and filter
      let queryString = "";
      if (search) {
        switch (filter) {
          case "title":
            queryString = `title:*${search}*`;
            break;
          case "id":
            queryString = `id:${search}`;
            break;
          case "sku":
            queryString = `sku:*${search}*`;
            break;
          case "barcode":
            queryString = `barcode:*${search}*`;
            break;
          default:
            queryString = search;
        }
      }

     // console.log("📝 [PRODUCT MODAL] Query string:", queryString);

      // Call the parent's fetch function
      const result = await onFetchProducts(queryString);
      
      if (result.error) {
        throw new Error(result.error);
      }

      //console.log("✅ [PRODUCT MODAL] Fetched", result.products?.length || 0, "products");
      setProducts(result.products || []);
      
    } catch (err) {
      //console.error("❌ [PRODUCT MODAL] Error fetching products:", err);
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [open, onFetchProducts, search, filter]);

  // Fetch products when modal opens
  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open, fetchProducts]);

  // Debounce search
  useEffect(() => {
    if (!open) return;
    
    const debounceTimer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [search, filter, fetchProducts]);

  const handleSearchChange = useCallback((value) => {
    setSearch(value);
  }, []);

  const handleFilterChange = useCallback((value) => {
    setFilter(value);
  }, []);

  const handleToggleProduct = (id) => {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleSelect = () => {
    const selectedProducts = products.filter((p) => checked.includes(p.id));
    onSelect(selectedProducts);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
              title="Select products"
      primaryAction={{
        content: `Select (${checked.length})`,
        onAction: handleSelect,
        disabled: checked.length === 0
      }}
      secondaryActions={[
        { content: "Cancel", onAction: onClose },
      ]}
      large
    >
      <BlockStack gap="400">
        <InlineStack gap="400" align="start">
          <Box width="70%">
            <TextField
                              label="Search products"
              value={search}
              onChange={handleSearchChange}
              autoComplete="off"
                              placeholder="Type product name..."
              clearButton
              onClearButtonClick={() => setSearch("")}
            />
          </Box>
          <Box width="30%">
            <Select
                              label="Search by"
              options={[
                                  { label: "All", value: "all" },
                { label: "Title", value: "title" },
                { label: "ID produktu", value: "id" },
                { label: "SKU", value: "sku" },
                { label: "Barcode", value: "barcode" },
              ]}
              value={filter}
              onChange={handleFilterChange}
            />
          </Box>
        </InlineStack>
        
        {error && (
          <Text as="p" variant="bodyMd" color="critical">
                            Error: {error}
          </Text>
        )}
        
        {loading ? (
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <Spinner size="large" />
            <Text as="p" variant="bodyMd" color="subdued">
                                  Loading products...
            </Text>
          </div>
        ) : products.length > 0 ? (
          <ResourceList
            resourceName={{ singular: "produkt", plural: "produkty" }}
            items={products}
            renderItem={(item) => {
              const { id, title, featuredImage } = item;
              const isChecked = checked.includes(id);
              
              return (
                <ResourceItem
                  id={id}
                  media={
                    <Thumbnail
                      source={featuredImage?.originalSrc || "https://via.placeholder.com/100"}
                      alt={featuredImage?.altText || title}
                      size="medium"
                    />
                  }
                  accessibilityLabel={`${isChecked ? 'Odznacz' : 'Wybierz'}: ${title}`}
                  onClick={() => handleToggleProduct(id)}
                >
                  <InlineStack gap="200" align="start">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleProduct(id)}
                      style={{ marginTop: '2px' }}
                    />
                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="medium">
                        {title}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        ID: {id.split('/').pop()}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </ResourceItem>
              );
            }}
          />
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <Text as="p" variant="bodyMd" color="subdued">
              {search ? `No products found for "${search}"` : "No products"}
            </Text>
          </div>
        )}
      </BlockStack>
    </Modal>
  );
}

// INLINE COLLECTION PICKER MODAL COMPONENT
function CollectionPickerModal({ 
  open, 
  onClose, 
  onSelect, 
  onFetchCollections,
  initialSelectedCollections = []
}) {
  const [collections, setCollections] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Initialize selected collections when modal opens
  useEffect(() => {
    if (open && initialSelectedCollections.length > 0) {
      // Find collections by IDs from the current collections list
      const preSelected = collections.filter(collection => 
        initialSelectedCollections.includes(collection.id)
      );
      setSelectedCollections(preSelected);
    }
  }, [open, initialSelectedCollections, collections]);

  // Fetch collections when modal opens or search changes
  useEffect(() => {
    if (open) {
      fetchCollections();
    }
  }, [open, searchQuery]);

  const fetchCollections = async () => {
    if (!onFetchCollections) return;
    
    setLoading(true);
    try {
      //console.log('🔍 [COLLECTION PICKER] Fetching collections with query:', searchQuery);
      const result = await onFetchCollections(searchQuery, 50);
      //console.log('✅ [COLLECTION PICKER] Received collections:', result);
      
      if (result && result.collections) {
        setCollections(result.collections);
        setHasNextPage(result.pageInfo?.hasNextPage || false);
      }
    } catch (error) {
      //console.error('❌ [COLLECTION PICKER] Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionSelect = useCallback((collectionId) => {
    setSelectedCollections(prevSelected => {
      const collection = collections.find(c => c.id === collectionId);
      if (!collection) return prevSelected;

      const isAlreadySelected = prevSelected.some(c => c.id === collectionId);
      
      if (isAlreadySelected) {
        // Remove from selection
        return prevSelected.filter(c => c.id !== collectionId);
      } else {
        // Add to selection
        return [...prevSelected, collection];
      }
    });
  }, [collections]);

  const handleSelectCollections = () => {
   // console.log('✅ [COLLECTION PICKER] Selecting collections:', selectedCollections);
    onSelect(selectedCollections);
    onClose();
  };

  const handleCancel = () => {
    setSelectedCollections([]);
    setSearchQuery('');
    onClose();
  };

  const renderCollectionItem = useCallback((collection) => {
    const isSelected = selectedCollections.some(c => c.id === collection.id);
    
    return (
      <ResourceItem
        id={collection.id}
        onClick={() => handleCollectionSelect(collection.id)}
        selected={isSelected}
        media={
          <Thumbnail
            source={collection.image?.originalSrc || 'https://via.placeholder.com/40'}
            alt={collection.image?.altText || collection.title}
            size="small"
          />
        }
      >
        <BlockStack gap="100">
          <InlineStack gap="200" blockAlign="center">
            <Text variant="bodyMd" fontWeight="medium">
              {collection.title}
            </Text>
            <Badge tone="info">
              {collection.productsCount} products
            </Badge>
          </InlineStack>
          
          {collection.description && (
            <Text variant="bodySm" color="subdued" truncate>
              {collection.description}
            </Text>
          )}
          
          <Text variant="bodySm" color="subdued">
            Handle: {collection.handle}
          </Text>
        </BlockStack>
      </ResourceItem>
    );
  }, [selectedCollections, handleCollectionSelect]);

  return (
    <Modal
      open={open}
      onClose={handleCancel}
              title="Select collections"
      primaryAction={{
        content: `Select (${selectedCollections.length})`,
        onAction: handleSelectCollections,
        disabled: selectedCollections.length === 0
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: handleCancel
        }
      ]}
      large
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Search Field */}
          <TextField
            placeholder="Search collections..."
            value={searchQuery}
            onChange={setSearchQuery}
            prefix={<Icon source={SearchIcon} />}
            clearButton
            onClearButtonClick={() => setSearchQuery('')}
          />

          {/* Selected Collections Summary */}
          {selectedCollections.length > 0 && (
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd">
                  Wybrane kolekcje ({selectedCollections.length})
                </Text>
                <InlineStack gap="200" wrap>
                  {selectedCollections.map(collection => (
                    <Badge key={collection.id} tone="success">
                      {collection.title}
                    </Badge>
                  ))}
                </InlineStack>
              </BlockStack>
            </Card>
          )}

          {/* Collections List */}
          <Card>
            {loading ? (
              <Box padding="400">
                <InlineStack gap="200" blockAlign="center" align="center">
                  <Spinner size="small" />
                  <Text>Loading collections...</Text>
                </InlineStack>
              </Box>
            ) : collections.length === 0 ? (
              <EmptyState
                heading="No collections found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Try changing your search criteria.</p>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{ singular: 'collection', plural: 'collections' }}
                items={collections}
                renderItem={renderCollectionItem}
                selectedItems={selectedCollections.map(c => c.id)}
                onSelectionChange={(selectedIds) => {
                  // Handle bulk selection if needed
                 // console.log('Bulk selection changed:', selectedIds);
                }}
                promotedBulkActions={[
                  {
                    content: 'Wybierz wszystkie',
                    onAction: () => setSelectedCollections([...collections])
                  }
                ]}
                bulkActions={[
                  {
                    content: 'Clear selection',
                    onAction: () => setSelectedCollections([])
                  }
                ]}
              />
            )}
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

import {
  Button,
  Page,
  Card,
  Icon,
  Layout,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Banner,
  Toast,
  Frame,
  Spinner,
  DataTable,
  Badge,
  Form,
  FormLayout,
  TextField,
  Select,
  List,
  ChoiceList,
  ButtonGroup,
  Modal,
  Tabs,
  DropZone,
  Thumbnail,
  Checkbox,
  EmptyState,
  Tooltip,
  RangeSlider,
  Tag,
  Listbox,
  Combobox,
  EmptySearchResult,
  AutoSelection,
  ResourceList,
  ResourceItem,
} from "@shopify/polaris";

// GRAPHQL QUERY FOR FETCHING PRODUCTS
const GET_PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          featuredImage {
            originalSrc
            altText
          }
          status
          handle
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// GRAPHQL QUERY FOR FETCHING PRODUCTS BY IDS
const GET_PRODUCTS_BY_IDS_QUERY = `
  query GetProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        featuredImage {
          originalSrc
          altText
        }
        status
        handle
      }
    }
  }
`;

// GRAPHQL QUERY FOR FETCHING COLLECTIONS
const GET_COLLECTIONS_QUERY = `
  query GetCollections($first: Int!, $query: String) {
    collections(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          description
          image {
            originalSrc
            altText
          }
          productsCount {
            count
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// GRAPHQL QUERY FOR FETCHING COLLECTIONS BY IDS
const GET_COLLECTIONS_BY_IDS_QUERY = `
  query GetCollectionsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Collection {
        id
        title
        handle
        description
        image {
          originalSrc
          altText
        }
        productsCount {
          count
        }
      }
    }
  }
`;
// ACTION FOR HANDLING POST REQUESTS (INCLUDING PRODUCT FETCHING)
export const action = async ({ request }) => {
  // Import server-only modules inside the action
  const { json } = await import("@remix-run/node");
  const { authenticate } = await import("../shopify.server");
  
  //console.log("🌟 [APP ACTION] ===== ACTION CALLED =====");
  //console.log("🌟 [APP ACTION] Method:", request.method);
 // console.log("🌟 [APP ACTION] URL:", request.url);
  
  try {
    //console.log("🔐 [APP ACTION] Authenticating...");
    const { admin } = await authenticate.admin(request);
    //console.log("✅ [APP ACTION] Authentication successful");
    
    const formData = await request.formData();
    const actionType = formData.get("action");
    
    //console.log("📋 [APP ACTION] Action type:", actionType);

    if (actionType === "fetch_products") {
      const query = formData.get("query") || "";
      const first = parseInt(formData.get("first")) || 50;

      //console.log("🔍 [PRODUCTS] Fetching products with query:", query, "first:", first);

      const response = await admin.graphql(GET_PRODUCTS_QUERY, {
        variables: {
          first,
          query: query || undefined
        }
      });

      //console.log("📡 [PRODUCTS] GraphQL response received");
      const data = await response.json();
      //console.log("📊 [PRODUCTS] GraphQL data:", JSON.stringify(data, null, 2));
      
      if (data.errors) {
        //console.error("❌ [PRODUCTS] GraphQL errors:", data.errors);
        return json({ error: "Failed to fetch products", details: data.errors }, { status: 500 });
      }

      if (!data.data || !data.data.products) {
       // console.error("❌ [PRODUCTS] No products data in response");
        return json({ error: "No products data received" }, { status: 500 });
      }

      const products = data.data.products.edges.map(edge => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
        status: edge.node.status,
        featuredImage: edge.node.featuredImage ? {
          originalSrc: edge.node.featuredImage.originalSrc,
          altText: edge.node.featuredImage.altText
        } : null
      }));

      //console.log("✅ [PRODUCTS] Processed", products.length, "products");
     // console.log("📋 [PRODUCTS] Sample product:", products[0]);

      const result = {
        products,
        pageInfo: data.data.products.pageInfo
      };
      
     // console.log("🚀 [PRODUCTS] Returning JSON:", JSON.stringify(result, null, 2));
      return json(result);
    }

    if (actionType === "fetch_collections") {
      const query = formData.get("query") || "";
      const first = parseInt(formData.get("first")) || 50;

      //console.log("🔍 [COLLECTIONS] Fetching collections with query:", query, "first:", first);

      const response = await admin.graphql(GET_COLLECTIONS_QUERY, {
        variables: {
          first,
          query: query || undefined
        }
      });

     // console.log("📡 [COLLECTIONS] GraphQL response received");
      const data = await response.json();
      //console.log("📊 [COLLECTIONS] GraphQL data:", JSON.stringify(data, null, 2));
      
      if (data.errors) {
       // console.error("❌ [COLLECTIONS] GraphQL errors:", data.errors);
        return json({ error: "Failed to fetch collections", details: data.errors }, { status: 500 });
      }

      if (!data.data || !data.data.collections) {
       // console.error("❌ [COLLECTIONS] No collections data in response");
        return json({ error: "No collections data received" }, { status: 500 });
      }

      const collections = data.data.collections.edges.map(edge => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
        description: edge.node.description,
        productsCount: edge.node.productsCount?.count || 0,
        image: edge.node.image ? {
          originalSrc: edge.node.image.originalSrc,
          altText: edge.node.image.altText
        } : null
      }));

     // console.log("✅ [COLLECTIONS] Processed", collections.length, "collections");
      //console.log("📋 [COLLECTIONS] Sample collection:", collections[0]);

      const result = {
        collections,
        pageInfo: data.data.collections.pageInfo
      };
      
     // console.log("🚀 [COLLECTIONS] Returning JSON:", JSON.stringify(result, null, 2));
      return json(result);
    }

   // console.log("❌ [APP ACTION] Invalid action:", actionType);
    return json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
   // console.error("❌ [APP ACTION] Error:", error);
   // console.error("❌ [APP ACTION] Error stack:", error.stack);
    return json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
};

// FUNCTION FOR CALLING SHOPIFY GRAPHQL API
async function callShopify(query, variables) {
  try {
    // Szczegółowe logowanie zapytania
    const isDeleteMutation = query.includes('discountAutomaticDelete');
    
    if (isDeleteMutation) {
     // console.log("🗑️ DISCOUNT DELETE mutation - detailed logging:");
     // console.log("📝 Query:", query);
      //console.log("🔧 Variables:", variables);
    } else {
    //console.log("🔵 callShopify called with:", { 
    //  query: query.substring(0, 100) + "...", 
     // variables 
   // });
    }
    
    const requestBody = {
      query: query,
      variables: variables || {}
    };
    
    if (isDeleteMutation) {
     // console.log("📤 Request body:", JSON.stringify(requestBody, null, 2));
    }
    
    const response = await fetch('shopify:admin/api/2025-04/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    //console.log("📡 Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
     // console.error("❌ Response error:", errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (isDeleteMutation) {
     // console.log("📥 FULL response from delete mutation:", JSON.stringify(result, null, 2));
    } else {
   // console.log("✅ callShopify result received");
    }
    
    if (result.errors && result.errors.length > 0) {
     // console.error("❌ GraphQL errors:", result.errors);
      result.errors.forEach((error, index) => {
       // console.error(`  GraphQL Error ${index + 1}:`, error);
      });
      throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
   // console.error('💥 callShopify failed:', error);
   // console.error('💥 Error details:', {
     // name: error.name,
     // message: error.message,
     // stack: error.stack
   // });
    throw new Error(`Connection error: ${error.message}`);
  }
}

// COLOR PICKER COMPONENT
function ColorPickerField({ color, onChange }) {
  return (
    <Box>
      <InlineStack gap="300" blockAlign="center">
        <input
          type="color"
          id="color"
          value={color}
          onChange={e => onChange(e.target.value)}
          style={{ 
            width: 40, 
            height: 40, 
            border: "1px solid #ccc", 
            borderRadius: "4px",
            cursor: "pointer"
          }}
        />
        <Text variant="bodyMd" tone="subdued">
          Selected: {color}
        </Text>
      </InlineStack>
    </Box>
  );
}
// FONT SELECTION COMPONENT
function FontSelectField({ font, onChange, label }) {
  const fontOptions = [
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times New Roman', value: 'Times New Roman, Times, serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Trebuchet MS', value: 'Trebuchet MS, Helvetica, sans-serif' },
    { label: 'Courier New', value: 'Courier New, Courier, monospace' },
    { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
    { label: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
    { label: 'Palatino', value: 'Palatino Linotype, Book Antiqua, Palatino, serif' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Lucida Console', value: 'Lucida Console, Monaco, monospace' }
  ];

      // Add CSS styles for font preview
  useEffect(() => {
    const styleId = 'font-preview-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .Polaris-Select__Content {
          font-family: inherit;
        }
        .font-preview-Arial { font-family: Arial, sans-serif; }
        .font-preview-Helvetica { font-family: Helvetica, Arial, sans-serif; }
        .font-preview-Georgia { font-family: Georgia, serif; }
        .font-preview-TimesNewRoman { font-family: "Times New Roman", Times, serif; }
        .font-preview-Verdana { font-family: Verdana, Geneva, sans-serif; }
        .font-preview-TrebuchetMS { font-family: "Trebuchet MS", Helvetica, sans-serif; }
        .font-preview-CourierNew { font-family: "Courier New", Courier, monospace; }
        .font-preview-Impact { font-family: Impact, Charcoal, sans-serif; }
        .font-preview-ComicSansMS { font-family: "Comic Sans MS", cursive; }
        .font-preview-Palatino { font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif; }
        .font-preview-Tahoma { font-family: Tahoma, Geneva, sans-serif; }
        .font-preview-LucidaConsole { font-family: "Lucida Console", Monaco, monospace; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div>
      <Select
        label={label}
        options={fontOptions}
        value={font}
        onChange={onChange}
        helpText="Select font for this text"
      />
      <div style={{ 
        marginTop: '8px', 
        padding: '12px', 
        border: '2px solid #e1e3e5', 
        borderRadius: '6px',
        fontFamily: font,
        fontSize: '16px',
        backgroundColor: '#f9f9f9',
        fontWeight: '500'
      }}>
        📝 Preview: "Sample text in selected font ABC123"
      </div>
    </div>
  );
}

// DISMISSIBLE BANNER COMPONENT
function DismissibleBanner({ id, title, children, tone = "info", action, secondaryAction, onDismiss, isDismissed }) {
  if (isDismissed) {
    return null;
  }

  return (
    <Banner
      title={title}
      tone={tone}
      action={action}
      secondaryAction={secondaryAction}
      onDismiss={() => onDismiss(id)}
    >
      {children}
    </Banner>
  );
}
// MAIN TASKIFY APPLICATION COMPONENT
export default function AppIndex() {
  // COUNTRIES ORGANIZED BY CONTINENTS - COMPLETE SHOPIFY LIST - MOVED TO TOP
  const countriesByContinent = {
    "🌍 Europe": [
      { value: "AD", label: "Andorra" },
      { value: "AL", label: "Albania" },
      { value: "AT", label: "Austria" },
      { value: "AX", label: "Åland Islands" },
      { value: "BA", label: "Bosnia and Herzegovina" },
      { value: "BE", label: "Belgium" },
      { value: "BG", label: "Bulgaria" },
      { value: "BY", label: "Belarus" },
      { value: "CH", label: "Switzerland" },
      { value: "CY", label: "Cyprus" },
      { value: "CZ", label: "Czech Republic" },
      { value: "DE", label: "Germany" },
      { value: "DK", label: "Denmark" },
      { value: "EE", label: "Estonia" },
      { value: "ES", label: "Spain" },
      { value: "FI", label: "Finland" },
      { value: "FO", label: "Faroe Islands" },
      { value: "FR", label: "France" },
      { value: "GB", label: "United Kingdom" },
      { value: "GG", label: "Guernsey" },
      { value: "GI", label: "Gibraltar" },
      { value: "GL", label: "Greenland" },
      { value: "GR", label: "Greece" },
      { value: "HR", label: "Croatia" },
      { value: "HU", label: "Hungary" },
      { value: "IE", label: "Ireland" },
      { value: "IM", label: "Isle of Man" },
      { value: "IS", label: "Iceland" },
      { value: "IT", label: "Italy" },
      { value: "JE", label: "Jersey" },
      { value: "LI", label: "Liechtenstein" },
      { value: "LT", label: "Lithuania" },
      { value: "LU", label: "Luxembourg" },
      { value: "LV", label: "Latvia" },
      { value: "MC", label: "Monaco" },
      { value: "MD", label: "Moldova" },
      { value: "ME", label: "Montenegro" },
      { value: "MK", label: "North Macedonia" },
      { value: "MT", label: "Malta" },
      { value: "NL", label: "Netherlands" },
      { value: "NO", label: "Norway" },
      { value: "PL", label: "Poland" },
      { value: "PT", label: "Portugal" },
      { value: "RO", label: "Romania" },
      { value: "RS", label: "Serbia" },
      { value: "RU", label: "Russia" },
      { value: "SE", label: "Sweden" },
      { value: "SI", label: "Slovenia" },
      { value: "SJ", label: "Svalbard and Jan Mayen" },
      { value: "SK", label: "Slovakia" },
      { value: "SM", label: "San Marino" },
      { value: "UA", label: "Ukraine" },
      { value: "VA", label: "Vatican City" },
      { value: "XK", label: "Kosovo" }
    ],
    "🌎 North America": [
      { value: "AG", label: "Antigua and Barbuda" },
      { value: "AI", label: "Anguilla" },
      { value: "AW", label: "Aruba" },
      { value: "BB", label: "Barbados" },
      { value: "BL", label: "Saint Barthélemy" },
      { value: "BM", label: "Bermuda" },
      { value: "BQ", label: "Bonaire" },
      { value: "BS", label: "Bahamas" },
      { value: "BZ", label: "Belize" },
      { value: "CA", label: "Canada" },
      { value: "CR", label: "Costa Rica" },
      { value: "CU", label: "Cuba" },
      { value: "CW", label: "Curaçao" },
      { value: "DM", label: "Dominica" },
      { value: "DO", label: "Dominican Republic" },
      { value: "GD", label: "Grenada" },
      { value: "GP", label: "Guadeloupe" },
      { value: "GT", label: "Guatemala" },
      { value: "HN", label: "Honduras" },
      { value: "HT", label: "Haiti" },
      { value: "JM", label: "Jamaica" },
      { value: "KN", label: "Saint Kitts and Nevis" },
      { value: "KY", label: "Cayman Islands" },
      { value: "LC", label: "Saint Lucia" },
      { value: "MF", label: "Saint Martin" },
      { value: "MQ", label: "Martinique" },
      { value: "MS", label: "Montserrat" },
      { value: "MX", label: "Mexico" },
      { value: "NI", label: "Nicaragua" },
      { value: "PA", label: "Panama" },
      { value: "PM", label: "Saint Pierre and Miquelon" },
      { value: "PR", label: "Puerto Rico" },
      { value: "SV", label: "El Salvador" },
      { value: "SX", label: "Sint Maarten" },
      { value: "TC", label: "Turks and Caicos Islands" },
      { value: "TT", label: "Trinidad and Tobago" },
      { value: "US", label: "United States" },
      { value: "VC", label: "Saint Vincent and the Grenadines" },
      { value: "VG", label: "British Virgin Islands" },
      { value: "VI", label: "US Virgin Islands" }
    ],
    "🌎 South America": [
      { value: "AR", label: "Argentina" },
      { value: "BO", label: "Bolivia" },
      { value: "BR", label: "Brazil" },
      { value: "CL", label: "Chile" },
      { value: "CO", label: "Colombia" },
      { value: "EC", label: "Ecuador" },
      { value: "FK", label: "Falkland Islands" },
      { value: "GF", label: "French Guiana" },
      { value: "GS", label: "South Georgia and the South Sandwich Islands" },
      { value: "GY", label: "Guyana" },
      { value: "PE", label: "Peru" },
      { value: "PY", label: "Paraguay" },
      { value: "SR", label: "Suriname" },
      { value: "UY", label: "Uruguay" },
      { value: "VE", label: "Venezuela" }
    ],
    "🌏 Asia": [
      { value: "AF", label: "Afghanistan" },
      { value: "AM", label: "Armenia" },
      { value: "AZ", label: "Azerbaijan" },
      { value: "BD", label: "Bangladesh" },
      { value: "BN", label: "Brunei" },
      { value: "BT", label: "Bhutan" },
      { value: "CC", label: "Cocos Islands" },
      { value: "CN", label: "China" },
      { value: "CX", label: "Christmas Island" },
      { value: "GE", label: "Georgia" },
      { value: "HK", label: "Hong Kong" },
      { value: "ID", label: "Indonesia" },
      { value: "IN", label: "India" },
      { value: "IO", label: "British Indian Ocean Territory" },
      { value: "JP", label: "Japan" },
      { value: "KG", label: "Kyrgyzstan" },
      { value: "KH", label: "Cambodia" },
      { value: "KP", label: "North Korea" },
      { value: "KR", label: "South Korea" },
      { value: "KZ", label: "Kazakhstan" },
      { value: "LA", label: "Laos" },
      { value: "LK", label: "Sri Lanka" },
      { value: "MM", label: "Myanmar" },
      { value: "MN", label: "Mongolia" },
      { value: "MO", label: "Macao" },
      { value: "MV", label: "Maldives" },
      { value: "MY", label: "Malaysia" },
      { value: "NP", label: "Nepal" },
      { value: "PH", label: "Philippines" },
      { value: "PK", label: "Pakistan" },
      { value: "SG", label: "Singapore" },
      { value: "TH", label: "Thailand" },
      { value: "TJ", label: "Tajikistan" },
      { value: "TL", label: "East Timor" },
      { value: "TM", label: "Turkmenistan" },
      { value: "TW", label: "Taiwan" },
      { value: "UZ", label: "Uzbekistan" },
      { value: "VN", label: "Vietnam" }
    ],
    "🌍 Middle East": [
      { value: "AE", label: "United Arab Emirates" },
      { value: "BH", label: "Bahrain" },
      { value: "IL", label: "Israel" },
      { value: "IQ", label: "Iraq" },
      { value: "IR", label: "Iran" },
      { value: "JO", label: "Jordan" },
      { value: "KW", label: "Kuwait" },
      { value: "LB", label: "Lebanon" },
      { value: "OM", label: "Oman" },
      { value: "PS", label: "Palestine" },
      { value: "QA", label: "Qatar" },
      { value: "SA", label: "Saudi Arabia" },
      { value: "SY", label: "Syria" },
      { value: "TR", label: "Turkey" },
      { value: "YE", label: "Yemen" }
    ],
    "🌍 Africa": [
      { value: "AO", label: "Angola" },
      { value: "BF", label: "Burkina Faso" },
      { value: "BI", label: "Burundi" },
      { value: "BJ", label: "Benin" },
      { value: "BW", label: "Botswana" },
      { value: "CD", label: "Democratic Republic of the Congo" },
      { value: "CF", label: "Central African Republic" },
      { value: "CG", label: "Congo" },
      { value: "CI", label: "Ivory Coast" },
      { value: "CM", label: "Cameroon" },
      { value: "CV", label: "Cape Verde" },
      { value: "DJ", label: "Djibouti" },
      { value: "DZ", label: "Algeria" },
      { value: "EG", label: "Egypt" },
      { value: "EH", label: "Western Sahara" },
      { value: "ER", label: "Eritrea" },
      { value: "ET", label: "Ethiopia" },
      { value: "GA", label: "Gabon" },
      { value: "GH", label: "Ghana" },
      { value: "GM", label: "Gambia" },
      { value: "GN", label: "Guinea" },
      { value: "GQ", label: "Equatorial Guinea" },
      { value: "GW", label: "Guinea-Bissau" },
      { value: "KE", label: "Kenya" },
      { value: "KM", label: "Comoros" },
      { value: "LR", label: "Liberia" },
      { value: "LS", label: "Lesotho" },
      { value: "LY", label: "Libya" },
      { value: "MA", label: "Morocco" },
      { value: "MG", label: "Madagascar" },
      { value: "ML", label: "Mali" },
      { value: "MR", label: "Mauritania" },
      { value: "MU", label: "Mauritius" },
      { value: "MW", label: "Malawi" },
      { value: "MZ", label: "Mozambique" },
      { value: "NA", label: "Namibia" },
      { value: "NE", label: "Niger" },
      { value: "NG", label: "Nigeria" },
      { value: "RE", label: "Reunion" },
      { value: "RW", label: "Rwanda" },
      { value: "SC", label: "Seychelles" },
      { value: "SD", label: "Sudan" },
      { value: "SH", label: "Saint Helena" },
      { value: "SL", label: "Sierra Leone" },
      { value: "SN", label: "Senegal" },
      { value: "SO", label: "Somalia" },
      { value: "SS", label: "South Sudan" },
      { value: "ST", label: "São Tomé and Príncipe" },
      { value: "SZ", label: "Eswatini" },
      { value: "TD", label: "Chad" },
      { value: "TG", label: "Togo" },
      { value: "TN", label: "Tunisia" },
      { value: "TZ", label: "Tanzania" },
      { value: "UG", label: "Uganda" },
      { value: "YT", label: "Mayotte" },
      { value: "ZA", label: "South Africa" },
      { value: "ZM", label: "Zambia" },
      { value: "ZW", label: "Zimbabwe" }
    ],
    "🌏 Oceania": [
      { value: "AS", label: "American Samoa" },
      { value: "AU", label: "Australia" },
      { value: "CK", label: "Cook Islands" },
      { value: "FJ", label: "Fiji" },
      { value: "FM", label: "Micronesia" },
      { value: "GU", label: "Guam" },
      { value: "KI", label: "Kiribati" },
      { value: "MH", label: "Marshall Islands" },
      { value: "MP", label: "Northern Mariana Islands" },
      { value: "NC", label: "New Caledonia" },
      { value: "NF", label: "Norfolk Island" },
      { value: "NR", label: "Nauru" },
      { value: "NU", label: "Niue" },
      { value: "NZ", label: "New Zealand" },
      { value: "PF", label: "French Polynesia" },
      { value: "PG", label: "Papua New Guinea" },
      { value: "PN", label: "Pitcairn" },
      { value: "PW", label: "Palau" },
      { value: "SB", label: "Solomon Islands" },
      { value: "TK", label: "Tokelau" },
      { value: "TO", label: "Tonga" },
      { value: "TV", label: "Tuvalu" },
      { value: "UM", label: "US Minor Outlying Islands" },
      { value: "VU", label: "Vanuatu" },
      { value: "WF", label: "Wallis and Futuna" },
      { value: "WS", label: "Samoa" }
    ],
    "🌐 Other/Special": [
      { value: "AQ", label: "Antarctica" },
      { value: "BV", label: "Bouvet Island" },
      { value: "HM", label: "Heard Island and McDonald Islands" },
      { value: "TF", label: "French Southern and Antarctic Territories" }
    ]
  };

  // COMBOBOX STATE FOR COUNTRIES - MOVED TO TOP


  // ADDING CUSTOM CSS FOR SCROLLBAR
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'taskfy-scrollbar-styles';
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: var(--scrollbar-width, 8px);
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: var(--scrollbar-bg, #f5f5f5);
        border-radius: var(--scrollbar-border-radius, 4px);
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb-color, #ccc);
        border-radius: var(--scrollbar-thumb-border-radius, 4px);
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-thumb-hover-color, #aaa);
      }
    `;
    
    // Check if style already exists
    const existingStyle = document.getElementById('taskfy-scrollbar-styles');
    if (!existingStyle) {
      document.head.appendChild(style);
    }
    
    return () => {
      try {
        const styleToRemove = document.getElementById('taskfy-scrollbar-styles');
        if (styleToRemove && styleToRemove.parentNode) {
          styleToRemove.parentNode.removeChild(styleToRemove);
        }
      } catch (error) {
        //console.log('Style cleanup error (safe to ignore):', error);
      }
    };
  }, []);

  // MAIN NAVIGATION STATE
  const [activeView, setActiveView] = useState("welcome"); // "welcome", "discounts" or "panel-settings"
  const [navigationLocked, setNavigationLocked] = useState(false);
  const [expanded, setExpanded] = useState(null); // null = nie załadowano jeszcze, true/false = stan z metafields
  const [previewExpanded, setPreviewExpanded] = useState(null); // null = nie załadowano jeszcze, true/false = stan z metafields
  // APPLICATION STATE MANAGEMENT
  const [shopData, setShopData] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [error, setError] = useState(null);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTimer, setToastTimer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingDiscount, setIsDeletingDiscount] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeletingAllDiscounts, setIsDeletingAllDiscounts] = useState(false);
  const [deletingSingleDiscountId, setDeletingSingleDiscountId] = useState(null);
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [discountAmount, setDiscountAmount] = useState(""); // Stała kwota zniżki
  const [discountValueType, setDiscountValueType] = useState("percentage"); // "percentage" lub "fixed_amount"
  const [discountType, setDiscountType] = useState("percentage");
  const [description, setDescription] = useState("");
  const [sortOption, setSortOption] = useState("oldest");
  const [dismissedBannersState, setDismissedBannersState] = useState(new Set());

  // Checkout "conditions not met" message controls for create flow
  const [showCheckoutNotMetMessage, setShowCheckoutNotMetMessage] = useState(false);
  const [checkoutNotMetMessage, setCheckoutNotMetMessage] = useState("");


  
  // STATE FOR DISCOUNT CREATION MODE
  const [discountCreationMode, setDiscountCreationMode] = useState(null); // null, 'order', 'shipping'
  
  // STATE FOR SHIPPING DISCOUNT FORM
  const [hasCountryRestrictions, setHasCountryRestrictions] = useState(false);
  const [discountCombinations, setDiscountCombinations] = useState(['order', 'product']);
  const [purchaseTypes, setPurchaseTypes] = useState(['onetime']);

  // Helpers for current date/time in a specific timezone (America/New_York)
  function getCurrentDateTimeInZone(timeZone) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const time = `${parts.hour}:${parts.minute}`;
    return { date, time };
  }

  const initialNowET = getCurrentDateTimeInZone('America/New_York');
  const [startDate, setStartDate] = useState(initialNowET.date);
  const [startTime, setStartTime] = useState(initialNowET.time);
  const [datesInitialized, setDatesInitialized] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('12:00');

  // TIMEZONE HANDLING: default fallback, actual timezone pulled from shop.ianaTimezone
  const SHOP_TIMEZONE = 'America/New_York';
  const EFFECTIVE_SHOP_TIMEZONE = shopData?.ianaTimezone || SHOP_TIMEZONE;

  function getZonedISOString(dateString, timeString, timeZone) {
    if (!dateString || !timeString) {
      return new Date().toISOString();
    }
    const [year, month, day] = dateString.split('-').map(Number);
    const [hour, minute] = timeString.split(':').map(Number);
    const utcGuess = Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date(utcGuess));
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const zonedYear = Number(map.year);
    const zonedMonth = Number(map.month);
    const zonedDay = Number(map.day);
    const zonedHour = Number(map.hour);
    const zonedMinute = Number(map.minute);
    const desiredUtcFromZoned = Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0);
    const actualUtcFromFormatter = Date.UTC(zonedYear, (zonedMonth || 1) - 1, zonedDay || 1, zonedHour || 0, zonedMinute || 0);
    const deltaMs = actualUtcFromFormatter - desiredUtcFromZoned;
    const corrected = utcGuess - deltaMs;
    return new Date(corrected).toISOString();
  }

  // Initialize form dates using the shop's timezone once shop data is loaded
  useEffect(() => {
    if (shopData?.ianaTimezone && !datesInitialized) {
      const now = getCurrentDateTimeInZone(shopData.ianaTimezone);
      setStartDate(now.date);
      setStartTime(now.time);
      setDatesInitialized(true);
    }
  }, [shopData?.ianaTimezone, datesInitialized]);

  function getTimeZoneAbbreviation(dateString, timeString, timeZone) {
    try {
      const iso = getZonedISOString(dateString || new Date().toISOString().slice(0,10), timeString || '00:00', timeZone);
      const d = new Date(iso);
      const str = d.toLocaleTimeString('en-US', { timeZone, timeZoneName: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
      const abbr = str.split(' ').pop();
      return abbr || 'ET';
    } catch {
      return 'ET';
    }
  }

  // STATE FOR DISCOUNT ACTIVATION METHOD
  const [activationMethod, setActivationMethod] = useState('automatic'); // 'automatic' or 'discount_code'
  const [discountCode, setDiscountCode] = useState('');

  // STATE FOR DISCOUNT COMBINATIONS
  const [combinesWith, setCombinesWith] = useState({
    orderDiscounts: false,
    productDiscounts: false,
    shippingDiscounts: false
  });

  // Function to handle combines with changes
  const handleCombinesWithChange = (discountType, value) => {
    setCombinesWith(prev => ({
      ...prev,
      [discountType]: value
    }));
  };

  // STATE FOR DYNAMIC CONDITIONS SYSTEM
  const [conditions, setConditions] = useState([
    {
      id: 1,
      type: 'cart_total', // cart_total, country, cart_quantity, postal_code, cart_weight
      operator: 'greater_than_or_equal', // equals, not_equals, greater_than_or_equal, less_than_or_equal, between
      value: ''
    }
  ]);
  
  // State for collapsing/expanding condition cards
  const [collapsedConditions, setCollapsedConditions] = useState({});
  
  // Function to toggle condition collapse
  const toggleConditionCollapse = (conditionId) => {
    setCollapsedConditions(prev => ({
      ...prev,
      [conditionId]: !prev[conditionId]
    }));
  };

  // All countries array for individual conditions
  const allCountries = useMemo(() => Object.values(countriesByContinent).flat(), []);

  // SHOPIFY APP BRIDGE SAVE BAR SETUP
  const shopify = (typeof window !== "undefined" && window.shopify) ? window.shopify : null;

  // Save Bar handlers
  const handleSaveBarSave = () => {
       // console.log('Save Bar: Save clicked');
        // Trigger form submission
        document.querySelector('form')?.requestSubmit();
  };

  const handleSaveBarDiscard = () => {
       // console.log('Save Bar: Discard clicked');
        // Reset form and hide save bar
        resetFormFields();
        setDiscountCreationMode(null);
        setEditingDiscount(null);
    try { shopify && shopify.saveBar.hide('discount-save-bar').catch(() => {}); } catch (_) {}
  };

  // Show/Hide Save Bar based on discount creation mode
  useEffect(() => {
    try {
      if (!shopify) return;
      const id = 'discount-save-bar';
      if (discountCreationMode === 'order' || discountCreationMode === 'shipping' || discountCreationMode === 'edit') {
        shopify.saveBar.show(id).catch(() => {});
      } else {
        shopify.saveBar.hide(id).catch(() => {});
      }
    } catch (_) {}
  }, [discountCreationMode, shopify]);

  // State for country selection in conditions (moved from renderConditionValue to fix React Hooks rule)
  const [countrySelectionState, setCountrySelectionState] = useState({});
  
  // Helper function to get country selection state for a condition
  const getCountrySelectionState = useCallback((conditionId) => {
    return countrySelectionState[conditionId] || {
      selectedOptions: [],
      inputValue: '',
      isOpen: false
    };
  }, [countrySelectionState]);

  // Helper function to update country selection state
  const updateCountrySelectionState = useCallback((conditionId, updates) => {
    setCountrySelectionState(prev => ({
      ...prev,
      [conditionId]: {
        ...getCountrySelectionState(conditionId),
        ...updates
      }
    }));
  }, [getCountrySelectionState]);

  // State for product selection in cart_contains conditions
  const [productSelectionState, setProductSelectionState] = useState({});
  
  // State for collection selection in cart_contains conditions
  const [collectionSelectionState, setCollectionSelectionState] = useState({});
  
  // STAN DO WYSZUKIWANIA W LIŚCIE WYBRANYCH PRODUKTÓW
  const [selectedProductsSearchQuery, setSelectedProductsSearchQuery] = useState('');
  
  // STAN DO WYSZUKIWANIA W LIŚCIE WYBRANYCH KOLEKCJI
  const [selectedCollectionsSearchQuery, setSelectedCollectionsSearchQuery] = useState('');
  
  // Helper function to get product selection state for a condition
  const getProductSelectionState = useCallback((conditionId) => {
    return productSelectionState[conditionId] || {
      selectedProducts: [],
      modalOpen: false
    };
  }, [productSelectionState]);

  // Helper function to update product selection state
  const updateProductSelectionState = useCallback((conditionId, updates) => {
    setProductSelectionState(prev => ({
      ...prev,
      [conditionId]: {
        ...getProductSelectionState(conditionId),
        ...updates
      }
    }));
  }, [getProductSelectionState]);

  // Helper function to get collection selection state for a condition
  const getCollectionSelectionState = useCallback((conditionId) => {
    return collectionSelectionState[conditionId] || {
      selectedCollections: [],
      modalOpen: false
    };
  }, [collectionSelectionState]);

  // Helper function to update collection selection state
  const updateCollectionSelectionState = useCallback((conditionId, updates) => {
    setCollectionSelectionState(prev => ({
      ...prev,
      [conditionId]: {
        ...getCollectionSelectionState(conditionId),
        ...updates
      }
    }));
  }, [getCollectionSelectionState]);

  // Function to fetch products for ProductPickerModal
  const fetchProductsForModal = useCallback(async (queryString) => {
    //console.log("🔍 [FETCH PRODUCTS] Starting fetch with query:", queryString);
    
    try {
      const result = await callShopify(GET_PRODUCTS_QUERY, {
        first: 50,
        query: queryString || undefined
      });

      if (!result.products) {
        throw new Error("No products data received");
      }

      const products = result.products.edges.map(edge => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
        status: edge.node.status,
        featuredImage: edge.node.featuredImage ? {
          originalSrc: edge.node.featuredImage.originalSrc,
          altText: edge.node.featuredImage.altText
        } : null
      }));

     // console.log("✅ [FETCH PRODUCTS] Successfully fetched", products.length, "products");
      return { products, pageInfo: result.products.pageInfo };
      
    } catch (error) {
      console.error("❌ [FETCH PRODUCTS] Error:", error);
      return { error: error.message, products: [] };
    }
  }, []);
  // Function to fetch products by IDs
  const fetchProductsByIds = useCallback(async (productIds) => {
    //console.log("🔍 [FETCH PRODUCTS BY IDS] Starting fetch for IDs:", productIds);
    
    try {
      const result = await callShopify(GET_PRODUCTS_BY_IDS_QUERY, {
        ids: productIds
      });

      if (!result.nodes) {
        throw new Error("No products data received");
      }

      const products = result.nodes
        .filter(node => node && node.id) // Filter out null nodes
        .map(node => ({
          id: node.id,
          title: node.title,
          handle: node.handle,
          status: node.status,
          featuredImage: node.featuredImage ? {
            originalSrc: node.featuredImage.originalSrc,
            altText: node.featuredImage.altText
          } : null
        }));

      //console.log("✅ [FETCH PRODUCTS BY IDS] Successfully fetched", products.length, "products");
      return products;
      
    } catch (error) {
      //console.error("❌ [FETCH PRODUCTS BY IDS] Error:", error);
      return [];
    }
  }, []);

  // Function to fetch collections for CollectionPickerModal
  const fetchCollectionsForModal = useCallback(async (queryString) => {
    //console.log("🔍 [FETCH COLLECTIONS] Starting fetch with query:", queryString);
    
    try {
      const result = await callShopify(GET_COLLECTIONS_QUERY, {
        first: 50,
        query: queryString || undefined
      });

      if (!result.collections) {
        throw new Error("No collections data received");
      }

      const collections = result.collections.edges.map(edge => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
        description: edge.node.description,
        productsCount: edge.node.productsCount?.count || 0,
        image: edge.node.image ? {
          originalSrc: edge.node.image.originalSrc,
          altText: edge.node.image.altText
        } : null
      }));

     // console.log("✅ [FETCH COLLECTIONS] Successfully fetched", collections.length, "collections");
      return { collections, pageInfo: result.collections.pageInfo };
      
    } catch (error) {
      //console.error("❌ [FETCH COLLECTIONS] Error:", error);
      return { error: error.message, collections: [] };
    }
  }, []);
  // Function to fetch collections by IDs
  const fetchCollectionsByIds = useCallback(async (collectionIds) => {
    //console.log("🔍 [FETCH COLLECTIONS BY IDS] Starting fetch for IDs:", collectionIds);
    
    try {
      const result = await callShopify(GET_COLLECTIONS_BY_IDS_QUERY, {
        ids: collectionIds
      });

      if (!result.nodes) {
        throw new Error("No collections data received");
      }

      const collections = result.nodes
        .filter(node => node && node.id) // Filter out null nodes
        .map(node => ({
          id: node.id,
          title: node.title,
          handle: node.handle,
          description: node.description,
          productsCount: node.productsCount?.count || 0,
          image: node.image ? {
            originalSrc: node.image.originalSrc,
            altText: node.image.altText
          } : null
        }));

     // console.log("✅ [FETCH COLLECTIONS BY IDS] Successfully fetched", collections.length, "collections");
      return collections;
      
    } catch (error) {
      //console.error("❌ [FETCH COLLECTIONS BY IDS] Error:", error);
      return [];
    }
  }, []);
  // STATE FOR NEW DISCOUNT FORM FIELDS
  const [discountName, setDiscountName] = useState('');
  const [discountDescription, setDiscountDescription] = useState('');









  // FUNCTIONS FOR DYNAMIC CONDITIONS SYSTEM
  const conditionTypes = [
          { label: 'Cart amount', value: 'cart_total' },
      { label: 'Customer country', value: 'country' },
      { label: 'Number of products in cart', value: 'cart_quantity' },
              { label: 'Postal code', value: 'postal_code' },
      { label: 'Cart weight', value: 'cart_weight' },
    { label: 'Customer tags', value: 'customer_tags' },
    { label: 'Customer logged in', value: 'customer_logged_in' },
    { label: 'Cart contains...', value: 'cart_contains' },
    { label: 'Number of previous orders', value: 'order_count' }
  ];

  const getOperatorOptions = (conditionType) => {
    switch (conditionType) {
      case 'cart_total':
      case 'cart_quantity':
      case 'cart_weight':
      case 'order_count':
        return [
                        { label: 'greater than or equal', value: 'greater_than_or_equal' },
              { label: 'less than or equal', value: 'less_than_or_equal' },
              { label: 'greater than', value: 'greater_than' },
              { label: 'less than', value: 'less_than' },
              { label: 'equals', value: 'equals' },
              { label: 'not equal', value: 'not_equals' }
        ];
      case 'country':
        return [
          { label: 'equals', value: 'equals' },
          { label: 'not equal', value: 'not_equals' }
        ];
      case 'postal_code':
        return [
          { label: 'equals', value: 'equals' },
          { label: 'not equal', value: 'not_equals' },
          { label: 'contains', value: 'contains' },
          { label: 'does not contain', value: 'not_contains' }
        ];
      case 'customer_tags':
        return [
          { label: 'contains', value: 'contains' },
          { label: 'does not contain', value: 'not_contains' }
        ];
      case 'customer_logged_in':
        return [
          { label: 'is logged in', value: 'is_logged_in' },
                      { label: 'is not logged in', value: 'is_not_logged_in' }
        ];
      case 'cart_contains':
        return [
                      { label: 'only these products', value: 'only_these_products' },
          { label: 'at least one of these products', value: 'at_least_one_of_these' },
          { label: 'all of these products', value: 'all_of_these_products' },
          { label: 'none of these products', value: 'none_of_these_products' },
                      { label: 'only products from these collections', value: 'only_these_collections' },
            { label: 'at least one from these collections', value: 'at_least_one_collection' },
                      { label: 'no products from these collections', value: 'no_products_from_collections' }
        ];
      default:
        return [
          { label: 'equals', value: 'equals' },
          { label: 'not equal', value: 'not_equals' }
        ];
    }
  };

  const addCondition = () => {
    if (conditions.length < 10) {
      const newCondition = {
        id: Math.max(...conditions.map(c => c.id)) + 1,
        type: 'cart_total',
        operator: 'greater_than_or_equal',
        value: ''
      };
      setConditions([...conditions, newCondition]);
    }
  };

  const updateCondition = (id, field, value) => {
    setConditions(prev => prev.map(condition => 
      condition.id === id 
        ? { ...condition, [field]: value }
        : condition
    ));

    // Initialize country selection state when condition type changes to country
    if (field === 'type' && value === 'country') {
      const existingCondition = conditions.find(c => c.id === id);
      if (existingCondition?.value) {
        // Parse existing value and initialize country selection state
        const selectedCountries = existingCondition.value.split(',').map(code => 
          allCountries.find(country => country.value === code)
        ).filter(Boolean);
        
        updateCountrySelectionState(id, {
          selectedOptions: selectedCountries,
          inputValue: '',
          isOpen: false
        });
      }
    }
  };

  const removeCondition = (id) => {
    if (conditions.length > 1) {
      setConditions(prev => prev.filter(condition => condition.id !== id));
    }
  };

  const renderConditionValue = (condition) => {
    switch (condition.type) {
      case 'cart_total':
        return (
          <TextField
            label="Value"
            type="number"
            value={condition.value}
            onChange={(value) => updateCondition(condition.id, 'value', value)}
            placeholder="200"
            prefix={shopData?.currencyCode || 'USD'}
            helpText="Amount in store currency"
          />
        );
      case 'cart_quantity':
        return (
          <TextField
            label="Number of products"
            type="number"
            value={condition.value}
            onChange={(value) => updateCondition(condition.id, 'value', value)}
            placeholder="5"
            suffix="szt."
          />
        );
      case 'cart_weight':
        return (
          <TextField
            label="Waga"
            type="number"
            value={condition.value}
            onChange={(value) => updateCondition(condition.id, 'value', value)}
            placeholder="2.5"
            suffix="kg"
            helpText="Total weight of the cart"
          />
        );
      case 'order_count':
        return (
          <TextField
            label="Number of orders"
            type="number"
            value={condition.value}
            onChange={(value) => updateCondition(condition.id, 'value', value)}
            placeholder="5"
            suffix="orders"
            helpText="Number of previous orders by customer"
          />
        );
      case 'country':
        // Get country selection state for this condition
        const countryState = getCountrySelectionState(condition.id);
        
        // Initialize selected countries from condition value if not set
        if (countryState.selectedOptions.length === 0 && condition.value) {
          const selectedCountries = condition.value.split(',').map(code => 
            allCountries.find(country => country.value === code)
          ).filter(Boolean);
          
          updateCountrySelectionState(condition.id, {
            selectedOptions: selectedCountries
          });
        }

        const filteredCountriesForCondition = allCountries.filter(country => 
          country.label.toLowerCase().includes(countryState.inputValue.toLowerCase()) ||
          country.value.toLowerCase().includes(countryState.inputValue.toLowerCase())
        );

        const updateCountrySelection = (selected) => {
          const country = allCountries.find(c => c.value === selected);
          if (!country) return;

          const nextSelectedCountries = new Set(countryState.selectedOptions.map(c => c.value));

          if (nextSelectedCountries.has(selected)) {
            nextSelectedCountries.delete(selected);
          } else {
            nextSelectedCountries.add(selected);
          }

          const newSelectedCountries = Array.from(nextSelectedCountries).map(value => 
            allCountries.find(c => c.value === value)
          ).filter(Boolean);

          updateCountrySelectionState(condition.id, {
            selectedOptions: newSelectedCountries,
            inputValue: ''
          });
          updateCondition(condition.id, 'value', Array.from(nextSelectedCountries).join(','));
        };

        const removeCountryTag = (countryValue) => () => {
          updateCountrySelection(countryValue);
        };

        // Vertical content with selected countries as tags
        const verticalContentMarkup = countryState.selectedOptions.length > 0 ? (
          <InlineStack gap="100" wrap>
            {countryState.selectedOptions.map((option) => (
              <Tag
                key={option.value}
                onRemove={removeCountryTag(option.value)}
              >
                {option.label} ({option.value})
              </Tag>
            ))}
          </InlineStack>
        ) : null;

        const countryOptionsMarkup = filteredCountriesForCondition.length > 0
          ? filteredCountriesForCondition.map((country) => {
          const { label, value } = country;
          return (
            <Listbox.Option
                  key={value}
              value={value}
              selected={countryState.selectedOptions.some(option => option.value === value)}
              accessibilityLabel={label}
            >
              <Listbox.TextOption selected={countryState.selectedOptions.some(option => option.value === value)}>
                {label} ({value})
              </Listbox.TextOption>
            </Listbox.Option>
          );
            })
          : null;

        const emptyStateMarkup = countryOptionsMarkup ? null : (
          <EmptySearchResult
            title="No countries found"
            description={`No results for "${countryState.inputValue}"`}
          />
        );

        const listboxMarkup = countryOptionsMarkup || emptyStateMarkup ? (
          <Listbox
            autoSelection={AutoSelection.None}
            onSelect={updateCountrySelection}
          >
            {countryOptionsMarkup}
            {emptyStateMarkup}
          </Listbox>
        ) : null;

        return (
          <div style={{ position: 'relative' }}>
            <style>
              {`
                .force-dropdown-down [data-polaris-popover] {
                  top: 100% !important;
                  bottom: auto !important;
                  transform: translateY(0) !important;
                  max-height: 300px !important;
                  overflow-y: auto !important;
                }
                .force-dropdown-down [data-polaris-popover-content] {
                  max-height: 300px !important;
                  overflow-y: auto !important;
                }
              `}
            </style>
            <div className="force-dropdown-down">
            <Combobox
                allowMultiple
              activator={
                <Combobox.TextField
                  label="Country"
                  value={countryState.inputValue}
                  onChange={(value) => updateCountrySelectionState(condition.id, { inputValue: value })}
                  placeholder="Search country..."
                  autoComplete="off"
                  helpText={condition.operator === 'equals' ? "Select one or more countries" : "Selected countries"}
                    verticalContent={verticalContentMarkup}
                  />
                }
              >
                {listboxMarkup}
            </Combobox>
            </div>
          </div>
        );
      case 'postal_code':
        return (
          <TextField
            label="Postal code"
            value={condition.value}
            onChange={(value) => updateCondition(condition.id, 'value', value)}
            placeholder="00-001,10-*,20-123"
            helpText="Postal codes separated by commas. Use * as wildcard (e.g. 10-*)"
          />
        );
      case 'customer_tags':
        return (
          <TextField
            label="Customer tags"
            value={condition.value}
            onChange={(value) => updateCondition(condition.id, 'value', value)}
            placeholder="vip, loyal-customer, premium"
            helpText="List of tags separated by commas (no spaces around commas)"
          />
        );
      case 'customer_logged_in':
        return (
          <Box>
            <Text variant="bodyMd" tone="subdued">
              This condition does not require additional value. It automatically checks if customer is logged in to the store.
            </Text>
          </Box>
        );

      case 'cart_contains': {
        // Check if operator relates to products or collections
        const isProductOperator = [
          'only_these_products',
          'at_least_one_of_these', 
          'all_of_these_products',
          'none_of_these_products'
        ].includes(condition.operator);
        
        const isCollectionOperator = [
          'only_these_collections',
          'at_least_one_collection',
          'no_products_from_collections'
        ].includes(condition.operator);

        if (isProductOperator) {
          // Handle products (existing code)
          const productState = getProductSelectionState(condition.id);
          
          const handleOpenModal = () => {
           // console.log('🔍 [PRODUCT PICKER DEBUG] Opening modal for condition:', condition.id);
            updateProductSelectionState(condition.id, { modalOpen: true });
          };

          const handleCloseModal = () => {
           // console.log('ℹ️ [PRODUCT PICKER DEBUG] Closing modal');
            updateProductSelectionState(condition.id, { modalOpen: false });
          };

          const handleSelectProducts = (selectedProducts) => {
           // console.log('✅ [PRODUCT PICKER DEBUG] Products selected:', selectedProducts);
            
            updateProductSelectionState(condition.id, {
              selectedProducts,
              modalOpen: false
            });
            
            // Update condition value with product IDs
            const productIds = selectedProducts.map(p => p.id).join(',');
            updateCondition(condition.id, 'value', productIds);
            
            
          };

          const removeProduct = (productId) => {
            const updatedProducts = productState.selectedProducts.filter(p => p.id !== productId);
            updateProductSelectionState(condition.id, {
              selectedProducts: updatedProducts
            });
            
            // Update condition value
            const productIds = updatedProducts.map(p => p.id).join(',');
            updateCondition(condition.id, 'value', productIds);
          };

        return (
          <BlockStack gap="300">
            <Button onClick={handleOpenModal} primary>
              {productState.selectedProducts.length > 0 
                ? `Change products (${productState.selectedProducts.length})` 
                : 'Select products'}
            </Button>
            
            <ProductPickerModal
              open={productState.modalOpen}
              onClose={handleCloseModal}
              onSelect={handleSelectProducts}
              onFetchProducts={fetchProductsForModal}
              initialSelectedProducts={productState.selectedProducts.map(p => p.id)}
            />
            
            {productState.selectedProducts.length > 0 && (
              <Box padding="300" background="surface-neutral-subdued" borderRadius="200">
                <BlockStack gap="200">
                  {/* Header with search panel */}
                  <InlineStack gap="300" blockAlign="center" wrap={false}>
                    <Box style={{ flex: 1 }}>
                      <Text variant="bodySm" color="subdued">
                        Selected {productState.selectedProducts.length} products:
                      </Text>
                    </Box>
                    <Box style={{ minWidth: '200px' }}>
                      <TextField
                        placeholder="Search products..."
                        value={selectedProductsSearchQuery}
                        onChange={setSelectedProductsSearchQuery}
                        prefix={<Icon source={SearchIcon} />}
                        size="slim"
                        clearButton
                        onClearButtonClick={() => setSelectedProductsSearchQuery('')}
                      />
                    </Box>
                  </InlineStack>
                  
                  {/* Product list with filtering */}
                  {(() => {
                    const filteredProducts = productState.selectedProducts.filter(product => {
                      if (!selectedProductsSearchQuery.trim()) return true;
                      const searchTerm = selectedProductsSearchQuery.toLowerCase();
                      const productTitle = (product.title || '').toLowerCase();
                      const productId = (product.id?.split('/').pop() || '').toLowerCase();
                      return productTitle.includes(searchTerm) || productId.includes(searchTerm);
                    });

                    if (filteredProducts.length === 0 && selectedProductsSearchQuery.trim()) {
                      return (
                        <Box padding="200">
                          <Text variant="bodyMd" color="subdued" alignment="center">
                            No products found matching search "{selectedProductsSearchQuery}"
                          </Text>
                        </Box>
                      );
                    }

                    return filteredProducts.map((product) => (
                      <InlineStack key={product.id} gap="300" blockAlign="center">
                        {/* Miniatura produktu */}
                        <Box width="40px" height="40px">
                          <img
                            src={product.featuredImage?.originalSrc || 'https://via.placeholder.com/40'}
                            alt={product.featuredImage?.altText || product.title}
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              objectFit: 'cover', 
                              borderRadius: '4px',
                              border: '1px solid #e1e3e5'
                            }}
                          />
                        </Box>
                        {/* Nazwa produktu */}
                        <Box minWidth="0" style={{ flex: 1 }}>
                          <Text variant="bodyMd" truncate>
                            {product.title || `Product ${product.id?.split('/').pop() || 'Unknown'}`}
                          </Text>
                        </Box>
                        {/* Delete button */}
                        <Button
                          size="micro"
                          tone="critical"
                          onClick={() => removeProduct(product.id)}
                        >
                          Delete
                        </Button>
                      </InlineStack>
                    ));
                  })()}
                </BlockStack>
              </Box>
            )}
          </BlockStack>
        );
        
        } else if (isCollectionOperator) {
          // Handle collections (new code)
          const collectionState = getCollectionSelectionState(condition.id);
          
          const handleOpenModal = () => {
           // console.log('🔍 [COLLECTION PICKER DEBUG] Opening modal for condition:', condition.id);
            updateCollectionSelectionState(condition.id, { modalOpen: true });
          };

          const handleCloseModal = () => {
          //  console.log('ℹ️ [COLLECTION PICKER DEBUG] Closing modal');
            updateCollectionSelectionState(condition.id, { modalOpen: false });
          };

          const handleSelectCollections = (selectedCollections) => {
           // console.log('✅ [COLLECTION PICKER DEBUG] Collections selected:', selectedCollections);
            
            updateCollectionSelectionState(condition.id, {
              selectedCollections,
              modalOpen: false
            });
            
            // Update condition value with collection IDs
            const collectionIds = selectedCollections.map(c => c.id).join(',');
            updateCondition(condition.id, 'value', collectionIds);
            
            
          };

          const removeCollection = (collectionId) => {
            const updatedCollections = collectionState.selectedCollections.filter(c => c.id !== collectionId);
            updateCollectionSelectionState(condition.id, {
              selectedCollections: updatedCollections
            });
            
            // Update condition value
            const collectionIds = updatedCollections.map(c => c.id).join(',');
            updateCondition(condition.id, 'value', collectionIds);
          };

          return (
            <BlockStack gap="300">
              <Button onClick={handleOpenModal} primary>
                {collectionState.selectedCollections.length > 0 
                  ? `Change collections (${collectionState.selectedCollections.length})` 
                  : 'Select collections'}
              </Button>
              
              <CollectionPickerModal
                open={collectionState.modalOpen}
                onClose={handleCloseModal}
                onSelect={handleSelectCollections}
                onFetchCollections={fetchCollectionsForModal}
                initialSelectedCollections={collectionState.selectedCollections.map(c => c.id)}
              />
              
              {collectionState.selectedCollections.length > 0 && (
                <Box padding="300" background="surface-neutral-subdued" borderRadius="200">
                  <BlockStack gap="200">
                    {/* Header with search panel */}
                    <InlineStack gap="300" blockAlign="center" wrap={false}>
                      <Box style={{ flex: 1 }}>
                        <Text variant="bodySm" color="subdued">
                          Selected {collectionState.selectedCollections.length} collections:
                        </Text>
                      </Box>
                      <Box style={{ minWidth: '200px' }}>
                        <TextField
                          placeholder="Search collections..."
                          value={selectedCollectionsSearchQuery}
                          onChange={setSelectedCollectionsSearchQuery}
                          prefix={<Icon source={SearchIcon} />}
                          size="slim"
                          clearButton
                          onClearButtonClick={() => setSelectedCollectionsSearchQuery('')}
                        />
                      </Box>
                    </InlineStack>
                    
                    {/* Lista kolekcji z filtrowaniem */}
                    {(() => {
                      const filteredCollections = collectionState.selectedCollections.filter(collection => {
                        if (!selectedCollectionsSearchQuery.trim()) return true;
                        const searchTerm = selectedCollectionsSearchQuery.toLowerCase();
                        const collectionTitle = (collection.title || '').toLowerCase();
                        const collectionId = (collection.id?.split('/').pop() || '').toLowerCase();
                        return collectionTitle.includes(searchTerm) || collectionId.includes(searchTerm);
                      });

                      if (filteredCollections.length === 0 && selectedCollectionsSearchQuery.trim()) {
                        return (
                          <Box padding="200">
                            <Text variant="bodyMd" color="subdued" alignment="center">
                              No collections found matching search "{selectedCollectionsSearchQuery}"
                            </Text>
                          </Box>
                        );
                      }

                      return filteredCollections.map((collection) => (
                        <InlineStack key={collection.id} gap="300" blockAlign="center">
                          {/* Miniatura kolekcji */}
                          <Box width="40px" height="40px">
                            <img
                              src={collection.image?.originalSrc || 'https://via.placeholder.com/40'}
                              alt={collection.image?.altText || collection.title}
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                objectFit: 'cover', 
                                borderRadius: '4px',
                                border: '1px solid #e1e3e5'
                              }}
                            />
                          </Box>
                          {/* Nazwa kolekcji */}
                          <Box minWidth="0" style={{ flex: 1 }}>
                            <Text variant="bodyMd" truncate>
                              {collection.title || `Collection ${collection.id?.split('/').pop() || 'Unknown'}`}
                            </Text>
                            <Text variant="bodySm" color="subdued">
                              {collection.productsCount} products
                            </Text>
                          </Box>
                          {/* Delete button */}
                          <Button
                            size="micro"
                            tone="critical"
                            onClick={() => removeCollection(collection.id)}
                          >
                            Delete
                          </Button>
                        </InlineStack>
                      ));
                    })()}
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          );
          
        } else {
          // Fallback for unknown operators
          return (
            <Box>
              <Text variant="bodyMd" tone="critical">
                Unknown operator: {condition.operator}. Please select an operator from the list.
              </Text>
            </Box>
          );
        }
      }

      default:
        return (
          <TextField
                          label="Value"
            value={condition.value}
            onChange={(value) => updateCondition(condition.id, 'value', value)}
            placeholder="Enter value"
          />
        );
    }
  };
  // FUNCTION TO HANDLE NEW DISCOUNT CREATION
  const handleCreateDiscount = async (event) => {
    event.preventDefault();
    
    if (!discountName.trim()) {
      showToast("Enter discount name");
      return;
    }

    // Validate discount value for order discounts
    if (discountCreationMode === 'order') {
      if (discountValueType === 'percentage') {
            if (!discountPercentage || Number(discountPercentage) <= 0 || Number(discountPercentage) > 100) {
          showToast("Discount percentage must be between 0.1 and 100");
          return;
        }
      } else if (discountValueType === 'fixed_amount') {
        if (!discountAmount || Number(discountAmount) <= 0) {
          showToast("Discount amount must be greater than 0");
          return;
        }
      }
    }

    // Validate conditions if conditional discount
    if (isConditionalDiscount) {
      for (const condition of conditions) {
        // Validate based on condition type
        switch (condition.type) {
          case 'cart_total':
          case 'cart_quantity':
          case 'cart_weight':
          case 'order_count':
            if (!condition.value.trim()) {
              showToast("Numeric value is required");
              return;
            }
            const numValue = parseFloat(condition.value);
            if (isNaN(numValue) || numValue < 0) {
              showToast("Value must be a number greater than or equal to 0");
              return;
            }
            break;
            
          case 'country':
            if (!condition.value) {
              showToast("Select value from list");
              return;
            }
            break;
            
          case 'postal_code':
            if (!condition.value.trim()) {
              showToast("Enter postal code");
              return;
            }
            break;
          
          case 'customer_tags':
            if (!condition.value.trim()) {
              showToast("Enter customer tags");
              return;
            }
            break;
            
          case 'customer_logged_in':
            // This condition does not require value validation
            break;
            
          case 'cart_contains':
            if (!condition.value || condition.value.trim() === '') {
              const isProductOperator = [
                'only_these_products',
                'at_least_one_of_these', 
                'all_of_these_products',
                'none_of_these_products'
              ].includes(condition.operator);
              
              const isCollectionOperator = [
                'only_these_collections',
                'at_least_one_collection',
                'no_products_from_collections'
              ].includes(condition.operator);
              
              if (isProductOperator) {
                showToast("Select products for 'Cart contains' condition");
              } else if (isCollectionOperator) {
                showToast("Select collections for 'Cart contains' condition");
              } else {
                showToast("Select value for 'Cart contains' condition");
              }
              return;
            }
            break;
            
          default:
            if (!condition.value.trim()) {
              showToast("All conditions must have filled values");
              return;
            }
        }
      }
    }

    setIsSubmitting(true);

    try {
      //console.log("🚀 TWORZENIE NOWEJ ZNIŻKI:", discountCreationMode);

      // PRZYGOTUJ DANE ZNIŻKI
      const shopifyTitle = discountName.trim();
      
      const discountData = {
        id: Date.now().toString(),
        name: discountName.trim(),
        description: shopifyTitle, // Nazwa dla Shopify
        // Typ i wartości zniżki: dla ORDER bierzemy z wyboru; dla SHIPPING: pozwalamy na free lub %
        discountType: (
          discountCreationMode === 'order'
            ? discountValueType
            : discountType // 'percentage' | 'fixed_amount'
        ),
        discountClass: discountCreationMode === 'order' ? 'ORDER' : 'SHIPPING',
        discountPercentage: (
          discountCreationMode === 'order'
            ? (discountValueType === 'percentage' ? Number(discountPercentage) : 0)
            : (discountType === 'percentage'
                ? (Math.max(0, Math.min(100, parseFloat(discountPercentage))) || 0).toFixed(2)
                : 0)
        ),
        discountAmount: (
          discountCreationMode === 'order'
            ? (discountValueType === 'fixed_amount' ? Number(discountAmount) : 0)
            : (discountType === 'fixed_amount' ? Number(discountAmount) : 0)
        ),
        discountValueType: (
          discountCreationMode === 'order'
            ? discountValueType
            : discountType // for SHIPPING
        ),
        minimumAmount: 0, // Zawsze 0 - minimalna kwota ustawiana przez warunki
        activationMethod: activationMethod, // 'automatic' or 'discount_code'
        discountCode: activationMethod === 'discount_code' ? discountCode.trim() : '', // Discount code if selected
        combinesWith: combinesWith, // Informacje o kombinacji zniżek
        isConditional: isConditionalDiscount,
        conditions: isConditionalDiscount ? conditions : [],
        checkoutNotMetMessage: showCheckoutNotMetMessage ? (checkoutNotMetMessage || "") : "",
        isActive: true,
        createdAt: new Date().toISOString()
      };

      //console.log("📝 Dane zniżki:", discountData);

      // Try to create discount with Shopify Functions first
      let shopifyDiscountId = null;

      try {
        // Find discount function
        const getFunctionIdQuery = `
          query GetShopifyFunctions {
            shopifyFunctions(first: 10) {
              edges {
                node {
                  id
                  app {
                    title
                  }
                  apiType
                  title
                }
              }
            }
          }
        `;

        const functionsResult = await callShopify(getFunctionIdQuery);
        const functions = functionsResult.shopifyFunctions.edges;

        // DEBUG: Sprawdź wszystkie funkcje
        //console.log("🔍 DEBUG: Wszystkie funkcje Shopify:", functions.map(edge => ({
          //id: edge.node.id,
         // title: edge.node.title,
          //appTitle: edge.node.app?.title,
          //apiType: edge.node.apiType
      //  })));
        
        // 🔍 SZCZEGÓŁOWE DEBUGOWANIE FUNKCJI - zgodnie z sugestiami AI
        //console.log("🔍 DEBUG: Total functions found:", functions.length);
        
        if (functions.length === 0) {
          //console.error("❌ CRITICAL: No Shopify Functions found! Check deployment.");
          throw new Error("No Shopify Functions available. Functions may not be deployed.");
        }
        
        // DEBUG: Sprawdź WSZYSTKIE funkcje szczegółowo
        functions.forEach((edge, index) => {
         // console.log(`🔍 DEBUG: Function ${index + 1}:`, {
           // id: edge.node.id,
           // title: edge.node.title,
           // apiType: edge.node.apiType,
           // app: edge.node.app,
           // appTitle: edge.node.app?.title,
            //isDiscountType: edge.node.apiType === 'discounts',
           // isCorrectApp: edge.node.app?.title === 'Taskfy'
        //  });
        });

        // Find discount function
        let discountFunction = functions.find(edge => 
          edge.node.app?.title === 'Taskfy' && 
          edge.node.apiType === 'discounts'
        );

        //console.log("🔍 DEBUG: Looking for function with app.title='Taskfy' and apiType='discounts':", !!discountFunction);

        if (!discountFunction) {
          discountFunction = functions.find(edge => 
            edge.node.apiType === 'discounts'
          );
          //console.log("🔍 DEBUG: Fallback - searching for any function with apiType='discounts':", !!discountFunction);
        }
        
        // LAST RESORT: Użyj pierwszą dostępną funkcję jeśli nie znaleziono discount function
        if (!discountFunction && functions.length > 0) {
          discountFunction = functions[0];
          //console.log("🔍 DEBUG: LAST RESORT - używam pierwszej dostępnej funkcji:", {
           // id: discountFunction.node.id,
           // title: discountFunction.node.title,
           // apiType: discountFunction.node.apiType,
          //  warning: "This function may not be a discount function!"
         // });
        }
        
        // 🔍 DODATKOWE SPRAWDZENIE FUNKCJI - zgodnie z sugestiami AI
        if (!discountFunction) {
        ////  console.error("❌ CRITICAL: No suitable function found for discount creation");
        //  console.log("🔍 Available functions:", functions.map(edge => ({
          //  id: edge.node.id,
           // title: edge.node.title,
           // apiType: edge.node.apiType,
           // appTitle: edge.node.app?.title
         // })));
          throw new Error("No suitable Shopify Function found. Please check function deployment in Shopify Admin > Settings > Functions.");
        }

        if (discountFunction) {
         // console.log("✅ Found discount function:", {
         //   functionId: discountFunction.node.id,
           // functionTitle: discountFunction.node.title,
          //  apiType: discountFunction.node.apiType,
        //    appTitle: discountFunction.node.app?.title
        //  });

          // 🔍 WALIDACJA DANYCH WEJŚCIOWYCH - zgodnie z sugestiami AI
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
          
          const metafieldValue = {
            discountClass: discountData.discountClass,
            discountPercentage: discountData.discountPercentage,
            conditions: discountData.conditions,
            isConditional: discountData.isConditional
          };
          
          // Metafield dla input variables zapytania GraphQL (dla Shopify Functions)
          const inputVariablesValue = {
            collectionIds: Array.from(new Set(collectionIds)) // remove duplicates
          };
          
          //console.log("🔍 DEBUG: Metafield configuration:", metafieldValue);
          //console.log("🔍 DEBUG: Input variables for GraphQL:", inputVariablesValue);
          //console.log("🔍 DEBUG: Extracted collection IDs:", collectionIds);
          
          // Sprawdź czy JSON jest poprawny
          try {
            const testJson = JSON.stringify(metafieldValue);
            JSON.parse(testJson); // Parse back test
         //   console.log("✅ Metafield JSON validation passed");
          } catch (jsonError) {
        //    console.error("❌ Invalid JSON for metafield:", jsonError);
            throw new Error(`Invalid metafield JSON: ${jsonError.message}`);
          }

          // Create APP discount extension with Shopify Function
          // Use user-selected combinesWith settings from form, with Shopify API restrictions
          const combinesWithSettings = { ...discountData.combinesWith };
          
          // SHOPIFY RESTRICTION: Shipping discounts cannot combine with other shipping discounts
          if (discountData.discountClass === 'SHIPPING') {
            combinesWithSettings.shippingDiscounts = false;
            //console.log("🚫 [SHIPPING RESTRICTION] Setting shippingDiscounts = false for SHIPPING discount");
          }

          // 🔧 SPRAWDŹ METODĘ AKTYWACJI - NOWA LOGIKA
          let functionDiscountInput, functionDiscountMutation, mutationVariables;
          
          if (discountData.activationMethod === 'discount_code') {
            // KODY PROMOCYJNE - discountCodeAppCreate
            functionDiscountInput = {
            title: discountData.description,
            functionId: discountFunction.node.id,
            startsAt: getZonedISOString(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE),
            ...(hasEndDate && endDate ? { endsAt: getZonedISOString(endDate, endTime, EFFECTIVE_SHOP_TIMEZONE) } : {}),
            combinesWith: combinesWithSettings,
              discountClasses: [discountData.discountClass],
              code: discountData.discountCode // ADD DISCOUNT CODE
            };
            
            functionDiscountMutation = `
              mutation discountCodeAppCreate($codeAppDiscount: DiscountCodeAppInput!) {
                discountCodeAppCreate(codeAppDiscount: $codeAppDiscount) {
                  codeAppDiscount {
                    discountId
                    title
                    status
                    codes(first: 1) {
                      nodes {
                        code
                      }
                    }
                  }
                  userErrors {
                    field
                    message
                    code
                  }
                }
              }
            `;
            
            mutationVariables = { codeAppDiscount: functionDiscountInput };
            //console.log("🎫 CREATING DISCOUNT CODE:", discountData.discountCode);
          // 
          } else {
            // AUTOMATYCZNE - discountAutomaticAppCreate (jak dotychczas)
            functionDiscountInput = {
            title: discountData.description,
            functionId: discountFunction.node.id,
            startsAt: getZonedISOString(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE),
            ...(hasEndDate && endDate ? { endsAt: getZonedISOString(endDate, endTime, EFFECTIVE_SHOP_TIMEZONE) } : {}),
              combinesWith: combinesWithSettings,
            discountClasses: [discountData.discountClass] // "ORDER" or "SHIPPING" 
          };
          
            functionDiscountMutation = `
            mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
              discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
                automaticAppDiscount {
                  discountId
                  title
                  status
                }
                userErrors {
                  field
                  message
                  code
                }
              }
            }
          `;

            mutationVariables = { automaticAppDiscount: functionDiscountInput };
            //console.log("🤖 TWORZENIE AUTOMATYCZNEJ ZNIŻKI");
          }
          
          // 🔍 WALIDACJA INPUT STRUCTURE
          //console.log("🔍 DEBUG: Input validation:", {
           // activationMethod: discountData.activationMethod,
           // hasTitle: !!functionDiscountInput.title,
           // hasFunctionId: !!functionDiscountInput.functionId,
          //  hasStartsAt: !!functionDiscountInput.startsAt,
           // hasCombinesWith: !!functionDiscountInput.combinesWith,
           // combinesWithSettings: functionDiscountInput.combinesWith,
          // hasDiscountClasses: Array.isArray(functionDiscountInput.discountClasses),
           // discountClasses: functionDiscountInput.discountClasses,
          //  discountClass: discountData.discountClass,
           // discountCode: functionDiscountInput.code || 'BRAK',
           // metafieldValueExists: !!metafieldValue,
           // metafieldValueType: typeof metafieldValue
        //  });

          // 🔍 SZCZEGÓŁOWE DEBUGOWANIE
        //  console.log("🔍 DEBUG: Sending mutation with input:", {
         //   mutation: functionDiscountMutation,
         //   variables: mutationVariables,
        //    functionId: discountFunction.node.id,
         //   metafieldValue: metafieldValue
         // });

          const appResult = await callShopify(functionDiscountMutation, mutationVariables);

          // 🔍 ZAWSZE LOGUJ PEŁNĄ ODPOWIEDŹ
        //  console.log("🔍 DEBUG: Full mutation response:", JSON.stringify(appResult, null, 2));

          // 🔧 OBSŁUGA ODPOWIEDZI W ZALEŻNOŚCI OD TYPU ZNIŻKI
          let discountResult, userErrors, discountObject;
          
          if (discountData.activationMethod === 'discount_code') {
            // RESPONSE FOR DISCOUNT CODE
            discountResult = appResult.discountCodeAppCreate;
            userErrors = discountResult?.userErrors;
            discountObject = discountResult?.codeAppDiscount;
          } else {
            // RESPONSE FOR AUTOMATIC DISCOUNT
            discountResult = appResult.discountAutomaticAppCreate;
            userErrors = discountResult?.userErrors;
            discountObject = discountResult?.automaticAppDiscount;
          }

          if (userErrors?.length > 0) {
           // console.error("❌ DETAILED APP DISCOUNT ERRORS:", 
            //  userErrors.map(err => ({
            //    field: err.field,
             //   message: err.message,
            //   code: err.code
           //   }))
           // );
            
            // Show detailed error to user
            const errorMessages = userErrors
              .map(err => `${err.field}: ${err.message} (${err.code})`)
              .join('\n');
            
            throw new Error(`App discount creation failed:\n${errorMessages}`);
          } else if (discountObject) {
            shopifyDiscountId = discountObject.discountId;
            
            // Additional info for discount codes
            const codeInfo = discountData.activationMethod === 'discount_code' && discountObject.codes?.nodes?.[0]?.code 
              ? ` - Kod: ${discountObject.codes.nodes[0].code}` 
              : '';
            
           // console.log("✅ Utworzono APP DISCOUNT EXTENSION:", {
            //  discountId: shopifyDiscountId,
             // functionId: discountFunction.node.id,
             // discountClass: discountData.discountClass,
            //  activationMethod: discountData.activationMethod,
            //  title: discountData.description,
             // status: discountObject.status,
             // code: discountData.activationMethod === 'discount_code' ? discountData.discountCode : 'AUTOMATIC'
          //  });
            
          //  console.log(`✅ Discount created: ${discountData.activationMethod === 'discount_code' ? 'DISCOUNT CODE' : 'AUTOMATIC'}${codeInfo}`);
            
            // 🔍 DODAJ METAFIELD Z KONFIGURACJĄ DO UTWORZONEJ ZNIŻKI
            try {
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
              
              if (metafieldResult.metafieldsSet?.userErrors?.length > 0) {
              //console.warn("⚠️ Metafield add error:", metafieldResult.metafieldsSet.userErrors);
              } else {
               // console.log("✅ Added metafield with configuration to discount");
              }
            } catch (metafieldError) {
              //console.warn("⚠️ Failed to add metafield:", metafieldError);
                  }
            
            // 🔍 SPRAWDŹ CZY ZNIŻKA RZECZYWIŚCIE ISTNIEJE W SHOPIFY
           // console.log("🔍 DEBUG: Verifying created discount exists in Shopify Admin...");
          } else {
            //console.error("❌ UNEXPECTED: No discount created and no userErrors");
           // console.log("🔍 DEBUG: Raw response:", appResult);
            throw new Error("Unexpected response - no discount created and no errors reported");
          }
        }
      } catch (functionsError) {
        //console.warn("⚠️ Failed to create APP discount:", functionsError);
      }
      // Fallback: create standard Shopify discount if Functions failed
      if (!shopifyDiscountId) {
        //console.log("🔄 Creating standard Shopify discount...");
       // console.log("🔄 Activation method:", discountData.activationMethod);

        let mutationInput, graphqlMutation, mutationVariables;

        if (discountCreationMode === 'shipping') {
          // Free shipping discount - sprawdź metodę aktywacji
          if (discountData.activationMethod === 'discount_code') {
            // DARMOWA DOSTAWA Z KODEM PROMOCYJNYM
            mutationInput = {
              title: discountData.description,
              startsAt: getZonedISOString(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE),
              ...(hasEndDate && endDate ? { endsAt: getZonedISOString(endDate, endTime, EFFECTIVE_SHOP_TIMEZONE) } : {}),
              code: discountData.discountCode
            };

            // Add minimum requirements if conditional discount with cart_total condition
            if (isConditionalDiscount) {
              const cartTotalCondition = conditions.find(c => c.type === 'cart_total' && c.operator === 'greater_than_or_equal');
              if (cartTotalCondition && cartTotalCondition.value) {
                mutationInput.minimumRequirement = {
                  subtotal: {
                    greaterThanOrEqualToSubtotal: parseFloat(cartTotalCondition.value)
                  }
                };
              }
            }

            graphqlMutation = `
              mutation discountCodeFreeShippingCreate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
                discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
                  codeDiscountNode {
                    id
                    codeDiscount {
                      ... on DiscountCodeFreeShipping {
                        title
                        status
                        codes(first: 1) {
                          nodes {
                            code
                          }
                        }
                      }
                    }
                  }
                  userErrors {
                    field
                    message
                    code
                  }
                }
              }
            `;

            mutationVariables = { freeShippingCodeDiscount: mutationInput };
            //console.log("🎫 Fallback: Creating free shipping discount code:", discountData.discountCode);

          } else {
            // AUTOMATYCZNA DARMOWA DOSTAWA
          mutationInput = {
            title: discountData.description,
            startsAt: getZonedISOString(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE),
            ...(hasEndDate && endDate ? { endsAt: getZonedISOString(endDate, endTime, EFFECTIVE_SHOP_TIMEZONE) } : {})
          };

          // Add minimum requirements if conditional discount with cart_total condition
          if (isConditionalDiscount) {
            const cartTotalCondition = conditions.find(c => c.type === 'cart_total' && c.operator === 'greater_than_or_equal');
            if (cartTotalCondition && cartTotalCondition.value) {
              mutationInput.minimumRequirement = {
                subtotal: {
                  greaterThanOrEqualToSubtotal: parseFloat(cartTotalCondition.value)
                }
              };
            }
          }

          graphqlMutation = `
            mutation discountAutomaticFreeShippingCreate($freeShippingAutomaticDiscount: DiscountAutomaticFreeShippingInput!) {
              discountAutomaticFreeShippingCreate(freeShippingAutomaticDiscount: $freeShippingAutomaticDiscount) {
                automaticDiscountNode {
                  id
                  automaticDiscount {
                    ... on DiscountAutomaticFreeShipping {
                      title
                      status
                    }
                  }
                }
                userErrors {
                  field
                  message
                  code
                }
              }
            }
          `;

            mutationVariables = { freeShippingAutomaticDiscount: mutationInput };
           // console.log("🤖 Fallback: Creating automatic free shipping");
          }

        } else {
          // Percentage discount for orders - check activation method
          if (discountData.activationMethod === 'discount_code') {
            // PERCENTAGE DISCOUNT WITH DISCOUNT CODE
            mutationInput = {
              title: discountData.description,
              startsAt: getZonedISOString(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE),
              ...(hasEndDate && endDate ? { endsAt: getZonedISOString(endDate, endTime, EFFECTIVE_SHOP_TIMEZONE) } : {}),
              code: discountData.discountCode,
              customerGets: {
                value: {
                  percentage: discountData.discountPercentage / 100
                },
                items: {
                  all: true
                }
              }
            };

            // Add minimum requirements if conditional discount with cart_total condition
            if (isConditionalDiscount) {
              const cartTotalCondition = conditions.find(c => c.type === 'cart_total' && c.operator === 'greater_than_or_equal');
              if (cartTotalCondition && cartTotalCondition.value) {
                mutationInput.minimumRequirement = {
                  subtotal: {
                    greaterThanOrEqualToSubtotal: parseFloat(cartTotalCondition.value)
                  }
                };
              }
            }

            graphqlMutation = `
              mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
                discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
                  codeDiscountNode {
                    id
                    codeDiscount {
                      ... on DiscountCodeBasic {
                        title
                        status
                        codes(first: 1) {
                          nodes {
                            code
                          }
                        }
                      }
                    }
                  }
                  userErrors {
                    field
                    message
                    code
                  }
                }
              }
            `;

            mutationVariables = { basicCodeDiscount: mutationInput };
           // console.log("🎫 Fallback: Creating discount code:", discountData.discountCode);
    } else {
            // AUTOMATIC PERCENTAGE DISCOUNT
          mutationInput = {
            title: discountData.description,
            startsAt: getZonedISOString(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE),
            ...(hasEndDate && endDate ? { endsAt: getZonedISOString(endDate, endTime, EFFECTIVE_SHOP_TIMEZONE) } : {}),
            customerGets: {
              value: {
                percentage: discountData.discountPercentage / 100
              },
              items: {
                all: true
              }
            }
          };

          // Add minimum requirements if conditional discount with cart_total condition
          if (isConditionalDiscount) {
            const cartTotalCondition = conditions.find(c => c.type === 'cart_total' && c.operator === 'greater_than_or_equal');
            if (cartTotalCondition && cartTotalCondition.value) {
              mutationInput.minimumRequirement = {
                subtotal: {
                  greaterThanOrEqualToSubtotal: parseFloat(cartTotalCondition.value)
                }
              };
            }
          }

          graphqlMutation = `
            mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
              discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
                automaticDiscountNode {
                  id
                  automaticDiscount {
                    ... on DiscountAutomaticBasic {
                      title
                      status
                    }
                  }
                }
                userErrors {
                  field
                  message
                  code
                }
              }
            }
          `;

            mutationVariables = { automaticBasicDiscount: mutationInput };
           // console.log("🤖 Fallback: Tworzenie automatycznej zniżki procentowej");
          }
        }

        // Wykonaj mutation
        const result = await callShopify(graphqlMutation, mutationVariables);
        
        // Obsłuż odpowiedź w zależności od typu
        let fallbackDiscountNode;
        if (discountData.activationMethod === 'discount_code') {
          // Dla kodów promocyjnych
          if (discountCreationMode === 'shipping') {
            if (result.discountCodeFreeShippingCreate?.userErrors?.length > 0) {
              throw new Error(result.discountCodeFreeShippingCreate.userErrors[0].message);
            }
            fallbackDiscountNode = result.discountCodeFreeShippingCreate?.codeDiscountNode;
          } else {
            if (result.discountCodeBasicCreate?.userErrors?.length > 0) {
              throw new Error(result.discountCodeBasicCreate.userErrors[0].message);
            }
            fallbackDiscountNode = result.discountCodeBasicCreate?.codeDiscountNode;
          }
        } else {
          // Dla automatycznych
          if (discountCreationMode === 'shipping') {
            if (result.discountAutomaticFreeShippingCreate?.userErrors?.length > 0) {
              throw new Error(result.discountAutomaticFreeShippingCreate.userErrors[0].message);
            }
            fallbackDiscountNode = result.discountAutomaticFreeShippingCreate?.automaticDiscountNode;
          } else {
          if (result.discountAutomaticBasicCreate?.userErrors?.length > 0) {
            throw new Error(result.discountAutomaticBasicCreate.userErrors[0].message);
          }
            fallbackDiscountNode = result.discountAutomaticBasicCreate?.automaticDiscountNode;
          }
        }

        if (fallbackDiscountNode) {
          shopifyDiscountId = fallbackDiscountNode.id;
          const discountTypeText = discountData.activationMethod === 'discount_code' ? 'discount code' : 'automatic';
          const creationModeText = discountCreationMode === 'shipping' ? 'free shipping' : 'percentage discount';
         // console.log(`✅ Created standard ${discountTypeText} ${creationModeText}:`, shopifyDiscountId);
        }
      }

      // Add shopifyDiscountId to discount data
      if (shopifyDiscountId) {
        discountData.shopifyDiscountId = shopifyDiscountId;
      }

      // Save to metafields and update local state
     // console.log('🔍 DEBUG: discountData przed zapisem:', discountData);
      const updatedDiscounts = [...panelDiscounts, discountData];
     // console.log('🔍 DEBUG: updatedDiscounts przed zapisem:', updatedDiscounts);
      await saveIndividualDiscounts(updatedDiscounts);
      setPanelDiscounts(updatedDiscounts);

      // Synchronize customer segments if discount has customer_tags conditions
      if (isConditionalDiscount) {
        const customerTagsConditions = conditions.filter(c => c.type === 'customer_tags');
        if (customerTagsConditions.length > 0) {
          //console.log(`🔄 Starting customer segment sync for ${customerTagsConditions.length} customer_tags conditions`);
          
          for (const condition of customerTagsConditions) {
            try {
              const tags = condition.value.split(',').map(tag => tag.trim()).filter(tag => tag);
              if (tags.length > 0) {
                const syncResult = await fetch('/api/customer-segments', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    discountId: discountData.id,
                    customerTags: tags,
                    operator: condition.operator
                  })
                });
                
                const syncData = await syncResult.json();
                if (syncData.success) {
                  //console.log(`✅ Customer segment sync completed:`, syncData.stats);
                } else {
                  //console.error(`❌ Customer segment sync failed:`, syncData.error);
                  showToast(`Customer segment sync error: ${syncData.error}`);
                }
              }
            } catch (syncError) {
             // console.error(`❌ Error syncing customer segments:`, syncError);
              showToast(`Customer segment sync error: ${syncError.message}`);
            }
          }
        }
      }

      // Reset form and go back
      resetFormFields();
      setDiscountCreationMode(null);

      // Hide Save Bar after successful save
      try { shopify && shopify.saveBar.hide('discount-save-bar').catch(() => {}); } catch (_) {}

      // Keep UI feedback minimal: rely on visual state instead of toast for success
      
      // Refresh data
      setTimeout(() => {
        loadShopDataAndDiscounts();
      }, 1000);
      
    } catch (error) {
     // console.error('Error creating discount:', error);
      showToast(`Error while creating discount: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // FUNCTION TO RESET FORM FIELDS
  const resetFormFields = () => {
    setDiscountName('');
    setDiscountDescription('');
    setDiscountPercentage('');
    setDiscountAmount(''); // Reset stała kwota
    setDiscountValueType('percentage'); // Reset typ wartości
            setActivationMethod('automatic'); // Reset activation method
        setCombinesWith({
          orderDiscounts: false,
          productDiscounts: false,
          shippingDiscounts: false
        }); // Reset combines with settings
    setDiscountCode(''); // Reset discount code
    // minimumAmount nie jest już używane w formularzu - usunięte pole
    setIsConditionalDiscount(false);
    setConditions([
      {
        id: 1,
        type: 'cart_total',
        operator: 'greater_than_or_equal',
        value: ''
      }
    ]);
    setCollapsedConditions({}); // Reset collapsed state
    setCountrySelectionState({}); // Reset country selection state
    setProductSelectionState({}); // Reset product selection state
    setCollectionSelectionState({}); // Reset collection selection state
    setShowCheckoutNotMetMessage(false);
    setCheckoutNotMetMessage('');
  };

  // SHOPIFY FUNCTIONS STATE REMOVED - Interface moved to Manage Discounts

  // PANEL SETTINGS (ALL FROM app_additional.jsx)
  const [panelSettings, setPanelSettings] = useState({
    panelType: 'manual',
    bannerColor: '#f4f4f4',
    textColor: '#000000',
    fontSize: '1rem',
    topOffset: '50px',
    discounts: [],
    achievedColor: '#e8f5e8',
    lockedColor: '#f5f5f5',
    progressBarColor: '#28a745',
    borderRadius: '15',
    shadowIntensity: 'medium',
    discountSpacing: '15',
    rowGap: '2',
    iconStyle: 'modern',
    rowHeight: '70',
    rowSeparatorColor: '#e0e0e0',
    scrollbarBackground: '#f5f5f5',
    scrollbarThumbMargin: '0',
    // Scrollbar settings
    scrollbarWidth: '8',
    scrollbarThumbColor: '#cccccc',
    scrollbarThumbHoverColor: '#aaaaaa',
    scrollbarBorderRadius: '4',
    scrollbarThumbBorderRadius: '4',
    cartValueFontSize: '16',
    cartValueHeight: '60',
    remainingAmountFontSize: '16',
    descriptionFontSize: '15',
    minimumAmountFontSize: '13',
    footerFontSize: '12',
    footerTextColor: '#666666',
    statusMessageBackground: '#e3f2fd',
    statusMessageTextColor: '#1565c0',
    cartValueBackground: '#f8f9fa',
    cartValueTextColor: '#333333',
    discountOrder: 'asc',
    
    achievedText: '✅ Achieved!',
    missingText: '🔒 Missing',
    highestDiscountText: '🎉 Highest {percentage}% discount achieved!',
    missingForDiscountText: 'You have {cart_value} {currency} in cart. Add {amount} {currency} to unlock {percentage}% discount',
    noDiscountsText: 'Add products to cart to get discounts',
    requiredText: '',
    showAchievedText: true,
    showMissingAmount: true,
    bannerText: 'Click to see available discounts!',
    cartValueText: 'Header: {cart}',
    showCartValue: true,
    closeButtonBackground: '#00000000',
    closeButtonBackgroundImage: '',
    closeButtonSize: '25',
    closeButtonPosition: 'top-right',
    closeButtonOffsetX: '10',
    closeButtonOffsetY: '10',
    headerTextAlign: 'center',
    subheaderTextAlign: 'center',
    footerTextAlign: 'center',
    errorNoDiscountsText: 'No available discounts',
    errorLoadingText: 'Loading discount information...',
    circleSize: '60',
    circlePosition: 'bottom-right',
    circleOffsetX: '20',
    circleOffsetY: '20',
    circleBackgroundColor: '#007bff',
    circleImageUrl: '',
    maxPanelWidth: '1200',
    panelMargin: '100',
    dismissedBanners: [],
    showFooter: true,
    footerBackground: '#f8f9fa',
    footerHeight: '50',
    footerContent: 'Powered by Your Store',
    showHighestDiscountMessage: true,
    panelHeight: '300',
    remainingAmountHeight: '60',
    // Panel Visibility Settings
    panelVisibilityEnabled: false,
    panelVisibilityLoggedIn: 'any', // 'any' | 'logged_in' | 'logged_out'
    panelVisibilityCountries: [], // array of ISO codes
    panelVisibilityMode: 'always', // 'always' | 'conditional'
    panelVisibilityConditions: [],
    // Header Block Settings
    cartValueFontSize: '16',
    cartValueHeight: '50',
    cartValuePadding: '15',
    cartValueBackgroundImage: '',
    // Highest Discount Block Settings  
    highestDiscountFontSize: '14',
    highestDiscountPadding: '15',
    highestDiscountBackgroundImage: '',
    // Footer Block Settings
    footerFontSize: '13',
    footerPadding: '10',
    footerBackgroundImage: '',
    iconSize: '40',
    descriptionFontSize: '15',
    minimumAmountFontSize: '13',
    rowSeparatorWidth: '1',
    // Border Glow settings
    borderGlow: 'none',
    borderGlowSize: '10',
    borderGlowColor: '#007bff',
    borderGlowPulse: false,
    borderGlowSpeed: '2',
    borderGlowIntensity: 'medium',
    // Individual discount row settings
    defaultLockedIcon: '🔒',
    rowHoverEffect: 'none',
    rowHoverColor: '#f8f9fa',
    rowHoverScale: '1.02',
    // Font family settings
    headerTextFont: 'Arial, sans-serif',
    subheaderTextFont: 'Arial, sans-serif',
    footerTextFont: 'Arial, sans-serif',
    achievedTextFont: 'Arial, sans-serif',
    missingTextFont: 'Arial, sans-serif',
    // Start guide settings
    startGuideExpanded: true,
    previewExpanded: false,
    panelEnabled: true,
    customDiscountOrder: [],
  });
  
  const [panelDiscounts, setPanelDiscounts] = useState([]);
  const [isConditionalDiscount, setIsConditionalDiscount] = useState(false);

  // COMBOBOX STATE FOR COUNTRIES - MOVED TO TOP
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingPanelSettings, setIsSavingPanelSettings] = useState(false);
  const [uploadingMap, setUploadingMap] = useState({});
  const [localPreviews, setLocalPreviews] = useState({});
  
  // Image utilities: validation, compression and Shopify Files upload
  const validateImageFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Unsupported file type. Use JPG, PNG, GIF or WebP.');
    }
    if (file.size > maxSize) {
      throw new Error('File too large. Max size is 15MB.');
    }
    return true;
  };

  const compressImage = (file, maxWidth = 1600, quality = 0.82) => {
    return new Promise((resolve, reject) => {
      try {
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.onload = () => {
          const ratio = Math.min(maxWidth / image.width, 1);
          const targetWidth = Math.round(image.width * ratio);
          const targetHeight = Math.round(image.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
          const outputType = file.type === 'image/gif' ? 'image/png' : 'image/webp';
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image.'));
              return;
            }
            resolve(blob);
          }, outputType, quality);
        };
        image.onerror = () => reject(new Error('Cannot load image for compression'));
        image.src = url;
      } catch (e) {
        reject(e);
      }
    });
  };

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  const getExtensionFromMime = (mime) => {
    if (!mime) return 'jpg';
    if (mime.includes('jpeg')) return 'jpg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('gif')) return 'gif';
    return 'jpg';
  };

  const resolveFileUrlById = async (id, attempts = 5, delayMs = 600) => {
    for (let i = 0; i < attempts; i++) {
      const data = await callShopify(`
        query getFile($id: ID!) {
          node(id: $id) {
            __typename
            ... on MediaImage { id image { url altText } preview { image { url } } }
            ... on GenericFile { id url }
          }
        }
      `, { id });
      const node = data?.node;
      const url = (node?.image?.url) || (node?.preview?.image?.url) || (node?.url);
      if (url && typeof url === 'string' && url.startsWith('http')) return url;
      await sleep(delayMs);
    }
    return '';
  };

  const uploadImageToShopify = async (file, alt = 'Uploaded image') => {
    // 1) Request staged upload target
    const ext = getExtensionFromMime(file.type || 'image/jpeg');
    const staged = await callShopify(`
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets { url resourceUrl parameters { name value } }
          userErrors { field message }
        }
      }
    `, {
      input: [{
        resource: "FILE",
        filename: (file.name && /\./.test(file.name)) ? file.name : `image-${Date.now()}.${ext}`,
        mimeType: file.type || 'image/jpeg',
        httpMethod: "POST"
      }]
    });

    const target = staged?.stagedUploadsCreate?.stagedTargets?.[0];
    const errors = staged?.stagedUploadsCreate?.userErrors;
    if (!target || (errors && errors.length)) {
      throw new Error(errors?.[0]?.message || 'Failed to create staged upload');
    }

    // 2) Upload the file to the staged URL (S3)
    const formData = new FormData();
    (target.parameters || []).forEach(p => formData.append(p.name, p.value));
    const uploadName = (file && (file.name || `image-${Date.now()}.jpg`));
    formData.append('file', file, uploadName);
    const uploadResp = await fetch(target.url, { method: 'POST', body: formData });
    if (!uploadResp.ok) {
      throw new Error(`Upload failed with status ${uploadResp.status}`);
    }

    // 3) Create file in Shopify and get CDN URL
    const created = await callShopify(`
      mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            __typename
            ... on MediaImage { id image { url altText } preview { image { url } } }
            ... on GenericFile { id url }
          }
          userErrors { field message }
        }
      }
    `, {
      files: [{
        originalSource: target.resourceUrl,
        contentType: "IMAGE",
        alt: alt
      }]
    });

    const createErrors = created?.fileCreate?.userErrors;
    if (createErrors && createErrors.length) {
      throw new Error(createErrors[0].message || 'Failed to create file in Shopify');
    }

    const mediaImage = created?.fileCreate?.files?.[0];
    let url = (mediaImage?.image?.url)
      || (mediaImage?.preview?.image?.url)
      || (mediaImage?.url);
    if (!url && mediaImage?.id) {
      url = await resolveFileUrlById(mediaImage.id, 6, 800);
    }
    if (!url) {
    //  console.error('fileCreate response without URL:', created);
      throw new Error('No image URL returned');
    }
    return url;
  };
  // Panel settings tabs and modals state
  const [selectedTab, setSelectedTab] = useState(0);
  const [filteredSection, setFilteredSection] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [newDiscount, setNewDiscount] = useState({
    description: '',
    minimumAmount: '',
    discountPercentage: '',
    imageUrl: '',
    lockedIcon: '',
    backgroundColor: '',
    backgroundImage: '',
    discountType: 'unconditional' // 'unconditional' lub 'conditional'
  });
  
  // Enhanced features state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscounts, setSelectedDiscounts] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCreatingTestDiscounts, setIsCreatingTestDiscounts] = useState(false);
  const [limit25Expanded, setLimit25Expanded] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [previewCartValue, setPreviewCartValue] = useState(150);
  const [previewPanelWidth, setPreviewPanelWidth] = useState(600);
  const [discountToDelete, setDiscountToDelete] = useState(null);

  // Preview in admin should ignore Panel Visibility Rules

  // Compute effective mode for UI (fallback to enable flag if mode missing)
  const panelVisibilityModeComputed = useMemo(() => {
    if (panelSettings.panelVisibilityMode === 'conditional' || panelSettings.panelVisibilityMode === 'always') {
      return panelSettings.panelVisibilityMode;
    }
    return panelSettings.panelVisibilityEnabled ? 'conditional' : 'always';
  }, [panelSettings.panelVisibilityMode, panelSettings.panelVisibilityEnabled]);

  useEffect(() => {
    try {
      console.log('PANEL_VIS_DEBUG uiSelected', {
        computedMode: panelVisibilityModeComputed,
        settingsMode: panelSettings.panelVisibilityMode,
        enabled: panelSettings.panelVisibilityEnabled,
        conditionsCount: Array.isArray(panelSettings.panelVisibilityConditions) ? panelSettings.panelVisibilityConditions.length : 0,
      });
    } catch (e) { /* ignore */ }
  }, [panelVisibilityModeComputed, panelSettings.panelVisibilityMode, panelSettings.panelVisibilityEnabled, panelSettings.panelVisibilityConditions]);
  const [lastSavedSettings, setLastSavedSettings] = useState({});
  const [iconEditorOpen, setIconEditorOpen] = useState({});
  const [lockedIconEditorOpen, setLockedIconEditorOpen] = useState({});



  // Reset discount creation mode on page refresh to prevent stuck state
  useEffect(() => {
   // console.log('🔄 Sprawdzanie stanu po odświeżeniu strony...');
    
    // Jeśli jesteśmy w trybie tworzenia zniżki po odświeżeniu, resetuj do normalnego widoku
    if (discountCreationMode === 'order' || discountCreationMode === 'shipping') {
    //  console.log('🔄 Wykryto tryb tworzenia zniżki po odświeżeniu - resetowanie do normalnego widoku');
      resetFormFields();
      setDiscountCreationMode(null);
      setEditingDiscount(null);
      
      // Ukryj save bar jeśli jest widoczny
      try { shopify && shopify.saveBar.hide('discount-save-bar').catch(() => {}); } catch (_) {}
      
      
    }
  }, []); // Uruchom tylko raz po zamontowaniu komponentu

  // Lock navigation if editing or creating discount and there are unsaved changes
  useEffect(() => {
    const isEditing = Boolean(editingDiscount) || discountCreationMode === 'order' || discountCreationMode === 'shipping';
    const shouldLock = isEditing;
    setNavigationLocked(shouldLock);
    if (shopify) {
      try {
        const id = 'discount-save-bar';
        if (shouldLock) {
          shopify && shopify.saveBar.show(id).catch(() => {});
        } else {
          shopify && shopify.saveBar.hide(id).catch(() => {});
        }
      } catch (_) {}
    }
  }, [editingDiscount, discountCreationMode, shopify]);

  // Load shop data and discounts on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Najpierw załaduj dane sklepu (potrzebne do zapisywania metafields)
        await loadShopDataAndDiscounts();
        
        // 2. Równolegle załaduj ustawienia panelu i zniżki
        await Promise.all([
          loadPanelSettings(),
          loadIndividualDiscounts()  // Teraz shopData jest już dostępne
        ]);
      } catch (error) {
        console.error("❌ App initialization error:", error);
      }
    };
    
    initializeApp();
  }, []);

  // Handle combinesWith restrictions when discount creation mode changes
  useEffect(() => {
    if (discountCreationMode === 'shipping') {
      // SHOPIFY RESTRICTION: Shipping discounts cannot combine with other shipping discounts
      setCombinesWith(prev => ({
        ...prev,
        shippingDiscounts: false
      }));
      console.log("🚫 [SHIPPING MODE] Auto-setting shippingDiscounts = false for shipping discount mode");
    }
  }, [discountCreationMode]);



  // Update bulk actions visibility
  useEffect(() => {
    setShowBulkActions(selectedDiscounts.length > 0);
  }, [selectedDiscounts]);




    
  // Show/hide panel settings save bar
  useEffect(() => {
    try {
      if (!shopify) return;
      const id = 'panel-save-bar';
      if (hasUnsavedChanges && activeView === "panel-settings") {
        shopify.saveBar.show(id).catch(() => {});
      } else {
        shopify.saveBar.hide(id).catch(() => {});
      }
    } catch (_) {}
  }, [hasUnsavedChanges, activeView, shopify]);



  //FILTRUJE ZNIZKI
  const filteredDiscounts = panelDiscounts.filter(discount => {
    const matchesSearch = discount.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         discount.minimumAmount.toString().includes(searchQuery) ||
                         discount.discountPercentage.toString().includes(searchQuery);
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && discount.isActive) ||
                         (filterStatus === 'inactive' && !discount.isActive);
    
    return matchesSearch && matchesFilter;
  });

  //SORTUJE ZNIZKI
  const sortedPanelDiscounts = [...filteredDiscounts].sort((a, b) => {
    switch (sortBy) {
      case 'custom': {
        const order = panelSettings.customDiscountOrder || [];
        const indexA = order.indexOf(a.id);
        const indexB = order.indexOf(b.id);
        // Those without explicit order go to the end, preserving current order
        const safeA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
        const safeB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
        return safeA - safeB;
      }
      case 'newest':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'oldest':
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case 'amount_high':
        return b.minimumAmount - a.minimumAmount;
      case 'amount_low':
        return a.minimumAmount - b.minimumAmount;
      case 'discount_high':
        return b.discountPercentage - a.discountPercentage;
      case 'discount_low':
        return a.discountPercentage - b.discountPercentage;
      case 'alphabetical':
        return a.description.localeCompare(b.description);
      default:
        return 0;
    }
  });

  // Initialize custom order from current sort when switching to custom
  const initializeCustomOrderIfEmpty = useCallback(async () => {
    const currentOrderIds = sortedPanelDiscounts.map(d => d.id);
    if (!Array.isArray(panelSettings.customDiscountOrder) || panelSettings.customDiscountOrder.length === 0) {
      const updated = { ...panelSettings, customDiscountOrder: currentOrderIds };
      setPanelSettings(updated);
      setHasUnsavedChanges(true);
      try { await savePanelSettings(updated); } catch (e) { console.error(e); }
    }
  }, [sortedPanelDiscounts, panelSettings, setPanelSettings]);

  // Move item up/down in custom order
  const moveDiscountInCustomOrder = useCallback(async (discountId, delta) => {
    const currentOrder = (panelSettings.customDiscountOrder && Array.isArray(panelSettings.customDiscountOrder))
      ? [...panelSettings.customDiscountOrder]
      : sortedPanelDiscounts.map(d => d.id);
    let index = currentOrder.indexOf(discountId);
    if (index === -1) {
      currentOrder.push(discountId);
      index = currentOrder.length - 1;
    }
    const newIndex = Math.max(0, Math.min(currentOrder.length - 1, index + delta));
    if (newIndex === index) return;
    const [moved] = currentOrder.splice(index, 1);
    currentOrder.splice(newIndex, 0, moved);
    const updated = { ...panelSettings, customDiscountOrder: currentOrder };
    setPanelSettings(updated);
    setHasUnsavedChanges(true);
    try { await savePanelSettings(updated); } catch (e) { console.error(e); }
  }, [panelSettings, sortedPanelDiscounts]);
  //TWORZY TABELE ZE ZNIZKAMI
  const discountRows = sortedPanelDiscounts.map(discount => [
    (
      <InlineStack key={`desc-${discount.id}`} align="space-between" gap="200">
        <Text>{discount.description}</Text>
        {sortBy === 'custom' && (
          <InlineStack gap="100">
            <Button size="slim" variant="secondary" onClick={() => moveDiscountInCustomOrder(discount.id, -1)}>↑</Button>
            <Button size="slim" variant="secondary" onClick={() => moveDiscountInCustomOrder(discount.id, 1)}>↓</Button>
          </InlineStack>
        )}
      </InlineStack>
    ),
    <span key={`val-${discount.id}`}>
      {discount.discountType === 'free_shipping' ? 'Free shipping' : 
      discount.discountValueType === 'fixed_amount' ? `${discount.discountAmount} ${shopData?.currencyCode || 'USD'}` : 
      `${discount.discountPercentage}%`}
    </span>,
    (
      <BlockStack key={`icon-col-${discount.id}`} gap="150">
        <InlineStack gap="200" blockAlign="center">
          {discount.imageUrl ? (
            <img 
              key={`img-${discount.id}`}
              src={discount.imageUrl} 
              alt="Discount icon"
              style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : null}
          <Button size="slim" onClick={() => setIconEditorOpen(prev => ({ ...prev, [discount.id]: !prev[discount.id] }))}>
            {iconEditorOpen[discount.id] ? 'Close' : 'Change'}
          </Button>
        </InlineStack>
        {iconEditorOpen[discount.id] && (
          <BlockStack gap="150">
            <DropZone accept="image/*" type="image" allowMultiple={false} onDrop={async (files) => {
              const file = files?.[0];
              if (!file) return;
              const toBase64 = (f) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(f);
              });
              try {
                const base64Data = await toBase64(file);
                const updatedDiscounts = panelDiscounts.map(d => d.id === discount.id ? { ...d, imageUrl: base64Data } : d);
                setPanelDiscounts(updatedDiscounts);
                setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
                await saveIndividualDiscounts(updatedDiscounts);
                setHasUnsavedChanges(true);
              } catch (e) {
                console.error('Icon upload error:', e);
              }
            }}>
              <DropZone.FileUpload />
            </DropZone>
            <InlineStack gap="200" align="start">
              {discount.imageUrl && (
                <Button tone="critical" size="slim" onClick={async () => {
                  const updatedDiscounts = panelDiscounts.map(d => d.id === discount.id ? { ...d, imageUrl: '' } : d);
                  setPanelDiscounts(updatedDiscounts);
                  setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
                  await saveIndividualDiscounts(updatedDiscounts);
                  setHasUnsavedChanges(true);
                }}>
                  Remove Image
                </Button>
              )}
            </InlineStack>
            <TextField label="Or paste image URL" value={discount.imageUrl && !discount.imageUrl.startsWith('data:') ? discount.imageUrl : ''} onChange={async (value) => {
              const updatedDiscounts = panelDiscounts.map(d => d.id === discount.id ? { ...d, imageUrl: value } : d);
              setPanelDiscounts(updatedDiscounts);
              setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
              await saveIndividualDiscounts(updatedDiscounts);
              setHasUnsavedChanges(true);
            }} placeholder="https://cdn.shopify.com/s/files/xxx/icon.png" helpText="PNG recommended; direct URL or upload above" />
          </BlockStack>
        )}
      </BlockStack>
    ),
    (
      <BlockStack key={`lock-icon-col-${discount.id}`} gap="150">
        <InlineStack gap="200" blockAlign="center">
          {(() => {
            const lockedIcon = discount.lockedIcon;
            if (!lockedIcon) return null;
            if (lockedIcon.startsWith('http') || lockedIcon.startsWith('data:')) {
              return (
                <img key={`lock-img-${discount.id}`} src={lockedIcon} alt="Locked icon" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              );
            }
            return <Text key={`lock-emoji-${discount.id}`} tone="subdued">{lockedIcon}</Text>;
          })()}
          <Button size="slim" onClick={() => setLockedIconEditorOpen(prev => ({ ...prev, [discount.id]: !prev[discount.id] }))}>
            {lockedIconEditorOpen[discount.id] ? 'Close' : 'Change'}
          </Button>
        </InlineStack>
        {lockedIconEditorOpen[discount.id] && (
          <BlockStack gap="150">
            <DropZone accept="image/*" type="image" allowMultiple={false} onDrop={async (files) => {
              const file = files?.[0];
              if (!file) return;
              const toBase64 = (f) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(f);
              });
              try {
                const base64Data = await toBase64(file);
                const updatedDiscounts = panelDiscounts.map(d => d.id === discount.id ? { ...d, lockedIcon: base64Data } : d);
                setPanelDiscounts(updatedDiscounts);
                setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
                await saveIndividualDiscounts(updatedDiscounts);
                setHasUnsavedChanges(true);
              } catch (e) {
                console.error('Locked icon upload error:', e);
              }
            }}>
              <DropZone.FileUpload />
            </DropZone>
            <InlineStack gap="200" align="start">
              {discount.lockedIcon && (
                <Button tone="critical" size="slim" onClick={async () => {
                  const updatedDiscounts = panelDiscounts.map(d => d.id === discount.id ? { ...d, lockedIcon: '' } : d);
                  setPanelDiscounts(updatedDiscounts);
                  setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
                  await saveIndividualDiscounts(updatedDiscounts);
                  setHasUnsavedChanges(true);
                }}>
                  Remove Image
                </Button>
              )}
            </InlineStack>
            <TextField label="Or paste locked image URL" value={discount.lockedIcon && !discount.lockedIcon.startsWith('data:') ? discount.lockedIcon : ''} onChange={async (value) => {
              const updatedDiscounts = panelDiscounts.map(d => d.id === discount.id ? { ...d, lockedIcon: value } : d);
              setPanelDiscounts(updatedDiscounts);
              setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
              await saveIndividualDiscounts(updatedDiscounts);
              setHasUnsavedChanges(true);
            }} placeholder="https://cdn.shopify.com/s/files/xxx/locked-icon.png" helpText="PNG recommended; direct URL or upload above" />
          </BlockStack>
        )}
      </BlockStack>
    ),
    (
      <Checkbox
        key={`vis-${discount.id}`}
        label=""
        checked={discount.visibleInPanel !== false}
        onChange={(checked) => {
          const updatedDiscounts = panelDiscounts.map(d => d.id === discount.id ? { ...d, visibleInPanel: !!checked } : d);
          setPanelDiscounts(updatedDiscounts);
          setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
          setHasUnsavedChanges(true);
          saveIndividualDiscounts(updatedDiscounts);
        }}
      />
    )
  ]);



  // FUNKCJA DO SPRAWDZANIA CZY ZNIŻKA ISTNIEJE W SHOPIFY
  const checkDiscountExistsInShopify = async (shopifyDiscountId) => {
    try {
      const result = await callShopify(`
        query getDiscountNode($id: ID!) {
          discountNode(id: $id) {
            id
            discount {
              ... on DiscountAutomaticBasic {
                title
                status
              }
              ... on DiscountAutomaticFreeShipping {
                title
                status
              }
              ... on DiscountAutomaticApp {
                title
                status
              }
            }
          }
        }
      `, { id: shopifyDiscountId });
      
      return !!result.discountNode;
    } catch (error) {
      console.warn('Error checking if discount exists in Shopify:', error);
      return false;
    }
  };

  // FUNKCJA DO MANUALNEJ SYNCHRONIZACJI ZNIŻEK Z SHOPIFY (OPCJONALNA - automatyczna synchronizacja w loadIndividualDiscounts)
  const syncDiscountsWithShopify = async () => {
    if (isSyncing) return; // Zapobiegaj wielokrotnym wywołaniom
    
    setIsSyncing(true);
    try {
      console.log('🔄 Manual two-way sync with Shopify...');
      console.log('ℹ️ Note: Automatic sync happens during app load');
      
      // KROK 1: Wywołaj ponowne ładowanie, które automatycznie czyści nieprawidłowe zniżki z metafields i osierocone zniżki z Shopify
      await loadIndividualDiscounts();
      
      
      
    } catch (error) {
      console.error('❌ Shopify sync error:', error);
      showToast('Shopify sync error: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };
  // MIGRACJA DANYCH ZE STAREGO FORMATU (INDYWIDUALNE METAFIELDS) DO NOWEGO (POJEDYNCZY JSON)
  const migrateOldDiscountsFormat = async () => {
    try {
      console.log("🔄 Sprawdzanie czy istnieją dane w starym formacie...");
      
      // Sprawdź czy istnieje nowy format
      const newFormatData = await callShopify(`
        query checkNewFormat {
          shop {
            metafield(namespace: "taskify_discounts", key: "discounts") {
              value
            }
          }
        }
      `);
      
      if (newFormatData.shop?.metafield?.value) {
        console.log("✅ Nowy format już istnieje, pomijam migrację");
        return false; // Nie trzeba migrować
      }
      
      // Sprawdź czy istnieją dane w starym formacie
      const oldFormatData = await callShopify(`
        query checkOldFormat {
          shop {
            metafields(first: 250, namespace: "taskify_discounts") {
              edges {
                node {
                  key
                  value
                  type
                }
              }
            }
          }
        }
      `);
      
      const oldMetafields = oldFormatData.shop?.metafields?.edges || [];
      if (oldMetafields.length === 0) {
        console.log("ℹ️ Brak danych w starym formacie");
        return false;
      }
      
      console.log(`🔄 Znaleziono ${oldMetafields.length} starych metafields - rozpoczynam migrację...`);
      
      // Konwertuj stare dane na nowy format
      const discountMap = {};
      
      oldMetafields.forEach(({ node }) => {
        const match = node.key.match(/^znizka(\d+)_(.+)$/);
        if (match) {
          const discountIndex = match[1];
          const property = match[2];
          
          if (!discountMap[discountIndex]) {
            discountMap[discountIndex] = {};
          }
          
          // Parsuj wartości w zależności od właściwości
          if (property === 'data') {
            try {
              const parsedData = JSON.parse(node.value);
              Object.assign(discountMap[discountIndex], parsedData);
            } catch (e) {
              console.error(`❌ Błąd parsowania danych zniżki ${discountIndex}:`, e);
            }
          } else if (property === 'procent') {
            discountMap[discountIndex].discountPercentage = parseFloat(node.value) || 0;
          } else if (property === 'kwota_min') {
            discountMap[discountIndex].minimumAmount = parseFloat(node.value) || 0;
          } else if (property === 'aktywna') {
            discountMap[discountIndex].isActive = node.value === 'true';
          } else if (property === 'warunki') {
            try {
              discountMap[discountIndex].conditions = JSON.parse(node.value);
            } catch (e) {
              discountMap[discountIndex].conditions = {};
            }
          }
        }
      });
      
      // Konwertuj na tablicę i filtruj kompletne zniżki
      const migratedDiscounts = Object.values(discountMap).filter(discount => 
        discount.id && discount.description && 
        discount.minimumAmount !== undefined && 
        discount.discountPercentage !== undefined
      );
      
      if (migratedDiscounts.length > 0) {
        console.log(`🔄 Migruję ${migratedDiscounts.length} zniżek do nowego formatu...`);
        
        // Zapisz w nowym formacie
        await saveIndividualDiscounts(migratedDiscounts);
        
        // Usuń stare metafields (opcjonalnie - można zachować dla bezpieczeństwa)
        console.log("🗑️ Usuwam stare metafields...");
        const deleteIds = oldMetafields.map(edge => ({ id: edge.node.id }));
        
        for (let i = 0; i < deleteIds.length; i += 25) {
          const batch = deleteIds.slice(i, i + 25);
          await callShopify(`
            mutation metafieldsDelete($metafields: [MetafieldDeleteInput!]!) {
              metafieldsDelete(metafields: $metafields) {
                deletedMetafields { id }
                userErrors { field, message }
              }
            }
          `, { metafields: batch });
        }
        
        console.log("✅ Migracja zakończona pomyślnie!");
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Błąd migracji:', error);
      return false;
    }
  };
  // ŁADOWANIE ZNIŻEK Z POJEDYNCZEGO JSON METAFIELD (SHOPIFY BEST PRACTICE)
  const loadIndividualDiscounts = async () => {
    try {
      console.log("🔄 Ładowanie zniżek z pojedynczego JSON metafield...");
      
      // KROK 0: Sprawdź czy potrzebna jest migracja ze starego formatu
      const migrationDone = await migrateOldDiscountsFormat();
      if (migrationDone) {
        console.log("✅ Migracja zakończona, kontynuuję z ładowaniem...");
      }
      
      // KROK 1: Pobierz aktywne zniżki z Shopify (do synchronizacji) 
      // UWAGA: Sprawdzamy WSZYSTKIE typy zniżek z dodatkowymi informacjami
      const shopifyDiscountsData = await callShopify(`
        query getAllDiscounts {
          automaticDiscountNodes(first: 250) {
            edges {
              node {
                id
                automaticDiscount {
                  ... on DiscountAutomaticBasic {
                    title
                    status
                    startsAt
                    endsAt
                  }
                  ... on DiscountAutomaticFreeShipping {
                    title
                    status
                    startsAt
                    endsAt
                  }
                  ... on DiscountAutomaticApp {
                    title
                    status
                    startsAt
                    endsAt
                    appDiscountType {
                      app {
                        handle
                        title
                      }
                      functionId
                    }
                    discountClass
                  }
                }
              }
            }
          }
          codeDiscountNodes(first: 250) {
            edges {
              node {
                id
                codeDiscount {
                  ... on DiscountCodeBasic {
                    title
                    status
                    startsAt
                    endsAt
                    codes(first: 1) {
                      nodes {
                        code
                      }
                    }
                  }
                  ... on DiscountCodeFreeShipping {
                    title
                    status
                    startsAt
                    endsAt
                    codes(first: 1) {
                      nodes {
                        code
                      }
                    }
                  }
                  ... on DiscountCodeApp {
                    title
                    status
                    startsAt
                    endsAt
                    appDiscountType {
                      app {
                        handle
                        title
                      }
                      functionId
                    }
                    discountClass
                    codes(first: 1) {
                      nodes {
                        code
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `);
      
      // 🔍 SZCZEGÓŁOWE DEBUGOWANIE ZNIŻEK SHOPIFY
      console.log("🔍 DEBUG: Raw Shopify discounts response:", JSON.stringify(shopifyDiscountsData, null, 2));
      
      const activeShopifyDiscounts = new Set();
      const allShopifyDiscounts = [];
      
      // Przetwórz automatyczne zniżki
      shopifyDiscountsData?.automaticDiscountNodes?.edges?.forEach(({ node }) => {
        const discount = node.automaticDiscount;
        const title = discount.title;
        const discountInfo = {
          id: node.id,
          title: title,
          status: discount.status,
          type: discount.__typename || 'Unknown',
          startsAt: discount.startsAt,
          endsAt: discount.endsAt,
          isAutomatic: true,
          // Dla app discounts - dodatkowe informacje
          ...(discount.appDiscountType && {
            appHandle: discount.appDiscountType.app?.handle,
            appTitle: discount.appDiscountType.app?.title,
            functionId: discount.appDiscountType.functionId,
            discountClass: discount.discountClass
          })
        };
        
        allShopifyDiscounts.push(discountInfo);
        
        if (title && discount.status === 'ACTIVE') {
          activeShopifyDiscounts.add(title);
        }
      });
      
      // Przetwórz kody promocyjne
      shopifyDiscountsData?.codeDiscountNodes?.edges?.forEach(({ node }) => {
        const discount = node.codeDiscount;
        const title = discount.title;
        const code = discount.codes?.nodes?.[0]?.code;
        const discountInfo = {
          id: node.id,
          title: title,
          status: discount.status,
          type: discount.__typename || 'Unknown',
          startsAt: discount.startsAt,
          endsAt: discount.endsAt,
          isAutomatic: false,
          code: code,
          // Dla app discounts - dodatkowe informacje
          ...(discount.appDiscountType && {
            appHandle: discount.appDiscountType.app?.handle,
            appTitle: discount.appDiscountType.app?.title,
            functionId: discount.appDiscountType.functionId,
            discountClass: discount.discountClass
          })
        };
        
        allShopifyDiscounts.push(discountInfo);
        
        if (title && discount.status === 'ACTIVE') {
          activeShopifyDiscounts.add(title);
        }
      });
      
      console.log("🔍 DEBUG: All Shopify discounts found:", allShopifyDiscounts);
      console.log("🔍 DEBUG: Active discount titles:", Array.from(activeShopifyDiscounts));
      console.log("🛍️ Aktywne zniżki w Shopify:", activeShopifyDiscounts.size);
      
      // KROK 2: Pobierz zniżki z pojedynczego JSON metafield (ATOMICZNA OPERACJA)
      const data = await callShopify(`
        query getDiscountMetafield {
          shop {
            metafield(namespace: "taskify_discounts", key: "discounts") {
              value
            }
          }
        }
      `);

      // Parsuj JSON z metafield lub ustaw pustą tablicę jeśli brak danych
      const allDiscounts = JSON.parse(data.shop?.metafield?.value || "[]");
      
      console.log(`📥 Znaleziono ${allDiscounts.length} zniżek w JSON metafield`);
      console.log('🔍 Załadowane zniżki:', allDiscounts);
      
      // 🔍 DEBUG: Pokaż szczegółowe informacje o każdej zniżce z metafield
      allDiscounts.forEach((discount, index) => {
        console.log(`🔍 DEBUG: Metafield discount ${index + 1}:`, {
          id: discount.id,
          description: discount.description,
          shopifyDiscountId: discount.shopifyDiscountId,
          isActive: discount.isActive
        });
      });
      
      // KROK 3: Sprawdź dokładnie które zniżki istnieją w Shopify używając API
      const shopifyDiscountIds = new Set();
      shopifyDiscountsData?.automaticDiscountNodes?.edges?.forEach(({ node }) => {
        shopifyDiscountIds.add(node.id);
      });
      // Dodaj również ID zniżek kodowych do pełnej listy (dla debug/logów)
      shopifyDiscountsData?.codeDiscountNodes?.edges?.forEach(({ node }) => {
        shopifyDiscountIds.add(node.id);
      });

      console.log("🔍 Wszystkie ID zniżek w Shopify:", Array.from(shopifyDiscountIds));

      // KROK 4: Sprawdź każdą zniżkę indywidualnie i zsynchronizuj z Shopify
      const validDiscounts = [];
      const invalidDiscounts = [];

      for (const discount of allDiscounts) {
        // Sprawdź kompletność danych
        const isDataValid = discount.id && discount.description && 
                       discount.minimumAmount !== undefined && 
                       discount.discountPercentage !== undefined;
        
        if (!isDataValid) {
          console.warn(`⚠️ Zniżka o ID ${discount.id} ma niepełne dane:`, discount);
          invalidDiscounts.push(discount);
          continue;
        }
        
        // Jeśli zniżka nie ma shopifyDiscountId, to znaczy że to zniżka czysto lokalna - zachowaj
        if (!discount.shopifyDiscountId) {
          console.log(`📝 Zachowuję lokalną zniżkę: ${discount.description}`);
          validDiscounts.push(discount);
          continue;
        }
        
        // Jeśli ma shopifyDiscountId, sprawdź indywidualnie czy istnieje w Shopify
        console.log(`🔍 Sprawdzam czy zniżka istnieje w Shopify: ${discount.description} (${discount.shopifyDiscountId})`);
        
        try {
          // Użyj uniwersalnej weryfikacji po ID (działa dla automatic i code)
          const exists = await checkDiscountExistsInShopify(discount.shopifyDiscountId);
          if (exists) {
            console.log(`✅ Zniżka istnieje w Shopify: ${discount.description}`);
            validDiscounts.push(discount);
          } else {
            console.warn(`❌ Zniżka nie istnieje w Shopify: ${discount.description} (${discount.shopifyDiscountId})`);
            invalidDiscounts.push(discount);
          }
        } catch (error) {
          console.error(`❌ Błąd sprawdzania zniżki ${discount.description}:`, error);
          const message = (error && error.message) || '';
          // Jeżeli ID jest nieprawidłowe, oznacz jako nieistniejącą (do usunięcia z metafield)
          if (message.includes('invalid id')) {
            console.warn(`🗑️ Oznaczam do usunięcia (invalid id): ${discount.description} (${discount.shopifyDiscountId})`);
            invalidDiscounts.push(discount);
          } else {
            // W innym przypadku zachowaj z ostrożności
            console.log(`🛡️ Zachowuję zniżkę przez ostrożność: ${discount.description}`);
            validDiscounts.push(discount);
          }
        }
      }
      
      // KROK 5: Automatyczne czyszczenie metafields - usuń nieprawidłowe zniżki
      if (invalidDiscounts.length > 0) {
        console.log(`🗑️ Automatyczne usuwanie ${invalidDiscounts.length} nieprawidłowych zniżek z metafields...`);
        
        // Zapisz tylko prawidłowe zniżki (automatycznie usuwa nieprawidłowe)
        await saveIndividualDiscounts(validDiscounts);
        
        
        
        // Loguj szczegóły usuniętych zniżek
        invalidDiscounts.forEach(discount => {
          const reason = !discount.shopifyDiscountId 
            ? "brak shopifyDiscountId" 
            : `nie istnieje w Shopify (${discount.shopifyDiscountId})`;
          console.log(`🗑️ Usunięto: "${discount.description}" - ${reason}`);
        });
      }
      
      // KROK 5.5: Migracja - dodaj brakujące pola do starych zniżek
      const migratedDiscounts = validDiscounts.map(discount => ({
        ...discount,
        visibleInPanel: discount.visibleInPanel !== undefined ? discount.visibleInPanel : true, // Domyślnie true dla starych zniżek
        discountValueType: discount.discountValueType || 'percentage', // Domyślnie percentage dla starych zniżek
        discountAmount: discount.discountAmount || 0 // Domyślnie 0 dla starych zniżek
      }));
      
      console.log("✅ Załadowano prawidłowych zniżek:", migratedDiscounts.length);
      console.log("📋 Finalne zniżki:", migratedDiscounts);
      setPanelDiscounts(migratedDiscounts);
      
      // Zapisz zmigrowane zniżki z nowymi polami
      const needsMigration = migratedDiscounts.some(d => {
        const original = validDiscounts.find(vd => vd.id === d.id);
        return original?.visibleInPanel === undefined || 
               original?.discountValueType === undefined || 
               original?.discountAmount === undefined;
      });
      
      if (needsMigration) {
        console.log("🔄 Zapisywanie zmigrowanych zniżek z nowymi polami...");
        await saveIndividualDiscounts(migratedDiscounts);
      }

      // KROK 6: Automatyczne czyszczenie osieroconych zniżek w Shopify (po pełnym załadowaniu danych)
      try {
        console.log("🧹 Automatyczne czyszczenie osieroconych zniżek z Shopify...");
        
        // Wyczyść osierocone zniżki w Shopify (które nie mają odpowiadających metafields)
        const deletedOrphanedCount = await cleanupOrphanedShopifyDiscounts();
        
        if (deletedOrphanedCount > 0) {
          console.log(`✅ Automatycznie usunięto ${deletedOrphanedCount} osieroconych zniżek z Shopify`);
        } else {
          console.log("✅ Brak osieroconych zniżek do usunięcia z Shopify");
        }
      } catch (cleanupError) {
        console.error('⚠️ Błąd podczas automatycznego czyszczenia osieroconych zniżek:', cleanupError);
        // Nie przerywaj ładowania aplikacji z powodu błędu czyszczenia
      }
      
    } catch (error) {
      console.error('❌ Błąd ładowania zniżek:', error);
      // W przypadku błędu, spróbuj załadować puste dane
      setPanelDiscounts([]);
    }
  };

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

      const uniqueCollectionIds = Array.from(new Set(collectionIds));
      const inputVariablesValue = {
        collectionIds: uniqueCollectionIds
      };
      


      console.log(`🔍 Updating input variables for discount ${discount.name}:`, inputVariablesValue);

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
  // ZAPISYWANIE ZNIŻEK DO POJEDYNCZEGO JSON METAFIELD (SHOPIFY BEST PRACTICE)
  const saveIndividualDiscounts = async (discountsToSave) => {
    try {
      console.log('💾 Saving discounts to a single JSON metafield...');
      console.log('📊 Number of discounts to save:', discountsToSave.length);
      
      // 🔍 DEBUG: Check shop data availability
      let shopContext = shopData;
      console.log("🔍 DEBUG: Shop data availability:", {
        hasShopData: !!shopContext,
        shopId: shopContext?.id,
        shopDomain: shopContext?.domain
      });
      
      // Spróbuj pobrać dane sklepu, jeśli brak ID (np. podczas wczesnego ładowania)
      if (!shopContext?.id) {
        console.warn('⚠️ Missing shop ID - attempting to load shop data before saving...');
        try {
          const shopRes = await callShopify(`
            query getShopIdForSave {
              shop { id currencyCode }
            }
          `);
          if (shopRes?.shop?.id) {
            shopContext = shopRes.shop;
            setShopData(shopRes.shop);
          }
        } catch (e) {
          console.error('❌ Failed to load shop data before saving:', e);
        }
      }
      
      if (!shopContext?.id) {
        console.error("❌ Shop data:", shopContext);
        throw new Error('Missing shop ID - shop data not loaded');
      }

      // Check discount limit (maximum 25 - Shopify limit for automatic discounts)
      if (discountsToSave.length > 25) {
        console.warn('⚠️ Exceeded limit of 25 discounts! Saving only the first 25.');
        
        discountsToSave = discountsToSave.slice(0, 25);
      }

      // Prepare data in a format recommended by Shopify
      const discountsData = discountsToSave.map(discount => {
        // Compute minimumAmount: prefer explicit, otherwise infer from cart_total condition
        const computedMinimumAmount = (() => {
          const hasExplicit = discount.minimumAmount !== undefined && discount.minimumAmount !== null && !isNaN(parseFloat(discount.minimumAmount));
          if (hasExplicit && parseFloat(discount.minimumAmount) > 0) return parseFloat(discount.minimumAmount);
          const cartTotalCondition = (discount.conditions || []).find(
            (c) => c.type === 'cart_total' && (c.operator === 'greater_than_or_equal' || c.operator === 'greater_than')
          );
          return cartTotalCondition && cartTotalCondition.value ? parseFloat(cartTotalCondition.value) || 0 : 0;
        })();

        return ({
          id: discount.id,
          name: discount.name || discount.description,
          description: discount.description,
          discountType: discount.discountType || 'percentage',
          discountClass: discount.discountClass || 'ORDER',
          discountPercentage: discount.discountPercentage || 0,
          discountAmount: discount.discountAmount || 0, // ✅ DODANO
          discountValueType: discount.discountValueType || 'percentage', // ✅ DODANO
          minimumAmount: computedMinimumAmount,
          isActive: discount.isActive !== undefined ? discount.isActive : true,
          createdAt: discount.createdAt || new Date().toISOString(),
          isConditional: discount.isConditional || false,
          conditions: discount.conditions || [],
          shopifyDiscountId: discount.shopifyDiscountId || null,
          // ✅ DODANO: Zapisz ustawienia kombinacji zniżek
          activationMethod: discount.activationMethod || 'automatic',
          discountCode: discount.discountCode || '',
          combinesWith: discount.combinesWith || {
            orderDiscounts: false,
            productDiscounts: false,
            shippingDiscounts: false
          },
          // Opcjonalne pola dla UI
          imageUrl: discount.imageUrl || '',
          lockedIcon: discount.lockedIcon || '',
          backgroundColor: discount.backgroundColor || '',
          backgroundImage: discount.backgroundImage || '',
          visibleInPanel: discount.visibleInPanel !== undefined ? discount.visibleInPanel : true,
          // New: optional checkout message when conditions not met
          checkoutNotMetMessage: typeof discount.checkoutNotMetMessage === 'string' ? discount.checkoutNotMetMessage : ''
        });
      });

      console.log('🔍 Przygotowane dane do zapisania:', discountsData);
      console.log('🔍 DEBUG: Szczegóły pierwszej zniżki:', discountsData[0]);

      // ATOMICZNA OPERACJA: Zapisz wszystkie zniżki w DWÓCH formatach
      // 1. Nowy format dla aplikacji (taskify_discounts.discounts)
      // 2. Stary format dla funkcji rabatowej (taskify_discounts.active_discounts)
      
      // Przygotuj dane w formacie dla funkcji rabatowej
      const functionsData = discountsData
        .filter(discount => discount.isActive && discount.visibleInPanel !== false)
        .map(discount => ({
          id: discount.id,
          createdAt: discount.createdAt || discount.created_at || null,
          title: discount.name || discount.description,
          description: discount.description,
          // Przekaż metodę aktywacji i kod, aby funkcja mogła filtrować po kodzie
          activationMethod: discount.activationMethod || 'automatic',
          discountCode: discount.discountCode || '',
          // Wartość zniżki - obsługa różnych typów
          value: (() => {
            console.log(`🔍 DEBUG: Mapowanie wartości dla zniżki "${discount.description}":`, {
              discountType: discount.discountType,
              discountValueType: discount.discountValueType,
              discountAmount: discount.discountAmount,
              discountPercentage: discount.discountPercentage
            });
            
            if (discount.discountType === 'free_shipping') {
              console.log(`✅ DEBUG: Free shipping - value = 100`);
              return 100;
            } else if (discount.discountValueType === 'fixed_amount') {
              console.log(`✅ DEBUG: Fixed amount - value = ${discount.discountAmount}`);
              return discount.discountAmount;
            } else {
              console.log(`✅ DEBUG: Percentage - value = ${discount.discountPercentage || 0}`);
              return (discount.discountPercentage || 0);
            }
          })(),
          // Dodaj nowe pola dla różnych typów zniżek
          discountValueType: discount.discountValueType || 'percentage',
          discountAmount: discount.discountAmount || 0,
          // Ikony i tła używane przez extension (muszą być tu, bo extension czyta active_discounts)
          imageUrl: typeof discount.imageUrl === 'string' ? discount.imageUrl : '',
          lockedIcon: typeof discount.lockedIcon === 'string' ? discount.lockedIcon : '',
          backgroundColor: typeof discount.backgroundColor === 'string' ? discount.backgroundColor : '',
          backgroundImage: typeof discount.backgroundImage === 'string' ? discount.backgroundImage : '',
          // Zapewnij, że procent istnieje w starym formacie
          discountPercentage: typeof discount.discountPercentage === 'number' ? discount.discountPercentage : (typeof discount.value === 'number' ? discount.value : 0),
          currencyCode: shopContext?.currencyCode || 'USD',
          minimumAmount: discount.minimumAmount,
          active: discount.isActive,
          discountClass: discount.discountClass,
          // DODAJ NOWY SYSTEM WARUNKÓW
          conditions: discount.conditions || [],
          basicConditions: discount.isConditional ? {
            // Konwertuj nowe warunki na stary format
            cartTotalEnabled: discount.conditions.some(c => c.type === 'cart_total'),
            minimumAmount: discount.minimumAmount,
            countryEnabled: discount.conditions.some(c => c.type === 'country'),
            allowedCountries: discount.conditions
              .filter(c => c.type === 'country')
              .map(c => c.value.split(','))
              .flat()
              .filter(Boolean),
            cartQuantityEnabled: discount.conditions.some(c => c.type === 'cart_quantity'),
            minimumQuantity: discount.conditions.find(c => c.type === 'cart_quantity')?.value,
            postalCodeEnabled: discount.conditions.some(c => c.type === 'postal_code'),
            allowedPostalCodes: discount.conditions
              .filter(c => c.type === 'postal_code')
              .map(c => c.value)
              .join(','),
            weightEnabled: discount.conditions.some(c => c.type === 'cart_weight'),
            minWeight: discount.conditions.find(c => c.type === 'cart_weight' && c.operator === 'greater_than_or_equal')?.value,
            maxWeight: discount.conditions.find(c => c.type === 'cart_weight' && c.operator === 'less_than_or_equal')?.value
          } : {},
          // Pass through optional checkout message for downstream usage
          checkoutNotMetMessage: typeof discount.checkoutNotMetMessage === 'string' ? discount.checkoutNotMetMessage : ''
        }));

      console.log('🔍 DEBUG: functionsData (dane dla funkcji Shopify):', functionsData);

      const result = await callShopify(`
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        metafields: [
          {
            // Nowy format dla aplikacji
          ownerId: shopContext.id,
          namespace: "taskify_discounts",
          key: "discounts",
          type: "json",
          value: JSON.stringify(discountsData)
          },
          {
            // Stary format dla funkcji rabatowej
            ownerId: shopContext.id,
            namespace: "taskify_discounts",
            key: "active_discounts",
            type: "json",
            value: JSON.stringify(functionsData)
          }
        ]
      });

      // Sprawdź błędy
      if (result.metafieldsSet?.userErrors?.length > 0) {
        throw new Error(result.metafieldsSet.userErrors[0].message);
      }

      console.log("✅ Wszystkie zniżki zapisane atomicznie w pojedynczym JSON metafield");
      
      // Aktualizuj input variables metafield dla zniżek z warunkami kolekcji
      const discountsWithCollectionConditions = discountsToSave.filter(discount => {
        return discount.conditions?.some(condition => 
          condition.type === 'cart_contains' && 
          ['only_these_collections', 'at_least_one_collection', 'no_products_from_collections'].includes(condition.operator)
        );
      });
      
      if (discountsWithCollectionConditions.length > 0) {
      console.log(`🔄 Updating input variables for ${discountsWithCollectionConditions.length} discounts with collection conditions...`);
        
        // Update metafield for each discount with collection conditions
        for (const discount of discountsWithCollectionConditions) {
          await updateDiscountInputVariables(discount);
        }
      }
      
      
      
    } catch (error) {
      console.error('❌ Error saving discounts:', error);
      showToast('Error saving discounts: ' + error.message);
    }
  };
  // Bulk create 50 test discounts for load testing
  const handleCreateFiftyDiscounts = async () => {
    try {
      setIsCreatingTestDiscounts(true);
      const now = new Date().toISOString();
      const currency = shopData?.currencyCode || 'USD';
      // Generate 50 basic order discounts
      const newOnes = Array.from({ length: 50 }).map((_, i) => ({
        id: `local-${Date.now()}-${i}`,
        description: `Test discount #${i + 1}`,
        minimumAmount: 10,
        discountType: 'order',
        discountValueType: 'percentage',
        discountPercentage: 5,
        discountAmount: 0,
        currencyCode: currency,
        isActive: true,
        isConditional: false,
        conditions: [],
        visibleInPanel: true,
        createdAt: now,
        imageUrl: '',
        lockedIcon: '',
      }));

      const updatedDiscounts = [...panelDiscounts, ...newOnes];
      setPanelDiscounts(updatedDiscounts);
      setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
      await saveIndividualDiscounts(updatedDiscounts);
      setHasUnsavedChanges(true);
      showToast('Created 50 test discounts');
    } catch (e) {
      console.error('Error while creating test discounts:', e);
      showToast('Error while creating test discounts: ' + e.message);
    } finally {
      setIsCreatingTestDiscounts(false);
    }
  };

  // FUNKCJA DO PRZEŁĄCZANIA WIDOCZNOŚCI ZNIŻKI W PANELU EXTENSION
  const toggleDiscountVisibility = useCallback(async (discountId) => {
    try {
      const updatedDiscounts = panelDiscounts.map(discount => 
        discount.id === discountId 
          ? { ...discount, visibleInPanel: !discount.visibleInPanel }
          : discount
      );
      
      setPanelDiscounts(updatedDiscounts);
      setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
      
      // Zapisz zmiany do metafields
      await saveIndividualDiscounts(updatedDiscounts);
      
      const updatedDiscount = updatedDiscounts.find(d => d.id === discountId);
      
      
    } catch (error) {
      console.error('Error toggling discount visibility:', error);
      showToast('Error updating discount visibility: ' + error.message);
    }
  }, [panelDiscounts, saveIndividualDiscounts]);
  // FUNKCJA DO BULK PRZEŁĄCZANIA WIDOCZNOŚCI ZNIŻEK W PANELU EXTENSION
  const bulkToggleVisibility = useCallback(async (visible) => {
    try {
      const updatedDiscounts = panelDiscounts.map(discount => 
        selectedDiscounts.includes(discount.id)
          ? { ...discount, visibleInPanel: visible }
          : discount
      );
      
      setPanelDiscounts(updatedDiscounts);
      setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
      
      // Zapisz zmiany do metafields
      await saveIndividualDiscounts(updatedDiscounts);
      
      setSelectedDiscounts([]); // Wyczyść zaznaczenie
      
      
    } catch (error) {
      console.error('Error bulk toggling discount visibility:', error);
      showToast('Error updating discount visibility: ' + error.message);
    }
  }, [panelDiscounts, selectedDiscounts, saveIndividualDiscounts]);
  // LOADING PANEL SETTINGS FROM SHOPIFY METAFIELDS
  const loadPanelSettings = async () => {
    try {
      console.log("🔄 Loading panel settings from Shopify...");
      
      const data = await callShopify(`
        query getPanelSettings {
          shop {
            id
            currencyCode
            panelVisibilityMode: metafield(namespace: "taskify_panel", key: "panel_visibility_mode") { value }
            panelVisibilityEnabled: metafield(namespace: "taskify_panel", key: "panel_visibility_enabled") { value }
            panelVisibilityConditions: metafield(namespace: "taskify_panel", key: "panel_visibility_conditions") { value type }
            metafields(first: 250, namespace: "taskify_panel") {
              edges {
                node {
                  key
                  value
                  type
                }
              }
            }
          }
        }
      `);

      const metafields = data.shop?.metafields?.edges || [];
      console.log("📋 Panel metafields found:", metafields.map(({ node }) => ({ key: node.key, value: node.value })));
      
      // Sprawdź czy start_guide_expanded i preview_expanded istnieją w metafields
      const startGuideMetafield = metafields.find(({ node }) => node.key === 'start_guide_expanded');
      const previewExpandedMetafield = metafields.find(({ node }) => node.key === 'preview_expanded');
      console.log("🔍 Start guide metafield found:", startGuideMetafield ? startGuideMetafield.node.value : 'NOT FOUND');
      console.log("🔍 Preview expanded metafield found:", previewExpandedMetafield ? previewExpandedMetafield.node.value : 'NOT FOUND');
      
      const updatedSettings = { ...panelSettings };
      
      metafields.forEach(({ node }) => {
        switch(node.key) {
          // Basic appearance
          case 'achieved_color':
            updatedSettings.achievedColor = node.value;
            break;
          case 'locked_color':
            updatedSettings.lockedColor = node.value;
            break;
          case 'progress_bar_color':
            updatedSettings.progressBarColor = node.value;
            break;
          case 'border_radius':
            updatedSettings.borderRadius = node.value;
            break;
          case 'banner_color':
            updatedSettings.bannerColor = node.value;
            break;
          case 'text_color':
            updatedSettings.textColor = node.value;
            break;
          case 'font_size':
            updatedSettings.fontSize = node.value;
            break;
            
          // Shadow and spacing
          case 'shadow_intensity':
            updatedSettings.shadowIntensity = node.value;
            break;
          case 'discount_spacing':
            updatedSettings.discountSpacing = node.value;
            break;
          case 'row_gap':
            updatedSettings.rowGap = node.value;
            break;
          case 'row_height':
            updatedSettings.rowHeight = node.value;
            break;
            
          // Colors and styling  
          case 'row_separator_color':
            updatedSettings.rowSeparatorColor = node.value;
            break;
                  case 'scrollbar_background':
          updatedSettings.scrollbarBackground = node.value;
          break;
        case 'scrollbar_thumb_margin':
          updatedSettings.scrollbarThumbMargin = node.value;
          break;
        case 'scrollbar_width':
          updatedSettings.scrollbarWidth = node.value;
          break;
        case 'scrollbar_thumb_color':
          updatedSettings.scrollbarThumbColor = node.value;
          break;
        case 'scrollbar_thumb_hover_color':
          updatedSettings.scrollbarThumbHoverColor = node.value;
          break;
        case 'scrollbar_border_radius':
          updatedSettings.scrollbarBorderRadius = node.value;
          break;
        case 'scrollbar_thumb_border_radius':
          updatedSettings.scrollbarThumbBorderRadius = node.value;
          break;
          case 'cart_value_font_size':
            updatedSettings.cartValueFontSize = node.value;
            break;
          case 'cart_value_height':
            updatedSettings.cartValueHeight = node.value;
            break;
          case 'remaining_amount_font_size':
            updatedSettings.remainingAmountFontSize = node.value;
            break;
          case 'description_font_size':
            updatedSettings.descriptionFontSize = node.value;
            break;
          case 'minimum_amount_font_size':
            updatedSettings.minimumAmountFontSize = node.value;
            break;
          case 'footer_font_size':
            updatedSettings.footerFontSize = node.value;
            break;
          case 'footer_text_color':
            updatedSettings.footerTextColor = node.value;
            break;
          case 'status_message_background':
            updatedSettings.statusMessageBackground = node.value;
            break;
          case 'status_message_text_color':
            updatedSettings.statusMessageTextColor = node.value;
            break;
          case 'cart_value_background':
            updatedSettings.cartValueBackground = node.value;
            break;
          case 'cart_value_text_color':
            updatedSettings.cartValueTextColor = node.value;
            break;
            
          // Text content
          case 'banner_text':
            updatedSettings.bannerText = node.value;
            break;
          case 'achieved_text':
            updatedSettings.achievedText = node.value;
            break;
          case 'missing_text':
            updatedSettings.missingText = node.value;
            break;
          case 'highest_discount_text':
            updatedSettings.highestDiscountText = node.value;
            break;
          case 'missing_for_discount_text':
            updatedSettings.missingForDiscountText = node.value;
            break;
          case 'no_discounts_text':
            updatedSettings.noDiscountsText = node.value;
            break;
          case 'required_text':
            updatedSettings.requiredText = node.value;
            break;
          case 'cart_value_text':
            updatedSettings.cartValueText = node.value;
            break;
          case 'highest_discount_text':
            updatedSettings.highestDiscountText = node.value;
            break;
          case 'missing_for_discount_text':
            updatedSettings.missingForDiscountText = node.value;
            break;
          case 'footer_content':
            updatedSettings.footerContent = node.value;
            break;
          case 'close_button_background':
            updatedSettings.closeButtonBackground = node.value;
            break;
          case 'close_button_background_image':
            updatedSettings.closeButtonBackgroundImage = node.value;
            break;
          case 'close_button_size':
            updatedSettings.closeButtonSize = node.value;
            break;
          case 'close_button_position':
            updatedSettings.closeButtonPosition = node.value;
            break;
          case 'close_button_offset_x':
            updatedSettings.closeButtonOffsetX = node.value;
            break;
          case 'close_button_offset_y':
            updatedSettings.closeButtonOffsetY = node.value;
            break;
          case 'header_text_align':
            updatedSettings.headerTextAlign = node.value;
            break;
          case 'subheader_text_align':
            updatedSettings.subheaderTextAlign = node.value;
            break;
          case 'footer_text_align':
            updatedSettings.footerTextAlign = node.value;
            break;
          case 'error_no_discounts_text':
            updatedSettings.errorNoDiscountsText = node.value;
            break;
          case 'error_loading_text':
            updatedSettings.errorLoadingText = node.value;
            break;
            
          // Circle button settings
          case 'circle_size':
            updatedSettings.circleSize = node.value;
            break;
          case 'circle_position':
            updatedSettings.circlePosition = node.value;
            break;
          case 'circle_offset_x':
            updatedSettings.circleOffsetX = node.value;
            break;
          case 'circle_offset_y':
            updatedSettings.circleOffsetY = node.value;
            break;
          case 'circle_background_color':
            updatedSettings.circleBackgroundColor = node.value;
            break;
          case 'circle_image_url':
            updatedSettings.circleImageUrl = node.value;
            break;
            
          // Layout settings
          case 'max_panel_width':
            updatedSettings.maxPanelWidth = node.value;
            break;
          case 'panel_margin':
            updatedSettings.panelMargin = node.value;
            break;
          case 'panel_height':
            updatedSettings.panelHeight = node.value;
            break;
          case 'remaining_amount_height':
            updatedSettings.remainingAmountHeight = node.value;
            break;
            
          // Footer settings
          case 'show_footer':
            updatedSettings.showFooter = node.value === 'true';
            break;
          case 'show_highest_discount_message':
            updatedSettings.showHighestDiscountMessage = node.value === 'true';
            break;
          case 'footer_background':
            updatedSettings.footerBackground = node.value;
            break;
          case 'footer_height':
            updatedSettings.footerHeight = node.value;
            break;
          case 'cart_value_font_size':
            updatedSettings.cartValueFontSize = node.value;
            break;
          case 'cart_value_height':
            updatedSettings.cartValueHeight = node.value;
            break;
          case 'cart_value_padding':
            updatedSettings.cartValuePadding = node.value;
            break;
          case 'highest_discount_font_size':
            updatedSettings.highestDiscountFontSize = node.value;
            break;
          case 'highest_discount_padding':
            updatedSettings.highestDiscountPadding = node.value;
            break;
          case 'footer_font_size':
            updatedSettings.footerFontSize = node.value;
            break;
          case 'footer_padding':
            updatedSettings.footerPadding = node.value;
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
          case 'footer_content':
            updatedSettings.footerContent = node.value;
            break;
            
          // Font sizes
          case 'icon_size':
            updatedSettings.iconSize = node.value;
            break;
          case 'description_font_size':
            updatedSettings.descriptionFontSize = node.value;
            break;
          case 'minimum_amount_font_size':
            updatedSettings.minimumAmountFontSize = node.value;
            break;
            
          // Boolean settings
          case 'show_achieved_text':
            updatedSettings.showAchievedText = node.value === 'true';
            break;
          case 'show_missing_amount':
            updatedSettings.showMissingAmount = node.value === 'true';
            break;
          case 'show_cart_value':
            updatedSettings.showCartValue = node.value === 'true';
            break;
            
          // Other settings
          case 'icon_style':
            updatedSettings.iconStyle = node.value;
            break;
              case 'discount_order':
            updatedSettings.discountOrder = node.value;
            break;
          case 'custom_discount_order':
            try {
              updatedSettings.customDiscountOrder = JSON.parse(node.value || '[]');
            } catch (e) {
              updatedSettings.customDiscountOrder = [];
            }
            break;
          
          case 'row_separator_width':
            updatedSettings.rowSeparatorWidth = node.value;
            break;
          case 'top_offset':
            updatedSettings.topOffset = node.value;
            break;
          case 'panel_visibility_enabled':
            updatedSettings.panelVisibilityEnabled = node.value === 'true';
            break;
          case 'panel_visibility_logged_in':
            updatedSettings.panelVisibilityLoggedIn = node.value || 'any';
            break;
          case 'panel_visibility_countries':
            try { updatedSettings.panelVisibilityCountries = JSON.parse(node.value || '[]'); }
            catch { updatedSettings.panelVisibilityCountries = []; }
            break;
          case 'panel_visibility_mode':
            updatedSettings.panelVisibilityMode = (node.value || 'always').toString().trim().toLowerCase();
            break;
          case 'panel_visibility_conditions':
            try { updatedSettings.panelVisibilityConditions = JSON.parse(node.value || '[]'); }
            catch { updatedSettings.panelVisibilityConditions = []; }
            break;
          case 'sort_by_selection':
            updatedSettings.sortBySelection = node.value || '';
            break;
            
          // Border Glow settings
          case 'border_glow':
            updatedSettings.borderGlow = node.value;
            break;
          case 'border_glow_size':
            updatedSettings.borderGlowSize = node.value;
            break;
          case 'border_glow_color':
            updatedSettings.borderGlowColor = node.value;
            break;
          case 'border_glow_speed':
            updatedSettings.borderGlowSpeed = node.value;
            break;
          case 'border_glow_intensity':
            updatedSettings.borderGlowIntensity = node.value;
            break;
          case 'border_glow_pulse':
            updatedSettings.borderGlowPulse = node.value === 'true';
            break;
            
          // Individual discount row settings
          case 'default_locked_icon':
            updatedSettings.defaultLockedIcon = node.value;
            break;
          case 'row_hover_effect':
            updatedSettings.rowHoverEffect = node.value;
            break;
          case 'row_hover_color':
            updatedSettings.rowHoverColor = node.value;
            break;
                  case 'row_hover_scale':
          updatedSettings.rowHoverScale = node.value;
          break;
        case 'header_text_font':
          updatedSettings.headerTextFont = node.value;
          break;
        case 'subheader_text_font':
          updatedSettings.subheaderTextFont = node.value;
          break;
        case 'footer_text_font':
          updatedSettings.footerTextFont = node.value;
          break;
        case 'achieved_text_font':
          updatedSettings.achievedTextFont = node.value;
          break;
        case 'missing_text_font':
          updatedSettings.missingTextFont = node.value;
          break;
        case 'start_guide_expanded':
          updatedSettings.startGuideExpanded = node.value === 'true';
          setExpanded(node.value === 'true');
          break;
        case 'preview_expanded':
          console.log("🔄 Processing preview_expanded metafield, value:", node.value);
          updatedSettings.previewExpanded = node.value === 'true';
          setPreviewExpanded(node.value === 'true');
          console.log("🔄 Set previewExpanded to:", node.value === 'true');
          break;
        case 'panel_enabled':
          updatedSettings.panelEnabled = node.value === 'true';
          break;
            
          // Data - ładowanie zniżek z indywidualnych metafields
          case 'manual_discounts':
            try {
              updatedSettings.discounts = JSON.parse(node.value);
              setPanelDiscounts(JSON.parse(node.value));
            } catch (e) {
              updatedSettings.discounts = [];
              setPanelDiscounts([]);
            }
            break;
          case 'dismissed_banners':
            try {
              const dismissedList = JSON.parse(node.value);
              updatedSettings.dismissedBanners = dismissedList;
              setDismissedBannersState(new Set(dismissedList));
            } catch (e) {
              updatedSettings.dismissedBanners = [];
              setDismissedBannersState(new Set());
            }
            break;
        }
      });

      // Merge direct-access metafields (handles pagination cases)
      try {
        const pm = data.shop?.panelVisibilityMode?.value;
        const pe = data.shop?.panelVisibilityEnabled?.value;
        const pc = data.shop?.panelVisibilityConditions?.value;
        if (typeof pm === 'string' && pm.trim()) {
          updatedSettings.panelVisibilityMode = pm.toString().trim().toLowerCase();
        }
        if (typeof pe === 'string') {
          updatedSettings.panelVisibilityEnabled = pe === 'true';
        }
        if (typeof pc === 'string' && pc.trim()) {
          try { updatedSettings.panelVisibilityConditions = JSON.parse(pc); } catch { /* ignore */ }
        }
      } catch (e) { /* ignore */ }

      // Jeżeli brak tekstów (usunięte), ustaw puste stringi w stanie,
      // aby inputy/preview były puste (preview ma fallback na spację przy renderze)
      const hasHeaderTextMetafield = metafields.some(({ node }) => node.key === 'cart_value_text');
      if (!hasHeaderTextMetafield) {
        updatedSettings.cartValueText = '';
      }
      const hasHighestText = metafields.some(({ node }) => node.key === 'highest_discount_text');
      if (!hasHighestText) {
        updatedSettings.highestDiscountText = '';
      }
      const hasMissingForText = metafields.some(({ node }) => node.key === 'missing_for_discount_text');
      if (!hasMissingForText) {
        updatedSettings.missingForDiscountText = '';
      }
      const hasFooterContent = metafields.some(({ node }) => node.key === 'footer_content');
      if (!hasFooterContent) {
        updatedSettings.footerContent = '';
      }
      
      // Fallback: jeśli brak 'panel_visibility_mode', wywnioskuj z 'panel_visibility_enabled'
      const hasPanelVisibilityMode = metafields.some(({ node }) => node.key === 'panel_visibility_mode');
      if (!hasPanelVisibilityMode) {
        if (typeof updatedSettings.panelVisibilityEnabled === 'boolean') {
          updatedSettings.panelVisibilityMode = updatedSettings.panelVisibilityEnabled ? 'conditional' : 'always';
        }
      }
      // Heurystyka: jeśli są warunki i włączone reguły, wymuś 'conditional'
      if (
        updatedSettings.panelVisibilityMode !== 'conditional' &&
        updatedSettings.panelVisibilityEnabled === true &&
        Array.isArray(updatedSettings.panelVisibilityConditions) &&
        updatedSettings.panelVisibilityConditions.length > 0
      ) {
        updatedSettings.panelVisibilityMode = 'conditional';
      }
      
      setPanelSettings(updatedSettings);
      try {
        console.log('PANEL_VIS_DEBUG loaded', {
          modeRaw: updatedSettings.panelVisibilityMode,
          enabledRaw: updatedSettings.panelVisibilityEnabled,
          conditionsRaw: updatedSettings.panelVisibilityConditions,
        });
      } catch (e) { /* ignore */ }
      // Ustaw sortBy z metadanych (utrzymaj 'custom' po odświeżeniu)
  try {
    if (updatedSettings.sortBySelection) {
      setSortBy(updatedSettings.sortBySelection);
    } else if (updatedSettings.discountOrder) {
      setSortBy(updatedSettings.discountOrder);
    }
  } catch (e) {}
      setLastSavedSettings(updatedSettings); // Save as last saved settings
      
      // Jeśli start guide expanded nie był ustawiony w metafields, ustaw domyślną wartość
      if (!startGuideMetafield) {
        console.log("🔄 Start guide expanded nie znaleziony w metafields, ustawiam domyślną wartość: true");
        setExpanded(true);
      }
      
      // Jeśli preview expanded nie był ustawiony w metafields, ustaw domyślną wartość
      if (!previewExpandedMetafield) {
        console.log("🔄 Preview expanded nie znaleziony w metafields, ustawiam domyślną wartość: false");
        setPreviewExpanded(false);
      }
      
      console.log("✅ Panel settings loaded successfully");
      
    } catch (error) {
      console.error('❌ Error loading panel settings:', error);
    }
  };
  // SAVING PANEL SETTINGS TO SHOPIFY METAFIELDS
  // ZAPISYWANIE RABATÓW DO SHOPIFY FUNCTIONS
  const saveDiscountsToMetafields = async (discountsToSave) => {
    try {
      console.log('💾 Zapisywanie rabatów do metafields dla Shopify Functions');
      
      // Mapowanie rabatów do formatu oczekiwanego przez Shopify Functions
      const mappedDiscounts = discountsToSave.map(discount => {
        const mappedDiscount = {
          id: discount.id,
          description: discount.description || discount.title || `Rabat ${discount.discountPercentage || 'free shipping'}%`,
          type: discount.discountType === 'free_shipping' ? 'free_shipping' : 'percentage',
          // Wartość zniżki - obsługa różnych typów
          value: discount.discountType === 'free_shipping' ? 100 : 
                 discount.discountValueType === 'fixed_amount' ? parseFloat(discount.discountAmount || 0) : 
                 parseFloat(discount.discountPercentage || 0),
          // Dodaj nowe pola dla różnych typów zniżek
          discountValueType: discount.discountValueType || 'percentage',
          discountAmount: parseFloat(discount.discountAmount || 0),
          discountPercentage: parseFloat(discount.discountPercentage || 0),
          currencyCode: shopData?.currencyCode || 'USD',
          minimumAmount: parseFloat(discount.minimumAmount || 0),
          active: discount.status === 'ACTIVE' || discount.isActive === true,
          // Określ klasę rabatu na podstawie typu i wyboru użytkownika
          discountClass: discount.discountType === 'free_shipping' ? 'SHIPPING' : 
                        discount.discountClass || 'ORDER',
          createdAt: discount.createdAt || new Date().toISOString(),
          // Dodaj zaawansowane warunki jeśli istnieją
          basicConditions: discount.basicConditions || {},
          // Dodaj nowe warunki jeśli istnieją  
          conditions: discount.conditions || [],
          // Panel icon fields used by the storefront extension
          imageUrl: typeof discount.imageUrl === 'string' ? discount.imageUrl : (typeof discount.iconUrl === 'string' ? discount.iconUrl : ''),
          // Backward/compat alias fields
          iconUrl: typeof discount.imageUrl === 'string' ? discount.imageUrl : (typeof discount.iconUrl === 'string' ? discount.iconUrl : ''),
          icon: typeof discount.imageUrl === 'string' ? discount.imageUrl : (typeof discount.icon === 'string' ? discount.icon : ''),
          lockedIcon: typeof discount.lockedIcon === 'string' ? discount.lockedIcon : (typeof discount.lockedImageUrl === 'string' ? discount.lockedImageUrl : ''),
          lockedImageUrl: typeof discount.lockedIcon === 'string' ? discount.lockedIcon : (typeof discount.lockedImageUrl === 'string' ? discount.lockedImageUrl : '')
        };
        
        console.log('🔄 Mapped discount:', mappedDiscount);
        return mappedDiscount;
      });

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
              code
            }
          }
        }
      `;

      const variables = {
        metafields: [
          {
            namespace: 'taskify_discounts',
            key: 'active_discounts',
            value: JSON.stringify(mappedDiscounts),
            type: 'json',
            ownerId: shopData.id
          }
        ]
      };

      const result = await callShopify(mutation, variables);
      
      if (result.metafieldsSet.userErrors.length > 0) {
        throw new Error(result.metafieldsSet.userErrors.map(e => e.message).join(', '));
      }

      // Debug info dla sprawdzenia czy metafield został zapisany
      console.log('🔍 METAFIELD DEBUG - Dane które zapisuję:');
      console.log('📊 Namespace:', 'taskify_discounts');
      console.log('🔑 Key:', 'active_discounts');
      console.log('💾 Value:', JSON.stringify(mappedDiscounts, null, 2));
      console.log('🏪 Shop ID:', shopData.id);
      
      if (result.metafieldsSet.metafields.length > 0) {
        console.log('✅ Metafield saved:', result.metafieldsSet.metafields[0]);
      } else {
        console.log('❌ Metafield was NOT saved');
      }

      console.log('✅ Discounts saved to metafields (taskify_discounts.active_discounts)');
      console.log('📊 Saved discounts:', mappedDiscounts);
      
    } catch (error) {
      console.error('❌ Error saving discounts to metafields:', error);
      showToast('Shopify Functions sync error: ' + error.message);
    }
  };
  // Validate panel visibility conditions before saving
  const isValidPanelVisibilityCondition = (condition) => {
    if (!condition || !condition.type) return false;
    // Types that do not require a value
    if (condition.type === 'customer_logged_in') return true;
    // For numeric types require a finite number
    if (['cart_total', 'cart_quantity', 'cart_weight', 'order_count'].includes(condition.type)) {
      const num = parseFloat(condition.value);
      return Number.isFinite(num);
    }
    // For string-based types require non-empty string
    if (['country', 'postal_code', 'customer_tags', 'cart_contains'].includes(condition.type)) {
      return typeof condition.value === 'string' && condition.value.trim() !== '';
    }
    // Default: require non-empty value
    return condition.value !== undefined && String(condition.value).trim() !== '';
  };
  const savePanelSettings = async (settingsToSave) => {
    console.log("🔄 savePanelSettings function called with:", settingsToSave);
    
    if (!shopData?.id) {
      console.log("❌ No shopData.id, aborting save");
      return;
    }
    
    try {
      setIsSavingPanelSettings(true);
      console.log("💾 Saving panel settings to Shopify...");
      console.log("🔍 Current lastSavedSettings:", lastSavedSettings);
      // Coerce blank single_line_text fields to a single space to avoid Shopify "value can't be blank"
      const NBSP = '\u00A0';
      const coerceBlank = (v) => (typeof v === 'string' && v.trim() === '' ? NBSP : (v === undefined || v === null ? NBSP : v));
      // Do NOT coerce texts that we handle via delete-on-blank (header/subheader/footer)
      // Leave other non-critical fields coercible if needed in future
      
      // Compare current settings with last saved and find changes
      const changedFields = [];
      const fieldsToDelete = [];
      
      // Mapping fields to metafield keys
      const fieldMappings = [
        { field: 'panelEnabled', key: 'panel_enabled' },
        { field: 'achievedColor', key: 'achieved_color' },
        { field: 'lockedColor', key: 'locked_color' },
        { field: 'progressBarColor', key: 'progress_bar_color' },
        { field: 'borderRadius', key: 'border_radius' },
        { field: 'bannerColor', key: 'banner_color' },
        { field: 'textColor', key: 'text_color' },
        { field: 'fontSize', key: 'font_size' },
        { field: 'shadowIntensity', key: 'shadow_intensity' },
        { field: 'discountSpacing', key: 'discount_spacing' },
        { field: 'rowGap', key: 'row_gap' },
        { field: 'rowHeight', key: 'row_height' },
        { field: 'rowSeparatorColor', key: 'row_separator_color' },
              { field: 'scrollbarBackground', key: 'scrollbar_background' },
      { field: 'scrollbarThumbMargin', key: 'scrollbar_thumb_margin' },
      { field: 'scrollbarWidth', key: 'scrollbar_width' },
      { field: 'scrollbarThumbColor', key: 'scrollbar_thumb_color' },
      { field: 'scrollbarThumbHoverColor', key: 'scrollbar_thumb_hover_color' },
      { field: 'scrollbarBorderRadius', key: 'scrollbar_border_radius' },
      { field: 'scrollbarThumbBorderRadius', key: 'scrollbar_thumb_border_radius' },
        { field: 'cartValueFontSize', key: 'cart_value_font_size' },
        { field: 'cartValueHeight', key: 'cart_value_height' },
        { field: 'remainingAmountFontSize', key: 'remaining_amount_font_size' },
        { field: 'descriptionFontSize', key: 'description_font_size' },
        { field: 'minimumAmountFontSize', key: 'minimum_amount_font_size' },
        { field: 'footerFontSize', key: 'footer_font_size' },
        { field: 'footerTextColor', key: 'footer_text_color' },
        { field: 'statusMessageBackground', key: 'status_message_background' },
        { field: 'statusMessageTextColor', key: 'status_message_text_color' },
        { field: 'cartValueBackground', key: 'cart_value_background' },
        { field: 'cartValueTextColor', key: 'cart_value_text_color' },
        { field: 'bannerText', key: 'banner_text' },
        { field: 'achievedText', key: 'achieved_text' },
        { field: 'missingText', key: 'missing_text' },
        { field: 'highestDiscountText', key: 'highest_discount_text' },
        { field: 'missingForDiscountText', key: 'missing_for_discount_text' },
        { field: 'noDiscountsText', key: 'no_discounts_text' },
        { field: 'requiredText', key: 'required_text' },
        { field: 'cartValueText', key: 'cart_value_text' },
        { field: 'closeButtonBackground', key: 'close_button_background' },
        { field: 'closeButtonBackgroundImage', key: 'close_button_background_image' },
        { field: 'closeButtonSize', key: 'close_button_size' },
        { field: 'closeButtonPosition', key: 'close_button_position' },
        { field: 'closeButtonOffsetX', key: 'close_button_offset_x' },
        { field: 'closeButtonOffsetY', key: 'close_button_offset_y' },
        { field: 'headerTextAlign', key: 'header_text_align' },
        { field: 'subheaderTextAlign', key: 'subheader_text_align' },
        { field: 'footerTextAlign', key: 'footer_text_align' },
        { field: 'errorNoDiscountsText', key: 'error_no_discounts_text' },
        { field: 'errorLoadingText', key: 'error_loading_text' },
        { field: 'circleSize', key: 'circle_size' },
        { field: 'circlePosition', key: 'circle_position' },
        { field: 'circleOffsetX', key: 'circle_offset_x' },
        { field: 'circleOffsetY', key: 'circle_offset_y' },
        { field: 'circleBackgroundColor', key: 'circle_background_color' },
        { field: 'circleImageUrl', key: 'circle_image_url' },
        { field: 'maxPanelWidth', key: 'max_panel_width' },
        { field: 'panelMargin', key: 'panel_margin' },
        { field: 'panelHeight', key: 'panel_height' },
        { field: 'remainingAmountHeight', key: 'remaining_amount_height' },
        { field: 'footerBackground', key: 'footer_background' },
        { field: 'footerHeight', key: 'footer_height' },
        { field: 'footerContent', key: 'footer_content' },
        // Block specific settings
        { field: 'cartValueFontSize', key: 'cart_value_font_size' },
        { field: 'cartValueHeight', key: 'cart_value_height' },
        { field: 'cartValuePadding', key: 'cart_value_padding' },
        { field: 'highestDiscountFontSize', key: 'highest_discount_font_size' },
        { field: 'highestDiscountPadding', key: 'highest_discount_padding' },
        { field: 'footerFontSize', key: 'footer_font_size' },
        { field: 'footerPadding', key: 'footer_padding' },
        { field: 'cartValueBackgroundImage', key: 'cart_value_background_image' },
        { field: 'highestDiscountBackgroundImage', key: 'highest_discount_background_image' },
        { field: 'footerBackgroundImage', key: 'footer_background_image' },
        { field: 'iconSize', key: 'icon_size' },
        { field: 'descriptionFontSize', key: 'description_font_size' },
        { field: 'minimumAmountFontSize', key: 'minimum_amount_font_size' },
        { field: 'iconStyle', key: 'icon_style' },
        { field: 'discountOrder', key: 'discount_order' },
        { field: 'sortBySelection', key: 'sort_by_selection' },
        { field: 'rowSeparatorWidth', key: 'row_separator_width' },
        { field: 'topOffset', key: 'top_offset' },
        // Panel Visibility
        { field: 'panelVisibilityEnabled', key: 'panel_visibility_enabled' },
        { field: 'panelVisibilityLoggedIn', key: 'panel_visibility_logged_in' },
        { field: 'panelVisibilityCountries', key: 'panel_visibility_countries' },
        // Save explicit mode AND enable flag for compatibility with older themes
        { field: 'panelVisibilityMode', key: 'panel_visibility_mode' },
        { field: 'panelVisibilityEnabled', key: 'panel_visibility_enabled' },
        { field: 'panelVisibilityConditions', key: 'panel_visibility_conditions' },
        // Border Glow settings
        { field: 'borderGlow', key: 'border_glow' },
        { field: 'borderGlowSize', key: 'border_glow_size' },
        { field: 'borderGlowColor', key: 'border_glow_color' },
        { field: 'borderGlowSpeed', key: 'border_glow_speed' },
        { field: 'borderGlowIntensity', key: 'border_glow_intensity' },
        // Individual discount row settings
        { field: 'defaultLockedIcon', key: 'default_locked_icon' },
        { field: 'rowHoverEffect', key: 'row_hover_effect' },
        { field: 'rowHoverColor', key: 'row_hover_color' },
        { field: 'rowHoverScale', key: 'row_hover_scale' },
        { field: 'headerTextFont', key: 'header_text_font' },
        { field: 'subheaderTextFont', key: 'subheader_text_font' },
        { field: 'footerTextFont', key: 'footer_text_font' },
        { field: 'achievedTextFont', key: 'achieved_text_font' },
        { field: 'missingTextFont', key: 'missing_text_font' },

      ];

      // Optional image URL fields - if cleared, delete metafield instead of saving blank
      const imageFields = new Set([
        'cartValueBackgroundImage',
        'highestDiscountBackgroundImage',
        'footerBackgroundImage',
        'circleImageUrl',
        'closeButtonBackgroundImage'
      ]);

      // Text fields that should save a single space instead of an empty string
      // to avoid Shopify "value can't be blank" errors for single_line_text_field
      const blankableTextKeys = new Set([]);

      // Check changes in regular fields
      fieldMappings.forEach(({ field, key }) => {
        const newValue = settingsToSave[field];
        const oldValue = lastSavedSettings[field];
        if (newValue !== oldValue) {
          // Special rule: if header/subheader/footer text is blank, delete metafield instead of saving
          if (key === 'cart_value_text' || key === 'highest_discount_text' || key === 'missing_for_discount_text' || key === 'footer_content') {
            const isBlank = newValue === undefined || newValue === null || newValue.toString().trim() === '';
            if (isBlank) {
              fieldsToDelete.push({ ownerId: shopData.id, namespace: 'taskify_panel', key });
              return;
            }
          }
          if (imageFields.has(field)) {
            const isNowEmpty = newValue === undefined || newValue === null || newValue.toString().trim() === '';
            const wasNonEmpty = oldValue !== undefined && oldValue !== null && oldValue.toString().trim() !== '';
            if (isNowEmpty) {
              if (wasNonEmpty) {
                fieldsToDelete.push({ ownerId: shopData.id, namespace: 'taskify_panel', key });
              }
              return; // don't write blank value
            }
          }
          let valueToSave = (blankableTextKeys.has(key) && (newValue === undefined || newValue === null || newValue.toString().trim() === ''))
            ? '\u00A0'
            : (newValue != null ? newValue.toString() : '');
          if (key === 'panel_visibility_countries') {
            valueToSave = JSON.stringify(settingsToSave.panelVisibilityCountries || []);
          }
          if (key === 'panel_visibility_conditions') {
            const cleanedConditions = (settingsToSave.panelVisibilityConditions || []).filter(isValidPanelVisibilityCondition);
            valueToSave = JSON.stringify(cleanedConditions);
          }
          changedFields.push({
            ownerId: shopData.id,
            namespace: "taskify_panel",
            key: key,
            value: valueToSave,
            type: (key === 'panel_visibility_countries' || key === 'panel_visibility_conditions') ? "json" : "single_line_text_field"
          });
        }
      });
      
              // Check changes in boolean fields
      const booleanFields = [
        { field: 'panelEnabled', key: 'panel_enabled' },
        { field: 'panelVisibilityEnabled', key: 'panel_visibility_enabled' },
        { field: 'showFooter', key: 'show_footer' },
        { field: 'showHighestDiscountMessage', key: 'show_highest_discount_message' },
        { field: 'showAchievedText', key: 'show_achieved_text' },
        { field: 'showMissingAmount', key: 'show_missing_amount' },
        { field: 'showCartValue', key: 'show_cart_value' },
        { field: 'borderGlowPulse', key: 'border_glow_pulse' },
        { field: 'startGuideExpanded', key: 'start_guide_expanded' },
        { field: 'previewExpanded', key: 'preview_expanded' }
      ];
      
      booleanFields.forEach(({ field, key }) => {
        if (settingsToSave[field] !== lastSavedSettings[field]) {
          changedFields.push({
            ownerId: shopData.id,
            namespace: "taskify_panel",
            key: key,
            value: settingsToSave[field].toString(),
            type: "single_line_text_field"
          });
        }
      });
      
              // Check changes in panelDiscounts
      const currentDiscountsString = JSON.stringify(panelDiscounts);
      const lastDiscountsString = JSON.stringify(lastSavedSettings.discounts || []);
      if (currentDiscountsString !== lastDiscountsString) {
        changedFields.push({
          ownerId: shopData.id,
          namespace: "taskify_panel",
          key: "manual_discounts",
          value: currentDiscountsString,
          type: "json"
        });
      }

      // Save custom discount order JSON if changed
      try {
        const currentOrderString = JSON.stringify(settingsToSave.customDiscountOrder || []);
        const lastOrderString = JSON.stringify(lastSavedSettings.customDiscountOrder || []);
        if (currentOrderString !== lastOrderString) {
          changedFields.push({
            ownerId: shopData.id,
            namespace: "taskify_panel",
            key: "custom_discount_order",
            value: currentOrderString,
            type: "json"
          });
        }
      } catch (e) { /* ignore */ }
      
      // Check changes in dismissedBanners
      const currentDismissedString = JSON.stringify(settingsToSave.dismissedBanners || []);
      const lastDismissedString = JSON.stringify(lastSavedSettings.dismissedBanners || []);
      if (currentDismissedString !== lastDismissedString) {
        changedFields.push({
          ownerId: shopData.id,
          namespace: "taskify_panel",
          key: "dismissed_banners",
          value: currentDismissedString,
          type: "json"
        });
      }
      
              // Always add panel_type for certainty
      if (!lastSavedSettings.panelType || lastSavedSettings.panelType !== "manual") {
        changedFields.push({
          ownerId: shopData.id,
          namespace: "taskify_panel",
          key: "panel_type", 
          value: "manual",
          type: "single_line_text_field"
        });
      }
      
      console.log(`📝 Found ${changedFields.length} changed fields to save:`, changedFields.map(f => f.key));
      console.log("🔍 Detailed changed fields:", changedFields);
      
      if (changedFields.length === 0) {
        console.log("❌ No changes detected!");
        console.log("🔍 settingsToSave keys:", Object.keys(settingsToSave));
        console.log("🔍 lastSavedSettings keys:", Object.keys(lastSavedSettings || {}));
        
        // Jeśli lastSavedSettings jest pusty, wymuś zapisanie wszystkich ustawień
        if (!lastSavedSettings || Object.keys(lastSavedSettings).length === 0) {
          console.log("🔄 lastSavedSettings is empty, forcing save of all settings");
          
          // Dodaj wszystkie pola do zapisania
          fieldMappings.forEach(({ field, key }) => {
            if (settingsToSave[field] !== undefined) {
              if (imageFields.has(field)) {
                const val = settingsToSave[field];
                const isEmpty = val === undefined || val === null || val.toString().trim() === '';
                if (isEmpty) {
                  return; // don't create blank image metafield on initial save
                }
              }
              const NBSP = '\u00A0';
              const blankableTextKeys = new Set(['cart_value_text','highest_discount_text','missing_for_discount_text','footer_content']);
              const rawVal = settingsToSave[field];
              const coercedVal = (blankableTextKeys.has(key) && (rawVal === undefined || rawVal === null || rawVal.toString().trim() === '')) ? NBSP : rawVal.toString();
              changedFields.push({
                ownerId: shopData.id,
                namespace: "taskify_panel",
                key: key,
                value: coercedVal,
                type: "single_line_text_field"
              });
            }
          });
          
          booleanFields.forEach(({ field, key }) => {
            if (settingsToSave[field] !== undefined) {
              changedFields.push({
                ownerId: shopData.id,
                namespace: "taskify_panel",
                key: key,
                value: settingsToSave[field].toString(),
                type: "single_line_text_field"
              });
            }
          });
          
          console.log(`🔄 Added ${changedFields.length} fields for forced save`);
        } else {
          // If there are only deletions to perform, continue; otherwise exit
          if (fieldsToDelete.length === 0) {
            setHasUnsavedChanges(false);
            return;
          }
        }
      }
      
      // Delete cleared image metafields before saving others
      if (fieldsToDelete.length > 0) {
        console.log(`🗑️ Deleting ${fieldsToDelete.length} metafields:`, fieldsToDelete.map(f => `${f.namespace}/${f.key}`));
        for (let i = 0; i < fieldsToDelete.length; i += 25) {
          const batchToDelete = fieldsToDelete.slice(i, i + 25);
          const deleteResult = await callShopify(`
            mutation metafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
              metafieldsDelete(metafields: $metafields) {
                deletedMetafields { key }
                userErrors { field message }
              }
            }
          `, { metafields: batchToDelete });
          if (deleteResult?.metafieldsDelete?.userErrors?.length > 0) {
            throw new Error(deleteResult.metafieldsDelete.userErrors[0].message);
          }
        }
      }
      
              // Check 25 field limit
      if (changedFields.length > 25) {
        console.warn(`⚠️ Too many fields (${changedFields.length}), will save in batches`);
        
        // Zapisz w partiach po 25
        for (let i = 0; i < changedFields.length; i += 25) {
          const batch = changedFields.slice(i, i + 25);
          console.log(`💾 Saving batch ${Math.floor(i/25) + 1}/${Math.ceil(changedFields.length/25)}`);
          
          const result = await callShopify(`
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }
          `, { metafields: batch });
          
          if (result.metafieldsSet?.userErrors?.length > 0) {
            throw new Error(result.metafieldsSet.userErrors[0].message);
          }
        }
      } else {
        // Zapisz wszystkie naraz
        const result = await callShopify(`
          mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                key
                value
              }
              userErrors {
                field
                message
              }
            }
          }
        `, { metafields: changedFields });
        
        if (result.metafieldsSet?.userErrors?.length > 0) {
          throw new Error(result.metafieldsSet.userErrors[0].message);
        }
      }
      
      console.log("✅ Panel settings saved successfully");
      setHasUnsavedChanges(false);
      setLastSavedSettings(settingsToSave); // Update last saved settings
      
      
    } catch (error) {
      console.error('❌ Error saving panel settings:', error);
        showToast(`Error while saving: ${error.message}`);
    } finally {
      setIsSavingPanelSettings(false);
    }
  };
  // Handle Save Bar for Panel Settings - MOVED AFTER savePanelSettings definition
  const handlePanelSettingsSave = useCallback(async () => {
      console.log("🔄 handlePanelSettingsSave clicked!");
      if (isSavingPanelSettings) {
        console.log("⚠️ Already saving, skipping...");
        return; // Prevent double clicks
      }
      try {
        console.log("💾 Calling savePanelSettings with:", panelSettings);
        await savePanelSettings(panelSettings);
        console.log("✅ savePanelSettings completed successfully");
        try { shopify && shopify.saveBar.hide('panel-save-bar').catch(() => {}); } catch (_) {}
      } catch (error) {
        console.error('❌ Save error:', error);
        showToast('Error saving panel settings: ' + error.message);
      }
    }, [isSavingPanelSettings, panelSettings, savePanelSettings, shopify]);
    
  const handlePanelSettingsDiscard = useCallback(async () => {
      if (isSavingPanelSettings) return; // Prevent during save
      try {
        await loadPanelSettings();
        setHasUnsavedChanges(false);
        
      try { shopify && shopify.saveBar.hide('panel-save-bar').catch(() => {}); } catch (_) {}
      } catch (error) {
        console.error('Discard error:', error);
      }
    }, [isSavingPanelSettings, loadPanelSettings, shopify]);

  // Attach event listeners to native ui-save-bar for panel settings
  useEffect(() => {
    const saveButton = document.querySelector('#panel-save-bar #save-button');
    const discardButton = document.querySelector('#panel-save-bar #discard-button');
    
    if (saveButton) {
      saveButton.addEventListener('click', handlePanelSettingsSave);
    }
    if (discardButton) {
      discardButton.addEventListener('click', handlePanelSettingsDiscard);
    }
    
    // Cleanup event listeners
    return () => {
      if (saveButton) {
        saveButton.removeEventListener('click', handlePanelSettingsSave);
      }
      if (discardButton) {
        discardButton.removeEventListener('click', handlePanelSettingsDiscard);
      }
    };
  }, [handlePanelSettingsSave, handlePanelSettingsDiscard]);

  // DODAWANIE RECZNEJ ZNIZKI DO PANELU
  const addPanelDiscount = (discount) => {
    const newDiscount = {
      id: Date.now(),
      description: discount.description,
      minimumAmount: parseFloat(discount.minimumAmount) || 0,
      discountPercentage: discount.discountType === 'free_shipping' ? 0 : (parseFloat(discount.discountPercentage) || 0),
      discountType: discount.discountType || 'percentage',
      imageUrl: discount.imageUrl || '',
      isActive: true,
      lockedIcon: discount.lockedIcon || '',
      backgroundColor: discount.backgroundColor || '',
      backgroundImage: discount.backgroundImage || ''
    };
    
    const updatedDiscounts = [...panelDiscounts, newDiscount];
    setPanelDiscounts(updatedDiscounts);
    setHasUnsavedChanges(true);
    
  };

  // USUWANIE ZNIZKI Z PANELU
  const removePanelDiscount = (discountId) => {
    const updatedDiscounts = panelDiscounts.filter(d => d.id !== discountId);
    setPanelDiscounts(updatedDiscounts);
    setHasUnsavedChanges(true);
    
  };

  // OBSLUGA ZAMYKANIA BANNEROW
  const handleDismissBanner = useCallback(async (bannerId) => {
    try {
      const newDismissedSet = new Set([...dismissedBannersState, bannerId]);
      const newDismissedArray = Array.from(newDismissedSet);
      
      setDismissedBannersState(newDismissedSet);
      
      // Zapisz do ustawień panelu i do bazy danych
      const updatedSettings = {
        ...panelSettings,
        dismissedBanners: newDismissedArray
      };
      
      setPanelSettings(updatedSettings);
      await savePanelSettings(updatedSettings);
      
      
    } catch (error) {
      console.error("Error dismissing banner:", error);
      showToast("Error dismissing banner");
    }
  }, [dismissedBannersState, panelSettings]);
  // ZALADOWANIE DANYCH SKLEPU I ZNIZEK Z SHOPIFY
  const loadShopDataAndDiscounts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch shop data and real automatic discounts from Shopify
      const result = await callShopify(`
        query getShopAndDiscounts {
          shop {
            id
            myshopifyDomain
            name
            email
            currencyCode
            ianaTimezone
            plan {
              displayName
            }
          }
          automaticDiscountNodes(first: 50) {
              edges {
                node {
                  id
                automaticDiscount {
                  ... on DiscountAutomaticBasic {
                    title
                    status
                    startsAt
                    endsAt
                    customerGets {
                      value {
                        ... on DiscountPercentage {
                          percentage
                        }
                      }
                    }
                    minimumRequirement {
                      ... on DiscountMinimumSubtotal {
                        greaterThanOrEqualToSubtotal {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                  ... on DiscountAutomaticFreeShipping {
                    title
                    status
                    startsAt
                    endsAt
                    minimumRequirement {
                      ... on DiscountMinimumSubtotal {
                        greaterThanOrEqualToSubtotal {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                  ... on DiscountAutomaticApp {
                    title
                    status
                    startsAt
                    endsAt
                    appDiscountType {
                      functionId
                      app {
                        title
                      }
                    }
                    discountClass
                  }
                }
              }
            }
          }
        }
      `);

      setShopData(result.shop);
      
      // Process real automatic discounts from Shopify
      const realDiscounts = result.automaticDiscountNodes.edges.map(({ node }) => {
        const discount = node.automaticDiscount;
        const shopifyDiscountId = node.id;
        
        const isBasicDiscount = discount.customerGets !== undefined;
        const isAppDiscount = discount.appDiscountType !== undefined;
        const isFreeShipping = !isBasicDiscount && !isAppDiscount;
        
        return {
          id: shopifyDiscountId.split('/').pop(),
          shopifyDiscountId: shopifyDiscountId,
          description: discount.title,
          minimumAmount: parseFloat(discount.minimumRequirement?.greaterThanOrEqualToSubtotal?.amount || 0),
          discountPercentage: isBasicDiscount ? parseFloat(((discount.customerGets?.value?.percentage || 0) * 100).toFixed(1)) : (isAppDiscount ? 15 : 0), // Domyślny 15% dla APP discount
          discountAmount: 0, // Domyślnie 0 dla zniżek z Shopify
          discountValueType: 'percentage', // Domyślnie percentage dla zniżek z Shopify
          discountType: isBasicDiscount ? 'percentage' : (isAppDiscount ? 'app_discount' : 'free_shipping'),
          status: discount.status,
          createdAt: discount.startsAt,
          shopifyCreated: true,
          isActive: discount.status === 'ACTIVE',
          // Dodaj informacje specyficzne dla APP discount
          ...(isAppDiscount && {
            functionId: discount.appDiscountType.functionId,
            appTitle: discount.appDiscountType.app?.title,
            discountClass: discount.discountClass
          })
        };
      });
      
      setDiscounts(realDiscounts);
    } catch (err) {
      console.error('Shop data loading error:', err);
      setError(`Data loading error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  // OBSLUGA FORMULARZA DODAWANIA NOWEJ ZNIZKI
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!minimumAmount || !description) {
      showToast("Please fill in all required fields");
      return;
    }

    // For percentage discounts, require discount percentage
    if (discountType === "percentage" && !discountPercentage) {
      showToast("Please enter discount percentage");
      return;
    }

    const minAmount = parseFloat(minimumAmount);
    const discPercent = discountType === "percentage" ? parseFloat(discountPercentage) : 0;
    
    if (isNaN(minAmount) || minAmount <= 0) {
      showToast("Minimum amount must be a number greater than 0");
      return;
    }

    if (discountType === "percentage" && (isNaN(discPercent) || discPercent <= 0 || discPercent > 100)) {
      showToast("Discount percentage must be a number between 0.1 and 100");
      return;
    }

    setIsSubmitting(true);
    console.log("🚀 ADDING NEW DISCOUNT");

    try {
      const newDiscount = {
        id: Date.now().toString(),
        minimumAmount: minAmount,
        discountPercentage: discPercent,
        discountType: discountType,
        description: description.trim(),
        createdAt: new Date().toISOString(),
        checkoutNotMetMessage: showCheckoutNotMetMessage ? (checkoutNotMetMessage || "") : "",
        isActive: true,
        isConditional: isConditionalDiscount,
        // Każda zniżka ma swoje własne warunki
        conditions: isConditionalDiscount ? conditions : []
      };
      
      console.log("➕ Adding new discount with individual conditions...");
      console.log("🔧 Individual conditions:", conditions);
      
      // Dodaj rabat do lokalnej listy aby zsynchronizować z Functions
      const newDiscountForFunctions = {
        id: newDiscount.id,
        minimumAmount: minAmount,
        discountPercentage: discPercent,
        discountType: discountType,
        description: description.trim(),
        createdAt: new Date().toISOString(),
        checkoutNotMetMessage: showCheckoutNotMetMessage ? (checkoutNotMetMessage || "") : "",
        isActive: true,
        // Dołącz indywidualne warunki do synchronizacji
        basicConditions: isConditionalDiscount ? conditions : []
      };
      
      // Create APP discount z Functions (zamiast standardowego automatic discount)
      console.log("🔧 Tworzenie APP discount z Shopify Functions...");
      
      // Znajdź Function ID (potrzebne do utworzenia APP discount)
      const getFunctionIdQuery = `
        query GetShopifyFunctions {
          shopifyFunctions(first: 10) {
            edges {
              node {
                id
                app {
                  title
                }
                apiType
                title
              }
            }
          }
        }
      `;
      
      const functionsResult = await callShopify(getFunctionIdQuery);
      console.log("🔍 Functions result:", functionsResult);
      
      const functions = functionsResult.shopifyFunctions.edges;
      console.log("📋 Wszystkie funkcje:", functions);
      
      // Wypisz wszystkie dostępne funkcje dla debugowania
      functions.forEach((edge, index) => {
        console.log(`Function ${index}:`, {
          id: edge.node.id,
          title: edge.node.title,
          appTitle: edge.node.app?.title,
          apiType: edge.node.apiType
        });
      });
      
      // Znajdź naszą funkcję rabatów - spróbuj różne warianty
      let discountFunction = functions.find(edge => 
        edge.node.app?.title === 'Taskfy' && 
        edge.node.apiType === 'discounts'
      );
      
      // Jeśli nie znaleziono, spróbuj bez sprawdzania nazwy aplikacji
      if (!discountFunction) {
        console.log("🔍 Nie znaleziono funkcji z app title 'Taskfy', szukam tylko po apiType...");
        discountFunction = functions.find(edge => 
          edge.node.apiType === 'discounts'
        );
      }
      
      // Jeśli nadal nie znaleziono, spróbuj po tytule funkcji
      if (!discountFunction) {
        console.log("🔍 Nie znaleziono funkcji po apiType, szukam po title zawierającym 'discount'...");
        discountFunction = functions.find(edge => 
          edge.node.title?.toLowerCase().includes('discount')
        );
      }
      
      if (!discountFunction) {
        console.error("❌ Dostępne funkcje:", functions.map(f => f.node));
        
        // Fallback: spróbuj utworzyć standardowy automatic discount jeszcze raz
        console.log("🔄 Nie znaleziono Functions, powracam do tworzenia standardowego automatic discount...");
        
      let mutationInput, graphqlMutation;
      
      if (discountType === "free_shipping") {
        // Create free shipping discount
        mutationInput = {
          title: newDiscount.description,
            startsAt: new Date().toISOString()
          };
          
          // Dodaj minimumRequirement tylko jeśli jest ustawione
          if (newDiscount.minimumAmount && parseFloat(newDiscount.minimumAmount) > 0) {
            mutationInput.minimumRequirement = {
            subtotal: {
              greaterThanOrEqualToSubtotal: newDiscount.minimumAmount.toString()
          }
        };
          }
        
        graphqlMutation = `
          mutation discountAutomaticFreeShippingCreate($freeShippingAutomaticDiscount: DiscountAutomaticFreeShippingInput!) {
            discountAutomaticFreeShippingCreate(freeShippingAutomaticDiscount: $freeShippingAutomaticDiscount) {
              automaticDiscountNode {
                id
                automaticDiscount {
                  ... on DiscountAutomaticFreeShipping {
                    title
                    status
                    startsAt
                    endsAt
                    minimumRequirement {
                      ... on DiscountMinimumSubtotal {
                        greaterThanOrEqualToSubtotal {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
              userErrors {
                field
                message
                code
              }
            }
          }
        `;
      } else {
        // Create percentage discount
        mutationInput = {
          title: newDiscount.description,
          startsAt: new Date().toISOString(),
          customerGets: {
            value: { 
              percentage: newDiscount.discountPercentage / 100 
            },
            items: { 
              all: true 
            }
            }
          };
          
          // Dodaj minimumRequirement tylko jeśli jest ustawione
          if (newDiscount.minimumAmount && parseFloat(newDiscount.minimumAmount) > 0) {
            mutationInput.minimumRequirement = {
            subtotal: {
              greaterThanOrEqualToSubtotal: newDiscount.minimumAmount.toString()
          }
        };
          }
        
        graphqlMutation = `
          mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
            discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
              automaticDiscountNode {
                id
                automaticDiscount {
                  ... on DiscountAutomaticBasic {
                    title
                    status
                    startsAt
                    endsAt
                    customerGets {
                      value {
                        ... on DiscountPercentage {
                          percentage
                        }
                      }
                    }
                    minimumRequirement {
                      ... on DiscountMinimumSubtotal {
                        greaterThanOrEqualToSubtotal {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
              userErrors {
                field
                message
                code
              }
            }
          }
        `;
      }
      
        console.log("Sending fallback mutation:", graphqlMutation);
      console.log("Variables:", mutationInput);
      
      const result = await callShopify(graphqlMutation, 
        discountType === "free_shipping" 
          ? { freeShippingAutomaticDiscount: mutationInput }
          : { automaticBasicDiscount: mutationInput }
      );
      
        console.log("Fallback mutation result:", result);
      
      // Check for user errors
      const mutationKey = discountType === "free_shipping" 
        ? 'discountAutomaticFreeShippingCreate' 
        : 'discountAutomaticBasicCreate';
        
      if (result[mutationKey]?.userErrors && result[mutationKey].userErrors.length > 0) {
        throw new Error(result[mutationKey].userErrors[0].message);
        }
        
        
        
        // Clear form fields i zakończ funkcję
        setMinimumAmount("");
        setDiscountPercentage("");
        setDiscountType("percentage");
        setDescription("");
        

        
        console.log("✅ Standardowy rabat utworzony pomyślnie");
        
        // Refresh data from Shopify to show the new discount
        await loadShopDataAndDiscounts();
        
        // Zsynchronizuj rabaty z Shopify Functions
        setTimeout(async () => {
          const currentDiscounts = [...discounts, newDiscountForFunctions];
          await saveDiscountsToMetafields(currentDiscounts);
        }, 1000);
        
        return; // Zakończ funkcję
      }
      
      console.log("✅ Znaleziono funkcję rabatów:", discountFunction.node.id);
      console.log("🔍 Szczegóły funkcji:", {
        id: discountFunction.node.id,
        title: discountFunction.node.title,
        apiType: discountFunction.node.apiType,
        app: discountFunction.node.app
      });
      
             // Utwórz APP discount z naszą funkcją
             const shopifyTitle = newDiscount.description;
       const functionDiscountInput = {
         title: shopifyTitle,
         functionId: discountFunction.node.id,
         startsAt: new Date().toISOString(),
         combinesWith: {
           orderDiscounts: true,
           productDiscounts: true,
           shippingDiscounts: true
         }
       };
      
             const graphqlMutation = `
         mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
           discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
             automaticAppDiscount {
               discountId
               title
               status
             }
             userErrors {
               field
               message
               code
             }
           }
         }
       `;
      
      const mutationInput = { automaticAppDiscount: functionDiscountInput };
      
      console.log("Sending APP discount mutation:", graphqlMutation);
      console.log("Variables:", mutationInput);
      
      const result = await callShopify(graphqlMutation, mutationInput);
      
      console.log("APP discount mutation result:", result);
      
             // Check for user errors
       if (result.discountAutomaticAppCreate?.userErrors && result.discountAutomaticAppCreate.userErrors.length > 0) {
         console.error("❌ Szczegółowe błędy GraphQL:", result.discountAutomaticAppCreate.userErrors);
         const errorDetails = result.discountAutomaticAppCreate.userErrors.map(err => 
           `Field: ${err.field}, Code: ${err.code}, Message: ${err.message}`
         ).join('; ');
         throw new Error(`GraphQL Errors: ${errorDetails}`);
       }
      
      if (!result.discountAutomaticAppCreate?.automaticAppDiscount) {
        throw new Error('Nie udało się utworzyć APP discount');
      }
      
      // Clear form fields
      setMinimumAmount("");
      setDiscountPercentage("");
      setDiscountType("percentage");
      setDescription("");
      

      
      console.log("✅ Discount with basic conditions created successfully");
      
      // APP-based discounts są automatycznie aktywne po utworzeniu
      const createdDiscountId = result.discountAutomaticAppCreate.automaticAppDiscount.discountId;
      console.log("✅ Utworzono APP DISCOUNT EXTENSION:", {
        discountId: createdDiscountId,
        functionId: discountFunction.node.id,
        title: newDiscount.description,
        status: result.discountAutomaticAppCreate.automaticAppDiscount.status
      });
      
      // 🔍 DODAJ METAFIELD Z KONFIGURACJĄ DO UTWORZONEJ ZNIŻKI
      try {
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
              ownerId: createdDiscountId,
              namespace: "$app:taskify-discounts",
              key: "function-configuration",
              type: "json",
              value: JSON.stringify({
                discountClass: newDiscount.discountClass || "ORDER",
                discountPercentage: newDiscount.discountPercentage,
                conditions: newDiscount.conditions || [],
                isConditional: newDiscount.isConditional || false,
                minimumAmount: newDiscount.minimumAmount
              })
            }
          ]
        });
        
        if (metafieldResult.metafieldsSet?.userErrors?.length > 0) {
          console.warn("⚠️ Błąd dodawania metafield:", metafieldResult.metafieldsSet.userErrors);
        } else {
          console.log("✅ Dodano metafield z konfiguracją do zniżki");
        }
      } catch (metafieldError) {
        console.warn("⚠️ Nie udało się dodać metafield:", metafieldError);
      }
      
      // Dodaj zniżkę do panelDiscounts i zapisz
      const updatedPanelDiscounts = [...panelDiscounts, newDiscount];
      setPanelDiscounts(updatedPanelDiscounts);
      await saveIndividualDiscounts(updatedPanelDiscounts);
      
      
      
      // Reset formularza
      setMinimumAmount("");
      setDiscountPercentage("");
      setDescription("");
      setIsConditionalDiscount(false);
      
    } catch (error) {
      console.error("Error creating discount:", error);
      showToast(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // OBSLUGA USUWANIA ZNIZKI
  const handleDeleteDiscount = async (discountId) => {
    try {
      // Find the discount to delete
      const discountToDelete = discounts.find(d => d.id === discountId);
      if (!discountToDelete) {
      
        return;
      }

      console.log(`🗑️ Rozpoczynam usuwanie zniżki: ${discountToDelete.description} (ID: ${discountId})`);

      // Delete from Shopify
      if (discountToDelete.shopifyDiscountId) {
        const deleteResult = await callShopify(`
          mutation discountAutomaticDelete($id: ID!) {
            discountAutomaticDelete(id: $id) {
              deletedAutomaticDiscountId
              userErrors {
                field
                message
              }
            }
          }
        `, {
          id: discountToDelete.shopifyDiscountId
        });

        if (deleteResult.discountAutomaticDelete?.userErrors?.length > 0) {
          console.warn('⚠️ Shopify deletion errors:', deleteResult.discountAutomaticDelete.userErrors);
          showToast(`Shopify deletion error: ${deleteResult.discountAutomaticDelete.userErrors[0].message}`);
        } else {
          console.log('✅ Discount deleted from Shopify');
        }
      }

      // Immediate deletion from metafield (no setTimeout)
      const updatedDiscounts = discounts.filter(d => d.id !== discountId);
      await saveDiscountsToMetafields(updatedDiscounts);
      
      // Update local state
      setDiscounts(updatedDiscounts);
      
      console.log('✅ Discount removed from metafield and local state');
      showToast("Discount has been successfully deleted!");
      
      // Refresh data from Shopify to reflect the deletion
      await loadShopDataAndDiscounts();
      
    } catch (error) {
      console.error("❌ Discount deletion error:", error);
      showToast(`Error during deletion: ${error.message}`);
    }
  };
  // OBSLUGA USUWANIA POJEDYNCZEJ ZNIZKI Z NOWEGO SYSTEMU
  const handleViewDiscount = async (discount) => {
    // Wypełnij dane do edycji i włącz tryb edycji
    setEditingDiscount({
      ...discount,
      discountType: discount.discountType || 'percentage'
    });
    
    // Wczytaj wartości aktywacji zniżki
          setActivationMethod(discount.activationMethod || 'automatic');
      
      // Prepare combinesWith settings with Shopify API restrictions
      const combinesWithSettings = discount.combinesWith || {
        orderDiscounts: false,
        productDiscounts: false,
        shippingDiscounts: false
      };
      
      // SHOPIFY RESTRICTION: Shipping discounts cannot combine with other shipping discounts
      if (discount.discountType === 'free_shipping') {
        combinesWithSettings.shippingDiscounts = false;
        console.log("🚫 [EDIT SHIPPING RESTRICTION] Setting shippingDiscounts = false for free_shipping discount");
      }
      
      setCombinesWith(combinesWithSettings);
    setDiscountCode(discount.discountCode || '');

    // Initialize checkout not met message controls from discount
    const initialMsg = typeof discount.checkoutNotMetMessage === 'string' ? discount.checkoutNotMetMessage : '';
    setShowCheckoutNotMetMessage(initialMsg.trim().length > 0);
    setCheckoutNotMetMessage(initialMsg);
    
    // Inicjalizuj warunki z edytowanej zniżki
    if (discount.conditions && discount.conditions.length > 0) {
      setConditions(discount.conditions);
      setIsConditionalDiscount(true);
      
      // Initialize selection state for cart_contains conditions
      const newProductSelectionState = {};
      const newCollectionSelectionState = {};
      
      // Process each condition
      for (const condition of discount.conditions) {
        if (condition.type === 'cart_contains' && condition.value) {
          // Check if it's a product operator
          const isProductOperator = [
            'only_these_products',
            'at_least_one_of_these', 
            'all_of_these_products',
            'none_of_these_products'
          ].includes(condition.operator);
          
          // Check if it's a collection operator
          const isCollectionOperator = [
            'only_these_collections',
            'at_least_one_collection',
             
            'no_products_from_collections'
          ].includes(condition.operator);
          
          if (isProductOperator) {
            // Parse product IDs from condition value
            const productIds = condition.value.split(',').map(id => id.trim()).filter(Boolean);
            
            if (productIds.length > 0) {
              console.log("🔍 [EDIT DISCOUNT] Fetching real product data for IDs:", productIds);
              
              // Fetch real product data
              const realProducts = await fetchProductsByIds(productIds);
              
              console.log("✅ [EDIT DISCOUNT] Fetched real products:", realProducts);
              
              newProductSelectionState[condition.id] = {
                selectedProducts: realProducts,
                modalOpen: false
              };
            } else {
              newProductSelectionState[condition.id] = {
                selectedProducts: [],
                modalOpen: false
              };
            }
          } else if (isCollectionOperator) {
            // Parse collection IDs from condition value
            const collectionIds = condition.value.split(',').map(id => id.trim()).filter(Boolean);
            
            if (collectionIds.length > 0) {
              console.log("🔍 [EDIT DISCOUNT] Fetching real collection data for IDs:", collectionIds);
              
              // Fetch real collection data
              const realCollections = await fetchCollectionsByIds(collectionIds);
              
              console.log("✅ [EDIT DISCOUNT] Fetched real collections:", realCollections);
              
              newCollectionSelectionState[condition.id] = {
                selectedCollections: realCollections,
                modalOpen: false
              };
            } else {
              newCollectionSelectionState[condition.id] = {
                selectedCollections: [],
                modalOpen: false
              };
            }
          }
        }
        
        // Legacy support for old cart_contains_products
        if (condition.type === 'cart_contains_products' && condition.value) {
          // Parse product IDs from condition value
          const productIds = condition.value.split(',').map(id => id.trim()).filter(Boolean);
          
          if (productIds.length > 0) {
            console.log("🔍 [EDIT DISCOUNT] Fetching real product data for legacy cart_contains_products:", productIds);
            
            // Fetch real product data
            const realProducts = await fetchProductsByIds(productIds);
            
            console.log("✅ [EDIT DISCOUNT] Fetched real products for legacy:", realProducts);
            
            newProductSelectionState[condition.id] = {
              selectedProducts: realProducts,
              modalOpen: false
            };
          } else {
            newProductSelectionState[condition.id] = {
              selectedProducts: [],
              modalOpen: false
            };
          }
        }
      }
      
      setProductSelectionState(newProductSelectionState);
      setCollectionSelectionState(newCollectionSelectionState);
    } else {
      setConditions([{
        id: 1,
        type: 'cart_total',
        operator: 'greater_than_or_equal',
        value: ''
      }]);
      setIsConditionalDiscount(false);
    }
    
    setCollapsedConditions({}); // Reset collapsed state for editing
    setDiscountCreationMode('edit');
  };

  // FUNKCJA SPRAWDZAJĄCA CZY ZNIŻKA ZOSTAŁA STWORZONA PRZEZ NASZĄ APLIKACJĘ
  const isDiscountCreatedByOurApp = (shopifyDiscount) => {
    // Obsłuż dwa możliwe kształty: node z automaticDiscount oraz node z discount
    const automatic = shopifyDiscount.automaticDiscount;
    const generic = shopifyDiscount.discount;
    const title = automatic?.title || generic?.title;
    const discountType = automatic?.__typename || generic?.__typename;
    
    console.log(`🔍 SPRAWDZAM czy zniżka należy do aplikacji:`);
    console.log(`  📋 Tytuł: "${title}"`);
    console.log(`  🏷️ Typ: ${discountType}`);
    console.log(`  🔍 Pełny obiekt zniżki:`, JSON.stringify(shopifyDiscount, null, 2));
    
    // SPRAWDZENIA BEZPIECZEŃSTWA - AKTYWNE!
    
    // 0. NAJPIERW - sprawdź czy zniżka ma tytuł pasujący do naszych metafields
    const metafieldDiscounts = panelDiscounts || [];
    const metafieldTitles = metafieldDiscounts.map(d => d.description || d.name);
    if (title && metafieldTitles.includes(title)) {
      console.log(`✅ Zniżka znaleziona w naszych metafields: ${title}`);
      return true;
    }
    
    // 1. Sprawdź czy to zniżka typu App z naszym functionId (automatyczne i kody promocyjne)
    if (discountType === 'DiscountAutomaticApp' || discountType === 'DiscountCodeApp') {
      const appDiscountType = automatic?.appDiscountType || generic?.appDiscountType;
      const appHandle = appDiscountType?.app?.handle;
      const functionId = appDiscountType?.functionId;
      const appTitle = appDiscountType?.app?.title;
      
      console.log(`  🔧 App Handle: ${appHandle}`);
      console.log(`  📱 App Title: ${appTitle}`);
      console.log(`  ⚙️ Function ID: ${functionId}`);
      
      // Sprawdź czy to nasza aplikacja (liberalne sprawdzenie)
      if (appHandle && (appHandle.includes('taskify') || appHandle.includes('taskfy') || 
                        appHandle.includes('Taskify') || appHandle.includes('Taskfy'))) {
        console.log(`✅ Zniżka stworzona przez naszą aplikację (handle): ${title}`);
        return true;
      }
      
      if (appTitle && (appTitle.includes('Taskify') || appTitle.includes('Taskfy'))) {
        console.log(`✅ Zniżka stworzona przez naszą aplikację (title): ${title}`);
        return true;
      }
      
      // Jeśli to APP discount, prawdopodobnie nasze (bo inne aplikacje raczej nie tworzą zniżek w naszym sklepie)
      console.log(`✅ APP discount - prawdopodobnie nasze: ${title}`);
      return true;
    }
    
    // 2. Sprawdź typy zniżek które tworzymy (automatyczne i kody promocyjne)
    if (discountType === 'DiscountAutomaticBasic' || discountType === 'DiscountAutomaticFreeShipping' ||
        discountType === 'DiscountCodeBasic' || discountType === 'DiscountCodeFreeShipping') {
      console.log(`✅ Zniżka typu ${discountType} - prawdopodobnie nasza: ${title}`);
      return true;
    }
    
    // 3. Sprawdź prefiksy/sufiksy w tytule (legacy - dla starych zniżek)
    if (title && (title.includes('[Taskify]') || title.startsWith('Taskify:') || title.includes('(Taskify)'))) {
      console.log(`✅ Zniżka z legacy prefiksem: ${title}`);
      return true;
    }
    
    // 4. Sprawdź czy w opisie jest coś charakterystycznego dla naszej aplikacji
    // (dodaj tutaj inne sprawdzenia specyficzne dla Twojej aplikacji)
    
    console.log(`❌ Discount NOT recognized as ours: ${title}`);
    console.log(`  📋 Available titles in metafields:`, metafieldTitles);
    return false;
  };
  // FUNKCJA SYNCHRONIZACJI DWUKIERUNKOWEJ - USUWA ZNIŻKI SHOPIFY BEZ ODPOWIADAJĄCYCH METAFIELDS
  const cleanupOrphanedShopifyDiscounts = async () => {
    try {
      console.log('🧹 Starting cleanup of orphaned discounts in Shopify...');
      
      // KROK 1: Pobierz wszystkie zniżki z Shopify (automatyczne i kody promocyjne)
      const shopifyDiscountsData = await callShopify(`
        query getAllDiscountsForCleanup {
          automaticDiscountNodes(first: 250) {
            edges {
              node {
                id
                automaticDiscount {
                  ... on DiscountAutomaticBasic {
                    title
                    status
                  }
                  ... on DiscountAutomaticFreeShipping {
                    title
                    status
                  }
                  ... on DiscountAutomaticApp {
                    title
                    status
                    appDiscountType {
                      app {
                        handle
                        title
                      }
                      functionId
                    }
                  }
                }
              }
            }
          }
          codeDiscountNodes(first: 250) {
            edges {
              node {
                id
                codeDiscount {
                  ... on DiscountCodeBasic {
                    title
                    status
                  }
                  ... on DiscountCodeFreeShipping {
                    title
                    status
                  }
                  ... on DiscountCodeApp {
                    title
                    status
                    appDiscountType {
                      app {
                        handle
                        title
                      }
                      functionId
                    }
                  }
                }
              }
            }
          }
        }
      `);

      // KROK 2: Pobierz zniżki z metafields
      const metafieldData = await callShopify(`
        query getDiscountMetafield {
          shop {
            metafield(namespace: "taskify_discounts", key: "discounts") {
              value
            }
          }
        }
      `);

      const metafieldDiscounts = JSON.parse(metafieldData.shop?.metafield?.value || "[]");
      const metafieldTitles = new Set(metafieldDiscounts.map(d => d.description));
      
      console.log(`📋 Zniżki w metafields: ${metafieldTitles.size}`);
      console.log(`📋 Tytuły w metafields:`, Array.from(metafieldTitles));

      // KROK 3: Sprawdź każdą zniżkę w Shopify (automatyczne i kody promocyjne)
      const orphanedDiscounts = [];
      const ourAppDiscounts = [];
      
      // Przetwórz automatyczne zniżki
      shopifyDiscountsData?.automaticDiscountNodes?.edges?.forEach(({ node }) => {
        const discount = node.automaticDiscount;
        const title = discount.title;
        
        // Sprawdź czy to nasza zniżka
        if (isDiscountCreatedByOurApp(node)) {
          ourAppDiscounts.push({
            id: node.id,
            title: title,
            hasMetafield: metafieldTitles.has(title),
            type: 'automatic'
          });
          
          // Jeśli nasza zniżka nie ma odpowiadającego metafield - to jest osierocona
          if (!metafieldTitles.has(title)) {
            orphanedDiscounts.push({
              id: node.id,
              title: title,
              type: 'automatic',
              discountType: discount.__typename
            });
          }
        }
      });
      
      // Przetwórz kody promocyjne
      shopifyDiscountsData?.codeDiscountNodes?.edges?.forEach(({ node }) => {
        const discount = node.codeDiscount;
        const title = discount.title;
        
        // Sprawdź czy to nasza zniżka (adaptuuj funkcję sprawdzającą)
        const mockAutomaticNode = {
          id: node.id,
          automaticDiscount: {
            title: title,
            __typename: discount.__typename,
            appDiscountType: discount.appDiscountType
          }
        };
        
        if (isDiscountCreatedByOurApp(mockAutomaticNode)) {
          ourAppDiscounts.push({
            id: node.id,
            title: title,
            hasMetafield: metafieldTitles.has(title),
            type: 'code'
          });
          
          // Jeśli nasza zniżka nie ma odpowiadającego metafield - to jest osierocona
          if (!metafieldTitles.has(title)) {
            orphanedDiscounts.push({
              id: node.id,
              title: title,
              type: 'code',
              discountType: discount.__typename
            });
          }
        }
      });

      console.log(`🔍 Znaleziono ${ourAppDiscounts.length} zniżek stworzonych przez naszą aplikację`);
      console.log(`🗑️ Znaleziono ${orphanedDiscounts.length} osieroconych zniżek do usunięcia`);

      // KROK 4: Usuń osierocone zniżki (tylko nasze!)
      let deletedCount = 0;
      for (const orphanedDiscount of orphanedDiscounts) {
        try {
          console.log(`🗑️ Usuwam osieroczoną zniżkę: ${orphanedDiscount.title} (${orphanedDiscount.type})`);
          
          let deleteResult;
          
          if (orphanedDiscount.type === 'automatic') {
            // Usuń automatyczną zniżkę
            deleteResult = await callShopify(`
              mutation discountAutomaticDelete($id: ID!) {
                discountAutomaticDelete(id: $id) {
                  deletedAutomaticDiscountId
                  userErrors {
                    field
                    message
                  }
                }
              }
            `, { id: orphanedDiscount.id });
            
            if (deleteResult.discountAutomaticDelete?.userErrors?.length > 0) {
              console.warn(`⚠️ Błąd usuwania automatycznej zniżki ${orphanedDiscount.title}:`, deleteResult.discountAutomaticDelete.userErrors);
            } else {
              console.log(`✅ Usunięto osieroczoną automatyczną zniżkę: ${orphanedDiscount.title}`);
              deletedCount++;
            }
          } else if (orphanedDiscount.type === 'code') {
            // Delete discount code
            deleteResult = await callShopify(`
              mutation discountCodeDelete($id: ID!) {
                discountCodeDelete(id: $id) {
                  deletedCodeDiscountId
                  userErrors {
                    field
                    message
                  }
                }
              }
            `, { id: orphanedDiscount.id });
            
            if (deleteResult.discountCodeDelete?.userErrors?.length > 0) {
              console.warn(`⚠️ Error deleting discount code ${orphanedDiscount.title}:`, deleteResult.discountCodeDelete.userErrors);
            } else {
              console.log(`✅ Usunięto osieroconą zniżkę z kodem: ${orphanedDiscount.title}`);
              deletedCount++;
            }
          }
        } catch (error) {
          console.error(`❌ Error deleting ${orphanedDiscount.title}:`, error);
        }
      }

      if (deletedCount > 0) {
        
      }

      return deletedCount;
      
    } catch (error) {
      console.error('❌ Error cleaning orphaned discounts:', error);
      return 0;
    }
  };

  const handleDeleteSingleDiscount = async (discountId, discountDescription) => {
    if (!confirm(`Czy na pewno chcesz usunąć zniżkę "${discountDescription}"? Ta operacja jest nieodwracalna!`)) {
      return;
    }

    setDeletingSingleDiscountId(discountId);
    
    try {
      console.log(`🗑️ Starting discount deletion: ${discountDescription} (ID: ${discountId})`);
      
      // STEP 1: Find discount in local state
      const discountToDelete = panelDiscounts.find(d => d.id === discountId);
      if (!discountToDelete) {
        
        return;
      }

      console.log('🔍 Discount details to delete from local data:', {
        id: discountToDelete.id,
        description: discountToDelete.description,
        shopifyDiscountId: discountToDelete.shopifyDiscountId,
        hasShopifyId: !!discountToDelete.shopifyDiscountId
      });

      // KROK 2: Usuń z Shopify
      let shopifyDiscountToDelete = null;

      // Próba 1: Jeśli mamy shopifyDiscountId, spróbuj wyszukać bezpośrednio (najpierw discountNode, potem automatic)
      if (discountToDelete.shopifyDiscountId) {
        console.log(`🆔 Próbuję wyszukać bezpośrednio po ID: ${discountToDelete.shopifyDiscountId}`);
        
        try {
          // Najpierw spróbuj uniwersalne discountNode (obsługuje code i automatic)
          const universalLookup = await callShopify(`
            query getDiscountNode($id: ID!) {
              discountNode(id: $id) {
                id
                discount {
                  __typename
                  ... on DiscountAutomaticBasic { title status }
                  ... on DiscountAutomaticFreeShipping { title status }
                  ... on DiscountAutomaticApp { title status appDiscountType { functionId app { title } } }
                  ... on DiscountCodeBasic { title status }
                  ... on DiscountCodeFreeShipping { title status }
                  ... on DiscountCodeApp { title status appDiscountType { functionId app { title } } }
                }
              }
            }
          `, { id: discountToDelete.shopifyDiscountId });

          if (universalLookup.discountNode) {
            console.log('✅ Znaleziono zniżkę bezpośrednio po ID (discountNode)!');
            shopifyDiscountToDelete = { node: universalLookup.discountNode };
          } else {
            // Fallback wyłącznie dla automatic
            const directLookup = await callShopify(`
              query getAutomaticDiscountById($id: ID!) {
                automaticDiscountNode(id: $id) {
                  id
                  automaticDiscount { __typename title status }
                }
              }
            `, { id: discountToDelete.shopifyDiscountId });
            if (directLookup.automaticDiscountNode) {
              console.log('✅ Znaleziono AUTOMATYCZNĄ zniżkę bezpośrednio po ID!');
              shopifyDiscountToDelete = { node: directLookup.automaticDiscountNode };
            } else {
              console.log('❌ Nie znaleziono zniżki po ID - prawdopodobnie już została usunięta');
            }
          }
        } catch (error) {
          console.warn('⚠️ Błąd wyszukiwania bezpośredniego po ID:', error.message);
        }
      }

      // Próba 2: Jeśli nie znaleziono po ID, wyszukaj wszystkie i znajdź po tytule
      if (!shopifyDiscountToDelete) {
        console.log('🔍 Wyszukuję wszystkie zniżki automatyczne i kodowe...');
        
        // Dodaj małe opóźnienie na wypadek opóźnienia propagacji w API
        await new Promise(resolve => setTimeout(resolve, 1000));
      
      const allShopifyDiscounts = await callShopify(`
        query getAllDiscountsForDeletionSearch {
          automaticDiscountNodes(first: 250) {
            edges { node { id automaticDiscount { __typename title status appDiscountType { app { handle title } functionId } } } }
          }
          codeDiscountNodes(first: 250) {
            edges { node { id codeDiscount { __typename title status appDiscountType { app { handle title } functionId } } } }
          }
        }
      `);

        // SZCZEGÓŁOWE LOGOWANIE wszystkich zniżek z Shopify dla debugowania
        console.log('🔍 WSZYSTKIE zniżki w Shopify:');
        allShopifyDiscounts?.automaticDiscountNodes?.edges?.forEach(({ node }, index) => {
          console.log(`  A${index + 1}. ID: ${node.id}, Title: "${node.automaticDiscount.title}", Type: ${node.automaticDiscount.__typename}`);
        });
        allShopifyDiscounts?.codeDiscountNodes?.edges?.forEach(({ node }, index) => {
          console.log(`  C${index + 1}. ID: ${node.id}, Title: "${node.codeDiscount.title}", Type: ${node.codeDiscount.__typename}`);
        });
        console.log(`🎯 Szukam zniżki o tytule: "${discountDescription}"`);

        // Znajdź zniżkę po tytule (opisie) z dokładnym dopasowaniem
        shopifyDiscountToDelete =
          allShopifyDiscounts?.automaticDiscountNodes?.edges?.find(({ node }) => {
            const title = node.automaticDiscount.title;
            const exactMatch = title === discountDescription;
            console.log(`  🔍 Porównuję (automatic): "${title}" === "${discountDescription}" → ${exactMatch}`);
            return exactMatch;
          })
          || allShopifyDiscounts?.codeDiscountNodes?.edges?.find(({ node }) => {
            const title = node.codeDiscount.title;
            const exactMatch = title === discountDescription;
            console.log(`  🔍 Porównuję (code): "${title}" === "${discountDescription}" → ${exactMatch}`);
            return exactMatch;
          });
      }

      // KROK 3: Procesuj znalezioną zniżkę lub jej brak
      if (shopifyDiscountToDelete) {
        // Unified node: może być automatic albo code discount
        const node = shopifyDiscountToDelete.node;
        const typename = node.discount ? node.discount.__typename : node.automaticDiscount?.__typename;
        const title = node.discount ? node.discount.title : node.automaticDiscount?.title;
        console.log(`✅ Znaleziono zniżkę w Shopify: "${title}" (${typename})`);
        console.log(`📋 Szczegóły zniżki:`, { id: node.id, title, type: typename });

        // BEZPIECZEŃSTWO: Sprawdź czy to nasza zniżka przed usunięciem (UPROSZCZONA LOGIKA)
        const isOurDiscount = isDiscountCreatedByOurApp(node);
        console.log(`🔒 Czy to nasza zniżka? ${isOurDiscount}`);
        
        if (isOurDiscount) {
          console.log(`🗑️ USUWAM zniżkę z Shopify: ${title}`);
          console.log(`🆔 ID do usunięcia: ${node.id}`);
          
          let deleteResult;
          if (typename && typename.startsWith('DiscountCode')) {
            // Kodowa zniżka
            deleteResult = await callShopify(`
              mutation discountCodeDelete($id: ID!) {
                discountCodeDelete(id: $id) {
                  deletedCodeDiscountId
                  userErrors { field message }
                }
              }
            `, { id: node.id });
            console.log('📡 Odpowiedź z mutacji usuwania CODE:', deleteResult);
            if (deleteResult.discountCodeDelete?.userErrors?.length > 0) {
              console.error('❌ Shopify deletion ERRORS (code):', deleteResult.discountCodeDelete.userErrors);
              showToast(`Shopify deletion error: ${deleteResult.discountCodeDelete.userErrors[0].message}`);
            }
          } else {
            // Automatyczna zniżka
            deleteResult = await callShopify(`
              mutation discountAutomaticDelete($id: ID!) {
                discountAutomaticDelete(id: $id) {
                  deletedAutomaticDiscountId
                  userErrors { field message }
                }
              }
            `, { id: node.id });
            console.log('📡 Odpowiedź z mutacji usuwania AUTOMATIC:', deleteResult);
            if (deleteResult.discountAutomaticDelete?.userErrors?.length > 0) {
              console.error('❌ Shopify deletion ERRORS (automatic):', deleteResult.discountAutomaticDelete.userErrors);
              showToast(`Shopify deletion error: ${deleteResult.discountAutomaticDelete.userErrors[0].message}`);
            }
          }
        } else {
          console.warn(`🛡️ SECURITY: Discount "${discountDescription}" not recognized as ours - SKIPPING Shopify deletion`);
          console.log(`🔍 Discount details for debugging:`, node);
        }
      } else {
        console.warn('❌ No matching discount found in Shopify');
        if (discountToDelete.shopifyDiscountId) {
          console.log(`📋 Tried searching by ID: ${discountToDelete.shopifyDiscountId}`);
        }
        // Log available titles from the search (if we have allShopifyDiscounts)
        console.log(`📋 Available titles in Shopify: search data unavailable`);
      }

      // KROK 4: ZAWSZE usuń z lokalnego stanu i metafields
      const updatedPanelDiscounts = panelDiscounts.filter(d => d.id !== discountId);
      setPanelDiscounts(updatedPanelDiscounts);
      await saveIndividualDiscounts(updatedPanelDiscounts);
      
      console.log('✅ Discount removed from local data and metafields');
      
      const message = shopifyDiscountToDelete && isDiscountCreatedByOurApp(shopifyDiscountToDelete.node)
        ? `Discount "${discountDescription}" was removed from the app and Shopify!`
        : `Discount "${discountDescription}" was removed from the app!`;
      
      showToast(message);
      
    } catch (error) {
      console.error('❌ Error while deleting discount:', error);
      showToast(`Error while deleting discount: ${error.message}`);
    } finally {
      setDeletingSingleDiscountId(null);
    }
  };
  // OBSLUGA ZMIANY STATUSU ZNIZKI (AKTYWNA/NIEAKTYWNA)
  const handleToggleDiscountStatus = async (discountId, currentIsActive) => {
    try {
      // Sprawdź w nowym systemie panelDiscounts
      let discount = panelDiscounts.find(d => d.id === discountId);
      
      // Jeśli nie znaleziono w panelDiscounts, sprawdź w starym discounts
      if (!discount) {
        discount = discounts.find(d => d.id === discountId);
      }
      
      if (!discount) {
        showToast("Discount not found");
        return;
      }

      const newIsActive = !currentIsActive;
      
      console.log(`🔄 Zmienianie statusu zniżki z ${currentIsActive ? 'aktywna' : 'nieaktywna'} na ${newIsActive ? 'aktywna' : 'nieaktywna'}:`, discount.shopifyDiscountId);

      // Aktualizuj lokalny stan
      const updatedPanelDiscounts = panelDiscounts.map(d => 
        d.id === discountId ? { ...d, isActive: newIsActive } : d
      );
      setPanelDiscounts(updatedPanelDiscounts);
      await saveIndividualDiscounts(updatedPanelDiscounts);

      // Jeśli zniżka ma shopifyDiscountId, zaktualizuj też w Shopify
      if (discount.shopifyDiscountId) {
      let mutation;
        if (newIsActive) {
        mutation = `
          mutation discountAutomaticActivate($id: ID!) {
            discountAutomaticActivate(id: $id) {
              automaticDiscountNode {
                id
                automaticDiscount {
                  ... on DiscountAutomaticBasic {
                    title
                    status
                  }
                  ... on DiscountAutomaticFreeShipping {
                    title
                    status
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;
      } else {
        mutation = `
          mutation discountAutomaticDeactivate($id: ID!) {
            discountAutomaticDeactivate(id: $id) {
              automaticDiscountNode {
                id
                automaticDiscount {
                  ... on DiscountAutomaticBasic {
                    title
                    status
                  }
                  ... on DiscountAutomaticFreeShipping {
                    title
                    status
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;
      }

      const variables = {
        id: discount.shopifyDiscountId
      };

      console.log("Executing mutation:", mutation);
      console.log("Variables:", variables);

      const result = await callShopify(mutation, variables);
      
      if (result.userErrors && result.userErrors.length > 0) {
        throw new Error(result.userErrors[0].message);
      }

      
      }
      
      
      
    } catch (error) {
      console.error("Error changing discount status:", error);
      showToast(`Error changing status: ${error.message}`);
    }
  };

  // OBSLUGA ZMIAN W POLACH FORMULARZA
  const handleChange = (field) => (value) => {
    switch(field) {
      case 'minimumAmount':
        setMinimumAmount(value);
        if (!description) {
          let defaultDesc;
          if (discountType === "free_shipping") {
            defaultDesc = `Free shipping on orders over ${value} ${shopData?.currencyCode || 'USD'}`;
          } else if (discountValueType === 'fixed_amount') {
            defaultDesc = `${discountAmount || '20'} ${shopData?.currencyCode || 'USD'} discount on purchases over ${value} ${shopData?.currencyCode || 'USD'}`;
          } else {
            defaultDesc = `${discountPercentage || '15'}% discount on purchases over ${value} ${shopData?.currencyCode || 'USD'}`;
          }
          setDescription(defaultDesc);
        }
        break;
      case 'discountPercentage':
        setDiscountPercentage(value);
        if (!description && discountValueType === "percentage") {
          setDescription(`${value}% discount on purchases over ${minimumAmount || '100'} ${shopData?.currencyCode || 'USD'}`);
        }
        break;
      case 'discountType':
        setDiscountType(value);
        if (!description) {
          let defaultDesc;
          if (value === "free_shipping") {
            defaultDesc = `Free shipping on orders over ${minimumAmount || '100'} ${shopData?.currencyCode || 'USD'}`;
          } else if (discountValueType === 'fixed_amount') {
            defaultDesc = `${discountAmount || '20'} ${shopData?.currencyCode || 'USD'} discount on purchases over ${minimumAmount || '100'} ${shopData?.currencyCode || 'USD'}`;
          } else {
            defaultDesc = `${discountPercentage || '15'}% discount on purchases over ${minimumAmount || '100'} ${shopData?.currencyCode || 'USD'}`;
          }
          setDescription(defaultDesc);
        }
        break;
      case 'discountAmount':
        setDiscountAmount(value);
        if (!description && discountValueType === "fixed_amount") {
          setDescription(`${value} ${shopData?.currencyCode || 'USD'} discount on purchases over ${minimumAmount || '100'} ${shopData?.currencyCode || 'USD'}`);
        }
        break;
      case 'description':
        setDescription(value);
        break;
    }
  };

  // OBSLUGA KOPIOWANIA EMAILA DO SCHOWKA
  const handleCopyEmail = () => {
    navigator.clipboard.writeText('fajwuwus32@gmail.com');
    
  };
  // (showToast is defined later with global 2.5s timeout)
  // FORMATOWANIE WALUTY
  const formatCurrency = (amount) => {
    const currency = shopData?.currencyCode || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', 
      currency: currency
    }).format(amount);
  };

  // Conditions to Display evaluation removed
  const areAllConditionsMet = undefined;

  // Minimalna kwota z warunków uproszczona do minimumAmount
  const getMinimumAmountFromConditions = (discount) => {
    return discount?.minimumAmount || 0;
  };



  // OBSLUGA WGRYWANIA OBRAZOW DLA NOWEJ ZNIZKI (upload to Shopify Files)
  const handleDropZoneDrop = useCallback((files) => {
    const file = files && files[0];
    if (!file) return;
    try {
      validateImageFile(file);
    } catch (e) {
      showToast(e.message);
      return;
    }
    (async () => {
      try {
        const compressed = await compressImage(file);
        const cdnUrl = await uploadImageToShopify(compressed, 'Discount icon');
        setNewDiscount(prev => ({ ...prev, imageUrl: cdnUrl }));
      } catch (err) {
        console.error('New discount icon upload error:', err);
        showToast(`Error uploading image: ${err.message}`);
      }
    })();
  }, []);

  // OBSLUGA WGRYWANIA OBRAZOW DLA EDYCJI ZNIZKI (upload to Shopify Files)
  const handleEditDropZoneDrop = useCallback((files) => {
    const file = files && files[0];
    if (!file) return;
    try {
      validateImageFile(file);
    } catch (e) {
      showToast(e.message);
      return;
    }
    (async () => {
      try {
        const compressed = await compressImage(file);
        const cdnUrl = await uploadImageToShopify(compressed, 'Discount icon');
        setEditingDiscount(prev => ({ ...prev, imageUrl: cdnUrl }));
      } catch (err) {
        console.error('Edit discount icon upload error:', err);
        showToast(`Error uploading image: ${err.message}`);
      }
    })();
  }, []);

  // Handle image upload for circle button
  const handleCircleImageDrop = useCallback((files) => {
    const file = files[0];
    if (!file) return;
    try {
      validateImageFile(file);
    } catch (e) {
      showToast(e.message);
      return;
    }
    // Local optimistic preview
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviews(prev => ({ ...prev, circleImageUrl: objectUrl }));
    setUploadingMap(prev => ({ ...prev, circleImageUrl: true }));
    (async () => {
      try {
        const compressed = await compressImage(file);
        const cdnUrl = await uploadImageToShopify(compressed, 'Circle button');
        setPanelSettings(prev => ({ ...prev, circleImageUrl: cdnUrl }));
        setHasUnsavedChanges(true);
        setUploadingMap(prev => ({ ...prev, circleImageUrl: false }));
        setLocalPreviews(prev => ({ ...prev, circleImageUrl: '' }));
      } catch (err) {
        console.error('Circle image upload error:', err);
        showToast(`Error uploading circle image: ${err.message}`);
        setUploadingMap(prev => ({ ...prev, circleImageUrl: false }));
      }
    })();
  }, []);

  // USUWANIE OBRAZU Z NOWEJ ZNIZKI
  const handleRemoveNewImage = () => {
    setNewDiscount(prev => ({ ...prev, imageUrl: '' }));
  };

  // USUWANIE OBRAZU Z EDYTOWANEJ ZNIZKI
  const handleRemoveEditImage = () => {
    setEditingDiscount(prev => ({ ...prev, imageUrl: '' }));
  };

  // USUWANIE OBRAZU Z PRZYCISKU KOLA
  const handleRemoveCircleImage = () => {
    setPanelSettings(prev => ({ ...prev, circleImageUrl: '' }));
    setHasUnsavedChanges(true);
  };

  // Funkcje do obsługi obrazów tła dla różnych sekcji
  const handleHeaderImageDrop = useCallback((files) => {
    const file = files[0];
    if (!file) return;
    try {
      validateImageFile(file);
    } catch (e) {
      showToast(e.message);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviews(prev => ({ ...prev, cartValueBackgroundImage: objectUrl }));
    setUploadingMap(prev => ({ ...prev, cartValueBackgroundImage: true }));
    (async () => {
      try {
        const compressed = await compressImage(file);
        const cdnUrl = await uploadImageToShopify(compressed, 'Header background');
        setPanelSettings(prev => ({ ...prev, cartValueBackgroundImage: cdnUrl }));
        setHasUnsavedChanges(true);
        setUploadingMap(prev => ({ ...prev, cartValueBackgroundImage: false }));
        setLocalPreviews(prev => ({ ...prev, cartValueBackgroundImage: '' }));
      } catch (err) {
        console.error('Header image upload error:', err);
        showToast(`Error uploading header image: ${err.message}`);
        setUploadingMap(prev => ({ ...prev, cartValueBackgroundImage: false }));
      }
    })();
  }, []);

  const handleSubheaderImageDrop = useCallback((files) => {
    const file = files && files[0];
    if (!file) return;
    try {
      validateImageFile(file);
    } catch (e) {
      showToast(e.message);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviews(prev => ({ ...prev, highestDiscountBackgroundImage: objectUrl }));
    setUploadingMap(prev => ({ ...prev, highestDiscountBackgroundImage: true }));
    (async () => {
      try {
        const compressed = await compressImage(file);
        const cdnUrl = await uploadImageToShopify(compressed, 'Subheader background');
        setPanelSettings(prev => ({ ...prev, highestDiscountBackgroundImage: cdnUrl }));
        setHasUnsavedChanges(true);
        setUploadingMap(prev => ({ ...prev, highestDiscountBackgroundImage: false }));
        setLocalPreviews(prev => ({ ...prev, highestDiscountBackgroundImage: '' }));
      } catch (err) {
        console.error('Subheader image upload error:', err);
        showToast(`Error uploading subheader image: ${err.message}`);
        setUploadingMap(prev => ({ ...prev, highestDiscountBackgroundImage: false }));
      }
    })();
  }, []);

  const handleFooterImageDrop = useCallback((files) => {
    const file = files[0];
    if (!file) return;
    try {
      validateImageFile(file);
    } catch (e) {
      showToast(e.message);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviews(prev => ({ ...prev, footerBackgroundImage: objectUrl }));
    setUploadingMap(prev => ({ ...prev, footerBackgroundImage: true }));
    (async () => {
      try {
        const compressed = await compressImage(file);
        const cdnUrl = await uploadImageToShopify(compressed, 'Footer background');
        setPanelSettings(prev => ({ ...prev, footerBackgroundImage: cdnUrl }));
        setHasUnsavedChanges(true);
        setUploadingMap(prev => ({ ...prev, footerBackgroundImage: false }));
        setLocalPreviews(prev => ({ ...prev, footerBackgroundImage: '' }));
      } catch (err) {
        console.error('Footer image upload error:', err);
        showToast(`Error uploading footer image: ${err.message}`);
        setUploadingMap(prev => ({ ...prev, footerBackgroundImage: false }));
      }
    })();
  }, []);

  const handleRemoveHeaderImage = () => {
    setPanelSettings(prev => ({ ...prev, cartValueBackgroundImage: '' }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveSubheaderImage = () => {
    setPanelSettings(prev => ({ ...prev, highestDiscountBackgroundImage: '' }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveFooterImage = () => {
    setPanelSettings(prev => ({ ...prev, footerBackgroundImage: '' }));
    setHasUnsavedChanges(true);
  };
  // ROZSZERZONE FUNKCJE ZNIZEK PANELU
  const addManualDiscount = useCallback(async () => {
    const currentDiscountType = discountType || 'percentage';
    if (newDiscount.description && newDiscount.minimumAmount && (newDiscount.discountPercentage || newDiscount.discountAmount || currentDiscountType === 'free_shipping')) {
      try {
        const discount = {
          id: Date.now().toString(), // Używaj string ID dla spójności
          description: newDiscount.description,
          minimumAmount: parseFloat(newDiscount.minimumAmount) || 0,
          discountPercentage: currentDiscountType === 'free_shipping' ? 0 : (parseFloat(newDiscount.discountPercentage) || 0),
          discountAmount: currentDiscountType === 'fixed_amount' ? (parseFloat(newDiscount.discountAmount) || 0) : 0,
          discountValueType: newDiscount.discountValueType || (currentDiscountType === 'fixed_amount' ? 'fixed_amount' : 'percentage'),
          discountType: currentDiscountType,
          imageUrl: newDiscount.imageUrl || '',
          isActive: true,
          createdAt: new Date().toISOString(), // Dodaj createdAt
          isConditional: false, // Manual discounts są bezwarunkowe
          lockedIcon: newDiscount.lockedIcon || '',
          backgroundColor: newDiscount.backgroundColor || '',
          backgroundImage: newDiscount.backgroundImage || '',
          visibleInPanel: true // Domyślnie widoczna w panelu extension
        };
        
        console.log('📝 Adding manual discount:', discount);
        
        const updatedDiscounts = [...panelDiscounts, discount];
        setPanelDiscounts(updatedDiscounts);
        setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
        
        // SAVE TO METAFIELDS! This was missing
        await saveIndividualDiscounts(updatedDiscounts);
        
        setNewDiscount({ description: '', minimumAmount: '', discountPercentage: '', discountAmount: '', discountValueType: 'percentage', imageUrl: '', lockedIcon: '', backgroundColor: '', backgroundImage: '' });
        setDiscountType('percentage');
        setShowAddModal(false);
        setHasUnsavedChanges(true);
      } catch (error) {
        console.error('Error while adding discount:', error);
        showToast('Error while adding discount: ' + error.message);
      }
    }
  }, [newDiscount, discountType, panelDiscounts, saveIndividualDiscounts]);

  const removeDiscount = useCallback(async (id) => {
    setIsDeletingDiscount(true);
    try {
      // Znajdź zniżkę do usunięcia
      const discountToRemove = panelDiscounts.find(d => d.id === id);
      console.log('🔍 Usuwam zniżkę:', discountToRemove);
      
      // KROK 1: Usuń z Shopify jeśli ma shopifyDiscountId
      if (discountToRemove?.shopifyDiscountId) {
        console.log('🗑️ Usuwam zniżkę z Shopify:', discountToRemove.shopifyDiscountId);
        console.log('🔍 Typ aktywacji zniżki:', discountToRemove.activationMethod);
        console.log('🔍 Zniżka do usunięcia z metafields:', discountToRemove);
        
        // SPRAWDŹ CZY TO NASZA ZNIŻKA PRZED USUNIĘCIEM
        console.log('🔐 SPRAWDZENIE BEZPIECZEŃSTWA - czy to nasza zniżka?');
        
        // Najpierw sprawdź bezpośrednio po tytule
        const ourTitles = panelDiscounts.map(d => d.description || d.name);
        const titleMatch = ourTitles.includes(discountToRemove.description || discountToRemove.name);
        console.log('📋 Nasze tytuły:', ourTitles);
        console.log('🔍 Szukany tytuł:', discountToRemove.description || discountToRemove.name);
        console.log('✅ Pasuje tytuł?', titleMatch);
        
        // JEŚLI ZNIŻKA JEST W NASZYCH METAFIELDS, TO NA PEWNO JEST NASZA
        if (titleMatch) {
          console.log('✅ BEZPIECZEŃSTWO: Zniżka znaleziona w metafields - na pewno nasza, można usuwać!');
        } else {
          console.warn('⚠️ BEZPIECZEŃSTWO: Zniżka "' + (discountToRemove.description || discountToRemove.name) + '" nie została rozpoznana jako nasza - POMIJAM usuwanie z Shopify');
          // Usuń tylko z metafields, nie z Shopify
          const updatedDiscounts = panelDiscounts.filter(d => d.id !== id);
          setPanelDiscounts(updatedDiscounts);
          setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
          setHasUnsavedChanges(true);
          await saveIndividualDiscounts(updatedDiscounts);
          
          return;
        }
        
        try {
          let deleteResult;
          
                // Check if it's a discount code or automatic discount
      if (discountToRemove.activationMethod === 'discount_code') {
                // Delete discount code
        console.log('🎫 Deleting discount code from Shopify');
            deleteResult = await callShopify(`
              mutation discountCodeDelete($id: ID!) {
                discountCodeDelete(id: $id) {
                  deletedCodeDiscountId
                  userErrors {
                    field
                    message
                  }
                }
              }
            `, { id: discountToRemove.shopifyDiscountId });
            
            if (deleteResult.discountCodeDelete?.userErrors?.length > 0) {
              console.warn('⚠️ Shopify errors while deleting discount code:', deleteResult.discountCodeDelete.userErrors);
              showToast('Warning: ' + deleteResult.discountCodeDelete.userErrors[0].message);
            } else {
              console.log('✅ Discount code deleted from Shopify successfully');
            }
          } else {
            // Remove automatic discount
            console.log('🤖 Removing automatic discount from Shopify');
            deleteResult = await callShopify(`
              mutation discountAutomaticDelete($id: ID!) {
                discountAutomaticDelete(id: $id) {
                  deletedAutomaticDiscountId
                  userErrors {
                    field
                    message
                  }
                }
              }
            `, { id: discountToRemove.shopifyDiscountId });
            
            if (deleteResult.discountAutomaticDelete?.userErrors?.length > 0) {
              console.warn('⚠️ Shopify errors while deleting automatic discount:', deleteResult.discountAutomaticDelete.userErrors);
              showToast('Warning: ' + deleteResult.discountAutomaticDelete.userErrors[0].message);
            } else {
              console.log('✅ Automatic discount deleted from Shopify successfully');
            }
          }
        } catch (shopifyError) {
          console.error('❌ Error deleting from Shopify:', shopifyError);
          showToast('Warning: Failed to delete from Shopify - ' + shopifyError.message);
        }
      }
      
      // KROK 2: Usuń z lokalnego stanu
      const updatedDiscounts = panelDiscounts.filter(d => d.id !== id);
      setPanelDiscounts(updatedDiscounts);
      setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
      setHasUnsavedChanges(true);
      
      // KROK 3: Usuń z metafields w Shopify przez zapisanie zaktualizowanej listy
      await saveIndividualDiscounts(updatedDiscounts);
      
      showToast(`Discount "${discountToRemove?.description}" successfully removed from the app${discountToRemove?.shopifyDiscountId ? ' and Shopify' : ''}!`);
    } catch (error) {
      console.error('Error while deleting discount:', error);
      showToast('Error while deleting discount: ' + error.message);
    } finally {
      setIsDeletingDiscount(false);
    }
  }, [panelDiscounts, saveIndividualDiscounts]);

  const editDiscount = useCallback((discount) => {
    const discountWithType = {
      ...discount,
      discountType: discount.discountType || (discount.discountPercentage === 0 ? 'free_shipping' : 'percentage'),
      // Dodaj domyślne wartości dla nowych pól
      discountValueType: discount.discountValueType || 'percentage',
      discountAmount: discount.discountAmount || 0
    };
    setEditingDiscount(discountWithType);
    setShowEditModal(true);
  }, []);

  const saveEditedDiscount = useCallback(async () => {
    if (editingDiscount && editingDiscount.description && editingDiscount.minimumAmount && (editingDiscount.discountPercentage || editingDiscount.discountAmount || editingDiscount.discountType === 'free_shipping')) {
      try {
        // Enforce immutable name: keep original description for existing discount
        const updatedDiscounts = panelDiscounts.map(d => {
          if (d.id === editingDiscount.id) {
            // Enforce immutable activation fields for existing discount
            return {
              ...editingDiscount,
              description: d.description,
              activationMethod: d.activationMethod,
              discountCode: d.discountCode
            };
          }
          return d;
        });
        setPanelDiscounts(updatedDiscounts);
        setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
        
        // SAVE CHANGES TO METAFIELDS! This was missing
        await saveIndividualDiscounts(updatedDiscounts);
        
        setShowEditModal(false);
        setEditingDiscount(null);
        setHasUnsavedChanges(true);
        showToast('Discount updated and successfully saved in metafields!');
      } catch (error) {
        console.error('Error while updating discount:', error);
        showToast('Error while updating discount: ' + error.message);
      }
    }
  }, [editingDiscount, panelDiscounts, saveIndividualDiscounts]);

  const confirmDelete = useCallback((discount) => {
    setDiscountToDelete(discount);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmedDelete = useCallback(async () => {
    if (discountToDelete) {
      await removeDiscount(discountToDelete.id);
      setDiscountToDelete(null);
      setShowDeleteConfirm(false);
    }
  }, [discountToDelete, removeDiscount]);

  const toggleDiscountSelection = useCallback((discountId) => {
    setSelectedDiscounts(prev => 
      prev.includes(discountId) 
        ? prev.filter(id => id !== discountId)
        : [...prev, discountId]
    );
  }, []);

  const toggleAllDiscounts = useCallback((checked) => {
    const currentFilteredDiscounts = panelDiscounts.filter(discount => {
      const matchesSearch = discount.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           discount.minimumAmount.toString().includes(searchQuery) ||
                           discount.discountPercentage.toString().includes(searchQuery);
      
      const matchesFilter = filterStatus === 'all' || 
                           (filterStatus === 'active' && discount.isActive) ||
                           (filterStatus === 'inactive' && !discount.isActive);
      
      return matchesSearch && matchesFilter;
    });
    
    setSelectedDiscounts(checked ? currentFilteredDiscounts.map(d => d.id) : []);
  }, [panelDiscounts, searchQuery, filterStatus]);

  const bulkDeleteDiscounts = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      const discountsToDelete = panelDiscounts.filter(d => selectedDiscounts.includes(d.id));
      const deletedCount = discountsToDelete.length;
      console.log(`🗑️ Masowe usuwanie ${deletedCount} zniżek:`, discountsToDelete);
      
      // KROK 1: Usuń z Shopify wszystkie które mają shopifyDiscountId
      const shopifyDeletePromises = discountsToDelete
        .filter(discount => discount.shopifyDiscountId)
        .map(async (discount) => {
          try {
            console.log('🗑️ Usuwam z Shopify:', discount.description, discount.shopifyDiscountId);
            console.log('🔍 Typ aktywacji:', discount.activationMethod);
            
            let deleteResult;
            
            // Check if it's a discount code or automatic discount
            if (discount.activationMethod === 'discount_code') {
              // Delete discount code
              console.log('🎫 Deleting discount code from Shopify');
              deleteResult = await callShopify(`
                mutation discountCodeDelete($id: ID!) {
                  discountCodeDelete(id: $id) {
                    deletedCodeDiscountId
                    userErrors {
                      field
                      message
                    }
                  }
                }
              `, { id: discount.shopifyDiscountId });
              
              if (deleteResult.discountCodeDelete?.userErrors?.length > 0) {
                console.warn(`⚠️ Error deleting discount code ${discount.description}:`, deleteResult.discountCodeDelete.userErrors);
                return { success: false, discount, error: deleteResult.discountCodeDelete.userErrors[0].message };
              } else {
                console.log(`✅ Discount code ${discount.description} deleted from Shopify`);
                return { success: true, discount };
              }
            } else {
              // Usuń automatyczną zniżkę
              console.log('🤖 Usuwam automatyczną zniżkę z Shopify');
              deleteResult = await callShopify(`
                mutation discountAutomaticDelete($id: ID!) {
                  discountAutomaticDelete(id: $id) {
                    deletedAutomaticDiscountId
                    userErrors {
                      field
                      message
                    }
                  }
                }
              `, { id: discount.shopifyDiscountId });
              
              if (deleteResult.discountAutomaticDelete?.userErrors?.length > 0) {
                console.warn(`⚠️ Błędy usuwania automatycznej zniżki ${discount.description}:`, deleteResult.discountAutomaticDelete.userErrors);
                return { success: false, discount, error: deleteResult.discountAutomaticDelete.userErrors[0].message };
              } else {
                console.log(`✅ Automatyczna zniżka ${discount.description} usunięta z Shopify`);
                return { success: true, discount };
              }
            }
          } catch (error) {
            console.error(`❌ Błąd usuwania ${discount.description} z Shopify:`, error);
            return { success: false, discount, error: error.message };
          }
        });

      const shopifyResults = await Promise.all(shopifyDeletePromises);
      const shopifyErrors = shopifyResults.filter(r => !r.success);
      
      if (shopifyErrors.length > 0) {
        console.warn('⚠️ Some discounts were not deleted from Shopify:', shopifyErrors);
        showToast(`Warning: Failed to delete ${shopifyErrors.length} discount(s) from Shopify`);
      }
      
      // KROK 2: Usuń z lokalnego stanu i metafields
      const updatedDiscounts = panelDiscounts.filter(d => !selectedDiscounts.includes(d.id));
      setPanelDiscounts(updatedDiscounts);
      setPanelSettings(prev => ({ ...prev, discounts: updatedDiscounts }));
      setSelectedDiscounts([]);
      setShowBulkActions(false);
      setHasUnsavedChanges(true);
      
      // KROK 3: Usuń z metafields w Shopify
      await saveIndividualDiscounts(updatedDiscounts);
      
      const shopifyDeletedCount = shopifyResults.filter(r => r.success).length;
      const message = shopifyDeletedCount > 0 
        ? `${deletedCount} discounts removed from the app (${shopifyDeletedCount} also from Shopify)!`
        : `${deletedCount} discounts removed from the app!`;
      
      showToast(message);
    } catch (error) {
      console.error('Bulk discount deletion error:', error);
      showToast('Bulk discount deletion error: ' + error.message);
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedDiscounts, panelDiscounts, saveIndividualDiscounts]);

  const exportSettings = useCallback(() => {
    setIsExporting(true);
    const exportData = {
      panelSettings,
      panelDiscounts,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskify-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setIsExporting(false);
    setShowExportModal(false);
    
  }, [panelSettings, panelDiscounts]);

  const handleImportDiscounts = useCallback(async () => {
    setShowImportModal(false);
    setIsImporting(true);
    
    try {
      // Get existing automatic discounts from Shopify
      const automaticDiscountsData = await callShopify(`
        query getAutomaticDiscounts {
          automaticDiscountNodes(first: 250) {
            edges {
              node {
                id
                automaticDiscount {
                  ... on DiscountAutomaticBasic {
                    title
                    status
                    startsAt
                    endsAt
                    customerGets {
                      value {
                        ... on DiscountPercentage {
                          percentage
                        }
                      }
                    }
                    minimumRequirement {
                      ... on DiscountMinimumSubtotal {
                        greaterThanOrEqualToSubtotal {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                  ... on DiscountAutomaticFreeShipping {
                    title
                    status
                    startsAt
                    endsAt
                    minimumRequirement {
                      ... on DiscountMinimumSubtotal {
                        greaterThanOrEqualToSubtotal {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                  ... on DiscountAutomaticApp {
                    title
                    status
                    startsAt
                    endsAt
                    appDiscountType {
                      functionId
                      app {
                        title
                      }
                    }
                    discountClass
                  }
                }
              }
            }
          }
        }
      `);

      // Process automatic discounts
      const importedDiscounts = automaticDiscountsData?.automaticDiscountNodes?.edges?.map(({ node }, index) => {
        const discount = node.automaticDiscount;
        const isBasicDiscount = discount.customerGets !== undefined;
        const isAppDiscount = discount.appDiscountType !== undefined;
        const isFreeShipping = !isBasicDiscount && !isAppDiscount;
        
        return {
          id: Date.now() + index,
          description: discount.title || `Imported Discount ${index + 1}`,
          minimumAmount: parseFloat(discount.minimumRequirement?.greaterThanOrEqualToSubtotal?.amount || 0),
          discountPercentage: isBasicDiscount ? parseFloat(((discount.customerGets?.value?.percentage || 0) * 100).toFixed(1)) : (isAppDiscount ? 15 : 0), // Domyślny 15% dla APP discount
          discountAmount: 0, // Domyślnie 0 dla zniżek z Shopify
          discountValueType: 'percentage', // Domyślnie percentage dla zniżek z Shopify
          discountType: isBasicDiscount ? 'percentage' : (isAppDiscount ? 'app_discount' : 'free_shipping'),
          imageUrl: '',
          isActive: discount.status === 'ACTIVE',
          shopifyDiscountId: node.id,
          importedDate: new Date().toISOString(),
          lockedIcon: '',
          backgroundColor: '',
          backgroundImage: '',
          visibleInPanel: true, // Domyślnie widoczna w panelu extension
          // Dodaj informacje specyficzne dla APP discount
          ...(isAppDiscount && {
            functionId: discount.appDiscountType.functionId,
            appTitle: discount.appDiscountType.app?.title,
            discountClass: discount.discountClass
          })
        };
      }) || [];

      setPanelDiscounts(importedDiscounts);
      setPanelSettings(prev => ({ ...prev, discounts: importedDiscounts }));
      setHasUnsavedChanges(true);
      
    } catch (error) {
      console.error("Error importing discounts:", error);
      showToast("Error importing discounts: " + error.message);
    } finally {
      setIsImporting(false);
    }
  }, []);

  // OBSLUGA ZAKLADEK
  const handleTabChange = useCallback((newTab) => {
    if (navigationLocked) {
      showToast('You have unsaved changes. Please Save or Discard first.');
      return;
    }
    setSelectedTab(newTab);
  }, [navigationLocked]);

  // SORTOWANIE ZNIZEK
  const getSortedDiscounts = (discounts, sortOption) => {
    const sorted = [...discounts];
    
    switch (sortOption) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case "oldest":
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case "amount_asc":
        return sorted.sort((a, b) => a.minimumAmount - b.minimumAmount);
      case "amount_desc":
        return sorted.sort((a, b) => b.minimumAmount - a.minimumAmount);
      case "percentage_asc":
        return sorted.sort((a, b) => a.discountPercentage - b.discountPercentage);
      case "percentage_desc":
        return sorted.sort((a, b) => b.discountPercentage - a.discountPercentage);
      default:
        return sorted;
    }
  };

  const toastMarkup = toastActive ? (
    <Toast content={toastMessage} onDismiss={() => setToastActive(false)} duration={2500} />
  ) : null;

  function showToast(message) {
    setToastMessage(message);
    setToastActive(true);
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    const timer = setTimeout(() => setToastActive(false), 2500);
    setToastTimer(timer);
  }
  //KOD LADOWANIA APLIKACJI
  if (isLoading) {
    return (
      <Frame>
        <Page title="Loading...">
          <Layout>
            <Layout.Section variant="fullWidth">
              <Card>
                <BlockStack gap={300} align="center">
                  <Spinner size="large" />
                  <Text variant="headingMd">Loading Taskify...</Text>
                  <Text tone="subdued">Please wait, connecting to your store</Text>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </Frame>
    );
  }
  // WIDOK POWITALNY - STRONA GLOWNA
  const renderWelcomeView = () => (
    <>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingLg">
                Quick start guide
              </Text>
              {expanded !== null && ( // Pokaż przycisk tylko gdy stan jest załadowany
                <Button
                  variant="plain"
                  disclosure={expanded ? 'up' : 'down'}
                  onClick={() => {
                    const newExpandedState = !expanded;
                    setExpanded(newExpandedState);
                    
                    // Zapisz nowy stan do ustawień panelu
                    setPanelSettings(prev => ({
                      ...prev,
                      startGuideExpanded: newExpandedState
                    }));
                    
                    // Automatycznie zapisz ustawienia
                    const updatedSettings = {
                      ...panelSettings,
                      startGuideExpanded: newExpandedState
                    };
                    savePanelSettings(updatedSettings);
                  }}
                >
                  {expanded ? 'Hide guide' : 'Show guide'}
                </Button>
              )}
            </InlineStack>
            {expanded === true && ( // Pokaż zawartość tylko gdy jest prawdziwie rozwinięty
              <>
                <Text variant="bodyMd">
                  Welcome to Automatic Reward Panel! This guide will help you get started with managing automatic rewards and discounts.
                </Text>
                <Text as="h3" variant="headingMd">
                  Key steps to get started:
                </Text>
                <List type="bullet">
                  <List.Item>Plan your rewards – Decide on the discount type and conditions you want to offer to your customers.</List.Item>
                  <List.Item>Create a discount – Click the "Manage Discounts" button below and set up your automatic reward system.</List.Item>
                  <List.Item>Customize your panel – Use the "Panel Settings" to adjust the appearance and behavior of your reward panel.</List.Item>
                </List>
                <Text variant="bodySm" tone="subdued">
                  You can access this guide anytime by returning to the welcome page.
                </Text>
              </>
            )}
          </BlockStack>
        </Card>
      </Layout.Section>
      
      {/* Card z listą zniżek */}
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd" alignment="center">
              📊Taskfy discounts list📊
            </Text>
            
            {/* Tabelka z zniżkami - identyczna jak w Manage Discounts */}
            <Box padding="400">
              {panelDiscounts && panelDiscounts.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                  headings={['Date of creation', 'Discount Type', 'Discount Name', 'Discount Conditions', 'Settings']}
                  rows={getSortedDiscounts(panelDiscounts.slice(0, 5), sortOption).map((discount, index) => [
                    (
                      <div>
                        <Text variant="bodyMd">
                          {new Date(discount.createdAt).toLocaleDateString('pl-PL')}
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          {new Date(discount.createdAt).toLocaleTimeString('pl-PL', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                      </div>
                    ),
                    (
                      <Badge tone={discount.discountType === 'free_shipping' ? "info" : "attention"}>
                        {discount.discountType === 'free_shipping' ? '🚚 Delivery' : '💰 Order'}
                      </Badge>
                    ),
                    (
                      <div style={{ maxWidth: '200px' }}>
                        <Text variant="bodyMd" truncate>
                          {discount.description}
                        </Text>
                      </div>
                    ),
                    (
                      <div>
                        {discount.isConditional ? (
                          <InlineStack gap="100" wrap>
                            {(() => {
                              const conditionsCount = Array.isArray(discount.conditions)
                                ? discount.conditions.length
                                : ['countryRestriction', 'cartTotalMin', 'customerTags']
                                    .reduce((sum, key) => sum + (discount.conditions?.[key] ? 1 : 0), 0);
                              return (
                                <Badge size="small" tone="warning">
                                  {`⚙️ Conditional${conditionsCount > 0 ? ` (${conditionsCount})` : ''}`}
                                </Badge>
                              );
                            })()}
                            {discount.conditions?.countryRestriction && (
                              <Badge size="small" tone="info">🌍 Kraj</Badge>
                            )}
                            {discount.conditions?.cartTotalMin && (
                              <Badge size="small" tone="info">💰 Min</Badge>
                            )}
                            {discount.conditions?.customerTags && (
                              <Badge size="small" tone="info">👤 Tagi</Badge>
                            )}
                          </InlineStack>
                        ) : (
                          <Badge size="small" tone="success">✅ Unconditional</Badge>
                        )}
                      </div>
                    ),
                    (
                      <InlineStack gap="200" align="start">
                        <Button
                          variant="secondary"
                          size="slim"
                          onClick={() => {
                            handleViewDiscount(discount);
                            setActiveView("discounts");
                          }}
                        >
                          ✏️ Edit
                        </Button>
                        <Button
                          variant="primary"
                          size="slim"
                          tone={discount.isActive ? "success" : "critical"}
                          onClick={async () => await handleToggleDiscountStatus(discount.id, discount.isActive)}
                          loading={isDeletingDiscount}
                        >
                          {discount.isActive ? "✅ Activated" : "❌ Disabled"}
                        </Button>
                        <Button
                          variant="primary"
                          tone="critical"
                          size="slim"
                          onClick={async () => await handleDeleteSingleDiscount(discount.id, discount.description)}
                          loading={deletingSingleDiscountId === discount.id}
                        >
                          🗑️ Delete
                        </Button>
                      </InlineStack>
                    )
                  ])}
                />
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: '#6b7280',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px dashed #d1d5db'
                }}>
                  <Text variant="bodyMd" tone="subdued">
                    🎯 No discounts to display
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Add your first discount below
                  </Text>
                </div>
              )}
              
                             {panelDiscounts && panelDiscounts.length > 5 && (
                 <div style={{ 
                   textAlign: 'center',
                   marginTop: '16px',
                   padding: '8px',
                   fontSize: '13px',
                   color: '#6b7280',
                   fontStyle: 'italic'
                 }}>
                   ... and {panelDiscounts.length - 5} more
                 </div>
               )}
               
               {/* Pusta przestrzeń między tabelką a przyciskiem */}
               <div style={{ height: '24px' }}></div>
               
               {/* Przycisk na pełną szerokość */}
                <Button 
                  variant="primary" 
                  size="large"
                  onClick={() => { if (navigationLocked) { showToast('You have unsaved changes. Please Save or Discard first.'); return; } setActiveView("discounts"); }}
                  fullWidth
                >
                 Manage Discounts
               </Button>
            </Box>
          </BlockStack>
        </Card>
      </Layout.Section>
      
      <Layout.Section oneHalf>
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd" alignment="center">
              Panel Customization
            </Text>
            <Box padding="400">
              <BlockStack gap="300" align="center">
                <Text variant="bodyMd" alignment="center">
                  Customize the appearance and behavior of your automatic reward panel
                </Text>
                <Text variant="bodyMd" alignment="center" tone="subdued">
                  Configure colors, text, layout and display options to match your store's design
                </Text>
                <Button 
                  variant="primary" 
                  size="large"
                  onClick={() => { if (navigationLocked) { showToast('You have unsaved changes. Please Save or Discard first.'); return; } setActiveView("panel-settings"); }}
                >
                  Panel Settings
                </Button>
              </BlockStack>
            </Box>
          </BlockStack>
        </Card>
      </Layout.Section>
      <Layout.Section>
        <Box align="center">
          <Button variant="plain">
            <InlineStack gap={200} align="center">
              <Icon source={ChatIcon} />
              <Text 
                variant="bodyLg"
                onClick={handleCopyEmail}
                style={{ cursor: 'pointer' }}
              >
                Need help? Contact support: fajwuwus32@gmail.com
              </Text>
            </InlineStack>
          </Button>
        </Box>
      </Layout.Section>
    </>
  );
  //KOD DO WYSWIETLANIA PANELU ZNIZKI
  const renderDiscountsView = () => {
    // Sprawdź czy jesteśmy w trybie edycji zniżki
    if (discountCreationMode === 'edit' && editingDiscount) {
      return (
        <Layout.Section variant="fullWidth">
          <Form data-save-bar onSubmit={async (event) => {
            event.preventDefault();
            try {
              // Utwórz zaktualizowaną zniżkę z nowymi warunkami
              const updatedDiscount = {
                ...editingDiscount,
                activationMethod: activationMethod,
                discountCode: activationMethod === 'discount_code' ? discountCode.trim() : '',
                combinesWith: combinesWith, // ✅ DODANO: Zapisz ustawienia kombinacji zniżek
                conditions: isConditionalDiscount ? conditions : [],
                isConditional: isConditionalDiscount,
                checkoutNotMetMessage: showCheckoutNotMetMessage ? (checkoutNotMetMessage || "") : ""
              };
              
              // Zaktualizuj zniżkę w panelDiscounts
              const updatedDiscounts = panelDiscounts.map(d => 
                d.id === editingDiscount.id ? updatedDiscount : d
              );
              await saveIndividualDiscounts(updatedDiscounts);
              setPanelDiscounts(updatedDiscounts);
              setEditingDiscount(null);
              setDiscountCreationMode(null);
              resetFormFields(); // Resetuj także warunki
              
              // Hide Save Bar after successful edit
              try { shopify && shopify.saveBar.hide('discount-save-bar').catch(() => {}); } catch (_) {}
              
              // Keep: success toast after updating a discount
              showToast('Discount has been updated!');
            } catch (error) {
              console.error('Error while updating discount:', error);
              showToast('Error while updating discount: ' + error.message);
            }
          }}>
            
                         <BlockStack gap="500">
               {/* General settings */}
               <Card>
                 <BlockStack gap="400">
                                     <Text as="h3" variant="headingMd">
                    ⚙️ General settings
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Edit basic discount settings.
                  </Text>
                   
                   <Card>
                     <BlockStack gap="300">
                       <Text as="h4" variant="headingSm">
                         Discount name
                       </Text>
                       <TextField
                         label=""
                         value={editingDiscount.description}
                         disabled
                         helpText="You cannot change the discount name. To rename, delete and create a new discount."
                         placeholder="e.g. 15% discount for purchases over 300 USD"
                         maxLength={50}
                         showCharacterCount
                       />
                     </BlockStack>
                   </Card>
                   
                   {editingDiscount.discountType !== 'free_shipping' && (
                     <Card>
                      <BlockStack gap="300">
                          <Text as="h4" variant="headingSm">
                            Discount value type
                          </Text>
                          <ChoiceList
                            choices={[
                              { label: 'Percentage (e.g. 15%)', value: 'percentage' },
                              { label: 'Fixed amount (e.g. 20 USD)', value: 'fixed_amount' }
                            ]}
                            selected={[editingDiscount.discountValueType || 'percentage']}
                            onChange={(value) => setEditingDiscount(prev => ({ 
                              ...prev, 
                              discountValueType: value[0],
                              discountPercentage: value[0] === 'percentage' ? prev.discountPercentage : 0,
                              discountAmount: value[0] === 'fixed_amount' ? prev.discountAmount : 0
                            }))}
                          />
                          {(editingDiscount.discountValueType || 'percentage') === 'percentage' ? (
                            <TextField
                              label="Percentage discount value"
                              type="number"
                              step="0.1"
                              value={editingDiscount.discountPercentage?.toString() || ''}
                              onChange={(value) => setEditingDiscount(prev => ({ ...prev, discountPercentage: parseFloat(value) || 0 }))}
                              placeholder="15.5"
                              suffix="%"
                              helpText="Discount percent (e.g. 15.5 for 15.5%)"
                            />
                          ) : (
                            <TextField
                              label="Fixed discount amount"
                              type="number"
                              step="0.01"
                              value={editingDiscount.discountAmount?.toString() || ''}
                              onChange={(value) => setEditingDiscount(prev => ({ ...prev, discountAmount: parseFloat(value) || 0 }))}
                              placeholder="20.00"
                              suffix={shopData?.currencyCode || 'USD'}
                              helpText="Fixed discount amount (e.g. 20.00 for 20 USD)"
                            />
                          )}
                      </BlockStack>
                     </Card>
                   )}
                   
                   <Card>
                     <BlockStack gap="300">
                       <Text as="h4" variant="headingSm">
                         How discount should be activated?
                       </Text>
                       <ChoiceList
                         choices={[
                           { label: 'Automatically', value: 'automatic' },
                           { label: 'With discount code', value: 'discount_code' }
                         ]}
                         selected={[activationMethod]}
                         onChange={(value) => setActivationMethod(value[0])}
                         disabled={Boolean(editingDiscount)}
                       />
                       {activationMethod === 'discount_code' && (
                         <TextField
                           label="Discount code"
                           value={discountCode}
                           onChange={setDiscountCode}
                           placeholder={editingDiscount.discountType === 'free_shipping' ? "e.g. FREESHIP" : "e.g. SAVE15"}
                           helpText="Code that customers will enter at checkout"
                           disabled={Boolean(editingDiscount)}
                         />
                       )}
                       {Boolean(editingDiscount) && (
                         <Text tone="subdued">Activation method cannot be changed for an existing discount. Delete and create a new discount to change this.</Text>
                       )}
                     </BlockStack>
                   </Card>

                    <Card>
                      <BlockStack gap="300">
                        <Text as="h4" variant="headingSm">Active dates</Text>
                         <Text variant="bodyMd" tone="subdued">
                           Control when this discount should be available to your customers. Current timezone: {shopData?.ianaTimezone || SHOP_TIMEZONE} ({getTimeZoneAbbreviation(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE)})
                         </Text>
                        <InlineStack gap="300">
                          <Box style={{ flex: 1 }}>
                            <TextField
                              type="date"
                              label="Start date"
                              value={startDate}
                              onChange={setStartDate}
                            />
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <TextField
                              type="time"
                              label={`Start time (${getTimeZoneAbbreviation(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE)})`}
                              value={startTime}
                              onChange={setStartTime}
                              helpText={`Shop time zone: ${shopData?.ianaTimezone || SHOP_TIMEZONE}`}
                            />
                          </Box>
                        </InlineStack>
                        <Checkbox
                          label="Set end date"
                          checked={hasEndDate}
                          onChange={setHasEndDate}
                        />
                        {hasEndDate && (
                          <InlineStack gap="300">
                            <Box style={{ flex: 1 }}>
                              <TextField
                                type="date"
                                label="End date"
                                value={endDate}
                                onChange={setEndDate}
                              />
                            </Box>
                            <Box style={{ flex: 1 }}>
                              <TextField
                                type="time"
                                label={`End time (${getTimeZoneAbbreviation(endDate, endTime, EFFECTIVE_SHOP_TIMEZONE)})`}
                                value={endTime}
                                onChange={setEndTime}
                                helpText={`Shop time zone: ${shopData?.ianaTimezone || SHOP_TIMEZONE}`}
                              />
                            </Box>
                          </InlineStack>
                        )}
                      </BlockStack>
                    </Card>
                   
                   <Card>
                     <BlockStack gap="300">
                       <Text as="h4" variant="headingSm">
                         What other discounts can this combine with?
                       </Text>
                       <Text variant="bodyMd" tone="subdued">
                         Select discount types that can be used simultaneously with this discount
                       </Text>
                       {editingDiscount?.shopifyDiscountId && (
                         <Banner tone="critical">
                           <Text variant="bodyMd">
                             🚫 <strong>Cannot edit discount combination settings</strong><br/>
                             Shopify API doesn't allow changing these settings for existing discounts. 
                             To change discount combinations, you must delete this discount and create a new one.
                           </Text>
                         </Banner>
                       )}
                       <BlockStack gap="200">
                         {editingDiscount?.shopifyDiscountId ? (
                           // Tryb tylko do odczytu - pokaż aktualne ustawienia bez możliwości edycji
                           <>
                             <InlineStack gap="200" align="start">
                               <Text variant="bodyMd" tone={combinesWith.orderDiscounts ? "success" : "subdued"}>
                                 {combinesWith.orderDiscounts ? "✅" : "❌"} Order discounts
                               </Text>
                             </InlineStack>
                            
                            
                             <Text variant="bodySm" tone="subdued" style={{ marginLeft: '24px' }}>
                               {combinesWith.orderDiscounts ? "Can be combined with other order discounts" : "Cannot be combined with other order discounts"}
                             </Text>
                             
                             <InlineStack gap="200" align="start">
                               <Text variant="bodyMd" tone={combinesWith.productDiscounts ? "success" : "subdued"}>
                                 {combinesWith.productDiscounts ? "✅" : "❌"} Product discounts
                               </Text>
                             </InlineStack>
                            {/* Subheader Text Align */}
                            
                            
                             <Text variant="bodySm" tone="subdued" style={{ marginLeft: '24px' }}>
                               {combinesWith.productDiscounts ? "Can be combined with other product discounts" : "Cannot be combined with other product discounts"}
                             </Text>
                             
                             {/* Ukryj opcję "Zniżki na wysyłkę" dla zniżek na dostawę - nie mogą się łączyć */}
                             {editingDiscount?.discountType !== 'free_shipping' && (
                               <>
                                 <InlineStack gap="200" align="start">
                                   <Text variant="bodyMd" tone={combinesWith.shippingDiscounts ? "success" : "subdued"}>
                                     {combinesWith.shippingDiscounts ? "✅" : "❌"} Shipping discounts
                                   </Text>
                                 </InlineStack>
                                 <Text variant="bodySm" tone="subdued" style={{ marginLeft: '24px' }}>
                                   {combinesWith.shippingDiscounts ? "Can be combined with other shipping discounts" : "Cannot be combined with other shipping discounts"}
                                 </Text>
                               </>
                             )}
                           </>
                         ) : (
                           // Edit mode - normal checkboxes
                           <>
                             <Checkbox
                               label="Order discounts"
                               checked={combinesWith.orderDiscounts}
                               onChange={(value) => handleCombinesWithChange('orderDiscounts', value)}
                               helpText="Can be combined with other order discounts"
                             />
                             <Checkbox
                               label="Product discounts"
                               checked={combinesWith.productDiscounts}
                               onChange={(value) => handleCombinesWithChange('productDiscounts', value)}
                               helpText="Can be combined with other product discounts"
                             />
                             {/* Hide "Shipping discounts" option for shipping discounts - they can't combine */}
                             {editingDiscount?.discountType !== 'free_shipping' && (
                               <Checkbox
                                 label="Shipping discounts"
                                 checked={combinesWith.shippingDiscounts}
                                 onChange={(value) => handleCombinesWithChange('shippingDiscounts', value)}
                                 helpText="Can be combined with other shipping discounts"
                               />
                             )}
                           </>
                         )}
                       </BlockStack>
                     </BlockStack>
                   </Card>
                   
                {/* Checkout message when conditions are not met */}
             
                    {/* Checkout message when conditions are not met (edit) - placed above conditions card */}
                    <Card>
                      <BlockStack gap="300">
                        <Text as="h4" variant="headingSm">
                          Checkout message when conditions are not met
                        </Text>
                        <Text tone="subdued">
                          If enabled, this message will appear at checkout when the discount conditions are not satisfied.
                        </Text>
                        <Checkbox
                          label="Show custom message at checkout"
                          checked={showCheckoutNotMetMessage}
                          onChange={(checked) => setShowCheckoutNotMetMessage(checked)}
                        />
                        {showCheckoutNotMetMessage && (
                          <TextField
                            label="Message to display"
                            value={checkoutNotMetMessage}
                            onChange={setCheckoutNotMetMessage}
                            placeholder="Conditions for this discount are not met yet."
                            multiline={3}
                          />
                        )}
                      </BlockStack>
                    </Card>

                   <Card>
                     <BlockStack gap="300">
                       <Text as="h4" variant="headingSm">
                         When should this discount be active?
                       </Text>
                       <InlineStack align="space-between">
                         <ChoiceList
                           choices={[
                             { label: 'Always', value: 'always' },
                             { label: 'When conditions are met', value: 'conditional' }
                           ]}
                           selected={isConditionalDiscount ? ['conditional'] : ['always']}
                           onChange={(value) => setIsConditionalDiscount(value.includes('conditional'))}
                         />
                         {isConditionalDiscount && conditions.length < 10 && (
                           <Button onClick={addCondition}>
                             ➕ Add new condition
                           </Button>
                         )}
                       </InlineStack>
                     </BlockStack>
                   </Card>
                 </BlockStack>
               </Card>

               {/* Conditions - only show if conditional */}
               {isConditionalDiscount && (
                 <BlockStack gap="400">
                                           {conditions.map((condition, index) => (
                          <Card key={condition.id}>
                            <BlockStack gap="400">
                              <InlineStack align="space-between">
                                <Button
                                  variant="plain"
                                  onClick={() => toggleConditionCollapse(condition.id)}
                                  
                                >
                                  <Text as="h3" variant="headingMd">
                                    📋{collapsedConditions[condition.id] ? '' : ''}  Condition #{index + 1}
                                  </Text>
                                </Button>
                                {conditions.length > 1 && (
                                  <Button 
                                    variant="plain" 
                                    tone="critical" 
                                    onClick={() => removeCondition(condition.id)}
                                  >
                                    Delete
                                  </Button>
                                )}
                              </InlineStack>
                              
                              {!collapsedConditions[condition.id] && (
                                <>
                                  <Text variant="bodyMd" tone="subdued">
                                    Select when this discount should be active.
                                  </Text>
                                  
                                  <BlockStack gap="300">
                                    {/* Typ warunku i Operator w jednej linii */}
                                    <InlineStack gap="400">
                                      <div style={{ flex: 1 }}>
                                        <Select
                                          label="Condition type"
                                          options={conditionTypes}
                                          value={condition.type}
                                          onChange={(value) => {
                                            updateCondition(condition.id, 'type', value);
                                            // Reset operator and value when type changes
                                            const newOperators = getOperatorOptions(value);
                                            updateCondition(condition.id, 'operator', newOperators[0]?.value || 'equals');
                                            updateCondition(condition.id, 'value', '');
                                          }}
                                        />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <Select
                                          label="Operator"
                                          options={getOperatorOptions(condition.type)}
                                          value={condition.operator}
                                          onChange={(value) => updateCondition(condition.id, 'operator', value)}
                                        />
                                      </div>
                                    </InlineStack>
                                    
                                    {/* Value field */}
                                    {renderConditionValue(condition)}
                                  </BlockStack>
                                </>
                              )}
                            </BlockStack>
                          </Card>
                        ))}
                 </BlockStack>
               )}
             </BlockStack>
          </Form>
        </Layout.Section>
      );
    }
    // Sprawdź czy jesteśmy w trybie tworzenia zniżki
    if (discountCreationMode === 'order') {
      return (
    
          <Layout.Section variant="fullWidth">
            {/* Form with separate cards */}
            <Form data-save-bar onSubmit={handleCreateDiscount}>
              <BlockStack gap="500">
                    {/* General settings */}
                    <Card>
                      <BlockStack gap="400">
                        <Text as="h2" variant="headingLg">
                          🛒 Creating order discount
                        </Text>
                        <Text as="h3" variant="headingMd">
                          ⚙️ General settings
                        </Text>
                        <Text variant="bodyMd" tone="subdued">
                          Start with basics like the discount name and how it works.
                        </Text>
                        
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              Discount name
                            </Text>
                            <TextField
                              label=""
                              value={discountName}
                              onChange={setDiscountName}
                              placeholder="e.g. 15% discount for purchases over 300 USD"
                              helpText="What should this discount be called"
                              maxLength={50}
                              showCharacterCount
                            />
                          </BlockStack>
                        </Card>
                        
                        
                        
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              Discount value type
                            </Text>
                            <ChoiceList
                              choices={[
                                { label: 'Percentage (e.g. 15%)', value: 'percentage' },
                                { label: 'Fixed amount (e.g. 20 USD)', value: 'fixed_amount' }
                              ]}
                              selected={[discountValueType]}
                              onChange={(value) => setDiscountValueType(value[0])}
                            />
                          </BlockStack>
                        </Card>

                        <Card>
                          <BlockStack gap="300">
                            {discountValueType === 'percentage' ? (
                              <TextField
                                label="Percentage discount value"
                                type="number"
                                step="0.1"
                                value={discountPercentage}
                                onChange={setDiscountPercentage}
                                placeholder="15.5"
                                suffix="%"
                                helpText="Discount percent (e.g. 15.5 for 15.5%)"
                              />
                            ) : (
                              <TextField
                                label="Fixed discount amount"
                                type="number"
                                step="0.01"
                                value={discountAmount}
                                onChange={setDiscountAmount}
                                placeholder="20.00"
                                suffix={shopData?.currencyCode || 'USD'}
                                helpText="Fixed discount amount (e.g. 20.00 for 20 USD)"
                              />
                            )}
                          </BlockStack>
                        </Card>
                        
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              How do you want to activate this discount?
                            </Text>
                            <ChoiceList
                              choices={[
                                { label: 'Automatically', value: 'automatic' },
                                { label: 'With discount code', value: 'discount_code' }
                              ]}
                              selected={[activationMethod]}
                              onChange={(value) => setActivationMethod(value[0])}
                              disabled={Boolean(editingDiscount)}
                            />
                            {activationMethod === 'discount_code' && (
                              <TextField
                                label="Discount code"
                                value={discountCode}
                                onChange={setDiscountCode}
                                placeholder="e.g. SAVE15"
                                helpText="Code that customers will enter in their cart"
                                disabled={Boolean(editingDiscount)}
                              />
                            )}
                            {Boolean(editingDiscount) && (
                              <Text tone="subdued">Activation method cannot be changed for an existing discount. Delete and create a new discount to change this.</Text>
                            )}
                          </BlockStack>
                        </Card>

                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">Active dates</Text>
                            <Text variant="bodyMd" tone="subdued">
                              Control when this discount should be available to your customers. Current timezone: {getTimeZoneAbbreviation(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE)}
                            </Text>
                            <InlineStack gap="300">
                              <Box style={{ flex: 1 }}>
                                <TextField
                                  type="date"
                                  label="Start date"
                                  value={startDate}
                                  onChange={setStartDate}
                                />
                              </Box>
                              <Box style={{ flex: 1 }}>
                                <TextField
                                  type="time"
                                  label={`Start time (${getTimeZoneAbbreviation(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE)})`}
                                  value={startTime}
                                  onChange={setStartTime}
                                  helpText={`Shop time zone: ${shopData?.ianaTimezone || SHOP_TIMEZONE}`}
                                />
                              </Box>
                            </InlineStack>
                            <Checkbox
                              label="Set end date"
                              checked={hasEndDate}
                              onChange={setHasEndDate}
                            />
                            {hasEndDate && (
                              <InlineStack gap="300">
                                <Box style={{ flex: 1 }}>
                                  <TextField
                                    type="date"
                                    label="End date"
                                    value={endDate}
                                    onChange={setEndDate}
                                  />
                                </Box>
                                <Box style={{ flex: 1 }}>
                                  <TextField
                                    type="time"
                                    label={`End time (${getTimeZoneAbbreviation(endDate, endTime, EFFECTIVE_SHOP_TIMEZONE)})`}
                                    value={endTime}
                                    onChange={setEndTime}
                                    helpText={`Shop time zone: ${shopData?.ianaTimezone || SHOP_TIMEZONE}`}
                                  />
                                </Box>
                              </InlineStack>
                            )}
                          </BlockStack>
                        </Card>
                        
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              What other discounts can this combine with?
                            </Text>
                            <Text variant="bodyMd" tone="subdued">
                              Choose discount types that can be used together with this discount
                            </Text>
                            <BlockStack gap="200">
                              <Checkbox
                                label="Order discounts"
                                checked={combinesWith.orderDiscounts}
                                onChange={(value) => handleCombinesWithChange('orderDiscounts', value)}
                                helpText="Can be combined with other order discounts"
                              />
                              <Checkbox
                                label="Product discounts"
                                checked={combinesWith.productDiscounts}
                                onChange={(value) => handleCombinesWithChange('productDiscounts', value)}
                                helpText="Can be combined with other product discounts"
                              />
                              <Checkbox
                                label="Shipping discounts"
                                checked={combinesWith.shippingDiscounts}
                                onChange={(value) => handleCombinesWithChange('shippingDiscounts', value)}
                                helpText="Can be combined with other shipping discounts"
                              />
                            </BlockStack>
                          </BlockStack>
                        </Card>
                        {/* Checkout message when conditions are not met (order) - moved here after Discount name */}
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              Checkout message when conditions are not met
                            </Text>
                            <Text tone="subdued">
                              If enabled, this message will appear at checkout when the discount conditions are not satisfied.
                            </Text>
                            <Checkbox
                              label="Show custom message at checkout"
                              checked={showCheckoutNotMetMessage}
                              onChange={(checked) => setShowCheckoutNotMetMessage(checked)}
                            />
                            {showCheckoutNotMetMessage && (
                              <TextField
                                label="Message to display"
                                value={checkoutNotMetMessage}
                                onChange={setCheckoutNotMetMessage}
                                placeholder="Conditions for this discount are not met yet."
                                multiline={3}
                              />
                            )}
                          </BlockStack>
                        </Card>
            <Card>
              <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              When should this discount be active?
                            </Text>
                            <InlineStack align="space-between">
                              <ChoiceList
                                choices={[
                                  { label: 'Always', value: 'always' },
                                  { label: 'When conditions are met', value: 'conditional' }
                                ]}
                                selected={isConditionalDiscount ? ['conditional'] : ['always']}
                                onChange={(value) => setIsConditionalDiscount(value.includes('conditional'))}
                              />
                              {isConditionalDiscount && conditions.length < 10 && (
                                <Button onClick={addCondition}>
                                  ➕ Add new condition
                                </Button>
                              )}
                            </InlineStack>
                          </BlockStack>
            </Card>
                      </BlockStack>
                    </Card>

                    {/* Conditions - only show if conditional */}
                    {isConditionalDiscount && (
                      <BlockStack gap="400">
                                                {conditions.map((condition, index) => (
                          <Card key={condition.id}>
                            <BlockStack gap="400">
                              <InlineStack align="space-between">
                                <Button
                                  variant="plain"
                                  onClick={() => toggleConditionCollapse(condition.id)}
                                  
                                >
                                  <Text as="h3" variant="headingMd">
                                    📋{collapsedConditions[condition.id] ? '' : ''}  Condition #{index + 1}
                                  </Text>
                                </Button>
                                {conditions.length > 1 && (
                                  <Button 
                                    variant="plain" 
                                    tone="critical" 
                                    onClick={() => removeCondition(condition.id)}
                                  >
                                    Delete
                                  </Button>
                                )}
                              </InlineStack>
                              
                              {!collapsedConditions[condition.id] && (
                                <>
                                  <Text variant="bodyMd" tone="subdued">
                                    Select when this discount should be active.
                                  </Text>
                                  
                                  <BlockStack gap="300">
                                    {/* Typ warunku i Operator w jednej linii */}
                                    <InlineStack gap="400">
                                      <div style={{ flex: 1 }}>
                                        <Select
                                          label="Condition type"
                                          options={conditionTypes}
                                          value={condition.type}
                                          onChange={(value) => {
                                            updateCondition(condition.id, 'type', value);
                                            // Reset operator and value when type changes
                                            const newOperators = getOperatorOptions(value);
                                            updateCondition(condition.id, 'operator', newOperators[0]?.value || 'equals');
                                            updateCondition(condition.id, 'value', '');
                                          }}
                                        />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <Select
                                          label="Operator"
                                          options={getOperatorOptions(condition.type)}
                                          value={condition.operator}
                                          onChange={(value) => updateCondition(condition.id, 'operator', value)}
                                        />
                                      </div>
                                    </InlineStack>
                                    
                                    {/* Value field */}
                                    {renderConditionValue(condition)}
                                  </BlockStack>
                                </>
                              )}
                            </BlockStack>
                          </Card>
                        ))}

                      </BlockStack>
                    )}





                                {/* Submit button card */}
            </BlockStack>
            </Form>
          </Layout.Section>
      
      );
    }
    if (discountCreationMode === 'shipping') {
      return (
       
          <Layout.Section variant="fullWidth">
            {/* Form with separate cards */}
            <Form data-save-bar onSubmit={handleCreateDiscount}>
              <BlockStack gap="500">
                    {/* General settings */}
                    <Card>
                      <BlockStack gap="400">
                        <Text as="h2" variant="headingLg">
                          🚚 Creating shipping discount
                        </Text>
                        <Text as="h3" variant="headingMd">
                          ⚙️ General settings
                        </Text>
                        <Text variant="bodyMd" tone="subdued">
                          Start with basics like the discount name and how it works.
                        </Text>
                        
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              Discount name
                            </Text>
                            <TextField
                              label=""
                              value={discountName}
                              onChange={setDiscountName}
                              placeholder="e.g. Free shipping or 50% off delivery"
                              helpText="What should this discount be called"
                              maxLength={50}
                              showCharacterCount
                            />
                          </BlockStack>
                        </Card>
                        
                

                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              How discount should be activated?
                            </Text>
                            <ChoiceList
                              choices={[
                                { label: 'Automatically', value: 'automatic' },
                                { label: 'With discount code', value: 'discount_code' }
                              ]}
                              selected={[activationMethod]}
                              onChange={(value) => setActivationMethod(value[0])}
                              disabled={Boolean(editingDiscount)}
                            />
                            {activationMethod === 'discount_code' && (
                              <TextField
                                label="Discount code"
                                value={discountCode}
                                onChange={setDiscountCode}
                                placeholder="e.g. FREESHIP"
                                helpText="Code that customers will enter in their cart"
                                disabled={Boolean(editingDiscount)}
                              />
                            )}
                            {Boolean(editingDiscount) && (
                              <Text tone="subdued">Activation method cannot be changed for an existing discount. Delete and create a new discount to change this.</Text>
                            )}
                          </BlockStack>
                        </Card>

                        {/* Shipping discount type */}
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              Shipping discount type
                            </Text>
                            <ChoiceList
                              choices={[
                                { label: 'Percentage', value: 'percentage' },
                                { label: 'Flat amount', value: 'fixed_amount' }
                              ]}
                              selected={[discountType]}
                              onChange={(value) => setDiscountType(value[0])}
                            />
                            {discountType === 'percentage' && (
                              <TextField
                                label="Discount Percentage"
                                type="number"
                                step="0.01"
                                value={discountPercentage}
                                onChange={(v) => {
                                  // Pozwól wpisać dowolną liczbę (np. 48.21955); limit zastosujemy przy zapisie
                                  setDiscountPercentage(v);
                                }}
                                suffix="%"
                                helpText="Any precision; saved with 2 decimals, max 100%"
                              />
                            )}
                            {discountType === 'fixed_amount' && (
                              <TextField
                                label={`Flat amount off delivery (${shopData?.currencyCode || 'USD'})`}
                                type="number"
                                step="0.01"
                                value={discountAmount}
                                onChange={(v) => setDiscountAmount(v)}
                                suffix={shopData?.currencyCode || 'USD'}
                                helpText="Amount taken off shipping cost; not below zero"
                              />
                            )}
                          </BlockStack>
                        </Card>

                        <Card>
                          <BlockStack gap="300">
                          <Text as="h4" variant="headingSm">Active dates</Text>
                          <Text variant="bodyMd" tone="subdued">
                            Control when this discount should be available to your customers. Current timezone: {shopData?.ianaTimezone || SHOP_TIMEZONE} ({getTimeZoneAbbreviation(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE)})
                          </Text>
                          <InlineStack gap="300">
                            <Box style={{ flex: 1 }}>
                              <TextField
                                type="date"
                                label="Start date"
                                value={startDate}
                                onChange={setStartDate}
                              />
                            </Box>
                            <Box style={{ flex: 1 }}>
                              <TextField
                                type="time"
                                label={`Start time (${getTimeZoneAbbreviation(startDate, startTime, EFFECTIVE_SHOP_TIMEZONE)})`}
                                value={startTime}
                                onChange={setStartTime}
                                helpText={`Shop time zone: ${shopData?.ianaTimezone || SHOP_TIMEZONE}`}
                              />
                            </Box>
                          </InlineStack>
                          <Checkbox
                            label="Set end date"
                            checked={hasEndDate}
                            onChange={setHasEndDate}
                          />
                          {hasEndDate && (
                            <InlineStack gap="300">
                              <Box style={{ flex: 1 }}>
                                <TextField
                                  type="date"
                                  label="End date"
                                  value={endDate}
                                  onChange={setEndDate}
                                />
                              </Box>
                              <Box style={{ flex: 1 }}>
                                <TextField
                                  type="time"
                                  label={`End time (${getTimeZoneAbbreviation(endDate, endTime, EFFECTIVE_SHOP_TIMEZONE)})`}
                                  value={endTime}
                                  onChange={setEndTime}
                                  helpText={`Shop time zone: ${shopData?.ianaTimezone || SHOP_TIMEZONE}`}
                                />
                              </Box>
                            </InlineStack>
                          )}
                          </BlockStack>
                        </Card>
                        
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              What other discounts can this combine with?
                            </Text>
                            <Text variant="bodyMd" tone="subdued">
                              Choose discount types that can be used together with this discount
                            </Text>
                            <BlockStack gap="200">
                              <Checkbox
                                label="Order discounts"
                                checked={combinesWith.orderDiscounts}
                                onChange={(value) => handleCombinesWithChange('orderDiscounts', value)}
                                helpText="Can be combined with other order discounts"
                              />
                              <Checkbox
                                label="Product discounts"
                                checked={combinesWith.productDiscounts}
                                onChange={(value) => handleCombinesWithChange('productDiscounts', value)}
                                helpText="Can be combined with other product discounts"
                              />
                              {/* Hide "Shipping discounts" option for shipping discounts - they can't combine */}
                              {/* Shipping discounts cannot combine with other shipping discounts */}
                            </BlockStack>
                          </BlockStack>
                        </Card>
                        
                        {/* Checkout message when conditions are not met (shipping) - placed after Discount name */}
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              Checkout message when conditions are not met
                            </Text>
                            <Text tone="subdued">
                              If enabled, this message will appear at checkout when the discount conditions are not satisfied.
                            </Text>
                            <Checkbox
                              label="Show custom message at checkout"
                              checked={showCheckoutNotMetMessage}
                              onChange={(checked) => setShowCheckoutNotMetMessage(checked)}
                            />
                            {showCheckoutNotMetMessage && (
                              <TextField
                                label="Message to display"
                                value={checkoutNotMetMessage}
                                onChange={setCheckoutNotMetMessage}
                                placeholder="Conditions for this discount are not met yet."
                                multiline={3}
                              />
                            )}
                          </BlockStack>
                        </Card>
                        
                        <Card>
                          <BlockStack gap="300">
                            <Text as="h4" variant="headingSm">
                              When should this discount be active?
                            </Text>
                            <InlineStack align="space-between">
                              <ChoiceList
                                choices={[
                                  { label: 'Always', value: 'always' },
                                  { label: 'When conditions are met', value: 'conditional' }
                                ]}
                                selected={isConditionalDiscount ? ['conditional'] : ['always']}
                                onChange={(value) => setIsConditionalDiscount(value.includes('conditional'))}
                              />
                              {isConditionalDiscount && conditions.length < 10 && (
                                <Button onClick={addCondition}>
                                  ➕ Add new condition
                                </Button>
                              )}
                            </InlineStack>
                          </BlockStack>
                        </Card>
            </BlockStack>
          </Card>

                    {/* Conditions - only show if conditional */}
                    {isConditionalDiscount && (
                      <BlockStack gap="400">
                        {conditions.map((condition, index) => (
                          <Card key={condition.id}>
                            <BlockStack gap="400">
                              <InlineStack align="space-between">
                                <Button
                                  variant="plain"
                                  onClick={() => toggleConditionCollapse(condition.id)}
                                  
                                >
                                  <Text as="h3" variant="headingMd">
                                    📋{collapsedConditions[condition.id] ? '' : ''}  Condition #{index + 1}
                                  </Text>
                                </Button>
                                {conditions.length > 1 && (
                                  <Button 
                                    variant="plain" 
                                    tone="critical" 
                                    onClick={() => removeCondition(condition.id)}
                                  >
                                    Delete
                                  </Button>
                                )}
                              </InlineStack>
                              
                              {!collapsedConditions[condition.id] && (
                                <>
                                  <Text variant="bodyMd" tone="subdued">
                                    Select when this discount should be active.
                                  </Text>
                                  
                                  <BlockStack gap="300">
                                    {/* Typ warunku i Operator w jednej linii */}
                                    <InlineStack gap="400">
                                      <div style={{ flex: 1 }}>
                                        <Select
                                          label="Condition type"
                                          options={conditionTypes}
                                          value={condition.type}
                                          onChange={(value) => {
                                            updateCondition(condition.id, 'type', value);
                                            // Reset operator and value when type changes
                                            const newOperators = getOperatorOptions(value);
                                            updateCondition(condition.id, 'operator', newOperators[0]?.value || 'equals');
                                            updateCondition(condition.id, 'value', '');
                                          }}
                                        />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <Select
                                          label="Operator"
                                          options={getOperatorOptions(condition.type)}
                                          value={condition.operator}
                                          onChange={(value) => updateCondition(condition.id, 'operator', value)}
                                        />
                                      </div>
                                    </InlineStack>
                                    
                                    {/* Value field */}
                                    {renderConditionValue(condition)}
                                  </BlockStack>
                                </>
                              )}
                            </BlockStack>
                          </Card>
                        ))}

                      </BlockStack>
                    )}





                                {/* Submit button card */}
              </BlockStack>
            </Form>
      </Layout.Section>
      
  );
    }

    // Widok główny (lista zniżek)
    return (
    <>
          {error && (
            <Layout.Section variant="fullWidth">
              <Banner tone="critical" title="Error">
                <Text>{error}</Text>
                <InlineStack gap="200">
                  <Button onClick={loadShopDataAndDiscounts} loading={isLoading}>
                    Try again
                  </Button>
                </InlineStack>
              </Banner>
            </Layout.Section>
          )}
          
       
                    <Layout.Section variant="fullWidth">
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">📊Taskfy discounts List📊</Text>
                  <InlineStack gap="200">
                    {/* PRZYCISK ODŚWIEŻANIA DANYCH */}
                    <Button 
                      onClick={syncDiscountsWithShopify}
                      variant="secondary"
                      size="slim"
                      loading={isSyncing}
                    >
                      🔄 Refresh data
                    </Button>
                    {panelDiscounts.length > 0 && (
                      <>
                       
                      
                        <Select
                          label="Sort by"
                          options={[
                            { label: 'Newest', value: 'newest' },
                            { label: 'Oldest', value: 'oldest' },
                            { label: 'Highest amount', value: 'amount_high' },
                            { label: 'Lowest amount', value: 'amount_low' },
                            { label: 'Highest discount', value: 'discount_high' },
                            { label: 'Lowest discount', value: 'discount_low' },
                            { label: 'Alphabetical', value: 'alphabetical' },
                            { label: 'Custom Order', value: 'custom' }
                          ]}
                          value={sortBy}
                          onChange={async (value) => {
                            setSortBy(value);
                            try {
                              if (value === 'custom') {
                                await initializeCustomOrderIfEmpty();
                                const updated = { ...panelSettings, sortBySelection: 'custom' };
                                setPanelSettings(updated);
                                await savePanelSettings(updated);
                              } else {
                                // tylko utrwalamy wybór sortowania, bez dotykania customDiscountOrder
                                const updated = { ...panelSettings, sortBySelection: value };
                                setPanelSettings(updated);
                                await savePanelSettings(updated);
                              }
                            } catch (e) { /* ignore */ }
                          }}
                        />
                      </>
                    )}
                  </InlineStack>
                </InlineStack>
                
                {/* Warning banner about 25-discount limit (apps) */}
                {!dismissedBannersState.has("limit-25-banner") && (
                  <Box paddingBlockEnd="300">
                    <Banner tone="warning">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', width: '100%', gap: '8px' }}>
                        <Text as="h3" variant="headingMd">
                        Shopify discounts created by apps are limited to 25  
                        </Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifySelf: 'end' }}>
                          <Button
                            variant="plain"
                            onClick={() => handleDismissBanner('limit-25-banner')}
                            accessibilityLabel="Dismiss warning"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                      <Text tone="subdued">
                        Shopify allows up to 25 automatic discounts created by apps (not only this app). If you reach this limit, creating new automatic discounts via apps may fail or not display as expected.
                      </Text>
                    </Banner>
                  </Box>
                )}
                
                {panelDiscounts.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                    headings={['Date of creation', 'Discount Type', 'Discount Name', 'Discount Conditions', 'Settings']}
                                         rows={getSortedDiscounts(panelDiscounts, sortOption).map((discount, index) => [
                      (
                        <div>
                          <Text variant="bodyMd">
                            {new Date(discount.createdAt).toLocaleDateString('pl-PL')}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            {new Date(discount.createdAt).toLocaleTimeString('pl-PL', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Text>
                        </div>
                      ),
                      (
                        <Badge tone={discount.discountType === 'free_shipping' ? "info" : "attention"}>
                          {discount.discountType === 'free_shipping' ? '🚚 Delivery' : '💰 Order'}
                        </Badge>
                      ),
                      (
                        <div style={{ maxWidth: '200px' }}>
                          <Text variant="bodyMd" truncate>
                            {discount.description}
                          </Text>
                        </div>
                      ),
                      (
                        <div>
                          {discount.isConditional ? (
                            <InlineStack gap="100" wrap>
                              {(() => {
                                const conditionsCount = Array.isArray(discount.conditions)
                                  ? discount.conditions.length
                                  : ['countryRestriction', 'cartTotalMin', 'customerTags']
                                      .reduce((sum, key) => sum + (discount.conditions?.[key] ? 1 : 0), 0);
                                return (
                                  <Badge size="small" tone="warning">
                                    {`⚙️ Conditional${conditionsCount > 0 ? ` (${conditionsCount})` : ''}`}
                                  </Badge>
                                );
                              })()}
                              {discount.conditions?.countryRestriction && (
                                <Badge size="small" tone="info">🌍 Kraj</Badge>
                              )}
                                                             {discount.conditions?.cartTotalMin && (
                                  <Badge size="small" tone="info">💰 Min</Badge>
                                )}
                               {discount.conditions?.customerTags && (
                                <Badge size="small" tone="info">👤 Tagi</Badge>
                              )}
                            </InlineStack>
                          ) : (
                            <Badge size="small" tone="success">✅ Unconditional</Badge>
                          )}
                        </div>
                      ),
                      (
                        <InlineStack gap="200" align="start">
                        <Button
                            variant="secondary"
                            size="slim"
                            onClick={() => handleViewDiscount(discount)}
                          >
                            ✏️ Edit
                          </Button>
                          <Button
                            variant="primary"
                            size="slim"
                            tone={discount.isActive ? "success" : "critical"}
                          onClick={async () => await handleToggleDiscountStatus(discount.id, discount.isActive)}
                          loading={isDeletingDiscount}
                        >
                            {discount.isActive ? "✅ Activated" : "❌ Disabled"}
                        </Button>
                        <Button
                          variant="primary"
                          tone="critical"
                          size="slim"
                          onClick={async () => await handleDeleteSingleDiscount(discount.id, discount.description)}
                          loading={deletingSingleDiscountId === discount.id}
                        >
                                                        🗑️ Delete
                        </Button>
                        </InlineStack>
                      )
                    ])}
                                 
                     
                  />
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: '#6b7280',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px dashed #d1d5db'
                  }}>
                    <Text variant="bodyMd" tone="subdued">
                        🎯 No discounts to display
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        Add your first discount below
                      </Text>
                  </div>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
       

          {/* Wybór typu zniżki - cardy na pełną szerokość */}
          <Layout.Section variant="fullWidth">
            <BlockStack gap="400">
              {/* Card dla zniżek na zamówienie */}
            <Card>
              <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    🛒 Order discount
                  </Text>
                <Text variant="bodyMd" tone="subdued">
                    Create a percentage or fixed amount discount for the entire order. 
                    The client will receive a discount from the total value of the cart.
                </Text>
                  <Button 
                    primary
                    size="large"
                    onClick={() => setDiscountCreationMode('order')}
                    disabled={panelDiscounts.length >= 25}
                  >
                   Create order discount
                  </Button>
                          </BlockStack>
                        </Card>

              {/* Card dla zniżek na dostawę */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    🚚 Free shipping
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                      Create a free shipping discount. The client will receive a discount for shipping.
                  </Text>
                    <Button 
                    primary 
                    size="large"
                    onClick={() => setDiscountCreationMode('shipping')}
                    disabled={panelDiscounts.length >= 25}
                  >
                    Create free shipping
                    </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>



          <Layout.Section>
            <Box align="center">
              <Button variant="plain">
                <Text variant="bodyLg">
                  <InlineStack gap={200}>
                    <Icon source={ChatIcon} />
                    <span
                      onClick={handleCopyEmail}
                      style={{ cursor: 'pointer' }}
                    >
                      Need help? Contact support: fajwuwus32@gmail.com
                    </span>
                  </InlineStack>
                </Text>
              </Button>
            </Box>
          </Layout.Section>
    </>
  );


  }; // Zamknięcie funkcji renderDiscountsView

   //KOD EDYCJI PANELU EXTENSION
  const renderPanelSettingsView = () => (
    <>
      <Layout.Section variant="fullWidth">
        <DismissibleBanner 
          id="panel-beta-banner"
          title="🧪 Rewards Panel — beta version"
          tone="warning"
          onDismiss={handleDismissBanner}
          isDismissed={dismissedBannersState.has("panel-beta-banner")}
        >
          The rewards panel feature is still under active development and may not work perfectly in every store setup.
          Thanks for your patience and feedback. You can hide this message with the X button — it will not appear again.
        </DismissibleBanner>
        <Box paddingBlockStart="200"></Box>
        <Card>
          <BlockStack gap="600">
            <BlockStack gap="400">
              <InlineStack gap="400" align="space-between" blockAlign="center">
              <Text as="h2" variant="headingLg">
                📋 Panel Configuration
              </Text>
                <InlineStack gap="200" blockAlign="center">
                  <Badge size="small" tone={panelSettings.panelEnabled ? 'success' : 'critical'}>
                    {panelSettings.panelEnabled ? 'The panel is visible on storefront' : 'The panel is currently hidden on storefront'}
                  </Badge>
                  <Button
                    variant="primary"
                    size="slim"
                    tone={panelSettings.panelEnabled ? 'critical' : 'success'}
                    pressed={panelSettings.panelEnabled}
                    onClick={async () => {
                      const updated = { ...panelSettings, panelEnabled: !panelSettings.panelEnabled };
                      setPanelSettings(updated);
                      await savePanelSettings(updated);
                    }}
                    accessibilityLabel="Toggle reward panel"
                  >
                    {panelSettings.panelEnabled ? 'Disable panel' : 'Enable panel'}
                  </Button>
                </InlineStack>
              </InlineStack>
              <Text tone="subdued">
                Customize the appearance and behavior of the discount panel
              </Text>
            </BlockStack>
            
            <Tabs
              tabs={[
          
              
                {
                  id: 'filtered',
                  content: '📄Panel Sections Settings',
                  accessibilityLabel: 'All Settings View',
                },
                {
                  id: 'banner',
                  content: '🔵 Circle Button',
                  accessibilityLabel: 'Circle Button Settings',
                },
                {
                  id: 'discounts',
                  content: '💰 Visible Discounts',
                  accessibilityLabel: 'Current Discounts',
                },
               
                 {
                   id: 'basic',
                   content: '📐 Advanced Settings',
                   accessibilityLabel: 'Text Settings',
                 },
               
              ]}
              selected={selectedTab}
              onSelect={handleTabChange}
            />
            
            
            <Box paddingBlockStart="400">
              {selectedTab === null && (
                <BlockStack gap="500">
                  {/* Layout & Dimensions Settings */}
                  <Card>
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingMd">
                      📝 Text Settings
                      </Text>
                      
                      {/* Text Settings in logical order: Header → Subheader → Rows → Footer */}
                      <BlockStack gap="400">
                                                 {/* 1. HEADER SETTINGS */}
                         <Text as="h4" variant="headingSm" fontWeight="bold">
                           📋 Header Settings
                         </Text>
                         
                         {panelSettings.showCartValue ? (
                           <InlineStack gap="300">
                             <Box style={{ flex: 1 }}>
                               <TextField
                                 label="Header Text"
                                 value={panelSettings.cartValueText}
                                 onChange={(value) => {
                                   setPanelSettings(prev => ({ ...prev, cartValueText: value }));
                                   setHasUnsavedChanges(true);
                                 }}

                                 helpText="Text displayed in panel header"
                               />
                             </Box>
                           </InlineStack>
                         ) : (
                           <Text variant="bodySm" tone="subdued" alignment="center">
                             Enable header visibility in Layout & Dimensions to configure these settings
                           </Text>
                         )}

                                                 {/* 2. SUBHEADER SETTINGS */}
                         <Text as="h4" variant="headingSm" fontWeight="bold">
                           📊 Subheader Settings
                         </Text>
                         
                         {panelSettings.showHighestDiscountMessage ? (
                           <InlineStack gap="300">
                             <Box style={{ flex: 1 }}>
                               <TextField
                                 label="Highest Discount Text"
                                 value={panelSettings.highestDiscountText}
                                 onChange={(value) => {
                                   setPanelSettings(prev => ({ ...prev, highestDiscountText: value }));
                                   setHasUnsavedChanges(true);
                                 }}

                                 placeholder="🎉 Highest {percentage}% discount achieved!"
                                 helpText="Text displayed when the highest discount is achieved"
                               />
                             </Box>
                             <Box style={{ flex: 1 }}>
                               <TextField
                                 label="Missing Amount for Discount Text"
                                 value={panelSettings.missingForDiscountText}
                                 onChange={(value) => {
                                   setPanelSettings(prev => ({ ...prev, missingForDiscountText: value }));
                                   setHasUnsavedChanges(true);
                                 }}

                                 placeholder="Missing {amount} {currency} for {percentage}% discount"
                                 helpText="Text displayed when missing amount for discount"
                               />
                             </Box>
                           </InlineStack>
                         ) : (
                           <Text variant="bodySm" tone="subdued" alignment="center">
                             Enable subheader visibility in Layout & Dimensions to configure these settings
                           </Text>
                         )}

                        {/* 3. DISCOUNT ROWS SETTINGS */}
                        <Text as="h4" variant="headingSm" fontWeight="bold">
                          🎯 Discount Rows Settings
                        </Text>
                        
                        <InlineStack gap="300">
                          <Box style={{ flex: 1 }}>
                            <TextField
                              label="Required Text"
                              value={panelSettings.requiredText}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, requiredText: value }));
                                setHasUnsavedChanges(true);
                              }}

                              placeholder="Text before minimum amount (e.g. 'Required:', 'Minimum:')"
                              helpText="Text displayed before minimum amount required for discount"
                            />
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <TextField
                              label="Achievement Text"
                              value={panelSettings.achievedText}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, achievedText: value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="✅ Achieved!"
                              helpText="Text displayed when discount is achieved"
                            />
                          </Box>
                        </InlineStack>

                        <InlineStack gap="300">
                          <Box style={{ flex: 1 }}>
                            <TextField
                              label="Missing Amount Text"
                              value={panelSettings.missingText}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, missingText: value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="🔒 Missing"
                              helpText="Text displayed for missing amount indicator"
                            />
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <Select
                              label="Discount Levels Order"
                              options={[
                                { label: 'From lowest to highest (default)', value: 'asc' },
                                { label: 'From highest to lowest', value: 'desc' }
                              ]}
                              value={panelSettings.discountOrder}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, discountOrder: value }));
                                setHasUnsavedChanges(true);
                              }}
                              helpText="Choose how discount levels are ordered in the panel"
                            />
                          </Box>
                        </InlineStack>

                        <InlineStack gap="300">
                          <Box style={{ flex: 1 }}>
                            <Checkbox
                              label="Show achievement text"
                              checked={panelSettings.showAchievedText}
                              onChange={(checked) => {
                                setPanelSettings(prev => ({ ...prev, showAchievedText: checked }));
                                setHasUnsavedChanges(true);
                              }}
                              helpText="Enable/disable display of achievement text"
                            />
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <Checkbox
                              label="Show missing amount indicator"
                              checked={panelSettings.showMissingAmount}
                              onChange={(checked) => {
                                setPanelSettings(prev => ({ ...prev, showMissingAmount: checked }));
                                setHasUnsavedChanges(true);
                              }}
                              helpText="Enable/disable display of missing amount indicator"
                            />
                          </Box>
                        </InlineStack>

                        {/* 4. ERROR/EMPTY STATES */}
                        <Text as="h4" variant="headingSm" fontWeight="bold">
                          ⚠️ Error & Empty States
                        </Text>
                        
                        <InlineStack gap="300">
                          <Box style={{ flex: 1 }}>
                            <TextField
                              label="No Discounts Text"
                              value={panelSettings.noDiscountsText}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, noDiscountsText: value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Add products to cart to get discounts"
                              helpText="Text displayed when no discounts are available"
                            />
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <TextField
                              label="Error No Discounts Text"
                              value={panelSettings.errorNoDiscountsText}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, errorNoDiscountsText: value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="No available discounts"
                              helpText="Text displayed when no discounts are configured"
                            />
                          </Box>
                        </InlineStack>

                        <InlineStack gap="300">
                          <Box style={{ flex: 1 }}>
                            <TextField
                              label="Loading Text"
                              value={panelSettings.errorLoadingText}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, errorLoadingText: value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Loading discount information..."
                              helpText="Text displayed during discount loading"
                            />
                          </Box>
                          <Box style={{ flex: 1 }}></Box>
                        </InlineStack>

                                                 {/* 5. FOOTER SETTINGS */}
                         <Text as="h4" variant="headingSm" fontWeight="bold">
                           🦶 Footer Settings
                         </Text>
                         
                         {panelSettings.showFooter ? (
                           <InlineStack gap="300">
                             <Box style={{ flex: 1 }}>
                               <TextField
                                 label="Footer Content"
                                 value={panelSettings.footerContent}
                                 onChange={(value) => {
                                   setPanelSettings(prev => ({ ...prev, footerContent: value }));
                                   setHasUnsavedChanges(true);
                                 }}

                                 placeholder="Powered by Your Store"
                                 helpText="Text displayed in panel footer"
                               />
                             </Box>
                             <Box style={{ flex: 1 }}>
                               <Select
                                 label="Footer Text Align"
                                 options={[{label:'Left',value:'left'},{label:'Center',value:'center'},{label:'Right',value:'right'}]}
                                 value={panelSettings.footerTextAlign}
                                 onChange={(value)=>{ setPanelSettings(prev=>({...prev, footerTextAlign:value})); setHasUnsavedChanges(true);} }
                               />
                             </Box>
                           </InlineStack>
                         ) : (
                           <Text variant="bodySm" tone="subdued" alignment="center">
                             Enable footer visibility in Layout & Dimensions to configure these settings
                           </Text>
                         )}


                      </BlockStack>
                    </BlockStack>
                  </Card>
                                 </BlockStack>
               )}
               
               {selectedTab === 3  && (
                 <BlockStack gap="500">
                   {/* Layout & Dimensions Settings */}
                   <Card>
                     <BlockStack gap="400">
                       <Text as="h3" variant="headingMd">
                         📐Advanced Settings
                       </Text>
                       
                       {/* Key Panel Visibility Settings */}
                       <Card background="bg-surface-emphasis">
                         <BlockStack gap="400">
                           <Text as="h4" variant="headingSm" fontWeight="bold">
                             Panel Visibility Settings
                           </Text>
                           <Text variant="bodySm" tone="subdued">
                             Configure which sections appear in your discount panel
                           </Text>
                           
                           <BlockStack gap="300">
                                                           <Checkbox
                                label={<Text variant="bodyMd" fontWeight="semibold">Show header</Text>}
                                checked={panelSettings.showCartValue}
                                onChange={(checked) => {
                                  setPanelSettings(prev => ({ ...prev, showCartValue: checked }));
                                  setHasUnsavedChanges(true);
                                }}
                                helpText="Display header section at the top of the panel"
                              />
                             
                                                           <Checkbox
                                label={<Text variant="bodyMd" fontWeight="semibold">Show subheader</Text>}
                                checked={panelSettings.showHighestDiscountMessage}
                                onChange={(checked) => {
                                  setPanelSettings(prev => ({ ...prev, showHighestDiscountMessage: checked }));
                                  setHasUnsavedChanges(true);
                                }}
                                helpText="Display subheader section about highest discount"
                              />
                             
                             <Checkbox
                               label={<Text variant="bodyMd" fontWeight="semibold">Show footer in panel</Text>}
                               checked={panelSettings.showFooter}
                               onChange={(checked) => {
                                 setPanelSettings(prev => ({ ...prev, showFooter: checked }));
                                 setHasUnsavedChanges(true);
                               }}
                               helpText="Display footer at the bottom of the discount panel"
                             />
                           </BlockStack>
                         </BlockStack>
                       </Card>

                     
                     </BlockStack>
                   </Card>

                   <Card>
                     <BlockStack gap="400">
                     <BlockStack gap="400">
                            <Text as="h4" variant="headingSm" fontWeight="bold">Panel Visibility Rules</Text>
                            <Text tone="subdued">Define when the panel is visible on the storefront.</Text>
                            <ChoiceList
                              title="When should the panel be visible?"
                              choices={[
                                { label: 'Always', value: 'always' },
                                { label: 'When conditions are met', value: 'conditional' }
                              ]}
                              selected={panelVisibilityModeComputed === 'conditional' ? ['conditional'] : ['always']}
                              onChange={(value) => {
                                const conditional = value.includes('conditional');
                                setPanelSettings(prev => ({ ...prev, panelVisibilityMode: conditional ? 'conditional' : 'always', panelVisibilityEnabled: conditional }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                            {panelVisibilityModeComputed === 'conditional' && (
                              <InlineStack align="space-between">
                              
                                <Button
                                  size="slim"
                                  variant="secondary"
                                  onClick={(e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    const nextId = (panelSettings.panelVisibilityConditions?.reduce((m, c) => Math.max(m, c.id || 0), 0) || 0) + 1;
                                    const updated = [
                                      ...(panelSettings.panelVisibilityConditions || []),
                                      { id: nextId, type: 'cart_total', operator: 'greater_than_or_equal', value: '' }
                                    ];
                                    setPanelSettings(prev => ({ ...prev, panelVisibilityConditions: updated }));
                                    setHasUnsavedChanges(true);
                                  }}
                                >
                                  ➕ Add new condition
                                </Button>
                              </InlineStack>
                            )}
                            {panelVisibilityModeComputed === 'conditional' && (
                              <BlockStack gap="300">
                                  <BlockStack gap="300">

                                    {(panelSettings.panelVisibilityConditions || []).length === 0 && (
                                      <Text tone="subdued">No conditions yet. Add your first one.</Text>
                                    )}

                                    {(panelSettings.panelVisibilityConditions || []).map((condition, idx) => (
                                      <Card key={`pv-cond-${condition.id}`}>
                                        <BlockStack gap="300">
                                          <InlineStack align="space-between">
                                            <Text variant="headingSm">Condition {idx + 1}</Text>
                                            <Text tone="subdued">Panel visibility condition</Text>
                                          </InlineStack>
                                          <InlineStack gap="400">
                                            <div style={{ flex: 1 }}>
                                              <Select
                                                label="Condition type"
                                                options={[
                                                  { label: 'Cart amount', value: 'cart_total' },
                                                  { label: 'Customer country', value: 'country' },
                                                  { label: 'Number of products in cart', value: 'cart_quantity' },
                                                  { label: 'Postal code', value: 'postal_code' },
                                                  { label: 'Cart weight', value: 'cart_weight' },
                                                  { label: 'Customer tags', value: 'customer_tags' },
                                                  { label: 'Customer logged in', value: 'customer_logged_in' },
                                                  { label: 'Cart contains...', value: 'cart_contains' },
                                                  { label: 'Number of previous orders', value: 'order_count' }
                                                ]}
                                                value={condition.type}
                                                onChange={(value) => {
                                                  const newOperators = getOperatorOptions(value);
                                                  const updated = (panelSettings.panelVisibilityConditions || []).map(c => c.id === condition.id ? {
                                                    ...c,
                                                    type: value,
                                                    operator: newOperators[0]?.value || 'equals',
                                                    value: ''
                                                  } : c);
                                                  setPanelSettings(prev => ({ ...prev, panelVisibilityConditions: updated }));
                                                  setHasUnsavedChanges(true);
                                                }}
                                              />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                              <Select
                                                label="Operator"
                                                options={getOperatorOptions(condition.type)}
                                                value={condition.operator}
                                                onChange={(value) => {
                                                  const updated = (panelSettings.panelVisibilityConditions || []).map(c => c.id === condition.id ? { ...c, operator: value } : c);
                                                  setPanelSettings(prev => ({ ...prev, panelVisibilityConditions: updated }));
                                                  setHasUnsavedChanges(true);
                                                }}
                                              />
                                            </div>
                                          </InlineStack>

                                          {(() => {
                                            switch (condition.type) {
                                              case 'cart_total':
                                              case 'cart_quantity':
                                              case 'cart_weight':
                                              case 'order_count':
                                                return (
                                                  <TextField
                                                    label="Value"
                                                    type="number"
                                                    value={String(condition.value || '')}
                                                    onChange={(value) => {
                                                      const updated = (panelSettings.panelVisibilityConditions || []).map(c => c.id === condition.id ? { ...c, value } : c);
                                                      setPanelSettings(prev => ({ ...prev, panelVisibilityConditions: updated }));
                                                      setHasUnsavedChanges(true);
                                                    }}
                                                    helpText={condition.type === 'cart_weight' ? 'Weight in grams' : undefined}
                                                  />
                                                );
                                              case 'country':
                                                return (
                                                  <TextField
                                                    label="Countries (ISO codes, comma-separated)"
                                                    value={String(condition.value || '')}
                                                    onChange={(value) => {
                                                      const updated = (panelSettings.panelVisibilityConditions || []).map(c => c.id === condition.id ? { ...c, value } : c);
                                                      setPanelSettings(prev => ({ ...prev, panelVisibilityConditions: updated }));
                                                      setHasUnsavedChanges(true);
                                                    }}
                                                    placeholder="PL, UA, DE"
                                                  />
                                                );
                                              case 'postal_code':
                                                return (
                                                  <TextField
                                                    label="Postal codes (comma-separated, * as wildcard)"
                                                    value={String(condition.value || '')}
                                                    onChange={(value) => {
                                                      const updated = (panelSettings.panelVisibilityConditions || []).map(c => c.id === condition.id ? { ...c, value } : c);
                                                      setPanelSettings(prev => ({ ...prev, panelVisibilityConditions: updated }));
                                                      setHasUnsavedChanges(true);
                                                    }}
                                                    placeholder="00-001,10-*,20-123"
                                                  />
                                                );
                                              case 'customer_tags':
                                                return (
                                                  <TextField
                                                    label="Customer tags (comma-separated)"
                                                    value={String(condition.value || '')}
                                                    onChange={(value) => {
                                                      const updated = (panelSettings.panelVisibilityConditions || []).map(c => c.id === condition.id ? { ...c, value } : c);
                                                      setPanelSettings(prev => ({ ...prev, panelVisibilityConditions: updated }));
                                                      setHasUnsavedChanges(true);
                                                    }}
                                                    placeholder="vip, wholesale, premium"
                                                  />
                                                );
                                              case 'customer_logged_in':
                                                return (
                                                  <Text tone="subdued">No value required.</Text>
                                                );
                                              case 'cart_contains':
                                                return (
                                                  <TextField
                                                    label="Product IDs (comma-separated)"
                                                    value={String(condition.value || '')}
                                                    onChange={(value) => {
                                                      const updated = (panelSettings.panelVisibilityConditions || []).map(c => c.id === condition.id ? { ...c, value } : c);
                                                      setPanelSettings(prev => ({ ...prev, panelVisibilityConditions: updated }));
                                                      setHasUnsavedChanges(true);
                                                    }}
                                                    placeholder="e.g. 1234567890,9876543210"
                                                    helpText="Checks cart products. Collections support to be added later."
                                                  />
                                                );
                                              default:
                                                return null;
                                            }
                                          })()}

                                          <InlineStack align="end">
                                            <Button
                                              tone="critical"
                                              onClick={() => {
                                                const updated = (panelSettings.panelVisibilityConditions || []).filter(c => c.id !== condition.id);
                                                setPanelSettings(prev => ({ ...prev, panelVisibilityConditions: updated }));
                                                setHasUnsavedChanges(true);
                                              }}
                                            >
                                              Delete
                                            </Button>
                                          </InlineStack>
                                        </BlockStack>
                                      </Card>
                                    ))}
                                  </BlockStack>
                               

                              </BlockStack>
                            )}
                          </BlockStack>
                     
                      </BlockStack>
                   </Card>

                 </BlockStack>
               )}
               
               {selectedTab === null && (
                 <BlockStack gap="500">
                   {/* Appearance & Style */}
                 
                   {/* Border Glow Effects */}
                  

                   
                 </BlockStack>
               )}
               {selectedTab === 4 && (
                 <BlockStack gap="500">
                  <Card>
                       <BlockStack gap="400">
                         <Text as="h3" variant="headingMd">
                           🔍 Warunki Zniżki
                         </Text>
                         <Text tone="subdued">
                           Wybierz warunki, które muszą być spełnione, aby zniżka została zastosowana.
                         </Text>
                         
                         <BlockStack gap="300">
                           <Button
                             onClick={() => setFilteredSection('location')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>🌍</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Location</Text>
                                 <Text variant="bodySm" tone="subdued">Country, postal code, region</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                           
                           <Button
                             onClick={() => setFilteredSection('cart')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>🛒</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Koszyk</Text>
                                 <Text variant="bodySm" tone="subdued">Wartość koszyka, liczba produktów, waga</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                           
                           <Button
                             onClick={() => setFilteredSection('customer')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>👤</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Klient</Text>
                                 <Text variant="bodySm" tone="subdued">Grupa klientów, historia zakupów, tagi</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                           
                           <Button
                             onClick={() => setFilteredSection('product')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>🏷️</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Produkt</Text>
                                 <Text variant="bodySm" tone="subdued">Kategoria, kolekcja, tagi, warianty</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                           
                           <Button
                             onClick={() => setFilteredSection('shipping')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>🚚</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Dostawa</Text>
                                 <Text variant="bodySm" tone="subdued">Metoda dostawy, strefa dostawy</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                           
                           <Button
                             onClick={() => setFilteredSection('time')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>⏰</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Czas</Text>
                                 <Text variant="bodySm" tone="subdued">Data, dzień tygodnia, godzina</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>

                           <Button
                             onClick={() => setFilteredSection('advanced')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>⚙️</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Zaawansowane</Text>
                                 <Text variant="bodySm" tone="subdued">Kombinacje warunków, limity użycia</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                         </BlockStack>
                       </BlockStack>
                     </Card>
                  

                   
                 </BlockStack>
               )}
               {selectedTab === 1 && (
                 <BlockStack gap="500">
                   {/* Circle Button Settings */}
                   <Card>
                     <BlockStack gap="400">
                       <Text as="h3" variant="headingMd">
                         🔵 Circle Button Configuration
                       </Text>
                       
                       <FormLayout>
                         <TextField
                           label="Button Size (px)"
                           type="number"
                           value={panelSettings.circleSize}
                           onChange={(value) => {
                             setPanelSettings(prev => ({ ...prev, circleSize: value }));
                             setHasUnsavedChanges(true);
                           }}
                           placeholder="60"
                           helpText="Size of the circle button in pixels"
                         />
                         
                         <Select
                           label="Position"
                           options={[
                             {label: 'Bottom Right', value: 'bottom-right'},
                             {label: 'Bottom Left', value: 'bottom-left'},
                             {label: 'Top Right', value: 'top-right'},
                             {label: 'Top Left', value: 'top-left'},
                           ]}
                           value={panelSettings.circlePosition}
                           onChange={(value) => {
                             setPanelSettings(prev => ({ ...prev, circlePosition: value }));
                             setHasUnsavedChanges(true);
                           }}
                         />
                         
                         <TextField
                           label="Distance from Side Right/Left(px)"
                           type="number"
                           value={panelSettings.circleOffsetX}
                           onChange={(value) => {
                             setPanelSettings(prev => ({ ...prev, circleOffsetX: value }));
                             setHasUnsavedChanges(true);
                           }}
                           placeholder="20"
                           helpText="Distance from left or right edge"
                         />
                         
                         <TextField
                           label="Distance from Top/Bottom (px)"
                           type="number"
                           value={panelSettings.circleOffsetY}
                           onChange={(value) => {
                             setPanelSettings(prev => ({ ...prev, circleOffsetY: value }));
                             setHasUnsavedChanges(true);
                           }}
                           placeholder="20"
                           helpText="Distance from top or bottom edge"
                         />
                         
                         <Box>
                           <Text as="label" variant="bodyMd">Background Color</Text>
                           <Box paddingBlockStart="200">
                             <ColorPickerField color={panelSettings.circleBackgroundColor} onChange={(value) => {
                               setPanelSettings(prev => ({ ...prev, circleBackgroundColor: value }));
                               setHasUnsavedChanges(true);
                             }} />
                           </Box>
                         </Box>
                         
                         <Box>
                           <Text as="label" variant="bodyMd">Background Image (optional)</Text>
                           <Box paddingBlockStart="200">
                             {(localPreviews.circleImageUrl || panelSettings.circleImageUrl) ? (
                               <InlineStack gap="300" align="start">
                                 <Box>
                                   <img 
                                     src={localPreviews.circleImageUrl || panelSettings.circleImageUrl} 
                                     alt="Circle button background"
                                     style={{ 
                                       width: '60px', 
                                       height: '60px', 
                                       borderRadius: '50%',
                                       objectFit: 'cover',
                                       border: '2px solid #e1e3e5'
                                     }}
                                   />
                                 </Box>
                                 <BlockStack gap="200">
                                   {uploadingMap.circleImageUrl ? (
                                     <InlineStack gap="200" blockAlign="center">
                                       <Spinner size="small" />
                                       <Text tone="subdued" variant="bodySm">Uploading...</Text>
                                     </InlineStack>
                                   ) : (
                                     <Button onClick={handleRemoveCircleImage} tone="critical" size="slim">
                                       Remove Image
                                     </Button>
                                   )}
                                   <Text tone="subdued" variant="bodyMd">
                                     Image will cover the entire button
                                   </Text>
                                 </BlockStack>
                               </InlineStack>
                             ) : (
                               <BlockStack gap="200">
                                 {uploadingMap.circleImageUrl ? (
                                   <InlineStack gap="200" blockAlign="center">
                                     <Spinner size="small" />
                                     <Text tone="subdued" variant="bodySm">Uploading...</Text>
                                   </InlineStack>
                                 ) : (
                                   <DropZone
                                     onDrop={handleCircleImageDrop}
                                     accept="image/*"
                                     type="image"
                                   >
                                     <DropZone.FileUpload />
                                   </DropZone>
                                 )}
                                 <Text tone="subdued" variant="bodyMd">
                                   Upload an image for button background. Leave empty to use solid color.
                                 </Text>
                               </BlockStack>
                             )}
                           </Box>
                         </Box>
                         
                        
                       </FormLayout>
                     </BlockStack>
                   </Card>
                 </BlockStack>
               )}
               {selectedTab === 2 && (
                 <BlockStack gap="500">
                   {/* Current Discounts Settings */}
                 
                   <Card>
                     <BlockStack gap="400">
                       <InlineStack align="space-between">
                         <Text as="h3" variant="headingMd">
                           💰 Visible Discounts ({filteredDiscounts.length}{panelDiscounts.length !== filteredDiscounts.length ? ` of ${panelDiscounts.length}` : ''})
                         </Text>
                        
                         <InlineStack gap="200">
                           <Button 
                             onClick={() => setActiveView("discounts")}
                             size="slim"
                           >
                             Manage Discounts
                           </Button>
                         </InlineStack>
                       </InlineStack>
                      <Text tone="subdued">
                        Toggle visibility per discount using the "Visible in Panel" column.
                      </Text>
                       
                       {/* Search and Filter Section */}
                       <BlockStack gap="300">
                         <InlineStack gap="300" align="start">
                           <Box minWidth="300px">
                             <TextField
                               label="Search Discounts"
                               placeholder="Search by description, amount or percentage..."
                               value={searchQuery}
                               onChange={setSearchQuery}
                               clearButton
                               onClearButtonClick={() => setSearchQuery('')}
                             />
                           </Box>
                           <Select
                             label="Filter by status"
                             options={[
                               { label: 'All discounts', value: 'all' },
                               { label: 'Active only', value: 'active' },
                               { label: 'Inactive only', value: 'inactive' }
                             ]}
                             value={filterStatus}
                             onChange={setFilterStatus}
                           />
                           <Select
                             label="Sort by"
                             options={[
                               { label: 'Newest', value: 'newest' },
                               { label: 'Oldest', value: 'oldest' },
                               { label: 'Highest amount', value: 'amount_high' },
                               { label: 'Lowest amount', value: 'amount_low' },
                               { label: 'Highest discount', value: 'discount_high' },
                               { label: 'Lowest discount', value: 'discount_low' },
                               { label: 'Alphabetical', value: 'alphabetical' },
                               { label: 'Custom Order', value: 'custom' }
                             ]}
                             value={sortBy}
                             onChange={async (value) => {
                               setSortBy(value);
                               try {
                                 if (value === 'custom') {
                                   await initializeCustomOrderIfEmpty();
                                   const updated = { ...panelSettings, sortBySelection: 'custom' };
                                   setPanelSettings(updated);
                                   await savePanelSettings(updated);
                                 } else {
                                   // dla zwykłych opcji zapisz jedynie wybór sortowania
                                   const updated = { ...panelSettings, sortBySelection: value };
                                   setPanelSettings(updated);
                                   await savePanelSettings(updated);
                                 }
                               } catch (_) {}
                             }}
                           />
                         </InlineStack>

                         {/* Bulk Actions Bar */}
                        {false && showBulkActions && (
                          <Card background="bg-surface-info">
                            <InlineStack align="space-between">
                              <Text variant="bodyMd" fontWeight="bold">
                                {selectedDiscounts.length} discount{selectedDiscounts.length !== 1 ? 's' : ''} selected
                              </Text>
                              <ButtonGroup>
                                <Button onClick={() => setSelectedDiscounts([])} size="slim">Clear selection</Button>
                              </ButtonGroup>
                            </InlineStack>
                          </Card>
                        )}
                       </BlockStack>
                       
                       {sortedPanelDiscounts.length > 0 ? (
                         <BlockStack gap="300">
                          {/* Row selection removed */}

                          <DataTable
                            columnContentTypes={[
                    'text', 'text', 'text', 'text', 'text']}
                            headings={[        'Name', 'Discount', 'Icon', 'Lock Icon', 'Visible in Panel']}
                            rows={discountRows}
                            truncate
                          />
                         </BlockStack>
                       ) : searchQuery || filterStatus !== 'all' ? (
                         <EmptyState
                           heading="No discounts match your search"
                           image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                         >
                           <p>Try adjusting your search or filters</p>
                           <ButtonGroup>
                             <Button onClick={() => setSearchQuery('')}>Clear Search</Button>
                             <Button onClick={() => setFilterStatus('all')}>Clear Filters</Button>
                           </ButtonGroup>
                         </EmptyState>
                       ) : (
                         <EmptyState
                           heading="No discounts configured"
                           image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                         >
                           <p>Create discounts in the Manage Discounts section first.</p>
                           <Button onClick={() => setActiveView("discounts")}>
                             Go to Manage Discounts
                           </Button>
                         </EmptyState>
                       )}
                     </BlockStack>
                   </Card>
                 </BlockStack>
               )}
               { selectedTab === 0 && (
                 <BlockStack gap="500">
                   {filteredSection === 'all' ? (
                     /* Settings Categories List */
                     <Card>
                       <BlockStack gap="400">
                         <Text as="h3" variant="headingMd">
                           🔍 All Settings
                         </Text>
                         <Text tone="subdued">
                           Choose a panel section to configure its settings
                         </Text>
                         
                         <BlockStack gap="300">
                           <Button
                             onClick={() => setFilteredSection('header')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>📋</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Header Settings</Text>
                                 <Text variant="bodySm" tone="subdued">Header text, font size, colors, height</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                           
                           <Button
                             onClick={() => setFilteredSection('subheader')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>📊</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Subheader Settings</Text>
                                 <Text variant="bodySm" tone="subdued">Discount messages, font size, colors, height</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                           
                           <Button
                             onClick={() => setFilteredSection('rows')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>🎯</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Rows (Content) Settings</Text>
                                 <Text variant="bodySm" tone="subdued">Row appearance, text, dimensions, colors</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                           
                           <Button
                             onClick={() => setFilteredSection('footer')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>🦶</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Footer Settings</Text>
                                 <Text variant="bodySm" tone="subdued">Footer content, font size, colors, height</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                           
                           <Button
                             onClick={() => setFilteredSection('scrollbar')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>📜</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Scrollbar Settings</Text>
                                 <Text variant="bodySm" tone="subdued">Scrollbar colors, width, style, hover effects</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                           
                           <Button
                             onClick={() => setFilteredSection('global')}
                             size="large"
                             variant="secondary"
                             fullWidth
                             textAlign="left"
                           >
                             <InlineStack gap="300" align="start">
                               <Text>🌐</Text>
                               <BlockStack gap="100">
                                 <Text variant="headingSm">Panel Global Settings</Text>
                                 <Text variant="bodySm" tone="subdued">Panel dimensions, background, shadow</Text>
                               </BlockStack>
                             </InlineStack>
                           </Button>
                         </BlockStack>
                       </BlockStack>
                     </Card>
                   ) : null}
                   
                   {/* Render specific section settings */}
                   {filteredSection === 'header' && (
                     <Card>
                      <BlockStack gap="400">
                         <InlineStack gap="300" align="start">
                           <Button
                             onClick={() => setFilteredSection('all')}
                             variant="secondary"
                             tone="critical"
                             size="medium"
                           >
                             ← Back to All Settings
                           </Button>
                         </InlineStack>
                         <Box paddingBlockStart="200" />
                       </BlockStack>
                       <BlockStack gap="400">
                         <Text as="h3" variant="headingMd">
                           📋 Header Settings
                         </Text>
                         
                         {/* Header Visibility Checkbox */}
                         <Card background="bg-surface-emphasis">
                           <Checkbox
                             label={<Text variant="bodyMd" fontWeight="semibold">Show header section</Text>}
                             checked={panelSettings.showCartValue}
                             onChange={(checked) => {
                               setPanelSettings(prev => ({ ...prev, showCartValue: checked }));
                               setHasUnsavedChanges(true);
                             }}
                             helpText="Enable/disable header section visibility in the panel"
                           />
                         </Card>
                         
                         {panelSettings.showCartValue ? (
                           <>
                             <InlineStack gap="300">
                               <Box style={{ flex: 1 }}>
                                 <TextField
                                   label="Header Text"
                                   value={panelSettings.cartValueText}
                                   onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, cartValueText: value }));
                                     setHasUnsavedChanges(true);
                                   }}
                                   placeholder="Cart value : {cart}"
                                   helpText="Text displayed in panel header"
                                 />
                               </Box>
                             </InlineStack>
                             {/* Header Text Align */}
                            <InlineStack gap="300">
                              <Box style={{ flex: 1 }}>
                                <Select
                                  label="Header Text Align"
                                  options={[
                                    { label: 'Left', value: 'left' },
                                    { label: 'Center', value: 'center' },
                                    { label: 'Right', value: 'right' }
                                  ]}
                                  value={panelSettings.headerTextAlign}
                                  onChange={(value) => {
                                    setPanelSettings(prev => ({ ...prev, headerTextAlign: value }));
                                    setHasUnsavedChanges(true);
                                  }}
                                  helpText="Align header text"
                                />
                              </Box>
                            </InlineStack>
                             <FontSelectField
                               font={panelSettings.headerTextFont}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, headerTextFont: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               label="Header text font"
                             />
                             
                             <InlineStack gap="300">
                               <Box style={{ flex: 1 }}>
                                 <TextField
                                   label="Header Font Size (px)"
                                   type="number"
                                   value={panelSettings.cartValueFontSize}
                                   onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, cartValueFontSize: value }));
                                     setHasUnsavedChanges(true);
                                   }}
                                   placeholder="16"
                                   helpText="Font size for header text"
                                 />
                               </Box>
                               <Box style={{ flex: 1 }}>
                                 <TextField
                                   label="Header Height (px)"
                                   type="number"
                                   value={panelSettings.cartValueHeight}
                                   onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, cartValueHeight: value }));
                                     setHasUnsavedChanges(true);
                                   }}
                                   placeholder="60"
                                   helpText="Height of header section"
                                 />
                               </Box>
                             </InlineStack>
                             
                             <InlineStack gap="300">
                               <Box style={{ flex: 1 }}>
                                 <Text as="label" variant="bodyMd">Header Background Color</Text>
                                 <Box paddingBlockStart="200">
                                   <ColorPickerField color={panelSettings.cartValueBackground} onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, cartValueBackground: value }));
                                     setHasUnsavedChanges(true);
                                   }} />
                                 </Box>
                                 <Text variant="caption" tone="subdued">Background color of header section</Text>
                               </Box>
                               <Box style={{ flex: 1 }}>
                                 <Text as="label" variant="bodyMd">Header Text Color</Text>
                                 <Box paddingBlockStart="200">
                                   <ColorPickerField color={panelSettings.cartValueTextColor} onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, cartValueTextColor: value }));
                                     setHasUnsavedChanges(true);
                                   }} />
                                 </Box>
                                 <Text variant="caption" tone="subdued">Text color in header section</Text>
                               </Box>
                             </InlineStack>
                             
                             {/* Header Background Image */}
                             <Box>
                               <Text as="label" variant="HeadingLg">Header Background Image (optional) </Text>
                        
                               <Box paddingBlockStart="200">
                                 {panelSettings.cartValueBackgroundImage ? (
                                   <InlineStack gap="300" align="start">
                                     <Box>
                                       <img 
                                         src={panelSettings.cartValueBackgroundImage} 
                                         alt="Header background preview"
                                         style={{ 
                                           width: '80px', 
                                           height: '40px', 
                                           objectFit: 'cover',
                                           border: '2px solid #e1e3e5',
                                           borderRadius: '4px'
                                         }}
                                       />
                                     </Box>
                                     <BlockStack gap="200">
                                       <Button onClick={handleRemoveHeaderImage} tone="critical" size="slim">
                                         Remove Image
                                       </Button>
                                       <Text tone="subdued" variant="bodySm">
                                         Obraz będzie pokrywał całe tło headera
                                       </Text>
                                     </BlockStack>
                                   </InlineStack>
                                 ) : (
                                   <BlockStack gap="200">
                                     <DropZone
                                       onDrop={handleHeaderImageDrop}
                                       accept="image/*"
                                       type="image"
                                     >
                                       <DropZone.FileUpload />
                                     </DropZone>
                                     <Text tone="subdued" variant="bodySm">
                                       Add background image for header section. Leave empty to use only color.
                                     </Text>
                                    
                                   </BlockStack>
                                 )}
                               </Box>
                               
                              
                             </Box>
                             
                             {/* Spis treści placeholderów */}
                             <Card background="bg-surface-secondary">
                               <BlockStack gap="300">
                                 <Text as="h4" variant="headingSm">
                                   📝 Available placeholders
                                 </Text>
                                 <Text variant="bodySm" tone="subdued">
                                   Copy and paste into text fields:
                                 </Text>
                                 
                                 <List>
                                   <List.Item><strong>{'{cart}'}</strong> - Cart value with currency (e.g. "$150.00")</List.Item>
                                   <List.Item><strong>{'{cart_value}'}</strong> - Cart value (e.g. "150.00")</List.Item>
                                   <List.Item><strong>{'{currency}'}</strong> - Currency symbol (e.g. "$")</List.Item>
                                   <List.Item><strong>{'{percentage}'}</strong> - Discount percentage (e.g. "15")</List.Item>
                                   <List.Item><strong>{'{amount}'}</strong> - Brakująca kwota (np. "50.00")</List.Item>
                                 </List>
                               </BlockStack>
                             </Card>
                           </>
                         ) : (
                           <Text variant="bodySm" tone="subdued" alignment="center">
                             Enable header section to configure these settings
                           </Text>
                         )}
                       </BlockStack>
                     </Card>
                   )}
                   {filteredSection === 'subheader' && (
                     <Card>
                       <BlockStack gap="400">
                         <InlineStack gap="300" align="start">
                           <Button
                             onClick={() => setFilteredSection('all')}
                             variant="secondary"
                             tone="critical"
                             size="medium"
                           >
                             ← Back to All Settings
                           </Button>
                         </InlineStack>
                         <Box paddingBlockStart="200" />
                       </BlockStack>
                       <BlockStack gap="400">
                         <Text as="h3" variant="headingMd">
                           📊 Subheader Settings
                         </Text>
                         
                         {/* Subheader Visibility Checkbox */}
                         <Card background="bg-surface-emphasis">
                           <Checkbox
                             label={<Text variant="bodyMd" fontWeight="semibold">Show subheader section</Text>}
                             checked={panelSettings.showHighestDiscountMessage}
                             onChange={(checked) => {
                               setPanelSettings(prev => ({ ...prev, showHighestDiscountMessage: checked }));
                               setHasUnsavedChanges(true);
                             }}
                             helpText="Enable/disable subheader section visibility in the panel"
                           />
                         </Card>
                         
                         {panelSettings.showHighestDiscountMessage ? (
                           <>
                             <InlineStack gap="300">
                               <Box style={{ flex: 1 }}>
                                 <TextField
                                   label="Highest Discount Text"
                                   value={panelSettings.highestDiscountText}
                                   onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, highestDiscountText: value }));
                                     setHasUnsavedChanges(true);
                                   }}
                                   placeholder="🎉 Highest {percentage}% discount achieved!"
                                   helpText="Text displayed when highest discount is achieved"
                                 />
                               </Box>
                               <Box style={{ flex: 1 }}>
                                 <TextField
                                   label="Missing Amount Text"
                                   value={panelSettings.missingForDiscountText}
                                   onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, missingForDiscountText: value }));
                                     setHasUnsavedChanges(true);
                                   }}
                                   placeholder="Missing {amount} {currency} for {percentage}% discount"
                                   helpText="Text when amount is missing for discount"
                                 />
                               </Box>
                             </InlineStack>
                             
                             <FontSelectField
                               font={panelSettings.subheaderTextFont}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, subheaderTextFont: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               label="Subheader text font"
                             />
                             <InlineStack gap="300">
                              <Box style={{ flex: 1 }}>
                                <Select
                                  label="Subheader Text Align"
                                  options={[
                                    { label: 'Left', value: 'left' },
                                    { label: 'Center', value: 'center' },
                                    { label: 'Right', value: 'right' }
                                  ]}
                                  value={panelSettings.subheaderTextAlign}
                                  onChange={(value) => {
                                    setPanelSettings(prev => ({ ...prev, subheaderTextAlign: value }));
                                    setHasUnsavedChanges(true);
                                  }}
                                  helpText="Align subheader text"
                                />
                              </Box>
                            </InlineStack>
                             <InlineStack gap="300">
                               <Box style={{ flex: 1 }}>
                                 <TextField
                                   label="Subheader Font Size (px)"
                                   type="number"
                                   value={panelSettings.remainingAmountFontSize}
                                   onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, remainingAmountFontSize: value }));
                                     setHasUnsavedChanges(true);
                                   }}
                                   placeholder="16"
                                   helpText="Font size for subheader text"
                                 />
                               </Box>
                               <Box style={{ flex: 1 }}>
                                 <TextField
                                   label="Subheader Height (px)"
                                   type="number"
                                   value={panelSettings.remainingAmountHeight}
                                   onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, remainingAmountHeight: value }));
                                     setHasUnsavedChanges(true);
                                   }}
                                   placeholder="60"
                                   helpText="Height of subheader section"
                                 />
                               </Box>
                             </InlineStack>
                             
                             <InlineStack gap="300">
                               <Box style={{ flex: 1 }}>
                                 <Text as="label" variant="bodyMd">Subheader Background Color</Text>
                                 <Box paddingBlockStart="200">
                                   <ColorPickerField color={panelSettings.statusMessageBackground} onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, statusMessageBackground: value }));
                                     setHasUnsavedChanges(true);
                                   }} />
                                 </Box>
                                 <Text variant="caption" tone="subdued">Background color of subheader section</Text>
                               </Box>
                               <Box style={{ flex: 1 }}>
                                 <Text as="label" variant="bodyMd">Subheader Text Color</Text>
                                 <Box paddingBlockStart="200">
                                   <ColorPickerField color={panelSettings.statusMessageTextColor} onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, statusMessageTextColor: value }));
                                     setHasUnsavedChanges(true);
                                   }} />
                                 </Box>
                                 <Text variant="caption" tone="subdued">Text color in subheader section</Text>
                               </Box>
                             </InlineStack>
                             
                             {/* Subheader Background Image */}
                             <Box>
                               <Text as="label" variant="HeadingLg">Subheader Background Image (optional) </Text>
                        
                               <Box paddingBlockStart="200">
                                 {panelSettings.highestDiscountBackgroundImage ? (
                                   <InlineStack gap="300" align="start">
                                     <Box>
                                       <img 
                                         src={panelSettings.highestDiscountBackgroundImage} 
                                         alt="Subheader background preview"
                                         style={{ 
                                           width: '80px', 
                                           height: '40px', 
                                           objectFit: 'cover',
                                           border: '2px solid #e1e3e5',
                                           borderRadius: '4px'
                                         }}
                                       />
                                     </Box>
                                     <BlockStack gap="200">
                                       <Button onClick={handleRemoveSubheaderImage} tone="critical" size="slim">
                                         Remove Image
                                       </Button>
                                       <Text tone="subdued" variant="bodySm">
                                         Obraz będzie pokrywał całe tło subheadera
                                       </Text>
                                     </BlockStack>
                                   </InlineStack>
                                 ) : (
                                   <BlockStack gap="200">
                                     <DropZone
                                       onDrop={handleSubheaderImageDrop}
                                       accept="image/*"
                                       type="image"
                                     >
                                       <DropZone.FileUpload />
                                     </DropZone>
                                     <Text tone="subdued" variant="bodySm">
                                       Add background image for subheader section. Leave empty to use only color.
                                     </Text>
                                   
                                   </BlockStack>
                                 )}
                               </Box>
                               
                              
                             </Box>
                             
                             {/* Spis treści placeholderów */}
                             <Card background="bg-surface-secondary">
                               <BlockStack gap="300">
                                 <Text as="h4" variant="headingSm">
                                   📝 Available placeholders
                                 </Text>
                                 <Text variant="bodySm" tone="subdued">
                                   Copy and paste into text fields:
                                 </Text>
                                 
                                 <List>
                                    <List.Item><strong>{'{cart}'}</strong> - Cart value with currency (e.g. "$150.00")</List.Item>
                                    <List.Item><strong>{'{cart_value}'}</strong> - Cart value (e.g. "150.00")</List.Item>
                                    <List.Item><strong>{'{currency}'}</strong> - Currency symbol (e.g. "$")</List.Item>
                                    <List.Item><strong>{'{percentage}'}</strong> - Discount percentage (e.g. "15")</List.Item>
                                    <List.Item><strong>{'{amount}'}</strong> - Brakująca kwota (np. "50.00")</List.Item>
                                 </List>
                               </BlockStack>
                             </Card>
                           </>
                         ) : (
                           <Text variant="bodySm" tone="subdued" alignment="center">
                             Enable subheader section to configure these settings
                           </Text>
                         )}
                       </BlockStack>
                     </Card>
                   )}
                   {filteredSection === 'rows' && (
                     <Card>
                       <BlockStack gap="400">
                         <InlineStack gap="300" align="start">
                           <Button
                             onClick={() => setFilteredSection('all')}
                             variant="secondary"
                             tone="critical"
                             size="medium"
                           >
                             ← Back to All Settings
                           </Button>
                         </InlineStack>
                         <Box paddingBlockStart="200" />
                       </BlockStack>
                       <BlockStack gap="400">
                         <Text as="h3" variant="headingMd">
                           🎯 Rows (Content) Settings
                         </Text>
                         
                         <InlineStack gap="300">
                           <Box style={{ flex: 1 }}>
                             <TextField
                               label="Achievement Text"
                               value={panelSettings.achievedText}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, achievedText: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               placeholder="✅ Achieved!"
                               helpText="Text displayed when discount is achieved"
                             />
                           </Box>
                           <Box style={{ flex: 1 }}>
                             <TextField
                               label="Missing Text"
                               value={panelSettings.missingText}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, missingText: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               placeholder="🔒 Missing"
                               helpText="Text displayed when amount is missing"
                             />
                           </Box>
                         </InlineStack>
                         
                         <InlineStack gap="300">
                           <Box style={{ flex: 1 }}>
                             <FontSelectField
                               font={panelSettings.achievedTextFont}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, achievedTextFont: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               label="Achieved text font"
                             />
                           </Box>
                           <Box style={{ flex: 1 }}>
                             <FontSelectField
                               font={panelSettings.missingTextFont}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, missingTextFont: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               label="No discount text font"
                             />
                           </Box>
                         </InlineStack>
                         
                         <InlineStack gap="300">
                           <Box style={{ flex: 1 }}>
                             <TextField
                               label="Row Height (px)"
                               type="number"
                               value={panelSettings.rowHeight}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, rowHeight: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               placeholder="70"
                               helpText="Height of each discount row"
                             />
                           </Box>
                           <Box style={{ flex: 1 }}>
                             <TextField
                               label="Row Padding (px)"
                               type="number"
                               value={panelSettings.discountSpacing}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, discountSpacing: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               placeholder="15"
                               helpText="Padding inside each row"
                             />
                           </Box>
                         </InlineStack>
                         
                         <InlineStack gap="300">
                           <Box style={{ flex: 1 }}>
                             <TextField
                               label="Description Font Size (px)"
                               type="number"
                               value={panelSettings.descriptionFontSize}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, descriptionFontSize: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               placeholder="15"
                               helpText="Font size for discount descriptions"
                             />
                           </Box>
                           <Box style={{ flex: 1 }}>
                             <TextField
                               label="Amount Font Size (px)"
                               type="number"
                               value={panelSettings.minimumAmountFontSize}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, minimumAmountFontSize: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               placeholder="13"
                               helpText="Font size for minimum amounts"
                             />
                           </Box>
                         </InlineStack>
                         
                         <InlineStack gap="300">
                           <Box style={{ flex: 1 }}>
                             <Text as="label" variant="bodyMd">Achieved Row Color</Text>
                             <Box paddingBlockStart="200">
                               <ColorPickerField color={panelSettings.achievedColor} onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, achievedColor: value }));
                                 setHasUnsavedChanges(true);
                               }} />
                             </Box>
                             <Text variant="caption" tone="subdued">Background color for achieved discounts</Text>
                           </Box>
                           <Box style={{ flex: 1 }}>
                             <Text as="label" variant="bodyMd">Locked Row Color</Text>
                             <Box paddingBlockStart="200">
                               <ColorPickerField color={panelSettings.lockedColor} onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, lockedColor: value }));
                                 setHasUnsavedChanges(true);
                               }} />
                             </Box>
                             <Text variant="caption" tone="subdued">Background color for locked discounts</Text>
                           </Box>
                         </InlineStack>
                         

                       </BlockStack>
                     </Card>
                   )}
                   {filteredSection === 'footer' && (
                     <Card>
                       <BlockStack gap="400">
                         <InlineStack gap="300" align="start">
                           <Button
                             onClick={() => setFilteredSection('all')}
                             variant="secondary"
                             tone="critical"
                             size="medium"
                           >
                             ← Back to All Settings
                           </Button>
                         </InlineStack>
                         <Box paddingBlockStart="200" />
                       </BlockStack>
                       <BlockStack gap="400">
                         <Text as="h3" variant="headingMd">
                           🦶 Footer Settings
                         </Text>
                         
                         {/* Footer Visibility Checkbox */}
                         <Card background="bg-surface-emphasis">
                           <Checkbox
                             label={<Text variant="bodyMd" fontWeight="semibold">Show footer section</Text>}
                             checked={panelSettings.showFooter}
                             onChange={(checked) => {
                               setPanelSettings(prev => ({ ...prev, showFooter: checked }));
                               setHasUnsavedChanges(true);
                             }}
                             helpText="Enable/disable footer section visibility in the panel"
                           />
                         </Card>
                         
                         {panelSettings.showFooter ? (
                           <>
                             <TextField
                               label="Footer Content"
                               value={panelSettings.footerContent}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, footerContent: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               placeholder="Powered by Your Store"
                               helpText="Text displayed in footer"
                             />
                            <InlineStack gap="300">
                              <Box style={{ flex: 1 }}>
                                <Select
                                  label="Footer Text Align"
                                  options={[{label:'Left',value:'left'},{label:'Center',value:'center'},{label:'Right',value:'right'}]}
                                  value={panelSettings.footerTextAlign}
                                  onChange={(value)=>{ setPanelSettings(prev=>({...prev, footerTextAlign:value})); setHasUnsavedChanges(true);} }
                                />
                              </Box>
                            </InlineStack>
                             
                             <FontSelectField
                               font={panelSettings.footerTextFont}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, footerTextFont: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               label="Czcionka tekstu footera"
                             />
                             
                             <InlineStack gap="300">
                               <Box style={{ flex: 1 }}>
                                 <TextField
                                   label="Footer Font Size (px)"
                                   type="number"
                                   value={panelSettings.footerFontSize}
                                   onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, footerFontSize: value }));
                                     setHasUnsavedChanges(true);
                                   }}
                                   placeholder="12"
                                   helpText="Font size for footer text"
                                 />
                               </Box>
                               <Box style={{ flex: 1 }}>
                                 <TextField
                                   label="Footer Height (px)"
                                   type="number"
                                   value={panelSettings.footerHeight}
                                   onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, footerHeight: value }));
                                     setHasUnsavedChanges(true);
                                   }}
                                   placeholder="50"
                                   helpText="Height of footer section"
                                 />
                               </Box>
                             </InlineStack>
                             
                             <InlineStack gap="300">
                               <Box style={{ flex: 1 }}>
                                 <Text as="label" variant="bodyMd">Footer Background Color</Text>
                                 <Box paddingBlockStart="200">
                                   <ColorPickerField color={panelSettings.footerBackground} onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, footerBackground: value }));
                                     setHasUnsavedChanges(true);
                                   }} />
                                 </Box>
                                 <Text variant="caption" tone="subdued">Background color of footer section</Text>
                               </Box>
                               <Box style={{ flex: 1 }}>
                                 <Text as="label" variant="bodyMd">Footer Text Color</Text>
                                 <Box paddingBlockStart="200">
                                   <ColorPickerField color={panelSettings.footerTextColor} onChange={(value) => {
                                     setPanelSettings(prev => ({ ...prev, footerTextColor: value }));
                                     setHasUnsavedChanges(true);
                                   }} />
                                 </Box>
                                 <Text variant="caption" tone="subdued">Text color in footer section</Text>
                               </Box>
                             </InlineStack>
                             
                             {/* Footer Background Image */}
                             <Box>
                               <Text as="label" variant="HeadingLg">Footer Background Image (optional) </Text>
                        
                               <Box paddingBlockStart="200">
                                 {panelSettings.footerBackgroundImage ? (
                                   <InlineStack gap="300" align="start">
                                     <Box>
                                       <img 
                                         src={panelSettings.footerBackgroundImage} 
                                         alt="Footer background preview"
                                         style={{ 
                                           width: '80px', 
                                           height: '40px', 
                                           objectFit: 'cover',
                                           border: '2px solid #e1e3e5',
                                           borderRadius: '4px'
                                         }}
                                       />
                                     </Box>
                                     <BlockStack gap="200">
                                       <Button onClick={handleRemoveFooterImage} tone="critical" size="slim">
                                         Remove Image
                                       </Button>
                                       <Text tone="subdued" variant="bodySm">
                                         Obraz będzie pokrywał całe tło footera
                                       </Text>
                                     </BlockStack>
                                   </InlineStack>
                                 ) : (
                                   <BlockStack gap="200">
                                     <DropZone
                                       onDrop={handleFooterImageDrop}
                                       accept="image/*"
                                       type="image"
                                     >
                                       <DropZone.FileUpload />
                                     </DropZone>
                                     <Text tone="subdued" variant="bodySm">
                                       Add background image for footer section. Leave empty to use only color.
                                     </Text>
                                
                                   </BlockStack>
                                 )}
                               </Box>
                               
                              
                             </Box>
                             
                             {/* Spis treści placeholderów */}
                             <Card background="bg-surface-secondary">
                               <BlockStack gap="300">
                                 <Text as="h4" variant="headingSm">
                                   📝 Available placeholders
                                 </Text>
                                 <Text variant="bodySm" tone="subdued">
                                   Copy and paste into text fields:
                                 </Text>
                                 
                                 <List>
                                   <List.Item><strong>{'{cart}'}</strong> - Cart value with currency (e.g. "$150.00")</List.Item>
                                   <List.Item><strong>{'{cart_value}'}</strong> - Cart value (e.g. "150.00")</List.Item>
                                   <List.Item><strong>{'{currency}'}</strong> - Currency symbol (e.g. "$")</List.Item>
                                   <List.Item><strong>{'{percentage}'}</strong> - Discount percentage (e.g. "15")</List.Item>
                                   <List.Item><strong>{'{amount}'}</strong> - Brakująca kwota (np. "50.00")</List.Item>
                                 </List>
                               </BlockStack>
                             </Card>
                           </>
                         ) : (
                           <Text variant="bodySm" tone="subdued" alignment="center">
                             Enable footer section to configure these settings
                           </Text>
                         )}
                       </BlockStack>
                     </Card>
                   )}
                   
                   {filteredSection === 'scrollbar' && (
                     <Card>
                       <BlockStack gap="400">
                         <InlineStack gap="300" align="start">
                           <Button
                             onClick={() => setFilteredSection('all')}
                             variant="secondary"
                             tone="critical"
                             size="medium"
                           >
                             ← Back to All Settings
                           </Button>
                         </InlineStack>
                         <Box paddingBlockStart="200" />
                       </BlockStack>
                       <BlockStack gap="400">
                         <Text as="h3" variant="headingMd">
                           📜 Scrollbar Settings
                         </Text>
                         
                         <Text variant="bodySm" tone="subdued">
                           Customize the appearance of the scrollbar in the discount panel
                         </Text>
                         
                         <InlineStack gap="300">
                           <Box style={{ flex: 1 }}>
                             <TextField
                               label="Scrollbar Width (px)"
                               type="number"
                               value={panelSettings.scrollbarWidth}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, scrollbarWidth: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               placeholder="8"
                               helpText="Width of the entire scrollbar"
                             />
                           </Box>
                           <Box style={{ flex: 1 }}>
                             <TextField
                               label="Thumb Margin (px)"
                               type="number"
                               value={panelSettings.scrollbarThumbMargin}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, scrollbarThumbMargin: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               placeholder="0"
                               helpText="Internal margin of the thumb"
                             />
                           </Box>
                         </InlineStack>
                         
                         <InlineStack gap="300">
                           <Box style={{ flex: 1 }}>
                             <TextField
                               label="Track Border Radius (px)"
                               type="number"
                               value={panelSettings.scrollbarBorderRadius}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, scrollbarBorderRadius: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               placeholder="4"
                               helpText="Corner radius of the scrollbar background"
                             />
                           </Box>
                           <Box style={{ flex: 1 }}>
                             <TextField
                               label="Thumb Border Radius (px)"
                               type="number"
                               value={panelSettings.scrollbarThumbBorderRadius}
                               onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, scrollbarThumbBorderRadius: value }));
                                 setHasUnsavedChanges(true);
                               }}
                               placeholder="4"
                               helpText="Corner radius of the thumb"
                             />
                           </Box>
                         </InlineStack>
                         
                         <BlockStack gap="300">
                           <Text as="h4" variant="headingSm">
                             🎨 Scrollbar colors
                           </Text>
                           
                           <InlineStack gap="300">
                             <Box style={{ flex: 1 }}>
                               <Text as="label" variant="bodyMd">Scrollbar background color</Text>
                               <Box paddingBlockStart="200">
                                 <ColorPickerField color={panelSettings.scrollbarBackground} onChange={(value) => {
                                   setPanelSettings(prev => ({ ...prev, scrollbarBackground: value }));
                                   setHasUnsavedChanges(true);
                                 }} />
                               </Box>
                               <Text variant="caption" tone="subdued">Scrollbar background color</Text>
                             </Box>
                             <Box style={{ flex: 1 }}>
                               <Text as="label" variant="bodyMd">Scrollbar thumb color</Text>
                               <Box paddingBlockStart="200">
                                 <ColorPickerField color={panelSettings.scrollbarThumbColor} onChange={(value) => {
                                   setPanelSettings(prev => ({ ...prev, scrollbarThumbColor: value }));
                                   setHasUnsavedChanges(true);
                                 }} />
                               </Box>
                               <Text variant="caption" tone="subdued">Scrollbar thumb color</Text>
                             </Box>
                           </InlineStack>
                           
                           <Box style={{ flex: 1 }}>
                             <Text as="label" variant="bodyMd">Scrollbar thumb color on hover</Text>
                             <Box paddingBlockStart="200">
                               <ColorPickerField color={panelSettings.scrollbarThumbHoverColor} onChange={(value) => {
                                 setPanelSettings(prev => ({ ...prev, scrollbarThumbHoverColor: value }));
                                 setHasUnsavedChanges(true);
                               }} />
                             </Box>
                             <Text variant="caption" tone="subdued">Scrollbar thumb color on hover</Text>
                           </Box>
                         </BlockStack>
                         
                         
                       </BlockStack>
                     </Card>
                   )}
                   {filteredSection === 'global' && (
                     <Card>
                       <BlockStack gap="400"> 
                         <InlineStack gap="300" align="start">
                           <Button
                             onClick={() => setFilteredSection('all')}
                             variant="secondary"
                             tone="critical"
                             size="medium"
                           >
                             ← Back to All Settings
                           </Button>
                         </InlineStack>
                         <Box paddingBlockStart="200" />
                       </BlockStack>
                       <BlockStack gap="400">
                         <Text as="h3" variant="headingMd">
                           🌐 Panel Global Settings
                         </Text>
                         
                        {/* Close Button Global Settings */}
                    

                        <InlineStack gap="300">
                          <Box style={{ flex: 1 }}>
                            <TextField
                              label="Close Button Text"
                              value={panelSettings.closeButtonText}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, closeButtonText: value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder=" "
                              helpText="Symbol or text displayed inside close button"
                            />
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <Text as="label" variant="bodyMd">Close Button Background Color</Text>
                            <Box paddingBlockStart="200">
                              <ColorPickerField color={panelSettings.closeButtonBackground || '#00000000'} onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, closeButtonBackground: value }));
                                setHasUnsavedChanges(true);
                              }} />
                            </Box>
                            <Text variant="caption" tone="subdued">Background color of close button (used when no image)</Text>
                          </Box>
                        </InlineStack>

                        <Box>
                          <Text as="label" variant="HeadingLg">Close Button Background Image (optional) </Text>
                          <Box paddingBlockStart="200">
                            {(localPreviews.closeButtonBackgroundImage || panelSettings.closeButtonBackgroundImage) ? (
                              <InlineStack gap="300" align="start">
                                <Box>
                                  <img 
                                    src={localPreviews.closeButtonBackgroundImage || panelSettings.closeButtonBackgroundImage} 
                                    alt="Close button background preview"
                                    style={{ 
                                      width: `${panelSettings.closeButtonSize || 25}px`, 
                                      height: `${panelSettings.closeButtonSize || 25}px`, 
                                      objectFit: 'cover',
                                      border: '2px solid #e1e3e5',
                                      borderRadius: '50%'
                                    }}
                                  />
                                </Box>
                                <BlockStack gap="200">
                                  <Button onClick={() => { setPanelSettings(prev => ({ ...prev, closeButtonBackgroundImage: '' })); setHasUnsavedChanges(true); }} tone="critical" size="slim">
                                    Remove Image
                                  </Button>
                                  <Text tone="subdued" variant="bodySm">
                                    Image will fill the close button background
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                            ) : (
                              <BlockStack gap="200">
                                <DropZone
                                  onDrop={(files) => {
                                    const file = files && files[0];
                                    if (!file) return;
                                    try {
                                      validateImageFile(file);
                                    } catch (e) {
                                      showToast(e.message);
                                      return;
                                    }
                                    const objectUrl = URL.createObjectURL(file);
                                    setLocalPreviews(prev => ({ ...prev, closeButtonBackgroundImage: objectUrl }));
                                    setUploadingMap(prev => ({ ...prev, closeButtonBackgroundImage: true }));
                                    (async () => {
                                      try {
                                        const compressed = await compressImage(file);
                                        const cdnUrl = await uploadImageToShopify(compressed, 'Close button background');
                                        setPanelSettings(prev => ({ ...prev, closeButtonBackgroundImage: cdnUrl }));
                                        setHasUnsavedChanges(true);
                                        setUploadingMap(prev => ({ ...prev, closeButtonBackgroundImage: false }));
                                        setLocalPreviews(prev => ({ ...prev, closeButtonBackgroundImage: '' }));
                                      } catch (err) {
                                        console.error('Close button background upload error:', err);
                                        showToast(`Error uploading close button background: ${err.message}`);
                                        setUploadingMap(prev => ({ ...prev, closeButtonBackgroundImage: false }));
                                      }
                                    })();
                                  }}
                                  accept="image/*"
                                  type="image"
                                >
                                  <DropZone.FileUpload />
                                </DropZone>
                                <Text tone="subdued" variant="bodySm">
                                  Add background image for close button. Leave empty to use only color.
                                </Text>
                              </BlockStack>
                            )}
                          </Box>
                        </Box>
                        
                        <InlineStack gap="300">
                          <Box style={{ width: '240px' }}>
                            <TextField
                              label="Close Button Size (px)"
                              type="number"
                              value={panelSettings.closeButtonSize}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, closeButtonSize: value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="25"
                              helpText="Width and height of the close button"
                            />
                          </Box>
                          <Box style={{ width: '240px' }}>
                            <Select
                              label="Close Button Position"
                              options={[
                                { label: 'Top Right', value: 'top-right' },
                                { label: 'Top Left', value: 'top-left' },
                                { label: 'Bottom Right', value: 'bottom-right' },
                                { label: 'Bottom Left', value: 'bottom-left' }
                              ]}
                              value={panelSettings.closeButtonPosition}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, closeButtonPosition: value }));
                                setHasUnsavedChanges(true);
                              }}
                              helpText="Fixed position of the close button within panel"
                            />
                          </Box>
                          <Box style={{ width: '180px' }}>
                            <TextField
                              label="Close Offset X (px)"
                              type="number"
                              value={panelSettings.closeButtonOffsetX}
                              onChange={(value) => { setPanelSettings(prev => ({ ...prev, closeButtonOffsetX: value })); setHasUnsavedChanges(true); }}
                              placeholder="10"
                            />
                          </Box>
                          <Box style={{ width: '180px' }}>
                            <TextField
                              label="Close Offset Y (px)"
                              type="number"
                              value={panelSettings.closeButtonOffsetY}
                              onChange={(value) => { setPanelSettings(prev => ({ ...prev, closeButtonOffsetY: value })); setHasUnsavedChanges(true); }}
                              placeholder="10"
                            />
                          </Box>
                        </InlineStack>
                        
                        <InlineStack gap="300">
                          <Box style={{ flex: 1 }}>
                            <TextField
                              label="Panel Border Radius (px)"
                              type="number"
                              value={panelSettings.borderRadius}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, borderRadius: value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="15"
                              helpText="Border radius for entire panel"
                            />
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <TextField
                              label="Panel Height (px)"
                              type="number"
                              value={panelSettings.panelHeight}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, panelHeight: value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="300"
                              helpText="Height of scrollable content area"
                            />
                          </Box>
                        </InlineStack>
                        
                        <InlineStack gap="300">
                          <Box style={{ flex: 1 }}>
                            <TextField
                              label="Max Panel Width (px)"
                              type="number"
                              value={panelSettings.maxPanelWidth}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, maxPanelWidth: value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="1200"
                              helpText="Maximum width of panel"
                            />
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <TextField
                              label="Panel Margin (px)"
                              type="number"
                              value={panelSettings.panelMargin}
                              onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, panelMargin: value }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="100"
                              helpText="Margin around panel"
                            />
                          </Box>
                        </InlineStack>
                        
                        <InlineStack gap="300">
                          <Box style={{ flex: 1 }}>
                            <Text as="label" variant="bodyMd">Panel Background</Text>
                            <Box paddingBlockStart="200">
                              <ColorPickerField color={panelSettings.panelBackground || '#ffffff'} onChange={(value) => {
                                setPanelSettings(prev => ({ ...prev, panelBackground: value }));
                                setHasUnsavedChanges(true);
                              }} />
                            </Box>
                            <Text variant="caption" tone="subdued">Main background color of panel</Text>
                          </Box>
                        </InlineStack>
                        
                        <Select
                          label="Shadow Intensity"
                          options={[
                            { label: 'None', value: 'none' },
                            { label: 'Light', value: 'light' },
                            { label: 'Medium', value: 'medium' },
                            { label: 'Strong', value: 'strong' }
                          ]}
                          value={panelSettings.shadowIntensity}
                          onChange={(value) => {
                            setPanelSettings(prev => ({ ...prev, shadowIntensity: value }));
                            setHasUnsavedChanges(true);
                          }}
                          helpText="Shadow intensity around panel"
                        />
                        
                        {/* Panel Visibility Rules moved to a different section */}
                       </BlockStack>
                     </Card>
                   )}
                 </BlockStack>
               )}
             </Box>
           </BlockStack>
         </Card>
       </Layout.Section>
       {/* Panel Preview Section */}
       <Layout.Section variant="fullWidth">
         <Card>
           <BlockStack gap="400">
                         <InlineStack align="space-between">
              <BlockStack gap="200">
              <Text as="h2" variant="headingLg">
              👁️ Preview - How the panel looks in store
               </Text>
                <Text tone="subdued">
                   Most of the settings are not visible in the preview, to see them you must open shop theme editor.
                </Text>
              </BlockStack>
              <ButtonGroup>
                {previewExpanded !== null && ( // Pokaż przycisk tylko gdy stan jest załadowany
                  <Button
                    variant="plain"
                    disclosure={previewExpanded ? 'up' : 'down'}
                    onClick={() => {
                      const newExpandedState = !previewExpanded;
                      console.log("🔄 Preview button clicked, changing from", previewExpanded, "to", newExpandedState);
                      setPreviewExpanded(newExpandedState);
                      
                      // Zapisz nowy stan do ustawień panelu
                      setPanelSettings(prev => ({
                        ...prev,
                        previewExpanded: newExpandedState
                      }));
                      
                      // Automatycznie zapisz ustawienia
                      const updatedSettings = {
                        ...panelSettings,
                        previewExpanded: newExpandedState
                      };
                      console.log("🔄 Saving preview settings:", updatedSettings.previewExpanded);
                      savePanelSettings(updatedSettings);
                    }}
                  >
                    {previewExpanded ? 'Hide preview' : 'Show preview'}
                  </Button>
                )}
                {/* Conditions to Display tab removed */}
                <Button
                  variant="primary"
                  onClick={() => {
                    const themeEditorUrl = shopData?.myshopifyDomain
                      ? `https://${shopData.myshopifyDomain}/admin/themes/current/editor?template=index`
                      : "#";
                    window.open(themeEditorUrl, "_blank");
                  }}
                  disabled={!shopData?.myshopifyDomain}
                >
                  Open Theme Editor
                </Button>
              </ButtonGroup>
            </InlineStack>
            {previewExpanded && (
              <Box 
                style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  width: '100%'
                }}
              >
                <Box
                  style={{
                    position: 'relative',
                    width: `${panelSettings.maxPanelWidth || previewPanelWidth}px`,
                    maxWidth: '100%',
                    backgroundColor: 'white',
                    borderRadius: `${panelSettings.borderRadius}px`,
                    boxShadow: panelSettings.shadowIntensity === 'none' ? 'none' :
                               panelSettings.shadowIntensity === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' :
                               panelSettings.shadowIntensity === 'strong' ? '0 12px 40px rgba(0,0,0,0.25)' :
                               '0 8px 25px rgba(0,0,0,0.15)',
                    fontFamily: 'Arial, sans-serif',
                    overflow: 'hidden'
                  }}
                >
                  {panelSettings.showCartValue && (
                    <Box
                      style={{
                        backgroundColor: panelSettings.cartValueBackground,
                        backgroundImage: panelSettings.cartValueBackgroundImage ? `url(${panelSettings.cartValueBackgroundImage})` : 'none',
                        backgroundSize: panelSettings.cartValueBackgroundImage ? 'cover' : 'auto',
                        backgroundPosition: panelSettings.cartValueBackgroundImage ? 'center' : 'initial',
                        backgroundRepeat: panelSettings.cartValueBackgroundImage ? 'no-repeat' : 'initial',
                        padding: `${panelSettings.cartValuePadding || 15}px`,
                        textAlign: panelSettings.headerTextAlign || 'center',
                        fontSize: `${panelSettings.cartValueFontSize || 16}px`,
                        fontWeight: 'bold',
                        color: panelSettings.cartValueTextColor,
                        height: `${panelSettings.cartValueHeight || 50}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: (
                          panelSettings.headerTextAlign === 'left'
                            ? 'flex-start'
                            : panelSettings.headerTextAlign === 'right'
                              ? 'flex-end'
                              : 'center'
                        ),
                        fontFamily: panelSettings.headerTextFont || 'Arial, sans-serif',
                        borderTopLeftRadius: `${panelSettings.borderRadius}px`,
                        borderTopRightRadius: `${panelSettings.borderRadius}px`
                      }}
                    >
                      {(panelSettings.cartValueText || ' ').replace('{cart}', `${previewCartValue} ${shopData?.currencyCode || 'USD'}`)}
                    </Box>
                  )}

                  {panelSettings.showHighestDiscountMessage && (
                    <Box
                      style={{
                        backgroundColor: panelSettings.statusMessageBackground,
                        backgroundImage: panelSettings.highestDiscountBackgroundImage ? `url(${panelSettings.highestDiscountBackgroundImage})` : 'none',
                        backgroundSize: panelSettings.highestDiscountBackgroundImage ? 'cover' : 'auto',
                        backgroundPosition: panelSettings.highestDiscountBackgroundImage ? 'center' : 'initial',
                        backgroundRepeat: panelSettings.highestDiscountBackgroundImage ? 'no-repeat' : 'initial',
                        color: panelSettings.statusMessageTextColor,
                        padding: `${panelSettings.highestDiscountPadding || 15}px`,
                        textAlign: panelSettings.subheaderTextAlign || 'center',
                        fontSize: `${panelSettings.highestDiscountFontSize || 14}px`,
                        minHeight: `${panelSettings.remainingAmountHeight || 60}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: (
                          panelSettings.subheaderTextAlign === 'left'
                            ? 'flex-start'
                            : panelSettings.subheaderTextAlign === 'right'
                              ? 'flex-end'
                              : 'center'
                        ),
                        fontFamily: panelSettings.subheaderTextFont || 'Arial, sans-serif',
                        ...(panelSettings.showCartValue ? {} : { borderTopLeftRadius: `${panelSettings.borderRadius}px`, borderTopRightRadius: `${panelSettings.borderRadius}px` })
                      }}
                    >
                      {(() => {
                        const visibleDiscounts = panelDiscounts.filter(d => d.visibleInPanel !== false);
                        const achievedDiscounts = visibleDiscounts.filter(d => previewCartValue >= d.minimumAmount);
                        if (achievedDiscounts.length > 0) {
                          const highest = achievedDiscounts.reduce((max, d) => d.discountPercentage > max.discountPercentage ? d : max);
                          return panelSettings.highestDiscountText.replace('{percentage}', highest.discountPercentage.toString());
                        }
                        const nextDiscount = visibleDiscounts
                          .filter(d => previewCartValue < d.minimumAmount)
                          .sort((a, b) => a.minimumAmount - b.minimumAmount)[0];
                        if (nextDiscount) {
                          const needed = nextDiscount.minimumAmount - previewCartValue;
                          return `${panelSettings.missingText} ${needed} ${shopData?.currencyCode || 'USD'}`;
                        }
                        return '';
                      })()}
                    </Box>
                  )}

                  <Box
                    className="shop-panel-scrollbar"
                    style={{
                      height: `${panelSettings.panelHeight}px`,
                      overflowY: 'auto',
                      padding: '0'
                    }}
                  >
                    {panelDiscounts.filter(d => d.visibleInPanel !== false).length === 0 ? (
                      <Box style={{ 
                        padding: '40px 25px', 
                        textAlign: panelSettings.subheaderTextAlign || 'center',
                        color: '#999',
                        fontSize: '16px'
                      }}>
                        {panelSettings.errorNoDiscountsText}
                      </Box>
                    ) : (
                      (() => {
                        let visibleDiscounts = panelDiscounts.filter(discount => discount.visibleInPanel !== false);
                        if (sortBy === 'custom' && Array.isArray(panelSettings.customDiscountOrder) && panelSettings.customDiscountOrder.length > 0) {
                          const indexMap = new Map(panelSettings.customDiscountOrder.map((id, idx) => [String(id), idx]));
                          visibleDiscounts = [...visibleDiscounts].sort((a, b) => {
                            const ia = indexMap.has(String(a.id)) ? indexMap.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
                            const ib = indexMap.has(String(b.id)) ? indexMap.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
                            if (ia !== ib) return ia - ib;
                            return (a.minimumAmount || 0) - (b.minimumAmount || 0);
                          });
                        } else {
                          visibleDiscounts = [...visibleDiscounts].sort((a, b) => {
                            switch (sortBy) {
                              case 'newest':
                                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                              case 'oldest':
                                return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                              case 'amount_high':
                                return (b.minimumAmount || 0) - (a.minimumAmount || 0);
                              case 'amount_low':
                                return (a.minimumAmount || 0) - (b.minimumAmount || 0);
                              case 'discount_high':
                                return (b.discountPercentage || 0) - (a.discountPercentage || 0);
                              case 'discount_low':
                                return (a.discountPercentage || 0) - (b.discountPercentage || 0);
                              case 'alphabetical':
                                return String(a.description || '').localeCompare(String(b.description || ''));
                              default:
                                return 0;
                            }
                          });
                        }
                        return visibleDiscounts.map((discount, index) => {
                          const isAchieved = previewCartValue >= discount.minimumAmount;
                          const isLocked = !isAchieved;
                          const amountNeeded = Math.max(0, discount.minimumAmount - previewCartValue);

                          return (
                            <div
                              key={discount.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: `${panelSettings.discountSpacing}px 25px`,
                                backgroundColor: isAchieved ? panelSettings.achievedColor : panelSettings.lockedColor,
                                borderBottom: index < visibleDiscounts.length - 1 ? `${panelSettings.rowSeparatorWidth || 1}px solid ${panelSettings.rowSeparatorColor || '#e0e0e0'}` : 'none',
                                minHeight: `${panelSettings.rowHeight}px`,
                                transition: 'all 0.3s ease'
                              }}
                            >
                              {discount.imageUrl ? (
                              <Box style={{ 
                                width: `${panelSettings.iconSize || 40}px`, 
                                height: `${panelSettings.iconSize || 40}px`, 
                                marginRight: '20px',
                                flexShrink: 0
                              }}>
                                {(() => {
                                  if (discount.imageUrl && !isLocked) {
                                    return (
                                      <img 
                                        src={discount.imageUrl} 
                                        alt={discount.description}
                                        style={{ 
                                          width: '100%', 
                                          height: '100%', 
                                          objectFit: 'cover', 
                                          borderRadius: '8px',
                                          opacity: 1
                                        }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                    );
                                  }
                                  
                                  const iconColor = isAchieved ? '#28a745' : '#6c757d';
                                  const iconSize = Math.round((panelSettings.iconSize || 40) * 0.8);
                                  
                                  if (isLocked) {
                                    const lockedIconUrl = (discount.lockedIcon || panelSettings.defaultLockedIcon || '').toString().trim();
                                    if (lockedIconUrl && (lockedIconUrl.startsWith('http') || lockedIconUrl.startsWith('data:'))) {
                                      return (
                                        <img 
                                          src={lockedIconUrl} 
                                          alt="Locked icon"
                                          style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover', 
                                            borderRadius: '8px',
                                            opacity: 0.7
                                          }}
                                          onError={(e) => { 
                                            e.target.style.display = 'none'; 
                                            e.target.parentNode.innerHTML = '🔒'; 
                                          }}
                                        />
                                      );
                                    }
                                    return (
                                      <div style={{ 
                                        width: `${panelSettings.iconSize || 40}px`,
                                        height: `${panelSettings.iconSize || 40}px`,
                                        borderRadius: '50%',
                                        backgroundColor: '#c0c0c0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: `${Math.round((panelSettings.iconSize || 40) * 0.4)}px`,
                                        color: '#666'
                                      }}>{lockedIconUrl || '🔒'}</div>
                                    );
                                  }
                                  if (discount.discountType === 'free_shipping') {
                                    return (
                                      <div style={{ 
                                        fontSize: `${iconSize}px`, 
                                        color: iconColor,
                                        textAlign: 'center',
                                        lineHeight: `${panelSettings.iconSize || 40}px`
                                      }}>🚚</div>
                                    );
                                  }
                                  return (
                                    <div style={{ 
                                      fontSize: `${iconSize}px`, 
                                      color: iconColor,
                                      textAlign: 'center',
                                      lineHeight: `${panelSettings.iconSize || 40}px`,
                                      fontWeight: 'bold'
                                    }} />
                                  );
                                })()}
                              </Box>
                              ) : null}

                              <Box style={{ flex: 1 }}>
                                <Text 
                                  variant="bodyMd" 
                                  fontWeight="semibold"
                                  style={{ 
                                    fontSize: `${panelSettings.descriptionFontSize || 15}px`,
                                    opacity: isLocked ? 0.7 : 1,
                                    marginBottom: '5px',
                                    display: 'block',
                                    fontFamily: isAchieved ? (panelSettings.achievedTextFont || 'Arial, sans-serif') : (panelSettings.missingTextFont || 'Arial, sans-serif')
                                  }}
                                >
                                  {discount.description}
                                </Text>

                                <Text 
                                  variant="bodySm" 
                                  tone="subdued"
                                  style={{ 
                                    fontSize: `${panelSettings.minimumAmountFontSize || 13}px`,
                                    opacity: isLocked ? 0.6 : 0.8
                                  }}
                                >
                                  {isAchieved 
                                    ? (panelSettings.showAchievedText ? panelSettings.achievedText : '')
                                    : (panelSettings.showMissingAmount 
                                        ? `${panelSettings.missingText} ${amountNeeded} ${shopData?.currencyCode || 'USD'}`
                                        : `${panelSettings.requiredText ? `${panelSettings.requiredText} ` : ''}${discount.minimumAmount} ${shopData?.currencyCode || 'USD'}`
                                      )
                                  }
                                </Text>
                              </Box>
                            </div>
                          );
                        });
                      })()
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </BlockStack>
        </Card>
      </Layout.Section>

      {/* Current Discounts Section */}
      
      <Layout.Section>
       <Box align="center">
         <Button variant="plain">
           <InlineStack gap={200} align="center">
             <Icon source={ChatIcon} />
             <Text 
              variant="bodyLg"
              onClick={handleCopyEmail}
              style={{ cursor: 'pointer' }}
            >
              Need help? Contact support: fajwuwus32@gmail.com
            </Text>
           </InlineStack>
         </Button>
       </Box>
     </Layout.Section>
    </>
  );

  // SHOPIFY FUNCTIONS REMOVED - All functionality moved to Manage Discounts section
  

   // MAIN COMPONENT RENDER - ENTIRE APPLICATION STRUCTURE
  return (
    <Frame>
      {/* Shopify Native Save Bar */}
      <ui-save-bar id="panel-save-bar">
        <button variant="primary" id="save-button">Save panel settings</button>
        <button id="discard-button">Discard changes</button>
      </ui-save-bar>
      
      <Page title="Taskfy - Discount Management">
        {/* Navigation Bar */}
    

        {/* Main Content */}
        <Layout>
        <Layout.Section variant="fullWidth">
        <Card>
          <BlockStack gap="600">
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                {activeView === "welcome" ? "🏠 Welcome to Automatic Reward Panel" :
                 activeView === "discounts" ? "📊 Manage Discounts" : 
                 "⚙️ Reward Panel Settings"}
              </Text>
              {activeView === "discounts" && (
                <Text tone="subdued">
                  {discountCreationMode === 'edit' && editingDiscount
                    ? `✏️ Editing discount: ${editingDiscount.description}`
                    : discountCreationMode === 'order'
                      ? '➕ Creating discount: Order discount'
                      : discountCreationMode === 'shipping'
                        ? '➕ Creating discount: Free shipping'
                        : ''}
                </Text>
              )}
              <ButtonGroup>
                <Button 
                  pressed={activeView === "welcome"}
                  onClick={() => {
                    if (navigationLocked) { showToast('You have unsaved changes. Please Save or Discard first.'); return; }
                    setActiveView("welcome");
                  }}
                >
                  🏠 Home
                </Button>
                <Button 
                  pressed={activeView === "discounts"}
                  onClick={() => {
                    if (navigationLocked) { showToast('You have unsaved changes. Please Save or Discard first.'); return; }
                    setActiveView("discounts");
                  }}
                >
                  📊 Manage Discounts
                </Button>
                <Button 
                  pressed={activeView === "panel-settings"}
                  onClick={() => {
                    if (navigationLocked) { showToast('You have unsaved changes. Please Save or Discard first.'); return; }
                    setActiveView("panel-settings");
                  }}
                >
                  ⚙️ Reward Panel Settings
                </Button>
              </ButtonGroup>
            </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

          {activeView === "welcome" ? renderWelcomeView() :
           activeView === "discounts" ? renderDiscountsView() : 
           renderPanelSettingsView()}
        </Layout>
    </Page>
      {toastMarkup}

      {/* ADD NEW DISCOUNT MODAL */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setDiscountType('percentage');
          setNewDiscount({ description: '', minimumAmount: '', discountPercentage: '', discountAmount: '', discountValueType: 'percentage', imageUrl: '', lockedIcon: '', backgroundColor: '', backgroundImage: '' });
        }}
        title="Add New Discount"
        primaryAction={{
          content: 'Add',
          onAction: addManualDiscount,
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => {
            setShowAddModal(false);
            setDiscountType('percentage');
            setNewDiscount({ description: '', minimumAmount: '', discountPercentage: '', discountAmount: '', discountValueType: 'percentage', imageUrl: '', lockedIcon: '', backgroundColor: '', backgroundImage: '' });
          },
        }]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Discount Description"
              value={newDiscount.description}
              onChange={(value) => setNewDiscount(prev => ({ ...prev, description: value }))}
              placeholder={discountType === 'free_shipping' 
                ? `e.g. Free shipping on purchases over 200 ${shopData?.currencyCode || 'USD'}`
                : `e.g. 10% discount on purchases over 200 ${shopData?.currencyCode || 'USD'}`}
            />
            
            <Select
              label="Discount Type"
              options={[
                { label: 'Percentage discount', value: 'percentage' },
                { label: 'Fixed amount discount', value: 'fixed_amount' },
                { label: 'Free shipping', value: 'free_shipping' }
              ]}
              value={discountType}
              onChange={(value) => {
                setDiscountType(value);
                setNewDiscount(prev => ({ 
                  ...prev, 
                  discountValueType: value === 'free_shipping' ? 'percentage' : value,
                  discountType: value
                }));
              }}
            />
            
            {discountType === 'percentage' && (
              <Select
                label="Discount Class"
                options={[
                  { label: 'Order discount (entire order)', value: 'ORDER' },
                  { label: 'Product discount (most expensive product)', value: 'PRODUCT' }
                ]}
                value={newDiscount.discountClass || 'ORDER'}
                onChange={(value) => setNewDiscount(prev => ({ ...prev, discountClass: value }))}
                helpText="Choose if the discount applies to the entire order or a specific product"
              />
            )}
            
            <TextField
              label={`Minimum Amount (${shopData?.currencyCode || 'USD'})`}
              type="number"
              value={newDiscount.minimumAmount}
              onChange={(value) => setNewDiscount(prev => ({ ...prev, minimumAmount: value }))}
              placeholder="200"
            />
            
            {discountType === 'percentage' && (
              <TextField
                label="Discount Percentage"
                type="number"
                step="0.1"
                value={newDiscount.discountPercentage}
                onChange={(value) => setNewDiscount(prev => ({ ...prev, discountPercentage: value }))}
                placeholder="15.5"
                suffix="%"
                helpText="Enter decimal values like 15.5 for 15.5% discount"
              />
            )}
            
            {discountType === 'fixed_amount' && (
              <TextField
                label={`Fixed Discount Amount (${shopData?.currencyCode || 'USD'})`}
                type="number"
                step="0.01"
                value={newDiscount.discountAmount || ''}
                onChange={(value) => setNewDiscount(prev => ({ ...prev, discountAmount: value }))}
                placeholder="20.00"
                suffix={shopData?.currencyCode || 'USD'}
                helpText="Enter fixed amount like 20.00 for $20 off"
              />
            )}
            
            <Box>
              <Text as="label" variant="bodyMd">Discount Icon (optional)</Text>
              <Box paddingBlockStart="200">
                {!newDiscount.imageUrl ? (
                  <BlockStack gap="300">
                    <DropZone
                      onDrop={handleDropZoneDrop}
                      accept="image/*"
                      type="image"
                      allowMultiple={false}
                    >
                      <DropZone.FileUpload />
                    </DropZone>
                    
                    <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                      Drag and drop an image or click to select a file
                    </Text>
                  </BlockStack>
                ) : (
                  <InlineStack gap="300" align="start">
                    <Thumbnail
                      source={newDiscount.imageUrl}
                      alt="Discount icon preview"
                      size="small"
                    />
                    <Button onClick={handleRemoveNewImage} destructive>
                      Remove Image
                    </Button>
                  </InlineStack>
                )}
              </Box>
            </Box>
            
            <TextField
              label="Or paste image URL"
              value={newDiscount.imageUrl && !newDiscount.imageUrl.startsWith('data:') ? newDiscount.imageUrl : ''}
              onChange={(value) => setNewDiscount(prev => ({ ...prev, imageUrl: value }))}
              placeholder="https://cdn.shopify.com/s/files/1/xxxx/image.png"
              helpText="Alternatively, you can paste a direct link to an image"
            />
            
            <Box>
              <Text as="label" variant="bodyMd">Locked Icon Image (shown when discount is not unlocked)</Text>
              <Box paddingBlockStart="200">
                {!newDiscount.lockedIcon ? (
                  <BlockStack gap="300">
                    <DropZone
                      onDrop={(files) => {
                        const file = files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setNewDiscount(prev => ({ ...prev, lockedIcon: e.target.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      accept="image/*"
                      type="image"
                      allowMultiple={false}
                    >
                      <DropZone.FileUpload />
                    </DropZone>
                    
                    <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                      Drag and drop an image or click to select
                    </Text>
                  </BlockStack>
                ) : (
                  <InlineStack gap="300" align="start">
                    <Thumbnail
                      source={newDiscount.lockedIcon}
                      alt="Locked icon preview"
                      size="small"
                    />
                    <Button onClick={() => setNewDiscount(prev => ({ ...prev, lockedIcon: '' }))} destructive>
                      Remove Image
                    </Button>
                  </InlineStack>
                )}
              </Box>
              
              <Box paddingBlockStart="200">
                <TextField
                  label="Or paste image URL"
                  value={newDiscount.lockedIcon && !newDiscount.lockedIcon.startsWith('data:') ? newDiscount.lockedIcon : ''}
                  onChange={(value) => setNewDiscount(prev => ({ ...prev, lockedIcon: value }))}
                  placeholder="https://cdn.shopify.com/s/files/1/xxxx/locked-icon.png"
                  helpText="Alternatively, you can paste a direct link to an image"
                />
              </Box>
            </Box>
            
            <ColorPickerField
              color={newDiscount.backgroundColor || '#ffffff'}
              onChange={(value) => setNewDiscount(prev => ({ ...prev, backgroundColor: value }))}
              label="Background Color"
            />
            
            <TextField
              label="Background Image URL (optional)"
              value={newDiscount.backgroundImage || ''}
              onChange={(value) => setNewDiscount(prev => ({ ...prev, backgroundImage: value }))}
              placeholder="https://cdn.shopify.com/s/files/1/xxxx/background.png"
              helpText="Background image for this discount row"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
      
      {/* EDIT DISCOUNT MODAL */}
      <Modal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingDiscount(null);
        }}
        title="Edit Discount"
        primaryAction={{
          content: 'Save',
          onAction: saveEditedDiscount,
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => {
            setShowEditModal(false);
            setEditingDiscount(null);
          },
        }]}
      >
        {editingDiscount && (
          <Modal.Section>
            <FormLayout>
              <TextField
                label="Discount Description"
                value={editingDiscount.description}
                disabled
                helpText="The discount name cannot be changed. To rename it, delete this discount and create a new one."
                placeholder={editingDiscount.discountType === 'free_shipping' 
                  ? `e.g. Free shipping on purchases over 200 ${shopData?.currencyCode || 'USD'}`
                  : `e.g. 10% discount on purchases over 200 ${shopData?.currencyCode || 'USD'}`}
              />
              
              <Select
                label="Discount Type"
                options={[
                  { label: 'Percentage discount', value: 'percentage' },
                  { label: 'Fixed amount discount', value: 'fixed_amount' },
                  { label: 'Free shipping', value: 'free_shipping' }
                ]}
                value={editingDiscount.discountValueType === 'fixed_amount' ? 'fixed_amount' : (editingDiscount.discountType || 'percentage')}
                onChange={(value) => setEditingDiscount(prev => ({ 
                  ...prev, 
                  discountType: value === 'free_shipping' ? 'free_shipping' : 'percentage',
                  discountValueType: value === 'free_shipping' ? 'percentage' : value,
                  discountPercentage: value === 'free_shipping' ? 0 : prev.discountPercentage,
                  discountAmount: value === 'fixed_amount' ? prev.discountAmount : 0
                }))}
              />
              
              {(editingDiscount.discountType || 'percentage') === 'percentage' && (
                <Select
                  label="Discount Class"
                  options={[
                    { label: 'Order discount (entire order)', value: 'ORDER' },
                    { label: 'Product discount (most expensive product)', value: 'PRODUCT' }
                  ]}
                  value={editingDiscount.discountClass || 'ORDER'}
                  onChange={(value) => setEditingDiscount(prev => ({ ...prev, discountClass: value }))}
                  helpText="Choose if the discount applies to the entire order or a specific product"
                />
              )}
              
              <TextField
                label={`Minimum Amount (${shopData?.currencyCode || 'USD'})`}
                type="number"
                value={editingDiscount.minimumAmount.toString()}
                onChange={(value) => setEditingDiscount(prev => ({ ...prev, minimumAmount: parseFloat(value) || 0 }))}
                placeholder="200"
              />
              
              {(editingDiscount.discountValueType || editingDiscount.discountType || 'percentage') === 'percentage' && (
                <TextField
                  label="Discount Percentage"
                  type="number"
                  step="0.1"
                  value={editingDiscount.discountPercentage.toString()}
                  onChange={(value) => setEditingDiscount(prev => ({ ...prev, discountPercentage: parseFloat(value) || 0 }))}
                  placeholder="15.5"
                  suffix="%"
                  helpText="Enter decimal values like 15.5 for 15.5% discount"
                />
              )}
              
              {(editingDiscount.discountValueType || 'percentage') === 'fixed_amount' && (
                <TextField
                  label={`Fixed Discount Amount (${shopData?.currencyCode || 'USD'})`}
                  type="number"
                  step="0.01"
                  value={editingDiscount.discountAmount?.toString() || '0'}
                  onChange={(value) => setEditingDiscount(prev => ({ ...prev, discountAmount: parseFloat(value) || 0 }))}
                  placeholder="20.00"
                  suffix={shopData?.currencyCode || 'USD'}
                  helpText="Enter fixed amount like 20.00 for $20 off"
                />
              )}
              
              <Box>
                <Text as="label" variant="bodyMd">Discount Icon (optional)</Text>
                <Box paddingBlockStart="200">
                  {!editingDiscount.imageUrl ? (
                    <BlockStack gap="300">
                      <DropZone
                        onDrop={handleEditDropZoneDrop}
                        accept="image/*"
                        type="image"
                        allowMultiple={false}
                      >
                        <DropZone.FileUpload />
                      </DropZone>
                      
                      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                        Drag and drop an image or click to select a file
                      </Text>
                    </BlockStack>
                  ) : (
                    <InlineStack gap="300" align="start">
                      <Thumbnail
                        source={editingDiscount.imageUrl}
                        alt="Discount icon preview"
                        size="small"
                      />
                      <Button onClick={handleRemoveEditImage} destructive>
                        Remove Image
                      </Button>
                    </InlineStack>
                  )}
                </Box>
              </Box>
              
              <TextField
                label="Or paste image URL"
                value={editingDiscount.imageUrl && !editingDiscount.imageUrl.startsWith('data:') ? editingDiscount.imageUrl : ''}
                onChange={(value) => setEditingDiscount(prev => ({ ...prev, imageUrl: value }))}
                placeholder="https://cdn.shopify.com/s/files/1/xxxx/image.png"
                helpText="Alternatively, you can paste a direct link to an image"
              />
              
              <Box>
                <Text as="label" variant="bodyMd">Locked Icon Image (shown when discount is not unlocked)</Text>
                <Box paddingBlockStart="200">
                  {!editingDiscount.lockedIcon ? (
                    <BlockStack gap="300">
                      <DropZone
                        onDrop={(files) => {
                          const file = files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              setEditingDiscount(prev => ({ ...prev, lockedIcon: e.target.result }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        accept="image/*"
                        type="image"
                        allowMultiple={false}
                      >
                        <DropZone.FileUpload />
                      </DropZone>
                      
                      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                        Drag and drop an image or click to select
                      </Text>
                    </BlockStack>
                  ) : (
                    <InlineStack gap="300" align="start">
                      <Thumbnail
                        source={editingDiscount.lockedIcon}
                        alt="Locked icon preview"
                        size="small"
                      />
                      <Button onClick={() => setEditingDiscount(prev => ({ ...prev, lockedIcon: '' }))} destructive>
                        Remove Image
                      </Button>
                    </InlineStack>
                  )}
                </Box>
                
                <Box paddingBlockStart="200">
                  <TextField
                    label="Or paste image URL"
                    value={editingDiscount.lockedIcon && !editingDiscount.lockedIcon.startsWith('data:') ? editingDiscount.lockedIcon : ''}
                    onChange={(value) => setEditingDiscount(prev => ({ ...prev, lockedIcon: value }))}
                    placeholder="https://cdn.shopify.com/s/files/1/xxxx/locked-icon.png"
                    helpText="Alternatively, you can paste a direct link to an image"
                  />
                </Box>
              </Box>
              
              <ColorPickerField
                color={editingDiscount.backgroundColor || '#ffffff'}
                onChange={(value) => setEditingDiscount(prev => ({ ...prev, backgroundColor: value }))}
                label="Background Color"
              />
              
              <TextField
                label="Background Image URL (optional)"
                value={editingDiscount.backgroundImage || ''}
                onChange={(value) => setEditingDiscount(prev => ({ ...prev, backgroundImage: value }))}
                placeholder="https://cdn.shopify.com/s/files/1/xxxx/background.png"
                helpText="Background image for this discount row"
              />
            </FormLayout>
          </Modal.Section>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Deletion"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: handleConfirmedDelete,
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => setShowDeleteConfirm(false),
        }]}
      >
        <Modal.Section>
          <Text>
            Are you sure you want to delete the discount "{discountToDelete?.description}"? 
            This action cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>

      {/* EXPORT SETTINGS MODAL */}
      <Modal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Settings"
        primaryAction={{
          content: isExporting ? 'Exporting...' : 'Export',
          loading: isExporting,
          onAction: exportSettings,
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => setShowExportModal(false),
        }]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text variant="bodyMd">
              This will download a JSON file containing all panel settings and discounts. 
              You can use this file to backup your configuration or transfer it to another store.
            </Text>
            <DismissibleBanner 
              id="export-info-banner"
              title="📦 Export Information"
              tone="info"
              onDismiss={handleDismissBanner}
              isDismissed={dismissedBannersState.has("export-info-banner")}
            >
              <p>Export includes: Panel settings, discount configurations, styling options and metadata</p>
            </DismissibleBanner>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* IMPORT DISCOUNTS FROM SHOPIFY MODAL */}
      <Modal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Discounts from Store"
        primaryAction={{
          content: isImporting ? 'Importing...' : 'Import and Replace All',
          loading: isImporting,
          destructive: true,
          onAction: handleImportDiscounts,
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => setShowImportModal(false),
        }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="bodyMd">
              This action will import all active automatic discounts from your Shopify store.
            </Text>
            
            <Banner tone="critical">
              <BlockStack gap="200">
                <Text variant="bodyMd" as="h3">
                  ⚠️ This action is irreversible!
                </Text>
                <Text>
                  All current discounts ({panelDiscounts.length}) will be permanently deleted and replaced with imported ones from the store.
                </Text>
              </BlockStack>
            </Banner>
            
            <Text variant="bodyMd" tone="subdued">
              Only active automatic discounts will be imported. Manual discounts created in this panel will be lost.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* FULL PANEL PREVIEW MODAL */}
      <Modal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="👁️ Full Panel Preview - How it looks in shop"
        fullScreen
      >
        <Modal.Section>
          <style>
            {`
              .shop-panel-scrollbar::-webkit-scrollbar {
                width: 8px;
              }
              .shop-panel-scrollbar::-webkit-scrollbar-track {
                background: ${panelSettings.scrollbarBackground};
              }
              .shop-panel-scrollbar::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 4px;
              }
              .shop-panel-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #555;
              }
              .shop-panel-scrollbar::-webkit-scrollbar-button {
                display: none;
              }
            `}
          </style>
          
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text variant="bodyMd" tone="subdued">
              Some settings may not be visible in the preview, to see them you must open shop theme editor.
              </Text>
              
              {/* Header Value Control */}
              <InlineStack gap="400" align="start">
                <Box style={{ width: '200px' }}>
                  <TextField
                    label="Header value for preview"
                    type="number"
                    value={previewCartValue}
                    onChange={(value) => setPreviewCartValue(parseFloat(value) || 0)}
                    suffix={shopData?.currencyCode || 'USD'}
                    helpText="Test different header values"
                  />
                </Box>
                <Box style={{ width: '200px' }}>
                                   <TextField
                   label="Preview panel width"
                   type="number"
                   value={previewPanelWidth}
                   onChange={(value) => {
                     setPreviewPanelWidth(parseInt(value) || 600);
                   }}
                   suffix="px"
                   helpText="Panel width in pixels (1-800)"
                 />
                </Box>
              </InlineStack>
            </InlineStack>
            
            {/* Full Width Panel Preview */}
            <Box 
              style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                minHeight: '80vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                width: '100%'
              }}
            >
              {/* Simulated Shop Environment - Full Width */}
              <Box
                style={{
                  position: 'relative',
                  width: `${panelSettings.maxPanelWidth || previewPanelWidth}px`,
                  maxWidth: '100%',
                  backgroundColor: 'white',
                  borderRadius: `${panelSettings.borderRadius}px`,
                  boxShadow: panelSettings.shadowIntensity === 'none' ? 'none' :
                             panelSettings.shadowIntensity === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' :
                             panelSettings.shadowIntensity === 'strong' ? '0 12px 40px rgba(0,0,0,0.25)' :
                             '0 8px 25px rgba(0,0,0,0.15)',
                  fontFamily: 'Arial, sans-serif',
                  overflow: 'hidden'
                }}
              >
                {/* Close Button */}
                <Box
                  style={{
                    position: 'absolute',
                    ...(panelSettings.closeButtonPosition === 'top-right' && { top: `${panelSettings.closeButtonOffsetY}px`, right: `${panelSettings.closeButtonOffsetX}px`, bottom: 'auto', left: 'auto' }),
                    ...(panelSettings.closeButtonPosition === 'top-left' && { top: `${panelSettings.closeButtonOffsetY}px`, left: `${panelSettings.closeButtonOffsetX}px`, bottom: 'auto', right: 'auto' }),
                    ...(panelSettings.closeButtonPosition === 'bottom-right' && { bottom: `${panelSettings.closeButtonOffsetY}px`, right: `${panelSettings.closeButtonOffsetX}px`, top: 'auto', left: 'auto' }),
                    ...(panelSettings.closeButtonPosition === 'bottom-left' && { bottom: `${panelSettings.closeButtonOffsetY}px`, left: `${panelSettings.closeButtonOffsetX}px`, top: 'auto', right: 'auto' }),
                    width: `${panelSettings.closeButtonSize || 25}px`,
                    height: `${panelSettings.closeButtonSize || 25}px`,
                    backgroundColor: panelSettings.closeButtonBackgroundImage && panelSettings.closeButtonBackgroundImage.trim() ? 'transparent' : (panelSettings.closeButtonBackground || 'rgba(0,0,0,0.1)'),
                    backgroundImage: panelSettings.closeButtonBackgroundImage && panelSettings.closeButtonBackgroundImage.trim() ? `url(${panelSettings.closeButtonBackgroundImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#666',
                    zIndex: 100
                  }}
                >
                  {panelSettings.closeButtonText ?? ' '}
                </Box>
                {/* Cart Total Header - conditionally rendered */}
                {panelSettings.showCartValue && (
                  <Box
                                          style={{
                        backgroundColor: panelSettings.cartValueBackground,
                        backgroundImage: panelSettings.cartValueBackgroundImage ? `url(${panelSettings.cartValueBackgroundImage})` : 'none',
                        backgroundSize: panelSettings.cartValueBackgroundImage ? 'cover' : 'auto',
                        backgroundPosition: panelSettings.cartValueBackgroundImage ? 'center' : 'initial',
                        backgroundRepeat: panelSettings.cartValueBackgroundImage ? 'no-repeat' : 'initial',
                        padding: `${panelSettings.cartValuePadding || 15}px`,
                        textAlign: panelSettings.headerTextAlign || 'center',
                        fontSize: `${panelSettings.cartValueFontSize || 16}px`,
                        fontWeight: 'bold',
                        color: panelSettings.cartValueTextColor,
                        height: `${panelSettings.cartValueHeight || 50}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: (
                          panelSettings.headerTextAlign === 'left'
                            ? 'flex-start'
                            : panelSettings.headerTextAlign === 'right'
                              ? 'flex-end'
                              : 'center'
                        ),
                        fontFamily: panelSettings.headerTextFont || 'Arial, sans-serif',
                        borderTopLeftRadius: `${panelSettings.borderRadius}px`,
                        borderTopRightRadius: `${panelSettings.borderRadius}px`
                      }}
                  >
                    {(panelSettings.cartValueText || ' ').replace('{cart}', `${previewCartValue} ${shopData?.currencyCode || 'USD'}`)}
                  </Box>
                )}
                
                {/* Status Message Area */}
                {panelSettings.showHighestDiscountMessage && (
                  <Box
                                          style={{
                        backgroundColor: panelSettings.statusMessageBackground,
                        backgroundImage: panelSettings.highestDiscountBackgroundImage ? `url(${panelSettings.highestDiscountBackgroundImage})` : 'none',
                        backgroundSize: panelSettings.highestDiscountBackgroundImage ? 'cover' : 'auto',
                        backgroundPosition: panelSettings.highestDiscountBackgroundImage ? 'center' : 'initial',
                        backgroundRepeat: panelSettings.highestDiscountBackgroundImage ? 'no-repeat' : 'initial',
                        color: panelSettings.statusMessageTextColor,
                        padding: `${panelSettings.highestDiscountPadding || 15}px`,
                        textAlign: panelSettings.subheaderTextAlign || 'center',
                        fontSize: `${panelSettings.highestDiscountFontSize || 14}px`,
                        minHeight: `${panelSettings.remainingAmountHeight || 60}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: (
                          panelSettings.subheaderTextAlign === 'left'
                            ? 'flex-start'
                            : panelSettings.subheaderTextAlign === 'right'
                              ? 'flex-end'
                              : 'center'
                        ),
                        fontFamily: panelSettings.subheaderTextFont || 'Arial, sans-serif',
                        ...(panelSettings.showCartValue ? {} : { borderTopLeftRadius: `${panelSettings.borderRadius}px`, borderTopRightRadius: `${panelSettings.borderRadius}px` })
                      }}
                  >
                    {(() => {
                      const visibleDiscounts = panelDiscounts.filter(d => d.visibleInPanel !== false);
                      const achievedDiscounts = visibleDiscounts.filter(d => previewCartValue >= d.minimumAmount);
                      if (achievedDiscounts.length > 0) {
                        const highest = achievedDiscounts.reduce((max, d) => d.discountPercentage > max.discountPercentage ? d : max);
                        return panelSettings.highestDiscountText.replace('{percentage}', highest.discountPercentage.toString());
                      }
                      const nextDiscount = visibleDiscounts
                        .filter(d => previewCartValue < d.minimumAmount)
                        .sort((a, b) => a.minimumAmount - b.minimumAmount)[0];
                      if (nextDiscount) {
                        const needed = nextDiscount.minimumAmount - previewCartValue;
                        return `${panelSettings.missingText} ${needed} ${shopData?.currencyCode || 'USD'}`;
                      }
                      return '';
                    })()}
                  </Box>
                )}
                
                                 {/* Discounts List */}
                 <Box
                   className="shop-panel-scrollbar"
                   style={{
                     height: `${panelSettings.panelHeight}px`,
                     overflowY: 'auto',
                     padding: '0'
                   }}
                 >
                  {panelDiscounts.filter(d => d.visibleInPanel !== false).length === 0 ? (
                    <Box style={{ 
                      padding: '40px 25px', 
                      textAlign: panelSettings.subheaderTextAlign || 'center',
                      color: '#999',
                      fontSize: '16px'
                    }}>
                      {panelSettings.errorNoDiscountsText}
                    </Box>
                  ) : (
                    (() => {
                      let visibleDiscounts = panelDiscounts.filter(discount => discount.visibleInPanel !== false);
                      if (sortBy === 'custom' && Array.isArray(panelSettings.customDiscountOrder) && panelSettings.customDiscountOrder.length > 0) {
                        const indexMap = new Map(panelSettings.customDiscountOrder.map((id, idx) => [String(id), idx]));
                        visibleDiscounts = [...visibleDiscounts].sort((a, b) => {
                          const ia = indexMap.has(String(a.id)) ? indexMap.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
                          const ib = indexMap.has(String(b.id)) ? indexMap.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
                          if (ia !== ib) return ia - ib;
                          return (a.minimumAmount || 0) - (b.minimumAmount || 0);
                        });
                      } else {
                        visibleDiscounts = [...visibleDiscounts].sort((a, b) => {
                          switch (sortBy) {
                            case 'newest':
                              return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                            case 'oldest':
                              return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                            case 'amount_high':
                              return (b.minimumAmount || 0) - (a.minimumAmount || 0);
                            case 'amount_low':
                              return (a.minimumAmount || 0) - (b.minimumAmount || 0);
                            case 'discount_high':
                              return (b.discountPercentage || 0) - (a.discountPercentage || 0);
                            case 'discount_low':
                              return (a.discountPercentage || 0) - (b.discountPercentage || 0);
                            case 'alphabetical':
                              return String(a.description || '').localeCompare(String(b.description || ''));
                            default:
                              return 0;
                          }
                        });
                      }
                      return visibleDiscounts.map((discount, index) => {
                        const isAchieved = previewCartValue >= discount.minimumAmount;
                        const isLocked = !isAchieved;
                        const amountNeeded = Math.max(0, discount.minimumAmount - previewCartValue);
                        
                        return (
                                                     <div
                             key={discount.id}
                             style={{
                               display: 'flex',
                               alignItems: 'center',
                               padding: `${panelSettings.discountSpacing}px 25px`,
                               backgroundColor: isAchieved ? panelSettings.achievedColor : panelSettings.lockedColor,
                               borderBottom: index < visibleDiscounts.length - 1 ? `${panelSettings.rowSeparatorWidth || 1}px solid ${panelSettings.rowSeparatorColor || '#e0e0e0'}` : 'none',
                               minHeight: `${panelSettings.rowHeight}px`,
                               transition: 'all 0.3s ease'
                             }}
                           >
                             <Box style={{ 
                               width: `${panelSettings.iconSize || 40}px`, 
                               height: `${panelSettings.iconSize || 40}px`, 
                               marginRight: '20px',
                               flexShrink: 0
                             }}>
                               {(() => {
                                 if (discount.imageUrl && !isLocked) {
                                   return (
                                     <img 
                                       src={discount.imageUrl} 
                                       alt={discount.description}
                                       style={{ 
                                         width: '100%', 
                                         height: '100%', 
                                         objectFit: 'cover', 
                                         borderRadius: '8px',
                                         opacity: 1
                                       }}
                                       onError={(e) => { e.target.style.display = 'none'; }}
                                     />
                                   );
                                 }
                                 
                                 const iconColor = isAchieved ? '#28a745' : '#6c757d';
                                 const iconSize = Math.round((panelSettings.iconSize || 40) * 0.8);
                                 
                                 if (isLocked) {
                                   const lockedIconUrl = (discount.lockedIcon || panelSettings.defaultLockedIcon || '').toString().trim();
                                   if (lockedIconUrl && (lockedIconUrl.startsWith('http') || lockedIconUrl.startsWith('data:'))) {
                                     return (
                                       <img 
                                         src={lockedIconUrl} 
                                         alt="Locked icon"
                                         style={{ 
                                           width: '100%', 
                                           height: '100%', 
                                           objectFit: 'cover', 
                                           borderRadius: '8px',
                                           opacity: 0.7
                                         }}
                                         onError={(e) => { 
                                           e.target.style.display = 'none'; 
                                           e.target.parentNode.innerHTML = '🔒'; 
                                         }}
                                       />
                                     );
                                   }
                                   return (
                                     <div style={{ 
                                       width: `${panelSettings.iconSize || 40}px`,
                                       height: `${panelSettings.iconSize || 40}px`,
                                       borderRadius: '50%',
                                       backgroundColor: '#c0c0c0',
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       fontSize: `${Math.round((panelSettings.iconSize || 40) * 0.4)}px`,
                                       color: '#666'
                                     }}>{lockedIconUrl || '🔒'}</div>
                                   );
                                 }
                                 if (discount.discountType === 'free_shipping') {
                                   return (
                                     <div style={{ 
                                       fontSize: `${iconSize}px`, 
                                       color: iconColor,
                                       textAlign: 'center',
                                       lineHeight: `${panelSettings.iconSize || 40}px`
                                     }}>🚚</div>
                                   );
                                 }
                                 const fallbackText = (discount.discountValueType === 'fixed_amount' && Number.isFinite(parseFloat(discount.discountAmount)))
                                   ? `${discount.discountAmount} ${shopData?.currencyCode || 'USD'}`
                                   : `${discount.discountPercentage}%`;
                                 return (
                                   <div style={{ 
                                     fontSize: `${iconSize}px`, 
                                     color: iconColor,
                                     textAlign: 'center',
                                     lineHeight: `${panelSettings.iconSize || 40}px`,
                                     fontWeight: 'bold'
                                   }}>
                                     {fallbackText}
                                   </div>
                                 );
                               })()}
                             </Box>
                            
                            <Box style={{ flex: 1 }}>
                              <Text 
                                variant="bodyMd" 
                                fontWeight="semibold"
                                style={{ 
                                  fontSize: `${panelSettings.descriptionFontSize || 15}px`,
                                  opacity: isLocked ? 0.7 : 1,
                                  marginBottom: '5px',
                                  display: 'block',
                                  fontFamily: isAchieved ? (panelSettings.achievedTextFont || 'Arial, sans-serif') : (panelSettings.missingTextFont || 'Arial, sans-serif')
                                }}
                              >
                                {discount.description}
                              </Text>
                              
                              <Text 
                                variant="bodySm" 
                                tone="subdued"
                                style={{ 
                                  fontSize: `${panelSettings.minimumAmountFontSize || 13}px`,
                                  opacity: isLocked ? 0.6 : 0.8
                                }}
                              >
                                {isAchieved 
                                  ? (panelSettings.showAchievedText ? panelSettings.achievedText : '')
                                  : (panelSettings.showMissingAmount 
                                      ? `${panelSettings.missingText} ${amountNeeded} ${shopData?.currencyCode || 'USD'}`
                                      : `${panelSettings.requiredText ? `${panelSettings.requiredText} ` : ''}${discount.minimumAmount} ${shopData?.currencyCode || 'USD'}`
                                    )
                                }
                              </Text>
                            </Box>
                          </div>
                        );
                      });
                    })()
                  )}
                </Box>
                
                                 {/* Footer - conditionally rendered */}
                 {panelSettings.showFooter && (
                   <Box
                     style={{
                       backgroundColor: panelSettings.footerBackground,
                       backgroundImage: panelSettings.footerBackgroundImage ? `url(${panelSettings.footerBackgroundImage})` : 'none',
                       backgroundSize: panelSettings.footerBackgroundImage ? 'cover' : 'auto',
                       backgroundPosition: panelSettings.footerBackgroundImage ? 'center' : 'initial',
                       backgroundRepeat: panelSettings.footerBackgroundImage ? 'no-repeat' : 'initial',
                       padding: `${panelSettings.footerPadding || 10}px`,
                       textAlign: panelSettings.footerTextAlign || 'center',
                       fontSize: `${panelSettings.footerFontSize || 13}px`,
                       color: '#666',
                       height: `${panelSettings.footerHeight || 50}px`,
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: panelSettings.footerTextAlign || 'center',
                       fontFamily: panelSettings.footerTextFont || 'Arial, sans-serif',
                       borderBottomLeftRadius: `${panelSettings.borderRadius}px`,
                       borderBottomRightRadius: `${panelSettings.borderRadius}px`
                     }}
                   >
                     {panelSettings.footerContent}
                   </Box>
                 )}
              </Box>
            </Box>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* SaveBar removed: only available in embedded context */}


    </Frame>
  );
}
