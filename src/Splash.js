import React from "react";
import {Platform, StatusBar, Image, View, Text, StyleSheet, Dimensions, ImageBackground} from "react-native";
import DeviceInfo from 'react-native-device-info';

const screenWidth = Math.round(Dimensions.get('window').width);
const screenHeight = Math.round(Dimensions.get('window').height);
var picSize = 0;
if(screenWidth>414 || screenHeight>736) picSize = 257;
else picSize = (screenWidth/2) + 50;

export default class Splash extends React.Component  {
    constructor (props){
        super(props);
		this.state = {
			v: ""
		}
    }
    
    async componentDidMount(){
    	let v = await DeviceInfo.getVersion();
		let b = await DeviceInfo.getBuildNumber();
		if(Platform.OS == "ios"){
			this.setState({v: v + "." + b});
		}else{
			this.setState({v: v});
        }
        

    }
    
    componentWillUnmount(){}
	
    render() {
        return (
            <View style={[styles.container, {flex: 1}]}>
				<StatusBar backgroundColor= 'black' barStyle="light-content" />
                <ImageBackground  style= {styles.backgroundImage} source={require('./assets/bg-worldmap.png')} ></ImageBackground>
				<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Image
							style={{
								width: picSize,
                                height: picSize,
                                transform: [{ scale: 1 }],
								alignSelf: 'center', resizeMode:'contain'
							}} source={require("./assets/logo-pass-black.png")} 
						/>
					</View>
					<View style={{flex: 1, position: 'absolute', bottom: 20}}>
						<Text style={{ fontSize: 15, textAlign: "center"}}>
							Version: {this.state.v}
						</Text>
					</View>
				</View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        flexDirection: "column"
    },
    backgroundImage:{
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: "center",
        alignItems: "center",
        position: 'absolute',
        top: 0,
        opacity: 0.7, 
        backgroundColor: '#D3D3D3'
    },
});