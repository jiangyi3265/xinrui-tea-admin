<template>
  <div class="app-container">
    <el-form :inline="true" :model="query"><el-form-item label="公告标题"><el-input v-model="query.keyword" clearable placeholder="请输入公告标题" @keyup.enter="load" /></el-form-item><el-form-item><el-button type="primary" icon="Search" @click="load">搜索</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item></el-form>
    <el-row class="mb8"><el-button v-hasPermi="['tea:notices:add']" type="primary" icon="Plus" @click="openCreate">新增公告</el-button></el-row>
    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="noticeId" label="编号" width="80" /><el-table-column prop="noticeTitle" label="公告标题" min-width="220" /><el-table-column prop="noticeType" label="类型" width="100"><template #default="scope">{{ scope.row.noticeType === '2' ? '活动' : '通知' }}</template></el-table-column><el-table-column prop="status" label="状态" width="95"><template #default="scope"><el-tag :type="scope.row.status === '0' ? 'success' : 'info'">{{ scope.row.status === '0' ? '正常' : '隐藏' }}</el-tag></template></el-table-column><el-table-column prop="createBy" label="创建者" width="105" /><el-table-column prop="createTime" label="创建时间" width="165" /><el-table-column label="操作" width="160"><template #default="scope"><el-button v-hasPermi="['tea:notices:edit']" link type="primary" @click="openEdit(scope.row)">编辑</el-button><el-button v-hasPermi="['tea:notices:remove']" link type="danger" @click="remove(scope.row)">删除</el-button></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />
    <el-dialog v-model="dialog.open" :title="dialog.title" width="620px"><el-form ref="formRef" :model="dialog.form" :rules="rules" label-width="80px"><el-form-item label="标题" prop="noticeTitle"><el-input v-model="dialog.form.noticeTitle" maxlength="80" /></el-form-item><el-form-item label="类型"><el-radio-group v-model="dialog.form.noticeType"><el-radio value="1">通知</el-radio><el-radio value="2">活动</el-radio></el-radio-group></el-form-item><el-form-item label="状态"><el-radio-group v-model="dialog.form.status"><el-radio value="0">正常</el-radio><el-radio value="1">隐藏</el-radio></el-radio-group></el-form-item><el-form-item label="内容"><el-input v-model="dialog.form.noticeContent" type="textarea" :rows="6" /></el-form-item></el-form><template #footer><el-button @click="dialog.open = false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template></el-dialog>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { listTeaNotices, addTeaNotice, updateTeaNotice, delTeaNotice } from '@/api/tea'
const loading = ref(false); const rows = ref([]); const total = ref(0); const query = reactive({ pageNum: 1, pageSize: 10, keyword: '' }); const dialog = reactive({ open: false, title: '', form: {} }); const formRef = ref(); const rules = { noticeTitle: [{ required: true, message: '请输入公告标题', trigger: 'blur' }] }
function load() { loading.value = true; listTeaNotices(query).then(({ data }) => { rows.value = data.rows || []; total.value = data.total || 0 }).finally(() => { loading.value = false }) }
function reset() { query.pageNum = 1; query.keyword = ''; load() }
function openCreate() { dialog.title = '新增公告'; dialog.form = { noticeTitle: '', noticeType: '1', status: '0', noticeContent: '' }; dialog.open = true }
function openEdit(row) { dialog.title = '编辑公告'; dialog.form = { ...row }; dialog.open = true }
function submit() { formRef.value.validate(valid => { if (!valid) return; const action = dialog.form.noticeId ? updateTeaNotice(dialog.form.noticeId, dialog.form) : addTeaNotice(dialog.form); action.then(() => { ElMessage.success('保存成功'); dialog.open = false; load() }) }) }
function remove(row) { ElMessageBox.confirm(`确认删除“${row.noticeTitle}”吗？`, '提示', { type: 'warning' }).then(() => delTeaNotice(row.noticeId)).then(() => { ElMessage.success('删除成功'); load() }) }
load()
</script>
