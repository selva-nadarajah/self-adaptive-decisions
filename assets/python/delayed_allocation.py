"""Solve the tutorial's two-period display LP with SciPy/HiGHS.

Build marginal state/action flows and coordinate them with distributions over
feasible whole displays. This is the same teaching instance as slides 12–22.

Key Components:
    - solve_display_lp: Solve the prepared restricted or expanded LP.
    - refine_display_lp: Price and add omitted assortments until LP convergence.
    - plot_refinement: Draw the computed objective history with Matplotlib.

Usage Example:
    result = refine_display_lp(rewards=[[2, 10], [4, 12], [0, 24]])

Notes:
    - Runs unchanged in local Python or Pyodide with NumPy and SciPy loaded.
    - Rewards are [low, high] pairs; unknown-state rewards are their averages.
    - Costs are additional dollars per featured product per period.
    - The LP objective is distinct from the evaluated state-independent policy.
"""
from __future__ import annotations

from typing import Any, Sequence

import numpy as np
from scipy.optimize import linprog


PRODUCTS = ("Backpack", "Cooler", "Tent")
FEASIBLE_ACTIONS = ((0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1), (1, 1, 0), (1, 0, 1))


def assortment_name(action: Sequence[int]) -> str:
    """Name a whole assortment in product order."""
    return " + ".join(name for name, chosen in zip(PRODUCTS, action) if chosen) or "Nothing"


