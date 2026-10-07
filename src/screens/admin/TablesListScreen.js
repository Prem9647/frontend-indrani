import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert, Animated, Modal, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, PageHeader, Card, Badge, LoadingIndicator, ErrorBanner, EmptyState } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { tablesApi } from "../../api/tables.api";
import { getTableStatusMeta } from "../../theme/status";
import { colors } from "../../theme/colors";
import { AddTableCard } from "./AddTableCard";
import { EditTableCard } from "./EditTableCard";

const PAGE_SIZE = 12;
const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
  { value: "maintenance", label: "Maintenance" },
];

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

export function TablesListScreen({ navigation, route }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("grid");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [delayedTable, setDelayedTable] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  const {
    data: tables,
    loading,
    error,
    refetch,
  } = useAsync(async () => {
    const { data } = await tablesApi.list();
    return data;
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useFocusEffect(
    useCallback(() => {
      if (route.params?.openAdd) {
        setAddModalOpen(true);
        navigation.setParams({ openAdd: undefined });
      }
    }, [route.params?.openAdd, navigation])
  );

  const capacityOptions = useMemo(() => {
    const distinct = [...new Set((tables ?? []).map((t) => t.capacity))].sort((a, b) => a - b);
    return [{ value: "all", label: "Any" }, ...distinct.map((c) => ({ value: String(c), label: `${c}-seater` }))];
  }, [tables]);

  const filtered = useMemo(() => {
    return (tables ?? []).filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (capacityFilter !== "all" && String(t.capacity) !== capacityFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const matchesTable = String(t.tableNumber).includes(q);
        const matchesOrder = (t.currentOrders ?? []).some((o) => o.orderNumber?.toLowerCase().includes(q));
        if (!matchesTable && !matchesOrder) return false;
      }
      return true;
    });
  }, [tables, statusFilter, capacityFilter, query]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, capacityFilter, query]);

  const stats = useMemo(() => {
    const all = tables ?? [];
    return {
      total: all.length,
      available: all.filter((t) => t.status === "available").length,
      occupied: all.filter((t) => t.status === "occupied").length,
      maintenance: all.filter((t) => t.status === "maintenance").length,
    };
  }, [tables]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Screen>
      <PageHeader
        title="Table Management"
        subtitle="Monitor and manage restaurant floor capacity."
        right={
          <Pressable
            onPress={() => setAddModalOpen(true)}
            className="flex-row items-center gap-2 bg-primary-700 active:bg-primary-800 rounded-lg px-4 py-2.5"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-sm font-semibold text-white">Add New Table</Text>
          </Pressable>
        }
      />

      <View className="flex-row flex-wrap gap-3 mb-5">
        <StatCard icon="grid-outline" label="Total Tables" value={stats.total} badge="All Levels" badgeTone="brand" />
        <StatCard
          icon="checkmark-circle-outline"
          label="Available"
          value={stats.available}
          tone="success"
          badge="Live"
          badgeTone="success"
          dot
        />
        <StatCard icon="restaurant-outline" label="Occupied" value={stats.occupied} tone="danger" badge="Occupied" badgeTone="danger" />
        <StatCard
          icon="build-outline"
          label="Maintenance"
          value={stats.maintenance}
          tone="warning"
          badge="Action Req"
          badgeTone="warning"
        />
      </View>

      <View className="flex-row flex-wrap items-center gap-3 mb-5" style={{ zIndex: 20 }}>
        <View className="flex-1 min-w-[200px] flex-row items-center gap-2 border border-brand-300 rounded-lg px-3.5 py-2.5 bg-white">
          <Ionicons name="search-outline" size={16} color={colors.brand[400]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Table # or Order..."
            placeholderTextColor={colors.brand[400]}
            className="flex-1 text-sm text-brand-900"
            style={{ outlineStyle: "none" }}
          />
        </View>
        <Dropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <Dropdown value={capacityFilter} onChange={setCapacityFilter} options={capacityOptions} />
        <View className="flex-row rounded-lg border border-brand-300 overflow-hidden">
          <Pressable onPress={() => setView("grid")} className={`p-2.5 ${view === "grid" ? "bg-primary-700" : "bg-white"}`}>
            <Ionicons name="grid-outline" size={16} color={view === "grid" ? "#fff" : colors.brand[500]} />
          </Pressable>
          <Pressable onPress={() => setView("list")} className={`p-2.5 ${view === "list" ? "bg-primary-700" : "bg-white"}`}>
            <Ionicons name="list-outline" size={16} color={view === "list" ? "#fff" : colors.brand[500]} />
          </Pressable>
        </View>
      </View>

      {loading ? <LoadingIndicator /> : null}
      <ErrorBanner message={error} />
      {!loading && filtered.length === 0 ? (
        <EmptyState title="No tables found" subtitle="Try a different search or filter." />
      ) : null}

      {pageItems.length > 0 && view === "list" ? (
        <Card className="!p-0 overflow-hidden mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="min-w-[760px]">
              <View className="flex-row bg-brand-50 px-4 py-3">
                <Text className="w-24 text-xs font-semibold text-brand-500">TABLE #</Text>
                <Text className="w-24 text-xs font-semibold text-brand-500">CAPACITY</Text>
                <Text className="w-28 text-xs font-semibold text-brand-500">STATUS</Text>
                <Text className="w-36 text-xs font-semibold text-brand-500">CURRENT WAITER</Text>
                <Text className="flex-1 text-xs font-semibold text-brand-500">CURRENT ORDER</Text>
                <Text className="w-20 text-xs font-semibold text-brand-500 text-right">ACTIONS</Text>
              </View>
              {pageItems.map((t) => (
                <TableRow key={t._id} table={t} onEdit={() => setEditingTable(t)} onViewDelayed={() => setDelayedTable(t)} now={now} />
              ))}
            </View>
          </ScrollView>
        </Card>
      ) : null}

      {pageItems.length > 0 && view === "grid" ? (
        <View className="flex-row flex-wrap gap-3 mb-4">
          {pageItems.map((t) => (
            <TableGridCard key={t._id} table={t} onEdit={() => setEditingTable(t)} onViewDelayed={() => setDelayedTable(t)} now={now} />
          ))}
        </View>
      ) : null}

      {filtered.length > 0 ? (
        <View className="flex-row items-center justify-between flex-wrap gap-3">
          <Text className="text-sm text-brand-500">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} tables
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Pressable
              disabled={page === 1}
              onPress={() => setPage((p) => p - 1)}
              className={`p-2 rounded-lg border border-brand-300 ${page === 1 ? "opacity-40" : ""}`}
            >
              <Ionicons name="chevron-back" size={16} color={colors.brand[600]} />
            </Pressable>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 7)
              .map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPage(p)}
                  className={`w-8 h-8 items-center justify-center rounded-lg ${
                    p === page ? "bg-primary-700" : "border border-brand-300"
                  }`}
                >
                  <Text className={`text-sm font-medium ${p === page ? "text-white" : "text-brand-700"}`}>{p}</Text>
                </Pressable>
              ))}
            <Pressable
              disabled={page === totalPages}
              onPress={() => setPage((p) => p + 1)}
              className={`p-2 rounded-lg border border-brand-300 ${page === totalPages ? "opacity-40" : ""}`}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.brand[600]} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <AddTableCard
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={() => {
          setAddModalOpen(false);
          refetch();
        }}
      />
      <EditTableCard
        table={editingTable}
        visible={!!editingTable}
        onClose={() => setEditingTable(null)}
        onUpdated={() => {
          setEditingTable(null);
          refetch();
        }}
        onDeleted={() => {
          setEditingTable(null);
          refetch();
        }}
      />
      <DelayedItemsModal
        table={delayedTable}
        visible={!!delayedTable}
        onClose={() => setDelayedTable(null)}
        now={now}
      />
    </Screen>
  );
}

