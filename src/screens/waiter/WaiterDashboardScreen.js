import { useCallback, useEffect, useMemo } from "react";
import { View, Text, Pressable, Alert, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { Screen, PageHeader, Card, Badge, LoadingIndicator, ErrorBanner } from "../../components/ui";
import { useAuthStore } from "../../stores/authStore";
import { useAsync } from "../../lib/useAsync";
import { SOCKET_URL } from "../../lib/env";
import { tablesApi } from "../../api/tables.api";
import { ordersApi } from "../../api/orders.api";
import { menuItemsApi } from "../../api/menuItems.api";
import { getTableStatusMeta } from "../../theme/status";
import { colors } from "../../theme/colors";
import { WIDE_BREAKPOINT } from "../../navigation/AdminShell";
import { useReadyToDeliverItems } from "./useReadyToDeliverItems";

function isToday(value) {
  if (!value) return false;
  return new Date(value).toDateString() === new Date().toDateString();
}

function formatOrderTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// How long a row has been waiting drives its color-coded urgency indicator —
// green while fresh, amber once it's been sitting a while, red once it's
// been waiting long enough that it needs attention now.
// Full static class strings (not interpolated) so NativeWind's content
// scanner picks every one up regardless of which tone is used at runtime —
// see components/ui/Badge.js for the same rule.
const WAIT_DOT_CLASS = {
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
};

function getWaitMeta(orderedAt) {
  const waitMin = Math.max(0, Math.round((Date.now() - new Date(orderedAt).getTime()) / 60000));
  if (waitMin >= 15) return { tone: "danger", label: `${waitMin}m` };
  if (waitMin >= 5) return { tone: "warning", label: `${waitMin}m` };
  return { tone: "success", label: waitMin <= 0 ? "new" : `${waitMin}m` };
}

// Floor Overview — a floor-wide snapshot (all active orders/tables, not just
// this waiter's own), matching the "Floor Overview" framing of the design.
export function WaiterDashboardScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const { data, loading, error, refetch } = useAsync(async () => {
    const [tables, orders, menuItems] = await Promise.all([
      tablesApi.list(),
      ordersApi.list({ limit: 10 }),
      menuItemsApi.list(),
    ]);
    return { tables: tables.data, orders: orders.data, menuItems: menuItems.data };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Keeps "Real-time Floor Map" honest: without this, a table freed by the
  // manager generating a bill (see order.service.js's generateBill) only
  // shows up here after the waiter navigates away and back — same event set
  // WaiterTablesScreen.js listens for.
  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { channel: "dashboard", token } });
    const refresh = () => refetch();
    socket.on("table:status-changed", refresh);
    socket.on("order:created", refresh);
    socket.on("order:updated", refresh);
    socket.on("order:status-changed", refresh);
    socket.on("order:closed", refresh);
    return () => socket.disconnect();
  }, [token, refetch]);

  const tables = data?.tables ?? [];
  const orders = data?.orders ?? [];
  const menuItems = data?.menuItems ?? [];

  const {
    rows: deliveryRows,
    loading: deliveryLoading,
    connected: deliveryConnected,
    deliverItem,
  } = useReadyToDeliverItems();

  const stats = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status !== "closed").length;
    const preparing = orders.filter((o) => o.status === "preparing").length;
    const deliveredToday = orders.filter((o) => o.status !== "created" && isToday(o.deliveredAt)).length;
    const available = tables.filter((t) => t.status === "available").length;
    const occupied = tables.filter((t) => t.status === "occupied").length;
    const unavailableItems = menuItems.filter((m) => !m.isAvailable).length;
    return { activeOrders, preparing, deliveredToday, available, occupied, unavailableItems };
  }, [orders, tables, menuItems]);

  async function handleDeliver(row) {
    try {
      await deliverItem(row);
    } catch (err) {
      Alert.alert("Couldn't deliver item", err.message);
    }
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

  return (
    <Screen>
      <PageHeader
        title="Waiter"
        right={
          <View
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
              deliveryConnected ? "bg-success-100" : "bg-brand-100"
            }`}
          >
            <View className={`w-1.5 h-1.5 rounded-full ${deliveryConnected ? "bg-success-600" : "bg-brand-400"}`} />
            <Text className={`text-xs font-bold ${deliveryConnected ? "text-success-700" : "text-brand-500"}`}>
              {deliveryConnected ? "Live" : "Connecting…"}
            </Text>
          </View>
        }
      />
      <Text className="text-sm text-brand-500 mb-5">
        Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {user?.name?.split(" ")[0] ?? "there"}. You have{" "}
        {stats.activeOrders} active order{stats.activeOrders === 1 ? "" : "s"}.
      </Text>

      {/* Stat cards — desktop/tablet only. On phones the waiter only needs
          the Ready to Deliver queue front and center. */}
      {isWide ? (
        <View className="flex-row flex-wrap gap-3 mb-5">
          <StatCard icon="flash-outline" label="Active Orders" value={stats.activeOrders} tone="primary" isWide={isWide} />
          <StatCard
            icon="flame-outline"
            label="Preparing"
            value={stats.preparing}
            tone="secondary"
            sublabel="in Kitchen"
            isWide={isWide}
          />
          <StatCard icon="checkmark-circle-outline" label="Delivered" value={stats.deliveredToday} tone="success" isWide={isWide} />
          <StatCard icon="checkmark-done-outline" label="Available Tables" value={stats.available} tone="success" isWide={isWide} />
          <StatCard icon="people-outline" label="Occupied Tables" value={stats.occupied} tone="danger" isWide={isWide} />
        </View>
      ) : null}

      <View className="flex-row flex-wrap gap-5">
        {/* Ready to Deliver Items */}
        <View style={{ flexGrow: 2, flexShrink: 1, flexBasis: 480 }}>
          <Card className="!p-0 overflow-hidden">
            <View className="flex-row items-center justify-between px-5 py-3 border-b border-brand-100 flex-wrap gap-2">
              <View className="flex-row items-center gap-2">
                <Ionicons name="fast-food-outline" size={16} color={colors.primary[700]} />
                <Text className="text-sm font-semibold text-brand-900">Ready to Deliver Items</Text>
              </View>
              <Text className="text-xs text-brand-500">
                {deliveryRows.length} item{deliveryRows.length === 1 ? "" : "s"} waiting
              </Text>
            </View>

            {deliveryLoading && deliveryRows.length === 0 ? (
              <LoadingIndicator />
            ) : deliveryRows.length === 0 ? (
              <Text className="text-sm text-brand-500 p-5">All caught up — no items waiting to be delivered.</Text>
            ) : (
              deliveryRows.map((row, index) => {
                const waitMeta = getWaitMeta(row.orderedAt);
                return (
                  // Two flex-wrap rows instead of fixed pixel columns — a
                  // strict Table/Customer/Item/Time/Action table doesn't fit
                  // small phone widths, so each field wraps onto its own
                  // line when there's no room, rather than truncating.
                  <View
                    key={row.key}
                    className={`px-5 py-3 ${index > 0 ? "border-t border-brand-100" : ""}`}
                  >
                    <View className="flex-row items-center justify-between flex-wrap gap-2">
                      <View className="flex-row items-center gap-1.5 flex-1 pr-2 flex-wrap">
                        <View className={`w-1.5 h-1.5 rounded-full ${WAIT_DOT_CLASS[waitMeta.tone]}`} />
                        <Text className="text-sm font-bold text-primary-700">
                          {row.tableNumber === "parcel" ? "Parcel" : `T-${row.tableNumber ?? "—"}`}
                        </Text>
                        <Text className="text-sm text-brand-900 flex-shrink" numberOfLines={1}>
                          {row.customerName ?? "—"}
                          {row.seatNumber ? ` (Seat ${row.seatNumber})` : ""}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleDeliver(row)}
                        className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-700 active:bg-primary-800"
                      >
                        <Ionicons name="checkmark-done-outline" size={13} color="#fff" />
                        <Text className="text-xs font-semibold text-white">Deliver</Text>
                      </Pressable>
                    </View>
                    <View className="flex-row items-center justify-between flex-wrap gap-2 mt-1.5">
                      <Text className="flex-1 pr-2 text-sm text-brand-700" numberOfLines={1}>
                        {row.itemName ?? "Item"} <Text className="text-brand-500">×{row.quantity}</Text>
                      </Text>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-xs text-brand-500">{formatOrderTime(row.orderedAt)}</Text>
                        <Badge label={waitMeta.label} tone={waitMeta.tone} />
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </Card>
        </View>

        {/* Quick Actions — desktop/tablet only. */}
        {isWide ? (
          <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 260 }} className="gap-3">
            <Pressable
              onPress={() => navigation.navigate("Tables")}
              className="flex-row items-center justify-between bg-primary-700 active:bg-primary-800 rounded-xl p-4"
            >
              <View>
                <Text className="text-xs font-semibold text-primary-100 uppercase">Point of Sale</Text>
                <Text className="text-base font-bold text-white mt-0.5">Create New Order</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Tables")}
              className="flex-row items-center justify-between bg-white border border-brand-200 rounded-xl p-4"
            >
              <View>
                <Text className="text-xs font-semibold text-brand-400 uppercase">Floor Management</Text>
                <Text className="text-base font-bold text-brand-900 mt-0.5">View Tables</Text>
              </View>
              <Ionicons name="grid-outline" size={20} color={colors.brand[600]} />
            </Pressable>

            {stats.unavailableItems > 0 ? (
              <View className="bg-warning-50 border border-warning-100 rounded-xl p-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <Ionicons name="warning-outline" size={16} color={colors.warning[600]} />
                  <Text className="text-sm font-semibold text-warning-700">Unavailable Items</Text>
                </View>
                <Text className="text-xs text-warning-700">
                  {stats.unavailableItems} menu item{stats.unavailableItems === 1 ? " is" : "s are"} currently marked
                  unavailable.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Real-time floor map — desktop/tablet only. */}
      {isWide ? (
        <Card className="mt-5">
          <View className="flex-row items-center justify-between mb-4 flex-wrap gap-2">
            <Text className="text-sm font-semibold text-brand-900">Real-time Floor Map</Text>
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-1.5">
                <View className="w-2.5 h-2.5 rounded-full bg-success-500" />
                <Text className="text-xs text-brand-500">Free</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="w-2.5 h-2.5 rounded-full bg-primary-600" />
                <Text className="text-xs text-brand-500">Occupied</Text>
              </View>
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2.5">
            {tables.map((table) => {
              const isAvailable = table.status === "available";
              const isOccupied = table.status === "occupied";
              const meta = getTableStatusMeta(table.status);
              return (
                <Pressable
                  key={table._id}
                  disabled={!isAvailable && !isOccupied}
                  onPress={() =>
                    navigation.navigate("Tables", {
                      screen: isAvailable ? "OrderDetail" : "TableOrders",
                      params: { tableId: table._id, tableNumber: table.tableNumber, capacity: table.capacity },
                    })
                  }
                  className="relative"
                >
                  <View
                    className={`w-12 h-12 rounded-lg items-center justify-center ${isAvailable ? "bg-success-100" : ""}`}
                    style={!isAvailable ? { backgroundColor: colors[meta.tone]?.[600] ?? colors.primary[600] } : undefined}
                  >
                    <Text className={`text-xs font-bold ${isAvailable ? "text-success-700" : "text-white"}`}>
                      {table.tableNumber === "parcel" ? "Parcel" : table.tableNumber}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>
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

function StatCard({ icon, label, value, tone = "brand", sublabel, isWide }) {
  const t = STAT_TONE[tone] ?? STAT_TONE.brand;
  return (
    <Card className="p-4" style={isWide ? { flexGrow: 1, minWidth: 150 } : { flexBasis: "48%", flexGrow: 0 }}>
      <View className={`w-8 h-8 rounded-lg items-center justify-center mb-2 ${t.bg}`}>
        <Ionicons name={icon} size={16} color={t.color} />
      </View>
      <Text className="text-xs font-semibold text-brand-500 uppercase mb-1">
        {label}
        {sublabel ? ` ${sublabel}` : ""}
      </Text>
      <Text className="text-2xl font-bold" style={{ color: t.color }}>
        {value}
      </Text>
    </Card>
  );
}
