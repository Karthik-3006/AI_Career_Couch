import datetime
import logging
from bson import ObjectId
from backend.app.core.database import get_db

logger = logging.getLogger(__name__)

def seed_coding_problems():
    """
    Seeds the MongoDB database with exactly 200 coding practice questions
    divided equally (40 each) across the 5 language/topic categories:
    Python, Java, DSA, C++, C.
    """
    db = get_db()
    
    # Check if we already have seeded coding practice questions
    # (Checking if count of coding quizzes is >= 200)
    count = db.quizzes.count_documents({"type": "coding"})
    if count >= 200:
        logger.info(f"Database already has {count} coding questions. Skipping seeding.")
        return
        
    logger.info(f"Seeding coding practice questions (Current count: {count}). Generating 200 questions...")
    
    # Define languages
    categories = ["Python", "Java", "DSA", "C++", "C"]
    
    # Define 8 core topics, each with 5 questions (giving 40 questions per category)
    topics = [
        {
            "name": "Arrays",
            "questions": [
                {
                    "title": "Find Maximum Element",
                    "desc": "Given an array of integers, find and return the maximum element.",
                    "diff": "easy",
                    "tc": [
                        {"input": "[1, 5, 3, 9, 2]", "output": "9"},
                        {"input": "[-1, -5, -3]", "output": "-1"},
                        {"input": "[10]", "output": "10"}
                    ]
                },
                {
                    "title": "Reverse Array",
                    "desc": "Reverse the given array of integers in-place or return a new reversed array.",
                    "diff": "easy",
                    "tc": [
                        {"input": "[1, 2, 3]", "output": "[3, 2, 1]"},
                        {"input": "[]", "output": "[]"},
                        {"input": "[4, 5]", "output": "[5, 4]"}
                    ]
                },
                {
                    "title": "Subarray Sum Equals K",
                    "desc": "Find the total number of continuous subarrays whose sum equals K.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[1, 1, 1], 2", "output": "2"},
                        {"input": "[1, 2, 3], 3", "output": "2"},
                        {"input": "[1], 0", "output": "0"}
                    ]
                },
                {
                    "title": "Rotate Array",
                    "desc": "Rotate an array to the right by k steps, where k is non-negative.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[1, 2, 3, 4, 5], 2", "output": "[4, 5, 1, 2, 3]"},
                        {"input": "[1, 2], 3", "output": "[2, 1]"},
                        {"input": "[5], 10", "output": "[5]"}
                    ]
                },
                {
                    "title": "Max Product Subarray",
                    "desc": "Find a contiguous non-empty subarray within the array that has the largest product.",
                    "diff": "hard",
                    "tc": [
                        {"input": "[2, 3, -2, 4]", "output": "6"},
                        {"input": "[-2, 0, -1]", "output": "0"},
                        {"input": "[-2, 3, 2, -4]", "output": "48"}
                    ]
                }
            ]
        },
        {
            "name": "Strings",
            "questions": [
                {
                    "title": "Reverse String",
                    "desc": "Write a function that reverses a string.",
                    "diff": "easy",
                    "tc": [
                        {"input": "'hello'", "output": "'olleh'"},
                        {"input": "'A'", "output": "'A'"},
                        {"input": "''", "output": "''"}
                    ]
                },
                {
                    "title": "Valid Palindrome",
                    "desc": "Given a string, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases.",
                    "diff": "easy",
                    "tc": [
                        {"input": "'A man, a plan, a canal: Panama'", "output": "True"},
                        {"input": "'race a car'", "output": "False"},
                        {"input": "' '", "output": "True"}
                    ]
                },
                {
                    "title": "Longest Substring Without Repeating",
                    "desc": "Find the length of the longest substring without repeating characters.",
                    "diff": "medium",
                    "tc": [
                        {"input": "'abcabcbb'", "output": "3"},
                        {"input": "'bbbbb'", "output": "1"},
                        {"input": "'pwwkew'", "output": "3"}
                    ]
                },
                {
                    "title": "Group Anagrams",
                    "desc": "Given an array of strings, group the anagrams together.",
                    "diff": "medium",
                    "tc": [
                        {"input": "['eat', 'tea', 'tan', 'ate', 'nat', 'bat']", "output": "[['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]"},
                        {"input": "['']", "output": "[['']]"},
                        {"input": "['a']", "output": "[['a']]"}
                    ]
                },
                {
                    "title": "Edit Distance",
                    "desc": "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2.",
                    "diff": "hard",
                    "tc": [
                        {"input": "'horse', 'ros'", "output": "3"},
                        {"input": "'intention', 'execution'", "output": "5"},
                        {"input": "'', 'abc'", "output": "3"}
                    ]
                }
            ]
        },
        {
            "name": "Linked Lists",
            "questions": [
                {
                    "title": "Merge Two Sorted Lists",
                    "desc": "Merge two sorted linked lists and return it as a new sorted list.",
                    "diff": "easy",
                    "tc": [
                        {"input": "[1, 2, 4], [1, 3, 4]", "output": "[1, 1, 2, 3, 4, 4]"},
                        {"input": "[], []", "output": "[]"},
                        {"input": "[], [0]", "output": "[0]"}
                    ]
                },
                {
                    "title": "Middle of Linked List",
                    "desc": "Given the head of a singly linked list, return the middle node.",
                    "diff": "easy",
                    "tc": [
                        {"input": "[1, 2, 3, 4, 5]", "output": "3"},
                        {"input": "[1, 2, 3, 4]", "output": "3"},
                        {"input": "[1]", "output": "1"}
                    ]
                },
                {
                    "title": "Reverse Linked List",
                    "desc": "Given the head of a singly linked list, reverse the list, and return the reversed list.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[1, 2, 3]", "output": "[3, 2, 1]"},
                        {"input": "[]", "output": "[]"},
                        {"input": "[1]", "output": "[1]"}
                    ]
                },
                {
                    "title": "Linked List Cycle",
                    "desc": "Determine if the linked list has a cycle in it.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[3, 2, 0, -4], 1", "output": "True"},
                        {"input": "[1, 2], -1", "output": "False"},
                        {"input": "[1], -1", "output": "False"}
                    ]
                },
                {
                    "title": "Merge k Sorted Lists",
                    "desc": "Merge k sorted linked lists and return it as one sorted list.",
                    "diff": "hard",
                    "tc": [
                        {"input": "[[1, 4, 5], [1, 3, 4], [2, 6]]", "output": "[1, 1, 2, 3, 4, 4, 5, 6]"},
                        {"input": "[]", "output": "[]"},
                        {"input": "[[]]", "output": "[]"}
                    ]
                }
            ]
        },
        {
            "name": "Stacks & Queues",
            "questions": [
                {
                    "title": "Valid Parentheses",
                    "desc": "Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
                    "diff": "easy",
                    "tc": [
                        {"input": "'()'", "output": "True"},
                        {"input": "'()[]{}'", "output": "True"},
                        {"input": "'(]'", "output": "False"}
                    ]
                },
                {
                    "title": "Implement Queue using Stacks",
                    "desc": "Implement a first in first out (FIFO) queue using only two stacks.",
                    "diff": "easy",
                    "tc": [
                        {"input": "['MyQueue', 'push', 'push', 'peek', 'pop', 'empty'], [[], [1], [2], [], [], []]", "output": "[None, None, None, 1, 1, False]"}
                    ]
                },
                {
                    "title": "Min Stack",
                    "desc": "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.",
                    "diff": "medium",
                    "tc": [
                        {"input": "['MinStack', 'push', 'push', 'push', 'getMin', 'pop', 'top', 'getMin'], [[], [-2], [0], [-3], [], [], [], []]", "output": "[None, None, None, None, -3, None, 0, -2]"}
                    ]
                },
                {
                    "title": "Evaluate Reverse Polish Notation",
                    "desc": "Evaluate the value of an arithmetic expression in Reverse Polish Notation.",
                    "diff": "medium",
                    "tc": [
                        {"input": "['2', '1', '+', '3', '*']", "output": "9"},
                        {"input": "['4', '13', '5', '/', '+']", "output": "6"},
                        {"input": "['10', '6', '9', '3', '+', '-11', '*', '/', '*', '17', '+', '5', '+']", "output": "22"}
                    ]
                },
                {
                    "title": "Largest Rectangle in Histogram",
                    "desc": "Given an array of integers heights representing the histogram's bar height where the width of each bar is 1, find the area of the largest rectangle in the histogram.",
                    "diff": "hard",
                    "tc": [
                        {"input": "[2, 1, 5, 6, 2, 3]", "output": "10"},
                        {"input": "[2, 4]", "output": "4"}
                    ]
                }
            ]
        },
        {
            "name": "Trees",
            "questions": [
                {
                    "title": "Maximum Depth of Binary Tree",
                    "desc": "Given the root of a binary tree, return its maximum depth.",
                    "diff": "easy",
                    "tc": [
                        {"input": "[3, 9, 20, None, None, 15, 7]", "output": "3"},
                        {"input": "[1, None, 2]", "output": "2"},
                        {"input": "[]", "output": "0"}
                    ]
                },
                {
                    "title": "Invert Binary Tree",
                    "desc": "Given the root of a binary tree, invert the tree, and return its root.",
                    "diff": "easy",
                    "tc": [
                        {"input": "[4, 2, 7, 1, 3, 6, 9]", "output": "[4, 7, 2, 9, 6, 3, 1]"},
                        {"input": "[2, 1, 3]", "output": "[2, 3, 1]"},
                        {"input": "[]", "output": "[]"}
                    ]
                },
                {
                    "title": "Binary Tree Level Order Traversal",
                    "desc": "Given the root of a binary tree, return the level order traversal of its nodes' values.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[3, 9, 20, None, None, 15, 7]", "output": "[[3], [9, 20], [15, 7]]"},
                        {"input": "[1]", "output": "[[1]]"},
                        {"input": "[]", "output": "[]"}
                    ]
                },
                {
                    "title": "Lowest Common Ancestor",
                    "desc": "Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[6, 2, 8, 0, 4, 7, 9, None, None, 3, 5], 2, 8", "output": "6"},
                        {"input": "[6, 2, 8, 0, 4, 7, 9, None, None, 3, 5], 2, 4", "output": "2"}
                    ]
                },
                {
                    "title": "Binary Tree Maximum Path Sum",
                    "desc": "Given a non-empty binary tree, find the maximum path sum.",
                    "diff": "hard",
                    "tc": [
                        {"input": "[1, 2, 3]", "output": "6"},
                        {"input": "[-10, 9, 20, None, None, 15, 7]", "output": "42"}
                    ]
                }
            ]
        },
        {
            "name": "Graphs",
            "questions": [
                {
                    "title": "Find Center of Star Graph",
                    "desc": "There is an undirected star graph. Find the center node.",
                    "diff": "easy",
                    "tc": [
                        {"input": "[[1, 2], [2, 3], [4, 2]]", "output": "2"},
                        {"input": "[[1, 2], [5, 1], [1, 3], [1, 4]]", "output": "1"}
                    ]
                },
                {
                    "title": "Find if Path Exists in Graph",
                    "desc": "Given an undirected graph, determine if there is a valid path from source to destination.",
                    "diff": "easy",
                    "tc": [
                        {"input": "3, [[0, 1], [1, 2], [2, 0]], 0, 2", "output": "True"},
                        {"input": "6, [[0, 1], [0, 2], [3, 5], [5, 4]], 0, 5", "output": "False"}
                    ]
                },
                {
                    "title": "Number of Islands",
                    "desc": "Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[['1', '1', '1', '1', '0'], ['1', '1', '0', '1', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '0', '0', '0']]", "output": "1"},
                        {"input": "[['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']]", "output": "3"}
                    ]
                },
                {
                    "title": "Clone Graph",
                    "desc": "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[[2, 4], [1, 3], [2, 4], [1, 3]]", "output": "[[2, 4], [1, 3], [2, 4], [1, 3]]"}
                    ]
                },
                {
                    "title": "Word Ladder",
                    "desc": "Given two words (beginWord and endWord), and a dictionary's word list, find the length of shortest transformation sequence from beginWord to endWord.",
                    "diff": "hard",
                    "tc": [
                        {"input": "'hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']", "output": "5"},
                        {"input": "'hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']", "output": "0"}
                    ]
                }
            ]
        },
        {
            "name": "Dynamic Programming",
            "questions": [
                {
                    "title": "Climbing Stairs",
                    "desc": "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
                    "diff": "easy",
                    "tc": [
                        {"input": "2", "output": "2"},
                        {"input": "3", "output": "3"},
                        {"input": "5", "output": "8"}
                    ]
                },
                {
                    "title": "Fibonacci Number",
                    "desc": "Calculate the n-th Fibonacci number.",
                    "diff": "easy",
                    "tc": [
                        {"input": "2", "output": "1"},
                        {"input": "4", "output": "3"},
                        {"input": "10", "output": "55"}
                    ]
                },
                {
                    "title": "Coin Change",
                    "desc": "Return the fewest number of coins that you need to make up that amount.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[1, 2, 5], 11", "output": "3"},
                        {"input": "[2], 3", "output": "-1"},
                        {"input": "[1], 0", "output": "0"}
                    ]
                },
                {
                    "title": "Longest Common Subsequence",
                    "desc": "Given two strings text1 and text2, return the length of their longest common subsequence.",
                    "diff": "medium",
                    "tc": [
                        {"input": "'abcde', 'ace'", "output": "3"},
                        {"input": "'abc', 'abc'", "output": "3"},
                        {"input": "'abc', 'def'", "output": "0"}
                    ]
                },
                {
                    "title": "Longest Increasing Subsequence",
                    "desc": "Given an integer array nums, return the length of the longest strictly increasing subsequence.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[10, 9, 2, 5, 3, 7, 101, 18]", "output": "4"},
                        {"input": "[0, 1, 0, 3, 2, 3]", "output": "4"},
                        {"input": "[7, 7, 7, 7]", "output": "1"}
                    ]
                }
            ]
        },
        {
            "name": "Advanced Algorithmic Topics",
            "questions": [
                {
                    "title": "Binary Search",
                    "desc": "Given a sorted array of integers nums and a target, write a function to search target in nums.",
                    "diff": "easy",
                    "tc": [
                        {"input": "[-1, 0, 3, 5, 9, 12], 9", "output": "4"},
                        {"input": "[-1, 0, 3, 5, 9, 12], 2", "output": "-1"}
                    ]
                },
                {
                    "title": "Bubble Sort Pass",
                    "desc": "Perform one complete pass of bubble sort on the array and return it.",
                    "diff": "easy",
                    "tc": [
                        {"input": "[5, 1, 4, 2, 8]", "output": "[1, 4, 2, 5, 8]"}
                    ]
                },
                {
                    "title": "Merge Sort",
                    "desc": "Sort an array of integers using merge sort.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[5, 2, 3, 1]", "output": "[1, 2, 3, 5]"},
                        {"input": "[5, 1, 1, 2, 0, 0]", "output": "[0, 0, 1, 1, 2, 5]"}
                    ]
                },
                {
                    "title": "Kth Largest Element",
                    "desc": "Find the kth largest element in an unsorted array.",
                    "diff": "medium",
                    "tc": [
                        {"input": "[3, 2, 1, 5, 6, 4], 2", "output": "5"},
                        {"input": "[3, 2, 3, 1, 2, 4, 5, 5, 6], 4", "output": "4"}
                    ]
                },
                {
                    "title": "Median of Two Sorted Arrays",
                    "desc": "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
                    "diff": "hard",
                    "tc": [
                        {"input": "[1, 3], [2]", "output": "2.0"},
                        {"input": "[1, 2], [3, 4]", "output": "2.5"}
                    ]
                }
            ]
        }
    ]
    
    # Let's generate starters for each language
    def get_starter(lang, title):
        fn_name = "solution"
        if lang == "Python" or lang == "DSA":
            return f"def {fn_name}(*args):\n    # Write your code here\n    return None"
        elif lang == "Java":
            return f"public class Solution {{\n    public Object {fn_name}(Object... args) {{\n        // Write your Java code here\n        return null;\n    }}\n}}"
        elif lang == "C++":
            return f"#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {{\npublic:\n    auto {fn_name}() {{\n        // Write your C++ code here\n        return 0;\n    }}\n}};"
        elif lang == "C":
            return f"#include <stdio.h>\n\nint {fn_name}() {{\n    // Write your C code here\n    return 0;\n}}"
        return "def solution(*args):\n    pass"

    questions_inserted = 0
    
    # We will loop over 5 categories. Each category will get all 8 topics.
    # Topic has 5 questions. So 5 * 8 = 40 questions per category!
    # Total = 40 * 5 = 200 questions!
    for lang in categories:
        for t_idx, topic in enumerate(topics):
            for q_idx, q in enumerate(topic["questions"]):
                # Customise title and starter code
                full_title = f"{q['title']} in {lang}"
                
                # Check if we should generate a variation of description/tests to make them look distinct
                doc = {
                    "type": "coding",
                    "language": lang,
                    "topic": topic["name"],
                    "title": full_title,
                    "question": f"[{lang} - {topic['name']}] {q['desc']}\nImplement this solution efficiently.",
                    "starter_code": get_starter(lang, q["title"]),
                    "test_cases": q["tc"],
                    "difficulty": q["diff"],
                    "created_at": datetime.datetime.utcnow()
                }
                
                db.quizzes.insert_one(doc)
                questions_inserted += 1

    logger.info(f"Successfully seeded {questions_inserted} coding practice questions!")

if __name__ == "__main__":
    seed_coding_problems()
