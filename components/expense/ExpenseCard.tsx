import { useAppColorScheme } from "@/hooks/useAppColorScheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { categoryIcons } from "../../constants/categoryIcons";
import { ExpenseWithItems } from "../../types/expense";
import { formatCurrency } from "../../utils/currency";

interface ExpenseCardProps {
  item: ExpenseWithItems;
  onKebabPress: (position: { x: number; y: number }) => void;
  isKebabVisible: boolean;
}

// Helper functions for status handling
const getStatusColor = (status?: string) => {
  switch (status) {
    case 'failed':
    case 'expense_creation_failed':
      return { background: '#ff4757', text: '#ffffff' };
    case 'processing':
      return { background: '#ffa502', text: '#ffffff' };
    case 'uploaded':
      return { background: '#5352ed', text: '#ffffff' };
    case 'processed_with_warnings':
      return { background: '#ff6348', text: '#ffffff' };
    default:
      return { background: '#2f3542', text: '#ffffff' };
  }
};

const getStatusText = (status?: string) => {
  switch (status) {
    case 'failed':
    case 'expense_creation_failed':
      return 'ERROR';
    case 'processing':
      return 'PROCESSING';
    case 'uploaded':
      return 'PENDING';
    case 'processed_with_warnings':
      return 'WARNING';
    default:
      return 'UNKNOWN';
  }
};

export function ExpenseCard({
  item,
  onKebabPress,
  isKebabVisible,
}: ExpenseCardProps) {
  const colorScheme = useAppColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const iconName = categoryIcons[item.category || "default"];
  const kebabButtonRef = useRef<View>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleKebabPress = () => {
    kebabButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      onKebabPress({
        x: pageX - 50, // Offset to center the menu relative to the button
        y: pageY + height + 5, // Position just below the button
      });
    });
  };

  const handleCardPress = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <TouchableOpacity
      style={[styles.expenseCard, { backgroundColor: theme.cardBackground }]}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <View style={styles.expenseContent}>
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <Ionicons name={iconName as any} size={24} color="#007AFF" />
          </View>

          <View style={styles.expenseInfo}>
            <Text style={[styles.merchantName, { color: theme.text }]}>
              {item.merchant_name || "Unknown Store"}
            </Text>
            <Text style={[styles.categoryText, { color: theme.secondaryText }]}>
              {item.category || "Uncategorized"}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          {/* Status Tag for Receipts */}
          {item.isReceipt && (
            <View style={[
              styles.statusTag, 
              { backgroundColor: getStatusColor(item.receiptStatus).background }
            ]}>
              <Text style={[
                styles.statusText, 
                { color: getStatusColor(item.receiptStatus).text }
              ]}>
                {getStatusText(item.receiptStatus)}
              </Text>
            </View>
          )}
          
          <Text style={[styles.amountText, { color: theme.text }]}>
            {formatCurrency(item.total, item.currency)}
          </Text>

          {/* Show upload date for receipts and kebab menu for actionable receipts */}
          {item.isReceipt ? (
            <View style={styles.receiptActions}>
              <Text style={[styles.uploadDate, { color: theme.secondaryText }]}>
                {`Uploaded ${new Date(item.uploadDate || item.created_at || '').toLocaleDateString()}`}
              </Text>
              {/* Show kebab menu for failed/pending receipts */}
              {(item.receiptStatus === 'failed' || 
                item.receiptStatus === 'uploaded' || 
                item.receiptStatus === 'expense_creation_failed') && (
                <TouchableOpacity 
                  ref={kebabButtonRef}
                  style={styles.kebabButton} 
                  onPress={handleKebabPress}
                >
                  <Ionicons name="ellipsis-horizontal" size={16} color={theme.secondaryText} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity 
              ref={kebabButtonRef}
              style={styles.kebabButton} 
              onPress={handleKebabPress}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color={theme.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Expandable Details Section */}
      {isExpanded && (
        <View style={[styles.detailsSection, { backgroundColor: theme.detailsBackground, borderTopColor: theme.borderColor }]}>
          {/* Vendor Name Header */}
          <Text style={[styles.detailsVendor, { color: theme.text }]}>
            {item.merchant_name || "Unknown Store"}
          </Text>

          {/* Item List */}
          <View style={styles.itemsList}>
            {item.expense_items && item.expense_items.length > 0 ? (
              item.expense_items.map((expenseItem, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: theme.text }]}>
                    {expenseItem.item_name || 'Unnamed Item'}
                    {expenseItem.quantity && expenseItem.quantity > 1 && (
                      <Text style={[styles.quantity, { color: theme.secondaryText }]}>
                        {` x${expenseItem.quantity}`}
                      </Text>
                    )}
                  </Text>
                  <Text style={[styles.itemPrice, { color: theme.text }]}>
                    {formatCurrency(expenseItem.total_price || expenseItem.unit_price, item.currency)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.itemRow}>
                <Text style={[styles.itemName, { color: theme.secondaryText }]}>
                  No items available
                </Text>
                <Text style={[styles.itemPrice, { color: theme.text }]}>
                  {formatCurrency(item.total, item.currency)}
                </Text>
              </View>
            )}
          </View>

          {/* Subtotal, Tax, and Total */}
          <View style={styles.summarySection}>
            {item.subtotal && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>Subtotal</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {formatCurrency(item.subtotal, item.currency)}
                </Text>
              </View>
            )}
            
            {item.tax && item.tax > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>Tax</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {formatCurrency(item.tax, item.currency)}
                </Text>
              </View>
            )}

            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.borderColor }]}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
              <Text style={[styles.totalValue, { color: theme.text }]}>
                {formatCurrency(item.total, item.currency)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  expenseCard: {
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
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 14,
    textTransform: "capitalize",
  },
  rightSection: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  kebabButton: {
    padding: 4,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  uploadDate: {
    fontSize: 12,
    marginTop: 2,
  },
  receiptActions: {
    alignItems: 'flex-end',
  },
  detailsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  detailsVendor: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  itemsList: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    marginRight: 12,
  },
  quantity: {
    fontSize: 14,
    fontStyle: "italic",
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "500",
  },
  summarySection: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  totalRow: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
  },
});

const lightTheme = {
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  detailsBackground: '#f8f9fa',
  text: '#000000',
  secondaryText: '#666666',
  borderColor: '#e0e0e0',
};

const darkTheme = {
  background: '#000000',
  cardBackground: '#1c1c1e',
  detailsBackground: '#2c2c2e',
  text: '#ffffff',
  secondaryText: '#999999',
  borderColor: '#3a3a3c',
};
