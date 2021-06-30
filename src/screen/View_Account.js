import React, {Component} from 'react';
import {View, StatusBar} from 'react-native';
import {Content, Container, Text, Button, Header, Left, Body, Right, Title, Form, Item, Input, Label} from 'native-base';
import Icon from 'react-native-vector-icons/dist/Ionicons';
import {ListItem} from "react-native-elements";

var s = require('../css/styles');

export default class View_Account extends Component {
	curr_job = {in_msg: null, out_msg: null};
	processing_request = false;

	constructor(props) {
        super(props);

        const { navigation } = this.props;
        this.state = {
            name: navigation.getParam('name', ""),
            url: navigation.getParam('url', ""),
            username: navigation.getParam('username', ""),
            password: navigation.getParam('password', ""),
			hidden: true
		}
		
		this.curr_password = this.state.password;
    }

    async componentDidMount() {
		var hidden = "";
		for(var i = 0; i<this.state.password.length; i++) hidden += "*";
		this.setState({
			password: hidden
		})

		global.state.setState({ spinner: {visible: false, text: ""} });
        global.isBlueToothChecked = false;

    }

    componentWillUnmount() {}

    _handle_hide_show = () => {
		if(!this.state.hidden){
			var hidden = "";
			for(var i = 0; i<this.state.password.length; i++) hidden += "*";
			this.setState({
				hidden: !this.state.hidden,
				password: hidden
			})
		}else{
			this.setState({
				hidden: !this.state.hidden,
				password: this.curr_password 
			})
		}
	};
	
     /*
	============================================================================================================
	========================================= NAVIGATE =========================================================
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
    }

    render() {
        return (
            <Container>
				<Header style={{backgroundColor: "#cba830"}}>
					<StatusBar backgroundColor='black' barStyle="light-content"/>
					<Left style={{flex: 3, marginLeft: 8}}><Button iconLeft transparent onPress={() => {this._handle_navigate_vault();}}><Text><Text style={{color: 'black', backgroundColor: 'transparent'}}>Back</Text></Text></Button></Left>
					<Body style={{flex: 3, justifyContent:'center', alignItems:'center', paddingRight: 10}}><Title style={{color:'black', textAlign:'center'}}>Vault</Title></Body>
					<Right style={{flex: 3}}></Right>
				</Header>
				<View style={[s.container]}>
					<View style={[s.container_list,{backgroundColor: 'white'}]}>
						<ListItem button
							onPress={() => this._handle_open_bottom_sheets_device()}
							title = {global.state.state.curr_device.name}
							containerStyle = {{ backgroundColor: "#282828" }}
							titleStyle = {{color: 'white', marginLeft: 30, textAlign: 'center'}}
							//leftIcon = {{name: "ios-radio-button-on", type: "ionicon", color: this.state.connected ? "#ADFF2F" : "red" }}
							rightIcon = {{name: "ios-settings", type: "ionicon", color: "white"}}
							bottomDivider
						/>

						<View style={[s.container_header_title,{justifyContent: 'center', alignItems:'center', borderBottomWidth: 1, borderColor:'#EEEEEE'}]}>
							<Text style={{marginTop:5}}>View account</Text>
						</View>

						<Content>
							<Form>
								<Item stackedLabel>
									<Label style={{fontSize: 12}}>Display name:</Label>
									<Input style={{fontSize: 15}} maxLength={31} autoCorrect={false} value={this.state.name} editable={false}/>
								</Item>

								<Item stackedLabel>
									<Label style={{fontSize: 12}}>URL:</Label>
									<Input style={{fontSize: 15}} maxLength={127} autoCapitalize="none" autoCorrect={false} value={this.state.url} editable={false}/>
								</Item>

								<Item stackedLabel>
									<Label style={{fontSize: 12}}>Username:</Label>
									<Input style={{fontSize: 15}} maxLength={63} autoCapitalize="none" autoCorrect={false} value={this.state.username} editable={false}/>
								</Item>

								<Item stackedLabel last>
									<Label style={{fontSize: 12}}>Password:</Label>
									<View style={{flex: 1, flexDirection: 'row'}}>
										<Input style={{width: '60%', fontSize: 15}} maxLength={63} autoCapitalize="none" autoCorrect={false}
												value={this.state.password} editable={false}
										/>
										<Button style={{width: 30, marginTop: 0, marginRight: 15}} onPress={() => this._handle_hide_show()} transparent>
											<Icon name= { this.state.hidden ? 'ios-eye' : 'ios-eye-off'} size={25} color="#cba830"/>
										</Button>
									</View>
								</Item>
							</Form>
						</Content>
					</View>
				</View>
            </Container>
        );
    }
}
