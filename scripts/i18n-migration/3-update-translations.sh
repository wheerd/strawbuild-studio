#!/bin/bash
# Update translation JSON files - DRY RUN MODE

set -e

OUTPUT_DIR="/tmp/i18n-migration"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

DRY_RUN=${DRY_RUN:-true}

if [ "$DRY_RUN" = "true" ]; then
  echo "=== DRY RUN MODE - No files will be modified ==="
else
  echo "=== APPLY MODE - Translation files will be updated ==="
fi

echo ""

# Group keys by namespace and build structured JSON
python3 << 'PYTHON_SCRIPT'
import json
import sys
from collections import defaultdict

dry_run = sys.argv[1] == "true" if len(sys.argv) > 1 else True

# Load mappings
with open('/tmp/i18n-migration/string_key_mapping.json') as f:
    mappings = json.load(f)

# Group by namespace
by_namespace = defaultdict(list)
for item in mappings:
    # Skip keys that already exist in common
    if not item['key'].startswith('common.'):
        by_namespace[item['namespace']].append(item)

# Process each namespace
for namespace, items in sorted(by_namespace.items()):
    print(f"\n=== Processing namespace: {namespace} ===")
    
    # Build nested structure
    structure = {}
    for item in items:
        key_path = item['key']
        # Remove namespace prefix
        if key_path.startswith(namespace + '.'):
            key_path = key_path[len(namespace)+1:]
        
        # Split path and build nested dict
        parts = key_path.split('.')
        current = structure
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        
        # Set the value
        current[parts[-1]] = item['value']
    
    # Count new keys
    def count_keys(d):
        count = 0
        for k, v in d.items():
            if isinstance(v, dict):
                count += count_keys(v)
            else:
                count += 1
        return count
    
    new_key_count = count_keys(structure)
    print(f"  Would add {new_key_count} new keys")
    
    # Show structure preview
    print(f"  Structure preview:")
    for section in sorted(structure.keys())[:5]:
        if isinstance(structure[section], dict):
            subkey_count = count_keys(structure[section])
            print(f"    - {section}: {subkey_count} keys")
        else:
            print(f"    - {section}: 1 key")
    
    # Save for next step
    with open(f'/tmp/i18n-migration/{namespace}_new_keys.json', 'w') as f:
        json.dump(structure, f, indent=2, ensure_ascii=False)
    
    if not dry_run:
        # Load existing translation file
        en_file = f'src/shared/i18n/locales/en/{namespace}.json'
        try:
            with open(en_file) as f:
                existing = json.load(f)
        except FileNotFoundError:
            existing = {}
        
        # Deep merge
        def deep_merge(base, update):
            for key, value in update.items():
                if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                    deep_merge(base[key], value)
                else:
                    base[key] = value
        
        deep_merge(existing, structure)
        
        # Save EN file
        with open(en_file, 'w') as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
            f.write('\n')
        
        print(f"  ✓ Updated {en_file}")
        
        # Create empty DE keys
        de_file = f'src/shared/i18n/locales/de/{namespace}.json'
        try:
            with open(de_file) as f:
                de_existing = json.load(f)
        except FileNotFoundError:
            de_existing = {}
        
        # Deep merge with empty strings
        def empty_structure(d):
            result = {}
            for k, v in d.items():
                if isinstance(v, dict):
                    result[k] = empty_structure(v)
                else:
                    result[k] = ""
            return result
        
        de_structure = empty_structure(structure)
        deep_merge(de_existing, de_structure)
        
        with open(de_file, 'w') as f:
            json.dump(de_existing, f, indent=2, ensure_ascii=False)
            f.write('\n')
        
        print(f"  ✓ Updated {de_file}")

PYTHON_SCRIPT "$DRY_RUN"

if [ "$DRY_RUN" = "true" ]; then
  echo ""
  echo "=== Review generated key structures in /tmp/i18n-migration/*_new_keys.json ==="
  echo "=== Run with DRY_RUN=false to apply changes ==="
else
  echo ""
  echo "=== Regenerating TypeScript interfaces ==="
  cd "$PROJECT_ROOT"
  pnpm i18n:interface
fi