def _solve_restricted(
    costs: Sequence[float], support: Sequence[Sequence[tuple[int, int, int]]], *,
    rewards: Sequence[Sequence[float]] | None = None
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Assemble the flow LP and return its solution and omitted-column scores."""
    costs = np.asarray(costs, dtype=float)
    if costs.shape != (3,) or not np.all(np.isfinite(costs)) or np.any(costs < 0):
        raise ValueError("Use three finite, nonnegative costs: backpack, cooler, tent.")
    actions = [list(period) for period in support]
    if len(actions) != 2 or any(not period for period in actions):
        raise ValueError("Supply a nonempty collection for each of the two periods.")
    if any(len(set(period)) != len(period) or any(a not in FEASIBLE_ACTIONS for a in period)
           for period in actions):
        raise ValueError("Collections must contain distinct feasible assortments.")
    rewards = np.asarray(rewards if rewards is not None else ((2, 10), (4, 12), (0, 24)), dtype=float)
    if rewards.shape != (3, 2) or not np.all(np.isfinite(rewards)):
        raise ValueError("Use three finite [low, high] reward pairs: backpack, cooler, tent.")
    if np.any(rewards[:, 0] > rewards[:, 1]):
        raise ValueError("Each low reward must be no greater than its high reward.")
    # Unknown demand has equally likely low/high types; observing demand reveals the type.
    profits = np.column_stack((rewards.mean(axis=1), rewards))
    keys = [(t, j, u, b) for t in range(2) for j in range(3)
            for u in (range(1) if t == 0 else range(3)) for b in (0, 1)]
    x = {key: i for i, key in enumerate(keys)}
    mu = {}
    for t, period in enumerate(actions):
        for k in range(len(period)):
            mu[t, k] = len(x) + len(mu)
    size = len(x) + len(mu)
    reward = np.zeros(size)
    for (t, j, u, b), i in x.items():
        reward[i] = b * (profits[j, u] - costs[j])

    rows, rhs = [], []

    def equality(coefficients: dict[int, float], value: float) -> int:
        """Append an equality and return its row index for dual pricing."""
        row = np.zeros(size)
        for i, coefficient in coefficients.items():
            row[i] = coefficient
        rows.append(row)
        rhs.append(value)
        return len(rows) - 1

    for j in range(3):
        # Initially unknown with probability one.
        equality({x[0, j, 0, b]: 1 for b in (0, 1)}, 1)
        # Not featured -> unknown; featured -> low/high with probability 1/2.
        for u in range(3):
            balance = {x[1, j, u, b]: 1 for b in (0, 1)}
            balance[x[0, j, 0, int(u != 0)]] = -1 if u == 0 else -0.5
            equality(balance, 0)

    normalization, linking = {}, {}
    for t, period in enumerate(actions):
        normalization[t] = equality({mu[t, k]: 1 for k in range(len(period))}, 1)
        for j in range(3):
            for b in (0, 1):
                # Link a product's marginal action probability to whole displays.
                link = {x[t, j, u, b]: 1 for u in (range(1) if t == 0 else range(3))}
                link.update({mu[t, k]: -1 for k, a in enumerate(period) if a[j] == b})
                linking[t, j, b] = equality(link, 0)

    matrix, target = np.array(rows), np.array(rhs)
    # linprog minimizes: negate profit. Every variable is nonnegative.
    solution = linprog(-reward, A_eq=matrix, b_eq=target, bounds=(0, None), method="highs")
    if not solution.success:
        raise RuntimeError(f"LP did not solve: {solution.message}")
    residual = float(np.max(np.abs(matrix @ solution.x - target)))
    if residual > 1e-7 or np.min(solution.x) < -1e-7:
        raise RuntimeError("Solver returned an inaccurate solution.")
    weights = [[{"name": assortment_name(a), "action": list(a),
                 "probability": max(0., float(solution.x[mu[t, k]]))}
                for k, a in enumerate(period)] for t, period in enumerate(actions)]
    # Unconditional type probabilities remain 1/2. This policy ignores learning.
    policy_profit = sum(row["probability"] * float(np.dot(row["action"], profits[:, 0] - costs))
                        for period in weights for row in period)
    result = {"objective": max(0., float(-solution.fun)), "policy_profit": policy_profit,
            "weights": weights, "costs": costs.tolist(), "rewards": rewards.tolist(), "residual": residual,
            "status": "Optimal", "variables": size, "constraints": len(rows)}

    # HiGHS minimizes -profit. Negate each omitted column's reduced cost.
    duals = solution.eqlin.marginals
    pricing = []
    for t, period in enumerate(actions):
        for action in FEASIBLE_ACTIONS:
            if action in period:
                continue
            score = duals[normalization[t]] - sum(duals[linking[t, j, action[j]]]
                                                   for j in range(3))
            pricing.append({"period": t, "action": list(action),
                            "name": assortment_name(action), "score": float(score)})
    return result, pricing


def solve_display_lp(
    costs: Sequence[float] = (0, 0, 0), *, add_backpack_tent: bool = True,
    rewards: Sequence[Sequence[float]] | None = None
) -> dict[str, Any]:
    """Solve the prepared teaching collection, preserving the original API."""
    if not isinstance(add_backpack_tent, bool):
        raise ValueError("add_backpack_tent must be True or False.")
    actions = [(0, 0, 0), (1, 1, 0), (0, 0, 1)]
    if add_backpack_tent:
        actions.append((1, 0, 1))
    result, _ = _solve_restricted(costs, [actions, actions], rewards=rewards)
    return result


def refine_display_lp(
    costs: Sequence[float] = (0, 0, 0), *, rewards: Sequence[Sequence[float]] | None = None,
    max_iterations: int = 20,
    tolerance: float = 1e-8
) -> dict[str, Any]:
    """Solve, price every omitted feasible assortment, add the best, and repeat.

    Rewards are three [low, high] pairs in Backpack, Cooler, Tent order. The
    unknown-state reward is their equally weighted mean. Initially only the
    empty assortment is represented in each period. Each
    iteration adds one assortment to one period. Convergence means no omitted
    column in either period has positive reduced cost within tolerance. It is
    an LP certificate, not a certificate that an extracted MDP policy is optimal.
    """
    if isinstance(max_iterations, bool) or not isinstance(max_iterations, int) or max_iterations < 1:
        raise ValueError("max_iterations must be a positive integer.")
    if not np.isfinite(tolerance) or tolerance <= 0:
        raise ValueError("tolerance must be finite and positive.")
    support = [[(0, 0, 0)], [(0, 0, 0)]]
    history, added = [], None
    for iteration in range(max_iterations + 1):
        solution, pricing = _solve_restricted(costs, support, rewards=rewards)
        candidate = max(pricing, key=lambda row: row["score"], default=None)
        converged = candidate is None or candidate["score"] <= tolerance
        snapshot = {"iteration": iteration, **solution,
                    "support": [[list(a) for a in period] for period in support],
                    "added": added, "best_score": max(0., candidate["score"]) if candidate else 0.,
                    "next_addition": None if converged else candidate, "converged": converged}
        history.append(snapshot)
        if converged or iteration == max_iterations:
            break
        added = candidate.copy()
        support[added["period"]].append(tuple(added["action"]))
    return {**solution, "history": history, "converged": converged,
            "iterations": len(history) - 1, "best_score": history[-1]["best_score"]}


def plot_refinement(history: Sequence[dict[str, Any]]) -> str:
    """Return an SVG plot of actual solved LP values, suitable for local export."""
    from io import StringIO
    from matplotlib.figure import Figure
    from matplotlib.ticker import MaxNLocator
    if not history:
        raise ValueError("Solve at least one LP before plotting.")
    figure = Figure(figsize=(7.2, 3.8), layout="constrained")
    axis = figure.subplots()
    xs = [step["iteration"] for step in history]
    ys = [step["objective"] for step in history]
    axis.plot(xs, ys, color="#23877f", marker="o", linewidth=2.5, markersize=6)
    label = "LP expected net reward ($)" if any(history[-1]["costs"]) else "LP expected reward ($)"
    axis.set(xlabel="LP solve / iteration", ylabel=label,
             xlim=(-.15, max(1, xs[-1]) + .3), ylim=(-1, max(5, max(ys) * 1.2)))
    axis.xaxis.set_major_locator(MaxNLocator(integer=True))
    axis.grid(axis="y", color="#dae5e8", linewidth=.8)
    axis.spines[["top", "right"]].set_visible(False)
    axis.spines[["bottom", "left"]].set_color("#9fb5bc")
    axis.tick_params(labelsize=11, colors="#385265")
    axis.xaxis.label.set_size(12)
    axis.yaxis.label.set_size(12)
    for x_value, y_value in zip(xs, ys):
        axis.annotate(f"{y_value:.2f}", (x_value, y_value), xytext=(0, 10),
                      textcoords="offset points", ha="center", fontsize=11, color="#173344")
    output = StringIO()
    figure.savefig(output, format="svg", metadata={"Date": None})
    return output.getvalue()
