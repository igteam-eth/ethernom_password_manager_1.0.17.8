package com.ethernom.psdmgr.mobile.autofill;

import android.app.Activity;
import android.content.Context;

import com.ethernom.android.etherapi.Crypto.EtherECDH;
import com.ethernom.android.etherapi.Crypto.Ether_AESEAX;
import com.ethernom.android.etherapi.EthernomConstKt;
import com.ethernom.android.etherapi.EtherEncHeader;
import com.facebook.react.common.StandardCharsets;

import org.json.JSONException;
import org.json.JSONObject;

import java.lang.Object;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;

interface etherSecureSessionListener {
    void onCardConnected();
    void onCardDisconnected();
    void onData(byte[] buffer);
    void onAuthenticated(int code);
    void onAppLaunched(int code);
    void onPINRequest(String PIN, int code);
    void onSecureAppSessionEstablished(int code);
    void onDeviceNotFound();
}

public class EtherSecureSession {
    EtherECDH _ecdh = new EtherECDH();
    Ether_AESEAX _aes_eax = new Ether_AESEAX();
    etherSecureSessionListener _etherSecureSessionListener;

    String _host_name;
    String _pin;

    BLEClientListener listeners = new BLEClientListener();
    EthBLEClient _bleClient = new EthBLEClient();
    public EthBLEClient getEthBLEClient(){
        return _bleClient;
    }

    private Keychain mKeychain;
    private String deviceID = "";
    private String deviceName = "";
    private String deviceSN = "";

    public void init(Activity thisActivity, Context ctx, String id, String name, String sn, etherSecureSessionListener etherSecureSession){
        mKeychain = new Keychain(thisActivity);
        deviceID = id;
        deviceName = name;
        deviceSN = sn;

        _etherSecureSessionListener = etherSecureSession;
        _bleClient.initEthBLE(ctx, deviceID, _aes_eax, listeners);
    }

    public class BLEClientListener implements etherBLEClientListener{
        public void onCardConnected(){
            if(_etherSecureSessionListener != null) _etherSecureSessionListener.onCardConnected();
        };

        @Override
        public void onDeviceNotFound() {
            _etherSecureSessionListener.onDeviceNotFound();
        }

        public void onCardDisconnected(){
            if(_etherSecureSessionListener != null) _etherSecureSessionListener.onCardDisconnected();
        };

        public void onData(byte[] buffer){
            //Log.i("TEST_EtherSecureSession_onData", _bleClient.hexaSpaced(buffer));
            if((buffer[2] & EthernomConstKt.getFLAG_CONTAIN_ENCRYPTION_HDR()) > 0){
                //Log.i("TEST_EtherSecureSession_onData", "Decrypting");
                Object[] packets = ParseEncryptedHeader(buffer);

                byte[] response_transportPayload = (byte[]) packets[0];
                byte[] response_encHeader = (byte[]) packets[1];
                byte[] response_appPayload = (byte[])packets[2];

                byte[] decryptedPacket = _aes_eax.DecryptByteArray(response_encHeader, response_appPayload);
                byte[] temp = _bleClient.concatBytesArray(response_transportPayload, decryptedPacket);

                if(_etherSecureSessionListener != null) _etherSecureSessionListener.onData(temp);
            }else{
                if(_etherSecureSessionListener != null) _etherSecureSessionListener.onData(buffer);
            }
        };
    }

    public void DoStartCardAuthentication(byte appID){
        //Log.i("TEST_EtherSecureSession", "DoStartCardAuthentication");

        byte[] payload = new byte[5];
        payload[0] = EthernomConstKt.getCM_INIT_APP_PERM();
        payload[1] = 0;
        payload[2] = 1;
        payload[3] = 0;
        payload[4] = appID;

        _bleClient.WriteDataToCard_Generic(payload, buffer -> {
            if(buffer[EthernomConstKt.getETH_BLE_HEADER_SIZE()] == EthernomConstKt.getCM_AUTHENTICATE()){
                byte[] challenge = new byte[32];
                for(int i=0; i<32; i++) challenge[i] = buffer[i + 12];
                generate_auth_rsp(challenge);
            }else{
                //Log.i("TEST_EtherSecureSession", "Bad DH sequence from card");
            }
        });
    }

