import 'dart:convert';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';

class SignatureCanvasWidget extends StatefulWidget {
  final Function(String base64Image) onSignatureChanged;
  final VoidCallback onClear;

  const SignatureCanvasWidget({
    super.key,
    required this.onSignatureChanged,
    required this.onClear,
  });

  @override
  State<SignatureCanvasWidget> createState() => _SignatureCanvasWidgetState();
}

class _SignatureCanvasWidgetState extends State<SignatureCanvasWidget> {
  List<Offset?> _points = <Offset?>[];

  Future<void> _exportSignature() async {
    if (_points.isEmpty) return;

    try {
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(
        recorder,
        Rect.fromPoints(const Offset(0, 0), const Offset(400, 180)),
      );

      // White background
      final bgPaint = Paint()..color = Colors.white;
      canvas.drawRect(const Rect.fromLTWH(0, 0, 400, 180), bgPaint);

      // Draw signature stroke
      final strokePaint = Paint()
        ..color = const Color(0xFF0F172A)
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 3.5;

      for (int i = 0; i < _points.length - 1; i++) {
        if (_points[i] != null && _points[i + 1] != null) {
          canvas.drawLine(_points[i]!, _points[i + 1]!, strokePaint);
        }
      }

      final picture = recorder.endRecording();
      final img = await picture.toImage(400, 180);
      final byteData = await img.toByteData(format: ui.ImageByteFormat.png);

      if (byteData != null) {
        final buffer = byteData.buffer.asUint8List();
        final base64String = 'data:image/png;base64,${base64Encode(buffer)}';
        widget.onSignatureChanged(base64String);
      }
    } catch (e) {
      debugPrint("Error exporting signature canvas: $e");
    }
  }

  void _clearCanvas() {
    setState(() {
      _points = <Offset?>[];
    });
    widget.onClear();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Expanded(
              child: Text(
                "Draw Digital Signature (Use Finger):",
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            TextButton.icon(
              onPressed: _clearCanvas,
              icon: const Icon(Icons.refresh, size: 14, color: Colors.redAccent),
              label: const Text("Clear Canvas", style: TextStyle(fontSize: 11, color: Colors.redAccent)),
              style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(50, 30)),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Container(
          width: double.infinity,
          height: 170,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.4), width: 1.5),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6, offset: const Offset(0, 2)),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(13),
            child: Stack(
              children: [
                // Signature Baseline
                Positioned(
                  bottom: 30,
                  left: 20,
                  right: 20,
                  child: Container(height: 1, color: Colors.grey.shade300),
                ),
                Positioned(
                  bottom: 12,
                  right: 20,
                  child: Text("X ──────────────────────────", style: TextStyle(color: Colors.grey.shade400, fontSize: 10, fontFamily: 'monospace')),
                ),
                Builder(
                  builder: (canvasContext) {
                    return GestureDetector(
                      onPanStart: (DragStartDetails details) {
                        final RenderBox renderBox = canvasContext.findRenderObject() as RenderBox;
                        final localPosition = renderBox.globalToLocal(details.globalPosition);
                        setState(() {
                          _points.add(localPosition);
                        });
                      },
                      onPanUpdate: (DragUpdateDetails details) {
                        final RenderBox renderBox = canvasContext.findRenderObject() as RenderBox;
                        final localPosition = renderBox.globalToLocal(details.globalPosition);
                        setState(() {
                          _points.add(localPosition);
                        });
                      },
                      onPanEnd: (DragEndDetails details) {
                        setState(() {
                          _points.add(null);
                        });
                        _exportSignature();
                      },
                      child: CustomPaint(
                        painter: _SignaturePainter(_points),
                        size: Size.infinite,
                      ),
                    );
                  },
                ),
                if (_points.isEmpty)
                  Center(
                    child: Text(
                      "✍️ Touch screen & draw signature using finger",
                      style: TextStyle(color: Colors.grey.shade400, fontSize: 12, fontStyle: FontStyle.italic),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _SignaturePainter extends CustomPainter {
  final List<Offset?> points;
  _SignaturePainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF0F172A)
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.5;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      } else if (points[i] != null && points[i + 1] == null) {
        canvas.drawCircle(points[i]!, 2.0, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_SignaturePainter oldDelegate) => true;
}
