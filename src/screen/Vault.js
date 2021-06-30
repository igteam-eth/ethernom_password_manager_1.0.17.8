import React, {Component} from 'react';
import {BackHandler, Platform, Clipboard, View, FlatList, Dimensions, Image, StatusBar, AppState, Keyboard, Linking} from 'react-native';
import {Container, Content, Text, Button, Header, Left, Body, Right, Title, Toast, Input, InputGroup} from 'native-base';
import {ListItem} from "react-native-elements";
import Icon from 'react-native-vector-icons/dist/Ionicons';
import Dialog from "react-native-dialog";
import RBSheet from 'react-native-raw-bottom-sheet';

import _ from 'lodash';

var deviceWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get('screen').height;
const windowHeight = Dimensions.get('window').height;
var navbarHeight = 0;
if(Platform.OS == "android"){
    navbarHeight = screenHeight - windowHeight - StatusBar.currentHeight;
    if(navbarHeight < 0) navbarHeight = 0
}

import {PSD_MGR} from "@ethernom/ethernom_msg_psd_mgr";
var PSD_MGR_API = new PSD_MGR();

import BluetoothStateManager from 'react-native-bluetooth-state-manager';
import AndroidOpenSettings from 'react-native-android-open-settings';

const ConversionAPI = require('../util/Conversion.js');
const StorageAPI = require('../util/Storage.js');
const Conversion = new ConversionAPI();
const Storage = new StorageAPI();


const Helloworld = require('../util/Helloworld');
const HelloworldAutoFill = new Helloworld();

export default class Vault extends Component {
    curr_credential = null;
    curr_job = {in_msg: null, out_msg: null, callback_function: null};
    processing_request = false;
    syncing = false;
    resync = false;

    //_isMounted = false;

    constructor(props) {
        super(props);
        this.state = {
            appState: AppState.currentState,
            search_value: "",
            filter_credentials_list: [],
            curr_credential_name: "",hasFocus: false,
            alert: {delete_alert: false, max_account: false, resync: false},
            bluetooth_permission: false, bluetoothStatePermission: false,
        };

        this.navigating = false;
        this.list_credentials = [];
    }

    componentDidMount() {
        global.credentials_list = [];
        this.processing_request = false;
        this.syncing = false;

        this.setState({
            search_value: "",
            filter_credentials_list: [],
            alert: {delete_alert: false, max_account: false, resync: false}
        });

        this._subscribe_backHandler();

        //Default sending V2 protocol
        this._init_credentials_list_V2();
        this._blur_listener();

        AppState.addEventListener('change', this._handleAppStateChange);


        this.checkBluetoothGetState();
        this.checkBlueToothStateChange();
        global.isBlueToothChecked = false;
    }


    componentWillUnmount() {
        if(this.backHandler != null) this.backHandler.remove();
        if(this.did_focus_vault_screen != null) this.did_focus_vault_screen.remove();
        if(this.did_blur_vault_screen != null) this.did_blur_vault_screen.remove();

        if(this.write_timeout != null) clearTimeout(this.write_timeout);

        AppState.removeEventListener('change', this._handleAppStateChange);
    }

    _subscribe_backHandler = () => {
        if(this.backHandler != null) this.backHandler.remove();
        if(Platform.OS === 'android'){
            let parent = this;
            this.backHandler = BackHandler.addEventListener('hardwareBackPress', function(){
                parent._handle_disconnect_device();
                return true;
            });
        }
    };

    _blur_listener = () => {
        if(this.did_blur_screen != null) this.did_blur_screen.remove();
        const { navigation } = this.props;
        this.did_blur_vault_screen = navigation.addListener('didBlur', () => {
            this._focus_listener();

            if(this.backHandler != null) this.backHandler.remove();
            this.processing_request = false;

            this.setState({ alert: {delete_alert: false, max_account: false, resync: false}, filter_credentials_list: [], search_value: "" }, () => {
                this.setState({ filter_credentials_list: global.credentials_list });
            })
        });
    }

    _focus_listener = () => {
        if(this.did_focus_vault_screen != null) this.did_focus_vault_screen.remove();
        const { navigation } = this.props;
        this.did_focus_vault_screen = navigation.addListener('didFocus', () => {
            this.navigating = false;
            this._subscribe_backHandler();

            this.processing_request = false;
            this.setState({ filter_credentials_list: [] }, () => {
                this.setState({ filter_credentials_list: global.credentials_list });

            });

            if(global.E_API == null) return;
            if(this.curr_job.out_msg != null && this.curr_job.in_msg != null){
                if(this.syncing == true && this.curr_job.out_msg[0].command == PSD_MGR_API.H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY){
                    global.state.setState({ spinner: {visible: true, text: "Loading: Resyncing..."} }, () => {
                        if(this.curr_job.callback_function == null){
                            this._write_card(this.curr_job.out_msg, this.curr_job.in_msg);
                        }else{
                            this._write_card_wCallback(this.curr_job.out_msg, this.curr_job.in_msg, this.curr_job.callback_function);
                        }
                    });
                }else{
                    if(this.curr_job.callback_function == null){
                        this._write_card(this.curr_job.out_msg, this.curr_job.in_msg);
                    }else{
                        this._write_card_wCallback(this.curr_job.out_msg, this.curr_job.in_msg, this.curr_job.callback_function);
                    }
                }
            }else{
                if(this.syncing == true){
                    global.credentials_list = [];
                    this.setState({ filter_credentials_list: [], search_value: "" }, () => {
                        this._init_resync_credentials_list_V2();
                    });
                }else{
                    global.state.setState({ spinner: {visible: false, text: ""} });
                }
            }

            this.did_focus_vault_screen.remove();
        });
    }

