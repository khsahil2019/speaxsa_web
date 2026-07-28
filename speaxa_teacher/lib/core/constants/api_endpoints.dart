import 'package:flutter/foundation.dart';

class ApiEndpoints {
  // Production vs Staging Environment Toggle
  // Set isProduction = true when publishing live to Play Store!
  static const bool isProduction = false;

  static const String stagingBaseUrl = 'https://staging.speaxa.in/api';
  static const String productionBaseUrl = 'https://speaxa.in/api';

  static String get baseUrl {
    return isProduction ? productionBaseUrl : stagingBaseUrl;
  }

  static const String stagingSocketUrl = 'https://staging.speaxa.in';
  static const String productionSocketUrl = 'https://speaxa.in';

  static String get socketUrl {
    return isProduction ? productionSocketUrl : stagingSocketUrl;
  }

  // Auth Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String sendMobileOtp = '/auth/send-mobile-otp';
  static const String verifyMobileOtp = '/auth/verify-mobile-otp';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String changePassword = '/auth/change-password';
  static const String profile = '/auth/profile';
  static const String uploadAvatar = '/auth/upload-avatar';
  static const String fcmToken = '/auth/fcm-token';
  static const String logout = '/auth/logout';

  // Teacher Core Endpoints
  static const String teacherDashboard = '/teacher/dashboard';
  static const String teacherAnalytics = '/teacher/analytics';
  static const String teacherBatches = '/teacher/batches';
  static String teacherBatchDetails(String batchId) => '/teacher/batches/$batchId';
  static const String teacherStudents = '/teacher/students';
  static const String teacherLiveClasses = '/teacher/live-classes';
  static String teacherLiveClassDetails(String classId) => '/teacher/live-classes/$classId';
  static String endLiveClass(String classId) => '/live-classes/$classId/end';
  static String startLiveClass(String classId) => '/live-classes/$classId/start';
  static String createLivePoll(String classId) => '/live-classes/$classId/polls';
  static String pollResults(String pollId) => '/live-classes/polls/$pollId/results';

  // Attendance & Observations
  static const String teacherAttendance = '/teacher/attendance';
  static const String saveAttendance = '/attendance';
  static const String saveObservations = '/teacher/observations';

  // Assignments & Homework
  static const String teacherAssignments = '/teacher/assignments';
  static String assignmentSubmissions(String assignmentId) => '/teacher/assignments/$assignmentId/submissions';
  static const String gradeAssignment = '/teacher/assignments/grade';

  // Passbook, Wallet & Payouts
  static const String teacherWallet = '/teacher/wallet';
  static const String requestPayout = '/teacher/wallet/payout-request';
  static const String emailPassbookStatement = '/teacher/email-passbook-statement';

  // SOPs & Governance
  static const String teacherSop = '/teacher/sop';
  static const String updateSop = '/teacher/update-sop';
  static const String acceptSopAgreement = '/teacher/sop/accept';
  static const String teacherDocuments = '/teacher/documents';

  // Connect Messaging
  static const String teacherConnectThreads = '/teacher/connect/threads';
  static const String teacherConnectMessages = '/teacher/connect/messages';

  // Student Endpoints
  static const String studentCourses = '/student/courses';
  static const String studentBatches = '/student/batches';
  static const String studentMyBatches = '/student/my-batches';
  static String enrollBatch(String batchId) => '/student/batches/$batchId/enroll';
  static const String studentAttendance = '/student/attendance';
  static const String studentAssignments = '/student/assignments';
  static String submitAssignment(String assignmentId) => '/student/assignments/$assignmentId/submit';
  static const String studentReports = '/student/reports';
  static const String studentNotifications = '/student/notifications';
  static const String parentRequests = '/student/parent-requests';
  static const String respondParentRequest = '/student/respond-parent-request';

  // Parent Endpoints
  static const String parentDashboard = '/parent/dashboard';
  static const String parentLinkChild = '/parent/link-child';
  static const String parentChildren = '/parent/children';
  static const String linkedChildren = '/parent/linked-children';
  static String childOverview(String studentId) => '/parent/children/$studentId/overview';
  static String childAttendance(String studentId) => '/parent/children/$studentId/attendance';
  static String childAssignments(String studentId) => '/parent/children/$studentId/assignments';
  static String childReports(String studentId) => '/parent/children/$studentId/reports';
  static const String parentMessages = '/parent/messages';
  static const String sendMessageToTeacher = '/parent/send-message';
}
