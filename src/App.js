import React, {Component, PureComponent} from 'react';
import {AppState, Dimensions, StatusBar, View, PanResponder, ViewPropTypes, Image} from 'react-native';
import PropTypes from 'prop-types';
import {Root} from 'native-base';
import {ListItem} from "react-native-elements";
import Dialog from "react-native-dialog";

import { enableScreens } from 'react-native-screens';

import RBSheet from 'react-native-raw-bottom-sheet';
import Spinner from 'react-native-loading-spinner-overlay';
import DeviceInfo from 'react-native-device-info';

const screenHeight = Dimensions.get('screen').height;
const windowHeight = Dimensions.get('window').height;
var navbarHeight = 0
if(Platform.OS == "android"){
	navbarHeight = screenHeight - windowHeight - StatusBar.currentHeight;
	if(navbarHeight < 0) navbarHeight = 0
}

import {VERSION_MGR} from '@ethernom/ethernom_version_mgr';
import {PSD_MGR} from '@ethernom/ethernom_msg_psd_mgr';
var PSD_MGR_API = new PSD_MGR();

//Component
import App_Container from './App_Container'
import Splash from "./Splash";

//Storage API
const StorageAPI = require('./util/Storage.js');
const Storage = new StorageAPI();

enableScreens();
export default class App extends Component{
    constructor(props) {
		super(props)
        this.state = {
			pointer_event: "auto",
			appState: AppState.currentState,
			isLoading: true, isActive: true,
			spinner: {visible: false, text: ""},
			curr_device: {id: "", name: "", sn: "", connected: false},
			alert: {communication: false, connect: false, restore: false}
		};

        global.state = this;

		global.E_API = null;
		global.reconnect_manager = null;
		global.bottom_sheets_device = null;
		global.navigate = null;

		global.credentials_list = [];
		global.device_name = "";
		global.device_id = "";
		global.isBlueToothChecked = false;
		global.bluetoothOn = false;

    }

	componentDidMount = async () => {
		AppState.addEventListener('change', this._handleAppStateChange);
		Storage.check_session_pin();

		let v = await DeviceInfo.getVersion();
    	let b = await DeviceInfo.getBuildNumber();
       	if(Platform.OS == "ios"){
			global.app_info = await {
				company: "Ethernom, Inc.",
				product: "Password Manager",
				id: "com.ethernom.password.manager.mobile",
				version: v,
				marketing: v + "." + b
			};
		}else{
			let temp_v = v.split(".", 4);
			global.app_info = await {
				company: "Ethernom, Inc.",
				product: "Password Manager",
				id: "com.ethernom.password.manager.mobile",
				version: temp_v[0] + "." + temp_v[1] + "." + temp_v[2],
				marketing: v
			};
		}

		this._init_device_info();
		const data = await this.performTimeConsumingTask();
        if (data !== null) {
        	var result = await Storage.get_timer();
        	if(result){
        		this.timeout = (result * 60 * 1000);
        		this.setState({ isLoading: false });
        	}
        }
    }

    componentWillUnmount() {
		AppState.removeEventListener('change', this._handleAppStateChange);
	}

	_handleAppStateChange = (nextAppState) => {
		if (this.state.appState.match(/inactive|background/) && nextAppState === "active") {
			console.log("App has come to the foreground!");
			setTimeout(() => {
				this.setState({ pointer_event: "auto" })
			}, 500)

		}else if (this.state.appState.match(/active|inactive/) && nextAppState === "background") {
			console.log("App has come to the background!");
			this.setState({ pointer_event: "none" });

		}
		this.setState({appState: nextAppState});
    }

    _init_device_info = async () => {
		global.device_name = await DeviceInfo.getDeviceName().then(deviceName => {
            if(deviceName.includes("’")) deviceName = deviceName.replace("’", "'");
            if(deviceName.length === 1) return deviceName + " ";
            return deviceName
        });
        global.device_id = await DeviceInfo.getDeviceId().then(deviceId => {
            return deviceId
        });
	}

