import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AppTheme } from '../../theme';
import { IncidentType, LocationData } from '../../types/incident';
import { IncidentTypeSelect } from '../../components/incident/IncidentTypeSelect';
import { PhotoCaptureCard } from '../../components/incident/PhotoCaptureCard';
import { LocationCard } from '../../components/incident/LocationCard';
import { Button } from '../../components/ui/Button';
import { useCamera } from '../../hooks/useCamera';
import { useDeviceLocation } from '../../hooks/useDeviceLocation';
import { useTheme } from '../../context/ThemeContext';

export default function ReportIncidentScreen() {
  const params = useLocalSearchParams<{ reset?: string }>();
  const [type, setType] = useState<IncidentType | null>(null);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [touched, setTouched] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const { takePhoto, loading: cameraLoading } = useCamera();
  const { fetchLocation, loading: locationLoading, error: locationError } = useDeviceLocation();

  useEffect(() => {
    if (params.reset === 'true') {
      setTimeout(() => {
        setType(null);
        setDescription('');
        setPhotoUri(null);
        setLocation(null);
        setTouched(false);
        router.setParams({ reset: undefined });
      }, 0);
    }
  }, [params.reset]);

  // Validation
  const isValid = type !== null && description.trim().length > 0 && location !== null;

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

  const handleContinue = () => {
    setTouched(true);
    if (!isValid) return;
    
    router.push({
      pathname: '/(ranger)/review',
      params: {
        type: type,
        description: description,
        photoUri: photoUri || '',
        latitude: location!.latitude,
        longitude: location!.longitude,
      }
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageDescription, { color: theme.textSecondary }]}>
          Please provide accurate details. Your reports are critical for conservation efforts.
        </Text>

        {/* 1. Incident Type */}
        <IncidentTypeSelect 
          selectedType={type} 
          onSelect={setType} 
        />

        {/* 2. Description */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.inputBg,
                borderColor: touched && description.trim().length === 0 ? AppTheme.colors.danger : theme.inputBorder,
                color: theme.inputText, // Clean solid dark text in Light mode, white text in Dark mode
              }
            ]}
            placeholder="Describe what you observed..."
            placeholderTextColor={isDarkMode ? '#64748B' : '#90A4AE'}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (!touched) setTouched(true);
            }}
            textAlignVertical="top"
          />
          {touched && description.trim().length === 0 && (
            <Text style={styles.errorText}>* Description is required</Text>
          )}
        </View>

        {/* 3. Photo Evidence */}
        <PhotoCaptureCard 
          photoUri={photoUri} 
          loading={cameraLoading}
          onTake={handleTakePhoto} 
          onClear={() => setPhotoUri(null)} 
        />

        {/* 4. GPS Location */}
        <LocationCard 
          location={location} 
          loading={locationLoading}
          error={locationError}
          onGetLocation={handleGetLocation} 
        />

        {/* 5. Submit Action */}
        <View style={styles.footer}>
          <Button 
            title="Continue" 
            onPress={handleContinue} 
            disabled={!isValid} 
          />
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
  contentContainer: {
    padding: AppTheme.spacing.md,
    paddingBottom: AppTheme.spacing.xxl,
  },
  pageDescription: {
    ...AppTheme.typography.body,
    marginBottom: AppTheme.spacing.lg,
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: AppTheme.spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: AppTheme.spacing.sm,
  },
  required: {
    color: AppTheme.colors.danger,
  },
  textArea: {
    borderRadius: AppTheme.borderRadius.md,
    borderWidth: 1.5,
    padding: AppTheme.spacing.md,
    minHeight: 110,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    ...AppTheme.typography.caption,
    color: AppTheme.colors.danger,
    marginTop: AppTheme.spacing.xs,
  },
  footer: {
    marginTop: AppTheme.spacing.md,
  },
});
