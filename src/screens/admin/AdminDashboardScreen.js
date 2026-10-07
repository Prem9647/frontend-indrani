import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, PageHeader, Card, Button, LoadingIndicator, ErrorBanner, Badge } from "../../components/ui";
import { useAuthStore } from "../../stores/authStore";
import { useAsync } from "../../lib/useAsync";
import { tablesApi } from "../../api/tables.api";
import { usersApi } from "../../api/users.api";
import { menuItemsApi } from "../../api/menuItems.api";
import { ordersApi } from "../../api/orders.api";
import { reportsApi } from "../../api/reports.api";
import { getOrderStatusMeta } from "../../theme/status";
import { colors } from "../../theme/colors";

function sumSales(days) {
  return (days ?? []).reduce((total, day) => total + (day?.totalSales || 0), 0);
}

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

// Compact form for the trend chart's per-bar label, where full paise
// precision would overflow a 44px-wide column (e.g. ₹1.2k instead of
// ₹1,234.00).
function formatCompactMoney(value) {
  const v = value ?? 0;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${Math.round(v)}`;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function toCsv(orders) {
  const header = "Order Number,Customer,Table,Amount,Status,Ordered At";
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      o.customerId?.name ?? "",
      o.tableId?.tableNumber === "parcel" ? "Parcel" : (o.tableId?.tableNumber ?? ""),
      (o.finalAmount || o.totalAmount).toFixed(2),
      o.status,
      new Date(o.orderedAt).toISOString(),
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

export function AdminDashboardScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const [chartPeriod, setChartPeriod] = useState("weekly");

  const { data, loading, error } = useAsync(async () => {
    const [tables, users, menuItems, recentOrders, overview, weeklySales, monthlySales, bestSellers, needsAttention] =
      await Promise.all([
        tablesApi.list(),
        usersApi.list(),
        menuItemsApi.list(),
        ordersApi.list({ limit: 0, todayOnly: true }),
        reportsApi.overview(),
        reportsApi.weeklySales(),
        reportsApi.monthlySales(),
        reportsApi.popularItems(2),
        reportsApi.leastOrderedItems(2),
      ]);
    return {
      tables: tables.data,
      users: users.data,
      menuItems: menuItems.data,
      recentOrders: recentOrders.data,
      overview: overview.data,
      weeklySales: weeklySales.data,
      monthlySales: monthlySales.data,
      bestSellers: bestSellers.data,
      needsAttention: needsAttention.data,
    };
  }, []);

  const chartData = chartPeriod === "weekly" ? data?.weeklySales : data?.monthlySales;

  const todayRecentOrders = useMemo(() => {
    const now = new Date();
    return (data?.recentOrders ?? []).filter((order) => {
      const d = new Date(order.orderedAt);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    });
  }, [data?.recentOrders]);

  function handleExport() {
    if (!todayRecentOrders.length) return;
    if (Platform.OS !== "web") {
      Alert.alert("Export CSV", "CSV export is available from the web dashboard.");
      return;
    }
    const csv = toCsv(todayRecentOrders);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "today-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen>
        <ErrorBanner message={error} />
      </Screen>
    );
  }

  const { tables, users, menuItems, overview, bestSellers, needsAttention } = data;
  const available = tables.filter((t) => t.status === "available").length;
  const occupied = tables.filter((t) => t.status === "occupied").length;
  const activeMenuItems = menuItems.filter((m) => m.isAvailable).length;
  const staffOnDuty = users.filter((u) => u.isActive && u.role !== "admin").length;
  const occupiedPct = tables.length ? Math.round((occupied / tables.length) * 100) : 0;

  const breakdown = overview.statusBreakdownToday;
  const inProgress = breakdown.created + breakdown.preparing + breakdown.partially_delivered + breakdown.delivered;
  const totalToday = overview.todayOrders || 1; // avoid divide-by-zero when nothing ordered yet today

  return (
    <Screen>
      <PageHeader
        title="Sales Analysis"
        right={
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => Alert.alert("Filters", "Coming soon.")}
              className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-brand-300"
            >
              <Ionicons name="filter-outline" size={16} color={colors.primary[700]} />
              <Text className="text-sm font-semibold text-primary-700">Filters</Text>
            </Pressable>
            <Pressable
              onPress={handleExport}
              className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-secondary-700 active:bg-secondary-800"
            >
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text className="text-sm font-semibold text-white">Export CSV</Text>
            </Pressable>
          </View>
        }
      />
      <Text className="text-sm text-brand-500 mb-6">Welcome back, {user?.name?.split(" ")[0] ?? "Admin"}.</Text>

      {/* Quick Actions */}
      <View className="flex-row flex-wrap gap-3 mb-6">
        <Pressable
          onPress={() => navigation.navigate("Users", { screen: "UsersList", params: { openAdd: true } })}
          className="flex-1 min-w-[150px] flex-row items-center gap-3 bg-primary-600 active:bg-primary-700 p-4 rounded-xl"
        >
          <Ionicons name="person-add-outline" size={20} color="#fff" />
          <Text className="text-sm font-semibold text-white">Add User</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("Tables", { screen: "TablesList", params: { openAdd: true } })}
          className="flex-1 min-w-[150px] flex-row items-center gap-3 bg-white active:bg-brand-100 p-4 rounded-xl border border-brand-200"
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary[700]} />
          <Text className="text-sm font-semibold text-primary-700">Add Table</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("Menu", { screen: "MenuHome", params: { openAddItem: true } })}
          className="flex-1 min-w-[150px] flex-row items-center gap-3 bg-white active:bg-brand-100 p-4 rounded-xl border border-brand-200"
        >
          <Ionicons name="fast-food-outline" size={20} color={colors.primary[700]} />
          <Text className="text-sm font-semibold text-primary-700">New Menu Item</Text>
        </Pressable>
        <Pressable
          onPress={() => Alert.alert("New Order", "Orders are created by waiters from the Tables screen.")}
          className="flex-1 min-w-[150px] flex-row items-center gap-3 bg-white active:bg-brand-100 p-4 rounded-xl border border-brand-200"
        >
          <Ionicons name="receipt-outline" size={20} color={colors.primary[700]} />
          <Text className="text-sm font-semibold text-primary-700">New Order</Text>
        </Pressable>
      </View>

      {/* Overview cards */}
      <View className="flex-row flex-wrap gap-3 mb-6">
        <StatCard icon="cash-outline" label="Today's Sales" value={formatMoney(sumSales(data.weeklySales.slice(-1)))} />
        <StatCard icon="receipt-outline" label="Today's Orders" value={overview.todayOrders} tone="secondary" />
        <StatCard icon="wallet-outline" label="Total Revenue (MTD)" value={formatMoney(sumSales(data.monthlySales))} tone="info" />
        <StatCard icon="business-outline" label="Active Tables" value={`${available} / ${tables.length}`} live />
        <StatCard icon="people-outline" label="Occupied Capacity" value={`${occupiedPct}%`} tone="danger" />
        <StatCard icon="person-outline" label="Total Customers" value={overview.totalCustomers} />
        <StatCard icon="fast-food-outline" label="Active Menu Items" value={activeMenuItems} tone="secondary" />
        <StatCard icon="id-card-outline" label="Staff on Duty" value={staffOnDuty} />
      </View>

      {/* Trend + breakdown */}
      <View className="gap-5 mb-6">
        <Card className="p-5">
          <View className="flex-row items-center justify-between mb-5 flex-wrap gap-3">
            <View>
              <Text className="text-base font-semibold text-brand-900">Sales &amp; Revenue Trends</Text>
              <Text className="text-sm text-brand-500 mt-0.5">Comparative performance analysis</Text>
            </View>
            <View className="flex-row bg-brand-100 rounded-lg p-1">
              {["weekly", "monthly"].map((period) => {
                const isActive = chartPeriod === period;
                return (
                  <Pressable
                    key={period}
                    onPress={() => setChartPeriod(period)}
                    style={[
                      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
                      isActive ? { backgroundColor: "#ffffff" } : { backgroundColor: "transparent" },
                    ]}
                  >
                    <Text
                      style={[
                        { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
                        isActive ? { color: colors.primary[700] } : { color: colors.brand[500] },
                      ]}
                    >
                      {period}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <TrendChart data={chartData} />
        </Card>

      </View>

      {/* Recent orders */}
      <Card className="mb-6 !p-0 overflow-hidden">
        <View className="p-5 border-b border-brand-100 flex-row items-center justify-between">
          <View>
            <Text className="text-base font-semibold text-brand-900">Today's Recent Orders</Text>
            <Text className="text-sm text-brand-500 mt-0.5">
              {todayRecentOrders.length === 0
                ? "No orders placed today."
                : `Showing all ${todayRecentOrders.length} transaction${todayRecentOrders.length === 1 ? "" : "s"} today`}
            </Text>
          </View>
        </View>
        {todayRecentOrders.length === 0 ? (
          <Text className="text-sm text-brand-500 p-5">No orders placed today.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View className="min-w-[600px]">
              <View className="flex-row bg-brand-50 px-5 py-3 border-b border-brand-200">
                <Text className="w-24 text-xs font-bold text-brand-700">ORDER</Text>
                <Text className="flex-1 text-xs font-bold text-brand-700">CUSTOMER</Text>
                <Text className="w-20 text-xs font-bold text-brand-700 text-center">TABLE</Text>
                <Text className="w-24 text-xs font-bold text-brand-700">AMOUNT</Text>
                <Text className="w-32 text-xs font-bold text-brand-700">STATUS</Text>
                <Text className="w-20 text-xs font-bold text-brand-700">TIME</Text>
              </View>
              <ScrollView style={{ maxHeight: 380 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                {todayRecentOrders.map((order) => {
                  const meta = getOrderStatusMeta(order.status);
                  return (
                    <View key={order._id} className="flex-row items-center px-5 py-3 border-b border-brand-100">
                      <Text className="w-24 text-sm font-bold text-primary-700">#{order.orderNumber}</Text>
                      <Text className="flex-1 text-sm text-brand-900">{order.customerId?.name ?? "—"}</Text>
                      <Text className="w-20 text-sm text-brand-900 text-center">{order.tableId?.tableNumber === "parcel" ? "Parcel" : `T-${order.tableId?.tableNumber ?? "—"}`}</Text>
                      <Text className="w-24 text-sm font-bold text-brand-900">
                        {formatMoney(order.finalAmount || order.totalAmount)}
                      </Text>
                      <View className="w-32">
                        <Badge label={meta.label} tone={meta.tone} />
                      </View>
                      <Text className="w-20 text-sm text-brand-500">{formatTime(order.orderedAt)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>
        )}
      </Card>

      {/* Best sellers / needs attention */}
      <View className="flex-row flex-wrap gap-5">
        <Card className="flex-1 min-w-[280px] p-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-semibold text-brand-900">Best Sellers</Text>
            <Ionicons name="trending-up-outline" size={18} color={colors.primary[600]} />
          </View>
          {bestSellers.length === 0 ? (
            <Text className="text-sm text-brand-500">Not enough order data yet.</Text>
          ) : (
            <View className="gap-3">
              {bestSellers.map((item) => (
                <View key={item.menuItemId} className="flex-row items-center gap-3">
                  <View className="w-11 h-11 rounded-lg bg-primary-50 items-center justify-center">
                    <Ionicons name="fast-food-outline" size={20} color={colors.primary[600]} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-brand-900">{item.name}</Text>
                    <Text className="text-xs text-brand-500 mt-0.5">{item.totalQuantity} orders all-time</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card className="flex-1 min-w-[280px] p-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-semibold text-brand-900">Needs Attention</Text>
            <Ionicons name="warning-outline" size={18} color={colors.danger[600]} />
          </View>
          {needsAttention.length === 0 ? (
            <Text className="text-sm text-brand-500">Nothing stands out right now.</Text>
          ) : (
            <View className="gap-3">
              {needsAttention.map((item) => (
                <View key={item.menuItemId} className="flex-row items-center gap-3">
                  <View className="w-11 h-11 rounded-lg bg-danger-50 items-center justify-center">
                    <Ionicons name="fast-food-outline" size={20} color={colors.danger[600]} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-brand-900">{item.name}</Text>
                    <Text className="text-xs text-danger-600 mt-0.5">Low sales — {item.totalQuantity} orders all-time</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      </View>
    </Screen>
  );
}

const ICON_TONE = {
  brand: { bg: "bg-brand-100", color: colors.brand[700] },
  primary: { bg: "bg-primary-100", color: colors.primary[700] },
  secondary: { bg: "bg-secondary-100", color: colors.secondary[700] },
  success: { bg: "bg-success-100", color: colors.success[700] },
  danger: { bg: "bg-danger-100", color: colors.danger[700] },
  info: { bg: "bg-info-100", color: colors.info[700] },
};

function StatCard({ icon, label, value, tone = "brand", live = false }) {
  const iconTone = ICON_TONE[tone] ?? ICON_TONE.brand;
  return (
    <Card className="flex-1 min-w-[160px] p-4">
      <View className="flex-row items-start justify-between mb-3">
        <View className={`p-2 rounded-lg ${iconTone.bg}`}>
          <Ionicons name={icon} size={18} color={iconTone.color} />
        </View>
        {live ? (
          <View className="flex-row items-center gap-1 px-2 py-1 rounded-full bg-primary-100">
            <View className="w-1.5 h-1.5 rounded-full bg-primary-600" />
            <Text className="text-[10px] font-bold text-primary-700">Live</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-sm text-brand-500 mb-1">{label}</Text>
      <Text className="text-2xl font-bold text-brand-900">{value}</Text>
    </Card>
  );
}

const CHART_BAR_AREA_HEIGHT = 140;
const CHART_BAR_WIDTH = 28;
const CHART_COLUMN_WIDTH = 44;

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  if (parts.length === 2) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function TrendChart({ data }) {
  const max = useMemo(() => (data ?? []).reduce((acc, d) => Math.max(acc, d?.totalSales || 0), 1), [data]);

  if (!data?.length) {
    return <Text className="text-sm text-brand-500">Not enough data yet.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row items-end gap-2 min-w-full px-1">
        {data.map((day, i) => {
          const barHeight = Math.max(6, Math.round(((day?.totalSales || 0) / max) * CHART_BAR_AREA_HEIGHT)) || 6;
          const isLast = i === data.length - 1;
          return (
            <View key={day.date || i} className="items-center gap-1" style={{ width: CHART_COLUMN_WIDTH }}>
              <Text className="text-[9px] font-semibold text-brand-700">{formatCompactMoney(day.totalSales)}</Text>
              <View style={{ height: CHART_BAR_AREA_HEIGHT, width: CHART_BAR_WIDTH, justifyContent: "flex-end" }}>
                <View
                  style={{
                    height: barHeight,
                    width: CHART_BAR_WIDTH,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    backgroundColor: isLast ? colors.primary[600] : colors.primary[200],
                  }}
                />
              </View>
              <Text className="text-[10px] text-brand-500">
                {formatDateLabel(day.date)}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const BAR_TONE = {
  success: "bg-success-500",
  info: "bg-info-500",
  primary: "bg-primary-500",
};

function BreakdownBar({ label, count, total, tone }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-brand-600">{label}</Text>
        <Text className="text-sm font-bold text-brand-900">
          {count} ({pct}%)
        </Text>
      </View>
      <View className="w-full bg-brand-100 rounded-full h-2.5 overflow-hidden">
        <View className={`h-full rounded-full ${BAR_TONE[tone]}`} style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}
