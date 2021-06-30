/*
 * Copyright (C) 2017 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.ethernom.psdmgr.mobile.autofill;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.PendingIntent;
import android.app.assist.AssistStructure;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.service.autofill.Dataset;
import android.service.autofill.FillResponse;
import android.service.autofill.SaveInfo;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.ArrayMap;
import android.util.Log;
import android.view.MenuItem;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.widget.RemoteViews;
import android.widget.TextView;
import android.widget.Toast;

import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

import android.view.autofill.AutofillId;
import android.view.autofill.AutofillValue;

import org.json.JSONException;
import org.json.JSONObject;

import androidx.annotation.LongDef;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SearchView;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.chaos.view.PinView;
import com.google.gson.GsonBuilder;
import com.nabinbhandari.android.permissions.PermissionHandler;
import com.nabinbhandari.android.permissions.Permissions;

import com.ethernom.psdmgr.mobile.autofill.adapter.AccountAdapter;
import com.ethernom.psdmgr.mobile.autofill.adapter.EthBLEClientCallBack;
import com.ethernom.psdmgr.mobile.autofill.adapter.OnHomePressedListener;
import com.ethernom.psdmgr.mobile.autofill.adapter.RecyclerViewClickListener;
import com.ethernom.psdmgr.mobile.autofill.data.ClientViewMetadata;
import com.ethernom.psdmgr.mobile.autofill.data.ClientViewMetadataBuilder;
import com.ethernom.psdmgr.mobile.autofill.data.DataCallback;
import com.ethernom.psdmgr.mobile.autofill.data.adapter.DatasetAdapter;
import com.ethernom.psdmgr.mobile.autofill.data.adapter.ResponseAdapter;
import com.ethernom.psdmgr.mobile.autofill.data.source.DefaultFieldTypesSource;
import com.ethernom.psdmgr.mobile.autofill.data.source.local.DefaultFieldTypesLocalJsonSource;
import com.ethernom.psdmgr.mobile.autofill.data.source.local.LocalAutofillDataSource;
import com.ethernom.psdmgr.mobile.autofill.data.source.local.dao.AutofillDao;
import com.ethernom.psdmgr.mobile.autofill.data.source.local.db.AutofillDatabase;
import com.ethernom.psdmgr.mobile.autofill.model.FieldTypeWithHeuristics;
import com.ethernom.psdmgr.mobile.autofill.settings.MyPreferences;
import com.ethernom.psdmgr.mobile.autofill.util.AppExecutors;
import com.ethernom.psdmgr.mobile.autofill.util.Constant;
import com.ethernom.psdmgr.mobile.autofill.util.HomeWatcher;
import com.ethernom.psdmgr.mobile.autofill.util.UtilLibSessionMgr;
import com.ethernom.psdmgr.mobile.R;
import java.util.ArrayList;
import java.util.Objects;

import static android.view.autofill.AutofillManager.EXTRA_ASSIST_STRUCTURE;
import static android.view.autofill.AutofillManager.EXTRA_AUTHENTICATION_RESULT;

import static com.ethernom.psdmgr.mobile.autofill.util.Util.EXTRA_DATASET_NAME;
import static com.ethernom.psdmgr.mobile.autofill.util.Util.EXTRA_FOR_RESPONSE;
import static com.ethernom.psdmgr.mobile.autofill.util.Util.logw;

import java.security.*;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
/**
 * This Activity controls the UI for logging in to the Autofill service.
 * It is launched when an Autofill Response or specific Dataset within the Response requires
 * authentication to access. It bundles the result in an Intent.
 */

@RequiresApi(api = Build.VERSION_CODES.O)

public class AuthActivity extends AppCompatActivity implements EthBLEClientCallBack, RecyclerViewClickListener {

    private static final String TAG = "Ethernom";
    // Unique id for dataset intents.
    private static int sDatasetPendingIntentId = 0;
    private static final int REQUEST_ENABLE_BT = 1;

    private LocalAutofillDataSource mLocalAutofillDataSource;
    private DatasetAdapter mDatasetAdapter;
    private ResponseAdapter mResponseAdapter;
    private ClientViewMetadata mClientViewMetadata;
    private String mPackageName;
    private Intent mReplyIntent;
    private MyPreferences mPreferences;

    private Toolbar mAuthToolbar;
    private RecyclerView rcvAccoutList;
    private RelativeLayout relativeLayout;
    private SearchView editTextSearch;
    private LinearLayout authLayout;
    private TextView tvDeviceNotfound, tvPeripheralName, tvPeripheralId;
    private ArrayList<String> accoutnList;
    private TextWatcher textWatcher;
    private TextView tvScanDevice;
    private ProgressBar progressBar;

    private TextView txtErrPin;
    private Button btnSubmit;
    private PinView pinView;
    private LinearLayout lnPin;

    int wrongPIN = 0;

    //private Boolean appState;
    //BLEListeners listeners = new BLEListeners();
    private ArrayList<EtherEntry> etherDataList;

