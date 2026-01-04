#!/bin/bash
# Extract all t('...' as never) with file, line, namespace context

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="/tmp/i18n-migration"

mkdir -p "$OUTPUT_DIR"

cd "$PROJECT_ROOT"

echo "=== Step 1: Extracting all t('...' as never) occurrences ==="

# Extract with ripgrep JSON, then clean with sed
rg "t\('([^']+)' as never\)" src -g '*.tsx' --json | \
jq -r 'select(.type=="match") | "\(.data.path.text)|\(.data.line_number)|\(.data.submatches[0].match.text)"' | \
while IFS='|' read -r file line match; do
  # Extract just the string value from t('STRING' as never)
  string=$(echo "$match" | sed "s/t('\(.*\)' as never)/\1/")
  echo "{\"file\":\"$file\",\"line\":$line,\"string\":\"$string\"}"
done | jq -s '.' > "$OUTPUT_DIR/extracted_strings.json"

echo "Extracted $(cat "$OUTPUT_DIR/extracted_strings.json" | jq 'length') total occurrences"

# Determine namespace for each file
echo "=== Step 2: Determining namespaces for each file ==="

cat "$OUTPUT_DIR/extracted_strings.json" | jq '
  group_by(.file) |
  map({
    file: .[0].file,
    namespace: (
      .[0].file | 
      if test("construction/config/components") then "config"
      elif test("construction/materials/components") then "config"
      elif test("editor/tools") then "tool"
      elif test("editor/components/(Measurement|Roof)") then "construction"
      elif test("editor/plan-overlay") then "overlay"
      elif test("shared/components/Logo") then "common"
      else "unknown"
      end
    ),
    strings: map({line: .line, string: .string})
  })
' > "$OUTPUT_DIR/files_with_namespaces.json"

# Get actual namespace from files where possible
jq -r '.[].file' "$OUTPUT_DIR/files_with_namespaces.json" | while read -r file; do
  if [ -f "$file" ]; then
    actual_ns=$(rg "useTranslation\('([^']+)'\)" "$file" -o -r '$1' 2>/dev/null | head -1 || echo "")
    if [ -n "$actual_ns" ]; then
      jq --arg f "$file" --arg ns "$actual_ns" '
        map(if .file == $f then .namespace = $ns else . end)
      ' "$OUTPUT_DIR/files_with_namespaces.json" > "$OUTPUT_DIR/files_with_namespaces.json.tmp"
      mv "$OUTPUT_DIR/files_with_namespaces.json.tmp" "$OUTPUT_DIR/files_with_namespaces.json"
    fi
  fi
done

echo "Namespace distribution:"
jq -r '.[] | "\(.namespace): \(.file)"' "$OUTPUT_DIR/files_with_namespaces.json" | sort

echo ""
echo "Summary by namespace:"
jq -r 'group_by(.namespace) | map({namespace: .[0].namespace, count: (map(.strings | length) | add)}) | .[] | "\(.namespace): \(.count) strings"' "$OUTPUT_DIR/files_with_namespaces.json"

echo ""
echo "Unique strings:"
jq -r '.[].strings[].string' "$OUTPUT_DIR/files_with_namespaces.json" | sort -u | wc -l

echo ""
echo "Output saved to: $OUTPUT_DIR/files_with_namespaces.json"
