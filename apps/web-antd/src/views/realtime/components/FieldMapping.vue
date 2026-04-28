<template>
  <div>
    <Card class="mb-4" :bordered="false">
      <template #title>
        <span class="card-title">
          <span class="title-badge">03</span>
          字段映射
        </span>
      </template>

      <div class="config-content-wrapper">
        <div class="config-content">
          <div class="mapping-toolbar">
            <div class="toolbar-left">
              <Button type="primary" @click="addSourceField">
                <PlusOutlined /> 添加源字段
              </Button>
              <span class="message-time-label" hidden="true"
                >启用消息时间字段</span
              >
              <Switch
                hidden="true"
                v-model:checked="enableMessageTimeField"
                checked-children="启用"
                un-checked-children="关闭"
                class="mr-2"
              />
            </div>
            <div class="toolbar-right">
              <Button @click="mapByName"> 同名映射 </Button>
              <Button type="primary" @click="mapByOrder" class="ml-2">
                同行映射
              </Button>
              <Button @click="clearAllMappings" class="ml-2"> 清除映射 </Button>
              <Button @click="testDataStructure" class="ml-2" hidden="true">
                测试数据结构
              </Button>
            </div>
          </div>

          <div class="mapping-content">
            <!-- 源端字段表格 -->
            <div class="panel source-panel" ref="sourceTableRef">
              <div class="panel-header">源端</div>
              <Table
                :columns="sourceColumns"
                :data-source="sourceFields"
                :pagination="false"
                :row-key="'id'"
                :row-class-name="
                  (record) =>
                    selectedSourceId === record.id ? 'selected-row' : ''
                "
                size="small"
                tableLayout="fixed"
                :custom-row="
                  (record) => ({
                    onMousedown: ($event) =>
                      handleSourceRowClick(record, $event),
                  })
                "
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'name'">
                    <div v-if="!record.isNew" class="field-text">
                      {{ record.name }}
                    </div>
                    <Input
                      v-else
                      v-model:value="record.name"
                      placeholder="字段名"
                      @blur="validateFieldName(record)"
                    />
                  </template>
                  <template v-else-if="column.key === 'type'">
                    <div v-if="!record.isNew" class="field-text">
                      {{ record.type }}
                    </div>
                    <Select
                      v-else
                      v-model:value="record.type"
                      placeholder="字段类型"
                      style="width: 100%"
                    >
                      <Option value="constant">constant</Option>
                      <Option value="expression">expression</Option>
                      <Option value="timestamp">timestamp</Option>
                    </Select>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <!-- 新增的行（尚未保存） -->
                    <template v-if="record.isNew">
                      <Space
                        size="small"
                        direction="horizontal"
                        :style="{ fontSize: '12px' }"
                      >
                        <Button
                          size="small"
                          type="link"
                          @click="saveSourceField(record)"
                          :disabled="!record.name.trim()"
                        >
                          保存
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          danger
                          @click="removeSourceField(record.id)"
                        >
                          删除
                        </Button>
                      </Space>
                    </template>
                    <!-- 已保存的新行（新增后已保存） -->
                    <template v-else-if="record.isAdded">
                      <Space
                        size="small"
                        direction="horizontal"
                        :style="{ fontSize: '12px' }"
                      >
                        <Button
                          size="small"
                          type="link"
                          @click="editSourceField(record)"
                        >
                          编辑
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          danger
                          @click="removeSourceField(record.id)"
                        >
                          删除
                        </Button>
                      </Space>
                    </template>
                    <!-- 原始行，没有任何操作 -->
                    <template v-else>
                      <!-- 什么都不显示 -->
                    </template>
                  </template>
                </template>
              </Table>
            </div>

            <!-- SVG连线区域 -->
            <div class="mapping-visualizer" ref="mappingVisualizerRef">
              <svg :width="svgWidth" :height="svgHeight" class="connection-svg">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#1890ff" />
                  </marker>
                  <!-- 新增红色箭头定义 -->
                  <marker
                    id="arrowhead-red"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ff4d4f" />
                  </marker>
                </defs>

                <g
                  v-for="connection in connections"
                  :key="`${connection.sourceId}-${connection.targetId}`"
                >
                  <!-- 透明的粗线条，用于增加点击热区 (不可见但可点击) -->
                  <line
                    :x1="connection.sourceX"
                    :y1="connection.sourceY"
                    :x2="connection.targetX"
                    :y2="connection.targetY"
                    stroke="transparent"
                    stroke-width="15"
                    class="connection-hit-area"
                    @click="removeMappingByConnection(connection)"
                  />

                  <!-- 实际的可见线条 -->
                  <line
                    :x1="connection.sourceX"
                    :y1="connection.sourceY"
                    :x2="connection.targetX"
                    :y2="connection.targetY"
                    stroke="#1890ff"
                    stroke-width="2"
                    marker-end="url(#arrowhead)"
                    class="connection-line"
                    pointer-events="none"
                  />
                </g>
              </svg>
            </div>

            <!-- 目标端字段表格 -->
            <div class="panel target-panel" ref="targetTableRef">
              <div class="panel-header">目标端</div>
              <Table
                :columns="targetColumns"
                :data-source="targetFields"
                :pagination="false"
                :row-key="'id'"
                :row-class-name="
                  (record) => (record.mappedSource ? 'mapped-row' : '')
                "
                size="small"
                tableLayout="fixed"
                :custom-row="
                  (record) => ({
                    onMousedown: ($event) =>
                      handleTargetRowClick(record, $event),
                  })
                "
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'type'">
                    <div class="field-text">
                      {{ record.type }}
                    </div>
                  </template>
                </template>
              </Table>
            </div>
          </div>

          <div class="mapping-info">
            <p>已映射字段: {{ mappedCount }} / {{ targetFields.length }}</p>
            <p class="instruction">
              操作提示：按住 Ctrl 键点击左侧源字段，再按住 Ctrl
              键点击右侧目标字段完成映射
            </p>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  watchEffect,
  watch,
} from "vue";
import { onActivated } from "vue"; // 引入 onActivated
import { useRealtimeWizardStore } from "#/store/realtime-wizard";
import {
  Card,
  Table,
  Input,
  Button,
  Select,
  message,
  Space,
  Switch,
} from "ant-design-vue";

