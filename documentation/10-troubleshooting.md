# Troubleshooting

Common issues and their solutions in MoneyQuest development.

## Installation & Setup Issues

### Issue: `pnpm install` fails

**Symptoms**: Dependency installation errors

**Solutions**:
```bash
# Clear pnpm cache
pnpm store prune

# Delete node_modules and lock file
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install
```

### Issue: Environment variables not loading

**Symptoms**: `undefined` when accessing `@env` imports

**Solutions**:
1. Verify `.env` file exists in root
2. Check `babel.config.js` has react-native-dotenv plugin
3. Restart Metro bundler completely:
```bash
# Kill existing Metro
pkill -f "react-native" 

# Clear cache and restart
pnpm start --reset-cache
```

### Issue: TypeScript errors after adding types

**Symptoms**: Type errors in IDE

**Solutions**:
```bash
# Restart TypeScript server in VSCode
# Command Palette (Cmd+Shift+P) > TypeScript: Restart TS Server

# Clear TypeScript cache
rm -rf node_modules/.cache
```

## Runtime Errors

### Issue: "Network request failed"

**Symptoms**: API calls failing

**Checklist**:
- [ ] Check backend is running
- [ ] Verify API URL in environment variables
- [ ] Check device/simulator has internet
- [ ] For iOS simulator, check localhost works
- [ ] For Android emulator, use `10.0.2.2` instead of `localhost`

**Solution**:
```typescript
// For Android development
const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:8000'
  : 'http://localhost:8000';
```

### Issue: "Unable to connect to Appwrite"

**Symptoms**: Appwrite authentication/database errors

**Checklist**:
- [ ] Appwrite endpoint is correct
- [ ] Project ID is correct
- [ ] Collections exist with correct IDs
- [ ] API keys are valid
- [ ] Network permissions in app.json

**Solution**:
```typescript
// Verify Appwrite config
console.log('Appwrite Config:', {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  databaseId: APPWRITE_DATABASE_ID,
});
```

### Issue: Redux state not persisting

**Symptoms**: State resets on app reload

**Checklist**:
- [ ] Slice is in persistConfig whitelist
- [ ] AsyncStorage permissions granted
- [ ] No errors in persistence rehydration

**Solution**:
```typescript
// Check persistence config
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'game', 'streak'], // Add missing slices
};

// Debug persistence
persistor.getStoredState(persistConfig).then(state => {
  console.log('Persisted state:', state);
});
```

### Issue: "Invariant Violation: requireNativeComponent"

**Symptoms**: Native component not found

**Solutions**:
```bash
# iOS: Reinstall pods
cd ios && pod install && cd ..

# Android: Clean and rebuild
cd android && ./gradlew clean && cd ..

# Restart Metro with cache clear
pnpm start --reset-cache
```

## Navigation Issues

### Issue: Screen not found / navigation error

**Symptoms**: "The action 'NAVIGATE' with payload {name: 'ScreenName'} was not handled"

**Checklist**:
- [ ] Screen is registered in navigator
- [ ] Screen name matches exactly (case-sensitive)
- [ ] Screen is in correct navigator (Stack vs Tab)
- [ ] Navigator is mounted

**Solution**:
```typescript
// Verify screen registration
<Stack.Screen name="ScreenName" component={ScreenComponent} />

// Use correct navigation
navigation.navigate('ScreenName'); // Must match exactly
```

### Issue: Can't go back from screen

**Symptoms**: Back button doesn't work

**Solutions**:
```typescript
// Check if using replace instead of navigate
navigation.navigate('Screen'); // Can go back
// vs
navigation.replace('Screen'); // Can't go back

// Ensure gestureEnabled is not false
<Stack.Screen 
  name="Screen" 
  component={Component}
  options={{ gestureEnabled: true }}
/>
```

## UI & Styling Issues

### Issue: Component not responsive

**Symptoms**: Layout breaks on different screen sizes

**Solutions**:
```typescript
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Use percentages
const styles = StyleSheet.create({
  container: {
    width: width * 0.9,
    height: height * 0.5,
  },
});

// Use with minimum values
const responsiveSize = Math.max(width * 0.05, 16);
```

### Issue: SafeArea not working

**Symptoms**: Content hidden behind notch/status bar

**Solutions**:
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

// Wrap top-level component
const Screen = () => (
  <SafeAreaView style={{ flex: 1 }}>
    {/* Content */}
  </SafeAreaView>
);

// Check SafeAreaProvider wraps app
<SafeAreaProvider>
  <App />