    _handleAppStateChange = async (nextAppState) => {
        if(this.state.appState.match(/active|inactive/) && nextAppState === 'background') {
            if(this.syncing == true){
                this._handle_disconnect_device();
                //this.props.navigation.navigate("Device_Screen");
            }
            this._reset_state();
            global.reconnect_manager.request_dismiss_reconnect();
       
        }else if(this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
            var result = await Storage.check_session_pin();
			if(result == false){
				const {navigate} = this.props.navigation;
				navigate('Device_Screen');
			}else{    
                this.getBluetoothState();
            }
        }
        this.setState({appState: nextAppState});
    };

    getBluetoothState = () => {
        BluetoothStateManager.onStateChange(bluetoothState => {
            if(bluetoothState === "PoweredOn"){
                global.bluetoothOn = true;
            } else {
                if(this.syncing == true){
                    this._handle_disconnect_device();
                }
                this._reset_state();
                global.reconnect_manager.request_dismiss_reconnect();
                global.E_API  = null;
                this.processing_request = false;
                this.syncing = false;
                global.bluetoothOn = false;
            }

        }, true);
    };

    //Check bluetooth
    _request_open_ble_settings = () => {
        if(Platform.OS === "android") AndroidOpenSettings.bluetoothSettings();
        else Linking.openURL('App-prefs:root=Bluetooth');

    };
    checkBluetoothGetState = () => {
        BluetoothStateManager.getState().then(bluetoothState => {
            switch (bluetoothState) {
                case 'PoweredOff':
                    this.setState({bluetoothStatePermission: true,bluetooth_permission: false});
                    global.bluetoothOn = false;
                    break;
                case 'PoweredOn':
                    this.setState({bluetooth_permission: false, bluetoothStatePermission: false});
                    global.bluetoothOn = true;
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
                    if(this.bottom_sheets_credentials === null) return;

                    this.bottom_sheets_credentials.close();
                    global.bottom_sheets_device.close();

                    setTimeout(() => {
                        this.setState({bluetoothStatePermission: true,bluetooth_permission: false});
                    }, 400);

                    break;
                case 'PoweredOn':
                    console.log("PoweredOn");
                    global.bluetoothOn = true;
                    this.setState({bluetooth_permission: false,bluetoothStatePermission: false});

                    break;
                default:
                    break;
            }
        }, true);
    };

    handleDismiss = () => {
        this.setState({bluetooth_permission: true,bluetoothStatePermission: false});
    };

    //end check bluetooth
    _reset_state = () => {
        this.setState({
            search_value: "",
            filter_credentials_list: global.credentials_list,
            curr_credential_name: "",
            alert: {delete_alert: false, max_account: false, resync: false}
        });

        this.curr_job = {in_msg: null, out_msg: null, callback_function: null};
        this.processing_request = false;
        this.syncing = false;

        if(this.write_timeout != null) clearTimeout(this.write_timeout);
    };

    _init_credentials_list = () => {
        this.syncing  = true;
        this.processing_request = true;

        global.state.setState({ spinner: {visible: true, text: "Loading: Retrieving credentials..."} }, () => {
            var index = 0;
            var out_msg = PSD_MGR_API.outMsg_request_getAccount(index);
            var in_msg = PSD_MGR_API.inMsg_reply_getAccount();

            this._write_card(out_msg, in_msg);
        });
    };

    _init_resync_credentials_list = () => {
        this.syncing  = true;
        this.processing_request = true;

        global.state.setState({ spinner: {visible: true, text: "Loading: Resyncing..."} }, () => {
            var index = 0;
            var out_msg = PSD_MGR_API.outMsg_request_getAccount(index);
            var in_msg = PSD_MGR_API.inMsg_reply_getAccount();
            this._write_card(out_msg, in_msg);
        });
    };

    //PM V2 protocol - 1st
    _init_credentials_list_V2 = () => {
        this.syncing  = true;
        this.processing_request = true;

        global.state.setState({ spinner: {visible: true, text: "Loading: Retrieving credentials..."} }, () => {
            var index = 0;
            var out_msg = PSD_MGR_API.outMsg_request_getAccount_V2(index);
            var in_msg = PSD_MGR_API.inMsg_reply_getAccount_V2();

            this._write_card(out_msg, in_msg);
        });
    };

    _init_resync_credentials_list_V2 = () => {
        this.syncing  = true;
        this.processing_request = true;

        global.state.setState({ spinner: {visible: true, text: "Loading: Resyncing..."} }, () => {
            var index = 0;
            var out_msg = PSD_MGR_API.outMsg_request_getAccount_V2(index);
            var in_msg = PSD_MGR_API.inMsg_reply_getAccount_V2();

            this._write_card(out_msg, in_msg);
        });
    };