    private void generate_auth_rsp(byte[] challenge){
        //Log.i("TEST_EtherSecureSession", "generate_auth_rsp");
        JSONObject key_pairs = mKeychain.get_key_pairs(deviceSN);
        if(key_pairs != null){
            try {
                String pubKey = key_pairs.getString("pubkey");
                String privKey = key_pairs.getString("pkey");
                List<Byte> responseBytes = _ecdh.generate_auth_rsp(challenge, pubKey, privKey);

                byte[] temp = new byte[responseBytes.size()];
                for(int i=0; i<responseBytes.size(); i++) temp[i] = responseBytes.get(i);

                //Log.i("TEST_EtherSecureSession", "WRITING Auth_rsp");
                _bleClient.WriteDataToCard_Generic(temp, buffer -> {
                    if(buffer[EthernomConstKt.getETH_BLE_HEADER_SIZE()] == EthernomConstKt.getCM_RSP()){
                        if(buffer[12] == EthernomConstKt.getCM_ERR_SUCCESS()){
                            //Log.i("TEST_EtherSecureSession", "Auth success");
                            if(_etherSecureSessionListener != null) _etherSecureSessionListener.onAuthenticated(0);
                        }else{
                            //Log.i("TEST_EtherSecureSession", "Auth fails");
                            if(_etherSecureSessionListener != null) _etherSecureSessionListener.onAuthenticated(-2);
                        }
                    }else{
                        //Log.i("TEST_EtherSecureSession", "Invalid command");
                        if(_etherSecureSessionListener != null) _etherSecureSessionListener.onAuthenticated(-1);

                    }
                });
            } catch (JSONException e) {
                //Log.i("TEST_EtherSecureSession", "Bad JSON string");
            }
        }else{
            //Log.i("TEST_EtherSecureSession", "Doesn't contain key pairs");
        }
    }

    public void RequestAppLaunch(String host_name, byte appID){
        _host_name = host_name;

        byte[] payload = new byte[5];
        payload[0] = EthernomConstKt.getCM_LAUNCH_APP();
        payload[1] = 0;
        payload[2] = 1;
        payload[3] = 0;
        payload[4] = appID;

        _bleClient.WriteDataToCard_Generic(payload, buffer -> {
            if(buffer[EthernomConstKt.getETH_BLE_HEADER_SIZE()] == EthernomConstKt.getCM_RSP()) {
                if (buffer[12] == EthernomConstKt.getCM_ERR_SUCCESS()) {
                    _bleClient.auto_reconnect = false;
                    if(_etherSecureSessionListener != null) _etherSecureSessionListener.onAppLaunched(0);

                }else if(buffer[12] == EthernomConstKt.getCM_ERR_APP_BUSY()){
                    _bleClient.auto_reconnect = true;
                    RequestAppSuspend(appID);

                }else{
                    _bleClient.cancelRequest();
                    if(_etherSecureSessionListener != null) _etherSecureSessionListener.onAppLaunched(-1);
                    //Log.i("TEST_EtherSecureSession", "App launched fails");
                }
            }else{
                //Log.i("TEST_EtherSecureSession", "Invalid command: Launch app state");
            }
        });
    }

    public void RequestAppSuspend(byte appID){
        byte[] payload = new byte[5];
        payload[0] = EthernomConstKt.getCM_SUSPEND_APP();
        payload[1] = 0;
        payload[2] = 1;
        payload[3] = 0;
        payload[4] = appID;

        _bleClient.WriteDataToCard_Generic(payload);
    }

