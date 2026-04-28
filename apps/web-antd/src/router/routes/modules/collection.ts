// import type { RouteRecordRaw } from 'vue-router';

// import { $t } from '#/locales';

// const routes: RouteRecordRaw[] = [
//   {
//     meta: {
//       icon: 'ant-design:database-outlined',
//       order: 150,
//       title: $t('datacollection.title'),
//     },
//     name: 'DataCollection',
//     path: '/collection',
//     children: [
//       {
//         meta: {
//           title: $t('datacollection.taskmanagement.title'),
//         },
//         name: 'TaskManagement',
//         path: '/collection/taskmanagement',
//         component: () => import('#/views/collection/taskmanagement/index.vue'),
//       },
//       {
//         meta: {
//           title: '批量采集-结构化数据',
//           hideInMenu: true,
//         },
//         name: 'StructuredBatchTask',
//         path: '/collection/taskmanagement/structuredbatch',
//         component: () => import('#/views/collection/taskmanagement/structuredbatch/index.vue'),
//       },
//       {
//         meta: {
//           title: '实时采集-结构化数据',
//           hideInMenu: true,
//         },
//         name: 'StructuredStreamTask',
//         path: '/collection/taskmanagement/structuredstream',
//         component: () => import('#/views/collection/taskmanagement/structuredstream/index.vue'),
//       },
//       {
//         meta: {
//           title: '批量采集-非结构化数据',
//           hideInMenu: true,
//         },
//         name: 'UnstructuredBatchTask',
//         path: '/collection/taskmanagement/unstructuredbatch',
//         component: () => import('#/views/collection/taskmanagement/unstructuredbatch/index.vue'),
//       },
//       {
//         meta: {
//           title: '实时采集-非结构化数据',
//           hideInMenu: true,
//         },
//         name: 'UnstructuredStreamTask',
//         path: '/collection/taskmanagement/unstructuredstream',
//         component: () => import('#/views/collection/taskmanagement/unstructuredstream/index.vue'),
//       },
//       {
//         meta: {
//           title: $t('datacollection.taskmonitoring.title'),
//         },
//         name: 'TaskMonitoring',
//         path: '/collection/taskmonitoring',
//         component: () => import('#/views/collection/taskmonitoring/index.vue'),
//       },
//       {
//         meta: {
//           title: $t('datacollection.batch.title'),
//         },
//         name: 'BatchCollection',
//         path: '/collection/batch',
//         component: () => import('#/views/collection/batch/index.vue'),
//       },
//       {
//         meta: {
//           title: $t('datacollection.stream.title'),
//         },
//         name: 'StreamCollection',
//         path: '/collection/stream',
//         component: () => import('#/views/collection/stream/index.vue'),
//       },
//       {
//         meta: {
//           title: $t('datacollection.cdc.title'),
//         },
//         name: 'CdcCollection',
//         path: '/collection/cdc',
//         component: () => import('#/views/collection/cdc/index.vue'),
//       },
//       {
//         meta: {
//           title: $t('datacollection.unstructured.title'),
//         },
//         name: 'UnstructuredCollection',
//         path: '/collection/unstructured',
//         component: () => import('#/views/collection/unstructured/index.vue'),
//       },
//     ],
//   },
// ];

// export default routes;