    /*
    ============================================================================================================
    ======================================== WRITE/READ ========================================================
    ============================================================================================================
    */
    _write_card = (out_msg, in_msg) => {
        this.curr_job = {in_msg: in_msg, out_msg: out_msg, callback_function: null}

        if(global.E_API != null){
            this._start_write_timeout(out_msg, in_msg);
            global.E_API.WriteJSON_Encrypted(out_msg, in_msg, true, (resultCode, msg) => {
                if(this.write_timeout_occur == true) return;
                if(this.write_timeout != null) clearTimeout(this.write_timeout);
                this.write_timeout = null;

                this.curr_job = {in_msg: null, out_msg: null, callback_function: null}

                if (resultCode === ETH_SUCCESS) {
                    var msg_obj = JSON.parse(msg);
                    this._process_reply_command(msg_obj);
                }
            });

        }else{
            //this.bottom_sheets_credentials.close();
            global.state.setState({ spinner: {visible: true, text: "Loading: Reconnecting device..."} }, () => {
                global.reconnect_manager.request_reconnect(global.state.state.curr_device.id, global.state.state.curr_device.name, global.state.state.curr_device.sn, async (done) => {
                    if(done == true){
                        if(this.syncing == true && global.state.state.spinner.visible == false) global.state.setState({ spinner: {visible: true, text: "Loading: Resyncing..."} })
                        this._write_card(out_msg, in_msg);
                    }else{
                        this.curr_job = {in_msg: null, out_msg: null, callback_function: null};
                        this.processing_request = false;
                    }
                });
            });

            HelloworldAutoFill.setAutofillFlag("valid");
        }
    };

    _write_card_wCallback = (out_msg, in_msg, callback) => {
        this.curr_job = {in_msg: in_msg, out_msg: out_msg, callback_function: callback}

        if(global.E_API != null){
            this._start_write_timeout_wCallback(out_msg, in_msg, callback);
            global.E_API.WriteJSON_Encrypted(out_msg, in_msg, true, (resultCode, msg) => {
                if(this.write_timeout_occur == true) return;
                if(this.write_timeout != null) clearTimeout(this.write_timeout);
                this.write_timeout = null;

                this.curr_job = {in_msg: null, out_msg: null, callback_function: null}

                if (resultCode === ETH_SUCCESS) {
                    var msg_obj = JSON.parse(msg);
                    callback(msg_obj);
                }
            });

        }else{
            //this.bottom_sheets_credentials.close();
            global.state.setState({ spinner: {visible: true, text: "Loading: Reconnecting device..."} }, () => {
                global.reconnect_manager.request_reconnect(global.state.state.curr_device.id, global.state.state.curr_device.name, global.state.state.curr_device.sn, async (done) => {
                    if(done == true){
                        if(this.syncing == true && global.state.state.spinner.visible == false) global.state.setState({ spinner: {visible: true, text: "Loading: Resyncing..."} })
                        this._write_card_wCallback(out_msg, in_msg, callback);
                    }else{
                        this.curr_job = {in_msg: null, out_msg: null, callback_function: null};
                        this.processing_request = false;
                    }
                });
            });
        }
    };

    write_timeout_occur = false;
    _start_write_timeout = (out_msg, in_msg) => {
        this.write_timeout_occur = false;
        if(this.write_timeout != null) clearTimeout(this.write_timeout);
        this.write_timeout = null;

        this.write_timeout = setTimeout(() => {
            this.write_timeout_occur = true;
            if(this.syncing == false){
                this._write_card(out_msg, in_msg);
            }else{
                global.credentials_list = [];
                this.setState({ filter_credentials_list: [], search_value: "" }, () => {
                    this._init_resync_credentials_list();
                });
            }
        }, 6000); 
    }

    _start_write_timeout_wCallback = (out_msg, in_msg, callback) => {
        this.write_timeout_occur = false;
        if(this.write_timeout != null) clearTimeout(this.write_timeout);
        this.write_timeout = null;

        this.write_timeout = setTimeout(() => {
            this.write_timeout_occur = true;
            if(this.syncing == false){
                this._write_card_wCallback(out_msg, in_msg, callback);
            }else{
                global.credentials_list = [];
                this.setState({ filter_credentials_list: [], search_value: "" }, () => {
                    this._init_resync_credentials_list();
                });
            }
        }, 6000);
    };

