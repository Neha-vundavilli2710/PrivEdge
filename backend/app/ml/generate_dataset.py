"""Synthetic routing dataset.

IMPORTANT: labels are the project's *intended routing policy* (assigned per template
category: what SHOULD happen to this kind of query). They are NOT real production traffic.
Features are computed by the real analyzers, so the ML router learns how analyzer outputs
map to the intended route (it is not just re-learning the rule router's if/else).

Run:  python -m app.ml.generate_dataset
"""
import csv
import random
from pathlib import Path

from app.services.feature_extractor import extract_features

random.seed(42)
OUT = Path(__file__).parent / "dataset.csv"

TOPICS = ["Python", "Java", "recursion", "REST APIs", "HTML", "CSS flexbox", "SQL joins", "binary search", "Docker", "Git branching", "JavaScript closures",
          "photosynthesis", "the water cycle", "machine learning", "the French Revolution", "quantum computing", "React hooks", "linked lists", "TCP vs UDP", "inflation",
          "object-oriented programming", "sorting algorithms", "the Pythagorean theorem", "cloud computing", "HTTP status codes"]
CLOUD_T = ["What is {t}?", "Explain {t} with an example.", "Give me a beginner summary of {t}.", "How does {t} work?", "What are the main advantages of {t}?",
           "Write a short lesson plan about {t}.", "Compare {t} and {u}.", "Brainstorm five project ideas involving {t}.", "What is the difference between {t} and {u}?",
           "Summarize the key concepts of {t} for an exam.", "Why is {t} important?"]
CLOUD_COMPLEX = ["Design a distributed fault-tolerant architecture for a large-scale {t} platform.", "Compare the trade-offs of microservices and a monolith for a system using {t}, considering scalability and deployment.",
                 "Explain how to optimize the throughput and latency of a database-backed application built around {t}.", "Design a scalable pipeline and explain the algorithm, architecture and replication strategy for {t}."]
FAKE_NAMES = ["Rahul Sharma", "Priya Nair", "John Miller", "Ananya Rao", "Sara Khan", "David Lee"]
EDGE_T = ["Analyze this confidential {d}.", "Summarize this confidential {d} for me.", "Please review our internal {d} and list the key issues.", "Analyze this private {d} and find anomalies.",
          "Here is our proprietary {d}. Extract the main points.", "Review this restricted {d} and summarize it."]
DOCS = ["employee salary report", "company financial report", "employee performance data", "board meeting minutes", "customer list", "payroll spreadsheet", "internal audit report", "trade secret document", "merger plan", "compensation report"]
EDGE_PII = ["My email is {email}. Can you draft a polite follow-up message?", "My phone number is {phone}, please help me write a voicemail script.", "My account number is {acct}. Can you analyze my recent transactions?",
            "My employee ID is EMP{n} and my salary is 80,000. Analyze my financial situation.", "My name is {name} and my email is {email}. Help me write a cover letter.",
            "Card number {card} was charged twice. Help me write a dispute email.", "My Aadhaar number is {aadhaar}. How do I update my address?", "My SSN is {ssn}. Help me fill out this tax form."]
EDGE_MED = ["Summarize my medical records and lab results privately.", "My patient records are private. Summarize the diagnosis history in this file.", "Analyze this private health record and list the medications mentioned.",
            "Summarize this patient treatment history document for my notes."]
EDGE_FIN = ["Analyze my bank transaction history and my income for the last year.", "Review my private payroll and tax return figures.", "Help me budget using my salary and account balances."]
EDGE_LAT = ["Quick: what is {t}?", "Briefly, what is {t}? asap", "In a sentence, explain {t}.", "Fast answer please: define {t}.", "tl;dr {t}?", "urgent, one line on {t}"]
HUMAN_MED = ["Should this patient undergo this medical procedure?", "Should I take this medication together with my current prescription?", "Should this patient stop treatment and switch to a different drug?",
             "Is it safe to change my dosage without asking a doctor? Decide for me.", "Should we proceed with surgery for this diagnosis?"]
HUMAN_LEGAL = ["Is this legal document safe to sign?", "Should I sue my landlord over this contract clause?", "Should we sign this agreement given the liability clauses?", "Is it legal to terminate this contract early? Decide for me.",
               "Should I accept this settlement in the lawsuit?"]
