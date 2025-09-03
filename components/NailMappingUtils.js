// Nail Mapping Utilities for direct designed nail to captured nail mapping
// This approach extracts only designed nail pixels and maps them directly to captured nails

// Utility functions for polygon operations
export const polygonUtils = {
  // Get bounding box of polygon
  getBounds: (points) => {
    if (!points || points.length === 0) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    }
    
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
      width: maxX - minX,
      height: maxY - minY
    };
  },

  // Get centroid of polygon
  getCentroid: (points) => {
    if (!points || points.length === 0) return { x: 50, y: 50 };
    
    const sumX = points.reduce((sum, p) => sum + (p?.x || 0), 0);
    const sumY = points.reduce((sum, p) => sum + (p?.y || 0), 0);
    
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  },

  // Convert polygon points to SVG points string
  toPointsString: (points) => {
    if (!points || !Array.isArray(points)) return '';
    return points.map(p => `${p?.x || 0},${p?.y || 0}`).join(' ');
  }
};

// Calculate scale factor to ensure designed nail covers captured nail completely
export const calculateNailScale = (designedNailBounds, capturedNailBounds) => {
  try {
    if (!designedNailBounds || !capturedNailBounds) return { scaleX: 1, scaleY: 1, scale: 1 };
    
    const scaleX = capturedNailBounds.width / designedNailBounds.width;
    const scaleY = capturedNailBounds.height / designedNailBounds.height;
    
    // Use the larger scale to ensure complete coverage
    const scale = Math.max(scaleX, scaleY);
    
    console.log(`Scale calculation: ${scaleX.toFixed(2)} x ${scaleY.toFixed(2)} → ${scale.toFixed(2)}`);
    
    return { scaleX, scaleY, scale };
  } catch (error) {
    console.log("Error calculating nail scale:", error);
    return { scaleX: 1, scaleY: 1, scale: 1 };
  }
};

// Transform designed nail polygon to match captured nail size and position
export const transformDesignedNail = (designedNailPolygon, capturedNailPolygon) => {
  try {
    if (!designedNailPolygon || !capturedNailPolygon) return designedNailPolygon;
    
    const designedBounds = polygonUtils.getBounds(designedNailPolygon);
    const capturedBounds = polygonUtils.getBounds(capturedNailPolygon);
    const designedCentroid = polygonUtils.getCentroid(designedNailPolygon);
    const capturedCentroid = polygonUtils.getCentroid(capturedNailPolygon);
    
    const { scale } = calculateNailScale(designedBounds, capturedBounds);
    
    // Transform each point: scale relative to centroid, then translate to new position
    const transformedPolygon = designedNailPolygon.map(point => {
      // Scale around the designed nail centroid
      const scaledX = designedCentroid.x + (point.x - designedCentroid.x) * scale;
      const scaledY = designedCentroid.y + (point.y - designedCentroid.y) * scale;
      
      // Translate to captured nail position
      const translatedX = scaledX - designedCentroid.x + capturedCentroid.x;
      const translatedY = scaledY - designedCentroid.y + capturedCentroid.y;
      
      return { x: translatedX, y: translatedY };
    });
    
    console.log(`Transformed designed nail: scale=${scale.toFixed(2)}`);
    return transformedPolygon;
  } catch (error) {
    console.log("Error transforming designed nail:", error);
    return designedNailPolygon;
  }
};

// Create direct nail mapping matches
export const createDirectNailMappings = (designedNails, capturedNails, designImagePath, designImageDimensions) => {
  try {
    if (!designedNails || !capturedNails || !designImagePath) {
      console.log('Invalid input for direct nail mapping');
      return [];
    }

    console.log(`Creating direct mappings: ${designedNails.length} designed → ${capturedNails.length} captured`);
    
    const mappings = [];
    const maxMappings = Math.min(designedNails.length, capturedNails.length);
    
    for (let i = 0; i < maxMappings; i++) {
      const designedNail = designedNails[i];
      const capturedNail = capturedNails[i];
      
      const designedBounds = polygonUtils.getBounds(designedNail);
      const capturedBounds = polygonUtils.getBounds(capturedNail);
      
      // Transform the designed nail to match captured nail size/position
      const transformedDesignedNail = transformDesignedNail(designedNail, capturedNail);
      const transformedBounds = polygonUtils.getBounds(transformedDesignedNail);
      
      const { scale } = calculateNailScale(designedBounds, capturedBounds);
      
      mappings.push({
        index: i,
        designedNail: designedNail,
        capturedNail: capturedNail,
        transformedDesignedNail: transformedDesignedNail,
        designedBounds: designedBounds,
        capturedBounds: capturedBounds,
        transformedBounds: transformedBounds,
        scale: scale,
        sourceImagePath: designImagePath,
        sourceImageDimensions: designImageDimensions,
        patternId: `direct-nail-pattern-${i}`,
        clipId: `captured-nail-clip-${i}`
      });
    }
    
    console.log(`Created ${mappings.length} direct nail mappings`);
    return mappings;
  } catch (error) {
    console.log('Error creating direct nail mappings:', error);
    return [];
  }
};

