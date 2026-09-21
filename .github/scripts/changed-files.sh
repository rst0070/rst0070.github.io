#!/usr/bin/env bash
# Prints the files this event changed, one per line, or the single line "ALL"
# when they cannot be worked out (a force push, the first push on a branch, or
# a manual run). A caller that sees "ALL" must assume everything changed.
#
# Needs a checkout with `fetch-depth: 0`. Renames are reported as a delete plus
# an add, because the two paths can be two documents in the index.
#
# Environment: GITHUB_EVENT_NAME, GITHUB_SHA, GITHUB_BASE_REF, and BEFORE
# (`github.event.before`) for a push.
set -euo pipefail

case "${GITHUB_EVENT_NAME:-}" in
    pull_request)
        base="origin/${GITHUB_BASE_REF}"
        # Three dots: what the branch changed, not what happened on the base
        # since it forked.
        range=("${base}...HEAD")
        ;;
    push)
        base="${BEFORE:-}"
        range=("${base}" "${GITHUB_SHA}")
        ;;
    *)
        echo ALL
        exit 0
        ;;
esac

if [ -z "${base}" ] || [ "${base}" = "0000000000000000000000000000000000000000" ]; then
    echo ALL
    exit 0
fi
if ! git cat-file -e "${base}^{commit}" 2> /dev/null; then
    echo ALL
    exit 0
fi

git diff --name-only --no-renames "${range[@]}"
