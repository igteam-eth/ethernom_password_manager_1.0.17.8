package com.ethernom.psdmgr.mobile

import android.database.sqlite.SQLiteDatabase
import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteOpenHelper
import android.util.Log
import com.ethernom.helloworldautofill.AutofillFlag
import java.nio.file.Files.delete


class DatabaseHandler(context: Context)//3rd argument to be passed is CursorFactory instance
    : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {
    val allCredentials: List<UserCredentials>
        get() {
            try {
                val credentialList = ArrayList<UserCredentials>()
                val selectQuery = "SELECT  * FROM $TABLE_CREDENTIAL ORDER BY id DESC"

                val db = this.writableDatabase
                val cursor = db.rawQuery(selectQuery, null)
                if (cursor.moveToFirst()) {
                    do {
                        val credential = UserCredentials(cursor.getString(0), cursor.getString(1), cursor.getString(2), cursor.getString(4), cursor.getString(3))
                        credentialList.add(credential)
                    } while (cursor.moveToNext())
                }
                cursor.close()
                db.close()
                return credentialList
            } catch (ex:Exception) {
                Log.d("DatabaseHandler", "allCredentials Error ${ex.message}")
            }

            return emptyList()

        }

    // Getting Credential Count
    // return count
    val credentialsCount: Int
        get() {
            val countQuery = "SELECT  * FROM $TABLE_CREDENTIAL"
            val db = this.readableDatabase
            val cursor = db.rawQuery(countQuery, null)
            cursor.close()
            return cursor.count
        }

    // Creating Tables
    override fun onCreate(db: SQLiteDatabase) {
        try {
            val CREATE_CREDENTIAL_TABLE = ("CREATE TABLE " + TABLE_CREDENTIAL + "("
                    + KEY_ID + " INTEGER PRIMARY KEY," + KEY_DIS_NAME + " TEXT,"
                    + KEY_USERNAME + " TEXT,"+ KEY_URL + " TEXT," +  KEY_PASSWORD + " TEXT)")

            val CREATE_AUTOFILL_FLAG_TABLE = ("CREATE TABLE " + TABLE_AUTOFILL_FLAG + "("
                    + KEY_AUTO_ID + " INTEGER PRIMARY KEY," + KEY_AUTO_VALID + " TEXT,"
                    + KEY_AUTO_KEY + " TEXT)")
            db.execSQL(CREATE_CREDENTIAL_TABLE)
            db.execSQL(CREATE_AUTOFILL_FLAG_TABLE)
        } catch (ex:Exception) {
            Log.d("DatabaseHandler", "onCreate Error ${ex.message}")
        }


    }

    // Upgrading database
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        try {
            // Drop older table if existed
            db.execSQL("DROP TABLE IF EXISTS $TABLE_CREDENTIAL")
            db.execSQL("DROP TABLE IF EXISTS $TABLE_AUTOFILL_FLAG")

            // Create tables again
            onCreate(db)
        } catch (ex: Exception) {
            Log.d("DatabaseHandler", "onUpgrade Error ${ex.message}")
        }

    }

    // code to add the new Credential
    fun addCredential(credential: UserCredentials) {
        try {
            val db = this.writableDatabase

            val values = ContentValues()
            values.put(KEY_DIS_NAME, credential.display_name)
            values.put(KEY_USERNAME, credential.username)
            values.put(KEY_PASSWORD, credential.password)
            values.put(KEY_URL, credential.url)

            // Inserting Row
            db.insert(TABLE_CREDENTIAL, null, values)
            db.close() // Closing database connection
        } catch (ex: Exception) {
            Log.d("DatabaseHandler", "addCredential Error ${ex.message}")
        }

    }

    // code to get the single Credential
    fun getCredential(id: Int): UserCredentials {
        val db = this.readableDatabase

        val cursor = db.query(
                TABLE_CREDENTIAL, arrayOf(KEY_ID, KEY_DIS_NAME, KEY_USERNAME, KEY_PASSWORD), "$KEY_ID=?",
                arrayOf(id.toString()), null, null, null, null
        )
        cursor?.moveToFirst()

// return Credential
        return UserCredentials(
                cursor!!.getString(0),
                cursor.getString(1), cursor.getString(2),
                cursor.getString(3), cursor.getString(4)
        )
    }

    // code to update the single Credential
    fun updateCredential(credential: UserCredentials): Int {
        val db = this.writableDatabase

        val values = ContentValues()
        values.put(KEY_DIS_NAME, credential.display_name)
        values.put(KEY_USERNAME, credential.username)
        values.put(KEY_PASSWORD, credential.password)

        // updating row
        return db.update(
                TABLE_CREDENTIAL, values, "$KEY_ID = ?",
                arrayOf(credential.id.toString())
        )
    }

    // Deleting single Credential
    fun deleteCredential(contact: UserCredentials) {
        val db = this.writableDatabase
        db.delete(
                TABLE_CREDENTIAL, "$KEY_ID = ?",
                arrayOf(contact.id.toString())
        )
        db.close()
    }
    fun searchCredential(keyword: String): List<UserCredentials> {
        try {
            if (keyword.isEmpty()) { return allCredentials}
            val writeDb = this.writableDatabase
            val credentialList = ArrayList<UserCredentials>()

            credentialList.clear()
            val query = "SELECT * FROM UserCredential where url LIKE '%" + keyword + "%'"
            val cursor = writeDb.rawQuery(query, null)

            if (cursor.moveToFirst()) {
                do {
                    val credential = UserCredentials(cursor.getString(0), cursor.getString(1), cursor.getString(2), cursor.getString(4), cursor.getString(3))
                    credentialList.add(credential)
                } while (cursor.moveToNext())
            }
            cursor.close()
            writeDb.close()
            return credentialList
        } catch (ex: Exception) {
            Log.d("DatabaseHandler", "searchCredential Error ${ex.message}")
        } finally {

        }
        return emptyList()
    }

    fun deleteSingleAccount(credential: UserCredentials) {
        try {
            val db = this.writableDatabase

            Log.d("deleteSingleAccount","deleteSingleAccount ${credential}")
            db.delete(TABLE_CREDENTIAL, KEY_DIS_NAME + " = ? AND "+ KEY_URL + " = ? AND " + KEY_USERNAME + " = ? ",  arrayOf(credential.display_name,credential.url,credential.username));
            db.close()
        } catch (ex: Exception) {
            Log.d("DatabaseHandler", "deleteSingleAccount Error ${ex.message}")
        }
    }

    fun deleteAllCredential() {
        try {
            val db = this.writableDatabase
            db.delete(TABLE_CREDENTIAL,"",null)
            db.close()
        } catch (ex: Exception) {
            Log.d("DatabaseHandler", "deleteAllCredential Error ${ex.message}")
        }

    }

    // Deleting single Credential
    fun deleteAutofillFlag(contact: UserCredentials) {
        val db = this.writableDatabase
        db.delete(
                TABLE_CREDENTIAL, "$KEY_ID = ?",
                arrayOf(contact.id.toString())
        )
        db.close()
    }


    // code to add the new Credential
    public fun addAutoFillFlag(credential: AutofillFlag) {

        try {
            val db = this.writableDatabase

            val values = ContentValues()
            values.put(KEY_AUTO_ID, credential.id)
            values.put(KEY_AUTO_VALID, credential.valid)
            values.put(KEY_AUTO_KEY, credential.key_session)

            // Inserting Row
            db.insert(TABLE_AUTOFILL_FLAG, null, values)
            db.close() // Closing database connection
        } catch (ex: Exception) {
            Log.d("DatabaseHandler", "addAutoFillFlag Error ${ex.message}")
        }

    }

    public fun allAutofillFlag(): List<AutofillFlag> {
        try {
            val autofillFlagList = ArrayList<AutofillFlag>()
            val selectQuery = "SELECT  * FROM $TABLE_AUTOFILL_FLAG"

            val db = this.writableDatabase
            val cursor = db.rawQuery(selectQuery, null)
            if (cursor.moveToFirst()) {
                do {
                    val autofillFlag = AutofillFlag(Integer.parseInt(cursor.getString(0)), cursor.getString(1), cursor.getString(2))
                    autofillFlagList.add(autofillFlag)
                } while (cursor.moveToNext())
            }
            return autofillFlagList
        } catch (ex: Exception) {
            Log.d("DatabaseHandler", "allAutofillFlag Error ${ex.message}")
        }
        return emptyList()

    }

    fun deleteAllAutofillFlag() {
        try {
            val db = this.writableDatabase
            db.delete(TABLE_AUTOFILL_FLAG,"",null)
            db.close()
        } catch (ex:Exception) {
            Log.d("DatabaseHandler", "deleteAllAutofillFlag Error ${ex.message}")
        }

    }

    companion object {
        private val DATABASE_VERSION = 1
        private val DATABASE_NAME = "EthernomDataCredential"
        private val TABLE_CREDENTIAL = "UserCredential"
        private val KEY_ID       = "id"
        private val KEY_DIS_NAME = "display_name"
        private val KEY_USERNAME = "username"
        private val KEY_PASSWORD = "password"
        private val KEY_URL = "url"
        private val TABLE_AUTOFILL_FLAG = "AutofillFlag"
        private val KEY_AUTO_ID = "id"
        private val KEY_AUTO_VALID = "valid"
        private val KEY_AUTO_KEY = "key_session"
    }

}