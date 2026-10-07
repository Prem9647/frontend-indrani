import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Alert, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { Screen, Card, Badge, Button, TextField, LoadingIndicator, ErrorBanner, Divider, PageHeader, CancelPromptModal } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { useAuthStore } from "../../stores/authStore";
import { SOCKET_URL } from "../../lib/env";
import { ordersApi } from "../../api/orders.api";
import { categoriesApi } from "../../api/categories.api";
import { menuItemsApi } from "../../api/menuItems.api";
import { customersApi } from "../../api/customers.api";
import { getOrderStatusMeta, getItemStatusMeta, getTableStatusMeta } from "../../theme/status";
import { colors } from "../../theme/colors";
import { MenuItemPicker, MenuSearchFilter, filterMenu } from "./MenuItemPicker";
import { isCoolDrink } from "../admin/BillingScreen";

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// A table's order screen — one screen, two modes, both sharing the same
// header/card/bill-summary layout. No orderId param means the table is
// still available: build a brand new order (customer + item picker). An
// orderId means there's already an active order for that table: view/manage
// it. See WaiterTablesScreen.js and WaiterDashboardScreen.js for the two
// entry points (available vs. occupied table taps).
export function OrderDetailScreen({ route, navigation }) {
  const { orderId, tableId, tableNumber, capacity } = route.params;

  if (!orderId) {
    return <NewOrderView tableId={tableId} tableNumber={tableNumber} capacity={capacity} navigation={navigation} />;
  }
  return <ExistingOrderView orderId={orderId} tableNumber={tableNumber} navigation={navigation} />;
}

const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  mobileNumber: z.string().min(6, "Enter a valid mobile number"),
  seatNumber: z.string().optional(),
});

const STEP_LABELS = ["Customer", "Menu", "Summary"];

