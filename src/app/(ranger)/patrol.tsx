import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { PatrolService } from '../../services/patrolService';
import type { PatrolAssignment } from '../../services/patrolService';

export default function PatrolScreen() {
  const { theme } = useTheme();

  const [patrols, setPatrols] = useState<PatrolAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setError('');

      async function loadPatrols() {
        try {
          const assignments = await PatrolService.getMyAssignments();

          if (active) {
            setPatrols(assignments);
          }
        } catch (err: unknown) {
          if (active) {
            setError(
              err instanceof Error
                ? err.message
                : 'Could not load your patrols.',
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void loadPatrols();

      return () => {
        active = false;
      };
    }, [refreshKey]),
  );

  function refreshPatrols() {
    setRefreshKey((value) => value + 1);
  }

  function openPatrol(id: string) {
    router.push({
      pathname: '/(ranger)/patrol-session/details',
      params: { id },
    });
  }

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.background },
      ]}
    >
      <FlatList
        data={error ? [] : patrols}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshing={loading}
        onRefresh={refreshPatrols}
        ListHeaderComponent={
          <View style={styles.heading}>
            <View style={styles.headingText}>
              <Text
                style={[
                  styles.title,
                  { color: theme.textPrimary },
                ]}
              >
                My Patrols
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  { color: theme.textSecondary },
                ]}
              >
                Routes assigned to you
              </Text>
            </View>

            <TouchableOpacity
              onPress={refreshPatrols}
              disabled={loading}
              style={styles.refreshButton}
              accessibilityLabel="Refresh patrols"
            >
              <Ionicons
                name="refresh"
                size={24}
                color={theme.primary}
              />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <>
                <ActivityIndicator
                  size="large"
                  color={theme.primary}
                />
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Loading your patrols...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name={
                    error
                      ? 'alert-circle-outline'
                      : 'map-outline'
                  }
                  size={56}
                  color={error ? '#D32F2F' : theme.primary}
                />

                <Text
                  style={[
                    styles.emptyTitle,
                    { color: theme.textPrimary },
                  ]}
                >
                  {error
                    ? 'Unable to load patrols'
                    : 'No patrols assigned'}
                </Text>

                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {error ||
                    'Your manager’s assignments will appear here.'}
                </Text>

                {error ? (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={refreshPatrols}
                  >
                    <Text style={styles.buttonText}>
                      Try Again
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.inputBorder,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text
                style={[
                  styles.routeName,
                  { color: theme.textPrimary },
                ]}
              >
                {item.routeName}
              </Text>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.dateRow}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={theme.textSecondary}
              />
              <Text
                style={[
                  styles.dateText,
                  { color: theme.textSecondary },
                ]}
              >
                {item.patrolDate}
              </Text>
            </View>

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={theme.primary}
                />
                <Text style={{ color: theme.textPrimary }}>
                  {item.estimatedDurationMinutes} min
                </Text>
              </View>

              <View style={styles.metric}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={theme.primary}
                />
                <Text style={{ color: theme.textPrimary }}>
                  Approx. {item.approximateDistanceKm.toFixed(2)} km
                </Text>
              </View>
            </View>

            <View style={styles.routeInfo}>
              <Ionicons
                name="flag-outline"
                size={20}
                color="#1565C0"
              />
              <Text style={styles.routeInfoText}>
                {
                  item.points.filter(
                    (point) => point.type === 'checkpoint',
                  ).length
                } checkpoints
              </Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() => openPatrol(item.id)}
            >
              <Text style={styles.buttonText}>
                View Patrol
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    flexGrow: 1,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headingText: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  refreshButton: {
    padding: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeName: {
    flex: 1,
    fontSize: 21,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#1565C0',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  dateText: {
    fontSize: 14,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginVertical: 20,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  routeInfoText: {
    color: '#546E7A',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});