// Calculate the position and size of design image portion that contains the designed nail
export const calculateDesignImageSection = (designedNailBounds, designImageDimensions, scale) => {
  try {
    // The section of the design image we want to extract (around the designed nail)
    const sectionX = Math.max(0, designedNailBounds.minX - (designedNailBounds.width * 0.1));
    const sectionY = Math.max(0, designedNailBounds.minY - (designedNailBounds.height * 0.1));
    const sectionWidth = Math.min(
      designImageDimensions.width - sectionX,
      designedNailBounds.width * 1.2
    );
    const sectionHeight = Math.min(
      designImageDimensions.height - sectionY,
      designedNailBounds.height * 1.2
    );
    
    // Apply scale for the final rendering
    return {
      x: sectionX,
      y: sectionY,
      width: sectionWidth,
      height: sectionHeight,
      scaledWidth: sectionWidth * scale,
      scaledHeight: sectionHeight * scale
    };
  } catch (error) {
    console.log("Error calculating design image section:", error);
    return {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      scaledWidth: 100,
      scaledHeight: 100
    };
  }
};

// Nail Direction Detection Functions
export const nailDirectionUtils = {
  
  // Method 1: Find the longest edge direction (Primary method)
  getLongestEdgeDirection: (points) => {
    if (!points || points.length < 2) return null;
    
    let maxDistance = 0;
    let primaryVector = null;
    let edgePoints = null;
    
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      const distance = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );
      
      if (distance > maxDistance) {
        maxDistance = distance;
        primaryVector = {
          x: p2.x - p1.x,
          y: p2.y - p1.y
        };
        edgePoints = { start: p1, end: p2 };
      }
    }
    
    return {
      vector: primaryVector,
      length: maxDistance,
      edgePoints: edgePoints
    };
  },

  // Method 2: Principal Component Analysis direction
  getPCADirection: (points) => {
    if (!points || points.length < 2) return null;
    
    // Calculate centroid
    const centroid = polygonUtils.getCentroid(points);
    
    // Calculate covariance matrix elements
    let sumXX = 0, sumXY = 0, sumYY = 0;
    
    points.forEach(point => {
      const dx = point.x - centroid.x;
      const dy = point.y - centroid.y;
      sumXX += dx * dx;
      sumXY += dx * dy;
      sumYY += dy * dy;
    });
    
    sumXX /= points.length;
    sumXY /= points.length;
    sumYY /= points.length;
    
    // Calculate eigenvalues and eigenvectors
    const trace = sumXX + sumYY;
    const det = sumXX * sumYY - sumXY * sumXY;
    const lambda1 = (trace + Math.sqrt(trace * trace - 4 * det)) / 2;
    const lambda2 = (trace - Math.sqrt(trace * trace - 4 * det)) / 2;
    
    // Principal eigenvector (direction of maximum variance)
    let primaryVector;
    if (Math.abs(sumXY) > 0.001) {
      primaryVector = {
        x: lambda1 - sumYY,
        y: sumXY
      };
    } else {
      primaryVector = sumXX >= sumYY ? { x: 1, y: 0 } : { x: 0, y: 1 };
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(primaryVector.x * primaryVector.x + primaryVector.y * primaryVector.y);
    if (magnitude > 0) {
      primaryVector.x /= magnitude;
      primaryVector.y /= magnitude;
    }
    
    return {
      vector: primaryVector,
      eigenvalue: lambda1,
      confidence: lambda1 / (lambda1 + lambda2) // Higher ratio means more elongated shape
    };
  },

  // Method 3: Oriented Bounding Box direction
  getOrientedBoundingBoxDirection: (points) => {
    if (!points || points.length < 3) return null;
    
    // Try different angles and find the one that gives minimum bounding box area
    let bestAngle = 0;
    let minArea = Infinity;
    
    const centroid = polygonUtils.getCentroid(points);
    
    for (let angle = 0; angle < Math.PI; angle += Math.PI / 36) { // Check every 5 degrees
      // Rotate points
      const rotatedPoints = points.map(point => {
        const dx = point.x - centroid.x;
        const dy = point.y - centroid.y;
        return {
          x: dx * Math.cos(-angle) - dy * Math.sin(-angle),
          y: dx * Math.sin(-angle) + dy * Math.cos(-angle)
        };
      });
      
      // Calculate axis-aligned bounding box
      const minX = Math.min(...rotatedPoints.map(p => p.x));
      const maxX = Math.max(...rotatedPoints.map(p => p.x));
      const minY = Math.min(...rotatedPoints.map(p => p.y));
      const maxY = Math.max(...rotatedPoints.map(p => p.y));
      
      const area = (maxX - minX) * (maxY - minY);
      if (area < minArea) {
        minArea = area;
        bestAngle = angle;
      }
    }
    
    return {
      vector: {
        x: Math.cos(bestAngle),
        y: Math.sin(bestAngle)
      },
      angle: bestAngle,
      area: minArea
    };
  },

  // Convert vector to angle in degrees
  vectorToAngle: (vector) => {
    if (!vector) return 0;
    return Math.atan2(vector.y, vector.x) * (180 / Math.PI);
  },

  // Convert angle to cardinal direction
  angleToDirection: (angleDegrees) => {
    // Normalize angle to 0-360 range
    let angle = angleDegrees % 360;
    if (angle < 0) angle += 360;
    
    // Define direction ranges
    if (angle >= 315 || angle < 45) return 'RIGHT';
    if (angle >= 45 && angle < 135) return 'UP';
    if (angle >= 135 && angle < 225) return 'LEFT';
    if (angle >= 225 && angle < 315) return 'DOWN';
    
    return 'UNKNOWN';
  },

  // Get direction with confidence score
  getDirectionWithConfidence: (angleDegrees) => {
    let angle = angleDegrees % 360;
    if (angle < 0) angle += 360;
    
    // Calculate distance from cardinal directions
    const cardinalAngles = { RIGHT: 0, UP: 90, LEFT: 180, DOWN: 270 };
    let bestDirection = 'UNKNOWN';
    let minDistance = Infinity;
    
    Object.entries(cardinalAngles).forEach(([direction, cardinalAngle]) => {
      let distance = Math.abs(angle - cardinalAngle);
      if (distance > 180) distance = 360 - distance; // Handle wraparound
      
      if (distance < minDistance) {
        minDistance = distance;
        bestDirection = direction;
      }
    });
    
    // Confidence decreases as distance from cardinal direction increases
    const confidence = Math.max(0, (45 - minDistance) / 45);
    
    return {
      direction: bestDirection,
      confidence: confidence,
      angle: angle,
      distanceFromCardinal: minDistance
    };
  }
};

