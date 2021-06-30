import React, {Component} from 'react';
import {AppState, View, Image, StatusBar, Dimensions, Linking, Platform, TouchableOpacity} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, Content} from 'native-base';
import Video from 'react-native-video';
import AndroidOpenSettings from 'react-native-android-open-settings';

var s = require('../css/styles');

export default class Autofill extends Component {
    constructor(props) {
        super(props);
    }

    _handle_next = () => {
    	const {navigate} = this.props.navigation;
		navigate('Autofill_Accessbility_Screen', {from: 'DEVICE'});
    }

    render() {
        return (
            <Container>
                <Header style={{backgroundColor: '#cba830'}}>
                    <StatusBar backgroundColor='black' barStyle="light-content"/>
                   	<Left style={{flex: 3, marginLeft: 8}}></Left>
                    <Body style={{flex: 3, justifyContent:'center', alignItems:'center'}}><Title style={{color:'black', textAlign:'center'}}>Setup</Title></Body>
                    <Right style={{flex: 3}}></Right>
                </Header>
                <Content>
					<View style={{marginTop: 10, alignItems: 'center'}}>
						<Image source={require('../assets/tutorial-pass3.png')} style={{width: 234/2, height: 385/2, alignSelf: 'center', resizeMode: 'contain', marginTop: 20}} />
					</View>
					
					<View style={{flex: 1, padding: 20}}>
						<Text>Ethernom Password Manager require additional permission to fill logins on this device</Text>
					</View>
					
					<TouchableOpacity onPress={() => {this._handle_next();}} >
						<Button onPress={() => {this._handle_next();}} rounded success style={{justifyContent: 'center', marginBottom: 20, marginEnd: 40, marginStart: 40}}>
							<Text style={{textAlign: 'center', fontWeight: 'bold'}}>Continue Setup</Text>
						</Button>
					</TouchableOpacity>
                </Content>
            </Container>
        );
    }
}