    _process_reply_command = (msg) => {
        console.log(msg);
        switch (msg.command) { 
            case PSD_MGR_API.C2H_RPLY_GET_NEXT_ACCOUNT_DATA_V2:
                if (msg.response === PSD_MGR_API.AWK || msg.response === PSD_MGR_API.OTHER) {
                    this.processing_request = true;

                    var obj = [{id: msg.index, key: msg.name, url: msg.url, username: msg.username}];
                    var temp_list = obj.concat(global.credentials_list);
                    global.credentials_list = _.orderBy(temp_list, ({key = ''}) => key.toLowerCase());
                    this.setState({ filter_credentials_list: global.credentials_list });
                    
                    var credentailsForStoringDb = [{key: msg.name, url: msg.url, username: msg.username, password: msg.password}];
                    this.list_credentials = credentailsForStoringDb.concat(this.list_credentials);

                    
                } 
                if (msg.response === PSD_MGR_API.AWK){
                    if(this.syncing == true){
                        var out_msg = PSD_MGR_API.outMsg_request_getAccount_V2(msg.n_index);
                        var in_msg = PSD_MGR_API.inMsg_reply_getAccount_V2();
                        this._write_card(out_msg, in_msg);
                    }
                    global.state.setState({ spinner: {visible: true, text: "Loading: Retrieving credentials"} });

                }else if (msg.response === PSD_MGR_API.OTHER) {
                    
                    this.processing_request = false;
                    this.syncing = false;
                    global.state.setState({ spinner: {visible: false, text: ""} });

                    // Save all the Credentials to DB
                    HelloworldAutoFill.saveAllCredentailsToDB(this.list_credentials);
                    HelloworldAutoFill.setAutofillFlag("valid");

                    this.list_credentials = [];
                }else {

                    this.processing_request = false;
                    this.syncing = false;
                    global.state.setState({ spinner: {visible: false, text: ""} });

                }

                break;

            case PSD_MGR_API.C2H_RPLY_GET_NEXT_ACCOUNT_DATA:
                var index = 0;

                if(msg.payload.length <= 3){
                    index = msg.payload[2];
                }else{
                    var array = msg.payload.slice(2, 4);
                    // console.log(array);
                    if(array[1] != 31){
                        index = Conversion.convert_bytes_to_int(array);
                    }else{
                        index = array[0];
                    }
                }
                // console.log(index);

                if (msg.response === PSD_MGR_API.AWK) {
                    this.processing_request = true;
                    
                    var obj = [{key: msg.name, url: msg.url, username: msg.username}];
                    var temp_list = obj.concat(global.credentials_list);
                    global.credentials_list = _.orderBy(temp_list, ({key = ''}) => key.toLowerCase());
                    this.setState({ filter_credentials_list: global.credentials_list });
                    
                    var credentailsForStoringDb = [{key: msg.name, url: msg.url, username: msg.username, password: msg.password}];
                    this.list_credentials = credentailsForStoringDb.concat(this.list_credentials);
                    
                    if(this.syncing == true){
                        var out_msg = PSD_MGR_API.outMsg_request_getAccount(index);
                        var in_msg = PSD_MGR_API.inMsg_reply_getAccount();
                        this._write_card(out_msg, in_msg);
                    }

                } else if (msg.response === PSD_MGR_API.OTHER) {
                    this.processing_request = false;
                    this.syncing = false;
                    global.state.setState({ spinner: {visible: false, text: ""} });

                   
                    // Save all the Credentials to DB
                    HelloworldAutoFill.saveAllCredentailsToDB(this.list_credentials);
                    HelloworldAutoFill.setAutofillFlag("valid");

                    this.list_credentials = [];
                }

                break;

            case PSD_MGR_API.C2H_RPLY_GET_ACCOUNT_PASS:
                if (msg.response === PSD_MGR_API.AWK) {
                    this._handle_copy_to_clipboard(msg.password, 'Password copied');
                }
                break;

            case PSD_MGR_API.C2H_RPLY_DELETE_ACCOUNT:
                if (msg.response === PSD_MGR_API.AWK) {
                    this._remove_deleted_credential();
                }
                break;   

            default:
                break;
        };
    };



    /*
    ============================================================================================================
    ======================================== TOAST UI ==========================================================
    ============================================================================================================
    */
    _handle_copy_to_clipboard = (text, toast_text) => {
        this.processing_request = false;
        global.state.setState({ spinner: {visible: false, text: ""} });
        this.curr_job = {in_msg: null, out_msg: null, callback_function: null}

        if(this.bottom_sheets_credentials == null) return;

        Clipboard.setString(text);
        this.bottom_sheets_credentials.close();
        this._show_toast(toast_text);

        if(this.syncing == true){
            //this.resync = false;
            global.credentials_list = [];
            this.setState({ filter_credentials_list: [], search_value: "" }, () => {
                this._init_resync_credentials_list_V2();
            });
        }
    }

    _show_toast = (text) => {
        Toast.show({
            text: text,
            buttonText: "Okay",
            position: "bottom",
            duration: 4000,
            type: "success"
        })
    }

    /*
    ============================================================================================================
    ======================================== SEARCH UI =========================================================
    ============================================================================================================
    */
    _on_search_text = async (text) => {
        await this.on_search_item();

        if(global.credentials_list.length > 0){
            this.setState({ search_value: text });

            if (text === "") {
                this.setState({ filter_credentials_list: global.credentials_list, isSearch: false}, () => {
                    global.state.setState({ spinner: {visible: false, text: ""} });
                });

            }else{
                var newData = [];
                var search = text.toLowerCase();
                for(var i = 0; i<global.credentials_list.length; i++){
                    var currName = global.credentials_list[i].key.toLowerCase(),
                        currUrl = global.credentials_list[i].url.toLowerCase(),
                        currPass = global.credentials_list[i].username.toLowerCase();

                    if(currName.includes(search) || currUrl.includes(search) || currPass.includes(search)){
                        newData = newData.concat(global.credentials_list[i]);
                    }
                }

                this.setState({ filter_credentials_list: newData, isSearch: true }, () => {
                    this.processing_request = false
                    global.state.setState({ spinner: {visible: false, text: ""} });
                });
            }

        }else{
            this.setState({ search_value: text, filter_credentials_list: [], isSearch: true }, () => {
                this.processing_request = false
                global.state.setState({ spinner: {visible: false, text: ""} });
            });
        }
    };

    _clear_search_text = () => {
        this.setState({ search_value: "",  filter_credentials_list: global.credentials_list, isSearch: false }, () => {
            this.processing_request = false
            global.state.setState({ spinner: {visible: false, text: ""} });
        });
        Keyboard.dismiss()
    };

    bottom_sheets_credentials_open = async () => {
        await Keyboard.dismiss();
        await global.bottom_sheets_device.close();
        await this.bottom_sheets_credentials.open();
    };

    on_search_item = async () => {
        await global.bottom_sheets_device.close();
        await this.bottom_sheets_credentials.close();
    };

    /*
	============================================================================================================
	==================================== BOTTOM SHEETS UI ======================================================
	============================================================================================================
	*/
    _handle_open_bottom_sheets_device = () => {
        if(this.navigating == true) return;

        global.bottom_sheets_device.open();
        this.bottom_sheets_credentials.close();
    }

