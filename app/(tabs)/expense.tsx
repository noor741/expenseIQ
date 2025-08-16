import { Ionicons } from "@expo/vector-icons";
import { TamaguiProvider, View, createTamagui } from "@tamagui/core";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ExpenseCard } from "@/components/expense/ExpenseCard";
import { ExpenseDetailsModal } from "@/components/expense/ExpenseDetailsModal";
import { KebabMenu } from "@/components/expense/KebabMenu";
import { LoadMoreButton } from "@/components/expense/LoadMoreButton";
import { ExpenseService } from "@/services/expenseService";
import { ExpenseWithItems } from "@/types/expense";
import { defaultConfig } from "@tamagui/config/v4";

const config = createTamagui(defaultConfig);

export default function ExpenseScreen() {
  const [expenses, setExpenses] = useState<ExpenseWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] =
    useState<ExpenseWithItems | null>(null);
  const [kebabVisible, setKebabVisible] = useState<string | null>(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async (isRefresh = false, pageNumber = 1) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setCurrentPage(1);
        setHasMorePages(true);
      } else if (pageNumber > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log(`🔍 Fetching expenses for page ${pageNumber}...`);

      const expensesWithItems = await ExpenseService.fetchExpenses(pageNumber);

      if (expensesWithItems.length === 0) {
        if (pageNumber === 1) {
          setExpenses([]);
        }
        setHasMorePages(false);
        return;
      }

      // Check if we have fewer items than requested (last page)
      if (expensesWithItems.length < ExpenseService.getItemsPerPage()) {
        setHasMorePages(false);
      }

      if (isRefresh || pageNumber === 1) {
        setExpenses(expensesWithItems);
        setCurrentPage(1);
      } else {
        // Append new expenses for pagination
        setExpenses((prev) => [...prev, ...expensesWithItems]);
        setCurrentPage(pageNumber);
      }
    } catch (err) {
      console.error("💥 Error fetching expenses:", err);
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleDelete = async (expense: ExpenseWithItems) => {
    Alert.alert(
      "Delete Expense",
      `Are you sure you want to delete the expense from ${
        expense.merchant_name || "Unknown"
      }?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await ExpenseService.deleteExpense(expense.id);
              if (success) {
                setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
                Alert.alert("Success", "Expense deleted successfully");
              } else {
                Alert.alert("Error", "Failed to delete expense");
              }
            } catch (err) {
              Alert.alert("Error", "Network error occurred");
            }
          },
        },
      ]
    );
  };

  const handleEdit = (expense: ExpenseWithItems) => {
    Alert.alert(
      "Edit",
      `Edit functionality for ${
        expense.merchant_name || "Unknown"
      } can be implemented here.`
    );
  };

  const handleViewDetails = (expense: ExpenseWithItems) => {
    setSelectedExpense(expense);
    setDetailsModal(true);
  };

  const onRefresh = () => {
    fetchExpenses(true, 1);
  };

  const loadMoreExpenses = () => {
    if (!loadingMore && hasMorePages) {
      fetchExpenses(false, currentPage + 1);
    }
  };

  const renderExpenseItem = ({ item }: { item: ExpenseWithItems }) => (
    <ExpenseCard
      item={item}
      onPress={() => handleViewDetails(item)}
      onKebabPress={() => setKebabVisible(item.id)}
      isKebabVisible={kebabVisible === item.id}
    />
  );

  if (loading) {
    return (
      <TamaguiProvider config={config}>
        <View
          height="100%"
          backgroundColor="white"
          style={styles.centerContainer}
        >
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <ThemedText style={styles.loadingText}>
            Loading expenses...
          </ThemedText>
        </View>
      </TamaguiProvider>
    );
  }

  if (error) {
    return (
      <TamaguiProvider config={config}>
        <View
          height="100%"
          backgroundColor="white"
          style={styles.centerContainer}
        >
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
        </View>
      </TamaguiProvider>
    );
  }

  if (expenses.length === 0) {
    return (
      <TamaguiProvider config={config}>
        <View
          height="100%"
          backgroundColor="white"
          style={styles.centerContainer}
        >
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <ThemedText style={styles.emptyText}>No expenses found</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Upload some receipts to see your expenses here
          </ThemedText>
          <ThemedText style={styles.paginationInfo}>
            Showing up to {ExpenseService.getItemsPerPage()} transactions per
            page
          </ThemedText>
        </View>
      </TamaguiProvider>
    );
  }

  return (
    <TamaguiProvider config={config}>
      <View height="100%" backgroundColor="white">
        <ThemedView style={styles.header}>
          <ThemedText style={styles.headerTitle}>
            Recent Transactions
          </ThemedText>
          {expenses.length > 0 && (
            <ThemedText style={styles.paginationCounter}>
              Showing {expenses.length} transactions
              {hasMorePages && " • Load more available"}
            </ThemedText>
          )}
        </ThemedView>

        <FlatList
          data={expenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#007AFF"]}
            />
          }
          ListFooterComponent={() => (
            <LoadMoreButton
              hasMorePages={hasMorePages}
              loadingMore={loadingMore}
              onLoadMore={loadMoreExpenses}
            />
          )}
          ListFooterComponentStyle={styles.listFooter}
        />

        <KebabMenu
          visible={kebabVisible !== null}
          onClose={() => setKebabVisible(null)}
          onViewDetails={() => {
            const expense = expenses.find((e) => e.id === kebabVisible);
            if (expense) handleViewDetails(expense);
          }}
          onEdit={() => {
            const expense = expenses.find((e) => e.id === kebabVisible);
            if (expense) handleEdit(expense);
          }}
          onDelete={() => {
            const expense = expenses.find((e) => e.id === kebabVisible);
            if (expense) handleDelete(expense);
          }}
        />

        <ExpenseDetailsModal
          visible={detailsModal}
          expense={selectedExpense}
          onClose={() => setDetailsModal(false)}
        />
      </View>
    </TamaguiProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
  paginationCounter: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: "#666",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  paginationInfo: {
    fontSize: 12,
    color: "#ccc",
    textAlign: "center",
    marginTop: 8,
  },
  listFooter: {
    paddingBottom: 20,
  },
});
