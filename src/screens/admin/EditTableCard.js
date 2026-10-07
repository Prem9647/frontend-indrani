import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView, Alert } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, TextField, ErrorBanner } from "../../components/ui";
import { tablesApi } from "../../api/tables.api";
import { colors } from "../../theme/colors";
import { getTableStatusMeta } from "../../theme/status";

const editTableSchema = z.object({
  tableNumber: z.string().trim().min(1, "Enter a table name or number").max(20, "Too long (max 20 chars)"),
  capacity: z.coerce.number({ invalid_type_error: "Enter a capacity" }).int().positive(),
  location: z.string().trim().max(60).optional(),
});

const STATUS_OPTIONS = ["available", "occupied", "reserved", "maintenance"];

// Modal dialog card for editing a table — mirrors EditUserCard.js. Status is
// normally system-managed by the order lifecycle (occupied on order create,
// available on close — see order.service.js), but reserved/maintenance are
// manual admin overrides, so this exposes a direct status picker.
export function EditTableCard({ table, visible, onClose, onUpdated, onDeleted }) {
  const [formError, setFormError] = useState(null);
  const [status, setStatus] = useState(table?.status ?? "available");
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editTableSchema),
    defaultValues: { tableNumber: "", capacity: "", location: "" },
  });

  useEffect(() => {
    if (visible && table) {
      setFormError(null);
      setDeleteError(null);
      setStatus(table.status);
      reset({
        tableNumber: String(table.tableNumber),
        capacity: String(table.capacity),
        location: table.location ?? "",
      });
    }
  }, [visible, table, reset]);

  if (!table) return null;

  async function onSubmit(values) {
    setFormError(null);
    try {
      const { data } = await tablesApi.update(table._id, { ...values, status });
      onUpdated(data);
    } catch (err) {
      setFormError(err.message);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete Table", `Remove Table ${table.tableNumber}? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleteError(null);
          setDeleting(true);
          try {
            await tablesApi.remove(table._id);
            onDeleted();
          } catch (err) {
            setDeleteError(err.message);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-4" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[440px]" style={{ maxHeight: "90%" }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Card className="gap-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-lg font-semibold text-brand-900">Edit Table</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.brand[500]} />
                </Pressable>
              </View>
              <ErrorBanner message={formError} />

              <View className="flex-row gap-3">
                <Controller
                  control={control}
                  name="tableNumber"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextField
                      label="Table Name / Number"
                      placeholder="e.g. 5, VIP, Terrace 1"
                      value={String(value)}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.tableNumber?.message}
                      className="flex-1"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="capacity"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextField
                      label="Seating Capacity"
                      value={String(value)}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.capacity?.message}
                      keyboardType="number-pad"
                      className="flex-1"
                    />
                  )}
                />
              </View>
              <Controller
                control={control}
                name="location"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextField
                    label="Location (optional)"
                    placeholder="e.g. Main Floor, Window Side"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.location?.message}
                  />
                )}
              />

              <View>
                <Text className="text-sm font-medium text-brand-700 mb-1.5">Status</Text>
                <View className="flex-row flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const meta = getTableStatusMeta(option);
                    const active = status === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setStatus(option)}
                        className={`px-3.5 py-2 rounded-lg border ${
                          active ? "bg-primary-700 border-primary-700" : "bg-white border-brand-300"
                        }`}
                      >
                        <Text className={`text-sm font-medium ${active ? "text-white" : "text-brand-700"}`}>
                          {meta.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button label="Save Changes" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />

              <ErrorBanner message={deleteError} />
              <Button label="Delete Table" variant="danger" onPress={confirmDelete} loading={deleting} />
            </Card>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
