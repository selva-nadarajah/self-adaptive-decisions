import time
from types import SimpleNamespace

import matplotlib.pyplot as plt
import numpy as np

from config import (
    CONTINUOUS_MDP_NOTEBOOK_CONFIG,
    FALPConfig,
    GuidingConstraintConfig,
    HiGHSSolverConfig,
    LowerBoundConfig,
    PolicyEvaluationConfig,
    PSMDConfig,
    RandomFeatureConfig,
    SGALPConfig,
)
from helper import (
    evaluate_inventory_constraint_threshold,
    gibbs_density_on_grid,
)
from mdp import make_inventory_mdp
from psmd.psmd import PSMD
from self_guided_alp.falp import FALP
from self_guided_alp.sgalp import SelfGuidedALP

INK = "#102A43"
PRIMARY = "#0F6CBD"
TEAL = "#007C83"
ACCENT = "#F59E0B"
MUTED = "#D9E2EC"
DANGER = "#B42318"

plt.rcParams.update({
    "font.family": "sans-serif",
    "axes.titlesize": 12,
    "axes.labelsize": 11,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "legend.fontsize": 9,
    "axes.spines.top": False,
    "axes.spines.right": False,
})



def _projection_plot(function):
    """Enlarge chart text without changing the computations or the saved data."""
    from functools import wraps
    @wraps(function)
    def plot(*args, **kwargs):
        with plt.rc_context({"axes.titlesize": 19, "axes.labelsize": 17,
                             "xtick.labelsize": 15, "ytick.labelsize": 15,
                             "legend.fontsize": 15}):
            return function(*args, **kwargs)
    return plot


def _demo_mdp(seed=12345, noise_samples=1000, action_step=0.10):
    config = CONTINUOUS_MDP_NOTEBOOK_CONFIG.inventory.with_updates(
        random_seed=int(seed),
        num_noise_samples=int(noise_samples),
        action_step=float(action_step),
    )
    return make_inventory_mdp(config)


def _violation_surface(beta_1=2.0, beta_2=-2.0, state_points=81, action_points=51, mdp=None):
    mdp = _demo_mdp() if mdp is None else mdp
    state_grid = np.linspace(mdp.lower_state_bound, mdp.upper_state_bound, int(state_points))
    action_grid = np.linspace(0.0, mdp.max_order, int(action_points))
    state_mesh, action_mesh = np.meshgrid(state_grid, action_grid)
    beta = np.asarray([0.0, float(beta_1), float(beta_2)])
    threshold = evaluate_inventory_constraint_threshold(mdp, beta, state_mesh, action_mesh)
    min_index = np.unravel_index(np.argmin(threshold), threshold.shape)
    return SimpleNamespace(
        mdp=mdp,
        state_grid=state_grid,
        action_grid=action_grid,
        state_mesh=state_mesh,
        action_mesh=action_mesh,
        threshold=threshold,
        min_state=float(state_mesh[min_index]),
        min_action=float(action_mesh[min_index]),
        min_value=float(threshold[min_index]),
    )


def plot_violation(beta_1=2.0, beta_2=-2.0, state_points=81, action_points=51):
    data = _violation_surface(beta_1, beta_2, state_points, action_points)
    levels = np.unique(np.quantile(data.threshold, [0.01, 0.05, 0.10, 0.20, 0.35, 0.50, 0.70, 0.85, 0.95]))
    fig, ax = plt.subplots(figsize=(9.4, 3.25), constrained_layout=True)
    image = ax.pcolormesh(data.state_mesh, data.action_mesh, data.threshold, shading="auto", cmap="viridis")
    contour = ax.contour(data.state_mesh, data.action_mesh, data.threshold, levels=levels, colors="white", linewidths=0.65)
    ax.clabel(contour, inline=True, fontsize=9, fmt="%.0f")
    ax.scatter(data.min_state, data.min_action, s=70, color=ACCENT, edgecolor="white", linewidth=1.2,
               label=f"grid minimum = ({data.min_state:.2f}, {data.min_action:.2f})")
    ax.set(xlabel="inventory state  s", ylabel="order quantity  a", xlim=(-4, 12), ylim=(0, 6))
    ax.set_title(rf"Constraint threshold  $f(\beta;s,a)$   |   $\beta_1={beta_1:g}$, $\beta_2={beta_2:g}$")
    ax.legend(loc="lower right")
    cbar = fig.colorbar(image, ax=ax, pad=0.015)
    cbar.set_label(r"$f(\beta;s,a)$")
    plt.show()
    print(f"Most restrictive grid point: s={data.min_state:.3f}, a={data.min_action:.3f}, f={data.min_value:.1f}")


