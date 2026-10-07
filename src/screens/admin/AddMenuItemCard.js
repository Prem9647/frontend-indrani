import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView, Switch } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, TextField, ErrorBanner } from "../../components/ui";
import { menuItemsApi } from "../../api/menuItems.api";
import { colors } from "../../theme/colors";

const addMenuItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.coerce.number({ invalid_type_error: "Enter a price" }).nonnegative(),
  prepTimeMinutes: z.coerce.number().nonnegative().optional(),
  categoryIds: z.array(z.string()).min(1, "Choose at least one category"),
});

const DEFAULTS = { name: "", description: "", price: "", prepTimeMinutes: "", categoryIds: [] };

export function AddMenuItemCard({ visible, categories, onClose, onCreated }) {
  const [formError, setFormError] = useState(null);
  const [isBestseller, setIsBestseller] = useState(false);
  const [isVegetarian, setIsVegetarian] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addMenuItemSchema),
    defaultValues: { ...DEFAULTS, categoryIds: categories.length ? [categories[0]._id] : [] },
  });
  const categoryIds = watch("categoryIds");

  useEffect(() => {
    if (visible) {
      setFormError(null);
      setIsBestseller(false);
      setIsVegetarian(false);
      reset({ ...DEFAULTS, categoryIds: categories.length ? [categories[0]._id] : [] });
    }
  }, [visible, categories, reset]);

  async function onSubmit(values) {
    setFormError(null);
    try {
      await menuItemsApi.create({
        ...values,
        prepTimeMinutes: values.prepTimeMinutes || undefined,
        isBestseller,
        isVegetarian,
      });
      onCreated();
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-4" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[460px]" style={{ maxHeight: "90%" }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Card className="gap-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-lg font-semibold text-brand-900">Add Menu Item</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.brand[500]} />
                </Pressable>
              </View>
              <ErrorBanner message={formError} />

              <Controller
                control={control}
                name="name"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextField label="Item Name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
                )}
              />
              <Controller
                control={control}
                name="description"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextField label="Description (optional)" value={value} onChangeText={onChange} onBlur={onBlur} />
                )}
              />
              <View className="flex-row gap-3">
                <Controller
                  control={control}
                  name="price"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextField
                      label="Price"
                      value={String(value)}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.price?.message}
                      keyboardType="decimal-pad"
                      className="flex-1"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="prepTimeMinutes"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextField
                      label="Prep Time (min)"
                      value={String(value)}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="number-pad"
                      className="flex-1"
                    />
                  )}
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-brand-700 mb-1.5">Categories</Text>
                <View className="flex-row flex-wrap gap-2">
                  {categories.map((category) => {
                    const isSelected = categoryIds.includes(category._id);
                    return (
                      <Pressable
                        key={category._id}
                        onPress={() => {
                          if (isSelected) {
                            setValue("categoryIds", categoryIds.filter(id => id !== category._id));
                          } else {
                            setValue("categoryIds", [...categoryIds, category._id]);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-lg border ${
                          isSelected ? "bg-primary-700 border-primary-700" : "bg-white border-brand-300"
                        }`}
                      >
                        <Text className={`text-sm font-medium ${isSelected ? "text-white" : "text-brand-700"}`}>
                          {category.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.categoryIds ? <Text className="text-xs text-danger-600 mt-1">{errors.categoryIds.message}</Text> : null}
              </View>

              <ToggleRow label="Bestseller" value={isBestseller} onChange={setIsBestseller} />
              <ToggleRow label="Vegetarian" value={isVegetarian} onChange={setIsVegetarian} />

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

export function ToggleRow({ label, value, onChange }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-sm font-medium text-brand-700">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.brand[200], true: colors.primary[300] }}
        thumbColor={value ? colors.primary[600] : colors.white}
      />
    </View>
  );
}
