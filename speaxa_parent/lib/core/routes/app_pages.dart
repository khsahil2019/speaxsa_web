import 'package:get/get.dart';
import 'app_routes.dart';
import '../../presentation/landing/views/landing_view.dart';
import '../../presentation/landing/views/portal_landing_view.dart';
import '../../presentation/landing/controllers/landing_controller.dart';
import '../../presentation/auth/controllers/auth_controller.dart';
import '../../presentation/auth/views/login_view.dart';
import '../../presentation/auth/views/register_view.dart';
import '../../presentation/auth/views/forgot_password_view.dart';
import '../../presentation/auth/views/otp_verification_view.dart';
import '../../presentation/student/controllers/student_dashboard_controller.dart';
import '../../presentation/student/views/student_dashboard_view.dart';
import '../../presentation/teacher/controllers/teacher_dashboard_controller.dart';
import '../../presentation/teacher/views/teacher_dashboard_view.dart';
import '../../presentation/parent/controllers/parent_dashboard_controller.dart';
import '../../presentation/parent/views/parent_dashboard_view.dart';
import '../../presentation/shared/views/profile_view.dart';
import '../../presentation/shared/views/notifications_view.dart';

class AppPages {
  static final pages = [
    GetPage(
      name: Routes.LANDING,
      page: () => const LandingView(),
    ),
    GetPage(
      name: Routes.PORTAL_LANDING,
      page: () => const PortalLandingView(),
      binding: BindingsBuilder(() {
        Get.lazyPut(() => LandingController());
      }),
    ),
    GetPage(
      name: Routes.LOGIN,
      page: () => const LoginView(),
      binding: BindingsBuilder(() {
        Get.lazyPut(() => AuthController());
      }),
    ),
    GetPage(
      name: Routes.REGISTER,
      page: () => const RegisterView(),
      binding: BindingsBuilder(() {
        Get.lazyPut(() => AuthController());
      }),
    ),
    GetPage(
      name: Routes.FORGOT_PASSWORD,
      page: () => const ForgotPasswordView(),
      binding: BindingsBuilder(() {
        Get.lazyPut(() => AuthController());
      }),
    ),
    GetPage(
      name: Routes.OTP_VERIFY,
      page: () => const OtpVerificationView(),
      binding: BindingsBuilder(() {
        Get.lazyPut(() => AuthController());
      }),
    ),
    GetPage(
      name: Routes.STUDENT_DASHBOARD,
      page: () => const StudentDashboardView(),
      binding: BindingsBuilder(() {
        Get.lazyPut(() => StudentDashboardController());
      }),
    ),
    GetPage(
      name: Routes.TEACHER_DASHBOARD,
      page: () => const TeacherDashboardView(),
      binding: BindingsBuilder(() {
        Get.lazyPut(() => TeacherDashboardController());
      }),
    ),
    GetPage(
      name: Routes.PARENT_DASHBOARD,
      page: () => const ParentDashboardView(),
      binding: BindingsBuilder(() {
        Get.lazyPut(() => ParentDashboardController());
      }),
    ),
    GetPage(
      name: Routes.PROFILE,
      page: () => const ProfileView(),
    ),
    GetPage(
      name: Routes.NOTIFICATIONS,
      page: () => const NotificationsView(),
    ),
  ];
}
