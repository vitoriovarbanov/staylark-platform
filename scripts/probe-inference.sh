#!/usr/bin/env bash
#
# Probe the self-hosted inference service end-to-end with REAL models (Tier 2).
# No database or Node backend required — hits the Python service directly, so it's
# the fastest way to sanity-check model behaviour (sentiment, summary, topics, STT).
#
# Prereqs: the service is running, e.g.
#   docker compose -f docker-compose.inference.yml up --build
#
# Usage:
#   ./scripts/probe-inference.sh [audio-file]
#   INFERENCE_URL=http://localhost:8000 INFERENCE_API_KEY=local ./scripts/probe-inference.sh recording.webm
#
# Defaults: URL=http://localhost:8000, KEY=local. Pass an audio file as arg 1 to
# also exercise /transcribe (otherwise that check is skipped).
#
set -euo pipefail

URL="${INFERENCE_URL:-http://localhost:8000}"
KEY="${INFERENCE_API_KEY:-local}"
AUDIO="${1:-}"

JSON_HDR=(-H "X-Inference-Key: ${KEY}" -H "Content-Type: application/json")

pp() { if command -v jq >/dev/null 2>&1; then jq .; else cat; fi; }
post() { curl -fsS "${JSON_HDR[@]}" -d "$2" "${URL}$1" | pp; }

echo "▶ Probing ${URL}"
echo
echo "── health ──────────────────────────────────────────────"
curl -fsS "${URL}/health" | pp

echo
echo "── /classify — English positive (expect POSITIVE, 4-5) ─"
post /classify '{"text":"The apartment was spotless and the location was perfect. We loved every minute."}'

echo
echo "── /classify — English negative (expect NEGATIVE, 1-2) ─"
post /classify '{"text":"Everything was broken and dirty. Terrible stay, never coming back."}'

echo
echo "── /classify — Bulgarian negative (expect NEGATIVE) ────"
post /classify '{"text":"Апартаментът беше мръсен и климатикът не работеше. Много съм разочарован."}'

echo
echo "── /summarize — long text (expect a summary) ───────────"
post /summarize '{"text":"The flat was clean and modern. The location near the old town was ideal. However the WiFi kept dropping during calls. Parking was a real struggle every night. The host responded quickly to messages. We would happily stay again next year."}'

echo
echo "── /summarize — short text (expect summary: null) ──────"
post /summarize '{"text":"It was great."}'

echo
echo "── /relevance — genuine review (expect isReview: true) ─"
post /relevance '{"text":"The flat was clean and the host was lovely, but the bed was uncomfortable."}'

echo
echo "── /relevance — off-topic (expect isReview: false) ─────"
post /relevance '{"text":"I have nothing to say, just testing how this thing works."}'

echo
echo "── /aspects — multi-aspect review (expect tag chips) ───"
post /aspects '{"text":"The flat was spotless and right in the centre, but the street was very noisy at night and the WiFi barely worked."}'

echo
echo "── /aspects — off-topic (expect [] or near-empty) ──────"
post /aspects '{"text":"I have nothing to say, just testing how this thing works."}'

echo
if [[ -n "$AUDIO" ]]; then
  echo "── /transcribe — ${AUDIO} ──────────────────────────────"
  curl -fsS -H "X-Inference-Key: ${KEY}" -F "file=@${AUDIO}" "${URL}/transcribe" | pp
else
  echo "── /transcribe — skipped (pass an audio file as arg 1) ─"
fi

echo
echo "✅ probe complete"
