import { Buffer } from 'buffer';
global.Buffer = Buffer;

import { LogBox, Platform } from 'react-native';

LogBox.ignoreLogs([
  'props.pointerEvents is deprecated. Use style.pointerEvents',
]);

if (Platform.OS === 'web') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('props.pointerEvents is deprecated')) {
      return;
    }
    originalWarn(...args);
  };
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
