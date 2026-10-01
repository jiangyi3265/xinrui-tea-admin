<template>
  <div class="app-container">
    <el-form :inline="true" :model="query"><el-form-item label="会员"><el-input v-model="query.keyword" clearable placeholder="昵称、手机号或邀请码" @keyup.enter="load" /></el-form-item><el-form-item><el-button type="primary" icon="Search" @click="load">搜索</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item></el-form>
    <el-row class="mb8"><el-button v-hasPermi="['tea:members:add']" type="primary" icon="Plus" @click="createOpen = true">建立会员</el-button></el-row>
    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="memberId" label="会员ID" width="85" />
      <el-table-column prop="nickName" label="昵称" min-width="130" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="amount" label="余额" width="115"><template #default="scope">¥ {{ scope.row.amount }}</template></el-table-column>
      <el-table-column prop="score" label="积分" width="100" />
      <el-table-column prop="eCardNumber" label="上架券" width="100" />
      <el-table-column prop="invitationCode" label="邀请码" width="110" />
      <el-table-column prop="parentId" label="邀请人ID" width="100" />
      <el-table-column prop="certification.status" label="身份核验" width="100" />
      <el-table-column prop="status" label="状态" width="95"><template #default="scope"><el-tag :type="scope.row.status === '正常' ? 'success' : 'danger'">{{ scope.row.status }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="280"><template #default="scope"><span v-hasPermi="['tea:members:edit']"><el-button link type="primary" @click="toggle(scope.row)">{{ scope.row.status === '正常' ? '停用' : '启用' }}</el-button><el-button link type="primary" @click="resetPassword(scope.row)">重置密码</el-button><el-button v-if="scope.row.certification.status === '待审核'" link type="primary" @click="identity = scope.row">核验资料</el-button></span></template></el-table-column>
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
function toggle(row) { updateTeaMember(row.memberId, { status: row.status === '正常' ? '1' : '0' }).then(() => { ElMessage.success('会员状态已更新'); load() }) }
load()
</script>
