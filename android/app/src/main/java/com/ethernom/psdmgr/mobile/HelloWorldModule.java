package com.ethernom.psdmgr.mobile;

import android.util.Log;

import com.ethernom.helloworldautofill.AutofillFlag;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.uimanager.IllegalViewOperationException;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class HelloWorldModule extends ReactContextBaseJavaModule {

    public HelloWorldModule(ReactApplicationContext reactContext) {
        super(reactContext); //required by React Native
    }

    @Override
    //getName is required to define the name of the module represented in JavaScript
    public String getName() {
        return "HelloWorld";
    }
    //getName is required to define the name of the module represented in JavaScript
    @ReactMethod
    public void updateAutofillFlag(String flag, Callback errCallback, Callback successCallback) throws JSONException {

        try {

            DatabaseHandler db = new DatabaseHandler(getReactApplicationContext());
            db.deleteAllAutofillFlag();

            db.addAutoFillFlag(new AutofillFlag(0,flag,"Null"));

            Log.d("HelloWorldModule","get account");

            Log.d("HelloWorldModule",db.allAutofillFlag().toString());
            successCallback.invoke(db.allAutofillFlag().toString());

        }catch (IllegalViewOperationException err) {
            errCallback.invoke(err.getMessage());
        }
    }
    @ReactMethod
    public void addAccount(String credentaisl, Callback errCallback, Callback successCallback) throws JSONException {
        JSONArray jsonArray = new JSONArray(credentaisl);
        Log.d("HelloWorldModule",credentaisl);

        try {

            DatabaseHandler db = new DatabaseHandler(getReactApplicationContext());
            db.deleteAllCredential();
            for(int i= 0; i< jsonArray.length(); i++){

                JSONObject object = jsonArray.getJSONObject(i);
                String key =  object.getString("key");
                String url =  object.getString("url");
                String username =  object.getString("username");
                String password =  object.getString("password");

                Log.d("HelloWorldModule",object.getString("key"));
                db.addCredential(new UserCredentials("0",key,username,password, url));

                Log.d("HelloWorldModule","get account");

            }

            Log.d("HelloWorldModule",db.getAllCredentials().toString());
            successCallback.invoke(db.getAllCredentials().toString());

        }catch (IllegalViewOperationException err) {
            errCallback.invoke(err.getMessage());
        }
    }

    @ReactMethod
    public void addSingleAccount(String credentail, Callback errCallback, Callback successCallback) throws JSONException {
        try {
            DatabaseHandler db = new DatabaseHandler(getReactApplicationContext());
            JSONObject object = new JSONObject(credentail);
            Log.d("addSingleAccount",credentail);

            String key =  object.getString("key");
            String url =  object.getString("url");
            String username =  object.getString("username");
            String password =  object.getString("password");

            Log.d("addSingleAccount",object.getString("key"));
            db.addCredential(new UserCredentials("0",key,username,password, url));

            Log.d("addSingleAccount",db.getAllCredentials().toString());
            successCallback.invoke(db.getAllCredentials().toString());

        }catch (IllegalViewOperationException err) {
            errCallback.invoke(err.getMessage());
        }
    }

    @ReactMethod
    public void deleteSingleAccount(String credentail, Callback errCallback, Callback successCallback) throws JSONException {
        try {
            DatabaseHandler db = new DatabaseHandler(getReactApplicationContext());
            JSONObject object = new JSONObject(credentail);
            Log.d("deleteSingleAccount",credentail);


            String key =  object.getString("key");
            String url =  object.getString("url");
            String username =  object.getString("username");
            String password =  object.getString("password");

            Log.d("deleteSingleAccount",object.getString("key"));
            db.deleteSingleAccount(new UserCredentials("0",key,username,password, url));

            Log.d("deleteSingleAccount",db.getAllCredentials().toString());
            successCallback.invoke(db.getAllCredentials().toString());

        }catch (IllegalViewOperationException err) {
            errCallback.invoke(err.getMessage());
        }
    }


}