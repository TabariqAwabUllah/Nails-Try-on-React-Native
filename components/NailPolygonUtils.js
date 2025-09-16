// Create this file: utils/NailPolygonUtils.js

const NailPolygonUtils = {
  // Method 1: Simple uniform shrinking - most reliable
  shrinkPolygonUniform: (points, shrinkAmount = 3) => {
    if (!points || points.length < 3) return points;
    
    try {
      // Calculate centroid (center point)
      const centroid = {
        x: points.reduce((sum, p) => sum + (p?.x || 0), 0) / points.length,
        y: points.reduce((sum, p) => sum + (p?.y || 0), 0) / points.length
      };
      
      // Shrink each point towards centroid
      return points.map(point => {
        if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
          return point;
        }
        
        const dx = point.x - centroid.x;
        const dy = point.y - centroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0 || distance < shrinkAmount) return point;
        
        // Calculate shrink factor (reduce distance by shrinkAmount pixels)
        const shrinkFactor = Math.max(0.2, (distance - shrinkAmount) / distance);
        
        return {
          x: centroid.x + dx * shrinkFactor,
          y: centroid.y + dy * shrinkFactor
        };
      });
    } catch (error) {
      console.log('Error in shrinkPolygonUniform:', error);
      return points;
    }
  },

  // Method 2: Adaptive shrinking based on nail size
  shrinkPolygonAdaptive: (points, shrinkPercentage = 0.12) => {
    if (!points || points.length < 3) return points;
    
    try {
      // Calculate bounding box to determine nail size
      const bounds = {
        minX: Math.min(...points.map(p => p?.x || 0)),
        minY: Math.min(...points.map(p => p?.y || 0)),
        maxX: Math.max(...points.map(p => p?.x || 0)),
        maxY: Math.max(...points.map(p => p?.y || 0))
      };
      
      const nailWidth = bounds.maxX - bounds.minX;
      const nailHeight = bounds.maxY - bounds.minY;
      const avgSize = (nailWidth + nailHeight) / 2;
      
      // Adaptive shrink amount based on nail size
      const shrinkAmount = Math.max(2, avgSize * shrinkPercentage);
      
      return NailPolygonUtils.shrinkPolygonUniform(points, shrinkAmount);
    } catch (error) {
      console.log('Error in shrinkPolygonAdaptive:', error);
      return points;
    }
  },

  // Method 3: Create smooth curved path for more natural look
  createSmoothNailPath: (points, shrinkAmount = 3) => {
    if (!points || points.length < 3) return '';

    try {
      // First shrink the polygon
      const shrunkPoints = NailPolygonUtils.shrinkPolygonUniform(points, shrinkAmount);

      if (shrunkPoints.length < 3) return '';

      // Create smooth SVG path with curves
      let path = `M ${shrunkPoints[0].x} ${shrunkPoints[0].y}`;

      for (let i = 1; i < shrunkPoints.length; i++) {
        const current = shrunkPoints[i];
        const next = shrunkPoints[(i + 1) % shrunkPoints.length];

        // Use quadratic curves for smoother appearance
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;

        path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
      }

      // Close the path smoothly
      const first = shrunkPoints[0];
      const last = shrunkPoints[shrunkPoints.length - 1];
      const closeMidX = (last.x + first.x) / 2;
      const closeMidY = (last.y + first.y) / 2;

      path += ` Q ${last.x} ${last.y} ${closeMidX} ${closeMidY}`;
      path += ` Q ${first.x} ${first.y} ${first.x} ${first.y} Z`;

      return path;
    } catch (error) {
      console.log('Error creating smooth nail path:', error);
      return '';
    }
  },

  // Method 4: Enhanced smooth path with better curve control
  createEnhancedSmoothPath: (points, shrinkAmount = 3, smoothness = 0.4) => {
    if (!points || points.length < 3) return '';

    try {
      // Apply multiple smoothing passes before shrinking
      let workingPoints = [...points];

      // Apply 3 rounds of smoothing first
      for (let pass = 0; pass < 3; pass++) {
        workingPoints = NailPolygonUtils.smoothPolygonEdges(workingPoints, 1);
      }

      const shrunkPoints = NailPolygonUtils.shrinkPolygonUniform(workingPoints, shrinkAmount);
      if (shrunkPoints.length < 3) return '';

      // Reduce points for smoother curves (remove very close points)
      const filteredPoints = [];
      for (let i = 0; i < shrunkPoints.length; i++) {
        const current = shrunkPoints[i];
        const next = shrunkPoints[(i + 1) % shrunkPoints.length];
        const distance = Math.sqrt(Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2));

        if (distance > 3 || filteredPoints.length === 0) { // Only keep points that are far enough apart
          filteredPoints.push(current);
        }
      }

      if (filteredPoints.length < 3) return '';

      // Create very smooth Catmull-Rom spline path
      let path = `M ${filteredPoints[0].x} ${filteredPoints[0].y}`;

      for (let i = 0; i < filteredPoints.length; i++) {
        const p0 = filteredPoints[(i - 1 + filteredPoints.length) % filteredPoints.length];
        const p1 = filteredPoints[i];
        const p2 = filteredPoints[(i + 1) % filteredPoints.length];
        const p3 = filteredPoints[(i + 2) % filteredPoints.length];

        // Catmull-Rom to Bezier conversion for smoother curves
        const cp1x = p1.x + (p2.x - p0.x) * smoothness / 6;
        const cp1y = p1.y + (p2.y - p0.y) * smoothness / 6;
        const cp2x = p2.x - (p3.x - p1.x) * smoothness / 6;
        const cp2y = p2.y - (p3.y - p1.y) * smoothness / 6;

        if (i === 0) {
          path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
        } else {
          path += ` S ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
        }
      }

      path += ' Z';
      return path;
    } catch (error) {
      console.log('Error creating enhanced smooth path:', error);
      return NailPolygonUtils.createSmoothNailPath(points, shrinkAmount);
    }
  },

  // Method 5: Simple polygon smoothing with better edge handling
  smoothPolygonEdges: (points, iterations = 2) => {
    if (!points || points.length < 3) return points;

    let smoothedPoints = [...points];

    for (let iter = 0; iter < iterations; iter++) {
      const newPoints = [];

      for (let i = 0; i < smoothedPoints.length; i++) {
        const prev = smoothedPoints[(i - 1 + smoothedPoints.length) % smoothedPoints.length];
        const curr = smoothedPoints[i];
        const next = smoothedPoints[(i + 1) % smoothedPoints.length];

        // Apply more aggressive smoothing
        const smoothedX = curr.x * 0.4 + (prev.x + next.x) * 0.3;
        const smoothedY = curr.y * 0.4 + (prev.y + next.y) * 0.3;

        newPoints.push({ x: smoothedX, y: smoothedY });
      }

      smoothedPoints = newPoints;
    }

    return smoothedPoints;
  },

  // Method 6: Improved distance-based smoothing enhancement
  enhancePolygonWithDistanceFormula: (points, enhancementFactor = 0.5) => {
    if (!points || points.length < 3) return points;

    try {
      // Calculate centroid for reference
      const centroid = {
        x: points.reduce((sum, p) => sum + (p?.x || 0), 0) / points.length,
        y: points.reduce((sum, p) => sum + (p?.y || 0), 0) / points.length
      };

      const enhancedPoints = [];

      for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const prev = points[(i - 1 + points.length) % points.length];
        const next = points[(i + 1) % points.length];
        const prev2 = points[(i - 2 + points.length) % points.length];
        const next2 = points[(i + 2) % points.length];

        // Calculate distances from centroid for wider neighborhood
        const currentDist = Math.sqrt(Math.pow(current.x - centroid.x, 2) + Math.pow(current.y - centroid.y, 2));
        const prevDist = Math.sqrt(Math.pow(prev.x - centroid.x, 2) + Math.pow(prev.y - centroid.y, 2));
        const nextDist = Math.sqrt(Math.pow(next.x - centroid.x, 2) + Math.pow(next.y - centroid.y, 2));
        const prev2Dist = Math.sqrt(Math.pow(prev2.x - centroid.x, 2) + Math.pow(prev2.y - centroid.y, 2));
        const next2Dist = Math.sqrt(Math.pow(next2.x - centroid.x, 2) + Math.pow(next2.y - centroid.y, 2));

        // Calculate weighted average of neighbor distances (closer neighbors have more weight)
        const weightedNeighborDist = (prevDist * 0.4 + nextDist * 0.4 + prev2Dist * 0.1 + next2Dist * 0.1);
        const distanceDifference = weightedNeighborDist - currentDist;

        // Calculate enhancement direction (from centroid to current point)
        const directionX = current.x - centroid.x;
        const directionY = current.y - centroid.y;
        const directionLength = Math.sqrt(directionX * directionX + directionY * directionY);

        if (directionLength > 0) {
          // Normalize direction
          const normalizedX = directionX / directionLength;
          const normalizedY = directionY / directionLength;

          // Apply enhanced distance-based enhancement with smoothing
          let enhancement = distanceDifference * enhancementFactor;

          // Add base expansion for better coverage
          const baseExpansion = 1.5;
          enhancement += baseExpansion;

          // Apply positional smoothing based on neighbors
          const smoothedX = current.x * 0.7 + (prev.x + next.x) * 0.15;
          const smoothedY = current.y * 0.7 + (prev.y + next.y) * 0.15;

          enhancedPoints.push({
            x: smoothedX + normalizedX * enhancement,
            y: smoothedY + normalizedY * enhancement
          });
        } else {
          enhancedPoints.push(current);
        }
      }

      return enhancedPoints;
    } catch (error) {
      console.log('Error in distance-based enhancement:', error);
      return points;
    }
  },

  // Method 7: Smooth with distance-based consistency
  smoothWithDistanceConsistency: (points, iterations = 3) => {
    if (!points || points.length < 3) return points;

    let workingPoints = [...points];

    for (let iter = 0; iter < iterations; iter++) {
      // First apply distance-based enhancement
      workingPoints = NailPolygonUtils.enhancePolygonWithDistanceFormula(workingPoints, 0.2);

      // Then apply edge smoothing
      workingPoints = NailPolygonUtils.smoothPolygonEdges(workingPoints, 1);
    }

    return workingPoints;
  },

  // Method 8: Simple but effective polygon expansion
  expandPolygonSimple: (points, expansionPixels = 5) => {
    if (!points || points.length < 3) return points;

    try {
      // Calculate centroid
      const centroid = {
        x: points.reduce((sum, p) => sum + (p?.x || 0), 0) / points.length,
        y: points.reduce((sum, p) => sum + (p?.y || 0), 0) / points.length
      };

      // Simply expand each point outward from centroid
      const expandedPoints = points.map(point => {
        const dirX = point.x - centroid.x;
        const dirY = point.y - centroid.y;
        const distance = Math.sqrt(dirX * dirX + dirY * dirY);

        if (distance > 0) {
          const normalizedX = dirX / distance;
          const normalizedY = dirY / distance;

          return {
            x: point.x + normalizedX * expansionPixels,
            y: point.y + normalizedY * expansionPixels
          };
        }

        return point;
      });

      return expandedPoints;
    } catch (error) {
      console.log('Error in simple polygon expansion:', error);
      return points;
    }
  },

  // Method 9: Enhanced dilation with edge point insertion
  dilatePolygonEnhanced: (points, dilationRadius = 4) => {
    if (!points || points.length < 3) return points;

    try {
      const dilatedPoints = [];

      for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const prev = points[(i - 1 + points.length) % points.length];
        const next = points[(i + 1) % points.length];

        // Calculate outward normal vector at this point
        const edge1X = current.x - prev.x;
        const edge1Y = current.y - prev.y;
        const edge2X = next.x - current.x;
        const edge2Y = next.y - current.y;

        // Calculate normal (perpendicular) vectors
        const normal1X = -edge1Y;
        const normal1Y = edge1X;
        const normal2X = -edge2Y;
        const normal2Y = edge2X;

        // Normalize normals
        const len1 = Math.sqrt(normal1X * normal1X + normal1Y * normal1Y);
        const len2 = Math.sqrt(normal2X * normal2X + normal2Y * normal2Y);

        let avgNormalX = 0;
        let avgNormalY = 0;

        if (len1 > 0 && len2 > 0) {
          avgNormalX = (normal1X / len1 + normal2X / len2) / 2;
          avgNormalY = (normal1Y / len1 + normal2Y / len2) / 2;

          // Normalize average normal
          const avgLen = Math.sqrt(avgNormalX * avgNormalX + avgNormalY * avgNormalY);
          if (avgLen > 0) {
            avgNormalX /= avgLen;
            avgNormalY /= avgLen;
          }
        }

        // Move point outward along normal with enhanced radius
        dilatedPoints.push({
          x: current.x + avgNormalX * dilationRadius,
          y: current.y + avgNormalY * dilationRadius
        });

        // Add intermediate points on long edges for better coverage
        const edgeLength = Math.sqrt(edge2X * edge2X + edge2Y * edge2Y);
        if (edgeLength > 15) { // If edge is long, add intermediate points
          const midX = (current.x + next.x) / 2;
          const midY = (current.y + next.y) / 2;

          // Calculate normal for midpoint
          const midNormalX = -edge2Y / Math.sqrt(edge2X * edge2X + edge2Y * edge2Y);
          const midNormalY = edge2X / Math.sqrt(edge2X * edge2X + edge2Y * edge2Y);

          dilatedPoints.push({
            x: midX + midNormalX * dilationRadius,
            y: midY + midNormalY * dilationRadius
          });
        }
      }

      return dilatedPoints;
    } catch (error) {
      console.log('Error in enhanced polygon dilation:', error);
      return points;
    }
  },

  // Method 10: Size-adaptive expansion for different nail sizes
  adaptiveExpansion: (points, baseExpansionAmount = 6) => {
    if (!points || points.length < 3) return points;

    try {
      // Calculate nail size to adapt expansion
      const bounds = {
        minX: Math.min(...points.map(p => p?.x || 0)),
        minY: Math.min(...points.map(p => p?.y || 0)),
        maxX: Math.max(...points.map(p => p?.x || 0)),
        maxY: Math.max(...points.map(p => p?.y || 0))
      };

      const nailWidth = bounds.maxX - bounds.minX;
      const nailHeight = bounds.maxY - bounds.minY;
      const nailArea = nailWidth * nailHeight;

      // Adapt expansion based on nail size
      // Smaller nails (like little finger) get less expansion
      // Larger nails (like middle finger) get normal expansion
      let sizeMultiplier = 1.0;
      if (nailArea < 800) { // Very small nail
        sizeMultiplier = 0.5;
      } else if (nailArea < 1500) { // Small nail
        sizeMultiplier = 0.7;
      } else if (nailArea > 3000) { // Large nail
        sizeMultiplier = 1.2;
      }

      const adaptedExpansion = baseExpansionAmount * sizeMultiplier;

      // Calculate centroid
      const centroid = {
        x: points.reduce((sum, p) => sum + (p?.x || 0), 0) / points.length,
        y: points.reduce((sum, p) => sum + (p?.y || 0), 0) / points.length
      };

      const expandedPoints = [];

      for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const prev = points[(i - 1 + points.length) % points.length];
        const next = points[(i + 1) % points.length];

        // Direction from centroid to current point
        const dirX = current.x - centroid.x;
        const dirY = current.y - centroid.y;
        const distance = Math.sqrt(dirX * dirX + dirY * dirY);

        if (distance > 0) {
          const normalizedX = dirX / distance;
          const normalizedY = dirY / distance;

          // Gentler corner expansion for smaller nails
          const prevDir = Math.atan2(current.y - prev.y, current.x - prev.x);
          const nextDir = Math.atan2(next.y - current.y, next.x - current.x);
          let angleDiff = Math.abs(nextDir - prevDir);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

          // Reduce corner multiplier for smaller nails
          const maxCornerMultiplier = sizeMultiplier < 0.8 ? 0.2 : 0.4;
          const cornerMultiplier = 1 + (angleDiff / Math.PI) * maxCornerMultiplier;

          expandedPoints.push({
            x: current.x + normalizedX * adaptedExpansion * cornerMultiplier,
            y: current.y + normalizedY * adaptedExpansion * cornerMultiplier
          });
        } else {
          expandedPoints.push(current);
        }
      }

      return expandedPoints;
    } catch (error) {
      console.log('Error in adaptive expansion:', error);
      return points;
    }
  }
};

export default NailPolygonUtils;