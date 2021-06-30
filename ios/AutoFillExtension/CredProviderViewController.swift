//
//  CredProviderViewController.swift
//  AutoFillExtension
//
//  Created by Ethernom on 8/21/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import AuthenticationServices
import KeychainAccess
import UIKit
import DomainParser
import CoreData

public var _inBackground:Bool = false
public var _terminatedByOS = false;

class CredProviderViewController: ASCredentialProviderViewController, UITableViewDelegate, UITableViewDataSource, UISearchBarDelegate{
  var Creds : [EtherCred] = []
  var filtered_Creds: [EtherCred] = []
  var domain_name:String!;
  
  static var client:PwdManager!;
  
  var host_id = String();
  var host_name = String();
  var pinCode = [String]()
  var isSubmitPIN = false
  var isFilled = false
  var _pin_length:Int = 0;
  var connecting = false
  var autoFillFlag: [AutofillFlag] = []
  var autoFillFlagText = String()
  
  var domainParser: DomainParser!
  var keychain = Keychain(service: "com.ethernom.password.manager.mobile.data.registered_peripheral", accessGroup: "group.com.ethernom.password.manager.mobile");
  
  var activityIndicator: UIActivityIndicatorView = UIActivityIndicatorView()
  var boxView: UIView = UIView()
  var textLabel: UILabel = UILabel()
  var viewOverlay = UIView()
  var alert = UIAlertController()
  let searchController = UISearchController(searchResultsController: nil)
  
  var credentialList = [CredModel]()
  var CredList = [CredModel]()
  var autofillView = AutoFillView()
  
  override func loadView() {
    super.loadView()
    view = autofillView
  }
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .white
    _inBackground = false;
    isFilled = false;
    setupSearchBar()
    setupTableView()
    domainParser = try! DomainParser()
    
    fetchRequest()
    setupInputPin()
    
