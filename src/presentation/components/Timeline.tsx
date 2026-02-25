import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { Clip } from '../../domain/entities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_HEIGHT = 56;
const PIXELS_PER_SECOND = 40;
const PLAYHEAD_WIDTH = 2;
const MIN_CLIP_WIDTH = 40;

interface TimelineProps {
    clips: Clip[];
    currentTimeMs: number;
    totalDurationMs: number;
    onSeek: (timeMs: number) => void;
    onClipSelect: (index: number) => void;
    selectedClipIndex: number;
}

export default function Timeline({
    clips,
    currentTimeMs,
    totalDurationMs,
    onSeek,
    onClipSelect,
    selectedClipIndex,
}: TimelineProps) {
    const totalDurationSec = useMemo(() => {
        if (clips.length === 0) return 10; // default 10s empty timeline
        return clips.reduce((sum, c) => sum + c.duration, 0);
    }, [clips]);

    const timelineWidth = useMemo(() => {
        return Math.max(SCREEN_WIDTH, totalDurationSec * PIXELS_PER_SECOND + 48);
    }, [totalDurationSec]);

    const playheadPosition = useMemo(() => {
        if (totalDurationMs <= 0) return 24;
        const ratio = currentTimeMs / totalDurationMs;
        return 24 + ratio * (timelineWidth - 48);
    }, [currentTimeMs, totalDurationMs, timelineWidth]);

    // Time markers
    const timeMarkers = useMemo(() => {
        const markers: { label: string; position: number }[] = [];
        const intervalSec = totalDurationSec > 60 ? 10 : totalDurationSec > 20 ? 5 : 1;
        for (let t = 0; t <= totalDurationSec; t += intervalSec) {
            const min = Math.floor(t / 60);
            const sec = t % 60;
            markers.push({
                label: `${min}:${sec.toString().padStart(2, '0')}`,
                position: 24 + (t / totalDurationSec) * (timelineWidth - 48),
            });
        }
        return markers;
    }, [totalDurationSec, timelineWidth]);

    const handleTimelinePress = (event: any) => {
        const x = event.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, (x - 24) / (timelineWidth - 48)));
        onSeek(ratio * totalDurationMs);
    };

    // Calculate clip widths based on duration
    const clipWidths = useMemo(() => {
        return clips.map((clip) => {
            const width = clip.duration * PIXELS_PER_SECOND;
            return Math.max(width, MIN_CLIP_WIDTH);
        });
    }, [clips]);

    if (clips.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Import a video to see the timeline</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { width: timelineWidth }]}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleTimelinePress}
                    style={styles.touchArea}
                >
                    {/* Time Markers */}
                    <View style={styles.timeMarkersRow}>
                        {timeMarkers.map((marker, i) => (
                            <Text
                                key={i}
                                style={[
                                    styles.timeMarkerText,
                                    { position: 'absolute', left: marker.position },
                                ]}
                            >
                                {marker.label}
                            </Text>
                        ))}
                    </View>

                    {/* Clip Track */}
                    <View style={styles.track}>
                        {clips.map((clip, index) => {
                            const isSelected = index === selectedClipIndex;
                            let offsetX = 24;
                            for (let i = 0; i < index; i++) {
                                offsetX += clipWidths[i] + 4;
                            }

                            return (
                                <TouchableOpacity
                                    key={clip.id}
                                    style={[
                                        styles.clipBlock,
                                        {
                                            width: clipWidths[index],
                                            left: offsetX,
                                        },
                                        isSelected && styles.clipBlockSelected,
                                    ]}
                                    onPress={() => onClipSelect(index)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.clipWaveform}>
                                        {Array.from({ length: Math.floor(clipWidths[index] / 4) }).map(
                                            (_, i) => (
                                                <View
                                                    key={i}
                                                    style={[
                                                        styles.waveformBar,
                                                        { height: 8 + Math.random() * 20 },
                                                    ]}
                                                />
                                            )
                                        )}
                                    </View>
                                    <Text style={styles.clipLabel} numberOfLines={1}>
                                        Clip {index + 1}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Playhead */}
                    <View
                        style={[
                            styles.playhead,
                            { left: playheadPosition },
                        ]}
                    >
                        <View style={styles.playheadDot} />
                        <View style={styles.playheadLine} />
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingVertical: Spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
        color: Colors.textMuted,
    },
    scrollContent: {
        minHeight: TRACK_HEIGHT + 40,
        paddingVertical: Spacing.sm,
    },
    touchArea: {
        flex: 1,
    },
    timeMarkersRow: {
        height: 20,
        position: 'relative',
    },
    timeMarkerText: {
        ...Typography.mono,
        fontSize: 10,
        color: Colors.textMuted,
    },
    track: {
        height: TRACK_HEIGHT,
        backgroundColor: Colors.timelineTrack,
        borderRadius: BorderRadius.sm,
        marginTop: 4,
        position: 'relative',
    },
    clipBlock: {
        position: 'absolute',
        top: 4,
        height: TRACK_HEIGHT - 8,
        backgroundColor: Colors.timelineClip,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'transparent',
        paddingHorizontal: 4,
        justifyContent: 'center',
    },
    clipBlockSelected: {
        borderColor: Colors.accent,
        backgroundColor: Colors.primaryLight,
    },
    clipWaveform: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 28,
        gap: 1,
    },
    waveformBar: {
        width: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 1,
    },
    clipLabel: {
        fontSize: 9,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '600',
        marginTop: 2,
    },
    playhead: {
        position: 'absolute',
        top: 0,
        width: PLAYHEAD_WIDTH,
        height: '100%',
        alignItems: 'center',
        zIndex: 10,
    },
    playheadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.timelinePlayhead,
        marginBottom: -2,
    },
    playheadLine: {
        width: PLAYHEAD_WIDTH,
        flex: 1,
        backgroundColor: Colors.timelinePlayhead,
    },
});
