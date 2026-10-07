import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, PageHeader, Card, Badge, LoadingIndicator, ErrorBanner, EmptyState } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { usersApi } from "../../api/users.api";
import { colors } from "../../theme/colors";
import { AddUserCard } from "./AddUserCard";
import { EditUserCard } from "./EditUserCard";

const PAGE_SIZE = 10;
const ROLE_TONE = { admin: "info", manager: "secondary", waiter: "primary" };
const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "waiter", label: "Waiter" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function UsersListScreen({ navigation, route }) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addPresetRole, setAddPresetRole] = useState(undefined);
  const [editingUser, setEditingUser] = useState(null);

  // The Dashboard's Quick Actions navigate here with { openAdd, presetRole }
  // instead of driving the modal remotely — see AdminDashboardScreen.js.
  useFocusEffect(
    useCallback(() => {
      if (route.params?.openAdd) {
        setAddPresetRole(route.params.presetRole);
        setAddModalOpen(true);
        navigation.setParams({ openAdd: undefined, presetRole: undefined });
      }
    }, [route.params?.openAdd, route.params?.presetRole, navigation])
  );

  const {
    data: users,
    loading,
    error,
    refetch,
  } = useAsync(async () => {
    // Unlike the previous version of this screen, Admin accounts are shown
    // here too (read-only — see UserRow) since this design surfaces them in
    // the role breakdown and table; they're just not editable/deactivatable
    // from this UI (see seedAdmin.js — admins are provisioned out-of-band).
    const { data } = await usersApi.list();
    return data;
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filtered = useMemo(() => {
    return (users ?? []).filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (![u.name, u.email, u.id].some((field) => field?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, query]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter, query]);

  const stats = useMemo(() => {
    const all = users ?? [];
    return {
      total: all.length,
      admins: all.filter((u) => u.role === "admin").length,
      managers: all.filter((u) => u.role === "manager").length,
      waiters: all.filter((u) => u.role === "waiter").length,
      active: all.filter((u) => u.isActive).length,
      inactive: all.filter((u) => !u.isActive).length,
    };
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function confirmDeactivate(user) {
    Alert.alert("Deactivate User", `Deactivate ${user.name}? They won't be able to sign in until reactivated.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deactivate",
        style: "destructive",
        onPress: async () => {
          setActionError(null);
          try {
            await usersApi.update(user.id, { isActive: false });
            refetch();
          } catch (err) {
            setActionError(err.message);
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <PageHeader
        title="User Management"
        subtitle="Oversee system access and staff permissions across all locations."
        right={
          <Pressable
            onPress={() => {
              setAddPresetRole(undefined);
              setAddModalOpen(true);
            }}
            className="flex-row items-center gap-2 bg-primary-700 active:bg-primary-800 rounded-lg px-4 py-2.5"
          >
            <Ionicons name="person-add-outline" size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">Add New User</Text>
          </Pressable>
        }
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
        <View className="flex-row gap-3 items-start">
          <MiniStat icon="people-outline" label="Total Users" value={stats.total} tone="primary" />
          <MiniStat icon="shield-checkmark-outline" label="Admins" value={stats.admins} tone="info" />
          <MiniStat icon="person-outline" label="Managers" value={stats.managers} tone="secondary" />
          <MiniStat icon="restaurant-outline" label="Waiters" value={stats.waiters} tone="brand" />
          <MiniStat label="Active" value={stats.active} tone="success" dot />
          <MiniStat label="Inactive" value={stats.inactive} tone="danger" dot />
        </View>
      </ScrollView>

      <View className="flex-row flex-wrap items-center gap-3 mb-5" style={{ zIndex: 20 }}>
        <View className="flex-1 min-w-[220px] flex-row items-center gap-2 border border-brand-300 rounded-lg px-3.5 py-2.5 bg-white">
          <Ionicons name="search-outline" size={16} color={colors.brand[400]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, email, or ID"
            placeholderTextColor={colors.brand[400]}
            className="flex-1 text-sm text-brand-900"
            style={{ outlineStyle: "none" }}
          />
        </View>
        <Dropdown value={roleFilter} onChange={setRoleFilter} options={ROLE_OPTIONS} />
        <Dropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <Pressable
          onPress={() => Alert.alert("More Filters", "Coming soon.")}
          className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-brand-300 bg-white"
        >
          <Ionicons name="options-outline" size={16} color={colors.brand[600]} />
          <Text className="text-sm font-medium text-brand-600">More Filters</Text>
        </Pressable>
      </View>

      {loading ? <LoadingIndicator /> : null}
      <ErrorBanner message={error ?? actionError} />
      {!loading && filtered.length === 0 ? (
        <EmptyState title="No users found" subtitle="Try a different search or filter." />
      ) : null}

      {pageItems.length > 0 ? (
        <Card className="!p-0 overflow-hidden mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="min-w-[760px]">
              <View className="flex-row bg-brand-50 px-4 py-3">
                <Text className="w-14 text-xs font-semibold text-brand-500">PROFILE</Text>
                <Text className="flex-1 text-xs font-semibold text-brand-500">NAME &amp; EMAIL</Text>
                <Text className="w-32 text-xs font-semibold text-brand-500">MOBILE</Text>
                <Text className="w-28 text-xs font-semibold text-brand-500">ROLE</Text>
                <Text className="w-24 text-xs font-semibold text-brand-500">STATUS</Text>
                <Text className="w-28 text-xs font-semibold text-brand-500">CREATED</Text>
                <Text className="w-24 text-xs font-semibold text-brand-500 text-right">ACTIONS</Text>
              </View>
              {pageItems.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  navigation={navigation}
                  onEdit={() => setEditingUser(u)}
                  onDeactivate={() => confirmDeactivate(u)}
                />
              ))}
            </View>
          </ScrollView>
        </Card>
      ) : null}

      {filtered.length > 0 ? (
        <View className="flex-row items-center justify-between flex-wrap gap-3">
          <Text className="text-sm text-brand-500">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
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

      <AddUserCard
        visible={addModalOpen}
        presetRole={addPresetRole}
        onClose={() => setAddModalOpen(false)}
        onCreated={() => {
          setAddModalOpen(false);
          refetch();
        }}
      />
      <EditUserCard
        user={editingUser}
        visible={!!editingUser}
        onClose={() => setEditingUser(null)}
        onUpdated={() => {
          setEditingUser(null);
          refetch();
        }}
      />
    </Screen>
  );
}

function UserRow({ user, navigation, onEdit, onDeactivate }) {
  const isAdmin = user.role === "admin";
  const initial = user.name?.[0]?.toUpperCase() ?? "?";

  return (
    <View className="flex-row items-center px-4 py-3 border-t border-brand-100">
      <View className="w-14">
        <View className="w-9 h-9 rounded-full bg-primary-100 items-center justify-center">
          <Text className="text-xs font-bold text-primary-700">{initial}</Text>
        </View>
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-sm font-semibold text-brand-900">{user.name}</Text>
        <Text className="text-xs text-brand-500 mt-0.5">{user.email}</Text>
      </View>
      <Text className="w-32 text-sm text-brand-700">{user.phone}</Text>
      <View className="w-28">
        <Badge label={user.role} tone={ROLE_TONE[user.role] ?? "brand"} />
      </View>
      <View className="w-24 flex-row items-center gap-1.5">
        <View className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-success-500" : "bg-danger-500"}`} />
        <Text className={`text-xs font-medium ${user.isActive ? "text-success-700" : "text-danger-700"}`}>
          {user.isActive ? "Active" : "Inactive"}
        </Text>
      </View>
      <Text className="w-28 text-xs text-brand-500">{formatDate(user.createdAt)}</Text>
      <View className="w-24 flex-row items-center justify-end gap-3">
        <Pressable onPress={() => navigation.navigate("UserDetails", { user })} hitSlop={6}>
          <Ionicons name="eye-outline" size={17} color={colors.brand[500]} />
        </Pressable>
        {isAdmin ? null : (
          <>
            <Pressable onPress={onEdit} hitSlop={6}>
              <Ionicons name="pencil-outline" size={16} color={colors.primary[600]} />
            </Pressable>
            <Pressable onPress={onDeactivate} hitSlop={6} disabled={!user.isActive}>
              <Ionicons name="trash-outline" size={16} color={user.isActive ? colors.danger[600] : colors.brand[300]} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const MINI_TONE = {
  primary: { bg: "bg-primary-100", color: colors.primary[700] },
  info: { bg: "bg-info-100", color: colors.info[700] },
  secondary: { bg: "bg-secondary-100", color: colors.secondary[700] },
  brand: { bg: "bg-brand-100", color: colors.brand[700] },
  success: { bg: "bg-success-100", color: colors.success[700] },
  danger: { bg: "bg-danger-100", color: colors.danger[700] },
};

function MiniStat({ icon, label, value, tone, dot = false }) {
  const t = MINI_TONE[tone] ?? MINI_TONE.brand;
  return (
    <Card className="min-w-[130px] p-3">
      <View className={`w-7 h-7 rounded-md items-center justify-center mb-2 ${dot ? "" : t.bg}`}>
        {dot ? (
          <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
        ) : (
          <Ionicons name={icon} size={14} color={t.color} />
        )}
      </View>
      <Text className="text-[10px] font-semibold text-brand-500 tracking-wide">{label.toUpperCase()}</Text>
      <Text className="text-lg font-bold text-brand-900 mt-0.5">{value}</Text>
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
