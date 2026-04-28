import { acceptHMRUpdate, defineStore } from 'pinia';

interface Project {
  code: number;
  name: string;
  userName: string;
  userId: number;
  description: string;
  defCount: number;
  createTime: string;
  updateTime: string;
}

export const useProjectStore = defineStore('core-project', {

  state: () => ({
    projectList: [] as Project[], 
    currentProject: null as Project | null, 
  }),

  actions: {
    setProjectList(project: Project[]) {
      this.projectList = project
    },

    removeProject(code: number) {
      this.projectList = this.projectList.filter(p => p.code !== code)
    },

    setCurrentProject(project: Project | null) {
      this.currentProject = project
    },
  }
})


// 解决热更新问题
const hot = import.meta.hot;
if (hot) {
  hot.accept(acceptHMRUpdate(useProjectStore, hot));
}
