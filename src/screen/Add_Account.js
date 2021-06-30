import React, {Component} from 'react';
import {Linking,Platform, AppState, View, StatusBar, Keyboard, ScrollView, KeyboardAvoidingView, Dimensions} from 'react-native';
import {Content, Container, Text, Button, Header, Left, Body, Right, Title, Form, Item, Input, Label, Footer, Toast} from 'native-base';
import Icon from 'react-native-vector-icons/dist/Ionicons';
import Dialog from "react-native-dialog";
import {ListItem} from "react-native-elements";
import DeviceInfo from 'react-native-device-info';
import _ from 'lodash';

var s = require('../css/styles');
var Buffer = require('buffer/').Buffer;

import {PSD_MGR} from "@ethernom/ethernom_msg_psd_mgr";
var PSD_MGR_API = new PSD_MGR();

import AndroidOpenSettings from 'react-native-android-open-settings';
import BluetoothStateManager from 'react-native-bluetooth-state-manager';

const parseDomain = require("parse-domain");
const punycode = require('punycode');

const Helloworld = require('../util/Helloworld');
const HelloworldAutoFill = new Helloworld();

export default class Add_Account extends Component {
	constructor(props) {
        super(props);
        const { navigation } = this.props;
        this.state = {
			appState: AppState.currentState,
        	name: '',
            url: navigation.getParam('url', ''),
            username: '',
			password: '',
			hidden_password: '',
            hidden: true,
            isSavable: false,
            alert: {error: false, overwrite: false},
			error_text: '',hasFocus: false, keyboardVerticalOffset: 64,keyboardVerticalOffsetAndroid: -40, bluetooth_permission: false,is_bluetooth_off: false,bluetooth: false,
			keyboardOffset: 0,keyboardNonOffset: 0,keyboardState: 'closed',is_hidden_password: false, textPadding: 0
		};

		this.curr_job = {in_msg: null, out_msg: null};
		this.processing_request = false;

		this.curr_password = "";

        this.add = true;
    }

    componentDidMount(){
		this._blur_listener();

		AppState.addEventListener('change', this._handleAppStateChange);

        this.checkBluetoothState();
        this.checkBlueToothManager();
		global.isBlueToothChecked = false;
		this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow',this._keyboardDidShow);
		this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide',this._keyboardDidHide);
		
	};

    componentWillUnmount(){
		this.setState({ alert: {error: false, overwrite: false} });

		this.processing_request = false;
		if(this.did_blur_screen != null) this.did_blur_screen.remove();
		if(this.did_focus_screen != null) this.did_focus_screen.remove();

		if(this.write_timeout != null) clearTimeout(this.write_timeout);

		AppState.removeEventListener('change', this._handleAppStateChange);

		this.keyboardDidShowListener.remove();
		this.keyboardDidHideListener.remove();
		
	 };

	 _keyboardDidShow = async (event) => {

		let keyboardScreenHeight = Dimensions.get("window").height * 0.9 - event.endCoordinates.height;
		
		DeviceInfo.isLandscape().then(async isLandscape => {
			if (this.state.is_hidden_password === true) {
				if (isLandscape) {
					if (Platform.OS === "ios") {
						this.setState({keyboardOffset: 80})
					}else {
						this.setState({keyboardOffset: 2})
					}
			
				}else {
					if (keyboardScreenHeight <= 400) {
						this.setState({keyboardOffset: 60})
					}else {
						this.setState({keyboardOffset: 0})
					} 
				}
			
			}
	   
		});
	   
	   
	}

	_keyboardDidHide = () => {
		this.setState({keyboardOffset: 0,is_hidden_password: false}) 
	}
	// Keyboard listener 


	_handleAppStateChange = (nextAppState) => {
    	if(this.state.appState.match(/active|inactive/) && nextAppState === 'background') {
			if(this.write_timeout != null) clearTimeout(this.write_timeout);
		}
		this.setState({appState: nextAppState});
    };

	_blur_listener = () => {
		if(this.did_blur_screen != null) this.did_blur_screen.remove();
    	const { navigation } = this.props;
		this.did_blur_screen = navigation.addListener('didBlur', () => {
			this._focus_listener();
		});
    };

