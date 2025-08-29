import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue,
  runOnJS,
  withSpring
} from 'react-native-reanimated';
import Svg, { Defs, ClipPath, Polygon, Image as SvgImage } from 'react-native-svg';

const DragAndDrop = ({ design, index, designImageDimensions, originalImageDimensions, onTransformChange }) => {
  // Shared values for animations
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
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
      const newScale = scale.value === 2 ? 1 : 2; // Toggle between 1x and 2x
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

  if (!design || !design.designNail) {
    console.log(`DragAndDrop ${index}: Missing design or designNail`, { design: !!design, designNail: !!design?.designNail });
    return null;
  }

  // Calculate nail bounds for clipping with error handling
  const designNail = design.designNail;
  
  // Validate nail data
  if (!Array.isArray(designNail) || designNail.length === 0) {
    console.log(`DragAndDrop ${index}: Invalid designNail array`, designNail);
    return null;
  }

  // Validate all points have x,y coordinates
  const validPoints = designNail.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number' && !isNaN(p.x) && !isNaN(p.y));
  if (validPoints.length < 3) {
    console.log(`DragAndDrop ${index}: Not enough valid points`, { total: designNail.length, valid: validPoints.length });
    return null;
  }

  const designBounds = design.designBounds || {
    minX: Math.min(...validPoints.map(p => p.x)),
    minY: Math.min(...validPoints.map(p => p.y)),
    maxX: Math.max(...validPoints.map(p => p.x)),
    maxY: Math.max(...validPoints.map(p => p.y))
  };
  designBounds.width = designBounds.maxX - designBounds.minX;
  designBounds.height = designBounds.maxY - designBounds.minY;

  // Validate bounds
  if (designBounds.width <= 0 || designBounds.height <= 0) {
    console.log(`DragAndDrop ${index}: Invalid bounds`, designBounds);
    return null;
  }

  // Calculate the scale factor to match the screen dimensions
  const screenScale = originalImageDimensions.width > 0 ? 
    (300 / originalImageDimensions.width) : 1;

  // Create polygon points string for clipping using valid points
  const pointsString = validPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Make container slightly larger for better gesture detection
  const containerWidth = Math.max(100, designBounds.width * screenScale);
  const containerHeight = Math.max(100, designBounds.height * screenScale);

  // Debug: Log component creation
  console.log(`DragAndDrop nail ${index} SUCCESS: size ${containerWidth.toFixed(1)}x${containerHeight.toFixed(1)}, bounds:`, designBounds);

  // Add initial positioning so nails don't stack at (0,0)
  const initialX = (index % 2) * 150; // Spread horizontally
  const initialY = Math.floor(index / 2) * 150; // Spread vertically

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
          width={containerWidth} 
          height={containerHeight}
          viewBox={`0 0 ${containerWidth} ${containerHeight}`}
          style={styles.nailSvg}
        >
          <Defs>
            <ClipPath id={`nail-clip-${index}`}>
              <Polygon points={validPoints.map(p => `${(p.x - designBounds.minX) * screenScale},${(p.y - designBounds.minY) * screenScale}`).join(' ')} />
            </ClipPath>
          </Defs>
          
          <SvgImage
            href={design.sourceImage}
            x={-designBounds.minX * screenScale}
            y={-designBounds.minY * screenScale}
            width={designImageDimensions.width * screenScale}
            height={designImageDimensions.height * screenScale}
            clipPath={`url(#nail-clip-${index})`}
            preserveAspectRatio="none"
            // opacity="0.9"
          />
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  nailSvg: {
    // Pure SVG styling - no containers
    // opacity: 0.9,
  },
});

export default DragAndDrop;