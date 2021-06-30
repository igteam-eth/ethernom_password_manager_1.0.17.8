package com.ethernom.psdmgr.mobile

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.service.autofill.Dataset
import android.service.autofill.FillResponse
import android.util.Log
import android.view.MenuItem
import android.view.View
import android.view.autofill.AutofillManager
import android.view.autofill.AutofillValue
import android.view.inputmethod.InputMethodManager
import android.widget.ImageView
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SearchView
import androidx.recyclerview.widget.LinearLayoutManager
import com.ethernom.psdmgr.mobile.autofill.AuthActivity
import kotlinx.android.synthetic.main.activity_authentication.*
import java.util.*
import kotlin.collections.ArrayList

class AuthenticationActivity : AppCompatActivity(), ListAdapter.AdapterCallback {

    var mUserData: ArrayList<UserCredentials>? =null
    lateinit var mListAdapter: ListAdapter

    var db: DatabaseHandler ? = null
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_authentication)
        setSupportActionBar(save_toolbar)
        supportActionBar!!.setDisplayHomeAsUpEnabled(true)
        supportActionBar!!.setDisplayShowTitleEnabled(true)
        db = DatabaseHandler(this)

        var autofillFlage = db!!.allAutofillFlag()

        if(autofillFlage.isNotEmpty()){
            Log.d("AuthenticationActivity","autofillFlage.isNotEmpty")
            if(autofillFlage[0].valid != "valid") {

                Log.d("AuthenticationActivity","autofillFlage[0].valid")
                Handler().postDelayed({
                    AlertDialog.Builder(this)
                            .setTitle("No user credential")
                            .setMessage("Please launch Ethernom Password Manager app to Synchronize your credentials.!" )
                            .setCancelable(false)
                            .setPositiveButton(
                                    R.string.launch_app_label
                            ) { dialog, _ ->
                                onOpenPMApp()
                                dialog.dismiss()
                                finish()
                            }
                            .setNegativeButton(
                                    R.string.dismiss_label
                            ) { dialog, _ ->
                                dialog.dismiss()
                                finish()
                            }
                            .show()
                }, 1000)
                return
            }

        } else {
            Log.d("AuthenticationActivity","autofillFlage.isEmpty")
            Handler().postDelayed({
                AlertDialog.Builder(this)
                        .setTitle("No user credential")
                        .setMessage("Please launch Ethernom Password Manager app to Synchronize your credentials.!" )
                        .setCancelable(false)
                        .setPositiveButton(
                                R.string.launch_app_label
                        ) { dialog, _ ->
                            onOpenPMApp()
                            dialog.dismiss()
                            finish()
                        }
                        .setNegativeButton(
                                R.string.dismiss_label
                        ) { dialog, _ ->
                            dialog.dismiss()
                            finish()
                        }
                        .show()
            }, 1000)
            return
        }
        mUserData= ArrayList()


    }

    private fun onOpenPMApp(appPackageName :String = "com.ethernom.psdmgr.mobile"){
        val launchIntent = packageManager.getLaunchIntentForPackage(appPackageName)
        if(launchIntent != null){
            startActivity(launchIntent)
        } else {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$appPackageName")))
        }
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when(item.itemId){
            android.R.id.home -> {
                onBackPressed()
                true
            }
            else -> {
                super.onOptionsItemSelected(item)
            }
        }
    }

    fun setupView() {

        editTextSearch.onActionViewExpanded()
        if (appName == "chrome" || appName == "firefox" || appName == "edge") {
            val closeButton: View? = editTextSearch.findViewById(androidx.appcompat.R.id.search_close_btn)

            editTextSearch.setQuery(webDomain, false)
            search(webDomain)
            if(webDomain == "wish") {
                Handler().postDelayed({
                    closeButton!!.performClick()
                    editTextSearch.setQuery(webDomain, false)
                    search(webDomain)
                }, 500)
            }


        } else {
            editTextSearch.setQuery(appName, false)
            //mListAdapter.filter.filter(appName)
            search(appName)
        }
        
        AuthActivity.hideKeyboard(this)
        editTextSearch.clearFocus()
        editTextSearch.isFocusable = false
        editTextSearch.setOnQueryTextListener(searchView())
    }
    private fun searchView(): SearchView.OnQueryTextListener? {
        return object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String): Boolean {
//                adapter.getFilter().filter(query)
                Log.d("xxx", "mysearch : $query")
                search(query)
                return false
            }

            override fun onQueryTextChange(newText: String): Boolean {
//                accountAdapter.getFilter().filter(newText)
                Log.d("xxx", "mysearch : $newText")
                search(newText)
                return false
            }
        }
    }

    var UserCredentialsComparator: Comparator<UserCredentials> = Comparator<UserCredentials> { s1, s2 ->
        val dName1: String = s1.display_name.toLowerCase();
        val dName2: String = s2.display_name.toLowerCase();

        //ascending order
        dName1.compareTo(dName2)
    }

    private fun search(keyword: String) {
        val result = db!!.searchCredential(keyword.toLowerCase())
        mUserData!!.clear()

        mUserData!!.addAll(result)
        Collections.sort(mUserData, UserCredentialsComparator)

        mListAdapter.notifyDataSetChanged()
    }

    override fun onResume() {
        super.onResume()
        hideKeyboard(this@AuthenticationActivity)
        val credentials = db!!.allCredentials

        mUserData = ArrayList()
        for(cd in credentials) {
            mUserData!!.add(UserCredentials(cd.id, cd.display_name, cd.username, cd.password, cd.url))
        }
        Collections.sort(mUserData, UserCredentialsComparator)

        /**create obj ListAdapter**/
        mListAdapter = ListAdapter(mUserData!!, this)
        Log.d("yyy", "credential : $mUserData")

        list_recycler_view.apply {
            // set a LinearLayoutManager to handle Android
            // RecyclerView behavior
            layoutManager = LinearLayoutManager(this@AuthenticationActivity)
            // set the custom adapter to the RecyclerView
            //adapter = ListAdapter(mUserData!!, this@AuthenticationActivity)
            adapter = mListAdapter
        }
        setupView()
        db!!.close()
    }
    @RequiresApi(Build.VERSION_CODES.O)
    override fun itemClickCallBack(item: UserCredentials) {

//        var presentation = newRemoteViews(packageName, "dataset from auth activity", R.drawable.ethernomlogo)
        Log.d("itemClickCallBack", "Data : ${item}")
        val datasetBuilder =  Dataset.Builder(presentation!!)

        if (dataFields.isNotEmpty()) {
            for (field in dataFields) {
                val hint = field.key
                val id = field.value

                var dataValue = ""
                if (hint.contains("password"))
                    dataValue = item.password //mUserData!![position].password
                else if (hint.contains("username") || hint.contains("login") && hint.contains("id"))
                    dataValue = item.username //mUserData!![position].username
                else if (hint.contains("email"))
                    dataValue = item.username//mUserData!![position].username
                else if (hint.contains("phone")) dataValue = item.username
                datasetBuilder.setValue(id, AutofillValue.forText(dataValue), presentation!!)
            }
        }

        val ReplyIntent = Intent()

        var returnDataset = true; //tried both true and false, neither works
        if (returnDataset)
        {
            ReplyIntent.putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, datasetBuilder.build())
        }
        else
        {
            val responseBuilder =  FillResponse.Builder()
            responseBuilder.addDataset(datasetBuilder.build())
            ReplyIntent.putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, responseBuilder.build())
        }
        setResult(Activity.RESULT_OK, ReplyIntent)
        dataFields= mutableMapOf()
        finish()
    }


    fun hideKeyboard(activity: Activity) {
        val imm: InputMethodManager = activity.getSystemService(Activity.INPUT_METHOD_SERVICE) as InputMethodManager
        //Find the currently focused view, so we can grab the correct window token from it.
        var view: View? = activity.currentFocus
        //If no view currently has focus, create a new one, just so we can grab a window token from it
        if (view == null) {
            view = View(activity)
        }
        imm.hideSoftInputFromWindow(view.getWindowToken(), 0)
    }

    override fun onDestroy() {
        super.onDestroy()
        db?.close()
    }
}