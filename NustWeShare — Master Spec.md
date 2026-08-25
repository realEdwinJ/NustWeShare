# NustWeShare — Master Product & Engineering Specification

You are the lead software architect, senior full-stack engineer, UI/UX designer, database architect, security engineer, and DevOps engineer for this project.

Your job is to design and build a production-ready web application called:

# NustWeShare

Tagline:
"Past papers. Shared by students."

NustWeShare is a free, community-powered archive for Namibia University of Science and Technology (NUST) past academic papers.

The initial launch scope is ONLY:

- Faculty of Engineering and the Built Environment (FEBE)
- Faculty of Computing and Informatics (FCI)

The platform must be designed so additional faculties can be added later without restructuring the application.

The goal is to build this properly once, deploy it, open-source it on GitHub, and minimize the amount of ongoing manual administration required from the original creator.

This is NOT a commercial SaaS product.
This is NOT an official NUST website.
This is NOT a lecturer-notes platform.
This is NOT a generic document-sharing website.

It is a free student community archive focused specifically on NUST past papers.

==================================================
1. CORE PRODUCT PHILOSOPHY
==================================================

The product should follow these principles:

1. Extremely easy for students to use.
2. Extremely organized internally.
3. Minimal friction when contributing.
4. No unnecessary AI APIs.
5. No traditional account/password infrastructure.
6. No email verification.
7. No OTP.
8. No mandatory registration.
9. No unnecessary administrative workload.
10. Community-driven.
11. Open-source friendly.
12. Designed to run mostly automatically.
13. Mobile-first because many students will access it from phones.
14. Fast even on relatively poor internet connections.
15. Clean, modern, professional UI.
16. Never make the product feel like a complicated university portal.
17. Do not over-engineer features that do not directly improve the archive.

The intended user experience should feel closer to:

Google search + a clean academic archive + a simple document viewer

rather than:

a university LMS or complicated SaaS dashboard.

==================================================
2. CONTENT SCOPE
==================================================

NustWeShare is ONLY for academic past-paper material.

Allowed assessment/content types:

- Test
- Exam
- Supplementary
- Quiz
- Assignment
- Lab
- Tutorial

Do NOT create categories for:

- Lecture notes
- Textbooks
- Slides
- Study guides
- Formula sheets
- Lecturer notes
- General documents
- Random resources
- Entertainment
- Non-academic files

Keep the scope strict.

==================================================
3. ASSESSMENT NUMBERING
==================================================

A module may have multiple tests, quizzes, assignments, labs, or tutorials.

Therefore assessment type and assessment number MUST be stored separately.

Examples:

TEST + 1
TEST + 2
TEST + 3

QUIZ + 1
QUIZ + 2

ASSIGNMENT + 1
ASSIGNMENT + 2

LAB + 1
LAB + 2

TUTORIAL + 1
TUTORIAL + 2

EXAM does NOT require a number.

SUPPLEMENTARY does NOT require a number.

Internally:

assessment_type = TEST
assessment_number = 1

NOT:

assessment_type = "Test 1"

This makes filtering and database consistency much easier.

The UI may display:

"Test 1"

while the database stores:

type = TEST
number = 1

==================================================
4. PAPER IDENTITY
==================================================

A paper's academic identity is determined primarily by:

- Module
- Academic year
- Semester
- Assessment type
- Assessment number where applicable

Example:

ELC511S
2025
Semester 2
TEST
1

represents:

ELC511S — 2025 — Semester 2 — Test 1

Another:

ELC511S
2025
Semester 2
EXAM
NULL

represents:

ELC511S — 2025 — Semester 2 — Exam

Do NOT create artificial "versions" of exams.

NUST does not need a Version A / Version B system for this application.

If multiple digital files represent the exact same academic paper, they should be treated as multiple file representations of ONE paper rather than separate papers.

==================================================
5. SEMESTER
==================================================

Keep semester as a stored field even when the semester can be inferred from a module.

Do NOT permanently encode assumptions such as:

"ELC is always Semester 2."

Curricula can change.

Use:

semester = 1
semester = 2

or another appropriate future-proof representation.

The UI should make semester easy to select.

==================================================
6. ACADEMIC HIERARCHY
==================================================

Build the academic database hierarchically:

Faculty
↓
School
↓
Department
↓
Programme
↓
Curriculum Version
↓
Module

Do not hard-code academic information into frontend components.

Academic entities must live in the database and be selectable from controlled lists.

The initial data should cover FEBE and FCI.

Use official NUST academic information as the source when creating the initial academic dataset.

IMPORTANT:

NUST has old/revised/phasing-out/phased-in curricula.

The database must therefore support curriculum versions.

Do NOT assume that a programme name/code always represents one immutable curriculum.

==================================================
7. MODULE MODEL
==================================================

Modules must be first-class database entities.

Example:

Module:
ELC511S
Electronic Devices

Do NOT create duplicate module records simply because multiple programmes use the same module.

A module can belong to multiple programmes through a relationship table.

Recommended conceptual model:

modules
- id
- code
- name
- description (optional)
- department_id
- active

