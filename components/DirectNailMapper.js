import React from 'react';
import Svg, { Defs, Polygon, Image as SvgImage, ClipPath, Pattern, Rect } from 'react-native-svg';
import { polygonUtils } from './NailMappingUtils';

// Component for rendering a single nail with direct designed nail mapping
const DirectNailRenderer = ({ 
  mapping,
  fallbackColor = '#FF1493'
}) => {
  try {
    if (!mapping || !mapping.capturedNail) {
      return null;
    }
    
    const capturedPointsString = polygonUtils.toPointsString(mapping.capturedNail);
    const clipId = mapping.clipId;
    const patternId = mapping.patternId;
    
    // If no design mapping, render solid color
    if (!mapping.transformedDesignedNail || !mapping.sourceImagePath) {
      return (
        <Polygon 
          points={capturedPointsString}
          fill={fallbackColor}
          fillOpacity="0.95"
          stroke="#000000"
          strokeWidth={1}
        />
      );
    }

    // Calculate the exact portion of design image that contains the designed nail
    const designSection = {
      // Position the design image so the designed nail area aligns with captured nail
      x: mapping.capturedBounds.minX - (mapping.designedBounds.minX * mapping.scale),
      y: mapping.capturedBounds.minY - (mapping.designedBounds.minY * mapping.scale),
      width: mapping.sourceImageDimensions.width * mapping.scale,
      height: mapping.sourceImageDimensions.height * mapping.scale
    };
    
    //console.log(`Direct mapping ${mapping.index}:`, {
      capturedBounds: mapping.capturedBounds,
      designedBounds: mapping.designedBounds,
      scale: mapping.scale,
      imagePosition: { x: designSection.x, y: designSection.y }
    });

    return (
      <React.Fragment key={mapping.index}>
        {/* Pattern definition with the designed nail */}
        <Pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={mapping.capturedBounds.width}
          height={mapping.capturedBounds.height}
        >
          {/* Design image positioned so only the designed nail shows in pattern */}
          <SvgImage 
            href={mapping.sourceImagePath}
            x={designSection.x - mapping.capturedBounds.minX}
            y={designSection.y - mapping.capturedBounds.minY}
            width={designSection.width}
            height={designSection.height}
            preserveAspectRatio="none"
          />
          
          {/* Mask to show only the transformed designed nail area */}
          <Polygon
            points={polygonUtils.toPointsString(
              mapping.transformedDesignedNail.map(p => ({
                x: p.x - mapping.capturedBounds.minX,
                y: p.y - mapping.capturedBounds.minY
              }))
            )}
            fill="white"
            mask={`url(#design-mask-${mapping.index})`}
          />
        </Pattern>
        
        {/* Mask for designed nail area */}
        <mask id={`design-mask-${mapping.index}`}>
          <Rect 
            x={0} 
            y={0} 
            width={mapping.capturedBounds.width} 
            height={mapping.capturedBounds.height} 
            fill="black" 
          />
          <Polygon
            points={polygonUtils.toPointsString(
              mapping.transformedDesignedNail.map(p => ({
                x: p.x - mapping.capturedBounds.minX,
                y: p.y - mapping.capturedBounds.minY
              }))
            )}
            fill="white"
          />
        </mask>
        
        {/* Captured nail filled with the designed nail pattern */}
        <Polygon 
          points={capturedPointsString}
          fill={`url(#${patternId})`}
          fillOpacity="0.95"
          stroke="#000000"
          strokeWidth={1}
        />
      </React.Fragment>
    );
  } catch (error) {
    //console.log(`Error rendering direct nail mapping ${mapping?.index}:`, error);
    
    // Fallback to solid color on error
    return (
      <Polygon 
        points={polygonUtils.toPointsString(mapping?.capturedNail || [])}
        fill={fallbackColor}
        fillOpacity="0.95"
        stroke="#000000"
        strokeWidth={1}
      />
    );
  }
};

// Alternative simpler approach using clipping
const SimpleDirectNailRenderer = ({ 
  mapping,
  fallbackColor = '#FF1493'
}) => {
  try {
    if (!mapping || !mapping.capturedNail) {
      return null;
    }
    
    const capturedPointsString = polygonUtils.toPointsString(mapping.capturedNail);
    const clipId = mapping.clipId;
    
    // If no design mapping, render solid color
    if (!mapping.transformedDesignedNail || !mapping.sourceImagePath) {
      return (
        <Polygon 
          points={capturedPointsString}
          fill={fallbackColor}
          fillOpacity="0.95"
          stroke="#000000"
          strokeWidth={1}
        />
      );
    }

    // Position design image so designed nail area covers captured nail area
    const imageX = mapping.capturedBounds.minX - (mapping.designedBounds.minX * mapping.scale);
    const imageY = mapping.capturedBounds.minY - (mapping.designedBounds.minY * mapping.scale);
    const imageWidth = mapping.sourceImageDimensions.width * mapping.scale;
    const imageHeight = mapping.sourceImageDimensions.height * mapping.scale;

    return (
      <React.Fragment key={mapping.index}>
        {/* Design image clipped to captured nail shape */}
        <SvgImage 
          href={mapping.sourceImagePath}
          x={imageX}
          y={imageY}
          width={imageWidth}
          height={imageHeight}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="none"
          opacity="0.9"
        />
        
        {/* Optional: nail border */}
        <Polygon 
          points={capturedPointsString}
          fill="none"
          stroke="#000000"
          strokeWidth={0.5}
          strokeOpacity="0.3"
        />
      </React.Fragment>
    );
  } catch (error) {
    //console.log(`Error rendering simple direct nail mapping ${mapping?.index}:`, error);
    
    // Fallback to solid color on error
    return (
      <Polygon 
        points={polygonUtils.toPointsString(mapping?.capturedNail || [])}
        fill={fallbackColor}
        fillOpacity="0.95"
        stroke="#000000"
        strokeWidth={1}
      />
    );
  }
};

// Main component for direct nail mapping overlay
const DirectNailMapper = ({
  nailMappings = [],
  selectedColor = '#FF1493',
  originalImageDimensions = { width: 1000, height: 1000 },
  useSimpleRenderer = true // Toggle between pattern-based and simple clipping approach
}) => {
  const RendererComponent = useSimpleRenderer ? SimpleDirectNailRenderer : DirectNailRenderer;
  
  return (
    <Svg 
      height="100%" 
      width="100%" 
      viewBox={`0 0 ${originalImageDimensions.width} ${originalImageDimensions.height}`}
      style={{ position: 'absolute' }}
    >
      <Defs>
        {/* Define clipping paths for captured nails */}
        {nailMappings.map((mapping, index) => (
          <ClipPath key={`clip-def-${index}`} id={mapping.clipId}>
            <Polygon points={polygonUtils.toPointsString(mapping.capturedNail)} />
          </ClipPath>
        ))}
      </Defs>

      {/* Render each nail mapping */}
      {nailMappings.map((mapping, index) => (
        <RendererComponent
          key={index}
          mapping={mapping}
          fallbackColor={selectedColor}
        />
      ))}
    </Svg>
  );
};

export default DirectNailMapper;