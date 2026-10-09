import { Picker } from '@react-native-picker/picker';
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import RoutePickerMap, {
  calculateDistance,
} from '../../components/patrol/RoutePickerMap';
import type {
  RangerProfile,
  RoutePoint,
} from '../../services/patrolService';
import { PatrolService } from '../../services/patrolService';

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

const bannerImage = require('../../assets/banner.jpg');

export default function AssignScreen() {
  const params = useLocalSearchParams<{
    incidentId?: string;
    incidentType?: string;
    latitude?: string;
    longitude?: string;
  }>();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [routeName, setRouteName] = useState('');
  const [rangerUid, setRangerUid] = useState('');
  const [rangers, setRangers] = useState<RangerProfile[]>([]);
  const [patrolDate, setPatrolDate] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingRangers, setFetchingRangers] = useState(true);
  const [rangerError, setRangerError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reloadRangers, setReloadRangers] = useState(0);
  const [mapKey, setMapKey] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    if (params.incidentType && !routeName) {
      const typeLabel = params.incidentType.replace(/_/g, ' ').toUpperCase();
      setRouteName('Investigate ' + typeLabel);
    }

    if (params.latitude && params.longitude && points.length === 0) {
      const lat = parseFloat(params.latitude);
      const lng = parseFloat(params.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const offset = 0.005;
        setPoints([
          { latitude: lat, longitude: lng, type: 'start' },
          { latitude: lat + offset, longitude: lng + offset, type: 'end' },
        ]);
        setMapKey((k) => k + 1);
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (!patrolDate) {
      setPatrolDate(todayStr);
    }
  }, [params.incidentId, params.incidentType, params.latitude, params.longitude]);

  useEffect(() => {
    let active = true;

    async function loadRangers() {
      setFetchingRangers(true);
      setRangerError('');

      try {
        const data = await PatrolService.getAvailableRangers();

        if (active) {
          setRangers(data);
        }
      } catch (err: unknown) {
        if (active) {
          setRangerError(
            err instanceof Error
              ? err.message
              : 'Could not load rangers.',
          );
        }
      } finally {
        if (active) setFetchingRangers(false);
      }
    }

    void loadRangers();

    return () => {
      active = false;
    };
  }, [reloadRangers]);

  async function handleAssign() {
    if (submitting.current) return;

    setError('');
    setSuccess('');

    const name = routeName.trim();
    const date = patrolDate.trim();
    const minutes = Number(duration.trim());

    if (!name) {
      setError('Enter a route name.');
      return;
    }

    if (!rangers.some((ranger) => ranger.uid === rangerUid)) {
      setError('Select a ranger.');
      return;
    }

    if (!isValidDate(date)) {
      setError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }

    if (!Number.isInteger(minutes) || minutes <= 0) {
      setError('Duration must be a positive whole number of minutes.');
      return;
    }

    const starts = points.filter((point) => point.type === 'start');
    const ends = points.filter((point) => point.type === 'end');

    if (
      starts.length !== 1 ||
      ends.length !== 1 ||
      points[0]?.type !== 'start' ||
      points[points.length - 1]?.type !== 'end'
    ) {
      setError('Select a Start and End point on the map.');
      return;
    }

    const invalidCoordinates = points.some(
      (point) =>
        !Number.isFinite(point.latitude) ||
        !Number.isFinite(point.longitude) ||
        Math.abs(point.latitude) > 90 ||
        Math.abs(point.longitude) > 180,
    );

    if (invalidCoordinates) {
      setError('The route contains invalid coordinates.');
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      await PatrolService.assignPatrolRoute({
        rangerUid,
        routeName: name,
        points,
        approximateDistanceKm: calculateDistance(points),
        patrolDate: date,
        estimatedDurationMinutes: minutes,
        incidentId: params.incidentId,
      });

      setSuccess(`"${name}" assigned successfully.`);
      setPoints([]);
      setRouteName('');
      setRangerUid('');
      setPatrolDate('');
      setDuration('');

      // Reset the map's local undo history after successful submission.
      setMapKey((value) => value + 1);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save the assignment.',
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        style={[styles.screen, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.bannerContainer}>
          <Image source={bannerImage} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.bannerOverlay}>
            <View style={styles.headerIcon}>
              <Ionicons name="person-add-outline" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>ROSTER CONTROLS � MANAGER</Text>
              <Text style={styles.headerTitle}>Assign Patrols</Text>
              <Text style={styles.headerSubtitle}>Create and dispatch ranger patrols</Text>
            </View>
            <TouchableOpacity style={styles.darkToggleBtn} onPress={toggleTheme} activeOpacity={0.8}>
              <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={[styles.title, { color: theme.textPrimary }]}>Plan a patrol</Text>
        <Text style={styles.subtitle}>
          Choose points on the map, then assign a ranger.
        </Text>

      <View pointerEvents={loading ? 'none' : 'auto'}>
        <RoutePickerMap
          key={mapKey}
          points={points}
          onChange={setPoints}
        />
      </View>

      <Text style={[styles.label, { color: theme.textPrimary }]}>Route name</Text>
      <TextInput
        style={[styles.input, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg, color: theme.inputText }]}
        placeholder="Northern Trail"
        placeholderTextColor="#78909C"
        value={routeName}
        onChangeText={setRouteName}
        editable={!loading}
      />

      <Text style={[styles.label, { color: theme.textPrimary }]}>Assign ranger</Text>

      {fetchingRangers ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#1565C0" />
          <Text style={styles.subtitle}>Loading rangers...</Text>
        </View>
      ) : rangerError ? (
        <View>
          <Text style={styles.errorText}>{rangerError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setReloadRangers((value) => value + 1)}
          >
            <Text style={styles.retryText}>Retry Loading Rangers</Text>
          </TouchableOpacity>
        </View>
      ) : rangers.length === 0 ? (
        <Text style={styles.notice}>
          No ranger accounts found.
        </Text>
      ) : (
        <View style={[styles.pickerContainer, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}>
          <Picker
            selectedValue={rangerUid}
            enabled={!loading}
            onValueChange={(value: string) => setRangerUid(value)}
            style={[styles.picker, { color: theme.inputText, backgroundColor: theme.inputBg }]}
          >
            <Picker.Item label="Select a ranger" value="" />
            {rangers.map((ranger) => (
              <Picker.Item
                key={ranger.uid}
                label={ranger.displayName}
                value={ranger.uid}
              />
            ))}
          </Picker>
        </View>
      )}

      <Text style={[styles.label, { color: theme.textPrimary }]}>Patrol date</Text>
      <TextInput
        style={[styles.input, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg, color: theme.inputText }]}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#78909C"
        value={patrolDate}
        onChangeText={setPatrolDate}
        editable={!loading}
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={10}
      />

      <Text style={[styles.label, { color: theme.textPrimary }]}>Estimated duration (minutes)</Text>
      <TextInput
        style={[styles.input, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg, color: theme.inputText }]}
        placeholder="120"
        placeholderTextColor="#78909C"
        value={duration}
        onChangeText={setDuration}
        editable={!loading}
        keyboardType="number-pad"
      />

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {points.length} points
          {'\n'}Approx. distance: {calculateDistance(points).toFixed(2)} km
        </Text>
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {success ? (
        <Text style={styles.successText}>{success}</Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.assignButton,
          (loading || fetchingRangers || !!rangerError || !rangers.length) &&
          styles.disabled,
        ]}
        onPress={handleAssign}
        disabled={
          loading ||
          fetchingRangers ||
          !!rangerError ||
          !rangers.length
        }
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.assignText}>Assign Patrol</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  bannerContainer: { width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  bannerImage: { width: '100%', height: '100%', position: 'absolute' },
  bannerOverlay: { flex: 1, backgroundColor: 'rgba(13, 71, 161, 0.75)', padding: 18, flexDirection: 'row', alignItems: 'center' },
  headerIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  headerCopy: { flex: 1, justifyContent: 'center' },
  headerEyebrow: { color: '#BBDEFB', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  headerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  headerSubtitle: { color: '#E3F2FD', fontSize: 13, marginTop: 4, fontWeight: '500' },
  darkToggleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0D47A1',
  },
  subtitle: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 16,
  },
  label: {
    color: '#546E7A',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    backgroundColor: '#FFFFFF',
    color: '#263238',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    color: '#263238',
    backgroundColor: '#FFFFFF',
  },
  loadingBox: {
    padding: 16,
    alignItems: 'center',
  },
  notice: {
    color: '#F57F17',
    lineHeight: 22,
  },
  retryButton: {
    paddingVertical: 14,
  },
  retryText: {
    color: '#1565C0',
    fontWeight: '600',
  },
  summary: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  summaryText: {
    color: '#1565C0',
    fontWeight: '600',
    lineHeight: 24,
  },
  errorText: {
    color: '#D32F2F',
    lineHeight: 22,
    marginTop: 12,
  },
  successText: {
    color: '#2E7D32',
    lineHeight: 22,
    marginTop: 12,
  },
  assignButton: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    padding: 17,
    alignItems: 'center',
    marginTop: 20,
  },
  assignText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});







