import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { Card, Badge, Button, TextField, ErrorBanner } from "../../components/ui";
import { categoriesApi } from "../../api/categories.api";
import { colors } from "../../theme/colors";

const editCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

// Delete lives as a direct row action in MenuScreen.js (matching the
// mockup's edit/delete icon pair per row), not duplicated in here too.
export function EditCategoryCard({ category, visible, onClose, onUpdated }) {
  const [formError, setFormError] = useState(null);
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(editCategorySchema), defaultValues: { name: "" } });

  useEffect(() => {
    if (visible && category) {
      setFormError(null);
      setStatusError(null);
      setIsActive(category.isActive);
      reset({ name: category.name });
    }
  }, [visible, category, reset]);

  if (!category) return null;

  async function onSubmit(values) {
    setFormError(null);
    try {
      const { data } = await categoriesApi.update(category._id, values);
      onUpdated(data);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function toggleActive() {
    setStatusError(null);
    setStatusSubmitting(true);
    try {
      const { data } = await categoriesApi.update(category._id, { isActive: !isActive });
      setIsActive(data.isActive);
      onUpdated(data);
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-4" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[420px]">
          <ScrollView keyboardShouldPersistTaps="handled">
            <Card className="gap-3 mb-4">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-lg font-semibold text-brand-900">Edit Category</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.brand[500]} />
                </Pressable>
              </View>
              <ErrorBanner message={formError} />
              <Controller
                control={control}
                name="name"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextField
                    label="Category Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.name?.message}
                  />
                )}
              />
              <Button label="Update Category" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
            </Card>

            <Card className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-brand-900">Status</Text>
                <Badge label={isActive ? "Active" : "Inactive"} tone={isActive ? "success" : "danger"} />
              </View>
              <ErrorBanner message={statusError} />
              <Button
                label={isActive ? "Deactivate" : "Activate"}
                variant={isActive ? "danger" : "primary"}
                onPress={toggleActive}
                loading={statusSubmitting}
              />
            </Card>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
