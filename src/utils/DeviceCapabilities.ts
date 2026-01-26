import { Platform, Dimensions } from "react-native";
import * as Device from "expo-device";

export interface DeviceCapabilities {
  performanceTier: "high" | "medium" | "low";
  shouldReduceMotion: boolean;
  shouldReduceDecorations: boolean;
  shouldOptimizeImages: boolean;
  maxConcurrentImages: number;
  deviceInfo: {
    brand: string | null;
    modelName: string | null;
    totalMemory: number | null;
    osVersion: string;
    platform: string;
  };
}

/**
 * Detect device performance capabilities
 * Used to adjust app complexity based on device performance
 */
class DeviceCapabilitiesService {
  private capabilities: DeviceCapabilities | null = null;

  /**
   * Initialize and detect device capabilities
   * Call this once during app startup
   */
  async initialize(): Promise<DeviceCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    const { width, height } = Dimensions.get("window");
    const screenPixels = width * height;

    // Get device information
    const brand = Device.brand;
    const modelName = Device.modelName;
    const totalMemory = Device.totalMemory;
    const osVersion = Device.osVersion || "Unknown";

    // Determine performance tier based on multiple factors
    let performanceTier: "high" | "medium" | "low" = "medium";

    // Factor 1: Memory (if available)
    if (totalMemory) {
      if (totalMemory >= 4 * 1024 * 1024 * 1024) {
        // 4GB+ = high tier
        performanceTier = "high";
      } else if (totalMemory >= 2 * 1024 * 1024 * 1024) {
        // 2-4GB = medium tier
        performanceTier = "medium";
      } else {
        // <2GB = low tier
        performanceTier = "low";
      }
    }

    // Factor 2: Screen resolution (fallback if memory not available)
    if (!totalMemory) {
      if (screenPixels >= 1920 * 1080) {
        // Full HD+ = high tier
        performanceTier = "high";
      } else if (screenPixels >= 1280 * 720) {
        // HD = medium tier
        performanceTier = "medium";
      } else {
        // <HD = low tier
        performanceTier = "low";
      }
    }

    // Factor 3: Known low-performance devices (override)
    const lowEndModels = [
      "SM-J2", // Samsung J2 series
      "Redmi 4A",
      "Redmi 5A",
      "Nexus 5", // Older Nexus devices
      "Moto E",
      "Moto G4",
    ];

    if (modelName && lowEndModels.some((model) => modelName.includes(model))) {
      performanceTier = "low";
    }

    // Factor 4: Platform-specific adjustments
    if (Platform.OS === "android") {
      // Android devices tend to have more variability
      // Be more conservative on Android
      if (
        performanceTier === "high" &&
        (!totalMemory || totalMemory < 6 * 1024 * 1024 * 1024)
      ) {
        performanceTier = "medium";
      }
    }

    // Determine optimization flags based on performance tier
    const shouldReduceMotion = performanceTier === "low";
    const shouldReduceDecorations = performanceTier === "low";
    const shouldOptimizeImages = performanceTier !== "high";

    // Set max concurrent images based on tier
    let maxConcurrentImages = 10;
    if (performanceTier === "high") {
      maxConcurrentImages = 20;
    } else if (performanceTier === "low") {
      maxConcurrentImages = 5;
    }

    this.capabilities = {
      performanceTier,
      shouldReduceMotion,
      shouldReduceDecorations,
      shouldOptimizeImages,
      maxConcurrentImages,
      deviceInfo: {
        brand,
        modelName,
        totalMemory,
        osVersion,
        platform: Platform.OS,
      },
    };

    console.log("📱 Device Capabilities:", this.capabilities);

    return this.capabilities;
  }

  /**
   * Get cached device capabilities
   * Returns null if not initialized
   */
  getCapabilities(): DeviceCapabilities | null {
    return this.capabilities;
  }

  /**
   * Check if device is low-end
   */
  isLowEndDevice(): boolean {
    return this.capabilities?.performanceTier === "low";
  }

  /**
   * Check if device is high-end
   */
  isHighEndDevice(): boolean {
    return this.capabilities?.performanceTier === "high";
  }

  /**
   * Get recommended number of decorative elements
   * Low-end: reduce by 70%, Medium: reduce by 30%, High: 100%
   */
  getDecorationCount(baseCount: number): number {
    if (!this.capabilities) return baseCount;

    switch (this.capabilities.performanceTier) {
      case "low":
        return Math.ceil(baseCount * 0.3);
      case "medium":
        return Math.ceil(baseCount * 0.7);
      case "high":
      default:
        return baseCount;
    }
  }

  /**
   * Check if animations should be enabled
   */
  shouldEnableAnimations(): boolean {
    if (!this.capabilities) return true;
    return !this.capabilities.shouldReduceMotion;
  }
}

// Export singleton instance
export const deviceCapabilities = new DeviceCapabilitiesService();
export default deviceCapabilities;
