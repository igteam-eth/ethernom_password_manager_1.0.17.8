package com.ethernom.psdmgr.mobile

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.app.assist.AssistStructure
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.CancellationSignal
import android.service.autofill.*
import android.text.TextUtils
import android.util.ArrayMap
import android.util.Log
import android.view.View
import android.view.autofill.AutofillId
import android.view.autofill.AutofillManager
import android.view.autofill.AutofillValue.forText
import android.widget.RemoteViews
import androidx.annotation.DrawableRes
import androidx.annotation.RequiresApi
import com.google.common.net.InternetDomainName.*


var dataFields:Map<String, AutofillId> = mutableMapOf()
var presentation: RemoteViews? = null
var hintNum:Int = 0
var appName: String = ""
var focusAutofillId:AutofillId? = null
var webDomain:String = ""
@SuppressLint("Registered")
@RequiresApi(Build.VERSION_CODES.O)
class HelloworldAutofillService : AutofillService () {
    val TAG:String = "HelloworldAutofill"
    val LanguageMapping = ArrayMap<String, String>()
    var items = arrayOf(
            "disney+",
            "disneyplus",
            "tiktok",
            "instagram",
            "google",
            "facebook",
            "snapchat",
            "netflix",
            "hulu",
            "spotify",
            "amazon",
            "walmart",
            "wish",
            "venmo",
            "uber",
            "twitter",
            "paypal",
            "lyft",
            "reddit",
            "outlook",
            "live",
            "kickstarter",
            "yahoo",
            "Y!Mail",
            "dropbox",
            "amex",
            "ubofatm",
            "atk",
            "bofa"
    )


