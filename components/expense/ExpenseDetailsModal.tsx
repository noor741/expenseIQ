import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ExpenseWithItems } from "../../types/expense";
import { formatCurrency } from "../../utils/currency";

const { width: screenWidth } = Dimensions.get("window");

interface ExpenseDetailsModalProps {
  visible: boolean;
  expense: ExpenseWithItems | null;
  onClose: () => void;
}

export function ExpenseDetailsModal({
  visible,
  expense,
  onClose,
}: ExpenseDetailsModalProps) {
  if (!expense) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <ThemedView style={styles.detailsModalOverlay}>
        <ThemedView style={styles.detailsModalContent}>
          <ThemedView style={styles.detailsHeader}>
            <ThemedText style={styles.detailsTitle}>Expense Details</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </ThemedView>

          <ScrollView style={styles.detailsBody}>
            <ThemedView style={styles.detailSection}>
              <ThemedText style={styles.sectionTitle}>
                Store Information
              </ThemedText>
              <ThemedText style={styles.detailText}>
                <ThemedText style={styles.detailLabel}>Store: </ThemedText>
                {expense.merchant_name || "Unknown Store"}
              </ThemedText>
              <ThemedText style={styles.detailText}>
                <ThemedText style={styles.detailLabel}>Category: </ThemedText>
                {expense.category}
              </ThemedText>
              <ThemedText style={styles.detailText}>
                <ThemedText style={styles.detailLabel}>Date: </ThemedText>
                {new Date(expense.transaction_date).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </ThemedText>
              <ThemedText style={styles.detailText}>
                <ThemedText style={styles.detailLabel}>Payment: </ThemedText>
                {expense.payment_method || "Not specified"}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.detailSection}>
              <ThemedText style={styles.sectionTitle}>
                Amount Breakdown
              </ThemedText>
              <ThemedText style={styles.detailText}>
                <ThemedText style={styles.detailLabel}>Subtotal: </ThemedText>
                {formatCurrency(expense.subtotal, expense.currency)}
              </ThemedText>
              <ThemedText style={styles.detailText}>
                <ThemedText style={styles.detailLabel}>Tax: </ThemedText>
                {formatCurrency(expense.tax, expense.currency)}
              </ThemedText>
              <ThemedText style={[styles.detailText, styles.totalText]}>
                <ThemedText style={styles.detailLabel}>Total: </ThemedText>
                {formatCurrency(expense.total, expense.currency)}
              </ThemedText>
            </ThemedView>

            {expense.expense_items.length > 0 && (
              <ThemedView style={styles.detailSection}>
                <ThemedText style={styles.sectionTitle}>
                  Items ({expense.expense_items.length})
                </ThemedText>
                {expense.expense_items.map((item, index) => (
                  <ThemedView key={item.id || index} style={styles.itemRow}>
                    <ThemedView style={styles.itemInfo}>
                      <ThemedText style={styles.itemName}>
                        {item.item_name}
                      </ThemedText>
                      <ThemedText style={styles.itemDetails}>
                        Qty: {item.quantity} ×{" "}
                        {formatCurrency(item.unit_price || 0, expense.currency)}
                      </ThemedText>
                      {item.category && (
                        <ThemedText style={styles.itemCategory}>
                          Category: {item.category}
                        </ThemedText>
                      )}
                    </ThemedView>
                    <ThemedText style={styles.itemTotal}>
                      {formatCurrency(item.total_price, expense.currency)}
                    </ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            )}
          </ScrollView>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailsModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    width: screenWidth * 0.9,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  detailsBody: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#007AFF",
  },
  detailText: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 22,
  },
  detailLabel: {
    fontWeight: "600",
    color: "#333",
  },
  totalText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
    marginTop: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
});
