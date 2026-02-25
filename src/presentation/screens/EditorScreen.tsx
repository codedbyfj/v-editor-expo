import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Dimensions,
    ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { ProjectRepository, ClipRepository, LayerRepository } from '../../infrastructure/database';
import { FileManager } from '../../infrastructure/filesystem';
import * as VideoProcessor from '../../infrastructure/video-engine/VideoProcessor';
import { Project, Clip } from '../../domain/entities';
import Timeline from '../components/Timeline';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLAYER_HEIGHT = SCREEN_WIDTH * 0.5625; // 16:9

const projectRepo = new ProjectRepository();
const clipRepo = new ClipRepository();

type RootStackParamList = {
    Home: undefined;
    Editor: { projectId: string };
    Export: { projectId: string };
};

type EditorRouteProp = RouteProp<RootStackParamList, 'Editor'>;
type EditorNavProp = NativeStackNavigationProp<RootStackParamList, 'Editor'>;

export default function EditorScreen() {
    const navigation = useNavigation<EditorNavProp>();
    const route = useRoute<EditorRouteProp>();
    const { projectId } = route.params;

    const videoRef = useRef<Video>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [clips, setClips] = useState<Clip[]>([]);
    const [currentClipIndex, setCurrentClipIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [positionMs, setPositionMs] = useState(0);
    const [durationMs, setDurationMs] = useState(0);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);

    const loadProjectData = useCallback(async () => {
        try {
            const p = await projectRepo.getById(projectId);
            const c = await clipRepo.getByProjectId(projectId);
            setProject(p);
            setClips(c);
        } catch (error) {
            console.error('Failed to load project:', error);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadProjectData();
    }, [loadProjectData]);

    const handleImportVideo = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant media library access to import videos.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                quality: 1,
                videoMaxDuration: 600,
            });

            if (result.canceled || !result.assets?.[0]) return;

            setImporting(true);
            const asset = result.assets[0];
            const sourcePath = asset.uri;

            // Copy source to project directory
            const localPath = await FileManager.copySourceToProject(sourcePath, projectId);

            // Get media info
            let duration = asset.duration || 0;
            try {
                const info = await VideoProcessor.probeMedia(localPath);
                duration = info.duration;
            } catch {
                // FFmpegKit may not be available yet; use asset duration
                duration = (asset.duration || 10000) / 1000;
            }

            // Create clip record
            const clip = await clipRepo.create({
                projectId,
                sourcePath: localPath,
                startTime: 0,
                endTime: duration,
                duration,
                order: clips.length,
            });

            // Try to generate proxy + thumbnail (non-blocking if FFmpeg unavailable)
            try {
                const proxyPath = await VideoProcessor.generateProxy(localPath, projectId);
                const thumbPath = await VideoProcessor.extractThumbnail(localPath, projectId);
                clip.proxyPath = proxyPath;
                clip.thumbnailPath = thumbPath;
                await clipRepo.update(clip);
            } catch {
                console.warn('Proxy/thumbnail generation skipped (FFmpegKit not available)');
            }

            // Update project timestamp
            if (project) {
                await projectRepo.update(project);
            }

            setImporting(false);
            loadProjectData();
        } catch (error) {
            setImporting(false);
            Alert.alert('Import Failed', 'Could not import the selected video.');
            console.error('Import error:', error);
        }
    };

    const handlePlayPause = async () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }
    };

    const handlePlaybackStatus = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setIsPlaying(status.isPlaying);
        setPositionMs(status.positionMillis || 0);
        setDurationMs(status.durationMillis || 0);
    };

    const handleTimelineSeek = async (timeMs: number) => {
        if (videoRef.current) {
            await videoRef.current.setPositionAsync(timeMs);
        }
    };

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const currentClip = clips[currentClipIndex];
    const videoSource = currentClip?.proxyPath || currentClip?.sourcePath;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {project?.name || 'Editor'}
                </Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Export', { projectId })}
                    style={[styles.exportBtn, clips.length === 0 && styles.exportBtnDisabled]}
                    disabled={clips.length === 0}
                >
                    <Text style={styles.exportText}>Export</Text>
                </TouchableOpacity>
            </View>

            {/* Video Player */}
            <View style={styles.playerContainer}>
                {videoSource ? (
                    <Video
                        ref={videoRef}
                        source={{ uri: videoSource }}
                        style={styles.player}
                        resizeMode={ResizeMode.CONTAIN}
                        onPlaybackStatusUpdate={handlePlaybackStatus}
                        shouldPlay={false}
                        isLooping={false}
                    />
                ) : (
                    <View style={styles.playerPlaceholder}>
                        <Text style={styles.placeholderIcon}>🎬</Text>
                        <Text style={styles.placeholderText}>Import a video to start editing</Text>
                    </View>
                )}
            </View>

            {/* Playback Controls */}
            <View style={styles.controls}>
                <Text style={styles.timeText}>{formatTime(positionMs)}</Text>
                <TouchableOpacity
                    onPress={handlePlayPause}
                    style={styles.playPauseBtn}
                    disabled={!videoSource}
                >
                    <Text style={styles.playPauseIcon}>{isPlaying ? '⏸' : '▶'}</Text>
                </TouchableOpacity>
                <Text style={styles.timeText}>{formatTime(durationMs)}</Text>
            </View>

            {/* Timeline */}
            <View style={styles.timelineContainer}>
                <Timeline
                    clips={clips}
                    currentTimeMs={positionMs}
                    totalDurationMs={durationMs}
                    onSeek={handleTimelineSeek}
                    onClipSelect={setCurrentClipIndex}
                    selectedClipIndex={currentClipIndex}
                />
            </View>

            {/* Bottom Toolbar */}
            <View style={styles.toolbar}>
                <TouchableOpacity
                    style={styles.toolBtn}
                    onPress={handleImportVideo}
                    disabled={importing}
                >
                    {importing ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                        <>
                            <Text style={styles.toolIcon}>📁</Text>
                            <Text style={styles.toolLabel}>Import</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolBtn} disabled={clips.length === 0}>
                    <Text style={styles.toolIcon}>✂️</Text>
                    <Text style={styles.toolLabel}>Trim</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolBtn} disabled={clips.length === 0}>
                    <Text style={styles.toolIcon}>🎵</Text>
                    <Text style={styles.toolLabel}>Audio</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolBtn} disabled={clips.length === 0}>
                    <Text style={styles.toolIcon}>📝</Text>
                    <Text style={styles.toolLabel}>Text</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolBtn} disabled={clips.length < 2}>
                    <Text style={styles.toolIcon}>🔗</Text>
                    <Text style={styles.toolLabel}>Merge</Text>
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
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
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
        flex: 1,
        textAlign: 'center',
    },
    exportBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    exportBtnDisabled: {
        opacity: 0.4,
    },
    exportText: {
        ...Typography.button,
        color: Colors.textPrimary,
        fontSize: 14,
    },
    playerContainer: {
        width: SCREEN_WIDTH,
        height: PLAYER_HEIGHT,
        backgroundColor: '#000',
    },
    player: {
        width: '100%',
        height: '100%',
    },
    playerPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.surface,
    },
    placeholderIcon: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    placeholderText: {
        ...Typography.body,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        gap: Spacing.xl,
    },
    timeText: {
        ...Typography.mono,
        minWidth: 48,
        textAlign: 'center',
    },
    playPauseBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.glow(Colors.primary),
    },
    playPauseIcon: {
        fontSize: 18,
        color: Colors.textPrimary,
    },
    timelineContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingBottom: 32,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    toolBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        minWidth: 56,
    },
    toolIcon: {
        fontSize: 22,
        marginBottom: 4,
    },
    toolLabel: {
        ...Typography.caption,
        fontSize: 11,
    },
});
