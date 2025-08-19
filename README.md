# Nail Try‑On (React Native)
**Vision Camera + Roboflow Segmentation — Test App (works perfectly)**

This repository contains a lightweight **testing** app that **works end‑to‑end** to detect nails in a photo and apply virtual polish colors. It uses **react-native-vision-camera** for capture, calls a **Roboflow Instance Segmentation** model for nail masks, and overlays color fills using **react-native-svg**.

> ✅ **Note:** This project is intended for **testing**, but it **works perfectly** on supported devices.

---

## ✨ Features
- Capture a photo with **react-native-vision-camera**.
- Send the image to **Roboflow** for instance segmentation.
- Parse **polygon** masks and overlay them precisely on the original image via **SVG**.
- Tap preset colors to apply **virtual nail polish**.
- Simple, readable implementation that you can adapt into a full app.

---

## 🧠 Model Details

**Source & Training**
- **Platform:** Roboflow Universe / Ulsan High School  
- **Model:** `seg_nail_test/1`  
- **Type:** Roboflow 3.0 **Instance Segmentation (Fast)**  
- **Training Data:** **9,788** nail images  
- **Pre-training:** **COCO-seg** checkpoint  
- **Architecture:** Fast segmentation model (likely **U‑Net** or **YOLOv8**)

**Get your API key:** https://universe.roboflow.com/ulsan-high-school/seg_nail_test/model/1

---

## 🏗️ How It Works (Pipeline)

**Nail Detection → Mask Creation → Design Application**  
1. **Capture** photo with `react-native-vision-camera`.  
2. **Send** image (as Base64) to **Roboflow Serverless API**.  
3. **Extract** polygon coordinates from the response.  
4. **Create** binary masks (conceptually via `cv2.fillPoly()` in native/JS equivalent) / overlay fills with SVG polygons.  
5. **Apply** chosen color & **display** results over the original image.

> In this demo, we overlay **SVG `<Polygon>`** shapes directly using the coordinates from the API and the original image’s width/height in the `viewBox` to avoid scaling issues.

---

## 🧩 Tech Stack
- **React Native**
- **react-native-vision-camera**
- **react-native-svg**
- **react-native-fs**
- **axios**
- **react-native-dotenv** (to load `NAIL_SEG_API_KEY` via `@env`)

---

## 📦 Installation

> Requires a React Native CLI project (not Expo).

```bash
# install dependencies
npm install react-native-vision-camera react-native-svg react-native-fs axios

# for environment variables via @env
npm install --save-dev react-native-dotenv
```

### Babel config (`babel.config.js`)
```js
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
      safe: false,
      allowUndefined: false
    }]
  ]
};
```

### iOS
```bash
cd ios && pod install && cd ..
```
Add usage descriptions in `ios/YourApp/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>We use the camera to capture your nails for try-on.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone permission requested by camera module. (Optional)</string>
```

### Android
In `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" /> <!-- optional -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
```
> `RECORD_AUDIO` is requested by the sample code; you may remove it if not needed.

---

## 🔐 Environment Variables

Create a **`.env`** at the project root:
```
NAIL_SEG_API_KEY=YOUR_ROBOFLOW_API_KEY
```

**Get your API key here:** https://universe.roboflow.com/ulsan-high-school/seg_nail_test/model/1

Import in code:
```js
import { NAIL_SEG_API_KEY } from '@env';
```

---

## 🔌 Roboflow API (Example)

Your `imageAPI` helper (simplified example) might look like this:
```js
import axios from 'axios';
import RNFS from 'react-native-fs';
import { NAIL_SEG_API_KEY } from '@env';

export async function imageAPI(imagePath) {
  const base64 = await RNFS.readFile(imagePath, 'base64');
  const url = `https://serverless.roboflow.com/ulsan-high-school/seg_nail_test/1?api_key=${NAIL_SEG_API_KEY}`;

  const res = await axios({
    method: 'POST',
    url,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: base64,            // Roboflow accepts raw base64 body for serverless endpoint
  });

  return res.data;           // { image: {width, height}, predictions: [{points: [{x,y}, ...]}, ...] }
}
```

> Adjust to your exact Roboflow serverless integration and content type as needed.

---

## 🧱 Component Usage

This repo’s core UI is the `Cam` component. It:
- Requests camera & (optionally) microphone permissions
- Captures a photo
- Sends it to Roboflow via `imageAPI`
- Overlays polygon fills for detected nails using `react-native-svg`
- Lets the user pick a color

**Example:**
```jsx
import Cam from './src/components/Cam';

export default function App() {
  return <Cam showCamera={true} />;
}
```

---

## 🖼️ Polygon Overlay Notes

- The SVG uses:
  ```jsx
  <Svg viewBox={`0 0 ${originalImageDimensions.width} ${originalImageDimensions.height}`}>
    <Polygon points="x1,y1 x2,y2 ..." fill={selectedColor} fillOpacity={0.7} />
  </Svg>
  ```
- **Important:** Use the **original image width/height** from the Roboflow response for the `viewBox`. This ensures **1:1 alignment** between polygon coordinates and the image, avoiding scaling/offset bugs.

---

## 📤 Expected API Response (Shape)

```jsonc
{
  "image": { "width": 1080, "height": 1440 },
  "predictions": [
    {
      "points": [
        { "x": 123.4, "y": 456.7 },
        { "x": 130.0, "y": 460.2 }
        // ...
      ]
    }
    // ... more nails
  ]
}
```

Your code maps polygons via:
```js
const polygons = roboflowResponse.predictions.map(pred => pred.points);
setOriginalImageDimensions({ width: roboflowResponse.image.width, height: roboflowResponse.image.height });
```

---

## 🧭 Files of Interest

- `src/components/Cam.jsx` — camera capture, API call, SVG overlay, color picker
- `src/api/API.js` — `imageAPI(imagePath)` implementation (calls Roboflow)

---

## 🧪 Status

This app is **for testing**, but **works perfectly** on supported devices.

---

## 🛠️ Troubleshooting

- **“No camera device found.”**  
  Ensure a physical device is connected; emulators often lack full camera support.
- **Permission issues**  
  Confirm you granted **camera** (and optionally **microphone**) permissions.
- **Polygons misaligned**  
  Double-check you’re using the **original** image dimensions from the API in your SVG `viewBox`.
- **Performance**  
  Large images can be slow to upload. Consider resizing/compressing before sending.

---

## 🗺️ Roadmap / Ideas
- Texture/gradient polish fills
- Edge feathering / anti‑aliasing
- Model upgrade & confidence thresholds
- In‑app gallery & share
- Real‑time preview with frame processors (Vision Camera)

---

## 🙏 Credits
- **Roboflow Universe** (Ulsan High School) — model hosting & training
- You & the open-source community 🫶

---

## 📄 License
MIT (or your preferred license)

## Author

**Name:** Tabarak Awab Ullah  
**Email:** [Tabariqawabullah@gmail.com](mailto:Tabariqawabullah@gmail.com)  

If you use this project or find it helpful, feel free to reach out for collaboration, feedback, or improvements!
