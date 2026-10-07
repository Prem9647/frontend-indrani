import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, PageHeader, Card, Badge, LoadingIndicator, ErrorBanner, EmptyState } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { ordersApi } from "../../api/orders.api";
import { reportsApi } from "../../api/reports.api";
import { settingsApi } from "../../api/settings.api";
import { categoriesApi } from "../../api/categories.api";
import { menuItemsApi } from "../../api/menuItems.api";
import { getKuralForOrder } from "../../lib/thirukkural";
import { colors } from "../../theme/colors";

const STATUS_OPTIONS = [
  { value: "all", label: "Status: All" },
  { value: "waiting", label: "Waiting for Billing" },
];

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

function formatRelativeTime(value) {
  if (!value) return "—";
  const diffMin = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMin / 60);
  return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
}

export function isCoolDrink(item, categoriesList = [], menuItemsList = []) {
  if (!item) return false;

  const rawMenuItem = item.menuItemId;
  const menuItemIdStr =
    typeof rawMenuItem === "object" && rawMenuItem !== null
      ? (rawMenuItem._id?.toString() || "")
      : (typeof rawMenuItem === "string" ? rawMenuItem : "");

  const fullMenuItem =
    (menuItemIdStr && Array.isArray(menuItemsList) ? menuItemsList.find((m) => m._id?.toString() === menuItemIdStr) : null) ||
    (typeof rawMenuItem === "object" ? rawMenuItem : null);

  // 1. Direct name match on common cool drink brands / keywords
  const itemName = (fullMenuItem?.name || rawMenuItem?.name || item.name || "").toLowerCase().trim();
  const drinkItemKeywords = [
    "sprite",
    "coke",
    "cocacola",
    "coca-cola",
    "coca cola",
    "pepsi",
    "fanta",
    "mirinda",
    "7up",
    "7-up",
    "7 up",
    "bovonto",
    "thums up",
    "thumps up",
    "mountain dew",
    "dew",
    "maaza",
    "slice",
    "frooti",
    "limca",
    "red bull",
    "sting",
    "water",
    "water bottle",
    "mineral water",
    "soda",
    "lime soda",
    "fresh lime",
    "mojito",
    "lassi",
    "milkshake",
    "shake",
    "juice",
    "juices",
    "cool drink",
    "cool drinks",
    "cold drink",
    "cold drinks",
    "cooldrink",
    "cooldrinks",
    "beverage",
    "beverages",
    "soft drink",
    "soft drinks",
    "drink",
    "drinks",
  ];

  if (drinkItemKeywords.some((kw) => itemName.includes(kw))) {
    return true;
  }

  // 2. Category match
  const categoryMap = new Map();
  if (Array.isArray(categoriesList)) {
    categoriesList.forEach((c) => {
      if (c && c._id && c.name) {
        categoryMap.set(c._id.toString(), c.name.toLowerCase().trim());
      }
    });
  }

  const rawCategories = [
    ...(fullMenuItem?.categoryIds || []),
    ...(typeof rawMenuItem === "object" && rawMenuItem?.categoryIds ? rawMenuItem.categoryIds : []),
  ];
  if (fullMenuItem?.categoryId) rawCategories.push(fullMenuItem.categoryId);
  if (typeof rawMenuItem === "object" && rawMenuItem?.categoryId) rawCategories.push(rawMenuItem.categoryId);

  const itemCategories = [];
  for (const cat of rawCategories) {
    if (typeof cat === "object" && cat !== null && cat.name) {
      itemCategories.push(cat.name.toLowerCase().trim());
    } else if (typeof cat === "string" || cat?._id) {
      const id = typeof cat === "string" ? cat : (cat._id?.toString() || cat.toString());
      const nameFromMap = categoryMap.get(id);
      if (nameFromMap) itemCategories.push(nameFromMap);
    }
  }

  const coolDrinkCategoryKeywords = [
    "cool drink",
    "cool drinks",
    "cold drink",
    "cold drinks",
    "cooldrink",
    "cooldrinks",
    "drinks",
    "drink",
    "beverage",
    "beverages",
    "soft drink",
    "soft drinks",
    "juice",
    "juices",
    "soda",
    "water",
  ];

  return itemCategories.some((catName) =>
    coolDrinkCategoryKeywords.some((kw) => catName.includes(kw))
  );
}

