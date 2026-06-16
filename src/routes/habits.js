const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Submit daily student behavior ratings (USP) - protected
router.post('/rate', authenticateToken, async (req, res) => {
  const { studentId, studentName, teacherId, date, feedback, curiosity, concentration, confidence, communication, consistency, participation, discipline } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO student_behavior_ratings 
       (student_id, student_name, teacher_id, date, feedback, curiosity, concentration, confidence, communication, consistency, participation, discipline) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [studentId, studentName, teacherId, date, feedback, curiosity, concentration, confidence, communication, consistency, participation, discipline]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch latest ratings and generate AI insights dynamically
router.get('/student/:studentId', async (req, res) => {
  const { studentId } = req.params;
  try {
    let rating = null;

    const result = await db.query(
      'SELECT * FROM student_behavior_ratings WHERE student_id = $1 ORDER BY id DESC LIMIT 1',
      [studentId]
    );
    if (result.rows.length > 0) {
      rating = result.rows[0];
    }

    if (!rating) {
      return res.status(404).json({ error: "No behavioral evaluations found for this student" });
    }

    // Generate Dynamic AI Insight Summary based on scores (Speaxa cognitive model)
    let aiInsight = "";
    const avgScore = (
      parseFloat(rating.curiosity) +
      parseFloat(rating.concentration) +
      parseFloat(rating.confidence) +
      parseFloat(rating.communication) +
      parseFloat(rating.consistency) +
      parseFloat(rating.participation) +
      parseFloat(rating.discipline)
    ) / 7.0;

    if (avgScore >= 8.0) {
      aiInsight = `${rating.student_name} is performing at an elite academic tier. Their high curiosity (${rating.curiosity}/10) and consistency (${rating.consistency}/10) indicate they are fully prepared for the boards. Recommend introducing advanced Olympiad materials to sustain engagement.`;
    } else if (avgScore >= 6.0) {
      let focusMessage = "";
      if (rating.concentration < 7.0) {
        focusMessage = ` However, concentration levels (${rating.concentration}/10) dip towards the end of sessions. Recommend micro-breaks or gamified pop-quizzes.`;
      }
      aiInsight = `${rating.student_name} shows steady conceptual progress and healthy classroom interaction.${focusMessage} Overall, they are maintaining a stable trajectory towards class milestones.`;
    } else {
      aiInsight = `Critical Alert: ${rating.student_name}'s average cognitive habit rating is currently ${avgScore.toFixed(1)}/10. Lower consistency (${rating.consistency}/10) and discipline (${rating.discipline}/10) suggest potential homework fatigue. Recommend a direct check-in from the batch teacher to address conceptual blockers before the next live stream.`;
    }

    res.json({
      rating,
      aiInsight,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
