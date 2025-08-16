import { useAppColorScheme } from "@/hooks/useAppColorScheme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface KebabMenuProps {
  visible: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReanalyze?: () => void;
  isReceipt?: boolean;
  position?: {
    x: number;
    y: number;
  };
}

export function KebabMenu({
  visible,
  onClose,
  onEdit,
  onDelete,
  onReanalyze,
  isReceipt = false,
  position,
}: KebabMenuProps) {
  const colorScheme = useAppColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  
  const handleSelect = (action: () => void) => {
    onClose();
    setTimeout(action, 100);
  };

  // Calculate menu position
  const menuWidth = 150;
  const menuHeight = isReceipt ? 60 : 100; // 1 item for receipts, 2 items for expenses
  let menuX = position?.x || screenWidth / 2 - menuWidth / 2;
  let menuY = (position?.y || screenHeight / 2 - menuHeight / 2) + 5; // Add small gap below button
  
  // Adjust if menu would go off screen
  if (menuX + menuWidth > screenWidth - 20) {
    menuX = screenWidth - menuWidth - 20;
  }
  if (menuX < 20) {
    menuX = 20;
  }
  if (menuY + menuHeight > screenHeight - 20) {
    menuY = (position?.y || screenHeight / 2) - menuHeight - 10; // Show above button if no room below
  }
  if (menuY < 20) {
    menuY = 20;
  }

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
        <View 
          style={[
            styles.menuContainer, 
            { 
              backgroundColor: theme.cardBackground,
              position: 'absolute',
              top: menuY,
              left: menuX,
            }
          ]}
        >
          {isReceipt ? (
            // Receipt menu - only show Reanalyze option
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleSelect(onReanalyze!)}
            >
              <Ionicons name="refresh" size={16} color="#007AFF" />
              <Text style={[styles.menuText, { color: theme.text }]}>Reanalyze</Text>
            </TouchableOpacity>
          ) : (
            // Expense menu - show Edit and Delete options
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleSelect(onEdit!)}
              >
                <Ionicons name="pencil-outline" size={16} color="#FF9500" />
                <Text style={[styles.menuText, { color: theme.text }]}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleSelect(onDelete!)}
              >
                <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                <Text style={[styles.menuText, { color: "#FF3B30" }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  menuContainer: {
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
