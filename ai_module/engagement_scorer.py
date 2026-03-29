"""
Engagement Scorer Module
Computes total engagement score using weighted formula and classifies activity.
"""


class EngagementScorer:
    """
    Engagement Score Formula:
        score = 0.35 × head_body_attention
              + 0.25 × posture_score
              + 0.20 × hand_activity_score
              + 0.15 × writing_activity_score
              + 0.05 × motion_score

    All component scores are in [0, 1].
    Total score is in [0, 100].

    Classification:
        0–39   → passive
        40–69  → moderate
        70–100 → active
    """

    WEIGHTS = {
        'head_attention_score': 0.35,
        'posture_score': 0.25,
        'hand_activity_score': 0.20,
        'writing_score': 0.15,
        'motion_score': 0.05,
    }

    def compute(self, scores: dict) -> tuple[float, str]:
        """
        Args:
            scores: dict with keys matching WEIGHTS

        Returns:
            (total_score: float [0-100], label: str)
        """
        is_writing = scores.get('writing_score', 0) > 0.75
        
        if is_writing:
            # If the student is reading/writing, their attention is on the desk.
            # Not looking at the camera is actually a sign of HIGH engagement here.
            # We calculate their score based heavily on the writing action and basic posture.
            total = (scores.get('writing_score', 0.9) * 0.7) + (scores.get('posture_score', 0.5) * 0.3)
        else:
            total = sum(
                self.WEIGHTS[key] * scores.get(key, 0.0)
                for key in self.WEIGHTS
            )
            
        total_score = round(total * 100, 2)
        
        label = self.classify(total_score, is_writing)
        return total_score, label

    @staticmethod
    def classify(score: float, is_writing: bool = False) -> str:
        # If writing, we are much more lenient
        active_threshold = 55 if is_writing else 70
        moderate_threshold = 30 if is_writing else 40
        
        if score >= active_threshold:
            return 'active'
        elif score >= moderate_threshold:
            return 'moderate'
        else:
            return 'passive'
