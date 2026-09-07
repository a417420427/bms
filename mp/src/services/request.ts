import Taro from "@tarojs/taro";

// 后端统一响应拦截后返回 data
interface RequestConfig {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
  data?: any;
  header?: Record<string, string>;
  timeout?: number;
  loading?: boolean;
  loadingText?: string;
  skipAuth?: boolean;
}

class HttpRequest {
  private baseUrl: string;

  constructor(bl: string) {
    this.baseUrl = bl;
  }

  private showLoading(text: string = "加载中..."): void {
    Taro.showLoading({ title: text, mask: true });
  }

  private hideLoading(): void {
    Taro.hideLoading();
  }

  // 不需要登录的接口白名单
  private whiteList = ["/auth/login", "/auth/wechat/login", "/auth/wechat/bind"];

  public async request<T = any>(config: RequestConfig): Promise<T> {
    const { getToken, clearToken } = require("./api");
    const { handleWechatLogin } = require("./auth");

    const mergedConfig: RequestConfig = {
      method: "GET",
      data: {},
      timeout: 10000,
      loading: true,
      loadingText: "加载中...",
      ...config,
    };

    if (!getToken() && !this.whiteList.includes(mergedConfig.url)) {
      clearToken();
      handleWechatLogin();
      return Promise.reject({ errMsg: "未登录" });
    }

    if (mergedConfig.loading) {
      this.showLoading(mergedConfig.loadingText);
    }

    try {
      const token = getToken();
      const header: Record<string, string> = {
        "Content-Type": "application/json",
        ...mergedConfig.header,
      };
      if (token) {
        header.Authorization = `Bearer ${token}`;
      }
      if (mergedConfig.method === "GET") {
        delete header["Content-Type"];
      }

      const res: any = await new Promise((resolve, reject) => {
        Taro.request({
          url: this.baseUrl + mergedConfig.url,
          method: mergedConfig.method,
          data: mergedConfig.data,
          header,
          timeout: mergedConfig.timeout,
          success: (r) => {
            if (r.statusCode >= 200 && r.statusCode < 300) {
              resolve(r.data);
            } else {
              reject(r.data);
            }
          },
          fail: (err) => reject(err),
          complete: () => {
            if (mergedConfig.loading) {
              this.hideLoading();
            }
          },
        });
      });

      // 后端统一响应 { code, message, data }
      if (res.code === 401) {
        clearToken();
        handleWechatLogin();
        return Promise.reject(res);
      }
      if (res.code !== 0) {
        Taro.showToast({ title: res.message || "请求失败", icon: "none" });
        return Promise.reject(res);
      }
      return res.data as T;
    } catch (error: any) {
      this.handleError(error, config);
      throw error;
    }
  }

  public get<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({ url, method: "GET", data, ...config });
  }

  public post<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({ url, method: "POST", data, ...config });
  }

  public put<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({ url, method: "PUT", data, ...config });
  }

  public delete<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({ url, method: "DELETE", data, ...config });
  }

  private handleError(error: any, config: RequestConfig): void {
    let errorMessage = "请求失败，请稍后重试";
    if (error?.errMsg) {
      if (error.errMsg.includes("timeout")) errorMessage = "请求超时，请检查网络连接";
      else if (error.errMsg.includes("fail")) errorMessage = "网络错误，请检查网络连接";
    }
    if (error?.code) {
      switch (error.code) {
        case 401: errorMessage = "未授权，请重新登录"; break;
        case 403: errorMessage = "拒绝访问"; break;
        case 404: errorMessage = "请求资源不存在"; break;
        case 500: errorMessage = "服务器错误"; break;
      }
    }
    Taro.showToast({ title: errorMessage, icon: "none", duration: 2000 });
    console.error("请求错误:", error);
  }
}

const baseUrl = process.env.TARO_APP_API || "http://localhost:3000/api";

const http = new HttpRequest(baseUrl);

export default http;
