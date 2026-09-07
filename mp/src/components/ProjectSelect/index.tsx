// 项目选择弹窗
import { FC, useEffect, useState } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Modal from "@/components/Modal/Modal";
import { listProjects, switchProject, setLocalProject } from "@/services/api";
import "./index.scss";

interface Props {
  visible: boolean;
  onClose?: () => void;
  onSelected?: (project: ProjectItem) => void;
}

const ProjectSelect: FC<Props> = ({ visible, onClose, onSelected }) => {
  const [list, setList] = useState<ProjectItem[]>([]);

  useEffect(() => {
    if (visible) {
      listProjects().then(setList).catch(() => {});
    }
  }, [visible]);

  const handleSelect = async (p: ProjectItem) => {
    const project = await switchProject(p._id);
    setLocalProject(project);
    onSelected && onSelected(project);
    onClose && onClose();
  };

  return (
    <Modal
      visible={visible}
      title="选择项目"
      position="bottom"
      maskClosable={false}
      onClose={() => onClose && onClose()}
    >
      <ScrollView scrollY style={{ maxHeight: "600rpx" }}>
        {list.length === 0 ? (
          <View className="empty-tip">无可用项目</View>
        ) : (
          list.map((p) => (
            <View key={p._id} className="project-item" onClick={() => handleSelect(p)}>
              <View className="project-item__name">{p.name}</View>
              <Text className="project-item__code">{p.code}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Modal>
  );
};

export default ProjectSelect;
