import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Dimensions,
    Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as MediaLibrary from 'expo-media-library';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { ClipRepository } from '../../infrastructure/database';
import * as VideoProcessor from '../../infrastructure/video-engine/VideoProcessor';
import { ExportSettings } from '../../domain/entities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const clipRepo = new ClipRepository();

type RootStackParamList = {
    Home: undefined;
    Editor: { projectId: string };
    Export: { projectId: string };
};

type ExportRouteProp = RouteProp<RootStackParamList, 'Export'>;

type Resolution = '480p' | '720p' | '1080p' | '4k';

const RESOLUTIONS: { key: Resolution; label: string; description: string }[] = [
    { key: '480p', label: '480p', description: 'SD — Fastest export' },
    { key: '720p', label: '720p', description: 'HD — Balanced' },
    { key: '1080p', label: '1080p', description: 'Full HD — Recommended' },
    { key: '4k', label: '4K', description: 'Ultra HD — Largest file' },
];

export default function ExportScreen() {
    const navigation = useNavigation();
    const route = useRoute<ExportRouteProp>();
    const { projectId } = route.params;

    const [selectedResolution, setSelectedResolution] = useState<Resolution>('1080p');
    const [hwAccel, setHwAccel] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [exportedPath, setExportedPath] = useState<string | null>(null);

    const handleExport = async () => {
        if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Export requires a native device build.');
            return;
        }
        setExporting(true);
        setProgress(0);

        try {
            const clips = await clipRepo.getByProjectId(projectId);
            if (clips.length === 0) {
                Alert.alert('No Clips', 'Add at least one video clip before exporting.');
                setExporting(false);
                return;
            }

            const settings: ExportSettings = {
                resolution: selectedResolution,
                quality: 'high',
                useHardwareAcceleration: hwAccel,
                format: 'mp4',
            };

            // If multiple clips, merge first
            let inputPath = clips[0].sourcePath;
            if (clips.length > 1) {
                const paths = clips.map((c) => c.sourcePath);
                inputPath = await VideoProcessor.mergeClips(paths, projectId, (time) => {
                    setProgress(Math.min(time / 1000 / 30, 0.4) * 100); // estimate merge as 40%
                });
            }

            // Export
            const outputPath = await VideoProcessor.exportVideo(
                inputPath,
                projectId,
                settings,
                (time) => {
                    const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);
                    const p = totalDuration > 0 ? (time / 1000 / totalDuration) * 100 : 0;
                    setProgress(Math.min(40 + p * 0.6, 99)); // 40-99% for export
                }
            );

            // Save to gallery
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
                await MediaLibrary.saveToLibraryAsync(outputPath);
            }

            setProgress(100);
            setExportedPath(outputPath);
            setExporting(false);

            Alert.alert(
                'Export Complete! 🎉',
                'Your video has been saved to your gallery.',
                [{ text: 'Done', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            setExporting(false);
            setProgress(0);
            Alert.alert('Export Failed', `An error occurred: ${error}`);
        }
    };

    const handleCancel = async () => {
        try {
            await VideoProcessor.cancelProcessing();
            setExporting(false);
            setProgress(0);
        } catch {
            setExporting(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Export Video</Text>
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.content}>
                {/* Resolution Selector */}
                <Text style={styles.sectionTitle}>Resolution</Text>
                <View style={styles.resolutionGrid}>
                    {RESOLUTIONS.map((res) => (
                        <TouchableOpacity
                            key={res.key}
                            style={[
                                styles.resolutionCard,
                                selectedResolution === res.key && styles.resolutionCardSelected,
                            ]}
                            onPress={() => setSelectedResolution(res.key)}
                            disabled={exporting}
                        >
                            <Text
                                style={[
                                    styles.resolutionLabel,
                                    selectedResolution === res.key && styles.resolutionLabelSelected,
                                ]}
                            >
                                {res.label}
                            </Text>
                            <Text style={styles.resolutionDesc}>{res.description}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Hardware Acceleration Toggle */}
                <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => setHwAccel(!hwAccel)}
                    disabled={exporting}
                >
                    <View>
                        <Text style={styles.toggleLabel}>Hardware Acceleration</Text>
                        <Text style={styles.toggleDesc}>Uses device GPU for faster encoding</Text>
                    </View>
                    <View style={[styles.toggle, hwAccel && styles.toggleActive]}>
                        <View style={[styles.toggleDot, hwAccel && styles.toggleDotActive]} />
                    </View>
                </TouchableOpacity>

                {/* Export Progress */}
                {exporting && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{Math.round(progress)}% — Exporting...</Text>
                    </View>
                )}

                {/* Export / Cancel Button */}
                <TouchableOpacity
                    style={[styles.exportBtn, exporting && styles.cancelBtn]}
                    onPress={exporting ? handleCancel : handleExport}
                    activeOpacity={0.8}
                >
                    {exporting ? (
                        <View style={styles.exportBtnContent}>
                            <ActivityIndicator size="small" color={Colors.textPrimary} />
                            <Text style={styles.exportBtnText}>Cancel</Text>
                        </View>
                    ) : (
                        <Text style={styles.exportBtnText}>Export Video</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 54,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: {
        paddingVertical: Spacing.xs,
        paddingRight: Spacing.md,
    },
    backText: {
        ...Typography.body,
        color: Colors.primary,
    },
    headerTitle: {
        ...Typography.subheading,
    },
    headerSpacer: {
        width: 60,
    },
    content: {
        flex: 1,
        padding: Spacing.xl,
    },
    sectionTitle: {
        ...Typography.heading,
        marginBottom: Spacing.lg,
    },
    resolutionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        marginBottom: Spacing.xxl,
    },
    resolutionCard: {
        width: (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 2,
        borderColor: Colors.border,
    },
    resolutionCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryMuted,
    },
    resolutionLabel: {
        ...Typography.subheading,
        marginBottom: 4,
    },
    resolutionLabelSelected: {
        color: Colors.primary,
    },
    resolutionDesc: {
        ...Typography.caption,
        fontSize: 11,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.xxl,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    toggleLabel: {
        ...Typography.subheading,
    },
    toggleDesc: {
        ...Typography.caption,
        marginTop: 2,
    },
    toggle: {
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.surfaceHighlight,
        justifyContent: 'center',
        padding: 2,
    },
    toggleActive: {
        backgroundColor: Colors.primary,
    },
    toggleDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.textMuted,
    },
    toggleDotActive: {
        alignSelf: 'flex-end',
        backgroundColor: Colors.textPrimary,
    },
    progressContainer: {
        marginBottom: Spacing.xl,
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.surfaceHighlight,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },
    progressText: {
        ...Typography.caption,
        textAlign: 'center',
    },
    exportBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        ...Shadows.glow(Colors.primary),
    },
    cancelBtn: {
        backgroundColor: Colors.error,
        ...Shadows.glow(Colors.error),
    },
    exportBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    exportBtnText: {
        ...Typography.button,
        color: Colors.textPrimary,
        fontSize: 18,
    },
});
