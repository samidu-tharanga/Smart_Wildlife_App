import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IncidentType, LocationData } from '../types/incident';
import { IncidentTypeSelect } from '../components/incident/IncidentTypeSelect';
import { PhotoCaptureCard } from '../components/incident/PhotoCaptureCard';
import { LocationCard } from '../components/incident/LocationCard';
import { Button } from '../components/ui/Button';
import { useCamera } from '../hooks/useCamera';
import { useDeviceLocation } from '../hooks/useDeviceLocation';
import { useTheme } from '../context/ThemeContext';
import { IncidentService } from '../services/incidentService';
import { AppTheme } from '../theme';

export default function PublicReportScreen() {
  const { theme, isDarkMode } = useTheme();
  const [type, setType] = useState<IncidentType | null>(null);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [villagerName, setVillagerName] = useState('');
  const [villagerContact, setVillagerContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { takePhoto, loading: cameraLoading } = useCamera();
  const { fetchLocation, loading: locationLoading, error: locationError } = useDeviceLocation();

  const handleTakePhoto = async () => {
    const uri = await takePhoto();
    if (uri) {
      setPhotoUri(uri);
    }
  };

  const handleGetLocation = async () => {
    const loc = await fetchLocation();
    if (loc) {
      setLocation(loc);
    }
  };

  const handleSubmit = async () => {
    setTouched(true);

    if (!type) {
      Alert.alert('Required Field', 'Please select an incident type.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please provide a brief description of the incident.');
      return;
    }
    if (!location) {
      Alert.alert('Location Required', 'Please capture the current GPS location.');
      return;
    }

    setIsSubmitting(true);
    try {
      await IncidentService.submitPublicIncident({
        type: type,
        description: description.trim(),
        photoUri: photoUri,
        latitude: location.latitude,
        longitude: location.longitude,
        villagerName: villagerName.trim() || undefined,
        villagerContact: villagerContact.trim() || undefined,
      });

      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Submission Error', error.message || 'Could not submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header Bar */}
      <View style={[styles.navHeader, { backgroundColor: '#0D47A1', borderBottomColor: '#1565C0' }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.navTitleContainer}>
          <Text style={[styles.navTitle, { color: '#FFFFFF' }]}>Community Incident Report</Text>
          <Text style={[styles.navSubtitle, { color: '#E3F2FD' }]}>Public Wildlife Alert</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Notice Banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDarkMode ? '#1E293B' : '#FEF3C7', borderColor: isDarkMode ? '#334155' : '#FDE68A' }]}>
          <Ionicons name="megaphone" size={22} color="#D97706" />
          <Text style={[styles.infoBannerText, { color: isDarkMode ? '#FCD34D' : '#92400E' }]}>
            Villagers and residents can report wildlife hazards, snares, or sightings directly to the park manager without logging in.
          </Text>
        </View>

        {/* 1. Incident Type */}
        <IncidentTypeSelect selectedType={type} onSelect={setType} />

        {/* 2. Description */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Incident Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.inputBg,
                borderColor: touched && description.trim().length === 0 ? AppTheme.colors.danger : theme.inputBorder,
                color: theme.inputText,
              },
            ]}
            placeholder="Describe what you observed (e.g. elephant entered fence, wire snare found)..."
            placeholderTextColor={isDarkMode ? '#64748B' : '#90A4AE'}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (!touched) setTouched(true);
            }}
          />
        </View>

        {/* 3. Photo Capture */}
        <PhotoCaptureCard
          photoUri={photoUri}
          onTake={handleTakePhoto}
          onClear={() => setPhotoUri(null)}
          loading={cameraLoading}
        />

        {/* 4. Location Capture */}
        <LocationCard
          location={location}
          onGetLocation={handleGetLocation}
          loading={locationLoading}
          error={locationError}
        />

        {/* 5. Optional Reporter Info */}
        <View style={[styles.contactCard, { backgroundColor: theme.cardBg, borderColor: theme.inputBorder }]}>
          <View style={styles.contactHeader}>
            <Ionicons name="person-circle-outline" size={20} color={theme.primary} />
            <Text style={[styles.contactCardTitle, { color: theme.textPrimary }]}>
              Your Details (Optional)
            </Text>
          </View>
          <Text style={[styles.contactHelper, { color: theme.textSecondary }]}>
            Provide your contact info if you wish for the wildlife team to reach out for follow-up.
          </Text>

          <TextInput
            style={[
              styles.inputField,
              { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText },
            ]}
            placeholder="Your Name (Optional)"
            placeholderTextColor={isDarkMode ? '#64748B' : '#90A4AE'}
            value={villagerName}
            onChangeText={setVillagerName}
          />

          <TextInput
            style={[
              styles.inputField,
              { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText, marginTop: 10 },
            ]}
            placeholder="Phone Number (Optional)"
            placeholderTextColor={isDarkMode ? '#64748B' : '#90A4AE'}
            keyboardType="phone-pad"
            value={villagerContact}
            onChangeText={setVillagerContact}
          />
        </View>

        {/* Submit Button */}
        <View style={styles.actionContainer}>
          <Button
            title={isSubmitting ? "Submitting Report..." : "Submit Incident Report"}
            onPress={handleSubmit}
            disabled={isSubmitting}
            variant="primary"
          />
        </View>
      </ScrollView>

      {/* Modern Beautiful Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.replace('/');
        }}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={72} color="#059669" />
            </View>

            <Text style={styles.successModalTitle}>Report Submitted Successfully</Text>
            <Text style={styles.successModalMessage}>
              Thank you for contributing to wildlife conservation! Your incident report has been securely dispatched to the park management team.
            </Text>

            <View style={styles.successBadgeRow}>
              <Ionicons name="shield-checkmark" size={16} color="#059669" />
              <Text style={styles.successBadgeText}>Dispatched to Management</Text>
            </View>

            <TouchableOpacity
              style={styles.successReturnBtn}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.successReturnBtnText}>Return to Home / Login</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  successModalMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
  successBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 24,
  },
  successBadgeText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#059669',
  },
  successReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565C0',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
  },
  successReturnBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  navTitleContainer: {
    flex: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  navSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: AppTheme.colors.danger,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  contactCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contactCardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  contactHelper: {
    fontSize: 12,
    marginBottom: 12,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  actionContainer: {
    marginTop: 8,
  },
});
