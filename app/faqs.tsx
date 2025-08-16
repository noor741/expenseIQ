import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQ[] = [
  {
    id: '1',
    question: 'How do I scan a receipt?',
    answer: 'To scan a receipt, go to the Scan tab, tap the camera button, and either take a photo or select an image from your gallery. The app will automatically extract the information using AI.',
    category: 'Scanning',
  },
  {
    id: '2',
    question: 'How accurate is the OCR scanning?',
    answer: 'Our AI-powered OCR technology typically achieves 90-95% accuracy for clear, well-lit receipts. You can always review and edit the extracted information before saving.',
    category: 'Scanning',
  },
  {
    id: '3',
    question: 'Can I edit scanned receipt information?',
    answer: 'Yes! After scanning, you can review and edit all extracted information including merchant name, amount, date, and individual items before creating an expense.',
    category: 'Scanning',
  },
  {
    id: '4',
    question: 'How do I organize my expenses by category?',
    answer: 'Expenses are automatically categorized based on the merchant and items. You can also manually assign categories or create custom categories in Settings > Manage Categories.',
    category: 'Categories',
  },
  {
    id: '5',
    question: 'Can I create custom categories?',
    answer: 'Yes! Go to Settings > Manage Categories to create, edit, or delete custom expense categories that suit your needs.',
    category: 'Categories',
  },
  {
    id: '6',
    question: 'How do I change the default currency?',
    answer: 'Go to Settings > Currency to select your preferred default currency. This will be applied to all new expenses.',
    category: 'Settings',
  },
  {
    id: '7',
    question: 'Is my data secure and private?',
    answer: 'Yes! Your data is encrypted and stored securely. We use industry-standard security measures and never share your personal financial information.',
    category: 'Security',
  },
  {
    id: '8',
    question: 'Can I export my expense data?',
    answer: 'Currently, you can view your expense history and statistics within the app. Export features are planned for future updates.',
    category: 'Data',
  },
  {
    id: '9',
    question: 'What file formats are supported for receipts?',
    answer: 'We support JPEG, PNG, and other common image formats. For best results, ensure receipts are clear, well-lit, and fully visible.',
    category: 'Scanning',
  },
  {
    id: '10',
    question: 'How do I delete an expense or receipt?',
    answer: 'In your expense list, swipe left on any item to reveal delete option, or tap on an expense to view details and delete from there.',
    category: 'General',
  },
];

const CATEGORIES = ['All', 'Scanning', 'Categories', 'Settings', 'Security', 'Data', 'General'];

export default function FAQsScreen() {
  const colorScheme = useAppColorScheme();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQs = selectedCategory === 'All' 
    ? FAQS 
    : FAQS.filter(faq => faq.category === selectedCategory);

  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>FAQs</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              {
                backgroundColor: selectedCategory === category 
                  ? '#007AFF' 
                  : theme.cardBackground
              }
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                {
                  color: selectedCategory === category 
                    ? '#ffffff' 
                    : theme.text
                }
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAQ List */}
      <ScrollView style={styles.faqContainer}>
        {filteredFAQs.map((faq) => (
          <View key={faq.id} style={[styles.faqItem, { backgroundColor: theme.cardBackground }]}>
            <TouchableOpacity
              style={styles.faqQuestion}
              onPress={() => toggleExpanded(faq.id)}
            >
              <Text style={[styles.questionText, { color: theme.text }]}>
                {faq.question}
              </Text>
              <Ionicons
                name={expandedItems.has(faq.id) ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.secondaryText}
              />
            </TouchableOpacity>
            
            {expandedItems.has(faq.id) && (
              <View style={styles.faqAnswer}>
                <Text style={[styles.answerText, { color: theme.secondaryText }]}>
                  {faq.answer}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const lightTheme = {
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  text: '#000000',
  secondaryText: '#666666',
};

const darkTheme = {
  background: '#151718',
  cardBackground: '#1c1c1e',
  text: '#ffffff',
  secondaryText: '#999999',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  categoryContainer: {
    maxHeight: 50,
    marginBottom: 20,
  },
  categoryContent: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  faqContainer: {
    flex: 1,
  },
  faqItem: {
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
