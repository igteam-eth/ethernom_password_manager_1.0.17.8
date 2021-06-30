package com.ethernom.psdmgr.mobile.autofill.adapter;
import com.ethernom.psdmgr.mobile.autofill.AuthActivity;

public interface  RecyclerViewClickListener {
    void onClick(int position, AuthActivity.EtherEntry etherEntry);
}
