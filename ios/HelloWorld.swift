//
//  HelloWorld.swift
//  EthernomPasswordManagerMobile
//
//  Created by Admin on 7/10/20.
//  Copyright © 2020 Facebook. All rights reserved.
//

import Foundation
import UIKit
import CoreData
@objc(HelloWorld)
class HelloWorld :NSObject  {
 
  typealias CompletionHandler = (_ msg:Bool) -> Void
  
  @objc func addAccount(_ jsonString: String, error: CompletionHandler, success: CompletionHandler) {

    let jsonData = Data(jsonString.utf8)
    let decoder = JSONDecoder()
    
    do {
      let arrayObject = try decoder.decode([CoreDataModel].self, from: jsonData)

      DatabaseHandler.sharedInstance.saveUserData(arrayObject)
      DispatchQueue.main.async {
        DatabaseHandler.sharedInstance.getCredetails()
      }
    } catch {
      print(error.localizedDescription)
    }
  }
  
  @objc func addSingleAccount(_ jsonString: String, error: CompletionHandler, success: CompletionHandler){
    let jsonData = Data(jsonString.utf8)
    let decoder = JSONDecoder()
    do {
      let object = try decoder.decode(CoreDataModel.self, from: jsonData)

      DatabaseHandler.sharedInstance.saveSingleAccount(object)
    
    } catch {
      print(error.localizedDescription)
    }
  }
  
  @objc func deleteSingleAccount(_ jsonString: String, error: CompletionHandler, success: CompletionHandler){
    print(jsonString)
    
    let jsonData = Data(jsonString.utf8)
    let decoder = JSONDecoder()
    do {
      let object = try decoder.decode(CoreDataModel.self, from: jsonData)
    
      DatabaseHandler.sharedInstance.deleteSingleAccount(object.username ?? "", object.url ?? "")
    } catch {
      print(error.localizedDescription)
    }
  }
  
  
  @objc func updateAutofillFlag(_ flag: String, error: CompletionHandler, success: CompletionHandler){
    DatabaseHandler.sharedInstance.updateAutofillFlag(flag)
  }
}
