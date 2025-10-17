import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import IntegratedColoringBookApp from './src/components/IntegratedColoringBookApp';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <IntegratedColoringBookApp />
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
