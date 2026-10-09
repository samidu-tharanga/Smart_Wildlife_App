import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useRangerIncidents } from '../../hooks/useRangerIncidents';
import { IncidentCard } from '../../components/incident/IncidentCard';

type Filter = 'ALL' | 'OPEN' | 'RESOLVED';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'RESOLVED', label: 'Resolved' },
];

export default function MyIncidentsScreen() {
  const { theme } = useTheme();
  const { incidents, loading, error } = useRangerIncidents();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return incidents;
    if (filter === 'RESOLVED') return incidents.filter((i) => i.status === 'RESOLVED');
    return incidents.filter((i) => i.status !== 'RESOLVED');
  }, [incidents, filter]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[
                styles.chip,
                { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : theme.cardBg },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : theme.textSecondary }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} color={theme.primary} />
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Could not load incidents: {error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <IncidentCard
              incident={item}
              expanded={expandedId === item.id}
              onPress={() => setExpandedId((cur) => (cur === item.id ? null : item.id))}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={36} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No incidents in this view.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