</SafeAreaProvider>
```

### Issue: Modal not displaying

**Symptoms**: Modal component not visible

**Checklist**:
- [ ] `visible` prop is true
- [ ] Modal not hidden behind other elements
- [ ] Modal has proper z-index
- [ ] transparent prop set correctly

**Solution**:
```typescript
<Modal
  visible={isVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={onClose}
>
  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
    {/* Modal content */}
  </View>
</Modal>
```

## Data & State Issues

### Issue: State not updating

**Symptoms**: Component doesn't re-render after state change

**Checklist**:
- [ ] Using setState function
- [ ] Not mutating state directly
- [ ] Dependencies array correct in useEffect
- [ ] Selector returns new reference

**Solutions**:
```typescript
// ❌ Wrong - mutating state
state.data.push(newItem);

// ✅ Correct - new array
setState([...state.data, newItem]);

// ❌ Wrong - same reference
const newState = state;
newState.value = 'new';
setState(newState);

// ✅ Correct - new object
setState({ ...state, value: 'new' });
```

### Issue: "Too many re-renders"

**Symptoms**: React error about render limit

**Common Causes**:
```typescript
// ❌ Calling function instead of passing it
<Button onPress={handlePress()} />

// ✅ Correct
<Button onPress={handlePress} />
// or
<Button onPress={() => handlePress(param)} />

// ❌ Setting state in render
const Component = () => {
  setState(value); // Causes infinite loop
  return <View />;
};

// ✅ Correct - use useEffect
useEffect(() => {
  setState(value);
}, []);
```

### Issue: Stale closure in useEffect

**Symptoms**: Old values used in effect

**Solution**:
```typescript
// Add dependencies
useEffect(() => {
  // Uses latest value
  doSomething(value);
}, [value]); // Add dependency

// Or use ref for latest value
const latestValue = useRef(value);
latestValue.current = value;

useEffect(() => {
  // Always has latest value
  doSomething(latestValue.current);
}, []);
```

## Performance Issues

### Issue: Slow list rendering

**Symptoms**: FlatList/ScrollView laggy

**Solutions**:
```typescript
// Use FlatList with optimization
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Item data={item} />}
  // Performance props
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={10}
  removeClippedSubviews={true}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>

// Memoize items
const Item = React.memo(({ data }) => (
  <View>{/* Render item */}</View>
));
```

### Issue: Memory leaks

**Symptoms**: App slows down over time, crashes

**Common Causes & Solutions**:
```typescript
// Clean up timers
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer); // Cleanup
}, []);

// Clean up listeners
useEffect(() => {
  const subscription = eventEmitter.addListener('event', handler);
  return () => subscription.remove(); // Cleanup
}, []);

// Clean up async operations
useEffect(() => {
  let isMounted = true;
  
  fetchData().then(data => {
    if (isMounted) {
      setState(data);
    }
  });
  
  return () => {
    isMounted = false;
  };
}, []);
```

## Build Issues

### Issue: iOS build fails

**Symptoms**: Xcode build errors

**Solutions**:
```bash
# Clean build folder
cd ios
xcodebuild clean
rm -rf ~/Library/Developer/Xcode/DerivedData

# Reinstall pods
pod deintegrate
pod install

# Update CocoaPods
sudo gem install cocoapods

# Build from Xcode for better error messages
open ios/MoneyQuest.xcworkspace
```

### Issue: Android build fails

**Symptoms**: Gradle build errors

**Solutions**:
```bash
# Clean gradle cache
cd android
./gradlew clean
./gradlew cleanBuildCache

# Delete .gradle folder
rm -rf ~/.gradle/caches/

# Check Java version (needs Java 11)
java -version

# Rebuild
./gradlew assembleDebug
```

### Issue: "Unable to load script"

**Symptoms**: Red screen on app launch

**Solutions**:
```bash
# Ensure Metro bundler is running
pnpm start

# Reset cache
pnpm start --reset-cache

# For iOS, ensure bundle is built
cd ios && xcodebuild -workspace MoneyQuest.xcworkspace -scheme MoneyQuest

# For Android, check dev settings
# Enable "JS Dev Mode" in app
```

## Testing Issues

### Issue: Tests failing unexpectedly

**Symptoms**: Previously passing tests fail

**Solutions**:
```bash
# Clear test cache
jest --clearCache

# Run with verbose output
jest --verbose

# Run specific test
jest path/to/test.tsx

# Update snapshots if needed
jest -u
```

## Debugging Techniques

### Enable Debug Mode

```typescript
// In App.tsx
if (__DEV__) {
  console.log('Development mode');
}

// Enable Redux logging
const loggerMiddleware = (store) => (next) => (action) => {
  console.log('Action:', action.type);
  return next(action);
};
```

### React Native Debugger

1. Install: `brew install react-native-debugger`
2. Open: `open "rndebugger://set-debugger-loc?host=localhost&port=8081"`
3. In app: Shake device > "Debug"

### Reactotron

Advanced debugging tool:

```bash
# Install
pnpm add -D reactotron-react-native

# Configure in App.tsx
if (__DEV__) {
  import('./ReactotronConfig').then(() => console.log('Reactotron Configured'));
}
```

### Network Inspection

```typescript
// Log all fetch calls
const originalFetch = global.fetch;
global.fetch = (...args) => {
  console.log('Fetch:', args[0]);
  return originalFetch(...args);
};
```

## Getting More Help

### Useful Resources

- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **Expo Docs**: https://docs.expo.dev
- **Appwrite Docs**: https://appwrite.io/docs
- **Redux Toolkit**: https://redux-toolkit.js.org

### Community Support

- React Native Discord
- Stack Overflow (tag: react-native)
- Expo Forums
- GitHub Issues for specific libraries

### Project-Specific Help

- Check existing closed issues in repository
- Review recent commits for similar changes
- Ask team members for context

---

**Previous**: [← Common Workflows](./09-common-workflows.md)
