import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useTheme } from '../../context/ThemeContext';

const bannerImage = require('../../assets/banner.jpg');

// Exact matching colors from Reports UI
const COLORS = {
  primary: '#1565C0',
  darkBlue: '#0D47A1',
  lightBlue: '#E3F2FD',
  white: '#FFFFFF',
  slate: '#546E7A',
  red: '#D32F2F',
  green: '#2E7D32',
  yellow: '#F57F17',
  border: '#D9E5EF',
};

export default function ManageScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setTimeout(() => router.replace('/login'), 100);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          <Image source={bannerImage} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.bannerOverlay}>
            <View style={styles.headerIcon}>
              <Ionicons name="settings-outline" size={26} color={COLORS.white} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>SYSTEM CONTROLS Â· MANAGER</Text>
              <Text style={styles.headerTitle}>Park Management</Text>
              <Text style={styles.headerSubtitle}>Configure resources and boundaries</Text>
            </View>
            <TouchableOpacity style={styles.darkToggleBtn} onPress={toggleTheme} activeOpacity={0.8}>
              <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.resultHeading}>
          <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>Management Tools</Text>
          <Text style={styles.resultRange}>Select a module to configure</Text>
        </View>

        {/* 1. Manage Danger Zones */}
        <TouchableOpacity 
          style={[styles.menuCard, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border }]} 
          onPress={() => router.push('/(manager)/danger-zones')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FDECEC' }]}>
            <Ionicons name="map-outline" size={24} color={COLORS.red} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuTitle, { color: theme.textPrimary }]}>Danger Zones (Geofences)</Text>
            <Text style={styles.menuDesc}>Draw and edit virtual village boundaries on the map</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.slate} />
        </TouchableOpacity>

        {/* 2. Manage Animals (IoT Collars) */}
        <TouchableOpacity 
          style={[styles.menuCard, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border }]} 
          onPress={() => router.push('/(manager)/manage-animals' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.iconBox}>
            <Ionicons name="hardware-chip-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuTitle, { color: theme.textPrimary }]}>IoT Collars & Animals</Text>
            <Text style={styles.menuDesc}>Register new wildlife and assign GPS tracking collars</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.slate} />
        </TouchableOpacity>

        {/* 3. Manage Rangers */}
        <TouchableOpacity 
          style={[styles.menuCard, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border }]} 
          onPress={() => {}}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="shield-half-outline" size={24} color={COLORS.green} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuTitle, { color: theme.textPrimary }]}>Field Rangers</Text>
            <Text style={styles.menuDesc}>Add new personnel, roles, and assign patrol sectors</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.slate} />
        </TouchableOpacity>

        {/* Account Settings Section */}
        <View style={[styles.resultHeading, { marginTop: 15 }]}>
          <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>Account</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.menuCard, { borderColor: '#FFCDD2', backgroundColor: '#FFEBEE', elevation: 0, shadowOpacity: 0 }]} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBox, { backgroundColor: COLORS.red }]}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuTitle, { color: COLORS.red }]}>Log Out</Text>
            <Text style={styles.menuDesc}>Sign out from your Manager account</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.red} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' }, // Light background so shadows stand out
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30 },
  
  bannerContainer: { width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  bannerImage: { width: '100%', height: '100%', position: 'absolute' },
  bannerOverlay: { flex: 1, backgroundColor: 'rgba(13, 71, 161, 0.75)', padding: 18, flexDirection: 'row', alignItems: 'center' },
  
  darkToggleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  headerCopy: { flex: 1, justifyContent: 'center' },
  headerEyebrow: { color: '#BBDEFB', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  headerTitle: { color: COLORS.white, fontSize: 24, fontWeight: '800', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  headerSubtitle: { color: '#E3F2FD', fontSize: 13, marginTop: 4, fontWeight: '500' },
  
  resultHeading: { paddingVertical: 10, marginBottom: 5, paddingHorizontal: 4 },
  resultTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  resultRange: { fontSize: 12, marginTop: 3, color: COLORS.slate },

  menuCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF', marginBottom: 14, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  iconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: COLORS.lightBlue, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  menuTextContainer: { flex: 1, paddingRight: 10 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#1A202C', marginBottom: 5 },
  menuDesc: { fontSize: 12, color: COLORS.slate, lineHeight: 17 }
});




