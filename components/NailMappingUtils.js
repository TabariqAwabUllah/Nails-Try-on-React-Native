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
  },

  // Smooth polygon using cubic bezier curves for natural nail shape
  smoothPolygon: (points, tension = 0.3) => {
    if (!points || points.length < 3) return points;
    
    const smoothedPoints = [];
    const len = points.length;
    
    for (let i = 0; i < len; i++) {
      const p0 = points[(i - 1 + len) % len];
      const p1 = points[i];
      const p2 = points[(i + 1) % len];
      const p3 = points[(i + 2) % len];
      
      // Add original point
      smoothedPoints.push(p1);
      
      // Add interpolated point between current and next
      if (i < len - 1 || len > 3) {
        const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
        const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
        const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
        const cp2y = p2.y - (p3.y - p1.y) * tension / 6;
        
        // Add intermediate points along the curve
        for (let t = 0.2; t < 1; t += 0.2) {
          const x = Math.pow(1-t, 3) * p1.x + 
                   3 * Math.pow(1-t, 2) * t * cp1x + 
                   3 * (1-t) * Math.pow(t, 2) * cp2x + 
                   Math.pow(t, 3) * p2.x;
          const y = Math.pow(1-t, 3) * p1.y + 
                   3 * Math.pow(1-t, 2) * t * cp1y + 
                   3 * (1-t) * Math.pow(t, 2) * cp2y + 
                   Math.pow(t, 3) * p2.y;
          
          smoothedPoints.push({ x, y });
        }
      }
    }
    
    return smoothedPoints;
  },

  // Simple polygon smoothing by adding interpolated points
  smoothPolygonSimple: (points, smoothness = 2) => {
    if (!points || points.length < 3) return points;
    
    const smoothed = [];
    
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      
      // Add current point
      smoothed.push(current);
      
      // Add interpolated points between current and next
      for (let j = 1; j < smoothness; j++) {
        const t = j / smoothness;
        const interpolated = {
          x: current.x + (next.x - current.x) * t,
          y: current.y + (next.y - current.y) * t
        };
        smoothed.push(interpolated);
      }
    }
    
    return smoothed;
  },

  // Create ultra-smooth nail using spline curves (AR-like quality)
  createSmoothNailPath: (points) => {
    if (!points || points.length < 3) return '';
    
    try {
      // Sort points to create proper nail outline
      const center = polygonUtils.getCentroid(points);
      
      // Sort points by angle from center for proper ordering
      const sortedPoints = [...points].sort((a, b) => {
        const angleA = Math.atan2(a.y - center.y, a.x - center.x);
        const angleB = Math.atan2(b.y - center.y, b.x - center.x);
        return angleA - angleB;
      });
      
      // Create smooth spline curve through sorted points
      let path = `M ${sortedPoints[0].x},${sortedPoints[0].y}`;
      
      for (let i = 1; i < sortedPoints.length; i++) {
        const curr = sortedPoints[i];
        const prev = sortedPoints[i - 1];
        const next = sortedPoints[(i + 1) % sortedPoints.length];
        const prev2 = sortedPoints[(i - 2 + sortedPoints.length) % sortedPoints.length];
        
        // Calculate control points for smooth bezier curve
        const cp1x = prev.x + (curr.x - prev2.x) * 0.16;
        const cp1y = prev.y + (curr.y - prev2.y) * 0.16;
        const cp2x = curr.x - (next.x - prev.x) * 0.16;
        const cp2y = curr.y - (next.y - prev.y) * 0.16;
        
        // Use cubic bezier for ultra-smooth curves
        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
      }
      
      // Smooth curve back to start
      const first = sortedPoints[0];
      const last = sortedPoints[sortedPoints.length - 1];
      const secondLast = sortedPoints[sortedPoints.length - 2];
      const second = sortedPoints[1];
      
      const cp1x = last.x + (first.x - secondLast.x) * 0.16;
      const cp1y = last.y + (first.y - secondLast.y) * 0.16;
      const cp2x = first.x - (second.x - last.x) * 0.16;
      const cp2y = first.y - (second.y - last.y) * 0.16;
      
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${first.x},${first.y}`;
      path += ` Z`;
      
      return path;
    } catch (error) {
      console.log('Error creating smooth nail path:', error);
      return '';
    }
  },

  // Shrink polygon inward to create more regular nail shape
  shrinkPolygon: (points, shrinkAmount = 3) => {
    if (!points || points.length < 3) return points;
    
    try {
      // Calculate centroid (center point)
      const centroid = polygonUtils.getCentroid(points);
      
      // Shrink each point toward the center
      const shrunkPoints = points.map(point => {
        // Calculate direction vector from center to point
        const dx = point.x - centroid.x;
        const dy = point.y - centroid.y;
        
        // Calculate distance from center
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return point; // Avoid division by zero
        
        // Calculate unit vector (direction)
        const unitX = dx / distance;
        const unitY = dy / distance;
        
        // Shrink by moving point toward center
        const newDistance = Math.max(distance - shrinkAmount, distance * 0.7); // Don't shrink too much
        
        return {
          x: centroid.x + unitX * newDistance,
          y: centroid.y + unitY * newDistance
        };
      });
      
      return shrunkPoints;
    } catch (error) {
      console.log('Error shrinking polygon:', error);
      return points;
    }
  },

  // Create more regular nail shape by smoothing and shrinking
  createRegularNailShape: (points, shrinkAmount = 3) => {
    if (!points || points.length < 3) return points;
    
    // Step 1: Shrink polygon inward
    const shrunkPoints = polygonUtils.shrinkPolygon(points, shrinkAmount);
    
    // Step 2: Smooth the shrunken polygon
    const smoothedPoints = [];
    
    for (let i = 0; i < shrunkPoints.length; i++) {
      const prev = shrunkPoints[(i - 1 + shrunkPoints.length) % shrunkPoints.length];
      const current = shrunkPoints[i];
      const next = shrunkPoints[(i + 1) % shrunkPoints.length];
      
      // Add current point
      smoothedPoints.push(current);
      
      // Add smoothed intermediate points
      const midToNext = {
        x: (current.x + next.x) / 2,
        y: (current.y + next.y) / 2
      };
      
      // Smooth the intermediate point by pulling it slightly toward previous point
      const smoothed = {
        x: midToNext.x + (prev.x - midToNext.x) * 0.1,
        y: midToNext.y + (prev.y - midToNext.y) * 0.1
      };
      
      smoothedPoints.push(smoothed);
    }
    
    return smoothedPoints;
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
    
    // console.log(`Scale calculation: ${scaleX.toFixed(2)} x ${scaleY.toFixed(2)} → ${scale.toFixed(2)}`);
    
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
    
    // console.log(`Transformed designed nail: scale=${scale.toFixed(2)}`);
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
      // console.log('Invalid input for direct nail mapping');
      return [];
    }

    // console.log(`Creating direct mappings: ${designedNails.length} designed → ${capturedNails.length} captured`);
    
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
    
    // console.log(`Created ${mappings.length} direct nail mappings`);
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
  
  // Method 1: Find the widest part direction (across the nail, not length)
  // This looks for the SHORTEST axis (width), which gives us the perpendicular to nail direction
  getWidthDirection: (points) => {
    if (!points || points.length < 3) return null;

    // Get bounding box
    const bounds = polygonUtils.getBounds(points);
    const centroid = polygonUtils.getCentroid(points);

    // Try different angles and find which gives the smallest width
    let minWidth = Infinity;
    let bestAngle = 0;

    for (let angle = 0; angle < Math.PI; angle += Math.PI / 36) { // Every 5 degrees
      // For this angle, measure the width perpendicular to it
      const perpAngle = angle + Math.PI / 2;
      const perpVector = { x: Math.cos(perpAngle), y: Math.sin(perpAngle) };

      // Project all points onto perpendicular axis
      let minProj = Infinity;
      let maxProj = -Infinity;

      points.forEach(point => {
        const proj = (point.x - centroid.x) * perpVector.x + (point.y - centroid.y) * perpVector.y;
        minProj = Math.min(minProj, proj);
        maxProj = Math.max(maxProj, proj);
      });

      const width = maxProj - minProj;

      if (width < minWidth) {
        minWidth = width;
        bestAngle = angle;
      }
    }

    // Return the vector pointing in the direction of the nail (perpendicular to width)
    return {
      vector: {
        x: Math.cos(bestAngle),
        y: Math.sin(bestAngle)
      },
      angle: bestAngle,
      width: minWidth
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
  },

  // Detect nail base vs tip by analyzing width along the main axis
  detectNailBaseAndTip: (points, primaryVector) => {
    if (!points || points.length < 4 || !primaryVector) {
      return { base: null, tip: null, confidence: 0 };
    }

    try {
      const centroid = polygonUtils.getCentroid(points);
      
      // Create a line along the primary direction through the centroid
      const vectorLength = Math.sqrt(primaryVector.x * primaryVector.x + primaryVector.y * primaryVector.y);
      const unitVector = {
        x: primaryVector.x / vectorLength,
        y: primaryVector.y / vectorLength
      };

      // Find the two ends of the nail along the primary axis
      let minProjection = Infinity;
      let maxProjection = -Infinity;
      let minPoint = null;
      let maxPoint = null;

      points.forEach(point => {
        // Project point onto the primary axis
        const projection = (point.x - centroid.x) * unitVector.x + (point.y - centroid.y) * unitVector.y;
        
        if (projection < minProjection) {
          minProjection = projection;
          minPoint = point;
        }
        if (projection > maxProjection) {
          maxProjection = projection;
          maxPoint = point;
        }
      });

      // Calculate width at each end by measuring perpendicular distances
      const perpVector = { x: -unitVector.y, y: unitVector.x };
      
      // For each end, find the width by measuring distances of nearby points
      const getWidthAtPoint = (centerPoint, radius = 20) => {
        const nearbyPoints = points.filter(p => {
          const dist = Math.sqrt(Math.pow(p.x - centerPoint.x, 2) + Math.pow(p.y - centerPoint.y, 2));
          return dist <= radius;
        });

        if (nearbyPoints.length < 2) return 0;

        let minPerp = Infinity, maxPerp = -Infinity;
        nearbyPoints.forEach(point => {
          const perpDist = (point.x - centerPoint.x) * perpVector.x + (point.y - centerPoint.y) * perpVector.y;
          minPerp = Math.min(minPerp, perpDist);
          maxPerp = Math.max(maxPerp, perpDist);
        });

        return maxPerp - minPerp;
      };

      const minEndWidth = getWidthAtPoint(minPoint);
      const maxEndWidth = getWidthAtPoint(maxPoint);
      
      // Base is the narrower end (cuticle/root), tip is the wider end (free edge)
      const widthDifference = Math.abs(minEndWidth - maxEndWidth);
      const avgWidth = (minEndWidth + maxEndWidth) / 2;
      const confidence = avgWidth > 0 ? Math.min(1, widthDifference / (avgWidth * 0.2)) : 0;

      let base, tip;
      
      if (minEndWidth < maxEndWidth) {
        // minEnd is narrower, so it's the base
        base = { point: minPoint, width: minEndWidth, position: 'start' };
        tip = { point: maxPoint, width: maxEndWidth, position: 'end' };
      } else {
        // maxEnd is narrower, so it's the base
        base = { point: maxPoint, width: maxEndWidth, position: 'end' };
        tip = { point: minPoint, width: minEndWidth, position: 'start' };
      }

      return {
        base: base,
        tip: tip,
        confidence: confidence,
        widthRatio: Math.max(base.width, tip.width) / Math.max(Math.min(base.width, tip.width), 1),
        primaryVector: unitVector
      };

    } catch (error) {
      console.log("Error in nail base/tip detection:", error);
      return { base: null, tip: null, confidence: 0 };
    }
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

    // Method 1: Width Direction (perpendicular to narrowest axis)
    const widthDir = nailDirectionUtils.getWidthDirection(nailPolygon);
    const widthAngle = widthDir ? nailDirectionUtils.vectorToAngle(widthDir.vector) : 0;
    const widthDirection = nailDirectionUtils.getDirectionWithConfidence(widthAngle);

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
      widthBased: { ...widthDirection, method: 'Width-Based' },
      pca: { ...pcaDirection, method: 'PCA' },
      obb: { ...obbDirection, method: 'Oriented Bounding Box' }
    };

    // Find the method with highest confidence
    let bestMethod = 'widthBased';
    let highestConfidence = methods.widthBased.confidence;
    
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
    
    // console.log(`\n🔍 NAIL DIRECTION ANALYSIS - ${nailType.toUpperCase()} NAIL ${nailIndex}`);
    // console.log(`${directionEmoji[finalResult.direction]} Direction: ${finalResult.direction} ${confidenceColor} (${(highestConfidence * 100).toFixed(1)}% confidence)`);
    // console.log(`📐 Angle: ${finalResult.angle.toFixed(1)}° (${finalResult.distanceFromCardinal.toFixed(1)}° from cardinal)`);
    // console.log(`🏆 Best Method: ${finalResult.method}`);
    // console.log(`📊 All Methods:`);
    // console.log(`   • Width-Based: ${methods.widthBased.direction} (${(methods.widthBased.confidence * 100).toFixed(1)}%)`);
    // console.log(`   • PCA: ${methods.pca.direction} (${(methods.pca.confidence * 100).toFixed(1)}%)`);
    // console.log(`   • Oriented Box: ${methods.obb.direction} (${(methods.obb.confidence * 100).toFixed(1)}%)`);

    // Detect base and tip
    let baseAndTip = { base: null, tip: null, confidence: 0 };
    const bestPrimaryVector = bestMethod === 'widthBased' ? widthDir?.vector :
                             bestMethod === 'pca' ? pca?.vector :
                             obb?.vector;
    
    if (bestPrimaryVector) {
      baseAndTip = nailDirectionUtils.detectNailBaseAndTip(nailPolygon, bestPrimaryVector);
      
      if (baseAndTip.confidence > 0.3) {
        // console.log(`🔍 BASE & TIP ANALYSIS:`);
        // console.log(`   🟫 Base: ${baseAndTip.base.position} end (width: ${baseAndTip.base.width.toFixed(1)}) - narrower`);
        // console.log(`   🔸 Tip: ${baseAndTip.tip.position} end (width: ${baseAndTip.tip.width.toFixed(1)}) - wider`);
        // console.log(`   📏 Width Ratio: ${baseAndTip.widthRatio.toFixed(2)}:1 (${(baseAndTip.confidence * 100).toFixed(1)}% confidence)`);
      } else {
        // console.log(`🔍 BASE & TIP: Unable to determine (low confidence: ${(baseAndTip.confidence * 100).toFixed(1)}%)`);
      }
    }

    return {
      direction: finalResult.direction,
      confidence: highestConfidence,
      angle: finalResult.angle,
      distanceFromCardinal: finalResult.distanceFromCardinal,
      bestMethod: bestMethod,
      methods: methods,
      emoji: directionEmoji[finalResult.direction],
      baseAndTip: baseAndTip
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
      // console.log(`🔄 ROTATION ALIGNMENT SUGGESTION:`);
      // console.log(`   Designed nail: ${designedNailDirection.emoji} ${designedNailDirection.direction} (${designedAngle.toFixed(1)}°)`);
      // console.log(`   Captured nail: ${capturedNailDirection.emoji} ${capturedNailDirection.direction} (${capturedAngle.toFixed(1)}°)`);
      // console.log(`   ↻ Rotate designed nail by: ${rotationNeeded.toFixed(1)}° ${rotationNeeded > 0 ? 'counterclockwise' : 'clockwise'}`);
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