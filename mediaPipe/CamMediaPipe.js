import { StyleSheet, Text, View } from 'react-native'
import React, { useState } from 'react'

const CamMediaPipe = ({showCamera=false}) => {
    
    const [cameraOn, setCameraOn] = useState(showCamera);


  return (
    <View>
      <Text>CamMediaPipe</Text>
    </View>
  )
}

export default CamMediaPipe

const styles = StyleSheet.create({})