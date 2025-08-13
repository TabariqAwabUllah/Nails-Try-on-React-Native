import axios from "axios";
import RNFS from "react-native-fs";
import { NAIL_SEG_API_KEY } from "@env"; 


export async function imageAPI(image) {
    console.log("imageAPI ");
    
    const base64Image = await RNFS.readFile(image, 'base64');
    try {
        const response = await axios({
        method: "POST",
        url: "https://serverless.roboflow.com/seg_nail_test/1",
        params: { api_key: NAIL_SEG_API_KEY },
        data: base64Image,
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
        
        });

        return response.data;
    } catch (error) {
        console.log("Error in imageAPI:", error);
        
    }
}