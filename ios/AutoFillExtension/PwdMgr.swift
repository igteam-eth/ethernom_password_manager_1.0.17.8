//
//  PwdMgr.swift
//  AutofillExtension
//
//  Created by Fred Covely on 1/15/20.
//  Copyright © 2020 Facebook. All rights reserved.
//

import Foundation
import KeychainAccess

class PwdManager : NSObject{
  var readyHandler: (() -> Void)?
  
  var _host_name = ""
  var _peripheral_id = ""
  var _peripheral_name: String?
  
  var accountFetchedHandler: (([String]) -> Void)?
  var accountFetchedWithPasswordHandler: (([String]) -> Void)?
  var operationCompleteHandler: (() -> Void)?
  var cardRequestEntryPinCompleteHandler: (() -> Void)?
  var _secureSessionManger : EtherSecureSession?
  var _pin : String = ""
  var _pin_attempt = 0;
  
  public func resumeCardRefetchAccounts() {
    let val: UInt8 = 0
    _secureSessionManger?.WriteDataToCardEncrypted(cmd: H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY, AppData: [val])
  }

  func cancelRequest(){
    _secureSessionManger?._bleClient?.cancelRequest();
  }
  
  func startScan(){
    _secureSessionManger?._bleClient?.doStartScan();
  }
  
  func stopScan(){
    _secureSessionManger?._bleClient?.doStopScan();
  }
  
  func DoSubmitPin(pinCode: [String]){
    var substring: String = _pin;
    if(pinCode[0].count != 6){
      substring = _pin.subString(from: _pin.count-pinCode[0].count, to: _pin.count-1);
    }
    
    _pin_attempt += 1;
    if(pinCode[0] != substring){
      //print("Pin fails!");
      if(_pin_attempt < 3){
        cardRequestEntryPinCompleteHandler?()
      }else{
        _pin_attempt = 0;
        self._secureSessionManger?._bleClient?.cancelRequest()
      }
    }else{
      _pin_attempt = 0;
      saveSession();
      self._secureSessionManger!.requestPwdMgrInit(pin:_pin);
    }
  }
  
  private func saveSession(){
    let pin_keychain = Keychain(service: "com.ethernom.password.manager.mobile.session.pid", accessGroup: "group.com.ethernom.password.manager.mobile")
    let curr_time = Int(round((Date().timeIntervalSince1970)*1000))
    let messageDictionary = [
      "id": _peripheral_id,
      "session": _pin,
      "time": String(curr_time)
      ] as [String : Any];
    
    let jsonData = try! JSONSerialization.data(withJSONObject: messageDictionary)
    let jsonString = NSString(data: jsonData, encoding: String.Encoding.utf8.rawValue)
    
    try? pin_keychain.set(String(jsonString!), key: "data");
  }
  
  func StartAccountRetrieval(server: String, username:String){
    _secureSessionManger?.WriteDataToCardEncrypted(cmd: H2C_RQST_GET_ACCOUNT_PASS, AppData: [server,username])
  }
  
  func initPwdManager( string_id: String, string_name: String, string_sn: String,
     cardConnectionEstablished: @escaping (_ result : Int) -> Void,
     secureCardConnectionEstablished: @escaping (EtherErrorValue) -> Void,
     secureAppSessionEstablished: @escaping (EtherErrorValue) -> Void,
     accountFetched : @escaping ([String])->Void,
     operationComplete: @escaping()->Void,
     cardRequestEntryPin: @escaping()->Void,
     cardDisconnected: @escaping(EtherErrorValue)->Void,
     accountFetchedWithPassword: @escaping([String])-> Void){
    
    _secureSessionManger = EtherSecureSession(
      string_id: string_id,
      string_name: string_name,
      string_sn: string_sn,
      cardConnectionEstablished:cardConnectionEstablished,
      secureCardSessionEstablished:secureCardConnectionEstablished,
      appLaunched: AppLaunched,
      secureAppSessionEstablished:secureAppSessionEstablished,
      cardDisconnected: cardDisconnected,
      appMessageReceived: handle_command)

    cardRequestEntryPinCompleteHandler = cardRequestEntryPin
    accountFetchedHandler = accountFetched
    operationCompleteHandler = operationComplete
    accountFetchedWithPasswordHandler = accountFetchedWithPassword
    
    _peripheral_id = string_id;
  }
  
