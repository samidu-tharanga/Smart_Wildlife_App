import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Using exact colors from the Reports screen for consistency!
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

export default function MonitorScreen() {
  const [activeTab, setActiveTab] = useState('animals');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const router = useRouter();

  const handleBroadcastSMS = () => {
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      Alert.alert(
        "Twilio Gateway Success", 
        "✅ Broadcast complete!\n\nWarning SMS successfully sent to 142 registered villagers in the Danger Zone."
      );
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header matching the Reports screen */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="map-outline" size={23} color={COLORS.white} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>LIVE TRACKING · MANAGER</Text>
            <Text style={styles.headerTitle}>System Monitor</Text>
            <Text style={styles.headerSubtitle}>View real-time locations and alerts</Text>
          </View>
        </View>

        {/* Tab Switcher matching the flat styling */}
        <View style={styles.filterSection}>
          <Text style={styles.fieldLabel}>Monitor target</Text>
          <View style={styles.periodOptions}>
            <TouchableOpacity
              onPress={() => setActiveTab('rangers')}
              style={[styles.periodOption, activeTab === 'rangers' && styles.periodOptionSelected]}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodText, activeTab === 'rangers' && styles.periodTextSelected]}>Rangers</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setActiveTab('animals')}
              style={[styles.periodOption, activeTab === 'animals' && styles.periodOptionSelected]}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodText, activeTab === 'animals' && styles.periodTextSelected]}>Animals</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'rangers' ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons name="people-outline" size={25} color={COLORS.slate} />
            </View>
            <Text style={styles.stateTitle}>Ranger Tracking</Text>
            <Text style={styles.stateText}>Live ranger tracking map will appear here.</Text>
          </View>
        ) : (
          <View style={{ paddingBottom: 30 }}>
            
            <View style={styles.resultHeading}>
              <View style={styles.resultHeadingText}>
                <Text style={styles.resultTitle}>Live Alerts Inbox</Text>
                <Text style={styles.resultRange}>Showing high-risk notifications</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(manager)/all-alerts')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {/* Alert Card 1 (System) */}
            <View style={[styles.sectionCard, { borderLeftColor: COLORS.red, borderLeftWidth: 4 }]}>
              <View style={styles.alertHeader}>
                <Ionicons name="warning" size={20} color={COLORS.red} />
                <Text style={[styles.cardTitle, { color: COLORS.red, marginLeft: 8 }]}>SYSTEM WARNING: E-024</Text>
              </View>
              <Text style={styles.alertDesc}>Elephant detected 1km from Village Boundary!</Text>
              
              <Text style={styles.alertTime}>2 mins ago (Ack: Ranger #03)</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/(manager)/assign')}>
                  <Text style={styles.btnPrimaryText}>Assign Patrol</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={handleBroadcastSMS} disabled={isBroadcasting}>
                  {isBroadcasting ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Text style={styles.btnSecondaryText}>Broadcast SMS</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Alert Card 2 (Community) */}
            <View style={[styles.sectionCard, { borderLeftColor: COLORS.yellow, borderLeftWidth: 4 }]}>
              <View style={styles.alertHeader}>
                <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.yellow} />
                <Text style={[styles.cardTitle, { color: COLORS.yellow, marginLeft: 8 }]}>COMMUNITY REPORT</Text>
              </View>
              <Text style={styles.alertDesc}>"Elephant spotted eating crops near North Farm."</Text>
              
              <Text style={styles.alertTime}>SMS: +94 77 *** ****</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: COLORS.yellow }]} onPress={() => router.push('/(manager)/assign')}>
                  <Text style={styles.btnPrimaryText}>Assign Patrol</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={handleBroadcastSMS} disabled={isBroadcasting}>
                  {isBroadcasting ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Text style={styles.btnSecondaryText}>Broadcast SMS</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

          </View>
        )}
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
  
  filterSection: { backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 15, marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '700', marginBottom: 9, color: '#000' },
  periodOptions: { flexDirection: 'row', gap: 8 },
  periodOption: { flex: 1, minHeight: 39, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F8FB', borderWidth: 1, borderColor: COLORS.border },
  periodOptionSelected: { backgroundColor: COLORS.lightBlue, borderColor: COLORS.primary },
  periodText: { color: COLORS.slate, fontSize: 12, fontWeight: '600' },
  periodTextSelected: { color: COLORS.darkBlue },

  stateCard: { minHeight: 190, alignItems: 'center', justifyContent: 'center', padding: 22, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  stateIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.lightBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  stateTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center', color: '#000' },
  stateText: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5, color: COLORS.slate },

  resultHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginBottom: 5 },
  resultHeadingText: { flex: 1 },
  resultTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  resultRange: { fontSize: 11, marginTop: 3, color: COLORS.slate },
  viewAllText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  sectionCard: { borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 12, backgroundColor: COLORS.white },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  alertDesc: { fontSize: 13, color: '#333', marginBottom: 12, lineHeight: 20 },
  alertTime: { fontSize: 11, color: COLORS.slate, marginBottom: 15 },
  
  actionRow: { flexDirection: 'row', gap: 8 },
  btnPrimary: { flex: 1, minHeight: 40, borderRadius: 6, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  btnSecondary: { flex: 1, minHeight: 40, borderRadius: 6, backgroundColor: '#F5F8FB', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  btnSecondaryText: { color: COLORS.darkBlue, fontSize: 13, fontWeight: '700' },
});
