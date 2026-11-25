// Tiles (role, segment, pain, product), solution blocks from the PRKW tab and content pinned to tiles.
// Source: the sales sheet "Gaius Work Templates.xlsx" ("Bóle (Fireflies)" and "PRKW" tabs), translated once.
// Pinning pains and segments to content is a starting proposal: review and fix it in the Tiles tab.

export const tiles = [
  {
    "id": "role:champion",
    "category": "role",
    "label": "Champion",
    "description": "A lawyer or legal ops person on the client side who wants Gaius and has to win over the team and the decision makers.",
    "quotes": [],
    "status": "active",
    "position": 0,
    "data": {
      "pick_when": "The contact uses AI or wants to test Gaius themselves, asks how it works in daily practice, or will show it to colleagues. Often an in-house lawyer on a 2-week SaaS trial, an associate or a knowledge manager.",
      "avoid_when": "The contact signs the budget (pick Board) or only checks security and infrastructure (CTO, coming soon).",
      "writing_brief": "Write for the person who will use Gaius every day and has to win over colleagues and the board. Lead with daily legal work: which tasks get faster and how, how the team gets started, and arguments they can pass on to the decision makers. Concrete and practical, in the language of legal work."
    }
  },
  {
    "id": "role:board",
    "category": "role",
    "label": "Board",
    "description": "The person who signs the decision and the budget: board member, CEO, CFO, managing partner, director general or chancellor.",
    "quotes": [],
    "status": "active",
    "position": 1,
    "data": {
      "pick_when": "The contact talks about cost, headcount, return on AI, risk or the decision itself. Typical titles: CEO, CFO, board member, managing partner, director general, chancellor.",
      "avoid_when": "The contact will use the tool themselves and has no say on the budget (pick Champion).",
      "writing_brief": "Write for the person who signs the decision and the budget. Lead with the outcome for the organisation: time saved, risk to client data and quality kept under control, what the pilot will prove and what decision follows. Short sentences, numbers only where the call gave them, no feature detail or daily how-to."
    }
  },
  {
    "id": "role:cto",
    "category": "role",
    "label": "CTO / CIO / CISO",
    "description": "Technical sign-off: architecture, security, deployment.",
    "quotes": [],
    "status": "soon",
    "position": 10,
    "data": {
      "pick_when": "The contact is CIO, CTO, CISO or head of IT and asks about infrastructure, data flows or a security pack.",
      "avoid_when": "Coming soon: no scenario yet.",
      "writing_brief": "Write for technical sign-off: architecture, hosting, data flows, access control and how Gaius fits the existing systems. Precise and verifiable, no marketing language."
    }
  },
  {
    "id": "role:gc",
    "category": "role",
    "label": "Head of Legal / GC",
    "description": "Sponsor on the legal team side.",
    "quotes": [],
    "status": "soon",
    "position": 11,
    "data": {
      "pick_when": "The contact is head of legal or General Counsel and sponsors the purchase.",
      "avoid_when": "Coming soon: no scenario yet.",
      "writing_brief": "Write for the head of the legal team: quality and verifiability of answers, how the team adopts the tool and how it fits the way the department works."
    }
  },
  {
    "id": "role:budget",
    "category": "role",
    "label": "Budget owner",
    "description": "Return on investment and a predictable cost.",
    "quotes": [],
    "status": "soon",
    "position": 12,
    "data": {
      "pick_when": "The contact owns the budget and mainly asks about price and return.",
      "avoid_when": "Coming soon: no scenario yet.",
      "writing_brief": "Write for the budget owner: what it costs, what it replaces, how the return will be measured and how predictable the cost is."
    }
  },
  {
    "id": "role:dpo",
    "category": "role",
    "label": "DPO / compliance",
    "description": "Personal data and regulatory compliance.",
    "quotes": [],
    "status": "soon",
    "position": 13,
    "data": {
      "pick_when": "The contact is a DPO or compliance officer and asks about personal data.",
      "avoid_when": "Coming soon: no scenario yet.",
      "writing_brief": "Write for data protection and compliance: which personal data is processed, where, under which agreement, who has access and how long it is kept."
    }
  },
  {
    "id": "segment:law-firm",
    "category": "segment",
    "label": "Law firm",
    "description": "A law firm working on client documents: small (2–10 lawyers, SaaS) or mid-size and large (10+ lawyers, often Vault).",
    "quotes": [],
    "status": "active",
    "position": 0,
    "data": {
      "pick_when": "The client is a law firm of advocates or legal counsels. Signals: clients ask for security questionnaires, own archive of opinions and contracts, research in LEX or Legalis.",
      "avoid_when": "A private person with their own case, or a student or trainee without a firm. Notaries, tax advisors and mass-claims firms have their own segments (coming soon)."
    }
  },
  {
    "id": "segment:in-house",
    "category": "segment",
    "label": "In-house legal team",
    "description": "A company or group with its own legal team (3+ people), e.g. manufacturing, FMCG, distribution, energy, holdings.",
    "quotes": [],
    "status": "active",
    "position": 1,
    "data": {
      "pick_when": "The contact works in or for a corporate legal or compliance team. Signals: repetitive NDAs and contracts, board expects more work without new hires, people already paste documents into public chatbots.",
      "avoid_when": "No legal team and no budget, purchasing decided at a foreign head office, or \"we have Copilot and don’t work on confidential documents\"."
    }
  },
  {
    "id": "segment:public-sector",
    "category": "segment",
    "label": "Public administration",
    "description": "A public office, university, municipal company or court that wants to put order into how staff use AI.",
    "quotes": [],
    "status": "active",
    "position": 2,
    "data": {
      "pick_when": "The client is a public body. Signals: an internal AI regulation, a request for quotation or tender, a new chancellor or director, a digitisation project with EU funding.",
      "avoid_when": "Purchase only through a tender with criteria Gaius doesn’t meet."
    }
  },
  {
    "id": "segment:finance",
    "category": "segment",
    "label": "Banks and finance",
    "description": "Cooperative banks, insurance, leasing, fintech.",
    "quotes": [],
    "status": "soon",
    "position": 3,
    "data": {
      "pick_when": "Banks, insurers, leasing, fintech or funds supervised by the financial regulator.",
      "avoid_when": "Coming soon: no content set yet."
    }
  },
  {
    "id": "segment:tax-advisors",
    "category": "segment",
    "label": "Tax advisors",
    "description": "Tax advisory firms and tax teams.",
    "quotes": [],
    "status": "soon",
    "position": 4,
    "data": {
      "pick_when": "Tax advisory firms and tax teams.",
      "avoid_when": "Coming soon: no content set yet."
    }
  },
  {
    "id": "segment:notaries",
    "category": "segment",
    "label": "Notaries",
    "description": "Notary offices.",
    "quotes": [],
    "status": "soon",
    "position": 5,
    "data": {
      "pick_when": "Notary offices, especially with several notaries or a large volume of deeds.",
      "avoid_when": "Coming soon: no content set yet."
    }
  },
  {
    "id": "segment:mass-claims",
    "category": "segment",
    "label": "Mass claims and debt collection",
    "description": "Hundreds or thousands of similar matters, bailiffs.",
    "quotes": [],
    "status": "soon",
    "position": 6,
    "data": {
      "pick_when": "Mass claims, debt collection and bailiff offices.",
      "avoid_when": "Coming soon: no content set yet."
    }
  },
  {
    "id": "pain:confidentiality",
    "category": "pain",
    "label": "Confidentiality",
    "description": "Contracts and know-how must not leave the organisation.",
    "quotes": [
      "legal teams are increasingly aware… of their own know-how… on their own infrastructure",
      "trade secrets… so that… the model… doesn’t learn from this data",
      "Polish, local, and under our control"
    ],
    "status": "active",
    "position": 0,
    "data": {
      "pick_when": "The client says documents or know-how must stay in-house, asks whether the model learns from their data, or must show clients proof of security.",
      "avoid_when": "The client works only on public materials and has no sensitive documents.",
      "typical_segments": [
        "segment:law-firm",
        "segment:in-house",
        "segment:public-sector",
        "segment:notaries",
        "segment:mass-claims",
        "segment:finance"
      ]
    }
  },
  {
    "id": "pain:shadow-ai",
    "category": "pain",
    "label": "Shadow AI",
    "description": "People paste documents into free chatbots anyway, and the organisation has no control over it.",
    "quotes": [
      "I know they’ll upload it anyway",
      "some people use AI tools… on private phones or email accounts",
      "with access to external tools only, we can’t even regulate it"
    ],
    "status": "active",
    "position": 1,
    "data": {
      "pick_when": "Staff already use ChatGPT or other public chatbots on their own accounts and the organisation wants to regulate or legalise AI rather than ban it.",
      "avoid_when": "The organisation has no AI use yet and no plans to regulate it.",
      "typical_segments": [
        "segment:in-house",
        "segment:public-sector"
      ]
    }
  },
  {
    "id": "pain:repetitive-documents",
    "category": "pain",
    "label": "Repetitive documents",
    "description": "NDAs, data processing agreements and the same letters drafted from scratch.",
    "quotes": [
      "expectations… from the board… repetitive tasks… countless NDAs",
      "NDAs… data processing agreements… classic cases… very often",
      "not searching everything ourselves, not writing the same thing every time"
    ],
    "status": "active",
    "position": 2,
    "data": {
      "pick_when": "The team handles many similar documents: NDAs, data processing agreements, counterparty templates, the same letters again and again.",
      "avoid_when": "Work is mostly one-off, bespoke matters.",
      "typical_segments": [
        "segment:in-house",
        "segment:law-firm",
        "segment:finance"
      ]
    }
  },
  {
    "id": "pain:board-pressure",
    "category": "pain",
    "label": "Board pressure",
    "description": "More work without new hires, and the board expects a return on AI.",
    "quotes": [
      "reduce the number of lawyers rather than increase it",
      "many companies are looking for a return on their AI investment"
    ],
    "status": "active",
    "position": 3,
    "data": {
      "pick_when": "The board expects more output without new hires, wants to cut outside counsel costs or asks about the return on AI.",
      "avoid_when": "The contact has no cost or headcount pressure to talk about.",
      "typical_segments": [
        "segment:in-house"
      ]
    }
  },
  {
    "id": "pain:chatgpt-only-informs",
    "category": "pain",
    "label": "ChatGPT only informs",
    "description": "General AI gives information but does not help draft and check documents.",
    "quotes": [
      "ChatGPT… only gives information… we’d like… something that helps us create documents"
    ],
    "status": "active",
    "position": 4,
    "data": {
      "pick_when": "The client tried ChatGPT and says it only gives information but doesn’t help draft or check real documents.",
      "avoid_when": "The client has never used a general AI tool.",
      "typical_segments": [
        "segment:in-house"
      ]
    }
  },
  {
    "id": "pain:hallucinated-citations",
    "category": "pain",
    "label": "Hallucinated citations",
    "description": "General AI makes up rulings and statutes, so everything has to be checked.",
    "quotes": [
      "five suggested rulings, three didn’t exist and two weren’t about the case",
      "Statute numbers are wrong, including ones that aren’t in the act at all",
      "It keeps making things up… you never trust that tool"
    ],
    "status": "active",
    "position": 5,
    "data": {
      "pick_when": "The client found made-up rulings or wrong statute numbers in AI answers and now checks everything by hand. Talk about sources and citation checks, never promise \"zero hallucinations\".",
      "avoid_when": "The client doesn’t do research or cite case law.",
      "typical_segments": [
        "segment:law-firm",
        "segment:in-house",
        "segment:tax-advisors"
      ]
    }
  },
  {
    "id": "pain:unsearchable-archive",
    "category": "pain",
    "label": "Unsearchable archive",
    "description": "Opinions, contracts and emails sit on drives, SharePoint and Outlook, found only by file name.",
    "quotes": [
      "we search our drive, mostly by file names",
      "Windows search… is nonsense… you simply can’t find anything",
      "Outlook is a problem… the archive… it doesn’t index it anyway"
    ],
    "status": "active",
    "position": 6,
    "data": {
      "pick_when": "Opinions, contracts and emails sit on drives, SharePoint or Outlook and are found only by file name; know-how leaves with departing staff.",
      "avoid_when": "A young organisation without an archive of its own documents.",
      "typical_segments": [
        "segment:law-firm",
        "segment:in-house",
        "segment:notaries",
        "segment:finance"
      ]
    }
  },
  {
    "id": "pain:copy-to-word",
    "category": "pain",
    "label": "Copying into Word",
    "description": "Chat output has to be moved into Word and formatted by hand.",
    "quotes": [
      "it was still based on the chat and then… I have to paste it into Word… and format it",
      "formatting takes me so much time"
    ],
    "status": "active",
    "position": 7,
    "data": {
      "pick_when": "The client copies chat output into Word and formats it by hand, or wants AI inside Word.",
      "avoid_when": "The client doesn’t work in Word.",
      "typical_segments": [
        "segment:law-firm",
        "segment:notaries"
      ]
    }
  },
  {
    "id": "pain:group-scale",
    "category": "pain",
    "label": "Scale across a group",
    "description": "Many companies and legal teams, and documents must follow one standard.",
    "quotes": [
      "loaded with files in large numbers… almost 500 [companies]… we have to do it for 500 companies"
    ],
    "status": "active",
    "position": 8,
    "data": {
      "pick_when": "The client runs the same legal tasks across many companies, sites or contracts (groups, holdings, large portfolios).",
      "avoid_when": "A single small organisation with a few contracts.",
      "typical_segments": [
        "segment:in-house"
      ]
    }
  },
  {
    "id": "pain:templates-at-scale",
    "category": "pain",
    "label": "Templates at scale",
    "description": "Good templates exist, but they must be filled by hand with data from hundreds of matters.",
    "quotes": [
      "the problem is… scale… the templates are well prepared, but they need to be filled with the right data",
      "they copy the complaint, paste it… into the Gaius overlay… paste it into the letter"
    ],
    "status": "active",
    "position": 9,
    "data": {
      "pick_when": "Good templates exist but must be filled by hand with data from many matters (mass cases, bulk annexes, similar decisions).",
      "avoid_when": "Each document is drafted from scratch with no template.",
      "typical_segments": [
        "segment:mass-claims"
      ]
    }
  },
  {
    "id": "pain:weak-case-law-search",
    "category": "pain",
    "label": "Weak case-law search",
    "description": "LEX and Legalis often miss rulings or make them hard to find.",
    "quotes": [
      "LEX or Legalis often simply lack the rulings",
      "much weaker than I expected"
    ],
    "status": "active",
    "position": 10,
    "data": {
      "pick_when": "The client finds case law hard to find in LEX or Legalis or misses rulings. Position Gaius as a complement to LEX, not a replacement.",
      "avoid_when": "The client doesn’t search case law.",
      "typical_segments": [
        "segment:law-firm",
        "segment:in-house"
      ]
    }
  },
  {
    "id": "product:saas",
    "category": "product",
    "label": "SaaS",
    "description": "Gaius in the cloud (Gaius Pro): lite, standard and pro plans, 14-day trial. Good for small firms and single lawyers.",
    "quotes": [],
    "status": "active",
    "position": 0,
    "data": {
      "price": "",
      "pick_when": "A small firm or a single lawyer, no requirement for data to stay on site, quick start with a trial.",
      "avoid_when": "Documents must not leave the organisation, or the client needs company-wide access without per-user limits.",
      "writing_brief": "Gaius in the cloud: lite, standard and pro plans and a 14-day trial, hosted in the European Economic Area, with team accounts in separate workspaces. Stress a quick start without an IT project: the team tries it on real matters during the trial. Do not promise the client’s own server, local models or a per-compute-unit licence (those are Vault)."
    }
  },
  {
    "id": "product:vault",
    "category": "product",
    "label": "Vault",
    "description": "Gaius Vault: a private environment for a legal team or firm, licensed monthly per compute unit with no per-user fees.",
    "quotes": [],
    "status": "active",
    "position": 1,
    "data": {
      "price": "",
      "pick_when": "Mid-size or large firms and in-house teams that work on confidential documents and want the whole team on it.",
      "avoid_when": "A single lawyer who just wants to try the tool (pick SaaS).",
      "writing_brief": "Gaius Vault: a private environment for a legal team or firm, licensed monthly per compute unit with no per-user fees, with a pilot before the decision. Stress control over documents (never used to train models, access per team and matter), legal sources and the firm’s own documents in one environment, and a cost that does not grow with every user. Do not promise installation on the client’s own server (that is the on-prem product)."
    }
  },
  {
    "id": "product:on-prem",
    "category": "product",
    "label": "On-premise",
    "description": "Gaius Vault on the client’s own server, on local language models; outbound traffic optional through the client’s proxy.",
    "quotes": [],
    "status": "active",
    "position": 2,
    "data": {
      "price": "",
      "pick_when": "Data must stay inside the organisation: regulated clients, public bodies, IT bans on public cloud, client security questionnaires.",
      "avoid_when": "The client has no infrastructure of its own and prefers a managed service.",
      "writing_brief": "Gaius Vault on the client’s own server, on local language models; outbound traffic is optional and goes through the client’s proxy. Stress that documents never leave the organisation and that IT controls the environment: it needs one IP address in the network, integrates with the client’s directory and keeps roles per team and matter. Same licence per compute unit, with no per-user fees."
    }
  }
];

