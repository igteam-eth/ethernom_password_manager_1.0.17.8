package com.ethernom.psdmgr.mobile;

import android.app.Application;
import android.content.SharedPreferences;
import android.util.Log;

import com.ethernom.psdmgr.mobile.BuildConfig;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.swmansion.rnscreens.RNScreensPackage;
import com.ninty.system.setting.SystemSettingPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.soloader.SoLoader;

import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      @SuppressWarnings("UnnecessaryLocalVariable")
      List<ReactPackage> packages = new PackageList(this).getPackages();
      packages.add(new HelloWorldPackage());
      // Packages that cannot be autolinked yet can be added manually here, for example:
      // packages.add(new MyReactNativePackage());
      return packages;
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);

    SharedPreferences share = getApplicationContext().getSharedPreferences("wit_player_shared_preferences", getApplicationContext().MODE_PRIVATE);
    String name = share.getString("PERIPHERAL", null);
    Log.d("gggg", "fff : " + name);
  }

}
