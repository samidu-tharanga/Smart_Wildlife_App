import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AppTheme } from '../../theme';
import { auth } from '../../services/firebase';
import { useTheme } from '../../context/ThemeContext';
import { SyncService, SyncStatus } from '../../services/syncService';
import { useRangerIncidents } from '../../hooks/useRangerIncidents';
import { IncidentCard } from '../../components/incident/IncidentCard';
import { LocationService } from '../../services/locationService';
import { updateRangerLocation } from '../../services/rangerService';

const bannerImage = require('../../assets/banner.jpg');

export default function RangerDashboard() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('Ranger');
  const { isDarkMode, toggleTheme, theme } = useTheme();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');
  const [pendingCount, setPendingCount] = useState(0);
  const { incidents, loading: incidentsLoading } = useRangerIncidents();
  const recentIncidents = incidents.slice(0, 3);

  useEffect(() => {
    SyncService.init();
    const unsubscribe = SyncService.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });
    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;
      if (user) {
        setPhotoUrl(user.photoURL);
        setDisplayName(user.displayName || 'Ranger');
      }
    }, [])
  );

  const handleSOS = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Not logged in!');
        return;
      }

      const loc = await LocationService.getCurrentLocationAsync();
      await updateRangerLocation(user.uid, user.displayName || 'Ranger', loc.latitude, loc.longitude, true);
      Alert.alert('SOS Sent!', 'Your emergency alert & location have been sent to headquarters.');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'Failed to send SOS: ' + (e.message || e));
    }
  };

  const handleReportIncident = () => {
    router.push('/(ranger)/incident?reset=true');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? theme.header : AppTheme.colors.header }]} edges={['top', 'left', 'right']}>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
        
        {/* Cover Header Banner */}
        <View style={styles.bannerContainer}>
          <Image source={bannerImage} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.bannerOverlay}>
            <View style={styles.bannerHeaderRow}>
              <View style={styles.bannerBrandContainer}>
                <View style={styles.shieldIconContainer}>
                  <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.bannerTitle}>Wildlife Ranger</Text>
                  <Text style={styles.bannerSubtitle}>Conservation & Protection</Text>
                </View>
              </View>

              {/* Dark Mode Toggle Button */}
              <TouchableOpacity 
                style={styles.darkToggleBtn} 
                onPress={toggleTheme}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={isDarkMode ? "sunny" : "moon"} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.contentBody}>

          {/* Welcome Bar */}
          <View style={styles.welcomeBar}>
            <View style={styles.welcomeTextGroup}>
              <Text style={[styles.welcomeTitle, { color: theme.textPrimary }]}>
                Welcome back, {displayName} 👋
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>Stay alert, stay safe.</Text>
            </View>

            {/* Profile Avatar */}
            <TouchableOpacity 
              style={styles.avatarWrapper} 
              onPress={() => router.navigate('/(ranger)/profile')}
              activeOpacity={0.8}
            >
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDarkMode ? '#334155' : '#E3F2FD' }]}>
                  <Ionicons name="person" size={24} color={isDarkMode ? '#94A3B8' : '#546E7A'} />
                </View>
              )}
              <Text style={[styles.avatarLabel, { color: theme.textSecondary }]}>Ranger</Text>
            </TouchableOpacity>
          </View>

          {/* Sync Status Banner */}
          {syncStatus !== 'IDLE' && (
            <View style={[
              styles.syncBanner, 
              syncStatus === 'SUCCESS' ? styles.syncSuccess : styles.syncWarning,
              isDarkMode && syncStatus !== 'SUCCESS' ? { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#F59E0B' } : {},
              isDarkMode && syncStatus === 'SUCCESS' ? { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' } : {}
            ]}>
              <Ionicons 
                name={syncStatus === 'SUCCESS' ? 'checkmark-circle' : syncStatus === 'SYNCING' ? 'sync' : 'warning'} 
                size={20} 
                color={syncStatus === 'SUCCESS' ? (isDarkMode ? '#10B981' : '#059669') : (isDarkMode ? '#F59E0B' : '#D97706')} 
              />
              <Text style={[
                styles.syncText, 
                { color: syncStatus === 'SUCCESS' ? (isDarkMode ? '#10B981' : '#059669') : (isDarkMode ? '#FCD34D' : '#92400E') }
              ]}>
                {syncStatus === 'SUCCESS' 
                  ? 'All incidents synchronized successfully' 
                  : syncStatus === 'SYNCING' 
                    ? `Synchronizing ${pendingCount} incident(s)...`
                    : `${pendingCount} incident(s) pending synchronization`}
              </Text>
            </View>
          )}

          {/* Emergency SOS Card */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#D32F2F', marginBottom: 14 }]} 
            activeOpacity={0.85}
            onPress={handleSOS}
          >
            <View style={styles.actionIconBadge}>
              <Ionicons name="warning" size={26} color="#FFFFFF" />
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>EMERGENCY SOS</Text>
              <Text style={styles.actionDescription}>
                Broadcast emergency alert and live GPS location to park managers immediately.
              </Text>
            </View>

            <View style={styles.arrowBadge}>
              <Ionicons name="alert-circle" size={18} color="#D32F2F" />
            </View>
          </TouchableOpacity>

          {/* Action Card */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: theme.primary }]} 
            activeOpacity={0.85}
            onPress={handleReportIncident}
          >
            <View style={styles.actionIconBadge}>
              <Ionicons name="warning-outline" size={26} color="#FFFFFF" />
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Report Wildlife Incident</Text>
              <Text style={styles.actionDescription}>
                Report wildlife, poaching or other suspicious incidents encountered during patrol.
              </Text>
            </View>

            <View style={styles.arrowBadge}>
              <Ionicons name="arrow-forward" size={18} color={theme.primary} />
            </View>
          </TouchableOpacity>

          {/* Recent Incidents Section */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeaderRow}>
              <View style={styles.recentTitleGroup}>
                <Ionicons name="document-text" size={20} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.recentSectionTitle, { color: theme.textPrimary }]}>Recent Incidents</Text>
              </View>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/(ranger)/my-incidents')}>
                <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
                <Ionicons name="arrow-forward" size={14} color={theme.primary} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>

            {incidentsLoading ? (
              <ActivityIndicator color={theme.primary} style={{ paddingVertical: AppTheme.spacing.lg }} />
            ) : recentIncidents.length > 0 ? (
              recentIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onPress={() => router.push('/(ranger)/my-incidents')}
                />
              ))
            ) : (
            /* Empty State Box */
            <View style={[styles.emptyCard, { backgroundColor: theme.emptyCardBg, borderColor: isDarkMode ? '#334155' : '#B0BEC5' }]}>
              <View style={[styles.emptyIconBg, { backgroundColor: isDarkMode ? '#334155' : '#E3F2FD' }]}>
                <Ionicons name="document-text-outline" size={32} color={isDarkMode ? '#94A3B8' : '#546E7A'} />
              </View>
              <Text style={[styles.emptyStateTitle, { color: theme.textPrimary }]}>No incidents reported yet</Text>
              <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
                Once you report an incident, it will appear here for easy tracking and management.
              </Text>
            </View>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  bannerContainer: {
    height: 105,
    width: '100%',
    position: 'relative',
    backgroundColor: AppTheme.colors.header,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    opacity: 0.92,
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: AppTheme.spacing.md,
    paddingBottom: 10,
    paddingTop: 8,
    backgroundColor: 'rgba(13, 71, 161, 0.45)',
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  darkToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBody: {
    paddingHorizontal: AppTheme.spacing.md,
    paddingTop: 12,
    paddingBottom: AppTheme.spacing.lg,
  },
  welcomeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  welcomeTextGroup: {
    flex: 1,
    marginRight: 8,
  },
  welcomeTitle: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
  },
  welcomeSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  avatarWrapper: {
    alignItems: 'center',
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#E3F2FD',
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  syncWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  syncSuccess: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  syncText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  actionCard: {
    borderRadius: 14,
    padding: AppTheme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  actionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },
  actionTextContainer: {
    flex: 1,
    marginRight: 6,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 15,
  },
  arrowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentSection: {
    marginTop: 2,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recentTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: AppTheme.spacing.lg,
    paddingHorizontal: AppTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 17,
  },
});
