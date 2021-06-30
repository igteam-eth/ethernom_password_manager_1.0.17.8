import React, {Component} from 'react';
import {Linking, PermissionsAndroid, Platform, ActivityIndicator, View, FlatList, Image, StatusBar, AppState, Settings,DeviceEventEmitter} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, Content} from 'native-base';
import {ListItem, Divider} from "react-native-elements";
import Icon from "react-native-vector-icons/dist/Ionicons";
import Dialog from "react-native-dialog";
import AndroidOpenSettings from 'react-native-android-open-settings'
import SystemSetting from 'react-native-system-setting'
import BluetoothStateManager from 'react-native-bluetooth-state-manager';

let s = require('../css/main_style');


//ETHERNOM API;
import {EthernomAPI} from '@ethernom/ethernom-api';
import {PSD_MGR} from '@ethernom/ethernom_msg_psd_mgr';
import {VERSION_MGR} from '@ethernom/ethernom_version_mgr';
var PSD_MGR_API = new PSD_MGR();

//Storage API
const StorageAPI = require('../util/Storage.js');
const ConversionAPI = require('../util/Conversion.js');
const E_API_Reconnect = require('../util/E_API_Manager.js');

const Storage = new StorageAPI();
const Conversion = new ConversionAPI();
const group = 'group.com.ethernom.password.manager.mobile';

var write_timeout_interval = 0, connection_timeout_interval = 0;
if(Platform.OS == "ios"){
    connection_timeout_interval = 5000;
    write_timeout_interval = 5000;
}else{
    connection_timeout_interval = 5000;
    write_timeout_interval = 5000;
}

export default class Device extends Component {
	constructor(props) {
		super(props);
		this.state = {
			appState: AppState.currentState,
			device_list: [],
			alert_system: {location_permission: false, location_state: false, ble_permission: false, ble_state: false},
			alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false},
            bluetooth_permission: false,bluetoothStatePermission: false
		};

		//if(Platform.OS == "ios"){
			//this.tutorial_screen = Settings.get('TUTORIAL_SCREEN');
		//}else{
			//this.tutorial_screen = Storage.get_settings();
		//}

		const {navigate} = this.props.navigation;
		global.navigate = navigate;
		this.navigating = false;

		this.device_list = [];
		this.MAIN_DISCOVERY = null;
		this.CURR_E_API = null;
		this.connecting = false;
		this.connection_timeout_occur = false;

		this.VERSION_MGR_API = new VERSION_MGR(PSD_MGR_API.APP_ID, global.app_info.company, global.app_info.product, global.app_info.id, global.app_info.version, group);

