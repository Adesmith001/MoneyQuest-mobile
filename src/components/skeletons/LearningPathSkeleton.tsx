import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Platform, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// On web the app renders inside AppFrame's centered phone frame (max 480px
// wide). Using the raw window width would size the skeleton path and nodes
// wider than the visible frame and distort during the loading phase.
function useLayoutWidth(): number {
    const { width: windowWidth } = useWindowDimensions();
    return Platform.OS === 'web' ? Math.min(windowWidth, 480) : windowWidth;
}

const SkeletonNode = ({ index, opacity }: { index: number; opacity: Animated.Value }) => {
    const isLeftSide = index % 2 === 0;
    const layoutWidth = useLayoutWidth();

    return (
        <View style={styles.levelContainer}>
            {/* Path Connector Skeleton - Static gray line */}
            {index < 4 && ( // Don't show for last one in this mock list
                <Svg style={styles.pathSvg}>
                    <Path
                        d={
                            isLeftSide
                                ? `M ${layoutWidth * 0.25 + 10}, 45 C ${layoutWidth * 0.25 + 80
                                }, 100, ${layoutWidth * 0.75 - 80}, 80, ${layoutWidth * 0.75 - 10
                                }, 145`
                                : `M ${layoutWidth * 0.75 - 10}, 45 C ${layoutWidth * 0.75 - 80
                                }, 100, ${layoutWidth * 0.25 + 80}, 80, ${layoutWidth * 0.25 + 10
                                }, 145`
                        }
                        stroke="#E0E0E0"
                        strokeWidth="5"
                        fill="none"
                    />
                </Svg>
            )}

            <View style={[styles.levelRow, !isLeftSide && styles.levelRowReverse]}>
                <View style={[styles.nodeWrapper, { width: layoutWidth / 2 }]}>
                    <Animated.View style={[styles.levelNode, { opacity }]} />
                </View>
            </View>
        </View>
    );
};

const LearningPathSkeleton = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.sequence([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0.3,
                duration: 800,
                useNativeDriver: true,
            }),
        ]);

        Animated.loop(pulse).start();
    }, [opacity]);

    return (
        <View style={styles.container}>
            {/* Cloud decorations (static/faded) */}
            <View style={styles.cloudsContainer}>
                <Animated.Text style={[styles.cloud, { top: 20, left: 30, opacity }]}>☁️</Animated.Text>
                <Animated.Text style={[styles.cloud, { top: 60, right: 40, opacity }]}>☁️</Animated.Text>
            </View>

            {/* Mock Section Header */}
            <View style={styles.sectionHeaderContainer}>
                <Animated.View style={[styles.sectionHeader, { opacity }]} />
            </View>

            {/* Mock Nodes */}
            <View style={styles.levelsContainer}>
                {[0, 1, 2, 3, 4].map((i) => (
                    <SkeletonNode key={i} index={i} opacity={opacity} />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#D4E8F5",
    },
    cloudsContainer: {
        position: "absolute",
        width: "100%",
        height: "100%",
        zIndex: 0,
    },
    cloud: {
        position: "absolute",
        fontSize: 32,
        color: '#fff',
        opacity: 0.4,
    },
    sectionHeaderContainer: {
        paddingHorizontal: 24,
        marginTop: 40,
        marginBottom: 30,
    },
    sectionHeader: {
        height: 60,
        backgroundColor: "rgba(255, 255, 255, 0.5)",
        borderRadius: 16,
        width: '100%',
    },
    levelsContainer: {
        paddingHorizontal: 0,
        marginTop: 20,
    },
    levelContainer: {
        height: 150,
        position: "relative",
    },
    pathSvg: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
    },
    levelRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        position: "absolute",
        top: 0,
    },
    levelRowReverse: {
        justifyContent: "flex-end",
    },
    nodeWrapper: {
        alignItems: "center",
    },
    levelNode: {
        width: 50,
        height: 50,
        borderRadius: 40,
        backgroundColor: "rgba(255, 255, 255, 0.6)",
        borderWidth: 4,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
});

export default LearningPathSkeleton;
