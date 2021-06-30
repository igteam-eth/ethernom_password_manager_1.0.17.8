package com.ethernom.psdmgr.mobile

import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.Filter
import android.widget.Filterable
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.ethernom.psdmgr.mobile.autofill.AuthActivity.EtherEntry


class ListAdapter(private val list: ArrayList<UserCredentials>, mCallback: AdapterCallback)
    : RecyclerView.Adapter<UserDataViewHolder>(),Filterable {

    var mDataCallback = mCallback;
    private var tmpUserCredentials: ArrayList<UserCredentials>? = null
    init {
        this.tmpUserCredentials = list
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UserDataViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return UserDataViewHolder(inflater, parent)
    }

    override fun onBindViewHolder(holder: UserDataViewHolder, position: Int) {
        val movie: UserCredentials = this.tmpUserCredentials!![position]
        holder.itemView.setOnClickListener {
            mDataCallback.itemClickCallBack(movie)
        }
        holder.bind(movie)
    }

    override fun getItemCount(): Int = this.tmpUserCredentials!!.size

    interface AdapterCallback {
        fun itemClickCallBack(item: UserCredentials)
    }

    override fun getFilter(): Filter {
        return object : Filter() {
            override fun performFiltering(charSequence: CharSequence): FilterResults {
                val charString = charSequence.toString()

                //Log.d("hhh", "fff : " + charString);
                if (charString.isEmpty()) {
                    tmpUserCredentials = list
                } else {
                    val filteredList = ArrayList<UserCredentials>()
                    for (row in list) {

                        // name match condition. this might differ depending on your requirement
                        // here we are looking for name or phone number match
                        if (row.display_name.toLowerCase().contains(charString.toLowerCase()) || row.username.toLowerCase().contains(charString.toLowerCase()) || row.url.contains(charSequence)) {
                            filteredList.add(row)
                        }
                    }
                    tmpUserCredentials = filteredList
                }
                val filterResults = FilterResults()
                filterResults.values = tmpUserCredentials
                return filterResults
            }

            override fun publishResults(charSequence: CharSequence, filterResults: FilterResults) {
                tmpUserCredentials =   filterResults.values as ArrayList<UserCredentials>
                notifyDataSetChanged()
            }
        }
    }
}

class UserDataViewHolder(inflater: LayoutInflater, parent: ViewGroup) :
        RecyclerView.ViewHolder(inflater.inflate(R.layout.list_item, parent, false)) {
    private var mTitleView: TextView? = null
    private var mYearView: TextView? = null


    init {
        mTitleView = itemView.findViewById(R.id.txt_username)
        mYearView = itemView.findViewById(R.id.txt_password)
    }

    fun bind(user: UserCredentials) {
        mTitleView?.text = user.display_name
        mYearView?.text = user.username
    }

}

