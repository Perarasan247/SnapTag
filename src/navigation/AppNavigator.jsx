import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import InspectionHubScreen from '../screens/InspectionHubScreen';
import CameraScreen from '../screens/CameraScreen';
import TagScreen from '../screens/TagScreen';
import LibraryScreen from '../screens/LibraryScreen';
import MeasureScreen from '../screens/MeasureScreen';
import TextNoteScreen from '../screens/TextNoteScreen';
import MeasurementEntryScreen from '../screens/MeasurementEntryScreen';
import ChecklistScreen from '../screens/ChecklistScreen';
import ChecklistFormScreen from '../screens/ChecklistFormScreen';
import SiteSetupScreen from '../screens/SiteSetupScreen';
import TrashScreen from '../screens/TrashScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="InspectionHub" component={InspectionHubScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="Tag" component={TagScreen} />
      <Stack.Screen name="Library" component={LibraryScreen} />
      <Stack.Screen name="Measure" component={MeasureScreen} />
      <Stack.Screen name="TextNote" component={TextNoteScreen} />
      <Stack.Screen name="MeasurementEntry" component={MeasurementEntryScreen} />
      <Stack.Screen name="Checklist" component={ChecklistScreen} />
      <Stack.Screen name="ChecklistForm" component={ChecklistFormScreen} />
      <Stack.Screen name="SiteSetup" component={SiteSetupScreen} />
      <Stack.Screen name="Trash" component={TrashScreen} />
    </Stack.Navigator>
  );
}
