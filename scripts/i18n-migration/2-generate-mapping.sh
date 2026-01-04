#!/bin/bash
# Generate string → translation key mappings

set -e

OUTPUT_DIR="/tmp/i18n-migration"

echo "=== Generating translation key mappings ==="

# Common reusable keys (already exist in translations)
cat > "$OUTPUT_DIR/common_keys.json" << 'EOF'
{
  "Material": "common.material",
  "Cancel": "common.cancel",
  "Thickness": "common.thickness",
  "Width": "common.width",
  "Height": "common.height",
  "Type": "common.type",
  "Reset": "common.reset",
  "Name": "common.name",
  "Delete": "common.delete",
  "Total Thickness": "common.totalThickness",
  "Esc": "common.keyboard.esc",
  "Enter": "common.keyboard.enter"
}
EOF

# First pass: create initial mapping with strings
cat "$OUTPUT_DIR/files_with_namespaces.json" | jq -r '
  .[] |
  .namespace as $ns |
  .file as $file |
  .strings[] |
  {
    file: $file,
    line: .line,
    string: .string,
    namespace: $ns
  }
' | jq -s '.' > "$OUTPUT_DIR/strings_flat.json"

# Second pass: generate keys with Python helper for better string manipulation
python3 << 'PYTHON_SCRIPT' > "$OUTPUT_DIR/string_key_mapping.json"
import json
import re

# Load data
with open('/tmp/i18n-migration/strings_flat.json') as f:
    strings = json.load(f)

with open('/tmp/i18n-migration/common_keys.json') as f:
    common_keys = json.load(f)

def to_camel_case(text):
    """Convert string to camelCase"""
    # Remove "Select " prefix and "..." suffix
    text = re.sub(r'^Select\s+', '', text)
    text = re.sub(r'\.\.\.$', '', text)
    text = re.sub(r'\s+-\s+', ' ', text)
    
    # Split into words
    words = text.split()
    if not words:
        return text.lower()
    
    # First word lowercase, rest title case
    result = words[0].lower()
    for word in words[1:]:
        result += word.capitalize()
    
    return result

def categorize_string(string_val, namespace):
    """Determine category and subcategory for a string"""
    
    # Determine category
    if re.search(r'^Select .*\.\.\.$', string_val):
        category = 'placeholders'
    elif re.search(r'(Floor|Roof|Wall|Beam|Opening)$', string_val):
        category = 'sections'
    else:
        category = 'labels'
    
    # Determine subcategory for config namespace
    subcategory = None
    if namespace == 'config':
        if re.search(r'(?i)(joist|subfloor|ceiling)', string_val):
            subcategory = 'floors'
        elif re.search(r'(?i)(rafter|purlin|deck|overhang)', string_val):
            subcategory = 'roofs'
        elif re.search(r'(?i)(post|stud|frame|infill).*wall|wall.*(post|stud|frame|infill)', string_val):
            subcategory = 'walls'
        elif re.search(r'(?i)(opening|sill|header|padding)', string_val):
            subcategory = 'openings'
        elif re.search(r'(?i)(beam|insulation|waterproof|stem)', string_val):
            subcategory = 'ringBeams'
        elif re.search(r'(?i)layer', string_val):
            subcategory = 'layers'
    elif namespace == 'construction':
        subcategory = 'measurements'
    elif namespace == 'tool':
        subcategory = 'labels'
    elif namespace == 'overlay':
        subcategory = 'calibration'
    elif namespace == 'common':
        if re.search(r'(Strawbaler|Construction Planning)', string_val):
            subcategory = 'app'
    
    return category, subcategory

# Process each string
results = []
for item in strings:
    string_val = item['string']
    namespace = item['namespace']
    
    # Check if it's a common key
    if string_val in common_keys:
        key = common_keys[string_val]
    else:
        # Generate key
        category, subcategory = categorize_string(string_val, namespace)
        key_name = to_camel_case(string_val)
        
        # Build full key path
        if subcategory:
            key = f"{namespace}.{subcategory}.{category}.{key_name}"
        else:
            key = f"{namespace}.{category}.{key_name}"
    
    results.append({
        'file': item['file'],
        'line': item['line'],
        'string': string_val,
        'namespace': namespace,
        'key': key,
        'value': string_val
    })

# Output
print(json.dumps(results, indent=2))
PYTHON_SCRIPT

echo "Generated mappings for $(cat "$OUTPUT_DIR/string_key_mapping.json" | jq 'length') occurrences"
echo ""
echo "Sample mappings:"
cat "$OUTPUT_DIR/string_key_mapping.json" | jq -r 'limit(10; .) | "\(.string) → \(.key)"'

echo ""
echo "Keys by namespace:"
cat "$OUTPUT_DIR/string_key_mapping.json" | jq -r '.key' | cut -d. -f1 | sort | uniq -c | sort -rn

echo ""
echo "Output saved to: $OUTPUT_DIR/string_key_mapping.json"
