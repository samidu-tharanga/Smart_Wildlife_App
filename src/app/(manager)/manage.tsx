import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header matching Reports screen */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="settings-outline" size={23} color={COLORS.white} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>SYSTEM CONTROLS · MANAGER</Text>
            <Text style={styles.headerTitle}>Park Management</Text>
            <Text style={styles.headerSubtitle}>Configure resources and boundaries</Text>
          </View>
        </View>

        <View style={styles.resultHeading}>
          <Text style={styles.resultTitle}>Management Tools</Text>
          <Text style={styles.resultRange}>Select a module to configure</Text>
        </View>

        {/* 1. Manage Danger Zones */}
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/(manager)/danger-zones')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FDECEC' }]}>
            <Ionicons name="map-outline" size={24} color={COLORS.red} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Danger Zones (Geofences)</Text>
            <Text style={styles.menuDesc}>Draw and edit virtual village boundaries on the map</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.slate} />
        </TouchableOpacity>

        {/* 2. Manage Animals (IoT Collars) */}
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/(manager)/manage-animals')}
          activeOpacity={0.8}
        >
          <View style={styles.iconBox}>
            <Ionicons name="hardware-chip-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>IoT Collars & Animals</Text>
            <Text style={styles.menuDesc}>Register new wildlife and assign GPS tracking collars</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.slate} />
        </TouchableOpacity>

        {/* 3. Manage Rangers */}
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => {}}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="shield-half-outline" size={24} color={COLORS.green} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Field Rangers</Text>
            <Text style={styles.menuDesc}>Add new personnel, roles, and assign patrol sectors</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.slate} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 30 },
  
  header: { backgroundColor: COLORS.darkBlue, borderRadius: 8, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  headerCopy: { flex: 1 },
  headerEyebrow: { color: '#BBDEFB', fontSize: 9, fontWeight: '700' },
  headerTitle: { color: COLORS.white, fontSize: 21, fontWeight: '700', marginTop: 4 },
  headerSubtitle: { color: '#E3F2FD', fontSize: 12, marginTop: 3 },
  
  resultHeading: { paddingVertical: 10, marginBottom: 5 },
  resultTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  resultRange: { fontSize: 11, marginTop: 3, color: COLORS.slate },

  menuCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, marginBottom: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 6, backgroundColor: COLORS.lightBlue, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  menuTextContainer: { flex: 1, paddingRight: 10 },
  menuTitle: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 4 },
  menuDesc: { fontSize: 11, color: COLORS.slate, lineHeight: 16 }
});
