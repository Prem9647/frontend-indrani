import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, LayoutAnimation, UIManager, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { Screen, PageHeader, Card, LoadingIndicator, ErrorBanner, EmptyState } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { useAuthStore } from "../../stores/authStore";
import { SOCKET_URL } from "../../lib/env";
import { tablesApi } from "../../api/tables.api";
import { getTableStatusMeta } from "../../theme/status";
import { colors } from "../../theme/colors";
import { InlineOrderManager, InlineNewOrderForm } from "./InlineOrderPanels";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ALL_ZONES = "All Zones";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
  { value: "maintenance", label: "Maintenance" },
];

// Footer copy for an occupied table's active order — order status is
// derived from item statuses (created/preparing/partially_delivered/
// delivered), so this mirrors ORDER_STATUS_META (theme/status.js) directly
// rather than special-casing billing here; "waiting_for_billing" only
// happens once the waiter explicitly taps Request Bill.
function getOrderFooterMeta(order) {
  switch (order.status) {
    case "created":
      return { label: "Order Placed", tone: "brand" };
    case "preparing":
      return { label: "Kitchen Preparing", tone: "warning" };
    case "partially_delivered":
      return { label: "Partially Delivered", tone: "info" };
    case "delivered":
      return { label: "Delivered", tone: "success" };
    case "waiting_for_billing":
      return { label: "Waiting for Billing", tone: "primary" };
    default:
      return { label: order.status, tone: "brand" };
  }
}

