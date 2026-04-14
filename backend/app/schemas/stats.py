"""Statistics schemas for request/response validation."""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


def to_camel_case(snake_str: str) -> str:
    """Convert snake_case to camelCase."""
    components = snake_str.split('_')
    return components[0] + ''.join(word.capitalize() for word in components[1:])


class TokenTrendResponse(BaseModel):
    """Schema for token usage trend response."""

    dates: list[str] = Field(default_factory=list, description="日期列表")
    values: list[int] = Field(default_factory=list, description="Token使用量列表")


class ActivityTrendResponse(BaseModel):
    """Schema for activity trend response."""

    dates: list[str] = Field(default_factory=list, description="日期列表")
    active_users: list[int] = Field(default_factory=list, description="活跃用户数列表")
    total_commits: list[int] = Field(default_factory=list, description="提交数列表")


class TopUserResponse(BaseModel):
    """Schema for top user response."""

    user_id: int = Field(..., description="用户ID")
    username: str = Field(..., description="用户名")
    department: str | None = Field(None, description="部门")
    token_count: int = Field(default=0, description="Token使用量")
    commit_count: int = Field(default=0, description="提交次数")


class ProjectStatsResponse(BaseModel):
    """Schema for project statistics response."""

    project_id: int = Field(..., description="项目ID")
    project_name: str = Field(..., description="项目名称")
    total_commits: int = Field(default=0, description="总提交数")
    total_tokens: int = Field(default=0, description="总Token使用量")
    active_members: int = Field(default=0, description="活跃成员数")
    bug_count: int = Field(default=0, description="Bug数量")


class CodeRankResponse(BaseModel):
    """Schema for code rank response."""

    user_id: int = Field(..., description="用户ID")
    username: str = Field(..., description="用户名")
    lines_added: int = Field(default=0, description="新增代码行数")
    lines_deleted: int = Field(default=0, description="删除代码行数")
    total_lines: int = Field(default=0, description="总代码行数")


class CommitRankResponse(BaseModel):
    """Response schema for commit ranking by commit count."""

    user_id: int = Field(..., description="用户ID")
    username: str = Field(..., description="用户名")
    commit_count: int = Field(..., description="提交次数")
    avg_commits_per_day: float = Field(..., description="日均提交次数")


class BugTrendResponse(BaseModel):
    """Schema for bug trend response."""

    dates: list[str] = Field(default_factory=list, description="日期列表")
    created: list[int] = Field(default_factory=list, description="创建的Bug数")
    resolved: list[int] = Field(default_factory=list, description="解决的Bug数")


class AIAdoptionResponse(BaseModel):
    """Schema for AI adoption rate response."""

    date: str = Field(..., description="日期")
    adoption_rate: float = Field(default=0.0, description="采纳率(0-100)")
    ai_suggestions: int = Field(default=0, description="AI建议数")
    accepted_suggestions: int = Field(default=0, description="接受的建议数")


class PersonalCodeStatsResponse(BaseModel):
    """Schema for personal code statistics response."""

    total_commits: int = Field(default=0, description="总提交数")
    total_prs: int = Field(default=0, description="总PR数")
    lines_added: int = Field(default=0, description="新增代码行数")
    lines_deleted: int = Field(default=0, description="删除代码行数")
    avg_commits_per_day: float = Field(default=0.0, description="日均提交数")


class PersonalTokenStatsResponse(BaseModel):
    """Schema for personal token statistics response."""

    total_tokens: int = Field(default=0, description="总Token使用量")
    prompt_tokens: int = Field(default=0, description="Prompt Token使用量")
    completion_tokens: int = Field(default=0, description="Completion Token使用量")
    avg_tokens_per_day: float = Field(default=0.0, description="日均Token使用量")


class PersonalBugRateResponse(BaseModel):
    """Schema for personal bug rate response."""

    total_bugs: int = Field(default=0, description="Bug总数")
    critical_bugs: int = Field(default=0, description="严重Bug数")
    bug_rate: float = Field(default=0.0, description="Bug率")
    resolved_bugs: int = Field(default=0, description="已解决Bug数")


class HeatmapDataPoint(BaseModel):
    """Schema for a single heatmap data point.

    Represents activity data for a specific date in the heatmap.
    Similar to GitHub contribution graph data format.
    """

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel_case,
        populate_by_name=True,
    )

    date: str = Field(..., description="日期 (YYYY-MM-DD格式)")
    count: int = Field(..., description="活动计数（提交数、Token使用量等）")
    level: int = Field(..., description="活动等级 (0-4, 0=无活动, 4=高活动)")


class HeatmapResponse(BaseModel):
    """Schema for heatmap data response.

    Returns user activity data formatted for heatmap visualization,
    similar to GitHub's contribution graph.
    """

    model_config = ConfigDict(from_attributes=True)

    user_id: int = Field(..., description="用户ID")
    data: list[HeatmapDataPoint] = Field(default_factory=list, description="热力图数据点列表")
    total_days: int = Field(default=30, description="统计天数")
    start_date: str = Field(..., description="开始日期 (YYYY-MM-DD格式)")
    end_date: str = Field(..., description="结束日期 (YYYY-MM-DD格式)")


