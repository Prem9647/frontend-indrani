import { useState } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { User, Lock, Eye, EyeOff, LogIn, Check, Tv } from "lucide-react-native";
import { useAuthStore } from "../../stores/authStore";
import { loginSchema } from "../../schemas/auth.schema";

const STONE_400 = "#A8A29E";

function ScreenBackground() {
  return (
    <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
      <Defs>
        <LinearGradient id="loginBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FBDECD" />
          <Stop offset="55%" stopColor="#FFF8F4" />
          <Stop offset="100%" stopColor="#FFFFFF" />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#loginBg)" />
    </Svg>
  );
}

function InputField({ icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, rightElement }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      className={`flex-row items-center rounded-xl border bg-stone-50 px-4 ${
        isFocused ? "border-orange-400" : "border-stone-200"
      }`}
    >
      {icon}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={STONE_400}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        className="flex-1 px-3 py-3.5 text-base text-stone-900"
        style={{ outlineStyle: "none" }}
      />
      {rightElement}
    </View>
  );
}

export function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [formError, setFormError] = useState("");

  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);
  const authError = useAuthStore((s) => s.error);
  const isSubmitting = status === "loading";

  const handleLogin = async () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setFormError(result.error.issues[0].message);
      return;
    }
    setFormError("");
    try {
      await login(result.data.email, result.data.password);
    } catch {
      // authStore already records the failure in its own `error` field
    }
  };

  return (
    <View className="flex-1 bg-[#FFF8F4]">
      <ScreenBackground />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 items-center justify-center px-6"
        >
          {/* Logo */}
          <Image source={require("../../../assets/logo.png")} style={{ width: 120, height: 120 }} resizeMode="contain" className="mb-5" />

          {/* Heading */}
          <Text className="text-2xl font-bold text-orange-800 text-center">Welcome back</Text>
          <Text className="text-sm text-stone-500 text-center mt-2 mb-6 px-4">
            Please enter your credentials to access the service dashboard.
          </Text>

          <View className="w-full max-w-[380px] bg-white rounded-3xl px-8 py-8 shadow-xl shadow-stone-900/10 border border-stone-100">
            {/* Email or Phone */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-stone-700 mb-2">Email</Text>
              <InputField
                icon={<User size={18} color={STONE_400} />}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
              />
            </View>

            {/* Password */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-stone-700">Password</Text>
      
              </View>
              <InputField
                icon={<Lock size={18} color={STONE_400} />}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                rightElement={
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={18} color={STONE_400} />
                    ) : (
                      <Eye size={18} color={STONE_400} />
                    )}
                  </Pressable>
                }
              />
            </View>

            {/* Keep me signed in */}
            <Pressable onPress={() => setKeepSignedIn((v) => !v)} className="flex-row items-center mb-8" hitSlop={4}>
              <View
                className={`w-5 h-5 rounded-md border items-center justify-center mr-2.5 ${
                  keepSignedIn ? "bg-orange-700 border-orange-700" : "border-stone-300 bg-white"
                }`}
              >
                {keepSignedIn ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
              </View>
              <Text className="text-sm text-stone-600">Keep me signed in</Text>
            </Pressable>

            {(formError || authError) ? (
              <Text className="text-xs font-medium text-red-600 text-center mb-4">
                {formError || authError}
              </Text>
            ) : null}

            {/* Login button */}
            <Pressable
              onPress={handleLogin}
              disabled={isSubmitting}
              className={`flex-row items-center justify-center gap-2 rounded-xl bg-orange-700 py-4 ${
                isSubmitting ? "opacity-60" : "hover:bg-orange-800 active:bg-orange-800 active:scale-[0.98]"
              }`}
            >
              <Text className="text-base font-bold text-white">{isSubmitting ? "Signing in..." : "Login"}</Text>
              <LogIn size={18} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => navigation.navigate("KitchenDisplay")}
            className="flex-row items-center gap-1.5 mt-6 px-3 py-2"
            hitSlop={8}
          >
            <Tv size={15} color={STONE_400} />
            <Text className="text-sm text-stone-500">View Kitchen Display</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
