#!/usr/bin/env bash
# SessionStart hook: tidy git worktrees/branches left over from past Claude Code
# sessions in this repo. Two tiers, deliberately asymmetric:
#   1. Fully automatic, local only: a worktree/branch whose tip is already an
#      ancestor of `main` is pure debris (no unique work) - remove the worktree
#      and delete the local branch. Never touches a worktree with uncommitted
#      changes, and never touches the worktree this very session is running in.
#   2. Report only, never acts: anything unpushed, unmerged, or with a "gone"
#      upstream is surfaced as a one-line reminder. Pushing/PR/merge/deleting a
#      remote branch are chat-confirmed actions, not something this hook does.
set -uo pipefail

own_dir="$(pwd -P 2>/dev/null || true)"

main_wt="$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2; exit}')"
[ -z "$main_wt" ] && exit 0

cd "$main_wt" || exit 0

remote_url="$(git remote get-url origin 2>/dev/null || true)"
case "$remote_url" in
  *curbsitter_claude01*) ;;
  *) exit 0 ;;
esac

git rev-parse --verify main >/dev/null 2>&1 || exit 0
git fetch origin --prune --quiet 2>/dev/null || true

removed=()
skipped_dirty=()
skipped_self=()
worktree_branches=""

while IFS= read -r wt_path; do
  [ -z "$wt_path" ] && continue
  wt_real="$(cd "$wt_path" 2>/dev/null && pwd -P || true)"
  [ "$wt_real" = "$main_wt" ] && continue

  branch="$(git -C "$wt_path" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  [ -z "$branch" ] || [ "$branch" = "HEAD" ] && continue
  worktree_branches="$worktree_branches
$branch"

  if [ -n "$own_dir" ] && [ "$wt_real" = "$own_dir" ]; then
    skipped_self+=("$branch")
    continue
  fi

  git rev-parse --verify "$branch" >/dev/null 2>&1 || continue

  # Ancestor check, not `git branch --merged` / `-d` (both compare against
  # current HEAD, which caused a false "not fully merged" earlier this session
  # when HEAD was on an unrelated branch).
  if git merge-base --is-ancestor "$branch" main 2>/dev/null; then
    if [ -n "$(git -C "$wt_path" status --porcelain=v1 2>/dev/null)" ]; then
      skipped_dirty+=("$branch")
      continue
    fi
    if git worktree remove "$wt_path" >/dev/null 2>&1; then
      git branch -D "$branch" >/dev/null 2>&1
      removed+=("$branch")
    fi
  fi
done < <(git worktree list --porcelain | awk '/^worktree /{print $2}')

# Branches with no worktree attached (e.g. removed by hand) that are merged.
while IFS= read -r branch; do
  [ -z "$branch" ] || [ "$branch" = "main" ] && continue
  case "$worktree_branches" in *"
$branch"*) continue ;; esac
  if git merge-base --is-ancestor "$branch" main 2>/dev/null; then
    git branch -D "$branch" >/dev/null 2>&1 && removed+=("$branch (no worktree)")
  fi
done < <(git branch --format='%(refname:short)')

# Report-only pass over whatever branches remain.
reminders=()
remote_safe=()
while IFS= read -r branch; do
  [ -z "$branch" ] || [ "$branch" = "main" ] && continue
  git rev-parse --verify "$branch" >/dev/null 2>&1 || continue

  configured_remote="$(git config --get "branch.$branch.remote" 2>/dev/null || true)"
  upstream="$(git rev-parse --abbrev-ref "$branch@{u}" 2>/dev/null || true)"

  if [ -n "$upstream" ]; then
    ahead="$(git rev-list --count "$upstream..$branch" 2>/dev/null || echo 0)"
    [ "$ahead" -gt 0 ] 2>/dev/null && reminders+=("$branch: $ahead commit(s) ahead of $upstream - push/PR?")
  elif [ -n "$configured_remote" ]; then
    reminders+=("$branch: upstream deleted (gone) - stale local branch")
  else
    reminders+=("$branch: never pushed")
  fi

  if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1 \
     && git merge-base --is-ancestor "origin/$branch" main 2>/dev/null; then
    remote_safe+=("$branch")
  fi
done < <(git branch --format='%(refname:short)')

msg=""
[ "${#removed[@]}" -gt 0 ] && msg+="Cleaned up merged worktree/branch: $(IFS=,; echo "${removed[*]}"). "
[ "${#skipped_dirty[@]}" -gt 0 ] && msg+="Left alone (merged but has uncommitted changes): $(IFS=,; echo "${skipped_dirty[*]}"). "
[ "${#remote_safe[@]}" -gt 0 ] && msg+="Safe to delete on origin too (merged): $(IFS=,; echo "${remote_safe[*]}"). "
[ "${#reminders[@]}" -gt 0 ] && msg+="Unsynced: $(IFS='; '; echo "${reminders[*]}")."

if [ -n "$msg" ]; then
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$msg" | jq -Rs '{systemMessage: .}'
  else
    esc="$(printf '%s' "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g')"
    printf '{"systemMessage": "%s"}' "$esc"
  fi
fi
exit 0
