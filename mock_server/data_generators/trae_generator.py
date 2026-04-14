"""Trae Data Generator

Generates realistic mock data for Trae API endpoints.
"""

import random
from datetime import datetime, timedelta
from typing import Optional

from faker import Faker

fake = Faker()


class TraeDataGenerator:
    """Generator for Trae mock data"""

    # AI model types
    AI_MODELS = [
        "claude-3-opus",
        "claude-3-sonnet",
        "claude-3-haiku",
        "gpt-4",
        "gpt-4-turbo",
        "gpt-3.5-turbo",
    ]

    # Suggestion types
    SUGGESTION_TYPES = [
        "code_completion",
        "code_explanation",
        "refactoring",
        "bug_fix",
        "documentation",
        "test_generation",
        "code_review",
    ]

    # Programming languages
    LANGUAGES = [
        "python", "javascript", "typescript", "java", "go",
        "rust", "cpp", "c", "csharp", "ruby", "php", "swift",
    ]

    def __init__(self, seed: Optional[int] = None):
        """Initialize generator with optional seed for reproducibility"""
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

    def generate_token_usage(
        self,
        count: int = 30,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> list[dict]:
        """Generate mock token usage data

        Args:
            count: Number of usage records to generate
            user_id: Filter by user ID
            start_date: Filter records after this date
            end_date: Filter records before this date

        Returns:
            List of token usage dictionaries
        """
        usage_records = []
        base_date = end_date or datetime.now()
        start = start_date or (base_date - timedelta(days=30))

        for i in range(count):
            # Generate random date within range
            days_offset = random.randint(0, (base_date - start).days)
            record_date = start + timedelta(days=days_offset)

            model = random.choice(self.AI_MODELS)

            # Generate realistic token counts based on model
            input_tokens = self._generate_token_count(model, "input")
            output_tokens = self._generate_token_count(model, "output")
            total_tokens = input_tokens + output_tokens

            # Calculate cost (approximate rates)
            cost = self._calculate_cost(model, input_tokens, output_tokens)

            record = {
                "id": f"usage_{i+1:06d}",
                "user_id": user_id or fake.uuid4(),
                "session_id": fake.uuid4(),
                "model": model,
                "timestamp": record_date.isoformat(),
                "tokens": {
                    "input": input_tokens,
                    "output": output_tokens,
                    "total": total_tokens,
                },
                "cost": {
                    "currency": "USD",
                    "amount": round(cost, 6),
                },
                "request_type": random.choice(self.SUGGESTION_TYPES),
                "language": random.choice(self.LANGUAGES),
                "latency_ms": random.randint(200, 5000),
                "status": random.choice(["success", "success", "success", "error"]),
                "metadata": {
                    "file_extension": random.choice([".py", ".js", ".ts", ".java", ".go"]),
                    "lines_of_code": random.randint(5, 200),
                    "context_length": random.randint(100, 8000),
                },
            }
            usage_records.append(record)

        # Sort by date descending
        usage_records.sort(key=lambda x: x["timestamp"], reverse=True)
        return usage_records

    def generate_ai_suggestions(
        self,
        count: int = 50,
        user_id: Optional[str] = None,
        suggestion_type: Optional[str] = None,
    ) -> list[dict]:
        """Generate mock AI suggestion data

        Args:
            count: Number of suggestions to generate
            user_id: Filter by user ID
            suggestion_type: Filter by suggestion type

        Returns:
            List of AI suggestion dictionaries
        """
        suggestions = []

        for i in range(count):
            sug_type = suggestion_type or random.choice(self.SUGGESTION_TYPES)
            created_at = datetime.now() - timedelta(hours=random.randint(1, 720))

            # Generate suggestion content based on type
            content = self._generate_suggestion_content(sug_type)

            suggestion = {
                "id": f"sug_{i+1:06d}",
                "user_id": user_id or fake.uuid4(),
                "type": sug_type,
                "status": random.choice(["accepted", "rejected", "pending", "ignored"]),
                "created_at": created_at.isoformat(),
                "completed_at": (created_at + timedelta(seconds=random.randint(5, 300))).isoformat()
                if random.random() > 0.3 else None,
                "model": random.choice(self.AI_MODELS),
                "context": {
                    "file_path": fake.file_path(extension="py"),
                    "line_start": random.randint(1, 500),
                    "line_end": random.randint(1, 50),
                    "language": random.choice(self.LANGUAGES),
                    "cursor_position": random.randint(0, 1000),
                },
                "suggestion": {
                    "original_code": content.get("original", ""),
                    "suggested_code": content.get("suggested", ""),
                    "explanation": content.get("explanation", ""),
                    "confidence_score": round(random.uniform(0.7, 0.99), 2),
                },
                "user_feedback": {
                    "rating": random.randint(1, 5) if random.random() > 0.5 else None,
                    "comment": fake.sentence() if random.random() > 0.8 else "",
                },
                "metrics": {
                    "time_to_accept_ms": random.randint(500, 30000) if random.random() > 0.5 else None,
                    "edit_distance": random.randint(1, 100),
                    "tokens_generated": random.randint(10, 500),
                },
            }
            suggestions.append(suggestion)

        # Sort by date descending
        suggestions.sort(key=lambda x: x["created_at"], reverse=True)
        return suggestions

    def _generate_token_count(self, model: str, token_type: str) -> int:
        """Generate realistic token count based on model and type"""
        if token_type == "input":
            # Input tokens typically larger (context + prompt)
            base = random.randint(100, 4000)
        else:
            # Output tokens typically smaller (response)
            base = random.randint(50, 1500)

        # Adjust based on model capability
        if "opus" in model or "gpt-4" in model:
            base = int(base * 1.2)  # Larger context windows

        return base

    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate approximate cost in USD"""
        # Approximate rates per 1K tokens
        rates = {
            "claude-3-opus": {"input": 0.015, "output": 0.075},
            "claude-3-sonnet": {"input": 0.003, "output": 0.015},
            "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
            "gpt-4": {"input": 0.03, "output": 0.06},
            "gpt-4-turbo": {"input": 0.01, "output": 0.03},
            "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
        }

        rate = rates.get(model, {"input": 0.01, "output": 0.02})
        input_cost = (input_tokens / 1000) * rate["input"]
        output_cost = (output_tokens / 1000) * rate["output"]

        return input_cost + output_cost

    def _generate_suggestion_content(self, suggestion_type: str) -> dict:
        """Generate suggestion content based on type"""
        contents = {
            "code_completion": {
                "original": "def calculate_total(items):\n    total = 0\n    for item in items:\n        ",
                "suggested": "def calculate_total(items):\n    total = 0\n    for item in items:\n        total += item.price * item.quantity\n    return total",
                "explanation": "Complete the function by adding the item price multiplied by quantity to the total, then return the total.",
            },
            "code_explanation": {
                "original": "",
                "suggested": "",
                "explanation": "This function uses a list comprehension to filter even numbers from the input list and returns a new list containing only those even numbers.",
            },
            "refactoring": {
                "original": "result = []\nfor i in range(len(items)):\n    if items[i] > 0:\n        result.append(items[i] * 2)",
                "suggested": "result = [item * 2 for item in items if item > 0]",
                "explanation": "Refactored to use list comprehension for better readability and performance.",
            },
            "bug_fix": {
                "original": "if user.age > 18:\n    print('Adult')",
                "suggested": "if user.age >= 18:\n    print('Adult')",
                "explanation": "Fixed off-by-one error: age 18 should be considered an adult.",
            },
            "documentation": {
                "original": "def process(data):\n    return data.strip().lower()",
                "suggested": 'def process(data):\n    """\n    Process input data by stripping whitespace and converting to lowercase.\n    \n    Args:\n        data (str): The input string to process\n    \n    Returns:\n        str: The processed string\n    """\n    return data.strip().lower()',
                "explanation": "Added docstring to document function parameters and return value.",
            },
            "test_generation": {
                "original": "",
                "suggested": "def test_calculate_total():\n    items = [Item(price=10, quantity=2), Item(price=5, quantity=3)]\n    assert calculate_total(items) == 35",
                "explanation": "Generated a test case to verify the calculate_total function works correctly.",
            },
            "code_review": {
                "original": "",
                "suggested": "",
                "explanation": "Consider using a context manager (with statement) when opening files to ensure proper resource cleanup even if an exception occurs.",
            },
        }

        return contents.get(suggestion_type, contents["code_completion"])
