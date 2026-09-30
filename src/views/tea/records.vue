<template>
  <div class="app-container">
    <el-alert :title="description" type="info" :closable="false" class="mb8" />
    <el-form :inline="true" @submit.prevent="search">
      <el-form-item label="查找"><el-input v-model="query.keyword" clearable placeholder="订单号、会员或商品" @keyup.enter="search" /></el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="search">查询</el-button><el-button icon="Refresh" @click="load">刷新</el-button></el-form-item>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="mb8" />
    <el-table v-loading="loading" :data="rows" border stripe empty-text="暂无业务记录，用户提交后会出现在这里">
      <el-table-column type="expand"><template #default="{ row }"><pre class="record-detail">{{ detail(row) }}</pre></template></el-table-column>
      <el-table-column v-for="column in columns" :key="column.key" :prop="column.key" :label="column.label" :min-width="column.width || 120" show-overflow-tooltip />
      <el-table-column label="状态" min-width="120"><template #default="{ row }">{{ statusText(row) }}</template></el-table-column>
      <el-table-column v-if="reviewable || resource === 'content' || resource === 'reports'" label="操作" width="210" fixed="right">
        <template #default="{ row }">
          <span v-hasPermi="['tea:' + resource + ':edit']">
            <el-button v-if="resource === 'content'" link type="primary" @click="editContent(row)">编辑内容</el-button>
            <el-button v-else-if="resource === 'reports'" link type="primary" :disabled="row.status === '已处理' || saving" @click="review(row, 'resolve')">填写处理结果</el-button>
            <template v-else>
              <el-button link type="primary" :disabled="!pending(row) || saving" @click="review(row, 'approve')">审核通过</el-button>
              <el-button link type="danger" :disabled="!pending(row) || saving" @click="review(row, 'reject')">驳回</el-button>
              <el-button v-if="imageOf(row)" link type="primary" @click="preview = imageOf(row)">查看凭证</el-button>
            </template>
          </span>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
    <el-drawer v-model="editor.open" title="商城内容配置" size="60%">
      <el-alert :title="contentHelp" type="info" :closable="false" />
      <el-form label-position="top" class="content-form" @submit.prevent="saveContent">
        <el-form-item :label="editor.id + ' · JSON 内容'"><el-input v-model="editor.text" type="textarea" :rows="22" aria-label="JSON 内容" /></el-form-item>
        <el-button type="primary" :loading="saving" @click="saveContent">保存</el-button>
        <el-button @click="editor.open = false">取消</el-button>
      </el-form>
    </el-drawer>
    <el-dialog :model-value="!!preview" title="付款凭证" width="600px" @close="preview = ''"><el-image :src="preview" fit="contain" style="width:100%" /></el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
