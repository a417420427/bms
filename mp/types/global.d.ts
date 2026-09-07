// Taro 全局类型定义

// Taro 页面/应用配置 helper（由 @tarojs/taro 在编译期提供）
declare const definePageConfig: <T = Record<string, any>>(config: T) => T;

declare const defineAppConfig: <T = Record<string, any>>(config: T) => T;

// 全局 process.env 类型（小程序运行时也会注入 process）
declare namespace NodeJS {
  interface ProcessEnv {
    TARO_ENV?:
      | "weapp"
      | "swan"
      | "alipay"
      | "tt"
      | "qq"
      | "quickapp"
      | "h5"
      | "rn";
    /** 后端 API 地址前缀，例如 http://localhost:3000/api */
    TARO_APP_API?: string;
    TARO_APP_API_BASE?: string;
    [key: string]: string | undefined;
  }
}
