import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/parent_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class ChildOverviewView extends GetView<ParentDashboardController> {
  const ChildOverviewView({super.key});

  String getGrade(double score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  }

  Color getScoreColor(double score) {
    if (score >= 75) return AppColors.success;
    if (score >= 50) return AppColors.warning;
    return AppColors.error;
  }

  // ── Helper parsing methods for Charts ──────────────────────────────

  List<FlSpot> getLineChartSpots() {
    final assignments = controller.childAssignments;
    final graded = assignments
        .where((a) => a['marks_obtained'] != null && a['submitted_at'] != null)
        .toList();

    graded.sort((a, b) {
      final dateA = DateTime.tryParse(a['submitted_at'].toString()) ?? DateTime.now();
      final dateB = DateTime.tryParse(b['submitted_at'].toString()) ?? DateTime.now();
      return dateA.compareTo(dateB);
    });

    if (graded.isEmpty) {
      return const [
        FlSpot(0, 68),
        FlSpot(1, 72),
        FlSpot(2, 75),
        FlSpot(3, 78),
        FlSpot(4, 84),
      ];
    }

    return List.generate(graded.length, (index) {
      final val = double.tryParse(graded[index]['marks_obtained'].toString()) ?? 70.0;
      return FlSpot(index.toDouble(), val);
    });
  }

  List<String> getLineChartLabels() {
    final assignments = controller.childAssignments;
    final graded = assignments
        .where((a) => a['marks_obtained'] != null && a['submitted_at'] != null)
        .toList();

    graded.sort((a, b) {
      final dateA = DateTime.tryParse(a['submitted_at'].toString()) ?? DateTime.now();
      final dateB = DateTime.tryParse(b['submitted_at'].toString()) ?? DateTime.now();
      return dateA.compareTo(dateB);
    });

    if (graded.isEmpty) {
      return const ['Term 1', 'Unit 1', 'Mid-Term', 'Unit 2', 'Final Mock'];
    }

    final formatter = DateFormat('d MMM');
    return graded.map((a) {
      final date = DateTime.tryParse(a['submitted_at'].toString()) ?? DateTime.now();
      return formatter.format(date);
    }).toList();
  }

  Map<String, double> getSubjectAverages() {
    final assignments = controller.childAssignments;
    final Map<String, List<double>> groups = {};
    for (var a in assignments) {
      if (a['marks_obtained'] != null) {
        final bName = a['batch_name']?.toString() ?? 'General';
        final score = double.tryParse(a['marks_obtained'].toString()) ?? 0.0;
        groups.putIfAbsent(bName, () => []).add(score);
      }
    }

    if (groups.isEmpty) {
      return {
        'English': 80.0,
        'Mathematics': 70.0,
        'Science': 85.0,
      };
    }

    final Map<String, double> averages = {};
    groups.forEach((key, list) {
      final avg = list.reduce((a, b) => a + b) / list.length;
      averages[key] = avg;
    });
    return averages;
  }

  Map<String, double> getCognitiveData() {
    final overview = controller.childOverview.value;
    final avgObs = overview['averageObservations'] ?? {};

    double scale(dynamic val, double fallback) {
      if (val == null) return fallback;
      final n = double.tryParse(val.toString()) ?? fallback;
      if (n <= 0) return fallback;
      return n > 10 ? n / 10.0 : n;
    }

    return {
      'Curiosity': scale(avgObs['curiosity'], 7.5),
      'Focus': scale(avgObs['understanding'], 8.0),
      'Consistency': scale(avgObs['consistency'], 7.0),
      'Communication': scale(avgObs['communication'], 8.5),
      'Participation': scale(avgObs['participation'], 8.0),
      'Discipline': scale(avgObs['discipline'], 9.0),
    };
  }

  // ── Main UI Build ──────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardColor = isDark ? AppColors.darkCard : Colors.white;
    final textColor = isDark ? Colors.white : const Color(0xFF1E293B);

    return DefaultTabController(
      length: 4,
      child: Obx(() {
        final child = controller.selectedChild.value;
        if (child == null) {
          return const EmptyStateWidget(
            title: "Select a Child",
            message: "Link or select a child account to view academic performance and logs.",
          );
        }

        return Column(
          children: [
            // Child Info Banner Card
            Container(
              margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.12),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      child.name,
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "Grade: ${child.grade ?? 'N/A'}  •  Board: ${child.board ?? 'N/A'}",
                      style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13),
                    ),
                    if (child.studentCode != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          "Student Code: ${child.studentCode}",
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Tab bar for details sections
            TabBar(
              labelColor: AppColors.parentRole,
              unselectedLabelColor: Colors.grey,
              indicatorColor: AppColors.parentRole,
              indicatorWeight: 3,
              isScrollable: true,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5),
              tabs: const [
                Tab(text: "Analytics"),
                Tab(text: "Grades & Batches"),
                Tab(text: "Tasks & Assignments"),
                Tab(text: "Monthly Reports"),
              ],
            ),

            // Tab content
            Expanded(
              child: TabBarView(
                children: [
                  _buildAnalyticsTab(context, isDark, cardColor, textColor),
                  _buildGradesTab(context),
                  _buildAssignmentsTab(context),
                  _buildReportsTab(context),
                ],
              ),
            ),
          ],
        );
      }),
    );
  }

  // ── Analytics & Charts Tab ───────────────────────────────────────
  Widget _buildAnalyticsTab(BuildContext context, bool isDark, Color cardColor, Color textColor) {
    final subColor = isDark ? Colors.white70 : Colors.grey.shade600;

    // Data parsing
    final spots = getLineChartSpots();
    final lineLabels = getLineChartLabels();
    final subjectAverages = getSubjectAverages();
    final cognitiveData = getCognitiveData();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Line Chart: Academic Progress Trend
          _buildChartCard(
            title: "Academic Progress Trend",
            subtitle: "Overall marks trend scored over time",
            cardColor: cardColor,
            textColor: textColor,
            subColor: subColor,
            legend: Row(
              children: [
                Container(width: 12, height: 3, color: const Color(0xFF3CBDB0)),
                const SizedBox(width: 6),
                Text("Overall Progress (%)", style: TextStyle(fontSize: 11, color: subColor)),
              ],
            ),
            child: SizedBox(
              height: 200,
              child: LineChart(_buildLineChartData(spots, lineLabels)),
            ),
          ),
          const SizedBox(height: 16),

          // 2. Grouped Bar Chart: Subject Marks Analysis
          _buildChartCard(
            title: "Subject Marks Analysis",
            subtitle: "Average marks compared against class averages",
            cardColor: cardColor,
            textColor: textColor,
            subColor: subColor,
            legend: Row(
              children: [
                Container(width: 10, height: 10, decoration: BoxDecoration(color: const Color(0xFF3CBDB0), borderRadius: BorderRadius.circular(2))),
                const SizedBox(width: 4),
                Text("Student Avg", style: TextStyle(fontSize: 10.5, color: subColor)),
                const SizedBox(width: 14),
                Container(width: 10, height: 10, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
                const SizedBox(width: 4),
                Text("Class Avg (75%)", style: TextStyle(fontSize: 10.5, color: subColor)),
              ],
            ),
            child: SizedBox(
              height: 210,
              child: BarChart(_buildSubjectMarksChartData(subjectAverages)),
            ),
          ),
          const SizedBox(height: 16),

          // 3. Cognitive Behavioral Performance
          _buildChartCard(
            title: "Cognitive Behavioral Analysis",
            subtitle: "Speech therapist observation ratings (scaled out of 10)",
            cardColor: cardColor,
            textColor: textColor,
            subColor: subColor,
            legend: Wrap(
              spacing: 12,
              runSpacing: 6,
              children: [
                _buildDotLegend('Curiosity', const Color(0xFFF59E0B), subColor),
                _buildDotLegend('Concentration', const Color(0xFF8B5CF6), subColor),
                _buildDotLegend('Consistency', const Color(0xFF3CBDB0), subColor),
                _buildDotLegend('Speech & Comm.', const Color(0xFF0EA5E9), subColor),
                _buildDotLegend('Participation', const Color(0xFF10B981), subColor),
                _buildDotLegend('Discipline', const Color(0xFFF43F5E), subColor),
              ],
            ),
            child: SizedBox(
              height: 200,
              child: BarChart(_buildCognitiveChartData(cognitiveData)),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildChartCard({
    required String title,
    required String subtitle,
    required Color cardColor,
    required Color textColor,
    required Color subColor,
    required Widget legend,
    required Widget child,
  }) {
    return Card(
      color: cardColor,
      elevation: 0.5,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: Colors.black.withOpacity(0.04), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: textColor)),
            const SizedBox(height: 3),
            Text(subtitle, style: TextStyle(fontSize: 11.5, color: subColor)),
            const SizedBox(height: 12),
            legend,
            const SizedBox(height: 20),
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildDotLegend(String label, Color color, Color textColor) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(label, style: TextStyle(fontSize: 10, color: textColor)),
      ],
    );
  }

  // ── FL Chart Drawing Logic ────────────────────────────────────────

  LineChartData _buildLineChartData(List<FlSpot> spots, List<String> labels) {
    return LineChartData(
      minY: 0,
      maxY: 100,
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        getDrawingHorizontalLine: (value) => FlLine(
          color: Colors.black.withOpacity(0.04),
          strokeWidth: 1,
        ),
      ),
      borderData: FlBorderData(show: false),
      lineBarsData: [
        LineChartBarData(
          spots: spots,
          isCurved: true,
          color: const Color(0xFF3CBDB0),
          barWidth: 3,
          isStrokeCapRound: true,
          dotData: FlDotData(
            show: true,
            getDotPainter: (spot, percent, barData, index) => FlDotCirclePainter(
              radius: 4.5,
              color: const Color(0xFF0F766E),
              strokeWidth: 1.5,
              strokeColor: Colors.white,
            ),
          ),
          belowBarData: BarAreaData(
            show: true,
            color: const Color(0xFF3CBDB0).withOpacity(0.08),
          ),
        ),
      ],
      titlesData: FlTitlesData(
        show: true,
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        leftTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 32,
            getTitlesWidget: (value, meta) {
              if (value % 20 == 0) {
                return Text(
                  '${value.toInt()}%',
                  style: const TextStyle(color: Colors.grey, fontSize: 10),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 24,
            getTitlesWidget: (value, meta) {
              final index = value.toInt();
              if (index >= 0 && index < labels.length) {
                return Padding(
                  padding: const EdgeInsets.only(top: 6.0),
                  child: Text(
                    labels[index],
                    style: const TextStyle(color: Colors.grey, fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
  }

  BarChartData _buildSubjectMarksChartData(Map<String, double> averages) {
    final subjects = averages.keys.toList();

    BarChartGroupData makeGroup(int x, double studentVal, double classVal) {
      return BarChartGroupData(
        x: x,
        barRods: [
          BarChartRodData(
            toY: studentVal,
            color: const Color(0xFF3CBDB0), // Student Avg (Teal)
            width: 8,
            borderRadius: const BorderRadius.all(Radius.circular(4)),
          ),
          BarChartRodData(
            toY: classVal,
            color: Colors.grey.shade300, // Class Avg (Grey)
            width: 8,
            borderRadius: const BorderRadius.all(Radius.circular(4)),
          ),
        ],
      );
    }

    final List<BarChartGroupData> groups = List.generate(subjects.length, (i) {
      final key = subjects[i];
      final avg = averages[key] ?? 70.0;
      return makeGroup(i, avg, 75.0);
    });

    return BarChartData(
      maxY: 100,
      minY: 0,
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        getDrawingHorizontalLine: (value) => FlLine(
          color: Colors.black.withOpacity(0.04),
          strokeWidth: 1,
        ),
      ),
      borderData: FlBorderData(show: false),
      barGroups: groups,
      titlesData: FlTitlesData(
        show: true,
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        leftTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 32,
            getTitlesWidget: (value, meta) {
              if (value % 20 == 0) {
                return Text(
                  '${value.toInt()}%',
                  style: const TextStyle(color: Colors.grey, fontSize: 10),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 24,
            getTitlesWidget: (value, meta) {
              final index = value.toInt();
              if (index >= 0 && index < subjects.length) {
                String label = subjects[index];
                if (label.length > 10) label = '${label.substring(0, 8)}...';
                return Padding(
                  padding: const EdgeInsets.only(top: 6.0),
                  child: Text(
                    label,
                    style: const TextStyle(color: Colors.grey, fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
  }

  BarChartData _buildCognitiveChartData(Map<String, double> cogData) {
    final categories = cogData.keys.toList();
    final colors = [
      const Color(0xFFF59E0B),  // Curiosity (Gold)
      const Color(0xFF8B5CF6),  // Concentration (Violet)
      const Color(0xFF3CBDB0),  // Consistency (Teal)
      const Color(0xFF0EA5E9),  // Communication (Sky)
      const Color(0xFF10B981),  // Participation (Emerald)
      const Color(0xFFF43F5E),  // Discipline (Rose)
    ];

    final List<BarChartGroupData> groups = List.generate(categories.length, (i) {
      final key = categories[i];
      final val = cogData[key] ?? 7.5;
      return BarChartGroupData(
        x: i,
        barRods: [
          BarChartRodData(
            toY: val,
            color: colors[i % colors.length],
            width: 12,
            borderRadius: const BorderRadius.all(Radius.circular(4)),
          ),
        ],
      );
    });

    return BarChartData(
      maxY: 10,
      minY: 0,
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        getDrawingHorizontalLine: (value) => FlLine(
          color: Colors.black.withOpacity(0.04),
          strokeWidth: 1,
        ),
      ),
      borderData: FlBorderData(show: false),
      barGroups: groups,
      titlesData: FlTitlesData(
        show: true,
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        leftTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 24,
            getTitlesWidget: (value, meta) => Text(
              value.toInt().toString(),
              style: const TextStyle(color: Colors.grey, fontSize: 10),
            ),
          ),
        ),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 24,
            getTitlesWidget: (value, meta) {
              final index = value.toInt();
              if (index >= 0 && index < categories.length) {
                String label = categories[index];
                if (label == 'Communication') label = 'Comm.';
                return Padding(
                  padding: const EdgeInsets.only(top: 6.0),
                  child: Text(
                    label,
                    style: const TextStyle(color: Colors.grey, fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
  }

  // ── Grades & Batches Tab ───────────────────────────────────────
  Widget _buildGradesTab(BuildContext context) {
    final assignments = controller.childAssignments;
    if (assignments.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text("No batches or grades assigned yet.", style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    // Group assignments by batch to calculate average score
    final Map<String, List<double>> batchScores = {};
    for (var a in assignments) {
      if (a['marks_obtained'] != null) {
        final bName = a['batch_name']?.toString() ?? 'General Batch';
        final score = double.tryParse(a['marks_obtained'].toString()) ?? 0.0;
        batchScores.putIfAbsent(bName, () => []).add(score);
      }
    }

    if (batchScores.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text("No graded assignments available yet to compute subject average.", textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: batchScores.length,
      itemBuilder: (context, i) {
        final batchName = batchScores.keys.elementAt(i);
        final scores = batchScores[batchName]!;
        final average = scores.reduce((a, b) => a + b) / scores.length;
        final grade = getGrade(average);
        final color = getScoreColor(average);

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(batchName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 4),
                          Text(
                            "${scores.length} assignment${scores.length > 1 ? 's' : ''} graded",
                            style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          "${average.toStringAsFixed(0)}%",
                          style: TextStyle(fontFamily: 'Outfit', fontSize: 20, fontWeight: FontWeight.bold, color: color),
                        ),
                        Text(
                          "Grade: $grade",
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: average / 100.0,
                    backgroundColor: Colors.grey.shade100,
                    color: color,
                    minHeight: 8,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Tasks & Assignments Tab ─────────────────────────────────────
  Widget _buildAssignmentsTab(BuildContext context) {
    final assignments = controller.childAssignments;
    if (assignments.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text("No assignments found for this child.", style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: assignments.length,
      itemBuilder: (context, i) {
        final a = assignments[i];
        final marksObtained = a['marks_obtained'];
        final isGraded = marksObtained != null;
        final score = isGraded ? (double.tryParse(marksObtained.toString()) ?? 0.0) : 0.0;
        final dateText = a['due_date'] != null
            ? DateFormat('d MMM y').format(DateTime.tryParse(a['due_date'].toString()) ?? DateTime.now())
            : 'N/A';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            a['title']?.toString() ?? 'Speech Assignment',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "Subject: ${a['batch_name'] ?? 'General'}  •  Due: $dateText",
                            style: TextStyle(color: Colors.grey.shade500, fontSize: 11.5),
                          ),
                        ],
                      ),
                    ),
                    StatusChip(
                      status: isGraded ? 'Submitted' : 'Pending',
                    ),
                  ],
                ),
                if (isGraded) ...[
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "Obtained Score: ${score.toStringAsFixed(0)}%",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: getScoreColor(score)),
                      ),
                      Text(
                        "Grade: ${getGrade(score)}",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Monthly Reports Tab ──────────────────────────────────────────
  Widget _buildReportsTab(BuildContext context) {
    final reports = controller.childReports;
    if (reports.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text("No monthly reports generated yet.", style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: reports.length,
      itemBuilder: (context, i) {
        final r = reports[i];
        final remarks = r['remarks']?.toString() ?? 'No remarks added for this session report.';
        final attendance = r['attendance_rate']?.toString() ?? '100';
        final teacherName = r['teacher_name']?.toString() ?? 'Assigned Specialist';
        final batch = r['batch_name']?.toString() ?? 'Speech Therapy';

        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Month: ${r['report_month'] ?? 'N/A'}",
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "$batch  •  By $teacherName",
                            style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        "Attendance: $attendance%",
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Divider(height: 1),
                const SizedBox(height: 12),
                const Text(
                  "Remarks & Speech Milestones:",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black87),
                ),
                const SizedBox(height: 6),
                Text(
                  remarks,
                  style: TextStyle(fontSize: 13, height: 1.45, color: Colors.grey.shade800),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
