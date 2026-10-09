import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';

export default function SuccessScreen() {
  const { status } = useLocalSearchParams();
  const { theme } = useTheme();

  const isOffline = status === 'OFFLINE';

  const handleReturn = () => {
    router.replace('/(ranger)');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <Ionicons 
          name="checkmark-circle" 
          size={100} 
          color={isOffline ? AppTheme.colors.warning : AppTheme.colors.success} 
        />
        
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {isOffline ? 'Incident Saved' : 'Incident Report Submitted'}
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {isOffline 
            ? 'Your incident was saved on this device and will synchronize automatically when internet connection is restored.'
            : 'Your incident report has been securely saved and synchronized with headquarters.'}
        </Text>
        
        <View style={styles.buttonContainer}>
          <Button title="Back to Dashboard" onPress={handleReturn} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppTheme.spacing.xl,
  },
  title: {
    ...AppTheme.typography.h2,
    marginTop: AppTheme.spacing.lg,
    marginBottom: AppTheme.spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...AppTheme.typography.body,
    textAlign: 'center',
    marginBottom: AppTheme.spacing.xxl,
  },
  buttonContainer: {
    width: '100%',
  },
});
