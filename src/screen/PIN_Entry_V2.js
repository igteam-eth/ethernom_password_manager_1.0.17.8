import React, {Component} from 'react';
import {BackHandler, Platform, View, Image, StatusBar, Dimensions, ScrollView, AppState,Linking} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title} from 'native-base';
import SmoothPinCodeInput from 'react-native-smooth-pincode-input';
import Dialog from "react-native-dialog";
import BluetoothStateManager from 'react-native-bluetooth-state-manager';
import AndroidOpenSettings from 'react-native-android-open-settings';
const screenWidth = Math.round(Dimensions.get('window').width);
const screenHeight = Math.round(Dimensions.get('window').height);
var picSize = 0;
if(screenWidth>414 || screenHeight>736) picSize = screenWidth/2;
else picSize = screenWidth;
import DeviceInfo from 'react-native-device-info';
//ETHERNOM API;
import {PSD_MGR} from '@ethernom/ethernom_msg_psd_mgr';
var PSD_MGR_API = new PSD_MGR();

//Storage API
const StorageAPI = require('../util/Storage.js');
const Storage = new StorageAPI();

export default class PIN_Entry_V2 extends Component {
	constructor(props) {
		super(props);

		const {navigation} = this.props;
		this.state = {
			appState: AppState.currentState,
			PIN: '',
			PIN_len: navigation.getParam('pin_len', 6),
			error_message: '',
			btn_submit_disable: true,
			marginPin: 50,bluetooth_permission: false, bluetoothStatePermission: false,
		};

		this.count = 0;
		this.curr = navigation.getParam('VERSION_MGR_API', null);

		this.from = navigation.getParam('from', null);
		global.isBlueToothChecked = false; 
	}

	componentDidMount() {
		if(Platform.OS === 'android'){
			let parent = this;
			this.backHandler = BackHandler.addEventListener('hardwareBackPress', function(){
				parent._handle_cancel_pin();
				return true;
			});

			if(this.pinInput != null) setTimeout(() => this.pinInput.focus(), 250);
		}

		global.state.setState({spinner: {visible: false, text: ''}});
		this._on_disconnect();
		this.isTablet();
		AppState.addEventListener('change', this._handleAppStateChange);

		BluetoothStateManager.onStateChange(bluetoothState => {
            if(bluetoothState === "PoweredOff"){ 
				this.setState({bluetoothStatePermission: true,bluetooth_permission: false});   
			}else {
				this.setState({bluetoothStatePermission: false,bluetooth_permission: false});
			}

        }, true);
	}

	componentWillUnmount() {
		if(this.backHandler != null) this.backHandler.remove();
		AppState.removeEventListener('change', this._handleAppStateChange);
	}

	_handleAppStateChange = (nextAppState) => {

		if(this.state.appState.match(/active|inactive/) && nextAppState === 'background') {
			this._handle_cancel_pin()

		}else if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
            console.log('App has come to the foreground!');
			this._handle_cancel_pin();
		}
		
