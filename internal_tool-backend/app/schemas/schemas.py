import enum
from typing import Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Enums (moved here from app.models.models which has been removed)
# ---------------------------------------------------------------------------

class SpaceMode(str, enum.Enum):
    engineering = "engineering"
    workstream = "workstream"


class TaskStatus(str, enum.Enum):
    backlog = "backlog"
    todo = "todo"
    in_progress = "in_progress"
    in_review = "in_review"
    done = "done"
    canceled = "canceled"


class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class GoalStatus(str, enum.Enum):
    on_track = "on_track"
    at_risk = "at_risk"
    off_track = "off_track"
    achieved = "achieved"


class SpaceUpdateHealth(str, enum.Enum):
    on_track = "on_track"
    at_risk = "at_risk"
    off_track = "off_track"


class DocType(str, enum.Enum):
    note = "note"
    spec = "spec"
    decision_log = "decision_log"


class AttachmentKind(str, enum.Enum):
    markdown = "markdown"
    pdf = "pdf"
    image = "image"


class GitRefType(str, enum.Enum):
    branch = "branch"
    pull_request = "pull_request"
    commit = "commit"


class GitRefState(str, enum.Enum):
    open = "open"
    merged = "merged"
    closed = "closed"


class InboxItemType(str, enum.Enum):
    mention = "mention"
    assignment = "assignment"
    review_request = "review_request"
    comment_reply = "comment_reply"


class UpdateCadence(str, enum.Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    name: str
    email: str
    is_admin: bool = False


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    is_admin: bool
    created_at: str


# ---------------------------------------------------------------------------
# Goals & key results
# ---------------------------------------------------------------------------

class KeyResultIn(BaseModel):
    title: str
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None


class KeyResultOut(BaseModel):
    id: str
    title: str
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    # no goal_id / created_at — KRs are embedded, not a separate collection


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[GoalStatus] = None
    target_date: Optional[str] = None   # YYYY-MM-DD string
    key_results: list[KeyResultIn] = []


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[GoalStatus] = None
    target_date: Optional[str] = None


class GoalOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: Optional[GoalStatus] = None
    target_date: Optional[str] = None
    key_results: list[KeyResultOut] = []
    created_by: Optional[str] = None
    created_at: str
    archived_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Spaces
# ---------------------------------------------------------------------------

class SpaceCreate(BaseModel):
    name: str
    mode: SpaceMode
    description: Optional[str] = None
    owner_id: Optional[str] = None
    member_ids: list[str] = []
    goal_ids: list[str] = []
    update_cadence: Optional[UpdateCadence] = None


class SpaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[str] = None
    member_ids: Optional[list[str]] = None
    goal_ids: Optional[list[str]] = None
    update_cadence: Optional[UpdateCadence] = None


class SpaceOut(BaseModel):
    id: str
    name: str
    mode: SpaceMode
    description: Optional[str] = None
    owner_id: Optional[str] = None
    member_ids: list[str] = []
    goal_ids: list[str] = []
    update_cadence: Optional[UpdateCadence] = None
    created_at: str
    archived_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

class GitLinkOut(BaseModel):
    ref_type: str
    url: str
    external_id: Optional[str] = None
    state: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    space_id: Optional[str] = None
    status: TaskStatus = TaskStatus.backlog
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[str] = None        # YYYY-MM-DD string
    tag_space_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[TaskStatus] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[str] = None
    space_id: Optional[str] = None
    tag_space_id: Optional[str] = None


class CommentIn(BaseModel):
    body: str
    parent_comment_id: Optional[str] = None


class CommentOut(BaseModel):
    id: str
    author_id: str
    body: str
    parent_comment_id: Optional[str] = None
    created_at: str
    edited_at: Optional[str] = None


class TaskOut(BaseModel):
    id: str
    key: Optional[str] = None
    space_id: Optional[str] = None
    title: str
    status: str
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    tag_space_id: Optional[str] = None
    git_links: list[GitLinkOut] = []
    comments: list[CommentOut] = []
    created_by: Optional[str] = None
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

class DocumentCreate(BaseModel):
    title: str = "Untitled"
    space_id: Optional[str] = None
    doc_type: Optional[DocType] = None
    content: str = ""
    url: Optional[str] = None            # external link (bookmark); no bytes stored


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    doc_type: Optional[DocType] = None
    space_id: Optional[str] = None
    url: Optional[str] = None


class DocumentOut(BaseModel):
    id: str
    title: str
    owner_id: str
    space_id: Optional[str] = None
    doc_type: Optional[str] = None
    content: str
    url: Optional[str] = None
    linked_task_ids: list[str] = []
    comments: list[CommentOut] = []
    created_at: str
    updated_at: str
    archived_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Thread posts
# ---------------------------------------------------------------------------

class ThreadPostCreate(BaseModel):
    space_id: Optional[str] = None
    kind: str                           # "message" | "status"
    body: str
    health: Optional[str] = None        # only meaningful on kind="status"
    parent_post_id: Optional[str] = None
    period_label: Optional[str] = None


class ThreadPostOut(BaseModel):
    id: str
    space_id: Optional[str] = None
    author_id: str
    kind: str
    body: str
    health: Optional[str] = None
    parent_post_id: Optional[str] = None
    period_label: Optional[str] = None
    created_at: str


# ---------------------------------------------------------------------------
# Inbox
# ---------------------------------------------------------------------------

class InboxItemOut(BaseModel):
    id: str
    user_id: str
    type: str
    task_id: Optional[str] = None
    document_id: Optional[str] = None
    post_id: Optional[str] = None
    read_at: Optional[str] = None
    created_at: str


# ---------------------------------------------------------------------------
# Git links (Phase 5 — webhook-driven state transitions)
# ---------------------------------------------------------------------------

class GitLinkCreate(BaseModel):
    ref_type: str                   # "branch" | "pull_request" | "commit"
    url: str
    external_id: Optional[str] = None   # PR number / commit sha
    state: Optional[str] = None     # "open" | "merged" | "closed"


class GitLinkStateUpdate(BaseModel):
    state: str                      # "open" | "merged" | "closed"


# ---------------------------------------------------------------------------
# Meetings (Phase 5)
# ---------------------------------------------------------------------------

class ActionItemIn(BaseModel):
    text: str


class ActionItemUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None


class ActionItemOut(BaseModel):
    id: str
    text: str
    done: bool
    task_id: Optional[str] = None


class MeetingCreate(BaseModel):
    title: str
    scheduled_at: str               # ISO-8601
    attendee_ids: list[str] = []
    outcomes: Optional[str] = None  # markdown
    action_items: list[ActionItemIn] = []
    related_space_ids: list[str] = []
    related_goal_ids: list[str] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    scheduled_at: Optional[str] = None
    attendee_ids: Optional[list[str]] = None
    outcomes: Optional[str] = None
    related_space_ids: Optional[list[str]] = None
    related_goal_ids: Optional[list[str]] = None


class MeetingOut(BaseModel):
    id: str
    title: str
    scheduled_at: str
    attendee_ids: list[str] = []
    outcomes: Optional[str] = None
    action_items: list[ActionItemOut] = []
    related_space_ids: list[str] = []
    related_goal_ids: list[str] = []
    created_by: Optional[str] = None
    created_at: str
