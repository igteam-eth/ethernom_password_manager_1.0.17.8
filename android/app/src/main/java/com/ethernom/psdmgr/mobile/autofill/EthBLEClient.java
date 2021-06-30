package com.ethernom.psdmgr.mobile.autofill;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattCharacteristic;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.util.Log;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import android.os.ParcelUuid;
import android.view.WindowManager;

import com.ethernom.android.etherapi.EtherEncHeader;
import com.ethernom.android.etherapi.Crypto.Ether_AESEAX;
import com.ethernom.android.etherapi.EthernomConstKt;

import java.util.UUID;

interface etherBLEClientListener {
    void onCardConnected();
    void onCardDisconnected();
    void onData(byte[] buffer);
    void onDeviceNotFound();
}

interface writeCallbackListener {
    void onData(byte[] buffer);
}

public class EthBLEClient {
    private Context context;
    private Handler mHandler;

    private int maxByteSize = 244;
    private BluetoothAdapter mBluetoothAdapter;
    private BluetoothLeScanner mLEScanner;
    private BluetoothDevice periphEthCard;
    private BluetoothGatt gatt;
    private BluetoothGattCharacteristic ethCharacteristic;
    private boolean connecting = false;

    private static final long SCAN_PERIOD = 30000;
    private ScanSettings settings;
    private List<ScanFilter> filters;

    private etherBLEClientListener _BLEClientListener;
    private writeCallbackListener _writeCallback = null;
    private String mPeripheralId;
    public Boolean auto_reconnect = false;
    private List<Byte> _temp_buffer = new ArrayList<Byte>();

    public void initEthBLE(Context ctx, String peripheralId, Ether_AESEAX _aes_eax, etherBLEClientListener BLEClientListener) {
        context = ctx;

        mPeripheralId = peripheralId;
        _BLEClientListener = BLEClientListener;

        mHandler = new Handler();
        final BluetoothManager bluetoothManager = (BluetoothManager) (context.getSystemService(Context.BLUETOOTH_SERVICE));
        mBluetoothAdapter = bluetoothManager.getAdapter();

        if (Build.VERSION.SDK_INT >= 21) {
            mLEScanner = mBluetoothAdapter.getBluetoothLeScanner();
            settings = new ScanSettings.Builder()
                    .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                    .build();
            filters = new ArrayList<ScanFilter>();

            ScanFilter.Builder builder = new ScanFilter.Builder();
            builder.setDeviceName("ETH!AAAAAAAAAAA");
            filters.add(builder.build());
            ScanFilter scanFilter = new ScanFilter.Builder()
                    .setServiceUuid(ParcelUuid.fromString(EthernomConstKt.getETH_advServiceUUD()))
                    .build();
            filters.add(scanFilter);
        }

        /*
        mHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                scanLeDevice(false);
                if (!found) {
                    Log.d("hhh", "Peripheral not found");
                    EthBLEClientCallBack a = (EthBLEClientCallBack) context;
                    a.onDeviceNotFound();
                }
            }
        }, 20000);
        */

        scanLeDevice(true);

        //Toast.makeText(context, "Turned on",Toast.LENGTH_LONG).show();
    }



