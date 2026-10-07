import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, TextField, ErrorBanner } from "../../components/ui";
import { usersApi } from "../../api/users.api";
import { colors } from "../../theme/colors";

const addUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a valid phone number"),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["manager", "waiter"]),
});

const DEFAULTS = { name: "", email: "", phone: "", password: "", role: "waiter" };

// Modal dialog card for creating a user — used from UsersListScreen (and,
// via the Dashboard's Quick Actions, opened straight to a preset role). Not
// a routed screen: the underlying Users list stays visible/dimmed behind it.
export function AddUserCard({ visible, presetRole, onClose, onCreated }) {
  const [formError, setFormError] = useState(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(addUserSchema), defaultValues: DEFAULTS });
  const role = watch("role");

  useEffect(() => {
    if (visible) {
      setFormError(null);
      reset({ ...DEFAULTS, role: presetRole ?? "waiter" });
    }
  }, [visible, presetRole, reset]);

  async function onSubmit(values) {
    setFormError(null);
    try {
      await usersApi.create(values);
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
                <Text className="text-lg font-semibold text-brand-900">Add New User</Text>
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
                    label="Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.name?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextField
                    label="Email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    keyboardType="email-address"
                  />
                )}
              />
              <Controller
                control={control}
                name="phone"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextField
                    label="Phone Number"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.phone?.message}
                    keyboardType="phone-pad"
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextField
                    label="Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    secureTextEntry
                  />
                )}
              />

              <View>
                <Text className="text-sm font-medium text-brand-700 mb-1.5">Role</Text>
                <View className="flex-row gap-2">
                  {["waiter", "manager"].map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setValue("role", option)}
                      className={`px-4 py-2 rounded-lg border ${
                        role === option ? "bg-primary-700 border-primary-700" : "bg-white border-brand-300"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium capitalize ${
                          role === option ? "text-white" : "text-brand-700"
                        }`}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
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