    performTimeConsumingTask = async () => {
		if(Platform.OS == "ios"){
			return new Promise((resolve) =>
				setTimeout(() => { resolve('result') }, 2000)
			);
		}else{
			return new Promise((resolve) =>
				setTimeout(() => { resolve('result') }, 1000)
			);
		}
	};

	onAction = (active) => {
		//console.log(active);
		if(active == false){
			Storage.remove_session_pin();

			/*
			global.navigate('Device_Screen');
			if(global.E_API != null){
				global.E_API.CardClose(callback = (resultCode) => { })
			}
			*/

			/*
			this.active = false;
			if(this.session_timer != null) clearInterval(this.session_timer);
			this.session_timer = null

			//setTimeout(function(){ NativeModules.ExitApp.ExitApp(); }, 1000)
			*/
		}//else{
			//if(this.session_timer == null) this._update_session();
		//};
	}

	/*
	_update_session = () => {
		this.active = true;

		if(this.session_timer != null) clearInterval(this.session_timer);
		this.session_timer = null

		var parent = this;
		this.session_timer = setInterval(function(){
			if(parent.active == true){
				Storage.update_session_time();
			}else{
				if(parent.session_timer != null) clearInterval(parent.session_timer);
				parent.session_timer = null
			}
		}, 60000);
	}
	*/

	_handle_disconnect_device = () => {
		if(global.E_API != null){
    		global.E_API.CardClose(callback = (resultCode) => { })
		}

		global.bottom_sheets_device.close();
		global.navigate('Device_Screen');
	}

	/*
	_handle_reconnect_device = () => {
		global.bottom_sheets_device.close();
		global.reconnect_manager.request_reconnect(this.state.curr_device.id, this.state.curr_device.name, this.state.curr_device.sn, async (done) => {
			this.setState({
				spinner: {visible: false, text: ""},
				curr_device: {id: global.E_API.currID, name: global.E_API.currName, sn: global.E_API.currSN, connected: true}
			})
		});
	};
	*/

	handle_request_launch_dm_app = () => {
		var VERSION_MGR_API = new VERSION_MGR(PSD_MGR_API.APP_ID, global.app_info.company, global.app_info.product, global.app_info.id, global.app_info.version, null);
		this.setState({ alert: {communication: false, connect: false, restore: false} }, () => {
        	if(global.E_API != null) VERSION_MGR_API.request_launch_dm(global.E_API.currID, global.E_API.currName);
			this._request_cancel_usage();
		});
    };

	_request_cancel_usage = () =>{
		/*
		if(global.E_API != null){
			global.E_API.CardClose(async (resultCode) => {
				if (resultCode === ETH_SUCCESS) {
					global.E_API = null;
				}
			})
		}
		*/
		this.setState({ spinner: {visible: false, text: ""}, alert: {communication: false, connect: false, restore: false} });
		//global.navigate('Device_Screen');
    }

