const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sdk = require('expo/bundledNativeModules.json');
const expoPath = path.dirname(require.resolve('expo/package.json'));
const filesystemPath = require.resolve('expo-file-system/package.json', { paths: [expoPath] });
const filesystem = require(filesystemPath);
assert.equal(filesystem.version.split('.')[0], sdk['expo-file-system'].match(/\d+/)[0],
  'Expo must load the SDK-compatible native filesystem, not an older Appwrite dependency');

const configModule = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'metro.config.js'), 'utf8'), {
  module: configModule, __dirname: root, process: { env: {} },
  require: name => name === 'expo/metro-config'
    ? { getDefaultConfig: () => ({ resolver: {}, server: {} }) }
    : require(name),
});
const resolve = configModule.exports.resolver.resolveRequest;
assert.equal(typeof resolve, 'function', 'Appwrite needs its legacy filesystem API');
for (const platform of ['android', 'ios', 'web']) {
  for (const originModulePath of ['/node_modules/react-native-appwrite/dist/esm/sdk.js',
    'C:\\app\\node_modules\\react-native-appwrite\\dist\\cjs\\sdk.js']) {
    const context = { originModulePath, resolveRequest: (_, name) => name };
    assert.equal(resolve(context, 'expo-file-system', platform), 'expo-file-system/legacy');
    assert.equal(resolve(context, 'react-native', platform), 'react-native');
  }
  assert.equal(resolve({ originModulePath: '/node_modules/expo/src/Expo.ts',
    resolveRequest: (_, name) => name }, 'expo-file-system', platform), 'expo-file-system');
}
console.log('Native build compatibility checks passed');