// Billing Management — the queue of delivered-but-unbilled orders (per the
// order lifecycle in restaurant-workflow skill: Delivered -> bill requested
// -> Manager generates bill -> Closed). Generating a bill is Manager-only
// at the API level (order.routes.js), and this screen is only wired into
// ManagerNavigator, not Admin's — see ManagerBillingStack.js.
export function BillingScreen() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [billingId, setBillingId] = useState(null); // order currently mid-request ("Processing")
  const [discount, setDiscount] = useState("0");
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [billError, setBillError] = useState(null);

  const {
    data,
    loading,
    error,
    refetch,
  } = useAsync(async () => {
    const [pending, overview, dailySales, settings, categories, menuItems] = await Promise.all([
      ordersApi.list({ status: "waiting_for_billing", limit: 50 }),
      reportsApi.overview(),
      reportsApi.dailySales(),
      settingsApi.get().catch(() => ({ data: null })),
      categoriesApi.list().catch(() => ({ data: [] })),
      menuItemsApi.list().catch(() => ({ data: [] })),
    ]);
    return {
      pending: pending.data,
      overview: overview.data,
      dailySales: dailySales.data,
      settings: settings.data,
      categories: categories.data ?? [],
      menuItems: menuItems.data ?? [],
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const pending = data?.pending ?? [];

  const filtered = useMemo(() => {
    return pending.filter((o) => {
      if (statusFilter === "waiting" && o._id === billingId) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const matches = o.orderNumber.toLowerCase().includes(q) || (o.customerId?.name ?? "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [pending, query, statusFilter, billingId]);

  const selectedOrder = filtered.find((o) => o._id === selectedId) ?? filtered[0] ?? null;
  const kural = useMemo(() => getKuralForOrder(selectedOrder), [selectedOrder?._id, selectedOrder?.orderNumber]);

  useEffect(() => {
    if (!selectedOrder) {
      setOrderDetail(null);
      return;
    }
    setDetailLoading(true);
    setBillError(null);
    setDiscount("0");
    ordersApi
      .get(selectedOrder._id)
      .then(({ data }) => setOrderDetail(data))
      .catch((err) => setBillError(err.message))
      .finally(() => setDetailLoading(false));
  }, [selectedOrder?._id]);

  const confirmAction = async (title, message) => {
    if (Platform.OS === "web") {
      return window.confirm(`${title}\n\n${message}`);
    }
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
        { text: "Confirm", onPress: () => resolve(true) },
      ]);
    });
  };

  async function handleGenerateBill() {
    if (!selectedOrder) return;
    const discountValue = Number(discount) || 0;
    if (discountValue > selectedOrder.totalAmount) {
      setBillError("Discount cannot exceed the order total");
      return;
    }

    const confirmed = await confirmAction("Close Order", "Are you sure you want to close this order and free the table?");
    if (!confirmed) return;

    setBillError(null);
    setBillingId(selectedOrder._id);
    try {
      await ordersApi.generateBill(selectedOrder._id, discountValue);
      setSelectedId(null);
      await refetch();
    } catch (err) {
      setBillError(err.message);
    } finally {
      setBillingId(null);
    }
  }

  const settings = data?.settings;
  const categoriesList = data?.categories ?? [];
  const menuItemsList = data?.menuItems ?? [];
  const validItems = orderDetail ? orderDetail.items.filter((item) => item.status !== "cancelled") : [];

  // Consolidate identical items by menuItemId so each distinct item appears only once with combined quantity
  const groupedItems = useMemo(() => {
    const map = new Map();
    for (const item of validItems) {
      const id = (typeof item.menuItemId === "object" ? item.menuItemId?._id : item.menuItemId) || item.name || item._id;
      const key = String(id);
      if (map.has(key)) {
        const existing = map.get(key);
        existing.quantity += item.quantity;
        existing.subtotal += item.subtotal;
      } else {
        map.set(key, {
          _id: key,
          menuItemId: item.menuItemId,
          name: typeof item.menuItemId === "object" ? item.menuItemId?.name : item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.subtotal,
          itemRef: item,
        });
      }
    }
    return Array.from(map.values());
  }, [validItems]);

  let taxableSubtotal = 0;
  let exemptSubtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;

  groupedItems.forEach((item) => {
    if (isCoolDrink(item.itemRef || item, categoriesList, menuItemsList)) {
      exemptSubtotal += item.subtotal;
    } else {
      const cgst = item.subtotal * 0.025;
      const sgst = item.subtotal * 0.025;
      const base = item.subtotal - cgst - sgst;
      taxableSubtotal += base;
      totalCgst += cgst;
      totalSgst += sgst;
    }
  });

  const billSubtotal = taxableSubtotal + exemptSubtotal;
  const finalAmount = orderDetail ? orderDetail.order.totalAmount - (Number(discount) || 0) : 0;
  const subtotalLabel = `Subtotal (${groupedItems.length} item${groupedItems.length === 1 ? "" : "s"})`;

  return (
    <Screen>
      <PageHeader
        title="Billing"
        subtitle={pending.length === 0 ? "No tables waiting for billing." : "Tables ready to close."}
      />

      {loading ? <LoadingIndicator /> : null}
      <ErrorBanner message={error} />

      {!loading && data ? (
        <>
          <View className="flex-row flex-wrap gap-3 mb-5">
            <StatCard
              icon="alert-circle-outline"
              label="Pending Bill Requests"
              value={pending.length}
              tone="primary"
            />
            <StatCard
              icon="receipt-outline"
              label="Bills Generated Today"
              value={data?.dailySales?.orderCount ?? 0}
              tone="secondary"
            />
            <StatCard
              icon="checkmark-done-outline"
              label="Completed Bills"
              value={data?.overview?.totalClosedOrders ?? 0}
              tone="success"
            />
            <StatCard
              icon="cash-outline"
              label="Today's Billing Revenue"
              value={formatMoney(data?.dailySales?.totalSales ?? 0)}
              tone="danger"
            />
            <StatCard
              icon="sunny-outline"
              label="Today's Lunch Revenue"
              value={formatMoney(data?.dailySales?.lunchSales ?? 0)}
              tone="brand"
            />
            <StatCard
              icon="moon-outline"
              label="Today's Dinner Revenue"
              value={formatMoney(data?.dailySales?.dinnerSales ?? 0)}
              tone="brand"
            />
          </View>

          <View className="flex-row flex-wrap gap-3 mb-5" style={{ zIndex: 20 }}>
            <View className="flex-1 min-w-[200px] flex-row items-center gap-2 border border-brand-300 rounded-lg px-3.5 py-2.5 bg-white">
              <Ionicons name="search-outline" size={16} color={colors.brand[400]} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Order ID, Name..."
                placeholderTextColor={colors.brand[400]}
                className="flex-1 text-sm text-brand-900"
                style={{ outlineStyle: "none" }}
              />
            </View>
            <Dropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
            <Pressable
              onPress={() => Alert.alert("Filters", "Coming soon.")}
              className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-brand-300 bg-white"
            >
              <Ionicons name="options-outline" size={16} color={colors.brand[600]} />
              <Text className="text-sm font-medium text-brand-600">Filters</Text>
            </Pressable>
            <Pressable
              onPress={refetch}
              className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-primary-700 active:bg-primary-800"
            >
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text className="text-sm font-semibold text-white">Refresh Queue</Text>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-5">
            {/* Queue */}
            <View style={{ flexGrow: 2, flexShrink: 1, flexBasis: 480 }}>
              {filtered.length === 0 ? (
                <Card>
                  <EmptyState title="No pending bill requests" subtitle="Delivered orders awaiting billing will show up here." />
                </Card>
              ) : (
                <Card className="!p-0 overflow-hidden">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="min-w-[680px]">
                      <View className="flex-row bg-brand-50 px-4 py-3">
                        <Text className="w-24 text-xs font-semibold text-brand-500">REQUEST ID</Text>
                        <Text className="flex-1 text-xs font-semibold text-brand-500">CUSTOMER</Text>
                        <Text className="w-28 text-xs font-semibold text-brand-500">TABLE/WAITER</Text>
                        <Text className="w-20 text-xs font-semibold text-brand-500">AMOUNT</Text>
                        <Text className="w-24 text-xs font-semibold text-brand-500">TIME</Text>
                        <Text className="w-32 text-xs font-semibold text-brand-500">STATUS</Text>
                      </View>
                      {filtered.map((order) => {
                        const isSelected = selectedOrder?._id === order._id;
                        const isBilling = billingId === order._id;
                        return (
                          <Pressable
                            key={order._id}
                            onPress={() => setSelectedId(order._id)}
                            className={`flex-row items-center px-4 py-3 border-t border-brand-100 ${isSelected ? "bg-primary-50" : ""
                              }`}
                          >
                            <View className="w-24">
                              <Text className="text-sm font-bold text-primary-700">#{order.orderNumber}</Text>
                            </View>
                            <View className="flex-1 pr-2">
                              <Text className="text-sm font-semibold text-brand-900">{order.customerId?.name ?? "—"}</Text>
                              <Text className="text-xs text-brand-500 mt-0.5">{order.customerId?.mobileNumber}</Text>
                            </View>
                            <View className="w-28">
                              <Text className="text-xs font-semibold text-brand-700">
                                {order.tableId?.tableNumber === "parcel" ? "Parcel" : `T-${order.tableId?.tableNumber ?? "—"}`}
                              </Text>
                              <Text className="text-xs text-brand-500 mt-0.5">{order.waiterId?.name ?? "—"}</Text>
                            </View>
                            <Text className="w-20 text-sm font-bold text-brand-900">{formatMoney(order.totalAmount)}</Text>
                            <Text className="w-24 text-xs text-brand-500">{formatRelativeTime(order.orderedAt)}</Text>
                            <View className="w-32">
                              <Badge
                                label={isBilling ? "Processing" : "Waiting for Billing"}
                                tone={isBilling ? "warning" : "primary"}
                              />
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </Card>
              )}
            </View>

            {/* Bill Preview */}
            <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 300 }}>
              <Card className="!p-0 overflow-hidden">
                <View className="bg-primary-50 px-5 py-3 flex-row items-center gap-2">
                  <Ionicons name="document-text-outline" size={16} color={colors.primary[700]} />
                  <Text className="text-sm font-semibold text-primary-700">Bill Preview</Text>
                  {selectedOrder ? (
                    <Text className="text-xs text-primary-600 ml-auto">#{selectedOrder.orderNumber}</Text>
                  ) : null}
                </View>

                {!selectedOrder ? (
                  <EmptyState title="No order selected" subtitle="Pick a request from the queue to preview its bill." />
                ) : detailLoading || !orderDetail ? (
                  <View className="p-5">
                    <LoadingIndicator />
                  </View>
                ) : (
                  <View className="p-5 gap-4">
                    <View className="items-center gap-1 pb-3 border-b border-brand-100">
                      <Text className="text-base font-bold text-primary-700 text-center">
                        {settings?.restaurantName || "INDRANI MESS"}
                      </Text>
                      <Text className="text-xs text-brand-500 text-center px-2 leading-relaxed">
                        {settings?.address || "7th cross, Bharathi Park Road, Saibaba Colony, Coimbatore"}
                      </Text>
                      <Text className="text-xs font-medium text-brand-600 text-center">
                        {settings?.phone
                          ? (settings.phone.toLowerCase().startsWith("cell") ? settings.phone : `cell: ${settings.phone}`)
                          : "cell: +91 9952774917"}
                      </Text>
                      <Text className="text-xs font-semibold text-brand-700 text-center">
                        {settings?.gstin
                          ? (settings.gstin.toUpperCase().startsWith("GST") ? settings.gstin : `GST IN: ${settings.gstin}`)
                          : "GST IN: 33AGWPJ3247Q47Q1ZN"}
                      </Text>
                    </View>

                    <View className="flex-row justify-between">
                      <View>
                        <Text className="text-[10px] font-semibold text-brand-400 uppercase">Table</Text>
                        <Text className="text-sm font-semibold text-brand-900">
                          {orderDetail.order.tableId?.tableNumber === "parcel" ? "Parcel" : `T-${orderDetail.order.tableId?.tableNumber}`}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[10px] font-semibold text-brand-400 uppercase">Order ID</Text>
                        <Text className="text-sm font-semibold text-brand-900">#{orderDetail.order.orderNumber}</Text>
                      </View>
                    </View>
                    <View className="flex-row justify-between -mt-2">
                      <View>
                        <Text className="text-[10px] font-semibold text-brand-400 uppercase">Date</Text>
                        <Text className="text-xs text-brand-700">
                          {new Date(orderDetail.order.orderedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[10px] font-semibold text-brand-400 uppercase">Time</Text>
                        <Text className="text-xs text-brand-700">
                          {new Date(orderDetail.order.orderedAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    </View>

                    {/* Bill Items Table */}
                    <View className="pt-2 border-t border-brand-100">
                      <View className="flex-row items-center py-2 border-y border-brand-300">
                        <Text className="flex-1 text-xs font-bold text-brand-900 uppercase tracking-wider">ITEM</Text>
                        <Text className="w-12 text-xs font-bold text-brand-900 text-center uppercase tracking-wider">QTY</Text>
                        <Text className="w-16 text-xs font-bold text-brand-900 text-right uppercase tracking-wider">PRICE</Text>
                        <Text className="w-16 text-xs font-bold text-brand-900 text-right uppercase tracking-wider">AMOUNT</Text>
                      </View>

                      <View className="gap-2.5 py-2.5">
                        {groupedItems.map((item) => {
                          const isDrink = isCoolDrink(item, categoriesList, menuItemsList);
                          const baseUnitPrice = isDrink ? item.unitPrice : item.unitPrice * 0.95;
                          const baseSubtotal = isDrink ? item.subtotal : item.subtotal * 0.95;
                          return (
                            <View key={item._id} className="flex-row items-start">
                              <View className="flex-1 pr-2">
                                <Text className="text-sm font-medium text-brand-900 leading-tight">
                                  {item.menuItemId?.name || "Deleted Item"}
                                </Text>
                              </View>
                              <Text className="w-12 text-sm font-semibold text-brand-900 text-center">
                                {item.quantity}
                              </Text>
                              <Text className="w-16 text-sm text-brand-700 text-right font-mono">
                                {baseUnitPrice.toFixed(2)}
                              </Text>
                              <Text className="w-16 text-sm font-semibold text-brand-900 text-right font-mono">
                                {baseSubtotal.toFixed(2)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    <View className="gap-2 pt-3 border-t border-brand-100">
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-brand-500">Subtotal</Text>
                        <Text className="text-sm text-brand-900">{formatMoney(billSubtotal)}</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-brand-500">CGST (2.5%)</Text>
                        <Text className="text-sm text-brand-900">{formatMoney(totalCgst)}</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-brand-500">SGST (2.5%)</Text>
                        <Text className="text-sm text-brand-900">{formatMoney(totalSgst)}</Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-brand-500">Discount</Text>
                        <TextInput
                          value={discount}
                          onChangeText={setDiscount}
                          keyboardType="decimal-pad"
                          className="w-20 text-right text-sm text-brand-900 border border-brand-200 rounded-md px-2 py-1"
                          style={{ outlineStyle: "none" }}
                        />
                      </View>
                      <ErrorBanner message={billError} />
                      <View className="flex-row justify-between pt-2 border-t border-brand-100">
                        <Text className="text-base font-bold text-brand-900">GRAND TOTAL</Text>
                        <Text className="text-base font-bold text-primary-700">{formatMoney(finalAmount)}</Text>
                      </View>
                    </View>

                    <View className="items-center justify-center pt-2 pb-1 border-t border-dashed border-brand-200 gap-1">
                      {kural ? (
                        <>
                          <Text className="text-[10px] font-bold text-brand-400 tracking-wider text-center">
                            திருக்குறள் ({kural.Number})
                          </Text>
                          <Text className="text-xs font-semibold text-brand-800 text-center leading-relaxed">
                            {kural.Line1}
                          </Text>
                          <Text className="text-xs font-semibold text-brand-800 text-center leading-relaxed">
                            {kural.Line2}
                          </Text>
                          {kural.sp || kural.mv ? (
                            <Text className="text-[10px] text-brand-500 text-center italic mt-0.5 px-2">
                              "{kural.sp || kural.mv}"
                            </Text>
                          ) : null}
                        </>
                      ) : null}
                      <Text className="text-xs font-bold text-brand-700 text-center mt-1">
                        நன்றி! மீண்டும் வருக! 🙏
                      </Text>
                    </View>

                    <Pressable
                      onPress={handleGenerateBill}
                      disabled={billingId === selectedOrder._id}
                      className={`flex-row items-center justify-center gap-2 bg-primary-700 active:bg-primary-800 rounded-lg py-3 ${billingId === selectedOrder._id ? "opacity-50" : ""
                        }`}
                    >
                      <Ionicons name="receipt-outline" size={16} color="#fff" />
                      <Text className="text-sm font-semibold text-white">
                        {billingId === selectedOrder._id ? "Generating..." : "Generate Bill"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const STAT_TONE = {
  brand: { bg: "bg-brand-100", color: colors.brand[700] },
  primary: { bg: "bg-primary-100", color: colors.primary[700] },
  secondary: { bg: "bg-secondary-100", color: colors.secondary[700] },
  success: { bg: "bg-success-100", color: colors.success[700] },
  danger: { bg: "bg-danger-100", color: colors.danger[700] },
};

function StatCard({ icon, label, value, tone = "brand" }) {
  const t = STAT_TONE[tone] ?? STAT_TONE.brand;
  return (
    <Card className="flex-1 min-w-[160px] p-4">
      <View className={`w-8 h-8 rounded-lg items-center justify-center mb-2 ${t.bg}`}>
        <Ionicons name={icon} size={16} color={t.color} />
      </View>
      <Text className="text-xs font-semibold text-brand-500 uppercase mb-1">{label}</Text>
      <Text className="text-2xl font-bold" style={{ color: t.color }}>
        {value}
      </Text>
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
          className="absolute top-12 left-0 bg-white border border-brand-200 rounded-lg shadow-lg min-w-[180px]"
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
