-- ============================================================
-- SPEAXSA EDTECH PLATFORM — SEED DATA FOR CUSTOM SAHIL KHAN ACCOUNTS
-- Clean, repeatable database insertions
-- ============================================================

-- Approve teacher and set levels
UPDATE users 
SET approval_status = 'approved', 
    teacher_level = 'Gold',
    qualification = 'Ph.D. in Mathematics, IIT Delhi',
    experience_years = 12,
    subject_expertise = 'Mathematics, Calculus, Algebra',
    languages = 'English, Hindi, Punjabi'
WHERE id = 'tea_1780582504586_8bid82';

-- Approve student
UPDATE users
SET approval_status = 'approved',
    board = 'ICSE',
    grade = 'Class 10',
    student_code = 'SPX-STU-100002',
    learning_streak = 25
WHERE id = 'stu_1780567429769_0ko7ck';

-- Clean up existing records to prevent conflicts
DELETE FROM support_replies WHERE ticket_id IN ('ticket_sahil_01', 'ticket_sahil_02');
DELETE FROM support_tickets WHERE id IN ('ticket_sahil_01', 'ticket_sahil_02');
DELETE FROM teacher_payouts WHERE id IN ('payout_sahil_01', 'payout_sahil_02');
DELETE FROM payments WHERE id IN ('pay_sahil_01', 'pay_sahil_02');
DELETE FROM monthly_reports WHERE id IN ('report_sahil_001', 'report_sahil_002');
DELETE FROM student_observations WHERE id IN ('obs_sahil_01', 'obs_sahil_02');
DELETE FROM assignment_submissions WHERE id IN ('sub_sahil_01', 'sub_sahil_02');
DELETE FROM class_poll_responses WHERE poll_id IN ('poll_sahil_01');
DELETE FROM class_polls WHERE id IN ('poll_sahil_01');
DELETE FROM recordings WHERE id IN ('rec_sahil_01');
DELETE FROM attendance WHERE id IN ('att_sahil_01', 'att_sahil_02');
DELETE FROM class_participants WHERE user_id IN ('stu_1780567429769_0ko7ck', 'tea_1780582504586_8bid82');
DELETE FROM live_classes WHERE id IN ('live_sahil_01', 'live_sahil_02');
DELETE FROM batch_students WHERE student_id = 'stu_1780567429769_0ko7ck';
DELETE FROM batches WHERE id IN ('batch_sahil_01', 'batch_001_evening', 'batch_sahil_01_foundation');
DELETE FROM teacher_sop WHERE teacher_id = 'tea_1780582504586_8bid82';
DELETE FROM teacher_wallet WHERE teacher_id = 'tea_1780582504586_8bid82';
DELETE FROM parent_student_links WHERE student_id = 'stu_1780567429769_0ko7ck';

-- 1. SOP Setup (approved status)
INSERT INTO teacher_sop (id, teacher_id, status, camera_checklist, lighting_checklist, audio_checklist, internet_checklist, teaching_checklist) VALUES
  ('sop_sahil', 'tea_1780582504586_8bid82', 'approved', 
   '{"face_visible":true,"stable_camera":true,"eye_level":true,"proper_framing":true}'::jsonb,
   '{"proper_lighting":true,"no_backlight":true,"clear_background":true}'::jsonb,
   '{"clear_voice":true,"no_noise":true}'::jsonb,
   '{"stable_connection":true,"speed_proof":true}'::jsonb,
   '{"communication":true,"engagement":true,"presentation":true}'::jsonb);

-- 2. Teacher wallet
INSERT INTO teacher_wallet (teacher_id, total_earnings, paid_earnings, pending_earnings, wallet_balance) VALUES
  ('tea_1780582504586_8bid82', 65000.00, 45000.00, 20000.00, 20000.00);

-- 3. Parent link to student
INSERT INTO parent_student_links (parent_id, student_id) VALUES
  ('parent_001', 'stu_1780567429769_0ko7ck');

