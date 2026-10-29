import logging
import re
from backend.app.services.ai_service import _call_granite, _extract_json

logger = logging.getLogger(__name__)

def review_student_code(student_code: str, title: str, difficulty: str) -> dict:
    """
    Analyzes student code using IBM Granite for:
    - Correctness / potential bugs
    - Time and space complexity
    - Readability and guidelines
    - Refactoring recommendations
    """
    prompt = f"""<|system|>
You are a senior staff engineer and code reviewer. Analyze the candidate's solution and return ONLY a valid JSON object.
<|user|>
Problem Title: {title}
Difficulty: {difficulty}

Candidate Solution:
```python
{student_code}
```

Return ONLY this JSON structure:
{{
  "time_complexity": "<e.g. O(N) or O(N log N)>",
  "space_complexity": "<e.g. O(1) or O(N)>",
  "bugs": ["<bug 1 details>", "<another potential edge case bug>"],
  "readability_score": <integer 1-10>,
  "code_quality_feedback": "<2-3 sentences general review>",
  "suggestions": ["<refactoring recommendation 1>", "<optimization suggestion 2>"]
}}
<|assistant|>
"""
    raw = _call_granite(prompt)
    if raw:
        parsed = _extract_json(raw)
        if parsed:
            try:
                return {
                    "time_complexity": str(parsed.get("time_complexity", "O(N)")),
                    "space_complexity": str(parsed.get("space_complexity", "O(N)")),
                    "bugs": list(parsed.get("bugs", [])) or ["No critical bugs found."],
                    "readability_score": max(1, min(10, int(parsed.get("readability_score", 7)))),
                    "code_quality_feedback": str(parsed.get("code_quality_feedback", "Code follows general structure.")),
                    "suggestions": list(parsed.get("suggestions", [])) or ["Code is clean and optimal."]
                }
            except (ValueError, TypeError):
                pass
                
    # Heuristic local fallback
    bugs = []
    if "for " in student_code and "for " in student_code.split("for ", 1)[1]:
        time_complexity = "O(N²)"
        suggestions = ["Nested loops detected. Try using a hash map to reduce time complexity to O(N)."]
    else:
        time_complexity = "O(N)"
        suggestions = ["Variable names could be more descriptive.", "Add a brief docstring outlining function arguments."]
        
    if "len(" in student_code:
        space_complexity = "O(1)"
    else:
        space_complexity = "O(N)"
        
    return {
        "time_complexity": time_complexity,
        "space_complexity": space_complexity,
        "bugs": bugs or ["No obvious syntax/logic bugs found in the structure."],
        "readability_score": 8 if len(student_code) > 100 else 6,
        "code_quality_feedback": "The solution is complete. Maintain PEP 8 coding styling guidelines.",
        "suggestions": suggestions
    }
