import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, TextField, ErrorBanner } from "../../components/ui";
import { customersApi } from "../../api/customers.api";
import { colors } from "../../theme/colors";

const addCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobileNumber: z.string().min(6, "Enter a valid mobile number"),
});

export function AddCustomerCard({ visible, onClose, onCreated }) {
  const [formError, setFormError] = useState(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(addCustomerSchema), defaultValues: { name: "", mobileNumber: "" } });

  useEffect(() => {
    if (visible) {
      setFormError(null);
      reset({ name: "", mobileNumber: "" });
    }
  }, [visible, reset]);

  async function onSubmit(values) {
    setFormError(null);
    try {
      await customersApi.create(values);
      onCreated();
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-4" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[420px]">
          <ScrollView keyboardShouldPersistTaps="handled">
            <Card className="gap-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-lg font-semibold text-brand-900">Add Customer</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.brand[500]} />
                </Pressable>
              </View>
              <ErrorBanner message={formError} />
              <Controller
                control={control}
                name="name"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextField label="Name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
                )}
              />
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
