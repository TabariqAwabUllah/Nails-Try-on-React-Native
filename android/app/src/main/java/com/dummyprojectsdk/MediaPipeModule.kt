package com.dummyprojectsdk

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.facebook.react.bridge.*
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import kotlin.math.atan2
import kotlin.math.sqrt

class MediaPipeModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    private var handLandmarker: HandLandmarker? = null

    override fun getName(): String = "MediaPipeModule"

    init {
        initializeHandLandmarker()
    }
    private fun initializeHandLandmarker() {
        try {
            val options = HandLandmarker.HandLandmarkerOptions.builder()
                .setBaseOptions(
                    BaseOptions.builder()
                        .setModelAssetPath("hand_landmarker.task")
                        .build()
                )
                .setRunningMode(RunningMode.IMAGE)
                .setNumHands(2)
                .setMinHandDetectionConfidence(0.5f)
                .setMinHandPresenceConfidence(0.5f)
                .setMinTrackingConfidence(0.5f)
                .build()

            handLandmarker = HandLandmarker.createFromOptions(
                reactApplicationContext,
                options
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    @ReactMethod
    fun detectFingerDirections(imagePath: String, promise: Promise) {
        try {
            val cleanPath = imagePath.replace("file://", "")
            val bitmap = BitmapFactory.decodeFile(cleanPath)
            
            if (bitmap == null) {
                promise.reject("IMAGE_ERROR", "Failed to load image")
                return
            }

            val mpImage = BitmapImageBuilder(bitmap).build()
            val result = handLandmarker?.detect(mpImage) ?: run {
                promise.reject("INIT_ERROR", "HandLandmarker not initialized")
                return
            }

            // Calculate finger directions
            val response = Arguments.createMap()
            val handsArray = Arguments.createArray()

            result.landmarks().forEachIndexed { handIndex, landmarks ->
                val handMap = Arguments.createMap()
                val fingersArray = Arguments.createArray()

                // Define fingers with their landmark indices
                val fingers = listOf(
                    Triple("thumb", 2, 4),      // base, tip
                    Triple("index", 5, 8),
                    Triple("middle", 9, 12),
                    Triple("ring", 13, 16),
                    Triple("pinky", 17, 20)
                )

                fingers.forEach { (name, baseIdx, tipIdx) ->
                    val base = landmarks[baseIdx]
                    val tip = landmarks[tipIdx]

                    // Calculate direction vector
                    val dx = tip.x() - base.x()
                    val dy = tip.y() - base.y()
                    
                    // Calculate angle in degrees (0° = right, 90° = down, etc.)
                    val angle = Math.toDegrees(atan2(dy.toDouble(), dx.toDouble()))
                    
                    // Normalize to 0-360
                    val normalizedAngle = if (angle < 0) angle + 360 else angle

                    // Calculate distance (finger length)
                    val distance = sqrt((dx * dx + dy * dy).toDouble())

                    // Calculate direction label from angle
                    // Corrected mapping based on actual nail orientation testing:
                    // 315-45° = DOWN, 45-135° = LEFT, 135-225° = UP, 225-315° = RIGHT
                    val direction = when {
                        normalizedAngle >= 315 || normalizedAngle < 45 -> "DOWN"   // 315-45° (nail pointing down)
                        normalizedAngle >= 45 && normalizedAngle < 135 -> "LEFT"   // 45-135° (nail pointing left)
                        normalizedAngle >= 135 && normalizedAngle < 225 -> "UP"    // 135-225° (nail pointing up)
                        normalizedAngle >= 225 && normalizedAngle < 315 -> "RIGHT" // 225-315° (nail pointing right)
                        else -> "UNKNOWN"
                    }

                    // Get emoji for direction
                    val emoji = when (direction) {
                        "UP" -> "⬆️"
                        "DOWN" -> "⬇️"
                        "LEFT" -> "⬅️"
                        "RIGHT" -> "➡️"
                        else -> "❓"
                    }

                    // Debug logging
                    android.util.Log.d("MediaPipe", "$name: dx=$dx, dy=$dy, angle=$normalizedAngle°, direction=$direction")

                    val fingerMap = Arguments.createMap().apply {
                        putString("name", name)
                        putDouble("angle", normalizedAngle)
                        putString("direction", direction)
                        putString("emoji", emoji)
                        putDouble("distance", distance)
                        putMap("tip", Arguments.createMap().apply {
                            putDouble("x", (tip.x() * bitmap.width).toDouble())
                            putDouble("y", (tip.y() * bitmap.height).toDouble())
                        })
                        putMap("base", Arguments.createMap().apply {
                            putDouble("x", (base.x() * bitmap.width).toDouble())
                            putDouble("y", (base.y() * bitmap.height).toDouble())
                        })
                    }
                    fingersArray.pushMap(fingerMap)
                }

                handMap.apply {
                    putString("handedness", "Hand_$handIndex")
                    putArray("fingers", fingersArray)
                }
                handsArray.pushMap(handMap)
            }

            response.apply {
                putArray("hands", handsArray)
                putInt("imageWidth", bitmap.width)
                putInt("imageHeight", bitmap.height)
            }

            promise.resolve(response)
        } catch (e: Exception) {
            promise.reject("DETECTION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}


