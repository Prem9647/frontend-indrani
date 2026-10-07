import { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Button, ErrorBanner, LoadingIndicator, EmptyState, Divider, PageHeader } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { categoriesApi } from "../../api/categories.api";
import { menuItemsApi } from "../../api/menuItems.api";
import { ordersApi } from "../../api/orders.api";
import { colors } from "../../theme/colors";
import { MenuItemPicker, MenuSearchFilter, filterMenu } from "./MenuItemPicker";

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

// Adds items to an already-created order — the "Add More Items" action on
// OrderDetailScreen.js. Only reachable while the order is still "created" —
// items lock once preparing starts (enforced server-side by
// order.service.js's assertItemsEditable).
export function AddOrderItemsScreen({ route, navigation }) {
  const { orderId, tableNumber } = route.params;
  const [quantities, setQuantities] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const [categoryId, setCategoryId] = useState(null);

  const { data, loading, error } = useAsync(async () => {
    const [{ data: categories }, { data: items }] = await Promise.all([
      categoriesApi.list(true),
      menuItemsApi.list({ availableOnly: true }),
    ]);
    return { categories, items };
  }, []);

  function updateQuantity(menuItemId, delta) {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[menuItemId] ?? 0) + delta);
      return { ...prev, [menuItemId]: next };
    });
  }

  const selectedItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items
      .filter((item) => (quantities[item._id] ?? 0) > 0)
      .map((item) => ({ item, quantity: quantities[item._id] }));
  }, [data?.items, quantities]);

  const addTotal = selectedItems.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);

  const { filteredCategories, filteredItems } = useMemo(
    () => filterMenu(data?.categories, data?.items, menuQuery, categoryId),
    [data?.categories, data?.items, menuQuery, categoryId]
  );

  async function handleSubmit() {
    if (selectedItems.length === 0) {
      setSubmitError("Select at least one item");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      await ordersApi.addItems(
        orderId,
        selectedItems.map(({ item, quantity }) => ({ menuItemId: item._id, quantity }))
      );
      navigation.goBack();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <PageHeader
        left={
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.brand[700]} />
          </Pressable>
        }
        title={`Table ${tableNumber}`}
        subtitle="Add More Items — select items to add to the order."
      />

      {loading ? <LoadingIndicator /> : null}
      <ErrorBanner message={error} />
      {!loading && data?.categories.length === 0 ? (
        <EmptyState title="No menu items available" subtitle="Ask a manager to add items to the menu." />
      ) : null}

      <View className="flex-row flex-wrap gap-5">
        <View style={{ flexGrow: 2, flexShrink: 1, flexBasis: 480 }}>
          <Card className="!p-0 overflow-hidden">
            <View className="p-5 border-b border-brand-100">
              <Text className="text-base font-semibold text-brand-900 mb-3">Select Items</Text>
              <MenuSearchFilter
                query={menuQuery}
                onQueryChange={setMenuQuery}
                categories={data?.categories}
                categoryId={categoryId}
                onCategoryChange={setCategoryId}
              />
            </View>
            <View className="p-5">
              <MenuItemPicker
                categories={filteredCategories}
                items={filteredItems}
                quantities={quantities}
                onChange={updateQuantity}
              />
            </View>
          </Card>
        </View>

        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 260 }}>
          <Card className="gap-3">
            <Text className="text-sm font-semibold text-brand-900">Selected Items</Text>
            {selectedItems.length === 0 ? (
              <Text className="text-sm text-brand-500">No items selected yet.</Text>
            ) : (
              <View className="gap-2">
                {selectedItems.map(({ item, quantity }) => (
                  <View key={item._id} className="flex-row items-center justify-between">
                    <Text className="text-sm text-brand-900 flex-1 pr-2" numberOfLines={1}>
                      {item.name} <Text className="text-brand-500">×{quantity}</Text>
                    </Text>
                    <Text className="text-sm font-semibold text-brand-900">{formatMoney(item.price * quantity)}</Text>
                  </View>
                ))}
              </View>
            )}
            <Divider />
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-brand-900">Total</Text>
              <Text className="text-xl font-bold text-primary-700">{formatMoney(addTotal)}</Text>
            </View>
            <ErrorBanner message={submitError} />
            <Button label="Add to Order" onPress={handleSubmit} loading={submitting} className="mt-1" />
          </Card>
        </View>
      </View>
    </Screen>
  );
}
