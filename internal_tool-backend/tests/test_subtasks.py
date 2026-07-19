"""Sub-task invariants (design §6 #13–#16)."""
from tests.conftest import as_user


def _create(ctx, **body):
    r = ctx.client.post("/tasks", json=body)
    assert r.status_code == 201, r.text
    return r.json()


# ── §6 #14: scope inheritance ────────────────────────────────────────────────

def test_subtask_inherits_shared_parent_space(ctx):
    parent = _create(ctx, title="Parent", space_id="s-auth")
    sub = _create(ctx, title="Sub", parent_task_id=parent["id"])
    assert sub["space_id"] == "s-auth"
    assert sub["parent_task_id"] == parent["id"]


def test_subtask_ignores_client_space_and_inherits_parent(ctx):
    # Personal parent owned by alice; client tries to smuggle a space_id on the sub-task.
    parent = _create(ctx, title="Personal parent")           # space_id omitted -> personal
    assert parent["space_id"] is None
    sub = _create(ctx, title="Sub", parent_task_id=parent["id"], space_id="s-sneaky")
    # Inherited from the parent (personal), NOT the client-supplied space.
    assert sub["space_id"] is None
    assert sub["created_by"] == "u-alice"


# ── §6 #13: one level of nesting ─────────────────────────────────────────────

def test_cannot_nest_subtask_under_subtask(ctx):
    parent = _create(ctx, title="Parent", space_id="s-auth")
    sub = _create(ctx, title="Sub", parent_task_id=parent["id"])
    r = ctx.client.post("/tasks", json={"title": "Grandchild", "parent_task_id": sub["id"]})
    assert r.status_code == 409


def test_subtask_under_missing_parent_404(ctx):
    r = ctx.client.post("/tasks", json={"title": "Sub", "parent_task_id": "does-not-exist"})
    assert r.status_code == 404


# ── §6 #2/#14: privacy ───────────────────────────────────────────────────────

def test_personal_parent_subtask_hidden_from_others(ctx):
    parent = _create(ctx, title="Alice private")             # personal, owned by alice
    sub = _create(ctx, title="Alice sub", parent_task_id=parent["id"])

    as_user(ctx, "u-bob")
    # Not in bob's task list...
    listed = ctx.client.get("/tasks").json()
    assert all(t["id"] != sub["id"] for t in listed)
    # ...and a direct GET 404s.
    assert ctx.client.get(f"/tasks/{sub['id']}").status_code == 404
    # ...and bob cannot create a sub-task under alice's private parent.
    assert ctx.client.post(
        "/tasks", json={"title": "x", "parent_task_id": parent["id"]}
    ).status_code == 404


def test_subtasks_listable_by_parent(ctx):
    parent = _create(ctx, title="Parent", space_id="s-auth")
    a = _create(ctx, title="A", parent_task_id=parent["id"])
    b = _create(ctx, title="B", parent_task_id=parent["id"])
    _create(ctx, title="Unrelated", space_id="s-auth")

    ids = {t["id"] for t in ctx.client.get(f"/tasks?parent_task_id={parent['id']}").json()}
    assert ids == {a["id"], b["id"]}


# ── §6 #15: cascade cancel ───────────────────────────────────────────────────

def test_cancel_parent_cascades_to_open_subtasks(ctx):
    parent = _create(ctx, title="Parent", space_id="s-auth")
    open_sub = _create(ctx, title="Open", parent_task_id=parent["id"])
    done_sub = _create(ctx, title="Done", parent_task_id=parent["id"])
    ctx.client.patch(f"/tasks/{done_sub['id']}", json={"status": "done"})

    # Cancel the parent via PATCH.
    ctx.client.patch(f"/tasks/{parent['id']}", json={"status": "canceled"})

    assert ctx.client.get(f"/tasks/{open_sub['id']}").json()["status"] == "canceled"
    # A finished sub-task is left as-is.
    assert ctx.client.get(f"/tasks/{done_sub['id']}").json()["status"] == "done"


def test_delete_parent_cascades_to_open_subtasks(ctx):
    parent = _create(ctx, title="Parent", space_id="s-auth")
    sub = _create(ctx, title="Open", parent_task_id=parent["id"])

    assert ctx.client.delete(f"/tasks/{parent['id']}").status_code == 204

    assert ctx.client.get(f"/tasks/{sub['id']}").json()["status"] == "canceled"


# ── §6 #16: parent status is not derived ─────────────────────────────────────

def test_completing_all_subtasks_does_not_autocomplete_parent(ctx):
    parent = _create(ctx, title="Parent", space_id="s-auth")
    sub = _create(ctx, title="Only sub", parent_task_id=parent["id"])

    ctx.client.patch(f"/tasks/{sub['id']}", json={"status": "done"})

    assert ctx.client.get(f"/tasks/{parent['id']}").json()["status"] == "backlog"
