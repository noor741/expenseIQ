import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

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
  if (!hasMorePages) return null;

  return (
    <ThemedView style={styles.loadMoreContainer}>
      <TouchableOpacity
        style={[
          styles.loadMoreButton,
          loadingMore && styles.loadMoreButtonDisabled,
        ]}
        onPress={onLoadMore}
        disabled={loadingMore}
      >
        <ThemedText style={styles.loadMoreText}>
          {loadingMore ? "Loading..." : "Load More"}
        </ThemedText>
        {loadingMore && (
          <Ionicons
            name="refresh"
            size={16}
            color="#007AFF"
            style={styles.loadingIcon}
          />
        )}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadMoreContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadMoreButton: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  loadMoreButtonDisabled: {
    opacity: 0.6,
  },
  loadMoreText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingIcon: {
    marginLeft: 8,
  },
});
