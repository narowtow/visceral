"""Validate a cut through the underlying-cause tree: exactly one primary per leaf path."""

import pandas as pd

from .constants import CONFIG


def validate_mapping(frame, organs):
    if frame.code.duplicated().any() or not set(frame.organ.dropna()) <= set(organs):
        raise ValueError("Duplicate cause or unknown organ")
    if not set(frame.relation) <= {"primary", "none"} or frame.rationale.isna().any():
        raise ValueError("Missing mapping rationale or invalid relation")
    nodes = frame.set_index("code").to_dict("index")
    if 0 not in nodes or pd.notna(nodes[0]["parent"]):
        raise ValueError("Missing All Causes root")
    parents = set(frame.parent.dropna().astype(int))
    for code, node in nodes.items():
        if node["relation"] == "primary" and pd.isna(node["organ"]):
            raise ValueError(f"Primary cause {code} has no organ")
        visited, primary = set(), 0
        cursor = code
        while cursor is not None:
            if cursor in visited or cursor not in nodes:
                raise ValueError("Invalid/cyclic parent path")
            visited.add(cursor)
            current = nodes[cursor]
            primary += current["relation"] == "primary"
            parent = current["parent"]
            if pd.notna(parent) and nodes[int(parent)]["level"] >= current["level"]:
                raise ValueError("Invalid cause level")
            cursor = int(parent) if pd.notna(parent) else None
        if code not in parents and primary != 1:
            raise ValueError(f"Leaf {code} has {primary} primary ancestors; expected one")
        if primary > 1:
            raise ValueError(f"Overlapping primary causes at {code}")


def load_mapping(organs, path=CONFIG / "cause_map.csv"):
    frame = pd.read_csv(path)
    validate_mapping(frame, organs)
    return frame
