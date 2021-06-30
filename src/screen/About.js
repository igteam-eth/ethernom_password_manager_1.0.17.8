import React, {Component} from 'react';
import {Dimensions, Linking, Image, ImageBackground, View, StatusBar, StyleSheet, TouchableOpacity} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, Content} from 'native-base';

const screenWidth = Math.round(Dimensions.get('window').width);
const screenHeight = Math.round(Dimensions.get('window').height);
var picSize = 0;
if(screenWidth>414 || screenHeight>736) picSize = 257;
else picSize = (screenWidth/2) + 50;

const CONSTANT_ETH_V = 'SDK: v1.1.15'

// ===============================================================
// ==================== RENDER COMPONENT =========================
// ===============================================================
export default class About extends Component {
    constructor (props){
        super(props);
    }

    componentDidMount(){}
    componentWillUnmount(){}
    
    _handle_back = () => {
    	if(global.E_API != null){
    		this.props.navigation.navigate("Vault_Screen");
    	}else{
    		this.props.navigation.navigate("Device_Screen");
    	}
    }
    
    _handle_navigate_settings = () => {
		const { navigate } = this.props.navigation;
		navigate("Settings_Screen");
	}

    render() {
        return (
            <Container>
                <ImageBackground  style= {styles.backgroundImage} source={require('../assets/bg-worldmap.png')} ></ImageBackground>
				<Header style={{backgroundColor: "#cba830"}}>
					<StatusBar backgroundColor= 'black' barStyle="light-content" />
					<Left style={{flex: 3, marginLeft: 8}}><Button iconLeft transparent onPress={() => {this._handle_navigate_settings();}}><Text><Text style={{color: 'black', backgroundColor: 'transparent'}}>Back</Text></Text></Button></Left>
					<Body style={{flex: 3, justifyContent:'center', alignItems:'center'}}><Title style={{color:'black'}}>About</Title></Body>
					<Right style={{flex: 3}}></Right>
				</Header>
               
				<Content>
					<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
						<View style={{justifyContent: 'center', alignItems: 'center'}}>
							<Image
								style={{
									width: picSize,
									height: picSize,
									transform: [{ scale: 1 }],
									alignSelf: 'center', resizeMode:'contain'
								}} source={require("../assets/logo-pass-black.png")} 
							/>
						</View>
					</View>

					<View style={{flex: 1, flexDirection: "column"}}>
						<View style={{flex: 1, margin: 20}}>
							<Text>Version: v{global.app_info.marketing}</Text>
							<Text>{CONSTANT_ETH_V + "\n"}</Text>
							<Text>Copyright © 2020 Ethernom, Inc.{"\n"}All Rights Reserved</Text>
							<View style={{flex: 1,flexDirection: 'row'}}>
								<TouchableOpacity onPress={ ()=>{ Linking.openURL('https://ethernom.com/legal/tos.html')}}><Text style={{color: "#0000EE"}}>Terms of Service</Text></TouchableOpacity>
								<Text>, </Text>
								<TouchableOpacity onPress={ ()=>{ Linking.openURL('https://ethernom.com/legal/privacy_policy.html')}}><Text style={{color: "#0000EE"}}>Privacy Policy</Text></TouchableOpacity>
							</View>
						</View>
					</View>
				</Content>
            </Container>
        );
    }
}

const styles = StyleSheet.create({
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