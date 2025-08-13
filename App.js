import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
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

  // useEffect(() => {
  //   checkPermission();
  // }, []);


  // async function checkPermission() {
  //   console.log("Check permission");
    
  //   try {
  //     const cameraPermission = await Camera.requestCameraPermission();
  //     const microphonePermission = await Camera.requestMicrophonePermission();
      
  //     console.log('Camera permission:', cameraPermission);
  //     console.log('Microphone permission:', microphonePermission);
      
  //     // Check if we have the necessary permissions
  //     const hasRequiredPermissions = cameraPermission === 'authorized' || cameraPermission === 'granted';
      
  //     setHasPermission(hasRequiredPermissions);
  //     setIsLoading(false);
      
  //     console.log('Has permission:', hasRequiredPermissions);
  //   } catch (error) {
  //     console.error('Permission check failed:', error);
  //     setHasPermission(false);
  //     setIsLoading(false);
  //   }
  // }

  // Show loading while checking permissions
  // if (isLoading) {
  //   console.log("print if isLoading");
    
  //   return (
  //     <View style={styles.center}>
  //       <ActivityIndicator size="large" color="#0000ff" />
  //     </View>
  //   );
  // }

  // Show permission denied message
  // if (!hasPermission) {
  //   console.log("Print hasPermission");
    
  //   return (
  //     <View style={styles.center}>
  //       <Text>Camera permission is required to use this app.</Text>
  //       <Text>Please grant camera access in your device settings.</Text>
  //     </View>
  //   );
  // }

  // Show loading if device is not available
  // if (device == null) {
  //   console.log("Print device null");
    
  //   console.log('Device:', device);
  //   console.log('Has permission:', hasPermission);
    
  //   return (
  //     <View style={styles.center}>
  //       <Text>No camera device found.</Text>
  //     </View>
  //   );
  // }

  // if( showCamera ) {

  //   return (
  //   <View style={styles.container}>
  //     <Camera
  //       style={StyleSheet.absoluteFill}
  //       device={device}
  //       isActive={true}
  //     />
  //     <TouchableOpacity style={styles.capButton}>
  //       <Text>
  //         Capture
  //       </Text>
  //     </TouchableOpacity>
  //   </View>
  // );

  // }

  if(showCamera) {
    return <Cam showCamera={showCamera}/>;
  }

  return(
    <View style={styles.center}>
      <TouchableOpacity style={{backgroundColor: 'blue'}} onPress={showCam}>
        <Text>Show Camera</Text>
      </TouchableOpacity>
    </View>
  )

  
};

const styles = StyleSheet.create({
  container: { 

    flex: 1 ,
    
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