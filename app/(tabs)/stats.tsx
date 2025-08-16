// app/screens/StatisticsScreen.tsx
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { supabase } from '../../lib/supabase';

type PeriodKey = 'weekly' | 'monthly' | 'yearly';

type Expense = {
  id: string;
  receipt_id: string;
  merchant_name: string | null;
  transaction_date: string; // ISO (YYYY-MM-DD)
  total: number | null;
};

type ExpenseItem = {
  expense_id: string;
  total_price: number | null;
  category: string | null; // text in your schema image
};

type Category = { id: string; name: string | null };
type Receipt = { id: string };

const fmtCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`;

function periodBounds(period: PeriodKey, anchor = dayjs()) {
  if (period === 'weekly') {
    const start = anchor.startOf('week');
    const end = start.add(1, 'week');
    const prevStart = start.subtract(1, 'week');
    const prevEnd = start;
    return { start, end, prevStart, prevEnd };
  }
  if (period === 'yearly') {
    const start = anchor.startOf('year');
    const end = start.add(1, 'year');
    const prevStart = start.subtract(1, 'year');
    const prevEnd = start;
    return { start, end, prevStart, prevEnd };
  }
  const start = anchor.startOf('month');
  const end = start.add(1, 'month');
  const prevStart = start.subtract(1, 'month');
  const prevEnd = start;
  return { start, end, prevStart, prevEnd };
}

function bucketKeyMonth(isoDate: string) {
  return dayjs(isoDate).startOf('month').format('YYYY-MM');
}

function pctDelta(curr: number, prev: number) {
  if (!prev) return null;
  return (curr - prev) / prev;
}

export default function StatisticsScreen() {
  const [period, setPeriod] = useState<PeriodKey>('monthly');
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [currExpenses, setCurrExpenses] = useState<Expense[]>([]);
  const [prevExpenses, setPrevExpenses] = useState<Expense[]>([]);
  const [trendExpenses, setTrendExpenses] = useState<Expense[]>([]);

  const [currItems, setCurrItems] = useState<ExpenseItem[]>([]);
  const [prevItems, setPrevItems] = useState<ExpenseItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);

    // user
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id;
    if (!uid) { setLoading(false); return; }

    // receipts for the user
    const { data: receipts, error: rErr } = await supabase
      .from('receipts')
      .select('id')
      .eq('user_id', uid)
      .limit(10000);
    if (rErr) { console.error(rErr); setLoading(false); return; }

    const recIds = (receipts ?? []).map((r: Receipt) => r.id);
    if (recIds.length === 0) {
      setCategories([]); setCurrExpenses([]); setPrevExpenses([]); setTrendExpenses([]);
      setCurrItems([]); setPrevItems([]);
      setLoading(false);
      return;
    }

    // categories (optional for mapping if you later store UUIDs on items)
    const { data: cats, error: cErr } = await supabase
      .from('categories')
      .select('id, name')
      .limit(1000);
    if (cErr) console.error(cErr);
    setCategories(cats ?? []);

    // date windows
    const { start, end, prevStart, prevEnd } = periodBounds(period, dayjs());

    // current period expenses (no category column here)
    const { data: curr, error: e1 } = await supabase
      .from('expenses')
      .select('id, receipt_id, merchant_name, transaction_date, total')
      .in('receipt_id', recIds)
      .gte('transaction_date', start.format('YYYY-MM-DD'))
      .lt('transaction_date', end.format('YYYY-MM-DD'))
      .limit(20000);
    if (e1) console.error(e1);

    // previous period expenses
    const { data: prev, error: e2 } = await supabase
      .from('expenses')
      .select('id, receipt_id, merchant_name, transaction_date, total')
      .in('receipt_id', recIds)
      .gte('transaction_date', prevStart.format('YYYY-MM-DD'))
      .lt('transaction_date', prevEnd.format('YYYY-MM-DD'))
      .limit(20000);
    if (e2) console.error(e2);

    // trend: last 6 months
    const trendStart = dayjs().startOf('month').subtract(5, 'month');
    const { data: trend, error: e3 } = await supabase
      .from('expenses')
      .select('id, receipt_id, merchant_name, transaction_date, total')
      .in('receipt_id', recIds)
      .gte('transaction_date', trendStart.format('YYYY-MM-DD'))
      .lt('transaction_date', dayjs().startOf('month').add(1, 'month').format('YYYY-MM-DD'))
      .limit(50000);
    if (e3) console.error(e3);

    // item-level categories for both periods (for "Spending by Category")
    const expenseIdsCurr = (curr ?? []).map(e => e.id);
    const expenseIdsPrev = (prev ?? []).map(e => e.id);

    const [{ data: itemsCurr, error: i1 }, { data: itemsPrev, error: i2 }] = await Promise.all([
      supabase.from('expense_items')
        .select('expense_id, total_price, category')
        .in('expense_id', expenseIdsCurr)
        .limit(50000),
      supabase.from('expense_items')
        .select('expense_id, total_price, category')
        .in('expense_id', expenseIdsPrev)
        .limit(50000),
    ]);
    if (i1) console.error(i1);
    if (i2) console.error(i2);

    setCurrExpenses(curr ?? []);
    setPrevExpenses(prev ?? []);
    setTrendExpenses(trend ?? []);
    setCurrItems(itemsCurr ?? []);
    setPrevItems(itemsPrev ?? []);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // If later you store UUIDs in expense_items.category, map them here.
  const catNameById = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach(c => { if (c.id) m.set(c.id, c.name ?? 'Uncategorized'); });
    return m;
  }, [categories]);

  // Spending by Category (uses expense_items)
  const byCategory = useMemo(() => {
    const totalCurr = currExpenses.reduce((a, e) => a + (e.total ?? 0), 0);
    const totalPrev = prevExpenses.reduce((a, e) => a + (e.total ?? 0), 0);

    const groupItems = (xs: ExpenseItem[]) => {
      const m = new Map<string, number>();
      xs.forEach(it => {
        // items.category is TEXT in your schema; if it's a UUID, swap to catNameById.get(uuid)
        const key = (it.category ?? 'Uncategorized').trim();
        m.set(key, (m.get(key) ?? 0) + (it.total_price ?? 0));
        return m;
      });
      return m;
    };

    const gCurr = groupItems(currItems);
    const gPrev = groupItems(prevItems);

    const rows = Array.from(gCurr.entries()).map(([name, amt]) => {
      const prevAmt = gPrev.get(name) ?? 0;
      return {
        category: catNameById.get(name) ?? name, // if name is already a label, this is a no-op
        amount: amt,
        pctOfTotal: totalCurr ? amt / totalCurr : 0,
        deltaPct: pctDelta(amt, prevAmt),
      };
    }).sort((a, b) => b.amount - a.amount);

    return { rows, totalCurr, totalPrev, totalDeltaPct: pctDelta(totalCurr, totalPrev) };
  }, [currExpenses, prevExpenses, currItems, prevItems, catNameById]);

  // Trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      months.push(dayjs().startOf('month').subtract(i, 'month').format('YYYY-MM'));
    }
    const m = new Map<string, number>(months.map(x => [x, 0]));
    trendExpenses.forEach(e => {
      const key = bucketKeyMonth(e.transaction_date);
      if (m.has(key)) m.set(key, (m.get(key) ?? 0) + (e.total ?? 0));
    });
    const series = months.map(k => ({ label: k, amount: m.get(k) ?? 0 }));
    const total6 = series.reduce((a, r) => a + r.amount, 0);
    return { series, total6 };
  }, [trendExpenses]);

  // Top Vendors (by expenses)
  const topVendors = useMemo(() => {
    const group = (xs: Expense[]) => {
      const m = new Map<string, number>();
      xs.forEach(e => {
        const key = e.merchant_name ?? 'Unknown';
        m.set(key, (m.get(key) ?? 0) + (e.total ?? 0));
      });
      return m;
    };
    const gCurr = group(currExpenses);
    const gPrev = group(prevExpenses);

    const rows = Array.from(gCurr.entries())
      .map(([vendor, amt]) => {
        const prevAmt = gPrev.get(vendor) ?? 0;
        return { vendor, amount: amt, deltaPct: pctDelta(amt, prevAmt) };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    const totalPeriod = currExpenses.reduce((a, e) => a + (e.total ?? 0), 0);
    const totalPrev = prevExpenses.reduce((a, e) => a + (e.total ?? 0), 0);

    return { rows, totalYear: totalPeriod, totalDeltaPct: pctDelta(totalPeriod, totalPrev) };
  }, [currExpenses, prevExpenses]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const headerTabs: PeriodKey[] = ['weekly', 'monthly', 'yearly'];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: 16 }}>
      {/* Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 60, marginBottom: 20 }}>
        {headerTabs.map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: p === period ? '#111' : '#f0f0f0'
            }}
          >
            <Text style={{ color: p === period ? 'white' : '#333', textTransform: 'capitalize' }}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Spending by Category */}
      <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 6 }}>Spending by Category</Text>
        <Text style={{ fontSize: 28, fontWeight: '700' }}>{fmtCurrency(byCategory.totalCurr)}</Text>
        <Text style={{ color: (byCategory.totalDeltaPct ?? 0) >= 0 ? 'green' : 'red', marginBottom: 8 }}>
          {period === 'weekly' ? 'This Week ' : period === 'yearly' ? 'This Year ' : 'This Month '}
          {byCategory.totalDeltaPct == null ? '—' : `${(byCategory.totalDeltaPct * 100).toFixed(0)}%`}
        </Text>

        {byCategory.rows.slice(0, 4).map((row, i) => (
          <View key={i} style={{ marginVertical: 6 }}>
            <Text style={{ fontSize: 13, marginBottom: 4 }}>{row.category}</Text>
            <View style={{ height: 10, backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden' }}>
              <View style={{ width: `${(row.pctOfTotal * 100).toFixed(0)}%` as any, height: 10, backgroundColor: '#111' }} />
            </View>
          </View>
        ))}
      </View>

      {/* Monthly Trend (last 6 months) */}
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 6 }}>Monthly Spending Trend</Text>
        <Text style={{ fontSize: 28, fontWeight: '700' }}>
          {fmtCurrency(monthlyTrend.series.reduce((a, r) => a + r.amount, 0))}
        </Text>
        <Text style={{ color: '#999', marginBottom: 8 }}>Last 6 Months</Text>

        <BarChart
          data={{
            labels: monthlyTrend.series.map(r => dayjs(r.label + '-01').format('MMM')),
            datasets: [{
              data: monthlyTrend.series.map(r => r.amount)
            }]
          }}
          width={Dimensions.get('window').width - 32}
          height={220}
          yAxisLabel="$"
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(17, 17, 17, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(17, 17, 17, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: "#ffa726"
            }
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
        />
      </View>

      {/* Top Vendors */}
      <View style={{ marginTop: 24, marginBottom: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 6 }}>Top Vendors</Text>
        <Text style={{ fontSize: 28, fontWeight: '700' }}>{fmtCurrency(topVendors.totalYear)}</Text>
        <Text style={{ color: (topVendors.totalDeltaPct ?? 0) >= 0 ? 'green' : 'red', marginBottom: 8 }}>
          {period === 'yearly' ? 'This Year ' : 'This Period '}
          {topVendors.totalDeltaPct == null ? '—' : `${(topVendors.totalDeltaPct * 100).toFixed(0)}%`}
        </Text>

        <BarChart
          data={{
            labels: topVendors.rows.map(r => (r.vendor || 'Unknown').slice(0, 8)),
            datasets: [{
              data: topVendors.rows.map(r => r.amount)
            }]
          }}
          width={Dimensions.get('window').width - 32}
          height={220}
          yAxisLabel="$"
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(17, 17, 17, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(17, 17, 17, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
        />

        {topVendors.rows.map((r, i) => (
          <View key={i} style={{ marginTop: 6 }}>
            <Text style={{ fontSize: 13 }}>
              {r.vendor}: {fmtCurrency(r.amount)} {r.deltaPct == null ? '' : `(${(r.deltaPct * 100).toFixed(0)}%)`}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