	_focus_listener = () => {
		if(this.did_focus_screen != null) this.did_focus_screen.remove();
    	const { navigation } = this.props;
		this.did_focus_screen = navigation.addListener('didFocus', () => {
			if(this.curr_job.out_msg != null && this.curr_job.in_msg != null){
				if(this.add == true){
					global.state.setState({ spinner: {visible: true, text: "Loading: Adding account..."} });
				}else{
					global.state.setState({ spinner: {visible: true, text: "Loading: Editing account..."} });
				}
				this._write_card(this.curr_job.out_msg, this.curr_job.in_msg);
			}

			this.did_focus_screen.remove();
		});
    }

    _reset_state = () => {
        this.setState({
            name: '', url: '', username: '', password: '',
            hidden: true,
            isSavable: true,
            alert: {error: false, overwrite: false},
            error_text: ''
        });
    };

    _handle_hide_show = () => {
        this.setState({ hidden: !this.state.hidden }, () => {
			console.log(this.state.hidden);
		})
    };

    _handle_save_account = () => {

    	if(this.state.bluetooth === true){
            //var result = parse_URL(this.state.url.trim());
            var result = this.state.url.trim();
            if(result == false){
                result = parse_IP(this.state.url.trim());
                if(result == false){
                    setTimeout(() => {
                        this.setState({
                            alert: {error: true, overwrite: false},
                            error_text: 'Invalid URL. Please try again with a valid URL.'
                        }, () => {
                            this.processing_request = false;
                        })
                    }, 600);
                    return;
                }
            }

            if(this.processing_request == true) return;
            this.processing_request = true;

            Keyboard.dismiss();

            //var result = parse_URL(this.state.url.trim());
            var result = this.state.url.trim();
            if(result == false){
                result = parse_IP(this.state.url.trim());
                if(result == false){
                    setTimeout(() => {
                        this.setState({
                            alert: {error: true, overwrite: false},
                            error_text: 'Invalid URL. Please try again with a valid URL.'
                        }, () => {
                            this.processing_request = false;
                        })
                    }, 600);
                    return;
                }
            }

            this.official_url = result;

            if(global.credentials_list.length == 0) {
                this._validate_entry();

            }else{
                for(var i = 0; i<global.credentials_list.length; i++){
                    var temp = global.credentials_list[i].url.toLowerCase();
                    if(temp.includes(this.official_url) && this.state.username.trim() == global.credentials_list[i].username.trim()){
                        setTimeout(() => {
                            this.setState({
                                alert: {error: true, overwrite: false},
                                error_text: 'Account already exists. Please try again with a different set of credentials.'
                            }, () => {
                                this.processing_request = false;
                            })
                        }, 600);
                        return;
                    }
                }

                //this._validate_duplicate_name();
                this._validate_entry();
            }
		}else {
            this.setState({is_bluetooth_off: true,bluetooth_permission: false});
		}

    };

    _validate_duplicate_name = () => {
    	for(var i = 0; i<global.credentials_list.length; i++){
			if(this.state.name.trim() == global.credentials_list[i].key.trim()){
				setTimeout(() => {
					this.setState({
						alert: {error: true, overwrite: false},
						error_text: 'Account\'s name already exists. Please try again with a different name.'
					}, () => {
						this.processing_request = false;
					})
				}, 600);
				return;
			}
		}

    	this._validate_entry();
    }

    _validate_entry = () => {
		var buf_name = Buffer.from(this.state.name, 'utf8');
		if(buf_name.length > 31){
			setTimeout(() => {
				this.setState({
					alert: {error: true, overwrite: false},
					error_text: 'Display name is too long. Please try again.'
				}, () => {
					this.processing_request = false;
				})
			}, 600);
			return;
		}
			
		var buf_url = Buffer.from(this.state.url, 'utf8');
		if(buf_url.length > 94){
			setTimeout(() => {
				this.setState({
					alert: {error: true, overwrite: false},
					error_text: 'URL is too long. Please try again.'
				}, () => {
					this.processing_request = false;
				})
			}, 600);
			return;
		}

		var buf_username = Buffer.from(this.state.username, 'utf8');	
		if(buf_username.length > 63){
			setTimeout(() => {
				this.setState({
					alert: {error: true, overwrite: false},
					error_text: 'Username is too long. Please try again.'
				}, () => {
					this.processing_request = false;
				})
			}, 600);
			return;
		}
		
		var buf_password = Buffer.from(this.state.password, 'utf8');
		if(buf_password.length > 63){
			setTimeout(() => {
				this.setState({
					alert: {error: true, overwrite: false},
					error_text: 'Password is too long. Please try again.'
				}, () => {
					this.processing_request = false;
				})
			}, 600);
			return;
		}

		this._check_account();
		
		/*
		var error = false;
		
		if (!this.isASCII(this.state.name) || !this.isASCII(this.state.url) || !this.isASCII(this.state.username) || !this.isASCII(this.state.password)) {
    		error = true;
		}

    	if(error == false){
    		this._check_account();
    	}else{
			/*
			setTimeout(() => {
				this.setState({
					alert: {error: true, overwrite: false},
					error_text: 'Credentials contains special characters. Please try again.'
				}, () => {
					this.processing_request = false;
				});
			}, 600);
		}
		*/
    }

