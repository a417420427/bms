import { createContext, useState, useContext, ReactNode, FC } from "react";
import { getLocalUserInfo } from "@/services/api";

interface UserContextValue {
  userInfo: UserInfoProp;
  updateUserInfo: (newUserInfo: UserInfoProp) => void;
  currentProject: ProjectItem | null;
  updateProject: (project: ProjectItem) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [userInfo, setUserInfo] = useState<UserInfoProp>(getLocalUserInfo());
  const [currentProject, setCurrentProject] = useState<ProjectItem | null>(
    ((userInfo as any) && (userInfo as any).currentProject) || null
  );

  const updateUserInfo = (newUserInfo: UserInfoProp) => {
    setUserInfo((prev) => ({ ...prev, ...newUserInfo }));
  };

  const updateProject = (project: ProjectItem) => {
    setCurrentProject(project);
  };

  return (
    <UserContext.Provider
      value={{ userInfo, updateUserInfo, currentProject, updateProject }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return ctx;
};
