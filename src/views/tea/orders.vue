<template>
  <div class="app-container">
    <el-form :inline="true" :model="query">
      <el-form-item label="订单/会员"><el-input v-model="query.keyword" clearable placeholder="订单号、昵称或手机号" @keyup.enter="load" /></el-form-item>
      <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部状态" style="width: 140px"><el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
      <el-form-item><el-checkbox v-model="query.reminded" true-value="1" false-value="" @change="load">仅待处理催发货</el-checkbox></el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="load">查询</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <el-form v-if="shippingOrder" ref="shipmentForm" :model="shipment" :rules="shipmentRules" label-width="100px" @submit.prevent="submitShipment">
      <el-form-item label="发货订单">{{ shippingOrder.orderSn }} · {{ shippingOrder.goodsName }}</el-form-item>
      <el-form-item label="收货信息">{{ shippingOrder.address.name }} {{ shippingOrder.address.phone }} {{ formatRegion(shippingOrder.address.region) }} {{ shippingOrder.address.detail }}</el-form-item>
      <el-form-item label="快递公司" prop="expressCompany"><el-input v-model.trim="shipment.expressCompany" maxlength="40" placeholder="填写实际承运公司" /></el-form-item>
      <el-form-item label="运单号" prop="expressNo"><el-input v-model.trim="shipment.expressNo" maxlength="40" placeholder="6至40位字母、数字或连字符" /></el-form-item>
      <el-form-item label="联系电话" prop="expressPhone"><el-input v-model.trim="shipment.expressPhone" maxlength="30" placeholder="可选，填写承运商联系电话" /></el-form-item>
      <el-form-item><el-button type="primary" :loading="shipping" @click="submitShipment">确认登记发货</el-button><el-button :disabled="shipping" @click="shippingOrder = null">取消填写</el-button></el-form-item>
    </el-form>
    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="orderSn" label="订单号" min-width="155" />
      <el-table-column prop="userName" label="会员" width="105" />
      <el-table-column prop="goodsName" label="商品" min-width="150" show-overflow-tooltip />
      <el-table-column prop="amount" label="金额" width="105"><template #default="scope">{{ Number(scope.row.orderType) === 5 ? scope.row.amount + ' 积分' : '¥ ' + scope.row.amount }}</template></el-table-column>
      <el-table-column prop="payStatus" label="支付" width="90" />
      <el-table-column prop="deliveryStatus" label="物流" width="90" />
      <el-table-column label="运单" min-width="160"><template #default="scope"><span v-if="scope.row.expressNo">{{ scope.row.expressCompany }}<br>{{ scope.row.expressNo }}</span><span v-else>未登记</span></template></el-table-column>
      <el-table-column prop="statusText" label="订单状态" width="95"><template #default="scope"><el-tag :type="tagType(scope.row.status)">{{ scope.row.statusText }}</el-tag></template></el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="165" />
      <el-table-column label="发货提醒" min-width="180"><template #default="scope"><template v-if="scope.row.reminderAt"><el-tag :type="scope.row.reminderStatus === '待处理' ? 'warning' : 'success'">{{ scope.row.reminderStatus }}</el-tag> {{ scope.row.reminderAt }}</template><span v-else>未提醒</span></template></el-table-column>
      <el-table-column label="操作" width="190" fixed="right"><template #default="scope"><el-button v-if="scope.row.status === 'forwarding'" v-hasPermi="['tea:orders:edit']" link type="primary" :disabled="shipping" @click="openShipment(scope.row)">登记发货</el-button><el-button v-if="scope.row.status === 'payment'" v-hasPermi="['tea:orders:edit']" link type="danger" @click="cancelOrder(scope.row)">取消订单</el-button></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { listTeaOrders, updateTeaOrder } from '@/api/tea'

const statuses = [{ value: 'payment', label: '待付款' }, { value: 'forwarding', label: '待发货' }, { value: 'received', label: '待收货' }, { value: 'evaluation', label: '待评价' }, { value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' }]
const loading = ref(false); const rows = ref([]); const total = ref(0)
const shippingOrder = ref(null); const shipping = ref(false); const shipmentForm = ref(null)
const shipment = reactive({ expressCompany: '', expressNo: '', expressPhone: '' })
const shipmentRules = {
  expressCompany: [{ required: true, message: '请填写快递公司', trigger: 'blur' }, { pattern: /^[^<>\x00-\x1f]{1,40}$/, message: '快递公司不能含特殊标记', trigger: 'blur' }],
  expressNo: [{ required: true, message: '请填写运单号', trigger: 'blur' }, { pattern: /^[A-Za-z0-9-]{6,40}$/, message: '运单号应为6至40位字母、数字或连字符', trigger: 'blur' }],
  expressPhone: [{ pattern: /^[+()\d -]{5,30}$/, message: '请填写有效联系电话', trigger: 'blur' }]
}
const query = reactive({ pageNum: 1, pageSize: 10, keyword: '', status: '', reminded: '' })
const formatRegion = region => region && typeof region === 'object' ? [region.province, region.city, region.region].filter(Boolean).join(' ') : String(region || '')
const tagType = (status) => ({ payment: 'warning', forwarding: 'primary', received: 'info', evaluation: 'warning', completed: 'success', cancelled: 'info' }[status] || 'info')
async function load() { loading.value = true; try { const { data } = await listTeaOrders(query); rows.value = data.rows || []; total.value = data.total || 0 } catch { /* request interceptor displays failure; keep the previous rows */ } finally { loading.value = false } }
function reset() { query.pageNum = 1; query.keyword = ''; query.status = ''; query.reminded = ''; load() }
function openShipment(row) { shippingOrder.value = row; Object.assign(shipment, { expressCompany: '', expressNo: '', expressPhone: '' }); nextTick(() => shipmentForm.value?.clearValidate()) }
async function submitShipment() {
  if (shipping.value || !shippingOrder.value) return
  if (!await shipmentForm.value.validate().catch(() => false)) return
  shipping.value = true
  try { await updateTeaOrder(shippingOrder.value.orderId, { status: 'received', ...shipment }); ElMessage.success('发货信息已保存'); shippingOrder.value = null; await load() }
  catch { /* retain the entered parcel for an explicit retry */ }
  finally { shipping.value = false }
}
async function cancelOrder(row) {
  try { await ElMessageBox.confirm(`取消未付款订单 ${row.orderSn} 并释放库存？`, '取消订单'); await updateTeaOrder(row.orderId, { status: 'cancelled' }); ElMessage.success('订单已取消'); await load() }
  catch { /* user cancellation is not an error; API failures are shown by the interceptor */ }
}
load()
</script>
