package com.ethernom.psdmgr.mobile.autofill.adapter;

public interface EthBLEClientCallBack {
    //void onDeviceNotFound();
    //void onScanDevice();
    //void onConnectDevice();
    //void onAddAccSuccess();
    void onRequestInputPin();
    void onReplyPinNotMatch(Boolean isMatch);
    //void onCardReject();
}

