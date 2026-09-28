import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { User } from "@supabase/supabase-js";
import {
  canManage,
  type LanguageOption,
  type Locale,
  type Role,
  type TranslationKey,
  type TranslationParams,
} from "../../../packages/domain/src";
import GoogleMark from "./GoogleMark";
import LocaleFlag from "./i18n/LocaleFlag";
import { MotionPressable as Pressable } from "./Motion";

type Translate = (key: TranslationKey, params?: TranslationParams) => string;

type Props = {
  user: User | null;
  role: Role | null;
  displayName: string;
  profileName: string;
  avatarUrl: string | null;
  uploadingPhoto: boolean;
  locale: Locale;
  options: LanguageOption[];
  t: Translate;
  setLocale: (locale: Locale) => void;
  onProfileNameChange: (value: string) => void;
  onChangePhoto: () => void;
  onSaveProfile: () => void | Promise<void>;
  onLogin: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
};

export default function AccountPane({
  user,
  role,
  displayName,
  profileName,
  avatarUrl,
  uploadingPhoto,
  locale,
  options,
  t,
  setLocale,
  onProfileNameChange,
  onChangePhoto,
  onSaveProfile,
  onLogin,
  onOpenAdmin,
  onLogout,
}: Props) {
  const roleLabel =
    role === "owner"
      ? t("account.owner")
      : role === "admin"
        ? t("account.admin")
        : t("account.member");

  return (
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.eyebrow}>{t("account.eyebrow")}</Text>
      <Text style={s.heading}>{user ? t("account.title") : t("account.guestTitle")}</Text>

      <View style={s.profileCard}>
        {user ? (
          <>
            <View style={s.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <Ionicons name="person-outline" size={44} color="#697050" />
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("account.changePhoto")}
                disabled={uploadingPhoto}
                onPress={onChangePhoto}
                style={s.photoEdit}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff8ed" />
                ) : (
                  <Ionicons name="pencil" size={16} color="#fff8ed" />
                )}
              </Pressable>
            </View>

            <Text style={s.name}>{displayName || t("common.reader")}</Text>
            <Text style={s.roleBadge}>{roleLabel}</Text>
            <Text style={s.email}>{user.email}</Text>

            <View style={s.nameEditor}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("account.saveName")}
                onPress={() => void onSaveProfile()}
                style={s.confirmName}
              >
                <Ionicons name="checkmark" size={20} color="#fff8ed" />
              </Pressable>
              <TextInput
                accessibilityLabel={t("account.displayName")}
                value={profileName}
                onChangeText={onProfileNameChange}
                onSubmitEditing={() => void onSaveProfile()}
                returnKeyType="done"
                maxLength={80}
                style={s.nameInput}
                placeholder={t("account.displayName")}
                placeholderTextColor="#9b8e7f"
              />
            </View>

            {canManage(role) ? (
              <Pressable style={s.adminButton} onPress={onOpenAdmin}>
                <Ionicons name="shield-checkmark-outline" size={19} color="#fff8ed" />
                <Text style={s.adminText}>{t("account.openAdmin")}</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={onLogout} style={s.logoutButton}>
              <Ionicons name="log-out-outline" size={19} color="#914732" />
              <Text style={s.logoutText}>{t("account.logout")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={[s.avatar, s.avatarFallback]}>
              <Ionicons name="person-outline" size={44} color="#697050" />
            </View>
            <Text style={s.name}>{t("account.welcome")}</Text>
            <Text style={s.email}>{t("account.guestDescription")}</Text>
            <Pressable style={s.googleButton} onPress={onLogin}>
              <GoogleMark />
              <Text style={s.googleText}>{t("account.continueGoogle")}</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={s.languageCard}>
        <Text style={s.languageTitle}>{t("account.language")}</Text>
        <Text style={s.languageHint}>{t("account.languageHint")}</Text>
        <View style={s.languageOptions}>
          {options.map((option) => (
            <Pressable
              key={option.locale}
              accessibilityRole="button"
              accessibilityState={{ selected: locale === option.locale }}
              onPress={() => setLocale(option.locale)}
              style={s.languageOption}
            >
              <View style={[s.flagCircle, locale === option.locale && s.flagCircleActive]}>
                <LocaleFlag locale={option.locale} size={48} />
              </View>
              <Text style={[s.languageLabel, locale === option.locale && s.languageLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingTop: 28, paddingBottom: 42 },
  eyebrow: { fontSize: 10, color: "#914732", letterSpacing: 2, fontWeight: "700", marginBottom: 12 },
  heading: { fontFamily: "serif", fontSize: 32, lineHeight: 38, color: "#352c25", marginBottom: 22 },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#fffaf3",
    borderWidth: 1,
    borderColor: "#d9ccba",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
  },
  avatarWrap: { width: 104, height: 104, marginBottom: 14 },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  avatarFallback: { backgroundColor: "#eee4d4", alignItems: "center", justifyContent: "center" },
  photoEdit: {
    position: "absolute",
    right: -2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#914732",
    borderWidth: 3,
    borderColor: "#fffaf3",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 27, color: "#352c25", marginBottom: 8 },
  roleBadge: {
    backgroundColor: "#e6dccb",
    color: "#67543c",
    fontSize: 12,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  email: { color: "#766b60", fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 20 },
  nameEditor: {
    width: "100%",
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#d3c5b2",
    borderRadius: 8,
    backgroundColor: "#fffdf9",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 18,
  },
  confirmName: {
    width: 50,
    alignSelf: "stretch",
    backgroundColor: "#665340",
    alignItems: "center",
    justifyContent: "center",
  },
  nameInput: { flex: 1, paddingHorizontal: 14, fontSize: 16, color: "#352c25" },
  adminButton: {
    width: "100%",
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#a94b34",
    borderRadius: 8,
    marginBottom: 8,
  },
  adminText: { color: "#fff8ed", fontSize: 15, fontWeight: "700" },
  logoutButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  logoutText: { color: "#914732", fontSize: 15 },
  googleButton: {
    width: "100%",
    backgroundColor: "#fff",
    borderColor: "#c9bba8",
    borderWidth: 1,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
  },
  googleText: { color: "#1f1f1f", fontSize: 14, fontWeight: "500" },
  languageCard: {
    marginTop: 20,
    backgroundColor: "#f8f1e7",
    borderWidth: 1,
    borderColor: "#d9ccba",
    borderRadius: 12,
    padding: 20,
  },
  languageTitle: { fontSize: 17, color: "#352c25", fontWeight: "700", textAlign: "center", marginBottom: 5 },
  languageHint: { color: "#766b60", fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 18 },
  languageOptions: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start" },
  languageOption: { alignItems: "center", gap: 7, minWidth: 78 },
  flagCircle: { width: 52, height: 52, borderRadius: 26, overflow: "hidden", borderWidth: 1, borderColor: "#cabda9" },
  flagCircleActive: { borderWidth: 2, borderColor: "#914732" },
  languageLabel: { fontSize: 12, color: "#766b60", textAlign: "center" },
  languageLabelActive: { color: "#914732", fontWeight: "700" },
});
