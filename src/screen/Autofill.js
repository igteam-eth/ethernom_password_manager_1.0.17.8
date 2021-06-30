import React, {Component} from 'react';
import {AppState, View, StatusBar, Dimensions, Linking, Platform, TouchableOpacity} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, Content} from 'native-base';
import Video from 'react-native-video';
import AndroidOpenSettings from 'react-native-android-open-settings';

var s = require('../css/styles');
const screenWidth = Math.round(Dimensions.get('window').width);
const screenHeight = Math.round(Dimensions.get('window').height);
var picWidth = 0, picHeight = 0;
if(Platform.OS == "ios"){
    if(screenWidth>414 || screenHeight>736){ picWidth = 744/1.25, picHeight * (672/744);
    }else{
        picHeight = screenWidth;
        picWidth = picHeight * (672/744);
    }
}else{
    if(screenWidth>414 || screenHeight>736){ picHeight = 740/1.25, picWidth = picHeight * (360/740);
    } else{
        picHeight = screenWidth;
        picWidth = picHeight * (360/740);
    }
}

//Storage API
const StorageAPI = require('../util/Storage.js');
const Storage = new StorageAPI();

export default class Autofill extends Component {
    constructor(props) {
        super(props);

        this.state = {
            appState: AppState.currentState,
            AutoFill_video: null,
        };

		const { navigation } = this.props;
		this.from = navigation.getParam('from');

        this.AutoFill_mp4 = null;
        if (Platform.OS === 'android') {
            this.AutoFill_mp4 = require('../assets/android_autofill_tutorial.mp4');
        } else {
            this.AutoFill_mp4 = require('../assets/autofill_tutorial.mp4');
        }
    }

    async componentDidMount(){
		if(this.from == "DEVICE"){
			if(Platform.OS == "android" && Platform.Version < 29){
				this.accessibility_tutorial_screen = await Storage.get_accessibility_settings();
			}else{
				this.accessibility_tutorial_screen = 0
			}
		}
		AppState.addEventListener('change', this._handleAppStateChange);
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this._handleAppStateChange);
    }

    _handleAppStateChange = (nextAppState) => {
        if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
			if(this.from == "DEVICE"){
				if(Platform.OS == "android"){
					if (this.accessibility_tutorial_screen === 1) {
						this.props.navigation.navigate('Android_Tutorial_Screen', {from: 'DEVICE'});
					}else{
						this.props.navigation.navigate('Device_Screen')
					}
				}else{
					this.props.navigation.navigate('Device_Screen')
				}
            }
        }
        this.setState({appState: nextAppState});
    };

    _handle_header_back = () => {
        if(global.E_API != null){
    		this.props.navigation.navigate("Vault_Screen");
    	}else{
    		this.props.navigation.navigate("Device_Screen");
    	}
    };

    _handle_back = () => {
    	if(this.from == "SETTINGS"){
    		this.props.navigation.navigate("Settings_Screen");
    	
		}else if(this.from == "DEVICE"){
    		if(Platform.OS == "android"){
				if (this.accessibility_tutorial_screen === 1) {
					this.props.navigation.navigate('Android_Tutorial_Screen', {from: 'DEVICE'});
				}else{
					this.props.navigation.navigate('Device_Screen')
				}
			}else{
				this.props.navigation.navigate('Device_Screen')
			}
    	}
    }

    _go_to_system_settings = () => {
        if (Platform.OS === 'android') {
            AndroidOpenSettings.generalSettings();
        }else{
        	Linking.openURL('App-Prefs:{0}');
        }
    }

    render() {
        return (
            <Container>
                <Header style={{backgroundColor: '#cba830'}}>
                    <StatusBar backgroundColor='black' barStyle="light-content"/>
                   	<Left style={{flex: 3, marginLeft: 8}}><Button iconLeft transparent onPress={() => {this._handle_back();}}><Text><Text style={{color: 'black', backgroundColor: 'transparent'}}>Back</Text></Text></Button></Left>
                    <Body style={{flex: 3, justifyContent:'center', alignItems:'center'}}><Title style={{color:'black', textAlign:'center'}}>AutoFill</Title></Body>
                    <Right style={{flex: 3}}></Right>
                </Header>
                <Content>
                    <Text style={{textAlign: 'center', fontWeight: 'bold', margin: 20, fontSize: 20}}>Let's set up AutoFill</Text>
                    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Video source={this.AutoFill_mp4}   // Can be a URL or a local file.
						   ref={(ref) => {this.player = ref;}}
						   onBuffer={this.onBuffer}
						   onError={this.videoError}
						   repeat={true}
						   muted={true}
						   resizeMode={"contain"}
						   style={{width: picWidth, height: picHeight, backgroundColor: "black"}}
                        />
                    </View>

                    <View style={{flex: 1, padding: 20, display: Platform.OS === 'ios' ? 'flex' : 'none'}}>
                        <Text>1. Tap the button below to go to Settings</Text>
                        <Text style={{marginTop: 10}}>2. Tap Passwords & Accounts</Text>
                        <Text style={{marginTop: 10}}>3. Tap AutoFill Passwords</Text>
                        <Text style={{marginTop: 10}}>4. Enable AutoFill Passwords</Text>
                        <Text style={{marginTop: 10}}>5. Verify Ethernom Password Manager is enabled</Text>
                        <Text style={{marginTop: 10}}>Disable iCloud Keychain (Optional)</Text>
                    </View>

                    <View style={{flex: 1, padding: 20, display: Platform.OS === 'android' ? 'flex' : 'none'}}>
                        <Text>1. Tap the button below to go to Settings</Text>
                        <Text style={{marginTop: 10}}>2. Type in "autofill" in the search bar</Text>
                        <Text style={{marginTop: 10}}>3. Tap AutoFill Service</Text>
                        <Text style={{marginTop: 10}}>4. On the AutoFill service,</Text>
                        <Text style={{marginTop: 10}}> select 'Ethernom AutoFill Sevice'.</Text>
                    </View>

					<TouchableOpacity onPress={() => {this._go_to_system_settings();}} >
						<Button onPress={() => {this._go_to_system_settings();}} rounded success style={{justifyContent: 'center', marginBottom: 20, marginEnd: 40, marginStart: 40}}>
							<Text style={{textAlign: 'center', fontWeight: 'bold'}}>Set AutoFill</Text>
						</Button>
					</TouchableOpacity>
                </Content>
            </Container>
        );
    }
}