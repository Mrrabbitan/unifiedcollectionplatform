<script lang="ts" setup>
import type { ProjectItem } from '#/api/project';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Form, Input, message } from 'ant-design-vue';

import { createProject, updateProject } from '#/api/project';

defineOptions({ name: 'CreateProjectModal' });

const emit = defineEmits<{
  success: [];
}>();

const userStore = useUserStore();
const userInfo = computed(() => userStore.userInfo);

const [Modal, modalApi] = useVbenModal({
  onConfirm: handleSubmit,
  onOpenChange: handleOpenChange,
});

const formState = ref({
  projectName: '',
  userName: '',
  description: '',
});

const editMode = ref(false);
const currentProject = ref<ProjectItem | null>(null);
const loading = ref(false);

const title = computed(() => (editMode.value ? '编辑项目' : '新建项目'));

function handleOpenChange(isOpen: boolean) {
  if (isOpen) {
    const data = modalApi.getData<{
      editMode: boolean;
      project?: ProjectItem;
    }>();
    editMode.value = data?.editMode || false;
    currentProject.value = data?.project || null;
    
    if (editMode.value && data?.project) {
      formState.value = {
        projectName: data.project.name,
        userName: data.project.userName,
        description: data.project.description || '',
      };
    } else {
      const currentUserName = userStore.userInfo?.userName || userInfo.value?.realName || '';
      formState.value = {
        projectName: '',
        userName: currentUserName,
        description: '',
      };
    }
  }
}

async function handleSubmit() {
  if (!formState.value.projectName) {
    message.error('请输入项目名称');
    return;
  }
  if (!formState.value.userName) {
    message.error('所属用户不能为空');
    return;
  }

  loading.value = true;
  try {
    if (editMode.value && currentProject.value) {
      await updateProject(
        {
          projectName: formState.value.projectName,
          userName: formState.value.userName,
          description: formState.value.description,
        },
        currentProject.value.code,
      );
      message.success('编辑成功');
    } else {
      await createProject({
        projectName: formState.value.projectName,
        userName: formState.value.userName,
        description: formState.value.description,
      });
      message.success('创建成功');
    }
    modalApi.close();
    emit('success');
  } catch {
    message.error(editMode.value ? '编辑失败' : '创建失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Modal :title="title">
    <Form layout="vertical">
      <Form.Item label="项目名称" required>
        <Input
          v-model:value="formState.projectName"
          placeholder="请输入项目名称"
          allow-clear
        />
      </Form.Item>
      <Form.Item label="所属用户" required>
        <Input
          v-model:value="formState.userName"
          disabled
        />
      </Form.Item>
      <Form.Item label="项目描述">
        <Input.TextArea
          v-model:value="formState.description"
          placeholder="请输入项目描述"
          :rows="4"
          allow-clear
        />
      </Form.Item>
    </Form>
  </Modal>
</template>
