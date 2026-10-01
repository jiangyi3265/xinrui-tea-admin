<template>
  <div class="app-container">
    <el-form :inline="true" :model="query"><el-form-item label="会员"><el-input v-model="query.keyword" clearable placeholder="昵称、手机号或邀请码" @keyup.enter="load" /></el-form-item><el-form-item><el-button type="primary" icon="Search" @click="load">搜索</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item></el-form>
    <el-row class="mb8"><el-button v-hasPermi="['tea:members:add']" type="primary" icon="Plus" @click="createOpen = true">建立会员</el-button></el-row>
    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="memberId" label="会员ID" width="85" />
      <el-table-column prop="nickName" label="昵称" min-width="130" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="amount" label="余额" width="115"><template #default="scope">¥ {{ scope.row.amount }}</template></el-table-column>
      <el-table-column prop="score" label="我的利润" width="105" />
      <el-table-column prop="eCardNumber" label="燃料费余额" width="115" />
      <el-table-column prop="invitationCode" label="邀请码" width="110" />
      <el-table-column prop="parentId" label="邀请人ID" width="100" />
      <el-table-column prop="certification.status" label="身份核验" width="100" />
      <el-table-column prop="status" label="状态" width="95"><template #default="scope"><el-tag :type="scope.row.status === '正常' ? 'success' : 'danger'">{{ scope.row.status === '正常' ? '正常' : '已暂停' }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="380"><template #default="scope"><span v-hasPermi="['tea:members:edit']"><el-button link type="primary" @click="fuel.row = scope.row; fuel.open = true">充值燃料费</el-button><el-button link :type="scope.row.status === '正常' ? 'danger' : 'primary'" @click="toggle(scope.row)">{{ scope.row.status === '正常' ? '暂停账号' : '恢复账号' }}</el-button><el-button link type="primary" @click="resetPassword(scope.row)">重置密码</el-button><el-button v-if="scope.row.certification.status === '待审核'" link type="primary" @click="identity = scope.row">核验资料</el-button></span></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
    <el-drawer v-model="createOpen" title="建立会员" size="420px">
      <el-alert title="账号由管理员建立，资产初始为零。请核实邀请关系，保存后不能修改邀请人。" type="info" :closable="false" />
      <el-form label-position="top" @submit.prevent="create">
        <el-form-item label="昵称"><el-input v-model="form.nickName" maxlength="40" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" maxlength="11" /></el-form-item>
        <el-form-item label="邀请人邀请码（选填）"><el-input v-model="form.invitationCode" maxlength="30" /></el-form-item>
        <el-form-item label="登录密码（至少八位）"><el-input v-model="form.password" type="password" show-password autocomplete="new-password" /></el-form-item>
        <el-form-item label="交易密码（六位数字）"><el-input v-model="form.payPassword" type="password" maxlength="6" autocomplete="new-password" /></el-form-item>
        <el-button type="primary" :loading="saving" @click="create">保存会员</el-button>
      </el-form>
    </el-drawer>
    <el-drawer v-model="fuel.open" title="充值燃料费" size="420px">
      <template v-if="fuel.row">
        <el-alert title="会员线下向上家付款后，由后台录入充值。抢购成功时按售价的 2% 扣除，余额不足不能抢购。" type="info" :closable="false" />
        <p>会员：{{ fuel.row.nickName }}（{{ fuel.row.phone }}），当前燃料费余额 ¥{{ fuel.row.eCardNumber }}</p>
        <el-form label-position="top" @submit.prevent="rechargeFuel">
          <el-form-item label="充值金额（元，最多两位小数）"><el-input v-model="fuel.amount" maxlength="10" /></el-form-item>
          <el-form-item label="备注（如收款上家、转账凭证号）"><el-input v-model="fuel.remark" maxlength="100" /></el-form-item>
          <el-button type="primary" :loading="saving" @click="rechargeFuel">确认充值</el-button>
        </el-form>
      </template>
    </el-drawer>
    <el-drawer :model-value="!!identity" title="人工身份核验" size="420px" @close="identity = null">
      <template v-if="identity"><p>姓名：{{ identity.certification.name }}</p><p>证件末四位：{{ identity.certification.lastFour }}</p><p>核对线下证件后填写审核说明。</p><el-input v-model="identityRemark" type="textarea" placeholder="核验或驳回说明" /><el-button type="primary" :loading="saving" @click="verify('verify')">核验通过</el-button><el-button :loading="saving" @click="verify('rejectIdentity')">驳回</el-button></template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { listTeaMembers, updateTeaMember, addTeaMember } from '@/api/tea'
const createOpen = ref(false), saving = ref(false)
const form = reactive({ nickName: '', phone: '', password: '', payPassword: '', invitationCode: '' })
const identity = ref(null), identityRemark = ref('')
const fuel = reactive({ open: false, row: null, amount: '', remark: '' })
async function rechargeFuel() {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(fuel.amount) || Number(fuel.amount) <= 0) { ElMessage.error('请输入大于 0 且最多两位小数的金额'); return }
  saving.value = true
  try { await updateTeaMember(fuel.row.memberId, { action: 'rechargeFuel', amount: fuel.amount, remark: fuel.remark }); fuel.open = false; fuel.amount = ''; fuel.remark = ''; ElMessage.success('燃料费已充值'); await load() }
  finally { saving.value = false }
}
async function verify(action) { saving.value = true; try { await updateTeaMember(identity.value.memberId, { action, remark: identityRemark.value }); identity.value = null; identityRemark.value = ''; ElMessage.success('核验结果已保存'); await load() } finally { saving.value = false } }
async function resetPassword(row) { let result; try { result = await ElMessageBox.prompt('请输入至少八位新登录密码，原登录会话将被撤销。', '重置会员密码', { inputType: 'password', inputValidator: value => String(value || '').length >= 8 || '至少八位' }) } catch { return } await updateTeaMember(row.memberId, { action: 'resetPassword', password: result.value }); ElMessage.success('密码已重置') }
async function create() {
  saving.value = true
  try { await addTeaMember(form); createOpen.value = false; Object.keys(form).forEach(key => { form[key] = '' }); ElMessage.success('会员已建立'); load() }
  finally { saving.value = false }
}
const loading = ref(false); const rows = ref([]); const total = ref(0); const query = reactive({ pageNum: 1, pageSize: 10, keyword: '' })
function load() { loading.value = true; listTeaMembers(query).then(({ data }) => { rows.value = data.rows || []; total.value = data.total || 0 }).finally(() => { loading.value = false }) }
function reset() { query.pageNum = 1; query.keyword = ''; load() }
async function toggle(row) {
  const pause = row.status === '正常'
  let remark = ''
  try {
    if (pause) remark = (await ElMessageBox.prompt('暂停后该账号立即无法登录和使用，已登录的会话同时失效。可填写暂停原因（选填）。', '暂停账号使用', { inputPlaceholder: '暂停原因', confirmButtonText: '确认暂停', type: 'warning' })).value
    else await ElMessageBox.confirm('恢复后该账号可重新登录使用。', '恢复账号', { type: 'info' })
  } catch { return }
  await updateTeaMember(row.memberId, { action: pause ? 'pause' : 'resume', remark })
  ElMessage.success(pause ? '账号已暂停使用' : '账号已恢复使用'); load()
}
load()
</script>
