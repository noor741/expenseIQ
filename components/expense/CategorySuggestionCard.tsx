import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CategorySuggestionCardProps {
  suggestedCategoryName: string;
  confidence: number;
  method: 'rule_based' | 'semantic' | 'hybrid';
  onAccept: () => void;
  onDismiss: () => void;
}

export function CategorySuggestionCard({
  suggestedCategoryName,
  confidence,
  method,
  onAccept,
  onDismiss,
}: CategorySuggestionCardProps) {
  const colorScheme = useAppColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const getMethodText = (method: string) => {
    switch (method) {
      case 'rule_based':
        return 'Rule-based';
      case 'semantic':
        return 'AI Analysis';
      case 'hybrid':
        return 'AI + Rules';
      default:
        return 'AI';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#22c55e'; // Green for high confidence
    if (confidence >= 0.6) return '#f59e0b'; // Orange for medium confidence
    return '#ef4444'; // Red for low confidence
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.suggestionBackground, borderColor: theme.suggestionBorder }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={18} color="#6366f1" />
          <Text style={[styles.headerText, { color: theme.text }]}>AI Category Suggestion</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Ionicons name="close" size={16} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Suggested Category */}
      <View style={styles.categorySection}>
        <Text style={[styles.categoryLabel, { color: theme.secondaryText }]}>Suggested:</Text>
        <Text style={[styles.categoryName, { color: theme.text }]}>{suggestedCategoryName}</Text>
      </View>

      {/* Confidence and Method */}
      <View style={styles.metadataSection}>
        <View style={styles.metadataItem}>
          <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(confidence) }]}>
            <Text style={styles.confidenceText}>
              {getConfidenceText(confidence)} ({Math.round(confidence * 100)}%)
            </Text>
          </View>
        </View>
        <View style={styles.metadataItem}>
          <Text style={[styles.methodText, { color: theme.secondaryText }]}>
            via {getMethodText(method)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.dismissActionButton, { borderColor: theme.borderColor }]} 
          onPress={onDismiss}
        >
          <Text style={[styles.dismissActionText, { color: theme.secondaryText }]}>Not Now</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.acceptButton, { backgroundColor: '#6366f1' }]} 
          onPress={onAccept}
        >
          <Text style={styles.acceptText}>Use This Category</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dismissButton: {
    padding: 4,
  },
  categorySection: {
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  metadataSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  methodText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  dismissActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dismissActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

const lightTheme = {
  suggestionBackground: '#f0f9ff',
  suggestionBorder: '#bae6fd',
  text: '#000000',
  secondaryText: '#666666',
  borderColor: '#e0e0e0',
};

const darkTheme = {
  suggestionBackground: '#1e293b',
  suggestionBorder: '#334155',
  text: '#ffffff',
  secondaryText: '#94a3b8',
  borderColor: '#3a3a3c',
};
