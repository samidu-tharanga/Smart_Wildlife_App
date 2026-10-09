import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
    router,
    useFocusEffect,
    useLocalSearchParams,
} from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import PatrolRouteMap from '../../../components/patrol/PatrolRouteMap';
import type {
    PatrolCoordinate,
    PatrolLocation,
} from '../../../components/patrol/PatrolRouteMap';
import { useTheme } from '../../../context/ThemeContext';
import { auth } from '../../../services/firebase';
import { PatrolService } from '../../../services/patrolService';
import type { PatrolAssignment } from '../../../services/patrolService';

interface RecordedPoint extends PatrolLocation {
    timestamp: number;
}

function validPoint(point: RecordedPoint): boolean {
    return (
        point != null &&
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        Math.abs(point.latitude) <= 90 &&
        Math.abs(point.longitude) <= 180 &&
        Number.isFinite(point.timestamp)
    );
}

function formatElapsed(milliseconds: number): string {
    const seconds = Math.floor(Math.max(0, milliseconds) / 1000);

    return [
        Math.floor(seconds / 3600),
        Math.floor((seconds % 3600) / 60),
        seconds % 60,
    ]
        .map((value) => String(value).padStart(2, '0'))
        .join(':');
}

function calculateTravelledDistance(points: PatrolCoordinate[]): number {
    const radians = (value: number) => (value * Math.PI) / 180;
    let distance = 0;

    for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1];
        const current = points[index];

        const latitudeDifference = radians(
            current.latitude - previous.latitude,
        );
        const longitudeDifference = radians(
            current.longitude - previous.longitude,
        );

        const value =
            Math.sin(latitudeDifference / 2) ** 2 +
            Math.cos(radians(previous.latitude)) *
            Math.cos(radians(current.latitude)) *
            Math.sin(longitudeDifference / 2) ** 2;

        const clamped = Math.max(0, Math.min(1, value));

        distance +=
            6371 *
            2 *
            Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));
    }

    return distance;
}

