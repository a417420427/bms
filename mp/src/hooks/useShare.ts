// 通用分享 hook
// 各页面调用 useShare({ title }) 即可同时开启"转发给好友"和"分享到朋友圈"
// 也可以传 path/imageUrl 自定义分享内容
import { useShareAppMessage, useShareTimeline } from "@tarojs/taro";

interface ShareOptions {
  title?: string;
  path?: string;
  imageUrl?: string;
}

export function useShare(options: ShareOptions = {}) {
  const title = options.title || "商管营销宝";
  const path = options.path || "/pages/launch/index";

  // 转发给好友（单聊/群聊）
  useShareAppMessage(() => ({
    title,
    path,
    imageUrl: options.imageUrl,
  }));

  // 分享到朋友圈（timeline）
  useShareTimeline(() => ({
    title,
    query: "", // 朋友圈分享不支持 path，用 query 传参（key=val&key=val 格式）
    imageUrl: options.imageUrl,
  }));
}
