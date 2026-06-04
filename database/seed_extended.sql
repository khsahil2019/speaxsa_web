-- ============================================================
-- SPEAXSA EDTECH PLATFORM — EXTENDED SEED DATA FOR DEMO/UI
-- Clean, repeatable database insertions
-- ============================================================

-- Clean up existing mock records to prevent key violations
DELETE FROM support_replies WHERE ticket_id IN ('ticket_001', 'ticket_002');
DELETE FROM support_tickets WHERE id IN ('ticket_001', 'ticket_002');
DELETE FROM teacher_payouts WHERE id IN ('payout_001', 'payout_002');
DELETE FROM payments WHERE id = 'pay_001';
DELETE FROM monthly_reports WHERE id = 'report_student_001_batch_001_2026_06';
DELETE FROM student_observations WHERE id = 'obs_001';
DELETE FROM assignment_submissions WHERE id = 'sub_001';
DELETE FROM class_poll_responses WHERE poll_id = 'poll_001';
DELETE FROM class_polls WHERE id = 'poll_001';
DELETE FROM recordings WHERE id = 'rec_001';
DELETE FROM attendance WHERE id = 'att_001';
DELETE FROM class_participants WHERE class_id IN ('live_001', 'live_002');
DELETE FROM live_classes WHERE id IN ('live_001', 'live_002');
DELETE FROM teacher_documents WHERE id IN ('doc_001', 'doc_002');

-- 1. Teacher Documents
INSERT INTO teacher_documents (id, teacher_id, doc_type, file_url, original_name) VALUES
  ('doc_001', 'teacher_001', 'aadhaar', '/uploads/documents/aadhaar_proof.pdf', 'aadhaar_proof.pdf'),
  ('doc_002', 'teacher_001', 'pan', '/uploads/documents/pan_proof.pdf', 'pan_proof.pdf');

-- 2. Live Classes (One past completed class, one upcoming scheduled class)
INSERT INTO live_classes (id, batch_id, teacher_id, title, class_date, class_time, agora_channel, status, started_at, ended_at, duration_mins, recording_url) VALUES
  ('live_001', 'batch_001', 'teacher_001', 'Chapter 1: Electric Charges and Fields - Introduction', CURRENT_DATE - INTERVAL '1 day', '09:00:00', 'speaxsa_batch_001', 'ended', NOW() - INTERVAL '1 day 1 hour', NOW() - INTERVAL '1 day', 60, 'https://res.cloudinary.com/demo/video/upload/dog.mp4'),
  ('live_002', 'batch_001', 'teacher_001', 'Chapter 1: Coulomb Law & Math Practice', CURRENT_DATE + INTERVAL '1 day', '09:00:00', 'speaxsa_batch_001', 'scheduled', NULL, NULL, 0, NULL);

-- 3. Class Participants
INSERT INTO class_participants (class_id, batch_id, user_id, role, join_time, exit_time, duration_mins) VALUES
  ('live_001', 'batch_001', 'student_001', 'student', NOW() - INTERVAL '1 day 55 minutes', NOW() - INTERVAL '1 day', 55),
  ('live_001', 'batch_001', 'teacher_001', 'teacher', NOW() - INTERVAL '1 day 1 hour', NOW() - INTERVAL '1 day', 60);

-- 4. Attendance (Student present rate)
INSERT INTO attendance (id, class_id, batch_id, student_id, teacher_id, join_time, exit_time, duration_mins, class_duration_mins, status, attendance_date) VALUES
  ('att_001', 'live_001', 'batch_001', 'student_001', 'teacher_001', NOW() - INTERVAL '1 day 55 minutes', NOW() - INTERVAL '1 day', 55, 60, 'present', CURRENT_DATE - INTERVAL '1 day');

-- 5. Recordings
INSERT INTO recordings (id, class_id, batch_id, title, recording_url, duration_mins, file_size_mb, is_available) VALUES
  ('rec_001', 'live_001', 'batch_001', 'Physics Chapter 1 Introduction Class Recording', 'https://res.cloudinary.com/demo/video/upload/dog.mp4', 60, 120.50, true);