function TableRow({ table, onEdit, onViewDelayed, now }) {
  const meta = getTableStatusMeta(table.status);
  const waiterInitial = table.currentWaiter?.[0]?.toUpperCase();

  const isDelayed = useMemo(() => {
    if (!table.currentOrders) return false;
    return table.currentOrders.some(order => {
      if (order.status === 'closed' || order.status === 'waiting_for_billing') return false;
      const orderTime = new Date(order.orderedAt).getTime();
      return (order.items || []).some(item => {
        if (item.status === 'delivered' || item.status === 'cancelled') return false;
        if (!item.prepTimeMinutes) return false;
        const prepTimeMs = item.prepTimeMinutes * 60 * 1000;
        return (now - orderTime) > prepTimeMs;
      });
    });
  }, [table.currentOrders, now]);

  const isFullyDelivered = useMemo(() => {
    if (!table.currentOrders || table.currentOrders.length === 0) return false;
    return table.currentOrders.every(order => order.status === 'delivered' || order.status === 'waiting_for_billing');
  }, [table.currentOrders]);

  const isBlinking = isDelayed || isFullyDelivered;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isBlinking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: false })
        ])
      ).start();
    } else {
      anim.stopAnimation();
      anim.setValue(0);
    }
  }, [isBlinking, anim]);

  return (
    <Animated.View 
      className="flex-row items-center px-4 py-3 border-t border-brand-100"
      style={
        isDelayed 
          ? { backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', 'rgba(239,68,68,0.15)'] }) } 
          : isFullyDelivered
          ? { backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', 'rgba(34,197,94,0.15)'] }) }
          : {}
      }
    >
      <View className="w-24">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-lg bg-brand-100 items-center justify-center">
            <Text className="text-xs font-bold text-brand-700">{table.tableNumber === "parcel" ? "Parcel" : table.tableNumber}</Text>
          </View>
        </View>
        {table.location ? <Text className="text-[10px] text-brand-500 mt-1">{table.location}</Text> : null}
      </View>
      <Text className="w-24 text-sm text-brand-700">{table.capacity}-seater</Text>
      <View className="w-28">
        <Badge label={meta.label} tone={meta.tone} />
      </View>
      <View className="w-36 flex-row items-center gap-2">
        {table.currentWaiter ? (
          <>
            <View className="w-6 h-6 rounded-full bg-primary-100 items-center justify-center">
              <Text className="text-[10px] font-bold text-primary-700">{waiterInitial}</Text>
            </View>
            <Text className="text-sm text-brand-900">{table.currentWaiter}</Text>
          </>
        ) : (
          <Text className="text-sm text-brand-400">None</Text>
        )}
      </View>
      <View className="flex-1">
        {table.currentOrders?.length ? (
          <>
            <Text className="text-sm font-bold text-primary-700">
              #{table.currentOrders[0].orderNumber}
              {table.currentOrders.length > 1 ? ` +${table.currentOrders.length - 1} more` : ""}
            </Text>
            <Text className="text-xs text-brand-500 mt-0.5">
              {formatMoney(table.currentOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0))}
            </Text>
          </>
        ) : (
          <Text className="text-sm text-brand-400">—</Text>
        )}
      </View>
      <View className="w-20 flex-row items-center justify-end gap-3">
        {isDelayed && (
          <Pressable onPress={onViewDelayed} hitSlop={6}>
            <Ionicons name="warning-outline" size={18} color={colors.danger[600]} />
          </Pressable>
        )}
        {table.tableNumber !== "parcel" ? (
          <Pressable onPress={onEdit} hitSlop={6}>
            <Ionicons name="pencil-outline" size={16} color={colors.primary[600]} />
          </Pressable>
        ) : (
          <Ionicons name="lock-closed-outline" size={15} color={colors.brand[400]} />
        )}
      </View>
    </Animated.View>
  );
}

