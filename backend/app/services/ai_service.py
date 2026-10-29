import os
import re
import json
import logging
import random
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_API_KEY = os.getenv("WATSONX_API_KEY", "")
_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
_URL = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")

_model = None

def _get_model():
    """
    Return a cached ModelInference instance.
    Returns None when credentials are absent so callers fall back to stubs.
    """
    global _model
    if _model is not None:
        return _model

    _placeholder = {"", "your_ibm_cloud_api_key_here", "your_watsonx_project_id_here"}
    if not _API_KEY or not _PROJECT_ID or _API_KEY in _placeholder or _PROJECT_ID in _placeholder:
        logger.warning(
            "IBM Granite credentials not configured. "
            "Using heuristic local stubs instead."
        )
        return None

    try:
        from ibm_watsonx_ai import APIClient, Credentials
        from ibm_watsonx_ai.foundation_models import ModelInference
        from ibm_watsonx_ai.foundation_models.utils.enums import ModelTypes
        from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as Params

        credentials = Credentials(url=_URL, api_key=_API_KEY)
        client = APIClient(credentials)

        _model = ModelInference(
            model_id=ModelTypes.GRANITE_13B_CHAT_V2,
            api_client=client,
            project_id=_PROJECT_ID,
            params={
                Params.MAX_NEW_TOKENS: 600,
                Params.TEMPERATURE: 0.7,
                Params.TOP_P: 0.9,
                Params.STOP_SEQUENCES: ["```"],
            },
        )
        logger.info("IBM Granite model initialised successfully.")
        return _model
    except Exception as exc:
        logger.error("Failed to initialise IBM Granite model: %s", exc)
        return None

def _call_granite(prompt: str) -> str:
    """Send prompt to IBM Granite and return the raw response text."""
    model = _get_model()
    if model is None:
        return ""
    try:
        response = model.generate_text(prompt=prompt)
        return response.strip() if isinstance(response, str) else ""
    except Exception as exc:
        logger.error("IBM Granite API call failed: %s", exc)
        return ""