    getAutoFillFlag()
    
  }
  override func viewWillDisappear(_ animated: Bool) {
    super.viewDidAppear(animated)
    disconnectFromCard()
  }
  
  override public var prefersStatusBarHidden: Bool {
    return false
  }
  
  override public var preferredStatusBarStyle: UIStatusBarStyle {
    return UIStatusBarStyle.lightContent
  }
  
  func setupSearchBar(){
    autofillView.search_bar.delegate = self
    navigationItem.searchController = searchController
    definesPresentationContext = true
    searchController.searchBar.delegate = self
    searchController.searchBar.backgroundColor = .white
    
    autofillView.navigationBar.isTranslucent = false
    autofillView.navigationBar.setBackgroundImage(UIImage(), for: .default)
    autofillView.navigationBar.shadowImage = UIImage()
    autofillView.navigationBar.barTintColor = UtilConstant.hexStringToUIColor(hex: "#cba830")
    
    
    let navItem = UINavigationItem(title: "Ethernom,Inc")
    navItem.leftBarButtonItem = UIBarButtonItem(title: "Back", style: .plain, target: self, action: #selector(handleBack))
    navItem.leftBarButtonItem?.tintColor = .black
    autofillView.navigationBar.setItems([navItem], animated: false)
    
    
  }
  
  @objc func handleBack(){
    self.extensionContext.cancelRequest(withError: NSError(domain: ASExtensionErrorDomain, code: ASExtensionError.userCanceled.rawValue))
    
  }
  
  fileprivate func setupTableView() {
    autofillView.credTable.delegate = self;
    autofillView.credTable.dataSource = self;
    self.autofillView.credTable.allowsSelectionDuringEditing = false
    self.autofillView.credTable.allowsSelection = true
    self.autofillView.credTable.separatorInset = .zero
    self.autofillView.credTable.register(CredTableViewCell.self, forCellReuseIdentifier: "cellId")
  }
  
  override func prepareCredentialList(for serviceIdentifiers: [ASCredentialServiceIdentifier]) {
    for identifiers in serviceIdentifiers{
      let type_enum = identifiers.type
      if(type_enum.rawValue == 0){
        
        var newAppName = String()
        let appName = identifiers.identifier.lowercased()
        
        if(appName.contains("paypal")){
          newAppName = "paypal.com"
        }else if(appName.contains("tiktok")){
          newAppName = "tiktok.com"
        }else if(appName.contains("netflix")){
          newAppName = "netflix.com"
        }else if(appName.contains("walmart")){
          newAppName = "walmart.com"
        }else if(appName.contains("spotify")){
          newAppName = "spotify.com"
        }else if(appName.contains("hulu")){
          newAppName = "hulu.com"
        }else if(appName.contains("pinterest")){
          newAppName = "pinterest.com"
        }else {
          newAppName = appName
        }
        
        
        autofillView.search_bar.text = newAppName
        domain_name = newAppName
        
      }else if(type_enum.rawValue == 1){
        let url = URL(string:identifiers.identifier)!
        let domain = domainParser.parse(host: url.host!)?.domain
        if(domain != nil){
          autofillView.search_bar.text = domain!.lowercased()
          domain_name = domain!.lowercased()
        }
      }
    }
    
    let value = try? keychain.getString("data")
    if(value != nil){
      
      if(autoFillFlag.count <= 0 || self.autoFillFlagText == "invalid"){
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
          
          self.autofillView.connectView.isHidden = false
          self.autofillView.pinView.isHidden = true
          self.autofillView.credTable.isHidden = true
          
          self.NoCredentialsAlert()
        }
      }else {
        
        //initPwd(value: value!)
        
        completOperation()
      }
      
    }else{
      autofillView.connectView.status_label.text = "Before using the AutoFill feature, please connect your device to Password Manager.";
      autofillView.search_bar.isHidden = true
    }
  }
  func completOperation(){
    
    if(CredList.count > 0){
      var temp_filtered_Creds: [CredModel] = [];
      if(domain_name != nil){
        for creds in CredList{
          if((creds.url?.lowercased().contains(domain_name.lowercased())) == true || creds.username?.lowercased().contains(domain_name.lowercased()) ==  true){
            temp_filtered_Creds.append(creds)
          }
        }
        credentialList = temp_filtered_Creds
      }else{
        credentialList = CredList;
      }
    }
    
    DispatchQueue.main.async {
      
      self.autofillView.credTable.isHidden = false
      self.autofillView.pinView.isHidden = true
      self.autofillView.connectView.isHidden = true
      self.autofillView.search_bar.isHidden = false
      self.autofillView.credTable.reloadData()
    }
  }
  
  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    
    let cred = credentialList[indexPath.row]
    
    isFilled = true;
    
    let passwordCredential = ASPasswordCredential(user: cred.username!, password: cred.password!)
    self.extensionContext.completeRequest(withSelectedCredential: passwordCredential, completionHandler: nil)
    
    DispatchQueue.main.async {
      self.extensionContext.cancelRequest(withError: NSError(domain: ASExtensionErrorDomain, code: ASExtensionError.userCanceled.rawValue))
    }
    
  }
  
  public func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return credentialList.count
  }
  
  public func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "cellId", for: indexPath) as! CredTableViewCell
    let url = credentialList[indexPath.row].name ?? ""
    let username = credentialList[indexPath.row].username
    
    cell.urlLabel.text = url
    cell.usernameLabel.text = username
    
    cell.accessoryType = .disclosureIndicator
    cell.textLabel?.numberOfLines = 0
    cell.selectionStyle = .none
    return cell
  }
  
  func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
    return 70
  }
  
  
  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    if !autofillView.credTable.isDecelerating {
      view.endEditing(true)
      searchController.searchBar.showsCancelButton = false
    }
  }
  
  func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
    if(searchText != ""){
      var temp_filtered_Creds: [CredModel] = []
      for creds in CredList{
        if((creds.url?.lowercased().contains(searchText.lowercased())) == true || (creds.name?.lowercased().contains(searchText.lowercased())) == true){
          temp_filtered_Creds.append(creds)
        }
      }
      self.credentialList = temp_filtered_Creds
    }else{
      self.credentialList = self.CredList
    }
    self.autofillView.credTable.reloadData()
    
  }
  func searchBarTextDidBeginEditing(_ searchBar: UISearchBar) {
    self.autofillView.search_bar.showsCancelButton = true
  }
  
  func searchBarCancelButtonClicked(_ searchBar: UISearchBar) {
    self.autofillView.search_bar.showsCancelButton = false
    self.autofillView.search_bar.resignFirstResponder()
  }
  
  
}
// core data stuff
extension CredProviderViewController{
  func fetchRequest() {
    
    let fetch = NSFetchRequest<NSFetchRequestResult>(entityName: "EthCreds")
    fetch.returnsObjectsAsFaults = false
    
    let context = CoreDataStack.share.persistentContainer.viewContext
    
    do {
      let result = try context.fetch(fetch)
      for data in result as! [EthCreds] {
        
        let item = CredModel(key: data.key, name: data.name, password: data.password, url: data.url, username: data.username)
        
        self.credentialList.append(item)
        self.CredList.append(item)
        self.credentialList = self.credentialList.sorted(by: { (item1, item2) -> Bool in
          return (item1.name?.localizedCaseInsensitiveCompare(String(item2.name ?? "")) == .orderedAscending)
        })
        self.CredList = self.CredList.sorted(by: { (item1, item2) -> Bool in
          return (item1.name?.localizedCaseInsensitiveCompare(String(item2.name ?? "")) == .orderedAscending)
        })
        
      }
      
      DispatchQueue.main.async {
        self.autofillView.credTable.reloadData()
      }
      
    } catch let error as NSError{
      print("error \(error)")
    }
    
    
  }
  