    public void requestSessionPIN() {
        //Log.i("TEST_EtherSecureSession","requestSessionPIN");

        List<Byte> payload = new ArrayList<Byte>();
        JSONObject session_pin = mKeychain.get_session_pin();
        String PIN = "";

        Integer pin_len = mKeychain.get_session_pin_len();
        byte[] hname = convertToByte(_host_name, 15);

        if(session_pin == null){
            payload.add(EthernomConstKt.getCM_SESSION_REQUEST());
            payload.add((byte)0x00);
            payload.add((byte)19);
            payload.add((byte)0x00);
            payload.add(EthernomConstKt.getPSD_MGR_ID());

            for(int i=0;i<hname.length; i++) payload.add(hname[i]);
            payload.add((byte)0x00);
            payload.add(pin_len.byteValue());
            payload.add((byte)0x00);

        }else{
            Integer session_timer = mKeychain.get_session_timer();
            try {
                Long session_time = Long.parseLong(session_pin.getString("time"));
                Calendar calendar = Calendar.getInstance();
                Long mSeconds = calendar.getTimeInMillis();
                Long TIMEOUT_PERIOD = Long.valueOf(session_timer * 60 * 1000);

                if((mSeconds - session_time) <= TIMEOUT_PERIOD) {
                    PIN = session_pin.getString("session");
                    byte[] hPIN = convertToByte(PIN, 6);

                    payload.add(EthernomConstKt.getCM_SESSION_RECONNECT());
                    payload.add((byte) 0x00);
                    payload.add((byte) 25);
                    payload.add((byte) 0x00);
                    payload.add(EthernomConstKt.getPSD_MGR_ID());
                    for (int i = 0; i < hname.length; i++) payload.add(hname[i]);
                    payload.add((byte) 0x00);

                    for (int i = 0; i < hPIN.length; i++) payload.add(hPIN[i]);
                    payload.add(pin_len.byteValue());
                    payload.add((byte) 0x00);

                }else{
                    payload.add(EthernomConstKt.getCM_SESSION_REQUEST());
                    payload.add((byte)0x00);
                    payload.add((byte)19);
                    payload.add((byte)0x00);
                    payload.add(EthernomConstKt.getPSD_MGR_ID());

                    for(int i=0;i<hname.length; i++) payload.add(hname[i]);
                    payload.add((byte)0x00);
                    payload.add(pin_len.byteValue());
                    payload.add((byte)0x00);
                }
            }catch (JSONException e) {
                payload.add(EthernomConstKt.getCM_SESSION_REQUEST());
                payload.add((byte)0x00);
                payload.add((byte)19);
                payload.add((byte)0x00);
                payload.add(EthernomConstKt.getPSD_MGR_ID());

                for(int i=0;i<hname.length; i++) payload.add(hname[i]);
                payload.add((byte)0x00);
                payload.add(pin_len.byteValue());
                payload.add((byte)0x00);
            }
        }

        byte[] temp = new byte[payload.size()];
        for(int i=0;i<payload.size();i++) temp[i] = payload.get(i);
        _bleClient.WriteDataToCard_Generic(temp, buffer -> {
            if(buffer[EthernomConstKt.getETH_BLE_HEADER_SIZE()] == EthernomConstKt.getCM_SESSION_RSP()) {
                byte[] slice = Arrays.copyOfRange(buffer, 12, buffer.length);
                String new_PIN = convertToString(slice);
                if(_etherSecureSessionListener != null) _etherSecureSessionListener.onPINRequest(new_PIN, 1);

            }else if(buffer[EthernomConstKt.getETH_BLE_HEADER_SIZE()] == EthernomConstKt.getCM_RSP()) {
                try {
                    String PIN2 = session_pin.getString("session");
                    if(_etherSecureSessionListener != null) _etherSecureSessionListener.onPINRequest(PIN2, 0);

                }catch (JSONException e) {
                    _bleClient.cancelRequest();
                    if(_etherSecureSessionListener != null) _etherSecureSessionListener.onAppLaunched(-1);
                }
            }else{
                if(_etherSecureSessionListener != null) _etherSecureSessionListener.onAppLaunched(-1);
            }
        });
    }

