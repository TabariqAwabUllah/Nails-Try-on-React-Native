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
  }
};

export default NailPolygonUtils;