  func getAutoFillFlag(){
    let fetch = NSFetchRequest<NSFetchRequestResult>(entityName: "AutofillFlag")
    fetch.returnsObjectsAsFaults = false
    let context = CoreDataStack.share.persistentContainer.viewContext
    
    do {
      
      let result = try context.fetch(fetch) as! [AutofillFlag]
      if(result.count >= 0){
        self.autoFillFlagText = result.first?.flag ?? ""
      }
      self.autoFillFlag = result
      
    } catch {
      print("Failed")
    }
  }
  
  func NoCredentialsAlert(){
    
    alert = UIAlertController(title: "No user credential", message: "Please launch Ethernom Password Manager app to Synchronize your credentials.", preferredStyle: .alert)
    
    alert.addAction(UIAlertAction(title: "Launch App", style: .default, handler: { (alert) in
      
      let app2Url: NSURL = NSURL(string: "EthernomPasswordManagerMobile://")!
      self.openURL(url: app2Url)
      
    }))
    alert.addAction(UIAlertAction(title: "Dismiss", style: .cancel, handler: { (alert) in
      self.disconnectFromCard()
      self.dismissAlert()
    }))
    
    
    self.present(alert, animated: true, completion: nil)
  }
  
  func openURL(url: NSURL) -> Bool {
    do {
      let application = try self.sharedApplication()
      return application.performSelector(inBackground: "openURL:", with: url) != nil
    }
    catch {
      return false
    }
  }
  
  func sharedApplication() throws -> UIApplication {
    var responder: UIResponder? = self
    while responder != nil {
      if let application = responder as? UIApplication {
        return application
      }
      
      responder = responder?.next
    }
    
    throw NSError(domain: "UIInputViewController+sharedApplication.swift", code: 1, userInfo: nil)
  }
}


