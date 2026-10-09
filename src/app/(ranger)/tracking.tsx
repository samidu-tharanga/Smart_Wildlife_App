import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../context/ThemeContext';
import { Animal, subscribeToAnimals } from '../../services/animalService';
import { DangerZone, LatLng, subscribeToDangerZones } from '../../services/dangerZoneService';
import { IncidentService } from '../../services/incidentService';

export default function TrackingScreen() {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  
  const [showAlert, setShowAlert] = useState(false);
  const [currentBreach, setCurrentBreach] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [initialPositions, setInitialPositions] = useState<Record<string, { lat: number; lng: number }>>({});
  
  // To keep track of current dynamic positions
  const positionsRef = useRef<Record<string, {lat: number, lng: number}>>({});

  useEffect(() => {
    const unsubZones = subscribeToDangerZones(setDangerZones);
    const unsubAnimals = subscribeToAnimals((data) => {
      setAnimals(data);
      // Initialize positions for new animals
      const newPos = { ...positionsRef.current };
      data.forEach(a => {
        if (!newPos[a.id]) {
          newPos[a.id] = { lat: a.lat, lng: a.lng };
        }
      });
      positionsRef.current = newPos;
      setInitialPositions(newPos);
    });

    return () => { unsubZones(); unsubAnimals(); };
  }, []);

  const isPointInPolygon = (point: LatLng, vs: LatLng[]) => {
    const x = point.lng, y = point.lat;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i].lng, yi = vs[i].lat;
      const xj = vs[j].lng, yj = vs[j].lat;
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const checkDangerZone = useCallback(async (animal: Animal, lat: number, lng: number) => {
    for (const zone of dangerZones) {
      if (isPointInPolygon({ lat, lng }, zone.points)) {
        if (!showAlert) {
            setCurrentBreach({
              animalName: animal.name,
              species: animal.species,
              zoneName: zone.name,
              lat,
              lng
            });
            setShowAlert(true);
            setIsSimulating(false);
          }
        return true;
      }
    }
    return false;
  }, [dangerZones, showAlert]);

  useEffect(() => {
    let timer: any;
    if (isSimulating) {
      timer = setInterval(() => {
        let updates: any[] = [];
        
        animals.forEach(animal => {
          let pos = positionsRef.current[animal.id];
          if (!pos) return;
          

          // Move randomly by a very small amount
          const dLat = (Math.random() - 0.5) * 0.001;
          const dLng = (Math.random() - 0.5) * 0.001;
          let newLat = pos.lat + dLat;
          let newLng = pos.lng + dLng;
          
          // Yala rough bounds
          const YALA_MIN_LAT = 6.3650;
          const YALA_MAX_LAT = 6.3850;
          const YALA_MIN_LNG = 81.5000;
          const YALA_MAX_LNG = 81.5250;

          if (newLat < YALA_MIN_LAT) newLat = YALA_MIN_LAT + 0.0005;
          if (newLat > YALA_MAX_LAT) newLat = YALA_MAX_LAT - 0.0005;
          if (newLng < YALA_MIN_LNG) newLng = YALA_MIN_LNG + 0.0005;
          if (newLng > YALA_MAX_LNG) newLng = YALA_MAX_LNG - 0.0005;

          
          positionsRef.current[animal.id] = { lat: newLat, lng: newLng };
          updates.push({ id: animal.id, lat: newLat, lng: newLng });
          
          checkDangerZone(animal, newLat, newLng);
        });

        const script = `
          if (typeof updateMarkers !== 'undefined') {
              updateMarkers(${JSON.stringify(updates)});
          }
          true;
        `;
        if (webViewRef.current) webViewRef.current.injectJavaScript(script);
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isSimulating, animals, checkDangerZone]);

  const toggleSimulation = () => {
    if (!isSimulating && showAlert) setShowAlert(false);
    setIsSimulating(!isSimulating);
  };

  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`if (typeof filterMarkers !== 'undefined') { filterMarkers('${activeFilter}'); } true;`);
    }
  }, [activeFilter]);

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { padding: 0; margin: 0; }
            html, body, #map { height: 100%; width: 100%; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map').setView([6.3750, 81.5140], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

            var dangerZones = ${JSON.stringify(dangerZones)};
            dangerZones.forEach(function(zone) {
                var latlngs = zone.points.map(function(p) { return [p.lat, p.lng]; });
                L.polygon(latlngs, {color: "#d32f2f", weight: 2, fillOpacity: 0.2}).addTo(map).bindPopup(zone.name);
            });

            var markers = {};
            var animals = ${JSON.stringify(animals)};
            var initialPositions = ${JSON.stringify(initialPositions)};
            
            function getAnimalEmoji(species) {
                const s = species.toLowerCase();
                if (s.includes('elephant')) return '🐘';
                if (s.includes('leopard')) return '🐆';
                if (s.includes('bear')) return '🐻';
                if (s.includes('boar')) return '🐗';
                if (s.includes('deer')) return '🦌';
                return '🐾';
            }

            animals.forEach(function(a) {
                var pos = initialPositions[a.id] || {lat: a.lat, lng: a.lng};
                
                var emojiIcon = L.divIcon({
                    html: '<div style="font-size: 24px; text-align: center; line-height: 24px;">' + getAnimalEmoji(a.species) + '</div>',
                    className: 'animal-emoji-icon',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });

                markers[a.id] = L.marker([pos.lat, pos.lng], {icon: emojiIcon}).addTo(map)
                    .bindPopup("<b>" + a.name + "</b><br>" + a.species);
            });

            function updateMarkers(updates) {
                updates.forEach(function(u) {
                    if (markers[u.id]) {
                        markers[u.id].setLatLng([u.lat, u.lng]);
                    }
                });
            }
            function filterMarkers(filterStr) {
                var filter = filterStr.toLowerCase();
                animals.forEach(function(a) {
                    var s = a.species.toLowerCase();
                    var m = markers[a.id];
                    if (!m) return;
                    
                    var show = false;
                    if (filter === 'all' || filter === 'tracked') show = true;
                    else if (filter === 'elephants' && s.includes('elephant')) show = true;
                    else if (filter === 'leopards' && s.includes('leopard')) show = true;
                    
                    if (show) {
                        if (!map.hasLayer(m)) map.addLayer(m);
                    } else {
                        if (map.hasLayer(m)) map.removeLayer(m);
                    }
                });
            }
        </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Live Tracking</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>SYNCED</Text>
          </View>
        </View>
        <Ionicons name="notifications-outline" size={24} color={theme.textPrimary} />
      </View>

      <View style={styles.mapContainer}>
        <WebView 
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          scrollEnabled={false}
        />
        
        <View style={styles.controlsOverlay}>
          <TouchableOpacity 
            style={[styles.simButton, isSimulating ? styles.simButtonActive : {}]} 
            onPress={toggleSimulation}
          >
            <Ionicons name={isSimulating ? "pause" : "play"} size={20} color="#fff" />
            <Text style={styles.simButtonText}>{isSimulating ? "Pause Animals" : "Start Animals"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['All', 'Elephants', 'Leopards', 'Tracked'].map(filter => (
            <TouchableOpacity 
              key={filter}
              style={[styles.filterPill, activeFilter === filter ? styles.filterPillActive : { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter ? styles.filterTextActive : { color: theme.textSecondary }]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.statsContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={[styles.statBox, { borderRightColor: theme.border }]}>
          <Text style={[styles.statValue, { color: '#0D47A1' }]}>{animals.length}</Text>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Tracked</Text>
            <MaterialCommunityIcons name="elephant" size={14} color="#0D47A1" style={{marginLeft: 4}} />
          </View>
        </View>
        
        <View style={[styles.statBox, { borderRightColor: theme.border }]}>
          <Text style={[styles.statValue, { color: '#2E7D32' }]}>{animals.length > 0 ? animals.length - 1 : 0}</Text>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Safe</Text>
            <Ionicons name="shield-checkmark" size={14} color="#2E7D32" style={{marginLeft: 4}} />
          </View>
        </View>

        <View style={[styles.statBox, { borderRightWidth: 0 }]}>
          <Text style={[styles.statValue, { color: '#D32F2F' }]}>{animals.length > 0 ? 1 : 0}</Text>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>High-Risk</Text>
            <Ionicons name="warning" size={14} color="#D32F2F" style={{marginLeft: 4}} />
          </View>
        </View>
      </View>


      {/* Recent Updates List */}
      <ScrollView style={[styles.updatesContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]} showsVerticalScrollIndicator={false}>
        <View style={styles.updatesHeader}>
          <Text style={[styles.updatesTitle, { color: theme.textPrimary }]}>Recent Updates</Text>
          <TouchableOpacity><Text style={styles.viewAllText}>View All {'>'}</Text></TouchableOpacity>
        </View>

        {animals.slice(0, 3).map((a, i) => (
          <View key={a.id} style={styles.updateItem}>
            <View style={[styles.animalIconBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <MaterialCommunityIcons name={a.species.toLowerCase().includes('elephant') ? 'elephant' : 'paw'} size={24} color={theme.textSecondary} />
            </View>
            <View style={styles.updateTextCol}>
              <Text style={[styles.animalId, { color: theme.textPrimary }]}>{a.name} ({a.id})</Text>
              <Text style={styles.animalStatus}>{i === 0 ? 'Moved near boundary' : 'In Safe Zone'}</Text>
            </View>
            <View style={styles.updateMetaCol}>
              <Text style={styles.updateTime}>Just now</Text>
              <Ionicons name="chevron-forward" size={18} color="#aaa" />
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showAlert} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={[styles.alertBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.alertIconBg}>
              <Ionicons name="warning" size={32} color="#D32F2F" />
            </View>
            <Text style={[styles.alertTitle, { color: theme.textPrimary }]}>DANGER ZONE BREACH</Text>
            <Text style={[styles.alertDesc, { color: theme.textSecondary }]}>
              An animal has crossed a village boundary! Notify the manager to assign a patrol.
            </Text>
            
            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.dismissBtn} onPress={() => { setShowAlert(false); setCurrentBreach(null); }}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dispatchBtn} onPress={async () => {
                if (currentBreach) {
                    await IncidentService.submitIncident({
                        type: currentBreach.species + ' breach',
                        description: currentBreach.species + ' breached ' + currentBreach.zone,
                      photoUri: null,
                        latitude: currentBreach.lat || 0,
                        longitude: currentBreach.lng || 0
                    });
                    Alert.alert("Success", "Manager has been notified!");
                    setShowAlert(false);
                    setCurrentBreach(null);
                }
              }}>
                <Ionicons name="send" size={16} color="#fff" style={{marginRight: 5}} />
                <Text style={styles.dispatchText}>Notify Manager</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  statsContainer: { flexDirection: 'row', margin: 15, borderRadius: 12, paddingVertical: 15, borderWidth: 1 },
  statBox: { flex: 1, alignItems: 'center', borderRightWidth: 1 },
  statValue: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#546E7A' },

  updatesContainer: { marginHorizontal: 15, marginBottom: 15, borderRadius: 12, padding: 15, borderWidth: 1, flex: 0.5 },
  updatesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  updatesTitle: { fontSize: 15, fontWeight: 'bold' },
  viewAllText: { fontSize: 12, color: '#1565C0', fontWeight: 'bold' },
  updateItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  animalIconBox: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1 },
  updateTextCol: { flex: 1 },
  animalId: { fontSize: 14, fontWeight: 'bold' },
  animalStatus: { fontSize: 12, color: '#546E7A', marginTop: 2 },
  updateMetaCol: { alignItems: 'flex-end' },
  updateTime: { fontSize: 11, color: '#888', marginBottom: 4 },

  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2E7D32', marginRight: 4 },
  liveText: { fontSize: 10, fontWeight: 'bold', color: '#2E7D32' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  controlsOverlay: { position: 'absolute', top: 15, right: 15 },
  simButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1565C0', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  simButtonActive: { backgroundColor: '#D32F2F' },
  simButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  filterContainer: { position: 'absolute', bottom: 20, left: 0, right: 0, paddingHorizontal: 15, flexDirection: 'row' },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1 },
  filterPillActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  filterText: { fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { width: '100%', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1 },
  alertIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  alertTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  alertDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  alertActions: { flexDirection: 'row', width: '100%', gap: 12 },
  dismissBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center' },
  dismissText: { color: '#666', fontWeight: '600', fontSize: 15 },
  dispatchBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 8, backgroundColor: '#D32F2F', alignItems: 'center', justifyContent: 'center' },
  dispatchText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});