// Three-step new-order builder: Customer Details (with search-by-mobile
// auto-fill, mirroring the server's own findOrCreateByMobile lookup) ->
// Menu Selection (search + category filter) -> Order Summary (review,
// Submit/Cancel) — see .claude/skills/restaurant-workflow/skill.md.
function NewOrderView({ tableId, tableNumber, capacity, navigation }) {
  const [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [menuQuery, setMenuQuery] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [lookupStatus, setLookupStatus] = useState("idle"); // idle | searching | found | not_found

  const { data, loading, error } = useAsync(async () => {
    const [{ data: categories }, { data: items }] = await Promise.all([
      categoriesApi.list(true),
      menuItemsApi.list({ availableOnly: true }),
    ]);
    return { categories, items };
  }, []);

  const {
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(customerSchema), defaultValues: { name: "", mobileNumber: "", seatNumber: "" } });

  const mobileNumber = watch("mobileNumber");

  // Debounced lookup as the waiter types a mobile number — auto-fills the
  // name on an exact match without clobbering a name already typed in.
  useEffect(() => {
    const trimmed = mobileNumber?.trim() ?? "";
    if (trimmed.length < 6) {
      setLookupStatus("idle");
      return undefined;
    }
    setLookupStatus("searching");
    const handle = setTimeout(async () => {
      try {
        const { data: matches } = await customersApi.search(trimmed);
        const exact = matches.find((c) => c.mobileNumber === trimmed);
        if (exact) {
          setLookupStatus("found");
          if (!getValues("name")) setValue("name", exact.name);
        } else {
          setLookupStatus("not_found");
        }
      } catch {
        setLookupStatus("idle");
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [mobileNumber, getValues, setValue]);

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

  const totalQuantity = selectedItems.reduce((sum, { quantity }) => sum + quantity, 0);
  const orderTotal = selectedItems.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);

  const { filteredCategories, filteredItems } = useMemo(
    () => filterMenu(data?.categories, data?.items, menuQuery, categoryId),
    [data?.categories, data?.items, menuQuery, categoryId]
  );

  async function goToMenu() {
    const valid = await trigger(["name", "mobileNumber"]);
    if (valid) setStep(1);
  }

  function goToSummary() {
    if (selectedItems.length === 0) {
      setSubmitError("Select at least one item");
      return;
    }
    setSubmitError(null);
    setStep(2);
  }

  async function onSubmit(customer) {
    setSubmitError(null);
    try {
      const { data: created } = await ordersApi.create({
        tableId,
        seatNumber: customer.seatNumber,
        customer,
        items: selectedItems.map(({ item, quantity }) => ({ menuItemId: item._id, quantity })),
      });
      // Deferred to the next tick: navigating synchronously right after this
      // await races React Navigation's context on React 19 (see
      // https://github.com/expo/expo/issues/38191) and crashes with
      // "Couldn't find a navigation context".
      setTimeout(() => navigation.replace("OrderDetail", { orderId: created.order._id, tableNumber }), 0);
    } catch (err) {
      setSubmitError(err.message);
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
        badge={<Badge label="New Order" tone="info" />}
        subtitle={capacity ? `${capacity} Seats` : null}
        right={<StepIndicator step={step} />}
      />

      {loading ? <LoadingIndicator /> : null}
      <ErrorBanner message={error} />

      {step === 0 ? (
        <Card className="gap-3 max-w-[480px]">
          <Text className="text-base font-semibold text-brand-900">Customer Details</Text>
          <Controller
            control={control}
            name="mobileNumber"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Mobile Number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.mobileNumber?.message}
                keyboardType="phone-pad"
              />
            )}
          />
          {lookupStatus === "searching" ? (
            <Text className="text-xs text-brand-500">Searching…</Text>
          ) : lookupStatus === "found" ? (
            <Text className="text-xs text-success-700">Existing customer found — name filled in below.</Text>
          ) : lookupStatus === "not_found" ? (
            <Text className="text-xs text-brand-500">No match — this will create a new customer.</Text>
          ) : null}
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField label="Name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
            )}
          />
          <Controller
            control={control}
            name="seatNumber"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField label="Seat Number (Optional)" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.seatNumber?.message} />
            )}
          />
          <Button label="Next: Select Items" onPress={goToMenu} className="mt-2" />
        </Card>
      ) : null}

      {step === 1 ? (
        <View className="gap-4">
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

          <ErrorBanner message={submitError} />
          <Card className="flex-row items-center justify-between flex-wrap gap-3">
            <Text className="text-sm text-brand-500">
              {selectedItems.length} item{selectedItems.length === 1 ? "" : "s"} · {totalQuantity} qty ·{" "}
              {formatMoney(orderTotal)}
            </Text>
            <View className="flex-row gap-2">
              <Button label="Back" variant="outline" onPress={() => setStep(0)} />
              <Button label="Review Order" onPress={goToSummary} />
            </View>
          </Card>
        </View>
      ) : null}

      {step === 2 ? (
        <View className="flex-row flex-wrap gap-5">
          <View style={{ flexGrow: 2, flexShrink: 1, flexBasis: 400 }} className="gap-5">
            <Card className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-brand-900">Order Summary</Text>
                <Pressable onPress={() => setStep(1)}>
                  <Text className="text-xs font-semibold text-primary-700">Back to Menu</Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-5">
                <SummaryField label="Customer" value={getValues("name")} />
                <SummaryField label="Mobile" value={getValues("mobileNumber")} />
                <SummaryField label="Seat" value={getValues("seatNumber")} />
                <SummaryField label="Table" value={`Table ${tableNumber}`} />
              </View>
            </Card>
            <Card className="!p-0 overflow-hidden">
              <View className="px-5 py-3.5 border-b border-brand-100">
                <Text className="text-base font-semibold text-brand-900">Ordered Items</Text>
              </View>
              <View className="px-5">
                {selectedItems.map(({ item, quantity }, index) => (
                  <View
                    key={item._id}
                    className={`flex-row items-center justify-between py-3 ${index > 0 ? "border-t border-brand-100" : ""}`}
                  >
                    <Text className="text-sm font-medium text-brand-900 flex-1 pr-2">{item.name}</Text>
                    <Text className="text-xs text-brand-500 mr-3">×{quantity}</Text>
                    <Text className="text-sm font-bold text-primary-700">{formatMoney(item.price * quantity)}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>

          <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 260 }}>
            <Card className="gap-3">
              <Text className="text-sm font-semibold text-brand-900">Bill Summary</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-brand-500">Total Quantity</Text>
                <Text className="text-sm font-semibold text-brand-900">{totalQuantity}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-brand-500">Items</Text>
                <Text className="text-sm font-semibold text-brand-900">{selectedItems.length}</Text>
              </View>
              <Divider />
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-brand-900">Total Amount</Text>
                <Text className="text-xl font-bold text-primary-700">{formatMoney(orderTotal)}</Text>
              </View>
              <ErrorBanner message={submitError} />
              <View className="gap-2 mt-1">
                <Button label="Submit Order" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
                <Button label="Cancel" variant="outline" onPress={() => navigation.goBack()} />
              </View>
            </Card>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function StepIndicator({ step }) {
  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      {STEP_LABELS.map((label, i) => (
        <View key={label} className="flex-row items-center gap-1.5">
          <View className={`w-5 h-5 rounded-full items-center justify-center ${i <= step ? "bg-primary-700" : "bg-brand-200"}`}>
            <Text className={`text-[10px] font-bold ${i <= step ? "text-white" : "text-brand-500"}`}>{i + 1}</Text>
          </View>
          <Text className={`text-xs font-semibold ${i === step ? "text-primary-700" : "text-brand-400"}`}>{label}</Text>
          {i < STEP_LABELS.length - 1 ? (
            <Ionicons name="chevron-forward" size={12} color={colors.brand[300]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function SummaryField({ label, value }) {
  return (
    <View>
      <Text className="text-[10px] font-semibold text-brand-400 uppercase">{label}</Text>
      <Text className="text-sm font-semibold text-brand-900 mt-0.5">{value || "—"}</Text>
    </View>
  );
}

// Each item is delivered independently (see WaiterDashboardScreen.js and
// order.service.js's deliverOrderItem) — the order's own status badge is
// derived from all of them (created/preparing/partially_delivered/
// delivered) rather than following item delivery step by step, so a fresh
// item added after the rest were delivered correctly drops the order back
// to "partially_delivered". "Add More Items" and "Request Bill" stay
// available the whole time up to that point — requesting the bill is a
// separate, always-available, explicit waiter action (never triggered by
// item delivery) that locks the order and hands it to the manager's
// billing queue; see .claude/skills/restaurant-workflow.
function ExistingOrderView({ orderId, tableNumber, navigation }) {
  const token = useAuthStore((s) => s.token);
  const [removingId, setRemovingId] = useState(null);
  const [quantityUpdatingId, setQuantityUpdatingId] = useState(null);
  const [deliveringItemId, setDeliveringItemId] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [cancelPrompt, setCancelPrompt] = useState(null);

  const {
    data,
    loading,
    error,
    refetch,
  } = useAsync(async () => {
    const { data } = await ordersApi.get(orderId);
    return data;
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Live updates from other devices touching this same order (another
  // waiter, a manager) — no page refresh needed. See .claude/skills/socketio.
  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { channel: "dashboard", token } });
    const refreshIfThisOrder = (payload) => {
      if (payload?.orderId === orderId) refetch();
    };
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("order:updated", refreshIfThisOrder);
    socket.on("order:item-delivered", refreshIfThisOrder);
    socket.on("order:status-changed", refreshIfThisOrder);
    socket.on("order:bill-requested", refreshIfThisOrder);
    return () => socket.disconnect();
  }, [token, orderId, refetch]);

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

  async function handleRemoveItem(item) {
    let cancelQuantity = item.quantity;
    if (item.quantity > 1) {
      const result = await new Promise((resolve) => {
        setCancelPrompt({ item, resolve });
      });
      setCancelPrompt(null);
      if (!result) return;
      
      cancelQuantity = parseInt(result, 10);
      if (isNaN(cancelQuantity) || cancelQuantity < 1 || cancelQuantity > item.quantity) {
        Alert.alert("Invalid quantity.");
        return;
      }
    } else {
      const confirmed = await confirmAction("Cancel Item", `Are you sure you want to cancel ${item.menuItemId?.name}?`);
      if (!confirmed) return;
    }

    setRemovingId(item._id);
    setActionError(null);
    try {
      await ordersApi.removeItem(orderId, item._id, cancelQuantity);
      await refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  async function handleQuantityChange(item, delta) {
    const nextQuantity = item.quantity + delta;
    if (nextQuantity < 1) return;
    setQuantityUpdatingId(item._id);
    setActionError(null);
    try {
      await ordersApi.updateItemQuantity(orderId, item._id, nextQuantity);
      await refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setQuantityUpdatingId(null);
    }
  }

  async function handleDeliverItem(item) {
    const confirmed = await confirmAction("Deliver Item", `Mark ${item.menuItemId?.name} as delivered?`);
    if (!confirmed) return;

    setDeliveringItemId(item._id);
    setActionError(null);
    try {
      await ordersApi.deliverItem(orderId, item._id);
      await refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeliveringItemId(null);
    }
  }

  async function handleRequestBill() {
    const confirmed = await confirmAction("Request Bill", "Are you sure you want to request the bill for this table?");
    if (!confirmed) return;

    setStatusUpdating(true);
    setActionError(null);
    try {
      await ordersApi.requestBill(orderId);
      await refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <ErrorBanner message={error ?? "Order not found"} />
      </Screen>
    );
  }

  const { order, items } = data;
  const statusMeta = getOrderStatusMeta(order.status);
  const tableMeta = getTableStatusMeta("occupied");
  const billRequested = order.status === "waiting_for_billing";
  const orderLocked = billRequested || order.status === "closed";
  // Add More Items / Request Bill stay available up to the point billing is
  // requested — neither is gated on every item being delivered first.
  const canAddItems = !orderLocked;
  const canRequestBill = !orderLocked;

  const preparingCount = items.filter((item) => item.status === "preparing").length;
  const deliveredCount = items.filter((item) => item.status === "delivered").length;

  // Item-level actions (cancel / quantity / deliver) live outside the
  // Itemized List card — tapping a row just selects it, and the action bar
  // below the card acts on whichever item is selected. Both flags share the
  // same eligibility: locked once the order is billed/closed or the item is
  // already delivered/cancelled.
  function getItemFlags(item) {
    const eligible = canAddItems && item.status !== "delivered" && item.status !== "cancelled";
    return { editable: eligible, canDeliverThis: eligible };
  }
  const selectedItem = items.find((item) => item._id === selectedItemId) ?? null;
  const selectedFlags = selectedItem ? getItemFlags(selectedItem) : null;

  let taxableSubtotal = 0;
  let exemptSubtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;

  items.filter((item) => item.status !== "cancelled").forEach((item) => {
    if (isCoolDrink(item)) {
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

  return (
    <Screen>
      <PageHeader
        left={
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.brand[700]} />
          </Pressable>
        }
        title={`Table ${tableNumber ?? order.tableId?.tableNumber}`}
        badge={<Badge label={tableMeta.label} tone={tableMeta.tone} />}
        subtitle={`${order.tableId?.capacity ? `${order.tableId.capacity} Seats · ` : ""}Server: ${order.waiterId?.name ?? "—"}`}
        right={
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
        }
      />

      {/* Stat cards */}
      <View className="flex-row flex-wrap gap-3 mb-5">
        <StatCard icon="receipt-outline" label="Items" value={items.filter(i => i.status !== "cancelled").length} tone="primary" />
        <StatCard icon="flame-outline" label="Preparing" value={preparingCount} tone="secondary" />
        <StatCard icon="checkmark-circle-outline" label="Delivered" value={deliveredCount} tone="success" />
        <StatCard icon="cash-outline" label="Order Total" value={formatMoney(order.totalAmount)} tone="brand" />
      </View>

      <ErrorBanner message={actionError} />

      <View className="flex-row flex-wrap gap-5">
        <View style={{ flexGrow: 2, flexShrink: 1, flexBasis: 480 }} className="gap-5">
          <Card className="gap-3">
            <View className="flex-row items-start justify-between">
              <Text className="text-base font-semibold text-brand-900">Active Order</Text>
              <Text className="text-xs text-brand-500">
                Order #{order.orderNumber} · {formatTime(order.orderedAt)}
              </Text>
            </View>
            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <View className="flex-row items-center gap-5 flex-wrap">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="person-outline" size={14} color={colors.brand[400]} />
                  <View>
                    <Text className="text-[10px] font-semibold text-brand-400 uppercase">Customer</Text>
                    <Text className="text-sm font-semibold text-brand-900">{order.customerId?.name ?? "—"}{order.seatNumber ? ` (Seat ${order.seatNumber})` : ""}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="call-outline" size={14} color={colors.brand[400]} />
                  <View>
                    <Text className="text-[10px] font-semibold text-brand-400 uppercase">Mobile</Text>
                    <Text className="text-sm font-semibold text-brand-900">{order.customerId?.mobileNumber ?? "—"}</Text>
                  </View>
                </View>
              </View>
              <Pressable onPress={() => Alert.alert("Edit Details", "Coming soon.")}>
                <Text className="text-xs font-semibold text-primary-700">Edit Details</Text>
              </Pressable>
            </View>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-brand-100 flex-wrap gap-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="receipt-outline" size={16} color={colors.primary[700]} />
                <Text className="text-base font-semibold text-brand-900">Itemized List</Text>
                <Badge label={statusMeta.label} tone={statusMeta.tone} />
              </View>
              <Text className="text-xs text-brand-500">
                {items.filter(i => i.status !== "cancelled").length} item{items.filter(i => i.status !== "cancelled").length === 1 ? "" : "s"}
              </Text>
            </View>

            <View className="px-5">
              {items.map((item, index) => {
                const itemMeta = getItemStatusMeta(item.status);
                const cancelled = item.status === "cancelled";
                const { editable, canDeliverThis } = getItemFlags(item);
                const actionable = editable || canDeliverThis;
                const isSelected = item._id === selectedItemId;
                return (
                  <Pressable
                    key={item._id}
                    disabled={!actionable}
                    onPress={() => setSelectedItemId((id) => (id === item._id ? null : item._id))}
                    className={`flex-row items-center py-3.5 px-2 -mx-2 rounded-lg ${
                      index > 0 ? "border-t border-brand-100" : ""
                    } ${isSelected ? "bg-primary-50" : ""}`}
                  >
                    <View className="w-11 h-11 rounded-lg bg-brand-100 items-center justify-center mr-3">
                      <Ionicons name="fast-food-outline" size={18} color={colors.brand[500]} />
                    </View>
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text
                          className={`text-sm font-semibold ${cancelled ? "text-brand-400 line-through" : "text-brand-900"}`}
                        >
                          {item.menuItemId?.name}
                        </Text>
                        <Badge label={itemMeta.label} tone={itemMeta.tone} />
                      </View>
                      {item.menuItemId?.description ? (
                        <Text className="text-xs text-brand-500 mt-0.5" numberOfLines={1}>
                          {item.menuItemId.description}
                        </Text>
                      ) : null}
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-brand-500">×{item.quantity}</Text>
                      <Text
                        className={`text-sm font-bold mt-1 ${cancelled ? "text-brand-400 line-through" : "text-primary-700"}`}
                      >
                        {formatMoney(item.subtotal)}
                      </Text>
                    </View>
                    {actionable ? (
                      <Ionicons
                        name={isSelected ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={colors.brand[400]}
                        style={{ marginLeft: 10 }}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Item actions live outside the card — acting on whichever row
              is selected above, rather than being embedded per-row. */}
          {selectedItem && selectedFlags && (selectedFlags.editable || selectedFlags.canDeliverThis) ? (
            <View className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3.5 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-brand-900 flex-1 pr-2" numberOfLines={1}>
                  {selectedItem.menuItemId?.name}
                </Text>
                <Pressable onPress={() => setSelectedItemId(null)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={colors.brand[500]} />
                </Pressable>
              </View>
              <View className="flex-row items-center justify-between flex-wrap gap-3">
                {selectedFlags.editable ? (
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      onPress={() => handleQuantityChange(selectedItem, -1)}
                      disabled={quantityUpdatingId === selectedItem._id || selectedItem.quantity <= 1}
                      hitSlop={8}
                      className={`w-8 h-8 rounded-full items-center justify-center border border-brand-300 bg-white ${
                        selectedItem.quantity <= 1 ? "opacity-40" : ""
                      }`}
                    >
                      <Ionicons name="remove" size={16} color={colors.brand[700]} />
                    </Pressable>
                    <Text className="text-sm font-semibold text-brand-900 w-5 text-center">
                      {selectedItem.quantity}
                    </Text>
                    <Pressable
                      onPress={() => handleQuantityChange(selectedItem, 1)}
                      disabled={quantityUpdatingId === selectedItem._id}
                      hitSlop={8}
                      className="w-8 h-8 rounded-full items-center justify-center bg-primary-700 active:bg-primary-800"
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                    </Pressable>
                  </View>
                ) : (
                  <View />
                )}
                <View className="flex-row items-center gap-2">
                  {selectedFlags.editable ? (
                    <Button
                      label="Cancel Item"
                      variant="danger"
                      onPress={() => handleRemoveItem(selectedItem)}
                      loading={removingId === selectedItem._id}
                    />
                  ) : null}
                  {selectedFlags.canDeliverThis ? (
                    <Button
                      label="Deliver"
                      onPress={() => handleDeliverItem(selectedItem)}
                      loading={deliveringItemId === selectedItem._id}
                    />
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          <View className="flex-row flex-wrap gap-2">
            {canAddItems ? (
              <Button
                label="Add More Items"
                variant="outline"
                onPress={() => navigation.navigate("AddOrderItems", { orderId: order._id, tableNumber })}
                className="flex-1"
              />
            ) : null}
            <Button
              label={billRequested ? "Bill Requested" : "Request Bill"}
              onPress={handleRequestBill}
              disabled={!canRequestBill}
              loading={statusUpdating}
              className="flex-1"
            />
          </View>
        </View>

        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 260 }}>
          <Card className="gap-3">
            <Text className="text-sm font-semibold text-brand-900">Bill Summary</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-brand-500">
                Subtotal ({items.filter(i => i.status !== "cancelled").length} item{items.filter(i => i.status !== "cancelled").length === 1 ? "" : "s"})
              </Text>
              <Text className="text-sm font-semibold text-brand-900">{formatMoney(billSubtotal)}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-brand-500">CGST (2.5%)</Text>
              <Text className="text-sm font-semibold text-brand-900">{formatMoney(totalCgst)}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-brand-500">SGST (2.5%)</Text>
              <Text className="text-sm font-semibold text-brand-900">{formatMoney(totalSgst)}</Text>
            </View>
            <Divider />
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-brand-900">Total Payable</Text>
              <Text className="text-xl font-bold text-primary-700">{formatMoney(order.totalAmount)}</Text>
            </View>
            <Text className="text-xs text-brand-400">
              Final amount is set by the manager at billing time (discount applied there).
            </Text>
          </Card>
        </View>
      </View>
      
      <CancelPromptModal
        visible={!!cancelPrompt}
        title="Cancel Item"
        message={`How many ${cancelPrompt?.item?.menuItemId?.name} to cancel? (Max: ${cancelPrompt?.item?.quantity})`}
        onCancel={() => cancelPrompt?.resolve(null)}
        onConfirm={(val) => cancelPrompt?.resolve(val)}
      />
    </Screen>
  );
}

// Mirrors WaiterDashboardScreen.js's StatCard exactly — same visual language
// for a single order's summary as the Floor Overview uses for the whole
// floor.
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
    <Card className="flex-1 min-w-[150px] p-4">
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
