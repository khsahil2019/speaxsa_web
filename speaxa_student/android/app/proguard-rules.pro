# ProGuard / R8 Rules for Speaxa Student App
-keep class com.speaxa.student.** { *; }

# Ignore warnings for Flutter Play Store Deferred Components (SplitInstall)
-dontwarn com.google.android.play.core.**
-dontwarn io.flutter.embedding.engine.deferredcomponents.**

# Flutter Engine & Wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.embedding.** { *; }

# Firebase & FCM
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Gson & Network Models
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}
