import React, {Component} from 'react';
import {View, Image, StatusBar, Platform} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, Form, Item, Picker, Content} from 'native-base';
import {Icon, ListItem, Divider } from "react-native-elements";
//import * as Keychain from "react-native-keychain";
var s = require('../css/styles');

//Storage API
const StorageAPI = require('../util/Storage.js');
const Storage = new StorageAPI();

export default class Settings extends Component {
    constructor(props) {
        super(props);
        this.state = {
        	pin_len_selected: undefined,
        	timer_selected: undefined,
			fm_update_check_selected: undefined,
			show_accessbility: false
		}
		
		const { navigation } = this.props;
		this.from = navigation.getParam('from', "");

    }

    componentDidMount = async () => {
		if (Platform.OS == "android") {
			this.setState({show_accessbility: true})
		}
		
		var len = await Storage.get_pin_len();
		var time = await Storage.get_timer();
		if(len && time){
    		this.setState({
    			pin_len_selected: len.toString(),
    			timer_selected: time.toString()
    		})
    	}

		var period = await Storage.get_fm_update_check();
		if(period != null || period != false) {
			this.setState({ fm_update_check_selected: period.toString()})
		}
        global.isBlueToothChecked = false;
    };

    componentWillUnmount(){


    }

    _handle_back = async () => {
		if(this.from == "Device_Screen"){
			this.props.navigation.navigate("Device_Screen");
		}else{
    	var PIN = await Storage.get_session_pin(global.state.state.curr_device.id);
			if(PIN == false){
				this.props.navigation.navigate("Device_Screen");
			}else{
				this.props.navigation.navigate("Vault_Screen");
			}
		}
    }

    _handle_navigate_autofill = () => {
    	const {navigate} = this.props.navigation;
		navigate("Autofill_Screen", {from: 'SETTINGS'});
    }
	
	_handle_navigate_autofill_accessbility = () => {
    	const {navigate} = this.props.navigation;
		navigate("Autofill_Accessbility_Screen", {from: 'SETTINGS'});
    }

    on_pin_length_change = async (value) => {
		this.setState({ pin_len_selected: value });
		await Storage.save_pin_len(value);
	}

	on_inactivity_timer_change = async (value) => {
		this.setState({ timer_selected: value });
		await Storage.save_timer(value);

		global.state.setState({
			timeout: parseInt(value)
		})
	}

	on_fm_update_check_change = async (value) => {
		this.setState({ fm_update_check_selected: value.toString()});
		await Storage.save_fm_update_check(value);
	}

