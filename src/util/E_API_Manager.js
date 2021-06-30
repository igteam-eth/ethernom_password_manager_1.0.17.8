import {Platform, AppState} from 'react-native';

import {EthernomAPI} from "@ethernom/ethernom-api";
import {PSD_MGR} from "@ethernom/ethernom_msg_psd_mgr";
import {VERSION_MGR} from "@ethernom/ethernom_version_mgr";
var PSD_MGR_API = new PSD_MGR();

//Storage API
const StorageAPI = require('../util/Storage.js');
const Storage = new StorageAPI();
const group = 'group.com.ethernom.password.manager.mobile';

module.exports = class E_API_Manager {
	VERSION_MGR_API = new VERSION_MGR(PSD_MGR_API.APP_ID, global.app_info.company, global.app_info.product, global.app_info.id, global.app_info.version, group);
	constructor() {
		this.VERSION_MGR_API.subsribe_error(this._error_alert);

		this.connecting = false;
		this.reattempts = false;
		this.connection_timeout_occur = false;
		this.launch_app_timeout_occur = false;
	
		this.write_timeout_occur = false
		this.curr_job = {in_msg: null, out_msg: null, callback_function: null}

		this.state = {
			appState: AppState.currentState
		}
	}
	
	componentDidMount() {
		AppState.addEventListener('change', this._handleAppStateChange);
	}

    componentWillUnmount() {
		AppState.removeEventListener('change', this._handleAppStateChange);
	}

	_handleAppStateChange = (nextAppState) => {
    	if(this.state.appState.match(/active|inactive/) && nextAppState === 'background') {
			this._reset_state();
		}
		this.setState({appState: nextAppState});
    }
    
    _error_alert = () => {
		this._reset_state();

		global.state.setState({ 
			spinner: {visible: false, text: ""},
			alert: {communication: true, connect: false, restore: false}
		}, () => {
			if(this.request_reconnect_callback != null) this.request_reconnect_callback(false);
			this.request_reconnect_callback = null;
		});

		if(global.E_API != null){
			global.E_API.CardClose(callback = (resultCode) => {
				global.E_API = null;
			});	
		}
	}

	_reset_state = () => {
		this.connecting = false;
		this.reattempts = false;

		this.connection_timeout_occur = false;
		if(this.connection_timeout != null) clearTimeout(this.connection_timeout);

		this.launch_app_timeout_occur = false;
		if(this.launch_app_timeout != null) clearTimeout(this.launch_app_timeout);
	}
	
	request_reconnect = (deviceID, deviceName, deviceSN, callback) => {
		if(deviceID == "" || deviceName == "" || deviceSN == ""){
			this._reset_state();
			global.state.setState({ 
				spinner: {visible: false, text: ""}, 
				alert: {communication: false, connect: false, restore: false} 
			}, () => {
				if(this.request_reconnect_callback != null) this.request_reconnect_callback(false);
				this.request_reconnect_callback = null;
			});
			return;
		}
		
		if(this.connecting == true) return;
		this._reset_state();

		this.connecting = true;

		if(this.request_reconnect_callback != null) this.request_reconnect_callback = null;
		this.request_reconnect_callback = callback;

		this._init_e_api_device(deviceID, deviceName, deviceSN);
	}

	request_dismiss_reconnect = () => {
		if(this.connecting == false) return;
		this._reset_state();

		global.state.setState({ 
			spinner: {visible: false, text: ""}, 
			alert: {communication: false, connect: false, restore: false} 
		}, () => {
			if(this.request_reconnect_callback != null) this.request_reconnect_callback(false);
			this.request_reconnect_callback = null;
		})

		if(global.E_API != null){
			global.E_API.CardClose(callback = (resultCode) => {
				global.E_API = null;
			});	
		}
	}
	
	_init_e_api_device = async (deviceID, deviceName, deviceSN) => {
		var E_API = await new EthernomAPI("BLE", PSD_MGR_API.SERIVCE_PORT, 0, false, true, async (resultCode) => {
            if (resultCode === ETH_SUCCESS) {
            	global.E_API = await E_API;
                this._device_select(deviceID, deviceName, deviceSN);
            }
        });
	}

	reattempts = false;
	_device_select = (deviceID, deviceName, deviceSN) => {
		this.connection_timeout_occur = false;

		this.connection_timeout = setTimeout(() => {
			this.connection_timeout_occur = true;
			this.connecting = false;
			this.connection_timeout = null;

			if(global.E_API != null){
				global.E_API.CardClose(callback = (resultCode) => {
					global.E_API = null;
					
					if(this.reattempts == true){
						this.reattempts = false;
						global.state.setState({ 
							spinner: {visible: false, text: ""},
							alert: {communication: false, connect: true, restore: false}
						}, () => {
							if(this.request_reconnect_callback != null) this.request_reconnect_callback(false);
							this.request_reconnect_callback = null;
						});	
					}else{
						this.reattempts = true;
						this._init_e_api_device(deviceID, deviceName, deviceSN);
					}
				});
			}
		}, 5000);
		
		if(global.E_API == null) return;
        global.E_API.Select(deviceID, deviceSN, deviceName, async (resultCode) => {
            if (resultCode === ETH_SUCCESS) {
				if(this.connection_timeout_occur == true) return;
            	clearTimeout(this.connection_timeout);
				this._request_app_auth();
            }
        });
	};
	
	_subscribe_on_disconnect = () => {
		if(global.E_API == null) return;
		var d_id = global.E_API.currID, d_name = global.E_API.currName, d_sn = global.E_API.currSN;
    	global.E_API.OnCardDisconnected((resultCode) => {
			this.connecting = false;
            if (resultCode === ETH_SUCCESS) {
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
            };
    	});
	}
    
    _request_app_auth = () => {
		if(global.E_API == null) return;
    	this.VERSION_MGR_API.request_app_auth(global.E_API, callback = async (E_API, authenticated) => {
    		if(authenticated === true){
    			this._request_launch_card_app();
			}
		});
    }
    
	_request_launch_card_app = () => {
		if(global.E_API == null) return;
    	global.state.setState({ spinner: {visible: true, text: "Loading: Verifying connection..."} });
		
    	this.launch_app_timeout_occur = false;
    	this.launch_app_timeout = setTimeout(() => {
			this.launch_app_timeout_occur = true;
			this._request_app_auth();
		}, 10000);
    	
    	global.E_API.LaunchApp(PSD_MGR_API.APP_ID, (resultCode) => {
    		if(this.launch_app_timeout_occur == true) return;
    		clearTimeout(this.launch_app_timeout)
    		
    		if(resultCode === ETH_SUCCESS) {
				this._request_session_v2();
			
			}else if(resultCode === 1){
				this._request_app_auth();
			
			}else if(resultCode == global.E_API.CM_ERR_RESTORE_INCOMPLETE){
				setTimeout(() => {
					global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						setTimeout(() => {
							global.state.setState({ alert: {communication: false, connect: false, restore: true} }, () => {
								if(this.request_reconnect_callback != null) this.request_reconnect_callback(false);
								this.request_reconnect_callback = null;
							});
						}, 600);	
					});
				}, 600);	
				
			}
		})
    }
	
	_request_session_v2 = async () => {
		if(global.E_API == null) return;

		this._subscribe_on_disconnect();
		global.state.setState({ spinner: {visible: true, text: "Loading: Launching..."} });

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
			console.log("Require PIN V2...");
			this._reset_state();
            global.navigate('PIN_Entry_V2_Screen', {VERSION_MGR_API: this.VERSION_MGR_API, pin_len: this.len, from: "RECONNECT"});
        
        }else{
            this._request_session();
        }
    };

    _request_session = async () => {
		if(global.E_API == null) return;

		this._subscribe_on_disconnect();
		global.state.setState({ spinner: {visible: true, text: "Loading: Launching..."} });

    	var session = await Storage.get_session_pin(global.E_API.currID);
        this.len = await Storage.get_pin_len();
        if(this.len){
			if(session == null || session == false){
				this.VERSION_MGR_API.request_session(global.E_API, PSD_MGR_API.APP_ID, global.device_name, null, this.len, this._session_callback);
			}else{
				this.curr_PIN = session;
				this.VERSION_MGR_API.request_session(global.E_API, PSD_MGR_API.APP_ID, global.device_name, session, this.len, this._session_callback);
			}
        }
    }
    
    _session_callback = (new_PIN) => {
		if(global.E_API == null) return;
    	if(new_PIN == false){
    		Storage.update_session_time();
    		this._init_password_manager();
    	}else{
			console.log("Require PIN...");
			this._reset_state();
    		global.navigate('PIN_Entry_Screen', {new_pin: new_PIN, pin_len: this.len, from: "RECONNECT"});
    	}
    }
    
    _init_password_manager = () => {
		if(global.E_API === null) return;
		global.state.setState({ spinner: {visible: true, text: "Loading: Starting password manager..."} });

		var code = makeCode(6);
		var out_msg = PSD_MGR_API.outMsg_request_OpenService(global.device_name, code);
		var in_msg = PSD_MGR_API.inMsg_reply_generic();
		
		var timeout = Platform.OS == "ios" ? 0 : 1000;
		setTimeout(() => {
            if(global.E_API === null) return;

			global.E_API.WriteJSON_Encrypted(out_msg, in_msg, false, (resultCode, msg) => {
				if (resultCode === ETH_SUCCESS) {
					var msg_obj = JSON.parse(msg);
					this._process_reply_command(msg_obj);
				}
			});
		}, timeout);
	}
    
    _start_key_exchange = () => {
		if(global.E_API == null) return;
		global.E_API.DoAppKeyExchange(this.curr_PIN, (resultCode) => {
			if (resultCode === ETH_SUCCESS) {
				console.log('pin entry key exchange success');
				
				this.connecting = false;
				global.state.setState({ 
					spinner: {visible: false, text: ""},
					curr_device: {id: global.E_API.currID, name: global.E_API.currName, sn: global.E_API.currSN, connected: true} 
				}, () => {
					Storage.save_session_pin(global.E_API.currID, this.curr_PIN);
					Storage.register_peripheral_data(global.E_API.currID, global.E_API.currName, global.E_API.currSN);
					
					if(this.request_reconnect_callback != null) this.request_reconnect_callback(true);
					this.request_reconnect_callback = null;
				})
			}
		});
	}
	
	/*
	============================================================================================================
	======================================= WRITING/READING ====================================================
	============================================================================================================
	*/
    _process_reply_command = async (msg) => {
		switch (msg.command) {
			case PSD_MGR_API.C2H_RPLY_INIT:
				if (msg.response === PSD_MGR_API.AWK) {
					this._start_key_exchange();
				}
				break;

			default:
				break;
		};
    };
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