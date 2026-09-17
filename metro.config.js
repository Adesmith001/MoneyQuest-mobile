process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Appwrite 0.13 uses the legacy upload API. Keep one SDK-compatible native
// filesystem while routing only Appwrite's JS import to that supported API.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath.replace(/\\/g, '/');
  if (moduleName === 'expo-file-system' && origin.includes('/react-native-appwrite/')) {
    return context.resolveRequest(context, 'expo-file-system/legacy', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
