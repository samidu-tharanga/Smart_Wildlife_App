import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { RoutePoint } from '../../services/patrolService';

export interface PatrolCoordinate {
  latitude: number;
  longitude: number;
}

export interface PatrolLocation extends PatrolCoordinate {
  accuracy?: number | null;
}

interface PatrolRouteMapProps {
  points: RoutePoint[];
  currentLocation?: PatrolLocation | null;
  recordedPath?: PatrolCoordinate[];
}

const EMPTY_PATH: PatrolCoordinate[] = [];

function isValidCoordinate(point: PatrolCoordinate): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0">

  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">

  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
    }

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
        window.ReactNativeWebView.postMessage(
          JSON.stringify(data)
        );
      }
    }

    window.onerror = function(message) {
      send({
        type: 'error',
        message: String(message)
      });
    };
  </script>

  <script
    src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"
    onerror="send({
      type:'error',
      message:'Could not load Leaflet. Check internet.'
    })">
  </script>

  <script>
    if (typeof L !== 'undefined') {
      var map = L.map('map').setView(
        [6.9271, 79.8612],
        13
      );

      var routeLayer = L.layerGroup().addTo(map);
      var pathLayer = L.layerGroup().addTo(map);
      var locationLayer = L.layerGroup().addTo(map);

      var previousRouteKey = null;
      var latestLocation = null;

      L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }
      )
      .addTo(map)
      .on('tileerror', function() {
        send({
          type: 'error',
          message: 'Some map tiles could not load. Check internet.'
        });
      });

      function drawRoute(points) {
        routeLayer.clearLayers();

        var coordinates = [];
        var checkpoint = 0;

        points.forEach(function(point) {
          var color = '#1565C0';
          var label;

          if (point.type === 'start') {
            color = '#2E7D32';
            label = 'S';
          } else if (point.type === 'end') {
            color = '#D32F2F';
            label = 'E';
          } else {
            label = String(++checkpoint);
          }

          var coordinate = [
            point.latitude,
            point.longitude
          ];

          coordinates.push(coordinate);

          L.marker(coordinate, {
            icon: L.divIcon({
              className: 'route-marker',
              html:
                '<span style="background:' +
                color +
                '">' +
                label +
                '</span>',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          }).addTo(routeLayer);
        });

        if (coordinates.length > 1) {
          L.polyline(coordinates, {
            color: '#1565C0',
            weight: 4,
            opacity: 0.8
          }).addTo(routeLayer);
        }

        map.invalidateSize();

        if (coordinates.length > 1) {
          map.fitBounds(coordinates, {
            padding: [35, 35],
            maxZoom: 16
          });
        } else if (coordinates.length === 1) {
          map.setView(coordinates[0], 15);
        }
      }

      function drawRecordedPath(points) {
        pathLayer.clearLayers();

        var coordinates = points.map(function(point) {
          return [point.latitude, point.longitude];
        });

        if (coordinates.length > 1) {
          L.polyline(coordinates, {
            color: '#2E7D32',
            weight: 5,
            opacity: 0.95
          }).addTo(pathLayer);
        } else if (coordinates.length === 1) {
          L.circleMarker(coordinates[0], {
            radius: 4,
            color: '#2E7D32',
            fillColor: '#2E7D32',
            fillOpacity: 1
          }).addTo(pathLayer);
        }
      }

      function drawLocation(location) {
        locationLayer.clearLayers();
        latestLocation = location;

        if (!location) return;

        var coordinate = [
          location.latitude,
          location.longitude
        ];

        if (
          typeof location.accuracy === 'number' &&
          isFinite(location.accuracy) &&
          location.accuracy > 0
        ) {
          L.circle(coordinate, {
            radius: location.accuracy,
            color: '#0288D1',
            weight: 1,
            fillColor: '#0288D1',
            fillOpacity: 0.12,
            interactive: false
          }).addTo(locationLayer);
        }

        L.circleMarker(coordinate, {
          radius: 9,
          color: '#FFFFFF',
          weight: 3,
          fillColor: '#0288D1',
          fillOpacity: 1
        })
        .addTo(locationLayer)
        .bindPopup('Your latest GPS location');
      }

      window.updatePatrolMap = function(data) {
        var routeKey = JSON.stringify(data.points);

        // Fit the assigned route only when it changes.
        // GPS updates do not reset the manager/ranger's map view.
        if (routeKey !== previousRouteKey) {
          previousRouteKey = routeKey;
          drawRoute(data.points);
        }

        drawRecordedPath(data.recordedPath);
        drawLocation(data.currentLocation);
      };

      window.centerOnLocation = function() {
        if (!latestLocation) return;

        map.setView(
          [
            latestLocation.latitude,
            latestLocation.longitude
          ],
          16
        );
      };

      send({ type: 'ready' });
    }
  </script>
</body>
</html>
`;

const SOURCE = {
  html: HTML,
  baseUrl: 'https://leafletjs.com/',
};

export default function PatrolRouteMap({
  points,
  currentLocation = null,
  recordedPath = EMPTY_PATH,
}: PatrolRouteMapProps) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const validLocation =
    currentLocation && isValidCoordinate(currentLocation)
      ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy:
            typeof currentLocation.accuracy === 'number' &&
            Number.isFinite(currentLocation.accuracy) &&
            currentLocation.accuracy >= 0
              ? currentLocation.accuracy
              : null,
        }
      : null;

  const mapData = JSON.stringify({
    points: points.filter(isValidCoordinate),
    currentLocation: validLocation,
    recordedPath: recordedPath.filter(isValidCoordinate),
  });

  useEffect(() => {
    if (!ready) return;

    webRef.current?.injectJavaScript(`
      if (window.updatePatrolMap) {
        window.updatePatrolMap(${mapData});
      }
      true;
    `);
  }, [mapData, ready]);

  function reloadMap() {
    setError('');
    setReady(false);
    webRef.current?.reload();
  }

  function centerOnLocation() {
    webRef.current?.injectJavaScript(`
      if (window.centerOnLocation) {
        window.centerOnLocation();
      }
      true;
    `);
  }

  return (
    <View>
      <View style={styles.map}>
        <WebView
          ref={webRef}
          source={SOURCE}
          originWhitelist={['*']}
          javaScriptEnabled
          scrollEnabled={false}
          style={styles.webView}
          onMessage={(event) => {
            try {
              const message = JSON.parse(event.nativeEvent.data);

              if (message.type === 'ready') {
                setReady(true);
              }

              if (message.type === 'error') {
                setError(
                  typeof message.message === 'string'
                    ? message.message
                    : 'Map error.',
                );
              }
            } catch {
              setError('Could not read map response.');
            }
          }}
          onError={(event) => {
            setReady(false);
            setError(event.nativeEvent.description);
          }}
        />
      </View>

      <View style={styles.legend}>
        <Text style={styles.plannedText}>Blue: assigned route</Text>
        <Text style={styles.recordedText}>Green: recorded path</Text>
        <Text style={styles.locationText}>Blue dot: GPS location</Text>
      </View>

      {validLocation && (
        <TouchableOpacity
          style={[
            styles.locationButton,
            !ready && styles.disabled,
          ]}
          onPress={centerOnLocation}
          disabled={!ready}
        >
          <Text style={styles.locationButtonText}>
            Show My Location
          </Text>
        </TouchableOpacity>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity
            style={styles.reloadButton}
            onPress={reloadMap}
          >
            <Text style={styles.reloadText}>Reload Map</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 320,
    width: '100%',
    backgroundColor: '#E3F2FD',
  },
  webView: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
  },
  plannedText: {
    color: '#1565C0',
    fontSize: 12,
    fontWeight: '600',
  },
  recordedText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  locationText: {
    color: '#0288D1',
    fontSize: 12,
    fontWeight: '600',
  },
  locationButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    minHeight: 44,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonText: {
    color: '#1565C0',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  errorBox: {
    padding: 12,
  },
  errorText: {
    color: '#D32F2F',
  },
  reloadButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  reloadText: {
    color: '#1565C0',
    fontWeight: '700',
  },
});