export default function ActivePatrolScreen() {
    const params = useLocalSearchParams<{ id?: string | string[] }>();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { theme } = useTheme();

    const [patrol, setPatrol] = useState<PatrolAssignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [ending, setEnding] = useState(false);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    const [gpsRetry, setGpsRetry] = useState(0);
    const [now, setNow] = useState(Date.now());

    const [currentLocation, setCurrentLocation] =
        useState<PatrolLocation | null>(null);
    const [recordedPath, setRecordedPath] = useState<RecordedPoint[]>([]);
    const [gpsStatus, setGpsStatus] = useState('Waiting for GPS');
    const [gpsError, setGpsError] = useState('');
    const [storageError, setStorageError] = useState('');

    const submitting = useRef(false);
    const pathRef = useRef<RecordedPoint[]>([]);
    const storageKeyRef = useRef('');
    const saveQueue = useRef<Promise<void>>(Promise.resolve());
    const recordingEnabled = useRef(false);

    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function loadPatrol() {
                setLoading(true);
                setError('');
                setPatrol(null);
                setCurrentLocation(null);
                setStorageError('');

                try {
                    if (!id) throw new Error('Missing assignment ID.');

                    const user = auth.currentUser;
                    if (!user) throw new Error('Please log in again.');

                    const assignment = await PatrolService.getMyAssignment(id);

                    if (
                        assignment.status !== 'in_progress' &&
                        assignment.status !== 'completed'
                    ) {
                        throw new Error('Start this patrol from the details screen.');
                    }

                    // Separate local records by ranger UID and assignment ID.
                    const key = `patrol-gps:${user.uid}:${id}`;
                    await saveQueue.current;

                    const saved = await AsyncStorage.getItem(key);
                    let restored: RecordedPoint[] = [];

                    if (saved) {
                        const parsed: unknown = JSON.parse(saved);

                        if (!Array.isArray(parsed) || !parsed.every(validPoint)) {
                            throw new Error('Saved GPS data is invalid.');
                        }

                        restored = parsed as RecordedPoint[];
                    }

                    if (active) {
                        storageKeyRef.current = key;
                        pathRef.current = restored;
                        setRecordedPath(restored);
                        setPatrol(assignment);
                        setNow(Date.now());
                    }
                } catch (err: unknown) {
                    if (active) {
                        setError(
                            err instanceof Error ? err.message : 'Could not load patrol.',
                        );
                    }
                } finally {
                    if (active) setLoading(false);
                }
            }

            void loadPatrol();

            return () => {
                active = false;
            };
        }, [id, retry]),
    );

    useEffect(() => {
        if (patrol?.status !== 'in_progress') return;

        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [patrol?.status]);

    useFocusEffect(
        useCallback(() => {
            if (patrol?.status !== 'in_progress' || ending) return;

            let active = true;
            let subscription: Location.LocationSubscription | undefined;
            recordingEnabled.current = true;

            async function startTracking() {
                setGpsError('');
                setGpsStatus('Requesting location permission');

                try {
                    const permission =
                        await Location.requestForegroundPermissionsAsync();

                    if (!active) return;

                    if (permission.status !== 'granted') {
                        throw new Error(
                            'Location permission denied. Allow location for Expo Go in phone settings.',
                        );
                    }

                    const enabled = await Location.hasServicesEnabledAsync();

                    if (!active) return;

                    if (!enabled) {
                        throw new Error('Turn on Location/GPS on your phone.');
                    }

                    setGpsStatus('Waiting for a GPS fix');

                    const watcher = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.High,
                            timeInterval: 5000,
                            distanceInterval: 0,
                        },
                        (location) => {
                            if (
                                !active ||
                                !recordingEnabled.current ||
                                AppState.currentState !== 'active'
                            ) {
                                return;
                            }

                            const point: RecordedPoint = {
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                                accuracy: location.coords.accuracy,
                                timestamp: location.timestamp,
                            };

                            if (!validPoint(point)) return;

                            setCurrentLocation(point);
                            setGpsError('');

                            // Show weak fixes, but avoid adding them to the path.
                            if (
                                point.accuracy == null ||
                                !Number.isFinite(point.accuracy) ||
                                point.accuracy > 100
                            ) {
                                setGpsStatus('Weak GPS accuracy — waiting for a better fix');
                                return;
                            }

                            setGpsStatus('GPS active');

                            const lastPoint =
                                pathRef.current[pathRef.current.length - 1];

                            // Save the first fix, then the next suitable fix
                            // at least 30 seconds after the previous recorded point.
                            if (
                                lastPoint &&
                                point.timestamp - lastPoint.timestamp < 30000
                            ) {
                                return;
                            }

                            const nextPath = [...pathRef.current, point];
                            pathRef.current = nextPath;
                            setRecordedPath(nextPath);

                            const key = storageKeyRef.current;
                            const serialized = JSON.stringify(nextPath);

                            // Serialize writes so an older save cannot overwrite a newer one.
                            saveQueue.current = saveQueue.current
                                .then(() => AsyncStorage.setItem(key, serialized))
                                .then(() => {
                                    if (active) setStorageError('');
                                })
                                .catch(() => {
                                    if (active) {
                                        setStorageError(
                                            'Could not save GPS points on this phone. Keep this screen open and retry GPS.',
                                        );
                                    }
                                });
                        },
                        (message) => {
                            if (active) {
                                setGpsError(message);
                                setGpsStatus('GPS error');
                            }
                        },
                    );

                    if (!active) {
                        watcher.remove();
                    } else {
                        subscription = watcher;
                    }
                } catch (err: unknown) {
                    if (active) {
                        setGpsStatus('GPS unavailable');
                        setGpsError(
                            err instanceof Error
                                ? err.message
                                : 'Could not start GPS tracking.',
                        );
                    }
                }
            }

            void startTracking();

            return () => {
                active = false;
                recordingEnabled.current = false;
                subscription?.remove();
            };
        }, [patrol?.id, patrol?.status, ending, gpsRetry]),
    );

    function openDetails() {
        if (!id) {
            router.replace('/(ranger)/patrol');
            return;
        }

        router.replace({
            pathname: '/(ranger)/patrol-session/details',
            params: { id },
        });
    }

    async function completePatrol() {
        if (!id || submitting.current) return;

        submitting.current = true;
        recordingEnabled.current = false;
        setEnding(true);

        try {
            // Finish pending saves and ensure the complete path is stored locally.
            await saveQueue.current;
            await AsyncStorage.setItem(
                storageKeyRef.current,
                JSON.stringify(pathRef.current),
            );

            await PatrolService.completePatrol(id);
            openDetails();
        } catch (err: unknown) {
            Alert.alert(
                'Could not complete patrol',
                err instanceof Error ? err.message : 'Please try again.',
            );
        } finally {
            submitting.current = false;
            setEnding(false);
        }
    }

    function confirmEnd() {
        Alert.alert(
            'End patrol?',
            'GPS recording will stop and this patrol will be marked completed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'End Patrol',
                    style: 'destructive',
                    onPress: () => {
                        void completePatrol();
                    },
                },
            ],
        );
    }

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color="#1565C0" />
                <Text style={{ color: theme.textSecondary }}>Loading patrol...</Text>
            </View>
        );
    }

    if (error || !patrol) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <Text style={styles.error}>{error || 'Patrol unavailable.'}</Text>

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setRetry((value) => value + 1)}
                >
                    <Text style={styles.buttonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={openDetails}>
                    <Text style={styles.secondaryText}>Back to Details</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const completed = patrol.status === 'completed';
    const startedAt = patrol.startedAt?.toMillis();
    const finishedAt = patrol.completedAt?.toMillis();

    const elapsed =
        startedAt == null
            ? '--:--:--'
            : formatElapsed(
                (completed ? finishedAt ?? startedAt : now) - startedAt,
            );

    const validPoints = (patrol.points || []).filter(
        (point) =>
            Number.isFinite(point.latitude) &&
            Number.isFinite(point.longitude) &&
            Math.abs(point.latitude) <= 90 &&
            Math.abs(point.longitude) <= 180,
    );

    const travelledDistance =
        calculateTravelledDistance(recordedPath).toFixed(2);

    return (
        <ScrollView
            style={{ backgroundColor: theme.background }}
            contentContainerStyle={styles.content}
        >
            <Text style={[styles.title, { color: theme.textPrimary }]}>
                {patrol.routeName}
            </Text>

            <View style={styles.statusCard}>
                <Text style={styles.status}>
                    {completed ? 'Patrol completed' : 'Patrol in progress'}
                </Text>
                <Text style={styles.timer}>{elapsed}</Text>
                <Text style={styles.caption}>Elapsed time since patrol started</Text>
            </View>

            <PatrolRouteMap
                points={validPoints}
                currentLocation={currentLocation}
                recordedPath={recordedPath}
            />

            <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                <Text style={[styles.detail, { color: theme.textPrimary }]}>
                    GPS: {completed ? 'Recording stopped' : gpsStatus}
                </Text>

                <Text style={[styles.detail, { color: theme.textPrimary }]}>
                    Recorded points: {recordedPath.length}
                </Text>

                <Text style={[styles.detail, { color: theme.textPrimary }]}>
                    Approx. travelled distance: {travelledDistance} km
                </Text>

                <Text style={[styles.detail, { color: theme.textPrimary }]}>
                    Latest GPS accuracy:{' '}
                    {currentLocation && currentLocation.accuracy != null
                        ? Math.round(currentLocation.accuracy) + ' m'
                        : 'Waiting for GPS'}
                </Text>

                <Text style={[styles.detail, { color: theme.textPrimary }]}>
                    Patrol date: {patrol.patrolDate}
                </Text>

                <Text style={[styles.detail, { color: theme.textPrimary }]}>
                    Estimated duration: {patrol.estimatedDurationMinutes} minutes
                </Text>

                <Text style={styles.caption}>
                    GPS points are stored on this phone. Cloud upload is not enabled yet.
                </Text>
            </View>

            {gpsError ? <Text style={styles.error}>{gpsError}</Text> : null}
            {storageError ? <Text style={styles.error}>{storageError}</Text> : null}

            {!completed && (
                <>
                    <Text style={styles.warning}>
                        Keep this screen open for recording. Tracking pauses when you
                        leave this screen, lock the phone or put the app in the background.
                    </Text>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        disabled={ending}
                        onPress={() => setGpsRetry((value) => value + 1)}
                    >
                        <Text style={styles.secondaryText}>Retry GPS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.endButton, ending && styles.disabled]}
                        onPress={confirmEnd}
                        disabled={ending}
                    >
                        {ending ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>End Patrol</Text>
                        )}
                    </TouchableOpacity>
                </>
            )}

            <TouchableOpacity
                style={styles.secondaryButton}
                onPress={openDetails}
                disabled={ending}
            >
                <Text style={styles.secondaryText}>Back to Details</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: { padding: 16, paddingBottom: 40, gap: 16 },
    center: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    title: { fontSize: 24, fontWeight: '700' },
    statusCard: {
        backgroundColor: '#E3F2FD',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        gap: 8,
    },
    status: { color: '#2E7D32', fontSize: 16, fontWeight: '700' },
    timer: { color: '#0D47A1', fontSize: 38, fontWeight: '700' },
    caption: {
        color: '#546E7A',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    card: { padding: 16, borderRadius: 12, gap: 12 },
    detail: { fontSize: 15 },
    primaryButton: {
        backgroundColor: '#1565C0',
        minHeight: 48,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    endButton: {
        backgroundColor: '#D32F2F',
        minHeight: 48,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    secondaryButton: {
        minHeight: 48,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#1565C0',
        alignItems: 'center',
    },
    secondaryText: { color: '#1565C0', fontWeight: '600', fontSize: 15 },
    error: { color: '#D32F2F', textAlign: 'center', lineHeight: 20 },
    warning: { color: '#F57F17', textAlign: 'center', lineHeight: 20 },
    disabled: { opacity: 0.6 },
});