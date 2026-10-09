import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { INCIDENT_TYPES } from '../../constants/incidents';
import { IncidentService } from '../../services/incidentService';
import { useTheme } from '../../context/ThemeContext';

export default function IncidentReviewScreen() {
  const params = useLocalSearchParams();
  const { theme, isDarkMode } = useTheme();
  
  const { type, description, photoUri, latitude, longitude } = params;

  // Resolve the full incident object from the ID
  const incidentOption = INCIDENT_TYPES.find(t => t.id === type);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await IncidentService.submitIncident({
        type: type as string,
        description: description as string,
        photoUri: photoUri ? (photoUri as string) : null,
        latitude: Number(latitude),
        longitude: Number(longitude),
      });

      router.replace({
        pathname: '/(ranger)/success',
        params: { status: result.status }
      });
    } catch (error: any) {
      Alert.alert("Submission Failed", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    // Navigate back to the incident form so the user can modify the details
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        <View style={[styles.headerAlert, { backgroundColor: isDarkMode ? '#1E293B' : AppTheme.colors.selected }]}>
          <Ionicons name="information-circle" size={24} color={theme.primary} />
          <Text style={[styles.headerAlertText, { color: isDarkMode ? '#38BDF8' : AppTheme.colors.primary }]}>
            This is the information that will be submitted.
          </Text>
        </View>

        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDarkMode ? '#334155' : '#E0E1E6' }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Incident Type</Text>
          <View style={styles.row}>
            {incidentOption && (
              <Ionicons name={incidentOption.icon as any} size={24} color={theme.primary} />
            )}
            <Text style={[styles.valueText, { color: theme.textPrimary }]}>{incidentOption?.label || type}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: isDarkMode ? '#334155' : '#E0E1E6' }]} />

          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Description</Text>
          <Text style={[styles.descriptionText, { color: theme.inputText }]}>{description}</Text>

          <View style={[styles.divider, { backgroundColor: isDarkMode ? '#334155' : '#E0E1E6' }]} />

          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Location</Text>
          <View style={styles.row}>
            <Ionicons name="location" size={24} color={AppTheme.colors.success} />
            <Text style={[styles.valueText, { color: theme.textPrimary }]}>
              Lat: {Number(latitude).toFixed(5)}, Lng: {Number(longitude).toFixed(5)}
            </Text>
          </View>
        </View>

        {/* Photo Evidence Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDarkMode ? '#334155' : '#E0E1E6' }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Photo Evidence</Text>
          {photoUri ? (
            <Image 
              source={{ uri: photoUri as string }} 
              style={styles.imagePreview} 
              resizeMode="cover" 
            />
          ) : (
            <Text style={[styles.noPhotoText, { color: theme.textSecondary }]}>No photo provided.</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button 
            title="Edit" 
            variant="outline" 
            onPress={handleEdit} 
            style={styles.editButton} 
          />
          <Button 
            title="Submit Report" 
            onPress={handleSubmit}
            loading={isSubmitting} 
            style={styles.submitButton} 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: AppTheme.spacing.md,
    paddingBottom: AppTheme.spacing.xxl,
  },
  headerAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.selected,
    padding: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.md,
    marginBottom: AppTheme.spacing.lg,
  },
  headerAlertText: {
    ...AppTheme.typography.bodySmall,
    color: AppTheme.colors.primary,
    marginLeft: AppTheme.spacing.sm,
    fontWeight: AppTheme.fontWeights.medium,
    flex: 1,
  },
  card: {
    backgroundColor: AppTheme.colors.background,
    borderRadius: AppTheme.borderRadius.md,
    padding: AppTheme.spacing.lg,
    marginBottom: AppTheme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E0E1E6',
    ...AppTheme.shadows.sm,
  },
  sectionTitle: {
    ...AppTheme.typography.caption,
    color: AppTheme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: AppTheme.spacing.sm,
    fontWeight: AppTheme.fontWeights.bold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    ...AppTheme.typography.body,
    color: AppTheme.colors.header,
    marginLeft: AppTheme.spacing.sm,
    fontWeight: AppTheme.fontWeights.medium,
  },
  descriptionText: {
    ...AppTheme.typography.body,
    color: AppTheme.colors.header,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E1E6',
    marginVertical: AppTheme.spacing.md,
  },
  imagePreview: {
    width: '100%',
    height: 250,
    borderRadius: AppTheme.borderRadius.sm,
    backgroundColor: AppTheme.colors.selected,
  },
  noPhotoText: {
    ...AppTheme.typography.body,
    color: AppTheme.colors.textSecondary,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: AppTheme.spacing.md,
    marginTop: AppTheme.spacing.sm,
  },
  editButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