//card connection
extension CredProviderViewController{
  func initPwd(value: String){
    
    let string_value = value
    let json_data = string_value.toJSON() as? [String:AnyObject]
    let id = json_data!["id"] as! String
    let name = json_data!["name"] as! String
    let sn = json_data!["sn"] as! String
    
    self.autofillView.connectView.status_label.text = "Searching for nearby devices...";
    self.autofillView.connectView.imageView.image = UIImage(named: "connecting")
    
    CredProviderViewController.client = PwdManager()
    CredProviderViewController.client.initPwdManager(string_id: id, string_name: name, string_sn: sn,
                                                     cardConnectionEstablished : cardConnectionEstablished,
                                                     secureCardConnectionEstablished: secureCardConnectionEstablished,
                                                     secureAppSessionEstablished: secureAppSessionEstablished,
                                                     accountFetched: accountFetched,
                                                     operationComplete: cardOperationComplete,
                                                     cardRequestEntryPin: cardRequestEntryPinCompleteHandler,
                                                     cardDisconnected: cardDisconnectedHandler,
                                                     accountFetchedWithPassword: accountFetchedWithPassword);
    
    autofillView.search_bar.isHidden = true
    getPeripheralName(name: name)
    start_scanTimeout();
  }
  @objc func handleSubmitPin() {
    CredProviderViewController.client.DoSubmitPin(pinCode : pinCode)
    isSubmitPIN = true
  }
  
  @objc func cardDisconnectedHandler(result : EtherErrorValue) {
    disconnectFromCard()
  }
  
  @objc func cardConnectionEstablished( result: EtherErrorValue){
    if result == EtherError.ETH_SUCCESS{
      print("Found card, attempt connection...")
      
      connecting = true
      dismissAlert()
      
      credentialList.removeAll();
      CredProviderViewController.client.DoStartCardAuthentication()
    }
  }
  
  @objc func secureCardConnectionEstablished(result : EtherErrorValue) {
    if result == EtherError.ETH_SUCCESS{
      let device_name = UIDevice.current.name
      let new_device_name = device_name.replacingOccurrences(of: "’", with: "'")
      if new_device_name.count > 15 {
        host_name = new_device_name.subString(from:0,to: 14);
      }else{
        host_name = new_device_name;
      }
      CredProviderViewController.client.requestAppLaunch(host_name: host_name);
    }
  }
  
  @objc func secureAppSessionEstablished(result : EtherErrorValue) {
    if result == EtherError.ETH_SUCCESS{
      DispatchQueue.main.async {
        self.autofillView.pinView.isHidden = true
        self.autofillView.connectView.isHidden = false
        self.autofillView.search_bar.isHidden = false
        self.autofillView.credTable.frame.origin.y -= 58
        self.startAnimate();
      }
      CredProviderViewController.client.RetrieveAccounts();
      
    }
  }
  
  @objc func cardRequestEntryPinCompleteHandler(){
    if isSubmitPIN == true {
      print("PIN ERROR")
      DispatchQueue.main.async {
        self.autofillView.pinView.wrongPin.isHidden = false
        self.autofillView.pinView.pinCodeTextField.text = ""
      }
    }
    
    isSubmitPIN = true;
    
    DispatchQueue.main.asyncAfter(deadline: .now()) {
      self.autofillView.pinView.isHidden = false
      self.autofillView.connectView.isHidden = true
      if (self.autofillView.pinView.pinCodeTextField.delegate?.textFieldShouldBeginEditing(self.autofillView.pinView.pinCodeTextField) ?? true) {
        let _ = self.autofillView.pinView.pinCodeTextField.becomeFirstResponder()
      }
    }
  }
  
  @objc func accountFetched(accountData : [String]) {
    let server = accountData[0]
    let username = accountData[1]
    let password = ""
    let v = EtherCred(username: username, server: server, password: password)
    Creds.append(v);
  }
  
  @objc func cardOperationComplete() {
    completOperation()
  }
  
  @objc func accountFetchedWithPassword(accountData : [String]) {
    isFilled = true;
    let passwordCredential = ASPasswordCredential(user: accountData[1], password: accountData[2])
    self.extensionContext.completeRequest(withSelectedCredential: passwordCredential, completionHandler: nil)
  }
  
