import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui";
import { colors } from "../../theme/colors";

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

// Search box + category chip row shared by both places that pick menu items
// (OrderDetailScreen's new-order builder and AddOrderItemsScreen) — pass its
// query/categoryId back up to filter what's handed to MenuItemPicker below.
export function MenuSearchFilter({ query, onQueryChange, categories, categoryId, onCategoryChange }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2 border border-brand-300 rounded-lg px-3.5 py-2.5 bg-white">
        <Ionicons name="search-outline" size={16} color={colors.brand[400]} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search menu item..."
          placeholderTextColor={colors.brand[400]}
          className="flex-1 text-sm text-brand-900"
          style={{ outlineStyle: "none" }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          <CategoryChip label="All" active={!categoryId} onPress={() => onCategoryChange(null)} />
          {categories?.map((c) => (
            <CategoryChip key={c._id} label={c.name} active={categoryId === c._id} onPress={() => onCategoryChange(c._id)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function CategoryChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3.5 py-1.5 rounded-full border ${active ? "bg-primary-700 border-primary-700" : "bg-white border-brand-300"}`}
    >
      <Text className={`text-xs font-semibold ${active ? "text-white" : "text-brand-600"}`}>{label}</Text>
    </Pressable>
  );
}

// Given the full catalog and current search/category filter state, returns
// what MenuItemPicker should actually render. Shared so both screens filter
// identically.
export function filterMenu(categories, items, query, categoryId) {
  const filteredCategories = categoryId ? (categories ?? []).filter((c) => c._id === categoryId) : categories ?? [];
  const q = query.trim().toLowerCase();
  const filteredItems = q ? (items ?? []).filter((item) => item.name.toLowerCase().includes(q)) : items ?? [];
  return { filteredCategories, filteredItems };
}

// Shared category-grouped menu picker with quantity steppers — used both to
// build a brand-new order (OrderDetailScreen's "new" mode) and to add items
// to an already-placed order (AddOrderItemsScreen).
export function MenuItemPicker({ categories, items, quantities, onChange }) {
  if (!categories?.length) return null;

  return (
    <View className="gap-5">
      {categories.map((category) => {
        const categoryItems = (items ?? []).filter((item) => item.categoryIds?.includes(category._id));
        if (categoryItems.length === 0) return null;
        return (
          <View key={category._id}>
            <Text className="text-base font-semibold text-brand-900 mb-2">{category.name}</Text>
            <View className="gap-2">
              {categoryItems.map((item) => {
                const quantity = quantities[item._id] ?? 0;
                return (
                  <Card key={item._id} className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-medium text-brand-900">{item.name}</Text>
                      <Text className="text-sm text-brand-500 mt-0.5">{formatMoney(item.price)}</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        onPress={() => onChange(item._id, -1)}
                        disabled={quantity === 0}
                        hitSlop={8}
                        className={`w-8 h-8 rounded-full items-center justify-center border border-brand-300 ${
                          quantity === 0 ? "opacity-40" : ""
                        }`}
                      >
                        <Ionicons name="remove" size={16} color={colors.brand[700]} />
                      </Pressable>
                      <Text className="text-base font-semibold text-brand-900 w-5 text-center">{quantity}</Text>
                      <Pressable
                        onPress={() => onChange(item._id, 1)}
                        hitSlop={8}
                        className="w-8 h-8 rounded-full items-center justify-center bg-primary-700 active:bg-primary-800"
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
