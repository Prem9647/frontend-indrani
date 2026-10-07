import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, TextField, ErrorBanner } from "../../components/ui";
import { tablesApi } from "../../api/tables.api";
import { colors } from "../../theme/colors";

const addTableSchema = z.object({
  tableNumber: z.string().trim().min(1, "Enter a table name or number").max(20, "Too long (max 20 chars)"),
  capacity: z.coerce.number({ invalid_type_error: "Enter a capacity" }).int().positive(),
});

const DEFAULTS = { tableNumber: "", capacity: "", };

// Modal dialog card for adding a table — mirrors AddUserCard.js's pattern
// (a card overlay instead of a routed page, per the established preference).
export function AddTableCard({ visible, onClose, onCreated }) {
  const [formError, setFormError] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(addTableSchema), defaultValues: DEFAULTS });

  useEffect(() => {
    if (visible) {
      setFormError(null);
      reset(DEFAULTS);
    }
  }, [visible, reset]);

  async function onSubmit(values) {
    setFormError(null);
    try {
      await tablesApi.create(values);
      onCreated();
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-4" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[440px]" style={{ maxHeight: "90%" }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Card className="gap-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-lg font-semibold text-brand-900">Add New Table</Text>
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
    

              <View className="flex-row gap-3 mt-2">
                <Button label="Cancel" variant="outline" className="flex-1" onPress={onClose} />
                <Button label="Save" className="flex-1" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
              </View>
            </Card>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
