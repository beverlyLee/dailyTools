import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, Platform } from 'react-native';
import ARScreen from './src/screens/ARScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#000" />
      <ARScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
