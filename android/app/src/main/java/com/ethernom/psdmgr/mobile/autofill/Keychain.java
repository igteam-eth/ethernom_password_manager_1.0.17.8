package com.ethernom.psdmgr.mobile.autofill;

import java.util.Calendar;

import org.json.JSONException;
import org.json.JSONObject;

import android.app.Activity;
import android.util.Log;
import androidx.appcompat.app.AppCompatActivity;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.oblador.keychain.KeychainModule;
import com.oblador.keychain.SecurityLevel;

import javax.annotation.Nonnull;

public class Keychain extends AppCompatActivity {
    private KeychainModule mKeychainModule;
    private ReactApplicationContext mReactApplicationContext;

    private JSONObject registered_peripheral;
    private JSONObject key_pairs;
    private JSONObject session_pin;

    private Integer session_pin_len;
    private Integer session_timer;

    public Keychain(Activity thisActivity){
        mReactApplicationContext = new ReactApplicationContext(thisActivity);
        mKeychainModule = new KeychainModule(mReactApplicationContext);

        registered_peripheral();
        session_pin_len();
        session_timer();
        session_pin();
    }

    public Integer get_session_pin_len() {
        return session_pin_len;
    }
    public Integer get_session_timer() {
        return session_timer;
    }

    public JSONObject get_registered_device() { return registered_peripheral; }
    public JSONObject get_session_pin() {
        return session_pin;
    }

    public JSONObject get_key_pairs(String serial_num){
        mKeychainModule.getGenericPasswordForOptions(serial_num, new Promise() {
            @Override
            public void resolve(@javax.annotation.Nullable Object value) {
                if(value.equals(false)) {
                    key_pairs = null;
                }else{
                    try {
                        // get JSONObject from JSON file
                        JSONObject obj = new JSONObject(value.toString());
                        JSONObject mNativeMap = obj.getJSONObject("NativeMap");
                        key_pairs = new JSONObject( mNativeMap.getString("password"));

                    } catch (JSONException e) {
                        key_pairs = null;
                        //Log.i("TESTE", e.toString());
                        e.printStackTrace();
                    }
                }
            }

            @Override
            public void reject(String code, String message) {
                key_pairs = null;
            }

            @Override
            public void reject(String code, Throwable throwable) {
                key_pairs = null;
            }

            @Override
            public void reject(String code, String message, Throwable throwable) { key_pairs = null; }

            @Override
            public void reject(Throwable throwable) { key_pairs = null; }

            @Override
            public void reject(Throwable throwable, WritableMap userInfo) {
                key_pairs = null;
            }

            @Override
            public void reject(String code, @Nonnull WritableMap userInfo) {
                key_pairs = null;
            }

            @Override
            public void reject(String code, Throwable throwable, WritableMap userInfo) { key_pairs = null; }

            @Override
            public void reject(String code, String message, @Nonnull WritableMap userInfo) { key_pairs = null; }

            @Override
            public void reject(String code, String message, Throwable throwable, WritableMap userInfo) { key_pairs = null; }

            @Override
            public void reject(String message) { key_pairs = null; }
        });
        return key_pairs;
    };

    private void registered_peripheral(){
        mKeychainModule.getGenericPasswordForOptions("com.ethernom.password.manager.mobile.data.registered_peripheral", new Promise() {
            @Override
            public void resolve(@javax.annotation.Nullable Object value) {
                if(value.equals(false)) {
                    registered_peripheral = null;
                }else{
                     try {
                        // get JSONObject from JSON file
                        JSONObject obj = new JSONObject(value.toString());
                        JSONObject mNativeMap = obj.getJSONObject("NativeMap");
                        registered_peripheral = new JSONObject( mNativeMap.getString("password"));

                    } catch (JSONException e) {
                        registered_peripheral = null;
                        //Log.i("TESTE", e.toString());
                        e.printStackTrace();
                    }
                }
            }

            @Override
            public void reject(String code, String message) { registered_peripheral = null; }

            @Override
            public void reject(String code, Throwable throwable) { registered_peripheral = null; }

            @Override
            public void reject(String code, String message, Throwable throwable) { registered_peripheral = null; }

            @Override
            public void reject(Throwable throwable) { registered_peripheral = null; }

            @Override
            public void reject(Throwable throwable, WritableMap userInfo) { registered_peripheral = null; }

            @Override
            public void reject(String code, @Nonnull WritableMap userInfo) { registered_peripheral = null; }

            @Override
            public void reject(String code, Throwable throwable, WritableMap userInfo) { registered_peripheral = null; }

            @Override
            public void reject(String code, String message, @Nonnull WritableMap userInfo) { registered_peripheral = null; }

            @Override
            public void reject(String code, String message, Throwable throwable, WritableMap userInfo) { registered_peripheral = null; }

            @Override
            public void reject(String message) { registered_peripheral = null; }
        });
    };

    private void session_pin_len(){
        mKeychainModule.getGenericPasswordForOptions("com.ethernom.password.manager.mobile.pin.length", new Promise() {
            @Override
            public void resolve(@javax.annotation.Nullable Object value) {
                if(value.equals(false)) {
                    session_pin_len = 2;
                }else{
                    try {
                        // get JSONObject from JSON file
                        JSONObject obj = new JSONObject(value.toString());
                        JSONObject mNativeMap = obj.getJSONObject("NativeMap");
                        session_pin_len = mNativeMap.getInt("password");

                    } catch (JSONException e) {
                        session_pin_len = 2;
                        e.printStackTrace();
                    }
                }
            }

            @Override
            public void reject(String code, String message) { session_pin_len = 2; }

            @Override
            public void reject(String code, Throwable throwable) {session_pin_len = 2; }

            @Override
            public void reject(String code, String message, Throwable throwable) { session_pin_len = 2; }

            @Override
            public void reject(Throwable throwable) { session_pin_len = 2; }

            @Override
            public void reject(Throwable throwable, WritableMap userInfo) { session_pin_len = 2; }

            @Override
            public void reject(String code, @Nonnull WritableMap userInfo) { session_pin_len = 2; }

            @Override
            public void reject(String code, Throwable throwable, WritableMap userInfo) { session_pin_len = 2; }

            @Override
            public void reject(String code, String message, @Nonnull WritableMap userInfo) { session_pin_len = 2; }

            @Override
            public void reject(String code, String message, Throwable throwable, WritableMap userInfo) { session_pin_len = 2; }

            @Override
            public void reject(String message) { session_pin_len = 2; }
        });
    };

