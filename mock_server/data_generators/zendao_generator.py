"""ZenTao Data Generator

Generates realistic mock data for ZenTao API endpoints.
"""

import random
from datetime import datetime, timedelta
from typing import Optional

from faker import Faker

fake = Faker()


class ZenTaoDataGenerator:
    """Generator for ZenTao mock data"""

    # Bug severities
    BUG_SEVERITIES = [1, 2, 3, 4]  # 1=Critical, 2=Major, 3=Minor, 4=Trivial

    # Bug priorities
    BUG_PRIORITIES = [1, 2, 3, 4]  # 1=High, 2=Medium, 3=Low, 4=Very Low

    # Bug statuses
    BUG_STATUSES = ["active", "resolved", "closed"]

    # Bug types
    BUG_TYPES = [
        "codeerror", "config", "install", "security",
        "performance", "standard", "automation", "design",
    ]

    # Task types
    TASK_TYPES = ["design", "devel", "test", "study", "discuss", "ui", "affair", "misc"]

    # Task statuses
    TASK_STATUSES = ["wait", "doing", "done", "pause", "cancel", "closed"]

    # Task priorities
    TASK_PRIORITIES = [1, 2, 3, 4]  # 1=High, 2=Medium, 3=Low, 4=Very Low

    def __init__(self, seed: Optional[int] = None):
        """Initialize generator with optional seed for reproducibility"""
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

    def generate_bugs(
        self,
        count: int = 30,
        product_id: Optional[int] = None,
        status: Optional[str] = None,
        severity: Optional[int] = None,
    ) -> list[dict]:
        """Generate mock bug data

        Args:
            count: Number of bugs to generate
            product_id: Filter by product ID
            status: Filter by status
            severity: Filter by severity

        Returns:
            List of bug dictionaries
        """
        bugs = []

        for i in range(count):
            bug_status = status or random.choice(self.BUG_STATUSES)
            bug_severity = severity or random.choice(self.BUG_SEVERITIES)
            created_date = datetime.now() - timedelta(days=random.randint(1, 90))

            # Resolution info for resolved/closed bugs
            resolution = None
            resolved_date = None
            if bug_status in ["resolved", "closed"]:
                resolution = random.choice([
                    "fixed", "notrepro", "duplicate", "bydesign",
                    "willnotfix", "tostory", "external",
                ])
                resolved_date = created_date + timedelta(days=random.randint(1, 14))

            bug = {
                "id": i + 1,
                "product": product_id or random.randint(1, 5),
                "project": random.randint(1, 10),
                "title": f"[Bug] {fake.sentence(nb_words=random.randint(5, 10))}",
                "steps": fake.paragraph(nb_sentences=random.randint(3, 6)),
                "type": random.choice(self.BUG_TYPES),
                "severity": bug_severity,
                "pri": random.choice(self.BUG_PRIORITIES),
                "status": bug_status,
                "openedBy": fake.user_name(),
                "openedDate": created_date.isoformat(),
                "assignedTo": fake.user_name() if bug_status == "active" else "",
                "assignedDate": created_date.isoformat() if bug_status == "active" else None,
                "resolvedBy": fake.user_name() if bug_status in ["resolved", "closed"] else "",
                "resolvedDate": resolved_date.isoformat() if resolved_date else None,
                "resolution": resolution,
                "closedBy": fake.user_name() if bug_status == "closed" else "",
                "closedDate": (resolved_date + timedelta(days=random.randint(1, 7))).isoformat()
                if bug_status == "closed" and resolved_date else None,
                "lastEditedBy": fake.user_name(),
                "lastEditedDate": (created_date + timedelta(days=random.randint(0, 7))).isoformat(),
                "duplicateBug": random.randint(1, count) if resolution == "duplicate" else 0,
                "linkBug": "",
                "case": random.randint(1, 100) if random.random() > 0.7 else 0,
                "caseVersion": 1,
                "result": random.randint(1, 50) if random.random() > 0.8 else 0,
                "repo": random.randint(1, 3) if random.random() > 0.9 else 0,
                "entry": "",
                "lines": "",
                "v1": "",
                "v2": "",
                "repoType": "",
                "testtask": random.randint(1, 20) if random.random() > 0.85 else 0,
                "lastEditedBy": fake.user_name(),
                "lastEditedDate": (created_date + timedelta(days=random.randint(0, 7))).isoformat(),
            }
            bugs.append(bug)

        return bugs

    def generate_tasks(
        self,
        count: int = 40,
        project_id: Optional[int] = None,
        status: Optional[str] = None,
    ) -> list[dict]:
        """Generate mock task data

        Args:
            count: Number of tasks to generate
            project_id: Filter by project ID
            status: Filter by status

        Returns:
            List of task dictionaries
        """
        tasks = []

        for i in range(count):
            task_status = status or random.choice(self.TASK_STATUSES)
            task_type = random.choice(self.TASK_TYPES)
            created_date = datetime.now() - timedelta(days=random.randint(1, 60))

            # Calculate dates based on status
            est_started = created_date + timedelta(days=random.randint(0, 3))
            real_started = None
            finished_date = None
            deadline = est_started + timedelta(days=random.randint(3, 21))

            if task_status in ["doing", "done", "pause", "closed"]:
                real_started = est_started + timedelta(days=random.randint(0, 2))

            if task_status == "done":
                finished_date = real_started + timedelta(days=random.randint(1, 10))

            # Estimate and consumed hours
            estimate = random.randint(4, 80)
            consumed = estimate * random.uniform(0.5, 1.5) if task_status != "wait" else 0
            left = max(0, estimate - consumed) if task_status == "doing" else 0

            task = {
                "id": i + 1,
                "project": project_id or random.randint(1, 10),
                "type": task_type,
                "name": f"[{task_type.upper()}] {fake.sentence(nb_words=random.randint(4, 8))}",
                "desc": fake.paragraph(nb_sentences=random.randint(2, 5)),
                "pri": random.choice(self.TASK_PRIORITIES),
                "status": task_status,
                "openedBy": fake.user_name(),
                "openedDate": created_date.isoformat(),
                "assignedTo": fake.user_name(),
                "assignedDate": created_date.isoformat(),
                "estStarted": est_started.strftime("%Y-%m-%d"),
                "realStarted": real_started.isoformat() if real_started else None,
                "deadline": deadline.strftime("%Y-%m-%d"),
                "finishedBy": fake.user_name() if task_status == "done" else "",
                "finishedDate": finished_date.isoformat() if finished_date else None,
                "canceledBy": fake.user_name() if task_status == "cancel" else "",
                "canceledDate": (real_started + timedelta(days=random.randint(1, 3))).isoformat()
                if task_status == "cancel" and real_started else None,
                "closedBy": fake.user_name() if task_status == "closed" else "",
                "closedDate": finished_date.isoformat() if task_status == "closed" and finished_date else None,
                "closedReason": random.choice(["done", "cancel", ""] ) if task_status == "closed" else "",
                "lastEditedBy": fake.user_name(),
                "lastEditedDate": (created_date + timedelta(days=random.randint(0, 5))).isoformat(),
                "estimate": estimate,
                "consumed": round(consumed, 1),
                "left": round(left, 1),
                "story": random.randint(1, 50) if random.random() > 0.6 else 0,
                "storyVersion": 1,
                "fromBug": random.randint(1, 100) if random.random() > 0.9 else 0,
                "mailto": [fake.email() for _ in range(random.randint(0, 3))],
            }
            tasks.append(task)

        return tasks