    _handle_open_bottom_sheets_credentials = async (item) => {
        if (this.processing_request == true || this.navigating == true) return;

        if("id" in item){
            this.curr_credential = {id: item.id, url: item.url, username: item.username, name: item.key}
        }else{
            this.curr_credential = {id: -1, url: item.url, username: item.username, name: item.key}
        }
       
        this.setState({curr_credential_name: item.key});

        await this.bottom_sheets_credentials_open()
    };

    _handle_resync = () => {

        if(global.bluetoothOn === true){

            if(this.processing_request == true) return;
            this.processing_request = true;

            this.bottom_sheets_credentials.close();

            if(this.state.alert.resync == true){
                this.setState({ alert: {delete_alert: false, max_account: false, resync: false} }, () => {
                    setTimeout(() => {
                        global.credentials_list = [];
                        this.setState({ filter_credentials_list: [], search_value: "" }, () => {
                            this._init_resync_credentials_list_V2();
                        });
                    }, 600);
                });
            }else{
                global.credentials_list = [];
                this.setState({ filter_credentials_list: [], search_value: "" }, () => {
                    this._init_resync_credentials_list_V2();
                });
            }
        }else {
            this.setState({bluetoothStatePermission: true,bluetooth_permission: false});
            global.bluetoothOn = false;
        }

    };

    _handle_copy_username = (curr_url, curr_username) => {
        this.bottom_sheets_credentials.close();

        if(global.bluetoothOn === true){
            if(this.processing_request == true) return;
            this.processing_request = true;

            setTimeout(() => {
                global.state.setState({ spinner: {visible: true, text: "Loading: Copying username..."} }, () => {
                    var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(curr_url, curr_username);
                    var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
                    this._write_card_wCallback(out_msg, in_msg, callback = (msg) =>{
                        switch (msg.command) {
                            case PSD_MGR_API.C2H_RPLY_GET_ACCOUNT_PASS:
                                if (msg.response === PSD_MGR_API.AWK) {
                                    this.curr_copied_credential = {url: curr_url, username: curr_username, password: msg.password};
                                    this._handle_copy_to_clipboard(curr_username, "Username copied");
                                }else{
                                    this._prompt_resync_alert();
                                }
                                break;

                            default:
                                break;
                        };
                    });
                });
            }, 600);
        }else {
            setTimeout(() => {
                this.setState({bluetoothStatePermission: true,bluetooth_permission: false});
            }, 600);
            global.bluetoothOn = false;
        }


    }

    _handle_copy_password = (curr_url, curr_username) => {
        this.bottom_sheets_credentials.close();

        if(global.bluetoothOn === true){
            if(this.processing_request == true) return;
            this.processing_request = true;

            if(this.curr_copied_credential != null){
                if(this.curr_copied_credential.url == curr_url && this.curr_copied_credential.username == curr_username && this.curr_copied_credential.password != ""){
                    this._handle_copy_to_clipboard(this.curr_copied_credential.password, 'Password copied');
                    this.curr_copied_credential = null;
                    return;
                }
            }

            this.curr_copied_credential = null;

            setTimeout(() => {
                global.state.setState({ spinner: {visible: true, text: "Loading: Copying password..."} }, () => {
                    var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(curr_url, curr_username);
                    var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
                    this._write_card_wCallback(out_msg, in_msg, callback = (msg) =>{
                        switch (msg.command) {
                            case PSD_MGR_API.C2H_RPLY_GET_ACCOUNT_PASS:
                                if (msg.response === PSD_MGR_API.AWK) {
                                    this._handle_copy_to_clipboard(msg.password, 'Password copied');
                                }else{
                                    this._prompt_resync_alert();
                                }
                                break;

                            default:
                                break;
                        };
                    });
                });
            }, 600);
            /*
            setTimeout(() => {
                global.state.setState({ spinner: {visible: true, text: "Loading: Copying password..."} }, () => {
                    var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(curr_url, curr_username);
                    var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
                    this._write_card(out_msg, in_msg);
                });
            }, 600);
            */
        }else {
            setTimeout(() => {
                this.setState({bluetoothStatePermission: true,bluetooth_permission: false});
            }, 600);
            global.bluetoothOn = false;
        }


    }

    _handle_delete_credential = () => {
        if(this.state.alert.delete_alert == true){
            this.bottom_sheets_credentials.close();
            this.setState({ alert: {delete_alert: false, max_account: false, resync: false} }, () => {
                setTimeout(() => {
                    global.state.setState({ spinner: {visible: true, text: "Loading: Deleting credential..."} }, () => {
                        var out_msg, in_msg;
                        if(this.curr_credential.id != -1){
                            out_msg = PSD_MGR_API.outMsg_request_deleteAccount_V2(this.curr_credential.id);
                            in_msg = PSD_MGR_API.inMsg_reply_delete_V2();
                        }
                        else{
                            out_msg = PSD_MGR_API.outMsg_request_deleteAccount(this.curr_credential.url, this.curr_credential.username);
                            in_msg = PSD_MGR_API.inMsg_reply_generic();
                        }

                        HelloworldAutoFill.setAutofillFlag("invalid");
                        this._write_card_wCallback(out_msg, in_msg, callback = (msg) =>{
                            switch (msg.command) {
                                case PSD_MGR_API.C2H_RPLY_DELETE_ACCOUNT_V2:
                                    if (msg.response === PSD_MGR_API.AWK) {
                                        var curObj = {id: this.curr_credential.id ,key: this.state.curr_credential_name.trim(), url: this.curr_credential.url, username: this.curr_credential.username, password: ""};
                                        HelloworldAutoFill.deleteAccounts(curObj);
                                        this._remove_deleted_credential();
                                    }else{
                                        this._prompt_resync_alert();
                                    }
                                    HelloworldAutoFill.setAutofillFlag("valid");
                                    break;
                                case PSD_MGR_API.C2H_RPLY_DELETE_ACCOUNT:
                                    if (msg.response === PSD_MGR_API.AWK) {
                                        var curObj = {key: this.state.curr_credential_name.trim(), url: this.curr_credential.url, username: this.curr_credential.username, password: ""};
                                        HelloworldAutoFill.deleteAccounts(curObj);
                                        this._remove_deleted_credential();

                                    }else{
                                        this._prompt_resync_alert();
                                    }
                                    HelloworldAutoFill.setAutofillFlag("valid");
                                    break;
                                default:
                                    break;
                            };
                        });
                    });
                }, 600);

                /*
                setTimeout(() => {
                    global.state.setState({ spinner: {visible: true, text: "Loading: Deleting credential..."} }, () => {
                        var out_msg = PSD_MGR_API.outMsg_request_deleteAccount(this.curr_credential.url, this.curr_credential.username);
                        var in_msg = PSD_MGR_API.inMsg_reply_generic();
                        this._write_card(out_msg, in_msg);
                    });
                }, 600);
                */
            });
        }else{
            this.processing_request = false;
        }
    }