    public void requestPwdMgrInit(String PIN){
        //Log.i("TEST_EtherSecureSession","requestPwdMgrInit");

        _pin = PIN;
        mKeychain.update_session_pin(PIN, deviceID);

        //Log.i("TEST_EtherSecureSession",_pin);

        EtherEncHeader encHeader = new EtherEncHeader((byte)EthernomConstKt.getAPP_H2C_MSG(), (byte)0x00, 24, 0);
        //byte[] payload = convertToByte(EthernomConstKt.getH2C_RQST_INIT(), new String[]{_host_name, "000000"});

        List<Byte> data = new ArrayList<Byte>();
        data.add((byte)EthernomConstKt.getH2C_RQST_INIT());
        for(int i=0; i<_host_name.length(); i++){
            if(i < 14) {
                data.add((byte) _host_name.charAt(i));
            }
        }
        data.add(EthernomConstKt.getDELIMITER());
        for(int i=0; i<6; i++) {
            data.add((byte)0x30);
        }
        data.add((byte)0x00);

        byte[] temp = new byte[data.size()];
        for(int k=0; k<data.size(); k++) temp[k] = data.get(k);
        byte[] payload = temp;

        _bleClient.WriteDataToCard(payload, encHeader, buffer -> {
            doKeyExchange();
        });
    }

    private void doKeyExchange(){
        //Log.i("TEST_EtherSecureSession","doKeyExchange");

        _aes_eax.GenerateKeyPair();
        byte[] payload = _aes_eax.GetPublicHostKey();
        //Log.i("TEST_EtherSecureSession",_bleClient.hexaSpaced(payload));

        EtherEncHeader encHeader = new EtherEncHeader((byte)EthernomConstKt.getAPP_H2C_KEY_EXCHANGE(), (byte)0x00, 24, _aes_eax.GetNextSequence());
        _bleClient.WriteDataToCard(payload, encHeader, buffer -> {
            Object[] packets = ParseEncryptedHeader(buffer);
            byte[] response_transportPayload = (byte[]) packets[0];
            byte[] response_encHeader = (byte[]) packets[1];
            byte[] response_appPayload = (byte[]) packets[2];

            if (response_encHeader[0] == EthernomConstKt.getAPP_C2H_KEY_EXCHANGE()) {
                _aes_eax.SetCardPublicKey(response_appPayload);
                _aes_eax.GenerateSessionKeyFromSecret(_pin);
                doStartEncryptionWithCard();
            }else{
                //Log.i("TEST_EtherSecureSession", "Invalid command: Key exchange");
            }
        });
    }

    private void doStartEncryptionWithCard(){
        //Log.i("TEST_EtherSecureSession","doStartEncryptionWithCard");

        _aes_eax.InitializeRandomSequence();

        EtherEncHeader encHeader = new EtherEncHeader((byte)EthernomConstKt.getAPP_H2C_ENCRYPT_START(), (byte)0x00, 0, _aes_eax.GetNextSequence());
        byte[] payload = encHeader.GetHeaderBuffer();

        _bleClient.WriteDataToCardHasEncryption(payload, buffer -> {
            Object[] packets = ParseEncryptedHeader(buffer);
            byte[] response_transportPayload = (byte[]) packets[0];
            byte[] response_encHeader = (byte[]) packets[1];
            byte[] response_appPayload = (byte[])packets[2];

            if (response_encHeader[0] == EthernomConstKt.getAPP_C2H_ENCRYPT_START()) {
                if(_etherSecureSessionListener != null) _etherSecureSessionListener.onSecureAppSessionEstablished(0);
            }else{
                //Log.i("TEST_EtherSecureSession", "Invalid command: Start encryption");
                if(_etherSecureSessionListener != null) _etherSecureSessionListener.onSecureAppSessionEstablished(-1);
            }
        });
    }

    public void WriteDataToCardEncrypted(byte cmd, String[] value){
        byte[] payload = convertToByte(cmd, value);
        //Log.i("TEST_WriteDataToCardEncrypted1.1", _bleClient.hexaSpaced(payload));

        byte[] encrypted_data = _aes_eax.EncryptByteArray(payload);
        //Log.i("TEST_WriteDataToCardEncrypted1.2", _bleClient.hexaSpaced(encrypted_data));
        _bleClient.WriteDataToCardHasEncryption(encrypted_data);
    }

