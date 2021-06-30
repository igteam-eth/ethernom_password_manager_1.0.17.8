//
//  AutoFillView.swift
//  AutofillExtension
//
//  Created by Admin on 7/16/20.
//  Copyright © 2020 Facebook. All rights reserved.
//

import UIKit
class AutoFillView: UIView{
 
  override init(frame: CGRect) {
    super.init(frame: frame)
    setupView()
  }
  
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }
  
  
  func setupView(){
    addSubview(search_bar)
    addSubview(credTable)
    addSubview(navigationBar)
    addSubview(connectView)
    addSubview(pinView)
    
    
    NSLayoutConstraint.activate([
      navigationBar.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 0),
      navigationBar.leftAnchor.constraint(equalTo: leftAnchor, constant: 0),
      navigationBar.rightAnchor.constraint(equalTo: rightAnchor, constant: 0),
      navigationBar.heightAnchor.constraint(equalToConstant: 44),
      
      search_bar.topAnchor.constraint(equalTo: navigationBar.bottomAnchor, constant: 10),
      search_bar.leftAnchor.constraint(equalTo: leftAnchor, constant: 0),
      search_bar.rightAnchor.constraint(equalTo: rightAnchor, constant: 0),
      search_bar.heightAnchor.constraint(equalToConstant: 50),
      
      credTable.topAnchor.constraint(equalTo: search_bar.bottomAnchor, constant: 5),
      credTable.leftAnchor.constraint(equalTo: leftAnchor, constant: 0),
      credTable.rightAnchor.constraint(equalTo: rightAnchor, constant: 0),
      credTable.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -10),
      
      connectView.topAnchor.constraint(equalTo: navigationBar.bottomAnchor, constant: 10),
      connectView.leftAnchor.constraint(equalTo: leftAnchor, constant: 0),
      connectView.rightAnchor.constraint(equalTo: rightAnchor, constant: 0),
      connectView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -10),
      
      pinView.topAnchor.constraint(equalTo: navigationBar.bottomAnchor, constant: 10),
      pinView.leftAnchor.constraint(equalTo: leftAnchor, constant: 0),
      pinView.rightAnchor.constraint(equalTo: rightAnchor, constant: 0),
      pinView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -10),
      
    ])
    
  }
  
  lazy var navigationBar: UINavigationBar = {
    let navBar = UINavigationBar()
    navBar.translatesAutoresizingMaskIntoConstraints = false
    return navBar
  }()
  lazy var credTable: UITableView = {
    let tableview = UITableView()
    tableview.isHidden = true
    tableview.translatesAutoresizingMaskIntoConstraints = false
    return tableview
  }()
  lazy var search_bar: UISearchBar = {
    let search_bar = UISearchBar()
    search_bar.translatesAutoresizingMaskIntoConstraints = false
    return search_bar
  }()
  
  lazy var line: UIView = {
    let line = UIView()
    line.translatesAutoresizingMaskIntoConstraints = false
    return line
  }()
  
  lazy var connectView: ConnectView = {
    let view = ConnectView()
    view.translatesAutoresizingMaskIntoConstraints = false
    return view
  }()
  
  lazy var pinView: PinCodeView = {
    let view = PinCodeView()
    view.translatesAutoresizingMaskIntoConstraints = false
    return view
  }()
  
}

class ConnectView: UIView{
  override init(frame: CGRect) {
    super.init(frame: frame)
    addSubview(imageView)
    addSubview(status_label)
    imageView.centerYAnchor.constraint(equalTo: centerYAnchor, constant: -100).isActive = true
    imageView.centerXAnchor.constraint(equalTo: centerXAnchor, constant: 0).isActive = true
    imageView.widthAnchor.constraint(equalToConstant: 350).isActive = true
    imageView.heightAnchor.constraint(equalToConstant: 350).isActive = true
    
    status_label.topAnchor.constraint(equalTo: imageView.bottomAnchor, constant: -30).isActive = true
    status_label.centerXAnchor.constraint(equalTo: centerXAnchor, constant: 0).isActive = true
  }
  
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }
  
  lazy var imageView: UIImageView = {
    let image = UIImageView()
    image.translatesAutoresizingMaskIntoConstraints = false
    image.image = UIImage(named: "connecting")
    image.contentMode = .scaleAspectFit
    image.layer.masksToBounds = true
    return image
  }()
  lazy var status_label: UILabel = {
    let label = UILabel()
    label.translatesAutoresizingMaskIntoConstraints = false
    label.numberOfLines = 0
    label.textAlignment = .center
    label.font = UIFont.systemFont(ofSize: 16, weight: .thin)
    return label
  }()
}