    @SuppressLint("ResourceAsColor")
    @RequiresApi(Build.VERSION_CODES.P)
    override fun onFillRequest(
            request: FillRequest,
            cancellationSignal: CancellationSignal,
            callback: FillCallback
    ) {

        LanguageMapping["Y!メール"] = "Y!Mail"
        LanguageMapping["ID/携帯電話番号/メールアドレス"] = "ID / phone number / email address"
        LanguageMapping["パスワード"] = "password"
        LanguageMapping["確認コード"] = "confirmation code"
        LanguageMapping["携帯電話番号"] = "phone number"
        LanguageMapping["メールアドレス"] = "email address"

        Log.d(TAG,"onFillRequest")
        val db = DatabaseHandler(this)
        var autofillFlage = db.allAutofillFlag()
        var autofillFlageStatus = false

        if(autofillFlage.isNotEmpty()){
            Log.d(TAG,"autofillFlage.isNotEmpty")
            if(autofillFlage[0].valid != "valid") {
                autofillFlageStatus = true
            }

        } else {
            Log.d(TAG,"autofillFlage.isEmpty")
            autofillFlageStatus = true
        }

        hintNum = 0
        dataFields = mutableMapOf()
        webDomain = ""
        focusAutofillId = null



        val context: List<FillContext> = request.fillContexts
        val structure: AssistStructure = context[context.size - 1].structure

        var ai: ApplicationInfo?
        val pm = this.packageManager

        try {
            ai = pm.getApplicationInfo(structure.activityComponent.packageName, 0)
        } catch (e: PackageManager.NameNotFoundException) {
            ai = null
        }

        val applicationName = (if (ai != null) pm.getApplicationLabel(ai) else "(unknown)") as String
        val appNameSplit = applicationName.split(" ".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()


        var newAppName = ""
        for (i in appNameSplit.indices) {
            newAppName += appNameSplit[i].toLowerCase()
        }
        Log.d("Keyword",newAppName)

        for(lg in LanguageMapping) {
            if(newAppName.toLowerCase() == lg.key.toLowerCase()){
                newAppName = lg.value
            }
        }

        for(item in items) {
            if(newAppName.toLowerCase().contains(item)) {

                newAppName = when (item) {
                    "outlook" -> {
                        "live"
                    }
                    "Y!Mail" -> {
                        "yahoo"
                    }
                    "disney+" -> {
                        "disneyplus"
                    }
                    "amex" -> {
                        "americanexpress"
                    }
                    "ubofatm" -> {
                        "cbzsecure"
                    }
                    "atk" -> {
                        "americastestkitchen"
                    }
                    "bofa" -> {
                        "bankofamerica"
                    }
                    else -> {
                        item
                    }
                }
            }
        }

        appName =  "$newAppName"
        Log.d(TAG, "Application Name: $appName")
        dataFields = getAutofillableFields(structure)

        val responseBuilder =  FillResponse.Builder()

        var ifDataStatus = false
        Log.d(TAG, "autofillFlageStatus $autofillFlageStatus")
        if(!autofillFlageStatus) {
            Log.d(TAG, "autofillFlageStatus $autofillFlageStatus")
            if(appName == "paypal" || appName == "yahoo") {
                val result = db.searchCredential(appName)
                if(result.isNotEmpty()) {
                    ifDataStatus = true
                }
            }
        }


        Log.d(TAG, "ifDataStatus: $ifDataStatus")
        Log.d(TAG,"dataFields: ${dataFields}")

        if(ifDataStatus){
            val result = db.searchCredential(appName)
            for(cd in result) {
                val mDataSet:Dataset.Builder = Dataset.Builder()
                for (field in dataFields) {
                        val presentation = RemoteViews(packageName, R.layout.dataset_service_list_item)
                        presentation.setTextViewText(R.id.text, cd.display_name)
                        presentation.setTextViewText(R.id.text1, cd.username)
                    if(appName == "paypal") {
                        presentation.setImageViewResource(R.id.icon, R.drawable.paypal30)

                    }else {
                        presentation.setImageViewResource(R.id.icon, R.drawable.yahoo30)

                    }
                    var dataValue = ""
                        if (field.key.contains("password"))
                            dataValue = cd.password
                        else if (field.key.contains("username") || field.key.contains("login") && field.key.contains("id"))
                            dataValue = cd.username
                        else if (field.key.contains("email"))
                            dataValue = cd.username
                        mDataSet.setValue(field.value, forText(dataValue), presentation)
                        Log.d(TAG, "mDataSet: $mDataSet")
                    }
                    if(dataFields.isNotEmpty()) {
                        responseBuilder.addDataset(mDataSet.build())
                    }
            }
            if(dataFields.isNotEmpty()) {
                val presentation = RemoteViews(packageName, R.layout.dataset_header)
                presentation.setTextViewText(R.id.text, "Ethernom, Inc.")
                presentation.setTextColor(R.id.text, R.color.colorGrey)
                presentation.setImageViewResource(R.id.icon, R.mipmap.ethernomlogo)
                responseBuilder.setHeader(presentation)
            }
        } else {

            presentation = newRemoteViews(packageName, "Ethernom, Inc", R.mipmap.ethernomlogo)


            val intent =  Intent(this, AuthenticationActivity::class.java)
            val sender = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_ONE_SHOT).intentSender;

//        //Main difference here:
            val datasetBuilder =  Dataset.Builder(presentation!!)
            datasetBuilder.setAuthentication(sender)

            if (focusAutofillId != null) {
                datasetBuilder.setValue(focusAutofillId!!, forText("some placeholder data"))
            } else {
                for (field in dataFields) {
                    datasetBuilder.setValue(field.value, forText("some placeholder data"))
                }
            }
            if(dataFields.isNotEmpty()) {

                responseBuilder.addDataset(datasetBuilder.build())
            }
        }


        if(dataFields.isNotEmpty()) {
            callback.onSuccess(responseBuilder.build())
        }

    }


    override fun onSaveRequest(p0: SaveRequest, p1: SaveCallback) {
        Log.d(TAG,"onSaveRequest")

    }

    fun newRemoteViews(packageName: String, remoteViewsText: String,
                       @DrawableRes drawableId: Int): RemoteViews {
        val presentation = RemoteViews(packageName, R.layout.multidataset_service_list_item)
        presentation.setTextViewText(R.id.text, remoteViewsText)
        presentation.setImageViewResource(R.id.icon, drawableId)
        return presentation
    }

    internal fun getAutofillableFields(structure: AssistStructure): Map<String, AutofillId> {
        val fields = ArrayMap<String, AutofillId>()
        val nodes = structure.windowNodeCount
        for (i in 0 until nodes) {
            val node = structure.getWindowNodeAt(i).rootViewNode
            addAutofillableFields(fields, node)
        }

        return fields
    }


