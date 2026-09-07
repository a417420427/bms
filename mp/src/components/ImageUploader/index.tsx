// 上传图片组件
import { FC, useState } from "react";
import { View, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { uploadVisitPhoto } from "@/services/api";
import "./index.scss";

interface Props {
  value?: string[];
  max?: number;
  onChange?: (urls: string[]) => void;
}

const ImageUploader: FC<Props> = ({ value = [], max = 3, onChange }) => {
  const [list, setList] = useState<string[]>(value);

  const handleChoose = () => {
    if (list.length >= max) {
      Taro.showToast({ title: `最多上传 ${max} 张`, icon: "none" });
      return;
    }
    Taro.chooseImage({
      count: max - list.length,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: async (res) => {
        Taro.showLoading({ title: "上传中", mask: true });
        try {
          const uploaded: string[] = [];
          for (const path of res.tempFilePaths) {
            const { url } = await uploadVisitPhoto(path);
            uploaded.push(url);
          }
          const next = [...list, ...uploaded];
          setList(next);
          onChange?.(next);
        } catch (e) {
          Taro.showToast({ title: "上传失败", icon: "none" });
        } finally {
          Taro.hideLoading();
        }
      },
    });
  };

  const handlePreview = (current: string) => {
    Taro.previewImage({ urls: list, current });
  };

  const handleRemove = (idx: number) => {
    const next = list.filter((_, i) => i !== idx);
    setList(next);
    onChange?.(next);
  };

  return (
    <View className="uploader">
      {list.map((url, idx) => (
        <View key={idx} className="uploader__item">
          <Image src={url} mode="aspectFill" onClick={() => handlePreview(url)} />
          <View className="uploader__remove" onClick={() => handleRemove(idx)}>×</View>
        </View>
      ))}
      {list.length < max ? (
        <View className="uploader__add" onClick={handleChoose}>+</View>
      ) : null}
    </View>
  );
};

export default ImageUploader;