    Context mContext;
    Activity thisActivity;
    //ListView listView;
    //private EthBLEClient BLEClient;
    //Activity thisActivity;
    //ListView listView;

    BluetoothManager btManager;
    BluetoothAdapter btAdapter;

    private UtilLibSessionMgr mSession;
    private String phoneName, phoneId;

    private Keychain mKeychain;
    private String deviceId;
    private String deviceName;
    private String deviceSN;
    private String new_Session_PIN;
    private Integer PIN_len;

    private LinearLayoutManager layoutManager;
    private AccountAdapter accountAdapter;

    EtherSecureSession secureSession = new EtherSecureSession();
    etherSecureSessionListener listeners = new SecureSessionListeners();
    private boolean secureSessionInit = false;

    public class EtherEntry {
        public String username;
        public String password;
        public String URL;
    }

    /*
    private String PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL = "com.ethernom.password.manager.mobile.data.registered_peripheral";
    private String PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL_NAME = "com.ethernom.password.manager.mobile.data.registered_peripheral_name";
    */
    public static IntentSender getAuthIntentSenderForResponse(Context context) {
        final Intent intent = new Intent(context, AuthActivity.class);
        return PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_CANCEL_CURRENT).getIntentSender();
    }

    public static IntentSender getAuthIntentSenderForDataset(Context originContext,
                                                             String datasetName) {
        Intent intent = new Intent(originContext, AuthActivity.class);
        intent.putExtra(EXTRA_DATASET_NAME, datasetName);
        intent.putExtra(EXTRA_FOR_RESPONSE, false);
        return PendingIntent.getActivity(originContext, ++sDatasetPendingIntentId, intent,
                PendingIntent.FLAG_CANCEL_CURRENT).getIntentSender();
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        thisActivity = this;
        mContext = thisActivity.getApplicationContext();
        mSession = new UtilLibSessionMgr(thisActivity);

        Security.removeProvider("BC");
        Security.insertProviderAt(new BouncyCastleProvider(), 1);

        mKeychain = new Keychain(thisActivity);
        PIN_len = mKeychain.get_session_pin_len();

        JSONObject registered_peripheral = mKeychain.get_registered_device();
        if(registered_peripheral != null){
            try {
                deviceId = registered_peripheral.getString("id");
                deviceName = registered_peripheral.getString("name");
                deviceSN = registered_peripheral.getString("sn");
            } catch (JSONException e) {
                Log.i("TEST", e.toString());
                deviceId = "";
                deviceName = "";
                deviceSN = "";
            }
        }else{
            deviceId = "";
            deviceName = "";
            deviceSN = "";
        }

        phoneName = getPhoneName();
        phoneId = getPhoneId();

        btManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
        btAdapter = btManager.getAdapter();

        if (btAdapter == null) {
            Toast.makeText(this, "Bluetooth not supported", Toast.LENGTH_LONG).show();
            Log.e("BleClientActivity: ", "Bluetooth not supported");
            finish();
        } else if (!btAdapter.isEnabled()) {
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
            finish();
        }

        Permissions.check(this, Manifest.permission.ACCESS_FINE_LOCATION, "need permissions", new PermissionHandler() {
            @Override
            public void onGranted() {
                Log.i("ethernom", "onGranted");
                etherDataList = new ArrayList<>();
                setContentView(R.layout.multidataset_service_auth_activity);

                mAuthToolbar = findViewById(R.id.auth_toolbar);
                rcvAccoutList = findViewById(R.id.rcv_account);
                relativeLayout = findViewById(R.id.rl_progressbar);
                editTextSearch = findViewById(R.id.ed_search);
                authLayout = findViewById(R.id.authLayout);
                tvDeviceNotfound = findViewById(R.id.tv_not_found);
                tvPeripheralName = findViewById(R.id.tv_peripheral_name);
                //tvPeripheralId = findViewById(R.id.tv_peripheral_id);
                tvScanDevice = findViewById(R.id.tv_scan_device);
                progressBar = findViewById(R.id.progressBar);

                initPINInputProps();

                editTextSearch.onActionViewExpanded();
                if (Objects.equals(mSession.getPackage(), "chrome.com") || Objects.equals(mSession.getPackage(), "firefox.com") || mSession.getPackage().equals("edge.com")) {
                    editTextSearch.setQuery("", false);
                } else {
                    editTextSearch.setQuery(mSession.getPackage(), false);
                }

                hideKeyboard(thisActivity);
                editTextSearch.clearFocus();
                editTextSearch.setFocusable(false);
                editTextSearch.setOnQueryTextListener(searchView());

                tvScanDevice.setText(R.string.scanning_device);
                setSupportActionBar(mAuthToolbar);
                getSupportActionBar().setDisplayHomeAsUpEnabled(true);
                getSupportActionBar().setDisplayShowHomeEnabled(true);
                initRecyclerView();
                //tvPeripheralId.setText("ID: " + deviceSN);

                SharedPreferences sharedPreferences =
                        getSharedPreferences(LocalAutofillDataSource.SHARED_PREF_KEY, Context.MODE_PRIVATE);
                DefaultFieldTypesSource defaultFieldTypesSource =
                        DefaultFieldTypesLocalJsonSource.getInstance(getResources(),
                                new GsonBuilder().create());
                AutofillDao autofillDao = AutofillDatabase.getInstance(thisActivity,
                        defaultFieldTypesSource, new AppExecutors()).autofillDao();
                mLocalAutofillDataSource = LocalAutofillDataSource.getInstance(sharedPreferences,
                        autofillDao, new AppExecutors());
                mPackageName = getPackageName();
                mPreferences = MyPreferences.getInstance(thisActivity);

                etherDataList.clear();
                if (deviceId == "") {
                    progressBar.setVisibility(View.GONE);
                    authLayout.setVisibility(View.VISIBLE);
                    //tvScanDevice.setText(R.string.device_not_register);
                    //tvPeripheralId.setVisibility(View.GONE);
                    tvScanDevice.setText("Before using the AutoFill feature, ");
                    tvPeripheralName.setText("please connect your device to Password Manager.");
                    secureSessionInit = false;
                } else {
                    if (btAdapter.isEnabled()) {
                        //BLEClient.initEthBLE(thisActivity, listeners, listeners, listeners, deviceId, true);
                        //Constant.ethBLEClient = BLEClient;
                        tvPeripheralName.setText("Name: " + deviceName);
                        secureSession.init(thisActivity, mContext, deviceId, deviceName, deviceSN, listeners);
                        secureSessionInit = true;
                        Constant.PIN_NOT_MATCH = false;
                    }
                }
            }

            @Override
            public void onDenied(Context context, ArrayList<String> deniedPermissions) {
                super.onDenied(context, deniedPermissions);
                finish();
            }
        });
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (btAdapter == null) {
            Toast.makeText(this, "Bluetooth Not Supported", Toast.LENGTH_LONG).show();
            Log.e("BleClientActivity: ", "Bluetooth not supported");
            finish();
        } else if (!btAdapter.isEnabled()) {
            // Make sure bluetooth is enabled.
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        mHomeWatcher.stopWatch();
        if(secureSessionInit == true) secureSession._bleClient.cancelRequest();
        finish();
    }

    @Override
    protected void onResume() {
        super.onResume();
        handleHomePress();
    }

    /**
     * Handle Listening click home press
     **/
    HomeWatcher mHomeWatcher = new HomeWatcher(this);
    private void handleHomePress() {
        mHomeWatcher.setOnHomePressedListener(new OnHomePressedListener() {
            @Override
            public void onHomePressed() {
                // do something here...
                try {
                    onStop();
                    //onDestroy();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            @Override
            public void onHomeLongPressed() {
                Log.i("xxx", "onHomeLongPressed");
            }
        });
        mHomeWatcher.startWatch();
    }

    /**
     * init property input pin and submit pin
     **/
    private void initPINInputProps() {
        txtErrPin = findViewById(R.id.txtErrPin);
        btnSubmit = findViewById(R.id.btnSubmit);
        lnPin = findViewById(R.id.lnPin);
        pinView = findViewById(R.id.pinView);
        txtErrPin.setVisibility(View.GONE);
        lnPin.setVisibility(View.GONE);
        pinView.addTextChangedListener(textWatcher());
        pinView.setFocusable(true);
        pinView.setItemCount(PIN_len);

        lnPin.setOnClickListener(v -> {
            hideKeyboard(this);
        });

        btnSubmit.setVisibility(View.GONE);
        btnSubmit.setOnClickListener(v -> {
            if (Objects.requireNonNull(pinView.getText()).length() == 6) {
                onPINSubmit(pinView.getText().toString());
            }
        });

        Constant.PIN_NOT_MATCH = false;
    }

    //WHEN USER SUBMIT PIN
    public void onPINSubmit(String pin) {
        if(PIN_len == new_Session_PIN.length()) {
            if (pin.equals(new_Session_PIN)) {
                onReplyPinNotMatch(true);
                secureSession.requestPwdMgrInit(new_Session_PIN);

            } else {
                onReplyPinNotMatch(false);
            }

        }else{
            String temp = new_Session_PIN.substring(new_Session_PIN.length() - PIN_len);
            if (pin.equals(temp)) {
                onReplyPinNotMatch(true);
                secureSession.requestPwdMgrInit(new_Session_PIN);
                hideKeyboard();
                pinView.clearFocus();

            } else {
                onReplyPinNotMatch(false);
            }
        }
        //BLEClient.WriteDataToCard(EthBLEClient.H2C_RPLY_PIN_ENTRY, data);
    }

    private TextWatcher textWatcher() {
        return new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (s.length() == PIN_len) onPINSubmit(pinView.getText().toString());
                //else  onPINSubmit(false);
            }

            @Override
            public void afterTextChanged(Editable s) {

            }
        };
    }

    @Override
    public void onRequestInputPin() {
        runOnUiThread(() -> {
            //Constant.PIN_NOT_MATCH = false;
            lnPin.setVisibility(View.VISIBLE);
            //pinView
            pinView.requestFocus();
             showKeyboard(thisActivity);
        });
    }

    public static void showKeyboard(Activity activity) {
        View view = activity.getCurrentFocus();
        if (view != null) {
            InputMethodManager imm = (InputMethodManager) activity.getSystemService(Context.INPUT_METHOD_SERVICE);
            imm.toggleSoftInput(InputMethodManager.SHOW_FORCED, 0);
        }
    }

    public static void hideKeyboard(Activity activity) {
        View view = activity.getCurrentFocus();
        if (view != null) {
            InputMethodManager imm = (InputMethodManager) activity.getSystemService(Context.INPUT_METHOD_SERVICE);
            imm.toggleSoftInput(InputMethodManager.RESULT_HIDDEN, 0);
        }
    }

    public void hideKeyboard(){
        View view = getCurrentFocus();

        InputMethodManager imm = (InputMethodManager) getSystemService(Activity.INPUT_METHOD_SERVICE);
        if(view == null) {
            imm.toggleSoftInput(InputMethodManager.HIDE_IMPLICIT_ONLY, 0);
            return;
        }
        imm.hideSoftInputFromWindow(view.getWindowToken(), InputMethodManager.HIDE_NOT_ALWAYS);
    }

    @Override
    public void onReplyPinNotMatch(Boolean isMatch) {
        runOnUiThread(() -> {
            if (isMatch) {
                relativeLayout.setVisibility(View.VISIBLE);

                tvScanDevice.setText(R.string.retrieving_data);
                lnPin.setVisibility(View.GONE);
                txtErrPin.setVisibility(View.GONE);
                hideKeyboard(thisActivity);
            } else {

                wrongPIN += 1;

                if(wrongPIN == 3){
                    secureSession._bleClient.cancelRequest();
                    finish();
                }
                relativeLayout.setVisibility(View.GONE);

                tvScanDevice.setText(R.string.connecting_to_device);
                lnPin.setVisibility(View.VISIBLE);
                txtErrPin.setVisibility(View.VISIBLE);
                btnSubmit.setBackground(getDrawable(R.drawable.bg_btn_disable));
                pinView.setText("");
            }
        });
    }

    static int ETH_BLE_HEADER_SIZE = 8;
    static int ETH_BLE_PAYLOAD_HEAD = ETH_BLE_HEADER_SIZE + 1;
    static int DELIMITER = 31;

    final byte EM_C2H 	= (byte) 0x80;
    final byte EM_REPLY = (byte) 0x20;

    final byte NAK 	= (byte) 0x00;
    final byte AWK 	= (byte) 0x01;
    final byte OTHER = (byte) 0x02;

    final byte H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY = (byte) 0x03;
    final byte H2C_RQST_GET_ACCOUNT_PASS = (byte) 0x05;

    final byte C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY = (byte) (H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY|EM_C2H|EM_REPLY);
    final byte C2H_RPLY_GET_ACCOUNT_PASS 			 = (byte) (H2C_RQST_GET_ACCOUNT_PASS 		|EM_C2H|EM_REPLY);

    public class SecureSessionListeners implements etherSecureSessionListener{
        public void onCardConnected(){
            tvScanDevice.setText("Connected to device...");
           // secureSession.DoStartCardAuthentication(EthernomConstKt.getPSD_MGR_ID());
        };

        public void onCardDisconnected(){
            Log.i("TEST_AuthActivity", "Disconnected");
            finish();
        };

        public void onData(byte[] buffer){
            if (buffer[ETH_BLE_HEADER_SIZE] == C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY) {
                if (buffer[ETH_BLE_HEADER_SIZE + 1] == AWK) {
                    ArrayList<String> temp = decomposeBLEPacket(C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY, buffer);
                    OnAccountFetchedEvent(temp);

                    byte[] array = new byte[2];
                    if(buffer[ETH_BLE_HEADER_SIZE + 3] != 31){
                        array[0] = buffer[ETH_BLE_HEADER_SIZE + 2];
                        array[1] = buffer[ETH_BLE_HEADER_SIZE + 3];
                    }else{
                        array[0] = buffer[ETH_BLE_HEADER_SIZE + 2];
                        array[1] = 0;
                    }
                    getNextAccount(array);

                }else if (buffer[ETH_BLE_HEADER_SIZE + 1] == OTHER) {
                    OnAccountFetchedComplete();
                }

            }else if (buffer[ETH_BLE_HEADER_SIZE] == C2H_RPLY_GET_ACCOUNT_PASS) {
                if (buffer[ETH_BLE_HEADER_SIZE + 1] == AWK) {
                    ArrayList<String> temp = decomposeBLEPacket(C2H_RPLY_GET_ACCOUNT_PASS, buffer);
                    EtherEntry a = new EtherEntry();
                    a.URL = temp.get(0);
                    a.username = temp.get(1);
                    a.password = temp.get(2);
                    fetchItemDataSet(a);

                }else{
                    Log.i("TEST_C2H_RPLY_GET_ACCOUNT_PASS4", "FAILS");
                }
            }
        };

        public void onAuthenticated(int code){
            if(code == 0){
               // secureSession.RequestAppLaunch(phoneName, EthernomConstKt.getPSD_MGR_ID());
            }else{
                secureSession._bleClient.cancelRequest();
            }
        };

        public void onDeviceNotFound(){

            AlertDialog.Builder builder = new AlertDialog.Builder(thisActivity);
            builder.setTitle("Error")
                    .setMessage("Make sure your device is powered on and authenticated. Please try again.")
                    .setCancelable(false)
                    .setPositiveButton("Okay", (dialog, which) -> {
                        secureSession._bleClient.cancelRequest();
                        finish();
                        dialog.dismiss();
                    });
            //Creating dialog box
            AlertDialog dialog  = builder.create();
            dialog.show();
        }

        public void onAppLaunched(int code){
            if(code == 0){
                secureSession.requestSessionPIN();
            }else{
                secureSession._bleClient.cancelRequest();
            }
        };

        public void onPINRequest(String PIN, int code){
            if(code == 1){
                //relativeLayout.setVisibility(View.GONE);

                new_Session_PIN = PIN;
                onRequestInputPin();

            }else if(code == 0){
                secureSession.requestPwdMgrInit(PIN);

            }else{
                secureSession._bleClient.cancelRequest();
            }
        }

        public void onSecureAppSessionEstablished(int code){
            if(code == 0){
                byte[] array = new byte[2];
                array[0] = 0;
                array[1] = 0;

                getNextAccount(array);
            }else{
                secureSession._bleClient.cancelRequest();
            }
        };
    }

    @Override
    public void onClick(int position, EtherEntry etherEntry) {
        String[] data = {etherEntry.URL, etherEntry.username};
        getAccountPassword(data);
    }

    private void getNextAccount(byte[] index){
        secureSession.WriteDataToCardEncrypted(H2C_RQST_GET_NEXT_ACCOUNT_FOR_DISPLAY, index);
    }

    private void getAccountPassword(String[] data) {
        secureSession.WriteDataToCardEncrypted(H2C_RQST_GET_ACCOUNT_PASS, data);
    }

    private void OnAccountFetchedEvent(ArrayList<String> AccountData) {
        tvScanDevice.setText("Retrieving credentials...");

        for (int i = 0; i < AccountData.size(); i++) {
            String s = AccountData.get(i);
        }

        EtherEntry etherentry = new EtherEntry();
        etherentry.URL = AccountData.get(0);
        etherentry.username = AccountData.get(1);
        //etherentry.password = AccountData.get(2);

        boolean add = true;
        for (int i = 0; i != etherDataList.size(); i++) {
            EtherEntry e = etherDataList.get(i);
            if (e.username.compareTo(etherentry.username) == 0 && e.username.compareTo(etherentry.username) == 0 && e.URL.compareTo(etherentry.URL) == 0) {
                add = false;
                break;
            }
        }
        if (add)
            etherDataList.add(etherentry);
    }

    private void OnAccountFetchedComplete() {
        //Log.i("TEST_OnAccountFetchedComplete", editTextSearch.getQuery().toString());

        Intent intent = getIntent();
        boolean forResponse = intent.getBooleanExtra(EXTRA_FOR_RESPONSE, true);
        AssistStructure structure = intent.getParcelableExtra(EXTRA_ASSIST_STRUCTURE);
        ClientParser clientParser = new ClientParser(structure);
        //mReplyIntent = new Intent();
        mLocalAutofillDataSource.getFieldTypeByAutofillHints(new DataCallback<HashMap<String, FieldTypeWithHeuristics>>() {
            @Override
            public void onLoaded(HashMap<String, FieldTypeWithHeuristics> fieldTypesByAutofillHint) {
                ClientViewMetadataBuilder builder = new ClientViewMetadataBuilder(clientParser,
                        fieldTypesByAutofillHint);
                mClientViewMetadata = builder.buildClientViewMetadata();
                mDatasetAdapter = new DatasetAdapter(clientParser);
                mResponseAdapter = new ResponseAdapter(AuthActivity.this,
                        mClientViewMetadata, mPackageName, mDatasetAdapter);
                editTextSearch.setVisibility(View.VISIBLE);
                relativeLayout.setVisibility(View.GONE);

                if(!editTextSearch.getQuery().equals("")) {
                    accountAdapter.getFilter().filter(editTextSearch.getQuery());
                }
                accountAdapter.notifyDataSetChanged();

                //fetchAllDatasetsAndSetIntent(fieldTypesByAutofillHint, structure);
            }

            @Override
            public void onDataNotAvailable(String msg, Object... params) {

            }
        });
    }

    private void fetchItemDataSet(EtherEntry mEtherEntry) {
        Intent intent = getIntent();
        AssistStructure structure = intent.getParcelableExtra(EXTRA_ASSIST_STRUCTURE);
        mReplyIntent = new Intent();
        Dataset.Builder dataset = new Dataset.Builder();

        Map<String, AutofillId> fields = getAutofillableFields(structure);

        FillResponse.Builder response = new FillResponse.Builder();
        String packageName = getApplicationContext().getPackageName();
        if (!fields.isEmpty()) {
            for (Map.Entry<String, AutofillId> field : fields.entrySet()) {
                String hint = field.getKey();
                AutofillId id = field.getValue();

                RemoteViews presentation = newDatasetPresentation(packageName, mEtherEntry.URL);
                String val = "";
                if (hint.contains("password")) val = mEtherEntry.password;
                else if (hint.contains("username") || (hint.contains("login") && hint.contains("id")))
                    val = mEtherEntry.username;
                else if (hint.contains("email")) val = mEtherEntry.username;
                else if (hint.contains("name")) val = mEtherEntry.username;
                else if (hint.contains("phone")) val = mEtherEntry.username;
                dataset.setValue(id, AutofillValue.forText(val), presentation);
            }
        }

        /*
        IntentSender sender = AuthActivity.getAuthIntentSenderForResponse(thisService);
        RemoteViews remoteViews = RemoteViewsHelper.viewsWithAuth(getPackageName(), getString(R.string.autofill_sign_in_prompt));
        FillResponse response = mResponseAdapter.buildManualResponse(sender, remoteViews);
        */

        response.addDataset(dataset.build());
        Collection<AutofillId> ids = fields.values();
        AutofillId[] requiredIds = new AutofillId[ids.size()];
        ids.toArray(requiredIds);
        response.setSaveInfo(new SaveInfo.Builder(SaveInfo.SAVE_DATA_TYPE_GENERIC, requiredIds).build());
        //setResponseIntent(response.build());
        mReplyIntent.putExtra(EXTRA_AUTHENTICATION_RESULT, response.build());

        setResult(RESULT_OK, mReplyIntent);
        finish();
    }

    /* -------------------------------------------------------- */
    /* ---------------- OTHER FUNCTION ------------------------ */
    /* -------------------------------------------------------- */
    private ArrayList<String> decomposeBLEPacket(byte cmd, byte[] data) {
        ArrayList<String> items = new ArrayList<>();
        ArrayList<Character> temp = new ArrayList<>();

        int startingPoint = ETH_BLE_PAYLOAD_HEAD + 1;
        if (cmd == C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY) {
            startingPoint += 2;
        }

        int i = 0;
        ArrayList<Byte> bytes = new ArrayList<>();;
        for (int j = 0; j != data.length; j++) {
            if (i >= startingPoint) {
                byte uc = data[j];
                if (uc == DELIMITER || uc == (byte) 0x00) {
                    byte[] str_byte = new byte[bytes.size()];
                    for(int k = 0; k< bytes.size(); k++) str_byte[k] = bytes.get(k);
                    String str = new String(str_byte, StandardCharsets.UTF_8);
                    items.add(str);
                    bytes.clear();
                    //String s = getStringRepresentation(temp);
                    //temp.clear();
                } else {
                    bytes.add(uc);
                    //temp.add((char) uc);
                }
            }
            i += 1;
        }

        /*
        int i = 0;
        for (int j = 0; j != data.length; j++) {
            if (i >= startingPoint) {
                byte uc = data[j];
                if (uc == DELIMITER || uc == (byte) 0x00) {
                    String s = getStringRepresentation(temp);

                    items.add(s);
                    temp.clear();
                } else {
                    temp.add((char) uc);
                }
            }
            i += 1;
        }
        */
        return items;
    }

    private String getPhoneName() {
        return BluetoothAdapter.getDefaultAdapter().getName();
    }

    @SuppressLint("HardwareIds")
    private String getPhoneId() {
        return Settings.Secure.getString(getContentResolver(),
                Settings.Secure.ANDROID_ID);
    }

    private SearchView.OnQueryTextListener searchView() {
        return new SearchView.OnQueryTextListener() {
            @Override
            public boolean onQueryTextSubmit(String query) {
                accountAdapter.getFilter().filter(query);
                return false;
            }

            @Override
            public boolean onQueryTextChange(String newText) {
                accountAdapter.getFilter().filter(newText);
                return false;
            }
        };
    }

    private void initRecyclerView() {
        layoutManager = new LinearLayoutManager(this);
        accountAdapter = new AccountAdapter(this, etherDataList);
        rcvAccoutList.setLayoutManager(layoutManager);
        rcvAccoutList.setAdapter(accountAdapter);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // handle arrow click here
        if (item.getItemId() == android.R.id.home) {
            onFailure();
            AuthActivity.this.finish();
            finish();// close this activity and return to preview activity (if there is any)
        }

        if (item.getItemId() == R.id.nav_refresh_device) {
            tvDeviceNotfound.setVisibility(View.GONE);
            authLayout.setVisibility(View.VISIBLE);
            etherDataList.clear();
            if (deviceId == "") {
                tvDeviceNotfound.setVisibility(View.VISIBLE);
                authLayout.setVisibility(View.GONE);
                tvDeviceNotfound.setText(R.string.device_not_register);
            } else {
                editTextSearch.setVisibility(View.GONE);
                relativeLayout.setVisibility(View.VISIBLE);
                etherDataList.clear();
                accountAdapter.notifyDataSetChanged();
                //BLEClient.initEthBLE(thisActivity, listeners, listeners, listeners, deviceId, true);
            }

        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public void finish() {
        /*
        if (mReplyIntent != null) {
            Log.d("TEST", mReplyIntent.toString());
            setResult(RESULT_OK, mReplyIntent);
        } else {
            Log.d("TEST", "EMPTY");
            setResult(RESULT_CANCELED);
        }
        */
        super.finish();
    }

    private void onFailure() {
        logw("Failed auth.");
        //mReplyIntent = null;
    }

    @NonNull
    static RemoteViews newDatasetPresentation(@NonNull String packageName, @NonNull CharSequence text) {
        RemoteViews presentation = new RemoteViews(packageName, R.layout.multidataset_service_list_item);
        presentation.setTextViewText(R.id.text, text);
        presentation.setImageViewResource(R.id.icon, R.mipmap.ethernomlogo);
        return presentation;
    }

    @NonNull
    static Map<String, AutofillId> getAutofillableFields(@NonNull AssistStructure structure) {
        Map<String, AutofillId> fields = new ArrayMap<>();
        int nodes = structure.getWindowNodeCount();
        Log.d("ethernomA", "node : " + nodes);
        for (int i = 0; i < nodes; i++) {
            AssistStructure.ViewNode node = structure.getWindowNodeAt(i).getRootViewNode();
            addAutofillableFields(fields, node);
            //identifyEmailFields(node);
        }

        return fields;
    }


    public static void identifyEmailFields(
             AssistStructure.ViewNode node
    ) {
        Log.d(TAG, "node.className: "+node.getClassName());
        Log.d(TAG, "node.className: " +node.getChildCount());
        // More code goes here
        if(node.getClassName() == null) {
            return;
        }

        if (node.getClassName().contains("EditText")) {
            Log.d(TAG, "identifyEmailFields");
            String viewId = node.getHint();
            Log.d(TAG, "viewId"+ viewId);

            if (viewId != null && (viewId.toUpperCase().contains("EMAIL") || viewId.toUpperCase().contains("USERNAME") || viewId.toUpperCase().contains("PASSWORD"))) {
                Log.d(TAG, "node: "+node);
                return;
            }
        }


        int childrenSize = node.getChildCount();
        for (int i = 0; i < childrenSize; i++) {
            identifyEmailFields(node.getChildAt(i));
            Log.d("ethernomA", "-------------------------------count : "+ i +"------------------------------------");
        }
    }

    private static void addAutofillableFields(@NonNull Map<String, AutofillId> fields, @NonNull AssistStructure.ViewNode node) {
        String hint = getHint(node);
        if (hint != null) {
            AutofillId id = node.getAutofillId();
            Log.d("ethernomAA", "id : " + id);
            if (!fields.containsKey(hint)) {
                fields.put(hint, id);
            }
        }

        int childrenSize = node.getChildCount();
        for (int i = 0; i < childrenSize; i++) {
            addAutofillableFields(fields, node.getChildAt(i));
            Log.d("ethernomA", "-------------------------------count : "+ i +"------------------------------------");
        }
    }

    @Nullable
    protected static String getHint(@NonNull AssistStructure.ViewNode node) {
        // First try the explicit autofill hints...
        String usernsmeA = "", passwordA = "";
        if(node.getClassName().contains("EditText")){
            Log.d("ethernomA", "passwordA : ");
        }

        String[] hints = node.getAutofillHints();
        Log.d("ethernomA", "hint : " + hints);
        if (hints != null) {
            // We're simple, we only care about the first hint
            return hints[0].toLowerCase();
        }

        // Then try some rudimentary heuristics based on other node properties

        String viewHint = node.getHint();
        Log.d("ethernomA", "ViewHint : " + viewHint);

        String hint = inferHint(node, viewHint);
        Log.d("ethernomA", "inferHint : " + hint);

        if (hint != null) {
            return hint;
        } else if (!TextUtils.isEmpty(viewHint)) {
            //Log.i(TAG, "No hint using view hint: " + viewHint);
        }

        String resourceId = node.getIdEntry();
        Log.d("ethernomA", "resourceId : " + resourceId);

        hint = inferHint(node, resourceId);
        Log.d("ethernomA", "hint : " + hint);

        if (hint != null) {
            return hint;
        } else if (!TextUtils.isEmpty(resourceId)) {
            //Log.i(TAG, "No hint using resourceId: " + resourceId);
        }

        CharSequence text = node.getText();
        CharSequence className = node.getClassName();

        if (text != null && className != null && className.toString().contains("EditText")) {
            hint = inferHint(node, text.toString());
            Log.d("ethernomA", "hint inferHint : " + hint);

            if (hint != null) {
                // NODE: text should not be logged, as it could contain PII
                return hint;
            }
        } else if (!TextUtils.isEmpty(text)) {
            // NODE: text should not be logged, as it could contain PII
            //Log.v(TAG, "No hint using text: " + text + " and class " + className);
        }
        return null;
    }

    /**
     * Uses heuristics to infer an autofill hint from a {@code string}.
     *
     * @return standard autofill hint, or {@code null} when it could not be inferred.
     */
    @Nullable
    protected static String inferHint(AssistStructure.ViewNode node, @Nullable String actualHint) {
        if (actualHint == null) return null;

        String hint = actualHint.toLowerCase();
        if (hint.contains("label") || hint.contains("container")) {
            Log.v(TAG, "Ignoring 'label/container' hint: " + hint);
            return null;
        }

        if (hint.contains("password")) return View.AUTOFILL_HINT_PASSWORD;
        if (hint.contains("username") || (hint.contains("login") && hint.contains("id")))
            return View.AUTOFILL_HINT_USERNAME;
        if (hint.contains("email")) return View.AUTOFILL_HINT_EMAIL_ADDRESS;
        if (hint.contains("name")) return View.AUTOFILL_HINT_NAME;
        if (hint.contains("phone")) return View.AUTOFILL_HINT_PHONE;

        // When everything else fails, return the full string - this is helpful to help app
        // developers visualize when autofill is triggered when it shouldn't (for example, in a
        // chat conversation window), so they can mark the root view of such activities with
        // android:importantForAutofill=noExcludeDescendants
        if (node.isEnabled() && node.getAutofillType() != View.AUTOFILL_TYPE_NONE) {
            return actualHint;
        }
        return null;
    }

    /*
    @Override
    public void onDeviceNotFound() {
        tvDeviceNotfound.setVisibility(View.VISIBLE);
        authLayout.setVisibility(View.GONE);
        tvDeviceNotfound.setText(R.string.device_not_found);
    }

    @Override
    public void onScanDevice() {
        tvScanDevice.setText(R.string.scanning_device);
    }

    @Override
    public void onConnectDevice() {
        tvScanDevice.setText(R.string.connecting_to_device);
    }

    @Override
    public void onAddAccSuccess() {

    }

    @Override
    public void onCardReject() {
        runOnUiThread(() -> {
            tvScanDevice.setText(R.string.connecting_to_device);
            lnPin.setVisibility(View.VISIBLE);
            txtErrPin.setVisibility(View.VISIBLE);
            btnSubmit.setBackground(getDrawable(R.drawable.bg_btn_disable));
            pinView.setText("");
            finish();
        });
    }
    */
}

    /*
    public class BLEListeners implements OnCardReadyEventListener, OnAccountFetchedListener, OnOperationCompleteListener {
        public void onCardReadyEvent() {
            Log.i("EthBLE", "card ready");
            etherDataList.clear();
            BLEClient.requestLaunchApp(getPhoneName(), "123456");
            /*
            Log.i("EthBLE", "card ready");
            String[] data = {getPhoneName(), "123456", getPhoneId()};
            etherDataList.clear();
            BLEClient.WriteDataToCard(EthBLEClient.H2C_RQST_INIT, data);
        }

        public void OnAccountFetchedEvent(ArrayList<String> AccountData) {
            Log.i("EtherBLE", "account data fetched");
            for (int i = 0; i < AccountData.size(); i++) {
                String s = AccountData.get(i);
                Log.i("EtherBLE", s);
            }

            Log.i("xxx", "username : " + AccountData.get(0));
            Log.i("xxx", "password : " + AccountData.get(1));

            EtherEntry etherentry = new EtherEntry();
            etherentry.URL = AccountData.get(0);
            etherentry.username = AccountData.get(1);
//            etherentry.password = AccountData.get(2);
            boolean add = true;
            for (int i = 0; i != etherDataList.size(); i++) {
                EtherEntry e = etherDataList.get(i);
                if (e.username.compareTo(etherentry.username) == 0 && e.username.compareTo(etherentry.username) == 0 && e.URL.compareTo(etherentry.URL) == 0) {
                    add = false;
                    break;
                }
            }
            if (add)
                etherDataList.add(etherentry);
        }

        public void OnOperationCompleteEvent() {
            Log.i("tttt", "card op complete");
            onSuccess();
        }

        public void OnGetCustomerCompleteEvent(ArrayList<String> temp) {
            EtherEntry a = new EtherEntry();
            a.URL = temp.get(0);
            a.username = temp.get(1);
            a.password = temp.get(2);
            fetchItemDataSet(a);
        }

        @Override
        public void onAccountDuplicatesExact() {

        }

        @Override
        public void onAccountDuplicatesButDifferentPassword() {

        }

        @Override
        public void onAccountNoDuplicatesFound() {

        }

    }
    */
