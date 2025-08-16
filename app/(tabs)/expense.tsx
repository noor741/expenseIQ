import { Ionicons } from "@expo/vector-icons";
import { TamaguiProvider, View, createTamagui } from "@tamagui/core";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text } from "react-native";

import { ExpenseCard } from "@/components/expense/ExpenseCard";
import { KebabMenu } from "@/components/expense/KebabMenu";
import { LoadMoreButton } from "@/components/expense/LoadMoreButton";
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { supabase } from "@/lib/supabase";
import { ExpenseService } from "@/services/expenseService";
import { ExpenseWithItems } from "@/types/expense";
import { defaultConfig } from "@tamagui/config/v4";

const config = createTamagui(defaultConfig);

// Cache for expenses data
let expensesCache: {
  data: ExpenseWithItems[];
  timestamp: number;
  currentPage: number;
  hasMorePages: boolean;
} | null = null;

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for expenses (more frequent updates expected)

export default function ExpenseScreen() {
  const colorScheme = useAppColorScheme();
  const [expenses, setExpenses] = useState<ExpenseWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kebabVisible, setKebabVisible] = useState<string | null>(null);
  const [kebabPosition, setKebabPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Theme setup
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    // Check if we have cached data that's still valid
    if (expensesCache && (Date.now() - expensesCache.timestamp) < CACHE_DURATION) {
      console.log('📦 Using cached expenses data');
      setExpenses(expensesCache.data);
      setCurrentPage(expensesCache.currentPage);
      setHasMorePages(expensesCache.hasMorePages);
      setHasLoadedOnce(true);
      setLoading(false);
    } else if (!hasLoadedOnce) {
      // Only load from API if we haven't loaded before or cache is expired
      fetchExpenses();
    }
  }, [hasLoadedOnce]);

  const fetchExpenses = async (isRefresh = false, pageNumber = 1) => {
    try {
      // If not refreshing and we have valid cache for page 1, use it
      if (!isRefresh && pageNumber === 1 && expensesCache && (Date.now() - expensesCache.timestamp) < CACHE_DURATION) {
        console.log('📦 Using cached expenses data');
        setExpenses(expensesCache.data);
        setCurrentPage(expensesCache.currentPage);
        setHasMorePages(expensesCache.hasMorePages);
        setLoading(false);
        setHasLoadedOnce(true);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
        setCurrentPage(1);
        setHasMorePages(true);
        // Clear cache on refresh
        expensesCache = null;
      } else if (pageNumber > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log(`🔍 Fetching expenses and receipts for page ${pageNumber}...`);

      const expensesWithItems = await ExpenseService.fetchExpensesAndReceipts(pageNumber);

      if (expensesWithItems.length === 0) {
        if (pageNumber === 1) {
          setExpenses([]);
          // Cache empty result
          expensesCache = {
            data: [],
            timestamp: Date.now(),
            currentPage: 1,
            hasMorePages: false
          };
        }
        setHasMorePages(false);
        setHasLoadedOnce(true);
        return;
      }

      // Check if we have fewer items than requested (last page)
      const hasMore = expensesWithItems.length >= ExpenseService.getItemsPerPage();
      setHasMorePages(hasMore);

      let finalExpenses: ExpenseWithItems[];
      let finalPage: number;

      if (isRefresh || pageNumber === 1) {
        finalExpenses = expensesWithItems;
        finalPage = 1;
        setExpenses(expensesWithItems);
        setCurrentPage(1);
      } else {
        // Append new expenses for pagination
        finalExpenses = [...expenses, ...expensesWithItems];
        finalPage = pageNumber;
        setExpenses(finalExpenses);
        setCurrentPage(pageNumber);
      }

      // Cache the data (only cache first page to keep it simple)
      if (pageNumber === 1) {
        expensesCache = {
          data: finalExpenses,
          timestamp: Date.now(),
          currentPage: finalPage,
          hasMorePages: hasMore
        };
      }
      
      setHasLoadedOnce(true);
    } catch (err) {
      console.error("💥 Error fetching expenses:", err);
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleReanalyze = async (receipt: ExpenseWithItems) => {
    Alert.alert(
      "Reanalyze Receipt",
      `Do you want to reanalyze the receipt from ${receipt.merchant_name || "Unknown Store"}?\n\nThis will retry the OCR processing and attempt to extract expense data.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reanalyze",
          style: "default",
          onPress: async () => {
            try {
              console.log('🔄 Reanalyzing receipt:', receipt.id);
              
              // Get the current session token
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                Alert.alert("Error", "You must be logged in to reanalyze receipts");
                return;
              }
              
              // Call the receipt processing API with proper auth token
              const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/receipts/${receipt.id}/reprocess`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
              });

              const responseData = await response.json();
              console.log('🔄 Reanalyze response:', response.status, responseData);

              if (response.ok) {
                // Clear cache since data has changed
                expensesCache = null;
                Alert.alert("Success", "Receipt is being reanalyzed. Please check back in a few moments.");
                // Refresh the list to get updated status
                fetchExpenses(true, 1);
              } else {
                const errorMsg = responseData?.message || 'Failed to reanalyze receipt. Please try again.';
                Alert.alert("Error", errorMsg);
              }
            } catch (err) {
              console.error('🔄 Reanalyze error:', err);
              Alert.alert("Error", "Network error occurred while reanalyzing receipt");
            }
          },
        },
      ]
    );
  };

  const handleDeleteReceipt = async (receipt: ExpenseWithItems) => {
    Alert.alert(
      "Delete Receipt",
      `Are you sure you want to permanently delete this receipt?\n\n${
        receipt.merchant_name || "Unknown Store"
      }\nUploaded: ${new Date(receipt.uploadDate || receipt.created_at || '').toLocaleDateString()}\n\nThis will delete:\n• The receipt record\n• The receipt image from storage\n• All related data\n\nThis action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('🗑️ Attempting to delete receipt:', receipt.id);
              
              // Get the current session token
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                Alert.alert("Error", "You must be logged in to delete receipts");
                return;
              }
              
              // Call the receipts DELETE API
              const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/receipts/${receipt.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
              });

              const responseData = await response.json();
              console.log('🗑️ Delete receipt response:', response.status, responseData);

              if (response.ok) {
                // Clear cache since data has changed
                expensesCache = null;
                // Remove from local state
                setExpenses((prev) => prev.filter((e) => e.id !== receipt.id));
                Alert.alert("Success", "Receipt and all related data deleted successfully");
              } else {
                const errorMsg = responseData?.message || 'Failed to delete receipt. Please try again.';
                Alert.alert("Error", errorMsg);
              }
            } catch (err) {
              console.error('🗑️ Delete receipt error:', err);
              Alert.alert("Error", "Network error occurred while deleting receipt");
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (expense: ExpenseWithItems) => {
    Alert.alert(
      "Delete Expense",
      `Are you sure you want to permanently delete this expense?\n\n${
        expense.merchant_name || "Unknown Merchant"
      }\n$${expense.total?.toFixed(2) || "0.00"} ${expense.currency || "CAD"}\n\nThis will delete:\n• The expense record\n• All expense items\n• The receipt image\n• All related data\n\nThis action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('🗑️ Attempting to delete expense:', expense.id);
              
              const success = await ExpenseService.deleteExpense(expense.id);
              console.log('🗑️ Delete result:', success);
              
              if (success) {
                // Clear cache since data has changed
                expensesCache = null;
                // Remove from local state
                setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
                Alert.alert("Success", "Expense and all related data deleted successfully");
              } else {
                Alert.alert("Error", "Failed to delete expense. Please try again.");
              }
            } catch (err) {
              console.error('🗑️ Delete error:', err);
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              Alert.alert("Error", `Network error occurred while deleting expense: ${errorMessage}`);
            }
          },
        },
      ]
    );
  };

  const handleEdit = (expense: ExpenseWithItems) => {
    // Clear cache when editing (for future implementation)
    expensesCache = null;
    Alert.alert(
      "Edit",
      `Edit functionality for ${
        expense.merchant_name || "Unknown"
      } can be implemented here.`
    );
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
      onKebabPress={(position) => {
        setKebabPosition(position);
        setKebabVisible(item.id);
      }}
      isKebabVisible={kebabVisible === item.id}
    />
  );

  if (loading) {
    return (
      <TamaguiProvider config={config}>
        <View
          height="100%"
          backgroundColor={theme.background}
          style={[styles.centerContainer, { backgroundColor: theme.background }]}
        >
          <Ionicons name="receipt-outline" size={64} color={theme.secondaryText} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading expenses...
          </Text>
        </View>
      </TamaguiProvider>
    );
  }

  if (error) {
    return (
      <TamaguiProvider config={config}>
        <View
          height="100%"
          backgroundColor={theme.background}
          style={[styles.centerContainer, { backgroundColor: theme.background }]}
        >
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={[styles.errorText, { color: theme.text }]}>Error: {error}</Text>
        </View>
      </TamaguiProvider>
    );
  }

  if (expenses.length === 0) {
    return (
      <TamaguiProvider config={config}>
        <View
          height="100%"
          backgroundColor={theme.background}
          style={[styles.centerContainer, { backgroundColor: theme.background }]}
        >
          <Ionicons name="receipt-outline" size={64} color={theme.secondaryText} />
          <Text style={[styles.emptyText, { color: theme.text }]}>No expenses found</Text>
          <Text style={[styles.emptySubtext, { color: theme.secondaryText }]}>
            Upload some receipts to see your expenses here
          </Text>
          <Text style={[styles.paginationInfo, { color: theme.secondaryText }]}>
            Showing up to {ExpenseService.getItemsPerPage()} transactions per
            page
          </Text>
        </View>
      </TamaguiProvider>
    );
  }

  return (
    <TamaguiProvider config={config}>
      <View height="100%" backgroundColor={theme.background}>
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Recent Transactions
          </Text>
          {expenses.length > 0 && (
            <Text style={[styles.paginationCounter, { color: theme.secondaryText }]}>
              Showing {expenses.length} transactions
              {hasMorePages ? " • Load more available" : ""}
            </Text>
          )}
        </View>

        <FlatList
          data={expenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, { backgroundColor: theme.background }]}
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
          position={kebabPosition || undefined}
          isReceipt={expenses.find((e) => e.id === kebabVisible)?.isReceipt || false}
          onClose={() => {
            setKebabVisible(null);
            setKebabPosition(null);
          }}
          onEdit={() => {
            const expense = expenses.find((e) => e.id === kebabVisible);
            if (expense && !expense.isReceipt) handleEdit(expense);
          }}
          onDelete={() => {
            const item = expenses.find((e) => e.id === kebabVisible);
            if (item?.isReceipt) {
              handleDeleteReceipt(item);
            } else if (item) {
              handleDelete(item);
            }
          }}
          onReanalyze={() => {
            const receipt = expenses.find((e) => e.id === kebabVisible);
            if (receipt && receipt.isReceipt) handleReanalyze(receipt);
          }}
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
    borderBottomColor: "rgba(240, 240, 240, 0.3)",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
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
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  paginationInfo: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  listFooter: {
    paddingBottom: 20,
  },
});

const lightTheme = {
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  text: '#000000',
  secondaryText: '#666666',
};

const darkTheme = {
  background: '#000000',
  cardBackground: '#1c1c1e',
  text: '#ffffff',
  secondaryText: '#999999',
};

// Utility function to clear expenses cache from other parts of the app
export const clearExpensesCache = () => {
  expensesCache = null;
  console.log('🗑️ Expenses cache cleared');
};