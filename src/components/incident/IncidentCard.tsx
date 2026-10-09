import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { INCIDENT_TYPES } from '../../constants/incidents';
import { RangerIncident } from '../../services/incidentService';
import { useTheme } from '../../context/ThemeContext';

import { AppColors } from '../../constants/colors';

const STATUS_META: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING_SYNC: { label: 'Pending Sync', color: AppColors.warningYellow, icon: 'cloud-offline-outline' },
  SUBMITTED: { label: 'Submitted', color: AppColors.primaryBlue, icon: 'paper-plane-outline' },
  PROCESSING: { label: 'Processing', color: '#8B5CF6', icon: 'sync-outline' },
  UNDER_REVIEW: { label: 'Processing', color: '#8B5CF6', icon: 'sync-outline' },
  IN_PROGRESS: { label: 'Processing', color: '#8B5CF6', icon: 'sync-outline' },
  ASSIGNED: { label: 'Assigned', color: AppColors.darkBlue, icon: 'person-add-outline' },
  CLOSED: { label: 'Closed', color: AppColors.slateGray, icon: 'close-circle-outline' },
  RESOLVED: { label: 'Resolved', color: AppColors.safeGreen, icon: 'checkmark-done-outline' },
};

export function getStatusMeta(status: string) {
  return (
    STATUS_META[status] ?? {
      label: status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      color: '#64748B',
      icon: 'ellipse-outline' as const,
    }
  );
}

export function formatIncidentTime(ms: number): string {
  const diffMin = Math.floor((Date.now() - ms) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  incident: RangerIncident;
  expanded?: boolean;
  onPress?: () => void;
}

export const IncidentCard = ({ incident, expanded = false, onPress }: Props) => {
  const { theme, isDarkMode } = useTheme();
  const option = INCIDENT_TYPES.find((t) => t.id === incident.incidentType);
  const status = getStatusMeta(incident.status);
  const hasPhoto = !!incident.photoUrl;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
    >
      <View style={styles.row}>
        <View style={[styles.iconBg, { backgroundColor: isDarkMode ? '#334155' : '#E3F2FD' }]}>
          <Ionicons name={(option?.icon as any) ?? 'alert-circle-outline'} size={22} color={theme.primary} />
        </View>

        <View style={styles.main}>
          <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
            {option?.label ?? incident.incidentType}
          </Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {formatIncidentTime(incident.createdAt)}
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: `${status.color}22`, borderColor: status.color }]}>
          <Ionicons name={status.icon} size={12} color={status.color} />
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {!!incident.description && (
        <Text
          style={[styles.description, { color: theme.textSecondary }]}
          numberOfLines={expanded ? undefined : 2}
        >
          {incident.description}
        </Text>
      )}

      {expanded && (
        <>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              {new Date(incident.createdAt).toLocaleString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="finger-print-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]} selectable>
              Ref: {incident.id}
            </Text>
          </View>
          {hasPhoto && (
            <Image source={{ uri: incident.photoUrl! }} style={styles.photo} resizeMode="cover" />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  main: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  detailText: {
    fontSize: 12,
    flexShrink: 1,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginTop: 10,
  },
});
