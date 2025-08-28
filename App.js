import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Cam from './components/Cam';

const App = () => {
  // const [hasPermission, setHasPermission] = useState(false);
  // const [isLoading, setIsLoading] = useState(true);
  // const devices = useCameraDevices();
  // const device = devices.back || devices[0];
  const [showCamera, setShowCamera] = useState(false);
  
  // console.log("device", device);
  
  const showCam = () => {
    setShowCamera(true);
    console.log("Show Camera pressed", showCamera);
  }
  
  return (
    <GestureHandlerRootView style={styles.container}>
      {showCamera ? (
        <Cam showCamera={showCamera}/>
      ) : (
        <View style={styles.center}>
          <TouchableOpacity style={{backgroundColor: 'blue', padding: 15, borderRadius: 8}} onPress={showCam}>
            <Text style={{color: 'white', fontWeight: 'bold'}}>Show Camera</Text>
          </TouchableOpacity>
        </View>
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  capButton: {
    width: 50,
    height: 20,
    backgroundColor: 'red',
    bottom: 50,
    alignSelf: 'center',
    position: 'absolute',
    padding: 10,
  }
});

export default App;