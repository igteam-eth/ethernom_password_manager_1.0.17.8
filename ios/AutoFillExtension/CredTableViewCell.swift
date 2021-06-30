//
//  CredTableViewCell.swift
//  AutofillExtension
//
//  Created by Admin on 7/14/20.
//  Copyright © 2020 Facebook. All rights reserved.
//

import UIKit
class CredTableViewCell: UITableViewCell{
  
  override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
    super.init(style: style, reuseIdentifier: reuseIdentifier)
    
    setupView()
  }
  
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }
  
  func setupView(){
    addSubview(urlLabel)
    addSubview(usernameLabel)
    
    urlLabel.topAnchor.constraint(equalTo: topAnchor, constant: 6).isActive = true
    urlLabel.leftAnchor.constraint(equalTo: leftAnchor, constant: 10).isActive = true
    
    usernameLabel.topAnchor.constraint(equalTo: urlLabel.bottomAnchor, constant: 10).isActive = true
    usernameLabel.leftAnchor.constraint(equalTo: leftAnchor, constant: 10).isActive = true
  }
  
  lazy var urlLabel: UILabel = {
    let label = UILabel()
    label.translatesAutoresizingMaskIntoConstraints = false
    label.text = "Url"
    return label
  }()
  lazy var usernameLabel: UILabel = {
    let label = UILabel()
    label.translatesAutoresizingMaskIntoConstraints = false
    label.text = "username"
    return label
  }()
}
class etherCustomCellView : UITableViewCell{
  override func awakeFromNib() {
    super.awakeFromNib()
  }
  
  override func setSelected(_ selected: Bool, animated: Bool) {
    super.setSelected(selected, animated: animated)
  }
}