// Waiter's floor map — same real-time table overview shape as
// admin/TablesListScreen.js and ManagerDashboardScreen.js's floor map, sized
// for a waiter mid-shift: zone filter, live order progress per occupied
// table, tap-to-seat on available tables. Only "available" tables are
// tappable — see .claude/skills/restaurant-workflow/skill.md.
export function WaiterTablesScreen({ navigation }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [zone, setZone] = useState(ALL_ZONES);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [connected, setConnected] = useState(false);
  const [expandedTableId, setExpandedTableId] = useState(null);

  const toggleExpand = (tableId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTableId((prev) => (prev === tableId ? null : tableId));
  };

  const {
    data: tables,
    loading,
    error,
    refetch,
  } = useAsync(async () => {
    const { data } = await tablesApi.list();
    return data;
  }, []);

  // Re-sync table status whenever this screen regains focus — e.g. after
  // submitting a new order, the table just tapped should now show occupied.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Live updates — a table/order touched from another device (or the
  // Kitchen Display) reflects here without waiting for focus. See
  // .claude/skills/socketio.
  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { channel: "dashboard", token } });
    const refresh = () => refetch();
    socket.on("connect", () => {
      setConnected(true);
      refresh();
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("table:status-changed", refresh);
    socket.on("order:created", refresh);
    socket.on("order:updated", refresh);
    socket.on("order:status-changed", refresh);
    socket.on("order:closed", refresh);
    return () => socket.disconnect();
  }, [token, refetch]);

  const zones = useMemo(() => {
    const distinct = [...new Set((tables ?? []).map((t) => t.location).filter(Boolean))];
    return [ALL_ZONES, ...distinct];
  }, [tables]);

  const capacityOptions = useMemo(() => {
    const distinct = [...new Set((tables ?? []).map((t) => t.capacity))].sort((a, b) => a - b);
    return [{ value: "all", label: "Any Capacity" }, ...distinct.map((c) => ({ value: String(c), label: `${c}-seater` }))];
  }, [tables]);

  // My Tables — only tables this waiter is actively serving (an order of
  // theirs is open on it). Available tables live in NewOrderScreen's picker
  // instead, and another waiter's occupied/reserved tables aren't this
  // waiter's concern here.
  const myTables = useMemo(() => {
    return (tables ?? []).filter(
      (t) => t.status !== "available" && (t.currentOrders ?? []).some((o) => String(o.waiterId) === String(user?.id))
    );
  }, [tables, user]);

  const visibleTables = useMemo(() => {
    const filtered = myTables.filter((t) => {
      if (zone !== ALL_ZONES && t.location !== zone) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (capacityFilter !== "all" && String(t.capacity) !== capacityFilter) return false;
      if (query.trim() && !String(t.tableNumber).includes(query.trim())) return false;
      return true;
    });

    if (expandedTableId) {
      const idx = filtered.findIndex((t) => t._id === expandedTableId);
      if (idx !== -1 && idx !== filtered.length - 1) {
        const lastIdx = filtered.length - 1;
        const temp = filtered[idx];
        filtered[idx] = filtered[lastIdx];
        filtered[lastIdx] = temp;
      }
    }

    return filtered;
  }, [myTables, zone, statusFilter, capacityFilter, query, expandedTableId]);

  const stats = useMemo(() => {
    return {
      total: myTables.length,
      occupied: myTables.filter((t) => t.status === "occupied").length,
      reserved: myTables.filter((t) => t.status === "reserved").length,
    };
  }, [myTables]);

  return (
    <Screen>
      <PageHeader
        title="My Tables"
        right={
          <View className="flex-row items-center gap-2">
            <View
              className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
                connected ? "bg-success-100" : "bg-brand-100"
              }`}
            >
              <View className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success-600" : "bg-brand-400"}`} />
              <Text className={`text-xs font-bold ${connected ? "text-success-700" : "text-brand-500"}`}>
                {connected ? "Live" : "Connecting…"}
              </Text>
            </View>
            {tables?.some(t => t.tableNumber === "parcel") && (
              <Pressable
                onPress={() => {
                  const pTable = tables.find(t => t.tableNumber === "parcel");
                  navigation.navigate("OrderDetail", {
                    tableId: pTable._id,
                    tableNumber: "parcel",
                    capacity: 0,
                  });
                }}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-700 active:bg-brand-800"
              >
                <Ionicons name="bag-handle-outline" size={14} color="#fff" />
                <Text className="text-xs font-bold text-white">Take Parcel</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => navigation.navigate("NewOrder")}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-700 active:bg-primary-800"
            >
              <Ionicons name="add" size={14} color="#fff" />
              <Text className="text-xs font-bold text-white">New Order</Text>
            </Pressable>
          </View>
        }
      />
      <Text className="text-sm text-brand-500 mb-5">
        Tables you're currently serving.
      </Text>

      <View className="flex-row flex-wrap gap-3 mb-6">
        <StatCard icon="grid-outline" label="My Tables" value={stats.total} tone="brand" />
        <StatCard icon="location" label="Occupied" value={stats.occupied} tone="danger" />
        <StatCard icon="bookmark-outline" label="Reserved" value={stats.reserved} tone="info" />
      </View>

      {loading ? <LoadingIndicator /> : null}
      <ErrorBanner message={error} />

      <View className="flex-row flex-wrap gap-5">
        {/* Filters sidebar */}
        

        {/* Table list */}
        <View style={{ flexGrow: 3, flexShrink: 1, flexBasis: 480 }}>
          {!loading && visibleTables.length === 0 ? (
            <EmptyState
              title="No tables assigned to you"
              subtitle={tables?.length ? "Try a different search, filter, or zone." : "Tap New Order to seat a table."}
            />
          ) : (
            <View className="gap-3">
              {visibleTables.map((table) => (
                <TableRow 
                  key={table._id} 
                  table={table} 
                  onChanged={refetch} 
                  expanded={expandedTableId === table._id}
                  onToggleExpand={() => toggleExpand(table._id)}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

const STAT_TONE = {
  brand: { bg: "bg-brand-100", color: colors.brand[700] },
  info: { bg: "bg-info-100", color: colors.info[700] },
  danger: { bg: "bg-danger-600", color: "#fff" },
};

function StatCard({ icon, label, value, tone = "brand" }) {
  const t = STAT_TONE[tone] ?? STAT_TONE.brand;
  return (
    <Card className="flex-1 min-w-[150px]">
      <Text className="text-[10px] font-bold uppercase tracking-wide text-brand-400 mb-3">{label}</Text>
      <View className="flex-row items-center justify-between">
        <View className={`w-10 h-10 rounded-full items-center justify-center ${t.bg}`}>
          <Ionicons name={icon} size={18} color={t.color} />
        </View>
        <Text className="text-3xl font-bold text-brand-900">{value}</Text>
      </View>
    </Card>
  );
}

function ZoneTabs({ value, onChange, options }) {
  return (
    <View className="flex-row flex-wrap bg-brand-100 rounded-lg p-1 gap-1">
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          className={`px-3.5 py-1.5 rounded-md ${value === option ? "bg-white shadow-sm" : ""}`}
        >
          <Text className={`text-xs font-semibold ${value === option ? "text-primary-700" : "text-brand-500"}`}>
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Dropdown({ value, onChange, options, fullWidth = false }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ position: "relative", zIndex: open ? 50 : 1 }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className={`flex-row items-center gap-2 px-3.5 py-2.5 rounded-lg border border-brand-300 bg-white ${
          fullWidth ? "w-full justify-between" : ""
        }`}
      >
        <Text className="text-sm text-brand-700">{selected?.label}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.brand[500]} />
      </Pressable>
      {open ? (
        <View
          className={`absolute top-12 left-0 bg-white border border-brand-200 rounded-lg shadow-lg ${
            fullWidth ? "w-full" : "min-w-[160px]"
          }`}
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

// One row per table. The bordered card is display-only — status, customer,
// seats, table code. Every action (seat a table, manage an order, add a
// customer, deliver/cancel an item, request the bill, add more items) is
// handled entirely in place via InlineOrderPanels.js — nothing here
// navigates to another screen; expanding a row just reveals more of this
// same page. See .claude/skills/restaurant-workflow.
function TableRow({ table, onChanged, expanded, onToggleExpand }) {
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const meta = getTableStatusMeta(table.status);
  const code = table.tableNumber === "parcel" ? "Parcel" : `T-${table.tableNumber}`;

  if (table.status === "maintenance") {
    return (
      <View className="flex-row items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3.5 opacity-60">
        <View className="w-10 h-10 rounded-lg bg-brand-100 items-center justify-center">
          <Ionicons name="build-outline" size={18} color={colors.brand[400]} />
        </View>
        <Text className="flex-1 text-sm font-semibold text-brand-500">Under Maintenance</Text>
        <View className="w-px h-6 bg-brand-200" />
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="funnel-outline" size={14} color={colors.brand[300]} />
          <Text className="text-sm font-bold text-brand-400">{code}</Text>
        </View>
      </View>
    );
  }

  if (table.status === "available") {
    return (
      <View className="rounded-xl border border-info-200 overflow-hidden">
        <View className="flex-row items-center gap-3 bg-info-50 px-4 py-3.5">
          <View className="w-10 h-10 rounded-lg bg-white items-center justify-center border border-info-200">
            <Ionicons name="restaurant-outline" size={18} color={colors.info[600]} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-info-800">Available</Text>
            <Text className="text-xs text-info-500 mt-0.5">{table.capacity} seats</Text>
          </View>
          <View className="w-px h-6 bg-info-200" />
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="funnel-outline" size={14} color={colors.info[500]} />
            <Text className="text-sm font-bold text-info-700">{code}</Text>
          </View>
        </View>
        <Pressable
          onPress={onToggleExpand}
          className="flex-row items-center justify-center gap-1.5 bg-primary-700 active:bg-primary-800 py-2 border-t border-info-200"
        >
          <Text className="text-xs font-bold text-white">{expanded ? "Cancel" : "Seat Table"}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#fff" />
        </Pressable>
        {expanded ? (
          <View className="px-4 py-3.5 bg-white border-t border-info-200">
            <InlineNewOrderForm
              tableId={table._id}
              onCancel={onToggleExpand}
              onCreated={() => {
                // Leave `expanded` true — once the table list refetches,
                // this row re-renders as "occupied" with its new order
                // already open below, inside the same card.
                onChanged?.();
              }}
            />
          </View>
        ) : null}
      </View>
    );
  }

  // occupied or reserved — has (or awaits) one or more active orders, one
  // per customer currently seated at this table.
  const orders = table.currentOrders ?? [];
  const currentOrderId = activeOrderId && orders.some((o) => o._id === activeOrderId) ? activeOrderId : orders[0]?._id ?? null;
  const order = orders.find((o) => o._id === currentOrderId) ?? orders[0] ?? null;
  const extraCount = orders.length - 1;
  const footerMeta = order ? getOrderFooterMeta(order) : null;
  const isOccupied = table.status === "occupied";

  const borderTone = isOccupied ? "border-danger-200" : "border-warning-200";

  return (
    <View className={`rounded-xl border overflow-hidden ${borderTone}`}>
      <View className={`flex-row items-center gap-3 px-4 py-3.5 ${isOccupied ? "bg-danger-50" : "bg-warning-50"}`}>
        <View className="w-10 h-10 rounded-lg bg-white items-center justify-center border border-brand-900/10">
          <Ionicons name="person-outline" size={18} color={colors.brand[500]} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text numberOfLines={1} className="flex-1 text-sm font-semibold text-brand-900">
              {order?.customerName ?? code}
              {order?.seatNumber ? ` (Seat ${order.seatNumber})` : ""}
              {extraCount > 0 ? ` +${extraCount} more` : ""}
            </Text>
            {orders.length > 0 ? (
              <View className="flex-row items-center gap-1.5">
                <Pressable
                  onPress={onToggleExpand}
                  className="items-center justify-center w-7 h-7 bg-primary-700 active:bg-primary-800 rounded-md"
                >
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#fff" />
                </Pressable>
                {isOccupied ? (
                  <Pressable
                    onPress={() => {
                      setAddingCustomer((a) => !a);
                      if (!expanded) onToggleExpand();
                    }}
                    className="items-center justify-center w-7 h-7 bg-white border border-brand-200 rounded-md"
                  >
                    <Ionicons name="person-add-outline" size={12} color={colors.primary[700]} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} className="text-xs text-brand-500 mt-0.5">
            {extraCount > 0 ? "Multiple customers" : footerMeta?.label ?? meta.label}
          </Text>
        </View>
        <View className="w-px h-6 bg-brand-900/10" />
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="funnel-outline" size={14} color={colors.brand[400]} />
          <Text className="text-sm font-bold text-brand-800">{code}</Text>
        </View>
      </View>

      {expanded ? (
        <View className={`px-4 py-3.5 bg-white border-t gap-3 ${borderTone}`}>
          {orders.length > 1 ? (
            <View className="flex-row flex-wrap gap-2">
              {orders.map((o) => (
                <Pressable
                  key={o._id}
                  onPress={() => {
                    setActiveOrderId(o._id);
                    setAddingCustomer(false);
                  }}
                  className={`px-3 py-1.5 rounded-full border ${
                    o._id === currentOrderId && !addingCustomer ? "bg-primary-700 border-primary-700" : "bg-white border-brand-300"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      o._id === currentOrderId && !addingCustomer ? "text-white" : "text-brand-600"
                    }`}
                  >
                    {o.customerName ?? `#${o.orderNumber}`}
                    {o.seatNumber ? ` (Seat ${o.seatNumber})` : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {addingCustomer ? (
            <InlineNewOrderForm
              tableId={table._id}
              onCancel={() => setAddingCustomer(false)}
              onCreated={(newOrderId) => {
                setActiveOrderId(newOrderId);
                setAddingCustomer(false);
                onChanged?.();
              }}
            />
          ) : currentOrderId ? (
            <InlineOrderManager orderId={currentOrderId} onChanged={onChanged} />
          ) : (
            <Text className="text-sm text-brand-500">No active order yet.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
