import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Platform, Alert } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { Badge, Button, TextField, LoadingIndicator, ErrorBanner, CancelPromptModal } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { useAuthStore } from "../../stores/authStore";
import { SOCKET_URL } from "../../lib/env";
import { ordersApi } from "../../api/orders.api";
import { categoriesApi } from "../../api/categories.api";
import { menuItemsApi } from "../../api/menuItems.api";
import { customersApi } from "../../api/customers.api";
import { getOrderStatusMeta, getItemStatusMeta } from "../../theme/status";
import { colors } from "../../theme/colors";
import { MenuItemPicker, MenuSearchFilter, filterMenu } from "./MenuItemPicker";

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

function getItemFlags(item, canAddItems) {
  const eligible = canAddItems && item.status !== "delivered" && item.status !== "cancelled";
  return { editable: eligible, canDeliverThis: eligible };
}

// Everything OrderDetailScreen's "existing order" view could do, minus the
// full-page chrome (header/back arrow/stat cards) — rendered straight inside
// a WaiterTablesScreen row so managing an order never leaves that page. See
// .claude/skills/restaurant-workflow for the status/action rules this
// mirrors.
export function InlineOrderManager({ orderId, onChanged }) {
  const token = useAuthStore((s) => s.token);
  const [removingId, setRemovingId] = useState(null);
  const [quantityUpdatingId, setQuantityUpdatingId] = useState(null);
  const [deliveringItemId, setDeliveringItemId] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [addingItems, setAddingItems] = useState(false);
  const [cancelPrompt, setCancelPrompt] = useState(null);

  const { data, loading, error, refetch } = useAsync(async () => {
    const { data } = await ordersApi.get(orderId);
    return data;
  }, [orderId]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { channel: "dashboard", token } });
    const refreshIfThisOrder = (payload) => {
      if (payload?.orderId === orderId) refetch();
    };
    socket.on("order:updated", refreshIfThisOrder);
    socket.on("order:item-delivered", refreshIfThisOrder);
    socket.on("order:status-changed", refreshIfThisOrder);
    socket.on("order:bill-requested", refreshIfThisOrder);
    return () => socket.disconnect();
  }, [token, orderId, refetch]);

  async function afterMutate() {
    await refetch();
    onChanged?.();
  }

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
      setSelectedItemId(null);
      await afterMutate();
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
      await afterMutate();
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
      await afterMutate();
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
      await afterMutate();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading && !data) return <LoadingIndicator />;
  if (error || !data) return <ErrorBanner message={error ?? "Order not found"} />;

  if (addingItems) {
    return (
      <InlineAddItemsForm
        orderId={orderId}
        onCancel={() => setAddingItems(false)}
        onDone={async () => {
          setAddingItems(false);
          await afterMutate();
        }}
      />
    );
  }

  const { order, items } = data;
  const statusMeta = getOrderStatusMeta(order.status);
  const billRequested = order.status === "waiting_for_billing";
  const orderLocked = billRequested || order.status === "closed";
  const canAddItems = !orderLocked;
  const canRequestBill = !orderLocked;

  const selectedItem = items.find((i) => i._id === selectedItemId) ?? null;
  const selectedFlags = selectedItem ? getItemFlags(selectedItem, canAddItems) : null;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between flex-wrap gap-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-bold text-primary-700">#{order.orderNumber}</Text>
          <Badge label={statusMeta.label} tone={statusMeta.tone} />
        </View>
        <Text className="text-xs text-brand-500">
          {order.customerId?.name ?? "—"}
          {order.seatNumber ? ` (Seat ${order.seatNumber})` : ""} · {items.filter(i => i.status !== "cancelled").length} item{items.filter(i => i.status !== "cancelled").length === 1 ? "" : "s"}
        </Text>
      </View>

      <ErrorBanner message={actionError} />

      <View className="rounded-lg border border-brand-200 bg-white overflow-hidden">
        {items.map((item, index) => {
          const itemMeta = getItemStatusMeta(item.status);
          const cancelled = item.status === "cancelled";
          const { editable, canDeliverThis } = getItemFlags(item, canAddItems);
          const actionable = editable || canDeliverThis;
          const isSelected = item._id === selectedItemId;
          return (
            <Pressable
              key={item._id}
              disabled={!actionable}
              onPress={() => setSelectedItemId((id) => (id === item._id ? null : item._id))}
              className={`flex-row items-center px-3 py-2.5 ${index > 0 ? "border-t border-brand-100" : ""} ${
                isSelected ? "bg-primary-50" : ""
              }`}
            >
              <View className="flex-1 pr-2">
                <View className="flex-row items-center gap-1.5 flex-wrap">
                  <Text
                    className={`text-sm font-semibold ${cancelled ? "text-brand-400 line-through" : "text-brand-900"}`}
                  >
                    {item.menuItemId?.name}
                  </Text>
                  <Badge label={itemMeta.label} tone={itemMeta.tone} />
                </View>
              </View>
              <Text className="text-xs text-brand-500 mr-2">×{item.quantity}</Text>
              <Text className={`text-sm font-bold ${cancelled ? "text-brand-400 line-through" : "text-primary-700"}`}>
                {formatMoney(item.subtotal)}
              </Text>
              {actionable ? (
                <Ionicons
                  name={isSelected ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.brand[400]}
                  style={{ marginLeft: 8 }}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {selectedItem && selectedFlags && (selectedFlags.editable || selectedFlags.canDeliverThis) ? (
        <View className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-3 gap-2.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-brand-900 flex-1 pr-2" numberOfLines={1}>
              {selectedItem.menuItemId?.name}
            </Text>
            <Pressable onPress={() => setSelectedItemId(null)} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.brand[500]} />
            </Pressable>
          </View>
          <View className="flex-row items-center justify-between flex-wrap gap-2">
            {selectedFlags.editable ? (
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => handleQuantityChange(selectedItem, -1)}
                  disabled={quantityUpdatingId === selectedItem._id || selectedItem.quantity <= 1}
                  hitSlop={8}
                  className={`w-7 h-7 rounded-full items-center justify-center border border-brand-300 bg-white ${
                    selectedItem.quantity <= 1 ? "opacity-40" : ""
                  }`}
                >
                  <Ionicons name="remove" size={14} color={colors.brand[700]} />
                </Pressable>
                <Text className="text-sm font-semibold text-brand-900 w-4 text-center">{selectedItem.quantity}</Text>
                <Pressable
                  onPress={() => handleQuantityChange(selectedItem, 1)}
                  disabled={quantityUpdatingId === selectedItem._id}
                  hitSlop={8}
                  className="w-7 h-7 rounded-full items-center justify-center bg-primary-700 active:bg-primary-800"
                >
                  <Ionicons name="add" size={14} color="#fff" />
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
          <Button label="Add More Items" variant="outline" onPress={() => setAddingItems(true)} className="flex-1" />
        ) : null}
        <Button
          label={billRequested ? "Bill Requested" : "Request Bill"}
          onPress={handleRequestBill}
          disabled={!canRequestBill}
          loading={statusUpdating}
          className="flex-1"
        />
      </View>

      <View className="flex-row items-center justify-between pt-2 border-t border-brand-100">
        <Text className="text-sm font-semibold text-brand-900">Total</Text>
        <Text className="text-base font-bold text-primary-700">{formatMoney(order.totalAmount)}</Text>
      </View>
      
      <CancelPromptModal
        visible={!!cancelPrompt}
        title="Cancel Item"
        message={`How many ${cancelPrompt?.item?.menuItemId?.name} to cancel? (Max: ${cancelPrompt?.item?.quantity})`}
        onCancel={() => cancelPrompt?.resolve(null)}
        onConfirm={(val) => cancelPrompt?.resolve(val)}
      />
    </View>
  );
}

// The menu picker from AddOrderItemsScreen, inlined the same way — adding
// items to an in-progress order without navigating to its own screen.
function InlineAddItemsForm({ orderId, onDone, onCancel }) {
  const [quantities, setQuantities] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const [categoryId, setCategoryId] = useState(null);

  const { data, loading, error } = useAsync(async () => {
    const [{ data: categories }, { data: items }] = await Promise.all([
      categoriesApi.list(true),
      menuItemsApi.list({ availableOnly: true }),
    ]);
    return { categories, items };
  }, []);

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

  const addTotal = selectedItems.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);

  const { filteredCategories, filteredItems } = useMemo(
    () => filterMenu(data?.categories, data?.items, menuQuery, categoryId),
    [data?.categories, data?.items, menuQuery, categoryId]
  );

  async function handleSubmit() {
    if (selectedItems.length === 0) {
      setSubmitError("Select at least one item");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      await ordersApi.addItems(
        orderId,
        selectedItems.map(({ item, quantity }) => ({ menuItemId: item._id, quantity }))
      );
      onDone();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-brand-900">Add More Items</Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Ionicons name="close" size={18} color={colors.brand[500]} />
        </Pressable>
      </View>
      {loading ? <LoadingIndicator /> : null}
      <ErrorBanner message={error} />
      {data ? (
        <>
          <MenuSearchFilter
            query={menuQuery}
            onQueryChange={setMenuQuery}
            categories={data.categories}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
          />
          <MenuItemPicker
            categories={filteredCategories}
            items={filteredItems}
            quantities={quantities}
            onChange={updateQuantity}
          />
          <View className="flex-row items-center justify-between pt-2 border-t border-brand-100">
            <Text className="text-sm font-semibold text-brand-900">Total</Text>
            <Text className="text-base font-bold text-primary-700">{formatMoney(addTotal)}</Text>
          </View>
          <ErrorBanner message={submitError} />
          <View className="flex-row gap-2">
            <Button label="Cancel" variant="outline" onPress={onCancel} className="flex-1" />
            <Button label="Add to Order" onPress={handleSubmit} loading={submitting} className="flex-1" />
          </View>
        </>
      ) : null}
    </View>
  );
}

const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  mobileNumber: z.string().min(6, "Enter a valid mobile number"),
  seatNumber: z.string().optional(),
});

// The Customer Details -> Select Items -> Submit builder from
// OrderDetailScreen's "new order" mode, inlined into a table row — seating a
// table (or adding another customer to one already occupied) never
// navigates to its own screen either.
export function InlineNewOrderForm({ tableId, onCreated, onCancel }) {
  const [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [menuQuery, setMenuQuery] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [lookupStatus, setLookupStatus] = useState("idle");

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

  async function onSubmit(customer) {
    if (selectedItems.length === 0) {
      setSubmitError("Select at least one item");
      return;
    }
    setSubmitError(null);
    try {
      const { data: created } = await ordersApi.create({
        tableId,
        seatNumber: customer.seatNumber,
        customer,
        items: selectedItems.map(({ item, quantity }) => ({ menuItemId: item._id, quantity })),
      });
      onCreated(created.order._id);
    } catch (err) {
      setSubmitError(err.message);
    }
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-brand-900">
          {step === 0 ? "Customer Details" : "Select Items"}
        </Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Ionicons name="close" size={18} color={colors.brand[500]} />
        </Pressable>
      </View>

      {loading ? <LoadingIndicator /> : null}
      <ErrorBanner message={error} />

      {step === 0 ? (
        <View className="gap-3">
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
          <Button label="Next: Select Items" onPress={goToMenu} />
        </View>
      ) : null}

      {step === 1 ? (
        <View className="gap-3">
          <MenuSearchFilter
            query={menuQuery}
            onQueryChange={setMenuQuery}
            categories={data?.categories}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
          />
          <MenuItemPicker
            categories={filteredCategories}
            items={filteredItems}
            quantities={quantities}
            onChange={updateQuantity}
          />
          <View className="flex-row items-center justify-between pt-2 border-t border-brand-100">
            <Text className="text-xs text-brand-500">
              {selectedItems.length} item{selectedItems.length === 1 ? "" : "s"} · {totalQuantity} qty
            </Text>
            <Text className="text-base font-bold text-primary-700">{formatMoney(orderTotal)}</Text>
          </View>
          <ErrorBanner message={submitError} />
          <View className="flex-row gap-2">
            <Button label="Back" variant="outline" onPress={() => setStep(0)} className="flex-1" />
            <Button label="Submit Order" onPress={handleSubmit(onSubmit)} loading={isSubmitting} className="flex-1" />
          </View>
        </View>
      ) : null}
    </View>
  );
}
