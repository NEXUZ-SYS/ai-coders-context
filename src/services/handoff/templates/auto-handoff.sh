#!/usr/bin/env bash

# ============================================================================
# Auto-Handoff Wrapper Script
# ============================================================================
#
# Wraps Claude Code in a loop that automatically restarts sessions when
# context approaches the limit. Similar to the Ralph pattern
# (https://github.com/NEXUZ-SYS/ralph).
#
# Usage:
#   ./auto-handoff.sh [options]
#
# Options:
#   -p, --prompt <file>    Initial prompt file (default: reads from stdin)
#   -m, --max <N>          Maximum iterations (default: 20)
#   -d, --delay <N>        Delay between sessions in seconds (default: 2)
#   -t, --tool <tool>      AI tool to use: claude (default: claude)
#   --dangerously-skip     Pass --dangerously-skip-permissions to claude
#   -v, --verbose          Verbose output
#   -h, --help             Show this help
#
# Environment Variables:
#   MAX_ITERATIONS         Override max iterations
#   DELAY_SECONDS          Override delay between sessions
#   CLAUDE_TOOL            Override tool (claude)
#   INITIAL_PROMPT         Override initial prompt file
#
# ============================================================================

set -euo pipefail

# --- Constants ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HANDOFF_DIR="${SCRIPT_DIR}/state"
GENERATE_PROMPT="${SCRIPT_DIR}/src/generate-prompt.mjs"
COMPLETE_FLAG="${HANDOFF_DIR}/work-complete.flag"

# --- Default configuration ---
MAX_ITERATIONS="${MAX_ITERATIONS:-20}"
DELAY_SECONDS="${DELAY_SECONDS:-2}"
TOOL="${CLAUDE_TOOL:-claude}"
INITIAL_PROMPT="${INITIAL_PROMPT:-}"
SKIP_PERMISSIONS=false
VERBOSE=false

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Functions ---
log_info() { echo -e "${BLUE}[auto-handoff]${NC} $*"; }
log_success() { echo -e "${GREEN}[auto-handoff]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[auto-handoff]${NC} $*"; }
log_error() { echo -e "${RED}[auto-handoff]${NC} $*" >&2; }
log_debug() { [[ "$VERBOSE" == "true" ]] && echo -e "${CYAN}[auto-handoff:debug]${NC} $*" || true; }

show_help() {
    sed -n '/^# Usage:/,/^# ====/p' "$0" | sed 's/^# \?//'
    exit 0
}

# --- Parse arguments ---
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--prompt) INITIAL_PROMPT="$2"; shift 2 ;;
        -m|--max) MAX_ITERATIONS="$2"; shift 2 ;;
        -d|--delay) DELAY_SECONDS="$2"; shift 2 ;;
        -t|--tool) TOOL="$2"; shift 2 ;;
        --dangerously-skip) SKIP_PERMISSIONS=true; shift ;;
        -v|--verbose) VERBOSE=true; shift ;;
        -h|--help) show_help ;;
        *) log_error "Unknown option: $1"; show_help ;;
    esac
done

# --- Validate ---
if ! command -v "$TOOL" &> /dev/null; then
    log_error "$TOOL is not installed or not in PATH"
    exit 1
fi

if ! command -v node &> /dev/null; then
    log_error "Node.js is required but not installed"
    exit 1
fi

# --- Ensure state directory exists ---
mkdir -p "$HANDOFF_DIR/sessions"

# --- Clean up previous state ---
rm -f "$COMPLETE_FLAG"

# --- Build tool command ---
build_command() {
    local cmd="$TOOL"

    if [[ "$TOOL" == "claude" ]]; then
        cmd="$cmd --print"
        if [[ "$SKIP_PERMISSIONS" == "true" ]]; then
            cmd="$cmd --dangerously-skip-permissions"
        fi
    fi

    echo "$cmd"
}

# --- Main Loop ---
log_info "Starting auto-handoff loop"
log_info "  Tool: $TOOL"
log_info "  Max iterations: $MAX_ITERATIONS"
log_info "  Delay: ${DELAY_SECONDS}s"
[[ -n "$INITIAL_PROMPT" ]] && log_info "  Initial prompt: $INITIAL_PROMPT"
echo ""

ITERATION=0
while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
    ITERATION=$((ITERATION + 1))

    echo ""
    log_info "═══════════════════════════════════════════════════"
    log_info "  Sessão $ITERATION / $MAX_ITERATIONS"
    log_info "═══════════════════════════════════════════════════"
    echo ""

    CMD=$(build_command)
    EXIT_CODE=0

    # Check if there's a handoff pending or if this is the first iteration
    if [[ -f "${HANDOFF_DIR}/handoff-pending.json" ]]; then
        log_info "Handoff pendente detectado - restaurando contexto..."
        PROMPT=$(node "$GENERATE_PROMPT" 2>/dev/null) || {
            log_error "Failed to generate handoff prompt"
            PROMPT=""
        }

        if [[ -n "$PROMPT" ]]; then
            log_debug "Handoff prompt size: ${#PROMPT} chars"
            echo "$PROMPT" | $CMD 2>&1 | tee /dev/stderr || EXIT_CODE=$?
        else
            log_warn "Empty handoff prompt, running without context"
            $CMD 2>&1 | tee /dev/stderr || EXIT_CODE=$?
        fi
    elif [[ $ITERATION -eq 1 && -n "$INITIAL_PROMPT" ]]; then
        # First iteration with initial prompt file
        log_info "Usando prompt inicial: $INITIAL_PROMPT"

        if [[ -f "$INITIAL_PROMPT" ]]; then
            PROMPT=$(node "$GENERATE_PROMPT" --initial "$INITIAL_PROMPT" 2>/dev/null) || {
                log_warn "generate-prompt failed, using file directly"
                PROMPT=$(cat "$INITIAL_PROMPT")
            }
            echo "$PROMPT" | $CMD 2>&1 | tee /dev/stderr || EXIT_CODE=$?
        else
            log_error "Initial prompt file not found: $INITIAL_PROMPT"
            exit 1
        fi
    elif [[ $ITERATION -eq 1 ]]; then
        # First iteration without prompt - interactive or piped stdin
        log_info "Sessão inicial (sem prompt file)"
        $CMD 2>&1 | tee /dev/stderr || EXIT_CODE=$?
    else
        # Subsequent iteration without handoff (shouldn't happen normally)
        log_warn "No handoff pending for iteration $ITERATION"
        break
    fi

    log_debug "Claude exited with code: $EXIT_CODE"

    # Check if work is complete
    if [[ -f "$COMPLETE_FLAG" ]]; then
        echo ""
        log_success "═══════════════════════════════════════════════════"
        log_success "  Trabalho concluído após $ITERATION sessão(ões)!"
        log_success "═══════════════════════════════════════════════════"
        rm -f "$COMPLETE_FLAG"
        exit 0
    fi

    # Check if there's a new handoff pending
    if [[ -f "${HANDOFF_DIR}/handoff-pending.json" ]]; then
        log_info "Handoff detectado - reiniciando em ${DELAY_SECONDS}s..."
        sleep "$DELAY_SECONDS"
        continue
    fi

    # No handoff and no completion - session ended normally
    log_info "Sessão encerrada sem handoff pendente"
    break
done

if [[ $ITERATION -ge $MAX_ITERATIONS ]]; then
    log_warn "Número máximo de iterações atingido ($MAX_ITERATIONS)"
fi

echo ""
log_info "Auto-handoff loop encerrado após $ITERATION sessão(ões)"
