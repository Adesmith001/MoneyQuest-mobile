declare module 'react-native-version-check-expo' {
  interface NeedUpdateResult {
    isNeeded: boolean;
    storeUrl?: string;
    currentVersion?: string;
    latestVersion?: string;
  }

  interface VersionCheckModule {
    needUpdate(): Promise<NeedUpdateResult>;
    getCurrentVersion(): string;
  }

  const VersionCheck: VersionCheckModule;
  export default VersionCheck;
}