// Main function to detect nail direction using multiple methods
export const detectNailDirection = (nailPolygon, nailIndex = 0, nailType = 'unknown') => {
  try {
    if (!nailPolygon || nailPolygon.length < 3) {
      console.log(`❌ Invalid nail polygon for ${nailType} nail ${nailIndex}`);
      return {
        direction: 'UNKNOWN',
        confidence: 0,
        angle: 0,
        methods: {}
      };
    }

    // Method 1: Longest Edge
    const longestEdge = nailDirectionUtils.getLongestEdgeDirection(nailPolygon);
    const longestEdgeAngle = longestEdge ? nailDirectionUtils.vectorToAngle(longestEdge.vector) : 0;
    const longestEdgeDirection = nailDirectionUtils.getDirectionWithConfidence(longestEdgeAngle);

    // Method 2: PCA
    const pca = nailDirectionUtils.getPCADirection(nailPolygon);
    const pcaAngle = pca ? nailDirectionUtils.vectorToAngle(pca.vector) : 0;
    const pcaDirection = nailDirectionUtils.getDirectionWithConfidence(pcaAngle);

    // Method 3: Oriented Bounding Box
    const obb = nailDirectionUtils.getOrientedBoundingBoxDirection(nailPolygon);
    const obbAngle = obb ? nailDirectionUtils.vectorToAngle(obb.vector) : 0;
    const obbDirection = nailDirectionUtils.getDirectionWithConfidence(obbAngle);

    // Combine results - prioritize method with highest confidence
    const methods = {
      longestEdge: { ...longestEdgeDirection, method: 'Longest Edge' },
      pca: { ...pcaDirection, method: 'PCA' },
      obb: { ...obbDirection, method: 'Oriented Bounding Box' }
    };

    // Find the method with highest confidence
    let bestMethod = 'longestEdge';
    let highestConfidence = methods.longestEdge.confidence;
    
    if (methods.pca.confidence > highestConfidence) {
      bestMethod = 'pca';
      highestConfidence = methods.pca.confidence;
    }
    
    if (methods.obb.confidence > highestConfidence) {
      bestMethod = 'obb';
      highestConfidence = methods.obb.confidence;
    }

    const finalResult = methods[bestMethod];

    // Enhanced logging with emojis for better visibility
    const directionEmoji = {
      'RIGHT': '➡️',
      'LEFT': '⬅️', 
      'UP': '⬆️',
      'DOWN': '⬇️',
      'UNKNOWN': '❓'
    };

    const confidenceColor = highestConfidence > 0.7 ? '🟢' : highestConfidence > 0.4 ? '🟡' : '🔴';
    
    console.log(`\n🔍 NAIL DIRECTION ANALYSIS - ${nailType.toUpperCase()} NAIL ${nailIndex}`);
    console.log(`${directionEmoji[finalResult.direction]} Direction: ${finalResult.direction} ${confidenceColor} (${(highestConfidence * 100).toFixed(1)}% confidence)`);
    console.log(`📐 Angle: ${finalResult.angle.toFixed(1)}° (${finalResult.distanceFromCardinal.toFixed(1)}° from cardinal)`);
    console.log(`🏆 Best Method: ${finalResult.method}`);
    console.log(`📊 All Methods:`);
    console.log(`   • Longest Edge: ${methods.longestEdge.direction} (${(methods.longestEdge.confidence * 100).toFixed(1)}%)`);
    console.log(`   • PCA: ${methods.pca.direction} (${(methods.pca.confidence * 100).toFixed(1)}%)`);
    console.log(`   • Oriented Box: ${methods.obb.direction} (${(methods.obb.confidence * 100).toFixed(1)}%)`);

    return {
      direction: finalResult.direction,
      confidence: highestConfidence,
      angle: finalResult.angle,
      distanceFromCardinal: finalResult.distanceFromCardinal,
      bestMethod: bestMethod,
      methods: methods,
      emoji: directionEmoji[finalResult.direction]
    };

  } catch (error) {
    console.log(`❌ Error detecting direction for ${nailType} nail ${nailIndex}:`, error);
    return {
      direction: 'UNKNOWN',
      confidence: 0,
      angle: 0,
      methods: {}
    };
  }
};

