//
//  Generated file. Do not edit.
//

// clang-format off

#import "GeneratedPluginRegistrant.h"

#if __has_include(<file_picker/file_picker-Swift.h>)
#import <file_picker/file_picker-Swift.h>
#elif __has_include(<file_picker/FilePickerPlugin.h>)
#import <file_picker/FilePickerPlugin.h>
#elif __has_include("FilePickerPlugin.h")
#import "FilePickerPlugin.h"
#endif

#if __has_include(<firebase_analytics/FirebaseAnalyticsPlugin.h>)
#import <firebase_analytics/FirebaseAnalyticsPlugin.h>
#elif __has_include("FirebaseAnalyticsPlugin.h")
#import "FirebaseAnalyticsPlugin.h"
#endif

#if __has_include(<firebase_core/FLTFirebaseCorePlugin.h>)
#import <firebase_core/FLTFirebaseCorePlugin.h>
#elif __has_include("FLTFirebaseCorePlugin.h")
#import "FLTFirebaseCorePlugin.h"
#endif

#if __has_include(<firebase_crashlytics/FLTFirebaseCrashlyticsPlugin.h>)
#import <firebase_crashlytics/FLTFirebaseCrashlyticsPlugin.h>
#elif __has_include("FLTFirebaseCrashlyticsPlugin.h")
#import "FLTFirebaseCrashlyticsPlugin.h"
#endif

#if __has_include(<firebase_messaging/FLTFirebaseMessagingPlugin.h>)
#import <firebase_messaging/FLTFirebaseMessagingPlugin.h>
#elif __has_include("FLTFirebaseMessagingPlugin.h")
#import "FLTFirebaseMessagingPlugin.h"
#endif

#if __has_include(<flutter_secure_storage_darwin/FlutterSecureStorageDarwinPlugin.h>)
#import <flutter_secure_storage_darwin/FlutterSecureStorageDarwinPlugin.h>
#elif __has_include("FlutterSecureStorageDarwinPlugin.h")
#import "FlutterSecureStorageDarwinPlugin.h"
#endif

#if __has_include(<share_plus/FPPSharePlusPlugin.h>)
#import <share_plus/FPPSharePlusPlugin.h>
#elif __has_include("FPPSharePlusPlugin.h")
#import "FPPSharePlusPlugin.h"
#endif

#if __has_include(<shared_preferences_foundation/SharedPreferencesPlugin.h>)
#import <shared_preferences_foundation/SharedPreferencesPlugin.h>
#elif __has_include("SharedPreferencesPlugin.h")
#import "SharedPreferencesPlugin.h"
#endif

#if __has_include(<sqflite_darwin/SqflitePlugin.h>)
#import <sqflite_darwin/SqflitePlugin.h>
#elif __has_include("SqflitePlugin.h")
#import "SqflitePlugin.h"
#endif

#if __has_include(<url_launcher_ios/URLLauncherPlugin.h>)
#import <url_launcher_ios/URLLauncherPlugin.h>
#elif __has_include("URLLauncherPlugin.h")
#import "URLLauncherPlugin.h"
#endif

@class FilePickerPlugin;
@class FirebaseAnalyticsPlugin;
@class FLTFirebaseCorePlugin;
@class FLTFirebaseCrashlyticsPlugin;
@class FLTFirebaseMessagingPlugin;
@class FlutterSecureStorageDarwinPlugin;
@class FPPSharePlusPlugin;
@class SharedPreferencesPlugin;
@class SqflitePlugin;
@class URLLauncherPlugin;

@implementation GeneratedPluginRegistrant

+ (void)registerWithRegistry:(NSObject<FlutterPluginRegistry>*)registry {
  [FilePickerPlugin registerWithRegistrar:[registry registrarForPlugin:@"FilePickerPlugin"]];
  [FirebaseAnalyticsPlugin registerWithRegistrar:[registry registrarForPlugin:@"FirebaseAnalyticsPlugin"]];
  [FLTFirebaseCorePlugin registerWithRegistrar:[registry registrarForPlugin:@"FLTFirebaseCorePlugin"]];
  [FLTFirebaseCrashlyticsPlugin registerWithRegistrar:[registry registrarForPlugin:@"FLTFirebaseCrashlyticsPlugin"]];
  [FLTFirebaseMessagingPlugin registerWithRegistrar:[registry registrarForPlugin:@"FLTFirebaseMessagingPlugin"]];
  [FlutterSecureStorageDarwinPlugin registerWithRegistrar:[registry registrarForPlugin:@"FlutterSecureStorageDarwinPlugin"]];
  [FPPSharePlusPlugin registerWithRegistrar:[registry registrarForPlugin:@"FPPSharePlusPlugin"]];
  [SharedPreferencesPlugin registerWithRegistrar:[registry registrarForPlugin:@"SharedPreferencesPlugin"]];
  [SqflitePlugin registerWithRegistrar:[registry registrarForPlugin:@"SqflitePlugin"]];
  [URLLauncherPlugin registerWithRegistrar:[registry registrarForPlugin:@"URLLauncherPlugin"]];
}


@end