  func handle_command(transportCmdByte: UInt8, value: [UInt8]){
    if(transportCmdByte == PSD_MGR_PORT){
      handle_command_psd_mgr(value: value)
    }else if(transportCmdByte == GENERIC_PORT){
      print("unexpected generic port number received")
    }
  }

  func RetrieveAccounts(){
    let val: UInt8 = 0
    self._secureSessionManger?.WriteDataToCardEncrypted(cmd: H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY, AppData: [val])
  }
  
  func DoStartCardAuthentication(){
    _secureSessionManger?.DoStartCardAuthentication(appID: PSD_MGR_ID)
  }
  
  func AppLaunched(result: EtherErrorValue){
    if result == EtherError.ETH_SUCCESS {
      DispatchQueue.main.async {
        self.requestAppSession()
      }
    }
  }
  
  func requestAppLaunch(host_name: String){
    _host_name = host_name
    _secureSessionManger?.RequestAppLaunch(host_name: host_name, appID: PSD_MGR_ID)
    self._peripheral_name = self._secureSessionManger?._bleClient?.periphEthCard?.name
  }

  func requestAppSession(){
    let payload = MakeSessionRequest()
    self._secureSessionManger?._bleClient?.WriteDataToCard_Generic(data: payload, writeCallback: { (tvalue) in
      let value = tvalue
      switch (value[EtherTransportProtocol.ETH_BLE_HEADER_SIZE]) {
        case CM_SESSION_RSP:
          //print("generating new session!");
          self._pin = "";
          let pin: [UInt8] = CopyBytes(payload: value, startIdx: 12, count: 6);
          for letter in pin {
            self._pin = self._pin + String(UnicodeScalar(UInt8(letter)))
          }
          self.cardRequestEntryPinCompleteHandler?()
          break;

        case CM_RSP:
          if(value[12] == CM_ERR_SUCCESS){
            //print("session established success!");
            self.saveSession();
            self._secureSessionManger!.requestPwdMgrInit(pin:self._pin);
            
          }
          break;

        default:
          //print("Invalid command");
          //self.bleClient?.cancelRequest()
          break;
      }
    })
  }
  func MakeSessionRequest()-> [UInt8]{
    _pin_attempt = 0;
    var payload = [UInt8]()
    let hname = toUInt8_Array(string: _host_name, length: HOST_NAME_MAX_LEN);
    
    let pin_len_keychain = Keychain(service: "com.ethernom.password.manager.mobile.pin.length", accessGroup: "group.com.ethernom.password.manager.mobile")
    let pin_length_string = try? pin_len_keychain.getString("data");
    let pin_length = UInt8(pin_length_string!)!;
    
    let pin_keychain = Keychain(service: "com.ethernom.password.manager.mobile.session.pid", accessGroup: "group.com.ethernom.password.manager.mobile")
    let pin_keychain_json_string = try? pin_keychain.getString("data");
    if pin_keychain_json_string != nil{
      let pin_keychain_object = pin_keychain_json_string!.toJSON() as? [String:AnyObject]
      _pin = "";
      _pin = pin_keychain_object!["session"] as! String;
      print(_pin);
      let curr_time = Int(pin_keychain_object!["time"] as! String);
      
      let currentTimeInMiliseconds = round((Date().timeIntervalSince1970)*1000)
      let timeout_keychain = Keychain(service: "com.ethernom.password.manager.mobile.session.timer", accessGroup: "group.com.ethernom.password.manager.mobile")
      let timeout_string = try? timeout_keychain.getString("data");
      let timeout = Int(timeout_string!)!;
      let TIMEOUT_PERIOD:Int = timeout * 60 * 1000;
      
      if((Int(currentTimeInMiliseconds) - curr_time!) <= TIMEOUT_PERIOD){
        //print("True");
        payload.append(CM_SESSION_RECONNECT);
        payload.append(0);
        payload.append(25);
        payload.append(0);
        payload.append(PSD_MGR_ID);
        payload.append(contentsOf: hname)
        payload.append(0);
        let pin = toUInt8_Array(string: _pin, length: 6);
        payload.append(contentsOf: pin)
        payload.append(pin_length);
        payload.append(0);
      }else{
        //print("False");
        payload.append(CM_SESSION_REQUEST);
        payload.append(0);
        payload.append(19);
        payload.append(0);
        payload.append(PSD_MGR_ID);
        payload.append(contentsOf: hname)
        payload.append(0);
        payload.append(pin_length);
        payload.append(0);
      }
    
    }else{
      //print("False");
      payload.append(CM_SESSION_REQUEST);
      payload.append(0);
      payload.append(19);
      payload.append(0);
      payload.append(PSD_MGR_ID);
      payload.append(contentsOf: hname)
      payload.append(0);
      payload.append(pin_length);
      payload.append(0);
    }
    
    return payload;
  }
  
