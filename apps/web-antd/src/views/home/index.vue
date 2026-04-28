<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Button, Card, Col, Row, Steps } from 'ant-design-vue';

const router = useRouter();
const activeStep = ref(0);

const Step = Steps.Step;

const steps = [
  {
    title: '配置数据源',
    description: '添加并配置源端和目标端数据连接',
    icon: 'lucide:database',
    color: '#478afd',
    bgColor: '#e6eeff',
    borderColor: '#d0e3ff',
  },
  {
    title: '选择采集任务',
    description: '根据业务需求选择合适的数据采集任务类型',
    icon: 'lucide:check-circle',
    color: '#722ed1',
    bgColor: '#f9f0ff',
    borderColor: '#efdbff',
  },
  {
    title: '填写源端目标端信息',
    description: '配置数据同步的源数据库和目标数据库',
    icon: 'lucide:clock',
    color: '#13c2c2',
    bgColor: '#e6fffb',
    borderColor: '#b5f5ec',
  },
  {
    title: '运行监控',
    description: '执行任务并实时监控运行状态和日志',
    icon: 'lucide:activity',
    color: '#fa8c16',
    bgColor: '#fff7e6',
    borderColor: '#ffe7ba',
  },
];

const stepDetails = [
  [
    '登录系统后，进入"数据源管理"页面',
    '点击"新建数据源"按钮',
    '选择数据源类型（MySQL、PostgreSQL、Hive等）',
    '填写数据源连接信息（主机、端口、数据库名、用户名、密码）',
    '测试连接成功后保存配置',
  ],
  [
    '进入"项目管理"，创建新项目或选择已有项目',
    '在项目中创建新的工作流',
    '从任务类型列表中选择需要的任务类型',
    '支持Shell、Python、Spark、Flink、DataX等多种任务',
    '根据任务要求配置相应参数',
  ],
  [
    '在任务配置中选择数据同步类型',
    '选择源端数据源（已配置的数据源）',
    '选择目标端数据源',
    '配置数据表映射关系',
    '设置字段类型转换和数据过滤规则',
  ],
  [
    '保存工作流并点击"上线"按钮',
    '可以手动执行或配置定时调度',
    '在"任务监控"页面查看执行状态',
    '支持查看实时日志和历史运行记录',
    '异常任务可查看详细错误信息并进行重跑',
  ],
];

const features = [
  {
    title: '数据源管理',
    description: '支持MySQL、PostgreSQL、Hive等多种数据源',
    icon: 'lucide:database',
    path: '/datasource',
    color: '#478afd',
    bgColor: '#e6eeff',
  },
  {
    title: '项目管理',
    description: '创建和管理数据采集工作流',
    icon: 'lucide:check-circle',
    path: '/projects',
    color: '#722ed1',
    bgColor: '#f9f0ff',
  },
  {
    title: '任务监控',
    description: '实时监控任务执行状态和日志',
    icon: 'lucide:activity',
    path: '/monitor',
    color: '#fa8c16',
    bgColor: '#fff7e6',
  },
];

const goToPage = (path: string) => {
  router.push(path);
};

const getStepPath = (index: number) => {
  const paths = ['/datasource', '/project', '/task', '/monitor'];
  return paths[index] || '/datasource';
};

const getStepActionTitle = (index: number) => {
  const titles = [
    '前往数据源管理',
    '前往项目管理',
    '创建数据同步任务',
    '查看任务监控',
  ];
  return titles[index] || '前往操作';
};
</script>

