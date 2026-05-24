import fs from "node:fs";
import { env, loadJson, nowInShanghai } from "./config.mjs";
import { emailRuntime } from "./emailProvider.mjs";

export function buildDailyMessage(snapshot) {
  const project = env("PROJECT_NAME", "Polymarket Developer Participation");
  const state = loadJson("data/execution-state.json", {});
  const subject = `${project} 日报：开发者参与进度 / ${snapshot.collectedAt.slice(0, 10)}`;
  const text = [
    `${project} 自动日报。`,
    "",
    `发送时间：${nowInShanghai()} Asia/Shanghai`,
    `贡献钱包地址：${env("POLY_CONTRIBUTION_WALLET", "0x31d2621184901ea3fb3b11299a40f495f8e08ed1")}`,
    `Builder Code：${env("POLY_BUILDER_CODE", "") ? "已配置" : "未配置，需要登录 Polymarket Settings 生成"}`,
    `Builder API Key：${env("POLY_BUILDER_API_KEY", "") ? "已配置" : "未配置，申请/获批后填写"}`,
    `执行热钱包：${state.wallet?.address || "未生成"}（MetaMask: ${state.wallet?.metamaskImportStatus || "未确认"}）`,
    "",
    "一、今天执行/自动检查",
    "- 已按官方来源检查 Polymarket Builders、Docs、Rewards、GitHub 状态。",
    "- 日报任务默认只做信息收集和邮件发送，不自动下单、不刷量、不执行授权交易。",
    "- 官方链接进入表单或钱包授权前仍需二次核对。",
    "",
    "二、官方入口状态",
    ...snapshot.officialLinks.map((link) => `- ${link.name}: ${link.status} ${link.url}`),
    "",
    "三、Builders Program 快照",
    `- Builders 页面：${snapshot.builders.ok ? "正常" : "异常"} HTTP ${snapshot.builders.status}`,
    `- 申请表字段：${snapshot.builders.applicationFields.join(" / ") || "未解析到"}`,
    ...formatLeaderboard(snapshot.builders.topProjects),
    "",
    "四、开发文档重点",
    `- Docs 页面：${snapshot.builderDocs.ok ? "正常" : "异常"} HTTP ${snapshot.builderDocs.status}`,
    ...snapshot.builderDocs.highlights.map((item) => `- ${item}`),
    "",
    "五、Rewards 快照",
    `- Rewards 页面：${snapshot.rewards.ok ? "正常" : "异常"} HTTP ${snapshot.rewards.status}`,
    ...formatRewards(snapshot.rewards.summary.sampleMarkets),
    "",
    "六、GitHub 官方仓库",
    ...snapshot.github.map((repo) => `- ${repo.name}: stars=${repo.stars ?? "?"}, forks=${repo.forks ?? "?"}, openIssues=${repo.openIssues ?? "?"}, pushedAt=${repo.pushedAt || "?"}`),
    "",
    "七、当前人工待办",
    `- Builder Program：${formatBuilderProgramStatus(state.builderProgram)}`,
    state.wallet?.metamaskImportStatus === "imported"
      ? `- MetaMask 已导入：${state.wallet.metamaskVisibleName}。`
      : "- 解锁 MetaMask 后导入 `polymarket 开发者钱包`。",
    "- 确认 SMTP 授权码已配置到 `/etc/polymarket-developer-tracker.env` 或服务器环境变量。",
    "- 部署服务器前先检查已有进程、端口、cron/systemd，避免影响旧项目。",
    "",
    "八、明天计划",
    "- 完成公开 Builder Profile Site，并准备可部署的网站 URL。",
    "- 继续强化 Builder Tracker 的官方来源和提交结果监控。",
    "- 启动只读 Market Intelligence Dashboard 的数据结构设计。",
    "",
    "邮件投递说明：SMTP accepted 只代表服务商接受投递，不等于收件箱实际收到。"
  ].join("\n");

  return { subject, text };
}

export function buildRunRecord({ mode, snapshot, message, sendResult }) {
  return {
    mode,
    generatedAt: nowInShanghai(),
    runtime: emailRuntime(),
    snapshot,
    subject: message.subject,
    sendResult: sendResult || null
  };
}

export function saveTextReport(filePath, message) {
  fs.writeFileSync(filePath, `${message.subject}\n\n${message.text}\n`, { mode: 0o600 });
}

function formatLeaderboard(projects) {
  if (!projects.length) return ["- Leaderboard：未解析到项目列表"];
  return [
    "- 当前解析到的 leaderboard 头部项目：",
    ...projects.map((project, index) => `  ${index + 1}. ${project.name} ${project.oneMonthVolume || ""}`.trimEnd())
  ];
}

function formatRewards(markets) {
  if (!markets.length) return ["- Rewards：未解析到样例市场，需人工打开页面复核。"];
  return [
    "- Rewards 样例市场：",
    ...markets.slice(0, 6).map((market) => `  - ${market.market} | spread ${market.maxSpread} | min ${market.minShares} | reward ${market.reward}`)
  ];
}

function formatBuilderProgramStatus(builderProgram) {
  if (!builderProgram?.status) return "未记录，需登录 Polymarket 检查 Builder 状态。";
  if (builderProgram.status === "submitted-unconfirmed") {
    return "已提交但未看到明确确认号，需监控邮箱/站内状态。";
  }
  return `${builderProgram.status}。`;
}
