//
//  DatabaseHandler.swift
//  EthernomPasswordManagerMobile
//
//  Created by Admin on 7/10/20.
//  Copyright © 2020 Facebook. All rights reserved.
//

import Foundation
import CoreData
import AVFoundation
public class CoreDataModel: Codable {
  var url: String?
  var password: String?
  var username: String?
  var name: String?
  var key: String?
}
class DatabaseHandler {
  static var sharedInstance = DatabaseHandler()
  var ETHERNOM_PERSISTANCE = "EthCreds"
  var AUTOFILL_FLAG = "AutofillFlag"
  
  let context = CoreDataStack.share.persistentContainer.viewContext
  func getCredetails() {
    
    let fetch = NSFetchRequest<NSFetchRequestResult>(entityName: ETHERNOM_PERSISTANCE)
    fetch.returnsObjectsAsFaults = false
    do {
      
      let result = try context.fetch(fetch)
      print("result \(result)")
      
      for data in result as! [NSManagedObject] {
        
        print("data \(data)")
      }
    } catch {
      print("Failed")
    }
  }
  
  
  func saveUserData(_ accounts: [CoreDataModel]) {
    if let entity = NSEntityDescription.entity(forEntityName: ETHERNOM_PERSISTANCE, in: context) {
      
      deleteAllAccount()
      
      for account in accounts {
        let cred = EthCreds(entity: entity, insertInto: context)
        
        cred.setValue("", forKey: "key")
        cred.setValue(account.key, forKey: "name")
        cred.setValue(account.url, forKey: "url")
        cred.setValue(account.username, forKey: "username")
        cred.setValue(account.password, forKey: "password")
      }
      
      self.saveContext("Save all account")
    }
    
  }
  
  func saveSingleAccount(_ account: CoreDataModel) {
    if let entity = NSEntityDescription.entity(forEntityName: ETHERNOM_PERSISTANCE, in: context) {
      
      let cred = EthCreds(entity: entity, insertInto: context)
      
      cred.setValue("", forKey: "key")
      cred.setValue(account.key, forKey: "name")
      cred.setValue(account.url, forKey: "url")
      cred.setValue(account.username, forKey: "username")
      cred.setValue(account.password, forKey: "password")
      
      self.saveContext("Add single account")
      
    }
    
  }
  
  func deleteAllAccount(){
    
    let fetchRequest = NSFetchRequest<NSManagedObject>(entityName: ETHERNOM_PERSISTANCE)
    do{
      let result = try context.fetch(fetchRequest)
      for object in result {
        context.delete(object)
      }
      
    }catch let error as NSError {
      print("error \(error)")
    }
    
    self.saveContext("Delete all account")
    
  }
  
  func deleteSingleAccount(_ username: String, _ url: String){
    let fetch = NSFetchRequest<NSManagedObject>(entityName: ETHERNOM_PERSISTANCE)
    let predicate = NSPredicate(format: "username == %@ AND url == %@", username, url)
    
    fetch.predicate = predicate
    
    do{
      let result = try context.fetch(fetch)
      
      for object in result {
        context.delete(object)
      } 
      
    }catch let error as NSError{
      print("error \(error)")
    }
    
    self.saveContext("Delete")
  
  }
  
  func updateAutofillFlag(_ flag: String){
    if let entity = NSEntityDescription.entity(forEntityName: AUTOFILL_FLAG, in: context) {
      
      removeFlag()
      let result = AutofillFlag(entity: entity, insertInto: context)
      result.setValue(flag, forKey: "flag")
      
      self.saveContext("Update flag")
      
    }
  }
  func removeFlag(){
    
    let fetchRequest = NSFetchRequest<NSManagedObject>(entityName: AUTOFILL_FLAG)
    do{
      let result = try context.fetch(fetchRequest)
      for object in result {
        context.delete(object)
      }
      
    }catch let error as NSError {
      print("error \(error)")
    }
    
    self.saveContext("Delete all account")
    
  }
   // MARK: - Core Data Saving support
  func saveContext(_ msg: String){
    if context.hasChanges {
      do {
        try context.save()
        
        print("\(msg) Successfully")
      } catch {
        let nserror = error as NSError
        fatalError("Unresolved error \(nserror), \(nserror.userInfo)")
      }
    }
  }
  
  
  
}
