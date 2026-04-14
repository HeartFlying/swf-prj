"""GitLab Data Generator

Generates realistic mock data for GitLab API endpoints.
"""

import random
from datetime import datetime, timedelta
from typing import Optional

from faker import Faker

fake = Faker()


class GitLabDataGenerator:
    """Generator for GitLab mock data"""

    # Common commit message prefixes
    COMMIT_PREFIXES = [
        "feat:", "fix:", "docs:", "style:", "refactor:",
        "perf:", "test:", "chore:", "ci:", "build:",
    ]

    # MR states
    MR_STATES = ["opened", "closed", "merged"]

    # Member roles
    MEMBER_ROLES = ["Guest", "Reporter", "Developer", "Maintainer", "Owner"]

    def __init__(self, seed: Optional[int] = None):
        """Initialize generator with optional seed for reproducibility"""
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

    def generate_commits(
        self,
        project_id: int,
        count: int = 50,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
    ) -> list[dict]:
        """Generate mock commit data

        Args:
            project_id: Project ID
            count: Number of commits to generate
            since: Filter commits after this date
            until: Filter commits before this date

        Returns:
            List of commit dictionaries
        """
        commits = []
        base_date = datetime.now() - timedelta(days=90)

        for i in range(count):
            # Generate commit date within last 90 days
            days_ago = random.randint(0, 90)
            commit_date = datetime.now() - timedelta(days=days_ago)

            # Apply date filters
            if since and commit_date < since:
                continue
            if until and commit_date > until:
                continue

            # Generate commit message
            prefix = random.choice(self.COMMIT_PREFIXES)
            message = f"{prefix} {fake.sentence(nb_words=random.randint(3, 8))}"

            commit = {
                "id": fake.sha1(),
                "short_id": fake.sha1()[:8],
                "title": message[:72],
                "message": message,
                "author_name": fake.name(),
                "author_email": fake.email(),
                "authored_date": commit_date.isoformat(),
                "committer_name": fake.name(),
                "committer_email": fake.email(),
                "committed_date": commit_date.isoformat(),
                "created_at": commit_date.isoformat(),
                "parent_ids": [fake.sha1()] if random.random() > 0.3 else [],
                "web_url": f"https://gitlab.example.com/project/{project_id}/-/commit/{fake.sha1()}",
                "stats": {
                    "additions": random.randint(1, 500),
                    "deletions": random.randint(0, 200),
                    "total": random.randint(1, 700),
                },
            }
            commits.append(commit)

        # Sort by date descending
        commits.sort(key=lambda x: x["committed_date"], reverse=True)
        return commits

    def generate_merge_requests(
        self,
        project_id: int,
        count: int = 20,
        state: Optional[str] = None,
    ) -> list[dict]:
        """Generate mock merge request data

        Args:
            project_id: Project ID
            count: Number of MRs to generate
            state: Filter by state (opened/closed/merged)

        Returns:
            List of MR dictionaries
        """
        mrs = []

        for i in range(count):
            mr_state = state or random.choice(self.MR_STATES)
            created_at = datetime.now() - timedelta(days=random.randint(1, 60))

            # Closed/merged MRs have updated_at date
            updated_at = created_at
            if mr_state in ["closed", "merged"]:
                updated_at = created_at + timedelta(days=random.randint(1, 14))

            mr = {
                "id": random.randint(1000, 9999),
                "iid": i + 1,
                "project_id": project_id,
                "title": fake.sentence(nb_words=random.randint(4, 10)),
                "description": fake.paragraph(nb_sentences=random.randint(2, 5)),
                "state": mr_state,
                "created_at": created_at.isoformat(),
                "updated_at": updated_at.isoformat(),
                "merged_at": updated_at.isoformat() if mr_state == "merged" else None,
                "closed_at": updated_at.isoformat() if mr_state == "closed" else None,
                "source_branch": f"feature/{fake.slug()}",
                "target_branch": "main",
                "author": {
                    "id": random.randint(1, 100),
                    "name": fake.name(),
                    "username": fake.user_name(),
                    "avatar_url": f"https://www.gravatar.com/avatar/{fake.md5()}",
                },
                "assignee": {
                    "id": random.randint(1, 100),
                    "name": fake.name(),
                    "username": fake.user_name(),
                } if random.random() > 0.3 else None,
                "labels": random.sample(
                    ["bug", "feature", "enhancement", "documentation", "refactoring"],
                    k=random.randint(0, 2),
                ),
                "web_url": f"https://gitlab.example.com/project/{project_id}/merge_requests/{i+1}",
                "changes_count": str(random.randint(1, 50)),
                "merge_status": "can_be_merged" if mr_state == "opened" else None,
                "draft": random.random() > 0.9,
                "has_conflicts": random.random() > 0.95,
            }
            mrs.append(mr)

        return mrs

    def generate_members(
        self,
        project_id: int,
        count: int = 10,
    ) -> list[dict]:
        """Generate mock project member data

        Args:
            project_id: Project ID
            count: Number of members to generate

        Returns:
            List of member dictionaries
        """
        members = []

        # Ensure at least one owner
        owner = {
            "id": 1,
            "username": fake.user_name(),
            "name": fake.name(),
            "state": "active",
            "avatar_url": f"https://www.gravatar.com/avatar/{fake.md5()}",
            "web_url": f"https://gitlab.example.com/{fake.user_name()}",
            "access_level": 50,
            "access_level_description": "Owner",
            "created_at": (datetime.now() - timedelta(days=random.randint(100, 500))).isoformat(),
            "expires_at": None,
        }
        members.append(owner)

        for i in range(1, count):
            role = random.choice(self.MEMBER_ROLES[:-1])  # Exclude Owner for others
            access_level = self._get_access_level(role)

            member = {
                "id": i + 1,
                "username": fake.user_name(),
                "name": fake.name(),
                "state": random.choice(["active", "active", "active", "blocked"]),
                "avatar_url": f"https://www.gravatar.com/avatar/{fake.md5()}",
                "web_url": f"https://gitlab.example.com/{fake.user_name()}",
                "access_level": access_level,
                "access_level_description": role,
                "created_at": (datetime.now() - timedelta(days=random.randint(10, 300))).isoformat(),
                "expires_at": (datetime.now() + timedelta(days=random.randint(1, 90))).isoformat()
                if random.random() > 0.8 else None,
            }
            members.append(member)

        return members

    def _get_access_level(self, role: str) -> int:
        """Convert role name to access level number"""
        levels = {
            "Guest": 10,
            "Reporter": 20,
            "Developer": 30,
            "Maintainer": 40,
            "Owner": 50,
        }
        return levels.get(role, 30)