    /*
	============================================================================================================
	====================================== HANDLER/LOGIC =======================================================
	============================================================================================================
	*/
    _handle_dismiss_dialog = () => {
    	this.setState({ alert: {error: false, overwrite: false}, error_text: "" });
    };

    _check_account = () => {
    	this.add = true;

    	global.state.setState({ spinner: {visible: true, text: "Loading: Adding account..."} }, () => {
			var out_msg = PSD_MGR_API.outMsg_request_checkAccount(this.official_url, this.state.username.trim(), this.state.password);
			var in_msg = PSD_MGR_API.inMsg_reply_generic();

            HelloworldAutoFill.setAutofillFlag("invalid");
			this._write_card(out_msg, in_msg);

			this.setState({isSavable: false})
		});
    }

    _handle_add_account = () => {
		console.log("ADD V1");
		var out_msg = PSD_MGR_API.outMsg_request_addAccount(this.official_url, this.state.username.trim(), this.state.password, this.state.name.trim());
		var in_msg = PSD_MGR_API.inMsg_reply_generic();
		this._write_card(out_msg, in_msg);
	}

	_handle_add_account_V2 = () => {
		console.log("ADD V2");
		var out_msg = PSD_MGR_API.outMsg_request_addAccount_V2(this.official_url, this.state.username.trim(), this.state.password, this.state.name.trim());
		var in_msg = PSD_MGR_API.inMsg_reply_generic_V2();
		this._write_card(out_msg, in_msg);
	}

	_handle_override_account =() => {
		this.add = false;

		this.setState({ alert: {error: false, overwrite: false}, error_text: "" }, () => {
			global.state.setState({ spinner: {visible: true, text: "Loading: Editing account..."} }, () => {
				var out_msg = PSD_MGR_API.outMsg_request_editAccount(this.official_url, this.state.username.trim(), this.state.password, this.state.name.trim());
				var in_msg = PSD_MGR_API.inMsg_reply_generic();
				this._write_card(out_msg, in_msg);
			});
		});
    };

	_init_check_account = () => {
    	var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(this.official_url, this.state.username.trim());
        var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
        this._write_card(out_msg, in_msg);
    }

	/*
	============================================================================================================
	======================================== WRITE/READ ========================================================
	============================================================================================================
	*/
	_write_card = (out_msg, in_msg) => {
		this.curr_job.in_msg = in_msg;
		this.curr_job.out_msg = out_msg;

		if(global.E_API != null){
    		this._start_write_timeout(out_msg, in_msg);
			global.E_API.WriteJSON_Encrypted(out_msg, in_msg, true, (resultCode, msg) => {
            	if(this.write_timeout_occur == true) return;
				if(this.write_timeout != null) clearTimeout(this.write_timeout);
				this.write_timeout = null;

				this.curr_job = {in_msg: null, out_msg: null};

                if (resultCode === ETH_SUCCESS) {
                    var msg_obj = JSON.parse(msg);
                    this._process_reply_command(msg_obj);
                }
            });

        }else{
        	global.state.setState({ spinner: {visible: true, text: "Loading: Reconnecting device..."} }, () => {
				global.reconnect_manager.request_reconnect(global.state.state.curr_device.id, global.state.state.curr_device.name, global.state.state.curr_device.sn, async (done) => {
					if(done == true){
						if(this.add == true){
							global.state.setState({ spinner: {visible: true, text: "Loading: Adding account..."} }, () => {
								this._write_card(out_msg, in_msg);
							});
						}else{
							global.state.setState({ spinner: {visible: true, text: "Loading: Editing account..."} }, () => {
								this._write_card(out_msg, in_msg);
							});
						}
					}else{
						this.processing_request = false;
						this.curr_job = {in_msg: null, out_msg: null};
					}
				});
				
                this.setState({isSavable: true})
			})

            HelloworldAutoFill.setAutofillFlag("valid");
        }
    };