  func toUInt8_Array(string: String, length: Int) -> [UInt8] {
    var data_array: [UInt8] = [UInt8](repeating: 0, count: length)
    let data = Array(string.utf8)
    var i = 0
    for c in data{
      if(i < data_array.count){
        data_array[i] = c
      }
      i += 1
    }
    return data_array;
  }
  
  func decomposeBLEPacket(cmd : UInt8,  data : [UInt8]) -> [String]{
    var item : [String] = []
    var startingPoint = EtherTransportProtocol.ETH_BLE_PAYLOAD_HEAD + 1
    
    if cmd == C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY {
      startingPoint += 2
    }
    
    var i = 0, bytes = [UInt8]();
    for uc in data{
      if (i >= startingPoint){
        if (uc == EtherTransportProtocol.DELIMITER || uc == 0x00) {
          item.append(String(data: Data(bytes), encoding: .utf8)!);
          bytes.removeAll()
        } else {
          bytes.append(uc);
        }
      }
      i += 1
    }
    
    if bytes.count > 0 {
      item.append(String(data: Data(bytes), encoding: .utf8)!);
    }
    
    return item;
  }

  func handle_command_psd_mgr(value: [UInt8]){
    let appData = CopyBytes(payload: value, startIdx: UInt8(EtherTransportProtocol.ETH_BLE_HEADER_SIZE), count: Int(value.count - EtherTransportProtocol.ETH_BLE_HEADER_SIZE))
    print(appData[0])
    switch (appData[0]) {
      case C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY:
        if (appData[1] == AWK) {
          let temp = decomposeBLEPacket(cmd: C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY, data: value)
          accountFetchedHandler?(temp)
          
          var s = [UInt8]();
          if(appData[3] != 31){
            s.append(appData[2]);
            s.append(appData[3]);
          }else{
            s.append(appData[2]);
            s.append(0);
          }
          
          _secureSessionManger?.WriteDataToCardEncrypted(cmd: H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY, AppData: s)
        } else if(appData[1] == OTHER){
          operationCompleteHandler?()
        }
        break;
      
      case C2H_RPLY_GET_ACCOUNT_PASS:
        if (appData[ 1] == AWK) {
          let temp = decomposeBLEPacket(cmd: C2H_RPLY_GET_ACCOUNT_PASS, data: value)
          accountFetchedWithPasswordHandler?(temp)
          _secureSessionManger!.requestSuspendApp();
        }
        break;
      
      default:
        break;
      }
    }
}