class PinCodeView: UIView{
  
  var pinLayoutLeft:NSLayoutConstraint?
  var pinLayoutRight:NSLayoutConstraint?
  
  override init(frame: CGRect) {
    super.init(frame: frame)
    setupView()
  }
  
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }
  
  func setupView(){
    addSubview(descriptionLabel)
    addSubview(authLabel)
    addSubview(wrongPin)
    addSubview(pinView)
    pinView.addSubview(pinCodeTextField)
 
    authLabel.topAnchor.constraint(equalTo: topAnchor, constant: 20).isActive = true
    authLabel.centerXAnchor.constraint(equalTo: centerXAnchor, constant: 0).isActive = true
    
    wrongPin.topAnchor.constraint(equalTo: authLabel.bottomAnchor, constant: 15).isActive = true
    wrongPin.centerXAnchor.constraint(equalTo: centerXAnchor, constant: 0).isActive = true
    
    descriptionLabel.topAnchor.constraint(equalTo: wrongPin.bottomAnchor, constant: 15).isActive = true
    descriptionLabel.centerXAnchor.constraint(equalTo: centerXAnchor, constant: 0).isActive = true
    descriptionLabel.leftAnchor.constraint(equalTo: leftAnchor, constant: 20).isActive = true
    descriptionLabel.rightAnchor.constraint(equalTo: rightAnchor, constant: -20).isActive = true
    
    pinView.topAnchor.constraint(equalTo: descriptionLabel.bottomAnchor, constant: 10).isActive = true
    pinView.centerXAnchor.constraint(equalTo: centerXAnchor, constant: 0).isActive = true
    pinLayoutLeft = pinView.leftAnchor.constraint(equalTo: leftAnchor, constant: 0)
    pinLayoutLeft?.isActive = true
    pinLayoutRight = pinView.rightAnchor.constraint(equalTo: rightAnchor, constant: 0)
    pinLayoutRight?.isActive = true
    pinView.heightAnchor.constraint(equalToConstant: 80).isActive = true
    
    pinCodeTextField.topAnchor.constraint(equalTo: pinView.topAnchor, constant: 20).isActive = true
    pinCodeTextField.centerXAnchor.constraint(equalTo: pinView.centerXAnchor, constant: 0).isActive = true
    pinCodeTextField.bottomAnchor.constraint(equalTo: pinView.bottomAnchor, constant: -20).isActive = true
    pinCodeTextField.leftAnchor.constraint(equalTo: pinView.leftAnchor, constant: 20).isActive = true
    pinCodeTextField.rightAnchor.constraint(equalTo: pinView.rightAnchor, constant: -20).isActive = true
    
  }
  
  lazy var pinView: UIView = {
    let view = UIView()
    view.translatesAutoresizingMaskIntoConstraints = false
    return view
  }()
  lazy var pinCodeTextField: PinCodeTextField = {
    let view = PinCodeTextField()
    view.translatesAutoresizingMaskIntoConstraints = false
    view.underlineWidth = 50
    view.underlineHSpacing = 2
    view.underlineVMargin = 5
    view.underlineHeight = 1
    view.fontSize = 28
    view.underlineColor = .gray
    view.textColor = .white
    view.updatedUnderlineColor = .gray
    
    return view
  }()
  
  lazy var authLabel: UILabel = {
    let label = UILabel()
    label.translatesAutoresizingMaskIntoConstraints = false
    label.numberOfLines = 0
    label.textAlignment = .center
    label.text = "Authentication"
    label.font = UIFont.systemFont(ofSize: 20, weight: .bold)
    label.textColor = .black
    return label
  }()
  
  lazy var wrongPin: UILabel = {
    let label = UILabel()
    label.translatesAutoresizingMaskIntoConstraints = false
    label.numberOfLines = 0
    label.textAlignment = .center
    label.text = "Error! Wrong PIN"
    label.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
    label.textColor = .red
    return label
  }()
  lazy var descriptionLabel: UILabel = {
    let label = UILabel()
    label.translatesAutoresizingMaskIntoConstraints = false
    label.numberOfLines = 0
    label.textAlignment = .center
    label.text = "Please enter the 6 digit PIN code that appear on your device screen."
    label.font = UIFont.systemFont(ofSize: 16, weight: .thin)
    return label
  }()
  
}