def _extract_json(text: str) -> dict | None:
    """Try to parse a JSON object from text (supporting code fences)."""
    text = re.sub(r"```(?:json)?", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None

# Heuristics pools for stubs
_STRENGTHS_POOL = [
    "Clear and structured communication",
    "Good use of relevant examples",
    "Demonstrated solid technical knowledge",
    "Showed a methodical problem-solving approach",
    "Mentioned industry best practices",
    "Highlighted teamwork and collaboration",
    "Linked the answer to business value",
]

_WEAKNESSES_POOL = [
    "Could elaborate more on technical details",
    "Lacked specific metrics or measurable outcomes",
    "Answer could be more concise",
    "Missing discussion of edge cases or failure modes",
    "Could connect the answer better to real-world scenarios",
    "Consider using the STAR method for behavioural questions",
    "More depth on trade-offs would strengthen the answer",
]

def _score_answer_locally(question: str, answer: str) -> int:
    ans = answer.strip().lower()
    dont_know_phrases = [
        "i don't know", "i do not know", "idk", "no idea", "not sure",
        "i have no idea", "i cannot answer", "i can't answer",
        "don't know", "no clue",
    ]
    if any(p in ans for p in dont_know_phrases):
        return random.randint(0, 2)

    wrong_indicators = [
        "nothing", "skip", "pass", "n/a", "na", "none", "no answer",
        "abc", "xyz", "test", "hello", "hi", "ok", "okay",
    ]
    if ans in wrong_indicators or len(ans) < 15:
        return random.randint(1, 3)

    word_count = len(answer.split())
    if word_count < 10:
        base = random.randint(1, 3)
    elif word_count < 25:
        base = random.randint(3, 5)
    elif word_count < 60:
        base = random.randint(5, 7)
    elif word_count < 120:
        base = random.randint(6, 8)
    else:
        base = random.randint(7, 9)

    positive_kw = [
        "example", "for instance", "such as", "because", "therefore",
        "however", "result", "achieved", "implemented", "designed",
        "improved", "reduced", "increased", "team", "project", "solution",
        "star", "situation", "task", "action", "used", "built", "deployed",
    ]
    bonus = 1 if any(kw in ans for kw in positive_kw) else 0
    return min(10, base + bonus)

def _stub_evaluation(job_role: str, question: str = "", answer: str = "") -> dict:
    score = _score_answer_locally(question, answer)
    if score <= 2:
        strengths = ["Attempted to respond"]
        weaknesses = ["Answer is incorrect or too vague", "No relevant technical content provided", "Does not address the question asked"]
        feedback = f"This answer scored {score}/10. It does not sufficiently address the question. Revisit the topic and try again."
    elif score <= 4:
        strengths = ["Made an attempt to answer the question"]
        weaknesses = ["Answer lacks technical depth", "Missing specific examples or evidence", "Does not fully address what was asked"]
        feedback = f"This answer scored {score}/10. The response is too brief or lacks the depth expected for a {job_role} position."
    elif score <= 6:
        strengths = random.sample(_STRENGTHS_POOL[:4], 2)
        weaknesses = random.sample(_WEAKNESSES_POOL[:5], 2)
        feedback = f"This answer scored {score}/10. A decent attempt, but it needs more technical detail and concrete examples."
    elif score <= 8:
        strengths = random.sample(_STRENGTHS_POOL, 2)
        weaknesses = random.sample(_WEAKNESSES_POOL[2:], 2)
        feedback = f"Good answer scoring {score}/10. You demonstrated relevant knowledge for {job_role}. Add measurable outcomes."
    else:
        strengths = random.sample(_STRENGTHS_POOL, 3)
        weaknesses = ["Consider adding even more specific metrics to further strengthen the answer"]
        feedback = f"Excellent answer scoring {score}/10. You clearly understand the topic at the {job_role} level."
    
    return {
        "score": score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "feedback": feedback,
    }

# Public APIs

def evaluate_answer(question: str, answer: str, job_role: str, experience: str) -> dict:
    prompt = f"""<|system|>
You are a strict, senior technical interviewer conducting a real job interview for a {job_role} position.
Your job is to evaluate the candidate's answer CRITICALLY and HONESTLY.

SCORING RULES:
- Score 0-2: Answer is wrong, blank, "I don't know", or completely off-topic.
- Score 3-4: Answer is very vague, too short, or shows minimal understanding.
- Score 5-6: Partial answer — some correct points but missing key details, depth, or examples.
- Score 7-8: Good answer — correct, reasonably detailed, with an example.
- Score 9-10: Excellent — thorough, technically accurate, uses examples and metrics.

Respond ONLY with a valid JSON object.
<|user|>
Role: {job_role}
Experience Level: {experience}
Interview Question: {question}
Candidate's Answer: {answer}

Return ONLY this JSON:
{{
  "score": <integer 0-10>,
  "strengths": ["<strength>"],
  "weaknesses": ["<weakness>"],
  "feedback": "<feedback summary>"
}}
<|assistant|>
"""
    raw = _call_granite(prompt)
    if raw:
        parsed = _extract_json(raw)
        if parsed:
            try:
                return {
                    "score": max(0, min(10, int(parsed.get("score", 0)))),
                    "strengths": list(parsed.get("strengths", [])) or ["Attempted to respond"],
                    "weaknesses": list(parsed.get("weaknesses", [])) or ["Answer needs improvement"],
                    "feedback": str(parsed.get("feedback", "")),
                }
            except (ValueError, TypeError):
                pass
    return _stub_evaluation(job_role, question, answer)

def generate_suggested_answer(question: str, job_role: str, experience: str) -> str:
    prompt = f"""<|system|>
You are a top-performing {job_role} with {experience} of experience. Give a concise, high-quality model answer.
Keep the answer to 4-6 sentences. Return plain text only.
<|user|>
Interview Question: {question}
<|assistant|>
"""
    raw = _call_granite(prompt)
    if raw and len(raw) > 40:
        return raw
    return f"A strong model answer for {job_role} would clearly explain the concepts using the STAR method, linking outcomes to metrics."

def generate_questions(job_role: str, experience: str, interview_type: str, count: int = 7, resume_text: str = "", industry: str = "") -> list[str]:
    resume_section = f"\nCandidate Resume:\n{resume_text[:3000]}\n" if resume_text else ""
    industry_section = f"\nTarget Industry: {industry}" if industry else ""
    
    prompt = f"""<|system|>
You are an expert interviewer creating questions. Return ONLY a valid JSON array of exactly {count} question strings.
<|user|>
Generate {count} interview questions for:
- Role: {job_role}
- Experience: {experience}
- Type: {interview_type}{industry_section}{resume_section}

Return ONLY a JSON array, e.g.:
["Q1?", "Q2?"]
<|assistant|>
"""
    raw = _call_granite(prompt)
    if raw:
        raw_clean = re.sub(r"```(?:json)?", "", raw).strip()
        match = re.search(r"\[.*\]", raw_clean, re.DOTALL)
        if match:
            try:
                questions = json.loads(match.group())
                return [str(q).strip() for q in questions if str(q).strip()][:count]
            except json.JSONDecodeError:
                pass
    return []

COURSES_DATABASE = {
    "react": {
        "title": "React JS Course for Beginners",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=bMknfKXIFA8",
        "reason": "Complete project-based introduction to React components, hooks, and state management."
    },
    "node": {
        "title": "Node.js and Express.js - Full Course",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=Oe421EPjeBE",
        "reason": "Comprehensive guide to building backend APIs and servers with Node.js."
    },
    "django": {
        "title": "Python Django Web Framework",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=F5mRW0q-w0k",
        "reason": "Step-by-step tutorial on building database-backed Python web applications."
    },
    "git": {
        "title": "Git and GitHub Tutorial for Beginners",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=RGOj5yH7evk",
        "reason": "Learn version control, branching, committing, and remote repository collaboration."
    },
    "docker": {
        "title": "Docker for Beginners",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=fqMOX6JJhGo",
        "reason": "Understand containerization, Dockerfiles, image creation, and multi-container configurations."
    },
    "kubernetes": {
        "title": "Kubernetes Crash Course",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=d6WC5n9G_sM",
        "reason": "Learn container orchestration, pod management, deployments, and cluster networking."
    },
    "aws": {
        "title": "AWS Certified Solutions Architect Course",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=Ia-UEYYR44Y",
        "reason": "Deep dive into AWS services, IAM, EC2, S3, VPC, and serverless architectures."
    },
    "gcp": {
        "title": "Google Cloud Associate Cloud Engineer",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=jpNs844fT-Y",
        "reason": "Prep course for GCP cloud environments, App Engine, and Kubernetes."
    },
    "azure": {
        "title": "Microsoft Azure Fundamentals AZ-900",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=NPEsD6n9A_I",
        "reason": "Complete preparation for the AZ-900 Azure fundamentals certification exam."
    },
    "typescript": {
        "title": "TypeScript Course for Beginners",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=BwuLxPH8IDs",
        "reason": "Learn type safety, interfaces, classes, and compiler options in TypeScript."
    },
    "javascript": {
        "title": "JavaScript Programming Course",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=jS4aFq5-91M",
        "reason": "Core programming concepts in JS, from fundamentals to asynchronous execution."
    },
    "html": {
        "title": "HTML & CSS Full Course",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=DPnwaWdZfXg",
        "reason": "Learn web layout design, styling, and flexbox/grid responsive layouts."
    },
    "css": {
        "title": "HTML & CSS Full Course",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=DPnwaWdZfXg",
        "reason": "Learn web layout design, styling, and flexbox/grid responsive layouts."
    },
    "web": {
        "title": "CS50's Web Programming with Python and JS",
        "channel": "Harvard (edX)",
        "url": "https://www.edx.org/learn/web-development/harvard-university-cs50-s-web-programming-with-python-and-javascript",
        "reason": "Verifiable Harvard course on web application architecture."
    },
    "full stack": {
        "title": "Full Stack Web Development For Beginners",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=zJSY8tJY_Df",
        "reason": "Full visual tutorial covering HTML, CSS, JavaScript, and NodeJS."
    },
    "data science": {
        "title": "Data Science for Everybody Course",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=ua-CiDNNj30",
        "reason": "Comprehensive overview of statistics, data visualization, and ML models."
    },
    "machine learning": {
        "title": "Machine Learning Specialization by Andrew Ng",
        "channel": "Stanford (Coursera)",
        "url": "https://www.coursera.org/specializations/machine-learning-introduction",
        "reason": "Industry standard introduction to supervised and unsupervised learning."
    },
    "deep learning": {
        "title": "Deep Learning Specialization",
        "channel": "DeepLearning.AI (Coursera)",
        "url": "https://www.coursera.org/specializations/deep-learning",
        "reason": "Master the foundations of deep learning, neural networks, CNNs, and sequence models."
    },
    "python": {
        "title": "Python for Everybody Specialization",
        "channel": "Univ. of Michigan (Coursera)",
        "url": "https://www.coursera.org/specializations/python",
        "reason": "Highest rated Python course for beginners covering variables, data structures, and APIs."
    },
    "dsa": {
        "title": "Algorithms, Part I (Princeton University)",
        "channel": "Princeton (Coursera)",
        "url": "https://www.coursera.org/learn/algorithms-part1",
        "reason": "Rigorous course covering sorting, searching, heaps, and graph algorithms."
    },
    "algorithms": {
        "title": "Data Structures & Algorithms in Python",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=8hly31xKjns",
        "reason": "Excellent visual guide to core data structures and search algorithms."
    },
    "networking": {
        "title": "Computer Networking Course by Georgia Tech",
        "channel": "Georgia Tech (Coursera)",
        "url": "https://www.coursera.org/learn/computer-networking",
        "reason": "Covers software-defined networking (SDN), routing, and security protocols."
    },
    "networks": {
        "title": "Computer Networks Lecture Series",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=IPvYjXofcl8",
        "reason": "Detailed visual lecture covering OSI and TCP/IP protocol stacks."
    },
    "database": {
        "title": "Databases: Relational Databases and SQL",
        "channel": "Stanford (edX)",
        "url": "https://www.edx.org/learn/databases/stanford-university-databases-relational-databases-and-sql",
        "reason": "Stanford curriculum covering relational algebra, joins, and normal forms."
    },
    "sql": {
        "title": "SQL Tutorial for Beginners",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=HXV3zeQKqGY",
        "reason": "Full practice guide covering database manipulation and relational queries."
    },
    "java": {
        "title": "Java Tutorial for Beginners",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=A74TOX803D0",
        "reason": "Complete visual class for core Java foundations."
    },
    "spring": {
        "title": "Spring Boot Tutorial",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=35EQXmHKZYs",
        "reason": "Build production-ready enterprise Java REST APIs with Spring Boot."
    },
    "c++": {
        "title": "C++ Programming Course for Beginners",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=vLnPwxZdW4Y",
        "reason": "Core programming paradigms and memory allocation details in C++."
    },
    "c programming": {
        "title": "C Programming Tutorial for Beginners",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=KJgsSFOSQv0",
        "reason": "Complete introduction to memory pointers, headers, and compiler variables in C."
    },
    "cloud": {
        "title": "AWS Certified Cloud Practitioner Course",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=SOTamWGuqXs",
        "reason": "Prep guide for AWS cloud foundations and structural infrastructure."
    },
    "devops": {
        "title": "DevOps Beginner Course",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=hQcFE0RD0cQ",
        "reason": "Covers CI/CD, Git operations, Docker configurations, and pipelines."
    },
    "ci/cd": {
        "title": "CI/CD DevOps Pipeline Course",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=scEDHRI-GHY",
        "reason": "Set up automated build, test, and deployment workflows with GitHub Actions/Jenkins."
    },
    "cybersecurity": {
        "title": "Introduction to IT Security",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=U_P23SqJaDc",
        "reason": "Core principles of networking security, encryption, and defense systems."
    },
    "testing": {
        "title": "Software Testing Methodologies",
        "channel": "freeCodeCamp",
        "url": "https://www.youtube.com/watch?v=u6QfIXgjwGg",
        "reason": "Covers unit testing, integration testing, QA processes, and automated testing tools."
    }
}

def get_courses_for_keywords(keywords_or_text) -> list:
    results = []
    seen_urls = set()
    
    # Normalize list/string
    if isinstance(keywords_or_text, list):
        tokens = [str(k).lower().strip() for k in keywords_or_text]
        text_lower = " " + " ".join(tokens) + " "
    else:
        text_lower = " " + str(keywords_or_text).lower().strip() + " "
        
    for key, course in COURSES_DATABASE.items():
        # Match using word boundaries or exact substring if it has special characters
        if "++" in key or "/" in key or " " in key:
            has_match = key in text_lower
        else:
            # Word boundary check
            has_match = re.search(r'\b' + re.escape(key) + r'\b', text_lower) is not None
            
        if has_match and course["url"] not in seen_urls:
            results.append(course)
            seen_urls.add(course["url"])
            
    # Default fallbacks if empty
    if not results:
        results = [
            {"title": "CS50: Introduction to Computer Science", "channel": "Harvard (edX)", "url": "https://www.edx.org/learn/computer-science/harvard-university-cs50-s-introduction-to-computer-science", "reason": "Broad baseline foundation for core CS principles and languages."},
            {"title": "IT Career Guide & General Skills Tutorial", "channel": "freeCodeCamp", "url": "https://www.youtube.com/watch?v=HXV3zeQKqGY", "reason": "Helpful roadmap tips for general placement exams."}
        ]
    return results[:3]

def analyze_resume(resume_text: str, job_role: str, experience: str) -> dict:
    prompt = f"""<|system|>
You are a top-tier senior recruiter and expert career consultant. 
Analyze the provided resume for the target job role: {job_role} with experience level: {experience}.
Provide a strict, professional evaluation focusing on structural gaps, missing industry keywords, competitiveness, and actionable suggestions.
Your output must be highly detailed and realistic.
Respond ONLY with a valid JSON.
<|user|>
Target Role: {job_role}
Experience Level: {experience}
Resume Text:
{resume_text[:4000]}

Return ONLY this JSON:
{{
  "score": <integer 0-100 reflecting matching strength (e.g. 50-95)>,
  "summary": "<comprehensive structural evaluation summary, at least 3 sentences>",
  "strengths": ["<detailed strength 1>", "<detailed strength 2>", "<detailed strength 3>"],
  "missing_skills": ["<critical missing technical skill 1>", "<critical missing technical skill 2>", "<critical missing technical skill 3>"],
  "keywords": ["<recommended resume keyword 1>", "<recommended resume keyword 2>", "<recommended resume keyword 3>", "<recommended resume keyword 4>"],
  "suggestions": ["<actionable resume improvement suggestion 1>", "<actionable resume improvement suggestion 2>", "<actionable resume improvement suggestion 3>"]
}}
<|assistant|>
"""
    raw = _call_granite(prompt)
    if raw:
        parsed = _extract_json(raw)
        if parsed:
            try:
                missing = list(parsed.get("missing_skills", []))
                return {
                    "score": max(0, min(100, int(parsed.get("score", 60)))),
                    "summary": str(parsed.get("summary", "")),
                    "strengths": list(parsed.get("strengths", [])),
                    "missing_skills": missing,
                    "keywords": list(parsed.get("keywords", [])),
                    "suggestions": list(parsed.get("suggestions", [])),
                    "suggested_courses": get_courses_for_keywords(missing + [job_role])
                }
            except (ValueError, TypeError):
                pass

    # Dynamic High-Strength Stub Fallback
    role_lower = job_role.lower()
    if "devops" in role_lower or "cloud" in role_lower:
        missing = ["CI/CD pipeline automation (GitHub Actions/Jenkins)", "Infrastructure as Code (Terraform)", "Container Orchestration (Kubernetes)", "Cloud security policies & IAM"]
        keywords = ["Terraform", "Kubernetes", "Docker", "AWS", "CI/CD", "Prometheus", "YAML", "GitOps"]
        suggestions = [
            "Add a dedicated 'DevOps & Cloud Tools' section listing Docker, Kubernetes, and Terraform.",
            "Quantify project achievements, e.g., 'Reduced deployment downtime by 40% using automated CI/CD pipelines'.",
            "Incorporate specific cloud security practices you've implemented (e.g., HTTPS, IAM, VPC)."
        ]
        summary = f"The resume demonstrates general development foundations but lacks core production DevOps tools. To match expectations for a {job_role} role, you should emphasize infrastructure automation and system reliability metrics."
    elif "data" in role_lower or "machine" in role_lower or "ml" in role_lower:
        missing = ["Statistical hypothesis testing", "Data pipeline orchestration (Airflow)", "Production ML deployment (MLflow/Docker)", "Feature engineering at scale"]
        keywords = ["Python", "Pandas", "Scikit-Learn", "TensorFlow", "SQL", "Data Pipelines", "Feature Engineering", "A/B Testing"]
        suggestions = [
            "Detail the specific machine learning algorithms used and their performance metrics (accuracy, F1-score).",
            "Add projects demonstrating data preprocessing, cleaning, and model deployments in web apps.",
            "Quantify the scale of data processed (e.g., 'Processed 10M+ rows of transactional data using Pandas')."
        ]
        summary = f"Your background shows solid mathematical fundamentals but requires stronger proof of productionizing models. Adding model inference deployment pipelines will significantly improve your competitiveness for {job_role} positions."
    elif "react" in role_lower or "front" in role_lower or "web" in role_lower:
        missing = ["State management library (Redux/Zustand)", "TypeScript integration", "Frontend build tools (Vite/Webpack)", "Core Web Vitals performance optimization"]
        keywords = ["React", "JavaScript", "TypeScript", "Redux", "Tailwind CSS", "RESTful APIs", "HTML5", "Vite"]
        suggestions = [
            "Include web application responsiveness and cross-browser testing details in projects.",
            "Add a project utilizing global state management and custom React hooks.",
            "Showcase optimization efforts (e.g., 'Improved lighthouse page load performance by 35%')."
        ]
        summary = f"The resume has strong foundations in basic web layouts, but needs to feature complex, single-page application architectures. To stand out as a {job_role}, showcase state management systems and modern compilation tools."
    else:
        missing = ["RESTful API architecture & design patterns", "Unit & integration testing (Jest/PyTest)", "Relational database normalization & optimization", "Git collaboration workflows (PRs, code reviews)"]
        keywords = ["Python", "Git", "REST APIs", "SQL", "Object-Oriented Programming", "Unit Testing", "System Design", "Agile"]
        suggestions = [
            "Mention testing coverage percentages (e.g., 'Achieved 85% test coverage using PyTest').",
            "Describe the architecture patterns (MVC, microservices) used in your backend systems.",
            "Quantify database performance optimizations, such as database query execution time reductions."
        ]
        summary = f"Your resume highlights academic coding skills, but needs more focus on industry-grade engineering practices. Highlighting software architectures, testing suites, and database performance will make you highly competitive for {job_role} roles."
        
    # Heuristic scoring based on presence of keywords in resume
    match_score = 65
    for kw in keywords:
        if kw.lower() in resume_text.lower():
            match_score += 4
    match_score = min(96, max(45, match_score))

    return {
        "score": match_score,
        "summary": summary,
        "strengths": [
            "Good foundational understanding of computer science concepts.",
            f"Demonstrates hands-on project experience related to {job_role}.",
            "Clean structure and readability of the resume document."
        ],
        "missing_skills": missing,
        "keywords": keywords,
        "suggestions": suggestions,
        "suggested_courses": get_courses_for_keywords(missing + [job_role])
    }

def analyze_skills(skills: list, target_role: str, experience: str) -> dict:
    skills_str = ", ".join(skills)
    prompt = f"""<|system|>
You are a senior recruiter. Evaluate the skill set and return ONLY valid JSON.
<|user|>
Skills: {skills_str}
Target Role: {target_role}
Experience Level: {experience}

Return ONLY this JSON:
{{
  "competitiveness_score": <integer 0-100>,
  "summary": "<assessment>",
  "strong_skills": ["<skill>"],
  "weak_skills": ["<skill to add>"],
  "trending_skills": ["<trending>"],
  "learning_suggestions": ["<suggestion>"],
  "free_courses": [
    {{"title": "<title>", "platform": "<platform>", "url": "<url>", "reason": "<why>"}}
  ]
}}
<|assistant|>
"""
    raw = _call_granite(prompt)
    if raw:
        parsed = _extract_json(raw)
        if parsed:
            try:
                return {
                    "competitiveness_score": max(0, min(100, int(parsed.get("competitiveness_score", 60)))),
                    "summary": str(parsed.get("summary", "")),
                    "strong_skills": list(parsed.get("strong_skills", [])),
                    "weak_skills": list(parsed.get("weak_skills", [])),
                    "trending_skills": list(parsed.get("trending_skills", [])),
                    "learning_suggestions": list(parsed.get("learning_suggestions", [])),
                    "free_courses": list(parsed.get("free_courses", [])),
                }
            except (ValueError, TypeError):
                pass
                
    return {
        "competitiveness_score": random.randint(55, 75),
        "summary": f"Your skills lay a good foundation for {target_role}.",
        "strong_skills": skills[:3] if skills else ["Problem Solving"],
        "weak_skills": ["Cloud architecture", "Docker containerization"],
        "trending_skills": ["MLOps", "Generative AI API Integration"],
        "learning_suggestions": ["Complete Docker/Kubernetes training."],
        "free_courses": [
            {"title": "CS50 Introduction", "platform": "edX", "url": "https://cs50.harvard.edu/x/", "reason": "Fundamentals."}
        ]
    }

def generate_roadmap(domain: str, level: str, goal: str) -> dict:
    prompt = f"""<|system|>
You are an expert technical mentor. Generate a highly detailed, personalized, step-by-step learning roadmap for target domain: {domain}.
Ensure the weekly plan is concrete, book references are real, and tips are actionable.
Respond ONLY with a valid JSON.
<|user|>
Domain: {domain}
Current Level: {level}
Goal: {goal}

Return ONLY this JSON:
{{
  "overview": "<detailed roadmap overview outlining core learning path, minimum 3 sentences>",
  "phases": [
    {{
      "title": "Phase 1: <topic>",
      "description": "<detailed focus description>",
      "topics": ["<specific topic 1>", "<specific topic 2>", "<specific topic 3>"],
      "duration": "<number of weeks>"
    }}
  ],
  "weekly_plan": [
    {{"week": "Week 1", "focus": "<concrete action items and study tasks>"}},
    {{"week": "Week 2", "focus": "<concrete action items and study tasks>"}}
  ],
  "books": [
    {{"title": "<real book title>", "author": "<author>", "reason": "<why read this book>"}}
  ],
  "videos": [
    {{"title": "<playlist>", "channel": "<channel>", "url": "<url>", "reason": "<why watch>"}}
  ],
  "tips": ["<practical tip 1>", "<practical tip 2>", "<practical tip 3>"]
}}
<|assistant|>
"""
    raw = _call_granite(prompt)
    if raw:
        parsed = _extract_json(raw)
        if parsed and parsed.get("phases"):
            try:
                return {
                    "overview": str(parsed.get("overview", "")),
                    "phases": list(parsed.get("phases", [])),
                    "weekly_plan": list(parsed.get("weekly_plan", [])),
                    "books": list(parsed.get("books", [])),
                    "videos": get_courses_for_keywords(domain),
                    "tips": list(parsed.get("tips", [])),
                }
            except (ValueError, TypeError):
                pass

    # Dynamic High-Strength Stub Fallback
    dom = domain.lower()
    if "devops" in dom or "cloud" in dom:
        overview = f"This roadmap is designed to take you from {level} to mastering DevOps principles and cloud engineering. You will learn scripting, containerization, orchestration, and continuous integration pipelines."
        phases = [
            {"title": "Phase 1: Scripting, Linux & Git", "description": "Master command line operations, version control, and shell scripting.", "topics": ["Linux commands", "Git version control", "Bash/Python scripting"], "duration": "3 weeks"},
            {"title": "Phase 2: Containers & Provisioning", "description": "Understand containerization and infrastructure management.", "topics": ["Docker containers", "Terraform IaC basics", "Network basics"], "duration": "4 weeks"},
            {"title": "Phase 3: CI/CD & Orchestration", "description": "Automate build processes and manage scaling container clusters.", "topics": ["Kubernetes (k8s)", "GitHub Actions", "Monitoring (Prometheus/Grafana)"], "duration": "5 weeks"}
        ]
        weekly_plan = [
            {"week": "Week 1", "focus": "Practice Linux commands, file permissions, and directory trees."},
            {"week": "Week 2", "focus": "Learn Git workflows: cloning, branching, merging, and pull requests."},
            {"week": "Week 3", "focus": "Write Bash and Python scripts to automate local backup files."},
            {"week": "Week 4", "focus": "Learn Docker basics: write Dockerfiles, build images, run containers."},
            {"week": "Week 5-6", "focus": "Provision infrastructure on AWS using Terraform files."},
            {"week": "Week 7-9", "focus": "Deploy multi-tier applications to a local Minikube Kubernetes cluster."},
            {"week": "Week 10-12", "focus": "Create continuous deployment workflows using GitHub Actions."}
        ]
        books = [
            {"title": "The Phoenix Project", "author": "Gene Kim", "reason": "Essential context for understanding business DevOps culture."},
            {"title": "Terraform Up & Running", "author": "Yevgeniy Brikman", "reason": "Practical hands-on guide to provisioning real cloud resources."}
        ]
    elif "data" in dom or "machine" in dom or "ml" in dom:
        overview = f"A rigorous learning path from {level} targeting Data Science and Machine Learning. Covers statistics, data manipulation, models training, and deployment."
        phases = [
            {"title": "Phase 1: Data Analytics & SQL", "description": "Learn python data libraries and relational databases querying.", "topics": ["Pandas & NumPy", "SQL Joins & Grouping", "Matplotlib visualization"], "duration": "4 weeks"},
            {"title": "Phase 2: Core Machine Learning", "description": "Master classical algorithms and mathematical evaluations.", "topics": ["Linear & Logistic Regression", "Random Forests & Trees", "Scikit-Learn models"], "duration": "4 weeks"},
            {"title": "Phase 3: Deep Learning & Deployment", "description": "Train neural networks and deploy ML models to production.", "topics": ["Neural Network layers", "TensorFlow/PyTorch basics", "REST API model deployment"], "duration": "4 weeks"}
        ]
        weekly_plan = [
            {"week": "Week 1-2", "focus": "Learn Python basics, list comprehensions, and data frames in Pandas."},
            {"week": "Week 3", "focus": "Master complex SQL queries, aggregations, and subqueries."},
            {"week": "Week 4", "focus": "Practice exploratory data analysis (EDA) on Kaggle datasets."},
            {"week": "Week 5-6", "focus": "Implement regression and classification models using Scikit-Learn."},
            {"week": "Week 7-8", "focus": "Perform model tuning: cross-validation, hyperparameter grid search."},
            {"week": "Week 9-10", "focus": "Build neural networks using TensorFlow Keras API."},
            {"week": "Week 11-12", "focus": "Deploy a trained model as a FastAPI backend inside a Docker container."}
        ]
        books = [
            {"title": "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow", "author": "Aurélien Géron", "reason": "The absolute bible for modern machine learning practices."},
            {"title": "Python for Data Analysis", "author": "Wes McKinney", "reason": "Written by the creator of Pandas; excellent dataset manipulation reference."}
        ]
    elif "react" in dom or "front" in dom or "web" in dom:
        overview = f"A fast-paced roadmap focusing on building responsive single-page web applications from {level}. Master components rendering, state management, and modern bundlers."
        phases = [
            {"title": "Phase 1: HTML, CSS & JS Core", "description": "Solidify layouts, styling, DOM manipulations, and asynchronous JS.", "topics": ["CSS flexbox/grid", "DOM manipulation", "ES6+ asynchronous functions"], "duration": "4 weeks"},
            {"title": "Phase 2: React JS Foundations", "description": "Understand virtual DOM, declarative components, and local hooks.", "topics": ["Components & Props", "useState & useEffect hooks", "Context API state"], "duration": "4 weeks"},
            {"title": "Phase 3: Production web tools", "description": "Integrate API calls, routing, global states, and deployment.", "topics": ["Redux Toolkit", "React Router", "Vite optimization & Vercel deployment"], "duration": "4 weeks"}
        ]
        weekly_plan = [
            {"week": "Week 1-2", "focus": "Build responsive websites using Flexbox, CSS variables, and clean markup."},
            {"week": "Week 3-4", "focus": "Master ES6+ syntax, array functions, Fetch API, and Promises."},
            {"week": "Week 5", "focus": "Learn React component structuring, props passing, and event handling."},
            {"week": "Week 6-7", "focus": "Manage side-effects and data loading using useEffect and custom hooks."},
            {"week": "Week 8-9", "focus": "Set up multi-page navigation using React Router v6."},
            {"week": "Week 10-11", "focus": "Implement global state management using Redux Toolkit."},
            {"week": "Week 12", "focus": "Build, bundle with Vite, and deploy a real-world app to Vercel."}
        ]
        books = [
            {"title": "Eloquent JavaScript", "author": "Marijn Haverbeke", "reason": "Deep dive into JS engine foundations and asynchronous architectures."},
            {"title": "Road to React", "author": "Robin Wieruch", "reason": "Practical, step-by-step build-up of real-world React apps."}
        ]
    else:
        overview = f"This learning roadmap helps you advance from {level} in {domain} by focusing on design patterns, algorithms, system architecture, and production engineering practices."
        phases = [
            {"title": "Phase 1: Advanced Algorithms", "description": "Master complex coding problem-solving methods.", "topics": ["Data Structures", "Recursion & Trees", "Sorting algorithms"], "duration": "4 weeks"},
            {"title": "Phase 2: System Design Basics", "description": "Learn scalable web architectures and database patterns.", "topics": ["System design patterns", "Caching & Load balancing", "Relational normalizations"], "duration": "4 weeks"},
            {"title": "Phase 3: Real Projects Building", "description": "Deploy full services in staging environments.", "topics": ["Git collaboration", "API integrations", "Docker basics"], "duration": "4 weeks"}
        ]
        weekly_plan = [
            {"week": "Week 1-2", "focus": "Solve algorithmic exercises on arrays, strings, and hash maps."},
            {"week": "Week 3-4", "focus": "Master graph traversals, binary search trees, and heap structures."},
            {"week": "Week 5-6", "focus": "Analyze architectural tradeoffs: microservices vs monolith, SQL vs NoSQL."},
            {"week": "Week 7-8", "focus": "Study caching mechanisms (Redis) and load balancing strategies."},
            {"week": "Week 9-10", "focus": "Develop a REST API backend service with complete Unit tests."},
            {"week": "Week 11-12", "focus": "Dockerize the service and create a continuous deployment pipeline."}
        ]
        books = [
            {"title": "Designing Data-Intensive Applications", "author": "Martin Kleppmann", "reason": "The gold standard for understanding modern backend systems and data models."},
            {"title": "Cracking the Coding Interview", "author": "Gayle Laakmann McDowell", "reason": "Essential guide for cracking technical coding rounds."}
        ]

    return {
        "overview": overview,
        "phases": phases,
        "weekly_plan": weekly_plan,
        "books": books,
        "videos": get_courses_for_keywords(domain),
        "tips": [
            "Practice coding daily: consistency beats intensity.",
            "Build real projects: apply what you learn in sandbox tools.",
            "Write tests for all code modules you implement."
        ]
    }

def extract_skills_from_resume(resume_text: str, job_role: str) -> list:
    prompt = f"""<|system|>
You are an expert resume parser. Return ONLY a valid JSON array of skill strings.
<|user|>
Target Role: {job_role}
Resume: {resume_text[:2000]}
<|assistant|>
"""
    raw = _call_granite(prompt)
    if raw:
        raw_clean = re.sub(r"```(?:json)?", "", raw).strip()
        match = re.search(r"\[.*\]", raw_clean, re.DOTALL)
        if match:
            try:
                skills = json.loads(match.group())
                return [str(s).strip() for s in skills if str(s).strip()][:15]
            except json.JSONDecodeError:
                pass
    
    # Fallback
    tech_keywords = [
        "python","java","javascript","typescript","react","node","django","flask",
        "sql","mysql","postgresql","mongodb","docker","kubernetes","aws","gcp","azure",
        "git","ci/cd","machine learning","tensorflow","pytorch","html","css","linux",
    ]
    found = []
    text_lower = resume_text.lower()
    for kw in tech_keywords:
        if kw in text_lower:
            found.append(kw.title())
    return found[:10] if found else ["Communication", "Problem Solving"]

def parse_resume_profile(resume_text: str) -> dict:
    prompt = f"""<|system|>
You are a resume parser. Extract candidate details and return ONLY a valid JSON object.
<|user|>
Resume Text: {resume_text[:3000]}

Return ONLY this JSON:
{{
  "name": "<name>",
  "job_role": "<target role>",
  "experience": "Entry Level (0-2 years)",
  "interview_type": "Mixed",
  "skills": ["<skill>"],
  "summary": "<summary sentence>"
}}
<|assistant|>
"""
    raw = _call_granite(prompt)
    if raw:
        parsed = _extract_json(raw)
        if parsed:
            try:
                valid_levels = {
                    "Entry Level (0-2 years)",
                    "Mid Level (2-5 years)",
                    "Senior Level (5-8 years)",
                    "Lead / Principal (8+ years)",
                }
                exp = str(parsed.get("experience", "Entry Level (0-2 years)")).strip()
                if exp not in valid_levels:
                    exp = "Entry Level (0-2 years)"
                return {
                    "name": str(parsed.get("name", "")).strip() or "Candidate",
                    "job_role": str(parsed.get("job_role", "")).strip() or "Software Engineer",
                    "experience": exp,
                    "interview_type": "Mixed",
                    "skills": list(parsed.get("skills", [])),
                    "summary": str(parsed.get("summary", "")),
                }
            except (ValueError, TypeError):
                pass

    # Heuristic fallback
    text = resume_text.lower()
    lines = resume_text.strip().splitlines()
    name = "Candidate"
    for line in lines[:5]:
        line = line.strip()
        if line and not any(c.isdigit() for c in line) and 1 < len(line.split()) <= 5:
            name = line.title()
            break
            
    job_role = "Software Engineer"
    if "data scientist" in text:
        job_role = "Data Scientist"
    elif "devops" in text:
        job_role = "DevOps Engineer"
        
    return {
        "name": name,
        "job_role": job_role,
        "experience": "Entry Level (0-2 years)",
        "interview_type": "Mixed",
        "skills": ["Python", "Git"],
        "summary": f"{name} is a student/candidate matching target role {job_role}."
    }