    write_timeout_occur = false;
	_start_write_timeout = (out_msg, in_msg) => {
		this.write_timeout_occur = false;
		if(this.write_timeout != null) clearTimeout(this.write_timeout);
		this.write_timeout = null;

		this.write_timeout = setTimeout(() => {
			this.write_timeout_occur = true;
			console.log("WTIRE TIMEOUT");
			console.log(out_msg[0].command);
			if(out_msg[0].command == PSD_MGR_API.H2C_RQST_ADD_ACCOUNT_V2){
				this._handle_add_account();
			}
			else{
				this._write_card(out_msg, in_msg);
			}
		}, 6000);
	}
	
    _process_reply_command = (msg) => {
		switch (msg.command) {
			case PSD_MGR_API.C2H_RPLY_ADD_ACCOUNT_V2:
				console.log("response", msg); 

                if (msg.response === PSD_MGR_API.AWK) {
                	console.log("add successfull");
                    var obj = [{id: msg.index, key: this.state.name.trim(), url: this.official_url, username: this.state.username.trim()}];

                    var credentailsObject = {id: msg.index, key: this.state.name.trim(), url: this.official_url, username: this.state.username.trim(), password: this.state.password};
					HelloworldAutoFill.addAccountToDB(credentailsObject);
					
					console.log(credentailsObject);

					var temp_list = obj.concat(global.credentials_list);
                    global.credentials_list = _.orderBy(temp_list, ({key = ''}) => key.toLowerCase());
                    
                    Toast.show({
						text: "Successfully added account",
						buttonText: "Okay",
						position: "bottom",
						duration: 4000,
						type: "success"
					})

					global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						const {navigate} = this.props.navigation;
						navigate('Vault_Screen');
					});

                } else {
                    global.state.setState({ spinner: {visible: false, text: ""} }, () =>{;
						setTimeout(() => {
							this.setState({
								alert: {error: true, overwrite: false},
								error_text: 'Add account fails. Please try again.'
							}, () => {
								this.processing_request = false;
							})
						}, 600);
					})
                }
                HelloworldAutoFill.setAutofillFlag("valid");
                break;
			case PSD_MGR_API.C2H_RPLY_ADD_ACCOUNT:
				console.log("response", msg.response);

