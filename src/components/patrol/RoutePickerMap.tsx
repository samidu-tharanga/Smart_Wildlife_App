import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import type { RoutePoint } from '../../services/patrolService';

interface RoutePickerMapProps {
  points: RoutePoint[];
  onChange: (points: RoutePoint[]) => void;
}

export type PointMode = 'start' | 'checkpoint' | 'end';

export function calculateDistance(points: RoutePoint[]): number {
  const radians = (value: number) => value * Math.PI / 180;
  let distance = 0;

  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];

    const dLat = radians(current.latitude - previous.latitude);
    const dLon = radians(current.longitude - previous.longitude);

    const value =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(previous.latitude)) *
      Math.cos(radians(current.latitude)) *
      Math.sin(dLon / 2) ** 2;

    const a = Math.max(0, Math.min(1, value));

    distance += 6371 * 2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    );
  }

  return distance;
}

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0">
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    body { background: #E3F2FD; }
    .route-marker {
      background: transparent;
      border: none;
    }
    .route-marker span {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid white;
      color: white;
      font: bold 14px Arial;
      box-shadow: 0 1px 5px #546E7A;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    function send(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    window.onerror = function(message) {
      send({ type: 'error', message: String(message) });
    };
  </script>

  <script
    src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"
    onerror="send({type:'error',message:'Leaflet could not load. Check internet.'})">
  </script>

  <script>
    if (typeof L !== 'undefined') {
      var map = L.map('map').setView([6.9271, 79.8612], 13);

      var tiles = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }
      ).addTo(map);

      tiles.on('tileload', function() {
        send({ type: 'tilesLoaded' });
      });

      tiles.on('tileerror', function() {
        send({
          type: 'error',
          message: 'Some map tiles could not load. Check internet.'
        });
      });

      var routeLayer = L.layerGroup().addTo(map);

      window.updateRoute = function(points) {
        routeLayer.clearLayers();
        var coordinates = [];
        var checkpoint = 0;

        points.forEach(function(point) {
          var label;
          var color;

          if (point.type === 'start') {
            label = 'S';
            color = '#2E7D32';
          } else if (point.type === 'end') {
            label = 'E';
            color = '#D32F2F';
          } else {
            checkpoint += 1;
            label = String(checkpoint);
            color = '#1565C0';
          }

          var coordinate = [point.latitude, point.longitude];
          coordinates.push(coordinate);

          L.marker(coordinate, {
            icon: L.divIcon({
              className: 'route-marker',
              html: '<span style="background:' + color + '">' +
                label + '</span>',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          }).addTo(routeLayer);
        });

        if (coordinates.length > 1) {
          L.polyline(coordinates, {
            color: '#1565C0',
            weight: 4
          }).addTo(routeLayer);
        }
      };

      map.on('click', function(event) {
        send({
          type: 'tap',
          latitude: event.latlng.lat,
          longitude: event.latlng.lng
        });
      });

      setTimeout(function() {
        map.invalidateSize();
      }, 200);

      send({ type: 'ready' });
    }
  </script>
</body>
</html>
`;

const MAP_SOURCE = {
  html: MAP_HTML,
  baseUrl: 'https://leafletjs.com/',
};

export default function RoutePickerMap({
  points,
  onChange,
}: RoutePickerMapProps) {
  const webRef = useRef<WebView>(null);
  const [mode, setMode] = useState<PointMode>('start');
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading map...');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<RoutePoint[][]>([]);

  useEffect(() => {
    if (!ready) return;

    webRef.current?.injectJavaScript(`
      if (window.updateRoute) {
        window.updateRoute(${JSON.stringify(points)});
      }
      true;
    `);
  }, [points, ready]);

  function saveEdit(nextPoints: RoutePoint[]) {
    setHistory((previous) => [
      ...previous,
      points.map((point) => ({ ...point })),
    ]);
    onChange(nextPoints);
  }

  function handleMessage(event: WebViewMessageEvent) {
    let message: {
      type?: string;
      latitude?: number;
      longitude?: number;
      message?: string;
    };

    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (message.type === 'ready') {
      setReady(true);
      setStatus('Map initialized');
      return;
    }

    if (message.type === 'tilesLoaded') {
      setStatus('Map tiles loaded');
      return;
    }

    if (message.type === 'error') {
      setError(message.message || 'Map could not load.');
      return;
    }

    if (
      message.type !== 'tap' ||
      typeof message.latitude !== 'number' ||
      typeof message.longitude !== 'number' ||
      !Number.isFinite(message.latitude) ||
      !Number.isFinite(message.longitude) ||
      Math.abs(message.latitude) > 90 ||
      Math.abs(message.longitude) > 180
    ) {
      return;
    }

    const point: RoutePoint = {
      latitude: message.latitude,
      longitude: message.longitude,
      type: mode,
    };

    let nextPoints = [...points];

    if (mode === 'start') {
      nextPoints = nextPoints.filter((item) => item.type !== 'start');
      nextPoints.unshift(point);
      setMode('checkpoint');
    } else if (mode === 'end') {
      nextPoints = nextPoints.filter((item) => item.type !== 'end');
      nextPoints.push(point);
    } else {
      const endIndex = nextPoints.findIndex(
        (item) => item.type === 'end',
      );

      if (endIndex === -1) {
        nextPoints.push(point);
      } else {
        nextPoints.splice(endIndex, 0, point);
      }
    }

    saveEdit(nextPoints);
  }

  function undo() {
    if (!history.length) return;

    const previous = history[history.length - 1];
    onChange(previous);
    setHistory((items) => items.slice(0, -1));

    if (!previous.some((point) => point.type === 'start')) {
      setMode('start');
    }
  }

  function clear() {
    if (points.length) saveEdit([]);
    setMode('start');
  }

  function reloadMap() {
    setReady(false);
    setError('');
    setStatus('Loading map...');
    webRef.current?.reload();
  }

  const modes: PointMode[] = ['start', 'checkpoint', 'end'];

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webRef}
          source={MAP_SOURCE}
          originWhitelist={['*']}
          javaScriptEnabled
          scrollEnabled={false}
          onMessage={handleMessage}
          onError={(event) => {
            setReady(false);
            setError(event.nativeEvent.description);
          }}
          style={styles.webview}
        />
      </View>

      <View style={styles.controls}>
        {modes.map((item) => (
          <TouchableOpacity
            key={item}
            disabled={!ready}
            onPress={() => setMode(item)}
            style={[
              styles.control,
              mode === item && styles.selected,
              !ready && styles.disabled,
            ]}
          >
            <Text style={[
              styles.controlText,
              mode === item && styles.selectedText,
            ]}>
              {item === 'start'
                ? 'Start'
                : item === 'end'
                  ? 'End'
                  : 'Checkpoint'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={undo}
          disabled={!history.length}
          style={[
            styles.editButton,
            !history.length && styles.disabled,
          ]}
        >
          <Text style={styles.secondaryText}>Undo Last Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={clear}
          disabled={!points.length}
          style={[
            styles.editButton,
            !points.length && styles.disabled,
          ]}
        >
          <Text style={styles.errorText}>Clear Route</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helper}>
        Tap the map to add a {mode}.
        {'\n'}Selected points: {points.length}
      </Text>

      <Text style={styles.helper}>{status}</Text>

      {error ? (
        <View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={reloadMap}
            style={styles.editButton}
          >
            <Text style={styles.reloadText}>Reload Map</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  mapContainer: {
    height: 320,
    width: '100%',
    backgroundColor: '#E3F2FD',
    marginBottom: 12,
  },
  webview: { flex: 1, backgroundColor: '#E3F2FD' },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  control: {
    backgroundColor: '#E3F2FD',
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
  },
  selected: { backgroundColor: '#1565C0' },
  controlText: { color: '#546E7A', fontWeight: '600' },
  selectedText: { color: '#FFFFFF' },
  editButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryText: { color: '#546E7A', fontWeight: '600' },
  errorText: { color: '#D32F2F', lineHeight: 21 },
  reloadText: { color: '#1565C0', fontWeight: '700' },
  helper: { color: '#546E7A', lineHeight: 21, marginTop: 4 },
  disabled: { opacity: 0.4 },
});