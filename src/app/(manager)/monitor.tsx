import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { IncidentAlert, subscribeToIncidents } from '../../services/incidentService';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { RangerLocation, subscribeToRangers, resolveRangerSOS } from '../../services/rangerService';

// Using exact colors from the Reports screen for consistency!
const bannerImage = require('../../assets/banner.jpg');

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
  const [broadcastingIds, setBroadcastingIds] = React.useState<Record<string, boolean>>({});
  const [broadcastedIds, setBroadcastedIds] = React.useState<Record<string, boolean>>({});
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [incidents, setIncidents] = React.useState<IncidentAlert[]>([]);
  const [rangers, setRangers] = React.useState<RangerLocation[]>([]);
  const webViewRef = React.useRef<WebView>(null);
  
  React.useEffect(() => {
    const unsubInc = subscribeToIncidents(setIncidents);
    const unsubRangers = subscribeToRangers(setRangers);
      return () => { unsubInc(); unsubRangers(); };
  }, []);

  React.useEffect(() => {
    if (webViewRef.current && rangers.length > 0) {
      const script = `updateRangers(${JSON.stringify(rangers)});`;
      webViewRef.current.injectJavaScript(script);
    }
  }, [rangers]);


  const handleBroadcastSMS = (alertId: string, zoneName: string) => {
    setBroadcastingIds(prev => ({...prev, [alertId]: true}));
    setTimeout(() => {
      setBroadcastingIds(prev => ({...prev, [alertId]: false}));
      setBroadcastedIds(prev => ({...prev, [alertId]: true}));
      Alert.alert(
        "Twilio Gateway Success", 
        "\u2705 Broadcast complete!\n\nWarning SMS successfully sent to registered villagers in " + zoneName + " zone."
      );
    }, 2000);
  };

  
  const rangersMapHtml = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
          body { padding: 0; margin: 0; background: ${isDarkMode ? '#1e1e1e' : '#ffffff'}; } 
          html, body, #map { height: 100%; width: 100%; }
          ${isDarkMode ? '.leaflet-layer, .leaflet-control-zoom-in, .leaflet-control-zoom-out, .leaflet-control-attribution { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }' : ''}
          .custom-marker {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
          }
          .sos-marker {
            background-color: #D32F2F;
            animation: pulse 1s infinite;
          }
          .normal-marker {
            background-color: #2E7D32;
          }
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7); }
            70% { transform: scale(1.3); box-shadow: 0 0 0 10px rgba(211, 47, 47, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(211, 47, 47, 0); }
          }
          .leaflet-popup-content-wrapper { border-radius: 8px; }
          .resolve-btn { background: #1565C0; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px; width: 100%; }
      </style>
  </head>
  <body>
      <div id="map"></div>
      <script>
          var map = L.map('map').setView([6.3750, 81.5140], 14); 
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

          
          // Keep a global array of markers so we can remove them before redrawing
          if (!window.rangerMarkers) window.rangerMarkers = [];
          
          window.updateRangers = function(rangersData) {
            // Remove old markers
            window.rangerMarkers.forEach(function(m) { map.removeLayer(m); });
            window.rangerMarkers = [];
            var sosRangers = rangersData.filter(function(r) { return r.isSOS; });
            sosRangers.forEach(function(r) {
              var iconHtml = '<div class="custom-marker ' + (r.isSOS ? 'sos-marker' : 'normal-marker') + '"></div>';
              var icon = L.divIcon({ html: iconHtml, className: '', iconSize: [24,24], iconAnchor: [12,12] });
              
              var marker = L.marker([r.lat, r.lng], { icon: icon }).addTo(map);
              var popupContent = '<b>' + r.name + '</b><br/>' + (r.isSOS ? '<span style="color:#D32F2F;font-weight:bold;">EMERGENCY SOS</span>' : '<span style="color:#2E7D32;">On Patrol</span>');
              marker.bindPopup(popupContent);
              
              window.rangerMarkers.push(marker);
            });
          };
          
          // Initial draw
          window.updateRangers(${JSON.stringify(rangers)});
      </script>
  </body>
  </html>
`;
  
  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'RESOLVE_SOS') {
        Alert.alert("Confirm", "Mark this SOS as resolved?", [
          { text: "Cancel", style: "cancel" },
          { text: "Resolve", onPress: () => resolveRangerSOS(data.id) }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Banner Image matching Manage screen */}
        <View style={styles.bannerContainer}>
          <Image source={bannerImage} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.bannerOverlay}>
            <View style={styles.headerIcon}>
              <Ionicons name="map-outline" size={26} color={COLORS.white} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>LIVE TRACKING � MANAGER</Text>
              <Text style={styles.headerTitle}>System Monitor</Text>
              <Text style={styles.headerSubtitle}>View real-time locations and alerts</Text>
            </View>
            <TouchableOpacity style={styles.darkToggleBtn} onPress={toggleTheme} activeOpacity={0.8}>
              <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher matching the flat styling */}
        <View style={[styles.filterSection, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border }]}>
          <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Monitor target</Text>
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
                      <View>
  <View style={{ height: 400, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, marginBottom: 20 }}>
              <WebView
                  ref={webViewRef}
                  originWhitelist={['*']}
                source={{ html: rangersMapHtml }}
                onMessage={handleWebViewMessage}
                style={{ flex: 1 }}
                scrollEnabled={false}
              />
            </View>
            {rangers.filter(r => r.isSOS).length > 0 && (
                <View style={[styles.stateCard, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2', borderWidth: 1, marginTop: 10 }]}>
                  <Ionicons name="warning" size={30} color="#D32F2F" />
                  <Text style={{color: '#D32F2F', fontWeight: 'bold', fontSize: 16, marginTop: 10}}>
                    {rangers.filter(r => r.isSOS).length} Ranger(s) need immediate assistance!
                  </Text>
                  {rangers.filter(r => r.isSOS).map(r => (
                     <View key={r.id} style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 15, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 8}}>
                        <Text style={{color: '#D32F2F', fontWeight: 'bold'}}>{r.name}</Text>
                        <TouchableOpacity 
                           style={{backgroundColor: '#D32F2F', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5}}
                           onPress={() => {
                             Alert.alert("Confirm", "Mark this SOS as resolved?", [
                                { text: "Cancel", style: "cancel" },
                                { text: "Resolve", onPress: () => resolveRangerSOS(r.id) }
                             ]);
                           }}
                        >
                           <Text style={{color: '#fff', fontWeight: 'bold'}}>Resolve</Text>
                        </TouchableOpacity>
                     </View>
                  ))}
                </View>
              )}
            </View>
        ) : (
          <View style={{ paddingBottom: 30 }}>
            
            <View style={styles.resultHeading}>
              <View style={styles.resultHeadingText}>
                <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>Live Alerts Inbox</Text>
                <Text style={styles.resultRange}>Showing high-risk notifications</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(manager)/all-alerts' as any)}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            
            {incidents.length === 0 ? (
              <View style={[styles.stateCard, { backgroundColor: theme.cardBg }]}>
                <Ionicons name="checkmark-circle-outline" size={40} color={theme.primary} />
                <Text style={{color: theme.textSecondary, marginTop: 10}}>No active alerts today.</Text>
              </View>
            ) : incidents.map(alert => {
              const speciesText = (alert.species || alert.incidentType || 'INCIDENT').toUpperCase();
              const animalText = alert.animalName || (alert.incidentType ? `Incident (${alert.incidentType})` : 'Wildlife Event');
              const zoneText = alert.zoneName || 'Monitored Sector';
              const timeText = alert.time || 'Recently';

              return (
                <View key={alert.id} style={[styles.sectionCard, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border, borderLeftColor: COLORS.red, borderLeftWidth: 4 }]}>
                  <View style={styles.alertHeader}>
                    <Ionicons name="warning" size={20} color={COLORS.red} />
                    <Text style={[styles.cardTitle, { color: COLORS.red, marginLeft: 8 }]}>SYSTEM WARNING: {speciesText}</Text>
                  </View>
                  <Text style={[styles.alertDesc, { color: theme.textPrimary }]}>{animalText} reported in {zoneText}!</Text>
                  
                  <Text style={styles.alertTime}>{timeText}</Text>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/(manager)/assign')}>
                      <Text style={styles.btnPrimaryText}>Assign Patrol</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.btnSecondary, broadcastedIds[alert.id] && { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' }]} 
                        onPress={() => handleBroadcastSMS(alert.id, zoneText)} 
                        disabled={broadcastingIds[alert.id] || broadcastedIds[alert.id]}
                      >
                        {broadcastingIds[alert.id] ? (
                          <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : broadcastedIds[alert.id] ? (
                          <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Ionicons name="checkmark-circle" size={16} color="#2E7D32" style={{marginRight: 4}} />
                            <Text style={[styles.btnSecondaryText, { color: '#2E7D32' }]}>Sent</Text>
                          </View>
                        ) : (
                          <Text style={styles.btnSecondaryText}>Broadcast SMS</Text>
                        )}
                      </TouchableOpacity>
                  </View>
                </View>
              );
            })}
</View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 30 },
  
  bannerContainer: { width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  bannerImage: { width: '100%', height: '100%', position: 'absolute' },
  bannerOverlay: { flex: 1, backgroundColor: 'rgba(13, 71, 161, 0.75)', padding: 18, flexDirection: 'row', alignItems: 'center' },
  
  darkToggleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  headerCopy: { flex: 1, justifyContent: 'center' },
  headerEyebrow: { color: '#BBDEFB', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  headerTitle: { color: COLORS.white, fontSize: 24, fontWeight: '800', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  headerSubtitle: { color: '#E3F2FD', fontSize: 13, marginTop: 4, fontWeight: '500' },
  
  filterSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  fieldLabel: { fontSize: 14, fontWeight: '700', marginBottom: 9, color: '#000' },
  periodOptions: { flexDirection: 'row', gap: 8 },
  periodOption: { flex: 1, minHeight: 39, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F8FB', borderWidth: 1, borderColor: COLORS.border },
  periodOptionSelected: { backgroundColor: COLORS.lightBlue, borderColor: COLORS.primary },
  periodText: { color: COLORS.slate, fontSize: 12, fontWeight: '600' },
  periodTextSelected: { color: COLORS.darkBlue },

  stateCard: { minHeight: 190, alignItems: 'center', justifyContent: 'center', padding: 22, borderRadius: 12, backgroundColor: '#FFFFFF', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  stateIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.lightBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  stateTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center', color: '#000' },
  stateText: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5, color: COLORS.slate },

  resultHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginBottom: 5 },
  resultHeadingText: { flex: 1 },
  resultTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  resultRange: { fontSize: 11, marginTop: 3, color: COLORS.slate },
  viewAllText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  sectionCard: { borderRadius: 12, padding: 16, marginBottom: 14, backgroundColor: '#FFFFFF', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
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