    var nodeCount=0
    private fun addAutofillableFields(fields: MutableMap<String, AutofillId>, node: AssistStructure.ViewNode) {

        val className = node.className
        if(className != null && className.toString().contains("EditText") && node.isFocused){
            Log.d("xxx", "is_focused: ${node.autofillId.toString()}")
            focusAutofillId = node.autofillId
        }
        // 1073741824@1383575859
        hintNum +=1
        nodeCount +=1

        val hint = getHint(node)
        if (hint != null) {
            if (hint.contains("username") || hint.contains("email") || hint.contains("name") || hint.contains("password")) {
                val id = node.autofillId
                if (!fields.containsKey(hint)) {
                    if(hint == "" || hint == " ") {
                        fields["username"+ hintNum] = id!!
                    } else {
                        fields[hint] = id!!
                    }
                } else {
                    fields[hint+hintNum] = id!!
                }
            }
        }

        val childrenSize = node.childCount
        for (i in 0 until childrenSize) {
            addAutofillableFields(fields, node.getChildAt(i))
        }
    }

    protected fun getHint(node: AssistStructure.ViewNode): String? {
        if(!node.webDomain.isNullOrEmpty() && webDomain == "") {
            webDomain = node.webDomain!!

            Log.d(TAG, "node.webDomain: $webDomain")

            val  owner = from(webDomain).topPrivateDomain()
            Log.d(TAG, "node.webDomain main name: $owner")

            val mlist = owner.toString().split(".")

            if(mlist.size >= 2) {
                webDomain = mlist[0]
            }

            Log.d(TAG, "node.webDomain name: $webDomain")

        }

        if(appName.equals("google") || appName.equals("live")){
            if(node.htmlInfo != null) {
                if(node.htmlInfo!!.tag.equals("input")) {
                    if(node.htmlInfo!!.attributes != null) {
                        for(attr in node.htmlInfo!!.attributes!!) {
                            Log.d("xxx", "html attr first : ${attr.first}")

                            Log.d("xxx", "html hint : ${attr.second}")
                            if(attr.second != null) {
                                if(attr.second.contains("email") || attr.second.contains("password")) {
                                    focusAutofillId = node.autofillId
                                    return attr.second
                                }
                            }
                        }
                    }
                }
            }
        }

        if(appName.equals("disneyplus")) {
            if(node.idEntry == "inputEditText") {
                return "username"
            }else if(node.idEntry == "passwordInputText") {
                return "password";
            }
        }

        val hints = node.autofillHints
        Log.d("xxx", "getAutofillHints : $hints");
        if (hints != null) {
            Log.d("xxx", "getAutofillHints[0] : ${hints[0].toLowerCase()}");

            return hints[0].toLowerCase()
        }

        val viewHint = node.hint
        var hint = inferHint(node, viewHint)
        Log.d("xxx", "viewHint : $viewHint")
        Log.d("xxx", "inferHint :  $hint" )

        if (hint != null) {
            return hint
        } else if (!TextUtils.isEmpty(viewHint)) {
        }

        val resourceId = node.idEntry
        hint = inferHint(node, resourceId)
        Log.d("xxx", "resourceId : $hint")
        if (hint != null) {
            return hint
        } else if (!TextUtils.isEmpty(resourceId)) {
        }

        val text = node.text
        val className = node.className
        if (text != null && className != null && className.toString().contains("EditText")) {
            hint = inferHint(node, text.toString())
            Log.d("xxx", "className : $hint" )
            if (hint != null) {
                return hint
            }
        } else if (!TextUtils.isEmpty(text)) {
        }
        return null
    }

    protected fun inferHint(node: AssistStructure.ViewNode, actualHintTmp: String?): String? {

        if (actualHintTmp == null) return null

        var actualHint = actualHintTmp

        if(appName == "yahoo"){
            for(lg in LanguageMapping) {
                if(actualHint == lg.key){
                    actualHint = lg.value
                }
            }
        }

        var hint = actualHint!!.toLowerCase()

        if (hint.isNullOrEmpty()) {
            if (!node.contentDescription.isNullOrEmpty()) {
                hint = node.contentDescription!!.toString()
            }
        }

        if (hint.contains("label") || hint.contains("container")) {
            Log.v(TAG, "Ignoring hint: $hint")
            return null
        }

        if (hint.contains("password") || hint.contains("passcode")) return View.AUTOFILL_HINT_PASSWORD
        if (hint.contains("username") || hint.contains("login") && hint.contains("id") || hint.contains("user id") || hint.contains("online id") || hint.contains("user_id") || hint.contains("online_id") )
            return View.AUTOFILL_HINT_USERNAME
        if (hint.contains("email")) return View.AUTOFILL_HINT_EMAIL_ADDRESS
        return null
    }

    override fun onConnected() {
        super.onConnected()
        Log.d("ConnectionState", "onConnected called")
    }

    override fun onDisconnected() {
        super.onDisconnected()
        Log.d("ConnectionState", "onDisconnected called")
        AutofillManager::commit
    }

}