import React, {Component} from 'react';
import {Platform} from 'react-native';
import {NativeModules} from 'react-native';
var HelloWorld = NativeModules.HelloWorld;
module.exports = class Helloworld {
    constructor() {}

    saveAllCredentailsToDB = (credArr) => {
        const myObjStr = JSON.stringify(credArr);
        HelloWorld.addAccount(myObjStr, (err) => {console.log(err)}, (msg) => {console.log(msg)} );
    
    };
    
    setAutofillFlag = (flag) => {
        HelloWorld.updateAutofillFlag(flag, (err) => {console.log(err)}, (msg) => {console.log(msg)} );
    };

    addAccountToDB = (creds) => {

        const myObjStr = JSON.stringify(creds);
        HelloWorld.addSingleAccount(myObjStr, (err) => {console.log(err)}, (msg) => {console.log(msg)} );

    };

    editSingleAccounts = (curCreds, newCreds) => {
        const curObjString = JSON.stringify(curCreds);
        const newObjString = JSON.stringify(newCreds);
        HelloWorld.deleteSingleAccount(curObjString, (err) => {console.log(err)},
            (msg) => {

                HelloWorld.addSingleAccount(newObjString, (err) => {console.log(err)}, (msg) => {console.log(msg)} );
            }
        );
       

    };

    deleteAccounts = (curCreds) => {
        const curObjString = JSON.stringify(curCreds);
        HelloWorld.deleteSingleAccount(curObjString, (err) => {console.log(err)}, (msg) => { console.log(msg)} );

    };

};
