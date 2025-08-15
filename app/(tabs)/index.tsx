
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const categories = [
  { name: 'Food', value: 90 },
  { name: 'Transport', value: 40 },
  { name: 'Utilities', value: 10 },
  { name: 'Entertainment', value: 30 },
];

const transactions = [
  { name: 'Coffee', category: 'Food', amount: -15 },
  { name: 'Uber', category: 'Transport', amount: -25 },
  { name: 'Electricity Bill', category: 'Utilities', amount: -100 },
  { name: 'Movie Ticket', category: 'Entertainment', amount: -12 },
];

export default function TabIndexScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ width: 48 }} />
            <Text style={styles.headerTitle}>Dashboard</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconButton}>
                <PlusIcon />
              </TouchableOpacity>
            </View>
          </View>

          {/* Total Balance */}
          <Text style={styles.sectionTitle}>Total Balance</Text>
          <Text style={styles.balance}>$1,234.56</Text>

          {/* Spending by Category */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>Spending by Category</Text>
            <Text style={styles.sectionAmount}>$1,234.56</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.sectionSubLabel}>This Month</Text>
              <Text style={styles.sectionSubLabelPositive}>+12%</Text>
            </View>
            <View style={styles.categoryBarGrid}>
              {categories.map((cat, idx) => (
                <View key={cat.name} style={{ alignItems: 'center', width: 60 }}>
                  <View style={{
                    width: '100%',
                    backgroundColor: '#e7edf4',
                    borderTopWidth: 2,
                    borderColor: '#49739c',
                    height: cat.value * 2,
                    marginBottom: 4,
                  }} />
                  <Text style={styles.categoryLabel}>{cat.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recent Transactions */}
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.map((tx, idx) => (
            <View key={idx} style={styles.transactionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.transactionName}>{tx.name}</Text>
                <Text style={styles.transactionCategory}>{tx.category}</Text>
              </View>
              <Text style={styles.transactionAmount}>{tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}



function PlusIcon() {
  return (
    <View>
      <Text style={{ fontSize: 24, color: '#0d141c' }}>＋</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#0d141c',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  iconButton: {
    height: 48,
    width: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    color: '#0d141c',
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 20,
    letterSpacing: -0.5,
  },
  balance: {
    color: '#0d141c',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 20,
  },
  sectionBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 0,
    gap: 8,
  },
  sectionLabel: {
    color: '#0d141c',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  sectionAmount: {
    color: '#0d141c',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  sectionSubLabel: {
    color: '#49739c',
    fontSize: 16,
    fontWeight: '400',
  },
  sectionSubLabelPositive: {
    color: '#078838',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  categoryBarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    minHeight: 180,
    gap: 12,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  categoryLabel: {
    color: '#49739c',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.2,
    textAlign: 'center',
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