    render() {
    	if(this.state.isLoading == true) {
			return <Splash />

		}else{
			return (
				<Root pointerEvents={this.state.pointer_event}>
					<UserInactivity
						timeForInactivity={this.timeout}
						checkInterval={30000}
						onAction={this.onAction}
					>
						<Spinner
							visible={this.state.spinner.visible}
							textContent={this.state.spinner.text}
							textStyle={{color: '#FFF', fontSize: 16}}
						/>
						<View>
							<Dialog.Container visible={this.state.alert.communication}>
								<Dialog.Title>Error</Dialog.Title>
								<Dialog.Description>
									No response from the connected device. Please try again.
								</Dialog.Description>
								<Dialog.Button label="Okay" onPress={() => { this._request_cancel_usage() }} />
							</Dialog.Container>

							<Dialog.Container visible={this.state.alert.connect}>
								<Dialog.Title>Error</Dialog.Title>
								<Dialog.Description>
									Make sure your device is powered on and authenticated. Please try again.
								</Dialog.Description>
								<Dialog.Button label="Okay" onPress={() => { this._request_cancel_usage() }} />
							</Dialog.Container>

							<Dialog.Container visible={this.state.alert.restore}>
								<Dialog.Title>Error</Dialog.Title>
								<Dialog.Description>
									To resume restore your device's data, please use Ethernom Device Manager.
								</Dialog.Description>
								<Dialog.Button label="Disconnect" onPress={() => {this._request_cancel_usage() }} />
								<Dialog.Button label="Restore" onPress={() => { this.handle_request_launch_dm_app() }} />
							</Dialog.Container>
						</View>

						<View>
							<RBSheet ref={ref => {global.bottom_sheets_device = ref;}} height={Platform.OS == "ios" ? 130 : (navbarHeight + 130)} closeOnDragDown={true} closeOnPressMask={true}>
								<View>
									<ListItem title={this.state.curr_device.name} titleStyle = {{textAlign: 'left'}} bottomDivider/>
									<ListItem titleStyle={{fontSize: 14}} title={"Disconnect device"} rightIcon={<Image source={require('./assets/img/bluetooth_disabled.png')} style={{width: 15, height: 20, resizeMode: 'contain'}}/>} onPress={()=> this._handle_disconnect_device()}/>
								</View>
							</RBSheet>
						</View>

						<App_Container />
					</UserInactivity>
				</Root>
			)
		}
    }
}

class UserInactivity extends PureComponent {
	static propTypes = {
		timeForInactivity: PropTypes.number,
		checkInterval: PropTypes.number,
		children: PropTypes.node.isRequired,
		style: ViewPropTypes.style,
		onAction: PropTypes.func.isRequired,
	};

	static defaultProps = {
		timeForInactivity: 10000,
		checkInterval: 30000,
		style: {
			flex: 1,
		},
	};

	state = {
		active: true
	};
	allowEvent = true;

	UNSAFE_componentWillMount() {
		this.panResponder = PanResponder.create({
			onMoveShouldSetPanResponderCapture: this.onMoveShouldSetPanResponderCapture,
			onStartShouldSetPanResponderCapture: this.onMoveShouldSetPanResponderCapture,
			onResponderTerminationRequest: this.handleInactivity
		});
		this.handleInactivity();
	}

	componentWillUnmount() {
		clearInterval(this.inactivityTimer);
	}

	/**
	* This method is called whenever a touch is detected. If no touch is
	* detected after `this.props.timeForInactivity` milliseconds, then
	* `this.state.inactive` turns to true.
	*/
	handleInactivity = () => {
		if(this.allowEvent == false) return;
		this.allowEvent = false;

		clearTimeout(this.timeout);
		this.setState({
			active: true,
		}, () => {
			this.props.onAction(this.state.active); // true
		});

		this.resetTimeout();
	}

	/**
	* If more than `this.props.timeForInactivity` milliseconds have passed
	* from the latest touch event, then the current state is set to `inactive`
	* and the `this.props.onInactivity` callback is dispatched.
	*/
	timeoutHandler = () => {
		this.setState({
			active: false,
		}, () => {
			this.props.onAction(this.state.active); // false
		});
	}

	resetTimeout = () => {
		this.activeHandler();
		this.timeout = setTimeout(this.timeoutHandler, this.props.timeForInactivity);
	}

	activeHandler = () => {
		let parent = this;
		setTimeout(function(){
			parent.allowEvent = true;
		}, this.props.checkInterval);
	}

	onMoveShouldSetPanResponderCapture = () => {
		this.handleInactivity();
		/**
		 * In order not to steal any touches from the children components, this method
		 * must return false.
		 */
		return false;
	}

	render() {
		const {style, children} = this.props;
		return (
			<View style={style} collapsable={false} {...this.panResponder.panHandlers} >
				{children}
			</View>
		);
	}
}
