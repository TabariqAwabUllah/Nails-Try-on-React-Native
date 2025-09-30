import React, { useCallback } from 'react';
import { Text, Image, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue,
  runOnJS,
  withSpring
} from 'react-native-reanimated';
import Svg, { Defs, ClipPath, Polygon, Image as SvgImage } from 'react-native-svg';

const DragAndDrop = ({ nailData, index, designImageDimensions, originalImageDimensions, isSelected, onTransformChange, onSelect, onDeselect }) => {
// console.log(`🎨 DragAndDrop component ${index} rendering:`, {
  //   hasNailData: !!nailData,
  //   hasSourceImage: !!nailData?.sourceImage,
  //   hasCapturedCenter: !!nailData?.capturedNailCenter,
  //   designScale: nailData?.designScale
  // });
  // console.log("DragAndDrop", check() );
  // function check (){
  //   nailData.map((items)=> console.log(items))
  // }
  
  // Shared values for animations
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const rotation = useSharedValue(0);

  // console.log("scale1:", scale, "scaleX:", scaleX, "scaleY:", scaleY, "rotation:", rotation, "translateX:", translateX, "translateY:", translateY);
  
  
  // Saved values for gesture continuity
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedScaleX = useSharedValue(1);
  const savedScaleY = useSharedValue(1);
  const savedRotation = useSharedValue(0);

  // Rotation control state
  const isRotating = useSharedValue(false);
  const rotationStartAngle = useSharedValue(0);
  const rotationButtonCenter = useSharedValue({ x: 0, y: 0 });

  // Zoom control state
  const isZooming = useSharedValue(false);
  const zoomStartDistance = useSharedValue(0);
  const zoomStartScale = useSharedValue(1);

  // Width control state
  const isWidthScaling = useSharedValue(false);
  const widthStartScale = useSharedValue(0);

  // Height control state
  const isHeightScaling = useSharedValue(false);
  const heightStartScale = useSharedValue(1);

  // Create a stable callback function
  const handleTransformChange = useCallback((transforms) => {
    if (onTransformChange) {
      onTransformChange(transforms);
    }
  }, [onTransformChange]);

  // Apply initial rotation from nailData if auto-rotation is enabled
  React.useEffect(() => {
    if (nailData?.initialRotation && nailData?.shouldAutoRotate) {
      // console.log(`🔄 Applying initial auto-rotation of ${(nailData.initialRotation * 180 / Math.PI).toFixed(1)}° to designed nail ${index}`);
      rotation.value = nailData.initialRotation;
      savedRotation.value = nailData.initialRotation;
      
      // Notify parent component about the initial rotation
      if (handleTransformChange) {
        handleTransformChange({
          x: translateX.value,
          y: translateY.value,
          scale: scale.value,
          scaleX: scaleX.value,
          scaleY: scaleY.value,
          rotation: nailData.initialRotation
        });
      }
    }
  }, [nailData?.initialRotation, nailData?.shouldAutoRotate, index]);

  // Calculate nail dimensions and position early so they're available for gestures
  if (!nailData) {
    // console.log(`DragAndDrop ${index}: Missing nailData`);
    return null;
  }

  const { bounds, sourceImage, polygon, sourceImageDimensions, cropX, cropY, cropWidth, cropHeight, capturedNailCenter, capturedNailDimensions, nailImageUri, designScale } = nailData;

  // Calculate nail size to match captured nail dimensions
  // Need to account for resizeMode='contain' scaling


// Calculate nail size to match captured nail dimensions
let nailWidth, nailHeight;

if (capturedNailDimensions && originalImageDimensions) {
  // Calculate screen scaling factors
  const screenWidth = 390;
  const availableHeight = 844 - 220;
  const imageAspectRatio = originalImageDimensions.width / originalImageDimensions.height;
  const containerAspectRatio = screenWidth / availableHeight;

  let displayWidth, displayHeight;

  if (imageAspectRatio > containerAspectRatio) {
    displayWidth = screenWidth;
    displayHeight = screenWidth / imageAspectRatio;
  } else {
    displayHeight = availableHeight;
    displayWidth = availableHeight * imageAspectRatio;
  }

  // Calculate scale factors from SVG coordinates to screen coordinates
  const scaleX = displayWidth / originalImageDimensions.width;
  const scaleY = displayHeight / originalImageDimensions.height;

  // Match the WIDTH of the captured nail, maintaining design nail's aspect ratio
  const capturedNailWidthScreen = capturedNailDimensions.width * scaleX;
  const designNailAspectRatio = bounds.width / bounds.height;

  nailWidth = capturedNailWidthScreen;
  nailHeight = capturedNailWidthScreen / designNailAspectRatio;

} else {
  // Fallback: use design scale with reasonable size
  nailWidth = bounds.width * designScale * 0.5;
  nailHeight = bounds.height * designScale * 0.5;
  console.log(`📐 FALLBACK sizing for nail ${index}: ${nailWidth.toFixed(1)}x${nailHeight.toFixed(1)}`);
}

  // console.log("Nail Width",nailWidth,"Nail Height",nailHeight);

  // Helper function to check if a point is inside the captured nail polygon (worklet)
  const isPointInPolygon = useCallback((x, y, polygon) => {
    'worklet';
    if (!polygon || polygon.length < 3) return true; // No constraints if no polygon

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }, []);

  // Get captured nail polygon for boundary constraints
  const capturedPolygon = nailData.capturedPolygon || null;

  // Convert SVG coordinates to screen coordinates for positioning
  // Account for resizeMode='contain' which maintains aspect ratio
  let initialX, initialY;

  if (capturedNailCenter && originalImageDimensions?.width && originalImageDimensions?.height) {
    // Since both the SVG and DragAndDrop are positioned absolutely within the same container,
    // and the SVG uses the same viewBox as original image dimensions,
    // we should use SVG coordinates directly but scale them to match the actual display size

    // The key insight: the SVG viewBox scales automatically to fit the container
    // We need to position our absolute elements using the same scaling

    // Since the container uses flex: 1, let's assume it takes most of the screen
    // minus the bottom UI (roughly 220px based on colorContainer height)
    const screenWidth = 390; // Full screen width
    const availableHeight = 800 // Screen height minus bottom UI

    // Calculate how the image is displayed with resizeMode='contain'
    const imageAspectRatio = originalImageDimensions.width / originalImageDimensions.height;
    const containerAspectRatio = screenWidth / availableHeight;

    let displayWidth, displayHeight, offsetX = 0, offsetY = 0;

    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider - fit to width, center vertically
      displayWidth = screenWidth;
      displayHeight = screenWidth / imageAspectRatio;
      offsetY = (availableHeight - displayHeight) / 2;
    } else {
      // Image is taller - fit to height, center horizontally
      displayHeight = availableHeight;
      displayWidth = availableHeight * imageAspectRatio;
      offsetX = (screenWidth - displayWidth) / 2;
    }

    // Scale factor from SVG coordinates to screen coordinates
    const scaleX = displayWidth / originalImageDimensions.width;
    const scaleY = displayHeight / originalImageDimensions.height;

    // Convert SVG center to screen coordinates
    const screenCenterX = (capturedNailCenter.x * scaleX) + offsetX;
    const screenCenterY = (capturedNailCenter.y * scaleY) + offsetY;

    // Position the design nail centered on the captured nail center
    const halfWidth = (nailWidth || 0) ;
    const halfHeight = (nailHeight || 0) / 2;

    initialX = screenCenterX - halfWidth;
    initialY = screenCenterY - halfHeight;

    // Ensure coordinates are valid numbers
    if (!isFinite(initialX) || !isFinite(initialY)) {
      initialX = 200;
      initialY = 300;
      console.log(`⚠️ Invalid coordinates for nail ${index}, using fallback`);
    } 
  } else {
    // Fallback: place in middle of available space
    initialX = 195; // Half of 390
    initialY = 312; // Half of (844-220)
    console.log(`⚠️ No center or dimensions for nail ${index}, using fallback`);
  }

  // Helper function to calculate angle from nail center to finger position
  const calculateAngle = (centerX, centerY, fingerX, fingerY) => {
    'worklet';
    return Math.atan2(fingerY - centerY, fingerX - centerX);
  };

  // Rotation control gesture
  const rotationControlGesture = Gesture.Pan()
    .onStart((event) => {
      // runOnJS(console.log)(`Rotation control started for nail ${index}`);
      isRotating.value = true;
      
      // Calculate nail center in screen coordinates
      const nailCenterX = initialX + (nailWidth / 2) + translateX.value;
      const nailCenterY = initialY + (nailHeight / 2) + translateY.value;

      
      
      
      // Calculate initial angle from center to finger position
      rotationStartAngle.value = calculateAngle(nailCenterX, nailCenterY, event.absoluteX, event.absoluteY) - savedRotation.value;

      // Debug info moved to UI thread
      // runOnJS(console.log)("onStart in rotation gesture.Pan(); nailCenterX",nailCenterX,"nailCenterY",nailCenterY, "rotationStartAngle",rotationStartAngle.value);
      
    })
    .onUpdate((event) => {
      if (isRotating.value) {
        // Calculate nail center in screen coordinates
        const nailCenterX = initialX + (nailWidth / 2) + translateX.value;
        const nailCenterY = initialY + (nailHeight / 2) + translateY.value;
        
        // Calculate current angle from center to finger position
        const currentAngle = calculateAngle(nailCenterX, nailCenterY, event.absoluteX, event.absoluteY);
        
        // Calculate rotation relative to start
        const newRotation = currentAngle - rotationStartAngle.value;
        rotation.value = newRotation;
  } else {
    
        // Debug info commented out for performance
        // runOnJS(console.log)("onUpdate in rotation gesture.Pan(); nailCenterX",nailCenterX,"nailCenterY",nailCenterY, "rotationStartAngle",rotationStartAngle.value);
      }
    })
    .onEnd(() => {
      // runOnJS(console.log)(`Rotation control ended for nail ${index}`);
      isRotating.value = false;
      savedRotation.value = rotation.value;
      
      if (handleTransformChange) {
        runOnJS(handleTransformChange)({
          x: translateX.value,
          y: translateY.value,
          scale: scale.value,
          scaleX: scaleX.value,
          scaleY: scaleY.value,
          rotation: rotation.value
        });
      }
    });

  // Helper function to calculate distance from zoom button center to finger position
  const calculateDistance = (buttonCenterX, buttonCenterY, fingerX, fingerY) => {
    'worklet';
    const dx = fingerX - buttonCenterX;
    const dy = fingerY - buttonCenterY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Zoom control gesture
  const zoomControlGesture = Gesture.Pan()
    .onStart((event) => {
      // runOnJS(console.log)(`Zoom control started for nail ${index}`);
      // Debug event info commented out
      // runOnJS(console.log)("onStart in zoom gesture.Pan();, event", event);
      
      isZooming.value = true;
      
      // Calculate zoom button center in screen coordinates
      const zoomButtonCenterX = initialX + nailWidth - 12 + translateX.value;
      const zoomButtonCenterY = initialY + nailHeight - 12 + translateY.value;
      
      // Store initial distance and scale
      zoomStartDistance.value = calculateDistance(zoomButtonCenterX, zoomButtonCenterY, event.absoluteX, event.absoluteY);
      zoomStartScale.value = savedScale.value;
    })
    .onUpdate((event) => {
      if (isZooming.value) {
        // Calculate zoom button center in screen coordinates
        const zoomButtonCenterX = initialX + nailWidth - 12 + translateX.value;
        const zoomButtonCenterY = initialY + nailHeight - 12 + translateY.value;
        
        // Calculate current distance from button center to finger
        const currentDistance = calculateDistance(zoomButtonCenterX, zoomButtonCenterY, event.absoluteX, event.absoluteY);
        
        // Calculate scale based on distance change (more sensitive scaling)
        const distanceChange = (currentDistance - zoomStartDistance.value) / 50; // Sensitivity factor
        const newScale = Math.max(0.3, Math.min(4, zoomStartScale.value + distanceChange));
        
        scale.value = newScale;
        // Reset both dimensions to use uniform scaling
        scaleX.value = newScale;
        scaleY.value = newScale;
      }
    })
    .onEnd(() => {
      // runOnJS(console.log)(`Zoom control ended for nail ${index}`);
      isZooming.value = false;
      savedScale.value = scale.value;
      savedScaleX.value = scaleX.value;
      savedScaleY.value = scaleY.value;
      
      if (handleTransformChange) {
        runOnJS(handleTransformChange)({
          x: translateX.value,
          y: translateY.value,
          scale: scale.value,
          scaleX: scaleX.value,
          scaleY: scaleY.value,
          rotation: rotation.value
        });
      }
    });

  // Width control gesture
  const widthControlGesture = Gesture.Pan()
    .onStart((event) => {
      // runOnJS(console.log)(`Width control started for nail ${index}`);
      isWidthScaling.value = true;
      widthStartScale.value = scaleX.value;
    })
    .onUpdate((event) => {
      if (isWidthScaling.value) {
        // Use translation change directly for more intuitive scaling
        const scaleChange = event.translationX / 100; // Sensitivity factor
        const newScaleX = Math.max(0.3, Math.min(4, widthStartScale.value + scaleChange));
        
        // Width scaling debug commented out for performance
        // runOnJS(console.log)(`Width scaling: ${newScaleX.toFixed(2)} for nail ${index}`);
        scaleX.value = newScaleX;
        // Keep scaleY unchanged when adjusting width
      }
    })
    .onEnd(() => {
      // runOnJS(console.log)(`Width control ended for nail ${index}`);
      isWidthScaling.value = false;
      savedScaleX.value = scaleX.value;
      
      if (handleTransformChange) {
        runOnJS(handleTransformChange)({
          x: translateX.value,
          y: translateY.value,
          scale: scale.value,
          scaleX: scaleX.value,
          scaleY: scaleY.value,
          rotation: rotation.value
        });
      }
    });

  // Height control gesture
  const heightControlGesture = Gesture.Pan()
    .onStart((event) => {
      // runOnJS(console.log)(`Height control started for nail ${index}`);
      isHeightScaling.value = true;
      heightStartScale.value = scaleY.value;
    })
    .onUpdate((event) => {
      if (isHeightScaling.value) {
        // Use translation change directly for more intuitive scaling
        const scaleChange = -event.translationY / 100; // Negative because dragging up should increase height
        const newScaleY = Math.max(0.3, Math.min(4, heightStartScale.value + scaleChange));
        
        // Height scaling debug commented out for performance
        // runOnJS(console.log)(`Height scaling: ${newScaleY.toFixed(2)} for nail ${index}`);
        scaleY.value = newScaleY;
        // Keep scaleX unchanged when adjusting height
      }
    })
    .onEnd(() => {
      // runOnJS(console.log)(`Height control ended for nail ${index}`);
      isHeightScaling.value = false;
      savedScaleY.value = scaleY.value;
      
      if (handleTransformChange) {
        runOnJS(handleTransformChange)({
          x: translateX.value,
          y: translateY.value,
          scale: scale.value,
          scaleX: scaleX.value,
          scaleY: scaleY.value,
          rotation: rotation.value
        });
      }
    });

  // Pan gesture with boundary constraints
  const panGesture = Gesture.Pan()
    .onStart(() => {
      // runOnJS(console.log)(`Pan started for nail ${index}`);
    })
    .onUpdate((event) => {
      // Calculate new position
      const newTranslateX = savedTranslateX.value + event.translationX;
      const newTranslateY = savedTranslateY.value + event.translationY;

      // Calculate nail center position with new translation
      const nailCenterX = initialX + (nailWidth / 2) + newTranslateX;
      const nailCenterY = initialY + (nailHeight / 2) + newTranslateY;

      
      // Allow free movement - no boundary constraints
      translateX.value = newTranslateX;
      translateY.value = newTranslateY;
    })
    .onEnd(() => {
      // runOnJS(console.log)(`Pan ended for nail ${index}`);
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      
      // Use a more modern approach instead of deprecated runOnJS
      if (handleTransformChange) {
        runOnJS(handleTransformChange)({
          x: translateX.value,
          y: translateY.value,
          scale: scale.value,
          scaleX: scaleX.value,
          scaleY: scaleY.value,
          rotation: rotation.value
        });
      }
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      // console.log(`Pinch started for nail ${index}`);
    })
    .onUpdate((event) => {
      const newScale = Math.max(0.5, Math.min(3, savedScale.value * event.scale));
      scale.value = newScale;
      // Reset both dimensions to use uniform scaling
      scaleX.value = newScale;
      scaleY.value = newScale;
      // console.log(`Pinch scale: ${newScale.toFixed(2)} for nail ${index}`);
    })
    .onEnd(() => {
      // console.log(`Pinch ended for nail ${index}, final scale: ${scale.value.toFixed(2)}`);
      savedScale.value = scale.value;
      savedScaleX.value = scaleX.value;
      savedScaleY.value = scaleY.value;
      
      runOnJS(handleTransformChange)({
        x: translateX.value,
        y: translateY.value,
        scale: scale.value,
        scaleX: scaleX.value,
        scaleY: scaleY.value,
        rotation: rotation.value
      });
    });

  // Rotation gesture
  const rotationGesture = Gesture.Rotation()
    .onStart(() => {
      // runOnJS(console.log)(`Rotation started for nail ${index}`);
    })
    .onUpdate((event) => {
      rotation.value = savedRotation.value + event.rotation;
      // Rotation debug commented out for performance
      // runOnJS(console.log)(`Rotation angle: ${(rotation.value * 180 / Math.PI).toFixed(1)}° for nail ${index}`);
    })
    .onEnd(() => {
      // runOnJS(console.log)(`Rotation ended for nail ${index}`);
      savedRotation.value = rotation.value;
      
      runOnJS(handleTransformChange)({
        x: translateX.value,
        y: translateY.value,
        scale: scale.value,
        scaleX: scaleX.value,
        scaleY: scaleY.value,
        rotation: rotation.value
      });
    });

  // Single tap gesture for selection
  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .onStart(() => {
      try {
        // runOnJS(console.log)(`Single tap for nail ${index} - toggling selection`);
        if (isSelected) {
          if (onDeselect && typeof onDeselect === 'function') {
            runOnJS(onDeselect)();
          }
        } else {
          if (onSelect && typeof onSelect === 'function') {
            runOnJS(onSelect)(index);
          }
        }
      } catch (error) {
        // runOnJS(console.error)('Tap gesture error:', error);
      }
    });

  // Double tap gesture for 2x zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      try {
        // runOnJS(console.log)(`Double tap for nail ${index} - zooming to 2x`);
        // Animate to 2x scale
        const newScale = scale.value === 2 ? 1 : 2; // Toggle between 1x and 2x

        scale.value = withSpring(newScale);
        // Reset both dimensions to use uniform scaling
        scaleX.value = withSpring(newScale);
        scaleY.value = withSpring(newScale);
        savedScale.value = newScale;
        savedScaleX.value = newScale;
        savedScaleY.value = newScale;

        if (handleTransformChange && typeof handleTransformChange === 'function') {
          runOnJS(handleTransformChange)({
            x: translateX.value,
            y: translateY.value,
            scale: newScale,
            scaleX: scaleX.value,
            scaleY: scaleY.value,
            rotation: rotation.value
          });
        }
      } catch (error) {
        // runOnJS(console.error)('Double tap gesture error:', error);
      }
    });

  // Combine all gestures (excluding rotation control which is separate)
  const composedGesture = Gesture.Race(
    Gesture.Exclusive(doubleTapGesture, singleTapGesture),
    Gesture.Simultaneous(panGesture, pinchGesture, rotationGesture)
  );

  // Animated style for transforms
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scaleX: scaleX.value },
        { scaleY: scaleY.value },
        { rotate: `${rotation.value}rad` },
      ],
    };
  });

  // Animated style for rotation button
  const rotationButtonStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      top: -12,
      right: -12,
      width: 24,
      height: 24,
      backgroundColor: isRotating.value ? 'rgba(0, 0, 255, 1)' : 'rgba(0, 0, 255, 0.8)',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: isRotating.value ? 2 : 1,
      borderColor: 'white',
      zIndex: 1001,
      // elevation: 1001,
      transform: [{ scale: isRotating.value ? 1.1 : 1 }]
    };
  });

  // Animated style for zoom button
  const zoomButtonStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      bottom: -12,
      right: -12,
      width: 24,
      height: 24,
      backgroundColor: isZooming.value ? 'rgba(0, 128, 0, 1)' : 'rgba(0, 128, 0, 0.8)',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1001,
      // elevation: 1001,
      borderWidth: isZooming.value ? 2 : 1,
      borderColor: 'white',
      transform: [{ scale: isZooming.value ? 1.1 : 1 }]
    };
  });

  // Animated style for width button
  const widthButtonStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: -12,
      top: '50%',
      marginTop: -12,
      width: 24,
      height: 24,
      backgroundColor: isWidthScaling.value ? 'rgba(255, 165, 0, 1)' : 'rgba(255, 165, 0, 0.8)',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1001,
      borderWidth: isWidthScaling.value ? 2 : 1,
      borderColor: 'white',
      transform: [{ scale: isWidthScaling.value ? 1.1 : 1 }]
    };
  });

  // Animated style for height button
  const heightButtonStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      top: -12,
      left: '50%',
      marginLeft: -12,
      width: 24,
      height: 24,
      backgroundColor: isHeightScaling.value ? 'rgba(255, 20, 147, 1)' : 'rgba(255, 20, 147, 0.8)',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1001,
      borderWidth: isHeightScaling.value ? 2 : 1,
      borderColor: 'white',
      transform: [{ scale: isHeightScaling.value ? 1.1 : 1 }]
    };
  });

  // console.log("Nail data:", nailData);
  // console.log(`DragAndDrop nail ${index}: Individual nail size ${nailWidth.toFixed(1)}x${nailHeight.toFixed(1)}`);
  // console.log(`Positioning designed nail ${index} on captured nail center:`, capturedNailCenter);
  
  if (nailData?.shouldAutoRotate) {
    const rotationDegrees = (nailData.initialRotation * 180 / Math.PI).toFixed(1);
// console.log(`🔄 Nail ${index} auto-rotated: ${rotationDegrees}° (${nailData.designedDirection?.direction} → ${nailData.capturedDirection?.direction})`);
  }
  
  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[
        {
          position: 'absolute',
          left: initialX,
          top: initialY,
          zIndex: isSelected ? 2000 : 1000 + index,
        },
        animatedStyle
      ]}>
        {/* Debug marker to show where we think the center should be */}
        {/* <View style={{
          position: 'absolute',
          left: (nailWidth / 2) - 3,
          top: (nailHeight / 2) - 3,
          width: 6,
          height: 6,
          backgroundColor: 'blue',
          borderRadius: 3,
          zIndex: 3000
        }} /> */}

        {/* For now, we still use SVG clipping since we can't do true image extraction in React Native without additional libraries */}
        {/* The nailImageUri is available for future use when proper image extraction is implemented */}
        <View>
          <Svg
            width={nailWidth}
            height={nailHeight}
            viewBox={`0 0 ${cropWidth} ${cropHeight}`}
            // viewBox={`0 0 600 600`} // Fixed viewBox to avoid distortion
          >
            <Defs>
              <ClipPath id={`individual-nail-${index}`}>
                <Polygon points={polygon.map(p => `${p.x},${p.y}`).join(' ')} />
              </ClipPath>
            </Defs>
            
            <SvgImage
              href={nailImageUri || sourceImage}
              x={-cropX}
              y={-cropY}
              width={sourceImageDimensions.width}
              height={sourceImageDimensions.height}
              clipPath={`url(#individual-nail-${index})`}
              preserveAspectRatio="none" />
          </Svg>
        </View>
        
        
        {/* Control Buttons - Only show when selected */}
        {isSelected && (
          <>
            {/* Rotation Button - Top Right */}
            <GestureDetector gesture={rotationControlGesture}>
              <Animated.View style={rotationButtonStyle}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>↻</Text>
              </Animated.View>
            </GestureDetector>
            
            {/* Zoom Button - Bottom Right */}
            <GestureDetector gesture={zoomControlGesture}>
              <Animated.View style={zoomButtonStyle}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>⊕</Text>
              </Animated.View>
            </GestureDetector>

             {/* Width Button - Left Middle */}
            <GestureDetector gesture={widthControlGesture}>
              <Animated.View style={widthButtonStyle}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>w</Text>
              </Animated.View>
            </GestureDetector>
            
            {/* Height Button - Top Middle */}
            <GestureDetector gesture={heightControlGesture}>
              <Animated.View style={heightButtonStyle}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>H</Text>
              </Animated.View>
            </GestureDetector>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
};


export default DragAndDrop;