import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const bannerImage = require('../../assets/banner.jpg');

const managerActions = [
  {
    title: 'Assign a patrol',
    description: 'Create and assign ranger patrols',
    icon: 'person-add-outline' as const,
    route: '/(manager)/assign' as const,
    color: '#1565C0',
  },
  {
    title: 'Monitor patrols',
    description: 'Review field activity and patrol status',
    icon: 'map-outline' as const,
    route: '/(manager)/monitor' as const,
    color: '#2E7D32',
  },
  {
    title: 'Conservation reports',
    description: 'Review park activity and incident reports',
    icon: 'bar-chart-outline' as const,
    route: '/(manager)/reports' as const,
    color: '#0D47A1',
  },
];

const metrics = [
  { label: 'Active patrols', icon: 'walk-outline' as const },
  { label: 'Open incidents', icon: 'alert-circle-outline' as const },
  { label: 'Wildlife alerts', icon: 'paw-outline' as const },
];

export default function ManagerDashboard() {
  const { theme, isDarkMode, toggleTheme } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.bannerContainer}>
          <Image source={bannerImage} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.bannerOverlay}>
            <View style={styles.headerIcon}>
              <Ionicons name="leaf-outline" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>SMART WILDLIFE</Text>
              <Text style={styles.title}>Park operations</Text>
              <Text style={styles.subtitle}>Manager overview</Text>
            </View>
            <TouchableOpacity style={styles.darkToggleBtn} onPress={toggleTheme} activeOpacity={0.8}>
              <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Today at a glance</Text>
          <View style={styles.datePill}>
            <Ionicons name="calendar-outline" size={14} color="#0D47A1" />
            <Text style={styles.dateText}>{new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          {metrics.map((metric) => (
            <View key={metric.label} style={[styles.metricCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={styles.metricIcon}>
                <Ionicons name={metric.icon} size={19} color="#1565C0" />
              </View>
              <Text style={[styles.metricValue, { color: theme.textPrimary }]}>--</Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{metric.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.connectionNote}>
          <Ionicons name="information-circle-outline" size={19} color="#F57F17" />
          <Text style={styles.connectionText}>Live park metrics will appear when manager data is connected.</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Manager actions</Text>
        </View>

        <View style={styles.actionsList}>
          {managerActions.map((action) => (
            <TouchableOpacity
              key={action.title}
              accessibilityRole="button"
              accessibilityLabel={action.title}
              activeOpacity={0.8}
              onPress={() => router.navigate(action.route)}
              style={[styles.actionRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}14` }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>{action.title}</Text>
                <Text style={[styles.actionDescription, { color: theme.textSecondary }]}>{action.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color="#546E7A" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.activitySection}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent activity</Text>
          <View style={[styles.emptyState, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border }]}>
            <View style={styles.emptyIcon}>
              <Ionicons name="time-outline" size={23} color="#1565C0" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No activity to show</Text>
            <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>Recent patrol and incident updates will appear here.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  bannerContainer: { width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  bannerImage: { width: '100%', height: '100%', position: 'absolute' },
  bannerOverlay: { flex: 1, backgroundColor: 'rgba(13, 71, 161, 0.75)', padding: 18, flexDirection: 'row', alignItems: 'center' },
  headerIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  darkToggleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  
  headerCopy: { flex: 1 },
  eyebrow: { color: '#BBDEFB', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 23, fontWeight: '700', marginTop: 3 },
  subtitle: { color: '#E3F2FD', fontSize: 13, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dateText: { color: '#0D47A1', fontSize: 12, fontWeight: '600' },
  metricsGrid: { flexDirection: 'row', gap: 9, marginBottom: 12 },
  metricCard: {
    flex: 1,
    minHeight: 116,
    borderRadius: 8,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: { fontSize: 20, lineHeight: 24, fontWeight: '700' },
  metricLabel: { fontSize: 11, lineHeight: 15, marginTop: 2 },
  connectionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 3,
    borderLeftColor: '#F57F17',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 26,
    gap: 8,
  },
  connectionText: { flex: 1, color: '#546E7A', fontSize: 12, lineHeight: 17 },
  actionsList: { gap: 10 },
  actionRow: {
    minHeight: 76,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7EEF5',
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionCopy: { flex: 1, marginRight: 8 },
  actionTitle: { fontSize: 14, fontWeight: '700' },
  actionDescription: { fontSize: 11, lineHeight: 15, marginTop: 3 },
  activitySection: { marginTop: 26 },
  emptyState: {
    minHeight: 142,
    borderRadius: 8,
    marginTop: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7EEF5',
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptyDescription: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 4 },
});


