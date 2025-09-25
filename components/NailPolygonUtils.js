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
      //console.log('Error in shrinkPolygonUniform:', error);
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
      //console.log('Error in shrinkPolygonAdaptive:', error);
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
      //console.log('Error creating smooth nail path:', error);
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
      //console.log('Error creating enhanced smooth path:', error);
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
      //console.log('Error in distance-based enhancement:', error);
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
      //console.log('Error in simple polygon expansion:', error);
      return points;
    }
  },

  // Method 8b: Specialized bottom edge curvature enhancement
  enhanceBottomCurvature: (points, expansionAmount = 8) => {
    if (!points || points.length < 3) return points;

    try {
      const bounds = {
        minX: Math.min(...points.map(p => p?.x || 0)),
        minY: Math.min(...points.map(p => p?.y || 0)),
        maxX: Math.max(...points.map(p => p?.x || 0)),
        maxY: Math.max(...points.map(p => p?.y || 0))
      };

      const nailWidth = bounds.maxX - bounds.minX;
      const nailHeight = bounds.maxY - bounds.minY;
      const centerX = (bounds.minX + bounds.maxX) / 2;

      const enhancedPoints = [];

      for (let i = 0; i < points.length; i++) {
        const current = points[i];

        // Calculate relative position
        const relativeY = (current.y - bounds.minY) / nailHeight;
        const distanceFromCenter = Math.abs(current.x - centerX) / (nailWidth / 2);

        // Identify bottom curved areas (bottom 40% of nail, especially near center)
        const isBottomCurve = relativeY < 0.4 && distanceFromCenter < 0.8;

        // Calculate centroid for expansion direction
        const centroid = {
          x: points.reduce((sum, p) => sum + (p?.x || 0), 0) / points.length,
          y: points.reduce((sum, p) => sum + (p?.y || 0), 0) / points.length
        };

        const dirX = current.x - centroid.x;
        const dirY = current.y - centroid.y;
        const distance = Math.sqrt(dirX * dirX + dirY * dirY);

        if (distance > 0) {
          const normalizedX = dirX / distance;
          const normalizedY = dirY / distance;

          // Enhanced expansion for bottom curved areas
          let pointExpansion = expansionAmount;

          if (isBottomCurve) {
            // Use a curved expansion formula for natural bottom rounding
            const curveFactor = 1 - Math.pow(distanceFromCenter, 2); // More expansion near center
            const bottomFactor = 1 - Math.pow(relativeY / 0.4, 1.5); // More expansion at bottom
            pointExpansion *= (1 + curveFactor * bottomFactor * 0.6);
          }

          enhancedPoints.push({
            x: current.x + normalizedX * pointExpansion,
            y: current.y + normalizedY * pointExpansion
          });
        } else {
          enhancedPoints.push(current);
        }
      }

      return enhancedPoints;
    } catch (error) {
      //console.log('Error in bottom curvature enhancement:', error);
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
      //console.log('Error in enhanced polygon dilation:', error);
      return points;
    }
  },

  // Method 10: Enhanced nail curvature for natural rounded edges
  enhancedNailCurvature: (points, expansionAmount = 8) => {
    if (!points || points.length < 3) return points;

    try {
      const centroid = {
        x: points.reduce((sum, p) => sum + (p?.x || 0), 0) / points.length,
        y: points.reduce((sum, p) => sum + (p?.y || 0), 0) / points.length
      };

      // Detect nail orientation and shape
      const bounds = {
        minX: Math.min(...points.map(p => p?.x || 0)),
        minY: Math.min(...points.map(p => p?.y || 0)),
        maxX: Math.max(...points.map(p => p?.x || 0)),
        maxY: Math.max(...points.map(p => p?.y || 0))
      };

      const nailWidth = bounds.maxX - bounds.minX;
      const nailHeight = bounds.maxY - bounds.minY;

      // Enhanced expansion with curvature analysis
      const enhancedPoints = [];

      for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const prev = points[(i - 1 + points.length) % points.length];
        const next = points[(i + 1) % points.length];

        // Calculate position relative to nail center
        const relativeX = (current.x - bounds.minX) / nailWidth;
        const relativeY = (current.y - bounds.minY) / nailHeight;

        // Detect if this is likely the bottom (cuticle) area
        const isBottomArea = relativeY < 0.3; // Bottom 30% of nail
        const isSideArea = relativeX < 0.2 || relativeX > 0.8; // Side 20% areas

        // Calculate curvature at this point
        const curvature = NailPolygonUtils.calculateLocalCurvature(prev, current, next);
        const isCurvedArea = Math.abs(curvature) > 0.3;

        // Direction from centroid
        const dirX = current.x - centroid.x;
        const dirY = current.y - centroid.y;
        const distance = Math.sqrt(dirX * dirX + dirY * dirY);

        if (distance > 0) {
          const normalizedX = dirX / distance;
          const normalizedY = dirY / distance;

          // Enhanced expansion for curved bottom areas
          let pointExpansion = expansionAmount;

          if (isBottomArea && isCurvedArea) {
            // Increase expansion for curved bottom areas to ensure smooth coverage
            pointExpansion *= 1.4;
          } else if (isBottomArea) {
            // Moderate increase for general bottom area
            pointExpansion *= 1.2;
          } else if (isSideArea && isCurvedArea) {
            // Moderate increase for curved side areas
            pointExpansion *= 1.1;
          }

          // Apply smooth position interpolation
          const smoothX = current.x * 0.8 + (prev.x + next.x) * 0.1;
          const smoothY = current.y * 0.8 + (prev.y + next.y) * 0.1;

          enhancedPoints.push({
            x: smoothX + normalizedX * pointExpansion,
            y: smoothY + normalizedY * pointExpansion
          });
        } else {
          enhancedPoints.push(current);
        }
      }

      return enhancedPoints;
    } catch (error) {
      //console.log('Error in enhanced nail curvature:', error);
      return NailPolygonUtils.expandPolygonSimple(points, expansionAmount);
    }
  },

  // Method 10b: Intelligent adaptive expansion with hand analysis
  intelligentAdaptiveExpansion: (points, allNailPolygons = [], nailIndex = 0, imageDimensions = {}, baseExpansionAmount = 6) => {
    if (!points || points.length < 3) return points;

    try {
      // Analyze hand position and nail arrangement
      const handAnalysis = NailPolygonUtils.analyzeHandPosition(allNailPolygons, imageDimensions);

      // Calculate nail-specific properties
      const bounds = {
        minX: Math.min(...points.map(p => p?.x || 0)),
        minY: Math.min(...points.map(p => p?.y || 0)),
        maxX: Math.max(...points.map(p => p?.x || 0)),
        maxY: Math.max(...points.map(p => p?.y || 0))
      };

      const nailWidth = bounds.maxX - bounds.minX;
      const nailHeight = bounds.maxY - bounds.minY;
      const nailArea = nailWidth * nailHeight;

      // Size-based multiplier
      let sizeMultiplier = 1.0;
      if (nailArea < 800) sizeMultiplier = 0.4;
      else if (nailArea < 1500) sizeMultiplier = 0.6;
      else if (nailArea > 3000) sizeMultiplier = 1.1;

      // Hand position multiplier (reduce expansion for angled hands)
      const positionMultiplier = handAnalysis.isAngledHand ? 0.6 : 1.0;

      // Nail density multiplier (reduce expansion if nails are close together)
      const densityMultiplier = handAnalysis.nailDensity > 0.7 ? 0.7 : 1.0;

      // Edge detection multiplier (reduce expansion near detected edges)
      const edgeMultiplier = NailPolygonUtils.detectNailBoundaryRisk(points, nailIndex);

      // Combine all factors
      const finalMultiplier = sizeMultiplier * positionMultiplier * densityMultiplier * edgeMultiplier;
      const adaptedExpansion = baseExpansionAmount * finalMultiplier;

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

          // Smart corner expansion based on hand analysis
          const prevDir = Math.atan2(current.y - prev.y, current.x - prev.x);
          const nextDir = Math.atan2(next.y - current.y, next.x - current.x);
          let angleDiff = Math.abs(nextDir - prevDir);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

          // Reduce corner expansion for risky scenarios
          const maxCornerMultiplier = handAnalysis.isAngledHand ? 0.1 : 0.3;
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
      //console.log('Error in intelligent adaptive expansion:', error);
      return points;
    }
  },

  // Method 11: Analyze overall hand position and arrangement
  analyzeHandPosition: (allNailPolygons, imageDimensions) => {
    try {
      if (!allNailPolygons || allNailPolygons.length === 0) {
        return { isAngledHand: false, nailDensity: 0.5, handOrientation: 'flat' };
      }

      // Calculate overall nail distribution
      let totalMinX = Infinity, totalMaxX = -Infinity;
      let totalMinY = Infinity, totalMaxY = -Infinity;
      let totalArea = 0;

      allNailPolygons.forEach(nail => {
        const bounds = {
          minX: Math.min(...nail.map(p => p?.x || 0)),
          minY: Math.min(...nail.map(p => p?.y || 0)),
          maxX: Math.max(...nail.map(p => p?.x || 0)),
          maxY: Math.max(...nail.map(p => p?.y || 0))
        };

        totalMinX = Math.min(totalMinX, bounds.minX);
        totalMaxX = Math.max(totalMaxX, bounds.maxX);
        totalMinY = Math.min(totalMinY, bounds.minY);
        totalMaxY = Math.max(totalMaxY, bounds.maxY);
        totalArea += (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
      });

      const handWidth = totalMaxX - totalMinX;
      const handHeight = totalMaxY - totalMinY;
      const aspectRatio = handWidth / handHeight;

      // Detect angled hand (when nails are arranged more vertically)
      const isAngledHand = aspectRatio < 1.2; // More vertical = angled

      // Calculate nail density (how tightly packed nails are)
      const handBoundingArea = handWidth * handHeight;
      const nailDensity = totalArea / handBoundingArea;

      // Determine orientation
      const handOrientation = aspectRatio > 2 ? 'horizontal' : aspectRatio < 0.8 ? 'vertical' : 'angled';

      return {
        isAngledHand,
        nailDensity: Math.min(1.0, nailDensity),
        handOrientation,
        aspectRatio
      };
    } catch (error) {
      //console.log('Error analyzing hand position:', error);
      return { isAngledHand: false, nailDensity: 0.5, handOrientation: 'flat' };
    }
  },

  // Method 12: Detect risk of expansion going beyond nail boundaries
  detectNailBoundaryRisk: (points, nailIndex) => {
    try {
      // Analyze nail shape to detect risk areas
      const centroid = {
        x: points.reduce((sum, p) => sum + (p?.x || 0), 0) / points.length,
        y: points.reduce((sum, p) => sum + (p?.y || 0), 0) / points.length
      };

      let riskScore = 1.0; // Start with full expansion

      // Check for irregular nail shapes (high risk for spillover)
      let irregularityScore = 0;
      for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];

        const currentDist = Math.sqrt(Math.pow(current.x - centroid.x, 2) + Math.pow(current.y - centroid.y, 2));
        const nextDist = Math.sqrt(Math.pow(next.x - centroid.x, 2) + Math.pow(next.y - centroid.y, 2));

        const distDiff = Math.abs(currentDist - nextDist);
        irregularityScore += distDiff;
      }

      const avgIrregularity = irregularityScore / points.length;

      // High irregularity = reduce expansion
      if (avgIrregularity > 15) riskScore *= 0.6; // Very irregular
      else if (avgIrregularity > 8) riskScore *= 0.8; // Somewhat irregular

      // Thumb and pinky typically need more conservative expansion
      if (nailIndex === 0 || nailIndex === 4) riskScore *= 0.8;

      return Math.max(0.3, riskScore); // Never go below 30% expansion
    } catch (error) {
      //console.log('Error detecting boundary risk:', error);
      return 0.8; // Conservative fallback
    }
  },

  // =================== IMAGE ANALYSIS METHODS ===================

  // Method 13: Color-based nail boundary detection
  detectNailBoundariesFromColor: (imageUri, polygon, sampleRadius = 8) => {
    try {
      // This is a conceptual implementation
      // In React Native, we'd need to use a library like react-native-image-manipulator
      // or process image data through native modules

      //console.log('Starting color-based boundary detection for nail polygon');

      // Sample colors around polygon edges
      const edgeSamples = NailPolygonUtils.sampleColorsAroundEdges(imageUri, polygon, sampleRadius);

      if (!edgeSamples || edgeSamples.length < 3) {
        return { boundaries: null, confidence: 0, method: 'color-analysis-failed' };
      }

      // Analyze color gradients to find skin-nail boundaries
      const colorBoundaries = NailPolygonUtils.analyzeColorGradients(edgeSamples);

      // Calculate confidence based on color distinction
      const confidence = NailPolygonUtils.calculateColorConfidence(colorBoundaries);

      return {
        boundaries: colorBoundaries,
        confidence: confidence,
        method: 'color-analysis',
        edgeSamples: edgeSamples
      };
    } catch (error) {
      //console.log('Error in color-based boundary detection:', error);
      return { boundaries: null, confidence: 0, method: 'color-analysis-error' };
    }
  },

  // Method 14: Sample colors around polygon edges
  sampleColorsAroundEdges: (imageUri, polygon, sampleRadius = 8) => {
    try {
      // Conceptual implementation - would need actual image processing
      const samples = [];

      for (let i = 0; i < polygon.length; i++) {
        const point = polygon[i];
        const nextPoint = polygon[(i + 1) % polygon.length];

        // Sample points along the edge
        const edgeLength = Math.sqrt(
          Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
        );

        const numSamples = Math.max(3, Math.floor(edgeLength / 10));

        for (let j = 0; j < numSamples; j++) {
          const t = j / (numSamples - 1);
          const sampleX = point.x + (nextPoint.x - point.x) * t;
          const sampleY = point.y + (nextPoint.y - point.y) * t;

          // Calculate normal direction (outward from nail)
          const edgeVecX = nextPoint.x - point.x;
          const edgeVecY = nextPoint.y - point.y;
          const edgeLength = Math.sqrt(edgeVecX * edgeVecX + edgeVecY * edgeVecY);

          if (edgeLength > 0) {
            const normalX = -edgeVecY / edgeLength;
            const normalY = edgeVecX / edgeLength;

            samples.push({
              x: sampleX,
              y: sampleY,
              normalX: normalX,
              normalY: normalY,
              edgeIndex: i,
              // In real implementation, would sample actual pixel colors here
              insideColor: { r: 255, g: 200, b: 180 }, // Placeholder nail color
              outsideColor: { r: 210, g: 180, b: 160 } // Placeholder skin color
            });
          }
        }
      }

      return samples;
    } catch (error) {
      //console.log('Error sampling colors around edges:', error);
      return [];
    }
  },

  // Method 15: Analyze color gradients to find boundaries
  analyzeColorGradients: (edgeSamples) => {
    try {
      const boundaries = [];

      edgeSamples.forEach(sample => {
        // Calculate color difference between inside and outside
        const colorDiff = NailPolygonUtils.calculateColorDistance(
          sample.insideColor,
          sample.outsideColor
        );

        // If color difference is significant, this is likely a real boundary
        if (colorDiff > 30) { // Threshold for significant color change
          boundaries.push({
            x: sample.x,
            y: sample.y,
            strength: colorDiff,
            normal: { x: sample.normalX, y: sample.normalY },
            safeBoundary: {
              x: sample.x - sample.normalX * 2, // Pull back 2px from detected edge
              y: sample.y - sample.normalY * 2
            }
          });
        }
      });

      return boundaries;
    } catch (error) {
      //console.log('Error analyzing color gradients:', error);
      return [];
    }
  },

  // Method 16: Calculate color distance between two RGB colors
  calculateColorDistance: (color1, color2) => {
    const rDiff = color1.r - color2.r;
    const gDiff = color1.g - color2.g;
    const bDiff = color1.b - color2.b;

    // Euclidean distance in RGB space
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
  },

  // Method 17: Calculate confidence score for color-based detection
  calculateColorConfidence: (colorBoundaries) => {
    if (!colorBoundaries || colorBoundaries.length === 0) return 0;

    // Calculate average boundary strength
    const avgStrength = colorBoundaries.reduce((sum, boundary) => sum + boundary.strength, 0) / colorBoundaries.length;

    // Calculate coverage (what percentage of nail edge has clear boundaries)
    const coverage = Math.min(1.0, colorBoundaries.length / 20); // Assume ~20 samples for full coverage

    // Confidence based on strength and coverage
    const strengthScore = Math.min(1.0, avgStrength / 60); // Max strength = 60
    const confidenceScore = (strengthScore * 0.7 + coverage * 0.3);

    return confidenceScore;
  },

  // Method 18: Edge gradient analysis for nail boundaries
  detectNailBoundariesFromGradients: (imageUri, polygon) => {
    try {
      //console.log('Starting gradient-based boundary detection');

      // Conceptual implementation - would need actual image gradient calculation
      const gradientSamples = NailPolygonUtils.calculateImageGradients(imageUri, polygon);

      if (!gradientSamples || gradientSamples.length < 3) {
        return { boundaries: null, confidence: 0, method: 'gradient-analysis-failed' };
      }

      // Find strong edges that indicate nail boundaries
      const edgeBoundaries = NailPolygonUtils.findStrongEdges(gradientSamples);

      // Calculate confidence based on edge strength and consistency
      const confidence = NailPolygonUtils.calculateGradientConfidence(edgeBoundaries);

      return {
        boundaries: edgeBoundaries,
        confidence: confidence,
        method: 'gradient-analysis',
        gradientSamples: gradientSamples
      };
    } catch (error) {
      //console.log('Error in gradient-based boundary detection:', error);
      return { boundaries: null, confidence: 0, method: 'gradient-analysis-error' };
    }
  },

  // Method 19: Calculate image gradients around polygon
  calculateImageGradients: (imageUri, polygon) => {
    try {
      // Conceptual implementation - would use actual image processing
      const gradients = [];

      for (let i = 0; i < polygon.length; i++) {
        const point = polygon[i];

        // In real implementation, would calculate actual image gradients
        // For now, simulate gradient strength based on polygon irregularity
        const prev = polygon[(i - 1 + polygon.length) % polygon.length];
        const next = polygon[(i + 1) % polygon.length];

        const curvature = NailPolygonUtils.calculatePointCurvature(prev, point, next);

        gradients.push({
          x: point.x,
          y: point.y,
          gradientMagnitude: Math.abs(curvature) * 50, // Simulate gradient strength
          gradientDirection: Math.atan2(next.y - prev.y, next.x - prev.x),
          edgeStrength: Math.min(100, Math.abs(curvature) * 100)
        });
      }

      return gradients;
    } catch (error) {
      //console.log('Error calculating image gradients:', error);
      return [];
    }
  },

  // Method 20: Calculate point curvature for gradient simulation
  calculatePointCurvature: (p1, p2, p3) => {
    const v1x = p1.x - p2.x;
    const v1y = p1.y - p2.y;
    const v2x = p3.x - p2.x;
    const v2y = p3.y - p2.y;

    const cross = v1x * v2y - v1y * v2x;
    const dot = v1x * v2x + v1y * v2y;

    return Math.atan2(cross, dot);
  },

  // Method 21: Find strong edges from gradient data
  findStrongEdges: (gradientSamples) => {
    try {
      const strongEdges = [];
      const threshold = 40; // Minimum gradient strength for strong edge

      gradientSamples.forEach(sample => {
        if (sample.gradientMagnitude > threshold) {
          strongEdges.push({
            x: sample.x,
            y: sample.y,
            strength: sample.gradientMagnitude,
            direction: sample.gradientDirection,
            safeBoundary: {
              x: sample.x - Math.cos(sample.gradientDirection) * 3,
              y: sample.y - Math.sin(sample.gradientDirection) * 3
            }
          });
        }
      });

      return strongEdges;
    } catch (error) {
      //console.log('Error finding strong edges:', error);
      return [];
    }
  },

  // Method 22: Calculate confidence for gradient-based detection
  calculateGradientConfidence: (edgeBoundaries) => {
    if (!edgeBoundaries || edgeBoundaries.length === 0) return 0;

    // Calculate average edge strength
    const avgStrength = edgeBoundaries.reduce((sum, edge) => sum + edge.strength, 0) / edgeBoundaries.length;

    // Calculate consistency (how uniform are the edge strengths)
    const strengthVariance = edgeBoundaries.reduce((sum, edge) => {
      return sum + Math.pow(edge.strength - avgStrength, 2);
    }, 0) / edgeBoundaries.length;

    const consistency = Math.max(0, 1 - (strengthVariance / 1000)); // Normalize variance

    // Coverage score
    const coverage = Math.min(1.0, edgeBoundaries.length / 15);

    // Final confidence
    const strengthScore = Math.min(1.0, avgStrength / 80);
    return (strengthScore * 0.5 + consistency * 0.3 + coverage * 0.2);
  },

  // =================== HYBRID SYSTEM INTEGRATION ===================

  // Method 23: Main hybrid nail boundary detection and expansion
  hybridNailExpansion: (points, allNailPolygons = [], nailIndex = 0, imageDimensions = {}, imageUri = null, baseExpansionAmount = 6) => {
    try {
      //console.log(`Starting hybrid expansion for nail ${nailIndex}`);

      // Phase 1: Try image analysis first
      let imageAnalysisResult = null;
      let finalExpansion = null;

      if (imageUri) {
        // Try color-based analysis
        const colorAnalysis = NailPolygonUtils.detectNailBoundariesFromColor(imageUri, points);

        // Try gradient-based analysis
        const gradientAnalysis = NailPolygonUtils.detectNailBoundariesFromGradients(imageUri, points);

        // Combine results and calculate overall confidence
        imageAnalysisResult = NailPolygonUtils.combineImageAnalysisResults(colorAnalysis, gradientAnalysis);

        //console.log(`Image analysis confidence: ${(imageAnalysisResult.confidence * 100).toFixed(1)}%`);

        // Use image-guided expansion if confidence is high enough
        if (imageAnalysisResult.confidence > 0.6) {
          finalExpansion = NailPolygonUtils.expandWithImageGuidance(
            points,
            imageAnalysisResult,
            baseExpansionAmount
          );
          //console.log(`Using image-guided expansion for nail ${nailIndex}`);
        }
      }

      // Phase 2: Fall back to intelligent geometric expansion
      if (!finalExpansion) {
        //console.log(`Falling back to geometric expansion for nail ${nailIndex}`);
        finalExpansion = NailPolygonUtils.intelligentAdaptiveExpansion(
          points,
          allNailPolygons,
          nailIndex,
          imageDimensions,
          baseExpansionAmount
        );
      }

      // Phase 3: Apply safety constraints
      const safeExpansion = NailPolygonUtils.applySafetyConstraints(
        finalExpansion,
        points,
        imageAnalysisResult
      );

      return {
        expandedPoints: safeExpansion,
        confidence: imageAnalysisResult?.confidence || 0.5,
        method: imageAnalysisResult?.confidence > 0.6 ? 'image-guided' : 'geometric-fallback',
        analysisResults: imageAnalysisResult
      };

    } catch (error) {
      //console.log('Error in hybrid nail expansion:', error);
      // Ultimate fallback - conservative expansion
      return {
        expandedPoints: NailPolygonUtils.expandPolygonSimple(points, baseExpansionAmount * 0.5),
        confidence: 0.3,
        method: 'conservative-fallback',
        analysisResults: null
      };
    }
  },

  // Method 24: Combine color and gradient analysis results
  combineImageAnalysisResults: (colorAnalysis, gradientAnalysis) => {
    try {
      const colorConf = colorAnalysis.confidence || 0;
      const gradientConf = gradientAnalysis.confidence || 0;

      // Weight color analysis more heavily as it's more reliable for skin detection
      const combinedConfidence = (colorConf * 0.7 + gradientConf * 0.3);

      // Combine boundaries from both methods
      const combinedBoundaries = [];

      if (colorAnalysis.boundaries) {
        combinedBoundaries.push(...colorAnalysis.boundaries.map(b => ({...b, source: 'color'})));
      }

      if (gradientAnalysis.boundaries) {
        combinedBoundaries.push(...gradientAnalysis.boundaries.map(b => ({...b, source: 'gradient'})));
      }

      return {
        confidence: combinedConfidence,
        boundaries: combinedBoundaries,
        method: 'combined-analysis',
        colorAnalysis: colorAnalysis,
        gradientAnalysis: gradientAnalysis
      };
    } catch (error) {
      //console.log('Error combining image analysis results:', error);
      return {
        confidence: 0,
        boundaries: [],
        method: 'combination-failed'
      };
    }
  },

  // Method 25: Expand polygon using image analysis guidance
  expandWithImageGuidance: (points, imageAnalysis, baseExpansionAmount) => {
    try {
      if (!imageAnalysis.boundaries || imageAnalysis.boundaries.length === 0) {
        return NailPolygonUtils.expandPolygonSimple(points, baseExpansionAmount);
      }

      const expandedPoints = [];

      for (let i = 0; i < points.length; i++) {
        const point = points[i];

        // Find nearest detected boundary
        let nearestBoundary = null;
        let minDistance = Infinity;

        imageAnalysis.boundaries.forEach(boundary => {
          const distance = Math.sqrt(
            Math.pow(point.x - boundary.x, 2) + Math.pow(point.y - boundary.y, 2)
          );

          if (distance < minDistance) {
            minDistance = distance;
            nearestBoundary = boundary;
          }
        });

        if (nearestBoundary && minDistance < 20) {
          // Use the safe boundary from image analysis
          expandedPoints.push({
            x: nearestBoundary.safeBoundary.x,
            y: nearestBoundary.safeBoundary.y
          });
        } else {
          // No nearby boundary detected, use conservative geometric expansion
          const centroid = {
            x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
            y: points.reduce((sum, p) => sum + p.y, 0) / points.length
          };

          const dirX = point.x - centroid.x;
          const dirY = point.y - centroid.y;
          const distance = Math.sqrt(dirX * dirX + dirY * dirY);

          if (distance > 0) {
            const conservativeExpansion = baseExpansionAmount * 0.7; // More conservative
            const normalizedX = dirX / distance;
            const normalizedY = dirY / distance;

            expandedPoints.push({
              x: point.x + normalizedX * conservativeExpansion,
              y: point.y + normalizedY * conservativeExpansion
            });
          } else {
            expandedPoints.push(point);
          }
        }
      }

      return expandedPoints;
    } catch (error) {
      //console.log('Error in image-guided expansion:', error);
      return NailPolygonUtils.expandPolygonSimple(points, baseExpansionAmount);
    }
  },

  // Method 26: Apply final safety constraints
  applySafetyConstraints: (expandedPoints, originalPoints, imageAnalysis) => {
    try {
      // Calculate expansion ratio to ensure we don't expand too much
      const originalArea = NailPolygonUtils.calculatePolygonArea(originalPoints);
      const expandedArea = NailPolygonUtils.calculatePolygonArea(expandedPoints);
      const expansionRatio = expandedArea / originalArea;

      // If expansion is excessive, scale it back
      const maxExpansionRatio = imageAnalysis?.confidence > 0.7 ? 3.0 : 2.5;

      if (expansionRatio > maxExpansionRatio) {
        //console.log(`Scaling back excessive expansion: ${expansionRatio.toFixed(2)} -> ${maxExpansionRatio}`);

        const scaleFactor = Math.sqrt(maxExpansionRatio / expansionRatio);

        const centroid = {
          x: originalPoints.reduce((sum, p) => sum + p.x, 0) / originalPoints.length,
          y: originalPoints.reduce((sum, p) => sum + p.y, 0) / originalPoints.length
        };

        return expandedPoints.map(point => ({
          x: centroid.x + (point.x - centroid.x) * scaleFactor,
          y: centroid.y + (point.y - centroid.y) * scaleFactor
        }));
      }

      return expandedPoints;
    } catch (error) {
      //console.log('Error applying safety constraints:', error);
      return expandedPoints;
    }
  },

  // Method 27: Calculate polygon area for safety checks
  calculatePolygonArea: (points) => {
    if (!points || points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  },

  // Method 28: Precision nail expansion with edge analysis
  precisionNailExpansion: (points, nailIndex = 0, allNailPolygons = []) => {
    if (!points || points.length < 3) return points;

    try {
      // Analyze nail characteristics for precision adjustments
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

      // Calculate centroid
      const centroid = {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length
      };

      // Analyze nail shape quality and edge characteristics
      const shapeAnalysis = NailPolygonUtils.analyzeNailShape(points, centroid);

      // Calculate precision expansion parameters
      let baseExpansion;
      if (nailArea < 1000) baseExpansion = 8;       // Small nails (pinky)
      else if (nailArea < 2000) baseExpansion = 6;  // Medium nails (ring, middle)
      else if (nailArea < 3500) baseExpansion = 5;  // Large nails (index)
      else baseExpansion = 4;                       // Very large nails (thumb)

      // Shape-based adjustments
      const shapeMultiplier = shapeAnalysis.isRegular ? 1.0 : 0.8;
      const edgeQualityMultiplier = shapeAnalysis.hasSharpEdges ? 0.9 : 1.1;

      const finalExpansion = baseExpansion * shapeMultiplier * edgeQualityMultiplier;

      // Apply precision expansion with per-point analysis
      const expandedPoints = [];

      for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const prev = points[(i - 1 + points.length) % points.length];
        const next = points[(i + 1) % points.length];

        // Calculate local curvature and edge characteristics
        const localCurvature = NailPolygonUtils.calculateLocalCurvature(prev, current, next);
        const edgeAngle = NailPolygonUtils.calculateEdgeAngle(prev, current, next);

        // Adjust expansion based on local characteristics
        let pointExpansion = finalExpansion;

        // Reduce expansion at sharp corners to prevent spillover
        if (Math.abs(localCurvature) > 0.5) {
          pointExpansion *= 0.7;
        }

        // Increase expansion at concave areas to ensure coverage
        if (localCurvature < -0.2) {
          pointExpansion *= 1.2;
        }

        // Calculate expansion direction
        const dirX = current.x - centroid.x;
        const dirY = current.y - centroid.y;
        const distance = Math.sqrt(dirX * dirX + dirY * dirY);

        if (distance > 0) {
          const normalizedX = dirX / distance;
          const normalizedY = dirY / distance;

          expandedPoints.push({
            x: current.x + normalizedX * pointExpansion,
            y: current.y + normalizedY * pointExpansion
          });
        } else {
          expandedPoints.push(current);
        }
      }

      // Apply final refinement passes
      let refinedPoints = NailPolygonUtils.smoothPolygonEdges(expandedPoints, 1);
      refinedPoints = NailPolygonUtils.dilatePolygonEnhanced(refinedPoints, 2);

      return refinedPoints;

    } catch (error) {
      //console.log('Error in precision nail expansion:', error);
      return NailPolygonUtils.expandPolygonSimple(points, 6);
    }
  },

  // Method 29: Analyze nail shape characteristics
  analyzeNailShape: (points, centroid) => {
    try {
      const distances = points.map(point =>
        Math.sqrt(Math.pow(point.x - centroid.x, 2) + Math.pow(point.y - centroid.y, 2))
      );

      const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
      const maxDistance = Math.max(...distances);
      const minDistance = Math.min(...distances);

      // Calculate shape regularity
      const distanceVariance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
      const isRegular = distanceVariance < (avgDistance * 0.15);

      // Detect sharp edges
      let sharpEdges = 0;
      for (let i = 0; i < points.length; i++) {
        const prev = points[(i - 1 + points.length) % points.length];
        const current = points[i];
        const next = points[(i + 1) % points.length];

        const angle = NailPolygonUtils.calculateEdgeAngle(prev, current, next);
        if (Math.abs(angle) > Math.PI * 0.6) {
          sharpEdges++;
        }
      }

      const hasSharpEdges = sharpEdges > points.length * 0.2;

      return {
        isRegular,
        hasSharpEdges,
        avgDistance,
        distanceVariance,
        sharpEdgeCount: sharpEdges
      };

    } catch (error) {
      //console.log('Error analyzing nail shape:', error);
      return { isRegular: true, hasSharpEdges: false, avgDistance: 50, distanceVariance: 0, sharpEdgeCount: 0 };
    }
  },

  // Method 30: Calculate local curvature at a point
  calculateLocalCurvature: (p1, p2, p3) => {
    try {
      const v1x = p1.x - p2.x;
      const v1y = p1.y - p2.y;
      const v2x = p3.x - p2.x;
      const v2y = p3.y - p2.y;

      const cross = v1x * v2y - v1y * v2x;
      const dot = v1x * v2x + v1y * v2y;

      return Math.atan2(cross, dot);
    } catch (error) {
      return 0;
    }
  },

  // Method 31: Calculate edge angle at a point
  calculateEdgeAngle: (p1, p2, p3) => {
    try {
      const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
      let angleDiff = angle2 - angle1;

      // Normalize to [-π, π]
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      return angleDiff;
    } catch (error) {
      return 0;
    }
  },

  // =================== ENHANCED BOUNDARY VALIDATION ===================

  // Method 32: Intelligent expansion with boundary validation
  intelligentExpansionWithValidation: (points, baseExpansion = 6, nailIndex = 0, allNails = []) => {
    if (!points || points.length < 3) return points;

    try {
      // Step 1: Calculate initial expansion
      let expandedPoints = NailPolygonUtils.expandPolygonSimple(points, baseExpansion);

      // Step 2: Check for potential overlaps with nearby nails
      if (allNails.length > 1) {
        expandedPoints = NailPolygonUtils.validateNailSeparation(expandedPoints, points, allNails, nailIndex);
      }

      // Step 3: Ensure complete coverage while preventing overshooting
      expandedPoints = NailPolygonUtils.validateCoverage(expandedPoints, points);

      // Step 4: Apply edge refinement
      expandedPoints = NailPolygonUtils.refineEdgeQuality(expandedPoints, points);

      return expandedPoints;
    } catch (error) {
      //console.log('Error in intelligent expansion with validation:', error);
      return NailPolygonUtils.expandPolygonSimple(points, baseExpansion * 0.8);
    }
  },

  // Method 33: Validate nail separation to prevent overlap
  validateNailSeparation: (expandedPoints, originalPoints, allNails, currentNailIndex) => {
    try {
      const validatedPoints = [];
      const currentCentroid = {
        x: originalPoints.reduce((sum, p) => sum + p.x, 0) / originalPoints.length,
        y: originalPoints.reduce((sum, p) => sum + p.y, 0) / originalPoints.length
      };

      for (let i = 0; i < expandedPoints.length; i++) {
        const point = expandedPoints[i];
        let isValid = true;
        let minDistanceToOtherNail = Infinity;

        // Check distance to other nails
        for (let nailIdx = 0; nailIdx < allNails.length; nailIdx++) {
          if (nailIdx === currentNailIndex) continue;

          const otherNail = allNails[nailIdx];
          if (!otherNail || otherNail.length < 3) continue;

          // Calculate distance to other nail boundary
          const distanceToNail = NailPolygonUtils.pointToPolygonDistance(point, otherNail);
          minDistanceToOtherNail = Math.min(minDistanceToOtherNail, distanceToNail);

          // If too close to another nail, mark as invalid
          if (distanceToNail < 8) {
            isValid = false;
            break;
          }
        }

        if (isValid) {
          validatedPoints.push(point);
        } else {
          // Pull back the point towards original nail
          const originalPoint = originalPoints[i];
          const directionX = (originalPoint.x - currentCentroid.x);
          const directionY = (originalPoint.y - currentCentroid.y);
          const distance = Math.sqrt(directionX * directionX + directionY * directionY);

          if (distance > 0) {
            const normalizedX = directionX / distance;
            const normalizedY = directionY / distance;

            // Conservative expansion when near other nails
            const safeExpansion = Math.min(3, minDistanceToOtherNail * 0.4);

            validatedPoints.push({
              x: originalPoint.x + normalizedX * safeExpansion,
              y: originalPoint.y + normalizedY * safeExpansion
            });
          } else {
            validatedPoints.push(originalPoint);
          }
        }
      }

      return validatedPoints;
    } catch (error) {
      //console.log('Error validating nail separation:', error);
      return expandedPoints;
    }
  },

  // Method 34: Calculate distance from point to polygon
  pointToPolygonDistance: (point, polygon) => {
    try {
      let minDistance = Infinity;

      for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];

        // Distance from point to line segment
        const distance = NailPolygonUtils.pointToLineDistance(point, p1, p2);
        minDistance = Math.min(minDistance, distance);
      }

      return minDistance;
    } catch (error) {
      return Infinity;
    }
  },

  // Method 35: Calculate distance from point to line segment
  pointToLineDistance: (point, lineStart, lineEnd) => {
    try {
      const A = point.x - lineStart.x;
      const B = point.y - lineStart.y;
      const C = lineEnd.x - lineStart.x;
      const D = lineEnd.y - lineStart.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;

      if (lenSq === 0) {
        // Line start and end are the same point
        return Math.sqrt(A * A + B * B);
      }

      let param = dot / lenSq;

      let xx, yy;

      if (param < 0) {
        xx = lineStart.x;
        yy = lineStart.y;
      } else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
      } else {
        xx = lineStart.x + param * C;
        yy = lineStart.y + param * D;
      }

      const dx = point.x - xx;
      const dy = point.y - yy;
      return Math.sqrt(dx * dx + dy * dy);
    } catch (error) {
      return Infinity;
    }
  },

  // Method 36: Validate coverage to ensure complete nail coverage
  validateCoverage: (expandedPoints, originalPoints) => {
    try {
      // Calculate areas
      const originalArea = NailPolygonUtils.calculatePolygonArea(originalPoints);
      const expandedArea = NailPolygonUtils.calculatePolygonArea(expandedPoints);

      // Check if expansion is sufficient
      const expansionRatio = expandedArea / originalArea;

      // If expansion is too small, we might have undercoverage
      if (expansionRatio < 1.4) {
        //console.log('Detected potential undercoverage, adjusting expansion');

        const centroid = {
          x: originalPoints.reduce((sum, p) => sum + p.x, 0) / originalPoints.length,
          y: originalPoints.reduce((sum, p) => sum + p.y, 0) / originalPoints.length
        };

        // Increase expansion for undercovered areas
        const adjustedPoints = expandedPoints.map((point, index) => {
          const original = originalPoints[index];
          const dirX = original.x - centroid.x;
          const dirY = original.y - centroid.y;
          const distance = Math.sqrt(dirX * dirX + dirY * dirY);

          if (distance > 0) {
            const normalizedX = dirX / distance;
            const normalizedY = dirY / distance;

            // Add additional expansion for coverage
            const additionalExpansion = 2;

            return {
              x: point.x + normalizedX * additionalExpansion,
              y: point.y + normalizedY * additionalExpansion
            };
          }
          return point;
        });

        return adjustedPoints;
      }

      // If expansion is too large, we might have overshoot
      if (expansionRatio > 3.0) {
        //console.log('Detected potential overshoot, reducing expansion');

        const centroid = {
          x: originalPoints.reduce((sum, p) => sum + p.x, 0) / originalPoints.length,
          y: originalPoints.reduce((sum, p) => sum + p.y, 0) / originalPoints.length
        };

        const scaleFactor = Math.sqrt(2.5 / expansionRatio);

        return expandedPoints.map(point => ({
          x: centroid.x + (point.x - centroid.x) * scaleFactor,
          y: centroid.y + (point.y - centroid.y) * scaleFactor
        }));
      }

      return expandedPoints;
    } catch (error) {
      //console.log('Error validating coverage:', error);
      return expandedPoints;
    }
  },

  // Method 37: Refine edge quality for natural appearance
  refineEdgeQuality: (expandedPoints, originalPoints) => {
    try {
      // Calculate original nail characteristics
      const originalBounds = {
        minX: Math.min(...originalPoints.map(p => p.x)),
        minY: Math.min(...originalPoints.map(p => p.y)),
        maxX: Math.max(...originalPoints.map(p => p.x)),
        maxY: Math.max(...originalPoints.map(p => p.y))
      };

      const nailArea = (originalBounds.maxX - originalBounds.minX) * (originalBounds.maxY - originalBounds.minY);

      // Adaptive smoothing based on nail size
      let smoothingPasses = 1;
      let dilationAmount = 2;

      if (nailArea < 1000) {
        // Small nails - minimal processing to preserve detail
        smoothingPasses = 1;
        dilationAmount = 1;
      } else if (nailArea > 3000) {
        // Large nails - more aggressive smoothing
        smoothingPasses = 2;
        dilationAmount = 3;
      }

      // Apply refinement
      let refinedPoints = NailPolygonUtils.smoothPolygonEdges(expandedPoints, smoothingPasses);
      refinedPoints = NailPolygonUtils.dilatePolygonEnhanced(refinedPoints, dilationAmount);

      return refinedPoints;
    } catch (error) {
      //console.log('Error refining edge quality:', error);
      return expandedPoints;
    }
  },

  // Method 38: Main enhanced processing pipeline
  enhancedNailProcessing: (points, nailIndex = 0, allNails = []) => {
    if (!points || points.length < 3) return points;

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

      // Enhanced adaptive expansion calculation
      let baseExpansion;
      if (nailArea < 800) baseExpansion = 8;       // Very small nails
      else if (nailArea < 1500) baseExpansion = 6; // Small nails
      else if (nailArea < 2500) baseExpansion = 5; // Medium nails
      else if (nailArea < 4000) baseExpansion = 4; // Large nails
      else baseExpansion = 3;                      // Very large nails

      // Aspect ratio adjustment
      if (aspectRatio > 2 || aspectRatio < 0.5) {
        baseExpansion *= 1.2; // Unusual shapes need more coverage
      }

      //console.log(`Enhanced processing nail ${nailIndex}: area=${nailArea.toFixed(0)}, baseExpansion=${baseExpansion.toFixed(1)}`);

      // Apply intelligent expansion with validation
      let processedPoints = NailPolygonUtils.intelligentExpansionWithValidation(
        points,
        baseExpansion,
        nailIndex,
        allNails
      );

      return processedPoints;

    } catch (error) {
      //console.log(`Error in enhanced nail processing for nail ${nailIndex}:`, error);
      // Fallback to conservative simple expansion
      return NailPolygonUtils.expandPolygonSimple(points, 4);
    }
  }
};

export default NailPolygonUtils;