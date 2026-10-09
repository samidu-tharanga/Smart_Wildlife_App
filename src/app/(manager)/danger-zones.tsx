import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DangerZonesScreen() {
  const router = useRouter();

  const handleSave = () => {
    Alert.alert("Success", "New Danger Zone has been saved to the database. All Rangers will receive the updated boundaries.");
    router.back();
  };

  // We load a Leaflet Map with the Leaflet.draw plugin enabled!
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <!-- Leaflet Draw CSS -->
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css" />
        
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <!-- Leaflet Draw JS -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"></script>
        
        <style>body { padding: 0; margin: 0; } html, body, #map { height: 100%; width: 100%; }</style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map').setView([6.3750, 81.5140], 14); 
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

            // Initialize the FeatureGroup to store editable layers
            var drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            // Initialize the draw control and pass it the FeatureGroup of editable layers
            var drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: drawnItems
                },
                draw: {
                    polygon: {
                        shapeOptions: { color: '#d32f2f' }
                    },
                    polyline: false,
                    rectangle: {
                        shapeOptions: { color: '#d32f2f' }
                    },
                    circle: false,
                    marker: false,
                    circlemarker: false
                }
            });
            map.addControl(drawControl);

            // Draw an existing hardcoded zone just to show it
            var existingZone = L.rectangle([[6.3750, 81.5120], [6.3800, 81.5160]], {color: "#d32f2f", weight: 2, fillOpacity: 0.2});
            drawnItems.addLayer(existingZone);

            // Event listener for when a new polygon is created
            map.on(L.Draw.Event.CREATED, function (e) {
                var layer = e.layer;
                drawnItems.addLayer(layer);
                // Here we would normally use window.ReactNativeWebView.postMessage to send coords to React Native
            });
        </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Danger Zones</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#0066CC" />
        <Text style={styles.infoText}>Use the drawing tools on the left of the map to draw new Geofences around villages.</Text>
      </View>

      <View style={styles.mapContainer}>
        <WebView 
          source={{ html: mapHtml }}
          style={styles.map}
          scrollEnabled={false}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Zones to Database</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#ddd' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', padding: 12, margin: 15, borderRadius: 8 },
  infoText: { flex: 1, marginLeft: 10, color: '#0066CC', fontSize: 13 },
  
  mapContainer: { flex: 1, marginHorizontal: 15, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc' },
  map: { flex: 1 },
  
  footer: { padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#ddd' },
  saveBtn: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
