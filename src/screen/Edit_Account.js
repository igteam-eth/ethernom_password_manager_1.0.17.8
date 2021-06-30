import React, {Component} from 'react';
import {Linking,Platform, AppState, View, StatusBar, Keyboard, KeyboardAvoidingView, Dimensions} from 'react-native';
import {Content, Container, Text, Button, Header, Left, Body, Right, Title, Form, Item, Input, Label, Toast} from 'native-base';
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

export default class Edit_Account extends Component {
    constructor(props) {
        super(props);

		const { navigation } = this.props;
        this.state = {
			appState: AppState.currentState,
        	name: navigation.getParam('name', ""),
            url: navigation.getParam('url', ""),
            username: navigation.getParam('username', ""),
			password: navigation.getParam('password', ""),
			hidden_password: "",
            hidden: true,
            isEditable: false,
            alert: false,
            error_text: "",keyboardOffset: 0,keyboardNonOffset: 0,keyboardState: 'closed',is_hidden_password: false,
			hasFocus: false, keyboardVerticalOffset: 64,bluetooth_permission: false,is_bluetooth_off: false,bluetooth: false,
        }

		this.curr_credential = {id: navigation.getParam('id', -1), name: this.state.name, url: this.state.url, username: this.state.username, password: ""};
		var array = [], found = false;
		for(var i =0; i<global.credentials_list.length; i++){
			if(this.state.name.trim() == global.credentials_list[i].key.trim() && this.state.url.trim() == global.credentials_list[i].url.trim() && this.state.username.trim() == global.credentials_list[i].username.trim()){
				if(found == false){
					found = true;
				}else{
					array = array.concat(global.credentials_list[i]);
				}
			}else{
				array = array.concat(global.credentials_list[i]);
			}
		}
		this.curr_credentials_list = array;

		this.curr_job = {in_msg: null, out_msg: null};
		this.processing_request = false;

        this.checking = false;

        this.current_password = "";

    }

    componentDidMount(){
		global.state.setState({ spinner: {visible: false, text: ""} });
		this._blur_listener();
		
		var hidden = "";
		for(var i = 0; i<this.state.password.length; i++) hidden += "*";
		this.setState({
			hidden_password: hidden
		})

		AppState.addEventListener('change', this._handleAppStateChange);

        this.checkBlueToothManager();
        this.checkBluetoothState();
		global.isBlueToothChecked = false;
		this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow',this._keyboardDidShow);
		this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide',this._keyboardDidHide);

    }

    componentWillUnmount(){
		this.setState({ alert: false });

		this.processing_request = false;
		if(this.did_blur_screen != null) this.did_blur_screen.remove();
		if(this.did_focus_screen != null) this.did_focus_screen.remove();
		
		if(this.write_timeout != null) clearTimeout(this.write_timeout);

		AppState.removeEventListener('change', this._handleAppStateChange);
		this.keyboardDidShowListener.remove();
		this.keyboardDidHideListener.remove();
	}

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

	_handleAppStateChange = (nextAppState) => {
    	if(this.state.appState.match(/active|inactive/) && nextAppState === 'background') {
			if(this.write_timeout != null) clearTimeout(this.write_timeout);
		}
		this.setState({appState: nextAppState});
    }

	_blur_listener = () => {
		if(this.did_blur_screen != null) this.did_blur_screen.remove();
    	const { navigation } = this.props;
		this.did_blur_screen = navigation.addListener('didBlur', () => {
			this._focus_listener();
		});
    }

    _focus_listener = () => {
		if(this.did_focus_screen != null) this.did_focus_screen.remove();
    	const { navigation } = this.props;
		this.did_focus_screen = navigation.addListener('didFocus', () => {
			if(this.curr_job.out_msg != null && this.curr_job.in_msg != null){
				global.state.setState({ spinner: {visible: true, text: "Loading: Editing account..."} }, () => {
					this._write_card(this.curr_job.out_msg, this.curr_job.in_msg);
				});
			}

			this.did_focus_screen.remove();
		});
    }