    render() {
        return (
            <Container>
                <Header style={{backgroundColor: "#cba830"}}>
                    <StatusBar backgroundColor='black' barStyle="light-content"/>
                    <Left style={{flex: 3, marginLeft: 8}}>
                        <Button iconLeft transparent onPress={() => {this._handle_back()}}>
                            <Image source={require('../assets/icon.png')} size={20} style={{width: 25, height: 25, resizeMode:'contain'}} />
                        </Button>
                    </Left>
                   <Body style={{flex: 3, justifyContent:'center', alignItems:'center'}}><Title style={{color:'black', textAlign:'center'}}>Settings</Title></Body>
                    <Right style={{flex: 3}}>
                        <Button iconLeft transparent>
                            <Image source={require('../assets/settings.png')} size={20} style={{width: 30, height: 30, resizeMode:'contain'}} />
                        </Button>
                    </Right>
                </Header>
				<Content>
					<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
						<View style={{flex: 1, width: "100%", textAlign: 'center'}}>
							<View>
								<View style ={{paddingBottom: 10, paddingTop: 10,  backgroundColor: '#e1e8ee'}}><Text style={{fontSize: 17, marginLeft: 13, color: 'gray'}}>Configuration: </Text></View>
								<View style={{paddingBottom: 20}}>
									<ListItem 
										title="PIN Length:" 
										leftIcon={{name: 'code', type: 'font-awesome', color: "black"}} 
										rightElement={
											<Content style={{borderWidth: 2, borderColor: '#e1e8ee'}}>
												<Picker
													mode="dropdown"
													iosHeader="PIN length"
													iosIcon={<Icon name='keyboard-arrow-down' size={25} color={'#cba830'} />}
													itemTextStyle={{fontSize: 18, color: 'black'}}
													itemStyle={{marginLeft: 0, paddingLeft: 15 }}
													selectedValue = {this.state.pin_len_selected}
													onValueChange = {this.on_pin_length_change.bind(this)}
												>
													<Picker.Item label="2 Digits" value="2" />
													<Picker.Item label="4 Digits" value="4" />
													<Picker.Item label="6 Digits" value="6" />
												</Picker>
											</Content>	
										}
									/>
									<Text style={{fontSize: 13, color: "gray", marginLeft: 15, marginRight: 15}}>Configure PIN length from these options.</Text>
								</View>
								
								<Divider />
								<View style ={{paddingBottom: 20}}>
									<ListItem 
										title="Check for update:"
										leftIcon={{name: 'wrench', type: 'font-awesome', color: "black"}} 
										rightElement={
											<Content style={{borderWidth: 2, borderColor: '#e1e8ee'}}>
												<Picker
													mode="dropdown"
													iosHeader="Check for update"
													iosIcon={<Icon name='keyboard-arrow-down' size={25} color={'#cba830'} />}
													itemTextStyle={{fontSize: 18, color: 'black'}}
													itemStyle={{marginLeft: 0, paddingLeft: 15 }}
													selectedValue = {this.state.fm_update_check_selected}
													onValueChange = {this.on_fm_update_check_change.bind(this)}
												>
													<Picker.Item label="Everytime" value="0" />
													<Picker.Item label="Hourly" value="1" />
													<Picker.Item label="Daily"  value="2" />
													<Picker.Item label="Weekly" value="3" />
												</Picker>
											</Content>	
										}
									/>
									<Text style={{fontSize: 13, color: "gray", marginLeft: 15, marginRight: 15}}>Configure firmware update checking from these options.</Text>
								</View>

								<Divider />
								<View style ={{paddingBottom: 20}}>
									<ListItem 
										title="Inactivity Timer:"
										leftIcon={{name: 'hourglass-half', type: 'font-awesome', color: "black"}} 
										rightElement={
											<Content style={{borderWidth: 2, borderColor: '#e1e8ee'}}>
												<Picker
													mode="dropdown"
													iosHeader="Inactivity Timer"
													iosIcon={<Icon name='keyboard-arrow-down' size={25} color={'#cba830'} />}
													itemTextStyle={{fontSize: 18, color: 'black'}}
													itemStyle={{marginLeft: 0, paddingLeft: 15 }}
													selectedValue = {this.state.timer_selected}
													onValueChange = {this.on_inactivity_timer_change.bind(this)}
												>
													<Picker.Item label="2 Minutes" value="2" />
													<Picker.Item label="3 Minutes" value="3" />
													<Picker.Item label="4 Minutes" value="4" />
													<Picker.Item label="5 Minutes" value="5" />
												</Picker>
											</Content>	
										}
									/>
									<Text style={{fontSize: 13, color: "gray", marginLeft: 15, marginRight: 15}}>The inactivity timer functionality closes user sessions that have been idle for a specified period of time. Note* inactivity timer changes will take effect on the next execution of the app.</Text>
								</View>
							</View>

							<View>
								<View style ={{paddingBottom: 10, paddingTop: 10,  backgroundColor: '#e1e8ee'}}><Text style={{fontSize: 17, marginLeft: 13, color: 'gray'}}>Others: </Text></View>
								<ListItem title="Autofill" leftIcon={{name: 'pencil', type: 'octicon'}} bottomDivider containerStyle = {{marginBottom:1}} chevron={{color: "#cba830", size: 20, containerStyle: { marginRight: 10 } }}
									onPress={() => {this._handle_navigate_autofill()}}/>
									
								<ListItem style={{display: this.state.show_accessbility ? "flex" : "none"}}
									title="Accessibility" leftIcon={{name: 'universal-access', type: 'font-awesome'}} bottomDivider containerStyle = {{marginBottom:1}} chevron={{color: "#cba830", size: 20, containerStyle: { marginRight: 10 } }}
									onPress={() => {this._handle_navigate_autofill_accessbility()}}/>	

								<ListItem title="About" leftIcon={{name: 'info-circle', type: 'font-awesome'}} bottomDivider containerStyle = {{marginBottom:1}} chevron={{color: "#cba830", size: 20, containerStyle: { marginRight: 10 } }}
									onPress={() => {this.props.navigation.navigate("About_Screen")}}/>
							</View>
						</View>
					</View>
				</Content>
            </Container>
        );
    }
}

