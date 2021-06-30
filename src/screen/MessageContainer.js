import React, {Component} from 'react';
import {Linking,View, FlatList, Image,Platform, Alert} from 'react-native';
import {Text, Button} from 'native-base';
import AndroidOpenSettings from 'react-native-android-open-settings';
import BluetoothStateManager from 'react-native-bluetooth-state-manager';
import Dialog from "react-native-dialog";
class MessageContainer extends Component<{}> {
    constructor(props) {
        super(props);
        this.state = {
            bluetooth_permission: false,is_bluetooth_off: false
        };

    }

    componentDidMount(){
        this.checkBluetoothGetState();
        this.checkBlueToothStateChange();

    }
    _request_open_ble_settings = () => {
        if(Platform.OS === "android") AndroidOpenSettings.bluetoothSettings();
        else Linking.openURL('App-prefs:root=Bluetooth');

    };
    checkBluetoothGetState = () => {
        BluetoothStateManager.getState().then(bluetoothState => {
            switch (bluetoothState) {
                case 'PoweredOff':

                    if(global.isBlueToothChecked === true){
                        this.setState({is_bluetooth_off: true,bluetooth_permission: false});
                    }

                    global.bluetoothOn = false;
                    break;
                case 'PoweredOn':
                    this.setState({bluetooth_permission: false, is_bluetooth_off: false});
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
                    if(global.isBlueToothChecked === true){
                        this.setState({is_bluetooth_off: true,bluetooth_permission: false});
                    }

                    break;
                case 'PoweredOn':
                    console.log("PoweredOn");
                    global.bluetoothOn = true;
                    this.setState({bluetooth_permission: false,is_bluetooth_off: false});

                    break;
                default:

                    break;
            }

        }, true);
    };

    handleDismiss = () => {
        this.setState({bluetooth_permission: true,is_bluetooth_off: false});
    };


    render() {
        return (
            <View>

                <View style={[{ height: 120, backgroundColor: '#e53935', display: this.state.bluetooth_permission ? "flex" : "none"}]}>
                    <View style={{flex: 1, flexDirection: 'row', height: 120}}>
                        <View style={{ flex: 3, marginTop: 10, marginBottom: 10, marginLeft: 13, marginRight: 10, flexDirection: 'column', alignSelf: 'center' }}>
                            <Text style={{ alignSelf: 'flex-start', fontSize: 17, fontWeight: 'bold', color: 'white', marginBottom: 5 }}>
                                Turn Bluetooth on for Device.
                            </Text>
                            <Text style={{alignSelf: 'flex-start', fontSize: 14, color: 'white'}}>
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

        );
    }
}

export default MessageContainer;

