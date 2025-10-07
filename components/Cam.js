import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { imageAPI, imageDesignAPI } from '../api/API';
import Svg, { Defs, ClipPath, Path, Rect, Polygon, RadialGradient, Stop, Circle } from 'react-native-svg';
// import Drag from './Drag';
import RNFS from 'react-native-fs';
import { processNailsToImages } from './NailImageExtractor';
import { detectNailDirection, calculateAlignmentRotation, polygonUtils } from './NailMappingUtils';
import NailPolygonUtils from './NailPolygonUtils';
import LinearGradient from 'react-native-linear-gradient';
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
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [designMode, setDesignMode] = useState(false);
  // const designNailImage = 'https://i.pinimg.com/736x/dc/32/bd/dc32bdb85c1a984153fcc74cba0a55b8.jpg'
  // const designNailImage = 'https://i.pinimg.com/736x/ab/f7/af/abf7af5b23a4521a9793bd1dd34a6d91.jpg'
  const designNailImage = 'https://i.pinimg.com/1200x/71/48/40/714840b90665d14cc4f37ff0ae8e69a5.jpg'
  // const designNailImage = 'https://i.pinimg.com/1200x/e7/c6/d6/e7c6d6ff718998359ac6a9f9cad32aff.jpg'
  // const designNailImage = 'https://i.pinimg.com/736x/f7/45/67/f74567359b00fc84b01208066f3aaa42.jpg'
  // const designNailImage = 'https://i.pinimg.com/1200x/f6/79/ab/f679abfe839a12ee56a3ce9e01a38a77.jpg'

  const [originalImageDimensions, setOriginalImageDimensions] = useState({ width: 0, height: 0 });
  const [designImageDimensions, setDesignImageDimensions] = useState({ width: 0, height: 0 });
  const [nailTransforms, setNailTransforms] = useState({});
  const [selectedNailIndex, setSelectedNailIndex] = useState(null);
  const [extractedNailImages, setExtractedNailImages] = useState([]);
  const [capturedNailDirections, setCapturedNailDirections] = useState([]);
  const [designedNailDirections, setDesignedNailDirections] = useState([]);
  const [showDirections, setShowDirections] = useState(false);
  const [apiCall, setApiCall] = useState(false);
  const [capturedNailData, setCapturedNailData] = useState([]);
  const [nailWait, setNailWait] = useState(false);
      
  const colors = [
      { name: 'Red', color: '#800020' },
      // { name: 'Pink', color: '#FF1493' },
      { name: 'Purple', color: '#800080' },
      // { name: 'Blue', color: '#0000FF' },
      // { name: 'Green', color: '#00FF00' },
      { name: 'Black', color: '#000000' },
      // { name: 'White', color: '#FFFFFF' },
      // { name: 'Gold', color: '#FFBf00' }
      {name: 'Skin', color: '#D2B48C'},
      // {name: 'Shiny', color: '#aebbff'},
  ];

  const applyColor = (color) => {
      // console.log("applyColor:", color);
      setSelectedColor(color);
      setDesignMode(false);
      setProcessedDesigns([]);
  };

  const handleNailTransform = (index, transforms) => {
      setNailTransforms(prev => ({
          ...prev,
          [index]: transforms
      }));
      // console.log(`Nail ${index} transformed:`, transforms);
  };

  const handleNailSelection = (index) => {
      setSelectedNailIndex(index);
      // console.log(`Nail ${index} selected`);
  };

  const handleDeselectNail = () => {
      setSelectedNailIndex(null);
      // console.log(`Nail deselected`);
  };

  const toggleDirectionsDisplay = () => {
      setShowDirections(!showDirections);
      // console.log(`Directions display: ${!showDirections ? 'ON' : 'OFF'}`);
      
      // if (!showDirections && (capturedNailDirections.length > 0 || designedNailDirections.length > 0)) {
      //   // console.log("\n📍 CURRENT NAIL DIRECTIONS:");
      //   // console.log("   Legend: Emojis = Captured Nails 📷 | Letters = Designed Nails 🎨");
        
      //   if (capturedNailDirections.length > 0) {
      //     // console.log("   📷 CAPTURED NAILS:");
      //     capturedNailDirections.forEach((direction, index) => {
      //       // console.log(`      Nail ${index}: ${direction.emoji} ${direction.direction} (${(direction.confidence * 100).toFixed(1)}%)`);
      //     });
      //   }
        
      //   if (designedNailDirections.length > 0) {
      //     // console.log("   🎨 DESIGNED NAILS:");
      //     designedNailDirections.forEach((direction, index) => {
      //       const letter = getDirectionLetter(direction.direction);
      //       // console.log(`      Nail ${index}: ${letter} ${direction.direction} (${(direction.confidence * 100).toFixed(1)}%)`);
      //     });
      //   }
      // }
  };

  // Convert direction to letter for designed nails
  const getDirectionLetter = (direction) => {
    switch(direction) {
      case 'UP': return 'U';
      case 'DOWN': return 'D';
      case 'LEFT': return 'L';
      case 'RIGHT': return 'R';
      default: return '?';
    }
  };

  // Function to extract individual nail images from design image
  const extractNailImages = async (designPolygons, designImagePath, designImageDimensions, capturedNailPolygons, capturedImageDimensions, designedDirections = [], capturedDirections = [], capturedNailData = []) => {
    try {
      // console.log("Extracting individual nail images...");
      // console.log("Design polygons:", designPolygons?.length);
      // console.log("Captured polygons:", capturedNailPolygons?.length);
      // console.log("Design image path:", designImagePath);
      const extractedNails = [];
      
      for (let i = 0; i < designPolygons.length; i++) {
        const nailPolygon = designPolygons[i];
        
        // Calculate bounds for this nail
        const bounds = {
          minX: Math.min(...nailPolygon.map(p => p.x)),
          minY: Math.min(...nailPolygon.map(p => p.y)),
          maxX: Math.max(...nailPolygon.map(p => p.x)),
          maxY: Math.max(...nailPolygon.map(p => p.y))
        };
        bounds.width = bounds.maxX - bounds.minX;
        bounds.height = bounds.maxY - bounds.minY;
        
        // Create nail data object with adjusted polygon coordinates (relative to bounds)
        const normalizedPolygon = nailPolygon.map(p => ({
          x: p.x - bounds.minX,
          y: p.y - bounds.minY
        }));
        
        // Calculate captured nail center and dimensions for size matching
        let capturedNailCenter = null;
        let capturedNailDimensions = null;
        let designScale = 1;

        if (capturedNailData && capturedNailData[i]) {
          // Use x,y from Roboflow response (center of bounding box)
          const centerX = capturedNailData[i].x;
          const centerY = capturedNailData[i].y;

          // Use width and height directly from Roboflow response
          capturedNailDimensions = {
            width: capturedNailData[i].width,
            height: capturedNailData[i].height
          };

          // Calculate scale to match captured nail size
          const designNailWidth = bounds.width;
          const designNailHeight = bounds.height;

          // Use the smaller dimension ratio to fit design nail within captured nail
          const scaleX = capturedNailDimensions.width / designNailWidth;
          const scaleY = capturedNailDimensions.height / designNailHeight;
          designScale = Math.min(scaleX, scaleY) * 0.9; // 10% smaller for better fit

          console.log("ExtractNailImages, capturedNailCenter if, 1");
          capturedNailCenter = {
            x: centerX,
            y: centerY
          };
        } else if (capturedNailPolygons && capturedNailPolygons[i]) {
          
          // Fallback: use polygon points if Roboflow data not available
          const capturedPolygon = capturedNailPolygons[i];

          // Simple center calculation - average of all points
          //  why dividing with capturedPolygon?
          const centerX = capturedPolygon.reduce((sum, p) => sum + p.x, 0) / capturedPolygon.length;
          const centerY = capturedPolygon.reduce((sum, p) => sum + p.y, 0) / capturedPolygon.length;

          // Calculate captured nail bounds for size matching
          const capturedBounds = {
            minX: Math.min(...capturedPolygon.map(p => p.x)),
            minY: Math.min(...capturedPolygon.map(p => p.y)),
            maxX: Math.max(...capturedPolygon.map(p => p.x)),
            maxY: Math.max(...capturedPolygon.map(p => p.y))
          };
          capturedBounds.width = capturedBounds.maxX - capturedBounds.minX;
          capturedBounds.height = capturedBounds.maxY - capturedBounds.minY;

          // Store captured nail dimensions (in SVG coordinates)
          capturedNailDimensions = {
            width: capturedBounds.width,
            height: capturedBounds.height
          };

          // Calculate scale to match captured nail size
          const designNailWidth = bounds.width;
          const designNailHeight = bounds.height;

          // Use the smaller dimension ratio to fit design nail within captured nail
          const scaleX = capturedNailDimensions.width / designNailWidth;
          const scaleY = capturedNailDimensions.height / designNailHeight;
          designScale = Math.min(scaleX, scaleY) * 0.9; // 10% smaller for better fit

          console.log("ExtractNailImages, capturedNailCenter else if, 2");
          capturedNailCenter = {
            x: centerX,
            y: centerY
          };

          // console.log(`📍 Nail ${i}: center (${centerX.toFixed(1)}, ${centerY.toFixed(1)}), captured size: ${capturedBounds.width.toFixed(1)}x${capturedBounds.height.toFixed(1)}, scale: ${designScale.toFixed(2)}`);
        }
        
        // Calculate auto-rotation if we have direction data
        let initialRotation = 0;
        let shouldAutoRotate = false;
        
        // if (designedDirections[i] && capturedDirections[i]) {
        //   const alignment = calculateAlignmentRotation(designedDirections[i], capturedDirections[i]);
        //   if (alignment.shouldRotate) {
        //     initialRotation = alignment.rotationNeeded * (Math.PI / 180); // Convert to radians
        //     shouldAutoRotate = true;
        //     // console.log(`🔄 Auto-rotating designed nail ${i} by ${alignment.rotationNeeded.toFixed(1)}° to match captured nail direction`);
        //   }
        // }

        // Use captured polygon directly since we're working in SVG coordinates
        const scaledCapturedPolygon = capturedNailPolygons && capturedNailPolygons[i] ? capturedNailPolygons[i] : null;

        const nailData = {
          id: `nail_${i}`,
          polygon: normalizedPolygon,
          bounds: bounds,
          sourceImage: designImagePath,
          sourceImageDimensions: designImageDimensions,
          cropX: bounds.minX,
          cropY: bounds.minY,
          cropWidth: bounds.width,
          cropHeight: bounds.height,
          capturedNailCenter: capturedNailCenter, // Center point in SVG coordinates
          capturedNailDimensions: capturedNailDimensions, // Captured nail size in SVG coordinates
          capturedPolygon: scaledCapturedPolygon,
          designScale: designScale, // Scale to match captured nail size
          initialRotation: initialRotation,
          shouldAutoRotate: shouldAutoRotate,
          // designedDirection: designedDirections[i],
          // capturedDirection: capturedDirections[i]
        };
        
        extractedNails.push(nailData);
        // console.log(`Extracted nail ${i}:`, bounds, 'Captured center:', capturedNailCenter);
      }
      
      // console.log("Successfully extracted", extractedNails.length, "nails");
      return extractedNails;
    } catch (error) {
// console.log("Error extracting nail images:", error);
      return [];
    }
  };

  useEffect(() => {
    checkPermission();
  }, []);

  // Debug: Monitor apiCall state changes
  useEffect(() => {
    // console.log("🔄 apiCall state changed to:", apiCall);
  }, [apiCall]);

  const takePicture = async () => {
    if(camera!== null){
      const photo = await camera.current.takePhoto()
      setPhotoPath("file:///"+photo.path)
      setPhotoClicked(false);
      // console.log("Photo taken", photo);
    }
  }

  const backToCamera = () => {
    setApiCall(false);
    setCameraOn(true);
    setPhotoClicked(true);
    setDesignMode(false);
    setProcessedDesigns([]);
  }

  const imageToModel = async (imagePath) => {
    try {
      setApiCall(true); // Set to true, not toggle
// console.log("Image to model pressed", imagePath);
      
      const roboflowResponse = await imageAPI(imagePath);
      console.log("Roboflow response:", roboflowResponse);
      
      if(roboflowResponse && roboflowResponse.predictions) {

          const polygons = roboflowResponse.predictions.map(pred => pred.points);
          // console.log("Nail polygons:", polygons);

          // Store full prediction data for width/height and x,y access
          setCapturedNailData(roboflowResponse.predictions);

          // Detect directions for all captured nails
          // console.log("\n🎯 ===== CAPTURED NAILS DIRECTION ANALYSIS =====");
          // const capturedDirections = polygons.map((polygon, index) => {
          //   return detectNailDirection(polygon, index, 'captured');
          // });

// console.log(`\n📋 CAPTURED NAILS SUMMARY:`);
          // capturedDirections.forEach((direction, index) => {
          //   // console.log(`   Nail ${index}: ${direction.emoji} ${direction.direction} (${(direction.confidence * 100).toFixed(1)}%)`);
          // });
          setNailPolygons(polygons);
          // setCapturedNailDirections(capturedDirections);
          setOriginalImageDimensions({
              width: roboflowResponse.image.width,
              height: roboflowResponse.image.height
          });
          setResultImage(imagePath);
          setColorImage(true);
          setApiCall(false); // Turn off loading after everything is set
          setCameraOn(false);
    }
      
    } catch (error) {
// console.log("Image to model error:", error);
      setApiCall(false);
      
      
    }

  }

  const designNailsXY = async (imagePath) => {
    try {

        setNailWait(true);
        const roboflowResponse = await imageDesignAPI(imagePath);
        console.log("Design Nail 1");
        

        if (!roboflowResponse?.predictions?.length) {
            alert("No nail designs detected in image");
            return;
        }

        const designedPolygons = roboflowResponse.predictions.map(pred => pred.points);
        
        console.log("Design Nail 2");
        
        // Detect directions for all designed nails
        // const designedDirections = designedPolygons.map((polygon, index) => {
        //   return detectNailDirection(polygon, index, 'designed');
        // });
        
        setDesignPolygons(designedPolygons);
        // setDesignedNailDirections(designedDirections);
        const imageDimensions = {
            width: roboflowResponse.image?.width || 1000,
            height: roboflowResponse.image?.height || 1000
        };
        setDesignImageDimensions(imageDimensions);

        // Extract individual nail images with captured nail positions

        console.log("Design Nail 3 - before extractNailImages");
        
        const rawNailData = await extractNailImages(designedPolygons, imagePath, imageDimensions, nailPolygons, originalImageDimensions, capturedNailDirections, capturedNailData);

        console.log("Design Nail 4 - after extractNailImages");
        // console.log("   Raw nail data extracted:", rawNailData?.length || 0);

        // Process nails to create individual images
        // console.log("🖼️ Processing nails to images...");
        console.log("Design Nail 5 - before processNailsToImages");
        const processedNails = await processNailsToImages(rawNailData);
        console.log("Design Nail 6 - after processNailsToImages");

        // console.log("   Processed nails:", processedNails?.length || 0);

        setExtractedNailImages(processedNails);
        // console.log("✅ setExtractedNailImages called with:", processedNails?.length || 0, "nails");
        
        // Summary of auto-rotations applied
        // const autoRotatedCount = processedNails.filter(nail => nail.shouldAutoRotate).length;
        // if (autoRotatedCount > 0) {
        //   // console.log(`\n🎯 AUTO-ROTATION SUMMARY:`);
        //   // console.log(`   ✅ ${autoRotatedCount} designed nail(s) automatically rotated to match captured nail directions`);
        //   processedNails.forEach((nail, idx) => {
        //     if (nail.shouldAutoRotate) {
        //       const rotationDegrees = (nail.initialRotation * 180 / Math.PI).toFixed(1);
        //       // console.log(`   🔄 Nail ${idx}: ${rotationDegrees}° rotation applied (${nail.designedDirection?.direction} → ${nail.capturedDirection?.direction})`);
        //     }
        //   });
        // }

        // console.log("🎯 FINAL STEP: Setting design mode to true");
        // console.log("   extractedNailImages to be set:", processedNails?.length || 0);
        setDesignMode(true);
        setNailWait(false);
        // console.log("✅ designNailsXY completed successfully");
        
    } catch (error) {
// console.log("Design processing error:", error);
        setDesignMode(false);
        setNailWait(false);
        setProcessedDesigns([]);
        alert("Error processing design. Please try again.");
    }
  }

  async function checkPermission() {
// console.log("Check permission");
    
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
            <Image source={{uri : photoPath}} style={{height: '100%', width: '100%'}}  resizeMode='cover'/>
            <TouchableOpacity style={styles.capButton} onPress={()=>backToCamera()}>
              <Text>Back to Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modelButton} onPress={()=>imageToModel(photoPath)}>
              {
                apiCall ? (
                  <ActivityIndicator size="small" color="#3a9c37ff" />
                ):(
                  <Text>Go for nail detection</Text>
                )
              }
              
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
        {/* if API is loading show activity indicator */}
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
            // viewBox={`0 0 100 100`}
            style={{position: 'absolute'}}
          >
            <Defs>
                {/* Gradient for soft edge fade */}
                <RadialGradient id="nailEdgeFade" cx="50%" cy="50%" r="50%">
                  <Stop offset="85%" stopColor={selectedColor} stopOpacity="1"/>
                  <Stop offset="95%" stopColor={selectedColor} stopOpacity="0.8"/>
                  <Stop offset="100%" stopColor={selectedColor} stopOpacity="0.3"/>
                </RadialGradient>
                {/* Glossy highlight gradient */}
                <RadialGradient id="nailGloss" cx="40%" cy="30%" r="60%">
                  <Stop offset="0%" stopColor="white" stopOpacity="0.6"/>
                  <Stop offset="50%" stopColor="white" stopOpacity="0.2"/>
                  <Stop offset="100%" stopColor="white" stopOpacity="0"/>
                </RadialGradient>
            </Defs>
            
            {/* Render adaptive polygons with nail-specific parameters */}
            {!designMode && nailPolygons.map((points, index) => {
                try {
                    // Calculate nail characteristics for adaptive parameters
                    const bounds = {
                        minX: Math.min(...points.map(p => p.x)),
                        minY: Math.min(...points.map(p => p.y)),
                        maxX: Math.max(...points.map(p => p.x)),
                        maxY: Math.max(...points.map(p => p.y))
                    };
                    const nailWidth = bounds.maxX - bounds.minX;
                    const nailHeight = bounds.maxY - bounds.minY;
                    const nailArea = nailWidth * nailHeight;
                    const aspectRatio = nailWidth / nailHeight;

                    // Calculate adaptive expansion based on nail size \ pixel expansion
                    // Using inverse relationship for better small nail coverage
                    const inverseExpansion = 15 - (nailArea / 500);
                    const sizeBasedExpansion = Math.max(5, Math.min(15, inverseExpansion));

                    // Adjust for aspect ratio - very wide or tall nails might need different treatment
                    const aspectAdjustment = aspectRatio > 2 || aspectRatio < 0.5 ? 1.3 : 1.0;
                    const finalExpansion = sizeBasedExpansion * aspectAdjustment;

                    // Calculate adaptive dilation (more aggressive for smaller nails)
                    const dilationAmount = Math.max(2, Math.min(7, 10 - (nailArea / 1500)));

                    // Calculate adaptive smoothing (less smoothing for smaller nails to preserve detail)
                    const smoothingAmount = nailArea > 3000 ? 3 : 1;

                    // console.log(`Nail ${index}: area=${nailArea.toFixed(0)}, expansion=${finalExpansion.toFixed(1)}, dilation=${dilationAmount.toFixed(1)}, smoothing=${smoothingAmount}`);

                    // Apply adaptive parameters
                    let expandedPoints = NailPolygonUtils.expandPolygonSimple(points, finalExpansion);
                    expandedPoints = NailPolygonUtils.dilatePolygonEnhanced(expandedPoints, dilationAmount);
                    expandedPoints = NailPolygonUtils.smoothPolygonEdges(expandedPoints, smoothingAmount);

                    const pointsString = expandedPoints.map(p => `${p.x},${p.y}`).join(' ');

                    return (
                        <Polygon
                            key={`nail-${index}`}
                            points={pointsString}
                            fill={selectedColor}
                        />
                    )
                } catch (error) {
                // console.log(`Error rendering nail ${index}:`, error);
                    return null;
                }
            })}

            {/* Center dots for captured nails - visible in color mode */}
            {/* {!designMode && capturedNailData.map((nailData, index) => (
                <Circle
                    key={`center-dot-${index}`}
                    cx={nailData.x}
                    cy={nailData.y}
                    r="4"
                    fill="white"
                    stroke="black"
                    strokeWidth="1"
                    opacity="0.9"
                />
            ))} */}

            {/* Red circles showing where designed nails will be placed */}
            {capturedNailData.map((nailData, index) => (
                <Circle
                    key={`design-placement-${index}`}
                    cx={nailData.x}
                    cy={nailData.y}
                    r="9"
                    fill="red"
                    stroke="white"
                    strokeWidth="2"
                    opacity="0.8"d
                />
            ))}

            {/* Render designed nails as SVG images */}
            {/* {designMode && extractedNailImages?.map?.((nailData, index) => {
                if (!nailData?.capturedNailCenter) return null;

                // Calculate nail size based on captured nail dimensions
                let nailWidth, nailHeight;
                if (nailData.capturedNailDimensions) {
                    nailWidth = nailData.capturedNailDimensions.width * nailData.designScale;
                    nailHeight = nailData.capturedNailDimensions.height * nailData.designScale;
                } else {
                    // Fallback size
                    nailWidth = nailData.bounds.width * nailData.designScale;
                    nailHeight = nailData.bounds.height * nailData.designScale;
                }

                // Position at center (subtract half width/height to center the image)
                const x = nailData.capturedNailCenter.x - (nailWidth / 2);
                const y = nailData.capturedNailCenter.y - (nailHeight / 2);

                console.log(`🎯 SVG Nail ${index}:`, {
                    center: nailData.capturedNailCenter,
                    size: { width: nailWidth, height: nailHeight },
                    position: { x, y }
                });

                return (
                    <Polygon
                        key={`designed-nail-${index}`}
                        href={nailData.nailImageUri || nailData.sourceImage}
                        x={x}
                        y={y}
                        width={nailWidth}
                        height={nailHeight}
                        preserveAspectRatio="none"
                        opacity="0.9"
                    />
                );
            })} */}
          </Svg>
          
          {/* Direction indicators overlay */}
          {/* {showDirections && capturedNailDirections.length > 0 && capturedNailDirections.map((direction, index) => {
              if (nailPolygons[index]) {
                  const bounds = {
                      minX: Math.min(...nailPolygons[index].map(p => p?.x || 0)),
                      minY: Math.min(...nailPolygons[index].map(p => p?.y || 0)),
                      maxX: Math.max(...nailPolygons[index].map(p => p?.x || 0)),
                      maxY: Math.max(...nailPolygons[index].map(p => p?.y || 0))
                  };
                  const centerX = (bounds.minX + bounds.maxX) / 2;
                  const centerY = (bounds.minY + bounds.maxY) / 2;
                  
                  // Calculate proper display scaling considering resizeMode='contain'
                  const screenWidth = 390;
                  const screenHeight = 844;
                  const imageAspectRatio = originalImageDimensions.width / originalImageDimensions.height;
                  const screenAspectRatio = screenWidth / screenHeight;

                  let displayWidth, displayHeight, offsetX = 0, offsetY = 0;

                  if (imageAspectRatio > screenAspectRatio) {
                    displayWidth = screenWidth;
                    displayHeight = screenWidth / imageAspectRatio;
                    offsetY = (screenHeight - displayHeight) / 2;
                  } else {
                    displayHeight = screenHeight;
                    displayWidth = screenHeight * imageAspectRatio;
                    offsetX = (screenWidth - displayWidth) / 2;
                  }

                  const scaleX = displayWidth / originalImageDimensions.width;
                  const scaleY = displayHeight / originalImageDimensions.height;
                  
                  return (
                      <View
                          key={`direction-${index}`}
                          style={[styles.directionOverlay,{
                              left: centerX * scaleX + offsetX - 15,
                              top: centerY * scaleY + offsetY - 15,

                          }]}
                      >
                          <Text style={{
                              color: 'white',
                              fontSize: 16,
                              fontWeight: 'bold'
                          }}>
                              {direction.emoji}
                          </Text>
                      </View>
                  );
              }
              return null;
          })} */}
          

          {/* Render draggable design nails outside SVG context */}
          {/* {console.log("🖼️ RENDER CHECK - designMode:", designMode, "extractedNailImages count:", extractedNailImages?.length || 0)} */}
          {/* {designMode && extractedNailImages?.length > 0 && console.log("✅ Rendering", extractedNailImages.length, "extracted nails")} */}
          {designMode && extractedNailImages?.map?.((nailData, index) => {
            console.log("nailData:", nailData);
            console.log("originalImageDimensions:", originalImageDimensions);


            return (
              <DragAndDrop
                  key={`nail-${index}`}
                  nailData={nailData}
                  index={index}
                  designImageDimensions={designImageDimensions}
                  originalImageDimensions={originalImageDimensions}
                  backgroundImage={resultImage}
                  isSelected={selectedNailIndex === index}
                  onTransformChange={(transforms) => handleNailTransform(index, transforms)}
                  onSelect={() => handleNailSelection(index)}
                  onDeselect={handleDeselectNail}
              />
          )})}

          {/* Direction indicators for designed nails */}
          {/* {showDirections && designMode && designedNailDirections.length > 0 && extractedNailImages?.map?.((nailData, index) => {
              const direction = designedNailDirections[index];
              if (direction && nailData?.capturedNailCenter) {
                  const letter = getDirectionLetter(direction.direction);

                  return (
                      <View
                          key={`designed-direction-${index}`}
                          style={[styles.directionIndicator, {
                            left: nailData.capturedNailCenter.x - 10,
                            top: nailData.capturedNailCenter.y - 35,
                            }]}
                      >
                          <Text style={{
                              color: 'white',
                              fontSize: 12,
                              fontWeight: 'bold'
                          }}>
                              {letter}
                          </Text>
                      </View>
                  );
              }
              return null;
          })} */}
        </View>
    
          
        {/* Color selection buttons */}
        <View style={styles.colorContainer}>
            <Text style={styles.title}>Choose nail style:</Text>
            {/* <View style={styles.colorRow}>
                {colors.slice(0, 4).map((item, index) => (
                    <TouchableOpacity 
                        key={index}
                        style={[styles.colorButton, {backgroundColor: item.color}]}
                        onPress={() => applyColor(item.color)}
                    >
                        <Text style={styles.colorText}>{item.name}</Text>
                    </TouchableOpacity>
                ))}
            </View> */}
            <View style={styles.colorRow}>
                {colors.map((item, index) => (
                    <TouchableOpacity 
                        key={index}
                        style={[styles.colorButton, {backgroundColor: item.color}]}
                        onPress={() => applyColor(item.color)}
                    >
                        <Text style={styles.colorText}>{item.name}</Text>
                    </TouchableOpacity>
                ))}
                
                <TouchableOpacity onPress={()=>{
                    designNailsXY(designNailImage);
                }} style={[styles.colorButton, {backgroundColor: designMode ? '#4CAF50' : '#660036ff'}]}>

                  {
                    nailWait ? (
                      <ActivityIndicator size="small" color="white" />
                    ):(
                      <Text style={{color: 'white', fontSize: 10}}>
                        {designMode ? 'Change Design' : 'Design Pic'}
                      </Text>

                    )
                  }
                    
                </TouchableOpacity>
                
                {/* {(capturedNailDirections.length > 0 || designedNailDirections.length > 0) && (
                  <TouchableOpacity onPress={toggleDirectionsDisplay} style={[styles.colorButton, {backgroundColor: showDirections ? '#FF6B35' : '#2196F3'}]}>
                      <Text style={{color: 'white', fontSize: 9}}>
                          {showDirections ? 'Hide Dir' : 'Show Dir'}
                      </Text>
                  </TouchableOpacity>
                )} */}
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
  },
  directionIndicator: {
      position: 'absolute',
      width: 20,
      height: 20,
      backgroundColor: 'rgba(255, 0, 0, 0.9)', // Red background for designed nails
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 950, // Higher than captured nail indicators
      borderWidth: 1,
      borderColor: 'white'
  },
  directionOverlay: {
    position: 'absolute',
    width: 30,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 900
  },
});

export default Cam;