const route = useRoute()
const resource = computed(() => String(route.query.resource || route.path.split('/').pop()))
const descriptions = {
  warehouse: '拍卖与抢购仓库。付款审核、寄卖审核与用户端读取同一份持久化记录。',
  settlements: '核对实际收款及凭证后审核。上传凭证本身不代表收款成功。',
  fees: '寄卖服务费审核。现金凭证通过后，仓库商品才进入寄卖中。',
  recharges: '核对实际收款后审核。通过仅入账一次，驳回不会增加积分。',
  withdrawals: '提现记录查询。前端尚无提现申请入口，当前不执行打款。',
  reports: '查看用户投诉并记录处理结果。',
  ledger: '账户余额、积分和上架券的实际增减记录，只读。',
  bids: '真实出价记录，只读；场次结束、库存和成交单请在拍卖管理中处理。',
  content: '管理现有 H5 内容数据。支付、短信和外部认证未配置时不会模拟成功。'
}
const description = computed(() => descriptions[resource.value] || '业务记录')
const reviewable = computed(() => ['settlements','fees','recharges'].includes(resource.value))
const columns = computed(() => {
  if (resource.value === 'content') return [{ key: 'id', label: '配置项' }, { key: 'route', label: '前端接口', width: 240 }]
  if (resource.value === 'bids') return [{ key: 'bidId', label: '出价编号' }, { key: 'auctionId', label: '场次' }, { key: 'userId', label: '会员' }, { key: 'amount', label: '出价金额' }, { key: 'createdAt', label: '时间', width: 180 }]
  return [{ key: 'recordId', label: '记录编号' }, { key: 'memberName', label: '会员' }, { key: 'phone', label: '手机号', width: 140 }, { key: 'order_no', label: '订单号', width: 160 }, { key: resource.value === 'ledger' ? 'title' : resource.value === 'reports' ? 'content_text' : 'goods_name', label: '业务内容', width: 200 }, { key: resource.value === 'fees' ? 'cash_amount' : resource.value === 'settlements' || resource.value === 'warehouse' ? 'pay_price' : 'amount', label: '金额' }, { key: 'create_time', label: '时间', width: 180 }]
})
const rows = ref([]), total = ref(0), loading = ref(false), saving = ref(false), error = ref(''), preview = ref('')
const query = reactive({ keyword: '', pageNum: 1, pageSize: 10 })
const editor = reactive({ open: false, id: '', text: '' })
const contentHelp = computed(() => editor.id === 'categories' ? '分类数组示例：[{"category_id":31,"name":"红茶"}]。编号必须唯一；正在被商品使用的分类不能移除。' : '保持原有字段结构。保存后用户端重新进入页面即可读取；不会改变页面样式。')
let sequence = 0
async function load() {
  const current = ++sequence; loading.value = true; error.value = ''
  try {
    const { data } = await request({ url: '/admin/tea/' + resource.value, method: 'get', params: query })
    if (current === sequence) { rows.value = data.rows || []; total.value = data.total || 0 }
  } catch { if (current === sequence) { rows.value = []; total.value = 0; error.value = '读取失败，请检查服务连接或访问权限后重试' } }
  finally { if (current === sequence) loading.value = false }
}
function search() { query.pageNum = 1; load() }
function pending(row) { return resource.value === 'recharges' ? row.status === 0 : resource.value === 'fees' ? row.status === 1 : row.pay_status === 1 }
function statusText(row) { return row.status_text || row.pay_status || row.status || (resource.value === 'content' ? (row.value === null ? '未配置' : '已配置') : '已记录') }
function imageOf(row) { return row.voucher_image || row.payment_voucher || row.pay_image || '' }
function detail(row) { return JSON.stringify(row, (key, value) => typeof value === 'string' && value.startsWith('data:image/') ? '[图片凭证，请点击查看凭证]' : value, 2) }
async function review(row, action) {
  let remark = ''
  try {
    if (action === 'approve') await ElMessageBox.confirm('请确认已核对实际收款。审核通过将更新会员资产或仓库状态。', '确认审核', { type: 'warning' })
    else { const result = await ElMessageBox.prompt(action === 'reject' ? '请输入驳回原因' : '请输入处理结果', '记录处理意见', { inputValidator: value => !!String(value || '').trim() || '不能为空' }); remark = result.value }
  } catch { return }
  saving.value = true
  try { await request({ url: '/admin/tea/' + resource.value + '/' + row.recordId, method: 'put', data: { action, remark, memberId: row.memberId } }); ElMessage.success('处理已保存'); await load() }
  finally { saving.value = false }
}
function editContent(row) { editor.id = row.id; editor.text = JSON.stringify(row.value ?? (['banners','navigation','circle','categories'].includes(row.id) ? [] : {}), null, 2); editor.open = true }
async function saveContent() {
  let value
  try { value = JSON.parse(editor.text) } catch { ElMessage.error('JSON 格式错误，尚未保存'); return }
  saving.value = true
  try { await request({ url: '/admin/tea/content/' + editor.id, method: 'put', data: { value } }); editor.open = false; ElMessage.success('内容已保存'); await load() }
  finally { saving.value = false }
}
watch(resource, () => { query.pageNum = 1; query.keyword = ''; load() }, { immediate: true })
</script>
<style scoped>
.record-detail { margin: 16px; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; }
.content-form { margin-top: 20px; }
</style>