  @objc func cancel(_ sender: AnyObject?) {
    isFilled = false;
    if(CredProviderViewController.client != nil){
      CredProviderViewController.client.cancelRequest()
      CredProviderViewController.client = nil
    }
    self.extensionContext.cancelRequest(withError: NSError(domain: ASExtensionErrorDomain, code: ASExtensionError.userCanceled.rawValue))
  }
  
  func disconnectFromCard() {
    isFilled = false;
    if(CredProviderViewController.client != nil){
      CredProviderViewController.client.cancelRequest();
      CredProviderViewController.client = nil
    }
    self.extensionContext.cancelRequest(withError: NSError(domain: ASExtensionErrorDomain, code: ASExtensionError.userCanceled.rawValue))
  }
  
  func start_scanTimeout(){
    DispatchQueue.main.asyncAfter(deadline: .now() + 20) {
      if(self.connecting == false){
        self.deviceNotFound()
      }
    }
  }
  
  func deviceNotFound(){
    CredProviderViewController.client.stopScan();
    
    alert = UIAlertController(title: "Error", message: "Make sure your device is powered on and authenticated. Please try again.", preferredStyle: UIAlertController.Style.alert)
    alert.addAction(UIAlertAction(title: "Okay", style: UIAlertAction.Style.default, handler: { (alert) in
      CredProviderViewController.client.startScan();
      self.start_scanTimeout();
      self.dismissAlert()
    }))
    self.present(alert, animated: true, completion: nil)
  }
  
  func dismissAlert(){
    self.alert.dismiss(animated: true, completion: nil)
  }
  
