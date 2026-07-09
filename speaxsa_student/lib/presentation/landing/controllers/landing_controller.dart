import 'package:get/get.dart';
import '../../../data/repositories/public_repository.dart';

class LandingController extends GetxController {
  final PublicRepository _publicRepository = PublicRepository();

  final RxInt selectedTabIndex = 0.obs;
  final RxBool isLoading = false.obs;

  final RxList<dynamic> liveCourses = <dynamic>[].obs;
  final RxList<dynamic> liveTeachers = <dynamic>[].obs;
  final RxMap<String, dynamic> platformStats = <String, dynamic>{}.obs;
  final RxMap<String, dynamic> adminSettings = <String, dynamic>{}.obs;

  @override
  void onInit() {
    super.onInit();
    fetchPublicData();
  }

  Future<void> fetchPublicData() async {
    isLoading.value = true;
    try {
      final settings = await _publicRepository.getAdminSettings();
      final courses = await _publicRepository.getPublicCourses();
      final teachers = await _publicRepository.getPublicTeachers();
      final stats = await _publicRepository.getPublicStats();

      if (settings.isNotEmpty) adminSettings.assignAll(settings);
      if (courses.isNotEmpty) liveCourses.assignAll(courses);
      if (teachers.isNotEmpty) liveTeachers.assignAll(teachers);
      if (stats.isNotEmpty) platformStats.assignAll(stats);
    } catch (e) {
      // Fallback values if offline
    } finally {
      isLoading.value = false;
    }
  }

  void changeTab(int index) {
    selectedTabIndex.value = index;
  }
}
