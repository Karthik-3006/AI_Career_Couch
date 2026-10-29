import datetime
from bson import ObjectId
from typing import Optional, List, Dict
from fastapi import HTTPException
from backend.app.core.database import get_db

def seed_default_subjects():
    """
    Seeds default academic and placement subjects if they do not exist in the database.
    Provides standard topics and placeholder quizzes to ensure the platform has structured data.
    """
    db = get_db()
    if db.subjects.count_documents({}) > 0:
        return
        
    logger = get_db().client.admin # just standard stdout logging context
    print("Seeding database with default placement and academic subjects...")
    
    # 1. Subjects structure
    defaults = [
        # Core CS
        {
            "name": "Data Structures and Algorithms",
            "category": "Core CS",
            "description": "Essential structures (Arrays, Trees, Graphs) and algorithms (Sorting, Dynamic Programming).",
            "topics": ["Arrays & Strings", "Linked Lists", "Stacks & Queues", "Trees & Graphs", "Sorting & Searching", "Dynamic Programming"]
        },
        {
            "name": "Operating Systems",
            "category": "Core CS",
            "description": "Core concepts: processes, threads, memory management, file systems, and scheduling.",
            "topics": ["Processes & Threads", "CPU Scheduling", "Process Synchronization", "Deadlocks", "Memory Management", "Virtual Memory"]
        },
        {
            "name": "Database Management Systems",
            "category": "Core CS",
            "description": "Relational algebra, SQL, database normalization, transaction control, and NoSQL systems.",
            "topics": ["ER Models", "Normalization (1NF-BCNF)", "SQL Queries", "Transactions & Concurrency", "Indexing & Hashing"]
        },
        # Programming
        {
            "name": "Python",
            "category": "Programming",
            "description": "Complete Python programming, object-oriented concepts, and advanced libraries.",
            "topics": ["Basics & Control Flow", "Functions & Modules", "Data Structures (List, Dict)", "Object-Oriented Programming", "Exception Handling", "File Handling"]
        },
        {
            "name": "SQL",
            "category": "Programming",
            "description": "Relational queries, Joins, Aggregations, Subqueries, and database manipulation.",
            "topics": ["Basic SELECT", "Joins (Inner, Outer)", "Group By & Having", "Subqueries & CTEs", "Window Functions"]
        },
        # Placement Prep
        {
            "name": "Quantitative Aptitude",
            "category": "Placement",
            "description": "Mathematical problem-solving for job placements and competitive exams.",
            "topics": ["Averages & Percentages", "Profit & Loss", "Time & Work", "Time, Speed & Distance", "Permutations & Combinations"]
        },
        {
            "name": "Logical Reasoning",
            "category": "Placement",
            "description": "Analytical and logical reasoning questions.",
            "topics": ["Coding-Decoding", "Blood Relations", "Direction Sense", "Syllogism", "Data Sufficiency"]
        }
    ]
    
    for item in defaults:
        subj_doc = {
            "name": item["name"],
            "category": item["category"],
            "description": item["description"],
            "is_enabled": True,
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow()
        }
        subj_res = db.subjects.insert_one(subj_doc)
        subj_id = subj_res.inserted_id
        
        # Add topics
        topic_ids = []
        for idx, t_name in enumerate(item["topics"]):
            topic_doc = {
                "subject_id": str(subj_id),
                "name": t_name,
                "description": f"Detailed concepts, lessons, and practice for {t_name}.",
                "order": idx,
                "created_at": datetime.datetime.utcnow()
            }
            top_res = db.topics.insert_one(topic_doc)
            topic_ids.append(top_res.inserted_id)
            
            # Generate 30 sample MCQs per topic/subject test
            for q_idx in range(1, 31):
                mcq = {
                    "subject_id": str(subj_id),
                    "topic_id": str(top_res.inserted_id),
                    "type": "mcq",
                    "question": f"Question {q_idx}: Which of the following best describes the core concept in {t_name}?",
                    "options": [
                        f"Option A: Standard baseline definition for {t_name}.",
                        f"Option B: Optimized implementation approach.",
                        f"Option C: Edge-case constraint related to {t_name}.",
                        f"Option D: All of the above."
                    ],
                    "correct_answer": "Option D: All of the above.",
                    "explanation": f"Detail explanation: option D represents a comprehensive view of the {t_name} principles.",
                    "difficulty": "medium" if q_idx % 2 == 0 else "easy",
                    "created_at": datetime.datetime.utcnow()
                }
                db.quizzes.insert_one(mcq)
            
            # For coding-related subjects, insert a coding compiler problem
            if item["name"] in ["Data Structures and Algorithms", "Python"]:
                coding_problem = {
                    "subject_id": str(subj_id),
                    "topic_id": str(top_res.inserted_id),
                    "type": "coding",
                    "title": f"Sum of Elements in {t_name}",
                    "question": f"Write a Python function `solution(arr)` that returns the sum of all elements in the input list `arr`.",
                    "starter_code": "def solution(arr):\n    # Write your code here\n    pass",
                    "test_cases": [
                        {"input": "[1, 2, 3]", "output": "6"},
                        {"input": "[-1, 0, 1]", "output": "0"},
                        {"input": "[]", "output": "0"}
                    ],
                    "difficulty": "easy",
                    "created_at": datetime.datetime.utcnow()
                }
                db.quizzes.insert_one(coding_problem)