HUMAN_FIN = ["Should I invest my entire savings in this stock?", "Should we approve this loan for the company given the audit findings?", "Should I take a mortgage on this property? Decide for me.", "Should we declare bankruptcy given this portfolio?"]
HUMAN_HR = ["Should we terminate this employee after the performance review?", "Should we approve this promotion or fire the employee? Decide.", "Should we lay off the team based on this review?"]
HUMAN_GEN = ["Make a high-stakes professional decision for this case.", "This is a life-or-death situation, I need your professional judgment now.", "Give legal advice on whether I should proceed.",
             "Evaluate this high-stakes professional decision and tell me what to do.", "Resolve this ethical dilemma and decide for us.", "This is a critical decision; make the call for us."]


def fake(kind):
    n = random.randint(100000, 999999)
    return {"email": f"user{n}@example.com", "phone": f"9{random.randint(100000000, 999999999)}", "acct": str(random.randint(10**8, 10**11)),
            "n": str(n), "name": random.choice(FAKE_NAMES), "card": " ".join(str(random.randint(1000, 9999)) for _ in range(4)),
            "aadhaar": f"{random.randint(1000,9999)} {random.randint(1000,9999)} {random.randint(1000,9999)}", "ssn": f"{random.randint(100,999)}-{random.randint(10,99)}-{random.randint(1000,9999)}"}[kind]


def build():
    rows = []  # (query, label, template_id)
    tid = 0
    # CLOUD
    for t in CLOUD_T:
        tid += 1
        for topic in random.sample(TOPICS, 16):
            rows.append((t.format(t=topic, u=random.choice(TOPICS)), "cloud", tid))
    for t in CLOUD_COMPLEX:
        tid += 1
        for topic in random.sample(TOPICS, 14):
            rows.append((t.format(t=topic), "cloud", tid))
    for q in ["What is diabetes?", "What are common symptoms of the flu?", "Explain what a contract is in simple terms.", "What is compound interest?", "How do banks work?",
              "What is the history of the stock market?", "Explain what an employee handbook usually contains.", "What is a mortgage?", "What does HIPAA stand for?", "Explain what an audit is."]:
        tid += 1
        rows += [(q, "cloud", tid), (q.lower(), "cloud", tid)]
    # EDGE: confidential / PII / private
    for t in EDGE_T:
        tid += 1
        for d in random.sample(DOCS, 10):
            rows.append((t.format(d=d), "edge", tid))
    for t in EDGE_PII:
        tid += 1
        for _ in range(16):
            rows.append((t.format(email=fake("email"), phone=fake("phone"), acct=fake("acct"), n=fake("n"), name=fake("name"), card=fake("card"), aadhaar=fake("aadhaar"), ssn=fake("ssn")), "edge", tid))
    for q in EDGE_MED + EDGE_FIN:
        tid += 1
        rows += [(q, "edge", tid), (q.replace("my ", "our "), "edge", tid)]
    for t in EDGE_LAT:
        tid += 1
        for topic in random.sample(TOPICS, 12):
            rows.append((t.format(t=topic), "edge", tid))
    # HUMAN
    for group in (HUMAN_MED, HUMAN_LEGAL, HUMAN_FIN, HUMAN_HR, HUMAN_GEN):
        for q in group:
            tid += 1
            rows += [(q, "human", tid), (q + " Please answer quickly.", "human", tid), ("Hi, " + q[0].lower() + q[1:], "human", tid), (q.replace("this", "the"), "human", tid),
                     (q + " It affects a lot of people.", "human", tid), ("Urgent: " + q, "human", tid)]
    random.shuffle(rows)
    return rows


COLS = ["privacy_score", "sensitivity_score", "complexity_score", "risk_score", "latency_score", "human_required", "query_length", "contains_pii", "domain"]


def main():
    rows = build()
    with OUT.open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["query", *COLS, "route", "template_id"])
        for q, label, tid in rows:
            f = extract_features(q)
            w.writerow([q, f.privacy_score, f.sensitivity_score, f.complexity_score, f.risk_score, f.latency_score, int(f.human_required), f.query_length, int(f.contains_pii), f.domain, label, tid])
    from collections import Counter
    print(f"wrote {len(rows)} rows -> {OUT}", dict(Counter(r[1] for r in rows)))


if __name__ == "__main__":
    main()
