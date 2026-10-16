# Aurelia — DevOps Pipeline

This document describes the CI/CD pipeline around the Aurelia hotel
reservation app, and — most importantly for coursework — **exactly how
to demonstrate it working to your professor.**

## 1. Architecture

```
 Developer            AWS CodeCommit          Jenkins             AWS CodeBuild
 ─────────            ───────────────          ───────             ─────────────
 git push  ────────▶  main branch     ─────▶   job triggers  ────▶ npm test
                                                (poll/webhook)      docker build
                                                                    push image → ECR
                                                                        │
                                                                        ▼
                                                                  buildspec.yml
                                                                  artifact (zip):
                                                                  Dockerrun.aws.json
                                                                  + .ebextensions/
                                                                        │
                        ┌───────────────────────────────────────────────┘
                        ▼
              Jenkins deploys to AWS Elastic Beanstalk
              (rolling deployment, extra batch → zero downtime)
                        │
                        ▼
              Jenkins polls environment health (CloudWatch-backed)
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
          Healthy             Unhealthy
          → done               → scripts/rollback.sh
                                  redeploys previous version label
```

**Why each tool is there (maps to the assignment's tool list):**

| Tool | Role here |
|---|---|
| **Git / AWS CodeCommit** | Source control. Every commit to `main` is what starts a pipeline run. |
| **Jenkins** | Orchestrator — decides *when* to build, *whether* a deploy succeeded, and *whether* to roll back. |
| **AWS CodeBuild** (`buildspec.yml`) | Does the actual work: installs deps, **runs the automated test suite**, builds the Docker image, pushes it to ECR. If tests fail, the build fails and nothing downstream ever runs. |
| **Docker** (`Dockerfile`) | Packages the app (nginx + static files) identically for every environment. |
| **AWS Elastic Beanstalk** | Hosts the running app. `RollingWithAdditionalBatch` deployment policy means it spins up new (healthy-checked) instances *before* removing old ones — that's the "minimal downtime" requirement. |
| **CloudWatch** (`.ebextensions/02-logging.config`) | Streams container/nginx logs and environment health so problems are visible without SSH-ing anywhere. |
| **Rollback** (`scripts/rollback.sh`) | Jenkins records the version running *before* every deploy; if the new one fails its health check, this script redeploys the old version label automatically. |

## 2. Automated testing

`npm test` runs two suites (17 tests total, all currently passing):

- **`tests/unit.test.js`** — pure logic: the 20-room inventory total,
  night calculations, and the overlap-based availability math (the
  exact bug class we hit and fixed during development).
- **`tests/integration.test.js`** — loads the real page in a headless
  DOM and clicks/submits through it: sign-up, booking creation,
  cancellation, the 20-room cap being enforced, and two regression
  tests for real bugs found along the way (a cancel button that didn't
  actually delete, and CSS that kept "hidden" elements visible).

This is the gate CodeBuild runs before anything is ever built or
deployed — a red test suite stops the pipeline at `pre_build`.

## 3. How to actually set this up on AWS (one-time)

You only need to do this once per environment; after that, every `git
push` runs the pipeline automatically.

1. **CodeCommit**: create a repository, push this project to it.
2. **ECR**: create a repository named `aurelia-hotel`.
3. **CodeBuild**: create a project pointing at the CodeCommit repo,
   using `buildspec.yml` from this repo, with environment variables
   `AWS_ACCOUNT_ID` and `AWS_DEFAULT_REGION` set, and an IAM role that
   can push to ECR.
4. **Elastic Beanstalk**: create an application (`aurelia-hotel`) and
   environment (`aurelia-hotel-env`) on the **Docker** platform. Deploy
   once manually with a sample `Dockerrun.aws.json` to get it running,
   then apply the `.ebextensions/` configs (redeploy).
5. **S3**: create the artifact bucket referenced in `Jenkinsfile`
   (`aurelia-eb-artifacts`).
6. **Jenkins**: install the AWS CLI + Git on the agent, add an IAM
   credential with permissions for CodeBuild/EB/S3/ECR, create a
   Pipeline job pointing at this repo's `Jenkinsfile`, and set a
   trigger (Poll SCM, or a webhook from CodeCommit).
7. **CloudWatch**: once the environment is running with
   `02-logging.config` applied, its logs appear automatically under
   `/aws/elasticbeanstalk/aurelia-hotel-env/...`. Optionally add an
   alarm on `EnvironmentHealth` for extra visibility.

## 4. Demonstrating this to your professor

You have two realistic options — do both if you can, since a recording
is your insurance policy if live AWS/Jenkins hiccups during the actual
session.

### Option A — Live demo (best if it goes well)

A tight 8–10 minute walkthrough, in this order:

1. **Show the repo & make a real change** — e.g. tweak a room price in
   `js/app.js`, commit, `git push` to CodeCommit. *("This is a real
   commit, not a rehearsed one.")*
2. **Show Jenkins picking it up** — open the Jenkins job, show the new
   build starting (either it polled, or trigger it manually and say so
   honestly).
3. **Show the CodeBuild stage running `npm test`** — open the
   CodeBuild console/logs live, point at the `npm test` output showing
   17 passing tests. This is your automated-testing evidence.
4. **Show the Docker image landing in ECR** — a new tag appears with
   the current commit hash.
5. **Show Elastic Beanstalk deploying** — open the EB console's
   "Events" tab: you'll see it launching new instances *before*
   terminating old ones (this is the zero/minimal-downtime part —
   narrate that explicitly).
6. **Show CloudWatch Logs** — open the log group, show live nginx
   access logs appearing as you refresh the site in another tab.
7. **Break it on purpose** — push a commit with a failing test (e.g.
   edit `tests/unit.test.js` to assert something false), show the
   pipeline stopping at the test stage, and explain: *"because the
   tests failed here, it never reached Elastic Beanstalk at all — the
   site currently live was never touched."*
8. **Show a rollback** — either simulate an unhealthy deploy, or just
   run `scripts/rollback.sh` manually against a previous version label
   while narrating what Jenkins would have done automatically.

### Option B — Recorded video (safer, and good evidence for the report)

Record steps 1–8 above with a screen recorder (Loom, OBS, or even
Zoom's local recording) once everything is working end to end. Keep it
under 10 minutes, narrate what's happening at each step, and upload it
unlisted (YouTube/Drive) with the link in your report's appendix. This
also protects you if the live AWS demo has a network hiccup in front
of the professor.

### What to put in the written report as evidence

- Screenshot of the CodeCommit commit history.
- Screenshot of a Jenkins pipeline run showing all stages green.
- Screenshot of the CodeBuild log with `npm test` output (17 passing).
- Screenshot of the ECR repository showing pushed image tags.
- Screenshot of the EB "Events" log during a rolling deployment.
- Screenshot of CloudWatch Logs for the environment.
- Screenshot/terminal output of a rollback being triggered.
- The video link, if you recorded one.
- This file (`PIPELINE.md`) itself, as the design document the
  assignment asks for.

### If you're short on time before the demo

If you haven't provisioned the AWS resources yet, it's still honest
and reasonable to tell your professor: *"here's the pipeline as code —
Dockerfile, buildspec.yml, Jenkinsfile, EB configs, and a passing
automated test suite — and here's the architecture diagram of how it
wires together."* Showing correct, working configuration-as-code plus
a genuinely green `npm test` run is real, verifiable evidence of
understanding, even before every AWS resource is clicked into
existence.