-- 4. Batch under teacher Sahil Khan (Mathematics Batch) & extra course batches
INSERT INTO batches (id, course_id, teacher_id, batch_name, subject, start_date, end_date, start_time, end_time, days_of_week, capacity, seats_filled, status, agora_channel) VALUES
  ('batch_sahil_01', 'course_002', 'tea_1780582504586_8bid82', 'Class 10 Math — Calculus & Algebra Spec', 'Mathematics', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months', '14:00:00', '15:00:00', ARRAY['Monday', 'Wednesday', 'Friday'], 30, 2, 'active', 'speaxsa_batch_sahil_01'),
  ('batch_001_evening', 'course_001', 'tea_1780582504586_8bid82', 'Physics B - Evening Batch', 'Physics', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months', '18:00:00', '19:00:00', ARRAY['Tuesday', 'Thursday', 'Saturday'], 30, 0, 'active', 'speaxsa_batch_001_evening'),
  ('batch_sahil_01_foundation', 'course_002', 'teacher_001', 'Class 10 Math — Foundation Batch', 'Mathematics', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months', '16:00:00', '17:00:00', ARRAY['Monday', 'Wednesday', 'Friday'], 30, 0, 'active', 'speaxsa_batch_sahil_01_foundation');

-- 5. Enroll students in Mathematics Batch (student_001 AND stu_1780567429769_0ko7ck)
INSERT INTO batch_students (batch_id, student_id, status) VALUES
  ('batch_sahil_01', 'stu_1780567429769_0ko7ck', 'active'),
  ('batch_sahil_01', 'student_001', 'active');

-- Also enroll student Sahil Khan (stu_1780567429769_0ko7ck) in Physics Batch (batch_001)
INSERT INTO batch_students (batch_id, student_id, status) VALUES
  ('batch_001', 'stu_1780567429769_0ko7ck', 'active');

-- 6. Live classes for Maths batch
INSERT INTO live_classes (id, batch_id, teacher_id, title, class_date, class_time, agora_channel, status, started_at, ended_at, duration_mins, recording_url) VALUES
  ('live_sahil_01', 'batch_sahil_01', 'tea_1780582504586_8bid82', 'Intro to Functions and Graphs', CURRENT_DATE - INTERVAL '1 day', '14:00:00', 'speaxsa_batch_sahil_01', 'ended', NOW() - INTERVAL '1 day 1 hour', NOW() - INTERVAL '1 day', 60, 'https://res.cloudinary.com/demo/video/upload/dog.mp4'),
  ('live_sahil_02', 'batch_sahil_01', 'tea_1780582504586_8bid82', 'Composite Functions & Limits Practice', CURRENT_DATE + INTERVAL '1 day', '14:00:00', 'speaxsa_batch_sahil_01', 'scheduled', NULL, NULL, 0, NULL);

-- 7. Class participants
INSERT INTO class_participants (class_id, batch_id, user_id, role, join_time, exit_time, duration_mins) VALUES
  ('live_sahil_01', 'batch_sahil_01', 'stu_1780567429769_0ko7ck', 'student', NOW() - INTERVAL '1 day 55 minutes', NOW() - INTERVAL '1 day', 55),
  ('live_sahil_01', 'batch_sahil_01', 'tea_1780582504586_8bid82', 'teacher', NOW() - INTERVAL '1 day 1 hour', NOW() - INTERVAL '1 day', 60);

-- 8. Attendance
INSERT INTO attendance (id, class_id, batch_id, student_id, teacher_id, join_time, exit_time, duration_mins, class_duration_mins, status, attendance_date) VALUES
  ('att_sahil_01', 'live_sahil_01', 'batch_sahil_01', 'stu_1780567429769_0ko7ck', 'tea_1780582504586_8bid82', NOW() - INTERVAL '1 day 55 minutes', NOW() - INTERVAL '1 day', 55, 60, 'present', CURRENT_DATE - INTERVAL '1 day'),
  ('att_sahil_02', 'live_001', 'batch_001', 'stu_1780567429769_0ko7ck', 'teacher_001', NOW() - INTERVAL '1 day 50 minutes', NOW() - INTERVAL '1 day', 50, 60, 'present', CURRENT_DATE - INTERVAL '1 day');

-- 9. Recordings
INSERT INTO recordings (id, class_id, batch_id, title, recording_url, duration_mins, file_size_mb, is_available) VALUES
  ('rec_sahil_01', 'live_sahil_01', 'batch_sahil_01', 'Mathematics Intro to Functions Class Recording', 'https://res.cloudinary.com/demo/video/upload/dog.mp4', 60, 150.00, true);

-- 10. Class polls
INSERT INTO class_polls (id, class_id, teacher_id, question, options, correct_option, is_active) VALUES
  ('poll_sahil_01', 'live_sahil_01', 'tea_1780582504586_8bid82', 'What is the domain of f(x) = sqrt(x-1)?', '["x > 0", "x >= 1", "All real numbers", "x < 1"]'::jsonb, 1, false);

-- 11. Class poll responses
INSERT INTO class_poll_responses (poll_id, student_id, selected_option) VALUES
  ('poll_sahil_01', 'stu_1780567429769_0ko7ck', 1);

-- 12. Assignments under the Math Batch
INSERT INTO assignments (id, batch_id, teacher_id, title, description, due_date, max_marks) VALUES
  ('asgn_sahil_01', 'batch_sahil_01', 'tea_1780582504586_8bid82', 'Calculus Exercise 1 — Basic Limits', 'Evaluate questions 1 to 15 on page 212 of syllabus booklet.', NOW() + INTERVAL '5 days', 100);

-- 13. Assignment Submissions
INSERT INTO assignment_submissions (id, assignment_id, student_id, file_url, notes, marks_obtained, feedback, graded_by, graded_at, status) VALUES
  ('sub_sahil_01', 'asgn_sahil_01', 'stu_1780567429769_0ko7ck', '/uploads/submissions/calculus_ex1_sahil.pdf', 'Completed limits assignment, questions 1-15.', 90, 'Very precise step verification. Excellent graph plotting.', 'tea_1780582504586_8bid82', NOW() - INTERVAL '6 hours', 'graded'),
  ('sub_sahil_02', 'asgn_001', 'stu_1780567429769_0ko7ck', '/uploads/submissions/physics_ex1_sahil.pdf', 'Physics NCERT exercise.', 88, 'Good logic, Priya.', 'teacher_001', NOW() - INTERVAL '10 hours', 'graded');

-- 14. Student Observations
INSERT INTO student_observations (id, student_id, teacher_id, batch_id, class_id, observation_date, curiosity, understanding, consistency, communication, observation_score, participation, discipline, notes) VALUES
  ('obs_sahil_01', 'stu_1780567429769_0ko7ck', 'tea_1780582504586_8bid82', 'batch_sahil_01', 'live_sahil_01', CURRENT_DATE - INTERVAL '1 day', 90.00, 95.00, 85.00, 90.00, 90.00, 90.00, 90.00, 'Excellent participation in limits discussion. Highly interactive.'),
  ('obs_sahil_02', 'stu_1780567429769_0ko7ck', 'teacher_001', 'batch_001', 'live_001', CURRENT_DATE - INTERVAL '1 day', 85.00, 80.00, 80.00, 85.00, 82.50, 85.00, 80.00, 'Participated actively in charges discussion.');

-- 15. Monthly reports
INSERT INTO monthly_reports (id, student_id, batch_id, teacher_id, report_month, attendance_pct, interaction_score, curiosity_score, assignment_completion, communication_growth, avg_observation_score, weak_topics, strong_topics, improvement_trend, overall_grade, teacher_remarks) VALUES
  ('report_sahil_001', 'stu_1780567429769_0ko7ck', 'batch_sahil_01', 'tea_1780582504586_8bid82', '2026-06', 100.00, 90.00, 90.00, 100.00, 90.00, 90.00, ARRAY['Logarithmic limits'], ARRAY['Standard limit limits', 'Domain mapping'], 'improving', 'A+', 'Sahil is performing brilliantly in Mathematics. Standard limit topics are extremely solid.'),
  ('report_sahil_002', 'stu_1780567429769_0ko7ck', 'batch_001', 'teacher_001', '2026-06', 90.00, 80.00, 85.00, 100.00, 85.00, 82.50, ARRAY['Vector form'], ARRAY['Gauss law'], 'stable', 'A', 'Very consistent in Physics.');

-- 16. Payments
INSERT INTO payments (id, razorpay_order_id, razorpay_payment_id, student_id, batch_id, course_id, teacher_id, amount, platform_share, teacher_share, commission_type, status, payment_method, billing_name, billing_email, billing_phone) VALUES
  ('pay_sahil_01', 'order_sahil_ord01', 'pay_sahil_pay01', 'stu_1780567429769_0ko7ck', 'batch_sahil_01', 'course_002', 'tea_1780582504586_8bid82', 1999.00, 999.50, 999.50, 'standard', 'captured', 'card', 'Sahil Khan', 'sahilkh3014@gmail.com', '9222222222'),
  ('pay_sahil_02', 'order_sahil_ord02', 'pay_sahil_pay02', 'stu_1780567429769_0ko7ck', 'batch_001', 'course_001', 'teacher_001', 1999.00, 999.50, 999.50, 'standard', 'captured', 'upi', 'Sahil Khan', 'sahilkh3014@gmail.com', '9222222222');

-- 17. Teacher payouts
INSERT INTO teacher_payouts (id, teacher_id, amount, bank_account, upi_id, status, admin_notes, requested_at, reviewed_at, paid_at, processed_by) VALUES
  ('payout_sahil_01', 'tea_1780582504586_8bid82', 45000.00, 'State Bank of India A/c 30192839201, IFSC SBIN0000213', 'sahilkhan@okhdfc', 'paid', 'Initial approval for teacher signup earnings', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days', 'admin_001'),
  ('payout_sahil_02', 'tea_1780582504586_8bid82', 20000.00, 'State Bank of India A/c 30192839201, IFSC SBIN0000213', 'sahilkhan@okhdfc', 'requested', NULL, NOW() - INTERVAL '1 day', NULL, NULL, NULL);

-- 18. Support tickets
INSERT INTO support_tickets (id, user_id, subject, description, status, priority) VALUES
  ('ticket_sahil_01', 'stu_1780567429769_0ko7ck', 'Whiteboard connection delay', 'Sometimes it takes 5-10 seconds to load the whiteboard drawing canvas.', 'open', 'normal'),
  ('ticket_sahil_02', 'tea_1780582504586_8bid82', 'Payout request showing pending', 'My request for withdrawal of 20000 INR is pending approval.', 'under_review', 'high');

-- 19. Support replies
INSERT INTO support_replies (ticket_id, user_id, message) VALUES
  ('ticket_sahil_02', 'admin_001', 'We will process this payout request by the end of today. Thanks for your patience.');
