import React, { useState, useEffect } from 'react';
import {
    View,
    Image,
    ImageSourcePropType,
    StyleProp,
    ImageStyle,
    ViewStyle,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { ImageProps } from 'react-native';

interface ProgressiveImageProps {
    source: ImageSourcePropType;
    style?: StyleProp<ImageStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
    fallbackSource?: ImageSourcePropType;
    showLoader?: boolean;
    loaderColor?: string;
    loaderSize?: 'small' | 'large';
    onLoad?: () => void;
    onError?: () => void;
}

/**
 * Progressive Image Component
 * Provides smooth loading experience with:
 * - Loading indicator
 * - Error fallback
 * - Fade-in animation when loaded
 * - Memory efficient loading
 */
const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
    source,
    style,
    containerStyle,
    resizeMode = 'cover',
    fallbackSource,
    showLoader = true,
    loaderColor = '#FF5C02',
    loaderSize = 'small',
    onLoad,
    onError,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [imageOpacity, setImageOpacity] = useState(0);

    useEffect(() => {
        // Reset state when source changes
        setIsLoading(true);
        setHasError(false);
        setImageOpacity(0);
    }, [source]);

    const handleLoadStart = () => {
        setIsLoading(true);
        setHasError(false);
    };

    const handleLoadEnd = () => {
        setIsLoading(false);
        // Fade in animation
        setImageOpacity(1);
        onLoad?.();
    };

    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
        onError?.();
    };

    // Determine which source to display
    const displaySource = hasError && fallbackSource ? fallbackSource : source;

    return (
        <View style={[{ position: 'relative' }, containerStyle]}>
            {/* Loading Indicator */}
            {isLoading && showLoader && (
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1,
                    }}
                >
                    <ActivityIndicator size={loaderSize} color={loaderColor} />
                </View>
            )}

            {/* Actual Image */}
            <Image
                source={displaySource}
                style={[
                    style,
                    {
                        opacity: imageOpacity,
                    },
                ]}
                resizeMode={resizeMode}
                onLoadStart={handleLoadStart}
                onLoadEnd={handleLoadEnd}
                onError={handleError}
                // Performance optimizations
                fadeDuration={Platform.OS === 'android' ? 0 : 300} // Disable fade on Android for better performance
            />
        </View>
    );
};

export default ProgressiveImage;
