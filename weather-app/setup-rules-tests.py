#!/usr/bin/env python3
"""Add the test:rules script to package.json and the rules path to firebase.json.

Run once from weather-app/:  python3 setup-rules-tests.py
Safe to run twice. Delete it afterwards; do not commit it.
"""
import json
import pathlib

SCRIPT = (
    'npx firebase-tools emulators:exec --only firestore --project demo-weather-rules '
    '"vitest run --config vitest.rules.config.ts"'
)

package = pathlib.Path("package.json")
data = json.loads(package.read_text())
scripts = data.setdefault("scripts", {})
if scripts.get("test:rules") == SCRIPT:
    print("package.json: test:rules already present")
else:
    scripts["test:rules"] = SCRIPT
    package.write_text(json.dumps(data, indent=2) + "\n")
    print("package.json: added the test:rules script")

firebase = pathlib.Path("firebase.json")
config = json.loads(firebase.read_text()) if firebase.exists() else {}
firestore = config.setdefault("firestore", {})
if firestore.get("rules") == "firestore.rules":
    print("firebase.json: firestore.rules already set")
else:
    firestore["rules"] = "firestore.rules"
    firebase.write_text(json.dumps(config, indent=2) + "\n")
    print("firebase.json: set firestore.rules" + (" (created the file)" if not firebase.exists() else ""))
