import { useState } from "react";
import { View, Text } from "react-native";
import { Screen, PageHeader, Card, Badge, Button, ErrorBanner, Divider } from "../../components/ui";
import { usersApi } from "../../api/users.api";
import { EditUserCard } from "./EditUserCard";

const ROLE_TONE = { admin: "info", manager: "secondary", waiter: "primary" };

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function UserDetailsScreen({ route }) {
  const [user, setUser] = useState(route.params.user);
  const [statusError, setStatusError] = useState(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const isAdmin = user.role === "admin";

  async function toggleActive() {
    setStatusError(null);
    setStatusSubmitting(true);
    try {
      const { data } = await usersApi.update(user.id, { isActive: !user.isActive });
      setUser(data);
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusSubmitting(false);
    }
  }

  return (
    <Screen>
      <PageHeader title="User Details" />

      <Card className="gap-1 mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-lg font-semibold text-brand-900">{user.name}</Text>
          <View className="flex-row gap-1.5">
            <Badge label={user.role} tone={ROLE_TONE[user.role] ?? "brand"} />
            <Badge label={user.isActive ? "Active" : "Inactive"} tone={user.isActive ? "success" : "danger"} />
          </View>
        </View>
        <Divider className="my-2" />
        <Row label="Email" value={user.email} />
        <Row label="Phone" value={user.phone} />
        <Row label="Created" value={formatDate(user.createdAt)} />
      </Card>

      {isAdmin ? (
        <Text className="text-sm text-brand-500">
          Admin accounts are provisioned separately and can't be edited or deactivated from this screen.
        </Text>
      ) : (
        <>
          <ErrorBanner message={statusError} />
          <View className="gap-3 mt-1">
            <Button label="Edit User" onPress={() => setEditModalOpen(true)} />
            <Button label="Reset Password" variant="secondary" onPress={() => setEditModalOpen(true)} />
            <Button
              label={user.isActive ? "Deactivate" : "Activate"}
              variant={user.isActive ? "danger" : "outline"}
              onPress={toggleActive}
              loading={statusSubmitting}
            />
          </View>
        </>
      )}

      <EditUserCard
        user={user}
        visible={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onUpdated={(updated) => {
          setUser(updated);
          setEditModalOpen(false);
        }}
      />
    </Screen>
  );
}

function Row({ label, value }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-sm text-brand-500">{label}</Text>
      <Text className="text-sm font-medium text-brand-900">{value}</Text>
    </View>
  );
}
