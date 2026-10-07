import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, PageHeader, Card, Badge, LoadingIndicator, ErrorBanner, EmptyState } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { customersApi } from "../../api/customers.api";
import { colors } from "../../theme/colors";
import { AddCustomerCard } from "./AddCustomerCard";
import { EditCustomerCard } from "./EditCustomerCard";
import { CustomerHistoryCard } from "./CustomerHistoryCard";

const PAGE_SIZE = 10;

const LOYALTY_OPTIONS = [
  { value: "all", label: "All Tiers" },
  { value: "Platinum", label: "Platinum" },
  { value: "Gold", label: "Gold" },
  { value: "Silver", label: "Silver" },
  { value: "New", label: "New" },
];

const SORT_OPTIONS = [
  { value: "spending", label: "Sort by: Spending" },
  { value: "orders", label: "Sort by: Most Orders" },
  { value: "recent", label: "Sort by: Recent Visit" },
  { value: "name", label: "Sort by: Name (A-Z)" },
];

// Loyalty tiers are computed from lifetime spend/order count — there's no
// stored tier field, this is display-only, not a stored classification.
function getLoyaltyTier(customer) {
  if (customer.totalOrders === 0) return { label: "New", tone: "brand" };
  if (customer.totalSpent >= 1500) return { label: "Platinum", tone: "secondary" };
  if (customer.totalSpent >= 500) return { label: "Gold", tone: "info" };
  return { label: "Silver", tone: "warning" };
}

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

