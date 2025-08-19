import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { imageAPI, imageDesignAPI } from '../api/API';
import Svg, { Defs, Pattern, Polygon, Image as SvgImage, ClipPath } from 'react-native-svg';

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
  const designNailImage = 'https://i.pinimg.com/736x/dc/32/bd/dc32bdb85c1a984153fcc74cba0a55b8.jpg'

  const [originalImageDimensions, setOriginalImageDimensions] = useState({ width: 0, height: 0 });
  const [designImageDimensions, setDesignImageDimensions] = useState({ width: 0, height: 0 });
      
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

  // Debug function to check design application
  const debugDesignApplication = () => {
      if (!processedDesigns.length) {
          console.log("No designs to debug");
          return;
      }
      
      console.log("=== DESIGN APPLICATION DEBUG ===");
      console.log(`Design Image Dimensions: ${designImageDimensions.width} x ${designImageDimensions.height}`);
      console.log(`Original Image Dimensions: ${originalImageDimensions.width} x ${originalImageDimensions.height}`);
      
      processedDesigns.forEach((design, i) => {
          console.log(`Design ${i}:`, {
              designIndex: design.designIndex,
              targetIndex: design.targetIndex,
              designBounds: design.designBounds,
              targetBounds: design.targetBounds,
              patternId: design.patternId,
              clipId: design.clipId,
              sourceImage: design.sourceImage
          });
          
          // Calculate the scale factor being used
          if (design.designBounds && design.targetBounds) {
              const scaleX = design.targetBounds.width / design.designBounds.width;
              const scaleY = design.targetBounds.height / design.designBounds.height;
              console.log(`  Scale factors: X=${scaleX.toFixed(2)}, Y=${scaleY.toFixed(2)}`);
          }
      });
      
      // Test if design images are accessible
      processedDesigns.forEach((design, i) => {
          console.log(`Testing design image ${i}: ${design.sourceImage}`);
          // Try to create a test image to see if it loads
          const testImg = new Image();
          testImg.onload = () => console.log(`Design image ${i} loaded successfully`);
          testImg.onerror = () => console.log(`Design image ${i} failed to load`);
          testImg.src = design.sourceImage;
      });
      
      console.log("=== END DEBUG ===");
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

  // Super simple nail analysis
  const simpleNailAnalysis = (points) => {
      try {
          const bounds = getSimpleBounds(points);
          const centroid = getSimpleCentroid(points);
          const aspectRatio = bounds.height / (bounds.width || 1);
          
          return {
              bounds,
              centroid,
              aspectRatio,
              area: bounds.width * bounds.height,
              nailType: aspectRatio > 1.5 ? 'long' : 'short'
          };
      } catch (error) {
          console.log("Error in simpleNailAnalysis:", error);
          return {
              bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 },
              centroid: { x: 50, y: 50 },
              aspectRatio: 1,
              area: 10000,
              nailType: 'round'
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

  // Simple direct design transfer - apply individual nail designs to corresponding nails
  const simpleDesignTransfer = (designNails, targetNails, designImagePath) => {
      try {
          console.log("Starting direct design transfer");
          console.log("Design nails:", designNails.length, "Target nails:", targetNails.length);
          
          const matches = [];
          const maxMatches = Math.min(designNails.length, targetNails.length);
          
          for (let i = 0; i < maxMatches; i++) {
              // Get bounds of the design nail for cropping
              const designBounds = getSimpleBounds(designNails[i]);
              const targetBounds = getSimpleBounds(targetNails[i]);
              
              matches.push({
                  designIndex: i,
                  targetIndex: i,
                  designNail: designNails[i],
                  targetNail: targetNails[i],
                  designBounds: designBounds,  // Bounds of nail in design image
                  targetBounds: targetBounds,  // Bounds of nail in target image
                  patternId: `design-nail-${i}`,
                  clipId: `clip-nail-${i}`,
                  sourceImage: designImagePath
              });
          }
          
          console.log("Created direct matches:", matches.length);
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
        
        console.log("Calling design API...");
        const roboflowResponse = await imageDesignAPI(imagePath);
        console.log("API response received");
        
        if (!roboflowResponse?.predictions?.length) {
            console.log("No design predictions");
            alert("No nail designs detected in image");
            return;
        }
        
        console.log("Extracting polygons...");
        const designedPolygons = roboflowResponse.predictions.map(pred => pred.points);
        
        console.log("Design polygons extracted:", designedPolygons.length);
        console.log("Design image dimensions:", roboflowResponse.image?.width, "x", roboflowResponse.image?.height);
        console.log("Design image URL:", imagePath);
        
        // Test if the design image is accessible
        console.log("Testing design image accessibility...");
        
        setDesignPolygons(designedPolygons);
        setDesignImageDimensions({
            width: roboflowResponse.image?.width || 1000,
            height: roboflowResponse.image?.height || 1000
        });

        console.log("Processing transfer...");
        const processed = simpleDesignTransfer(designedPolygons, nailPolygons, imagePath);
        
        console.log("Setting results...");
        setProcessedDesigns(processed);
        setDesignMode(true);
        
        console.log("Design processing complete!");
        console.log("Final processed designs:", processed);
        
        // Test the first design image
        if (processed.length > 0) {
            console.log("Testing first design image:", processed[0].sourceImage);
            console.log("First design clipId:", processed[0].clipId);
        }
        
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
                  {/* Create clipping paths for each nail to ensure designs stay within nail boundaries */}
                  {nailPolygons.map((points, index) => {
                      const pointsString = points.map(p => `${p?.x || 0},${p?.y || 0}`).join(' ');
                      return (
                          <ClipPath key={`clip-${index}`} id={`nail-clip-${index}`}>
                              <Polygon points={pointsString} />
                          </ClipPath>
                      );
                  })}
                  
                  {/* Create patterns for each design nail that will be mapped to target nails */}
                  {designMode && processedDesigns?.map?.((design, idx) => {
                      if (!design || !design.designBounds || !design.targetBounds) return null;
                      
                      // Calculate scale factors to fit design nail to target nail
                      const scaleX = design.targetBounds.width / design.designBounds.width;
                      const scaleY = design.targetBounds.height / design.designBounds.height;
                      const scale = Math.max(scaleX, scaleY); // Use max to cover the entire nail
                      
                      return (
                          <Pattern 
                              key={`pattern-${idx}`}
                              id={`nail-pattern-${idx}`}
                              x={design.targetBounds.minX}
                              y={design.targetBounds.minY}
                              width={design.targetBounds.width}
                              height={design.targetBounds.height}
                              patternUnits="userSpaceOnUse"
                          >
                              <SvgImage 
                                  href={design.sourceImage}
                                  // Position the image so the design nail is centered in the pattern
                                  x={-design.designBounds.minX * scale}
                                  y={-design.designBounds.minY * scale}
                                  width={designImageDimensions.width * scale}
                                  height={designImageDimensions.height * scale}
                                  preserveAspectRatio="none"
                              />
                          </Pattern>
                      );
                  })}
              </Defs>

              {/* Render nails with designs or colors */}
              {nailPolygons.map((points, index) => {
                  try {
                      const pointsString = points.map(p => `${p?.x || 0},${p?.y || 0}`).join(' ');
                      
                      // Find matching processed design
                      const matchingDesign = processedDesigns?.find?.(design => design?.targetIndex === index);
                      
                      if (designMode && matchingDesign) {
                          console.log(`Nail ${index} applying design pattern`);
                          
                          // Use the pattern with clipping to show only the design nail on the target nail
                          return (
                              <React.Fragment key={index}>
                                  {/* Nail with design pattern, clipped to nail shape */}
                                  <Polygon 
                                      points={pointsString}
                                      fill={`url(#nail-pattern-${index})`}
                                      clipPath={`url(#nail-clip-${index})`}
                                      stroke="#00FF00"
                                      strokeWidth={2}
                                  />
                              </React.Fragment>
                          );
                      }
                          
                      // Return regular colored nail
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
                        {designMode ? 'Design Active' : 'Design Pic'}
                    </Text>
                </TouchableOpacity>
                
                {designMode && (
                    <TouchableOpacity onPress={debugDesignApplication} style={[styles.colorButton, {backgroundColor: '#FF6B35'}]}>
                        <Text style={{color: 'white', fontSize: 10}}>Debug</Text>
                    </TouchableOpacity>
                )}
            </View>
            
            {designMode && processedDesigns && processedDesigns.length > 0 && (
                <View style={styles.designInfo}>
                    <Text style={styles.designInfoText}>
                        ✓ {processedDesigns.length} individual nail designs applied
                    </Text>
                    <Text style={styles.designInfoText}>
                        🎯 Each design nail is mapped to its corresponding captured nail
                    </Text>
                    <Text style={styles.designInfoText}>
                        💚 Green borders = nails with designs applied
                    </Text>
                    <Text style={styles.designInfoText}>
                        ✂️ Designs are cropped and scaled to fit individual nail shapes
                    </Text>
                </View>
            )}
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