import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { animalPaths, staticAnimals } from '../../utils/dummyData';

export default function TrackingScreen() {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  
  const [step, setStep] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const checkDangerZone = (lat: number, lng: number) => {
    return (lat >= 6.3745 && lat <= 6.3805 && lng >= 81.5115 && lng <= 81.5165);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulating) {
      timer = setInterval(() => {
        setStep((currentStep) => {
          const nextStep = (currentStep + 1) % 10;
          const eLat = animalPaths["E-024"][nextStep].lat;
          const eLng = animalPaths["E-024"][nextStep].lng;
          const lLat = animalPaths["L-011"][nextStep].lat;
          const lLng = animalPaths["L-011"][nextStep].lng;

          if (checkDangerZone(eLat, eLng) && !showAlert) {
            setShowAlert(true);
            setIsSimulating(false); 
          }

          const script = `
            if (typeof elephantMarker !== 'undefined') {
                elephantMarker.setLatLng([${eLat}, ${eLng}]);
                leopardMarker.setLatLng([${lLat}, ${lLng}]);
            }
            true;
          `;
          if (webViewRef.current) webViewRef.current.injectJavaScript(script);
          return nextStep;
        });
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isSimulating, showAlert]);

  const handleAcknowledge = () => {
    setShowAlert(false); 
    Alert.alert("Alert Acknowledged", "The high-risk alert has been acknowledged successfully.");
  };

  const filteredAnimals = activeFilter === 'All' 
    ? staticAnimals 
    : staticAnimals.filter(a => activeFilter === 'Elephants' ? a.type === 'elephant' : a.type === 'leopard');
  
  const staticAnimalsScript = filteredAnimals.map(animal => `
    var icon = ${animal.type === 'elephant'} ? elephantIcon : leopardIcon;
    var m = L.marker([${animal.lat}, ${animal.lng}], {icon: icon}).bindPopup("<b>${animal.id}</b>");
    markers.addLayer(m);
  `).join('');

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
        <style>
            body { padding: 0; margin: 0; }
            html, body, #map { height: 100%; width: 100%; }
            .custom-emoji-icon { background: none; border: none; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map').setView([6.3700, 81.5100], 14); 
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

            var elephantIcon = L.divIcon({ html: '<div style="font-size: 30px;">🐘</div>', className: 'custom-emoji-icon', iconSize: [30, 30], iconAnchor: [15, 15] });
            var leopardIcon = L.divIcon({ html: '<div style="font-size: 30px;">🐆</div>', className: 'custom-emoji-icon', iconSize: [30, 30], iconAnchor: [15, 15] });

            var dangerBounds = [[6.3750, 81.5120], [6.3800, 81.5160]];
            L.rectangle(dangerBounds, {color: "#d32f2f", weight: 2, fillOpacity: 0.2}).addTo(map);
            
            var markers = L.markerClusterGroup({ maxClusterRadius: 40 });
            ${staticAnimalsScript}
            map.addLayer(markers);

            ${activeFilter === 'All' || activeFilter === 'Elephants' ? `var elephantMarker = L.marker([${animalPaths["E-024"][step].lat}, ${animalPaths["E-024"][step].lng}], {icon: elephantIcon}).addTo(map).bindPopup("<b>E-024</b>").openPopup();` : ''}
            ${activeFilter === 'All' || activeFilter === 'Leopards' ? `var leopardMarker = L.marker([${animalPaths["L-011"][step].lat}, ${animalPaths["L-011"][step].lng}], {icon: leopardIcon}).addTo(map).bindPopup("<b>L-011</b>");` : ''}
        </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F5F8FB' }]} edges={['top']}>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Search Bar & Filters */}
        <View style={styles.topSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#888" />
            <Text style={styles.searchText}>Search animal ID or species</Text>
          </View>

          <View style={styles.filterRow}>
            {['All', 'Elephants', 'Leopards', 'Deer'].map((f) => (
              <TouchableOpacity 
                key={f}
                style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <WebView source={{ html: mapHtml }} style={styles.map} scrollEnabled={false} />
          <View style={styles.mapOverlayLabel}>
            <Ionicons name="map" size={16} color="#0D47A1" />
            <Text style={styles.mapOverlayText}> Map / Live Locations</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#0D47A1' }]}>12</Text>
            <View style={styles.statLabelRow}>
              <Text style={styles.statLabel}>Tracked</Text>
              <MaterialCommunityIcons name="elephant" size={14} color="#0D47A1" style={{marginLeft: 4}} />
            </View>
          </View>
          
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#2E7D32' }]}>10</Text>
            <View style={styles.statLabelRow}>
              <Text style={styles.statLabel}>Safe</Text>
              <Ionicons name="shield-checkmark" size={14} color="#2E7D32" style={{marginLeft: 4}} />
            </View>
          </View>

          <View style={[styles.statBox, { borderRightWidth: 0 }]}>
            <Text style={[styles.statValue, { color: '#D32F2F' }]}>2</Text>
            <View style={styles.statLabelRow}>
              <Text style={styles.statLabel}>High-Risk</Text>
              <Ionicons name="warning" size={14} color="#D32F2F" style={{marginLeft: 4}} />
            </View>
          </View>
        </View>

        {/* Recent Updates List */}
        <View style={styles.updatesContainer}>
          <View style={styles.updatesHeader}>
            <Text style={styles.updatesTitle}>Recent Updates</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>View All ></Text></TouchableOpacity>
          </View>

          {/* Update Item 1 */}
          <View style={styles.updateItem}>
            <View style={styles.animalIconBox}>
              <MaterialCommunityIcons name="elephant" size={24} color="#546E7A" />
            </View>
            <View style={styles.updateTextCol}>
              <Text style={styles.animalId}>E-024</Text>
              <Text style={styles.animalStatus}>Moved to North Boundary</Text>
            </View>
            <View style={styles.updateMetaCol}>
              <Text style={styles.updateTime}>10:15 AM</Text>
              <Ionicons name="chevron-forward" size={18} color="#aaa" />
            </View>
          </View>

          {/* Update Item 2 */}
          <View style={styles.updateItem}>
            <View style={styles.animalIconBox}>
              <MaterialCommunityIcons name="elephant" size={24} color="#546E7A" />
            </View>
            <View style={styles.updateTextCol}>
              <Text style={styles.animalId}>E-011</Text>
              <Text style={styles.animalStatus}>In Safe Zone</Text>
            </View>
            <View style={styles.updateMetaCol}>
              <Text style={styles.updateTime}>09:45 AM</Text>
              <Ionicons name="chevron-forward" size={18} color="#aaa" />
            </View>
          </View>
          
          {/* Update Item 3 */}
          <View style={styles.updateItem}>
            <View style={styles.animalIconBox}>
              <MaterialCommunityIcons name="elephant" size={24} color="#546E7A" />
            </View>
            <View style={styles.updateTextCol}>
              <Text style={styles.animalId}>E-015</Text>
              <Text style={styles.animalStatus}>No Signal</Text>
            </View>
            <View style={styles.updateMetaCol}>
              <Text style={styles.updateTime}>08:30 AM</Text>
              <Ionicons name="chevron-forward" size={18} color="#aaa" />
            </View>
          </View>
        </View>
        <View style={{height: 40}} />
      </ScrollView>

      {/* Floating Action for Demo Simulation */}
      <TouchableOpacity 
        style={[styles.simButton, { backgroundColor: isSimulating ? '#D32F2F' : '#1565C0' }]}
        onPress={() => setIsSimulating(!isSimulating)}
      >
        <Ionicons name={isSimulating ? "stop-circle" : "play-circle"} size={24} color="#fff" />
      </TouchableOpacity>

      {/* Wireframe-matched Alert Modal */}
      <Modal visible={showAlert} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            
            <View style={styles.modalHeader}>
              <Ionicons name="arrow-back" size={24} color="#000" onPress={() => setShowAlert(false)} />
              <Text style={styles.modalHeaderTitle}>High-Risk Alert</Text>
              <View style={{width: 24}} /> 
            </View>

            <Ionicons name="warning" size={80} color="#D32F2F" style={{alignSelf: 'center', marginVertical: 15}} />
            
            <Text style={styles.modalTitle}>High-Risk Zone Entered</Text>
            <Text style={styles.modalDesc}>Elephant E-024 has entered a high-risk zone (Farmland Area) at 10:22 AM.</Text>
            
            <View style={styles.miniMapPlaceholder}>
               <Ionicons name="location" size={40} color="#1565C0" />
            </View>

            <View style={{width: '100%', marginBottom: 20}}>
              <Text style={{fontSize: 13, fontWeight: 'bold', color: '#000'}}>Location</Text>
              <Text style={{fontSize: 13, color: '#666', marginTop: 2}}>North Boundary Farmland</Text>
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={() => {}}>
              <Text style={styles.btnPrimaryText}>View Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.btnSecondary} onPress={handleAcknowledge}>
              <Text style={styles.btnSecondaryText}>Acknowledge Alert</Text>
            </TouchableOpacity>
            
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  
  header: { backgroundColor: '#1565C0', padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  notificationDot: { position: 'absolute', right: 18, top: 18, width: 10, height: 10, backgroundColor: '#D32F2F', borderRadius: 5, borderWidth: 1, borderColor: '#1565C0' },

  topSection: { padding: 15, backgroundColor: '#fff' },
  searchBar: { flexDirection: 'row', backgroundColor: '#F5F8FB', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#D9E5EF' },
  searchText: { color: '#888', marginLeft: 10, fontSize: 14 },
  
  filterRow: { flexDirection: 'row', gap: 10 },
  filterChip: { backgroundColor: '#F5F8FB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#D9E5EF' },
  filterChipActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  filterText: { color: '#546E7A', fontWeight: '600', fontSize: 12 },
  filterTextActive: { color: '#fff' },

  mapContainer: { height: 280, marginHorizontal: 15, marginTop: 15, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#D9E5EF', backgroundColor: '#e0e0e0' },
  map: { flex: 1 },
  mapOverlayLabel: { position: 'absolute', bottom: 10, left: 10, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  mapOverlayText: { fontSize: 12, fontWeight: 'bold', color: '#0D47A1' },

  statsContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginTop: 15, borderRadius: 12, paddingVertical: 15, borderWidth: 1, borderColor: '#D9E5EF' },
  statBox: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#D9E5EF' },
  statValue: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#546E7A' },

  updatesContainer: { backgroundColor: '#fff', marginHorizontal: 15, marginTop: 15, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#D9E5EF' },
  updatesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  updatesTitle: { fontSize: 15, fontWeight: 'bold', color: '#000' },
  viewAllText: { fontSize: 12, color: '#1565C0', fontWeight: 'bold' },
  
  updateItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  animalIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F5F8FB', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#D9E5EF' },
  updateTextCol: { flex: 1 },
  animalId: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  animalStatus: { fontSize: 12, color: '#546E7A', marginTop: 2 },
  updateMetaCol: { alignItems: 'flex-end' },
  updateTime: { fontSize: 11, color: '#888', marginBottom: 4 },

  simButton: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.3, shadowRadius: 4 },

  // Modal exactly like Wireframe
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '90%', backgroundColor: '#fff', padding: 20, borderRadius: 20, alignItems: 'center' },
  modalHeader: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#000', marginBottom: 8 },
  modalDesc: { fontSize: 13, textAlign: 'center', color: '#666', marginBottom: 20, lineHeight: 20, paddingHorizontal: 10 },
  miniMapPlaceholder: { width: '100%', height: 120, backgroundColor: '#E3F2FD', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#BBDEFB' },
  btnPrimary: { backgroundColor: '#1565C0', width: '100%', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  btnSecondary: { backgroundColor: '#fff', width: '100%', paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#1565C0' },
  btnSecondaryText: { color: '#1565C0', fontSize: 14, fontWeight: 'bold' },
});
