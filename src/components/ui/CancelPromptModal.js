import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, Pressable, Platform } from "react-native";
import { colors } from "../../theme/colors";

export function CancelPromptModal({ visible, title, message, onCancel, onConfirm }) {
  const [value, setValue] = useState("1");

  useEffect(() => {
    if (visible) setValue("1");
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View className="bg-white rounded-xl w-full max-w-sm overflow-hidden" style={Platform.OS === 'web' ? { margin: 'auto' } : {}}>
          <View className="p-5 border-b border-brand-100">
            <Text className="text-lg font-bold text-brand-900 mb-2">{title}</Text>
            <Text className="text-sm text-brand-600">{message}</Text>
          </View>
          <View className="p-5">
            <TextInput
              className="border border-brand-300 rounded-lg p-3 text-base text-brand-900 bg-brand-50"
              value={value}
              onChangeText={setValue}
              keyboardType="number-pad"
              autoFocus
            />
          </View>
          <View className="flex-row border-t border-brand-100">
            <Pressable
              className="flex-1 p-4 items-center justify-center border-r border-brand-100"
              onPress={onCancel}
              style={({ pressed }) => ({ backgroundColor: pressed ? colors.brand[50] : '#fff' })}
            >
              <Text className="text-base font-semibold text-brand-500">Cancel</Text>
            </Pressable>
            <Pressable
              className="flex-1 p-4 items-center justify-center"
              onPress={() => onConfirm(value)}
              style={({ pressed }) => ({ backgroundColor: pressed ? colors.primary[50] : '#fff' })}
            >
              <Text className="text-base font-bold text-primary-700">OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