interface FieldItem {
  id: string;
  name: string;
  type: string;
  mappedSource?: string; // 目标字段被哪个源字段映射
  mappedTarget?: string; // 源字段映射到哪个目标字段
  isNew?: boolean; // 标记是否为新增字段
  isAdded?: boolean; // 标记是否为新增后已保存的字段
  isMessageTimeField?: boolean; // 标记是否为消息时间字段
}

interface Connection {
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

// 使用 Store
const wizardStore = useRealtimeWizardStore();

// 生成唯一ID
const generateId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// 默认源端字段数据
const defaultSourceFields: FieldItem[] = [
  {
    id: generateId("source"),
    name: "id",
    type: "string",
    mappedTarget: "target-1",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "name",
    type: "string",
    mappedTarget: "target-2",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "email",
    type: "string",
    mappedTarget: "target-3",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "created_at",
    type: "string",
    mappedTarget: "target-4",
    isAdded: false,
  },
];

// 新的默认源端字段数据
const defaultSourceFields2: FieldItem[] = [
  {
    id: generateId("source"),
    name: "TRADE_ID",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "ACCEPT_MONTH",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "RELATION_ATTR",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "RELATION_TYPE_CODE",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "PRIMARY_USER_ID",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "MEM_USER_ID",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "PRIMARY_ROLE_CODE",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "MEM_ROLE_CODE",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "DISCNT_PRIORITY",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "MEM_SHORT_NUM",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "START_DATE",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "END_DATE",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "MODIFY_TAG",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "REMARK",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "PRIMARY_SERIAL_NUMBER",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "MEM_SERIAL_NUMBER",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "REL_ITEM_ID",
    type: "string",
    mappedTarget: "",
    isAdded: false,
  },
  {
    id: generateId("source"),
    name: "_is_deleted",
    type: "string",
    mappedTarget: "",
    isAdded: true,
  },
  {
    id: generateId("source"),
    name: "CURRENT_TIMESTAMP",
    type: "expression",
    mappedTarget: "",
    isAdded: true,
  },
  {
    id: generateId("source"),
    name: "ts",
    type: "timestamp",
    mappedTarget: "",
    isAdded: true,
  },
];

// 默认目标端字段数据
const defaultTargetFields: FieldItem[] = [
  { id: "target-1", name: "user_id", type: "string", mappedSource: "id" },
  { id: "target-2", name: "user_name", type: "string", mappedSource: "name" },
  { id: "target-3", name: "email", type: "string", mappedSource: "email" },
  {
    id: "target-4",
    name: "create_time",
    type: "string",
    mappedSource: "created_at",
  },
];

// 新的默认目标端字段数据
const defaultTargetFields2: FieldItem[] = [
  {
    id: generateId("target"),
    name: "trade_id",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "accept_month",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "relation_attr",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "relation_type_code",
    type: "string",
    mappedSource: "",
  },
  { id: generateId("target"), name: "id_a", type: "string", mappedSource: "" },
  { id: generateId("target"), name: "id_b", type: "string", mappedSource: "" },
  {
    id: generateId("target"),
    name: "role_code_a",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "role_code_b",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "orderno",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "short_code",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "start_date",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "end_date",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "modify_tag",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "remark",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "serial_number_a",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "serial_number_b",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "item_id",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "is_delete",
    type: "string",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "curr_timestamp",
    type: "timestamp",
    mappedSource: "",
  },
  {
    id: generateId("target"),
    name: "kafka_timestamp",
    type: "timestamp",
    mappedSource: "",
  },
];

// 源端字段数据 - 响应式引用
const sourceFields = ref<FieldItem[]>([]);

// 目标端字段数据 - 响应式引用
const targetFields = ref<FieldItem[]>([]);

// 初始化数据函数
const initData = () => {
  // 尝试从 Store 恢复数据
  const storedData = wizardStore.fieldMapping;

  if (
    storedData &&
    Array.isArray(storedData.sourceFields) &&
    storedData.sourceFields.length > 0
  ) {
    // 恢复源字段
    sourceFields.value = storedData.sourceFields.map((f: any, idx: number) => ({
      ...f,
      id: f.id || generateId("source"),
      isNew: false,
      isAdded: f.isCustom || false,
    }));

    // 恢复目标字段
    targetFields.value = storedData.targetFields.map((f: any, idx: number) => ({
      ...f,
      id: f.id || generateId("target"),
    }));

    // 恢复映射关系
    if (storedData.mappings) {
      storedData.mappings.forEach((m: any) => {
        const sourceField = sourceFields.value.find(
          (sf) => sf.name === m.sourceField
        );
        const targetField = targetFields.value.find(
          (tf) => tf.name === m.targetField
        );

        if (sourceField && targetField) {
          targetField.mappedSource = sourceField.name;
          sourceField.mappedTarget = targetField.id;
        }
      });
    }

    // 恢复消息时间字段开关状态
    enableMessageTimeField.value = storedData.enableMessageTimeField || false;
  } else {
    // 使用默认数据
    sourceFields.value = [...defaultSourceFields2];
    targetFields.value = [...defaultTargetFields2];
  }
};

// 选中的源字段ID
const selectedSourceId = ref<string | null>(null);

// SVG相关
const svgWidth = ref(100);
const svgHeight = ref(400);
const mappingVisualizerRef = ref<HTMLDivElement | null>(null);
const sourceTableRef = ref<HTMLDivElement | null>(null);
const targetTableRef = ref<HTMLDivElement | null>(null);

// 表格列定义
const sourceColumns = [
  {
    title: "字段",
    key: "name",
    dataIndex: "name",
    width: 100, // 进一步缩小宽度
  },
  {
    title: "类型",
    key: "type",
    dataIndex: "type",
    width: 80, // 进一步缩小宽度
  },
  {
    title: "操作",
    key: "action",
    width: 80, // 进一步缩小操作列宽度
  },
];

const targetColumns = [
  {
    title: "字段",
    key: "name",
    dataIndex: "name",
    width: 100, // 进一步缩小宽度
  },
  {
    title: "类型",
    key: "type",
    dataIndex: "type",
    width: 80, // 进一步缩小宽度
  },
];

// 计算属性：已映射字段数量
const mappedCount = computed(() => {
  return targetFields.value.filter((field) => field.mappedSource).length;
});

// 计算属性：连接线数据
const connections = ref<Connection[]>([]);

// 更新连线
const updateConnections = async () => {
  await nextTick(); // 确保DOM已更新

  if (!mappingVisualizerRef.value) {
    return;
  }

  // 获取容器的边界
  const visualizerRect = mappingVisualizerRef.value.getBoundingClientRect();
  if (visualizerRect.width === 0 || visualizerRect.height === 0) {
    return;
  }

  // 更新SVG的尺寸
  svgWidth.value = visualizerRect.width;
  svgHeight.value = visualizerRect.height;

  const newConnections: Connection[] = [];

  // 遍历所有目标字段，找到已映射的字段
  targetFields.value.forEach((target) => {
    if (target.mappedSource) {
      const source = sourceFields.value.find(
        (s) => s.name === target.mappedSource
      );
      if (source) {
        // 获取源表格和目标表格的DOM元素
        const sourceTable = sourceTableRef.value;
        const targetTable = targetTableRef.value;

        if (sourceTable && targetTable) {
          // 查找源字段行的位置
          const sourceRow = sourceTable.querySelector(
            `tbody tr[data-row-key="${source.id}"]`
          ) as HTMLElement;

          // 查找目标字段行的位置
          const targetRow = targetTable.querySelector(
            `tbody tr[data-row-key="${target.id}"]`
          ) as HTMLElement;

          if (sourceRow && targetRow) {
            const sourceRect = sourceRow.getBoundingClientRect();
            const targetRect = targetRow.getBoundingClientRect();

            // 计算相对于SVG的坐标
            const sourceY =
              sourceRect.top - visualizerRect.top + sourceRect.height / 2;
            const targetY =
              targetRect.top - visualizerRect.top + targetRect.height / 2;

            // X坐标：源字段右边，目标字段左边
            const sourceX = 0;
            const targetX = svgWidth.value;

            newConnections.push({
              sourceId: source.id,
              targetId: target.id,
              sourceX,
              sourceY,
              targetX,
              targetY,
            });
          }
        }
      }
    }
  });

  connections.value = newConnections;
};

// 处理源端字段行点击
const handleSourceRowClick = (record: FieldItem, event: MouseEvent) => {
  // 确保事件对象存在且有ctrlKey属性
  const hasCtrlKey =
    event &&
    typeof event === "object" &&
    "ctrlKey" in event &&
    (event as MouseEvent).ctrlKey;

  // 只有在按住Ctrl键时才选中源字段
  if (hasCtrlKey) {
    // 如果点击的已经是选中状态，则取消选中
    if (selectedSourceId.value === record.id) {
      selectedSourceId.value = null;
    } else {
      selectedSourceId.value = record.id;
    }
  }

  // 更新连线
  updateConnections();
};

// 处理目标端字段行点击
const handleTargetRowClick = (record: FieldItem, event: MouseEvent) => {
  // 确保事件对象存在且有ctrlKey属性
  const hasCtrlKey =
    event &&
    typeof event === "object" &&
    "ctrlKey" in event &&
    (event as MouseEvent).ctrlKey;

  // 只有在按住Ctrl键时才进行映射
  if (!hasCtrlKey) {
    message.info("按住 Ctrl 键并点击目标字段以建立映射");
    return;
  }

  if (!selectedSourceId.value) {
    message.warning("请先按住 Ctrl 键并选择一个源字段");
    return;
  }

  // 获取选中的源字段
  const selectedSource = sourceFields.value.find(
    (field) => field.id === selectedSourceId.value
  );
  if (!selectedSource) {
    message.error("找不到选中的源字段");
    return;
  }

  console.log(
    "准备建立映射，选中源字段:",
    selectedSource.id,
    selectedSource.name,
    "目标字段:",
    record.id,
    record.name
  );

  // 如果目标字段已有映射，先解除旧映射
  if (record.mappedSource) {
    console.log("目标字段已有映射，源字段名:", record.mappedSource);
    const oldSource = sourceFields.value.find(
      (field) => field.name === record.mappedSource
    );
    if (oldSource) {
      console.log(
        "解除旧映射: 目标字段",
        record.id,
        "不再映射到源字段",
        oldSource.id,
        oldSource.name
      );
      oldSource.mappedTarget = undefined;
    }
  }

  // 如果源字段已有映射到其他目标，先解除旧映射
  if (selectedSource.mappedTarget) {
    console.log("源字段已有映射到目标:", selectedSource.mappedTarget);
    const oldTarget = targetFields.value.find(
      (field) => field.id === selectedSource.mappedTarget
    );
    if (oldTarget) {
      console.log(
        "解除旧映射: 源字段",
        selectedSource.id,
        "不再映射到目标字段",
        oldTarget.id,
        oldTarget.name
      );
      oldTarget.mappedSource = undefined;
    }
  }

  // 建立新映射
  record.mappedSource = selectedSource.name;
  selectedSource.mappedTarget = record.id;

  console.log(
    "建立新映射: 源字段",
    selectedSource.id,
    selectedSource.name,
    "-> 目标字段",
    record.id,
    record.name
  );
  console.log(
    "当前映射状态:",
    JSON.stringify(getCurrentMappingStatus(), null, 2)
  );

  // 清除选中状态
  selectedSourceId.value = null;

  // 更新连线
  updateConnections();
};

// 保存新增的源字段
const saveSourceField = (record: FieldItem) => {
  if (!record.name.trim()) {
    message.warning("字段名不能为空");
    return;
  }

  // 检查是否有重复字段名
  const duplicateCount = sourceFields.value.filter(
    (field) => field.name === record.name && field.id !== record.id
  ).length;

  if (duplicateCount > 0) {
    message.warning(`字段名 "${record.name}" 已存在，请使用不同的名称`);
    return;
  }

  // 移除isNew标志，添加isAdded标志，表示该字段是新增后已保存的
  record.isNew = false;
  record.isAdded = true;
};

// 编辑源字段
const editSourceField = (record: FieldItem) => {
  // 设置为编辑状态（类似于新增状态）
  record.isNew = true;
};

// 删除源端字段
const removeSourceField = (id: string) => {
  if (sourceFields.value.length <= 1) {
    message.warning("至少需要保留一个字段");
    return;
  }

  const fieldIndex = sourceFields.value.findIndex((f) => f.id === id);
  if (fieldIndex !== -1) {
    const removedField = sourceFields.value[fieldIndex];

    // 清除目标字段中对该字段的映射
    targetFields.value.forEach((targetField) => {
      if (targetField.mappedSource === removedField.name) {
        targetField.mappedSource = undefined;

        // 同时清除源字段中的反向映射
        const sourceField = sourceFields.value.find(
          (sf) => sf.id === removedField.id
        );
        if (sourceField) {
          sourceField.mappedTarget = undefined;
        }
      }
    });

    sourceFields.value.splice(fieldIndex, 1);
    // 更新连线
    updateConnections();
  }
};

// 添加源端字段
const addSourceField = () => {
  sourceFields.value.push({
    id: generateId("source"),
    name: "",
    type: "expression",
    isNew: true, // 标记为新增字段，使其可编辑
    isAdded: false, // 标记为尚未添加完成
  });
  // 更新连线
  updateConnections();
};

// 验证字段名
const validateFieldName = (record: FieldItem) => {
  if (!record.name.trim()) {
    message.warning("字段名不能为空");
    return;
  }

  // 检查是否有重复字段名
  const duplicateCount = sourceFields.value.filter(
    (field) => field.name === record.name && field.id !== record.id
  ).length;

  if (duplicateCount > 0) {
    message.warning(`字段名 "${record.name}" 已存在，请使用不同的名称`);
    record.name = "";
  }
  // 更新连线
  updateConnections();
};

// 按名称映射（忽略大小写）
const mapByName = () => {
  let count = 0;

  // 先清除现有映射
  clearAllMappings();

  targetFields.value.forEach((targetField) => {
    const matchedSourceField = sourceFields.value.find(
      (sourceField) =>
        sourceField.name.toLowerCase() === targetField.name.toLowerCase()
    );

    if (matchedSourceField) {
      // 检查该源字段是否已被其他目标字段映射
      const isAlreadyMapped = targetFields.value.some(
        (tf) =>
          tf.id !== targetField.id &&
          tf.mappedSource?.toLowerCase() ===
            matchedSourceField.name.toLowerCase()
      );

      if (!isAlreadyMapped) {
        // 建立新映射
        targetField.mappedSource = matchedSourceField.name;
        matchedSourceField.mappedTarget = targetField.id;
        count++;
      }
    }
  });

  message.success(`按名称映射完成，共映射 ${count} 个字段`);
  // 更新连线
  updateConnections();
};

// 按顺序映射（同行映射）
const mapByOrder = () => {
  let count = 0;

  // 清除现有映射
  clearAllMappings();

  // 按索引顺序映射，取较短数组的长度
  const minLength = Math.min(
    sourceFields.value.length,
    targetFields.value.length
  );

  console.log(
    "开始同行映射，源字段数:",
    sourceFields.value.length,
    "目标字段数:",
    targetFields.value.length,
    "映射数量:",
    minLength
  );

  for (let i = 0; i < minLength; i++) {
    const sourceField = sourceFields.value[i];
    const targetField = targetFields.value[i];

    // 【防御性编程】确保字段存在且有名称
    if (sourceField && targetField && sourceField.name) {
      console.log(
        `映射 ${i}: 源字段 ${sourceField.id}(${sourceField.name}) -> 目标字段 ${targetField.id}(${targetField.name})`
      );

      // 建立映射关系
      targetField.mappedSource = sourceField.name;
      sourceField.mappedTarget = targetField.id;
      count++;
    } else {
      console.warn(
        `跳过索引 ${i} 的映射，源字段:`,
        !!sourceField,
        "目标字段:",
        !!targetField,
        "源字段名:",
        sourceField?.name
      );
    }
  }

  console.log(`同行映射完成，共映射 ${count} 个字段`);
  console.log(
    "当前映射状态:",
    JSON.stringify(getCurrentMappingStatus(), null, 2)
  );

  message.success(`按顺序映射完成，共映射 ${count} 个字段`);
  // 更新连线
  updateConnections();
};

// 清除所有映射
const clearAllMappings = () => {
  console.log("开始清除所有映射...");

  targetFields.value.forEach((field) => {
    if (field.mappedSource) {
      console.log(
        "清除目标字段",
        field.id,
        field.name,
        "的映射源:",
        field.mappedSource
      );
    }
    field.mappedSource = undefined;
  });

  sourceFields.value.forEach((field) => {
    if (field.mappedTarget) {
      console.log(
        "清除源字段",
        field.id,
        field.name,
        "的映射目标:",
        field.mappedTarget
      );
    }
    field.mappedTarget = undefined;
  });

  selectedSourceId.value = null;

  console.log("所有映射已清除");
  console.log(
    "当前映射状态:",
    JSON.stringify(getCurrentMappingStatus(), null, 2)
  );

  // 更新连线
  updateConnections();
};

// 添加一个辅助函数来获取当前映射状态
const getCurrentMappingStatus = () => {
  const mappings = [];
  targetFields.value.forEach((target) => {
    if (target.mappedSource) {
      const source = sourceFields.value.find(
        (sf) => sf.name === target.mappedSource
      );
      mappings.push({
        targetId: target.id,
        targetName: target.name,
        sourceId: source?.id,
        sourceName: target.mappedSource,
      });
    }
  });
  return mappings;
};

/**
 * 通过连线对象删除映射
 */
const removeMappingByConnection = (connection: Connection) => {
  console.log("尝试删除映射:", connection);

  // 1. 找到对应的源字段和目标字段
  const sourceField = sourceFields.value.find(
    (sf) => sf.id === connection.sourceId
  );
  const targetField = targetFields.value.find(
    (tf) => tf.id === connection.targetId
  );

  if (!sourceField || !targetField) {
    console.warn("未找到对应的字段进行删除");
    return;
  }

  // 2. 清除目标字段的 mappedSource
  targetField.mappedSource = undefined;

  // 3. 清除源字段的 mappedTarget
  sourceField.mappedTarget = undefined;

  // 4. 清除选中状态（如果有）
  if (selectedSourceId.value === sourceField.id) {
    selectedSourceId.value = null;
  }

  message.success(`已删除映射: ${sourceField.name} -> ${targetField.name}`);

  // 5. 更新连线
  updateConnections();
};

// 添加响应式数据
const enableMessageTimeField = ref(false);

// 监听开关状态变化
watchEffect(() => {
  if (enableMessageTimeField.value) {
    // 检查是否已存在名为 'ts' 的字段，避免重复添加
    const exists = sourceFields.value.some((field) => field.name === "ts");
    if (!exists) {
      sourceFields.value.push({
        id: generateId("source"),
        name: "ts",
        type: "timestamp",
        isAdded: false, // 标记为新增后已保存的字段，这样就不会显示编辑/删除按钮
        isMessageTimeField: true, // 标记为消息时间字段
      });
    }
  } else {
    // 关闭开关时，删除名为 'ts' 的字段
    const index = sourceFields.value.findIndex(
      (field) => field.isMessageTimeField
    );
    if (index !== -1) {
      sourceFields.value.splice(index, 1);
    }
  }
});

// 监听窗口大小变化
onMounted(() => {
  // 初始化数据（从 Store 恢复或使用默认值）
  initData();

  window.addEventListener("resize", updateConnections);

  // 初始化连线
  updateConnections();
});

// 1. 监听 Store 变化，自动回填表单（核心解决方案）
// watch(
//   () => wizardStore.fieldMapping,
//   (newVal) => {
//     if (newVal && newVal.sourceFields && newVal.sourceFields.length > 0) {
//       // 重新初始化数据
//       initData();
//       // 重新计算连线
//       nextTick(() => {
//         updateConnections();
//       });
//     }
//   },
//   { deep: true }
// );

onActivated(() => {
  console.log("fieldMapping onActivated");
  // 激活时同步
  if (
    wizardStore.fieldMapping &&
    wizardStore.fieldMapping.sourceFields &&
    wizardStore.fieldMapping.sourceFields.length > 0
  ) {
    initData();
    // 重新计算连线
    // 【关键修复】同样需要等待 DOM 更新
    nextTick(() => {
      nextTick(() => {
        updateConnections();
      });
    });
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", updateConnections);
});

// 使用 watchEffect 监听字段变化并更新连线
watchEffect(() => {
  // 监听源字段和目标字段的变化
  sourceFields.value;
  targetFields.value;
  // 使用 nextTick 确保 DOM 更新后再计算连线
  nextTick(() => {
    updateConnections();
  });
});

// 组织提交给后端的数据结构
interface FieldMappingSaveRequest {
  sourceFields: Array<{
    name: string;
    type: string;
    isCustom: boolean;
  }>;
  targetFields: Array<{
    name: string;
    type: string;
  }>;
  mappings: Array<{
    sourceField: string;
    targetField: string;
  }>;
}

const getSubmitData = (): FieldMappingSaveRequest => {
  // 1. 处理源端字段：提取 name 和 type，保持当前数组顺序
  const cleanSourceFields = sourceFields.value
    .filter((field) => field.name && field.name.trim() !== "") // 过滤掉未命名或空的临时行
    .map((field) => ({
      name: field.name,
      type: field.type,
      isCustom:
        field.isAdded || field.isNew || field.isMessageTimeField || false,
    }));

  // 2. 处理目标端字段：提取 name 和 type，保持当前数组顺序
  const cleanTargetFields = targetFields.value
    .filter((field) => field.name && field.name.trim() !== "")
    .map((field) => ({
      name: field.name,
      type: field.type,
    }));

  // 3. 处理映射关系：只提取已建立映射的项
  const validMappings = targetFields.value
    .filter((target) => target.mappedSource) // 只有 mappedSource 有值才表示有映射
    .map((target) => ({
      sourceField: target.mappedSource!, // 源字段名
      targetField: target.name, // 目标字段名
    }));

  return {
    sourceFields: cleanSourceFields,
    targetFields: cleanTargetFields,
    mappings: validMappings,
  };
};

// 测试数据结构按钮
const testDataStructure = () => {
  const submitData = getSubmitData();
  console.log("字段映射数据结构:", submitData);
  message.info("数据结构已打印到控制台，请查看");
};

// 获取字段映射数据
const getFieldMappingData = () => {
  return getSubmitData();
};

// 验证方法
const validate = () => {
  return new Promise<void>((resolve, reject) => {
    // 1. 检查是否存在未命名的源字段
    const hasEmptyName = sourceFields.value.some(
      (f) => !f.name || f.name.trim() === ""
    );
    if (hasEmptyName) {
      message.warning("存在未命名的源字段，请完善信息");
      reject(new Error("存在未命名的源字段"));
      return;
    }

    // 2. 检查是否有目标字段未映射
    const unmappedTargets = targetFields.value.filter(
      (field) => !field.mappedSource
    );
    if (unmappedTargets.length > 0) {
      message.warning(
        `还有 ${unmappedTargets.length} 个目标字段未建立映射关系`
      );
      reject(new Error("存在未映射的目标字段"));
      return;
    }

    // 3. 检查是否有至少一个映射关系
    if (mappedCount.value === 0 && targetFields.value.length > 0) {
      message.warning("请至少建立一个字段映射关系");
      reject(new Error("未建立任何字段映射"));
      return;
    }

    // 4. 检查目标字段是否为空
    if (targetFields.value.length === 0) {
      message.warning("目标字段不能为空，请重新选择");
      reject(new Error("目标字段为空"));
      return;
    }

    // 如果所有验证都通过
    resolve();
  });
};

// 监听本地字段数据变化，同步到 Store
watch(
  () => [sourceFields.value, targetFields.value, enableMessageTimeField.value],
  () => {
    // 构造要保存的数据结构
    const fieldMappingData = getSubmitData();

    // 更新到 Store
    wizardStore.setFieldMapping(fieldMappingData);
  },
  { deep: true }
);

// 如果需要暴露方法供父组件调用
defineExpose({
  getFieldMappingData,
  validate,
  testDataStructure,
});
</script>

<style scoped>
.card-title {
  display: flex;
  gap: 12px;
  align-items: center;
}

.title-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #177ddc 0%, #096dd9 100%);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgb(23 125 220 / 30%);
}

.config-content-wrapper {
  padding: 0 20px 20px;
}

.config-content {
  padding: 20px 0;
}

.mapping-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
}

