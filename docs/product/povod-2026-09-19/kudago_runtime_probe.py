#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
POVOD / KudaGo frozen Moscow data gate runtime probe.

Runs on an internet-enabled host and writes:
  artifacts/kudago_probe/raw/*.json
  artifacts/kudago_probe/MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json

No third-party packages required.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE = "https://kudago.com/public-api/v1.4"
OUT = Path("artifacts/kudago_probe")
RAW = OUT / "raw"
RAW.mkdir(parents=True, exist_ok=True)

UA = "Povod-Hackathon-DataGate/1.0 (+The Boys)"
TIMEOUT = 30

def get_json(path: str, params: dict[str, Any] | None = None) -> tuple[str, Any]:
    url = f"{BASE}{path}"
    if params:
        clean = {k: v for k, v in params.items() if v is not None}
        url += "?" + urllib.parse.urlencode(clean, doseq=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        body = r.read()
        status = r.status
    if status != 200:
        raise RuntimeError(f"HTTP {status}: {url}")
    return url, json.loads(body.decode("utf-8"))

def save_raw(task_id: str, name: str, url: str, payload: Any) -> dict[str, Any]:
    raw_text = json.dumps(payload, ensure_ascii=False, indent=2)
    p = RAW / f"{task_id}_{name}.json"
    p.write_text(raw_text, encoding="utf-8")
    return {
        "url": url,
        "file": str(p),
        "sha256": hashlib.sha256(raw_text.encode("utf-8")).hexdigest(),
    }

def search_events(task_id: str, q: str) -> list[dict[str, Any]]:
    url, payload = get_json("/search/", {
        "q": q,
        "location": "msk",
        "ctype": "event",
        "lang": "ru",
    })
    save_raw(task_id, "search", url, payload)
    return payload.get("results", [])

def event_detail(task_id: str, event_id: int) -> dict[str, Any]:
    fields = ",".join([
        "id","dates","title","place","location","categories","price",
        "is_free","site_url","participants","age_restriction","tags"
    ])
    url, payload = get_json(f"/events/{event_id}/", {
        "lang": "ru",
        "fields": fields,
        "expand": "place,location,dates,participants",
        "text_format": "text",
    })
    save_raw(task_id, f"event_{event_id}", url, payload)
    return payload

def find_by_title(task_id: str, query: str, title_contains: str) -> dict[str, Any] | None:
    results = search_events(task_id, query)
    needle = title_contains.casefold()
    candidates = [x for x in results if needle in (x.get("title") or "").casefold()]
    if not candidates:
        candidates = results[:5]
    for c in candidates:
        eid = c.get("id")
        if not eid:
            continue
        d = event_detail(task_id, int(eid))
        if needle in (d.get("title") or "").casefold():
            return d
    return None

def occurrence_for_date(event: dict[str, Any], day: str) -> list[dict[str, Any]]:
    return [d for d in (event.get("dates") or []) if d.get("start_date") == day]

def hhmm_to_minutes(v: str | None) -> int | None:
    if not v:
        return None
    m = re.match(r"^(\d{1,2}):(\d{2})", v)
    return int(m.group(1))*60 + int(m.group(2)) if m else None

def parse_price(raw: str | None, is_free: bool | None) -> dict[str, Any]:
    raw = (raw or "").strip()
    low = raw.casefold()
    nums = [int(x.replace(" ", "")) for x in re.findall(r"\d[\d ]*", raw) if x.strip()]
    result = {
        "raw_price_text": raw,
        "is_free_claimed_by_source": is_free,
        "price_kind": "unknown",
        "amount_min": None,
        "amount_max": None,
        "mandatory_extra_min": None,
    }
    if ("депозит" in low or "обязат" in low) and nums:
        result["price_kind"] = "conditional"
        result["amount_min"] = 0 if is_free or "бесплат" in low else (nums[0] if nums else None)
        result["mandatory_extra_min"] = nums[-1]
        return result
    if is_free is True and not nums:
        result["price_kind"] = "free"
        result["amount_min"] = 0
        result["amount_max"] = 0
        return result
    if "от " in low and nums:
        result["price_kind"] = "from"
        result["amount_min"] = nums[0]
        return result
    if ("до " in low or "–" in raw or "-" in raw) and len(nums) >= 2:
        result["price_kind"] = "range"
        result["amount_min"] = min(nums[0], nums[1])
        result["amount_max"] = max(nums[0], nums[1])
        return result
    if nums:
        result["price_kind"] = "exact"
        result["amount_min"] = nums[0]
        result["amount_max"] = nums[0]
        return result
    if is_free is True or "бесплат" in low:
        result["price_kind"] = "free"
        result["amount_min"] = 0
        result["amount_max"] = 0
    return result

def assess_known(
    task_id: str,
    query: str,
    title_contains: str,
    day: str,
    start_min: int | None,
    start_max: int | None,
    budget_max: int | None,
) -> dict[str, Any]:
    ev = find_by_title(task_id, query, title_contains)
    if not ev:
        return {"task_id": task_id, "result": "ERROR", "reason": "event_not_found"}
    dates = occurrence_for_date(ev, day)
    price = parse_price(ev.get("price"), ev.get("is_free"))
    matches = []
    for d in dates:
        mins = hhmm_to_minutes(d.get("start_time"))
        ok_time = mins is not None
        if start_min is not None:
            ok_time = ok_time and mins >= start_min
        if start_max is not None:
            ok_time = ok_time and mins <= start_max
        spend_floor = price["mandatory_extra_min"]
        if spend_floor is None:
            spend_floor = price["amount_min"]
        ok_budget = True if budget_max is None else (spend_floor is not None and spend_floor <= budget_max)
        if ok_time and ok_budget:
            matches.append(d)
    return {
        "task_id": task_id,
        "event_id": ev.get("id"),
        "title": ev.get("title"),
        "source_url": ev.get("site_url"),
        "price": price,
        "date_matches": matches,
        "result": "PASS" if matches else "NO_PASS",
    }

def event_list(params: dict[str, Any], task_id: str, name: str) -> dict[str, Any]:
    fields = "id,dates,title,place,location,categories,price,is_free,site_url"
    full = {
        "lang": "ru",
        "page_size": 100,
        "fields": fields,
        "expand": "place,location,dates",
        "text_format": "text",
        **params
    }
    url, payload = get_json("/events/", full)
    save_raw(task_id, name, url, payload)
    return payload

def main() -> int:
    started = datetime.now(timezone.utc).isoformat()
    results: list[dict[str, Any]] = []

    # DG-01
    results.append(assess_known(
        "DG-01","Секретные актерские техники","Секретные",
        "2026-09-17",19*60,None,1000))

    # DG-02
    results.append(assess_known(
        "DG-02","Слишком женатый таксист","Слишком женатый таксист",
        "2026-09-17",18*60,None,2000))

    # DG-03
    results.append(assess_known(
        "DG-03","Good Night Show","Good Night Show",
        "2026-09-17",18*60,22*60,2000))

    # DG-04
    results.append(assess_known(
        "DG-04","Секретные актерские техники","Секретные",
        "2026-09-19",15*60,19*60,1000))

    # DG-05
    results.append(assess_known(
        "DG-05","Мужчина на все руки","Мужчина на все руки",
        "2026-09-19",18*60,None,2500))

    # DG-06
    results.append(assess_known(
        "DG-06","Стендап в темноте","Стендап в темноте",
        "2026-09-19",21*60,None,2000))

    # DG-07: use Garage Vintage rather than relying on stale CERAMANIA surface.
    results.append(assess_known(
        "DG-07","Гараж Винтаж Маркет","Гараж",
        "2026-09-19",11*60,20*60,0))

    # DG-08
    results.append(assess_known(
        "DG-08","Подыскиваю жену недорого","Подыскиваю жену",
        "2026-09-20",18*60,None,2000))

    # DG-09 conditional-free edge.
    dg09 = assess_known(
        "DG-09","Stand Up Afisha бесплатный вход","Stand Up Afisha",
        "2026-09-20",20*60,20*60,0)
    # PASS here would be a critical false pass.
    dg09["expected"] = "NO_PASS"
    dg09["critical_false_pass"] = dg09.get("result") == "PASS"
    results.append(dg09)

    # DG-10 / 11: scan current-ish September event records for null end / null place.
    scan = event_list({
        "location": "msk",
        "actual_since": "2026-09-01T00:00:00Z",
        "actual_until": "2026-10-31T23:59:59Z",
        "order_by": "-publication_date",
    }, "DG-10_11", "september_scan")
    null_end = None
    null_place = None
    for ev in scan.get("results", []):
        for d in ev.get("dates") or []:
            if d.get("start") and d.get("end_time") is None and null_end is None:
                null_end = {"event": ev, "date": d}
        if ev.get("place") is None and null_place is None:
            null_place = ev
    results.append({
        "task_id": "DG-10",
        "result": "PASS" if null_end else "NO_SAMPLE",
        "sample": null_end,
        "expected_behavior": "ends_at=null; no confirmed end-before hard-fit",
    })
    results.append({
        "task_id": "DG-11",
        "result": "PASS" if null_place else "NO_SAMPLE",
        "sample": null_place,
        "expected_behavior": "no fake coords; hide map CTA; location_known=false",
    })

    # DG-12: free theater on 2026-09-20, locally require start >= 23:30.
    dg12_payload = event_list({
        "location": "msk",
        "actual_since": "2026-09-20T00:00:00Z",
        "actual_until": "2026-09-21T23:59:59Z",
        "categories": "theater",
        "is_free": "true",
    }, "DG-12", "free_theater")
    late = []
    for ev in dg12_payload.get("results", []):
        for d in occurrence_for_date(ev, "2026-09-20"):
            mins = hhmm_to_minutes(d.get("start_time"))
            if mins is not None and mins >= 23*60+30:
                late.append({"event": ev, "date": d})
    results.append({
        "task_id": "DG-12",
        "result": "PASS_EMPTY" if not late else "FAIL_NONEMPTY",
        "matching_occurrences": late,
        "expected": "0 matching occurrences"
    })

    suitable = sum(1 for x in results[:8] if x.get("result") == "PASS")
    false_pass = any(x.get("critical_false_pass") for x in results)
    unresolved = [x["task_id"] for x in results if x.get("result") in {"ERROR","NO_SAMPLE"}]
    decision = "GO" if suitable >= 8 and not false_pass and not unresolved and results[-1]["result"] == "PASS_EMPTY" else "NO-GO"

    receipt = {
        "receipt_version": "runtime-1.0",
        "started_at_utc": started,
        "completed_at_utc": datetime.now(timezone.utc).isoformat(),
        "provider": "KudaGo public API v1.4",
        "city": "msk",
        "results": results,
        "summary": {
            "suitable_passes_dg01_dg08": suitable,
            "critical_false_pass": false_pass,
            "unresolved": unresolved,
            "dg12": results[-1]["result"]
        },
        "decision": decision
    }
    out = OUT / "MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json"
    out.write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out)
    print(json.dumps(receipt["summary"], ensure_ascii=False, indent=2))
    print("DECISION:", decision)
    return 0 if decision == "GO" else 2

if __name__ == "__main__":
    raise SystemExit(main())
