import { ref, computed } from 'vue';

import { defineStore } from 'pinia';

import { getProjectList } from '#/api/project';

export interface ProjectInfo {
  code: number;
  name: string;
}

export const useProjectStore = defineStore('project', () => {
  const currentProjectCode = ref<number | undefined>();
  const projectList = ref<ProjectInfo[]>([]);
  const loading = ref(false);

  const currentProject = computed(() => {
    if (!currentProjectCode.value) return null;
    return projectList.value.find((p) => p.code === currentProjectCode.value) || null;
  });

  const projectOptions = computed(() => {
    return projectList.value.map((p) => ({
      label: p.name,
      value: p.code,
    }));
  });

  async function fetchProjectList() {
    if (projectList.value.length > 0) return;
    
    loading.value = true;
    try {
      const res = await getProjectList({ pageSize: 1000, pageNo: 1 });
      projectList.value = (res.totalList || []).map((item) => ({
        code: item.code,
        name: item.name,
      }));
      
      if (projectList.value.length > 0 && !currentProjectCode.value) {
        const savedProjectCode = localStorage.getItem('currentProjectCode');
        if (savedProjectCode) {
          const code = Number(savedProjectCode);
          if (projectList.value.some((p) => p.code === code)) {
            currentProjectCode.value = code;
          } else {
            currentProjectCode.value = projectList.value[0].code;
          }
        } else {
          currentProjectCode.value = projectList.value[0].code;
        }
      }
    } catch {
      console.error('获取项目列表失败');
    } finally {
      loading.value = false;
    }
  }

  function setCurrentProject(code: number | undefined) {
    currentProjectCode.value = code;
    if (code) {
      localStorage.setItem('currentProjectCode', String(code));
    } else {
      localStorage.removeItem('currentProjectCode');
    }
  }

  function $reset() {
    currentProjectCode.value = undefined;
    projectList.value = [];
    loading.value = false;
  }

  return {
    currentProjectCode,
    currentProject,
    projectList,
    projectOptions,
    loading,
    fetchProjectList,
    setCurrentProject,
    $reset,
  };
});
