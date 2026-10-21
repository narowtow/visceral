"""Recover the GHE cause tree from indentation and printed hierarchy labels."""

import re


def cause_from_row(row):
    code = int(row[1])
    populated = [(i, str(v).strip()) for i, v in enumerate(row[2:7], 2) if v is not None]
    if not populated:
        raise ValueError(f"Missing cause name: {code}")
    column, name = populated[-1]
    level = 0 if code == 0 else column - 2
    # WHO prints e.1./e.2. in the same columns as e.; these are level 5, not siblings.
    if len(populated) > 1 and re.fullmatch(r"[a-z]\.\d+\.", populated[-2][1]):
        level += 1
    if level < 0 or level > 5:
        raise ValueError(f"Unexpected indentation for {code}")
    return {"code": code, "name": " ".join(name.split()), "level": level}


def hierarchy(causes):
    stack = {}
    result = []
    seen = set()
    for cause in causes:
        code, level = cause["code"], cause["level"]
        if code in seen or (level and level - 1 not in stack):
            raise ValueError(f"Invalid cause hierarchy at {code}")
        parent = stack.get(level - 1) if level else None
        result.append(cause | {"parent": parent})
        stack = {k: v for k, v in stack.items() if k < level}
        stack[level] = code
        seen.add(code)
    if not result or result[0]["code"] != 0:
        raise ValueError("Cause tree must start with All Causes (0)")
    return result
