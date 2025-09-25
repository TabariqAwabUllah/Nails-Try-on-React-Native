import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import Svg, { Polygon, Image as SvgImage } from 'react-native-svg';

const ColorPic = ({colorPic = false, resultImage, nailPolygons = []}) => {
    //console.log("ColorPic comp / nailPolygons:", nailPolygons);
    
    const [selectedColor, setSelectedColor] = useState(null);
    const [showTestPolygon, setShowTestPolygon] = useState(false);

    
    const colors = [
        { name: 'Red', color: '#FF0000' },
        { name: 'Pink', color: '#FF1493' },
        { name: 'Purple', color: '#800080' },
        { name: 'Blue', color: '#0000FF' },
        { name: 'Green', color: '#00FF00' },
        { name: 'Black', color: '#000000' },
        { name: 'White', color: '#FFFFFF' },
        { name: 'Gold', color: '#FFD700' }
    ];

    const applyColor = (color) => {
        //console.log("applyColor:", color);
        
        setSelectedColor(color);
    };

    if(colorPic){
        return (
        <View style={styles.container}>
            {/* Image with colored nails */}
            {/* <View style={styles.imageContainer}>
                <Svg height="100%" width="100%" viewBox="0 0 640 480">
                    <SvgImage href={resultImage} width="640" height="70%"/>
                    {selectedColor && nailPolygons.map((points, index) => (
                        <Polygon 
                            key={index}
                            points={points.map(p => `${p.x},${p.y}`).join(' ')}
                            fill={selectedColor}
                            fillOpacity="0.7"
                        />
                    ))}
                </Svg>
            </View> */}

            <View style={styles.imageContainer}>
                {//console.log("Image dimensions - Width:", resultImage.width, "Height:", resultImage.height)}

                <Image source={{uri: resultImage}} style={{ width: '100%', height: '100%'}}
                onLoad={(event) => {
                    const { width, height } = event.nativeEvent.source;
                    //console.log("Actual image size:", width, "x", height);
                }}/>
                <Svg height="100%" width="100%" 
                style={{position: 'absolute'}}
                >
                    {/* Test polygon - should show red square */}
                    {/* <Polygon 
                        points="100,100 200,100 200,200 100,200"
                        fill={selectedColor}
                        fillOpacity="0.7"
                    /> */}
                    
                    {/* Your nail polygons */}
                    {selectedColor && nailPolygons.map((points, index) => {
                        // //console.log(`Nail ${index} points:`, points);
                        const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');
                        // //console.log(`Nail ${index} SVG points:`, pointsString);
                        return(
                        <Polygon 
                            key={index}
                            // points={points.map(p => `${p.x/6},${p.y/6}`).join(' ')}
                            points={pointsString}
                            fill={selectedColor}
                            fillOpacity="0.7"
                        />
                        )
                })}
                </Svg>
            </View>
            
            {/* Color selection buttons */}
            <View style={styles.colorContainer}>
                <Text style={styles.title}>Choose nail color:</Text>
                <View style={styles.colorRow}>
                    {colors.slice(0, 4).map((item, index) => (
                        <TouchableOpacity 
                            key={index}
                            style={[styles.colorButton, {backgroundColor: item.color}]}
                            onPress={() => applyColor(item.color)}
                        >
                            <Text style={styles.colorText}>{item.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.colorRow}>
                    {colors.slice(4, 8).map((item, index) => (
                        <TouchableOpacity 
                            key={index}
                            style={[styles.colorButton, {backgroundColor: item.color}]}
                            onPress={() => applyColor(item.color)}
                        >
                            <Text style={styles.colorText}>{item.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
        )
    }
}

export default ColorPic

const styles = StyleSheet.create({
    container: { 
        flex: 1 
    },
    imageContainer: {
        flex: 1
    },
    colorContainer: {
        // backgroundColor: '#f0f0f0',
        position: 'absolute',
        bottom: 0,
        padding: 10,
        height: 150,
        alignSelf: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center'
    },
    colorRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,

        
    },
    colorButton: {
        width: 70,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 5,
    },
    colorText: {
        fontSize: 12,
        fontWeight: 'bold',
        padding: 2,
    }
})