import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { categoryIcons } from "../../constants/categoryIcons";
import { ExpenseWithItems } from "../../types/expense";
import { formatCurrency } from "../../utils/currency";

interface ExpenseCardProps {
  item: ExpenseWithItems;
  onPress: () => void;
  onKebabPress: () => void;
  isKebabVisible: boolean;
}

export function ExpenseCard({
  item,
  onPress,
  onKebabPress,
  isKebabVisible,
}: ExpenseCardProps) {
  const iconName = categoryIcons[item.category || "default"];

  return (
    <TouchableOpacity
      style={styles.expenseCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <ThemedView style={styles.expenseContent}>
        <ThemedView style={styles.leftSection}>
          <ThemedView style={styles.iconContainer}>
            <Ionicons name={iconName as any} size={24} color="#007AFF" />
          </ThemedView>

          <ThemedView style={styles.expenseInfo}>
            <ThemedText style={styles.merchantName}>
              {item.merchant_name || "Unknown Store"}
            </ThemedText>
            <ThemedText style={styles.categoryText}>{item.category}</ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.rightSection}>
          <ThemedText style={styles.amountText}>
            {formatCurrency(item.total, item.currency)}
          </ThemedText>

          <TouchableOpacity style={styles.kebabButton} onPress={onKebabPress}>
            <Ionicons name="ellipsis-horizontal" size={16} color="#999" />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  expenseCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  expenseContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    minHeight: 70,
  },
  leftSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
    textTransform: "capitalize",
  },
  rightSection: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  kebabButton: {
    padding: 4,
  },
});
