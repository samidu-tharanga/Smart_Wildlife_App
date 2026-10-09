import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { AppTheme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { uploadImageToStorage } from '../../services/storageUtils';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const user = auth.currentUser;
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(user?.photoURL || null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const { theme, isDarkMode } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || 'Wildlife Ranger');

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setTimeout(() => router.replace('/login'), 100);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need gallery permissions to change your picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        const uri = result.assets[0].uri;
        let downloadUrl = uri;
        
        try {
          const fileName = `profiles/${user?.uid}_${Date.now()}.jpg`;
          downloadUrl = await uploadImageToStorage(uri, fileName);
        } catch (storageErr: any) {
          console.warn('Firebase Storage disabled or unavailable, saving photo locally:', storageErr.message);
          Alert.alert(
            "Notice",
            "Profile photo set locally! To sync photos to the cloud, enable Firebase Storage in your Firebase Console (Build > Storage > Get Started)."
          );
        }

        // Update user profile
        if (user) {
          await updateProfile(user, { photoURL: downloadUrl });
          setPhotoUrl(downloadUrl);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update profile picture.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    try {
      setLoading(true);
      if (user) {
        await updateProfile(user, { displayName: newName.trim() });
        setDisplayName(newName.trim());
        setIsEditingName(false);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Failed to update name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleUpdatePhoto} disabled={loading}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: isDarkMode ? '#1E293B' : AppTheme.colors.selected }]}>
                <Ionicons name="person" size={60} color={theme.textSecondary} />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {isEditingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={[styles.nameInput, { color: theme.textPrimary, borderColor: theme.inputBorder }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter your name"
                placeholderTextColor={theme.textSecondary}
                autoFocus
              />
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSaveName} disabled={loading}>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.cardBg }]} onPress={() => setIsEditingName(false)} disabled={loading}>
                <Ionicons name="close" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameDisplayContainer}>
              <Text style={[styles.name, { color: theme.textPrimary }]}>{displayName}</Text>
              <TouchableOpacity onPress={() => { setNewName(displayName); setIsEditingName(true); }} style={styles.editNameBtn}>
                <Ionicons name="pencil" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          <Text style={[styles.email, { color: theme.textSecondary }]}>{user?.email}</Text>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.primary }]}>Updating profile...</Text>
          </View>
        )}

        <View style={{ flex: 1 }} />
        
        <Button 
          title="Logout" 
          onPress={handleLogout} 
          variant="outline"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: AppTheme.colors.background 
  },
  container: { 
    flex: 1, 
    padding: AppTheme.spacing.lg 
  },
  header: { 
    alignItems: 'center', 
    marginVertical: AppTheme.spacing.xl 
  },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: AppTheme.colors.selected 
  },
  avatarPlaceholder: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: AppTheme.colors.selected,
    alignItems: 'center',
    justifyContent: 'center'
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: AppTheme.colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: AppTheme.colors.background,
  },
  name: { 
    ...AppTheme.typography.h2, 
    color: AppTheme.colors.header, 
  },
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: AppTheme.spacing.md,
  },
  editNameBtn: {
    marginLeft: 8,
    padding: 4,
  },
  nameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: AppTheme.spacing.md,
  },
  nameInput: {
    ...AppTheme.typography.body,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 150,
    marginRight: 8,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  email: { 
    ...AppTheme.typography.body, 
    color: AppTheme.colors.textSecondary, 
    marginTop: AppTheme.spacing.xs 
  },
  loadingContainer: { 
    alignItems: 'center', 
    marginVertical: AppTheme.spacing.lg 
  },
  loadingText: { 
    ...AppTheme.typography.bodySmall, 
    color: AppTheme.colors.primary, 
    marginTop: AppTheme.spacing.sm 
  },
});