def plot_gibbs(beta_1=2.0, beta_2=-2.0, lambdas=(50.0, 100.0, 200.0)):
    data = _violation_surface(beta_1, beta_2, 81, 51)
    lambda_values = tuple(float(value) for value in lambdas)
    densities = [
        gibbs_density_on_grid(data.threshold, value, data.state_grid, data.action_grid)
        for value in lambda_values
    ]
    common_max = max(float(density.max()) for density in densities)
    fig, axes = plt.subplots(1, len(lambda_values), figsize=(10.8, 3.1), sharex=True, sharey=True, constrained_layout=True)
    axes = np.atleast_1d(axes)
    image = None
    for ax, value, density in zip(axes, lambda_values, densities):
        image = ax.pcolormesh(data.state_mesh, data.action_mesh, density / float(density.max()), shading="auto", cmap="magma",
                              vmin=0.0, vmax=1.0)
        ax.scatter(data.min_state, data.min_action, s=38, color="#FFFFFF", edgecolor=INK, linewidth=0.7)
        ax.set_title(rf"$\lambda={value:g}$")
        ax.set(xlabel="state  s", xlim=(-4, 12), ylim=(0, 6))
    axes[0].set_ylabel("action  a")
    fig.colorbar(image, ax=axes, pad=0.012, label="Density / panel peak")
    plt.show()
    concentration = [float(np.max(density)) for density in densities]
    print("Peak density by λ:", {value: round(peak, 4) for value, peak in zip(lambda_values, concentration)})


def plot_constraint_generation_vs_gibbs(beta_1=2.0, beta_2=-2.0, temperature=100.0):
    data = _violation_surface(beta_1, beta_2, 101, 71)
    density = gibbs_density_on_grid(
        data.threshold, float(temperature), data.state_grid, data.action_grid
    )
    mode_index = np.unravel_index(np.argmax(density), density.shape)
    mode_state = float(data.state_mesh[mode_index])
    mode_action = float(data.action_mesh[mode_index])

    fig, axes = plt.subplots(1, 2, figsize=(10.6, 3.15), sharex=True, sharey=True, constrained_layout=True)
    left = axes[0].pcolormesh(
        data.state_mesh, data.action_mesh, data.threshold, shading="auto", cmap="viridis"
    )
    axes[0].scatter(
        data.min_state, data.min_action, s=70, color=ACCENT, edgecolor="white", linewidth=1.2,
        label="constraint-generation minimizer"
    )
    axes[0].set_title(r"Constraint generation: minimize $f$")
    fig.colorbar(left, ax=axes[0], pad=0.015)

    right = axes[1].pcolormesh(
        data.state_mesh, data.action_mesh, density, shading="auto", cmap="magma"
    )
    axes[1].scatter(
        mode_state, mode_action, s=85, marker="*", color="#FFFFFF", edgecolor=INK, linewidth=0.9,
        label="Gibbs mode"
    )
    axes[1].set_title(rf"Gibbs sampling: maximize $y^*$  ($\lambda={float(temperature):g}$)")
    fig.colorbar(right, ax=axes[1], pad=0.015, label="normalized density")

    for ax in axes:
        ax.set(xlabel="inventory state  s", xlim=(-4, 12), ylim=(0, 6))
        ax.legend(loc="upper right", fontsize=9)
    axes[0].set_ylabel("order quantity  a")
    plt.show()
    print(
        "Same grid point: ",
        f"argmin f = ({data.min_state:.2f}, {data.min_action:.2f}); ",
        f"argmax y* = ({mode_state:.2f}, {mode_action:.2f}).",
        sep="",
    )


def plot_random_feature_examples(seed=17, num_features=5):
    rng = np.random.RandomState(int(seed))
    count = int(np.clip(int(num_features), 1, 24))
    pool_size = 24
    states = np.linspace(-4.0, 12.0, 320)
    z = (states - 4.0) / 8.0

    # Draw a stable pool and use its first N members. Increasing N therefore
    # adds columns without replacing the features already on screen.
    phases = rng.uniform(0.0, 2.0 * np.pi, size=pool_size)
    frequencies = rng.normal(0.0, 2.0, size=pool_size)
    fourier = np.cos(phases[:, None] + frequencies[:, None] * z[None, :])

    relu_bias = rng.normal(0.0, 0.55, size=pool_size)
    relu_slope = rng.normal(0.0, 1.1, size=pool_size)
    relu = np.maximum(0.0, relu_bias[:, None] + relu_slope[:, None] * z[None, :])

    thresholds = rng.uniform(-0.85, 0.85, size=pool_size)
    stumps = (z[None, :] >= thresholds[:, None]).astype(float)

    family_weights = (
        rng.normal(size=pool_size),
        rng.normal(size=pool_size),
        rng.normal(size=pool_size),
    )

    families = (
        (fourier, r"Fourier: $\cos(b_n+w_ns)$"),
        (relu, r"ReLU: $[b_n+w_ns]^+$"),
        (stumps, r"Stump: $\mathbf{1}\{s\geq\tau_n\}$"),
    )
    fig, axes = plt.subplots(1, 3, figsize=(10.8, 3.0), sharex=True, constrained_layout=True)
    for ax, (features, title), weights in zip(axes, families, family_weights):
        selected = features[:count]
        approximation = weights[:count] @ selected / np.sqrt(count)
        for feature in selected:
            ax.plot(states, feature, color=PRIMARY, alpha=max(0.08, 0.35 / np.sqrt(count)), linewidth=1.0)
        ax.plot(states, approximation, color=INK, linewidth=2.6, label=rf"VFA draw with $N={count}$")
        ax.axhline(0.0, color=MUTED, linewidth=0.8)
        ax.set(title=f"{title}\nN = {count}", xlabel="inventory state  s", xlim=(-4, 12))
        ax.grid(alpha=0.18)
    axes[0].set_ylabel("feature / approximation value")
    axes[2].legend(loc="best", fontsize=9)
    plt.show()
    print(
        f"Seed {int(seed)}; N={count} nested random features per family "
        "(allowed range 1–24). Fourier is used in Example 6."
    )