# Public CRUD & Management APIs

def list_subjects(category: Optional[str] = None) -> List[Dict]:
    db = get_db()
    query = {"is_enabled": True}
    if category:
        query["category"] = category
    subjects = list(db.subjects.find(query))
    for s in subjects:
        s["_id"] = str(s["_id"])
    return subjects

def get_subject_details(subject_id: str) -> Dict:
    db = get_db()
    try:
        subj = db.subjects.find_one({"_id": ObjectId(subject_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid subject ID.")
        
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found.")
        
    subj["_id"] = str(subj["_id"])
    subj["notes"] = subj.get("notes", [])
    
    # Fetch topics
    topics = list(db.topics.find({"subject_id": subject_id}).sort("order", 1))
    for t in topics:
        t["_id"] = str(t["_id"])
    subj["topics"] = topics
    return subj

def get_topic_test(topic_id: str) -> List[Dict]:
    """
    Returns the quiz questions (MCQs & coding) for a given topic.
    Guarantees returning the requested questions.
    """
    db = get_db()
    questions = list(db.quizzes.find({"topic_id": topic_id}))
    for q in questions:
        q["_id"] = str(q["_id"])
    return questions

def submit_test_answers(user_id: str, topic_id: str, submissions: List[Dict]) -> Dict:
    """
    Evaluates MCQ answers and saves the score.
    Returns score, passing status, and weak topics recommendations.
    """
    db = get_db()
    questions = {str(q["_id"]): q for q in db.quizzes.find({"topic_id": topic_id})}
    
    total = len(submissions)
    correct_count = 0
    results = []
    
    for sub in submissions:
        q_id = sub.get("question_id")
        user_ans = sub.get("answer")
        
        q_obj = questions.get(q_id)
        if q_obj:
            is_correct = q_obj.get("correct_answer") == user_ans
            if is_correct:
                correct_count += 1
            results.append({
                "question_id": q_id,
                "question": q_obj.get("question"),
                "is_correct": is_correct,
                "correct_answer": q_obj.get("correct_answer"),
                "user_answer": user_ans,
                "explanation": q_obj.get("explanation")
            })
            
    score_pct = int((correct_count / total) * 100) if total > 0 else 0
    passed = score_pct >= 60
    
    # Save student progress
    topic = db.topics.find_one({"_id": ObjectId(topic_id)})
    subject_id = str(topic["subject_id"]) if topic else None
    
    progress = db.learning_progress.find_one({"user_id": user_id, "subject_id": subject_id})
    
    if not progress:
        progress = {
            "user_id": user_id,
            "subject_id": subject_id,
            "completed_topics": [topic_id] if passed else [],
            "scores": {topic_id: score_pct},
            "weak_topics": [] if passed else [topic_id],
            "updated_at": datetime.datetime.utcnow()
        }
        db.learning_progress.insert_one(progress)
    else:
        completed = list(progress.get("completed_topics", []))
        weak = list(progress.get("weak_topics", []))
        
        if passed:
            if topic_id not in completed:
                completed.append(topic_id)
            if topic_id in weak:
                weak.remove(topic_id)
        else:
            if topic_id not in weak:
                weak.append(topic_id)
                
        scores = progress.get("scores", {})
        scores[topic_id] = max(scores.get(topic_id, 0), score_pct)
        
        db.learning_progress.update_one(
            {"user_id": user_id, "subject_id": subject_id},
            {
                "$set": {
                    "completed_topics": completed,
                    "weak_topics": weak,
                    "scores": scores,
                    "updated_at": datetime.datetime.utcnow()
                }
            }
        )
        
    return {
        "score_percentage": score_pct,
        "correct_count": correct_count,
        "total_count": total,
        "passed": passed,
        "results": results
    }

def get_student_progress(user_id: str) -> List[Dict]:
    db = get_db()
    progress_list = list(db.learning_progress.find({"user_id": user_id}))
    for prog in progress_list:
        prog["_id"] = str(prog["_id"])
        # Fetch subject details for name
        subject = None
        if ObjectId.is_valid(prog["subject_id"]):
            subject = db.subjects.find_one({"_id": ObjectId(prog["subject_id"])})
            
        if subject:
            prog["subject_name"] = subject["name"]
        elif prog["subject_id"] == "mixed_mock_test":
            prog["subject_name"] = "Mixed Placement Mock Test"
        else:
            prog["subject_name"] = "General"
    return progress_list