const CIRCLE_TONE = {
  success: { bg: "bg-info-50", border: "border-info-200", text: "text-info-700" },
  danger: { bg: "bg-danger-50", border: "border-danger-200", text: "text-danger-700" },
  warning: { bg: "bg-warning-50", border: "border-warning-200", text: "text-warning-700" },
  brand: { bg: "bg-brand-50", border: "border-brand-200", text: "text-brand-700" },
};

function TableGridCard({ table, onEdit, onViewDelayed, now }) {
  const { width } = useWindowDimensions();
  const isLaptop = width >= 1024;
  const isTablet = width >= 640 && width < 1024;

  const meta = getTableStatusMeta(table.status);
  const c = CIRCLE_TONE[meta.tone] || CIRCLE_TONE.brand;

  const isDelayed = useMemo(() => {
    if (!table.currentOrders) return false;
    return table.currentOrders.some(order => {
      if (order.status === 'closed' || order.status === 'waiting_for_billing') return false;
      const orderTime = new Date(order.orderedAt).getTime();
      return (order.items || []).some(item => {
        if (item.status === 'delivered' || item.status === 'cancelled') return false;
        if (!item.prepTimeMinutes) return false;
        const prepTimeMs = item.prepTimeMinutes * 60 * 1000;
        return (now - orderTime) > prepTimeMs;
      });
    });
  }, [table.currentOrders, now]);

  const isFullyDelivered = useMemo(() => {
    if (!table.currentOrders || table.currentOrders.length === 0) return false;
    return table.currentOrders.every(order => order.status === 'delivered' || order.status === 'waiting_for_billing');
  }, [table.currentOrders]);

  const isBlinking = isDelayed || isFullyDelivered;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isBlinking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: false })
        ])
      ).start();
    } else {
      anim.stopAnimation();
      anim.setValue(0);
    }
  }, [isBlinking, anim]);

  return (
    <Pressable
      onPress={isDelayed ? onViewDelayed : table.tableNumber === "parcel" ? undefined : onEdit}
      disabled={!isDelayed && table.tableNumber === "parcel"}
      className="relative"
      style={{
        width: isLaptop ? "calc((100% - 36px) / 4)" : isTablet ? "calc((100% - 12px) / 2)" : "100%",
        minWidth: isLaptop ? 0 : isTablet ? 200 : 0,
      }}
    >
      <Card className="flex-1 justify-between">
        {isBlinking && (
          <Animated.View
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: isDelayed 
                ? anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(239,68,68,0)', 'rgba(239,68,68,0.15)'] })
                : anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(34,197,94,0)', 'rgba(34,197,94,0.15)'] }),
              borderColor: isDelayed
                ? anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(239,68,68,0)', 'rgba(239,68,68,0.8)'] })
                : anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(34,197,94,0)', 'rgba(34,197,94,0.8)'] }),
              borderWidth: 2,
              borderRadius: 12,
              zIndex: 10,
              pointerEvents: 'none'
            }}
          />
        )}
        <View className="flex-row items-start justify-between">
          <Badge label={meta.label} tone={meta.tone} />
          {table.tableNumber !== "parcel" ? (
            <View className="items-end">
              <View className="flex-row items-center gap-1">
                <Ionicons name="people-outline" size={12} color={colors.brand[400]} />
                <Text className="text-xs font-bold text-brand-700">{table.capacity}</Text>
              </View>
              <Text className="text-[10px] text-brand-400">Seats</Text>
            </View>
          ) : (
            <View className="px-2 py-1 rounded-full bg-brand-100">
              <Text className="text-[10px] font-bold text-brand-600">Takeaway</Text>
            </View>
          )}
        </View>

        <View className="items-center justify-center py-5">
          {table.tableNumber === "parcel" ? (
            <View className={`w-16 h-16 rounded-full border-2 items-center justify-center ${c.bg} ${c.border}`}>
              <Ionicons name="bag-handle-outline" size={24} color={colors.danger[700]} />
              <Text className={`text-[10px] font-bold ${c.text} mt-0.5`}>Parcel</Text>
            </View>
          ) : (
            <View className={`w-16 h-16 rounded-full border-2 items-center justify-center ${c.bg} ${c.border}`}>
              <Text className={`text-sm font-bold ${c.text}`}>
                T-{table.tableNumber}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-auto items-center">
          {table.currentOrders?.length ? (
            <Text className="text-xs text-primary-700 font-semibold text-center mt-2">
              #{table.currentOrders[0].orderNumber}
              {table.currentOrders.length > 1 ? ` +${table.currentOrders.length - 1}` : ""} ·{" "}
              {formatMoney(table.currentOrders.reduce((sum, o) => sum + (o.amount ?? 0), 0))}
            </Text>
          ) : null}
          {table.currentWaiter ? (
            <Text className="text-xs text-brand-500 text-center mt-1">Waiter: {table.currentWaiter}</Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const STAT_TONE = {
  brand: { icon: "bg-brand-100", color: colors.brand[700], badgeBg: "bg-brand-100", badgeText: "text-brand-600" },
  success: { icon: "bg-success-100", color: colors.success[700], badgeBg: "bg-success-100", badgeText: "text-success-700" },
  danger: { icon: "bg-danger-100", color: colors.danger[700], badgeBg: "bg-danger-100", badgeText: "text-danger-700" },
  warning: { icon: "bg-warning-100", color: colors.warning[700], badgeBg: "bg-warning-100", badgeText: "text-warning-700" },
};

function StatCard({ icon, label, value, tone = "brand", badge, badgeTone = "brand", dot = false }) {
  const t = STAT_TONE[tone] ?? STAT_TONE.brand;
  const b = STAT_TONE[badgeTone] ?? STAT_TONE.brand;
  return (
    <Card className="flex-1 min-w-[160px] p-4">
      <View className="flex-row items-start justify-between mb-3">
        <View className={`p-2 rounded-lg ${t.icon}`}>
          <Ionicons name={icon} size={18} color={t.color} />
        </View>
        {badge ? (
          <View className={`flex-row items-center gap-1 px-2 py-1 rounded-full ${b.badgeBg}`}>
            {dot ? <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: b.color }} /> : null}
            <Text className={`text-[10px] font-bold uppercase ${b.badgeText}`}>{badge}</Text>
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
          className="absolute top-12 left-0 bg-white border border-brand-200 rounded-lg shadow-lg min-w-[140px]"
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

function DelayedItemsModal({ table, visible, onClose, now }) {
  if (!table) return null;

  const delayedItems = useMemo(() => {
    const items = [];
    (table.currentOrders || []).forEach(order => {
      if (order.status === 'closed' || order.status === 'waiting_for_billing') return;
      const orderTime = new Date(order.orderedAt).getTime();
      (order.items || []).forEach(item => {
        if (item.status === 'delivered' || item.status === 'cancelled') return;
        if (!item.prepTimeMinutes) return;
        const prepTimeMs = item.prepTimeMinutes * 60 * 1000;
        if ((now - orderTime) > prepTimeMs) {
          items.push({ 
            ...item, 
            orderNumber: order.orderNumber, 
            delayMins: Math.floor((now - orderTime - prepTimeMs) / 60000) 
          });
        }
      });
    });
    return items.sort((a, b) => b.delayMins - a.delayMins);
  }, [table, now]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-4" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[440px]" style={{ maxHeight: "90%" }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Card className="gap-3">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <View className="p-1.5 rounded-lg bg-danger-100">
                    <Ionicons name="warning-outline" size={18} color={colors.danger[700]} />
                  </View>
                  <Text className="text-lg font-semibold text-brand-900">Delayed Items - {table.tableNumber === "parcel" ? "Parcel" : `T${table.tableNumber}`}</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.brand[500]} />
                </Pressable>
              </View>

              {delayedItems.length === 0 ? (
                <Text className="text-sm text-brand-500 py-4 text-center">No delayed items.</Text>
              ) : (
                <View className="gap-2 mt-1">
                  {delayedItems.map((item, idx) => (
                    <View key={idx} className="flex-row items-center justify-between p-3 rounded-lg border border-danger-200 bg-danger-50">
                      <View className="flex-1 pr-2">
                        <Text className="text-sm font-semibold text-danger-900" numberOfLines={1}>
                          {item.name} <Text className="text-danger-700">x{item.quantity}</Text>
                        </Text>
                        <Text className="text-xs text-danger-700 mt-0.5">Order #{item.orderNumber} • {item.status}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-bold text-danger-700">+{item.delayMins}m</Text>
                        <Text className="text-[10px] text-danger-600">overdue</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