		this.setState({appState: nextAppState}); 
	};

	_on_disconnect = () => {
		var d_id = global.E_API.currID, d_name = global.E_API.currName, d_sn = global.E_API.currSN;
		global.E_API.OnCardDisconnected(resultCode => {
			if (resultCode === ETH_SUCCESS) {
				if (this.props.navigation.isFocused()) {
					global.state.setState({
						spinner: {visible: false, text: ''},
						curr_device: {id: d_id, name: d_name, sn: d_sn, connected: false}
					}, () => {
						this._handle_cancel_pin();
					});
				}else{
					global.state.setState({ curr_device: {id: d_id, name: d_name, sn: d_sn, connected: false} });
				}

				if(global.E_API != null){
					global.E_API.CardClose(callback = (resultCode) => {
						global.E_API = null;
					});
				}
			}
		});
	};

	_handle_submit_pin = (PIN) => { 
		
		this.curr.request_submit_pin_v2(global.E_API, PIN, callback = (resultCode, new_PIN) => {
			//global.state.setState({ spinner: {visible: true, text: "Loading: Submitting PIN..."} });
				
			if(resultCode == this.curr.ETH_SUCCESS){
				this.curr_PIN = new_PIN;
				this._init_password_manager();

			}else{
				this.count++;
				if (this.count == 3) {
					this._handle_cancel_pin();

				} else {

				    global.state.setState({ spinner: {visible: false, text: ""} });
					this.setState({
						PIN: '',
						error_message: 'Error! Wrong PIN. ',
						btn_submit_disable: true,
					});
				}
			}
		})
	};

	_handle_cancel_pin = () => {
		
		if(this.state.bluetoothStatePermission === false){
			const {navigate} = this.props.navigation;
			navigate('Device_Screen');
		}

		if (global.E_API !== null) {
			global.E_API.CardClose(async resultCode => {
				if (resultCode === ETH_SUCCESS) {
					global.state.setState({spinner: {visible: false, text: ''}});
				}
			});
		}
	};

	_init_password_manager = () => {
		if(global.E_API == null) return;

		global.state.setState({ spinner: {visible: true, text: "Loading: Starting password manager..."} });
		var code = makeCode(6);
		var out_msg = PSD_MGR_API.outMsg_request_OpenService(global.device_name, code);
		var in_msg = PSD_MGR_API.inMsg_reply_generic();

		global.E_API.WriteJSON_Encrypted(out_msg, in_msg, false, (resultCode, msg) => {
			if (resultCode === ETH_SUCCESS) {
				var msg_obj = JSON.parse(msg);
				this._process_reply_command(msg_obj);
			}
		});
	}

	_start_key_exchange = () => {
		if(global.E_API == null) return;

		console.log(this.curr_PIN);
		global.E_API.DoAppKeyExchange(this.curr_PIN, (resultCode) => {
			if (resultCode === ETH_SUCCESS) {
				console.log('pin entry key exchange success');

				global.state.setState({
					curr_device: {id: global.E_API.currID, name: global.E_API.currName, sn: global.E_API.currSN, connected: true}
				});

				Storage.save_session_pin(global.E_API.currID, this.curr_PIN);
				Storage.register_peripheral_data(global.E_API.currID, global.E_API.currName, global.E_API.currSN);

				if (this.from == null) {
					global.state.setState({ spinner: {visible: true, text: 'Loading: Retrieving credentials...'} });

					const {navigate} = this.props.navigation;
					navigate('Device_Screen');
					navigate('Vault_Screen');

				}else if(this.from == 'RECONNECT') {
					global.state.setState({spinner: {visible: false, text: ''}});
					const {goBack} = this.props.navigation;
					goBack();
				}
			}
		});
	}

	/*
	============================================================================================================
	======================================== WRITE/READ ========================================================
	============================================================================================================
	*/
	_process_reply_command = (msg) => {
		switch (msg.command) {
			case PSD_MGR_API.C2H_RPLY_INIT:
				if (msg.response === PSD_MGR_API.AWK){
					console.log('Successfully init');
					this._start_key_exchange();

				}else{
					this._handle_cancel_pin();
				}
				break;

			default:
				break;
		}
	};

	isTablet = () => {
		if(DeviceInfo.isTablet() === true) {
			this.setState({marginPin: 10})
		}else {
			this.setState({marginPin: 50})
		}

		DeviceInfo.isLandscape().then(isLandscape => {

			if(isLandscape === true){
				this.setState({marginPin: 10})
			}
		});


	};

	handleDismiss = () => {
		this.setState({bluetooth_permission: true,bluetoothStatePermission: false});
		global.state.setState({ spinner: {visible: false, text: ""} });

		const {navigate} = this.props.navigation;
		navigate('Device_Screen'); 
	};

	//Check bluetooth
    _request_open_ble_settings = () => {
        if(Platform.OS === "android") AndroidOpenSettings.bluetoothSettings();
        else Linking.openURL('App-prefs:root=Bluetooth');

    };


	/*
	============================================================================================================
	=========================================== RENDER =========================================================
	============================================================================================================
	*/
	render() {
		const {PIN} = this.state;
		return (
			<Container>
				<Header style={{backgroundColor: '#cba830'}}>
					<StatusBar backgroundColor="black" barStyle="light-content" />
					<Left style={{flex: 3, marginLeft: 8}}><Button iconLeft transparent onPress={() => {this._handle_cancel_pin() }}><Text><Text style={{color: 'black', backgroundColor: 'transparent'}}>Back</Text></Text></Button></Left>
					<Body style={{flex: 4, justifyContent:'center', alignItems:'center'}}><Title style={{color:'black', textAlign:'center'}}>Ethernom, Inc.</Title></Body>
					<Right style={{flex: 3}}></Right>
				</Header>

				<View>
				    <Dialog.Container visible={this.state.bluetoothStatePermission}>
                        <Dialog.Title>Warning</Dialog.Title>
                        <Dialog.Description>
                        Turn On Bluetooth to allow "Ethernom Password Manager" to connect to bluetooth accessories
                        </Dialog.Description>
                        <Dialog.Button label="Dismiss" onPress={() => { this.handleDismiss() }} />
                        <Dialog.Button label="Settings" onPress={() => { this._request_open_ble_settings() }} />
                    </Dialog.Container>
				</View>


				<View style={{flex: 1}}>
					<ScrollView keyboardShouldPersistTaps='always'>
						<View style={{flex: 1, alignItems: 'center'}}>
							<Text style={{textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginTop: 40}}>Authentication</Text>
							<Text style={{textAlign: 'center', fontSize: 16, color: '#424242', padding: 20}}>
								<Text style={{color: 'red'}}>{this.state.error_message}</Text>
								Please enter the {this.state.PIN_len} digit PIN code that appears on your device screen.
							</Text>

							<View style={{marginTop: 50, alignItems: 'center', backgroundColor: '#212121', padding: 20, borderRadius: 10}}>
								<SmoothPinCodeInput
									ref={ref => this.pinInput = ref}
									autoFocus={Platform.OS == "ios" ? true : false}
									cellStyle={{borderBottomWidth: 2, borderColor: '#E0E0E0'}}
									cellStyleFocused={{ borderColor: '#E0E0E0'}}
									textStyle={{ color: 'white', fontSize: 24 }}
									value={PIN}
									codeLength={this.state.PIN_len} animated keyboardType={'numeric'}
									onTextChange={PIN => {
										this.setState({PIN})
										if(PIN.length == this.state.PIN_len){ this._handle_submit_pin(PIN); }
									}}
								/>
							</View>
							<View style={{marginTop: 10, alignItems: 'center'}}>
								<Image source={require('../assets/img-pin-entry.png')} style={{width: picSize, height: picSize, alignSelf: 'center', resizeMode: 'contain', marginTop: 20}} />
							</View>
						</View>
					</ScrollView>
				</View>
			</Container>
		);
	}
}

function makeCode(length) {
	var result = '';
	var characters = 'abcdef0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}