programme_modules
- programme_id
- module_id
- curriculum_id
- year_level
- semester

This allows the same module to appear in multiple programmes.

Example:

MATH511S may be used by multiple engineering programmes.

There should be ONE canonical MATH511S module entity.

==================================================
8. PROGRAMMES
==================================================

Programmes must support:

- Undergraduate
- Honours
- Postgraduate
- Masters
- Doctorate
- Other legitimate NUST programme levels where applicable

Do NOT assume every programme has:

Year 1
Year 2
Year 3
Year 4

Postgraduate programmes may have different structures.

Therefore year_level should be flexible/nullable where appropriate.

Support curriculum versions.

Example:

Programme:
Bachelor of X

Curriculum:
2024 Curriculum
2026 Revised Curriculum

The same module may be associated with different curriculum versions.

==================================================
9. UPLOAD PHILOSOPHY
==================================================

Uploading must be extremely easy.

A user must NOT need to create an account to upload.

A user must NOT need:

- Email
- Phone number
- OTP
- Password
- Account verification

The user must be able to upload as a "ghost uploader."

==================================================
10. MODULE MUST BE SELECTED BEFORE UPLOAD
==================================================

This is mandatory.

The uploader MUST select a module before they can begin uploading files.

Example:

Upload Papers

Module *
[ Search modules... ]

ELC511S — Electronic Devices ✓

[ Select Files ]

The upload button must not be usable until a valid module is selected.

Why?

Every uploaded paper must have at least one reliable academic anchor.

Do NOT allow files to enter the normal upload pipeline with no module.

==================================================
11. MULTIPLE FILE UPLOAD
==================================================

Users must be able to upload multiple PDFs at once.

Example:

Module:
ELC511S — Electronic Devices

Files:

paper1.pdf
paper2.pdf
paper3.pdf
paper4.pdf

The system should process each file independently.

Each file must receive its own metadata/details.

Do not force the user to fill one huge form before uploading.

==================================================
12. PER-FILE METADATA
==================================================

After selecting multiple files, display each file as an individual card.

Example:

ELC 2025 test.pdf

Type:
[ Test ▼ ]

Number:
[ 1 ▼ ]

Year:
[ 2025 ▼ ]

Semester:
[ Semester 2 ▼ ]

The user should be able to provide details separately for every file.

One uploaded file may be:

Test 1, 2025

while another is:

Test 2, 2025

and another:

Exam, 2024.

Do not assume all selected files share the same metadata.

==================================================
13. OPTIONAL METADATA
==================================================

Module is mandatory.

Other details should be strongly encouraged but not mandatory.

Users must be able to skip additional metadata.

For example:

[ Add details ]
[ Skip ]

When skipping, show friendly messaging such as:

"Help keep NustWeShare organized ❤️"

"Adding the year and paper type makes this paper much easier for other students to find."

Do NOT punish users for skipping.

The goal is community contribution, not bureaucratic uploading.

==================================================
14. FILENAME ANALYSIS
==================================================

When a file is selected, analyze its filename.

Examples:

ELC511S_2025_EXAM.pdf
ELC_2024_TEST_1.pdf
Electronic_Devices_2023_Supplementary.pdf

Use deterministic parsing rules where possible.

The system may suggest:

Year: 2025
Type: Exam
Module: ELC511S

BUT:

Filename parsing must NEVER be treated as authoritative.

The user can correct any suggestion.

Do NOT use an AI API for this.

Use normal pattern matching/regular expressions/deterministic logic.

==================================================
15. PDF VALIDATION
==================================================

Before accepting a file:

- Confirm it is a valid PDF.
- Confirm MIME type.
- Confirm file is not corrupted.
- Enforce maximum size of 3 MB per file.
- Reject unsupported formats.
- Prevent malicious file uploads as far as reasonably possible.
- Do not trust client-side validation alone.
- Perform all important validation server-side.

Maximum:

3 MB PER FILE.

Do not assume that because the browser says it is a PDF that it actually is.

==================================================
16. FILE STORAGE
==================================================

Use Cloudflare R2 for PDF storage.

DO NOT store PDF binaries inside PostgreSQL.

PostgreSQL stores metadata.

R2 stores the actual files.

Conceptually:

PostgreSQL:

paper_id
module_id
year
semester
assessment_type
assessment_number
file_hash
r2_object_key
etc.

R2:

actual PDF

Use private/object-level access where appropriate and generate controlled access/download URLs as necessary.

==================================================
17. DATABASE
==================================================

A database IS required.

The project does NOT need a complicated user authentication database.

The database is primarily for:

- Faculties
- Schools
- Departments
- Programmes
- Curriculum versions
- Modules
- Programme-module relationships
- Papers
- Files
- Optional profiles
- Reports
- Contribution statistics
- Metadata
- Duplicate detection

Recommended database:

PostgreSQL.

Keep the schema normalized and clean.

Use foreign keys.

Use appropriate indexes.

Use constraints wherever possible.

==================================================
18. OPTIONAL USER PROFILES
==================================================

Profiles are OPTIONAL.

Users must be able to use NustWeShare without ever creating a profile.