    _remove_deleted_credential = () => {
        this._show_toast("Successfully deleted account");
        this.curr_job = {in_msg: null, out_msg: null, callback_function: null}

        if(this.syncing == true){
            //this.resync = false;
            global.credentials_list = [];
            this.setState({ filter_credentials_list: [], search_value: "" }, () => {
                this.processing_request = false;
                this.curr_credential = null;

                this._init_resync_credentials_list_V2();
            });

            return;
        }

        var updated_list = global.credentials_list;
        if(global.credentials_list.length > 0){
            for(var i=0; i<global.credentials_list.length; i++){
                if(this.curr_credential.name == global.credentials_list[i].key && this.curr_credential.url == global.credentials_list[i].url && this.curr_credential.username == global.credentials_list[i].username){
                    updated_list.splice(i, 1);
                    break;
                }
            }

            global.credentials_list = updated_list;
            if(this.state.search_value == ""){
                this.setState({ filter_credentials_list: global.credentials_list }, () => {
                    this.processing_request = false;
                    global.state.setState({ spinner: {visible: false, text: ""} });
                });
            }else{
                this._on_search_text(this.state.search_value);
            }

        }else{
            global.credentials_list = [];
            this.setState({ filter_credentials_list: [] }, () => {
                this.processing_request = false;
                global.state.setState({ spinner: {visible: false, text: ""} });
            });
        }

        this.processing_request = false;
        this.curr_credential = null;
    }

    _handle_delete_alert = () => {

        this.bottom_sheets_credentials.close();
        if(global.bluetoothOn === true){
            if(this.processing_request == true) return;
            this.processing_request = true;

            setTimeout(() => {
                this.setState({ alert: {delete_alert: true, max_account: false, resync: false} })
            }, 600);
        }else {
            setTimeout(() => {
                this.setState({bluetoothStatePermission: true,bluetooth_permission: false});
            }, 600);
            global.bluetoothOn = false;
        }


    }

    _prompt_resync_alert = () => {
        global.state.setState({ spinner: {visible: false, text: ""} }, () => {
            this.setState({
                alert: {delete_alert: false, max_account: false, resync: true}
            })
            this.processing_request = false;
        });
    }

    /*
	============================================================================================================
	====================================== NAVIGATE ============================================================
	============================================================================================================
	*/

    _handle_navigate_view = () => {
        this.bottom_sheets_credentials.close();

        if(global.bluetoothOn === true){
            if(this.processing_request == true) return;
            this.processing_request = true;

            this.curr_job = {in_msg: null, out_msg: null, callback_function: null}

            setTimeout(() => {
                global.state.setState({ spinner: {visible: true, text: "Loading: Retrieving credential's data..."} }, () => {
                    var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(this.curr_credential.url, this.curr_credential.username);
                    var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
                    this._write_card_wCallback(out_msg, in_msg, callback = (msg) =>{
                        switch (msg.command) {
                            case PSD_MGR_API.C2H_RPLY_GET_ACCOUNT_PASS:
                                if (msg.response === PSD_MGR_API.AWK) {
                                    if(!this.navigating){
                                        const {navigate} = this.props.navigation;
                                        navigate("View_Account_Screen", {
                                            name: this.curr_credential.name,
                                            url: this.curr_credential.url,
                                            username: this.curr_credential.username,
                                            password: msg.password
                                        });
                                        this.navigating = true;
                                    }
                                }else{
                                    this._prompt_resync_alert();
                                }
                                break;

                            default:
                                break;
                        };
                    });
                });
            }, 600);

            /*
            //global.state.setState({ spinner: {visible: true, text: "Loading: Retrieving credential's data..."} }, () => {
                if(!this.navigating){
                    const {navigate} = this.props.navigation;
                    navigate("View_Account_Screen", {
                        name: this.curr_credential.name,
                        url: this.curr_credential.url,
                        username: this.curr_credential.username
                    });
                    this.navigating = true;
                }
            //});
            */
        }else {

            setTimeout(() => {
                this.setState({bluetoothStatePermission: true,bluetooth_permission: false});
            }, 600);
            global.bluetoothOn = false;
        }

    }

