import React, { useCallback } from 'react';
import { Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue,
  runOnJS,
  withSpring
} from 'react-native-reanimated';
import Svg, { Defs, ClipPath, Polygon, Image as SvgImage } from 'react-native-svg';

const DragAndDrop = ({ nailData, index, designImageDimensions, originalImageDimensions, isSelected, onTransformChange, onSelect, onDeselect }) => {
  console.log(`DragAndDrop component ${index} rendering with data:`, !!nailData);
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

  // Calculate nail dimensions and position early so they're available for gestures
  if (!nailData) {
    console.log(`DragAndDrop ${index}: Missing nailData`);
    return null;
  }

  const { bounds, sourceImage, polygon, sourceImageDimensions, cropX, cropY, cropWidth, cropHeight, capturedNailCenter } = nailData;
  
  // Calculate scale to make nail a reasonable size
  const maxNailSize = 80;
  const nailScale = Math.min(maxNailSize / bounds.width, maxNailSize / bounds.height);
  const nailWidth = bounds.width * nailScale;
  const nailHeight = bounds.height * nailScale;

  console.log("Nail Width",nailWidth,"Nail Height",nailHeight);
  

  // Position designed nail on top of captured nail if available, otherwise use fallback
  let initialX, initialY;
  
  if (capturedNailCenter) {
    initialX = capturedNailCenter.x - (nailWidth / 2);
    initialY = capturedNailCenter.y - (nailHeight / 2);

    console.log("initialX",initialX,"initialY",initialY, "in If condition");
    
  } else {
    const screenCenterX = 200; 
    const screenCenterY = 400; 
    initialX = screenCenterX + ((index % 2) * 120) - 60;
    initialY = screenCenterY + (Math.floor(index / 2) * 120) - 60;

    console.log("initialX",initialX,"initialY",initialY, "in else condition");
  }

  // Helper function to calculate angle from nail center to finger position
  const calculateAngle = (centerX, centerY, fingerX, fingerY) => {
    'worklet';
    return Math.atan2(fingerY - centerY, fingerX - centerX);
  };

  // Rotation control gesture
  const rotationControlGesture = Gesture.Pan()
    .onStart((event) => {
      console.log(`Rotation control started for nail ${index}`);
      isRotating.value = true;
      
      // Calculate nail center in screen coordinates
      const nailCenterX = initialX + (nailWidth / 2) + translateX.value;
      const nailCenterY = initialY + (nailHeight / 2) + translateY.value;

      
      
      
      // Calculate initial angle from center to finger position
      rotationStartAngle.value = calculateAngle(nailCenterX, nailCenterY, event.absoluteX, event.absoluteY) - savedRotation.value;

      console.log("onStart in rotation gesture.Pan(); nailCenterX",nailCenterX,"nailCenterY",nailCenterY, "rotationStartAngle",rotationStartAngle.value);
      
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
        console.log("onUpdate in rotation gesture.Pan(); nailCenterX",nailCenterX,"nailCenterY",nailCenterY, "rotationStartAngle",rotationStartAngle.value);
      }
    })
    .onEnd(() => {
      console.log(`Rotation control ended for nail ${index}`);
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
      console.log(`Zoom control started for nail ${index}`);
      console.log("onStart in zoom gesture.Pan();, event", event);
      
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
      console.log(`Zoom control ended for nail ${index}`);
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
      console.log(`Width control started for nail ${index}`);
      isWidthScaling.value = true;
      widthStartScale.value = scaleX.value;
    })
    .onUpdate((event) => {
      if (isWidthScaling.value) {
        // Use translation change directly for more intuitive scaling
        const scaleChange = event.translationX / 100; // Sensitivity factor
        const newScaleX = Math.max(0.3, Math.min(4, widthStartScale.value + scaleChange));
        
        console.log(`Width scaling: ${newScaleX.toFixed(2)} for nail ${index}`);
        scaleX.value = newScaleX;
        // Keep scaleY unchanged when adjusting width
      }
    })
    .onEnd(() => {
      console.log(`Width control ended for nail ${index}`);
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
      console.log(`Height control started for nail ${index}`);
      isHeightScaling.value = true;
      heightStartScale.value = scaleY.value;
    })
    .onUpdate((event) => {
      if (isHeightScaling.value) {
        // Use translation change directly for more intuitive scaling
        const scaleChange = -event.translationY / 100; // Negative because dragging up should increase height
        const newScaleY = Math.max(0.3, Math.min(4, heightStartScale.value + scaleChange));
        
        console.log(`Height scaling: ${newScaleY.toFixed(2)} for nail ${index}`);
        scaleY.value = newScaleY;
        // Keep scaleX unchanged when adjusting height
      }
    })
    .onEnd(() => {
      console.log(`Height control ended for nail ${index}`);
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

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      console.log(`Pan started for nail ${index}`);
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      console.log(`Pan ended for nail ${index}`);
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
      console.log(`Rotation started for nail ${index}`);
    })
    .onUpdate((event) => {
      rotation.value = savedRotation.value + event.rotation;
      console.log(`Rotation angle: ${(rotation.value * 180 / Math.PI).toFixed(1)}° for nail ${index}`);
    })
    .onEnd(() => {
      console.log(`Rotation ended for nail ${index}`);
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
      console.log(`Single tap for nail ${index} - toggling selection`);
      if (isSelected) {
        if (onDeselect) {
          runOnJS(onDeselect)(index);
        }
      } else {
        if (onSelect) {
          runOnJS(onSelect)(index);
        }
      }
    });

  // Double tap gesture for 2x zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      console.log(`Double tap for nail ${index} - zooming to 2x`);
      // Animate to 2x scale
      const newScale = scale.value === 2 ? 1 : 2; // Toggle between 1x and 2x
      console.log("New scale on double tap:", scale);
      
      scale.value = withSpring(newScale);
      // Reset both dimensions to use uniform scaling
      scaleX.value = withSpring(newScale);
      scaleY.value = withSpring(newScale);
      savedScale.value = newScale;
      savedScaleX.value = newScale;
      savedScaleY.value = newScale;
      
      if (handleTransformChange) {
        runOnJS(handleTransformChange)({
          x: translateX.value,
          y: translateY.value,
          scale: newScale,
          scaleX: scaleX.value,
          scaleY: scaleY.value,
          rotation: rotation.value
        });
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

  console.log("Nail data:", nailData);
  console.log(`DragAndDrop nail ${index}: Individual nail size ${nailWidth.toFixed(1)}x${nailHeight.toFixed(1)}`);
  console.log(`Positioning designed nail ${index} on captured nail center:`, capturedNailCenter);
  
  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[
        {
          position: 'absolute',
          left: initialX,
          top: initialY,
          zIndex: isSelected ? 1000 : index,
          // elevation: isSelected ? 1000 : index,
          // borderWidth: isSelected ? 2 : 0,
          // borderColor: isSelected ? 'rgba(0, 123, 255, 0.8)' : 'transparent',
          // borderRadius: isSelected ? 4 : 0,
          // padding: isSelected ? 2 : 0
        },
        animatedStyle
      ]}>
        <Svg 
          width={nailWidth} 
          height={nailHeight}
          viewBox={`0 0 ${cropWidth} ${cropHeight}`}
        >
          <Defs>
            <ClipPath id={`individual-nail-${index}`}>
              <Polygon points={polygon.map(p => `${p.x},${p.y}`).join(' ')} />
            </ClipPath>
          </Defs>
          
          <SvgImage
            href={sourceImage}
            x={-cropX}
            y={-cropY}
            width={sourceImageDimensions.width}
            height={sourceImageDimensions.height}
            clipPath={`url(#individual-nail-${index})`}
            preserveAspectRatio="none"
          />
        </Svg>
        
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