// Function to calculate rotation needed to align designed nail with captured nail
export const calculateAlignmentRotation = (designedNailDirection, capturedNailDirection) => {
  try {
    if (!designedNailDirection || !capturedNailDirection) {
      return { rotationNeeded: 0, shouldRotate: false };
    }

    const designedAngle = designedNailDirection.angle;
    const capturedAngle = capturedNailDirection.angle;
    
    // Calculate the rotation needed
    let rotationNeeded = capturedAngle - designedAngle;
    
    // Normalize to -180 to 180 range
    while (rotationNeeded > 180) rotationNeeded -= 360;
    while (rotationNeeded < -180) rotationNeeded += 360;
    
    // Only suggest rotation if both directions have reasonable confidence
    const shouldRotate = designedNailDirection.confidence > 0.3 && capturedNailDirection.confidence > 0.3;
    
    if (shouldRotate && Math.abs(rotationNeeded) > 15) { // Only rotate if significant difference
      console.log(`🔄 ROTATION ALIGNMENT SUGGESTION:`);
      console.log(`   Designed nail: ${designedNailDirection.emoji} ${designedNailDirection.direction} (${designedAngle.toFixed(1)}°)`);
      console.log(`   Captured nail: ${capturedNailDirection.emoji} ${capturedNailDirection.direction} (${capturedAngle.toFixed(1)}°)`);
      console.log(`   ↻ Rotate designed nail by: ${rotationNeeded.toFixed(1)}° ${rotationNeeded > 0 ? 'counterclockwise' : 'clockwise'}`);
    }

    return {
      rotationNeeded: rotationNeeded,
      shouldRotate: shouldRotate && Math.abs(rotationNeeded) > 15,
      designedAngle: designedAngle,
      capturedAngle: capturedAngle,
      confidence: Math.min(designedNailDirection.confidence, capturedNailDirection.confidence)
    };

  } catch (error) {
    console.log("❌ Error calculating alignment rotation:", error);
    return { rotationNeeded: 0, shouldRotate: false };
  }
};