# Common Workflows

This guide provides step-by-step instructions for common development tasks.

## Adding a New Screen

### 1. Create the Screen File

```bash
# In src/screens/<category>/
# Example: src/screens/main/NewFeatureScreen.tsx
```

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList, 'NewFeature'>;

const NewFeatureScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <Text>New Feature Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NewFeatureScreen;
```

### 2. Add to Navigation Types

```typescript
// src/navigation/AppNavigator.tsx
export type RootStackParamList = {
  // ... existing screens
  NewFeature: {
    param1?: string;
    param2?: number;
  };
};
```

### 3. Register in Navigator

```typescript
// src/navigation/AppNavigator.tsx or MainTabNavigator.tsx
<Stack.Screen 
  name="NewFeature" 
  component={NewFeatureScreen}
  options={{
    headerShown: true,
    title: 'New Feature',
  }}
/>
```

### 4. Navigate to Screen

```typescript
navigation.navigate('NewFeature', {
  param1: 'value',
  param2: 123,
});
```

## Adding a New Component

### 1. Create Component File

```typescript
// src/components/MyComponent.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface MyComponentProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

const MyComponent: React.FC<MyComponentProps> = ({
  title,
  onPress,
  variant = 'primary',
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, styles[variant]]}
      onPress={onPress}
    >
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#FF6B35',
  },
  secondary: {
    backgroundColor: '#6C757D',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default MyComponent;
```

### 2. Use Component

```typescript
import MyComponent from '../components/MyComponent';

const Screen = () => (
  <MyComponent
    title="Click Me"
    onPress={() => console.log('Clicked')}
    variant="primary"
  />
);
```

## Adding a New Service Method

### 1. Add Method to Service

```typescript
// src/services/myService.ts
class MyService {
  async newMethod(param: string): Promise<Result> {
    try {
      const response = await fetch(`${API_URL}/endpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ param }),
      });
      
      if (!response.ok) {
        throw new Error('Request failed');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Service method error:', error);
      throw new Error(error.message || 'An error occurred');
    }
  }
}

export default new MyService();
```

### 2. Use in Component

```typescript
import myService from '../services/myService';

const Component = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await myService.newMethod('param');
      setData(result);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) return <LoadingScreen />;

  return <View>{/* Render data */}</View>;
};
```

## Adding Redux State

### 1. Create New Slice

```typescript
// src/store/slices/featureSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface FeatureState {
  data: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FeatureState = {
  data: [],
  isLoading: false,
  error: null,
};

export const fetchFeatureData = createAsyncThunk(
  'feature/fetchData',
  async (params: any, { rejectWithValue }) => {
    try {
      const data = await featureService.getData(params);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const featureSlice = createSlice({
  name: 'feature',
  initialState,
  reducers: {
    clearFeatureData: (state) => {
      state.data = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeatureData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFeatureData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
      })
      .addCase(fetchFeatureData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearFeatureData } = featureSlice.actions;
export default featureSlice.reducer;
```

### 2. Add to Store

```typescript
// src/store/index.ts
import featureReducer from './slices/featureSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  game: gameReducer,
  feature: featureReducer, // Add new reducer
});
```

### 3. Use in Component

```typescript
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { fetchFeatureData } from '../store/slices/featureSlice';

const Component = () => {
  const dispatch = useDispatch();
  const { data, isLoading, error } = useSelector(
    (state: RootState) => state.feature
  );

  useEffect(() => {
    dispatch(fetchFeatureData({ param: 'value' }));
  }, [dispatch]);

  return <View>{/* Use data */}</View>;
};
```

## Adding Environment Variables

### 1. Add to .env File

```env
NEW_API_KEY=your_api_key_here
NEW_API_URL=https://api.example.com
```

### 2. Add to env.ts

```typescript
// env.ts
declare module '@env' {
  export const NEW_API_KEY: string;
  export const NEW_API_URL: string;
}
```

### 3. Add to Configuration

```typescript
// src/config/appwrite.ts or new config file
import { NEW_API_KEY, NEW_API_URL } from '@env';

export const NEW_CONFIG = {
  API_KEY: NEW_API_KEY,
  API_URL: NEW_API_URL,
};
```

### 4. Use in Code

```typescript
import { NEW_CONFIG } from '../config';

const apiKey = NEW_CONFIG.API_KEY;
```

## Implementing New Question Type

### 1. Define Type

```typescript
// src/types/index.ts
export interface NewQuestionType {
  question_type: 'new_type';
  question: string;
  // ... specific fields
  correct_answer: any;
  explanation: string;
  difficulty: string;
}

// Add to union type
export type AnyQuestion = 
  | GeneratedQuestion
  | ScenarioQuestion
  | MatchingQuestion
  | FillInGapQuestion
  | NewQuestionType;
```

### 2. Create Component

```typescript
// src/components/questions/NewQuestionComponent.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NewQuestionType } from '../../types';

interface Props {
  question: NewQuestionType;
  onAnswer: (answer: any) => void;
  showResult?: boolean;
}

const NewQuestionComponent: React.FC<Props> = ({
  question,
  onAnswer,
  showResult,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question.question}</Text>
      {/* Render question-specific UI */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  question: {
    fontSize: 18,
    marginBottom: 20,
  },
});

export default NewQuestionComponent;
```

### 3. Add to Question Screen

```typescript
// src/screens/game/QuestionScreen.tsx
const renderQuestion = () => {
  switch (currentQuestion.question_type) {
    case 'new_type':
      return (
        <NewQuestionComponent
          question={currentQuestion}
          onAnswer={handleAnswer}
        />
      );
    // ... other cases
  }
};
```

### 4. Add Backend Support

Update backend to generate new question type.

## Debugging Tips

### Console Logging

```typescript
// Detailed logging
console.log('User data:', JSON.stringify(user, null, 2));

// Error logging
console.error('API error:', error);

// Component lifecycle
useEffect(() => {
  console.log('Component mounted');
  return () => console.log('Component unmounted');
}, []);
```

### React Native Debugger

1. Open React Native Debugger
2. Enable "Debug JS Remotely" in app
3. Use Chrome DevTools features

### Redux DevTools

```typescript
// Check state
console.log('Redux State:', store.getState());

// Check specific slice
console.log('Auth State:', store.getState().auth);
```

### Network Debugging

```typescript
// Log API calls
const fetchApi = async (endpoint: string) => {
  console.log('API Request:', endpoint);
  const response = await fetch(endpoint);
  console.log('API Response:', response.status);
  return response.json();
};
```

## Testing Workflows

### Unit Test Example

```typescript
// MyComponent.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <MyComponent title="Test" onPress={() => {}} />
    );
    expect(getByText('Test')).toBeTruthy();
  });

  it('calls onPress when clicked', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <MyComponent title="Test" onPress={onPress} />
    );
    
    fireEvent.press(getByText('Test'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### Integration Test

```typescript
// Screen.test.tsx
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { store } from '../store';
import MyScreen from '../screens/MyScreen';

describe('MyScreen', () => {
  it('loads and displays data', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <MyScreen />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Expected Content')).toBeTruthy();
    });
  });
});
```

## Building & Deployment

### Development Build

```bash
# Start Metro bundler
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android
```

### Production Build

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# Both
eas build --platform all
```

### Submit to Stores

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

---

**Previous**: [← User Progress & Lives](./07-progress-lives.md)  
**Next**: [Troubleshooting →](./10-troubleshooting.md)