def run_psmd_demo(iterations=180, temperature=35.0, seed=777):
    iterations = int(iterations)
    snapshot_iterations = tuple(np.unique(np.linspace(0, iterations, 6, dtype=int)).tolist())
    lower_bound = LowerBoundConfig(
        num_mc_init_states=10,
        chain_length=45,
        burn_in=15,
        proposal_state_std=1.2,
        proposal_action_std=0.9,
        random_seed=int(seed) + 21,
        noise_batch_size=36,
        sampler="metropolis",
        num_walkers=10,
        initial_state=6.0,
    )
    policy = PolicyEvaluationConfig(
        state_grid_size=60,
        policy_noise_batch_size=36,
        policy_noise_seed=int(seed) + 31,
        num_trajectories=12,
        horizon=35,
        simulation_seed=int(seed) + 41,
        initial_state=6.0,
    )
    config = PSMDConfig(
        num_iterations=iterations,
        H=14,
        N=24,
        eval_interval=max(1, iterations // 6),
        step_size=0.20,
        step_size_power=0.5,
        sampler_steps=4,
        proposal_state_std=0.8,
        proposal_action_std=0.8,
        sampling_temperature=float(temperature),
        refresh_fraction=0.10,
        coefficient_clip=5000.0,
        random_seed=int(seed),
        initial_state=6.0,
        snapshot_iterations=snapshot_iterations,
        snapshot_sample_size=60,
        snapshot_sampler_steps=4,
        snapshot_refresh_fraction=0.02,
        lower_bound=lower_bound,
        policy_evaluation=policy,
    )
    mdp = _demo_mdp(seed=int(seed) + 5, noise_samples=72, action_step=0.25)
    model = PSMD(mdp, config=config)
    started = time.time()
    solution = model.run(verbose=False)
    return {
        "model": model,
        "solution": solution,
        "runtime_seconds": time.time() - started,
        "presentation_preset": True,
    }


def plot_psmd_samples(result):
    model = result["model"]
    snapshots = result["solution"]["state_action_snapshots"]
    iterations = [value for value in model.config.snapshot_iterations if value in snapshots]
    fig, axes = plt.subplots(1, len(iterations), figsize=(11.8, 2.7), sharex=True, sharey=True, constrained_layout=True)
    axes = np.atleast_1d(axes)
    for ax, iteration in zip(axes, iterations):
        snapshot = snapshots[iteration]
        ax.scatter(snapshot["states"], snapshot["actions"], s=14, color=PRIMARY, alpha=0.48, edgecolors="none")
        ax.set_title(f"t = {iteration}")
        ax.set(xlim=(-4.4, 12.4), ylim=(-0.25, 6.25), xlabel="s")
        ax.grid(alpha=0.18)
    axes[0].set_ylabel("a")
    plt.show()
    print(f"Browser run: {model.config.num_iterations} iterations in {result['runtime_seconds']:.1f}s; "
          f"temperature={model.config.sampling_temperature:g}; seed={model.config.random_seed}")


def plot_psmd_bounds(result):
    history = result["solution"]["history"]
    iterations = np.asarray([row["iteration"] for row in history])
    lower = np.asarray([row["lower_bound"] for row in history])
    policy = np.asarray([row["policy_cost"] for row in history])

    fig, ax = plt.subplots(figsize=(9.8, 3.1), constrained_layout=True)
    ax.plot(iterations, lower, "o-", color=PRIMARY, linewidth=2.2, label="estimated lower bound")
    ax.plot(iterations, policy, "o-", color=DANGER, linewidth=2.2, label="simulated greedy-policy cost")
    ax.fill_between(iterations, lower, policy, color=MUTED, alpha=0.38, label="estimated gap")
    ax.set(xlabel="PSMD iteration", ylabel="discounted cost", title="Fixed quadratic VFA  [1, s, s²]")
    ax.legend(fontsize=9)
    ax.grid(alpha=0.22)
    plt.show()
    final_gap = 100.0 * (policy[-1] - lower[-1]) / policy[-1]
    print(f"Estimated gap at the final checkpoint: {final_gap:.1f}%")


def _model_view(mdp, basis, coef, num_features):
    return SimpleNamespace(
        mdp=mdp,
        basis=basis,
        coef=np.asarray(coef, dtype=float),
        num_random_features=int(num_features),
        current_num_random_features=int(num_features),
    )


def run_feature_demo(max_features=6, num_constraints=3000, seed=111):
    max_features = int(max_features)
    num_constraints = int(num_constraints)
    seed = int(seed)
    # The MDP seed and numerical resolution match the executed repository notebook.
    # `seed` controls the nested random-feature family only.
    mdp = _demo_mdp(seed=12345, noise_samples=1000, action_step=0.10)
    random_features = RandomFeatureConfig(bandwidth_choices=(1e-3, 1e-4), random_seed=seed)

    started = time.time()
    falp_models = {}
    for count in range(max_features + 1):
        config = FALPConfig(
            num_random_features=count,
            num_constraints=num_constraints,
            num_state_relevance_samples=num_constraints,
            random_features=random_features,
            solver="scipy",
        )
        model = FALP(mdp, config=config)
        model.fit()
        falp_models[count] = model

    guided_config = SGALPConfig(
        max_random_features=max_features,
        batch_size=1,
        num_constraints=num_constraints,
        num_state_relevance_samples=num_constraints,
        random_features=random_features,
        guiding=GuidingConstraintConfig(
            num_guiding_states=num_constraints,
            allowed_violation=0.0,
            relax_fraction=0.0,
            absolute_floor=0.0,
            retry_scales=(1.0,),
        ),
        solver=HiGHSSolverConfig(method="highs"),
    )
    guided_solver = SelfGuidedALP(mdp, config=guided_config)
    guided_models = {0: falp_models[0]}
    guidance_trace = []
    guided_solver.history = []
    prev_coef = None
    prev_count = None

    # Solve stage by stage so the guide duals are preserved before HiGHS is
    # called again. Those multipliers induce the effective relevance measure.
    for count in guided_solver.stage_feature_counts():
        row = guided_solver.fit_stage(
            num_random_features=count,
            prev_coef=prev_coef,
            prev_num_random_features=prev_count,
        )
        guided_solver.history.append(row)
        guided_solver.coef = np.asarray(row["coef"], dtype=float)
        guided_solver.current_num_random_features = count
        guided_models[count] = _model_view(mdp, guided_solver.basis, row["coef"], count)

        num_falp = int(row["num_falp_constraints"])
        num_guide = int(row["num_guiding_constraints"])
        guide_states = np.asarray([], dtype=float)
        guide_multipliers = np.asarray([], dtype=float)
        if num_guide:
            # The inventory sampler resets to a fixed seed, so this recovers
            # the exact locations used by build_guiding_constraints.
            sampled_states = mdp.sample_state_relevance_states(guided_solver.num_guiding_states)
            guide_states = np.asarray([float(state[0]) for state in sampled_states[:num_guide]])
            marginals = np.asarray(guided_solver.solver_result.ineqlin.marginals, dtype=float)
            guide_multipliers = np.maximum(0.0, -marginals[num_falp:num_falp + num_guide])

        guidance_trace.append({
            "num_features": int(count),
            "guide_states": guide_states,
            "guide_multipliers": guide_multipliers,
        })
        prev_coef = np.asarray(row["coef"], dtype=float)
        prev_count = int(count)

    return {
        "mdp": mdp,
        "falp": falp_models,
        "guided": guided_models,
        "guided_solver": guided_solver,
        "guidance_trace": guidance_trace,
        "feature_counts": list(range(max_features + 1)),
        "runtime_seconds": time.time() - started,
        "num_constraints": num_constraints,
        "seed": seed,
    }


def _values_on_grid(model, grid):
    count = int(getattr(model, "current_num_random_features", getattr(model, "num_random_features")))
    return model.basis.eval_basis_batch(grid, num_random_features=count) @ np.asarray(model.coef)


def plot_feature_sequences(result):
    grid_size = 300
    grid = np.linspace(result["mdp"].lower_state_bound, result["mdp"].upper_state_bound, grid_size)
    counts = result["feature_counts"]
    colors = plt.cm.viridis(np.linspace(0.08, 0.92, len(counts)))
    linestyles = ["-", "--", "-.", ":", (0, (5, 2)), (0, (3, 1, 1, 1)), "-"]
    markers = ["o", "s", "^", "D", "v", "P", "X"]
    fig, axes = plt.subplots(1, 2, figsize=(10.7, 3.2), sharex=True, sharey=True, constrained_layout=True)

    for ax, models, title in zip(
        axes,
        (result["falp"], result["guided"]),
        (r"FALP$_N$ VFA", r"FALP$^{\mathrm{SG}}_N$ VFA"),
    ):
        for index, (count, color) in enumerate(zip(counts, colors)):
            values = _values_on_grid(models[count], grid)
            shift = max(0.0, 1.0 - float(np.min(values)))
            log_values = np.log(values + shift)
            ax.plot(
                grid,
                log_values,
                color=color,
                linestyle=linestyles[index],
                marker=markers[index],
                markevery=max(1, grid_size // 12),
                markersize=4.5,
                linewidth=1.9,
                label=rf"$N={count}$",
            )
        ax.axvline(0.0, color="#7B8794", linestyle="--", linewidth=1.0)
        ax.set(
            title=title,
            xlabel=r"State $s$",
            ylabel="Log value function approximation",
            xlim=(-4, 12),
            ylim=(4.2, 9.5),
            xticks=np.arange(-4, 13, 2),
            yticks=np.arange(5, 10, 1),
        )
        ax.grid(alpha=0.22)
        ax.legend(ncol=2, fontsize=8.5, loc="lower right")

    for ax in axes:
        ax.tick_params(labelsize=9)
    plt.show()
    print(f"Figure 7 replication: N=0,…,{counts[-1]}, {result['num_constraints']} sampled constraints, "
          f"seed={result['seed']}, {result['runtime_seconds']:.1f}s")


def _effective_relevance_curve(mdp, guide_states, guide_multipliers, bandwidth=0.65, grid_size=321):
    grid = np.linspace(mdp.lower_state_bound, mdp.upper_state_bound, int(grid_size))
    uniform = np.full_like(grid, 1.0 / (mdp.upper_state_bound - mdp.lower_state_bound))
    states = np.asarray(guide_states, dtype=float).reshape(-1)
    weights = np.asarray(guide_multipliers, dtype=float).reshape(-1)
    active = weights > 1e-9
    states = states[active]
    weights = weights[active]
    dual_mass = float(np.sum(weights))

    if dual_mass == 0.0:
        return grid, uniform, uniform.copy(), states, weights, dual_mass

    bandwidth = max(float(bandwidth), 0.05)
    kernels = np.exp(-0.5 * ((grid[:, None] - states[None, :]) / bandwidth) ** 2)
    kernels /= np.sqrt(2.0 * np.pi) * bandwidth
    kernel_areas = np.trapezoid(kernels, grid, axis=0)
    kernels /= np.maximum(kernel_areas[None, :], 1e-15)
    dual_density = kernels @ weights
    updated = (uniform + dual_density) / (1.0 + dual_mass)
    updated /= np.trapezoid(updated, grid)
    return grid, uniform, updated, states, weights, dual_mass


@_projection_plot
def plot_state_relevance_updates(result, stage_counts=(2, 3), bandwidth=0.65):
    trace_by_count = {item["num_features"]: item for item in result["guidance_trace"]}
    stage_counts = tuple(int(value) for value in stage_counts)
    missing = [value for value in stage_counts if value not in trace_by_count]
    if missing:
        raise ValueError(f"No guide-dual data are available for N={missing}.")

    records = []
    for count in stage_counts:
        item = trace_by_count[count]
        curve = _effective_relevance_curve(
            result["mdp"], item["guide_states"], item["guide_multipliers"], bandwidth
        )
        records.append((count,) + curve)

    fig, (density_ax, mass_ax) = plt.subplots(
        1, 2, figsize=(10.8, 3.8),
        gridspec_kw={"width_ratios": (2.65, 1.0)}, constrained_layout=True,
    )
    palette = ("#226A85", "#A4592F", "#267F77")
    colors = [palette[index % len(palette)] for index in range(len(records))]
    grid, uniform = records[0][1], records[0][2]
    density_ax.plot(grid, uniform, color="#526D82", linewidth=1.9, linestyle="--", label=r"original $\nu$: uniform")

    for color, record in zip(colors, records):
        count, grid, _, updated, states, weights, dual_mass = record
        density_ax.plot(grid, updated, color=color, linewidth=2.3, label=rf"after guide at $N={count}$")
        if len(states):
            rug_height = 0.014 * np.sqrt(weights / np.max(weights))
            density_ax.vlines(states, 0.0, rug_height, color=color, alpha=0.38, linewidth=0.8)

    density_ax.set(
        xlabel="inventory state  s", ylabel="State relevance density",
        xlim=(grid[0], grid[-1]), ylim=(0.0, None), title="Effective state relevance",
    )
    density_ax.legend(fontsize=15, loc="best")
    density_ax.grid(alpha=0.20)

    masses = [record[-1] for record in records]
    active_counts = [len(record[-3]) for record in records]
    positions = np.arange(len(records))
    mass_ax.bar(positions, masses, color=colors, width=0.68)
    mass_ax.set(
        xlabel="guided stage", ylabel="total dual mass", title="Update strength",
        xticks=positions, xticklabels=[f"N={count}" for count in stage_counts],
        ylim=(0.0, max(max(masses) * 1.22, 0.01)),
    )
    for position, mass, active_count in zip(positions, masses, active_counts):
        mass_ax.text(position, mass, f"{active_count} active", ha="center", va="bottom", fontsize=15)
    mass_ax.grid(axis="y", alpha=0.20)
    plt.show()
    return {"stage_counts": stage_counts, "dual_masses": masses}


FEATURE_BOUND_DATA = {
    "falp": {
        111: {"lower": [84.2, 2173.4, 2203.5, 1722.7, 2996.8, 3241.6, 3227.7],
              "upper": [15810.4, 7976.7, 5438.8, 3979.9, 3823.5, 3801.4, 3801.7]},
        222: {"lower": [84.2, 2204.1, 2203.8, 1755.8, 2495.5, 3208.7, 3208.6],
              "upper": [15909.8, 8257.0, 8260.9, 3956.1, 4144.2, 3816.3, 3816.3]},
        333: {"lower": [84.2, 2178.4, 2303.1, 1924.3, 3155.5, 3220.7, 3221.2],
              "upper": [16027.2, 8445.6, 4021.5, 4008.5, 3786.8, 3786.3, 3786.3]},
        444: {"lower": [84.2, 2208.0, 2200.5, 2022.7, 3024.9, 3024.9, 3235.7],
              "upper": [16038.3, 8093.9, 5685.5, 3930.4, 3795.6, 3795.6, 3776.2]},
        555: {"lower": [84.2, 2201.4, 2210.4, 2222.7, 3022.4, 2946.6, 2954.7],
              "upper": [15960.9, 7100.1, 7759.2, 4188.3, 3831.0, 3816.3, 3816.2]},
    },
    "guided": {
        111: {"lower": [84.2, 2173.4, 2203.5, 2269.4, 2996.8, 3241.6, 3227.7],
              "upper": [15810.4, 7976.7, 5438.8, 4065.3, 3823.5, 3801.4, 3801.7]},
        222: {"lower": [84.2, 2204.1, 2203.8, 2262.9, 2495.5, 3208.7, 3208.6],
              "upper": [15909.8, 8257.0, 8260.9, 4060.6, 4144.2, 3816.3, 3816.3]},
        333: {"lower": [84.2, 2178.4, 2303.1, 2258.2, 3155.5, 3220.7, 3221.2],
              "upper": [16027.2, 8445.6, 4021.5, 4027.5, 3786.8, 3786.3, 3786.3]},
        444: {"lower": [84.2, 2208.0, 2200.5, 2243.8, 3024.9, 3024.9, 3235.7],
              "upper": [16038.3, 8093.9, 5685.5, 4015.0, 3795.6, 3795.6, 3776.2]},
        555: {"lower": [84.2, 2201.4, 2210.4, 2222.7, 3022.4, 2946.6, 2954.7],
              "upper": [15960.9, 7100.1, 7759.2, 4188.3, 3831.0, 3816.3, 3816.2]},
    },
}


def _bound_series(algorithm, seed="mean", best_so_far=False):
    records = FEATURE_BOUND_DATA[algorithm]
    if seed == "mean":
        lower = np.mean([records[key]["lower"] for key in sorted(records)], axis=0)
        upper = np.mean([records[key]["upper"] for key in sorted(records)], axis=0)
    else:
        seed = int(seed)
        if seed not in records:
            raise ValueError(f"seed must be one of {sorted(records)} or 'mean'")
        lower = np.asarray(records[seed]["lower"], dtype=float)
        upper = np.asarray(records[seed]["upper"], dtype=float)
    if best_so_far:
        lower = np.maximum.accumulate(lower)
        upper = np.minimum.accumulate(upper)
    return np.asarray(lower), np.asarray(upper)


@_projection_plot
def plot_feature_bounds(seed="mean", best_so_far=False, num_features=6):
    num_features = int(np.clip(num_features, 0, 6))
    visible = slice(0, num_features + 1)
    counts = np.arange(7)[visible]
    all_series = [_bound_series(algorithm, seed=seed, best_so_far=best_so_far)
                  for algorithm in ("falp", "guided")]
    y_max = max(float(np.max(upper)) for lower, upper in all_series) * 1.1
    fig, axes = plt.subplots(1, 2, figsize=(12.5, 4.4), sharey=True, constrained_layout=True)
    for ax, algorithm, title in zip(axes, ("falp", "guided"), ("Unguided FALP", "Self-guided ALP")):
        lower, upper = _bound_series(algorithm, seed=seed, best_so_far=best_so_far)
        if seed == "mean":
            records = FEATURE_BOUND_DATA[algorithm]
            offsets = np.linspace(-0.12, 0.12, len(records))
            for offset, key in zip(offsets, sorted(records)):
                seed_lower, seed_upper = _bound_series(algorithm, seed=key, best_so_far=best_so_far)
                ax.scatter(counts + offset, np.asarray(seed_lower)[visible], s=13, color=PRIMARY, alpha=0.32)
                ax.scatter(counts + offset, np.asarray(seed_upper)[visible], s=13, color=DANGER, alpha=0.32)
        lower, upper = np.asarray(lower)[visible], np.asarray(upper)[visible]
        ax.plot(counts, lower, "o-", color=PRIMARY, linewidth=2.4, label="estimated lower bound")
        ax.plot(counts, upper, "o-", color=DANGER, linewidth=2.4, label="simulated policy cost")
        ax.fill_between(counts, lower, upper, color=MUTED, alpha=0.55)
        ax.set(title=title, xlabel="number of random features  N", xticks=np.arange(7), xlim=(-0.3, 6.3), ylim=(-0.03*y_max, y_max))
        ax.grid(alpha=0.22)
    axes[0].set_ylabel("discounted cost")
    axes[1].legend(fontsize=15)
    plt.show()


def plot_gibbs_simulation(beta_1=2.0, beta_2=-2.0, lambdas=(10, 30, 100, 300, 1000, 3000)):
    data = _violation_surface(beta_1, beta_2, 81, 51)
    for value in lambdas:
        value = float(value)
        density = gibbs_density_on_grid(data.threshold, value, data.state_grid, data.action_grid)
        peak = float(density.max())
        fig, ax = plt.subplots(figsize=(6.5, 3.1), constrained_layout=True)
        image = ax.pcolormesh(data.state_mesh, data.action_mesh, density / peak,
                             shading="auto", cmap="magma", vmin=0, vmax=1)
        mode_index = np.unravel_index(np.argmax(density), density.shape)
        mode_state = float(data.state_mesh[mode_index])
        mode_action = float(data.action_mesh[mode_index])
        ax.scatter(data.min_state, data.min_action, s=150, marker="o", facecolors="none",
                   edgecolors="white", linewidth=1.6, label="Constraint generation (grid min)", zorder=5)
        ax.scatter(mode_state, mode_action, s=80, marker="*", color="#f5b54b",
                   edgecolors="#182c3e", linewidth=0.5, label="Gibbs density peak", zorder=6)
        ax.legend(loc="upper right", fontsize=8, framealpha=0.94)
        ax.text(0.03, 0.96, f"Peak density: {peak:.4f}", transform=ax.transAxes,
                va="top", fontsize=9, color="white",
                bbox=dict(facecolor="#182c3e", alpha=0.65, edgecolor="none", pad=3))
        ax.set(xlabel="inventory state s", ylabel="order quantity a",
               title=rf"Gibbs density: $\lambda={value:g}$")
        fig.colorbar(image, ax=ax, label="Density / peak")
        plt.show()


def plot_psmd_sample_sequence(result):
    snapshots = result["solution"]["state_action_snapshots"]
    for iteration in result["model"].config.snapshot_iterations:
        if iteration not in snapshots:
            continue
        snapshot = snapshots[iteration]
        fig, ax = plt.subplots(figsize=(6.2, 3.6), constrained_layout=True)
        ax.scatter(snapshot["states"], snapshot["actions"], s=25, color="#c73838", alpha=0.75, edgecolors="none")
        ax.set(title=f"Sampled constraints · iteration {iteration}",
               xlim=(-4.4, 12.4), ylim=(-0.25, 6.25), xlabel="inventory state s", ylabel="order quantity a")
        ax.grid(alpha=0.18)
        plt.show()


def load_psmd_notebook_results():
    import json
    from pathlib import Path
    path = Path("/home/pyodide/continuous/psmd_notebook_results.json")
    data = json.loads(path.read_text())
    return {int(seed): {"solution": {"history": history}}
            for seed, history in data["histories"].items()}

from helper import plot_psmd_iteration_diagnostics


def run_psmd_bound_sequence(seed=111, iterations=3000):
    from helper import run_psmd_seed_grid
    config = CONTINUOUS_MDP_NOTEBOOK_CONFIG.psmd.with_updates(
        num_iterations=int(iterations), eval_interval=300)
    return run_psmd_seed_grid(seeds=[int(seed)], psmd_config=config,
                              inventory_config=CONTINUOUS_MDP_NOTEBOOK_CONFIG.inventory,
                              verbose=False)[int(seed)]


def plot_psmd_bound_sequence(result):
    rows = [row for row in result["solution"]["history"] if row["iteration"] >= 300]
    if not rows:
        raise ValueError("Run at least 300 iterations.")
    for end in range(1, len(rows) + 1):
        selected = rows[:end]
        fig, ax = plt.subplots(figsize=(9, 3.5), constrained_layout=True)
        ax.plot([r["iteration"] for r in selected], [r["best_lower_bound"] for r in selected],
                "o-", color="#1f4e79", label="Best lower bound")
        ax.plot([r["iteration"] for r in selected], [r["best_policy_cost"] for r in selected],
                "o-", color="#922b21", label="Best policy cost (upper estimate)")
        all_values = [r[k] for r in rows for k in ("best_lower_bound", "best_policy_cost")]
        low, high = min(all_values), max(all_values)
        pad = max((high-low)*0.12, 1)
        ax.set(xlabel="PSMD iteration", ylabel="Discounted cost", xlim=(250, max(3000, rows[-1]["iteration"])+50),
               ylim=(low-pad, high+pad), title=f"Bounds through iteration {selected[-1]['iteration']}")
        ax.legend(loc="best"); ax.grid(alpha=0.22)
        plt.show()


def load_psmd_bound_sequence(seed=111):
    import json
    from pathlib import Path
    data = json.loads(Path("/home/pyodide/continuous/psmd_seed111_3000.json").read_text())
    if int(seed) != data["seed"]:
        raise ValueError("Precomputed results use seed 111. Use run_psmd_bound_sequence(seed, 3000) for a fresh run.")
    return {"solution": {"history": data["history"]}}


@_projection_plot
def plot_random_feature_fit(seed=17, num_features=1):
    global _random_feature_fit_details
    _random_feature_fit_details = None
    x = np.linspace(-4, 12, 500)
    z = (x - 4) / 8
    target = 1 + .5*np.sin(3*z) + .25*np.cos(7*z) + .6*np.maximum(z-.2, 0)
    rng = np.random.RandomState(int(seed))
    # Preserve the existing seeded draws for the N=1, 3, and 5 plots.
    pool = 48
    fourier_b = rng.uniform(0, 2*np.pi, pool)
    fourier_omega = rng.normal(0, 5, pool)
    fourier = np.cos(fourier_b[None, :] + z[:, None]*fourier_omega[None, :])
    knots = rng.uniform(-1, 1, pool)
    relu_b, relu_omega = -knots, np.ones(pool)
    relu = np.maximum(0, z[:, None] - knots[None, :])
    fixed_design = np.column_stack([np.ones(len(z)), z, z*z])
    fixed_fit = fixed_design @ np.linalg.lstsq(fixed_design, target, rcond=1e-12)[0]
    n = int(num_features)
    if not 1 <= n <= 5:
        raise ValueError("Choose between 1 and 5 features.")
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.0), sharex=True, sharey=True,
                             constrained_layout=True)
    families = []
    for ax, features, name, b, omega in zip(
            axes, [fourier, relu], ['Fourier', 'ReLU'],
            [fourier_b, relu_b], [fourier_omega, relu_omega]):
        design = np.column_stack([np.ones(len(x)), features[:, :n]])
        weights = np.linalg.lstsq(design, target, rcond=1e-12)[0]
        fit = design @ weights
        error = float(np.sqrt(np.mean((fit-target)**2)))
        families.append({
            'name': name, 'rmse': error,
            'features': [{'index': j+1, 'b': float(b[j]), 'omega': float(omega[j])}
                         for j in range(n)],
        })
        ax.plot(x, fixed_fit, ':', color='#7c8798', lw=2, label='Quadratic')
        ax.plot(x, target, '--', color='#1f65c1', lw=3, label=r'$V^*$')
        ax.plot(x, fit, color='#c73838', lw=2, label='Random features')
        ax.set(title=f'{name} · N = {n}', xlabel='state s',
               ylim=(.15, max(2.2, float(np.max(fixed_fit))+.15)))
        ax.text(.03, .95, f'RMSE = {error:.4f}', transform=ax.transAxes,
                va='top', fontsize=15)
        ax.grid(alpha=.2)
        ax.legend(loc='lower right', fontsize=15)
    _random_feature_fit_details = {'numFeatures': n, 'families': families}
    axes[0].set_ylabel('function value')
    plt.show()