.toolbar-left > *:not(:last-child) {
  margin-right: 8px;
}

.toolbar-right > *:not(:last-child) {
  margin-right: 8px;
}

.ml-2 {
  margin-left: 8px;
}

.mapping-content {
  display: flex;
  gap: 0;
  flex: 1;
  overflow: hidden;
  position: relative;
  margin-top: 16px;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e8e8e8;
  overflow: hidden;
  background: #fafafa;
  min-width: 0; /* 防止内容撑大flex项 */
}

/* 源端面板样式 */
.source-panel {
  border-radius: 6px 0 0 6px;
  border-right: none;
}

/* 目标端面板样式 */
.target-panel {
  border-radius: 0 6px 6px 0;
  border-left: none;
}

.mapping-visualizer {
  width: 100px;
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-shrink: 0; /* 防止可视化区域被压缩 */
}

.panel-header {
  padding: 8px 12px;
  background: #e6f7ff;
  border-bottom: 1px solid #91d5ff;
  font-weight: 500;
  color: #0050b3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mapping-visualizer {
  width: 100px;
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.connection-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* 点击热区样式：虽然透明，但鼠标放上去要变手型 */
.connection-hit-area {
  cursor: pointer;
  transition: stroke 0.3s;
}

/* 当鼠标悬停在热区时，让实际线条高亮，提示用户即将删除 */
.connection-hit-area:hover + .connection-line {
  stroke: #ff4d4f !important; /* 悬停时变红 */
  stroke-width: 3 !important;
  marker-end: url(#arrowhead-red) !important; /* 使用红色箭头 */
}

/* 确保可见线条不阻挡鼠标事件，交给 hit-area 处理 */
.connection-line {
  pointer-events: none;
  transition: stroke 0.3s, stroke-width 0.3s, marker-end 0.3s;
}

.mapping-info {
  margin-top: 16px;
  padding: 12px;
  background: #f0f2f5;
  border-radius: 4px;
  text-align: center;
}

.mapping-info p {
  margin: 0;
  font-size: 13px;
  color: #666;
}

.instruction {
  margin-top: 8px !important;
  font-size: 12px !important;
  color: #999 !important;
}

.selected-row {
  background-color: #e6f7ff !important;
}

.mapped-row {
  background-color: #f6ffed !important;
}

.field-text {
  cursor: default;
  padding: 0px 0px; /* 设置合适的内边距 */
}

/* 确保 Card 组件没有边框 */
:deep(.ant-card-bordered) {
  border: none !important;
}

:deep(.ant-table) {
  border: none;
  background: transparent;
}

:deep(.ant-table-wrapper) {
  flex: 1;
  overflow: auto;
}

:deep(.ant-table-thead > tr > th) {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f5f7fa;
}

:deep(.ant-table-tbody > tr.ant-table-row) {
  cursor: pointer;
  height: 24px; /* 设置表格行高度 */
  line-height: 16px; /* 设置行高 */
}

/* 1. 强制覆盖 Ant Design Table small size 的默认 padding */
:deep(.ant-table.ant-table-small .ant-table-tbody > tr > td) {
  padding: 2px 8px !important; /* 上下 padding 设为 2px，左右 8px */
  height: 24px !important; /* 强制单元格高度 */
  line-height: 20px !important; /* 行高略小于单元格高度，确保垂直居中 */
  box-sizing: border-box; /* 确保 padding 包含在 height 内 */
}

/* 2. 强制覆盖表头 padding，保持视觉一致 */
:deep(.ant-table.ant-table-small .ant-table-thead > tr > th) {
  padding: 4px 8px !important;
  height: 28px !important;
  line-height: 20px !important;
  box-sizing: border-box;
}

/* 3. 优化纯文本显示容器 .field-text */
.field-text {
  display: flex;
  align-items: center; /* 垂直居中 */
  height: 100%; /* 填满父单元格 */
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px; /* 适当减小字体以适配紧凑行高 */
  color: #333;
}

:deep(.ant-table-thead > tr > th) {
  height: 28px; /* 设置表头行高度 */
  line-height: 16px; /* 设置表头行高 */
  padding: 4px 8px; /* 设置合适的内边距 */
  font-weight: 600;
  background: #f5f7fa;
}

:deep(.ant-table-tbody > tr > td) {
  height: 24px; /* 设置表格数据行单元格高度 */
  line-height: 16px; /* 设置单元格行高 */
  padding: 2px 8px !important; /* 设置合适的内边距，使用 !important 确保生效 */
  white-space: nowrap; /* 强制不换行 */
  overflow: hidden; /* 隐藏溢出内容 */
  text-overflow: ellipsis; /* 超出部分显示省略号 */
}

:deep(.ant-table-cell) {
  word-break: break-all;
  border-right: none !important;
}

:deep(.ant-table-cell::before) {
  display: none;
}

:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
  background: #f5f7fa;
}

:deep(.ant-table-bordered .ant-table-thead > tr > th) {
  border-right: none;
}

.mr-2 {
  margin-right: 8px;
}

.message-time-label {
  margin-right: 8px;
  font-size: 14px;
  vertical-align: middle;
}

/* 在 <style scoped> 末尾添加 */

/* 1. 强制操作列内的 Space 组件紧凑 */
:deep(.ant-table-tbody .ant-space) {
  flex-wrap: nowrap; /* 防止按钮换行 */
  display: flex;
  align-items: center; /* 垂直居中对齐 */
  height: 100%; /* 占满单元格高度 */
}

/* 2. 强制操作列内的 Button 组件高度变小 */
:deep(.ant-table-tbody .ant-btn-link.ant-btn-sm) {
  height: 20px !important; /* 与行高一致，稍微小一点留出空间 */
  line-height: 20px !important; /* 行高一致 */
  padding: 0 4px !important; /* 减小左右内边距 */
  font-size: 12px !important; /* 字体稍小 */
  min-height: auto !important; /* 移除 Ant Design 默认的最小高度限制 */
  display: inline-flex !important; /* 使用 flex 显示以更好控制对齐 */
  align-items: center !important;
  justify-content: center !important;
}

/* 3. 如果按钮内部还有 span 或 icon，确保它们也居中且不撑开高度 */
:deep(.ant-table-tbody .ant-btn-link.ant-btn-sm > span) {
  display: inline-flex !important;
  align-items: center !important;
  height: 100% !important;
  line-height: 1 !important; /* 避免 line-height 影响垂直居中 */
}

/* 4. 确保操作列的 td 垂直居中对齐，且不允许内容撑开高度 */
:deep(.ant-table-tbody > tr > td:nth-child(3)) {
  /* nth-child(3) 对应你的 'action' 列 */
  vertical-align: middle !important;
  padding: 0 4px !important; /* 最小的 padding */
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 5. 确保输入框和选择框在编辑状态下也保持紧凑 */
:deep(.ant-table-tbody .ant-input),
:deep(.ant-table-tbody .ant-select) {
  height: 22px !important; /* 略小于单元格高度，留出边框余量 */
  min-height: 22px !important;
  line-height: 22px !important;
  padding: 0 4px !important;
  font-size: 12px !important;
  margin: 0;
}

:deep(.ant-table-tbody .ant-select .ant-select-selector) {
  height: 22px !important;
  padding: 0 4px !important;
  display: flex;
  align-items: center;
}

/* 点击热区样式：虽然透明，但鼠标放上去要变手型 */
.connection-hit-area {
  cursor: pointer;
  transition: stroke 0.3s;
}

/* 当鼠标悬停在热区时，让实际线条高亮，提示用户即将删除 */
.connection-hit-area:hover + .connection-line {
  stroke: #ff4d4f !important; /* 悬停时变红 */
  stroke-width: 3 !important;
  marker-end: url(#arrowhead-red) !important; /* 使用红色箭头 */
}

/* 确保可见线条不阻挡鼠标事件，交给 hit-area 处理 */
.connection-line {
  pointer-events: none;
  transition: stroke 0.3s, stroke-width 0.3s, marker-end 0.3s;
}
</style>

<script lang="ts">
export default {};
</script>