/*
<View style={{borderBottomWidth: 1, borderColor: '#e1e8ee', paddingTop: 10, paddingBottom: 20}}>
	<Form>
		<Item picker style={{borderBottomWidth: 0}}>
			<View style={{flex: 1, flexDirection: 'row', marginLeft: 15}}>
				<Icon name='code' type='font-awesome' size={25} color="black"/>
				<Text style={{fontSize: 17, marginLeft: 10, color: 'black'}}>PIN Length:</Text>
			</View>
			<Picker
				mode="dropdown"
				iosHeader="PIN Length"
				iosIcon={<Icon name='keyboard-arrow-down' size={25} color={'#cba830'} />}
				style={{ width: undefined, marginRight: 14 }}
				itemTextStyle={{fontSize: 18, color: 'black'}}
				itemStyle={{marginLeft: 0, paddingLeft: 15 }}
				selectedValue = {this.state.pin_len_selected}
				onValueChange = {this.on_pin_length_change.bind(this)}
			>
				<Picker.Item label="2 Digits" value="2" />
				<Picker.Item label="4 Digits" value="4" />
				<Picker.Item label="6 Digits" value="6" />
			</Picker>
		</Item>
	</Form>
	<Text style={{fontSize: 13, color: "gray", marginLeft: 15, paddingRight: 5}}>Configure PIN length from these options.</Text>
</View>

<View style={{borderBottomWidth: 1, borderColor: '#e1e8ee', paddingTop: 10, paddingBottom: 20}}>
	<Form>
		<Item picker style={{borderBottomWidth: 0}}>
			<View style={{flex: 1, flexDirection: 'row', marginLeft: 15}}>
				<Icon name='hourglass-half' type='font-awesome' size={25} color="black"/>
				<Text style={{fontSize: 17, marginLeft: 10, color: 'black'}}>Inactivity Timer:</Text>
			</View>
			<Picker
				mode="dropdown"
				iosHeader="Inactivity Timer"
				iosIcon={<Icon name='keyboard-arrow-down' size={25} color={'#cba830'} />}
				style={{ width: undefined, marginRight: 14 }}
				itemTextStyle={{fontSize: 18, color: 'black'}}
				itemStyle={{marginLeft: 0, paddingLeft: 15 }}
				selectedValue = {this.state.timer_selected}
				onValueChange = {this.on_inactivity_timer_change.bind(this)}
			>
				<Picker.Item label="2 Minutes" value="2" />
				<Picker.Item label="3 Minutes" value="3" />
				<Picker.Item label="4 Minutes" value="4" />
				<Picker.Item label="5 Minutes" value="5" />
			</Picker>
		</Item>
	</Form>
	<Text style={{fontSize: 13, color: "gray", marginLeft: 15, paddingRight: 15}}>The inactivity timer functionality closes user sessions that have been idle for a specified period of time. Note* inactivity timer changes will take effect on the next execution of the app.</Text>
</View>
*/