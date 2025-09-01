import React, { useCallback } from 'react';
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
  
  // Shared values for animations
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(2);
  const rotation = useSharedValue(0);
  
  // Saved values for gesture continuity
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedRotation = useSharedValue(0);

  // Create a stable callback function
  const handleTransformChange = useCallback((transforms) => {
    if (onTransformChange) {
      onTransformChange(transforms);
    }
  }, [onTransformChange]);

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
      // console.log(`Pinch scale: ${newScale.toFixed(2)} for nail ${index}`);
    })
    .onEnd(() => {
      // console.log(`Pinch ended for nail ${index}, final scale: ${scale.value.toFixed(2)}`);
      savedScale.value = scale.value;
      
      runOnJS(handleTransformChange)({
        x: translateX.value,
        y: translateY.value,
        scale: scale.value,
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
        rotation: rotation.value
      });
    });

  // Double tap gesture for 2x zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      console.log(`Double tap for nail ${index} - zooming to 2x`);
      // Animate to 2x scale
      const newScale = scale.value === 2 ? 3 : 2; // Toggle between 1x and 2x
      console.log("New scale on double tap:", scale);
      
      scale.value = withSpring(newScale);
      savedScale.value = newScale;
      
      if (handleTransformChange) {
        runOnJS(handleTransformChange)({
          x: translateX.value,
          y: translateY.value,
          scale: newScale,
          rotation: rotation.value
        });
      }
    });

  // Combine all gestures
  const composedGesture = Gesture.Simultaneous(
    doubleTapGesture,
    panGesture,
    pinchGesture,
    rotationGesture
  );

  // Animated style for transforms
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotate: `${rotation.value}rad` },
      ],
    };
  });

  if (!nailData) {
    console.log(`DragAndDrop ${index}: Missing nailData`);
    return null;
  }

  // Use the extracted nail data
  const { bounds, sourceImage, polygon, sourceImageDimensions, cropX, cropY, cropWidth, cropHeight, capturedNailCenter } = nailData;
  console.log("Nail data:", nailData);
  
  
  // Calculate scale to make nail a reasonable size
  const maxNailSize = 80; // Max size for individual nails
  const nailScale = Math.min(maxNailSize / bounds.width, maxNailSize / bounds.height);
  const nailWidth = bounds.width * nailScale;
  const nailHeight = bounds.height * nailScale;

  console.log(`DragAndDrop nail ${index}: Individual nail size ${nailWidth.toFixed(1)}x${nailHeight.toFixed(1)}`);

  // Position designed nail on top of captured nail if available, otherwise use fallback
  let initialX, initialY;
  
  if (capturedNailCenter) {
    // Position designed nail centered on captured nail position
    initialX = capturedNailCenter.x - (nailWidth / 2);
    initialY = capturedNailCenter.y - (nailHeight / 2);
    console.log(`Positioning designed nail ${index} on captured nail center:`, capturedNailCenter);
  } else {
    // Fallback to grid layout if no captured nail position
    const screenCenterX = 200; 
    const screenCenterY = 400; 
    initialX = screenCenterX + ((index % 2) * 120) - 60;
    initialY = screenCenterY + (Math.floor(index / 2) * 120) - 60;
    console.log(`Using fallback position for nail ${index}`);
  }
  
  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[
        {
          position: 'absolute',
          left: initialX,
          top: initialY,
          // backgroundColor: 'red'
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
      </Animated.View>
    </GestureDetector>
  );
};


export default DragAndDrop;