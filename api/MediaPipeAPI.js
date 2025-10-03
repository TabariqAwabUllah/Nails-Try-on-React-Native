import { NativeModules } from 'react-native';

const { MediaPipeModule } = NativeModules;

/**
 * Detect finger directions using MediaPipe
 * @param {string} imagePath - Path to the captured image
 * @returns {Promise} - Returns hands with finger directions
 */
export const detectFingerDirections = async (imagePath, imageLabel = 'Image') => {
    try {
        console.log(`🔍 Detecting finger directions with MediaPipe for: ${imageLabel}...`);
        const result = await MediaPipeModule.detectFingerDirections(imagePath);

        // Log detailed results
        console.log(`✅ MediaPipe Detection Complete for ${imageLabel}!`);
        console.log(`📊 Image Size: ${result.imageWidth} x ${result.imageHeight}`);
        console.log(`✋ Detected Hands: ${result.hands.length}`);

        result.hands.forEach((hand, handIndex) => {
            console.log(`\n📍 ${imageLabel} - ${hand.handedness}:`);
            hand.fingers.forEach(finger => {
                console.log(`  ${finger.emoji} ${finger.name.padEnd(8)}: ${finger.direction}`);
            });
        });

        return result;
    } catch (error) {
        console.error(`❌ MediaPipe detection error for ${imageLabel}:`, error);
        throw error;
    }
};

/**
 * Get finger direction in simple terms (UP, DOWN, LEFT, RIGHT)
 * @param {number} angle - Angle in degrees (0-360)
 * @returns {string} - Direction label
 */
export const getDirectionLabel = (angle) => {
    // Normalize angle to 0-360
    const normalized = ((angle % 360) + 360) % 360;
    
    if (normalized >= 315 || normalized < 45) return 'RIGHT';
    if (normalized >= 45 && normalized < 135) return 'DOWN';
    if (normalized >= 135 && normalized < 225) return 'LEFT';
    if (normalized >= 225 && normalized < 315) return 'UP';
    
    return 'UNKNOWN';
};

/**
 * Calculate rotation needed to align design nail with captured finger
 * @param {string} designDirection - Design nail direction (UP/DOWN/LEFT/RIGHT)
 * @param {string} capturedDirection - Captured finger direction (UP/DOWN/LEFT/RIGHT)
 * @returns {number} - Rotation in degrees
 */
export const calculateRotationAlignment = (designDirection, capturedDirection) => {
    // Map directions to angles
    const directionToAngle = {
        'UP': 0,
        'RIGHT': 90,
        'DOWN': 180,
        'LEFT': 270
    };

    const designAngle = directionToAngle[designDirection] || 0;
    const capturedAngle = directionToAngle[capturedDirection] || 0;

    let rotation = capturedAngle - designAngle;

    // Normalize to -180 to 180 range
    if (rotation > 180) rotation -= 360;
    if (rotation < -180) rotation += 360;

    return rotation;
};

/**
 * Match design nails to captured fingers based on position
 * @param {Array} capturedFingers - Fingers from captured image
 * @param {Array} designFingers - Fingers from design image
 * @returns {Array} - Matched pairs with rotation info
 */
export const matchNailsToFingers = (capturedFingers, designFingers) => {
    const matches = [];

    capturedFingers.forEach((captured, index) => {
        if (designFingers[index]) {
            const rotation = calculateRotationAlignment(
                designFingers[index].direction,
                captured.direction
            );

            matches.push({
                capturedFinger: captured.name,
                capturedDirection: captured.direction,
                designDirection: designFingers[index].direction,
                rotationNeeded: rotation,
                capturedPosition: captured.tip,
                designPosition: designFingers[index].tip
            });
        }
    });

    return matches;
};