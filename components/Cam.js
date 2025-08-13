import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { imageAPI } from '../api/API';
import ColorPic from './ColorPic';
import Svg, { Polygon, Image as SvgImage } from 'react-native-svg';

const Cam = ({showCamera=false}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const devices = useCameraDevices();
  const device = devices.back || devices[0];
  const camera = useRef(null);
  const [photoClicked, setPhotoClicked] = useState(true);
  const [photoPath, setPhotoPath] = useState('');
  const [resultImage, setResultImage] = useState('');
  const [colorImage, setColorImage] = useState(false)
  const [cameraOn, setCameraOn] = useState(showCamera)
  const [nailPolygons, setNailPolygons] = useState([]);
  const [selectedColor, setSelectedColor] = useState(null);
  
  // Only need original dimensions for viewBox
  const [originalImageDimensions, setOriginalImageDimensions] = useState({ width: 0, height: 0 });
      
  const colors = [
      { name: 'Red', color: '#FF0000' },
      { name: 'Pink', color: '#FF1493' },
      { name: 'Purple', color: '#800080' },
      { name: 'Blue', color: '#0000FF' },
      { name: 'Green', color: '#00FF00' },
      { name: 'Black', color: '#000000' },
      { name: 'White', color: '#FFFFFF' },
      { name: 'Gold', color: '#FFD700' }
  ];

  const applyColor = (color) => {
      console.log("applyColor:", color);
      setSelectedColor(color);
  };

  useEffect(() => {
    checkPermission();
  }, []);

  const takePicture = async () => {
    if(camera!== null){
      const photo = await camera.current.takePhoto()
      setPhotoPath("file:///"+photo.path)
      setPhotoClicked(false);
      console.log("PhotClicked", photoClicked);
      console.log("Photo taken", photo);
    }
  }

  const backToCamera = () => {
    setCameraOn(true);
    setPhotoClicked(true);
  }

  const imageToModel = async (imagePath) => {
    console.log("Image to model pressed", imagePath);
    
    const roboflowResponse = await imageAPI(imagePath);
    console.log("Roboflow response:", roboflowResponse);
    if(roboflowResponse && roboflowResponse.predictions) {
        const polygons = roboflowResponse.predictions.map(pred => pred.points);
        console.log("Nail polygons:", polygons);

        setNailPolygons(polygons);
        // Use Roboflow dimensions for viewBox
        setOriginalImageDimensions({
            width: roboflowResponse.image.width,
            height: roboflowResponse.image.height
        });
        setResultImage(imagePath);
        setColorImage(true);
        setCameraOn(false);
    }
  }

  async function checkPermission() {
    console.log("Check permission");
    
    try {
      const cameraPermission = await Camera.requestCameraPermission();
      const microphonePermission = await Camera.requestMicrophonePermission();
      
      console.log('Camera permission:', cameraPermission);
      console.log('Microphone permission:', microphonePermission);
      
      const hasRequiredPermissions = cameraPermission === 'authorized' || cameraPermission === 'granted';
      
      setHasPermission(hasRequiredPermissions);
      setIsLoading(false);
      
      console.log('Has permission:', hasRequiredPermissions);
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
      setIsLoading(false);
    }
  }

  // Show loading while checking permissions
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Show permission denied message
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Camera permission is required to use this app.</Text>
        <Text>Please grant camera access in your device settings.</Text>
        <TouchableOpacity style={{backgroundColor: 'red', padding: 10}} onPress={checkPermission}>
          <Text>Retry Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading if device is not available
  if (device == null) {
    return (
      <View style={styles.center}>
        <Text>No camera device found.</Text>
      </View>
    );
  }

  if( cameraOn ) {
    return (
      <View style={styles.container}>
      {
        photoClicked ?(
          <View style={styles.container}>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              ref={camera}  
              photo={true}
            />
            <TouchableOpacity style={styles.capButton} onPress={()=>takePicture()}>
              <Text>Capture</Text>
            </TouchableOpacity>
          </View>
        ):(
          <View style={styles.container}>
            <Image source={{uri : photoPath}} style={{height: '100%', width: '100%'}} resizeMode='contain'/>
            <TouchableOpacity style={styles.capButton} onPress={()=>backToCamera()}>
              <Text>Back to Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modelButton} onPress={()=>imageToModel(photoPath)}>
              <Text>Go for nail detection</Text>
            </TouchableOpacity>
          </View>
        )
      }
    </View>
    );
  }

  if( colorImage ) {
    return (
      <View style={styles.container}>
        <View style={styles.imageContainer}>
            <Image 
                source={{uri: resultImage}} 
                style={{ width: '100%', height: '100%'}}
                resizeMode='contain'
            />
            <Svg 
                height="100%" 
                width="100%" 
                viewBox={`0 0 ${originalImageDimensions.width} ${originalImageDimensions.height}`}
                style={{position: 'absolute'}}
            >
                {/* Use original coordinates directly - no scaling! */}
                {selectedColor && nailPolygons.map((points, index) => {
                    const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');
                    // console.log(`Nail ${index} original points:`, pointsString);
                    return(
                        <Polygon 
                            key={index}
                            points={pointsString}
                            fill={selectedColor}
                            fillOpacity="0.7"
                        />
                    )
                })}
            </Svg>
        </View>
          
        {/* Color selection buttons */}
        <View style={styles.colorContainer}>
            <Text style={styles.title}>Choose nail color:</Text>
            <View style={styles.colorRow}>
                {colors.slice(0, 4).map((item, index) => (
                    <TouchableOpacity 
                        key={index}
                        style={[styles.colorButton, {backgroundColor: item.color}]}
                        onPress={() => applyColor(item.color)}
                    >
                        <Text style={styles.colorText}>{item.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={styles.colorRow}>
                {colors.slice(4, 8).map((item, index) => (
                    <TouchableOpacity 
                        key={index}
                        style={[styles.colorButton, {backgroundColor: item.color}]}
                        onPress={() => applyColor(item.color)}
                    >
                        <Text style={styles.colorText}>{item.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <TouchableOpacity style={styles.capButton} onPress={()=>backToCamera()}>
            <Text>Back to Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  capButton: {
    height: 20,
    backgroundColor: 'red',
    bottom: 50,
    alignSelf: 'center',
    position: 'absolute',
  },
  modelButton: {
    height: 20,
    backgroundColor: 'green',
    bottom: 50,
    alignSelf: 'flex-end',
    position: 'absolute',
  },
  imageContainer: {
    flex: 1
  },
  colorContainer: {
    position: 'absolute',
    bottom: 0,
    padding: 10,
    height: 150,
    alignSelf: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  colorButton: {
    width: 70,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 5,
  },
  colorText: {
    fontSize: 12,
    fontWeight: 'bold',
    padding: 2,
  },
});

export default Cam;