<template>
  <div class="home-container">
    <div class="main-wrapper">
      <div class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">
            <div class="badge-icon">U</div>
            <span>中国联通统一采集平台</span>
          </div>
          <h1 class="hero-title">数据采集与调度平台</h1>
          <p class="hero-subtitle">四个步骤轻松掌握数据采集与调度全流程</p>
          <Button
            type="primary"
            size="large"
            class="hero-button"
            @click="goToPage('/datasource')"
          >
            立即开始体验
          </Button>
        </div>
      </div>

      <div class="content-section">
        <div class="section-header">
          <!-- <div class="section-badge">使用流程</div> -->
          <h2 class="section-title">平台使用流程</h2>
          <p class="section-subtitle">简单四步，快速完成数据采集任务配置</p>
        </div>

        <Row :gutter="20" class="steps-row">
          <Col :span="6" v-for="(step, index) in steps" :key="step.title">
            <Card
              class="step-card"
              :class="{ 'step-card-active': activeStep === index }"
              :style="activeStep === index ? { borderColor: step.color } : {}"
              @click="activeStep = index"
            >
              <div
                class="step-icon-wrapper"
                :style="{
                  background: step.bgColor,
                  borderColor: step.borderColor,
                }"
              >
                <IconifyIcon
                  :icon="step.icon"
                  :style="{ fontSize: '28px', color: step.color }"
                />
              </div>
              <div class="step-number" :style="{ background: step.color }">
                {{ index + 1 }}
              </div>
              <h3 class="step-title">{{ step.title }}</h3>
              <p class="step-description">{{ step.description }}</p>
            </Card>
          </Col>
        </Row>

        <Card class="detail-card">
          <Row :gutter="24">
            <Col :span="16">
              <div
                class="detail-header"
                :style="{
                  background: steps[activeStep].bgColor,
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                }"
              >
                <div
                  class="detail-icon"
                  :style="{
                    background: '#fff',
                    border: `2px solid ${steps[activeStep].color}`,
                  }"
                >
                  <IconifyIcon
                    :icon="steps[activeStep].icon"
                    :style="{
                      fontSize: '24px',
                      color: steps[activeStep].color,
                    }"
                  />
                </div>
                <div>
                  <h3 class="detail-title" :style="{ color: '#1a1a2e' }">
                    {{ steps[activeStep].title }}
                  </h3>
                  <p class="detail-description" :style="{ color: '#666' }">
                    {{ steps[activeStep].description }}
                  </p>
                </div>
              </div>
              <Steps direction="vertical" :current="0" class="detail-steps">
                <Step
                  v-for="(detail, index) in stepDetails[activeStep]"
                  :key="index"
                  :title="detail"
                />
              </Steps>
            </Col>
            <Col :span="8">
              <div
                class="detail-action-card"
                @click="goToPage(getStepPath(activeStep))"
              >
                <div
                  class="action-icon-wrapper"
                  :style="{ background: steps[activeStep].color }"
                >
                  <IconifyIcon
                    :icon="steps[activeStep].icon"
                    :style="{ fontSize: '20px', color: '#fff' }"
                  />
                </div>
                <div class="action-content">
                  <h4 class="action-title">
                    {{ getStepActionTitle(activeStep) }}
                  </h4>
                  <p class="action-subtitle">点击进入对应页面开始操作</p>
                </div>
                <IconifyIcon
                  icon="lucide:arrow-right"
                  :style="{ fontSize: '18px', color: steps[activeStep].color }"
                />
              </div>

              <div class="quick-nav-section">
                <h4 class="quick-nav-title">快速导航</h4>
                <div class="quick-nav-grid">
                  <div
                    v-for="feature in features"
                    :key="feature.title"
                    class="quick-nav-item"
                    @click="goToPage(feature.path)"
                  >
                    <IconifyIcon
                      :icon="feature.icon"
                      :style="{ fontSize: '20px', color: '#155dfc' }"
                    />
                    <div class="quick-nav-item-title">{{ feature.title }}</div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        <div class="section-header">
          <h2 class="section-title">快速导航</h2>
          <p class="section-subtitle">快速访问常用功能模块</p>
        </div>

        <Row :gutter="20">
          <Col :span="8" v-for="feature in features" :key="feature.title">
            <Card class="feature-card" @click="goToPage(feature.path)">
              <div
                class="feature-icon"
                :style="{ background: feature.bgColor }"
              >
                <IconifyIcon
                  :icon="feature.icon"
                  :style="{ fontSize: '32px', color: feature.color }"
                />
              </div>
              <h3 class="feature-title">{{ feature.title }}</h3>
              <p class="feature-description">{{ feature.description }}</p>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  min-height: 100vh;
  padding: 20px;
  background: #f0f2f5;
}

.main-wrapper {
  max-width: 1600px;
  margin: 0 auto;
}

.hero-section {
  position: relative;
  padding: 20px 30px;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    #155dfc 0%,
    #6b4cfa 25%,
    #9810fa 50%,
    #7c3aed 75%,
    #155dfc 100%
  );
  background-size: 400% 400%;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgb(21 93 252 / 20%);
  animation: gradient-flow 15s ease infinite;
}

