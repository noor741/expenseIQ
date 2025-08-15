
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const transactions = [
  { name: 'Starbucks', category: 'Coffee', amount: -5.5, icon: '☕️', bg: '#e7edf4' },
  { name: 'Whole Foods', category: 'Groceries', amount: -75.2, icon: '🛒', bg: '#e7edf4' },
  { name: 'Uber', category: 'Transportation', amount: -12.8, icon: '🚗', bg: '#e7edf4' },
  { name: 'The Italian Place', category: 'Dining', amount: -45.0, icon: '🍝', bg: '#e7edf4' },
  { name: 'Cinema', category: 'Entertainment', amount: -20.0, icon: '🎬', bg: '#e7edf4' },
  { name: 'Amazon', category: 'Shopping', amount: -60.0, icon: '📦', bg: '#e7edf4' },
  { name: 'Electricity Bill', category: 'Utilities', amount: -85.0, icon: '🧾', bg: '#e7edf4' },
  { name: 'Doctor Visit', category: 'Healthcare', amount: -100.0, icon: '🩺', bg: '#e7edf4' },
  { name: 'Flight Ticket', category: 'Travel', amount: -300.0, icon: '✈️', bg: '#e7edf4' },
  { name: 'Streaming Service', category: 'Subscription', amount: -15.0, icon: '📺', bg: '#e7edf4' },
];

export default function ExpenseScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton}>
            <Text style={{ fontSize: 24, color: '#0d141c' }}>{'←'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recent Transactions</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {transactions.map((tx, idx) => (
            <View key={idx} style={styles.transactionRow}>
              <View style={styles.transactionLeft}>
                <View style={[styles.iconCircle, { backgroundColor: tx.bg }]}>
                  <Text style={{ fontSize: 24 }}>{tx.icon}</Text>
                </View>
                <View style={{ flexDirection: 'column', justifyContent: 'center' }}>
                  <Text style={styles.transactionName}>{tx.name}</Text>
                  <Text style={styles.transactionCategory}>{tx.category}</Text>
                </View>
              </View>
              <Text style={styles.transactionAmount}>{tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#0d141c',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    paddingRight: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    minHeight: 72,
    paddingVertical: 8,
    justifyContent: 'space-between',
    gap: 16,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  transactionName: {
    color: '#0d141c',
    fontSize: 16,
    fontWeight: '500',
  },
  transactionCategory: {
    color: '#49739c',
    fontSize: 14,
    fontWeight: '400',
  },
  transactionAmount: {
    color: '#0d141c',
    fontSize: 16,
    fontWeight: '400',
  },
});