// 文件上传 / 下载 / 图片预览等辅助
import Taro from "@tarojs/taro";

const fileService = {
  /** 选择图片（最多 n 张） */
  chooseImage(count = 1): Promise<string[]> {
    return new Promise((resolve, reject) => {
      Taro.chooseImage({
        count,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (res) => resolve(res.tempFilePaths),
        fail: (err) => reject(err),
      });
    });
  },

  /** 预览图片 */
  previewImage(urls: string[], current?: string) {
    Taro.previewImage({ urls, current: current || urls[0] });
  },

  /** 保存文件到本地相册（图片） */
  saveImageToAlbum(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      Taro.saveImageToPhotosAlbum({
        filePath,
        success: () => resolve(true),
        fail: () => resolve(false),
      });
    });
  },

  /** 下载文件 */
  downloadFile(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      Taro.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode === 200) resolve(res.tempFilePath);
          else reject(res);
        },
        fail: (err) => reject(err),
      });
    });
  },

  /** 打开文档 */
  openDocument(filePath: string, fileType?: string) {
    Taro.openDocument({
      filePath,
      fileType,
      showMenu: true,
      success: () => {},
      fail: () => {},
    });
  },
};

export default fileService;