There are therefore two contributor modes:

1. Ghost uploader
2. Optional profile user

Ghost uploader:

- No account
- No identity
- No profile
- Can upload

Profile user:

- Username
- Display name/name
- 5-digit PIN
- Optional social media usernames
- Optional leaderboard visibility

==================================================
19. AUTHENTICATION
==================================================

DO NOT implement traditional:

- email/password
- email verification
- phone verification
- OTP
- password reset
- magic links

The profile system should use:

Username
+
5-digit PIN

The PIN is NOT a normal password.

However, treat it securely:

- Hash the PIN.
- Never store plaintext PINs.
- Rate-limit authentication attempts.
- Add progressive delays/temporary lockouts.
- Prevent unlimited brute force attempts.

Example:

5 failed attempts → temporary lockout.

The exact lockout policy should be simple and robust.

Do not overbuild authentication.

==================================================
20. USERNAME
==================================================

Username must be unique.

Case-insensitive uniqueness.

For example:

Adonnis
adonnis
ADONNIS

must be treated as the same username.

Store a normalized username for uniqueness/search.

==================================================
21. SOCIAL MEDIA
==================================================

Users may optionally add social media usernames.

Examples:

Instagram
TikTok
X

They can choose whether each is publicly displayed.

Example:

Instagram:
@username
Display publicly: YES

TikTok:
@username
Display publicly: NO

Social media information must never be mandatory.

Users may remain completely anonymous.

==================================================
22. LEADERBOARD
==================================================

Create a community contributor leaderboard.

Possible information:

Rank
Username/display name
Number of approved papers contributed

Example:

1. @student123 — 142 papers
2. @engineeringking — 119 papers
3. Anonymous — 97 papers

Users who do not want recognition can remain anonymous.

Do NOT force real names.

Do not expose private profile information.

==================================================
23. USER DASHBOARD
==================================================

Optional profile users should have a simple dashboard.

Example:

MY DASHBOARD

Papers contributed: 47
Approved: 42
Pending: 3
Rejected: 2

Leaderboard rank: #12

Recent contributions:

ELC511S — 2025 — Test 1
CSC511S — 2024 — Exam
MTH511S — 2023 — Test 2

Keep the dashboard simple.

Do not turn this into a social network.

==================================================
24. GHOST UPLOADERS
==================================================

Ghost uploads must remain possible.

The uploader does not need a profile.

The paper may display:

"Anonymous contributor"

or simply not display contributor information.

Never force registration.

==================================================
25. DUPLICATE DETECTION
==================================================

This is one of the most important technical requirements.

Do NOT rely solely on SHA-256.

Reason:

Two files can represent the same physical paper while being different digital files.

Examples:

- Same paper scanned by two different phones.
- Same paper scanned using different scanner software.
- Same paper exported at different resolutions.
- Same paper rotated/recompressed.
- Original PDF vs scanned PDF.

SHA-256 will treat these as different files.

Therefore implement multiple levels of duplicate detection.

==================================================
26. DUPLICATE LEVEL 1 — SHA-256
==================================================

Calculate SHA-256 for every uploaded file.

If SHA-256 already exists:

The file is an exact binary duplicate.

Reject or prevent duplicate storage.

Example:

File A:
SHA256 = ABC123

File B:
SHA256 = ABC123

These are exactly the same file.

Do not store another copy.

==================================================
27. DUPLICATE LEVEL 2 — FILE METADATA
==================================================

Consider:

- Original filename
- File size
- Page count
- PDF metadata
- Creation metadata if available

BUT:

These are signals, not proof.

Filename alone is NEVER sufficient to declare a duplicate.

==================================================
28. DUPLICATE LEVEL 3 — TEXT FINGERPRINT
==================================================

If the PDF contains extractable text:

1. Extract text.
2. Normalize it.
3. Remove irrelevant formatting differences.
4. Normalize whitespace.
5. Normalize capitalization.
6. Remove obvious page-number/header noise where practical.
7. Create a deterministic content fingerprint.

Use this to identify different PDF files containing essentially the same paper.

Do NOT use an LLM.

No AI API.

==================================================
29. DUPLICATE LEVEL 4 — SCANNED DOCUMENTS
==================================================

Scanned PDFs may contain no text layer.

For these:

- Render pages to images where practical.
- Use perceptual hashing or another deterministic image similarity technique.
- Compare page-level similarity.
- Calculate an overall similarity score.

Potentially identify:

"These two PDFs appear to contain the same paper."

Do NOT automatically delete based only on similarity.

Flag it.

==================================================
30. DUPLICATE HANDLING
==================================================

Distinguish:

PAPER IDENTITY

from:

FILE IDENTITY.

One academic paper may have multiple uploaded digital representations.

Example:

Paper:

ELC511S
2024
Semester 2
Exam

Files:

scan1.pdf
scan2.pdf
original.pdf

These may all represent the same academic paper.

The system should be able to associate multiple files with one paper.

One file should become the canonical/public file.

==================================================
31. CANONICAL FILE
==================================================

When multiple files represent the same paper, select one as the canonical/public copy.

