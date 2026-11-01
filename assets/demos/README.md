# Audience choice prototype

Open `audience-choice.html` through the existing presentation preview server.
This is a separate prototype; it does not alter the slide sequence.

The model follows the attached tutorial's section 3.3, Example 5, with the
two resource constraints from Example 1. Each period always contains the empty
action and any subset of the four remaining feasible joint actions. The guided
demonstration begins with only the empty assortment in each period. Audience
choices test omitted assortments in one period at a time. Each page load starts
at the purpose and initial collection. A separate "Resume previous run" button
restores the saved state, history, and comparison when requested.

The central comparison is collection size versus LP objective. Both remain visible
throughout. The reference LP represents all five feasible assortments in each
period and has objective 49. Adding Product 2 only in period 0 gives 22; adding it
in period 1 then gives 49 with only two represented assortments per period,
including the empty action. Additional assortments can be tested to show that a
larger collection need not improve the objective. Policy evaluation and weights
remain available separately. These results concern the approximation, not a
general guarantee that a small collection solves the original MDP exactly.

Regenerate all 256 solved support pairs with:

```sh
conda run -n informstutorial python scripts/prepare_audience_choice.py
```

Run this command from the presentation directory. HiGHS solves the marginal flow
LP with the complete local action set, so support inequalities (5a) and
normalization (5b) are equivalent to the equalities used here. Policy profit is an
exact evaluation of independent whole-action draws from the optimized period
weights. It is distinct from the LP objective. The displayed assortment counts
are per period; they are not the manuscript's variables-plus-constraints counts.

The browser selects the actual precomputed solution for the audience's support
pair. Pricing uses optimal LP duals; at the full-support objective it uses the
full-support optimal dual certificate, which is also optimal for the restricted
model. Positive reduced cost is not the realized objective gain and can require
multiple columns before strict improvement, because of degeneracy.

Numerical tests cover all support pairs, exact joint-state policy evaluation,
every one-column addition, and exact pricing certificates. The controller test
covers all starting choices, refinement, persistence, reset, and invalid actions:

```sh
conda run -n informstutorial pytest tests/test_audience_choice.py -q
node tests/check_audience_choice.cjs
node tests/check_audience_choice_view.cjs
```
