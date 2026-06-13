import re

def parse_scorers(raw):
    if not raw or str(raw).strip().lower() in ("null", "none", ""):
        return []
    s = str(raw).strip()
    if s.startswith("{"):
        s = s[1:-1] if s.endswith("}") else s[1:]
    parts = re.split(r'",\s*"', s) if '"' in s else s.split(",")
    result = []
    for part in parts:
        token = part.strip().strip('"').strip()
        if not token or re.search(r'\(OG\)', token, re.IGNORECASE):
            continue
        m = re.search(r"\s+(\d+'(?:\+\d+'?)?)\s*$", token)
        if m:
            minute = m.group(1)
            name = token[:m.start()].strip()
        else:
            minute = None
            name = token.strip()
        if name:
            result.append((name, minute))
    return result

tests = [
    ('{"J. Quiñones 9\'","R. Jiménez 67\'"}',
     [("J. Quiñones", "9'"), ("R. Jiménez", "67'")]),
    ('{"F. Balogun 31\'","F. Balogun 45\'+5\'","G. Reyna 90\'+8\'"}',
     [("F. Balogun", "31'"), ("F. Balogun", "45'+5'"), ("G. Reyna", "90'+8'")]),
    ('{"C. Larin 11\'"}',
     [("C. Larin", "11'")]),
    ('{"I.B. Hwang 67\'","H.G. Oh 80\'"}',
     [("I.B. Hwang", "67'"), ("H.G. Oh", "80'")]),
]

all_ok = True
for raw, expected in tests:
    got = parse_scorers(raw)
    ok = got == expected
    if not ok:
        all_ok = False
    print(f"{'OK' if ok else 'FAIL'} {raw!r}")
    if not ok:
        print(f"  expected: {expected}")
        print(f"  got:      {got}")

print("\nAll OK!" if all_ok else "\nSome tests FAILED")