-- 6. Class Polls
INSERT INTO class_polls (id, class_id, teacher_id, question, options, correct_option, is_active) VALUES
  ('poll_001', 'live_001', 'teacher_001', 'What is the SI unit of Electric Charge?', '["Coulomb", "Ampere", "Volt", "Ohm"]'::jsonb, 0, false);

-- 7. Class Poll Responses
INSERT INTO class_poll_responses (poll_id, student_id, selected_option) VALUES
  ('poll_001', 'student_001', 0);

-- 8. Assignment Submissions
INSERT INTO assignment_submissions (id, assignment_id, student_id, file_url, notes, marks_obtained, feedback, graded_by, graded_at, status) VALUES
  ('sub_001', 'asgn_001', 'student_001', '/uploads/submissions/physics_charges_ex1.pdf', 'Completed all NCERT exercises from 1.1 to 1.10. Please review.', 85, 'Excellent derivation steps. Review question 1.7 again.', 'teacher_001', NOW() - INTERVAL '12 hours', 'graded');

-- 9. Student Observations
INSERT INTO student_observations (id, student_id, teacher_id, batch_id, class_id, observation_date, curiosity, understanding, consistency, communication, observation_score, participation, discipline, notes) VALUES
  ('obs_001', 'student_001', 'teacher_001', 'batch_001', 'live_001', CURRENT_DATE - INTERVAL '1 day', 85.00, 90.00, 80.00, 75.00, 81.67, 80.00, 80.00, 'Very active participation in chat during the quiz poll. Understood core concepts well.');

-- 10. Monthly Performance Reports
INSERT INTO monthly_reports (id, student_id, batch_id, teacher_id, report_month, attendance_pct, interaction_score, curiosity_score, assignment_completion, communication_growth, avg_observation_score, weak_topics, strong_topics, improvement_trend, overall_grade, teacher_remarks) VALUES
  ('report_student_001_batch_001_2026_06', 'student_001', 'batch_001', 'teacher_001', '2026-06', 95.00, 85.00, 85.00, 100.00, 80.00, 82.50, ARRAY['Coulomb force vector form'], ARRAY['Electric flux', 'Gauss law'], 'improving', 'A', 'Rahul shows great progress in Physics. His curiosity scores are outstanding.');

-- 11. Payments (Razorpay payment history)
INSERT INTO payments (id, razorpay_order_id, razorpay_payment_id, student_id, batch_id, course_id, teacher_id, amount, platform_share, teacher_share, commission_type, status, payment_method, billing_name, billing_email, billing_phone) VALUES
  ('pay_001', 'order_Ndjks82bHjks', 'pay_Ndjks92bHjks', 'student_001', 'batch_001', 'course_001', 'teacher_001', 1999.00, 999.50, 999.50, 'standard', 'captured', 'upi', 'Rahul Verma', 'student@speaxsa.com', '9222222222');

-- 12. Teacher Payouts
INSERT INTO teacher_payouts (id, teacher_id, amount, bank_account, upi_id, status, admin_notes, requested_at, reviewed_at, paid_at, processed_by) VALUES
  ('payout_001', 'teacher_001', 30000.00, 'HDFC Bank A/c 501002930219, IFSC HDFC0000120', 'teacher@okaxis', 'paid', 'Approved standard monthly payout request', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', 'admin_001'),
  ('payout_002', 'teacher_001', 10000.00, 'HDFC Bank A/c 501002930219, IFSC HDFC0000120', 'teacher@okaxis', 'requested', NULL, NOW() - INTERVAL '1 day', NULL, NULL, NULL);

-- 13. Support Tickets
INSERT INTO support_tickets (id, user_id, subject, description, status, priority) VALUES
  ('ticket_001', 'student_001', 'Whiteboard tool not loading', 'When joining live classes from my Safari browser, the whiteboard screen remains black.', 'open', 'high'),
  ('ticket_002', 'teacher_001', 'Agora token verification delayed', 'I experienced a 20-second delay in token retrieval while starting Physics Batch A class.', 'resolved', 'normal');

-- 14. Support Replies
INSERT INTO support_replies (ticket_id, user_id, message) VALUES
  ('ticket_002', 'admin_001', 'We have optimized the token retrieval query cache settings. This delay should no longer occur.'),
  ('ticket_002', 'teacher_001', 'Verified. Token generations are running instant now. Thanks!');
