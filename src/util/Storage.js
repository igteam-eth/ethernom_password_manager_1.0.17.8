import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-community/async-storage';

const PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL = "com.ethernom.password.manager.mobile.data.registered_peripheral",
    PSD_SESSION_PIN = "com.ethernom.password.manager.mobile.session.pid",
    PSD_SESSION_PIN_LENGTH = "com.ethernom.password.manager.mobile.pin.length",
    PSD_SESSION_TIMER = "com.ethernom.password.manager.mobile.session.timer",

	PSD_MGR_ACCESS_GROUP = "group.com.ethernom.password.manager.mobile";
	
// ===============================================================
// ==================== RENDER COMPONENT =========================
// ===============================================================
module.exports = class StorageAPI {
    constructor() {}

    register_peripheral_data = async (new_id, new_name, new_sn) => {
    	var obj = {id: new_id, name: new_name, sn: new_sn};
    	var obj_string = JSON.stringify(obj);
        var result = await Keychain.setGenericPassword("data", obj_string, {
			accessGroup: PSD_MGR_ACCESS_GROUP,
			service: PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL
		});
    };

	save_pin_len = async (len) => {
		var result = await Keychain.setGenericPassword("data", len.toString(), {
			accessGroup: PSD_MGR_ACCESS_GROUP,
			service: PSD_SESSION_PIN_LENGTH
		});
	}

	get_pin_len = async () => {
		var result = await Keychain.getGenericPassword({
            accessGroup: PSD_MGR_ACCESS_GROUP,
            service: PSD_SESSION_PIN_LENGTH
        });

        if(result == null || result == false){
        	this.save_pin_len(2);
        	return 2;
        }else{
        	return parseInt(result.password);
        }
	}

	save_timer = async (time) => {
		var result = await Keychain.setGenericPassword("data", time.toString(), {
			accessGroup: PSD_MGR_ACCESS_GROUP,
			service: PSD_SESSION_TIMER
		});
	}

	get_timer = async () => {
		var result = await Keychain.getGenericPassword({
            accessGroup: PSD_MGR_ACCESS_GROUP,
            service: PSD_SESSION_TIMER
        });

		if(result == null || result == false){
			this.save_timer(5);
        	return 5;
        }else{
        	return parseInt(result.password);
        }
	}

	save_session_pin = async (peripheral_id, pin) => {
		console.log("Saving new session...");
		var obj = {id: peripheral_id, session: pin, time: get_time().toString()};
		var obj_string = JSON.stringify(obj);
		var result = await Keychain.setGenericPassword("data", obj_string, {
			accessGroup: PSD_MGR_ACCESS_GROUP,
			service: PSD_SESSION_PIN
		});
	}

	get_session_pin = async (peripheral_id) => {
		console.log("Getting session...");
		var result = await Keychain.getGenericPassword({
            accessGroup: PSD_MGR_ACCESS_GROUP,
            service: PSD_SESSION_PIN
        });

		if(result == null || result == false){
        	console.log("Session doesn't exist...");
        	return false

        }else{
			var obj = JSON.parse(result.password);
        	if(obj.id == peripheral_id){
        		return obj.session;
			}else{
				console.log("Session doesn't belong to peripheral...");
				return false;
			}
		}
	}

    update_session_time = async () => {
		console.log("Updating session...");
    	var result = await Keychain.getGenericPassword({
            accessGroup: PSD_MGR_ACCESS_GROUP,
            service: PSD_SESSION_PIN
        });

    	if(result == null || result == false){
    		console.log("Session doesn't exist...");
    		return;

    	}else{
    		console.log("Updating session time...");
    		var obj = JSON.parse(result.password);
			this.save_session_pin(obj.id, obj.session);
			return;
    	}
    }

	remove_session_pin = async () => {
		console.log("Session expire...");

		var result = await Keychain.getGenericPassword({
            accessGroup: PSD_MGR_ACCESS_GROUP,
            service: PSD_SESSION_PIN
        });

        if(result == null || result == false){
    		console.log("Session doesn't exist...");
    		return;

    	}else{
			await Keychain.resetGenericPassword({ accessGroup: PSD_MGR_ACCESS_GROUP, service: PSD_SESSION_PIN});
			return;
		}
	}

	check_session_pin = async () => {
		var result = await Keychain.getGenericPassword({
            accessGroup: PSD_MGR_ACCESS_GROUP,
            service: PSD_SESSION_PIN
		});

		if(result == null || result == false){
    		console.log("Session doesn't exist...");
    		return false;

    	}else{
    		var curr_time = get_time();
			var timeout = await this.get_timer() * 60 * 1000;
    		var obj = JSON.parse(result.password);

			if((curr_time - parseInt(obj.time)) <= timeout){
				console.log("Check: still wihtin session...");
				return true;
			}else{
				this.remove_session_pin();
				return false;
			}
    	}
	}

	get_settings = async () => {
		var result = await AsyncStorage.getItem('init_settings');
		if(result === null || result === false){
			var value = 0
			AsyncStorage.setItem('init_settings', value.toString())
			return 1;
		}else{
			return parseInt(result);
		}
	}
	
	get_accessibility_settings = async () => {
		var result = await AsyncStorage.getItem('init_accessibility_settings');
		if(result === null || result === false){
			var value = 0
			AsyncStorage.setItem('init_accessibility_settings', value.toString())
			return 1;
		}else{
			return parseInt(result);
		}
	}

	save_fm_update_check = async (pd) => {
		await AsyncStorage.setItem('fm_update_check_v2', pd.toString())
	}

	get_fm_update_check = async () => {
		var result = await AsyncStorage.getItem('fm_update_check_v2');
		if(result == null || result == false){
			this.save_fm_update_check(0);
			return 0;
		}else{
			return parseInt(result);
		}
	}

	get_registered_card_update_check = async (deviceSN) => {
		if(deviceSN == null) return true;

		var timeout = await this.get_fm_update_check();
		if(timeout == 0) return true;

		var current_list = await AsyncStorage.getItem('registered_card_update_check');
		if(current_list == null || current_list == false) return true

		var list = JSON.parse(current_list);
		for(var i = 0; i< list.length; i++){
			if(list[i].sn == deviceSN){
				var timeout_mls = get_mls(timeout);
				var curr_time = get_time();

				if(Number.isInteger(list[i].datetime)){
					if((curr_time - list[i].datetime) <= timeout_mls) return false;
					else return true;
				}else{
					var time = new Date(list[i].datetime);
					var mls = Date.parse(time);
					if((curr_time - mls) <= timeout_mls) return false;
					else return true;
				}
			}
		}

		return true;
	}

	save_new_card_update_check = async (deviceSN) => {
		if(deviceSN == null) return;

		var obj = [{sn: deviceSN, datetime: get_time()}];
		var current_list = await AsyncStorage.getItem('registered_card_update_check');
		if(current_list == null || current_list == false){
			var json_string = JSON.stringify(obj);
			await AsyncStorage.setItem('registered_card_update_check', json_string);
			return;
		}

		var list = JSON.parse(current_list);
		for(var i = 0; i< list.length; i++){
			if(list[i].sn == deviceSN){
				list[i].datetime = obj[0].datetime;
				var json_string = JSON.stringify(list);
				await AsyncStorage.setItem('registered_card_update_check', json_string);
				return;
			}
		}

		list = list.concat(obj);
		var json_string = JSON.stringify(list);
		await AsyncStorage.setItem('registered_card_update_check', json_string);
		return;
	}
	
	remove_card_update_check = async (deviceSN) => {
		if(deviceSN == null) return;

		var current_list = await AsyncStorage.getItem('registered_card_update_check');
		if(current_list == null || current_list == false){
			return;
		}

		var list = JSON.parse(current_list);
		var new_list = [];
		for(var i = 0; i< list.length; i++){
			if(list[i].sn != deviceSN){
				new_list = new_list.concat(list[i]);
			}
		}

		console.log(list);
		console.log(new_list);

		var json_string = JSON.stringify(new_list);
		await AsyncStorage.setItem('registered_card_update_check', json_string);
		return;
    }
}

function get_time(){
	var time = new Date();
	var mls = Date.parse(time);
	return mls;
}

function get_mls(num){
	if(num == 1){
		return 3.6e+6;
	}else if(num == 2){
		return 8.64e+7;
	}else if(num == 3){
		return 6.048e+8;
	}
}