		this.processing_request = false;
	}

	async componentDidMount() {
		this.navigating = false;
		this.connecting = false;
		this.processing_request = false;

		this._check_bluetooth_state();
		this._blur_listener();

		AppState.addEventListener('change', this._handleAppStateChange);

		this.tutorial_screen = await Storage.get_settings();
		console.log(this.tutorial_screen)
        if (this.tutorial_screen === 1) {
            const {navigate} = this.props.navigation;
            navigate('Autofill_Screen', {from: 'DEVICE'});
        }else{
			if(Platform.OS == "android" && Platform.Version < 29){
				this.accessibility_tutorial_screen = await Storage.get_accessibility_settings();
				console.log(this.accessibility_tutorial_screen)
				if (this.accessibility_tutorial_screen === 1) {
					const {navigate} = this.props.navigation;
					navigate('Autofill_Accessbility_Screen', {from: 'DEVICE'});
				}
			}
		}
        
		global.state.setState({ curr_device: {id: '', name: '', sn: '', connected: false} });

		const {navigate} = this.props.navigation;
		global.navigate = navigate;
		global.reconnect_manager = new E_API_Reconnect();

		this.VERSION_MGR_API.subsribe_error(this._error_alert);

		
        global.isBlueToothChecked = true;
		this.checkBluetoothGetState();
		this.checkBlueToothStateChange();

	}
    checkBluetoothGetState = () => {
        BluetoothStateManager.getState().then(bluetoothState => {
            switch (bluetoothState) {
                case 'PoweredOff':
                    if(global.isBlueToothChecked === true){
                        this.setState({bluetoothStatePermission: true,bluetooth_permission: false});
                    }

                    this.device_list = [];
                    this.setState({device_list: []})

                    global.bluetoothOn = false;
                    break;
                case 'PoweredOn':
                    this.setState({bluetooth_permission: false, bluetoothStatePermission: false});
                    global.bluetoothOn = true;

                    this._check_bluetooth_state();
                    break;

                default:
                    break;
            }
        });
    };

    checkBlueToothStateChange = () => {
        BluetoothStateManager.onStateChange(bluetoothState => {
            switch (bluetoothState) {
                case 'PoweredOff':
                    console.log("PoweredOff");
                    global.bluetoothOn = false;
                    if(global.isBlueToothChecked === true){
                        this.setState({bluetoothStatePermission: true,bluetooth_permission: false});
                    }

                    this.device_list = [];
                    this.setState({device_list: []})

                    break;
                case 'PoweredOn':
                    console.log("PoweredOn");
                    global.bluetoothOn = true;
                    this.setState({bluetooth_permission: false,bluetoothStatePermission: false});

                    this._check_bluetooth_state();
                
                    break;
                default:

                    break;
            }

        }, true);
    };

    handleDismiss = () => {
        this.setState({bluetooth_permission: true,bluetoothStatePermission: false});
    };
    

	componentWillUnmount() {
		if(this.did_focus_device_screen != null) this.did_focus_device_screen.remove();
		if(this.did_blur_device_screen != null) this.did_blur_device_screen.remove();
		AppState.removeEventListener('change', this._handleAppStateChange);
	}

	_error_alert = () => {
		global.state.setState({ spinner: {visible: false, text: ""} });
		setTimeout(() => {
			this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false} });
			this.connecting = false;
			this.processing_request = false;
		}, 600);
	}

	_check_bluetooth_state = () => {
		this.setState({
			alert_system: {location_permission: false, location_state: false, ble_permission: false, ble_state: false},
			alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false}
		}, () => {
			if(Platform.OS == "android"){
				SystemSetting.isBluetoothEnabled().then((enable)=>{
					if(enable == true){
						this._check_location_state();
					}else{
						this.setState({ alert_system: {location_permission: false, location_state: false, ble_permission: false, ble_state: false} });
					}
				});
			}else{
				var version = Platform.Version.split(".");
				if(parseInt(version[0]) >= 13){
					this._init_e_api_scanner();
				}else{
					SystemSetting.isBluetoothEnabled().then((enable)=>{
						if(enable == true){
							this._init_e_api_scanner();
						}else{
							this.setState({ alert_system: {location_permission: false, location_state: false, ble_permission: false, ble_state: false} });
						}
					});
				}
			}
		});
	}

	_check_location_state = () => {
		SystemSetting.isLocationEnabled().then((enable)=>{
			if(enable == true){
				this._check_permission();
			}else{
				this.setState({ alert_system: {location_permission: false, location_state: true, ble_permission: false, ble_state: false} });
			}
		});
	}

	_check_permission = () => {
		if (Platform.Version >= 23) {
			PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
				if(result){
					this._init_e_api_scanner();
				}else{
					this.setState({ alert_system: {location_permission: true, location_state: false, ble_permission: false, ble_state: false} });
				}
			});
		}
	}

	_blur_listener = () => {
		if(this.did_blur_device_screen != null) this.did_blur_device_screen.remove();

		const {navigation} = this.props;
		this.did_blur_device_screen = navigation.addListener('didBlur', () => {
			this._focus_listener();

			if (this.MAIN_DISCOVERY != null) {
				this.MAIN_DISCOVERY.StopDiscovery();
				this.MAIN_DISCOVERY.DisconnectListeners();
				this.MAIN_DISCOVERY = null;
			}
		});
	}

	_focus_listener = () => {
		if(this.did_focus_device_screen != null) this.did_focus_device_screen.remove();

        const {navigation} = this.props;
        this.did_focus_device_screen = navigation.addListener('didFocus', async () => {
            this.navigating = false;

			this._check_bluetooth_state();
			global.state.setState({spinner: {visible: false, text: ''}});
			this.connecting = false;
			this.processing_request = false;

			global.isBlueToothChecked = true;
			this.checkBluetoothGetState();
			this.checkBlueToothStateChange();
			
			this.did_focus_device_screen.remove();
        });
	};

	_handleAppStateChange = async (nextAppState) => {
		if(this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
			this.setState({device_list: []}, () => {
				this.device_list = [];
				this._check_bluetooth_state();
			});
			this._blur_listener();

            /*
			var result = await Storage.check_session_pin();
			if(result == false){
				const {navigate} = this.props.navigation;
				navigate('Device_Screen');
			}
            */

		}else if(this.state.appState.match(/active|inactive/) && nextAppState === 'background') {
			if (this.MAIN_DISCOVERY != null) {
				this.MAIN_DISCOVERY.StopDiscovery();
				this.MAIN_DISCOVERY.DisconnectListeners();
				this.MAIN_DISCOVERY = null;
			}
			this._request_cancel_usage();
			global.bottom_sheets_device.close();
      
			Storage.update_session_time();

		}
		this.setState({appState: nextAppState});
    };

	/*
	============================================================================================================
	======================================== SCANNER DEVICE ====================================================
	============================================================================================================
	*/
	_init_e_api_scanner = async () => {
		this.connecting = false;
        this.processing_request = false;

        if (this.MAIN_DISCOVERY != null) {
            this.MAIN_DISCOVERY.StopDiscovery();
            this.MAIN_DISCOVERY.DisconnectListeners();
            this.MAIN_DISCOVERY = null;
        }

        var TEMP_E_API = await new EthernomAPI('BLE', PSD_MGR_API.SERIVCE_PORT, -1, true, true, async resultCode => {
            if (resultCode == ETH_SUCCESS) {
                this.MAIN_DISCOVERY = await TEMP_E_API;
                this.MAIN_DISCOVERY.DiscoverDevices(this._device_discovery);
            }else{
                switch(resultCode){
                    case 0x1005: //UNAUTHORIZED
                        this.setState({ alert_system: {location_permission: false, location_state: false, ble_permission: true, ble_state: false} });
                        break;

                    default:
                        break;

                }
            }
        });
	}

	_device_discovery = (resultCode, deviceID, deviceName, deviceSN) => {
		if(resultCode != ETH_SUCCESS){
            this.setState({ alert_system: {location_permission: false, location_state: false, ble_permission: false, ble_state: false} })
            return;
        }

        var display_sn = Conversion.convert_sn(deviceSN);
        var obj = [{id: deviceID, name: deviceName, sn: deviceSN, d_sn: display_sn}];

        if(this.device_list.length > 0){
            for(var i=0; i<this.device_list.length; i++){
                if(this.device_list[i].id == deviceID && this.device_list[i].sn == deviceSN && this.device_list[i].name == deviceName){
                    return;

                }else if(this.device_list[i].id == deviceID && (this.device_list[i].sn != deviceSN || this.device_list[i].name != deviceName)){
                    var update_list = false;
                    if(this.device_list[i].name != deviceName){
                        update_list = true;
                        this.device_list[i].name = deviceName;
                    }

                    if(this.device_list[i].sn != deviceSN){
                        update_list = true;
                        this.device_list[i].sn = deviceSN;
                    }

                    if(update_list == true){
                        this.setState({device_list: []}, () => {
                            this.setState({device_list: this.device_list});
                        });
                    }
                    return;
                }
            }
        }

        this.device_list = this.device_list.concat(obj);
        this.setState({device_list: []}, () => {
            this.setState({device_list: this.device_list});
        });
    }

    /*
    ============================================================================================================
    ======================================= CONNECTING DEVICE ==================================================
    ============================================================================================================
    */
    _request_connect_device = item => {
        if(this.navigating == true) return;

        var deviceID = item.id, deviceName = item.name, deviceSN = item.sn;
        this.reattempts = false;
        this._init_e_api_device(deviceID, deviceName, deviceSN);
    };

    _init_e_api_device = async (deviceID, deviceName, deviceSN) => {
        if(this.connecting == true) return;
        this.connecting = true;

        var E_API = await new EthernomAPI('BLE', PSD_MGR_API.SERIVCE_PORT, 0, false, true, async resultCode => {
            if (resultCode === ETH_SUCCESS) {
                this.CURR_E_API = await E_API;
                this._device_select(deviceID, deviceName, deviceSN);
            }
        });
    };

    reattempts = false;
    _device_select = (deviceID, deviceName, deviceSN) => {
        if(this.connection_timeout_occur == false){
            global.state.setState({ spinner: {visible: true, text: "Loading: Connecting " + deviceName + "..."} });
        }

        this.connection_timeout_occur = false;
        this.connection_timeout = setTimeout(() => {
            this.connection_timeout_occur = true;
            this.connecting = false;
            this.connection_timeout = null;

            this.CURR_E_API.CardClose(callback = (resultCode) => {
                this.CURR_E_API = null;

                if(this.reattempts == true){
                    this.reattempts = false;
                    global.state.setState({ spinner: {visible: false, text: ""} });
                    setTimeout(() => {
                        this.setState({ alert_connection: {communication: false, connection: true, internet: false, force: false, update: false, restore: false, battery: false, help: false} })
                    }, 600);
                }else{
                    this.reattempts = true;
                    setTimeout(() => {
                        this._init_e_api_device(deviceID, deviceName, deviceSN);
                    }, 600);
                }
            });
        }, connection_timeout_interval);

        this.CURR_E_API.Select(deviceID, deviceSN, deviceName, async (resultCode) => {
            if (resultCode === ETH_SUCCESS) {
                if(this.connection_timeout_occur == true) return;
                clearTimeout(this.connection_timeout);
                this.connection_timeout = null;

                this.reattempts = false;

                if(this.state.alert_connection.connection == true){
                    this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false} });
                    setTimeout(() => {
                        global.state.setState({ spinner: {visible: true, text: "Loading: Verifying connection..."} });
                    }, 600);
                }else{
                    global.state.setState({ spinner: {visible: true, text: "Loading: Verifying connection..."} });
                }
                global.E_API = await this.CURR_E_API;
                this.CURR_E_API = null;

                this._request_app_auth(false);
            }
        });
    };

    /*
    ============================================================================================================
    ================================ CHECKING AUTH/VERSION/BATTERY =============================================
    ============================================================================================================
    */
    _request_app_auth = (skip_check_version) => {
        if(global.E_API == null){
            this._request_cancel_usage();
            return;
        }

        if(global.state.state.spinner.visible == false){
            setTimeout(() => {
                global.state.setState({ spinner: {visible: true, text: "Loading: Verifying connection..."} });
            }, 600);
        }

        this.VERSION_MGR_API.request_app_auth(global.E_API, callback = async (E_API, authenticated) => {
            global.E_API = await E_API

            //authenticated = false;
            if(authenticated === true){
                var deviceCheckUpdate =  await Storage.get_registered_card_update_check(global.E_API.currSN);
                if(skip_check_version == false && deviceCheckUpdate == true){
                    this._request_check_version();
                }else{
                    this._request_launch_card_app();
                }

                /*
                if(skip_check_version == false){
                    this._request_check_version();
                }else{
                    this._request_launch_card_app();
                }
                */

            }else if(authenticated == -1){
                //this._request_cancel_usage();
                setTimeout(() => {
                    global.state.setState({ spinner: {visible: false, text: ""} });
                    this.setState({ alert_connection: {communication: false, connection: false, internet: true, force: false, update: false, restore: false, battery: false, help: false} }, () => {
                        this.processing_request = false;
                    })
                }, 600);
            }else{
                setTimeout(() => {
                    global.state.setState({ spinner: {visible: false, text: ""} });
                    this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: true, update: false, restore: false, battery: false, help: false} }, () => {
                        this.processing_request = false;
                    })
                }, 600);
            }
        });
    }

    _request_check_version = () => {
        if(global.E_API == null){
            this._request_cancel_usage();
            return;
        }

        if(global.state.state.spinner.visible == false){
            setTimeout(() => {
                global.state.setState({ spinner: {visible: true, text: "Loading: Checking compatibility..."} });
            }, 600);
        }else{
            global.state.setState({ spinner: {visible: true, text: "Loading: Checking compatibility..."} });
        }

        this.VERSION_MGR_API.request_check_version(global.E_API, callback = async (E_API, updates) => {
            global.E_API = await E_API;
            Storage.save_new_card_update_check(global.E_API.currSN);

            //updates = false;
            if(updates === true){
                setTimeout(() => {
                    global.state.setState({ spinner: {visible: false, text: ""} });
                    this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: true, restore: false, battery: false, help: false} }, () => {
                        this.processing_request = false;
                    })
                }, 600);

            }else{
                //this._request_check_battery_level();
                this._request_launch_card_app()
            }
        });
    }

    _request_check_battery_level = () => {
        if(global.E_API == null){
            this._request_cancel_usage();
            return;
        }

        if(global.state.state.spinner.visible == false){
            setTimeout(() => {
                global.state.setState({ spinner: {visible: true, text: "Loading: Checking battery level.."} });
            }, 600);
        }else{
            global.state.setState({ spinner: {visible: true, text: "Loading: Checking battery level.."} });
        }

        this.VERSION_MGR_API.request_check_battery(global.E_API, callback = async (E_API, battery_low) => {
            global.E_API = await E_API;

            //battery_low = true;
            if(battery_low == true){
                setTimeout(() => {
                    global.state.setState({ spinner: {visible: false, text: ""} });
                    this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: true, help: false} }, () => {
                        this.processing_request = false;
                    })
                }, 600);

            }else{
                this._request_launch_card_app();
            }
        });
    }

    handle_request_launch_dm_app = () => {
        if(this.processing_request == true) return;
        this.processing_request = true;

        this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false} }, () => {
            if(global.E_API != null) this.VERSION_MGR_API.request_launch_dm(global.E_API.currID, global.E_API.currName, global.E_API.currSN);
            this._request_cancel_usage();
        });
    };

    handle_check_battery_level = () => {
        if(this.processing_request == true) return;
        this.processing_request = true;

        this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false} }, () => {
            this._request_check_battery_level()
        });
    };

    handle_launch_card_app = () => {
        if(this.processing_request == true) return;
        this.processing_request = true;

        this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false} }, () => {
            this._request_launch_card_app();
        });
    };

    /*
    ============================================================================================================
    ======================================= CANCEL/SUSPEND =====================================================
    ============================================================================================================
    */
    _request_cancel_usage = () => {
        if(this.connection_timeout != null) clearTimeout(this.connection_timeout);
        this.connection_timeout_occur = false;

        if(this.state.alert_connection.force == true || this.state.alert_connection.update == true) Storage.remove_card_update_check(global.E_API.currSN);

        if(this.CURR_E_API != null){
            this.CURR_E_API.CardClose(callback = (resultCode) => {
                if (resultCode === ETH_SUCCESS) {
                    this.CURR_E_API = null;
                }
            });
        }

        if(global.E_API != null){
            global.E_API.CardClose(async (resultCode) => {
                if (resultCode === ETH_SUCCESS) {
                    global.E_API = null;
                }
            })
        }

        this.device_list = [];
        this.setState({ device_list: [] });

        global.state.setState({ spinner: {visible: false, text: ""} });
        this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false} });

        this.connecting = false;
        this.processing_request = false;
    };

    _request_suspend_app = () => {
        if(global.E_API != null){
            global.E_API.DisconnectApp((resultCode) => {
                if(resultCode === ETH_SUCCESS){
                    global.E_API = null;
                }
            });
        }

        this.device_list = [];
        this.setState({ device_list: [] });

        global.state.setState({ spinner: {visible: false, text: ""} });
        this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false} });

        this.connecting = false;
        this.processing_request = false;
    };


    /*
    ============================================================================================================
    ========================================= LAUNCH APP =======================================================
    ============================================================================================================
    */
    launch_app_occur = false;
    _request_launch_card_app = () => {
        if(global.E_API == null){
            this._request_cancel_usage();
            return;
        }

        if(global.state.state.spinner.visible == false){
            setTimeout(() => {
                global.state.setState({ spinner: {visible: true, text: "Loading: Launching..."} });
            }, 600);
        }else{
            global.state.setState({ spinner: {visible: true, text: "Loading: Launching..."} });
        }

        this.launch_app_occur = false;
        this.launch_app = setTimeout(() => {
            clearTimeout(this.launch_app);
            this.launch_app_occur = true;
            this._request_app_auth(true);
        }, 10000);

        global.E_API.LaunchApp(PSD_MGR_API.APP_ID, (resultCode) => {
            if(this.launch_app_occur == true) return;
            clearTimeout(this.launch_app)
            this.launch_app_occur = false;

            if(resultCode === ETH_SUCCESS) {
                this._start_app_protocol();
            }else if(resultCode === 1){
                this._request_app_auth(true);
            }else if(resultCode == global.E_API.CM_ERR_RESTORE_INCOMPLETE){
                setTimeout(() => {
                    global.state.setState({ spinner: {visible: false, text: ""} }, () => {
                        setTimeout(() => {
                            this.processing_request = false;
                            this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: true, battery: false, help: false} });
                        }, 600);
                    });
                }, 600);

            }else{
                console.log(resultCode);
            }
        })
    }

    _start_app_protocol = () => {
        if(global.E_API == null){
            this._request_cancel_usage();
            return;
        }

        var d_id = global.E_API.currID, d_name = global.E_API.currName, d_sn = global.E_API.currSN;
        global.E_API.OnCardDisconnected(resultCode => {
            this.connecting = false;
            if (resultCode === ETH_SUCCESS) {
                console.log('On card disconnected...');
                /*
                global.state.setState({
                    spinner: {visible: false, text: ''},
                    curr_device: {id: d_id, name: d_name, sn: d_sn, connected: false}
                });
                */

                global.state.setState({ curr_device: {id: d_id, name: d_name, sn: d_sn, connected: false} });
                if(global.E_API != null){
                    global.E_API.CardClose(callback = (resultCode) => {
                        global.E_API = null;
                    });
                }
            }
        });

        this._request_session_v2();
    };

    _request_session_v2 = async () => {
        var session = await Storage.get_session_pin(global.E_API.currID);
        this.len = await Storage.get_pin_len();
        if (this.len) {
            if (session == null || session == false) {
                this.VERSION_MGR_API.request_session_v2(global.E_API, PSD_MGR_API.APP_ID, global.device_name, null, this.len, this._session_v2_callback);
            } else {
                this.curr_PIN = session;
                this.VERSION_MGR_API.request_session_v2(global.E_API, PSD_MGR_API.APP_ID, global.device_name, session, this.len, this._session_v2_callback);
            }
        }
    }

    _session_v2_callback = (resultCode) => {
        console.log(resultCode);
        
        if (resultCode == this.VERSION_MGR_API.ETH_SUCCESS) {
            Storage.update_session_time();
            this._init_password_manager();
        
        } else if(resultCode == this.VERSION_MGR_API.ETH_NEW_PIN){
            const {navigate} = this.props.navigation;
            navigate('PIN_Entry_V2_Screen', {VERSION_MGR_API: this.VERSION_MGR_API, pin_len: this.len});

            this.connecting = false;
            this.processing_request = false;
        
        }else{
            this._request_session();
        }
    };

    _request_session = async () => {
        var session = await Storage.get_session_pin(global.E_API.currID);
        this.len = await Storage.get_pin_len();
        if (this.len) {
            if (session == null || session == false) {
                this.VERSION_MGR_API.request_session(global.E_API, PSD_MGR_API.APP_ID, global.device_name, null, this.len, this._session_callback);
            } else {
                this.curr_PIN = session;
                this.VERSION_MGR_API.request_session(global.E_API, PSD_MGR_API.APP_ID, global.device_name, session, this.len, this._session_callback);
            }
        }
    }

    _session_callback = (new_PIN) => {
        if (new_PIN == false) {
            Storage.update_session_time();
            this._init_password_manager();
        } else {
            const {navigate} = this.props.navigation;
            navigate('PIN_Entry_Screen', {new_pin: new_PIN, pin_len: this.len});

            this.connecting = false;
            this.processing_request = false;
        }
    };

    _init_password_manager = () => {
        if(global.E_API == null){
            this._request_cancel_usage();
            return;
        }

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
        if (global.E_API !== null) {
            global.state.setState({ spinner: {visible: true, text: "Loading: Starting password manager..."} });
            global.E_API.DoAppKeyExchange(this.curr_PIN, resultCode => {
                if (resultCode === ETH_SUCCESS) {
                    global.state.setState({
                        spinner: {visible: true, text: 'Loading: Retrieving credentials...'},
                        curr_device: {id: global.E_API.currID, name: global.E_API.currName, sn: global.E_API.currSN, connected: true}
                    });

                    Storage.save_session_pin(global.E_API.currID, this.curr_PIN);
                    Storage.register_peripheral_data(global.E_API.currID, global.E_API.currName, global.E_API.currSN);

                    const {navigate} = this.props.navigation;
                    navigate('Vault_Screen');

                    this.connecting = false;
                    this.processing_request = false;
                }
            });

        } else {
            this._request_cancel_usage();
        }
    }

    /*
    ============================================================================================================
    ======================================= WRITING/READING ====================================================
    ============================================================================================================
    */
    _write_card = (out_msg, in_msg) => {
        if (global.E_API !== null) {
            global.E_API.WriteJSON_Encrypted(out_msg, in_msg, true, (resultCode, msg) => {
                if (resultCode === ETH_SUCCESS) {
                    var msg_obj = JSON.parse(msg);
                    this._process_reply_command(msg_obj);
                }
            });

        } else {
            this._request_cancel_usage();
        }
    };

    _process_reply_command = msg => {
        switch (msg.command) {
            case PSD_MGR_API.C2H_RPLY_INIT:
                if (msg.response === PSD_MGR_API.AWK) {
                    this._start_key_exchange();

                } else {
                    this._request_cancel_usage();
                }
                break;

            default:
                break;
        }
    };


    /*
     ============================================================================================================
     =========================================== RENDER =========================================================
     ============================================================================================================
     */
    _handle_alert_scanning = () => {
        if(this.processing_request == true || this.navigating == true) return;
        this.processing_request = true;

        this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: true} });
    }

    _handle_navigate_settings = () => {
        if(this.processing_request == true) return;

        this.setState({
            alert_system: {location_permission: false, location_state: false, ble_permission: false, ble_state: false},
            alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false}
        }, () => {
            if(!this.navigating){
                const { navigate } = this.props.navigation;
                navigate("Settings_Screen", {from: "Device_Screen"});
                this.navigating = true;
            }
        })
    }

    _handle_open_permission = () => {
        Linking.openSettings();
    }

    _handle_open_location_settings = () => {
        if(Platform.OS == "android") AndroidOpenSettings.locationSourceSettings();
        else Linking.openURL('App-Prefs:{0}');
    }

    _request_open_ble_settings = () => {
        if(Platform.OS === "android") AndroidOpenSettings.bluetoothSettings();
        else Linking.openURL('App-Prefs:{0}');
    }

    _request_reload_checks = () => {
        this.setState({
            device_list: [],
            alert_system: {location_permission: false, location_state: false, ble_permission: false, ble_state: false},
            alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false}
        }, () => {
            this.device_list = [];
            this._check_bluetooth_state();
        })
    };

    render() {
        return (
			<Container>
				<View>
					<Dialog.Container visible={this.state.alert_system.location_permission}>
						<Dialog.Title>Warning</Dialog.Title>
						<Dialog.Description>
							Allow "Ethernom Password Manager" to access this device's location
						</Dialog.Description>
						<Dialog.Button label="Dismiss" onPress={() => { this._request_reload_checks() }} />
						<Dialog.Button label="Settings" onPress={() => { this._handle_open_permission() }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert_system.location_state}>
						<Dialog.Title>Warning</Dialog.Title>
						<Dialog.Description>
							Turn On Location to allow "Ethernom Password Manager" to discover nearby bluetooth accessories
						</Dialog.Description>
						<Dialog.Button label="Dismiss" onPress={() => { this._request_reload_checks() }} />
						<Dialog.Button label="Settings" onPress={() => { this._handle_open_location_settings() }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert_system.ble_permission}>
						<Dialog.Title>Warning</Dialog.Title>
						<Dialog.Description>
							Allow "Ethernom Password Manager" to access this device's bluetooth
						</Dialog.Description>
						<Dialog.Button label="Dismiss" onPress={() => { this._request_reload_checks() }} />
						<Dialog.Button label="Settings" onPress={() => { this._handle_open_permission() }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert_system.ble_state}>
						<Dialog.Title>Warning</Dialog.Title>
						<Dialog.Description>
							Turn On Bluetooth to allow "Ethernom Password Manager" to connect to bluetooth accessories
						</Dialog.Description>
						<Dialog.Button label="Dismiss" onPress={() => { this._request_reload_checks() }} />
						<Dialog.Button label="Settings" onPress={() => { this._request_open_ble_settings() }} />
					</Dialog.Container>
				</View>
				<View>
					<Dialog.Container visible={this.state.alert_connection.communication}>
						<Dialog.Title>Error</Dialog.Title>
						<Dialog.Description>
							No response from the connected device. Please try again.
						</Dialog.Description>
						<Dialog.Button label="Okay" onPress={() => { this._request_cancel_usage() }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert_connection.connection}>
						<Dialog.Title>Error</Dialog.Title>
						<Dialog.Description>
							Make sure your device is powered on and authenticated. Please try again.
						</Dialog.Description>
						<Dialog.Button label="Okay" onPress={() => { this._request_cancel_usage() }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert_connection.internet}>
						<Dialog.Title>Error</Dialog.Title>
						<Dialog.Description>
							Please make sure you have wifi or cellular connection. Please try again.
						</Dialog.Description>
						<Dialog.Button label="Okay" onPress={() => {this._request_cancel_usage() }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert_connection.force}>
						<Dialog.Title>Updates required!</Dialog.Title>
						<Dialog.Description>
							To update your device, please use Ethernom Device Manager.
						</Dialog.Description>
						<Dialog.Button label="Update" onPress={() => { this.handle_request_launch_dm_app() }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert_connection.update}>
						<Dialog.Title>Updates available!</Dialog.Title>
						<Dialog.Description>
							To update your device, please use Ethernom Device Manager.
						</Dialog.Description>
						<Dialog.Button label="Disconnect" onPress={() => {this._request_cancel_usage() }} />
						<Dialog.Button label="Don't update" onPress={() => {this.handle_check_battery_level() }} />
						<Dialog.Button label="Update" onPress={() => {this.handle_request_launch_dm_app() }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert_connection.restore}>
						<Dialog.Title>Error</Dialog.Title>
						<Dialog.Description>
							To resume restore your device's data, please use Ethernom Device Manager.
						</Dialog.Description>
						<Dialog.Button label="Disconnect" onPress={() => {this._request_cancel_usage() }} />
						<Dialog.Button label="Restore" onPress={() => { this.handle_request_launch_dm_app() }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert_connection.battery}>
						<Dialog.Title>Warning</Dialog.Title>
						<Dialog.Description>
							Low battery! Please charge your device using the USB accessory.
						</Dialog.Description>
						<Dialog.Button label="Disconnect" onPress={() => {this._request_cancel_usage() }} />
						<Dialog.Button label="Continue" onPress={() => {this.handle_launch_card_app() }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert_connection.help}>
						<Dialog.Title>Unable to see your device?</Dialog.Title>
						<Dialog.Description>Make sure your device is powered on and authenticated.</Dialog.Description>
						<Dialog.Button label="Okay" onPress={() => { this.processing_request = false; this.setState({ alert_connection: {communication: false, connection: false, internet: false, force: false, update: false, restore: false, battery: false, help: false} }); }} />
					</Dialog.Container>

                    <Dialog.Container visible={this.state.bluetoothStatePermission}>
                        <Dialog.Title>Warning</Dialog.Title>
                        <Dialog.Description>
                            Turn On Bluetooth to allow "Ethernom Password Manager" to connect to bluetooth accessories
                        </Dialog.Description>
                        <Dialog.Button label="Dismiss" onPress={() => { this.handleDismiss() }} />
                        <Dialog.Button label="Settings" onPress={() => { this._request_open_ble_settings() }} />
                    </Dialog.Container>
				</View>

				<Header style={{backgroundColor: "#cba830"}}>
					<StatusBar backgroundColor= 'black' barStyle="light-content" />
					<Left style={{flex: 3, marginLeft: 8}}>
						<Button iconLeft transparent disabled={true}>
							<Image source={require('../assets/icon.png')} size={20} style={{width: 25, height: 25, resizeMode:'contain'}} />
						</Button>
					</Left>
					<Body style={{flex: 3, justifyContent:'center', alignItems:'center'}}><Title style={{color:'black', textAlign:'center'}}>Device</Title></Body>
					<Right style={{flex: 3}}>
						<Button iconLeft transparent onPress={() => this._handle_navigate_settings()}>
							<Image source={require('../assets/settings.png')} size={20} style={{width: 30, height: 30, resizeMode:'contain'}} />
						</Button>
					</Right>
				</Header>


                <View style={[{ height: 120, backgroundColor: '#e53935', display: this.state.bluetooth_permission ? "flex" : "none"}]}>
                    <View style={{flex: 1, flexDirection: 'row', height: 120}}>
                        <View style={{ flex: 3, marginTop: 10, marginBottom: 10, marginLeft: 13, marginRight: 10, flexDirection: 'column', alignSelf: 'center' }}>
                            <Text style={{ alignSelf: 'flex-start', fontSize: 16, fontWeight: 'bold', color: 'white', marginBottom: 5 }}>
                                Turn Bluetooth on for Device.
                            </Text>
                            <Text style={{alignSelf: 'flex-start', fontSize: 13, color: 'white'}}>
                                Go to System Settings to turn on Bluetooth for your device,so that App can detect and find your device
                            </Text>
                        </View>

                        <View style={{ flex: 1.5, alignSelf: 'center', marginRight: 10 }}>
                            <Button style={{backgroundColor: 'white'}} block rounded onPress={() => this._request_open_ble_settings()}>
                                <Text style={{color: '#e53935', fontWeight: 'bold'}}>Settings</Text>
                            </Button>
                        </View>
                    </View>
                    <View style={{height: 0.5, backgroundColor: 'gray'}}/>
                </View>

				<View style={[s.eth_btn_full,{height: 55}]}>
					<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
						<ActivityIndicator size="small" style={{marginLeft:16}}/>
						<Text style={{color: 'black', marginLeft: 18}}>Searching for nearby devices...</Text>
						<Button transparent onPress={() => this._handle_alert_scanning()} style={{justifyContent: 'center', position: 'absolute', right: 0, width: 55}}><Icon name={'ios-help'} color="#282828" size={30}/></Button>
					</View>
				</View>
				<Divider/>

				<Content>
					<View style={[s.container_list2]}>
						<FlatList
							data= {this.state.device_list}
							renderItem={({ item }) => (
								<ListItem button
										  onPress={() => {this._request_connect_device(item)}}
										  title={item.name} subtitle={item.d_sn} subtitleStyle={{ color: "#808080" }} rightIcon = {{name: "add"}}
										  bottomDivider
										  containerStyle = {{marginBottom:1}}
								/>
                            )}
							keyExtractor={(item, index) => index.toString()}
						/>
					</View>
				</Content>
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
