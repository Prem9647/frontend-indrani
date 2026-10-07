import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert, Switch, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, PageHeader, Card, Badge, LoadingIndicator, ErrorBanner, EmptyState } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { categoriesApi } from "../../api/categories.api";
import { menuItemsApi } from "../../api/menuItems.api";
import { colors } from "../../theme/colors";
import { AddCategoryCard } from "./AddCategoryCard";
import { EditCategoryCard } from "./EditCategoryCard";
import { AddMenuItemCard } from "./AddMenuItemCard";
import { EditMenuItemCard } from "./EditMenuItemCard";

const PAGE_SIZE = 10;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const SORT_OPTIONS = [
  { value: "price-asc", label: "Sort by: Price (Low-High)" },
  { value: "price-desc", label: "Sort by: Price (High-Low)" },
  { value: "name-asc", label: "Sort by: Name (A-Z)" },
];

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

export function MenuScreen({ navigation, route }) {
  const [itemQuery, setItemQuery] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("all");
  const [itemSort, setItemSort] = useState("price-asc");
  const [itemPage, setItemPage] = useState(1);

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [actionError, setActionError] = useState(null);

  const {
    data,
    loading,
    error,
    refetch,
  } = useAsync(async () => {
    const [{ data: categories }, { data: items }] = await Promise.all([categoriesApi.list(), menuItemsApi.list()]);
    return { categories, items };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.openAddItem) {
        setAddItemOpen(true);
        navigation.setParams({ openAddItem: undefined });
      }
    }, [route?.params?.openAddItem, navigation])
  );

  const categories = data?.categories ?? [];
  const items = data?.items ?? [];
  const categoryById = useMemo(() => new Map(categories.map((c) => [c._id, c.name])), [categories]);

  const stats = useMemo(() => {
    const now = Date.now();
    const recentCategories = categories.filter((c) => now - new Date(c.createdAt).getTime() < SEVEN_DAYS_MS).length;
    const available = items.filter((i) => i.isAvailable).length;
    const unavailable = items.length - available;
    return {
      totalCategories: categories.length,
      recentCategories,
      totalItems: items.length,
      available,
      unavailable,
      availablePct: items.length ? Math.round((available / items.length) * 100) : 0,
    };
  }, [categories, items]);

  const categoryOptions = useMemo(
    () => [{ value: "all", label: "All Categories" }, ...categories.map((c) => ({ value: c._id, label: c.name }))],
    [categories]
  );

  const filteredItems = useMemo(() => {
    let result = items.filter((i) => {
      if (itemCategoryFilter !== "all" && !i.categoryIds?.includes(itemCategoryFilter)) return false;
      if (itemQuery.trim()) {
        const q = itemQuery.trim().toLowerCase();
        const matches = i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
    result = [...result].sort((a, b) => {
      if (itemSort === "price-asc") return a.price - b.price;
      if (itemSort === "price-desc") return b.price - a.price;
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [items, itemCategoryFilter, itemQuery, itemSort]);

  useEffect(() => {
    setItemPage(1);
  }, [itemCategoryFilter, itemQuery, itemSort]);

  const totalItemPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = filteredItems.slice((itemPage - 1) * PAGE_SIZE, itemPage * PAGE_SIZE);

  function confirmDeleteCategory(category) {
    if (Platform.OS === "web") {
      if (window.confirm(`Remove "${category.name}"? This can't be undone.`)) {
        setActionError(null);
        categoriesApi.remove(category._id)
          .then(() => refetch())
          .catch((err) => setActionError(err.message));
      }
      return;
    }

    Alert.alert("Delete Category", `Remove "${category.name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setActionError(null);
          try {
            await categoriesApi.remove(category._id);
            refetch();
          } catch (err) {
            setActionError(err.message);
          }
        },
      },
    ]);
  }

  function confirmDeleteItem(item) {
    if (Platform.OS === "web") {
      if (window.confirm(`Remove "${item.name}"? This can't be undone.`)) {
        setActionError(null);
        menuItemsApi.remove(item._id)
          .then(() => refetch())
          .catch((err) => setActionError(err.message));
      }
      return;
    }

    Alert.alert("Delete Item", `Remove "${item.name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setActionError(null);
          try {
            await menuItemsApi.remove(item._id);
            refetch();
          } catch (err) {
            setActionError(err.message);
          }
        },
      },
    ]);
  }

  async function toggleAvailability(item) {
    setActionError(null);
    try {
      await menuItemsApi.update(item._id, { isAvailable: !item.isAvailable });
      refetch();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <Screen>
      <PageHeader title="Menu Management" subtitle="Organize categories and manage every dish and drink you serve." />

      {loading ? <LoadingIndicator /> : null}
      <ErrorBanner message={error ?? actionError} />

      {!loading ? (
        <>
          <View className="flex-row flex-wrap gap-3 mb-6">
            <StatCard
              icon="pricetags-outline"
              label="Total Categories"
              value={stats.totalCategories}
              badge={stats.recentCategories > 0 ? `+${stats.recentCategories} New` : null}
              badgeTone="success"
            />
            <StatCard icon="fast-food-outline" label="Total Menu Items" value={stats.totalItems} tone="danger" />
            <StatCard
              icon="checkmark-circle-outline"
              label="Available Items"
              value={stats.available}
              tone="success"
              badge={`${stats.availablePct}% Live`}
              badgeTone="success"
            />
            <StatCard icon="ban-outline" label="Unavailable Items" value={stats.unavailable} tone="danger" />
          </View>

          {/* Categories Management */}
          <Card className="mb-6">
            <View className="flex-row items-center justify-between mb-1 flex-wrap gap-3">
              <View>
                <Text className="text-base font-semibold text-brand-900">Categories Management</Text>
                <Text className="text-sm text-brand-500 mt-0.5">Organize your menu into groups for better navigation.</Text>
              </View>
              <Pressable
                onPress={() => setAddCategoryOpen(true)}
                className="flex-row items-center gap-2 bg-primary-700 active:bg-primary-800 rounded-lg px-4 py-2.5"
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text className="text-sm font-semibold text-white">Add Category</Text>
              </Pressable>
            </View>

            {categories.length === 0 ? (
              <EmptyState title="No categories yet" subtitle="Add a category to start building your menu." />
            ) : (
              <View className="mt-4 -mx-4">
                <View className="flex-row bg-brand-50 px-4 py-3">
                  <Text className="flex-1 text-xs font-semibold text-brand-500">CATEGORY NAME</Text>
                  <Text className="w-24 text-xs font-semibold text-brand-500">TOTAL ITEMS</Text>
                  <Text className="w-24 text-xs font-semibold text-brand-500">STATUS</Text>
                  <Text className="w-20 text-xs font-semibold text-brand-500 text-right">ACTIONS</Text>
                </View>
                {categories.map((c) => (
                  <View key={c._id} className="flex-row items-center px-4 py-3 border-t border-brand-100">
                    <View className="flex-1 flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-lg bg-primary-50 items-center justify-center">
                        <Ionicons name="restaurant-outline" size={15} color={colors.primary[600]} />
                      </View>
                      <Text className="text-sm font-semibold text-brand-900">{c.name}</Text>
                    </View>
                    <Text className="w-24 text-sm text-brand-700">{c.itemCount} Items</Text>
                    <View className="w-24">
                      <Badge label={c.isActive ? "Active" : "Inactive"} tone={c.isActive ? "success" : "danger"} />
                    </View>
                    <View className="w-20 flex-row items-center justify-end gap-3">
                      <Pressable onPress={() => setEditingCategory(c)} hitSlop={6}>
                        <Ionicons name="pencil-outline" size={16} color={colors.primary[600]} />
                      </Pressable>
                      <Pressable onPress={() => confirmDeleteCategory(c)} hitSlop={6}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger[600]} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* Menu Items */}
          <Card>
            <View className="flex-row items-center justify-between mb-4 flex-wrap gap-3">
              <View>
                <Text className="text-base font-semibold text-brand-900">Menu Items</Text>
                <Text className="text-sm text-brand-500 mt-0.5">Detailed overview of all available dishes and drinks.</Text>
              </View>
              <Pressable
                onPress={() => setAddItemOpen(true)}
                disabled={categories.length === 0}
                className={`flex-row items-center gap-2 bg-primary-700 active:bg-primary-800 rounded-lg px-4 py-2.5 ${
                  categories.length === 0 ? "opacity-50" : ""
                }`}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text className="text-sm font-semibold text-white">Add Item</Text>
              </Pressable>
            </View>

            <View className="flex-row flex-wrap items-center gap-3 mb-4" style={{ zIndex: 20 }}>
              <View className="flex-1 min-w-[180px] flex-row items-center gap-2 border border-brand-300 rounded-lg px-3.5 py-2.5 bg-white">
                <Ionicons name="search-outline" size={16} color={colors.brand[400]} />
                <TextInput
                  value={itemQuery}
                  onChangeText={setItemQuery}
                  placeholder="Search item name or ingredients..."
                  placeholderTextColor={colors.brand[400]}
                  className="flex-1 text-sm text-brand-900"
                  style={{ outlineStyle: "none" }}
                />
              </View>
              <Dropdown value={itemCategoryFilter} onChange={setItemCategoryFilter} options={categoryOptions} />
              <Dropdown value={itemSort} onChange={setItemSort} options={SORT_OPTIONS} />
            </View>

            {categories.length === 0 ? (
              <EmptyState title="Add a category first" subtitle="Menu items need a category to belong to." />
            ) : pageItems.length === 0 ? (
              <EmptyState title="No items found" subtitle="Try a different search or filter." />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4">
                <View className="min-w-[820px] flex-1">
                  <View className="flex-row bg-brand-50 px-4 py-3">
                    <Text className="flex-1 text-xs font-semibold text-brand-500">ITEM</Text>
                    <Text className="w-28 text-xs font-semibold text-brand-500">CATEGORY</Text>
                    <Text className="w-20 text-xs font-semibold text-brand-500">PRICE</Text>
                    <Text className="w-32 text-xs font-semibold text-brand-500">AVAILABILITY</Text>
                    <Text className="w-24 text-xs font-semibold text-brand-500">PREP TIME</Text>
                    <Text className="w-20 text-xs font-semibold text-brand-500 text-right">ACTIONS</Text>
                  </View>
                  {pageItems.map((item) => (
                    <ItemRow
                      key={item._id}
                      item={item}
                      categoryName={(item.categoryIds ?? []).map(id => categoryById.get(id)).filter(Boolean).join(', ') || "—"}
                      onToggleAvailability={() => toggleAvailability(item)}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => confirmDeleteItem(item)}
                    />
                  ))}
                </View>
              </ScrollView>
            )}

            {filteredItems.length > 0 ? (
              <View className="flex-row items-center justify-between flex-wrap gap-3 mt-4">
                <Text className="text-sm text-brand-500">
                  Showing {(itemPage - 1) * PAGE_SIZE + 1}-{Math.min(itemPage * PAGE_SIZE, filteredItems.length)} of{" "}
                  {filteredItems.length} items
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <Pressable
                    disabled={itemPage === 1}
                    onPress={() => setItemPage((p) => p - 1)}
                    className={`p-2 rounded-lg border border-brand-300 ${itemPage === 1 ? "opacity-40" : ""}`}
                  >
                    <Ionicons name="chevron-back" size={16} color={colors.brand[600]} />
                  </Pressable>
                  {Array.from({ length: totalItemPages }, (_, i) => i + 1)
                    .slice(0, 7)
                    .map((p) => (
                      <Pressable
                        key={p}
                        onPress={() => setItemPage(p)}
                        className={`w-8 h-8 items-center justify-center rounded-lg ${
                          p === itemPage ? "bg-primary-700" : "border border-brand-300"
                        }`}
                      >
                        <Text className={`text-sm font-medium ${p === itemPage ? "text-white" : "text-brand-700"}`}>{p}</Text>
                      </Pressable>
                    ))}
                  <Pressable
                    disabled={itemPage === totalItemPages}
                    onPress={() => setItemPage((p) => p + 1)}
                    className={`p-2 rounded-lg border border-brand-300 ${itemPage === totalItemPages ? "opacity-40" : ""}`}
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.brand[600]} />
                  </Pressable>
                </View>
              </View>
            ) : null}
          </Card>
        </>
      ) : null}

      <AddCategoryCard
        visible={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
        onCreated={() => {
          setAddCategoryOpen(false);
          refetch();
        }}
      />
      <EditCategoryCard
        category={editingCategory}
        visible={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        onUpdated={() => {
          setEditingCategory(null);
          refetch();
        }}
      />
      <AddMenuItemCard
        visible={addItemOpen}
        categories={categories}
        onClose={() => setAddItemOpen(false)}
        onCreated={() => {
          setAddItemOpen(false);
          refetch();
        }}
      />
      <EditMenuItemCard
        item={editingItem}
        categories={categories}
        visible={!!editingItem}
        onClose={() => setEditingItem(null)}
        onUpdated={() => {
          setEditingItem(null);
          refetch();
        }}
      />
    </Screen>
  );
}

function ItemRow({ item, categoryName, onToggleAvailability, onEdit, onDelete }) {
  const tag = item.isBestseller
    ? { label: "Bestseller", tone: "success" }
    : item.isVegetarian
    ? { label: "Vegetarian", tone: "success" }
    : !item.isAvailable
    ? { label: "Out of Stock", tone: "danger" }
    : null;

  return (
    <View className="flex-row items-center px-4 py-3 border-t border-brand-100">
      <View className="flex-1 flex-row items-center gap-3 pr-2">
        <View className="w-11 h-11 rounded-lg bg-brand-100 items-center justify-center">
          <Ionicons name="fast-food-outline" size={18} color={colors.brand[500]} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-brand-900">{item.name}</Text>
          {tag ? <Text className={`text-xs mt-0.5 ${tag.tone === "success" ? "text-success-600" : "text-danger-600"}`}>{tag.label}</Text> : null}
        </View>
      </View>
      <Text className="w-28 text-sm text-brand-700">{categoryName}</Text>
      <Text className="w-20 text-sm font-bold text-primary-700">{formatMoney(item.price)}</Text>
      <View className="w-32 flex-row items-center gap-2">
        <Switch
          value={item.isAvailable}
          onValueChange={onToggleAvailability}
          trackColor={{ false: colors.brand[200], true: colors.primary[300] }}
          thumbColor={item.isAvailable ? colors.primary[600] : colors.white}
        />
        <Text className={`text-xs font-medium ${item.isAvailable ? "text-success-700" : "text-danger-600"}`}>
          {item.isAvailable ? "In Stock" : "Sold Out"}
        </Text>
      </View>
      <View className="w-24 flex-row items-center gap-1">
        {item.prepTimeMinutes ? (
          <>
            <Ionicons name="time-outline" size={13} color={colors.brand[400]} />
            <Text className="text-xs text-brand-500">{item.prepTimeMinutes} min</Text>
          </>
        ) : (
          <Text className="text-xs text-brand-400">—</Text>
        )}
      </View>
      <View className="w-20 flex-row items-center justify-end gap-3">
        <Pressable onPress={onEdit} hitSlop={6}>
          <Ionicons name="pencil-outline" size={16} color={colors.primary[600]} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={6}>
          <Ionicons name="trash-outline" size={16} color={colors.danger[600]} />
        </Pressable>
      </View>
    </View>
  );
}

const STAT_TONE = {
  brand: { icon: "bg-brand-100", color: colors.brand[700] },
  success: { icon: "bg-success-100", color: colors.success[700] },
  danger: { icon: "bg-danger-100", color: colors.danger[700] },
};

function StatCard({ icon, label, value, tone = "brand", badge, badgeTone = "brand" }) {
  const t = STAT_TONE[tone] ?? STAT_TONE.brand;
  const b = STAT_TONE[badgeTone] ?? STAT_TONE.brand;
  return (
    <Card className="flex-1 min-w-[160px] p-4">
      <View className="flex-row items-start justify-between mb-3">
        <View className={`p-2 rounded-lg ${t.icon}`}>
          <Ionicons name={icon} size={18} color={t.color} />
        </View>
        {badge ? (
          <View className={`px-2 py-1 rounded-full ${b.icon}`}>
            <Text className="text-[10px] font-bold" style={{ color: b.color }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="text-sm text-brand-500 mb-1">{label}</Text>
      <Text className="text-2xl font-bold text-brand-900">{value}</Text>
    </Card>
  );
}

function Dropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ position: "relative", zIndex: open ? 50 : 1 }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center gap-2 px-3.5 py-2.5 rounded-lg border border-brand-300 bg-white"
      >
        <Text className="text-sm text-brand-700">{selected?.label}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.brand[500]} />
      </Pressable>
      {open ? (
        <View
          className="absolute top-12 left-0 bg-white border border-brand-200 rounded-lg shadow-lg min-w-[160px]"
          style={{ zIndex: 50 }}
        >
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="px-4 py-2.5"
            >
              <Text className="text-sm text-brand-700">{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
