import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:folder-outlined',
      order: 200,
      title: $t('page.project.title'),
    },
    name: 'Project',
    path: '/project',
    children: [
      {
        meta: {
          title: $t('page.project.list'),
        },
        name: 'ProjectList',
        path: '/project/list',
        component: () => import('#/views/project/index.vue'),
      },
      {
        meta: {
          title: $t('page.project.overview'),
        },
        name: 'ProjectOverview',
        path: '/project/overview',
        component: () => import('#/views/project/overview.vue'),
      },
      {
        meta: {
          title: 'Worker分组管理',
        },
        name: 'WorkerGroupList',
        path: '/project/worker-group',
        component: () => import('#/views/project/worker-group/index.vue'),
      },
      {
        meta: {
          title: 'Yarn队列管理',
        },
        name: 'QueueList',
        path: '/project/queue',
        component: () => import('#/views/project/queue/index.vue'),
      },
      {
        meta: {
          title: '环境管理',
        },
        name: 'EnvironmentList',
        path: '/project/environment',
        component: () => import('#/views/project/environment/index.vue'),
      },
      {
        meta: {
          title: '资源配置',
        },
        name: 'FlinkJobConfigList',
        path: '/project/flink-config',
        component: () => import('#/views/project/flink-config/index.vue'),
      },
    ],
  },
];

export default routes;