Prefer the highest-quality useful copy.

Potential considerations:

- readable
- complete
- correctly oriented
- clear
- not corrupted
- good resolution
- text layer when useful
- reasonable file size

Do not expose unnecessary duplicate copies to normal users.

Keep the architecture capable of storing alternate copies internally if necessary.

==================================================
32. POTENTIAL DUPLICATE UI
==================================================

If the system detects a likely duplicate, DO NOT silently delete the new upload.

Show:

"Possible duplicate detected."

"An existing paper appears to contain the same assessment."

Show:

Existing:
ELC511S — 2024 — Exam

Options:

[ Use existing paper ]
[ Upload anyway ]

If uncertain, allow the upload to proceed to the appropriate state.

Do not make the duplicate detector overly aggressive.

False positives are worse than storing a second copy.

==================================================
33. REPORTING SYSTEM
==================================================

The platform is community moderated.

Users can report a paper.

Reports are anonymous publicly.

Report categories:

- Duplicate
- Wrong module
- Wrong year
- Wrong assessment type
- Corrupted/unreadable
- Not a past paper
- Other

Keep the reporting UI extremely simple.

==================================================
34. AUTOMATIC FIVE-REPORT DELETION
==================================================

IMPORTANT:

The project owner does NOT want a manual moderation workload.

Therefore:

If a document receives 5 reports:

AUTOMATICALLY DELETE THE DOCUMENT.

Do not require admin approval.

Do not introduce an elaborate moderation workflow.

This is a deliberate product philosophy.

The project is community-owned in spirit.

If the community abuses the system or destroys a paper through malicious reporting, that is an accepted trade-off.

However:

Do NOT allow one person to generate all five reports.

A single reporter should only be able to report the same paper once.

Use appropriate anti-spam/rate-limiting mechanisms.

Reporters remain anonymous.

==================================================
35. DELETION IMPLEMENTATION
==================================================

When a paper reaches five reports:

1. Mark the paper as deleted/deactivated.
2. Remove the public file from active availability.
3. Delete the R2 object where appropriate.
4. Keep minimal metadata/history if useful for system integrity/statistics.

Do not necessarily hard-delete every database record immediately.

A soft-delete state such as:

deleted_at
deletion_reason = "5_reports"

is acceptable and preferable for database integrity.

The public user should see nothing beyond the fact that the paper is no longer available.

==================================================
36. REPORT PRIVACY
==================================================

Never expose:

- reporter identity
- reporter username
- reporter profile
- reporter social accounts

to the uploader or public users.

Reports are anonymous.

Internally, store enough information to prevent abuse and duplicate reporting.

==================================================
37. SEARCH
==================================================

Search is one of the core features.

Users should be able to search:

- Module code
- Module name
- Programme
- Paper type
- Year

Example:

"ELC511S"

should immediately return:

Electronic Devices

and its available papers.

Search should support partial matches where useful.

Examples:

ELC
Electronic
511S

Search should be fast.

Use PostgreSQL indexes and appropriate search mechanisms before introducing an external search engine.

Do NOT add Elasticsearch/Algolia/etc. unless the project actually requires it.

==================================================
38. BROWSING
==================================================

Users should be able to browse:

Faculty
↓
School
↓
Department
↓
Programme
↓
Year/Level
↓
Module
↓
Papers

Also provide direct module search.

Do not force users to navigate the hierarchy every time.

Search should be the fastest route.

==================================================
39. PAPER PAGE
==================================================

Each paper page should show:

Module code
Module name
Assessment type
Assessment number if applicable
Academic year
Semester

Example:

ELC511S
Electronic Devices

2025
Semester 2
Test 1

Buttons:

[ View Paper ]
[ Download ]

Also:

[ Report ]

Optional:

Views
Downloads

Do not clutter the page.

==================================================
40. PDF VIEWER
==================================================

Provide an in-browser PDF viewer.

Users should be able to read papers without downloading them first.

Use PDF.js or another appropriate open-source viewer.

The PDF itself should be served from R2/CDN infrastructure rather than passing large files through application logic unnecessarily.

==================================================
41. DOWNLOADS
==================================================

Users should be able to download papers.

Do not require an account to download.

This is a free community archive.

==================================================
42. ANALYTICS
==================================================

Track basic useful statistics:

- Paper views
- Downloads
- Uploads
- Approved/active papers
- Reports

Do not build invasive user tracking.

Avoid unnecessary personal data collection.

For views/downloads, avoid counting obvious repeated refreshes as hundreds of unique views.

Accuracy does not need to be perfect.

Useful approximate statistics are sufficient.

==================================================
43. UI/UX
==================================================

The design must be:

- Modern
- Clean
- Minimal
- Fast
- Mobile-first
- Responsive
- Accessible
- Academic without looking boring
- Community-oriented
- Professional

Do NOT make it look like:

- a government portal
- an old university LMS
- a generic SaaS dashboard
- a template-heavy startup landing page

The main action should always be obvious:

SEARCH PAPERS.

==================================================
44. HOMEPAGE
==================================================

Suggested structure:

Hero:

NustWeShare

"Past papers. Shared by students."

Search bar:

Search module code or name

[ ELC511S / Electronic Devices ]

Then:

FEBE
Faculty of Engineering and Built Environment

FCI
Faculty of Computing and Informatics

Then:

Recently Added Papers

Popular Modules

Top Contributors

Upload Papers

Keep the homepage useful rather than filled with marketing content.

==================================================
45. MOBILE FIRST
==================================================

The site must work extremely well on phones.

Many students will access it using mobile data.

Optimize:

- JavaScript bundle
- images
- PDF loading
- network requests
- page weight
- caching
- API responses

Avoid unnecessary animations.

Do not sacrifice usability for flashy design.

==================================================
46. PERFORMANCE
==================================================

Performance is a first-class requirement.

The architecture should ensure:

Static assets:
CDN/cache

PDFs:
R2/CDN

Database:
only metadata

Application:
only dynamic operations

Do not stream large PDFs through server functions unnecessarily.

Cache public academic metadata where appropriate.

Use pagination for large result sets.

Never load thousands of papers into one page.

==================================================
47. HOSTING
==================================================

Preferred hosting:

Cloudflare Workers + Next.js/OpenNext.

Do not use the older Pages architecture if Workers is the better current deployment path.

Cloudflare is preferred because the project already uses:

- Cloudflare R2
- Cloudflare CDN
- Cloudflare security
- Workers

However, keep the application portable enough that another contributor could deploy it elsewhere.

Do not tightly couple every component to Cloudflare unnecessarily.

==================================================
48. STORAGE
==================================================

Use Cloudflare R2 for PDFs.

The application must not depend on local filesystem storage.

R2 object keys should be deterministic and organized.

For example:

/papers/{faculty}/{module}/{year}/{paper-id}.pdf

However, DO NOT make the storage path the source of truth.

The database is the source of truth.

==================================================
49. FREE-FIRST INFRASTRUCTURE
==================================================

The project should prioritize free/open-source services.

Initial target:

Hosting: $0/month
Database: free tier
R2: free tier where possible
GitHub: free
SSL: free
CDN: free tier

Do not introduce paid services unless there is a strong technical reason.

Do not design the architecture around expensive proprietary APIs.

==================================================
50. NO AI APIS
==================================================

DO NOT use:

OpenAI API
Claude API
Gemini API
DeepSeek API
or any other AI API

for:

- categorization
- duplicate detection
- filename parsing
- search
- paper processing

Everything should be deterministic.

Use:

- regex
- hashing
- text extraction
- PDF parsing
- image/perceptual hashing
- database relationships
- normal algorithms

AI may be used externally by developers while coding the project, but the deployed NustWeShare application itself should not depend on AI APIs.

==================================================
51. SECURITY
==================================================

Even though this is a community project, implement sane security.

Important:

- Server-side validation
- MIME validation
- File signature validation
- Maximum file size
- Rate limiting
- Upload abuse protection
- SQL injection protection
- XSS protection
- CSRF protection where relevant
- Secure cookies if cookies are used
- Hash PINs securely
- Never expose secrets client-side
- Environment variables for secrets
- Do not trust user-supplied metadata
- Sanitize filenames
- Generate safe R2 object keys
- Do not execute uploaded files
- Treat every uploaded PDF as untrusted input

Keep security practical rather than building an enterprise IAM system.

==================================================
52. UPLOAD ABUSE
==================================================

Because uploads are public:

Implement:

- rate limits
- per-IP upload limits
- reasonable request limits
- file size limits
- concurrency limits
- server-side validation

Do not allow a malicious user to upload thousands of files continuously.

Do not require registration merely to prevent abuse.

Use rate limiting instead.

==================================================
53. OPEN SOURCE
==================================================

The entire project should be designed to live on GitHub.

Create:

README.md

CONTRIBUTING.md

LICENSE

SECURITY.md

.env.example

docs/

Document:

- Local setup
- Database setup
- R2 setup
- Environment variables
- Deployment
- Academic data import
- Adding faculties
- Adding programmes
- Adding modules
- Running duplicate detection
- Running migrations
- Contributing code
- Community guidelines

Make it possible for another NUST student to fork the repository and understand the project.

==================================================
54. OWNERLESS / LOW-MAINTENANCE PHILOSOPHY
==================================================

The original developer does NOT want to spend significant time manually maintaining the website.

Design automation wherever practical.

Automatic:

- deployment
- validation
- duplicate checks
- metadata processing
- report counting
- deletion after 5 reports
- leaderboard statistics
- file storage
- basic analytics

Avoid workflows that require the owner to manually approve everyday uploads.

The platform should continue operating even if the original creator disappears for months.

==================================================
55. GITHUB CONTRIBUTION MODEL
==================================================

The repository should allow other developers/students to contribute.

Encourage contributions for:

- bug fixes
- UI improvements
- new faculties
- updated academic data
- performance improvements
- security improvements
- new modules
- documentation

The README should clearly explain how to contribute.

==================================================
56. LEGAL / OFFICIAL STATUS
==================================================