export const solutionBlocks = [
  {
    "id": "sol-sourced-answers",
    "type": "solution",
    "title": "Answers with verifiable sources",
    "body": "Gaius answers from a database of legal sources updated daily and cites the statutes and rulings it relies on.",
    "data": {
      "problem": "General AI makes up rulings and statute numbers, so every answer has to be checked from scratch.",
      "effect": "You check every citation at its source right away instead of wondering whether the ruling exists at all.",
      "value": "Less risk of a wrong citation in a court filing or client opinion, so less risk of a professional slip.",
      "order": 0,
      "source": "Sales sheet, PRKW row 1"
    },
    "tags": [
      "pain:hallucinated-citations",
      "pain:weak-case-law-search",
      "segment:law-firm",
      "segment:in-house",
      "segment:public-sector"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-nda-review",
    "type": "solution",
    "title": "NDA review against your standards",
    "body": "Gaius compares the counterparty’s contract with your standards (a skill built on your template or playbook) and flags the clauses to change.",
    "data": {
      "problem": "The legal team receives countless NDAs and data processing agreements on counterparties’ templates and reads each one from the start.",
      "effect": "The lawyer approves a list of deviations instead of reading the whole contract.",
      "value": "The team handles more contracts without a new hire, which answers the board’s pressure.",
      "order": 1,
      "source": "Sales sheet, PRKW row 2"
    },
    "tags": [
      "pain:repetitive-documents",
      "pain:board-pressure",
      "segment:in-house",
      "segment:law-firm"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-archive-search",
    "type": "solution",
    "title": "Search your archive by content",
    "body": "Gaius connects to SharePoint, OneDrive, Google Drive, Outlook and Gmail and answers from the content of your documents, without building a second database.",
    "data": {
      "problem": "Company knowledge sits in hundreds of opinions, contracts and emails, but it is searched by file name and Outlook does not index the archive.",
      "effect": "You find an earlier opinion, clause or email by its content, not by its file name.",
      "value": "The team builds on what it has already done instead of rewriting it, and knowledge doesn’t leave with departing staff.",
      "order": 2,
      "source": "Sales sheet, PRKW row 3"
    },
    "tags": [
      "pain:unsearchable-archive",
      "segment:law-firm",
      "segment:in-house",
      "segment:public-sector"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-official-ai",
    "type": "solution",
    "title": "Official, controlled AI for the team",
    "body": "Gaius as the official AI tool for the whole team: as convenient as a chatbot, but with control over where data goes (SaaS in the EEA or Gaius Vault on the company network).",
    "data": {
      "problem": "Employees paste documents into free chatbots on private accounts anyway, and the organisation has no control over it.",
      "effect": "People get a tool they want to use anyway, and IT and compliance know what happens to documents.",
      "value": "The organisation can introduce an AI policy and enforce it instead of pretending there is no problem.",
      "order": 3,
      "source": "Sales sheet, PRKW row 4"
    },
    "tags": [
      "pain:shadow-ai",
      "segment:in-house",
      "segment:public-sector",
      "segment:law-firm"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-case-file-analysis",
    "type": "solution",
    "title": "Case file analysis: deadlines, claims, risks",
    "body": "Gaius analyses the case file, lists limitation periods, claims and risks in a table with descriptions and shows which actions are urgent.",
    "data": {
      "problem": "In litigation files it is easy to miss a limitation period or a claim, and extracting them from hundreds of pages takes hours.",
      "effect": "You get an overview of the matter in one table instead of notes from the whole file.",
      "value": "Less risk of a missed deadline, and so of professional liability and losing the client.",
      "order": 4,
      "source": "Sales sheet, PRKW row 5"
    },
    "tags": [
      "pain:board-pressure",
      "segment:law-firm"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-draft-in-word",
    "type": "solution",
    "title": "Drafts straight in Word",
    "body": "Gaius works on your templates and documents and drafts letters from the case file, also directly in the Word add-in.",
    "data": {
      "problem": "ChatGPT only gives information: chat text has to be copied into Word and formatted by hand, and letters are still written from scratch.",
      "effect": "No more copying and formatting: the draft is created in the form you send it in.",
      "value": "Lawyers spend their time on substance and strategy, not office work.",
      "order": 5,
      "source": "Sales sheet, PRKW row 6"
    },
    "tags": [
      "pain:chatgpt-only-informs",
      "pain:copy-to-word",
      "pain:repetitive-documents",
      "segment:law-firm",
      "segment:in-house",
      "segment:public-sector",
      "pain:templates-at-scale"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-template-filling",
    "type": "solution",
    "title": "Filling templates with case data",
    "body": "Gaius extracts data from the case documents (complaints, orders, letters) and fills your templates with it.",
    "data": {
      "problem": "In mass matters good templates exist, but they must be filled by hand with data from hundreds of documents.",
      "effect": "An assistant approves a finished letter instead of retyping data.",
      "value": "The firm handles more matters with the same team, which in mass claims goes straight to the margin.",
      "order": 6,
      "source": "Sales sheet, PRKW row 7"
    },
    "tags": [
      "pain:templates-at-scale",
      "segment:law-firm",
      "segment:public-sector",
      "segment:mass-claims"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-unfair-terms",
    "type": "solution",
    "title": "Detecting unfair contract terms",
    "body": "Gaius finds clauses in contracts and terms of service that may be considered unfair and shows what to change.",
    "data": {
      "problem": "Consumer contract templates and terms of service may contain unfair clauses, and checking every template after each change by hand is tedious.",
      "effect": "You check a template before publishing or after each change without reading it from the start.",
      "value": "Less risk of consumer disputes, competition authority proceedings and fines for unfair clauses.",
      "order": 7,
      "source": "Sales sheet, PRKW row 8"
    },
    "tags": [
      "pain:repetitive-documents",
      "segment:in-house",
      "segment:law-firm"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-public-office-drafts",
    "type": "solution",
    "title": "Draft decisions for public officials",
    "body": "Gaius prepares a legal analysis and a draft letter on current law for the official, and Gaius Administration training teaches the team to use it.",
    "data": {
      "problem": "In a public office one lawyer serves a whole department, and officials wait for their opinion while administrative deadlines run.",
      "effect": "The lawyer reviews a ready draft instead of a blank page, and the official doesn’t wait in a queue.",
      "value": "Matters are handled faster, with less risk of missing a deadline or a complaint about inaction.",
      "order": 8,
      "source": "Sales sheet, PRKW row 9"
    },
    "tags": [
      "pain:chatgpt-only-informs",
      "pain:board-pressure",
      "segment:public-sector"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-fixed-cost",
    "type": "solution",
    "title": "A fixed cost without user limits",
    "body": "Gaius Vault: a monthly licence per compute unit, no per-user fees and no tokens, with a pilot before the decision.",
    "data": {
      "problem": "AI tools priced per user or per token bring unpredictable bills, and limits hold back usage.",
      "effect": "The whole team uses it without counting queries, and the budget is known in advance.",
      "value": "The cost per user falls with every additional person, and the purchase decision is simpler for the CFO and the board.",
      "order": 9,
      "source": "Sales sheet, PRKW row 10"
    },
    "tags": [
      "pain:board-pressure",
      "pain:group-scale",
      "segment:law-firm",
      "segment:in-house",
      "segment:public-sector",
      "product:vault",
      "product:on-prem"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-citation-check",
    "type": "solution",
    "title": "Checking citations in filings",
    "body": "Gaius verifies citations in a finished document: case numbers, statutes and whether they are still current.",
    "data": {
      "problem": "A filing by the other side, a trainee or ChatGPT may contain garbled case numbers and outdated statutes, and checking every citation takes hours.",
      "effect": "You get a list of citations to fix instead of checking each one by hand.",
      "value": "You find weak points in the other side’s filing faster, and your own filings go out without errors that undermine credibility.",
      "order": 10,
      "source": "Sales sheet, PRKW row 11"
    },
    "tags": [
      "pain:hallucinated-citations",
      "segment:law-firm",
      "segment:in-house",
      "segment:public-sector"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-ocr",
    "type": "solution",
    "title": "OCR: scans become normal documents",
    "body": "Gaius recognises text in scans (OCR) and analyses them like any other document.",
    "data": {
      "problem": "Case files, old contracts and correspondence are often scanned PDFs that cannot be searched or analysed.",
      "effect": "A scan becomes a document you can search, summarise and compare.",
      "value": "The paper archive becomes usable without retyping documents.",
      "order": 11,
      "source": "Sales sheet, PRKW row 12"
    },
    "tags": [
      "pain:unsearchable-archive",
      "segment:law-firm",
      "segment:public-sector",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-anonymisation",
    "type": "solution",
    "title": "Automatic anonymisation",
    "body": "Gaius anonymises the text automatically and shows the data it removed.",
    "data": {
      "problem": "Before publishing a decision, sharing documents with a subcontractor or using a case in training, personal data has to be removed by hand.",
      "effect": "The lawyer checks the anonymised text instead of redacting it by hand.",
      "value": "Faster document sharing and less risk of exposing data on publication.",
      "order": 12,
      "source": "Sales sheet, PRKW row 13"
    },
    "tags": [
      "pain:confidentiality",
      "segment:public-sector",
      "segment:law-firm"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-client-email",
    "type": "solution",
    "title": "Answer client emails from the inbox",
    "body": "Gaius connects to Gmail and Outlook, analyses the message with its attachments and drafts a reply with the legal basis.",
    "data": {
      "problem": "Client questions arrive by email, and answering them means copying the text and attachments into another tool.",
      "effect": "You answer the client from your inbox without moving files.",
      "value": "Faster client service with the same team, and short advice no longer takes a whole day.",
      "order": 13,
      "source": "Sales sheet, PRKW row 14"
    },
    "tags": [
      "pain:copy-to-word",
      "pain:chatgpt-only-informs",
      "segment:law-firm",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-team-skills",
    "type": "solution",
    "title": "Skills built together with the team",
    "body": "Skills built with the team in three workshops: gathering needs, working on a real example, fixes after testing.",
    "data": {
      "problem": "The team has no time to learn a new tool, and when something works differently than usual, people go back to old habits.",
      "effect": "From day one the tool does what the team does every day, to its own standard.",
      "value": "The licence actually gets used, so the AI investment pays off.",
      "order": 14,
      "source": "Sales sheet, PRKW row 15"
    },
    "tags": [
      "pain:board-pressure",
      "segment:in-house",
      "segment:law-firm",
      "segment:public-sector"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-krs-check",
    "type": "solution",
    "title": "Checking signatories in the company register",
    "body": "Gaius checks the board, shareholders and representation rules in the company register (KRS) and compares them with the contract.",
    "data": {
      "problem": "Before signing a contract you must check that the counterparty’s signatories can represent it, and comparing with the company register by hand is tedious.",
      "effect": "You know right away whether the signatures on the contract are enough.",
      "value": "Less risk of a contract signed by someone without authority and a dispute over its validity.",
      "order": 15,
      "source": "Sales sheet, PRKW row 16"
    },
    "tags": [
      "pain:repetitive-documents",
      "segment:in-house",
      "segment:law-firm"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-procurement-rulings",
    "type": "solution",
    "title": "Procurement appeal rulings with case numbers",
    "body": "Gaius finds and verifies KIO rulings in the context of a specific tender.",
    "data": {
      "problem": "The deadline for a procurement appeal (KIO) is short, and the board’s rulings have to be searched by hand.",
      "effect": "You get arguments from KIO case law with case numbers, without digging through the search engine.",
      "value": "A better prepared appeal, or reply to one, in the time that is left.",
      "order": 16,
      "source": "Sales sheet, PRKW row 17"
    },
    "tags": [
      "pain:weak-case-law-search",
      "segment:law-firm",
      "segment:public-sector"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-tax-rulings",
    "type": "solution",
    "title": "Tax rulings without made-up answers",
    "body": "Gaius finds tax rulings and case law, and checks the cited rulings in a finished opinion.",
    "data": {
      "problem": "Advisors search individual tax rulings in the official search engine, and general AI makes them up or cites outdated ones.",
      "effect": "You find rulings that fit the client’s facts faster, with a case number to check.",
      "value": "A client opinion based on the authorities’ current position, prepared in less time.",
      "order": 17,
      "source": "Sales sheet, PRKW row 18"
    },
    "tags": [
      "pain:hallucinated-citations",
      "pain:weak-case-law-search",
      "segment:tax-advisors"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-regulatory-compliance",
    "type": "solution",
    "title": "Procedures checked against KNF, DORA and AML",
    "body": "Gaius checks documents against a set of rules (e.g. regulatory requirements) and flags the clauses that don’t meet them.",
    "data": {
      "problem": "Every new KNF recommendation, DORA or AML rule means checking which internal procedures and contracts must change.",
      "effect": "You get a list of gaps instead of rereading every policy.",
      "value": "Faster regulatory alignment and less risk of findings in a regulator’s inspection.",
      "order": 18,
      "source": "Sales sheet, PRKW row 19"
    },
    "tags": [
      "pain:repetitive-documents",
      "segment:finance"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-audio",
    "type": "solution",
    "title": "Working on hearing and meeting recordings",
    "body": "Gaius accepts audio files and lets you work on their content: search, summarise, quote.",
    "data": {
      "problem": "Hearing or meeting recordings have to be listened to for hours to find one statement.",
      "effect": "You find the part of the recording you need by its content.",
      "value": "Fewer hours of listening, more time for arguments.",
      "order": 19,
      "source": "Sales sheet, PRKW row 20"
    },
    "tags": [
      "pain:unsearchable-archive",
      "segment:law-firm"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-cybersecurity-contracts",
    "type": "solution",
    "title": "Supplier contracts reviewed for cybersecurity law",
    "body": "Gaius analyses supplier contracts against the cybersecurity requirements and flags the ones that need an annex.",
    "data": {
      "problem": "New national cybersecurity rules require reviewing every supplier contract and checking which ones must change.",
      "effect": "Instead of reading every contract, you get a list of contracts to change with the missing clauses.",
      "value": "The organisation meets its supply-chain obligations on time, without paying an outside firm to review the whole portfolio.",
      "order": 20,
      "source": "Sales sheet, PRKW row 21"
    },
    "tags": [
      "pain:group-scale",
      "segment:in-house",
      "segment:public-sector"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-labour-inspection",
    "type": "solution",
    "title": "Bulk contract review for the labour inspection reform",
    "body": "Gaius analyses up to 5,000 contracts at once against the reform and drafts the annexes.",
    "data": {
      "problem": "The labour inspection reform requires reviewing up to thousands of contracts (e.g. civil-law and B2B) and drafting annexes, which would take months by hand.",
      "effect": "The whole contract portfolio reviewed in one pass, with a list of contracts to change and ready annexes.",
      "value": "Less risk of negative findings and fines after a labour inspection.",
      "order": 21,
      "source": "Sales sheet, PRKW row 22"
    },
    "tags": [
      "pain:group-scale",
      "pain:templates-at-scale",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-mercosur",
    "type": "solution",
    "title": "EU–Mercosur tariff relief",
    "body": "Gaius checks the organisation’s products for relief under the EU–Mercosur agreement.",
    "data": {
      "problem": "The company doesn’t know whether its products qualify for relief under the EU–Mercosur agreement, and analysing the agreement is laborious.",
      "effect": "You know which products can use the relief without studying an international agreement.",
      "value": "Lower duties and a price advantage over competitors who don’t use the relief.",
      "order": 22,
      "source": "Sales sheet, PRKW row 23"
    },
    "tags": [
      "pain:board-pressure",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-email-commitments",
    "type": "solution",
    "title": "Contract versus what was agreed by email",
    "body": "Gaius compares the final contract with the email thread and flags agreed points that are missing from it.",
    "data": {
      "problem": "What was agreed in negotiations is scattered across a long email thread and easy to miss in the final contract.",
      "effect": "Before signing you have a list of gaps between the contract and what was agreed.",
      "value": "Fewer disputes about what was agreed and fewer annexes after signing.",
      "order": 23,
      "source": "Sales sheet, PRKW row 24"
    },
    "tags": [
      "pain:repetitive-documents",
      "segment:in-house",
      "segment:law-firm"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-contract-register",
    "type": "solution",
    "title": "A contract register from scattered files",
    "body": "Gaius pulls contracts out of scattered documents and organises them in one searchable place.",
    "data": {
      "problem": "Contracts are scattered across drives, mailboxes and folders, and the company has no register, so it doesn’t know what binds it.",
      "effect": "You find every contract and its key terms in one place.",
      "value": "Control over the company’s obligations (deadlines, penalties, notice periods), also in an audit or due diligence.",
      "order": 24,
      "source": "Sales sheet, PRKW row 25"
    },
    "tags": [
      "pain:unsearchable-archive",
      "pain:group-scale",
      "segment:in-house",
      "segment:public-sector"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-payment-demand",
    "type": "solution",
    "title": "Analysing a payment demand",
    "body": "A Gaius agent assesses whether the claim is justified, lists arguments for and against and the litigation risks, and prepares a table of points with sources and a draft reply.",
    "data": {
      "problem": "Assessing a payment demand means establishing the legal basis, both sides’ arguments and the risks, then writing a reply, which takes many hours.",
      "effect": "You hand it over like to an outside firm and get a complete analysis to check.",
      "value": "Fewer matters sent outside and a faster decision: pay, negotiate or defend.",
      "order": 25,
      "source": "Sales sheet, PRKW row 26"
    },
    "tags": [
      "pain:chatgpt-only-informs",
      "pain:board-pressure",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-argument-strength",
    "type": "solution",
    "title": "How strong is the case law behind an argument",
    "body": "Gaius assesses the strength of the point against the case law and shows sources for and against.",
    "data": {
      "problem": "An argument in a filing rests on a point from a ruling, but it is unclear whether the line of case law still supports it.",
      "effect": "Before filing you know which arguments are strong and which are easy to challenge.",
      "value": "A better litigation strategy and less risk of losing on a weak argument.",
      "order": 26,
      "source": "Sales sheet, PRKW row 27"
    },
    "tags": [
      "pain:hallucinated-citations",
      "pain:weak-case-law-search",
      "segment:law-firm",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-private-vault",
    "type": "solution",
    "title": "Gaius Vault on your own server",
    "body": "Gaius Vault runs entirely on a server in your organisation, on local language models. The models come preinstalled, it needs one IP address in your network, and outbound traffic is optional and goes through your own proxy.",
    "data": {
      "problem": "Documents and know-how can’t go to a public cloud, and people still need an AI tool they are allowed to use.",
      "effect": "Contracts and know-how stay with you, and the team gets a sanctioned AI tool instead of private accounts.",
      "value": "Confidentiality you can show to clients, auditors and IT, without giving up AI.",
      "order": 27,
      "source": "Sales sheet, tab \"Prawny – produkcja v2\", row 4 (CIO / CISO sequence): \"Gaius Vault is an internal AI on a server in your network: the models are preinstalled and one IP address is enough…\" (translated)"
    },
    "tags": [
      "pain:confidentiality",
      "pain:shadow-ai",
      "segment:law-firm",
      "segment:in-house",
      "segment:public-sector",
      "product:on-prem"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-encrypted-files",
    "type": "solution",
    "title": "Encrypted files, keys stay with you",
    "body": "Files on \"My drive\" in Gaius are always encrypted, the user holds the keys, and the encryption is post-quantum from the start.",
    "data": {
      "problem": "Clients ask how their documents are protected, and the firm needs a clear answer.",
      "effect": "A concrete security answer for client questionnaires and the IT team.",
      "value": "Fewer lost deals and delays over security questions.",
      "order": 28,
      "source": "Sales sheet, tab \"Prawny – produkcja v2\", row 3 (in-house lawyer sequence), also tab \"cold mail\", rows 2–3: \"files on My drive are always encrypted, the user holds the keys, and the encryption is post-quantum (PQC) from the start.\" (translated)"
    },
    "tags": [
      "pain:confidentiality",
      "segment:law-firm",
      "segment:in-house",
      "segment:public-sector"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-it-brief",
    "type": "solution",
    "title": "A technical brief for your IT team",
    "body": "For Gaius Vault we provide a technical brief covering the network, outbound traffic, models and updates, so IT can review the setup before approving it.",
    "data": {
      "problem": "IT has to approve the tool and needs to know exactly how data flows, what runs where and how it is updated.",
      "effect": "IT gets the facts it needs to approve, instead of blocking by default.",
      "value": "A shorter approval path and no surprises after rollout.",
      "order": 29,
      "source": "Sales sheet, tab \"Prawny – produkcja (FS)\", row 5 (CIO / CISO sequence): \"Gaius Vault: network, outbound traffic, models, updates.\" (translated)"
    },
    "tags": [
      "pain:confidentiality",
      "segment:in-house",
      "segment:public-sector",
      "segment:law-firm",
      "product:vault",
      "product:on-prem"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-company-wide-ai",
    "type": "solution",
    "title": "One internal AI for legal, procurement, HR and sales",
    "body": "Gaius Vault is one internal AI on your server that legal, procurement, HR and sales can all use, while the data stays in your organisation.",
    "data": {
      "problem": "Legal is not the only team pasting documents into public chatbots, and each department buying its own tool multiplies cost and risk.",
      "effect": "One sanctioned tool for the whole organisation instead of many private accounts.",
      "value": "Shadow AI under control across departments and companies, at a cost that doesn’t grow per user.",
      "order": 30,
      "source": "Sales sheet, tab \"Prawny – produkcja (FS)\", row 2 (head of legal, food and FMCG sequence): \"Gaius Vault gives the whole company this alternative, legal, procurement and sales, and the data stays on the server.\" (translated)"
    },
    "tags": [
      "pain:shadow-ai",
      "pain:group-scale",
      "segment:in-house",
      "segment:public-sector",
      "product:on-prem"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "sol-word-review",
    "type": "solution",
    "title": "Contract review inside Word",
    "body": "Gaius Vault analyses the contract directly in Word and flags risky clauses; the lawyer decides what to change.",
    "data": {
      "problem": "Lawyers review contracts in Word, and switching to another tool and back slows them down.",
      "effect": "Review happens where the contract already is, without copying text between tools.",
      "value": "Faster turnaround on contracts with the lawyer still in control.",
      "order": 31,
      "source": "Sales sheet, tab \"Prawny – produkcja (FS)\", row 7 (company event sequence): \"Gaius Vault analyses them directly in Word and flags risky clauses; the lawyer decides what comes next.\" (translated)"
    },
    "tags": [
      "pain:copy-to-word",
      "pain:repetitive-documents",
      "segment:in-house",
      "segment:law-firm",
      "segment:public-sector",
      "product:vault",
      "product:on-prem"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  }
];

// block or card id -> tiles to add to its `tags`
export const tileTags = {
  "uc-urgent-letter": [
    "pain:board-pressure",
    "pain:hallucinated-citations",
    "segment:in-house",
    "segment:law-firm"
  ],
  "uc-law-change": [
    "pain:group-scale",
    "pain:repetitive-documents",
    "segment:in-house",
    "segment:public-sector"
  ],
  "uc-document-check": [
    "pain:hallucinated-citations",
    "segment:law-firm",
    "segment:in-house"
  ],
  "uc-contract-to-sign": [
    "pain:repetitive-documents",
    "segment:in-house",
    "segment:law-firm"
  ],
  "uc-recurring-topic": [
    "pain:unsearchable-archive",
    "segment:law-firm",
    "segment:in-house"
  ],
  "uc-business-question": [
    "pain:board-pressure",
    "pain:chatgpt-only-informs",
    "segment:in-house"
  ],
  "pl-private-environment": [
    "pain:confidentiality",
    "product:vault",
    "product:on-prem"
  ],
  "pl-sourced-answers": [
    "pain:hallucinated-citations"
  ],
  "pl-team-standard": [
    "pain:shadow-ai",
    "pain:repetitive-documents"
  ],
  "sg-faster-answers": [
    "pain:board-pressure"
  ],
  "sg-more-documents": [
    "pain:group-scale"
  ],
  "sg-hard-to-reuse": [
    "pain:unsearchable-archive"
  ],
  "sg-repetitive-tasks": [
    "pain:repetitive-documents"
  ],
  "cmp-data": [
    "pain:confidentiality"
  ],
  "cmp-sources": [
    "pain:weak-case-law-search"
  ],
  "cmp-verification": [
    "pain:hallucinated-citations"
  ],
  "cmp-knowledge": [
    "pain:unsearchable-archive"
  ],
  "cmp-rollout": [
    "pain:board-pressure"
  ],
  "cmp-scaling": [
    "pain:group-scale"
  ],
  "cmp-word": [
    "pain:copy-to-word"
  ],
  "pr-research-from-scratch": [
    "pain:weak-case-law-search",
    "pain:unsearchable-archive"
  ],
  "pr-repeated-analyses": [
    "pain:unsearchable-archive"
  ],
  "pr-hidden-know-how": [
    "pain:unsearchable-archive"
  ],
  "pr-repetitive-work": [
    "pain:repetitive-documents",
    "pain:board-pressure"
  ],
  "pr-ai-without-rules": [
    "pain:shadow-ai"
  ],
  "df-private-legal-ai": [
    "pain:confidentiality",
    "pain:shadow-ai",
    "product:vault",
    "product:on-prem"
  ],
  "df-one-environment": [
    "pain:weak-case-law-search",
    "pain:unsearchable-archive",
    "product:vault",
    "product:on-prem"
  ],
  "df-rollout-routine": [
    "pain:shadow-ai",
    "product:vault",
    "product:on-prem"
  ],
  "df-no-lock-in": [
    "pain:board-pressure",
    "pain:group-scale"
  ],
  "df-one-service": [
    "pain:board-pressure"
  ],
  "df-safe-start": [
    "pain:board-pressure"
  ],
  "pkg-environment": [
    "product:vault",
    "product:on-prem"
  ],
  "pkg-legal-engineering": [
    "product:vault",
    "product:on-prem"
  ],
  "pkg-technology": [
    "general"
  ],
  "st-processes": [
    "general"
  ],
  "st-real-matters": [
    "general"
  ],
  "st-routines": [
    "general"
  ],
  "st-verification": [
    "general"
  ],
  "st-adoption": [
    "general"
  ],
  "person-janusz": [
    "general"
  ],
  "why/no-lock-in": [
    "pain:board-pressure",
    "pain:group-scale",
    "role:board"
  ],
  "why/no-lock-in-highlight": [
    "pain:board-pressure",
    "pain:group-scale",
    "role:board"
  ],
  "why/safe-start": [
    "pain:board-pressure",
    "role:board"
  ],
  "why/safe-start-highlight": [
    "pain:board-pressure",
    "role:board"
  ],
  "why/one-service": [
    "pain:board-pressure",
    "role:board"
  ],
  "why/one-service-highlight": [
    "pain:board-pressure",
    "role:board"
  ],
  "why/one-environment": [
    "pain:weak-case-law-search",
    "pain:unsearchable-archive",
    "role:champion"
  ],
  "why/one-environment-highlight": [
    "pain:weak-case-law-search",
    "pain:unsearchable-archive",
    "role:champion"
  ],
  "why/organization-know-how": [
    "pain:unsearchable-archive",
    "pain:repetitive-documents",
    "role:champion"
  ],
  "why/organization-know-how-highlight": [
    "pain:unsearchable-archive",
    "pain:repetitive-documents",
    "role:champion"
  ],
  "why/sourced-answers": [
    "pain:hallucinated-citations",
    "role:champion"
  ],
  "why/sourced-answers-highlight": [
    "pain:hallucinated-citations",
    "role:champion"
  ],
  "why/on-premise": [
    "pain:confidentiality",
    "product:on-prem",
    "product:vault"
  ],
  "why/on-premise-highlight": [
    "pain:confidentiality",
    "product:on-prem",
    "product:vault"
  ],
  "why/private-legal-ai": [
    "pain:confidentiality",
    "pain:shadow-ai"
  ],
  "why/private-legal-ai-highlight": [
    "pain:confidentiality",
    "pain:shadow-ai"
  ],
  "why/rollout-routine": [
    "pain:shadow-ai",
    "role:champion"
  ],
  "why/rollout-routine-highlight": [
    "pain:shadow-ai",
    "role:champion"
  ],
  "why/pilot-3-months": [
    "pain:board-pressure",
    "role:board"
  ]
};

// Content revision. A database seeded with an older revision is updated on startup (src/db.js ensureTiles):
// new solutions are added, solution pins follow this file, missing guidance is filled in, and a tile
// description is replaced only if it still has the previous revision's text (edits made by hand stay).
export const tileUpgrade = { rev: 9, previousDescriptions: {
  "role:champion": "The enthusiast on the team who brings Gaius in and has to win over colleagues.",
  "role:board": "The board, managing partner or director who signs off the decision and the budget.",
  "role:cto": "Technical sign-off: architecture, security, deployment.",
  "role:gc": "Sponsor on the legal team side.",
  "role:budget": "Return on investment and a predictable cost.",
  "role:dpo": "Personal data and regulatory compliance.",
  "segment:law-firm": "A law firm, from small to large.",
  "segment:in-house": "A legal team inside a company or a group.",
  "segment:public-sector": "Public offices, universities, municipal companies, courts.",
  "segment:finance": "Cooperative banks, insurance, leasing, fintech.",
  "segment:tax-advisors": "Tax advisory firms and tax teams.",
  "segment:notaries": "Notary offices.",
  "segment:mass-claims": "Hundreds or thousands of similar matters, bailiffs.",
  "pain:confidentiality": "Contracts and know-how must not leave the organisation.",
  "pain:shadow-ai": "People paste documents into free chatbots anyway, and the organisation has no control over it.",
  "pain:repetitive-documents": "NDAs, data processing agreements and the same letters drafted from scratch.",
  "pain:board-pressure": "More work without new hires, and the board expects a return on AI.",
  "pain:chatgpt-only-informs": "General AI gives information but does not help draft and check documents.",
  "pain:hallucinated-citations": "General AI makes up rulings and statutes, so everything has to be checked.",
  "pain:unsearchable-archive": "Opinions, contracts and emails sit on drives, SharePoint and Outlook, found only by file name.",
  "pain:copy-to-word": "Chat output has to be moved into Word and formatted by hand.",
  "pain:group-scale": "Many companies and legal teams, and documents must follow one standard.",
  "pain:templates-at-scale": "Good templates exist, but they must be filled by hand with data from hundreds of matters.",
  "pain:weak-case-law-search": "LEX and Legalis often miss rulings or make them hard to find.",
  "product:saas": "Gaius in the cloud: lite, standard and pro plans.",
  "product:vault": "A private Gaius Vault environment for a legal team or law firm.",
  "product:on-prem": "Vault on the client’s own infrastructure, no public cloud."
} };
