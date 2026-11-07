Why Recall Wasn't Enough: Building IncidentIQ with Hindsight

The moment that sold me on agent memory was small. I clicked Failed on one recommended fix, ran the same incident again, and a new card appeared: INC-200, the failure I had just reported. The agent had remembered what I told it, and its advice changed because of it.

Getting there took more than plugging a memory layer into a chatbot. This is what I built, and what recall alone didn't do.

The problem: an incident assistant with no memory

During an outage, engineers often retry steps a teammate already tried months ago. A typical LLM assistant gives generic troubleshooting advice from its training data. It has no idea which fixes worked in your stack, and it can't tell you that the obvious fix was tried before and made things worse.

IncidentIQ is my attempt at an incident response assistant that remembers. An engineer reports an incident, and the agent recalls similar past incidents, recommends fixes, and shows how those fixes turned out before. Pooja built the web interface and Rohini wrote the simulated incident data that makes the demo realistic. I built the backend that connects Hindsight, an agent memory engine from Vectorize, with the Groq LLM API.

[IMAGE 1: incident history page]

How it works: retain, recall, count

The backend is a Python FastAPI app. The lifecycle has three parts.

Retain. Each past incident (service, symptoms, root cause, fix tried, outcome) is written to Hindsight Cloud as a plain-language note. When an engineer clicks Worked or Failed on a recommendation, that outcome is saved as a new note too.

Recall. When a new incident arrives, the backend asks Hindsight what it remembers about similar incidents on that service. Hindsight doesn't hand back database rows. It splits notes into facts, so ten incidents produced about 57 text snippets.

Count. I didn't want to trust a model with arithmetic, so my own code pulls the incident IDs out of the snippets, loads the full records, and counts how many cited fixes worked or failed.

The recalled incidents go to Groq (openai/gpt-oss-120b), which writes up to three recommendations.

A concrete example: the payments timeout

The demo uses ten simulated incidents. Three matter here, all on a payments service.

INC-001: raising the database connection pool from 10 to 30, after checking capacity, stopped the timeouts.

INC-003: raising the pool again without checking capacity made the database more overloaded, and the timeouts continued. That attempt failed.

INC-009: optimizing repeated queries and tuning the pool within limits worked.

I report a new incident: checkout requests are timing out when connecting to the database. The agent recommends resizing the pool safely and optimizing heavy queries. It also warns against an unchecked pool increase, citing INC-003 as the reason.

[IMAGE 2: recommendation cards with the INC-003 warning]

The feedback loop

In the demo, I click Failed on the first recommended fix. The outcome is saved to Hindsight. Then I submit the same incident again.

This time the response cites INC-200, my feedback, as a failed memory, the failure count on the related recommendation goes up, and one fix is built around why the earlier attempts failed.

[IMAGE 3: second analysis showing the INC-200 memory card]

Why recall alone wasn't enough

My first version only recalled. The second analysis looked almost identical to the first, because Hindsight's top results barely changed. The feedback was saved, but the next answer didn't reflect it, so the loop was invisible.

The fix was in my code. Outcomes engineers report on a service are now always added to the evidence for the next analysis, alongside whatever Hindsight returns. Memory retrieval gave the agent history, and the application logic made sure fresh feedback could not be missed.

Two snippets from the code

Hindsight returns text, so I extract incident IDs with a regex and keep Hindsight's ranking order:

known = {r["id"] for r in records}
ordered = []
for text in texts:
    for found in re.findall(r"INC-\d+", text):
        if found in known and found not in ordered:
            ordered.append(found)

The model never does the counting. After it answers, I discard any incident ID it invented and count outcomes myself:

ids = [i for i in rec.get("relatedIncidentIds", []) if i in by_id]
successes = sum(1 for i in ids if by_id[i]["outcome"].lower() == "worked")
failures = sum(1 for i in ids if by_id[i]["outcome"].lower() == "failed")

If the model call fails, the app builds recommendations directly from the recalled incidents, so the page never goes blank.

Lessons and dead ends

Field names broke the integration. The frontend expected camelCase and my first backend used snake_case. I rewrote the backend to match the frontend that already existed.

The model ignored a failed incident. Even with INC-003 in the evidence, early answers skipped it. Making "cover every failed related incident" a hard rule in the prompt fixed it.

A note without a date. My first test note had no timestamp, so Hindsight dated it "today", and it appeared in recall results as if it were a fresh incident.

Counts are mine, not Hindsight's. The success and failure numbers are tallied by my code from the incidents a recommendation cites. For a fix that blends two earlier ones, the number means both parts worked separately.

Limits

The ten historical incidents are simulated. Service status shows whether the backend is connected, not live production health. Incidents reported while using the app are kept in a local file, while Hindsight holds the outcome notes. There is one shared memory bank and no user accounts. When the model explains why a fix failed, that is its inference from the recorded outcome, not a confirmed root cause.

What I'd do next

Add authentication and one memory bank per team. Store root causes that engineers confirm after resolving an incident, so the agent reasons from facts instead of inference. And evaluate whether recommendations actually shorten resolution time, which I haven't measured.

Conclusion

Memory made the agent useful only once the application treated feedback as first-class evidence. Hindsight handled storing and recalling the history. My code handled counting, validation and making sure a reported failure shows up in the very next answer.

Tagging Code.in: https://code.in/

Project repository: PASTE-NEW-REPO-LINK-HERE