    _handle_hide_show = () => {
    	this.setState({ hidden: !this.state.hidden }, () => {
			if(this.state.hidden == true){
				if(this.password_input_field) this.password_input_field._root.focus();
			}
		})
    }

    _handle_edit_account = () => {

    	if(this.state.bluetooth === true){
            //var result = parse_URL(this.state.url.trim());
            var result = this.state.url.trim();
            if(result == false){
                result = parse_IP(this.state.url.trim())
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

            for(var i = 0; i<this.curr_credentials_list.length; i++){
                if(this.curr_credentials_list[i].url.includes(this.official_url) && this.state.username.trim() == this.curr_credentials_list[i].username.trim()){
                    setTimeout(() => {
                        this.setState({
                            alert: true,
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
		}else {
            this.setState({is_bluetooth_off: true,bluetooth_permission: false});
		}

    };

    _validate_duplicate_name = () => {
    	for(var i = 0; i<this.curr_credentials_list.length; i++){
			if(this.state.name.trim() == this.curr_credentials_list[i].key.trim()){
				setTimeout(() => {
					this.setState({
						alert: true,
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

			console.log(buf_name);
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

		//EDIT ACCOUNT
		const v2_protocol = this.curr_credential.id != -1;
		v2_protocol ? this._edit_credential_V2() : this._delete_credential();
		
		/*
		var error = false;
		if (!this.isASCII(this.state.name) || !this.isASCII(this.state.url) || !this.isASCII(this.state.username) || !this.isASCII(this.state.password)) {
    		error = true;
		}
		
		if(error == false){
    		this._delete_credential();

    	}else{
			setTimeout(() => {
				this.setState({
					alert: {error: true, overwrite: false},
					error_text: 'Credentials contains special characters. Please try again.'
				}, () => {
					this.processing_request = false;
				})
			}, 600);
		}
		*/
    }

    _handle_dismiss_dialog = () => {
        this.setState({ alert: false, error_text: ""})
    };

    /*
	============================================================================================================
	====================================== E_API PROTOCOL ======================================================
	============================================================================================================
	*/
    _init_password = () => {
    	var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(this.state.url, this.state.username);
        var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
        this._write_card(out_msg, in_msg);
    }

    _delete_credential = () => {
    	global.state.setState({ spinner: {visible: true, text: "Loading: Editing account..."} }, () => {
			var out_msg = PSD_MGR_API.outMsg_request_deleteAccount(this.curr_credential.url, this.curr_credential.username);
			var in_msg = PSD_MGR_API.inMsg_reply_generic();

            HelloworldAutoFill.setAutofillFlag("invalid");
			this._write_card(out_msg, in_msg);

			this.setState({isEditable: false});
		});
    };

    _edit_credential = () => {
    	var out_msg = PSD_MGR_API.outMsg_request_editAccount(this.official_url, this.state.username.trim(), this.state.password, this.state.name.trim());
		var in_msg = PSD_MGR_API.inMsg_reply_generic();

		HelloworldAutoFill.setAutofillFlag("invalid");
		this._write_card(out_msg, in_msg);
	}
	
	_edit_credential_V2 = () => {
    	var out_msg = PSD_MGR_API.outMsg_request_editAccount_V2(this.curr_credential.id, this.official_url, this.state.username.trim(), this.state.password, this.state.name.trim());
		var in_msg = PSD_MGR_API.inMsg_reply_generic_V2();

		HelloworldAutoFill.setAutofillFlag("invalid");
		this._write_card(out_msg, in_msg);
    }

    _init_check_account = () => {
    	this.checking = true;

    	var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(this.official_url, this.state.username);
        var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
        this._write_card(out_msg, in_msg);
    };

    /*
	============================================================================================================
	======================================== WRITE/READ ========================================================
	============================================================================================================
	*/
	_write_card = async (out_msg, in_msg) => {
		this.curr_job.in_msg = in_msg;
		this.curr_job.out_msg = out_msg;

		if (global.E_API != null) {
			this._start_write_timeout(out_msg, in_msg);
			global.E_API.WriteJSON_Encrypted(out_msg, in_msg, true, (resultCode, msg) => {
				if(this.write_timeout_occur == true) return;
				if(this.write_timeout != null) clearTimeout(this.write_timeout);
				this.write_timeout = null;

				this.curr_job = {in_msg: null, out_msg: null}

				if (resultCode === ETH_SUCCESS) {
					var msg_obj = JSON.parse(msg);
					this._process_reply_command(msg_obj);
				}
			});

		} else {
			global.state.setState({ spinner: {visible: true, text: "Loading: Reconnecting device..."} }, () => {
				global.reconnect_manager.request_reconnect(global.state.state.curr_device.id, global.state.state.curr_device.name, global.state.state.curr_device.sn, async (done) => {
					if(done == true){
						global.state.setState({ spinner: {visible: true, text: "Loading: Editing account..."} }, () => {
							this._write_card(out_msg, in_msg);
						});
					}else{
						this.processing_request = false;
						this.curr_job = {in_msg: null, out_msg: null};
					}
				});

				if(this.state.name == this.curr_credential.name && this.state.username == this.curr_credential.username && this.state.url == this.curr_credential.url && this.state.password == this.curr_credential.password){
					this.setState({isEditable: false});
				}else{
					this.handleOnChange();
				}
			});

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
			this._write_card(out_msg, in_msg);
		}, 6000);
	}

    _process_reply_command = (msg) => {
		switch (msg.command) {
			case PSD_MGR_API.C2H_RPLY_GET_ACCOUNT_PASS:
				if(this.checking == false){
					if (msg.response === PSD_MGR_API.AWK) {
						this.setState({ isEditable: false, password: msg.password }, () => {
							this.curr_credential = {name: this.state.name, url: this.state.url, username: this.state.username, password: msg.password};

							global.state.setState({ spinner: {visible: false, text: ""} }, () => {
								this.processing_request = false;
							});
						})
					}
				}else{
					this.checking == false;
					if (msg.response === PSD_MGR_API.AWK && msg.password == this.state.password) {
						var obj = [{key: this.state.name, url: this.official_url, username: this.state.username}];
						global.credentials_list = obj.concat(this.curr_credentials_list);

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
						global.state.setState({ spinner: {visible: false, text: ""} }, () =>{
							Toast.show({
								text: "Unable to complete request. Please try again.",
								buttonText: "Okay",
								position: "bottom",
								duration: 4000,
								type: "danger"
							});
						});
					}
				}
				break;
			case PSD_MGR_API.C2H_RPLY_EDIT_ACCOUNT_V2:
				if (msg.response === PSD_MGR_API.AWK) {
					var obj = [{id: msg.index, key: this.state.name.trim(), url: this.official_url, username: this.state.username.trim()}];
                    var newObj = {id: msg.index, key: this.state.name.trim(), url: this.official_url, username: this.state.username.trim(), password: this.state.password}
					HelloworldAutoFill.addAccountToDB(newObj);

					var temp_list = obj.concat(this.curr_credentials_list);
                    global.credentials_list = _.orderBy(temp_list, ({key = ''}) => key.toLowerCase());

                    Toast.show({
						text: "Successfully edited account",
						buttonText: "Okay",
						position: "bottom",
						duration: 4000,
						type: "success"
					});

                    global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						const {navigate} = this.props.navigation;
						navigate('Vault_Screen');
					});

				}else{
					global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						setTimeout(() => {
							this.setState({
								alert: true,
								error_text: 'Edit account fails. Please try again.'
							}, () => {
								this.processing_request = false;
							})
						}, 600);
					});
				}
                HelloworldAutoFill.setAutofillFlag("valid");
				break;
			case PSD_MGR_API.C2H_RPLY_EDIT_ACCOUNT:
				if (msg.response === PSD_MGR_API.AWK) {
					var obj = [{key: this.state.name.trim(), url: this.official_url, username: this.state.username.trim(), password: this.state.password}];

					//var curObj = {key: this.curr_credential.name.trim(), url: this.official_url, username: this.curr_credential.username.trim(), password: ""};
					//HelloworldAutoFill.editSingleAccounts(curObj, newObj);
                    var newObj = {key: this.state.name.trim(), url: this.official_url, username: this.state.username.trim(), password: this.state.password}
					HelloworldAutoFill.addAccountToDB(newObj);

					var temp_list = obj.concat(this.curr_credentials_list);
                    global.credentials_list = _.orderBy(temp_list, ({key = ''}) => key.toLowerCase());

                    Toast.show({
						text: "Successfully edited account",
						buttonText: "Okay",
						position: "bottom",
						duration: 4000,
						type: "success"
					});

                    global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						const {navigate} = this.props.navigation;
						navigate('Vault_Screen');
					});

				}else{
					global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						setTimeout(() => {
							this.setState({
								alert: true,
								error_text: 'Edit account fails. Please try again.'
							}, () => {
								this.processing_request = false;
							})
						}, 600);
					});
				}
                HelloworldAutoFill.setAutofillFlag("valid");
				break;

			case PSD_MGR_API.C2H_RPLY_DELETE_ACCOUNT:
				if (msg.response === PSD_MGR_API.AWK) {
					var curObj = {key: this.curr_credential.name, url: this.curr_credential.url, username: this.curr_credential.username, password: ""};
					HelloworldAutoFill.deleteAccounts(curObj);
					
					this._edit_credential();

				}else{
					global.state.setState({ spinner: {visible: false, text: ""} }, () => {
						setTimeout(() => {
							this.setState({
								alert: true,
								error_text: 'Delete account fails. Please try again.'
							}, () => {
								this.processing_request = false;
							});
						}, 600);
					});
				}
                HelloworldAutoFill.setAutofillFlag("valid");

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

		if(this.state.name == this.curr_credential.name && this.state.username == this.curr_credential.username && this.state.url == this.curr_credential.url && this.state.password == this.curr_credential.password){
			this.setState({isEditable: false});
		}else{
			this.handleOnChange();
		}
    };

    handleOnChange = () => {
    	this.setState({isEditable: false});
    	if(this.state.name !== "" && this.state.url !== "" && this.state.username !== "" && this.state.password !== ""){
            if(this.state.name.trim().length <= 0 || this.state.url.trim().length <= 0 || this.state.username.trim().length <= 0 || this.state.password.trim().length <= 1){
                this.setState({isEditable: false});
            } else {
                this.setState({isEditable: true});
            }
        } else {
            this.setState({isEditable: false});
        }
    };

    isASCII = (str) => {
    	return /^[\x00-\x7F]*$/.test(str);
    };

	/*
	============================================================================================================
	========================================== RENDER ==========================================================
	============================================================================================================
	*/
	_handle_navigate_vault = () => {
		if(this.processing_request == true) return;

		const { navigate } = this.props.navigation;
		navigate("Vault_Screen");
	}

	_handle_open_bottom_sheets_device = () => {
		if(this.processing_request == true) return;
    	global.bottom_sheets_device.open();
		setTimeout(() => {
			Keyboard.dismiss();
		}, 100);

    }


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

    render() {
    	return (
            <Container>
				<View>
					<Dialog.Container visible={this.state.alert}>
						<Dialog.Title>Error</Dialog.Title>
						<Dialog.Description>{this.state.error_text}</Dialog.Description>
						<Dialog.Button label="Okay" onPress={() => { this._handle_dismiss_dialog(); }}/>
					</Dialog.Container>

					<View>
						<Dialog.Container visible={this.state.is_bluetooth_off}>
							<Dialog.Title>Warning</Dialog.Title>
							<Dialog.Description>
								Turn On Bluetooth to allow "Ethernom Password Manager" to connect to bluetooth accessories
							</Dialog.Description>
							<Dialog.Button label="Dismiss" onPress={() => { this.handleDismiss() }} />
							<Dialog.Button label="Settings" onPress={() => { this._request_open_ble_settings() }} />
						</Dialog.Container>
					</View>
				</View>

                <Header style={{backgroundColor: "#cba830"}}>
                    <StatusBar backgroundColor='black' barStyle="light-content"/>
                    <Left style={{flex: 3}}><Button iconLeft transparent onPress={() => {this._handle_navigate_vault();}}><Text><Text style={{color: 'black', backgroundColor: 'transparent'}}>Back</Text></Text></Button></Left>
					<Body style={{flex: 3, justifyContent:'center', alignItems:'center', paddingRight: 10}}><Title style={{color:'black', textAlign:'center'}}>Vault</Title></Body>
					<Right style={{flex: 3}}><Button iconLeft transparent onPress={() => {this._handle_edit_account();}} disabled={!this.state.isEditable}><Text><Text style={{color: !this.state.isEditable ? '#ccc' : 'black', backgroundColor: 'transparent'}}>Save</Text></Text></Button></Right>
                </Header>

				<View style={[s.container]}>
					<View style={[s.container_list, {backgroundColor: 'white'}]}>
						<ListItem button
							onPress={() => this._handle_open_bottom_sheets_device()}
							title = {global.state.state.curr_device.name}
							containerStyle = {{ backgroundColor: "#282828" }}
							titleStyle = {{color: 'white', marginLeft: 30, textAlign: 'center'}}
							rightIcon = {{name: "ios-settings", type: "ionicon", color: "white"}}
							bottomDivider
						/>

						<View style={[s.container_header_title,{justifyContent: 'center', alignItems:'center', borderBottomWidth: 1, borderColor:'#EEEEEE'}]}>
							<Text style={{marginTop:5}}>Edit account</Text>
						</View>

						<Content>
							<KeyboardAvoidingView 
								behavior={Platform.OS === "ios" ? 'position' : 'padding'}
								keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>

							<Form>
								<Item stackedLabel style={{bottom: this.state.keyboardOffset}}>
									<Label style={{fontSize: 12}}>Display name:</Label>
									<Input 
										onChangeText={(text) => this._handle_text_change(text, 'name')} 
										value={this.state.name}
										style={{fontSize: 15}} 
										maxLength={31} autoCorrect={false} 
										onFocus={() => {
											this.setState({is_hidden_password: false})
										}}
									/>
								</Item>

								<Item stackedLabel style={{bottom: this.state.keyboardOffset}}>
									<Label style={{fontSize: 12}}>URL:</Label>
									<Input 
										onChangeText={(text) => this._handle_text_change(text, 'url')} 
										value={this.state.url}
										style={{fontSize: 15}} 
										maxLength={94} autoCapitalize="none" autoCorrect={false} 
										onFocus={() => {
											this.setState({is_hidden_password: false})
										}}
									/>
								</Item>

								<Item stackedLabel style={{bottom: this.state.keyboardOffset}}>
									<Label style={{fontSize: 12}}>Username:</Label>
									<Input 
										onChangeText={(text) => this._handle_text_change(text, 'username')} 
										value={this.state.username} style={{fontSize: 15}}
										maxLength={63} autoCapitalize="none" autoCorrect={false} 
										onFocus={() => {
											this.setState({is_hidden_password: false})
										}}
									/>
								</Item>

								<Item stackedLabel last style={{bottom: this.state.keyboardOffset}}>
									<Label style={{fontSize: 12}}>Password:</Label>
									<View style={{flex: 1, flexDirection: 'row'}}>
										{!this.state.hidden ? 
											(
												<Input 
													style={{fontSize: 15, width: '60%'}} 
													maxLength={63} autoCapitalize="none" autoCorrect={false} autoComplete="off" autoCompleteType="off"
													onChangeText={(text) => this._handle_text_change(text, 'password')}
													value={this.state.password} textAlignVertical={'top'} 

													onFocus={() => {
														this.setState({is_hidden_password: false})
													}}
												/>
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
															this.setState({is_hidden_password: true})
														}}
													/>	

													<Input style={{display: this.state.hidden ? "flex" : "none", fontSize: 15, width: '100%'}} 
														maxLength={63} autoCapitalize="none" autoCorrect={false} autoComplete="off" autoCompleteType="off"
														value={this.state.hidden_password}
														onFocus={() => {
															if(this.password_input_field) this.password_input_field._root.focus();
															this.setState({is_hidden_password: true})
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

	if(parse == null) return false;

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
