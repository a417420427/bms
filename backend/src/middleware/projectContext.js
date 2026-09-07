const mongoose = require("mongoose");
const { fail } = require("../utils/response");
const { ROLE } = require("../utils/constants");
const Project = require("../models/Project");

// 把当前会话项目上下文注入到 req.projectContext
// 销售员/渠道员：必须使用 user.currentProject
// 管理员：可用 query.projectId 切换查看，缺省则汇总所有可访问项目
async function projectContext(req, res, next) {
  try {
    if (req.user.role === ROLE.ROLE_ADMIN) {
      const pid = req.query.projectId || req.body.projectId;
      if (pid && mongoose.isValidObjectId(pid)) {
        const p = await Project.findById(pid);
        if (p) req.projectContext = { projectId: p._id, project: p, multi: false };
        else req.projectContext = { projectId: null, project: null, multi: true };
      } else {
        req.projectContext = { projectId: null, project: null, multi: true };
      }
      // 管理员可访问项目列表
      req.projectContext.accessibleProjectIds = req.user.accessibleProjects.map((p) => p._id || p);
      next();
      return;
    }

    // 销售员/渠道员
    const cur = req.user.currentProject;
    if (!cur) {
      return res.status(400).json(fail("未选择项目，请先在个人中心切换项目", 400));
    }
    req.projectContext = {
      projectId: cur._id || cur,
      project: cur._doc ? cur : null,
      multi: false,
    };
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { projectContext };