class TodayStats(BaseModel):
    """Schema for today's statistics."""

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel_case,
        populate_by_name=True,
    )

    commits: int = Field(default=0, description="今日提交数")
    additions: int = Field(default=0, description="今日新增代码行数")
    deletions: int = Field(default=0, description="今日删除代码行数")
    tokens: int = Field(default=0, description="今日Token使用量")
    sessions: int = Field(default=0, description="今日编码时长(小时)")


class WeeklyTrend(BaseModel):
    """Schema for weekly trend data."""

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel_case,
        populate_by_name=True,
    )

    dates: list[str] = Field(default_factory=list, description="日期列表")
    commits: list[int] = Field(default_factory=list, description="每日提交数列表")
    tokens: list[int] = Field(default_factory=list, description="每日Token使用量列表")


class LanguageStat(BaseModel):
    """Schema for language statistics."""

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel_case,
        populate_by_name=True,
    )

    language: str = Field(..., description="编程语言")
    lines: int = Field(default=0, description="代码行数")
    percentage: float = Field(default=0.0, description="占比百分比")


class RankingInfo(BaseModel):
    """Schema for ranking information."""

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel_case,
        populate_by_name=True,
    )

    commits: int = Field(default=0, description="当前用户提交数")
    total_users: int = Field(default=0, description="总用户数")


class PersonalDashboardResponse(BaseModel):
    """Schema for personal dashboard statistics response.

    Matches frontend expected structure in PersonalDashboard type.
    """

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel_case,
        populate_by_name=True,
    )

    today_stats: TodayStats = Field(default_factory=TodayStats, description="今日统计数据")
    weekly_trend: WeeklyTrend = Field(default_factory=WeeklyTrend, description="周趋势数据")
    language_stats: list[LanguageStat] = Field(default_factory=list, description="语言分布统计")
    heatmap_data: list[HeatmapDataPoint] = Field(default_factory=list, description="热力图数据")
    ranking: RankingInfo = Field(default_factory=RankingInfo, description="排行榜信息")


class TotalStats(BaseModel):
    """Schema for project total statistics."""

    commits: int = Field(default=0, description="总提交数")
    contributors: int = Field(default=0, description="贡献者数量")
    lines_of_code: int = Field(default=0, description="代码行数")
    pull_requests: int = Field(default=0, description="PR数量")


class MemberStat(BaseModel):
    """Schema for member statistics."""

    user_id: int = Field(..., description="用户ID")
    username: str = Field(..., description="用户名")
    commits: int = Field(default=0, description="提交数")
    additions: int = Field(default=0, description="新增代码行数")
    deletions: int = Field(default=0, description="删除代码行数")
    tokens: int = Field(default=0, description="Token使用量")


class LanguageDistribution(BaseModel):
    """Schema for language distribution."""

    language: str = Field(..., description="编程语言")
    percentage: float = Field(..., description="占比百分比")


class CommitTrend(BaseModel):
    """Schema for commit trend."""

    dates: list[str] = Field(default_factory=list, description="日期列表")
    commits: list[int] = Field(default_factory=list, description="每日提交数列表")


class CodeTrendResponse(BaseModel):
    """Schema for code trend response.

    Provides daily code line statistics including additions, deletions,
    and cumulative total lines for code trend visualization.
    """

    dates: list[str] = Field(default_factory=list, description="日期列表")
    total_lines: list[int] = Field(default_factory=list, description="累计代码总行数列表")
    additions: list[int] = Field(default_factory=list, description="每日新增代码行数列表")
    deletions: list[int] = Field(default_factory=list, description="每日删除代码行数列表")


class ProjectDashboardResponse(BaseModel):
    """Schema for project dashboard statistics response.

    Matches frontend expected structure in ProjectDashboard type.
    """

    model_config = ConfigDict(from_attributes=True)

    project_id: int = Field(..., description="项目ID")
    project_name: str = Field(..., description="项目名称")
    total_stats: TotalStats = Field(default_factory=TotalStats, description="项目总体统计")
    member_stats: list[MemberStat] = Field(default_factory=list, description="成员统计列表")
    language_distribution: list[LanguageDistribution] = Field(default_factory=list, description="语言分布")
    commit_trend: CommitTrend = Field(default_factory=CommitTrend, description="提交趋势")


class TopUsersResponse(BaseModel):
    """Schema for top users response (list wrapper)."""

    users: list[TopUserResponse] = Field(default_factory=list, description="用户排行列表")
    total_count: int = Field(default=0, description="总用户数")


class GlobalSummaryResponse(BaseModel):
    """Schema for global summary statistics response."""

    total_users: int = Field(default=0, description="总用户数")
    total_projects: int = Field(default=0, description="总项目数")
    total_commits: int = Field(default=0, description="总提交数")
    total_tokens: int = Field(default=0, description="总Token使用量")
    total_bugs: int = Field(default=0, description="总Bug数")
    active_users_today: int = Field(default=0, description="今日活跃用户数")
    period_days: int = Field(default=30, description="统计周期天数")


class ActivityHourData(BaseModel):
    """Schema for activity hour data.

    Represents user activity distribution by hour of day (0-23).
    """

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel_case,
        populate_by_name=True,
    )

    hour: int = Field(..., ge=0, le=23, description="小时 (0-23)")
    count: int = Field(default=0, description="该小时的活动次数")