                if (msg.response === PSD_MGR_API.AWK) {
                	console.log("add successfull");
                    var obj = [{key: this.state.name.trim(), url: this.official_url, username: this.state.username.trim()}];

                    var credentailsObject = {key: this.state.name.trim(), url: this.official_url, username: this.state.username.trim(), password: this.state.password};
					HelloworldAutoFill.addAccountToDB(credentailsObject);
					
					console.log(credentailsObject);

					var temp_list = obj.concat(global.credentials_list);
                    global.credentials_list = _.orderBy(temp_list, ({key = ''}) => key.toLowerCase());
                    
                    Toast.show({
						text: "Successfully added account",
						buttonText: "Okay",
						position: "bottom",
						duration: 4000,
						type: "success"
					})

					global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						const {navigate} = this.props.navigation;
						navigate('Vault_Screen');
					});

                } else {
                    global.state.setState({ spinner: {visible: false, text: ""} }, () =>{;
						setTimeout(() => {
							this.setState({
								alert: {error: true, overwrite: false},
								error_text: 'Add account fails. Please try again.'
							}, () => {
								this.processing_request = false;
							})
						}, 600);
					})
                }
                HelloworldAutoFill.setAutofillFlag("valid");
                break;

			 case PSD_MGR_API.C2H_RPLY_EDIT_ACCOUNT:
                if (msg.response === PSD_MGR_API.AWK) {
                	for(var i = 0; i<global.credentials_list.length; i++){
						if(this.official_url == global.credentials_list[i].url.trim() && this.state.username.trim() == global.credentials_list[i].username.trim()){
							global.credentials_list[i].key = this.state.name.trim();
							global.credentials_list[i].url = this.official_url;
							global.credentials_list[i].username = this.state.username.trim();
							break;
						}
					}

					Toast.show({
						text: "Successfully edited account",
						buttonText: "Okay",
						position: "bottom",
						duration: 4000,
						type: "success"
					})

					global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						const {navigate} = this.props.navigation;
						navigate('Vault_Screen');
					});

                }else{
                	global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						setTimeout(() => {
							this.setState({
								alert: {error: true, overwrite: false},
								error_text: 'Edit account fails. Please try again.'
							}, () => {
								this.processing_request = false;
							})
						}, 600);
					});
                }
				break;

			case PSD_MGR_API.C2H_RPLY_CHECK_ACCOUNT:
                if (msg.response === PSD_MGR_API.NAK) {
					//this._handle_add_account();
					this._handle_add_account_V2();

                } else if (msg.response === PSD_MGR_API.AWK) {
                    global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						setTimeout(() => {
							this.setState({
								alert: {error: false, overwrite: true},
								error_text: ''
							}, () => {
								this.processing_request = false;
							})
						}, 600);
					});

                } else if (msg.response === PSD_MGR_API.OTHER) {
                    global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						setTimeout(() => {
							this.setState({
								alert: {error: true, overwrite: false},
								error_text: 'Account already exist. Please try again with a different set of credentials.'
							}, () => {
								this.processing_request = false;
							})
						}, 600);
					});
                }
                HelloworldAutoFill.setAutofillFlag("valid");
                break;

            case PSD_MGR_API.C2H_RPLY_GET_ACCOUNT_PASS:
                if (msg.response === PSD_MGR_API.AWK) {
                    console.log("add successfull");
                    var obj = [{key: this.state.name.trim(), url: this.official_url, username: this.state.username.trim()}];
                    global.credentials_list = obj.concat(global.credentials_list);

                    Toast.show({
						text: "Successfully added account",
						buttonText: "Okay",
						position: "bottom",
						duration: 4000,
						type: "success"
					})

                    global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						const {navigate} = this.props.navigation;
						navigate('Vault_Screen');
					});

                } else {
                    global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						Toast.show({
							text: "Unable to complete request. Please try again.",
							buttonText: "Okay",
							position: "bottom",
							duration: 4000,
							type: "danger"
						});

						this.processing_request = false;
					});
                }
                break;

			default:
				break;
		};
    };

    /*
	============================================================================================================
	======================================== TEXT/LOGIC ========================================================
	============================================================================================================
	*/
	//.replace(/\s/g, '')
    _handle_text_change = async (txt, type) => {
		if (type === 'name' && txt.length <= 31)
			await this.setState({name: txt});
		else if (type === 'url' && txt.length <= 94)
			await this.setState({url: txt});
		else if (type === 'username' && txt.length <= 63)
			await this.setState({username: txt});
		else if (type === 'password' && txt.length <= 63){
			var hidden = "";
			for(var i = 0; i<txt.length; i++) hidden += "*";
			await this.setState({password: txt, hidden_password: hidden});
		}

		this.handleOnChange();
		global.bottom_sheets_device.close();
    };

    handleOnChange = () => {
        this.setState({isSavable:false});
        if(this.state.name !== "" && this.state.url !== "" && this.state.username !== "" && this.state.password !== ""){
            if(this.state.name.trim().length <= 0 || this.state.url.trim().length <= 0 || this.state.username.trim().length <= 0 || this.state.password.trim().length <= 1){
                this.setState({isSavable: false});
            } else {
                this.setState({isSavable: true});
            }
        } else {
            this.setState({isSavable: false});
        }
    };

    isASCII = (str) => {
    	return /^[\x00-\x7F]*$/.test(str);
    };

     /*
	============================================================================================================
	========================================= NAVIGATE =========================================================
	============================================================================================================
	*/
	_handle_navigate_add_staging = () => {
    	const {navigate} = this.props.navigation;
		navigate("Add_Staging_Screen");
		global.reConnected = false;
    };
    _handle_open_bottom_sheets_device = () => {
    	global.bottom_sheets_device.open();

		Keyboard.dismiss();
    };
	

    _request_open_ble_settings = () => {
        if(Platform.OS === "android") AndroidOpenSettings.bluetoothSettings();
        else Linking.openURL('App-Prefs:{0}');

    };
    checkBluetoothState = () => {
        BluetoothStateManager.getState().then(bluetoothState => {
            switch (bluetoothState) {
				case 'PoweredOff':
					this.setState({bluetooth: false});
                    break;
                case 'PoweredOn':
                    this.setState({bluetooth_permission: false,is_bluetooth_off: false,bluetooth: true});
                    break;
                default:
                    break;
            }
        });
    };

    checkBlueToothManager = () => {
        BluetoothStateManager.onStateChange(bluetoothState => {
            switch (bluetoothState) {
                case 'PoweredOff':
                    this.setState({bluetooth: false});
                    break;
                case 'PoweredOn':
                    this.setState({bluetooth_permission: false,is_bluetooth_off: false,bluetooth: true});
                    break;
                default:
                    break;
            }
        }, true);
    };
    handleDismiss = () => {
        this.setState({bluetooth_permission: false,is_bluetooth_off: false});
    };

	formatText = (text) => {
		return text.replace(/[^+\d]/g, '*');
	};

   
	
	render() {
		return (
			<Container>
				<View>
					<Dialog.Container visible={this.state.alert.error}>
						<Dialog.Title>Error</Dialog.Title>
						<Dialog.Description>{this.state.error_text}</Dialog.Description>
						<Dialog.Button label="Okay" onPress={() => { this._handle_dismiss_dialog(); }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert.overwrite}>
						<Dialog.Title>Warning</Dialog.Title>
						<Dialog.Description>Do you want to edit your current account?</Dialog.Description>
						<Dialog.Button label="Cancel" onPress={() => { this._handle_dismiss_dialog(); }} />
						<Dialog.Button label="Okay" onPress={() => { this._handle_override_account(); }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.is_bluetooth_off}>
						<Dialog.Title>Warning</Dialog.Title>
						<Dialog.Description>
							Turn On Bluetooth to allow "Ethernom Password Manager" to connect to bluetooth accessories
						</Dialog.Description>
						<Dialog.Button label="Dismiss" onPress={() => { this.handleDismiss() }} />
						<Dialog.Button label="Settings" onPress={() => { this._request_open_ble_settings() }} />
					</Dialog.Container>
				</View>

				<Header style={{backgroundColor: "#cba830"}}>
					<StatusBar backgroundColor='black' barStyle="light-content"/>
					<Left style={{flex: 3, marginLeft: 8}}><Button iconLeft transparent onPress={() => {this._handle_navigate_add_staging();}}><Text><Text style={{color: 'black', backgroundColor: 'transparent'}}>Back</Text></Text></Button></Left>
					<Body style={{flex: 3, justifyContent:'center', alignItems:'center', paddingRight: 10}}><Title style={{color:'black'}}>Vault</Title></Body>
					<Right style={{flex: 3}}><Button iconLeft transparent onPress={() => {this._handle_save_account();}} disabled={!this.state.isSavable}><Text><Text style={{color: !this.state.isSavable ? '#ccc' : 'black', backgroundColor: 'transparent'}}>Save</Text></Text></Button></Right>
				</Header>

				<View style={[s.container]}>
					<View style={[s.container_list, {backgroundColor: 'white'}]}>
						<ListItem button
							onPress={() => this._handle_open_bottom_sheets_device()}
							title = {global.state.state.curr_device.name}
							containerStyle = {{ backgroundColor: "#282828" }}
							titleStyle = {{color: 'white', marginLeft: 30, textAlign: 'center'}}
							//leftIcon = {{name: "ios-radio-button-on", type: "ionicon", color: this.state.connected ? "#ADFF2F" : "red" }}
							rightIcon = {{name: "ios-settings", type: "ionicon", color: "white"}}
							bottomDivider
						/>

						<View style={[s.container_header_title,{justifyContent: 'center', alignItems:'center', borderBottomWidth: 1, borderColor:'#EEEEEE', backgroundColor: 'white'}]}>
							<Text style={{marginTop:5}}>Add account</Text>
						</View>
						<Content>

						<KeyboardAvoidingView
								behavior={Platform.OS === "ios" ? 'position' : 'padding'}
								keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>
							
									<Form> 
										<Item stackedLabel style={{bottom: this.state.keyboardOffset}}>
											<Label style={{fontSize: 12}}>Display name:</Label>
											<Input onChangeText={(text) => this._handle_text_change(text, 'name')} maxLength={31} autoCorrect={false} value={this.state.name}
												   onFocus={() => {
													   this.setState({is_hidden_password: false});
													}}
											/>  
										</Item>

										<Item stackedLabel style={{bottom: this.state.keyboardOffset}}>
											<Label style={{fontSize: 12}}>URL:</Label>
											<Input onChangeText={(text) => this._handle_text_change(text, 'url')} maxLength={94} autoCapitalize="none" autoCorrect={false} value={this.state.url}
												   onFocus={() => {
                                                       this.setState({is_hidden_password: false});
												   }}
											/>
										</Item>

										<Item stackedLabel style={{bottom: this.state.keyboardOffset}}>
											<Label style={{fontSize: 12}}>Username:</Label>
											<Input textAlignVertical={'top'}
												onChangeText={(text) => this._handle_text_change(text, 'username')} maxLength={63}
												onFocus={() => {
													this.setState({is_hidden_password: false}); 
												}}
												autoCapitalize="none" autoCorrect={false} value={this.state.username}
											/>
										</Item>
 
										<Item stackedLabel last style={{bottom: this.state.keyboardOffset}}>  
											<Label style={{fontSize: 12}}>Password:</Label>
											<View style={{flex: 1, flexDirection: 'row'}}>    
												{!this.state.hidden ?
													(  
														<View style={{width: '60%', flex: 1}}>
															<Input style={{fontSize: 15, width: '60%'}} 
															maxLength={63} autoCapitalize="none" autoCorrect={false} autoComplete="off" autoCompleteType="off"
															onChangeText={(text) => this._handle_text_change(text, 'password')}
															value={this.state.password}
															onFocus={() => { 
																this.setState({is_hidden_password: false}); 
															}}
														/>
														</View>
													) :  
													(
														<View style={{width: '60%', flex: 1}}>
															<Input 
																ref={(input) => { this.password_input_field = input; }} 
																style={{display: this.state.hidden ? "none" : "flex", fontSize: 15, width: '100%'}} 
																maxLength={63} autoCapitalize="none" autoCorrect={false} autoComplete="off" autoCompleteType="off"
																onChangeText={(text) => this._handle_text_change(text, 'password')}
																value={this.state.password} 
																onFocus={() => {   
																	this.setState({is_hidden_password: true}); 
																}}
															/>	   

															<Input style={{display: this.state.hidden ? "flex" : "none", fontSize: 15, width: '100%'}} 
																maxLength={63} autoCapitalize="none" autoCorrect={false} autoComplete="off" autoCompleteType="off"
																value={this.state.hidden_password} 
																onFocus={() => {
																	if(this.password_input_field) this.password_input_field._root.focus();
																	this.setState({is_hidden_password: true});   
																}}  
																 
																
															/>
														</View> 
													)
												} 
												<Button style={{width: 30, marginTop: 0, marginRight: 15}} onPress={() => this._handle_hide_show()} transparent>
													<Icon name= {this.state.hidden ? 'ios-eye' : 'ios-eye-off'} size={25} color="#cba830"/>
												</Button>
											</View>
										</Item>
									</Form>
							</KeyboardAvoidingView>
						</Content>
					</View>
				</View>
			</Container>
		);
	}
}

function parse_URL(url){
	var punyCode_url = punycode.toASCII(url)
	var parse = parseDomain(punyCode_url);

	if(parse == null ) return false;
	if(parse.domain != "" && parse.tld != ""){
		return parse.domain + "." + parse.tld
	}else{
		return false;
	}
}

var ipv4Regex = /^(\d{1,3}\.){3,3}\d{1,3}$/;
var ipv6Regex = /^(::)?(((\d{1,3}\.){3}(\d{1,3}){1})?([0-9a-f]){0,4}:{0,2}){1,8}(::)?$/i;
function parse_IP(url){
	var punyCode_url = punycode.toASCII(url)

	if(ipv4Regex.test(punyCode_url) == true){
		return punyCode_url;
	}else if(ipv6Regex.test(punyCode_url) == true){
		return punyCode_url;
	}else{
		return false;
	}
}
