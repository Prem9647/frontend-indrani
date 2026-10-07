import { View, Text, TextInput } from "react-native";
import { colors } from "../../theme/colors";

// Plain controlled text field — pair with react-hook-form's <Controller>
// (value/onChange/onBlur passed straight through) rather than building a
// separate RHF-aware wrapper.
export function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  className = "",
}) {
  return (
    <View className={className}>
      {label ? <Text className="text-sm font-medium text-brand-700 mb-1.5">{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.brand[400]}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className={`border rounded-lg px-3.5 py-3 text-base text-brand-900 bg-white ${
          error ? "border-danger-500" : "border-brand-300 focus:border-primary-500"
        }`}
      />
      {error ? <Text className="text-xs text-danger-600 mt-1">{error}</Text> : null}
    </View>
  );
}