    private void scanLeDevice(final boolean enable) {
        if (enable) {
            mHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    mLEScanner.stopScan(mScanCallback);
                }
            }, SCAN_PERIOD);
            mLEScanner.startScan(filters, settings, mScanCallback);

            deviceNotFound();

        } else {
            mLEScanner.stopScan(mScanCallback);
        }
    }

    private void deviceNotFound(){
        new Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                if(!connecting){
                    try {
                        _BLEClientListener.onDeviceNotFound();
                    }catch (WindowManager.BadTokenException ex){
                        ex.printStackTrace();
                    }

                }
            }
        }, 10000);
    }


    private ScanCallback mScanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
             if (mPeripheralId.equals(result.getDevice().getAddress())) {
                //scanLeDevice(false);

                if(mBluetoothAdapter.isDiscovering() == true) mBluetoothAdapter.cancelDiscovery();
                if(connecting == false) {
                    connecting = true;
                    periphEthCard = result.getDevice();
                    //gatt = periphEthCard.connectGatt(context, true, gattCallback);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        gatt = periphEthCard.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE);
                    } else {
                        gatt = periphEthCard.connectGatt(context, false, gattCallback);
                    }
                }
            }
        }

        @Override
        public void onBatchScanResults(List<ScanResult> results) {
            for (ScanResult sr : results) {
                Log.d("hhh", "ScanResult - Results + " + sr.toString());
            }
        }

        @Override
        public void onScanFailed(int errorCode) {
            Log.e("Scan Failed", "Error Code: " + errorCode);
        }

        private int[] toUnsignedIntArray(byte[] barray) {
            int[] ret = new int[barray.length];
            for (int i = 0; i < barray.length; i++) {
                ret[i] = barray[i] & 0xff; // Range 0 to 255, not -128 to 127
            }
            return ret;
        }

        public UUID convertFromInteger(int i) {
            final long MSB = 0x0000000000001000L;
            final long LSB = 0x800000805f9b34fbL;
            long value = i & 0xFFFFFFFF;
            return new UUID(MSB | (value << 32), LSB);
        }

        private void reconnect() {
            auto_reconnect = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                gatt = periphEthCard.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE);
            }else{
                gatt = periphEthCard.connectGatt(context, false, gattCallback);
            }
        }

        final BluetoothGattCallback gattCallback =
                new BluetoothGattCallback() {
                    @Override
                    public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                        if (newState == BluetoothGatt.STATE_CONNECTED) {
                            auto_reconnect = false;
                            gatt.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH);
                            gatt.discoverServices();
                        } else if (newState == BluetoothGatt.STATE_DISCONNECTED) {
                            connecting = false;
                            if (auto_reconnect == true) {
                                reconnect();
                            } else {
                                if (gatt != null) {
                                    gatt.disconnect();
                                    gatt.close();
                                }

                                if (_BLEClientListener != null)
                                    _BLEClientListener.onCardDisconnected();
                            }
                        }
                    }

                    @Override
                    public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                        ethCharacteristic = gatt.getService(EthernomConstKt.getETH_serviceUUID()).getCharacteristic(EthernomConstKt.getETH_characteristicUUID());
                        UUID CLIENT_CHARACTERISTIC_CONFIG_UUID = convertFromInteger(0x2902);
                        if (ethCharacteristic != null) {
                            BluetoothGattDescriptor descriptor = ethCharacteristic.getDescriptor(CLIENT_CHARACTERISTIC_CONFIG_UUID);
                            if (descriptor != null) {
                                descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                                gatt.setCharacteristicNotification(ethCharacteristic, true);
                                gatt.writeDescriptor(descriptor);
                            }
                            //gatt.setCharacteristicNotification(ethCharacteristic, true);
                        }
                    }

                    @Override
                    public void onDescriptorWrite(BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status) {
                        if (_BLEClientListener != null)
                            _BLEClientListener.onCardConnected();
                    }

                    @Override
                    public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
                        if (status != 0)
                            Log.i("EtherBLE", "oncharacteristicwrite failed write");
                        else {
                            Log.i("EtherBLE", "oncharacteristicwrite success");

                        }
                    }

                    @Override
                    public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
                        if (status != 0)
                            Log.i("EtherBLE", "oncharacteristicread failed write");
                        else
                            Log.i("EtherBLE", "oncharacteristicread success");
                    }

                    @Override
                    public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
                        byte[] value = characteristic.getValue();
                        handle_receives_packet(value);
                    }
                };

    };

    private void handle_receives_packet(byte[] value) {
        if (_temp_buffer.size() == 0) {
            int len = get_payload_length(value[4], value[5]);
            if (len == (value.length - 8)) {
                on_card_read_success(value);
                _temp_buffer.clear();
            } else {
                for (int i = 0; i < value.length; i++) {
                    _temp_buffer.add(value[i]);
                }
            }

        } else {
            for (int i = 0; i < value.length; i++) {
                _temp_buffer.add(value[i]);
            }

            int initial_len = get_payload_length(_temp_buffer.get(4), _temp_buffer.get(5));
            if (initial_len == (_temp_buffer.size() - 8)) {
                byte[] temp_buffer = new byte[_temp_buffer.size()];
                for (int i = 0; i < _temp_buffer.size(); i++) temp_buffer[i] = _temp_buffer.get(i);

                on_card_read_success(temp_buffer);
                _temp_buffer.clear();
            }
        }
    }

    private void on_card_read_success(byte[] value){
        //Log.i("TEST_ETHBLEClient: READ", hexaSpaced(value));
        if(_writeCallback != null) {
            writeCallbackListener _tempWriteCallback = _writeCallback;
            _writeCallback = null;
            _tempWriteCallback.onData(value);

        }else if(_BLEClientListener != null) {
            _BLEClientListener.onData(value);
        }
    }

    private int get_payload_length(int LSB, int MSB) {
        int len = ((MSB & 0xFF) * 256) + (LSB & 0xFF);
        if (len < 0) {
            len = len & 0xFFFF;
        }
        return len;
    }

    public void cancelRequest() {
        if (gatt != null) {
            gatt.disconnect();
            gatt.close();
        }
        scanLeDevice(false);
    }

    private byte[] MakeTransportHeader(byte srcport, byte destprt, byte control, byte interfaces, int payloadLength, byte protocol) {
        byte[] packet = new byte[8];
        packet[0] = srcport;
        packet[1] = destprt;
        packet[2] = control;
        packet[3] = interfaces;

        // length bytes, length is 2 bytes
        int Value0 = payloadLength & 0x00ff;
        int Value1 = payloadLength >> 8;
        packet[4] = (byte) Value0;
        packet[5] = (byte) Value1;
        packet[6] = (byte) 0;
        packet[7] = (byte) 0;

        int xorValue = packet[0];

        // xor the packet header for checksum
        int i = 0;
        for (int j = 1; j != 7; j++) {
            int c = packet[j];
            xorValue = xorValue ^ c;
        }

        packet[7] = (byte) xorValue;
        return packet;
    }

    private byte[] getInitedPacked(byte appPort, int payloadLength, boolean useEncryption) {
        int encPayloadLength = payloadLength + 16;
        return MakeTransportHeader((byte) (appPort | 0x80), appPort, useEncryption ? (byte) 0x80 : (byte) 0x00, EthernomConstKt.getETH_BLE_INTERFACE(), encPayloadLength, (byte) 0x00);
    }

    private byte[] composeBLEPacket(byte[] data, EtherEncHeader encHeader) {
        byte[] payload = data;
        byte[] packetHeader = getInitedPacked(EthernomConstKt.getPSD_MGR_PORT(), payload.length, encHeader != null ? true : false);
        if (encHeader != null) {
            encHeader.SetPayloadLength(payload.length);
            byte[] epacket = encHeader.GetHeaderBuffer();
            byte[] temp = concatBytesArray(packetHeader, epacket);
            packetHeader = temp;
        }
        byte[] temp2 = concatBytesArray(packetHeader, payload);
        packetHeader = temp2;
        return packetHeader;
    }

    private byte[] getInitedPacket_Generic(int payloadLength) {
        return MakeTransportHeader((byte) (EthernomConstKt.getGENERIC_PORT() | 0x80), EthernomConstKt.getGENERIC_PORT(), (byte) 0x00, EthernomConstKt.getETH_BLE_INTERFACE(), payloadLength, (byte) 0x00);
    }

    private byte[] composeBLEPacket_Generic(byte[] data) {
        byte[] payload = data;
        byte[] packetHeader = getInitedPacket_Generic(payload.length);
        byte[] temp = concatBytesArray(packetHeader, payload);
        packetHeader = temp;
        return packetHeader;
    }

    public byte[] concatBytesArray(byte[] a, byte[] b) {
        byte[] c = new byte[a.length + b.length];
        System.arraycopy(a, 0, c, 0, a.length);
        System.arraycopy(b, 0, c, a.length, b.length);
        return c;
    }

    //*******************************************************************
    //Writing
    //*******************************************************************
    public void WriteDataToCard(byte[] data, EtherEncHeader encHeader, writeCallbackListener writeCallback) {
        _writeCallback = null;
        _writeCallback = writeCallback;

        byte[] payload = composeBLEPacket(data, encHeader);
        WriteToCard(payload);
    }

    public void WriteDataToCardHasEncryption(byte[] data, writeCallbackListener writeCallback){
        _writeCallback = null;
        _writeCallback = writeCallback;

        byte[] transport_headr = MakeTransportHeader((byte) (EthernomConstKt.getPSD_MGR_PORT() | 0x80), EthernomConstKt.getPSD_MGR_PORT(), (byte)0x80, EthernomConstKt.getETH_BLE_INTERFACE(), data.length, (byte) 0x00);
        byte[] payload = concatBytesArray(transport_headr, data);
        WriteToCard(payload);
    }

    public void WriteDataToCardHasEncryption(byte[] data){
        byte[] transport_headr = getInitedPacked(EthernomConstKt.getPSD_MGR_PORT(), data.length - EthernomConstKt.getETH_BLE_ENC_HEADER_SIZE(), true);
        byte[] payload = concatBytesArray(transport_headr, data);
        WriteToCard(payload);
    }

    public void WriteDataToCard_Generic(byte[] data, writeCallbackListener writeCallback) {
        _writeCallback = null;
        _writeCallback = writeCallback;

        byte[] payload = composeBLEPacket_Generic(data);
        WriteToCard(payload);
    }

    public void WriteDataToCard_Generic(byte[] data) {
        byte[] payload = composeBLEPacket_Generic(data);
        WriteToCard(payload);
    }

    // a way to write byte buffers
    public void WriteToCard(byte[] data) {
        if (data.length > maxByteSize) {
            ethCharacteristic.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
            int dataLength = data.length;
            int count = 0;
            byte[] firstMessage = null;
            List<byte[]> splittedMessage = new ArrayList<>();

            while (count < dataLength && (dataLength - count > maxByteSize)) {
                if (count == 0) {
                    firstMessage = Arrays.copyOfRange(data, count, count + maxByteSize);
                } else {
                    byte[] splitMessage = Arrays.copyOfRange(data, count, count + maxByteSize);
                    splittedMessage.add(splitMessage);
                }
                count += maxByteSize;
            }

            if (count < dataLength) {
                // Other bytes in queue
                byte[] splitMessage = Arrays.copyOfRange(data, count, data.length);
                splittedMessage.add(splitMessage);
            }

            try {
                boolean writeError = false;
                if (!doWrite(firstMessage)) {
                    writeError = true;
                    //callback.invoke("Write failed");
                }

                if (!writeError) {
                    Thread.sleep(30);
                    for (byte[] message : splittedMessage) {
                        if (!doWrite(message)) {
                            writeError = true;
                            //callback.invoke("Write failed");
                            break;
                        }
                        Thread.sleep(30);
                    }

                    if (!writeError) {
                        //callback.invoke("Write success");
                    }
                }
            } catch (InterruptedException e) {
                //callback.invoke("Write failed");
            }

        } else {
            ethCharacteristic.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
            if (!doWrite(data)) {
                //callback.invoke("Write failed");
            }
            ;
        }
    }

    public boolean doWrite(byte[] data) {
        //Log.i("TEST_ETHBLEClient: WRITE", hexaSpaced(data));
        ethCharacteristic.setValue(data);
        if (!gatt.writeCharacteristic(ethCharacteristic)) {
            //Log.i("TEST_ETHBLEClient", "Error on doWrite");
            return false;
        }
        return true;
    }

    public String hexaSpaced(byte[] data){
        String sb = "";
        for(int i=0; i<data.length; i++){
            sb += String.format("%02x ", data[i]);
        }

        return sb;
    }
}