@keyframes gradient-flow {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 1000px;
  margin: 0 auto;
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 4px 12px;
  margin-bottom: 12px;
  background: rgb(255 255 255 / 15%);
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 50px;
  backdrop-filter: blur(10px);
}

.badge-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: bold;
  color: #155dfc;
  background: #fff;
  border-radius: 4px;
}

.hero-badge span {
  font-size: 11px;
  font-weight: 500;
  color: #fff;
}

.hero-title {
  margin-bottom: 6px;
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 20px rgb(0 0 0 / 10%);
}

.hero-subtitle {
  margin-bottom: 16px;
  font-size: 13px;
  color: rgb(255 255 255 / 90%);
}

.hero-button {
  height: 36px;
  padding: 0 20px;
  font-size: 13px;
  font-weight: 600;
  color: #155dfc;
  background: #fff;
  border: none;
  border-radius: 18px;
  box-shadow: 0 4px 15px rgb(0 0 0 / 10%);
  transition: all 0.3s;
}

.hero-button:hover {
  color: #155dfc;
  background: #f0f0f0;
  box-shadow: 0 6px 20px rgb(0 0 0 / 15%);
  transform: translateY(-2px);
}

.content-section {
  padding: 20px 0;
}

.section-header {
  margin-bottom: 24px;
  text-align: center;
}

.section-badge {
  display: inline-block;
  padding: 6px 16px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #155dfc, #9810fa);
  border-radius: 16px;
}

.section-title {
  margin-bottom: 8px;
  font-size: 32px;
  font-weight: 700;
  color: #1a1a2e;
}

.section-subtitle {
  font-size: 16px;
  color: #666;
}

.steps-row {
  margin-bottom: 40px;
}

.step-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  text-align: center;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 16px;
  transition: all 0.3s;
}

.step-card:hover {
  box-shadow: 0 20px 40px rgb(0 0 0 / 15%);
  transform: translateY(-8px);
}

.step-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border: 2px solid;
  border-radius: 16px;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0 auto 12px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
}

.step-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
}

.step-description {
  flex: 1;
  min-height: 40px;
  font-size: 13px;
  line-height: 1.5;
  color: #666;
}

.detail-card {
  margin-bottom: 20px;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgb(0 0 0 / 6%);
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.detail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-right: 16px;
  border-radius: 12px;
}

.detail-title {
  margin-bottom: 4px;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}

.detail-description {
  font-size: 14px;
  color: #666;
}

.detail-steps {
  margin-top: 20px;
}

.detail-action-card {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 20px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  transition: all 0.3s;
}

.detail-action-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 10%);
  transform: translateY(-2px);
}

.action-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-right: 12px;
  border-radius: 10px;
}

.action-content {
  flex: 1;
}

.action-title {
  margin-bottom: 4px;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
}

.action-subtitle {
  font-size: 12px;
  color: #888;
}

.quick-nav-section {
  padding: 20px;
  background: #f8f9fc;
  border-radius: 16px;
}

.quick-nav-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #666;
}

.quick-nav-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.quick-nav-item {
  padding: 12px;
  text-align: center;
  cursor: pointer;
  background: #fff;
  border-radius: 12px;
  transition: all 0.3s;
}

.quick-nav-item:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
  transform: translateY(-2px);
}

.quick-nav-item-title {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.feature-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  text-align: center;
  cursor: pointer;
  border-radius: 16px;
  transition: all 0.3s;
}

.feature-card:hover {
  box-shadow: 0 20px 40px rgb(0 0 0 / 15%);
  transform: translateY(-8px);
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 16px;
}

.feature-title {
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
}

.feature-description {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: #666;
}

@media (max-width: 1600px) {
  .main-wrapper {
    max-width: 1400px;
  }

  .hero-content {
    max-width: 900px;
  }
}

@media (max-width: 1400px) {
  .main-wrapper {
    max-width: 1200px;
  }

  .hero-content {
    max-width: 800px;
  }
}

@media (max-width: 1200px) {
  .main-wrapper {
    max-width: 100%;
  }

  .hero-content {
    max-width: 100%;
  }
}
</style>
