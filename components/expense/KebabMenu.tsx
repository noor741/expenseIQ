import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, TouchableOpacity } from "react-native";

interface KebabMenuProps {
  visible: boolean;
  onClose: () => void;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function KebabMenu({
  visible,
  onClose,
  onViewDetails,
  onEdit,
  onDelete,
}: KebabMenuProps) {
  const handleSelect = (action: () => void) => {
    onClose();
    setTimeout(action, 100);
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <ThemedView style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleSelect(onViewDetails)}
          >
            <Ionicons name="eye-outline" size={16} color="#007AFF" />
            <ThemedText style={styles.menuText}>View Details</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleSelect(onEdit)}
          >
            <Ionicons name="pencil-outline" size={16} color="#FF9500" />
            <ThemedText style={styles.menuText}>Edit</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleSelect(onDelete)}
          >
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
            <ThemedText style={[styles.menuText, { color: "#FF3B30" }]}>
              Delete
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 150,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  menuText: {
    marginLeft: 8,
    fontSize: 16,
  },
});