    _handle_navigate_edit = () => {

        this.bottom_sheets_credentials.close();

        if(global.bluetoothOn === true){
            if(this.processing_request == true) return;
            this.processing_request = true;

            this.curr_job = {in_msg: null, out_msg: null, callback_function: null}

            setTimeout(() => {
                global.state.setState({ spinner: {visible: true, text: "Loading: Retrieving credential's data..."} }, () => {
                    var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(this.curr_credential.url, this.curr_credential.username);
                    var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
                    this._write_card_wCallback(out_msg, in_msg, callback = (msg) =>{
                        switch (msg.command) {
                            case PSD_MGR_API.C2H_RPLY_GET_ACCOUNT_PASS:
                                if (msg.response === PSD_MGR_API.AWK) {
                                    if(!this.navigating){
                                        const {navigate} = this.props.navigation;
                                        navigate("Edit_Account_Screen", {
                                            id: this.curr_credential.id,
                                            name: this.curr_credential.name,
                                            url: this.curr_credential.url,
                                            username: this.curr_credential.username,
                                            password: msg.password
                                        });
                                        this.navigating = true;
                                    }
                                }else{
                                    this._prompt_resync_alert();
                                }
                                break;

                            default:
                                break;
                        };
                    });
                });
            }, 600);

            /*
            //global.state.setState({ spinner: {visible: true, text: "Loading: Retrieving credential's data..."} }, () => {
                if(!this.navigating){
                    const {navigate} = this.props.navigation;
                    navigate("Edit_Account_Screen", {
                        name: this.curr_credential.name,
                        url: this.curr_credential.url,
                        username: this.curr_credential.username
                    });
                    this.navigating = true;
                }
            //});
            */
        }else {
            setTimeout(() => {
                this.setState({bluetoothStatePermission: true,bluetooth_permission: false});
            }, 600);
            global.bluetoothOn = false;
        }

    }

    _handle_navigate_add_staging = () => {

        if(this.processing_request == true) return;
        this.processing_request = true;

        this.bottom_sheets_credentials.close();
        this.curr_job = {in_msg: null, out_msg: null, callback_function: null}

        if(!this.navigating){
            const {navigate} = this.props.navigation;
            navigate("Add_Staging_Screen");
            this.navigating = true;
        }

    };

    _handle_navigate_settings = () => {
        this.curr_job = {in_msg: null, out_msg: null, callback_function: null}
        global.bottom_sheets_device.close();

        if(!this.navigating){
            const { navigate } = this.props.navigation;
            navigate("Settings_Screen");
            this.navigating = true;
        }
    }

    /*
	============================================================================================================
	====================================== DISCONNECT ==========================================================
	============================================================================================================
	*/
    _handle_disconnect_device = () => {
        if(global.E_API != null){
            global.E_API.CardClose(callback = (resultCode) => { })
        }
        global.bottom_sheets_device.close();

        if(Platform.OS === "android"){
            setTimeout(() => {
                global.state.setState({ spinner: {visible: false, text: ""} }, () => {
                    const {navigate} = this.props.navigation;
                    navigate('Device_Screen');
                });
            }, 600);
        }else {
            global.state.setState({ spinner: {visible: false, text: ""} }, () => {
                const {navigate} = this.props.navigation;
                navigate('Device_Screen');
            });
        }



    };

    setFocus (hasFocus) {
        this.setState({hasFocus});
        this.on_search_item();
    }

