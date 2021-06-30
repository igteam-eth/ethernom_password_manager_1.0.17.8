import React, {Component} from 'react';
import {View, FlatList, Keyboard, StatusBar, Image, Platform, AppState} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, InputGroup, Input} from 'native-base';
import Icon from 'react-native-vector-icons/dist/Ionicons';
import {ListItem} from 'react-native-elements';

var s = require('../css/styles');

export default class Add_Staging extends Component {
    items = [
        {name: 'Disney+ ', avatar_url: require('../assets/us_website/disney.png'), url: 'disneyplus.com'},
        {name: 'Tik Tok ', avatar_url: require('../assets/us_website/tiktok.png'), url: 'tiktok.com'},
        {name: 'Instagram ', avatar_url: require('../assets/us_website/Instagram_AppIcon_Aug2017.png'), url: 'instagram.com'},
        {name: 'Gmail ', avatar_url: require('../assets/us_website/Gmail_Icon.png'), url: 'google.com'},
        {name: 'Facebook ', avatar_url: require('../assets/website/facebook.png'), url: 'facebook.com'},
        {name: 'Snapchat ', avatar_url: require('../assets/us_website/Snapchat.jpg'), url: 'snapchat.com'},
        {name: 'Netflix ', avatar_url: require('../assets/website/netflix.png'), url: 'netflix.com'},
        {name: 'Hulu ', avatar_url: require('../assets/us_website/hulu.jpg'), url: 'hulu.com'},
        {name: 'Spotify ', avatar_url: require('../assets/us_website/Spotify.jpg'), url: 'spotify.com'},
        {name: 'Amazon', avatar_url: require('../assets/us_website/amazone.png'), url: 'amazon.com'},
        {name: 'Walmart ', avatar_url: require('../assets/us_website/Walmart.png'), url: 'walmart.com'},
        {name: 'Wish ', avatar_url: require('../assets/us_website/Wish.png'), url: 'wish.com'},
        {name: 'Venmo ', avatar_url: require('../assets/us_website/Venmo.jpg'), url: 'venmo.com'},
        {name: 'Uber ', avatar_url: require('../assets/us_website/uber.jpg'), url: 'uber.com'},
        {name: 'Twitter ', avatar_url: require('../assets/website/twitter.png'), url: 'twitter.com'},
        {name: 'PayPal ', avatar_url: require('../assets/us_website/paypal.jpg'), url: 'paypal.com'},
        {name: 'Lyft ', avatar_url: require('../assets/us_website/Lyft.png'), url: 'lyft.com'},
        {name: 'Reddit ', avatar_url: require('../assets/us_website/Reddit.png'), url: 'reddit.com'},
        {name: 'Microsoft ', avatar_url: require('../assets/us_website/microsoft_outlook.png'), url: 'live.com'},
        {name: 'Kickstarter ', avatar_url: require('../assets/us_website/Kickstarter.png'), url: ' kickstarter.com'},
        {name: 'Yahoo Mail ', avatar_url: require('../assets/us_website/Yahoo.png'), url: 'yahoo.com'},
        {name: 'Dropbox ', avatar_url: require('../assets/us_website/dropbox.png'), url: 'dropbox.com'},
    ];

    constructor(props) {
        super(props);

        global.website = [];
        this.state = {
            isSearch: false,
            value: "",
            item_list: this.items,
            appState: AppState.currentState,
        };
    }

    componentDidMount(){
        AppState.addEventListener('change', this._handleAppStateChange);
	}
    componentWillUnmount(){
        AppState.removeEventListener('change', this._handleAppStateChange);
	}

    _handleAppStateChange = (nextAppState) => {
        if(this.state.appState.match(/active|inactive/) && nextAppState === 'background') {
          this._handle_clear_text();
        }

        this.setState({appState: nextAppState});
    }


    _on_search_text = (text) => {
        const newData = this.items.filter(item => {
            const name = `${item.name.toLowerCase()}`;
            const textData = text.toLowerCase();
            return name.indexOf(textData) > -1;
        });

        this.setState({ value: text, item_list: newData, isSearch: true });
        if (text === "") {
            this.setState({ item_list: this.items })
        }
    };

    _handle_clear_text = () =>{
        this.setState({ value: "", item_list: this.items, isSearch: false});
        Keyboard.dismiss()
    };

    /*
   ============================================================================================================
   ========================================= NAVIGATE =========================================================
   ============================================================================================================
   */
    _handle_custom_websites = () => {
        const { navigate } = this.props.navigation;
        navigate("Add_Account_Screen", { url: "" });
    }

    _handle_suggested_websites = (item) => {
        const { navigate } = this.props.navigation;
        navigate("Add_Account_Screen", { url: item.url });
    };

    _handle_navigate_vault = () => {
        const { navigate } = this.props.navigation;
        navigate("Vault_Screen");
    }

    _handle_navigate_settings = () => {
        const { navigate } = this.props.navigation;
        navigate("Settings_Screen");
    }

    _handle_open_bottom_sheets_device = () => {
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

				<ListItem button
						  onPress={() => this._handle_open_bottom_sheets_device()}
						  title = {global.state.state.curr_device.name}
						  containerStyle = {{ backgroundColor: "#282828" }}
						  titleStyle = {{color: 'white', marginLeft: 30, textAlign: 'center'}}
					//leftIcon = {{name: "ios-radio-button-on", type: "ionicon", color: this.state.connected ? "#ADFF2F" : "red" }}
						  rightIcon = {{name: "ios-settings", type: "ionicon", color: "white"}}
				/>

				<View searchBar style={{flexDirection: 'row', padding:15, backgroundColor: "#282828"}}>
					<InputGroup rounded style={{flex:1, backgroundColor:'#fff', height:35, paddingLeft:10, paddingRight:10}}>
						<Icon name="ios-search" size={20}/>
						<Input onChangeText={(text) => this._on_search_text(text)} placeholder="Search"  style={{paddingBottom: Platform.OS === "ios" ? 5 : 10, marginLeft: 10}}
							   autoCorrect={false} value={this.state.value} returnKeyType={'done'}/>
						<Button transparent style={{height:30, width: 30, display: this.state.isSearch ? 'flex': 'none', justifyContent:'center'}} onPress={() => this._handle_clear_text()}>
							<Image source={require('../assets/error.png')}
								   size={10} style={[{width: 10, height: 10, resizeMode:'contain', padding: 7}]} />
						</Button>
					</InputGroup>

				</View>

				<View style={{backgroundColor: 'white'}}>
					<Button onPress={() => {this._handle_custom_websites()}} transparent full style={[{marginTop: 1, borderBottomColor: 'lightgray', borderBottomWidth: 1, backgroundColor: 'white'}, s.container_header_title]} >
						<View style={{width:'85%'}}>
							<Text style={{marginTop:13, marginLeft: -25, color:"black"}}>
								Add using custom website
							</Text>
						</View>
					</Button>
				</View>

				<FlatList style={{backgroundColor: 'white'}}
						  data={this.state.item_list}
						  renderItem={({item}) => (
							  <ListItem
								  onPress={() => {this._handle_suggested_websites(item)}}
								  roundAvatar
								  title={item.name}
								  leftAvatar={{source: item.avatar_url}}
								  bottomDivider
								  containerStyle = {{marginBottom:1}}
							  >
							  </ListItem>
                          )}
						  keyExtractor={(item, index) => index.toString()}
				/>
			</Container>
        );
    }
}