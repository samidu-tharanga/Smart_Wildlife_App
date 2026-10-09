import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { AppColors } from '../../constants/colors';
import { INCIDENT_TYPES } from '../../constants/incidents';
import { IncidentService, RangerIncident } from '../../services/incidentService';
import { IncidentWorkflowStatus } from '../../types/incident';
import { getStatusMeta, formatIncidentTime } from '../incident/IncidentCard';

type StatusFilter = 'ALL' | IncidentWorkflowStatus;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'RESOLVED', label: 'Resolved' },
];

export function IncidentReportsTab() {
  const { theme } = useTheme();
  const [incidents, setIncidents] = useState<(RangerIncident & { rangerName?: string; rawData: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedIncident, setSelectedIncident] = useState<(RangerIncident & { rangerName?: string; rawData: any }) | null>(null);

  // Close modal state
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsub = IncidentService.subscribeToAllIncidents(
      (items) => {
        setIncidents(items);
        setLoading(false);

        // Keep selected incident updated if open
        setSelectedIncident((current) => {
          if (!current) return null;
          return items.find((i) => i.id === current.id) ?? current;
        });
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filteredIncidents = incidents.filter((item) => {
    if (statusFilter === 'ALL') return true;
    return item.status === statusFilter;
  });

  async function handleStartProcessing(item: RangerIncident) {
    setActionLoading(true);
    try {
      await IncidentService.startProcessingIncident(item.id);
    } catch (err: any) {
      alert(`Could not update status: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmClose() {
    if (!selectedIncident) return;
    setActionLoading(true);
    try {
      await IncidentService.closeIncident(selectedIncident.id, closureReason);
      setShowCloseModal(false);
      setClosureReason('');
    } catch (err: any) {
      alert(`Could not close report: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  function handleAssignPatrol(item: RangerIncident & { rawData: any }) {
    setSelectedIncident(null);
    router.push({
      pathname: '/(manager)/assign',
      params: {
        incidentId: item.id,
        incidentType: item.incidentType,
        latitude: String(item.latitude),
        longitude: String(item.longitude),
      },
    });
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={AppColors.primaryBlue} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading incident reports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={40} color={AppColors.alertRed} />
        <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Failed to load incidents</Text>
        <Text style={[styles.errorSub, { color: theme.textSecondary }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
        {STATUS_FILTERS.map((f) => {
          const active = f.id === statusFilter;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setStatusFilter(f.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? AppColors.primaryBlue : theme.cardBg,
                  borderColor: active ? AppColors.primaryBlue : theme.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, { color: active ? AppColors.cleanWhite : theme.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Incident List */}
      <View style={styles.listContent}>
        {filteredIncidents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={42} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Incidents Found</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              {statusFilter === 'ALL'
                ? 'No incidents have been submitted yet.'
                : `No incidents currently marked as ${statusFilter}.`}
            </Text>
          </View>
        ) : (
          filteredIncidents.map((item) => {
            const option = INCIDENT_TYPES.find((t) => t.id === item.incidentType);
            const meta = getStatusMeta(item.status);
            const typeLabel = option?.label ?? item.incidentType;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                onPress={() => setSelectedIncident(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.typeRow}>
                    <View style={[styles.iconCircle, { backgroundColor: AppColors.lightBlue }]}>
                      <Ionicons name={(option?.icon as any) ?? 'alert-circle-outline'} size={20} color={AppColors.primaryBlue} />
                    </View>
                    <View style={styles.typeInfo}>
                      <Text style={[styles.typeTitle, { color: theme.textPrimary }]}>{typeLabel}</Text>
                      <Text style={[styles.rangerMeta, { color: theme.textSecondary }]}>
                        Reported by {item.rangerName || 'Ranger'} · {formatIncidentTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.badge, { backgroundColor: `${meta.color}20`, borderColor: meta.color }]}>
                    <Ionicons name={meta.icon} size={11} color={meta.color} />
                    <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                {!!item.description && (
                  <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}

                <View style={styles.cardFooter}>
                  {item.photoUrl ? (
                    <View style={styles.thumbnailContainer}>
                      <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} />
                      <Text style={[styles.photoTag, { color: theme.textSecondary }]}>Photo attached</Text>
                    </View>
                  ) : (
                    <View style={styles.thumbnailContainer}>
                      <Ionicons name="image-outline" size={16} color={theme.textSecondary} />
                      <Text style={[styles.photoTag, { color: theme.textSecondary }]}>No photo</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.detailsBtn, { backgroundColor: AppColors.lightBlue }]}
                    onPress={() => setSelectedIncident(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.detailsBtnText}>View Details</Text>
                    <Ionicons name="chevron-forward" size={14} color={AppColors.primaryBlue} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Incident Details Modal */}
      {selectedIncident && (
        <Modal animationType="slide" transparent visible onRequestClose={() => setSelectedIncident(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.cardBg }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Incident Details</Text>
                <TouchableOpacity onPress={() => setSelectedIncident(null)} style={styles.closeIconBtn}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody}>
                {/* Status Badge & Actions Banner */}
                {(() => {
                  const meta = getStatusMeta(selectedIncident.status);
                  return (
                    <View style={[styles.statusBanner, { backgroundColor: `${meta.color}15`, borderColor: meta.color }]}>
                      <Ionicons name={meta.icon} size={20} color={meta.color} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.statusBannerTitle, { color: meta.color }]}>
                          Status: {meta.label.toUpperCase()}
                        </Text>
                        <Text style={[styles.statusBannerSub, { color: theme.textSecondary }]}>
                          {selectedIncident.status === 'SUBMITTED' && 'Review required before taking action.'}
                          {selectedIncident.status === 'PROCESSING' && 'In review by Manager. Assign patrol or close.'}
                          {selectedIncident.status === 'ASSIGNED' && 'Follow-up patrol assigned to ranger.'}
                          {selectedIncident.status === 'CLOSED' && 'Closed with no field action required.'}
                          {selectedIncident.status === 'RESOLVED' && 'Follow-up patrol completed & resolved.'}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

                {/* Photo Preview if available */}
                {selectedIncident.photoUrl ? (
                  <View style={styles.photoContainer}>
                    <Image source={{ uri: selectedIncident.photoUrl }} style={styles.fullPhoto} resizeMode="cover" />
                  </View>
                ) : null}

                {/* Detail Items */}
                <View style={[styles.infoGroup, { borderColor: theme.border }]}>
                  <DetailItem
                    icon="alert-circle-outline"
                    label="Incident Type"
                    value={
                      INCIDENT_TYPES.find((t) => t.id === selectedIncident.incidentType)?.label ??
                      selectedIncident.incidentType
                    }
                    theme={theme}
                  />
                  <DetailItem
                    icon="person-outline"
                    label="Reporting Ranger"
                    value={selectedIncident.rangerName || selectedIncident.rawData?.rangerId || 'Unknown'}
                    theme={theme}
                  />
                  <DetailItem
                    icon="time-outline"
                    label="Reported Date & Time"
                    value={new Date(selectedIncident.createdAt).toLocaleString()}
                    theme={theme}
                  />
                  <DetailItem
                    icon="navigate-outline"
                    label="GPS Coordinates"
                    value={`${selectedIncident.latitude.toFixed(5)}, ${selectedIncident.longitude.toFixed(5)}`}
                    theme={theme}
                  />
                  {selectedIncident.rawData?.assignedPatrolId && (
                    <DetailItem
                      icon="walk-outline"
                      label="Assigned Patrol Ref"
                      value={selectedIncident.rawData.assignedPatrolId}
                      theme={theme}
                    />
                  )}
                  {selectedIncident.rawData?.closureReason && (
                    <DetailItem
                      icon="information-circle-outline"
                      label="Closure Reason"
                      value={selectedIncident.rawData.closureReason}
                      theme={theme}
                    />
                  )}
                </View>

                {/* Description */}
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Description</Text>
                <View style={[styles.descBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.descText, { color: theme.textPrimary }]}>
                    {selectedIncident.description || 'No description provided.'}
                  </Text>
                </View>

                {/* Action Buttons Workflow */}
                <View style={styles.modalActions}>
                  {selectedIncident.status === 'SUBMITTED' && (
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: AppColors.primaryBlue }]}
                      onPress={() => handleStartProcessing(selectedIncident)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color={AppColors.cleanWhite} />
                      ) : (
                        <>
                          <Ionicons name="eye-outline" size={18} color={AppColors.cleanWhite} />
                          <Text style={styles.actionBtnText}>Start Processing Report</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {(selectedIncident.status === 'SUBMITTED' || selectedIncident.status === 'PROCESSING') && (
                    <>
                      <TouchableOpacity
                        style={[styles.primaryActionBtn, { backgroundColor: AppColors.darkBlue }]}
                        onPress={() => handleAssignPatrol(selectedIncident)}
                      >
                        <Ionicons name="person-add-outline" size={18} color={AppColors.cleanWhite} />
                        <Text style={styles.actionBtnText}>Assign Follow-up Patrol</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.secondaryActionBtn, { borderColor: AppColors.slateGray }]}
                        onPress={() => setShowCloseModal(true)}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={AppColors.slateGray} />
                        <Text style={[styles.secondaryActionBtnText, { color: AppColors.slateGray }]}>
                          Close (No Field Action)
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Closure Confirmation Modal */}
      {showCloseModal && (
        <Modal animationType="fade" transparent visible onRequestClose={() => setShowCloseModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.confirmCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.confirmTitle, { color: theme.textPrimary }]}>Close Incident Report</Text>
              <Text style={[styles.confirmSub, { color: theme.textSecondary }]}>
                Provide a short reason for closing this report without field action:
              </Text>

              <TextInput
                style={[styles.reasonInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                placeholder="e.g., False alarm / Already investigated"
                placeholderTextColor={theme.textSecondary}
                value={closureReason}
                onChangeText={setClosureReason}
                multiline
                numberOfLines={3}
              />

              <View style={styles.confirmRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => setShowCloseModal(false)}
                  disabled={actionLoading}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmCloseBtn, { backgroundColor: AppColors.alertRed }]}
                  onPress={handleConfirmClose}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color={AppColors.cleanWhite} />
                  ) : (
                    <Text style={styles.confirmCloseText}>Confirm Close</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function DetailItem({
  icon,
  label,
  value,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: any;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={AppColors.slateGray} />
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}:</Text>
      <Text style={[styles.detailVal, { color: theme.textPrimary }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 10 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  errorTitle: { fontSize: 16, fontWeight: '700' },
  errorSub: { fontSize: 12, textAlign: 'center' },

  filterBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  typeRow: { flexDirection: 'row', gap: 10, flex: 1, marginRight: 8 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  typeInfo: { flex: 1 },
  typeTitle: { fontSize: 15, fontWeight: '700' },
  rangerMeta: { fontSize: 11, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  description: { fontSize: 13, lineHeight: 18 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EDF2F7' },
  thumbnailContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  thumbnail: { width: 32, height: 32, borderRadius: 6 },
  photoTag: { fontSize: 11 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  detailsBtnText: { fontSize: 12, fontWeight: '700', color: AppColors.primaryBlue },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 12, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%', padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeIconBtn: { padding: 4 },
  modalBody: { gap: 14, paddingBottom: 24 },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  statusBannerTitle: { fontSize: 13, fontWeight: '800' },
  statusBannerSub: { fontSize: 11, marginTop: 2 },

  photoContainer: { width: '100%', height: 200, borderRadius: 10, overflow: 'hidden' },
  fullPhoto: { width: '100%', height: '100%' },

  infoGroup: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 12, fontWeight: '600' },
  detailVal: { fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'right' },

  sectionHeading: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  descBox: { borderRadius: 8, borderWidth: 1, padding: 12 },
  descText: { fontSize: 13, lineHeight: 19 },

  modalActions: { gap: 10, marginTop: 8 },
  primaryActionBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 10 },
  actionBtnText: { color: AppColors.cleanWhite, fontSize: 14, fontWeight: '700' },
  secondaryActionBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  secondaryActionBtnText: { fontSize: 13, fontWeight: '700' },

  confirmCard: { margin: 20, padding: 18, borderRadius: 14, gap: 12, alignSelf: 'center', width: '90%' },
  confirmTitle: { fontSize: 16, fontWeight: '700' },
  confirmSub: { fontSize: 12, lineHeight: 17 },
  reasonInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, textAlignVertical: 'top' },
  confirmRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontWeight: '600' },
  confirmCloseBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  confirmCloseText: { color: AppColors.cleanWhite, fontSize: 13, fontWeight: '700' },
});
