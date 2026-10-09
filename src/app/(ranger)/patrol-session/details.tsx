import {
    router,
    useFocusEffect,
    useLocalSearchParams,
} from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import PatrolRouteMap from '../../../components/patrol/PatrolRouteMap';
import { useTheme } from '../../../context/ThemeContext';
import type { PatrolAssignment } from '../../../services/patrolService';
import { PatrolService } from '../../../services/patrolService';

export default function PatrolDetailsScreen() {
    const { id } = useLocalSearchParams<{
        id?: string | string[];
    }>();

    const assignmentId = Array.isArray(id) ? id[0] : id;
    const { theme } = useTheme();

    const [patrol, setPatrol] = useState<PatrolAssignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const submitting = useRef(false);

    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function loadPatrol() {
                setLoading(true);
                setError('');
                setPatrol(null);

                try {
                    if (!assignmentId) {
                        throw new Error('Missing assignment ID.');
                    }

                    const assignment =
                        await PatrolService.getMyAssignment(assignmentId);

                    if (active) {
                        setPatrol(assignment);
                    }
                } catch (err: unknown) {
                    if (active) {
                        setError(
                            err instanceof Error
                                ? err.message
                                : 'Could not load patrol details.',
                        );
                    }
                } finally {
                    if (active) {
                        setLoading(false);
                    }
                }
            }

            void loadPatrol();

            return () => {
                active = false;
            };
        }, [assignmentId, refreshKey]),
    );

    function backToPatrols() {
        router.replace('/(ranger)/patrol');
    }

    async function handleStartPatrol() {
        if (!patrol || submitting.current) return;

        submitting.current = true;
        setStarting(true);

        try {
            await PatrolService.startPatrol(patrol.id);

            router.push({
                pathname: '/(ranger)/patrol-session/active',
                params: { id: patrol.id },
            });
        } catch (err: unknown) {
            Alert.alert(
                'Could not start patrol',
                err instanceof Error ? err.message : 'Please try again.',
            );
        } finally {
            submitting.current = false;
            setStarting(false);
        }
    }

    if (loading) {
        return (
            <View
                style={[
                    styles.center,
                    { backgroundColor: theme.background },
                ]}
            >
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
                    Loading patrol details...
                </Text>
            </View>
        );
    }

    if (error || !patrol) {
        return (
            <View
                style={[
                    styles.center,
                    { backgroundColor: theme.background },
                ]}
            >
                <Text style={styles.errorText}>
                    {error || 'Patrol not found.'}
                </Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => setRefreshKey((value) => value + 1)}
                >
                    <Text style={styles.buttonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.outlineButton}
                    onPress={backToPatrols}
                >
                    <Text style={styles.outlineText}>Back to My Patrols</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const points = (patrol.points || []).filter(
        (point) =>
            Number.isFinite(point.latitude) &&
            Number.isFinite(point.longitude) &&
            Math.abs(point.latitude) <= 90 &&
            Math.abs(point.longitude) <= 180,
    );

    const checkpointCount = points.filter(
        (point) => point.type === 'checkpoint',
    ).length;

    const canStart =
        patrol.status === 'assigned' ||
        patrol.status === 'in_progress';

    const statusLabel =
        patrol.status === 'in_progress'
            ? 'In progress'
            : patrol.status === 'completed'
                ? 'Completed'
                : patrol.status === 'assigned'
                    ? 'Assigned'
                    : patrol.status;

    const details = [
        {
            label: 'Patrol date',
            value: patrol.patrolDate,
        },
        {
            label: 'Est. duration',
            value: `${patrol.estimatedDurationMinutes} min`,
        },
        {
            label: 'Approx. distance',
            value: Number.isFinite(patrol.approximateDistanceKm)
                ? `${patrol.approximateDistanceKm.toFixed(2)} km`
                : 'Unavailable',
        },
        {
            label: 'Checkpoints',
            value: String(checkpointCount),
        },
    ];

    return (
        <ScrollView
            style={[
                styles.screen,
                { backgroundColor: theme.background },
            ]}
            contentContainerStyle={styles.scrollContent}
        >
            {points.length > 0 ? (
                <PatrolRouteMap points={points} />
            ) : (
                <View style={styles.mapMissing}>
                    <Text style={styles.errorText}>
                        No valid route coordinates available.
                    </Text>
                </View>
            )}

            <View style={styles.content}>
                <View style={styles.heading}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>
                        {patrol.routeName}
                    </Text>

                    <View
                        style={[
                            styles.badge,
                            patrol.status === 'completed' && styles.completedBadge,
                        ]}
                    >
                        <Text
                            style={[
                                styles.badgeText,
                                patrol.status === 'completed' && styles.completedText,
                            ]}
                        >
                            {statusLabel}
                        </Text>
                    </View>
                </View>

                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.cardBg,
                            borderColor: theme.inputBorder,
                        },
                    ]}
                >
                    {details.map((item) => (
                        <View key={item.label} style={styles.detailRow}>
                            <Text
                                style={[
                                    styles.detailLabel,
                                    { color: theme.textSecondary },
                                ]}
                            >
                                {item.label}
                            </Text>

                            <Text
                                style={[
                                    styles.detailValue,
                                    { color: theme.textPrimary },
                                ]}
                            >
                                {item.value}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Assigned route</Text>

                    <Text style={styles.infoText}>
                        Green S: Start
                        {'\n'}Blue numbers: Checkpoints
                        {'\n'}Red E: End
                    </Text>

                    <Text style={styles.infoText}>
                        Points are connected in their assigned order.
                    </Text>
                </View>

                {canStart && (
                    <TouchableOpacity
                        style={[styles.button, starting && styles.disabled]}
                        onPress={handleStartPatrol}
                        disabled={starting}
                    >
                        {starting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {patrol.status === 'in_progress'
                                    ? 'Resume Patrol'
                                    : 'Start Patrol'}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}

                {patrol.status === 'completed' && (
                    <View style={styles.completedCard}>
                        <Text style={styles.completedText}>
                            This patrol has been completed.
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[
                        styles.outlineButton,
                        starting && styles.disabled,
                    ]}
                    onPress={backToPatrols}
                    disabled={starting}
                >
                    <Text style={styles.outlineText}>Back to My Patrols</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        gap: 18,
    },
    mapMissing: {
        height: 180,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 16,
        gap: 18,
    },
    heading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
    },
    badge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
    },
    badgeText: {
        color: '#1565C0',
        fontWeight: '600',
    },
    completedBadge: {
        backgroundColor: '#E8F5E9',
    },
    completedText: {
        color: '#2E7D32',
        fontWeight: '600',
        textAlign: 'center',
    },
    completedCard: {
        backgroundColor: '#E8F5E9',
        padding: 16,
        borderRadius: 12,
    },
    card: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    detailLabel: {
        flex: 1,
        fontSize: 14,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        flexShrink: 1,
        textAlign: 'right',
    },
    infoCard: {
        backgroundColor: '#E3F2FD',
        padding: 18,
        borderRadius: 14,
    },
    infoTitle: {
        color: '#0D47A1',
        fontSize: 17,
        fontWeight: '700',
    },
    infoText: {
        color: '#546E7A',
        marginTop: 8,
        lineHeight: 22,
    },
    outlineButton: {
        borderColor: '#1565C0',
        borderWidth: 1,
        borderRadius: 12,
        minHeight: 48,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    outlineText: {
        color: '#1565C0',
        fontSize: 16,
        fontWeight: '700',
    },
    button: {
        backgroundColor: '#1565C0',
        borderRadius: 12,
        minHeight: 48,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    disabled: {
        opacity: 0.6,
    },
    errorText: {
        color: '#D32F2F',
        textAlign: 'center',
        lineHeight: 22,
    },
});