The website must clearly state that:

"NustWeShare is an independent student/community project and is not affiliated with, operated by, or officially endorsed by NUST unless explicit permission is obtained."

Do not imply official NUST ownership.

Do not use NUST branding in a way that falsely implies official affiliation.

The project should include an appropriate copyright/legal notice.

Because academic papers may have copyright implications, the application should provide a mechanism for rights holders to report/remove material if legally required.

Do not provide legal advice; simply implement a reasonable takedown/contact mechanism and document that the project is community-maintained.

==================================================
57. NO UNNECESSARY FEATURES
==================================================

Do NOT add:

- Chat
- Messaging
- Social feed
- Comments
- Likes
- Lecturer profiles
- Course notes
- AI tutor
- AI summaries
- Forums
- Complex notifications
- Paid subscriptions
- Ads initially
- Cryptocurrency
- Gamification overload

The product is a focused archive.

==================================================
58. DATABASE DESIGN REQUIREMENTS
==================================================

Create a clean relational schema.

At minimum consider:

faculties
schools
departments
programmes
curricula
modules
programme_modules

papers
paper_files

users
social_links

reports

contribution_stats

Use:

- UUIDs or secure IDs
- timestamps
- foreign keys
- indexes
- uniqueness constraints
- soft deletion where useful

Potential important uniqueness:

A paper identity should be constrained around:

module
academic_year
semester
assessment_type
assessment_number

BUT account for the fact that multiple files can represent the same paper.

Do not accidentally create multiple academic-paper records for different scans of the same paper.

==================================================
59. PAPER VS FILE DATA MODEL
==================================================

This distinction is mandatory.

PAPER:

- academic identity
- module
- year
- semester
- type
- number
- status

FILE:

- paper_id
- R2 key
- filename
- SHA-256
- file size
- page count
- text fingerprint
- perceptual fingerprint
- upload timestamp
- uploader
- canonical flag

This architecture solves the "same paper, different scan" problem.

==================================================
60. DATA INTEGRITY
==================================================

Never trust frontend values.

Every important relationship must be validated server-side.

Example:

A user cannot submit:

module_id = ELC511S

while somehow changing the module name to:

"Computer Science"

The server should resolve module information from the database.

The client sends IDs.

The server determines canonical names.

==================================================
61. API DESIGN
==================================================

Create clean APIs/endpoints for:

Search
Browse faculties
Browse programmes
Browse modules
Get paper
Upload paper
Upload multiple papers
Report paper
Create profile
Login with username + PIN
Get dashboard
Get leaderboard
Get contributor statistics

Use proper HTTP methods.

Validate every request.

Return consistent error formats.

==================================================
62. ERROR HANDLING
==================================================

Errors must be understandable to normal students.

Bad:

"Foreign key constraint violation."

Good:

"We couldn't find that module. Please select a valid NUST module."

Bad:

"413 Payload Too Large."

Good:

"This PDF is larger than the 3 MB limit."

Never expose stack traces to users.

==================================================
63. ADMIN / MAINTENANCE
==================================================

Do not create a giant admin dashboard.

The owner should have only the minimum tools necessary if eventually needed.

Possible lightweight tools:

- View system statistics
- View reported papers
- Restore a deleted paper if absolutely necessary
- Manage academic data
- View upload failures

But the normal workflow should not depend on admin intervention.

==================================================
64. ACADEMIC DATA INITIALIZATION
==================================================

Before building the upload system, establish the master academic dataset for:

FEBE
FCI

Research the current NUST academic structure and populate:

Faculty
School
Department
Programme
Programme code
Qualification level
Curriculum version
Module code
Module name
Year level where applicable
Semester where applicable

Do not invent academic data.

Use official NUST documentation as the authoritative source.

Where curricula are changing, preserve historical curriculum relationships.

==================================================
65. FUTURE FACULTIES
==================================================

The database must allow adding:

Faculty of Health, Natural Resources and Applied Sciences
Faculty of Commerce, Human Sciences, Education and Law
etc.

without changing the core code.

A new faculty should primarily require adding database records.

Do not hard-code:

if faculty == FEBE
if faculty == FCI

throughout the application.

==================================================
66. DESIGN SYSTEM
==================================================

Create a consistent design system.

Use:

- modern typography
- clear hierarchy
- accessible contrast
- subtle borders
- rounded cards where appropriate
- restrained animation
- responsive layouts
- clear buttons
- excellent search experience

Avoid excessive gradients and unnecessary visual effects.

The site should feel trustworthy.

==================================================
67. BRAND
==================================================

Brand:

NustWeShare

Primary concept:

NUST + We + Share

Tagline:

"Past papers. Shared by students."

The brand should communicate:

- student community
- sharing
- academic usefulness
- trust
- simplicity

Do not make it look like an official NUST government-style portal.

==================================================
68. HOMEPAGE INFORMATION ARCHITECTURE
==================================================

Recommended order:

1. Header/navigation
2. NustWeShare branding
3. Main search
4. Browse by faculty
5. Popular/recent modules
6. Recently added papers
7. Contributor leaderboard
8. Upload CTA
9. Footer/legal information

