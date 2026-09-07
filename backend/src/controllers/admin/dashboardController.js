const Customer = require("../../models/Customer");
const PublicPool = require("../../models/PublicPool");
const ExpiredPool = require("../../models/ExpiredPool");
const Approval = require("../../models/Approval");
const { APPROVAL_RESULT } = require("../../models/Approval");
const { CUSTOMER_SOURCE } = require("../../utils/constants");
const mongoose = require("mongoose");

// GET /api/admin/dashboard
// 入参 projectId 可选，缺省则汇总管理员可访问的项目
exports.dashboard = async (req, res) => {
  const ctx = req.projectContext;
  const projectFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  const [total, salesEntered, channelRec, publicCount, expiredCount, pendingApprovals] = await Promise.all([
    Customer.countDocuments(projectFilter),
    Customer.countDocuments({
      ...projectFilter,
      source: { $in: [CUSTOMER_SOURCE.SELF_VISIT, CUSTOMER_SOURCE.SELF_DEVELOP] },
    }),
    Customer.countDocuments({
      ...projectFilter,
      source: { $in: [CUSTOMER_SOURCE.CHANNEL_COMPANY, CUSTOMER_SOURCE.PERSONAL_REFERRAL] },
    }),
    PublicPool.countDocuments({ ...projectFilter, archived: { $ne: true } }),
    ExpiredPool.countDocuments({ ...projectFilter, archived: { $ne: true } }),
    Approval.countDocuments({ ...projectFilter, result: APPROVAL_RESULT.PENDING }),
  ]);

  return {
    data: {
      total,
      salesEntered,
      channelRec,
      publicPoolCount: publicCount,
      expiredPoolCount: expiredCount,
      pendingApprovals,
    },
  };
};
