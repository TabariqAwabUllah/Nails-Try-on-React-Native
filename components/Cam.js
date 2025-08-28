import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { imageAPI, imageDesignAPI } from '../api/API';
import Svg, { Defs, Polygon, ClipPath } from 'react-native-svg';
import DragAndDrop from './DragAndDrop';

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
  const [designPolygons, setDesignPolygons] = useState([]);
  const [processedDesigns, setProcessedDesigns] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#FF1493');
  const [designMode, setDesignMode] = useState(false);
  // const designNailImage = 'https://i.pinimg.com/736x/dc/32/bd/dc32bdb85c1a984153fcc74cba0a55b8.jpg'
  // const designNailImage = 'https://i.pinimg.com/736x/ab/f7/af/abf7af5b23a4521a9793bd1dd34a6d91.jpg'
  const designNailImage = 'https://i.pinimg.com/1200x/71/48/40/714840b90665d14cc4f37ff0ae8e69a5.jpg'
  // const designNailImage = 'https://i.pinimg.com/736x/10/8f/6c/108f6c6d1c3ea75258e97a63bfd0b278.jpg'
  // const designNailImage = 'https://i.pinimg.com/1200x/e7/c6/d6/e7c6d6ff718998359ac6a9f9cad32aff.jpg'
  // const designNailImage = 'https://i.pinimg.com/736x/f7/45/67/f74567359b00fc84b01208066f3aaa42.jpg'
  // const designNailImage = 'https://i.pinimg.com/1200x/f6/79/ab/f679abfe839a12ee56a3ce9e01a38a77.jpg'

  const [originalImageDimensions, setOriginalImageDimensions] = useState({ width: 0, height: 0 });
  const [designImageDimensions, setDesignImageDimensions] = useState({ width: 0, height: 0 });
  const [nailTransforms, setNailTransforms] = useState({});
      
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
      setDesignMode(false);
      setProcessedDesigns([]);
  };

  const handleNailTransform = (index, transforms) => {
      setNailTransforms(prev => ({
          ...prev,
          [index]: transforms
      }));
      console.log(`Nail ${index} transformed:`, transforms);
  };


  // **SAFE AND SIMPLE GEOMETRY FUNCTIONS**

  // Simple bounding box calculation
  const getSimpleBounds = (points) => {
      try {
          if (!points || points.length === 0) return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
          
          const xs = points.map(p => p?.x || 0);
          const ys = points.map(p => p?.y || 0);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);
          
          return {
              minX,
              minY,
              maxX,
              maxY,
              width: maxX - minX || 100,
              height: maxY - minY || 100
          };
      } catch (error) {
          console.log("Error in getSimpleBounds:", error);
          return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
      }
  };

  // Simple centroid calculation
  const getSimpleCentroid = (points) => {
      try {
          if (!points || points.length === 0) return { x: 50, y: 50 };
          
          const sumX = points.reduce((sum, p) => sum + (p?.x || 0), 0);
          const sumY = points.reduce((sum, p) => sum + (p?.y || 0), 0);
          
          return {
              x: sumX / points.length || 50,
              y: sumY / points.length || 50
          };
      } catch (error) {
          console.log("Error in getSimpleCentroid:", error);
          return { x: 50, y: 50 };
      }
  };

  // Calculate nail orientation/direction based on polygon shape, it finds the tip of nail
  const calculateNailDirection = (points) => {
      try {
          if (!points || points.length < 3) return 0;
          
          // Find the primary axis of the nail by analyzing the polygon
          const bounds = getSimpleBounds(points);
          const centroid = getSimpleCentroid(points);
          
          // Find the farthest point from centroid (nail tip)
          let maxDist = 0;
          let tipPoint = points[0];
          
          points.forEach(point => {
              const dist = Math.sqrt(
                  Math.pow(point.x - centroid.x, 2) + 
                  Math.pow(point.y - centroid.y, 2)
              );
              if (dist > maxDist) {
                  maxDist = dist;
                  tipPoint = point;
              }
          });
          
          // Calculate angle from centroid to tip (nail direction)
          const angle = Math.atan2(tipPoint.y - centroid.y, tipPoint.x - centroid.x);
          
          // Convert to degrees for easier debugging
          const degrees = (angle * 180 / Math.PI + 360) % 360;
          
          return angle; // Return in radians for calculations
      } catch (error) {
          console.log("Error calculating nail direction:", error);
          return 0;
      }
  };

  // Super simple nail analysis with direction
  const simpleNailAnalysis = (points) => {
      try {
          const bounds = getSimpleBounds(points);
          const centroid = getSimpleCentroid(points);
          const aspectRatio = bounds.height / (bounds.width || 1);
          const direction = calculateNailDirection(points);
          const directionDegrees = (direction * 180 / Math.PI + 360) % 360;
          
          return {
              bounds,
              centroid,
              aspectRatio,
              area: bounds.width * bounds.height,
              nailType: aspectRatio > 1.5 ? 'long' : 'short',
              direction: direction, // in radians
              directionDegrees: directionDegrees // for debugging
          };
      } catch (error) {
          console.log("Error in simpleNailAnalysis:", error);
          return {
              bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 },
              centroid: { x: 50, y: 50 },
              aspectRatio: 1,
              area: 10000,
              nailType: 'round',
              direction: 0,
              directionDegrees: 0
          };
      }
  };

  // Super simple matching - just 1:1 order
  const simpleNailMatching = (designNails, targetNails) => {
      try {
          console.log("Simple matching:", designNails?.length, "design ->", targetNails?.length, "target");
          
          if (!designNails || !targetNails) return [];
          
          const matches = [];
          const maxMatches = Math.min(designNails.length, targetNails.length);
          
          for (let i = 0; i < maxMatches; i++) {
              const designAnalysis = simpleNailAnalysis(designNails[i]);
              const targetAnalysis = simpleNailAnalysis(targetNails[i]);
              
              matches.push({
                  designIndex: i,
                  targetIndex: i,
                  designNail: designNails[i],
                  targetNail: targetNails[i],
                  designAnalysis,
                  targetAnalysis,
                  isExtended: false,
                  matchScore: 0.5,
                  patternId: `design-nail-${i}`,
                  clipId: `clip-nail-${i}`
              });
          }
          
          console.log("Created matches:", matches.length);
          return matches;
      } catch (error) {
          console.log("Error in simpleNailMatching:", error);
          return [];
      }
  };

  // Detect nail orientation and direction
  const detectNailOrientation = (nailPolygon) => {
      try {
          if (!nailPolygon || nailPolygon.length < 3) return { angle: 0, direction: 'unknown' };
          
          const bounds = getSimpleBounds(nailPolygon);
          const centroid = getSimpleCentroid(nailPolygon);
          
          // Find the longest axis of the nail
          let maxDistance = 0;
          let longestPoint = nailPolygon[0];
          
          for (const point of nailPolygon) {
              const distance = Math.sqrt(Math.pow(point.x - centroid.x, 2) + Math.pow(point.y - centroid.y, 2));
              if (distance > maxDistance) {
                  maxDistance = distance;
                  longestPoint = point;
              }
          }
          
          // Calculate angle from centroid to longest point
          const angle = Math.atan2(longestPoint.y - centroid.y, longestPoint.x - centroid.x);
          const degrees = (angle * 180 / Math.PI + 360) % 360;
          
          // Determine direction based on angle
          let direction = 'unknown';
          if (degrees >= 315 || degrees < 45) direction = 'right';
          else if (degrees >= 45 && degrees < 135) direction = 'down';
          else if (degrees >= 135 && degrees < 225) direction = 'left';
          else if (degrees >= 225 && degrees < 315) direction = 'up';
          
          console.log(`Nail orientation: ${degrees.toFixed(1)}° (${direction})`);
          
          return { angle, direction, degrees };
      } catch (error) {
          console.log("Error detecting nail orientation:", error);
          return { angle: 0, direction: 'unknown', degrees: 0 };
      }
  };

  // Rotate point around center by given angle
  const rotatePoint = (point, center, angle) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      
      return {
          x: center.x + (dx * cos - dy * sin),
          y: center.y + (dx * sin + dy * cos)
      };
  };

  // Transform design nail polygons to match captured nail polygon shapes with complete coverage
  const transformDesignNailToTarget = (designNail, targetNail) => {
      try {
          if (!designNail || !targetNail || designNail.length === 0 || targetNail.length === 0) {
              console.log("Invalid polygons for transformation");
              return designNail;
          }

          // Detect orientations of both nails
          const designOrientation = detectNailOrientation(designNail);
          const targetOrientation = detectNailOrientation(targetNail);
          
          console.log(`Design nail: ${designOrientation.direction} (${designOrientation.degrees.toFixed(1)}°)`);
          console.log(`Target nail: ${targetOrientation.direction} (${targetOrientation.degrees.toFixed(1)}°)`);

          // Get bounding boxes and centroids
          const designBounds = getSimpleBounds(designNail);
          const targetBounds = getSimpleBounds(targetNail);
          const designCentroid = getSimpleCentroid(designNail);
          const targetCentroid = getSimpleCentroid(targetNail);

          // DIRECT MAPPING: Stretch designed nail to exactly match captured nail dimensions
          const scaleX = targetBounds.width / designBounds.width;
          const scaleY = targetBounds.height / designBounds.height;
          
          // Use the LARGER scale to ensure complete coverage
          const scale = Math.max(scaleX, scaleY);

          console.log(`Direct mapping: scaleX=${scaleX.toFixed(2)} scaleY=${scaleY.toFixed(2)} final=${scale.toFixed(2)}`);
          console.log(`  Design: ${designBounds.width.toFixed(1)}x${designBounds.height.toFixed(1)} → Target: ${targetBounds.width.toFixed(1)}x${targetBounds.height.toFixed(1)}`);

          // Calculate rotation needed to align orientations
          const rotationAngle = targetOrientation.angle - designOrientation.angle;

          // Transform each point: scale -> rotate -> translate
          const transformedPolygon = designNail.map(point => {
              // 1. Scale the point relative to design centroid
              const scaledX = (point.x - designCentroid.x) * scale;
              const scaledY = (point.y - designCentroid.y) * scale;

              // 2. Rotate around origin to align orientation
              const rotatedPoint = rotatePoint({ x: scaledX, y: scaledY }, { x: 0, y: 0 }, rotationAngle);

              // 3. Translate to target centroid
              return {
                  x: rotatedPoint.x + targetCentroid.x,
                  y: rotatedPoint.y + targetCentroid.y
              };
          });

          return transformedPolygon;
      } catch (error) {
          console.log("Error in transformDesignNailToTarget:", error);
          return designNail;
      }
  };

  // Simple direct design transfer - apply individual nail designs to corresponding nails with orientation alignment
  const simpleDesignTransfer = (designNails, targetNails, designImagePath) => {
      try {
          console.log("Design nails:", designNails.length, "Target nails:", targetNails.length, "in SimpleDesignTransfer");
          
          const matches = [];
          const maxMatches = Math.min(designNails.length, targetNails.length);

          console.log('maxMatches',maxMatches)
          
          for (let i = 0; i < maxMatches; i++) {
              // Analyze both nails for orientation
              const designAnalysis = simpleNailAnalysis(designNails[i]);
              const targetAnalysis = simpleNailAnalysis(targetNails[i]);
              
              console.log(`Nail ${i} Analysis:`);
              console.log(`  Design: ${designAnalysis.directionDegrees.toFixed(1)}° (${designAnalysis.nailType})`);
              console.log(`  Target: ${targetAnalysis.directionDegrees.toFixed(1)}° (${targetAnalysis.nailType})`);
              
              // Transform design nail polygon to match target nail with proper orientation
              const transformedDesignPolygon = transformDesignNailToTarget(designNails[i], targetNails[i]);
              
              // Get bounds for texture mapping
              const designBounds = getSimpleBounds(designNails[i]);
              const targetBounds = getSimpleBounds(targetNails[i]);
              const transformedBounds = getSimpleBounds(transformedDesignPolygon);
              
              // Calculate rotation angle for the texture image
              const rotationAngle = targetAnalysis.direction - designAnalysis.direction;
              const rotationDegrees = (rotationAngle * 180 / Math.PI);
              
              console.log(`  Transformation: scale=${Math.max(targetBounds.width/designBounds.width, targetBounds.height/designBounds.height).toFixed(2)}, rotation=${rotationDegrees.toFixed(1)}°`);
              
              matches.push({
                  designIndex: i,
                  targetIndex: i,
                  designNail: designNails[i],
                  targetNail: targetNails[i],
                  transformedDesignPolygon: transformedDesignPolygon,
                  designBounds: designBounds,
                  targetBounds: targetBounds,
                  transformedBounds: transformedBounds,
                  designAnalysis: designAnalysis,
                  targetAnalysis: targetAnalysis,
                  rotationAngle: rotationAngle,
                  rotationDegrees: rotationDegrees,
                  patternId: `design-nail-${i}`,
                  clipId: `clip-nail-${i}`,
                  sourceImage: designImagePath
              });
          }
          
          console.log("Created orientation-aligned matches:", matches.length);
          return matches;
      } catch (error) {
          console.log("Error in simpleDesignTransfer:", error);
          return [];
      }
  };

  useEffect(() => {
    checkPermission();
  }, []);

  const takePicture = async () => {
    if(camera!== null){
      const photo = await camera.current.takePhoto()
      setPhotoPath("file:///"+photo.path)
      setPhotoClicked(false);
      console.log("Photo taken", photo);
    }
  }

  const backToCamera = () => {
    setCameraOn(true);
    setPhotoClicked(true);
    setDesignMode(false);
    setProcessedDesigns([]);
  }

  const imageToModel = async (imagePath) => {
    console.log("Image to model pressed", imagePath);
    
    const roboflowResponse = await imageAPI(imagePath);
    console.log("Roboflow response:", roboflowResponse);
    
    if(roboflowResponse && roboflowResponse.predictions) {
        const polygons = roboflowResponse.predictions.map(pred => pred.points);
        console.log("Nail polygons:", polygons);

        setNailPolygons(polygons);
        setOriginalImageDimensions({
            width: roboflowResponse.image.width,
            height: roboflowResponse.image.height
        });
        setResultImage(imagePath);
        setColorImage(true);
        setCameraOn(false);
    }
  }

  const designNailsXY = async (imagePath) => {
    try {
        console.log("Starting design processing...");
        
        if (!nailPolygons || nailPolygons.length === 0) {
            console.log("No target nails detected");
            alert("Please capture and detect nails first!");
            return;
        }
      
        const roboflowResponse = await imageDesignAPI(imagePath);
        
        if (!roboflowResponse?.predictions?.length) {
            console.log("No design predictions");
            alert("No nail designs detected in image");
            return;
        }
        
        console.log("RowboFlow response for designed image:", roboflowResponse);
        const designedPolygons = roboflowResponse.predictions.map(pred => pred.points);
        
        setDesignPolygons(designedPolygons);
        setDesignImageDimensions({
            width: roboflowResponse.image?.width || 1000,
            height: roboflowResponse.image?.height || 1000
        });

        const processed = simpleDesignTransfer(designedPolygons, nailPolygons, imagePath);
        
        console.log("Processed designs in designNailsXY : ", processed);
        
        setProcessedDesigns(processed);
        setDesignMode(true);
        
    } catch (error) {
        console.log("Design processing error:", error);
        setDesignMode(false);
        setProcessedDesigns([]);
        alert("Error processing design. Please try again.");
    }
  }

  async function checkPermission() {
    console.log("Check permission");
    
    try {
      const cameraPermission = await Camera.requestCameraPermission();
      await Camera.requestMicrophonePermission();
      
      const hasRequiredPermissions = cameraPermission === 'authorized' || cameraPermission === 'granted';
      
      setHasPermission(hasRequiredPermissions);
      setIsLoading(false);
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
              <Defs>
                  {/* Create clipping paths for each captured nail */}
                  {nailPolygons.map((points, index) => {
                      const pointsString = points.map(p => `${p?.x || 0},${p?.y || 0}`).join(' ');
                      return (
                          <ClipPath key={`clip-${index}`} id={`nail-clip-${index}`}>
                              <Polygon points={pointsString} />
                          </ClipPath>
                      );
                  })}
                  
                  {/* Create clipping paths for design nail regions */}
                  {designMode && processedDesigns?.map?.((design, idx) => {
                      if (!design || !design.designNail) return null;
                      
                      const designPointsString = design.designNail.map(p => `${p?.x || 0},${p?.y || 0}`).join(' ');
                      return (
                          <ClipPath key={`design-clip-${idx}`} id={`design-nail-clip-${idx}`}>
                              <Polygon points={designPointsString} />
                          </ClipPath>
                      );
                  })}
              </Defs>
              
              {/* Render regular colored nails when not in design mode */}
              {!designMode && nailPolygons.map((points, index) => {
                  try {
                      const pointsString = points.map(p => `${p?.x || 0},${p?.y || 0}`).join(' ');
                      
                      return(
                          <Polygon 
                              key={index}
                              points={pointsString}
                              fill={selectedColor}
                              fillOpacity="0.95"
                              stroke="#000000"
                              strokeWidth={1}
                          />
                      )
                  } catch (error) {
                      console.log(`Error rendering nail ${index}:`, error);
                      return null;
                  }
              })}
            </Svg>
            
            {/* Render draggable design nails outside SVG context */}
            {designMode && processedDesigns?.map?.((design, index) => (
                <DragAndDrop
                    key={`design-${index}`}
                    design={design}
                    index={index}
                    designImageDimensions={designImageDimensions}
                    originalImageDimensions={originalImageDimensions}
                    onTransformChange={(transforms) => handleNailTransform(index, transforms)}
                />
            ))}
        </View>
          
        {/* Color selection buttons */}
        <View style={styles.colorContainer}>
            <Text style={styles.title}>Choose nail style:</Text>
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
                
                <TouchableOpacity onPress={()=>designNailsXY(designNailImage)} style={[styles.colorButton, {backgroundColor: designMode ? '#4CAF50' : '#660036ff'}]}>
                    <Text style={{color: 'white', fontSize: 10}}>
                        {designMode ? 'Change Design' : 'Design Pic'}
                    </Text>
                </TouchableOpacity>
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
    height: 40,
    backgroundColor: 'red',
    bottom: 50,
    alignSelf: 'center',
    position: 'absolute',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 5,
  },
  modelButton: {
    height: 40,
    backgroundColor: 'green',
    bottom: 50,
    position: 'absolute',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 5,
  },
  imageContainer: {
    flex: 1
  },
  colorContainer: {
    position: 'absolute',
    bottom: 0,
    padding: 15,
    height: 220,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    minWidth: '90%',
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 5,
  },
  colorText: {
    fontSize: 12,
    fontWeight: 'bold',
    padding: 2,
  },
  designInfo: {
    marginTop: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  designInfoText: {
    fontSize: 11,
    textAlign: 'center',
    color: '#2E7D32',
    marginBottom: 2,
  }
});

export default Cam;