    private void session_timer(){
        mKeychainModule.getGenericPasswordForOptions("com.ethernom.password.manager.mobile.session.timer", new Promise() {
            @Override
            public void resolve(@javax.annotation.Nullable Object value) {
                if(value.equals(false)) {
                    session_timer = 5;
                }else{
                    try {
                        // get JSONObject from JSON file
                        JSONObject obj = new JSONObject(value.toString());
                        JSONObject mNativeMap = obj.getJSONObject("NativeMap");
                        session_timer = mNativeMap.getInt("password");

                    } catch (JSONException e) {
                        session_timer = 5;
                        e.printStackTrace();
                    }
                }
            }

            @Override
            public void reject(String code, String message) { session_timer = 5; }

            @Override
            public void reject(String code, Throwable throwable) { session_timer = 5; }

            @Override
            public void reject(String code, String message, Throwable throwable) { session_timer = 5; }

            @Override
            public void reject(Throwable throwable) { session_timer = 5; }

            @Override
            public void reject(Throwable throwable, WritableMap userInfo) { session_timer = 5; }

            @Override
            public void reject(String code, @Nonnull WritableMap userInfo) { session_timer = 5; }

            @Override
            public void reject(String code, Throwable throwable, WritableMap userInfo) { session_timer = 5; }

            @Override
            public void reject(String code, String message, @Nonnull WritableMap userInfo) { session_timer = 5; }

            @Override
            public void reject(String code, String message, Throwable throwable, WritableMap userInfo) { session_timer = 5; }

            @Override
            public void reject(String message) { session_timer = 5; }
        });
    };

    public void update_session_pin(String PIN, String id){
        JSONObject temp = new JSONObject();
        Calendar calendar = Calendar.getInstance();
        Long mSeconds = calendar.getTimeInMillis();

        try {
            temp.put("id", id);
            temp.put("session", PIN);
            temp.put("time",  mSeconds.toString());

            Log.i("TEST_JSONOBJ", temp.toString());

            mKeychainModule.setGenericPasswordForOptions("com.ethernom.password.manager.mobile.session.pid", "data", temp.toString(), SecurityLevel.ANY.name(), new Promise() {
                @Override
                public void resolve(@javax.annotation.Nullable Object value) {
                    Log.i("TEST_JSONOBJ", value.toString());
                    Log.i("TEST_JSONOBJ","SUCCESSFULLY UPDATED");
                }

                @Override
                public void reject(String code, String message) { }

                @Override
                public void reject(String code, Throwable throwable) { }

                @Override
                public void reject(String code, String message, Throwable throwable) { }

                @Override
                public void reject(Throwable throwable) { }

                @Override
                public void reject(Throwable throwable, WritableMap userInfo) { }

                @Override
                public void reject(String code, @Nonnull WritableMap userInfo) { }

                @Override
                public void reject(String code, Throwable throwable, WritableMap userInfo) { }

                @Override
                public void reject(String code, String message, @Nonnull WritableMap userInfo) { }

                @Override
                public void reject(String code, String message, Throwable throwable, WritableMap userInfo) { }

                @Override
                public void reject(String message) {  Log.i("TEST_JSONOBJ2",message);  }
            });

        } catch (JSONException e) {
            Log.i("TEST_JSONOBJ", e.toString());
        }
    }

    private void session_pin(){
        mKeychainModule.getGenericPasswordForOptions("com.ethernom.password.manager.mobile.session.pid", new Promise() {
            @Override
            public void resolve(@javax.annotation.Nullable Object value) {
                if(value.equals(false)) {
                    session_pin = null;
                }else{
                    try {
                        // get JSONObject from JSON file
                        JSONObject obj = new JSONObject(value.toString());
                        JSONObject mNativeMap = obj.getJSONObject("NativeMap");
                        session_pin = new JSONObject( mNativeMap.getString("password"));
                        //Log.i("TEST_JSONOBJ", session_pin.toString());

                    } catch (JSONException e) {
                        session_pin = null;
                        //Log.i("TEST_JSONOBJ", session_pin.toString());
                        e.printStackTrace();
                    }
                }
            }

            @Override
            public void reject(String code, String message) { session_pin = null; }

            @Override
            public void reject(String code, Throwable throwable) { session_pin = null; }

            @Override
            public void reject(String code, String message, Throwable throwable) { session_pin = null; }

            @Override
            public void reject(Throwable throwable) { session_pin = null; }

            @Override
            public void reject(Throwable throwable, WritableMap userInfo) { session_pin = null; }

            @Override
            public void reject(String code, @Nonnull WritableMap userInfo) { session_pin = null; }

            @Override
            public void reject(String code, Throwable throwable, WritableMap userInfo) { session_pin = null; }

            @Override
            public void reject(String code, String message, @Nonnull WritableMap userInfo) { session_pin = null; }

            @Override
            public void reject(String code, String message, Throwable throwable, WritableMap userInfo) { session_pin = null; }

            @Override
            public void reject(String message) { session_pin = null; }
        });
    };
}
