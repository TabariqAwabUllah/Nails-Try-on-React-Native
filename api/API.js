import axios from "axios";
import RNFS from "react-native-fs";
import { NAIL_SEG_API_KEY } from "@env"; 

// for camera image
export async function imageAPI(imageGot) {
    console.log("imageAPI ", imageGot);
    
    const base64Image = await RNFS.readFile(imageGot, 'base64'); // Uncomment this line if you want to read the image from the device camera
    try {
        const response = await axios({
        method: "POST",
        url: "https://serverless.roboflow.com/seg_nail_test/1",
        params: { api_key: NAIL_SEG_API_KEY},
        data: base64Image, // use if image is from device camera
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
        
        });
        console.log("imageAPI 2");

        return response.data;
    } catch (error) {
        console.log("Error in imageAPI:", error);
        
    }
}


// for designed/url image
export async function imageDesignAPI(imageGot) {
    console.log("imageDesignAPI ", imageGot);
    try {
        console.log("imageDesignAPI 1");
        
        const response = await axios({
        method: "POST",
        url: "https://serverless.roboflow.com/seg_nail_test/1",
        params: { api_key: NAIL_SEG_API_KEY,
            image: imageGot, // use if image is from URL
        },
        // headers: { "Content-Type": "application/x-www-form-urlencoded" }
        
        });
        console.log("imageDesignAPI 2");

        return response.data;
    } catch (err) {
        if (err.response?.status === 503) {
            console.error("Service unavailable, retrying...");
        } else {
        console.error(err);
    }
        
    }
}