<template>
  <div class="app-container tea-dashboard">
    <el-row :gutter="16" class="metric-row">
      <el-col v-for="card in metricCards" :key="card.key" :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">{{ card.label }}</div>
          <div class="metric-value">{{ card.prefix }}{{ metrics[card.key] || 0 }}{{ card.suffix }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="16" class="content-row">
      <el-col :xs="24" :lg="14">
        <el-card shadow="never">
          <template #header><span>最近订单</span><el-button link type="primary" @click="$router.push('/tea/orders')">查看全部</el-button></template>
          <el-table :data="recentOrders" v-loading="loading" stripe>
            <el-table-column prop="orderSn" label="订单号" min-width="150" />
            <el-table-column prop="userName" label="会员" width="110" />
            <el-table-column prop="goodsName" label="商品" min-width="130" show-overflow-tooltip />
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="scope">{{ Number(scope.row.orderType) === 5 ? scope.row.amount + ' 积分' : '¥ ' + scope.row.amount }}</template>
            </el-table-column>
            <el-table-column prop="statusText" label="状态" width="90" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="10">
        <el-card shadow="never">
          <template #header><span>热销商品</span><el-button link type="primary" @click="$router.push('/tea/products')">管理商品</el-button></template>
          <el-table :data="topProducts" v-loading="loading">
            <el-table-column type="index" width="55" />
            <el-table-column prop="goodsName" label="商品" show-overflow-tooltip />
            <el-table-column prop="sales" label="已付数量" width="85" />
            <el-table-column prop="amount" label="余额销售额" width="105">
              <template #default="scope">¥ {{ scope.row.amount }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { getTeaDashboard } from '@/api/tea'

const loading = ref(true)
const metrics = ref({})
const recentOrders = ref([])
const topProducts = ref([])
const metricCards = [
  { key: 'products', label: '在售商品', prefix: '', suffix: ' 件' },
  { key: 'members', label: '注册会员', prefix: '', suffix: ' 人' },
  { key: 'orders', label: '累计订单', prefix: '', suffix: ' 笔' },
  { key: 'auctions', label: '进行中拍卖', prefix: '', suffix: ' 场' },
  { key: 'revenue', label: '已付余额订单金额', prefix: '¥ ', suffix: '' }
]

function load() {
  loading.value = true
  getTeaDashboard().then(({ data }) => {
    metrics.value = data.metrics || {}
    recentOrders.value = data.recentOrders || []
    topProducts.value = data.topProducts || []
  }).finally(() => { loading.value = false })
}
load()
</script>

<style scoped>
.metric-row, .content-row { margin-bottom: 16px; }
.metric-card { min-height: 116px; }
.metric-label { color: var(--el-text-color-secondary); font-size: 14px; }
.metric-value { margin-top: 15px; font-size: 27px; font-weight: 600; color: var(--el-text-color-primary); }
</style>
