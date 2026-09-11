//
//  Generated file. Do not edit.
//

// clang-format off

#import "GeneratedPluginRegistrant.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-performSelector-leaks"

@implementation GeneratedPluginRegistrant

+ (void)registerWithRegistry:(NSObject<FlutterPluginRegistry>*)registry {
  NSArray<NSString *> *pluginClassNames = @[
    @"FilePickerPlugin",
    @"FLTFirebaseAnalyticsPlugin",
    @"FirebaseAnalyticsPlugin",
    @"FLTFirebaseCorePlugin",
    @"FLTFirebaseCrashlyticsPlugin",
    @"FLTFirebaseMessagingPlugin",
    @"FlutterSecureStorageDarwinPlugin",
    @"FlutterSecureStoragePlugin",
    @"FPPSharePlusPlugin",
    @"SharePlusPlugin",
    @"SharedPreferencesPlugin",
    @"FLTSharedPreferencesPlugin",
    @"SqflitePlugin",
    @"URLLauncherPlugin",
    @"FLTURLLauncherPlugin"
  ];

  for (NSString *className in pluginClassNames) {
    Class cls = NSClassFromString(className);
    if (cls && [cls respondsToSelector:@selector(registerWithRegistrar:)]) {
      [cls performSelector:@selector(registerWithRegistrar:) withObject:[registry registrarForPlugin:className]];
    }
  }
}

@end

#pragma clang diagnostic pop
