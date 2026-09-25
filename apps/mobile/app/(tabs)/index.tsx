import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { Card, EmptyState } from '../../components/ui/Card';
import { Logo, SectionTitle, StatTile } from '../../components/ui/Bits';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { BRAND_GRADIENT, COLORS, formatDate, formatINR } from '../../lib/config';
import { formatPaymentMethod } from '../../lib/constants';

type Summary = {
  totalLoansCount: number;
  totalLoansAmount: number;
  totalMonthlyEmi: number;
  totalExpensesThisMonth: number;
  totalIncomeThisMonth: number;
  balance: number;
};
type TrendPoint = { key: string; label: string; income: number; expenses: number };
type Breakdown = { total: number; breakdown: { name: string; icon: string | null; total: number; percentage: number }[] };
type Tx = { id: string; type: 'INCOME' | 'EXPENSE'; description: string; amount: number; date: string; category: string; paymentMethod?: string | null };
type Upcoming = { id: string; kind: 'RECURRING' | 'LOAN_EMI'; title: string; amount: number; dueDate: string };

const BAR_COLORS = ['#2f7bff', '#3ddc5f', '#f5a524', '#14b8a6', '#a78bfa', '#fb7185', '#38bdf8', '#facc15'];

function safe<T>(p: Promise<T>, fallback: T) {
  return p.catch(() => fallback);
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown>({ total: 0, breakdown: [] });
  const [recent, setRecent] = useState<Tx[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const [s, t, b, r, u] = await Promise.all([
      safe(api<Summary>('/dashboard/summary'), null),
      safe(api<TrendPoint[]>('/dashboard/trend?months=6'), []),
      safe(api<Breakdown>('/dashboard/category-breakdown'), { total: 0, breakdown: [] }),
      safe(api<Tx[]>('/dashboard/recent-transactions?limit=8'), []),
      safe(api<Upcoming[]>('/dashboard/upcoming'), []),
    ]);
    setSummary(s);
    setTrend(Array.isArray(t) ? t : []);
    setBreakdown(b && Array.isArray(b.breakdown) ? b : { total: 0, breakdown: [] });
    setRecent(Array.isArray(r) ? r : []);
    setUpcoming(Array.isArray(u) ? u : []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const trendMax = Math.max(1, ...trend.flatMap((p) => [p.income, p.expenses]));
  const balance = summary?.balance ?? 0;

  return (
    <Screen
      title="WealthGuard"
      subtitle={user?.name || user?.email || undefined}
      left={<Logo size={40} />}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <LinearGradient colors={[...BRAND_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroLabel}>Savings this month</Text>
        <Text style={styles.heroValue}>{balance < 0 ? '-' : ''}{formatINR(Math.abs(balance))}</Text>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroSmall}>Income</Text>
            <Text style={styles.heroNum}>{formatINR(summary?.totalIncomeThisMonth)}</Text>
          </View>
          <View>
            <Text style={styles.heroSmall}>Expenses</Text>
            <Text style={styles.heroNum}>{formatINR(summary?.totalExpensesThisMonth)}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.grid}>
        <StatTile label="Active loans" value={String(summary?.totalLoansCount ?? 0)} sub={formatINR(summary?.totalLoansAmount)} icon="cash-outline" />
        <StatTile label="Monthly EMI" value={formatINR(summary?.totalMonthlyEmi)} icon="pulse-outline" tone="warning" />
      </View>

      <View style={styles.quick}>
        <QuickAction icon="business-outline" label="Loan" onPress={() => router.push('/loan/add')} />
        <QuickAction icon="remove-circle-outline" label="Expense" onPress={() => router.push('/expense/add')} />
        <QuickAction icon="add-circle-outline" label="Income" onPress={() => router.push('/income/add')} />
        <QuickAction icon="repeat-outline" label="Recurring" onPress={() => router.push('/recurring')} />
      </View>

      <Card>
        <SectionTitle>Spending trend</SectionTitle>
        {trend.length === 0 ? (
          <Text style={styles.muted}>No data yet for this period.</Text>
        ) : (
          <>
            <View style={styles.chart}>
              {trend.map((p) => (
                <View key={p.key} style={styles.chartCol}>
                  <View style={styles.bars}>
                    <View style={[styles.bar, { height: `${(p.income / trendMax) * 100}%`, backgroundColor: COLORS.green }]} />
                    <View style={[styles.bar, { height: `${(p.expenses / trendMax) * 100}%`, backgroundColor: '#fb7185' }]} />
                  </View>
                  <Text style={styles.chartLabel}>{p.label.split(' ')[0]}</Text>
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              <Legend color={COLORS.green} label="Income" />
              <Legend color="#fb7185" label="Expenses" />
            </View>
          </>
        )}
      </Card>

      <Card>
        <SectionTitle right={<Text style={styles.muted}>{formatINR(breakdown.total)}</Text>}>This month by category</SectionTitle>
        {breakdown.breakdown.length === 0 ? (
          <Text style={styles.muted}>No expenses this month.</Text>
        ) : (
          breakdown.breakdown.slice(0, 8).map((c, i) => (
            <View key={c.name} style={{ gap: 4 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.value}>{c.icon ? `${c.icon} ` : ''}{c.name}</Text>
                <Text style={styles.muted}>{formatINR(c.total)} · {c.percentage.toFixed(0)}%</Text>
              </View>
              <View style={styles.track}>
                <View style={{ width: `${c.percentage}%`, height: '100%', borderRadius: 999, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
              </View>
            </View>
          ))
        )}
      </Card>

      <Card>
        <SectionTitle>Upcoming</SectionTitle>
        {upcoming.length === 0 ? (
          <Text style={styles.muted}>Nothing due soon.</Text>
        ) : (
          upcoming.map((item) => (
            <View key={`${item.kind}-${item.id}`} style={styles.listRow}>
              <View style={[styles.dot, { backgroundColor: 'rgba(47,123,255,0.18)' }]}>
                <Ionicons name={item.kind === 'LOAN_EMI' ? 'business-outline' : 'repeat-outline'} size={14} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.value} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.muted}>{formatDate(item.dueDate)}</Text>
              </View>
              <Text style={styles.value}>{formatINR(item.amount)}</Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <SectionTitle>Recent transactions</SectionTitle>
        {recent.length === 0 ? (
          <EmptyState title="No transactions yet" />
        ) : (
          recent.map((tx) => {
            const income = tx.type === 'INCOME';
            return (
              <View key={`${tx.type}-${tx.id}`} style={styles.listRow}>
                <View style={[styles.dot, { backgroundColor: income ? 'rgba(52,211,153,0.16)' : 'rgba(244,63,94,0.16)' }]}>
                  <Ionicons name={income ? 'arrow-up' : 'arrow-down'} size={14} color={income ? COLORS.success : '#fb7185'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.value} numberOfLines={1}>{tx.description}</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {formatDate(tx.date)} · {tx.category}{tx.paymentMethod ? ` · ${formatPaymentMethod(tx.paymentMethod)}` : ''}
                  </Text>
                </View>
                <Text style={[styles.value, { color: income ? COLORS.success : COLORS.text }]}>
                  {income ? '+' : '-'}{formatINR(tx.amount)}
                </Text>
              </View>
            );
          })
        )}
      </Card>
    </Screen>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.qa, { opacity: pressed ? 0.8 : 1 }]}>
      <Ionicons name={icon} size={22} color={COLORS.gold} />
      <Text style={styles.qaLabel}>{label}</Text>
    </Pressable>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 22, padding: 20, gap: 6 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 32, fontWeight: '900' },
  heroRow: { flexDirection: 'row', gap: 32, marginTop: 6 },
  heroSmall: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  heroNum: { color: '#fff', fontSize: 15, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quick: { flexDirection: 'row', gap: 10 },
  qa: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  qaLabel: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  chart: { flexDirection: 'row', height: 140, alignItems: 'flex-end', gap: 6 },
  chartCol: { flex: 1, alignItems: 'center', gap: 6, height: '100%' },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 10, borderRadius: 4, minHeight: 2 },
  chartLabel: { color: COLORS.muted, fontSize: 10 },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  track: { height: 6, borderRadius: 999, backgroundColor: 'rgba(159,176,212,0.15)', overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  value: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: 12 },
});
