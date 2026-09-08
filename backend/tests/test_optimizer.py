"""
Unit tests for the optimizer and priority scorer.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__) + '/..')

from datetime import datetime
from data.generator import generate_defects, generate_train_timetable, defects_to_tasks
from engine.priority_scorer import score_all_defects, score_defect
from engine.task_bundler import bundle_tasks, determine_block_type, get_bundle_summary
from engine.optimizer import optimize_schedule
from engine.kpi_calculator import calculate_asset_availability, calculate_block_utilization


def test_priority_scorer():
    """Test that safety-critical defects always get high scores."""
    base_date = datetime(2026, 9, 1)
    defects = generate_defects(n=20, base_date=base_date)
    scored = score_all_defects(defects, base_date)

    # Safety-critical defects with high severity should be scored 85+
    for d in scored:
        if d.safety_critical and d.severity >= 85:
            assert d.priority_score >= 85, f"Safety-critical defect {d.defect_id} scored too low: {d.priority_score}"
            assert d.priority_label in ("Critical", "High"), f"Expected Critical/High, got {d.priority_label}"

    # All scores should be 0-100
    for d in scored:
        assert 0 <= d.priority_score <= 100, f"Score out of range: {d.priority_score}"

    # Defects should be sorted by priority (descending)
    for i in range(len(scored) - 1):
        assert scored[i].priority_score >= scored[i+1].priority_score, "Defects not sorted by priority"

    print("[PASS] Priority scorer tests passed")


def test_task_bundler():
    """Test that task bundler creates integrated blocks."""
    base_date = datetime(2026, 9, 1)
    defects = generate_defects(n=30, base_date=base_date)
    scored = score_all_defects(defects, base_date)
    tasks = defects_to_tasks(scored)

    bundles = bundle_tasks(tasks)
    summary = get_bundle_summary(bundles)

    assert summary["total_bundles"] > 0, "No bundles created"
    assert summary["total_tasks"] == len(tasks), "Not all tasks bundled"

    # Check that integrated bundles have 2+ departments
    for bundle in bundles:
        if len(bundle) >= 2:
            depts = set(t.department for t in bundle)
            block_type = determine_block_type(bundle)
            if len(depts) >= 2:
                assert block_type == "Integrated", f"Multi-dept bundle should be Integrated, got {block_type}"

    print(f"[PASS] Task bundler tests passed ({summary['integrated_bundles']} integrated bundles)")


def test_optimizer():
    """Test that optimizer produces a valid schedule."""
    base_date = datetime(2026, 9, 1)
    defects = generate_defects(n=20, base_date=base_date)
    scored = score_all_defects(defects, base_date)
    tasks = defects_to_tasks(scored)
    trains = generate_train_timetable(base_date=base_date)

    result = optimize_schedule(tasks=tasks, trains=trains, base_date=base_date, time_limit_seconds=10)

    assert result.solver_status in ("OPTIMAL", "FEASIBLE"), f"Solver failed: {result.solver_status}"
    assert len(result.blocks) > 0, "No blocks scheduled"
    assert result.total_tasks_scheduled > 0, "No tasks scheduled"
    assert result.asset_availability_pct > 0, "Asset availability should be positive"

    # Check all blocks have valid fields
    for block in result.blocks:
        assert block.block_id.startswith("BLK-"), f"Invalid block ID: {block.block_id}"
        assert block.duration_min > 0, f"Block has zero duration"
        assert len(block.departments) > 0, f"Block has no departments"
        assert len(block.assigned_tasks) > 0, f"Block has no tasks"
        assert block.status == "Proposed", f"New block should be Proposed"

    print(f"[PASS] Optimizer tests passed ({len(result.blocks)} blocks, {result.solver_status} in {result.solver_time_seconds}s)")


def test_kpi_calculator():
    """Test KPI calculations."""
    base_date = datetime(2026, 9, 1)
    defects = generate_defects(n=10, base_date=base_date)
    scored = score_all_defects(defects, base_date)
    tasks = defects_to_tasks(scored)
    trains = generate_train_timetable(base_date=base_date)
    result = optimize_schedule(tasks=tasks, trains=trains, base_date=base_date, time_limit_seconds=10)

    avail = calculate_asset_availability(result.blocks)
    util = calculate_block_utilization(result.blocks)

    assert 0 <= avail <= 100, f"Availability out of range: {avail}"
    assert 0 <= util <= 100, f"Utilization out of range: {util}"

    print(f"[PASS] KPI calculator tests passed (availability: {avail}%, utilization: {util}%)")


if __name__ == "__main__":
    test_priority_scorer()
    test_task_bundler()
    test_optimizer()
    test_kpi_calculator()
    print("\n=== All tests passed! ===")
