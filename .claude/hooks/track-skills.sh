#!/usr/bin/env bash
INPUT=$(cat)
SKILL_NAME=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
tool = d.get('tool_name', '')
input_data = d.get('input', {})
if isinstance(input_data, dict):
    print(input_data.get('skill', ''))
else:
    print('')
" 2>/dev/null)
if [ -n "$SKILL_NAME" ]; then
  echo "$SKILL_NAME" >> /tmp/claude-skills-used.log
fi
