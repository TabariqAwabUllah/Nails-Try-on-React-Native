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
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
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
    .onUpdate((event) => {
      scale.value = Math.max(0.5, Math.min(3, savedScale.value * event.scale));
    })
    .onEnd(() => {
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
    .onUpdate((event) => {
      rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
      
      runOnJS(handleTransformChange)({
        x: translateX.value,
        y: translateY.value,
        scale: scale.value,
        rotation: rotation.value
      });
    });

  // Combine all gestures
  const composedGesture = Gesture.Simultaneous(
    panGesture,
    Gesture.Simultaneous(pinchGesture, rotationGesture)
  );

  // Animated style
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

  if (!design || !design.designNail) return null;

  // Calculate nail bounds for clipping
  const designNail = design.designNail;
  const designBounds = design.designBounds || {
    minX: Math.min(...designNail.map(p => p.x)),
    minY: Math.min(...designNail.map(p => p.y)),
    maxX: Math.max(...designNail.map(p => p.x)),
    maxY: Math.max(...designNail.map(p => p.y))
  };
  designBounds.width = designBounds.maxX - designBounds.minX;
  designBounds.height = designBounds.maxY - designBounds.minY;

  // Calculate the scale factor to match the screen dimensions
  const screenScale = originalImageDimensions.width > 0 ? 
    (300 / originalImageDimensions.width) : 1;

  // Create polygon points string for clipping
  const pointsString = designNail.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Svg 
          width={designBounds.width * screenScale} 
          height={designBounds.height * screenScale}
          viewBox={`${designBounds.minX} ${designBounds.minY} ${designBounds.width} ${designBounds.height}`}
          style={styles.nailImage}
        >
          <Defs>
            <ClipPath id={`nail-clip-${index}`}>
              <Polygon points={pointsString} />
            </ClipPath>
          </Defs>
          
          <SvgImage
            href={design.sourceImage}
            x={0}
            y={0}
            width={designImageDimensions.width}
            height={designImageDimensions.height}
            clipPath={`url(#nail-clip-${index})`}
            preserveAspectRatio="none"
            opacity="0.9"
          />
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
    // Add a subtle background to show the touchable area during debugging
    backgroundColor: 'transparent',
  },
  nailImage: {
    opacity: 0.9,
  },
});

export default DragAndDrop;