function formatLastVisit(value) {
  if (!value) return "Never";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    const hours = Math.max(1, Math.round((now - date) / (1000 * 60 * 60)));
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  const diffDays = Math.round((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function toCsv(customers) {
  const header = "Name,Mobile,Loyalty,Total Orders,Total Spent,Last Visit";
  const rows = customers.map((c) =>
    [c.name, c.mobileNumber, getLoyaltyTier(c).label, c.totalOrders, c.totalSpent.toFixed(2), c.lastVisit ?? ""].join(",")
  );
  return [header, ...rows].join("\n");
}

export function CustomersListScreen({ navigation, route }) {
  const [query, setQuery] = useState("");
  const [loyaltyFilter, setLoyaltyFilter] = useState("all");
  const [sort, setSort] = useState("spending");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("list");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [historyCustomer, setHistoryCustomer] = useState(null);

  const {
    data: customers,
    loading,
    error,
    refetch,
  } = useAsync(async () => {
    const { data } = await customersApi.list();
    return data;
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.openAdd) {
        setAddModalOpen(true);
        navigation.setParams({ openAdd: undefined });
      }
    }, [route?.params?.openAdd, navigation])
  );

  const all = customers ?? [];

  const stats = useMemo(() => {
    const now = new Date();
    const newThisMonth = all.filter((c) => {
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const returning = all.filter((c) => c.totalOrders > 1).length;
    return {
      total: all.length,
      newThisMonth,
      returningRate: all.length ? Math.round((returning / all.length) * 100) : 0,
      totalOrders: all.reduce((sum, c) => sum + c.totalOrders, 0),
      totalRevenue: all.reduce((sum, c) => sum + c.totalSpent, 0),
    };
  }, [all]);

  const filtered = useMemo(() => {
    let result = all.filter((c) => {
      if (loyaltyFilter !== "all" && getLoyaltyTier(c).label !== loyaltyFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.mobileNumber.includes(q)) return false;
      }
      return true;
    });
    result = [...result].sort((a, b) => {
      if (sort === "spending") return b.totalSpent - a.totalSpent;
      if (sort === "orders") return b.totalOrders - a.totalOrders;
      if (sort === "recent") return new Date(b.lastVisit ?? 0) - new Date(a.lastVisit ?? 0);
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [all, loyaltyFilter, query, sort]);

  useEffect(() => {
    setPage(1);
  }, [loyaltyFilter, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleExport() {
    if (!filtered.length) return;
    if (Platform.OS !== "web") {
      Alert.alert("Export Data", "CSV export is available from the web dashboard.");
      return;
    }
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Screen>
      <PageHeader
        title="Customer Management"
        right={
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleExport}
              className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-brand-300 bg-white"
            >
              <Ionicons name="download-outline" size={16} color={colors.brand[600]} />
              <Text className="text-sm font-semibold text-brand-600">Export Data</Text>
            </Pressable>
            <Pressable
              onPress={() => setAddModalOpen(true)}
              className="flex-row items-center gap-2 bg-primary-700 active:bg-primary-800 rounded-lg px-4 py-2.5"
            >
              <Ionicons name="person-add-outline" size={16} color="#fff" />
              <Text className="text-sm font-semibold text-white">Add Customer</Text>
            </Pressable>
          </View>
        }
      />

      <View className="flex-row flex-wrap gap-3 mb-5">
        <StatCard label="Total Customers" value={stats.total} badge={`+${stats.newThisMonth} New`} badgeTone="success" />
        <StatCard label="New This Month" value={stats.newThisMonth} tone="secondary" />
        <StatCard label="Returning Rate" value={`${stats.returningRate}%`} tone="info" />
        <StatCard label="Total Orders" value={stats.totalOrders} tone="brand" />
        <StatCard label="Total Revenue" value={formatMoney(stats.totalRevenue)} tone="danger" />
      </View>

      <View className="flex-row flex-wrap items-center gap-3 mb-5" style={{ zIndex: 20 }}>
        <View className="flex-1 min-w-[200px] flex-row items-center gap-2 border border-brand-300 rounded-lg px-3.5 py-2.5 bg-white">
          <Ionicons name="search-outline" size={16} color={colors.brand[400]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or mobile number..."
            placeholderTextColor={colors.brand[400]}
            className="flex-1 text-sm text-brand-900"
            style={{ outlineStyle: "none" }}
          />
        </View>
        <Dropdown value={loyaltyFilter} onChange={setLoyaltyFilter} options={LOYALTY_OPTIONS} />
        <Dropdown value={sort} onChange={setSort} options={SORT_OPTIONS} />
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
        <EmptyState title="No customers found" subtitle="Try a different search or filter." />
      ) : null}

      {pageItems.length > 0 && view === "list" ? (
        <Card className="!p-0 overflow-hidden mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="min-w-[820px]">
              <View className="flex-row bg-brand-50 px-4 py-3">
                <Text className="flex-1 text-xs font-semibold text-brand-500">CUSTOMER NAME</Text>
                <Text className="w-32 text-xs font-semibold text-brand-500">MOBILE NUMBER</Text>
                <Text className="w-24 text-xs font-semibold text-brand-500">LOYALTY</Text>
                <Text className="w-20 text-xs font-semibold text-brand-500">ORDERS</Text>
                <Text className="w-24 text-xs font-semibold text-brand-500">TOTAL SPENT</Text>
                <Text className="w-28 text-xs font-semibold text-brand-500">LAST VISIT</Text>
                <Text className="w-20 text-xs font-semibold text-brand-500 text-right">ACTIONS</Text>
              </View>
              {pageItems.map((c) => (
                <CustomerRow
                  key={c._id}
                  customer={c}
                  onViewHistory={() => setHistoryCustomer(c)}
                  onEdit={() => setEditingCustomer(c)}
                />
              ))}
            </View>
          </ScrollView>
        </Card>
      ) : null}

      {pageItems.length > 0 && view === "grid" ? (
        <View className="flex-row flex-wrap gap-3 mb-4">
          {pageItems.map((c) => (
            <CustomerGridCard
              key={c._id}
              customer={c}
              onViewHistory={() => setHistoryCustomer(c)}
              onEdit={() => setEditingCustomer(c)}
            />
          ))}
        </View>
      ) : null}

      {filtered.length > 0 ? (
        <View className="flex-row items-center justify-between flex-wrap gap-3">
          <Text className="text-sm text-brand-500">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} customers
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

      <AddCustomerCard
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={() => {
          setAddModalOpen(false);
          refetch();
        }}
      />
      <EditCustomerCard
        customer={editingCustomer}
        visible={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onUpdated={() => {
          setEditingCustomer(null);
          refetch();
        }}
      />
      <CustomerHistoryCard
        customer={historyCustomer}
        visible={!!historyCustomer}
        onClose={() => setHistoryCustomer(null)}
      />
    </Screen>
  );
}

function CustomerRow({ customer, onViewHistory, onEdit }) {
  const tier = getLoyaltyTier(customer);
  const initial = customer.name?.[0]?.toUpperCase() ?? "?";

  return (
    <View className="flex-row items-center px-4 py-3 border-t border-brand-100">
      <View className="flex-1 flex-row items-center gap-3 pr-2">
        <View className="w-9 h-9 rounded-full bg-primary-100 items-center justify-center">
          <Text className="text-xs font-bold text-primary-700">{initial}</Text>
        </View>
        <Text className="text-sm font-semibold text-brand-900">{customer.name}</Text>
      </View>
      <Text className="w-32 text-sm text-brand-700">{customer.mobileNumber}</Text>
      <View className="w-24">
        <Badge label={tier.label} tone={tier.tone} />
      </View>
      <Text className="w-20 text-sm text-brand-900">{customer.totalOrders}</Text>
      <Text className="w-24 text-sm font-bold text-primary-700">{formatMoney(customer.totalSpent)}</Text>
      <Text className="w-28 text-xs text-brand-500">{formatLastVisit(customer.lastVisit)}</Text>
      <View className="w-20 flex-row items-center justify-end gap-3">
        <Pressable onPress={onViewHistory} hitSlop={6}>
          <Ionicons name="time-outline" size={17} color={colors.brand[500]} />
        </Pressable>
        <Pressable onPress={onEdit} hitSlop={6}>
          <Ionicons name="pencil-outline" size={16} color={colors.primary[600]} />
        </Pressable>
      </View>
    </View>
  );
}

function CustomerGridCard({ customer, onViewHistory, onEdit }) {
  const tier = getLoyaltyTier(customer);
  return (
    <Card className="w-[47%] min-w-[200px] gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-brand-900">{customer.name}</Text>
        <Badge label={tier.label} tone={tier.tone} />
      </View>
      <Text className="text-xs text-brand-500">{customer.mobileNumber}</Text>
      <Text className="text-xs text-brand-700">
        {customer.totalOrders} orders · {formatMoney(customer.totalSpent)}
      </Text>
      <Text className="text-xs text-brand-500">Last visit: {formatLastVisit(customer.lastVisit)}</Text>
      <View className="flex-row gap-3 mt-1">
        <Pressable onPress={onViewHistory} hitSlop={6}>
          <Ionicons name="time-outline" size={16} color={colors.brand[500]} />
        </Pressable>
        <Pressable onPress={onEdit} hitSlop={6}>
          <Ionicons name="pencil-outline" size={16} color={colors.primary[600]} />
        </Pressable>
      </View>
    </Card>
  );
}

const STAT_TONE = {
  brand: { color: colors.brand[700] },
  secondary: { color: colors.secondary[700] },
  success: { color: colors.success[700] },
  danger: { color: colors.danger[700] },
  info: { color: colors.info[700] },
};

function StatCard({ label, value, tone = "brand", badge, badgeTone = "brand" }) {
  const b = STAT_TONE[badgeTone] ?? STAT_TONE.brand;
  return (
    <Card className="flex-1 min-w-[160px] p-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-semibold text-brand-500 uppercase">{label}</Text>
        {badge ? <Text className="text-xs font-bold" style={{ color: b.color }}>{badge}</Text> : null}
      </View>
      <Text className={`text-2xl font-bold ${tone === "brand" ? "text-brand-900" : ""}`} style={tone !== "brand" ? { color: STAT_TONE[tone]?.color } : undefined}>
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