    public void WriteDataToCardEncrypted(byte cmd, byte[] value){
        byte[] payload = new byte[value.length + 1];
        for(Integer i=0; i<payload.length; i++){
            if(i == 0)  payload[i] = cmd;
            else payload[i] = value[i-1];
        }
        //Log.i("TEST_WriteDataToCardEncrypted2.1", _bleClient.hexaSpaced(payload));

        byte[] encrypted_data = _aes_eax.EncryptByteArray(payload);
        //Log.i("TEST_WriteDataToCardEncrypted2.2", _bleClient.hexaSpaced(encrypted_data));
        _bleClient.WriteDataToCardHasEncryption(encrypted_data);
    }

    private String convertToString(byte[] payload){
        String value = "";

        for(int i=0; i<payload.length; i++){
            value += (char) payload[i];
        }
        return value;
    }

    private byte[] convertToByte(String value, Integer num){
        List<Byte> payload = new ArrayList<Byte>();

        for(int i=0; i<num; i++){
            if(i < value.length()) {
                payload.add((byte) value.charAt(i));
            }else{
                payload.add((byte) 0x00);
            }
        }

        byte[] temp = new byte[payload.size()];
        for(int k=0; k<payload.size(); k++) temp[k] = payload.get(k);
        return temp;
    }

    private byte[] convertToByte(byte cmd, String[] value){
        List<Byte> payload = new ArrayList<Byte>();
        payload.add(cmd);

        if(value.length == 0){
            payload.add((byte)0x00);
        }else{
            for(int i=0; i<value.length; i++){
                byte arr[] = value[i].getBytes(StandardCharsets.UTF_8);
                for(int j = 0; j<arr.length; j++) payload.add(arr[j]);

                if(i < value.length-1) payload.add(EthernomConstKt.getDELIMITER());
            }
            payload.add((byte)0x00);
        }

        byte[] temp = new byte[payload.size()];
        for(int k=0; k<payload.size(); k++) temp[k] = payload.get(k);
        return temp;
    }
//    private byte[] convertToByte(byte cmd, String[] value){
//        List<Byte> payload = new ArrayList<Byte>();
//        payload.add(cmd);
//
//        if(value.length == 0){
//            payload.add((byte)0x00);
//        }else{
//            for(int i=0; i<value.length; i++){
//                for(int j=0; j<value[i].length(); j++){
//                    payload.add((byte)value[i].charAt(j));
//                }
//                if(i < value.length - 1){
//                    payload.add(EthernomConstKt.getDELIMITER());
//                }
//            }
//            payload.add((byte)0x00);
//        }
//
//        byte[] temp = new byte[payload.size()];
//        for(int k=0; k<payload.size(); k++) temp[k] = payload.get(k);
//        return temp;
//    }

    private Object[] ParseEncryptedHeader(byte[] payload){
        //byte[] transportHdr = new byte[EthernomConstKt.getETH_BLE_ENC_HEADER_SIZE()];
        //for(int i=0; i<transportHdr.length; i++) transportHdr[i] = payload[i];
        byte[] transportHdr = Arrays.copyOfRange(payload, 0, 8);

        //byte[] encHdr = new byte[EthernomConstKt.getETH_BLE_ENC_HEADER_SIZE()];
        //for(int i=0; i<encHdr.length; i++) encHdr[i] = payload[EthernomConstKt.getETH_BLE_HEADER_SIZE() + i];
        byte[] encHdr = Arrays.copyOfRange(payload, 8, 24);

        byte[] appPayload = null;
        if(payload.length > 24) {
            /*
            appPayload = new byte[payload.length - EthernomConstKt.getETH_BLE_ENC_HEADER_SIZE() - EthernomConstKt.getETH_BLE_ENC_HEADER_SIZE()];
            for (int i = 0; i < appPayload.length; i++)
                appPayload[i] = payload[EthernomConstKt.getETH_BLE_ENC_HEADER_SIZE() + EthernomConstKt.getETH_BLE_ENC_HEADER_SIZE() + 1];
             */
            appPayload = Arrays.copyOfRange(payload, 24, payload.length);
        }
        // no need to do this as payload is decrypted later   transportHdr.add(contentsOf: appPayload)
        return new Object[]{transportHdr, encHdr, appPayload};
    }
}