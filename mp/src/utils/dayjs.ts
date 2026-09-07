// dayjs 配置
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";

dayjs.locale("zh-cn");
dayjs.extend(relativeTime);
dayjs.extend(duration);

export const formatDate = (date: any, fmt = "YYYY-MM-DD HH:mm") => {
  if (!date) return "";
  return dayjs(date).format(fmt);
};

export const fromNow = (date: any) => {
  if (!date) return "";
  return dayjs(date).fromNow();
};

export default dayjs;
