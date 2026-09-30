import request from "@/utils/request";

// 工作台统计总览（支持多项目汇总）
export const getDashboardApi = (params) => request.get("/admin/dashboard", { params });

// 客户漏斗看板：报备 → 到访 → 跟进 → 成交
export const getFunnelStatsApi = (params) => request.get("/admin/stats/funnel", { params });

// 销售业绩看板：客户数/到访数/成交数/跟进及时率
export const getSalesStatsApi = () => request.get("/admin/stats/sales");

// 渠道贡献看板：合作公司推荐量/到访率/过期率 + 渠道员 Top
export const getChannelStatsApi = () => request.get("/admin/stats/channel");

// 跟进预警看板：按销售员聚合 + 按意向等级分布
export const getWarningStatsApi = () => request.get("/admin/stats/warning");

// 实时动态看板：今日计数 + 动态流
export const getActivityStatsApi = () => request.get("/admin/stats/activity");
