import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";

export function LanguageSelectorPill() {
  const { language, setLanguage, languages, currentLanguageOption } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change language"
        onPress={() => setModalVisible(true)}
        style={styles.pill}
      >
        <MaterialCommunityIcons name="translate" size={16} color={colors.primary} />
        <Text style={styles.pillText}>{currentLanguageOption.nativeName}</Text>
        <MaterialCommunityIcons name="chevron-down" size={14} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.titleRow}>
                <MaterialCommunityIcons name="translate" size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>Select Language / भाषा चुनें</Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.langList} showsVerticalScrollIndicator={false}>
              {languages.map((item) => {
                const isSelected = item.code === language;
                return (
                  <Pressable
                    key={item.code}
                    onPress={() => {
                      setLanguage(item.code);
                      setModalVisible(false);
                    }}
                    style={[styles.langItem, isSelected && styles.langItemSelected]}
                  >
                    <View>
                      <Text style={[styles.nativeText, isSelected && styles.selectedText]}>
                        {item.nativeName}
                      </Text>
                      <Text style={styles.labelText}>{item.label}</Text>
                    </View>
                    {isSelected ? (
                      <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    maxHeight: 460,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  langList: {
    marginTop: 8,
  },
  langItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  langItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  nativeText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  labelText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  selectedText: {
    color: colors.primary,
  },
});