  func getPeripheralName(name: String){
    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
      self.autofillView.connectView.status_label.text = "Connecting to device...\n"
      self.autofillView.connectView.imageView.image = UIImage(named: "connecting")
    }
  }
  func randomString(length: Int) -> String {
    let letters = "abcdef0123456789"
    return String((0..<length).map{ _ in letters.randomElement()! })
  }
}
// setup UI
extension CredProviderViewController{
  func addLoadingRetrievingData() {
    
    viewOverlay.backgroundColor = UIColor.black.withAlphaComponent(0.5)
    viewOverlay.translatesAutoresizingMaskIntoConstraints = false
    viewOverlay.isHidden = true
    
    boxView.translatesAutoresizingMaskIntoConstraints = false
    boxView.isHidden = false
    
    activityIndicator = UIActivityIndicatorView(style: UIActivityIndicatorView.Style.white)
    activityIndicator.translatesAutoresizingMaskIntoConstraints = false
    
    textLabel.textColor = UIColor.white
    textLabel.font = UIFont.systemFont(ofSize: 18, weight: .thin)
    textLabel.text = "Loading: Retrieving credentials..."
    textLabel.textAlignment = .center
    textLabel.translatesAutoresizingMaskIntoConstraints = false
    textLabel.isHidden = true
    
    view.addSubview(viewOverlay)
    view.addSubview(boxView)
    boxView.addSubview(activityIndicator)
    boxView.addSubview(textLabel)
    
    NSLayoutConstraint.activate([
      viewOverlay.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 0),
      viewOverlay.rightAnchor.constraint(equalTo: view.rightAnchor, constant: 0),
      viewOverlay.topAnchor.constraint(equalTo: view.topAnchor, constant: 0),
      viewOverlay.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: 0),
      
      boxView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 0),
      boxView.rightAnchor.constraint(equalTo: view.rightAnchor, constant: 0),
      boxView.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: 0),
      boxView.heightAnchor.constraint(equalToConstant: 100),
      
      activityIndicator.centerYAnchor.constraint(equalTo: boxView.centerYAnchor, constant: -10),
      activityIndicator.centerXAnchor.constraint(equalTo: boxView.centerXAnchor, constant: 0),
      activityIndicator.widthAnchor.constraint(equalToConstant: 80),
      activityIndicator.heightAnchor.constraint(equalToConstant: 80),
      
      textLabel.centerYAnchor.constraint(equalTo: boxView.centerYAnchor, constant: 30),
      textLabel.centerXAnchor.constraint(equalTo: boxView.centerXAnchor, constant: 0),
    ])
  }
  
  func startAnimate() {
    activityIndicator.startAnimating();
    textLabel.isHidden = false
    boxView.isHidden = false
    viewOverlay.isHidden = false
  }
  
  func stopAnimate(){
    activityIndicator.stopAnimating()
    textLabel.isHidden = true
    boxView.isHidden = true
    viewOverlay.isHidden = true
  }
  
  @objc func handleDismissKeyboard(){
    view.endEditing(true)
  }
  
  fileprivate func setupInputPin() {
    autofillView.pinView.isHidden = true
    autofillView.pinView.wrongPin.isHidden = true
    
    let pin_len_keychain = Keychain(service: "com.ethernom.password.manager.mobile.pin.length", accessGroup: "group.com.ethernom.password.manager.mobile")
    let pin_length_string = try? pin_len_keychain.getString("data");
    _pin_length = Int(pin_length_string!)!;
    
    let screenSize = UIScreen.main.bounds
    let screenWidth = screenSize.width
    
    if _pin_length == 2 {
      
      if(screenWidth == 320){
        autofillView.pinView.pinLayoutLeft?.constant = 100
        autofillView.pinView.pinLayoutRight?.constant = -100
        
      }else if(screenWidth >= 768){
        autofillView.pinView.pinLayoutLeft?.constant = 200
        autofillView.pinView.pinLayoutRight?.constant = -200
      }else {
        autofillView.pinView.pinLayoutLeft?.constant = 130
        autofillView.pinView.pinLayoutRight?.constant = -130
      }
      
      
    }else if _pin_length == 4{
      
      if(screenWidth >= 768){
        autofillView.pinView.pinLayoutLeft?.constant = 150
        autofillView.pinView.pinLayoutRight?.constant = -150
      }else {
        autofillView.pinView.pinLayoutLeft?.constant = 80
        autofillView.pinView.pinLayoutRight?.constant = -80
      }
    }else {
      
      if(screenWidth >= 768){
        autofillView.pinView.pinLayoutLeft?.constant = 80
        autofillView.pinView.pinLayoutRight?.constant = -80
      }else {
        autofillView.pinView.pinLayoutLeft?.constant = 30
        autofillView.pinView.pinLayoutRight?.constant = -30
      }
    }
    
  
    autofillView.pinView.pinCodeTextField.delegate = self
    autofillView.pinView.pinCodeTextField.characterLimit = _pin_length;
    autofillView.pinView.pinCodeTextField.text = "";
    autofillView.pinView.pinCodeTextField.keyboardType = .numberPad;
    autofillView.pinView.pinCodeTextField.backgroundColor = UtilConstant.hexStringToUIColor(hex: "#424242")
    autofillView.pinView.pinCodeTextField.layer.cornerRadius = 10;
    
    autofillView.pinView.descriptionLabel.text = "Please enter the " + pin_length_string! + " digit PIN code that appears on your device screen.";
  }
}

// Pin auth
extension CredProviderViewController: PinCodeTextFieldDelegate{
  
  func textFieldValueChanged(_ textField: PinCodeTextField) {
    let value = textField.text ?? ""
    pinCode = ["\(value)"]
    
    if (textField.text!.count == _pin_length){
      
      CredProviderViewController.client.DoSubmitPin(pinCode : pinCode)
      isSubmitPIN = true
      
    }
  }
  
  func textFieldShouldEndEditing(_ textField: PinCodeTextField) -> Bool {
    return true
  }
  
  func textFieldShouldReturn(_ textField: PinCodeTextField) -> Bool {
    return true
  }
  
  func textFieldShouldBeginEditing(_ textField: PinCodeTextField) -> Bool {
    return true
  }
  
  func textFieldDidBeginEditing(_ textField: PinCodeTextField) {
    
  }
}
