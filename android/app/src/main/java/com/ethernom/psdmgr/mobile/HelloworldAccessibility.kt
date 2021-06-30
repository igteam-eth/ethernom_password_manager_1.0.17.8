package com.ethernom.psdmgr.mobile

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent

import android.util.Log
import android.accessibilityservice.AccessibilityServiceInfo


class HelloworldAccessibility : AccessibilityService() {


    //Configure the Accessibility Service
    override fun onServiceConnected() {
//        Toast.makeText(application, "onServiceConnected", Toast.LENGTH_SHORT).show()
        Log.d("HelloAccessibility: ", "onServiceConnected")
        val accessibilityServiceInfo = AccessibilityServiceInfo()
        accessibilityServiceInfo.eventTypes = AccessibilityEvent.TYPES_ALL_MASK
        accessibilityServiceInfo.feedbackType = AccessibilityServiceInfo.FEEDBACK_ALL_MASK
        accessibilityServiceInfo.packageNames = arrayOf("com.research.my.accessibility")
        accessibilityServiceInfo.notificationTimeout = 1000
        serviceInfo = accessibilityServiceInfo
    }

    //Respond to AccessibilityEvents
    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        Log.d("HelloAccessibility: ", "event.eventType: ${event.eventType}")
    }

    override fun onInterrupt() {
        Log.d("HelloAccessibility: ", "onInterrupt()")
    }


}