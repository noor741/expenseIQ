import { useAppColorScheme } from "@/hooks/useAppColorScheme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface LoadMoreButtonProps {
  hasMorePages: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function LoadMoreButton({
  hasMorePages,
  loadingMore,
  onLoadMore,
}: LoadMoreButtonProps) {
  const colorScheme = useAppColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  
  if (!hasMorePages) return null;

  return (
    <View style={[styles.loadMoreContainer, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={[
          styles.loadMoreButton,
          { backgroundColor: theme.cardBackground, borderColor: "#007AFF" },
          loadingMore && styles.loadMoreButtonDisabled,
        ]}
        onPress={onLoadMore}
        disabled={loadingMore}
      >
        <Text style={[styles.loadMoreText, { color: "#007AFF" }]}>
          {loadingMore ? "Loading..." : "Load More"}
        </Text>
        {loadingMore && (
          <Ionicons
            name="refresh"
            size={16}
            color="#007AFF"
            style={styles.loadingIcon}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadMoreContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  loadMoreButtonDisabled: {
    opacity: 0.6,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingIcon: {
    marginLeft: 8,
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
