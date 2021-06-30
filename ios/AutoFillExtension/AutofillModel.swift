//
//  AutofillModel.swift
//  EthernomPasswordManagerMobile
//
//  Created by Admin on 7/15/20.
//  Copyright © 2020 Facebook. All rights reserved.
//

import UIKit
struct EtherCred{
  var username:String
  var server:String
  var password:String
}

struct CredModel: Codable {
  var key: String?
  var name: String?
  var password: String?
  var url: String?
  var username: String?
  
}
