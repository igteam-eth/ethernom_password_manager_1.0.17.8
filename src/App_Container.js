import React, {Component} from 'react';
import {createAppContainer} from 'react-navigation';
import {createStackNavigator} from 'react-navigation-stack';
import {Root} from 'native-base';

import Device from './screen/Device';
import PIN_Entry from './screen/PIN_Entry';
import PIN_Entry_V2 from './screen/PIN_Entry_V2';
import Vault from './screen/Vault';
import Add_Staging from './screen/Add_Staging';
import Add_Account from './screen/Add_Account';
import View_Account from './screen/View_Account';
import Edit_Account from './screen/Edit_Account';

import Settings from './screen/Settings';
import Autofill from './screen/Autofill';
import Autofill_Accessbility from './screen/Autofill_Accessbility';
import Android_Tutorial from './screen/Android_Tutorial';
import About from './screen/About';

export default class App_Container extends Component<{}> {
    constructor() {
        super();
    }
    
	render() {
		return (
			<AppContainer/>
		);
	}
}

const App_Stack = createStackNavigator({
    Device_Screen	   : {screen: Device, navigationOptions: {header: null, gesturesEnabled: false}},
    PIN_Entry_Screen   : {screen: PIN_Entry, navigationOptions: {header: null, gesturesEnabled: false}},
    PIN_Entry_V2_Screen   : {screen: PIN_Entry_V2, navigationOptions: {header: null, gesturesEnabled: false}},

    Vault_Screen	   : {screen: Vault, navigationOptions: {header: null, gesturesEnabled: false}},
    Add_Staging_Screen : {screen: Add_Staging, navigationOptions: {header: null, gesturesEnabled: false},},
    Add_Account_Screen : {screen: Add_Account, navigationOptions: {header: null, gesturesEnabled: false},},
    View_Account_Screen: {screen: View_Account, navigationOptions: {header: null, gesturesEnabled: false}},
    Edit_Account_Screen: {screen: Edit_Account, navigationOptions: {header: null, gesturesEnabled: false},},
    
    Settings_Screen	   : {screen: Settings, navigationOptions: {header: null, gesturesEnabled: false}},
    Autofill_Screen	   : {screen: Autofill, navigationOptions: {header: null, gesturesEnabled: false}},
	Autofill_Accessbility_Screen : {screen: Autofill_Accessbility, navigationOptions: {header: null, gesturesEnabled: false}},
	About_Screen	   : {screen: About, navigationOptions: {header: null, gesturesEnabled: false}},
    Android_Tutorial_Screen : {screen: Android_Tutorial, navigationOptions: {header: null, gesturesEnabled: false}}
	},
	{
    	navigationOptions: { gesturesEnabled: false }
    }
);

const DashboardStackNavigator = createStackNavigator(
    {
        App_Stack,
    },
    {
        headerMode: 'none', mode: 'modal', navigationOptions: {header: null, gesturesEnabled: false}

    },
);

const AppContainer = createAppContainer(DashboardStackNavigator);