_sg_progression_cache = None

@_projection_plot
def plot_self_guided_progression(num_features=0):
    global _sg_progression_cache
    count = int(num_features)
    if not 0 <= count <= 3:
        raise ValueError("Choose N between 0 and 3 on this slide.")
    if _sg_progression_cache is None:
        mdp = _demo_mdp(seed=12345, noise_samples=1000, action_step=0.10)
        config = SGALPConfig(
            max_random_features=6, batch_size=1, num_constraints=3000,
            num_state_relevance_samples=3000,
            random_features=RandomFeatureConfig(bandwidth_choices=(1e-3, 1e-4), random_seed=111),
            guiding=GuidingConstraintConfig(num_guiding_states=3000, allowed_violation=0.0,
                relax_fraction=0.0, absolute_floor=0.0, retry_scales=(1.0,)),
            solver=HiGHSSolverConfig(method="highs"))
        _sg_progression_cache = {"mdp": mdp, "solver": SelfGuidedALP(mdp, config=config), "models": {}}
    cache = _sg_progression_cache
    falp_models = cache.setdefault("falp_models", {})
    models, solver = cache["models"], cache["solver"]
    for stage in range(count + 1):
        if stage in models:
            continue
        previous = models.get(stage - 1)
        row = solver.fit_stage(num_random_features=stage,
            prev_coef=None if previous is None else previous.coef,
            prev_num_random_features=None if previous is None else stage - 1)
        models[stage] = _model_view(cache["mdp"], solver.basis, row["coef"], stage)
    for stage in range(count + 1):
        if stage not in falp_models:
            model = FALP(cache["mdp"], config=FALPConfig(num_random_features=stage,
                num_constraints=3000, num_state_relevance_samples=3000,
                random_features=RandomFeatureConfig(bandwidth_choices=(1e-3, 1e-4), random_seed=111), solver="scipy"))
            model.fit()
            falp_models[stage] = model
    grid = np.linspace(cache["mdp"].lower_state_bound, cache["mdp"].upper_state_bound, 400)
    logs = {}
    for stage in range(count + 1):
        values = _values_on_grid(models[stage], grid)
        if not np.all(np.isfinite(values)) or np.any(values <= 0):
            raise ValueError("A positive finite VFA is required for the logarithmic plot.")
        logs[stage] = np.log(values)

    falp_logs = {}
    for stage in range(count + 1):
        values = _values_on_grid(falp_models[stage], grid)
        if not np.all(np.isfinite(values)) or np.any(values <= 0):
            raise ValueError("A positive finite VFA is required for the logarithmic plot.")
        falp_logs[stage] = np.log(values)
    all_logs = list(logs.values()) + list(falp_logs.values())
    low = min(4.2, min(float(v.min()) for v in all_logs)-.15)
    high = max(9.5, max(float(v.max()) for v in all_logs)+.15)
    fig, axes = plt.subplots(1, 2, figsize=(12.5, 4.8), sharex=True, sharey=True, constrained_layout=True)
    for ax, sequence, name in zip(axes, [falp_logs, logs], [r"FALP", r"FALP$^{\mathrm{SG}}$"]):
        for stage in range(count):
            ax.plot(grid, sequence[stage], color="#a9b9c2", lw=1.4, alpha=.8,
                    label="Earlier VFAs" if stage == 0 else None)
        ax.plot(grid, sequence[count], color="#c73838" if sequence is logs else PRIMARY, lw=2.7, label=rf"$N={count}$")
        ax.set(title=rf"{name} · $N={count}$", xlabel=r"State $s$", xlim=(-4,12), ylim=(low,high))
        ax.grid(alpha=.2);ax.legend(loc="lower right",fontsize=15)
    axes[0].set_ylabel("Log value function approximation")
    plt.show()