Search should dominate the page.

==================================================
69. NAVIGATION
==================================================

Main navigation:

Home
Browse
Upload
Leaderboard

Optional:

Profile

Do not clutter navigation.

==================================================
70. BROWSE PAGE
==================================================

Allow:

Faculty
→ School
→ Department
→ Programme
→ Module

Then:

Module page

Example:

ELC511S
Electronic Devices

Available papers:

2026
- Test 1
- Test 2
- Exam

2025
- Test 1
- Test 2
- Exam
- Supplementary

2024
- Test 1
- Exam

This should be visually easy to scan.

==================================================
71. PAPER FILTERING
==================================================

Users should be able to filter by:

Year
Semester
Assessment type
Assessment number

Do not create unnecessary filters.

==================================================
72. CONTRIBUTION UX
==================================================

After successful upload:

Show:

"Thank you for contributing to NustWeShare ❤️"

Then:

Papers uploaded: 4
Successfully added: 3
Potential duplicates: 1

If anonymous:

"You contributed anonymously."

If logged in:

"Your contribution has been added to your profile."

==================================================
73. COMMUNITY PHILOSOPHY
==================================================

The platform should encourage contribution.

Use friendly copy such as:

"Have a paper we don't have? Share it."

"Help the next NUST student."

"Every paper helps."

Do not guilt users aggressively.

==================================================
74. STORAGE OPTIMIZATION
==================================================

Because files are capped at 3 MB:

Optimize storage where reasonable.

Do NOT blindly recompress PDFs because this can reduce quality.

Do not alter original academic documents unnecessarily.

Store the uploaded canonical PDF.

Avoid duplicate binary storage when SHA-256 proves files are identical.

==================================================
75. SCALABILITY
==================================================

Do not prematurely build for millions of users.

But do not build something that fundamentally prevents scaling.

Use:

- database indexes
- pagination
- CDN
- object storage
- caching
- stateless API design
- background processing where useful

The architecture should comfortably handle a growing NUST archive.

==================================================
76. BACKGROUND PROCESSING
==================================================

Duplicate detection and expensive PDF processing should preferably not block the user interface unnecessarily.

Where practical:

Upload
↓
Store
↓
Process asynchronously
↓
Generate fingerprints
↓
Check duplicates
↓
Update paper status

However, keep the initial implementation simple enough to deploy.

Do not introduce a complicated queue system unless necessary.

==================================================
77. OBSERVABILITY
==================================================

Implement lightweight logging.

Track:

- upload errors
- processing failures
- database errors
- R2 errors
- authentication failures
- report activity
- API errors

Do not log:

- PINs
- sensitive personal information
- private tokens

==================================================
78. BACKUPS
==================================================

The project should have a practical backup strategy for:

Database metadata
Academic data

R2 PDFs where feasible.

Do not make the system dependent on a single local computer.

==================================================
79. ENVIRONMENT VARIABLES
==================================================

Use .env for:

DATABASE_URL
R2 credentials
R2 bucket
R2 endpoint
application secrets
etc.

Never commit secrets.

Provide:

.env.example

with placeholders.

==================================================
80. TESTING
==================================================

Write tests for critical functionality.

Especially:

- paper identity
- duplicate detection
- SHA-256
- report counting
- five-report deletion
- PIN authentication
- upload validation
- file-size limits
- module validation
- assessment numbering
- database constraints

Do not attempt 100% coverage.

Prioritize critical business logic.

==================================================
81. SECURITY TESTING
==================================================

Test:

- invalid PDF uploads
- oversized files
- malformed requests
- duplicate reports
- brute-force PIN attempts
- SQL injection
- XSS
- unauthorized API access
- forged module IDs
- manipulated filenames
- malicious R2 object keys

==================================================
82. DEVELOPMENT WORKFLOW
==================================================

Do not immediately generate thousands of lines of code.

First:

1. Inspect requirements.
2. Propose architecture.
3. Create project structure.
4. Create database schema.
5. Seed academic structure.
6. Implement core browse/search.
7. Implement upload.
8. Implement storage.
9. Implement duplicate detection.
10. Implement optional profiles.
11. Implement reporting.
12. Implement leaderboard/dashboard.
13. Optimize.
14. Test.
15. Deploy.

However, do not create artificial "phases" that prevent useful progress.

The goal is a working product, not endless planning.

==================================================
83. IMPORTANT: ASK BEFORE MAKING MAJOR ASSUMPTIONS
==================================================

If something genuinely ambiguous could materially change the architecture, ask.

But do NOT ask about trivial implementation details.

Make sensible engineering decisions yourself.

Do not repeatedly ask the developer for permission to use standard practices.

==================================================
84. CODE QUALITY
==================================================

Use:

TypeScript
strict typing
clean components
clear naming
modular architecture
reusable utilities
server-side validation
database migrations

Avoid:

- duplicated code
- giant components
- hard-coded academic data
- hard-coded faculty logic
- secrets in source code
- magic strings everywhere

==================================================
85. ACCESSIBILITY
==================================================

Support:

