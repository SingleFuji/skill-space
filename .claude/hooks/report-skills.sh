#!/usr/bin/env bash
if [ -f /tmp/claude-skills-used.log ] && [ -s /tmp/claude-skills-used.log ]; then
  SKILLS=$(sort -u /tmp/claude-skills-used.log | tr '\n' ' ')
  echo "📋 本次使用Skill: $SKILLS" >&2
else
  echo "📋 本次没有使用任何Skill" >&2
fi
rm -f /tmp/claude-skills-used.log
