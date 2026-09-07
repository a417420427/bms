// Modal 弹窗（基础实现）
import { FC, ReactNode, useState, useEffect } from "react";
import { View } from "@tarojs/components";
import "./Modal.scss";

interface Props {
  visible: boolean;
  title?: string;
  position?: "center" | "bottom";
  maskClosable?: boolean;
  onClose: () => void;
  children?: ReactNode;
}

const Modal: FC<Props> = ({ visible, title, position = "center", maskClosable = true, onClose, children }) => {
  const [show, setShow] = useState(visible);
  useEffect(() => {
    setShow(visible);
  }, [visible]);

  if (!show) return null;

  return (
    <View className={`modal modal--${position}`}>
      <View
        className="modal__mask"
        onClick={() => {
          if (maskClosable) onClose();
        }}
      />
      <View className={`modal__container modal__container--${position}`}>
        {title ? <View className="modal__title">{title}</View> : null}
        <View className="modal__body">{children}</View>
      </View>
    </View>
  );
};

export default Modal;