- keyboard navigation
- semantic HTML
- screen-reader-friendly labels
- sufficient contrast
- accessible form errors
- focus states
- mobile touch targets

Do not rely solely on color to communicate status.

==================================================
86. SEO
==================================================

Public paper/module pages should be indexable by search engines where appropriate.

For example:

/febe/modules/elc511s
/febe/modules/elc511s/2025/exam

Use:

- meaningful titles
- descriptions
- canonical URLs
- sitemap
- robots.txt
- structured metadata where useful

Do not expose private user information through SEO.

==================================================
87. URL STRUCTURE
==================================================

Use clean human-readable URLs.

Example:

/febe
/fci

/febe/modules/elc511s

/febe/modules/elc511s/2025/test-1

/febe/modules/elc511s/2025/exam

Avoid exposing database UUIDs unnecessarily in public URLs.

==================================================
88. DOWNLOAD FILE NAMING
==================================================

When users download a paper, use a clean filename where possible.

Example:

ELC511S_2025_Test_1.pdf

ELC511S_2025_Exam.pdf

Do not force users to download:

random-uuid-93af7.pdf

==================================================
89. LEGAL TAKEDOWN
==================================================

Even though the project is community-run, implement a simple contact/takedown mechanism.

Provide a page such as:

/copyright

or:

/contact

Explain that if someone believes a document should be removed, they can submit a request.

Keep this lightweight.

==================================================
90. DO NOT BUILD A PAYWALL
==================================================

NustWeShare is free.

No:

- subscriptions
- premium accounts
- paid downloads
- lifetime packages
- credits

The project exists to help students.

==================================================
91. ADS
==================================================

Do not add ads initially.

Keep the first version clean.

If the project becomes large enough to require funding, architecture should not prevent future ethical monetization/sponsorship, but do not build it now.

==================================================
92. FINAL PRODUCT EXPERIENCE
==================================================

The ideal student experience:

Student visits NustWeShare.

Searches:

"ELC511S"

Gets:

Electronic Devices

Clicks it.

Sees:

2026
Test 1
Test 2
Exam

2025
Test 1
Test 2
Exam
Supplementary

Clicks:

2025 Exam

PDF opens instantly.

Student reads it.

Student can download it.

Student notices they have another paper.

Clicks Upload.

Selects ELC511S.

Selects three PDFs.

Adds details to two.

Skips one.

Uploads.

System detects one possible duplicate.

Student confirms.

Done.

No account required.

No payment.

No OTP.

No complicated forms.

==================================================
93. FINAL TECH STACK
==================================================

Preferred:

Frontend:
Next.js
React
TypeScript
Tailwind CSS

Backend:
Next.js server functionality / Cloudflare Workers

Deployment:
Cloudflare Workers + OpenNext

Storage:
Cloudflare R2

Database:
PostgreSQL

PDF rendering:
PDF.js

Hashing:
SHA-256

Scanned duplicate detection:
Perceptual hashing / image similarity

Text extraction:
Appropriate open-source PDF text extraction library

Validation:
Zod or equivalent

Version control:
GitHub

AI APIs:
NONE

==================================================
94. IMPORTANT ARCHITECTURAL PRINCIPLE
==================================================

Do not make Cloudflare-specific functionality inseparable from the core business logic.

The application should be portable.

For example:

Business logic:

createPaper()
findDuplicate()
createReport()
deleteAfterFiveReports()

should not directly depend on Cloudflare APIs wherever avoidable.

Use abstraction layers for:

Storage
Database
Authentication
Caching

This makes the open-source project easier for other contributors to deploy.

==================================================
95. FIRST TASK
==================================================

DO NOT start by generating the entire application immediately.

First analyze this specification and produce:

1. Recommended architecture
2. Project folder structure
3. Database ERD/schema
4. Complete list of tables
5. Important indexes and constraints
6. API routes
7. Upload pipeline
8. Duplicate detection architecture
9. Authentication/profile architecture
10. Reporting architecture
11. R2 storage architecture
12. Deployment architecture
13. Security architecture
14. Academic data model
15. Initial seed-data strategy
16. UI page map
17. Component architecture
18. Testing strategy
19. Environment variables
20. Development roadmap

Then identify any genuine contradictions or technical problems in the specification.

Do NOT silently change requirements.

Explain any recommendation that materially changes the requested behavior.

After that, begin implementing the application systematically.

==================================================
96. MOST IMPORTANT RULE
==================================================

Build NustWeShare as if it will actually be used by NUST students.

Do not create a toy demo.

Do not fill the interface with placeholder nonsense.

Do not fake functionality.

Do not create mock upload buttons that do nothing.

Do not create fake database results.

Do not use dummy academic data where real data is required.

Do not use AI APIs.

Do not over-engineer.

Build the simplest architecture that can genuinely operate in production.

The final result should be:

FAST.
SIMPLE.
FREE.
COMMUNITY-DRIVEN.
SEARCHABLE.
WELL-ORGANIZED.
OPEN-SOURCE.
LOW-MAINTENANCE.

The guiding principle:

"Build it once. Let the students maintain the knowledge together."