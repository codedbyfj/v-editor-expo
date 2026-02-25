import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    Modal,
    Dimensions,
    Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { ProjectRepository } from '../../infrastructure/database';
import { FileManager } from '../../infrastructure/filesystem';
import { Project } from '../../domain/entities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const projectRepo = new ProjectRepository();

type RootStackParamList = {
    Home: undefined;
    Editor: { projectId: string };
    Export: { projectId: string };
};

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
    const navigation = useNavigation<HomeNavProp>();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

    const loadProjects = useCallback(async () => {
        try {
            await projectRepo.initialize();
            await FileManager.initialize();
            const allProjects = await projectRepo.getAll();
            setProjects(allProjects);
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadProjects();
        });
        return unsubscribe;
    }, [navigation, loadProjects]);

    const handleCreateProject = async () => {
        const name = newProjectName.trim() || `Project ${projects.length + 1}`;
        try {
            const project = await projectRepo.create({ name });
            await FileManager.initProjectDir(project.id);
            setModalVisible(false);
            setNewProjectName('');
            navigation.navigate('Editor', { projectId: project.id });
        } catch (error) {
            Alert.alert('Error', 'Failed to create project');
        }
    };

    const handleDeleteProject = (project: Project) => {
        Alert.alert(
            'Delete Project',
            `Are you sure you want to delete "${project.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await projectRepo.delete(project.id);
                            await FileManager.deleteProjectFiles(project.id);
                            loadProjects();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete project');
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const renderProject = ({ item }: { item: Project }) => (
        <TouchableOpacity
            style={styles.projectCard}
            onPress={() => navigation.navigate('Editor', { projectId: item.id })}
            onLongPress={() => handleDeleteProject(item)}
            activeOpacity={0.7}
        >
            <View style={styles.projectThumbnail}>
                <Text style={styles.projectThumbnailIcon}>🎬</Text>
            </View>
            <View style={styles.projectInfo}>
                <Text style={styles.projectName} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={styles.projectDate}>{formatDate(item.updatedAt)}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎥</Text>
            <Text style={styles.emptyTitle}>No projects yet</Text>
            <Text style={styles.emptySubtitle}>
                Tap the + button to create your first video project
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>VEditor</Text>
                    <Text style={styles.headerSubtitle}>Professional Video Editor</Text>
                </View>
            </View>

            {/* Projects List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={projects}
                    renderItem={renderProject}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmpty}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>

            {/* New Project Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Project</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Project name"
                            placeholderTextColor={Colors.textMuted}
                            value={newProjectName}
                            onChangeText={setNewProjectName}
                            autoFocus
                            selectionColor={Colors.primary}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => {
                                    setModalVisible(false);
                                    setNewProjectName('');
                                }}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalCreateBtn}
                                onPress={handleCreateProject}
                            >
                                <Text style={styles.modalCreateText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        ...Typography.title,
        color: Colors.primary,
    },
    headerSubtitle: {
        ...Typography.caption,
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: Spacing.lg,
        paddingBottom: 100,
        flexGrow: 1,
    },
    projectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.small,
    },
    projectThumbnail: {
        width: 64,
        height: 48,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    projectThumbnailIcon: {
        fontSize: 24,
    },
    projectInfo: {
        flex: 1,
    },
    projectName: {
        ...Typography.subheading,
    },
    projectDate: {
        ...Typography.caption,
        marginTop: 2,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxl,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        ...Typography.heading,
        marginBottom: Spacing.sm,
    },
    emptySubtitle: {
        ...Typography.body,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 32,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.glow(Colors.primary),
    },
    fabIcon: {
        fontSize: 30,
        color: Colors.textPrimary,
        fontWeight: '300',
        marginTop: -2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: Colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: SCREEN_WIDTH - 64,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.large,
    },
    modalTitle: {
        ...Typography.heading,
        marginBottom: Spacing.lg,
    },
    modalInput: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        color: Colors.textPrimary,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.xl,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.md,
    },
    modalCancelBtn: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    modalCancelText: {
        ...Typography.button,
        color: Colors.textSecondary,
    },
    modalCreateBtn: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary,
    },
    modalCreateText: {
        ...Typography.button,
        color: Colors.textPrimary,
    },
});
