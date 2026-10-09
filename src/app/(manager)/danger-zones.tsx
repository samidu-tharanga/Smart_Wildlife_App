import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, FlatList, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DangerZone, subscribeToDangerZones, addDangerZone, deleteDangerZone, LatLng } from '../../services/dangerZoneService';
import { useTheme } from '../../context/ThemeContext';

export default function DangerZonesScreen() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [promptVisible, setPromptVisible] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [pendingPoints, setPendingPoints] = useState<LatLng[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToDangerZones((data) => {
      setZones(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'POINTS_UPDATED') {
        setPendingPoints(data.points);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const promptForZoneName = (points: LatLng[]) => {
    setPendingPoints(points);
    setNewZoneName('');
    setPromptVisible(true);
  };

  const handleSaveZone = async () => {
    if (!newZoneName.trim()) {
      Alert.alert("Error", "Name is required.");
      return;
    }
    try {
      setPromptVisible(false);
      await addDangerZone(newZoneName.trim(), pendingPoints);
      setPendingPoints([]);
      Alert.alert("Success", "Danger Zone saved.");
        reloadMap();
    } catch(e) {
      Alert.alert("Error", "Could not save.");
      reloadMap();
    }
  };

  const handleCancelPrompt = () => {
    setPromptVisible(false);
    reloadMap();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Zone", `Are you sure you want to delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteDangerZone(id) }
    ]);
  };

  const reloadMap = () => {
    webViewRef.current?.reload();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      
      

    </SafeAreaView>
    );
  }

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"></script>
        <style>
          body { padding: 0; margin: 0; background: ${isDarkMode ? '#1e1e1e' : '#ffffff'}; } 
          html, body, #map { height: 100%; width: 100%; }
          ${isDarkMode ? '.leaflet-layer, .leaflet-control-zoom-in, .leaflet-control-zoom-out, .leaflet-control-attribution { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }' : ''}
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map').setView([6.3750, 81.5140], 14); 
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

            var existingItems = new L.FeatureGroup();
            map.addLayer(existingItems);

            var dbZones = ${JSON.stringify(zones)};
            dbZones.forEach(function(z) {
                var latlngs = z.points.map(function(p) { return [p.lat, p.lng]; });
                var polygon = L.polygon(latlngs, {color: "#d32f2f", weight: 2, fillOpacity: 0.2});
                polygon.bindPopup("<b>" + z.name + "</b>");
                existingItems.addLayer(polygon);
            });

            var drawControl = new L.Control.Draw({
                edit: false, // Disabling edit/delete from map toolbar; handled natively via list
                draw: {
                    polygon: { shapeOptions: { color: '#d32f2f', weight: 2, fillOpacity: 0.2 } },
                    polyline: false,
                    rectangle: { shapeOptions: { color: '#d32f2f', weight: 2, fillOpacity: 0.2 } },
                    circle: false, marker: false, circlemarker: false
                }
            });
            map.addControl(drawControl);

            map.on(L.Draw.Event.CREATED, function (e) {
                var layer = e.layer;
                existingItems.addLayer(layer); // Keep it visible on the map
                var latlngs;
                if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
                    latlngs = layer.getLatLngs()[0];
                }
                if (latlngs && window.ReactNativeWebView) {
                    var points = latlngs.map(function(ll) { return {lat: ll.lat, lng: ll.lng}; });
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'POINTS_UPDATED', points: points }));
                }
            });
        </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Danger Zones</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.mapContainer}>
        <WebView 
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          scrollEnabled={false}
          onMessage={handleMessage}
        />
      </View>


      <View style={{ padding: 15, backgroundColor: theme.cardBg, borderTopWidth: 1, borderColor: theme.border }}>
        <TouchableOpacity 
          style={{ backgroundColor: pendingPoints.length > 0 ? theme.primary : theme.border, padding: 15, borderRadius: 8, alignItems: 'center' }} 
          onPress={() => {
            if (pendingPoints.length === 0) {
              Alert.alert("Warning", "Please draw a Danger Zone on the map first.");
              return;
            }
            setNewZoneName('');
            setPromptVisible(true);
          }}
        >
          <Text style={{ color: pendingPoints.length > 0 ? '#fff' : theme.textSecondary, fontWeight: 'bold', fontSize: 16 }}>
            Save Drawn Zone
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.listContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.listTitle, { color: theme.textPrimary }]}>Saved Geofences</Text>
        <FlatList
          data={zones}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={{color: theme.textSecondary, textAlign: 'center'}}>No danger zones saved.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.zoneRow, { borderColor: theme.border }]}>
              <View style={styles.zoneInfo}>
                <Text style={[styles.zoneName, { color: theme.textPrimary }]}>{item.name}</Text>
                <Text style={{color: theme.textSecondary, fontSize: 12}}>Added: {new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color="#d32f2f" />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      <Modal visible={promptVisible} transparent animationType="fade">
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'}}>
          <View style={{backgroundColor: theme.cardBg, padding: 20, borderRadius: 12, width: '85%'}}>
            <Text style={{fontSize: 18, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 10}}>New Danger Zone</Text>
            <Text style={{color: theme.textSecondary, marginBottom: 15}}>Enter a name for this geofence (e.g., North Village Boundary):</Text>
            <TextInput 
              style={{borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, color: theme.textPrimary, marginBottom: 20}}
              placeholder="Zone Name"
              placeholderTextColor={theme.textSecondary}
              value={newZoneName}
              onChangeText={setNewZoneName}
              autoFocus
            />
            <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: 10}}>
              <TouchableOpacity onPress={handleCancelPrompt} style={{padding: 10}}><Text style={{color: theme.textSecondary}}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveZone} style={{padding: 10, backgroundColor: theme.primary, borderRadius: 8}}><Text style={{color: '#fff', fontWeight: 'bold'}}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  mapContainer: { flex: 1 },
  listContainer: { flex: 1, borderTopWidth: 1 },
  listTitle: { fontSize: 16, fontWeight: '700', padding: 15, paddingBottom: 0 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  deleteBtn: { padding: 10, backgroundColor: 'rgba(211,47,47,0.1)', borderRadius: 8 }
});
