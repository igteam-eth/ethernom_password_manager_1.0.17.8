//
//  SoundMg.m
//  EthernomBaseApp
//
//  Created by Sophak Kem on 12/26/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import <React/RCTBridgeModule.h>

@interface ExitApp : NSObject <RCTBridgeModule>
@end

@implementation ExitApp
RCT_EXPORT_MODULE();
RCT_EXPORT_METHOD(ExitApp)
{
  exit(0);
}
@end
