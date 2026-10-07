import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { Card, Badge, Button, TextField, ErrorBanner } from "../../components/ui";
import { usersApi } from "../../api/users.api";
import { colors } from "../../theme/colors";

const updateInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a valid phone number"),
  role: z.enum(["manager", "waiter"]),
});

// Modal dialog card for editing a user — shared by UsersListScreen (row's
// pencil icon) and UserDetailsScreen ("Edit User" / "Reset Password"
// buttons), so there's one place this logic lives instead of a routed page.
export function EditUserCard({ user, visible, onClose, onUpdated }) {
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [statusError, setStatusError] = useState(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [formError, setFormError] = useState(null);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(updateInfoSchema), defaultValues: { name: "", email: "", phone: "", role: "waiter" } });
  const role = watch("role");

  useEffect(() => {
    if (visible && user) {
      setFormError(null);
      setStatusError(null);
      setResetError(null);
      setResetDone(false);
      setNewPassword("");
      setIsActive(user.isActive);
      reset({ name: user.name, email: user.email, phone: user.phone, role: user.role });
    }
  }, [visible, user, reset]);

  if (!user) return null;

  async function onSubmit(values) {
    setFormError(null);
    try {
      const { data } = await usersApi.update(user.id, values);
      onUpdated(data);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function toggleActive() {
    setStatusError(null);
    setStatusSubmitting(true);
    try {
      const { data } = await usersApi.update(user.id, { isActive: !isActive });
      setIsActive(data.isActive);
      onUpdated(data);
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) {
      setResetError("At least 8 characters");
      return;
    }
    setResetError(null);
    setResetSubmitting(true);
    try {
      await usersApi.resetPassword(user.id, newPassword);
      setNewPassword("");
      setResetDone(true);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-4" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[440px]" style={{ maxHeight: "90%" }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Card className="gap-3 mb-4">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-lg font-semibold text-brand-900">Edit User</Text>
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

              <Button label="Update Information" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
            </Card>

            <Card className="gap-3 mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-brand-900">Account Status</Text>
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

            <Card className="gap-3">
              <Text className="text-base font-semibold text-brand-900">Reset Password</Text>
              <ErrorBanner message={resetError} />
              {resetDone ? <Text className="text-sm text-success-700">Password reset successfully.</Text> : null}
              <TextField
                label="New password"
                value={newPassword}
                onChangeText={(v) => {
                  setNewPassword(v);
                  setResetDone(false);
                }}
                secureTextEntry
              />
              <Button label="Reset Password" variant="secondary" onPress={handleResetPassword} loading={resetSubmitting} />
            </Card>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