    /*
	============================================================================================================
	========================================== RENDER ==========================================================
	============================================================================================================
	*/
    render() {
        return (
            <Container>
                <View>
                    <Dialog.Container visible={this.state.alert.delete_alert}>
                        <Dialog.Title>Warning</Dialog.Title>
                        <Dialog.Description>Do you want to delete this account? You cannot undo this action.</Dialog.Description>
                        <Dialog.Button label="Cancel" onPress={() => { this.setState({ alert: {delete_alert: false, max_account: false, resync: false} }); this.processing_request = false; }} />
                        <Dialog.Button label="Delete" onPress={() => { this._handle_delete_credential(); }} color='#f44336'/>
                    </Dialog.Container>

                    <Dialog.Container visible={this.state.alert.max_account}>
                        <Dialog.Title>Error</Dialog.Title>
                        <Dialog.Description>You have reached the limit of 100 accounts. Please delete at least one before adding a new account.</Dialog.Description>
                        <Dialog.Button label="Cancel" onPress={() => { this.setState({ alert: {delete_alert: false, max_account: false, resync: false} }); this.processing_request = false; }} />
                    </Dialog.Container>

                    <Dialog.Container visible={this.state.alert.resync}>
                        <Dialog.Title>Warning</Dialog.Title>
                        <Dialog.Description>Credential doesn't exist on your device, credentials is out of synchronization.</Dialog.Description>
                        <Dialog.Description>Starting resynchronization...</Dialog.Description>
                        <Dialog.Button label="Okay" onPress={() => { this._handle_resync(); }} />
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
                    <StatusBar backgroundColor='black' barStyle="light-content"/>
                    <Left style={{flex: 3}}>
                        <Button iconLeft transparent disabled={true}>
                            <Image source={require('../assets/icon.png')} size={20} style={{width: 25, height: 25, resizeMode:'contain'}} />
                        </Button>
                    </Left>
                    <Body style={{flex: 3, justifyContent:'center', alignItems:'center', paddingRight: 10}}><Title style={{color:'black', textAlign:'center'}}>Vault</Title></Body>
                    <Right style={{flex: 3}}>
                        <Button onPress={() => this._handle_navigate_settings()} iconRight transparent>
                            <Image source={require('../assets/settings.png')} size={20} style={{width: 30, height: 30, resizeMode:'contain'}} />
                        </Button>
                    </Right>
                </Header>


                <ListItem button
                          leftElement={
                              <Button onPress={() => {this._handle_resync()}} iconLeft transparent style={{paddingRight: 15, paddingLeft:15, marginLeft: 0}}>
                                  <Icon name={'md-sync'} color={"white"} size={30}/>
                              </Button>
                          }
                          onPress={() => this._handle_open_bottom_sheets_device()}
                          title = {global.state.state.curr_device.name}
                          containerStyle = {{ backgroundColor: "#282828", paddingLeft: 0}}
                          titleStyle = {{color: 'white', textAlign: 'center'}}
                          rightElement={
                              <Icon name={'ios-settings'} color={"white"} size={30}/>
                          }
                />

                <View searchBar style={{flexDirection: 'row', paddingLeft: 15, paddingRight: 15, paddingBottom: 15, backgroundColor: "#282828"}}>
                    <InputGroup rounded style={{flex: 1, backgroundColor: '#fff', height: 35, paddingLeft: 10, paddingRight: 10, marginTop: 0}}>
                        <Icon name="ios-search" size={20} />
                        <Input onChangeText={(text) => this._on_search_text(text)} onFocus={this.setFocus.bind(this, true)}
                               placeholder="Search" style={{paddingBottom: Platform.OS === "ios" ? 5 : 10, marginLeft: 10}} autoCorrect={false} value={this.state.search_value} returnKeyType={'done'}
                        />
                        <Button transparent onPress={() => this._clear_search_text()} style={{height: 30, width: 30, display: this.state.isSearch ? 'flex' : 'none', justifyContent: 'center'}}>
                            <Image source={require('../assets/error.png')}
                                   size={10} style={[{width: 10, height: 10, resizeMode:'contain', padding: 7}]} />
                        </Button>
                    </InputGroup>
                </View>

                <FlatList style={{backgroundColor: 'white'}}
                          data={this.state.filter_credentials_list}
                          renderItem={({item}) => (
                              <ListItem
                                  title={item.key}
                                  subtitle={item.username}
                                  onPress={() => {this._handle_open_bottom_sheets_credentials(item)}}
                                  rightIcon={{
                                      name: 'ios-key', type: 'ionicon', color: '#cba830', size: 25, iconStyle: {padding: 10},
                                      onPress: () => this._handle_copy_password(item.url, item.username)
                                  }}
                                  bottomDivider
                                  containerStyle = {{marginBottom:1}}
                              />
                          )}
                          keyExtractor={(item, index) => index.toString()}
                />

                <View>
                    <Button full style={{backgroundColor: '#cba830', flexDirection: 'row', alignItems: 'stretch', paddingTop: 5, paddingBottom: 5, height: 55}} onPress={() => {this._handle_navigate_add_staging();}}>
                        <View style={{width: "90%",justifyContent:'center', alignItems: 'center'}}>
                            <Text style={{color: 'black', textAlign:'center', marginLeft: deviceWidth*(10/100)}}>Add account</Text>
                        </View>
                        <View style={{width: "10%",justifyContent: 'center', alignItems: 'center'}}>
                            <Icon name='ios-arrow-forward' size={25} color="black" style={{justifyContent: 'center',alignItems: 'center'}}/>
                        </View>
                    </Button>
                </View>

                <View>
                    <RBSheet ref={ref => {this.bottom_sheets_credentials = ref;}} height={Platform.OS == "ios" ? 340 : (navbarHeight + 340)} closeOnDragDown={true} closeOnPressMask={true}>
                        <View>
                            <ListItem title={this.state.curr_credential_name} leftIcon={{name:'ios-information-circle-outline' , type:'ionicon',size:20, color:'#cba830'}} bottomDivider/>
                            <ListItem onPress={()=>this._handle_copy_username(this.curr_credential.url, this.curr_credential.username)} titleStyle={{fontSize: 14}} title="Copy Username"  rightIcon={{name:'ios-contact' , type:'ionicon',size:20, color:'#cba830'}} />
                            <ListItem onPress={()=>this._handle_copy_password(this.curr_credential.url, this.curr_credential.username)} titleStyle={{fontSize: 14}} title="Copy Password" rightIcon={{name: 'ios-key', type: 'ionicon' ,size:20, color:'#cba830'}} />
                            <ListItem onPress={()=>this._handle_navigate_view()} titleStyle={{fontSize: 14}} title="View Account" rightIcon={{name: 'ios-eye', type: 'ionicon' ,size:20, color:'#cba830'}} />
                            <ListItem onPress={()=>this._handle_navigate_edit()} titleStyle={{fontSize: 14}} title="Edit Account" rightIcon={{name: 'ios-settings', type: 'ionicon' ,size:20, color:'#cba830'}} />
                            <ListItem onPress={()=>this._handle_delete_alert()} titleStyle={{fontSize: 14}} title="Delete Account" rightIcon={{name: 'ios-remove-circle', type: 'ionicon' ,size:20, color:'#cba830'}} />
                        </View>
                    </RBSheet>
                </View>
            </Container>
        );
    }
}

/*
<View>
						<ListItem
							title={"Resynchronize credentials"}
							onPress={() => {this._handle_resync()}}
							rightIcon={{ name: 'md-sync', type: 'ionicon', color: '#cba830', size: 30, iconStyle: {padding: 10}	}}
							bottomDivider
							containerStyle = {{marginBottom:1}}
						/>
					</View>
*/
