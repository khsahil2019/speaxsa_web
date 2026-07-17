import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../core/constants/app_colors.dart';

class StudentClassroomWebView extends StatefulWidget {
  const StudentClassroomWebView({super.key});

  @override
  State<StudentClassroomWebView> createState() => _StudentClassroomWebViewState();
}

class _StudentClassroomWebViewState extends State<StudentClassroomWebView> {
  late final WebViewController _controller;
  bool _isLoading = true;
  final String _title = 'Live Classroom';
  String _url = '';

  @override
  void initState() {
    super.initState();
    _url = Get.arguments as String? ?? '';
    _initWebView();
    _requestPermissions();
  }

  Future<void> _requestPermissions() async {
    try {
      final cameraStatus = await Permission.camera.request();
      final micStatus = await Permission.microphone.request();
      
      if (cameraStatus.isDenied || micStatus.isDenied) {
        Get.snackbar(
          'Permissions Warning',
          'Camera and Microphone permissions are highly recommended for interactive live classes.',
          backgroundColor: Colors.orange.withOpacity(0.9),
          colorText: Colors.white,
          duration: const Duration(seconds: 5),
        );
      }
    } catch (e) {
      debugPrint('[Permission] Error requesting permissions: $e');
    }
  }

  void _initWebView() {
    _controller = WebViewController(
      onPermissionRequest: (WebViewPermissionRequest request) {
        request.grant();
      },
    )
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            // Update loading state
          },
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('[WebView Error] code: ${error.errorCode}, description: ${error.description}');
          },
        ),
      );

    if (_url.isNotEmpty) {
      _controller.loadRequest(Uri.parse(_url));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        backgroundColor: isDark ? AppColors.darkCard : Colors.white,
        foregroundColor: isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B),
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () async {
            // Confirm leaving the live class
            final shouldLeave = await _showLeaveConfirmationDialog(context);
            if (shouldLeave == true) {
              if (mounted) {
                Navigator.of(context).pop();
              }
            }
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _controller.reload();
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            ),
        ],
      ),
    );
  }

  Future<bool?> _showLeaveConfirmationDialog(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Leave Class?'),
          content: const Text('Are you sure you want to exit the live classroom? You will be disconnected from the video conference.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
              ),
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Leave'),
            ),
          ],
        );
      },
    );
  }
}
