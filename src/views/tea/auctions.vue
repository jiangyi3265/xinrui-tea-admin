<template>
  <div class="app-container">
    <el-form :inline="true" :model="query">
      <el-form-item label="场次/商品"><el-input v-model="query.keyword" clearable placeholder="场次标题或商品 ID" @keyup.enter="load" /></el-form-item>
      <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部状态" style="width: 140px"><el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="load">查询</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <el-row :gutter="10" class="mb8"><el-col :span="1.5"><el-button v-hasPermi="['tea:auctions:add']" type="primary" icon="Plus" @click="openCreate">新建拍卖</el-button></el-col></el-row>
    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="auctionId" label="场次 ID" width="90" />
      <el-table-column prop="title" label="拍卖商品" min-width="220" show-overflow-tooltip />
      <el-table-column prop="startPrice" label="起拍价" width="105"><template #default="scope">¥ {{ scope.row.startPrice }}</template></el-table-column>
      <el-table-column prop="currentPrice" label="当前价" width="105"><template #default="scope">¥ {{ scope.row.currentPrice }}</template></el-table-column>
      <el-table-column prop="bidCount" label="出价次数" width="90" />
      <el-table-column prop="status" label="状态" width="100"><template #default="scope"><el-tag :type="tagType(scope.row.status)">{{ statusText(scope.row.status) }}</el-tag></template></el-table-column>
      <el-table-column prop="endTime" label="结束时间" width="190" />
      <el-table-column prop="winnerName" label="最高出价者" width="120" />
      <el-table-column label="操作" width="180" fixed="right"><template #default="scope"><el-button v-hasPermi="['tea:auctions:edit']" v-if="['scheduled', 'running'].includes(scope.row.status)" link type="warning" @click="close(scope.row)">结束拍卖</el-button><el-button v-hasPermi="['tea:auctions:remove']" v-if="['draft', 'scheduled'].includes(scope.row.status)" link type="danger" @click="cancel(scope.row)">取消</el-button></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />

    <el-dialog v-model="dialog.open" title="新建拍卖场次" width="540px" append-to-body>
      <el-form ref="formRef" :model="dialog.form" :rules="rules" label-width="100px">
        <el-form-item label="商品 ID" prop="goodsId"><el-input-number v-model="dialog.form.goodsId" :min="1" :precision="0" /></el-form-item>
        <el-form-item label="场次标题"><el-input v-model="dialog.form.title" maxlength="120" placeholder="默认使用商品名称" /></el-form-item>
        <el-form-item label="起拍价" prop="startPrice"><el-input-number v-model="dialog.form.startPrice" :min="0.01" :precision="2" :step="10" /></el-form-item>
        <el-form-item label="加价幅度" prop="bidIncrement"><el-input-number v-model="dialog.form.bidIncrement" :min="0.01" :precision="2" :step="10" /></el-form-item>
        <el-form-item label="拍卖数量" prop="quantity"><el-input-number v-model="dialog.form.quantity" :min="1" :precision="0" :step="1" /></el-form-item>
        <el-form-item label="开始时间" prop="startTime"><el-date-picker v-model="dialog.form.startTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss.SSSZ" placeholder="选择开始时间" /></el-form-item>
        <el-form-item label="结束时间" prop="endTime"><el-date-picker v-model="dialog.form.endTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss.SSSZ" placeholder="选择结束时间" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialog.open = false">取消</el-button><el-button type="primary" @click="submit">创建</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { addTeaAuction, cancelTeaAuction, listTeaAuctions, updateTeaAuction } from '@/api/tea'

const statuses = [{ value: 'scheduled', label: '待开始' }, { value: 'running', label: '进行中' }, { value: 'ended', label: '已结束' }, { value: 'settled', label: '已成交' }, { value: 'cancelled', label: '已取消' }]
const statusMap = Object.fromEntries(statuses.map(item => [item.value, item.label]))
const loading = ref(false); const rows = ref([]); const total = ref(0)
const query = reactive({ pageNum: 1, pageSize: 10, keyword: '', status: '' })
const dialog = reactive({ open: false, form: {} }); const formRef = ref()
const rules = { goodsId: [{ required: true, message: '请输入已上架商品 ID', trigger: 'change' }], startPrice: [{ required: true, message: '请输入起拍价', trigger: 'change' }], bidIncrement: [{ required: true, message: '请输入加价幅度', trigger: 'change' }], quantity: [{ required: true, message: '请输入正整数数量', trigger: 'change' }], startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }], endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }] }
const statusText = status => statusMap[status] || status
const tagType = status => ({ scheduled: 'info', running: 'success', ended: 'warning', settled: 'primary', cancelled: 'danger' }[status] || 'info')
function load() { loading.value = true; listTeaAuctions(query).then(({ data }) => { rows.value = data.rows || []; total.value = data.total || 0 }).finally(() => { loading.value = false }) }
function reset() { query.pageNum = 1; query.keyword = ''; query.status = ''; load() }
function openCreate() { const start = new Date(Date.now() + 5 * 60 * 1000); const end = new Date(Date.now() + 65 * 60 * 1000); dialog.form = { goodsId: 30, title: '', startPrice: 100, bidIncrement: 10, quantity: 1, startTime: start.toISOString(), endTime: end.toISOString() }; dialog.open = true }
function submit() { formRef.value.validate(valid => { if (!valid) return; addTeaAuction(dialog.form).then(() => { ElMessage.success('拍卖场次创建成功'); dialog.open = false; load() }) }) }
function close(row) { ElMessageBox.confirm(`确认结束“${row.title}”吗？结束后按最高出价确定成交人。`, '结束拍卖', { type: 'warning' }).then(() => updateTeaAuction(row.auctionId, { status: 'ended' })).then(() => { ElMessage.success('拍卖已结束'); load() }) }
function cancel(row) { ElMessageBox.confirm(`确认取消“${row.title}”吗？`, '取消拍卖', { type: 'warning' }).then(() => cancelTeaAuction(row.auctionId)).then(() => { ElMessage.success('拍卖已取消'); load() }) }
load()
</script>
