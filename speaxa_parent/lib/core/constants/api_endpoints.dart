class ApiEndpoints {
  // Base Production URL for Speaxa domain
  static const String localAndroidBaseUrl = 'http://10.0.2.2:5002/api';
  static const String localIosBaseUrl = 'http://localhost:5002/api';
  static const String productionBaseUrl = 'https://speaxa.in/api';

  static String get baseUrl => productionBaseUrl;

  static const String localAndroidSocketUrl = 'http://10.0.2.2:5002';
  static const String localIosSocketUrl = 'http://localhost:5002';
  static const String productionSocketUrl = 'https://speaxa.in';

  static String get socketUrl => productionSocketUrl;

  // Auth Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String sendOtp = '/auth/send-otp';
  static const String verifyOtp = '/auth/verify-otp';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String changePassword = '/auth/change-password';
  static const String profile = '/auth/profile';
  static const String uploadAvatar = '/auth/upload-avatar';
  static const String fcmToken = '/auth/fcm-token';
  static const String logout = '/auth/logout';

  // Public Endpoints (Configured from Admin Panel)
  static const String publicCourses = '/public/courses';
  static const String publicTeachers = '/public/teachers';
  static const String publicStats = '/public/stats';
  static const String publicAdminSettings = '/admin/settings/public';

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
  
  // Teacher Endpoints
  static const String teacherDashboard = '/teacher/dashboard';
  static const String teacherAnalytics = '/teacher/analytics';
  static const String teacherSop = '/teacher/sop';
  static const String updateSop = '/teacher/update-sop';
  static const String signAgreement = '/teacher/sign-agreement';
  static const String teacherBatches = '/teacher/batches';
  static const String createBatch = '/teacher/create-batch';
  static const String teacherWallet = '/teacher/wallet';
  static const String requestPayout = '/teacher/request-payout';
  static const String teacherDocuments = '/teacher/documents';
  static const String uploadKycDocument = '/teacher/upload-kyc';

  // Parent Endpoints
  static const String parentDashboard = '/parent/dashboard';
  static const String parentLinkChild = '/parent/link-child';
  static const String parentChildren = '/parent/children';
  static const String linkedChildren = '/parent/linked-children';
  static String childOverview(String studentId) => '/parent/children/$studentId/overview';
  static String childAttendance(String studentId) => '/parent/children/$studentId/attendance';
  static String childAssignments(String studentId) => '/parent/children/$studentId/assignments';
  static String childReports(String studentId) => '/parent/children/$studentId/reports';
  static const String parentMessages = '/parent/connect/messages';
  static const String sendMessageToTeacher = '/parent/send-message';
  static String childObservations(String studentId) => '/parent/children/$studentId/observations';

  // Live Classes & Payments
  static const String activeLiveClasses = '/live-classes/active';
  static String joinLiveClass(String classId) => '/live-classes/$classId/join';
  static const String createPaymentOrder = '/payments/create-order';
  static const String verifyPayment = '/payments/verify';
}
