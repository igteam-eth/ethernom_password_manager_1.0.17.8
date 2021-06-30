//
//  HelloWorld.m
//  EthernomPasswordManagerMobile
//
//  Created by Admin on 7/10/20.
//  Copyright © 2020 Facebook. All rights reserved.
//


#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"
#import "React/RCTEventEmitter.h"

@interface RCT_EXTERN_MODULE(HelloWorld, NSObject)

RCT_EXTERN_METHOD(addAccount: (NSString*) jsonString error:(RCTResponseSenderBlock)errorCallback success:(RCTResponseSenderBlock *)successCallback)
RCT_EXTERN_METHOD(addSingleAccount: (NSString*) jsonString error:(RCTResponseSenderBlock)errorCallback success:(RCTResponseSenderBlock *)successCallback)

RCT_EXTERN_METHOD(deleteSingleAccount: (NSString*) jsonString error:(RCTResponseSenderBlock)errorCallback success:(RCTResponseSenderBlock *)successCallback)
RCT_EXTERN_METHOD(updateAutofillFlag: (NSString*) flag error:(RCTResponseSenderBlock)errorCallback success:(RCTResponseSenderBlock *)successCallback)


@end

