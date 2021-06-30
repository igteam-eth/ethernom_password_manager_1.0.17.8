//
//  CoreDataStack.swift
//  AutofillExtension
//
//  Created by Admin on 7/8/20.
//  Copyright © 2020 Facebook. All rights reserved.
//

import Foundation
import UIKit
import CoreData
// init Core data
//=========================
public class CoreDataStack: NSObject {
  static var share = CoreDataStack()
  static let moduleName = "EthernomCoreData"
  static let groupName = "group.com.ethernom.password.manager.mobile"
  
  lazy var manageObjectModel: NSManagedObjectModel = {
    let url = Bundle.main.url(forResource: CoreDataStack.moduleName, withExtension: ".momd")!
    
    return NSManagedObjectModel(contentsOf: url)!
  }()
  
  lazy var persistentContainer: NSPersistentContainer = {
    
    let modelURL = Bundle(for: type(of: self)).url(forResource: CoreDataStack.moduleName, withExtension:"momd")
    
    let mom = NSManagedObjectModel(contentsOf: modelURL!)
    let container =  NSPersistentContainer(name: CoreDataStack.moduleName, managedObjectModel: mom!)
    
    var persistentStoreDescriptions: NSPersistentStoreDescription
    let storeUrl =  FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: CoreDataStack.groupName)!.appendingPathComponent("\(CoreDataStack.moduleName).sqlite")
    
    let description = NSPersistentStoreDescription()
    description.shouldInferMappingModelAutomatically = true
    description.shouldMigrateStoreAutomatically = true
    description.url = storeUrl
    
    container.persistentStoreDescriptions = [NSPersistentStoreDescription(url:  FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: CoreDataStack.groupName)!.appendingPathComponent("\(CoreDataStack.moduleName).sqlite"))]
    
    container.loadPersistentStores(completionHandler: { (storeDescription, error) in
      if let error = error as NSError? {
        fatalError("Unresolved error \(error), \(error.userInfo)")
      }
    })
    return container
  }()
  
  
}

