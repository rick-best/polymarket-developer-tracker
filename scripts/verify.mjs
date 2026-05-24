import fs from "node:fs";
import { emailRuntime } from "../src/emailProvider.mjs";
import { collectPolymarketSnapshot } from "../src/polymarketCollector.mjs";
import { runCommunityIntel } from "../src/communityIntel.mjs";
import { buildSiteEvidence } from "./buildSiteEvidence.mjs";
import { buildMarketIntelPage } from "./buildMarketIntelPage.mjs";

const snapshot = await collectPolymarketSnapshot();
const communityIntel = await runCommunityIntel();
buildSiteEvidence();
buildMarketIntelPage();
const checks = {
  emailStatus: emailRuntime(),
  buildersOk: snapshot.builders.ok,
  docsOk: snapshot.builderDocs.ok,
  rewardsOk: snapshot.rewards.ok,
  githubOk: snapshot.github.every((repo) => repo.ok),
  planExists: fs.existsSync("docs/developer-plan.md"),
  publicSitePlanExists: fs.existsSync("docs/public-builder-profile-site.md"),
  deploymentNotesExist: fs.existsSync("docs/deployment.md"),
  siteIndexExists: fs.existsSync("site/index.html"),
  siteEvidenceExists: fs.existsSync("site/evidence/index.html"),
  siteMarketIntelExists: fs.existsSync("site/market-intel/index.html"),
  siteCommunityIntelExists: fs.existsSync("site/community-intel/index.html") && communityIntel.ok,
  communityIntelReportExists:
    fs.existsSync("reports/community-intel-latest.txt") && fs.existsSync("reports/community-intel-latest.json"),
  siteEvidenceLatestExists:
    fs.existsSync("site/evidence/daily-latest.txt") && fs.existsSync("site/evidence/daily-latest.json")
};

console.log(JSON.stringify(checks, null, 2));

if (
  !checks.buildersOk ||
  !checks.docsOk ||
  !checks.rewardsOk ||
  !checks.githubOk ||
  !checks.planExists ||
  !checks.publicSitePlanExists ||
  !checks.deploymentNotesExist ||
  !checks.siteIndexExists ||
  !checks.siteEvidenceExists ||
  !checks.siteMarketIntelExists ||
  !checks.siteCommunityIntelExists ||
  !checks.communityIntelReportExists ||
  !checks.siteEvidenceLatestExists
) {
  process.exitCode = 1;
}
