//
//  main.m
//  Debug-iOS
//
//  Created by John Wargo on 9/29/11.
//  Copyright McNelly SoftWorks, LLC 2011. All rights reserved.
//

#import <UIKit/UIKit.h>

int main(int argc, char *argv[]) {
    
    NSAutoreleasePool * pool = [[NSAutoreleasePool alloc] init];
    int retVal = UIApplicationMain(argc, argv, nil, @"AppDelegate");
    [pool release];
    return retVal;
}
