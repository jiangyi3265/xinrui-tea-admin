<template>
  <div class="app-container">
    <el-form :inline="true" :model="query" class="search-form">
      <el-form-item label="商品名称"><el-input v-model="query.keyword" clearable placeholder="请输入商品名称" @keyup.enter="load" /></el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="load">搜索</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <el-row :gutter="10" class="mb8"><el-col :span="1.5"><el-button v-hasPermi="['tea:products:add']" type="primary" icon="Plus" @click="openCreate">新增商品</el-button></el-col></el-row>
    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="goods_id" label="ID" width="75" />
      <el-table-column label="商品" min-width="260"><template #default="scope"><div class="product-cell"><el-image :src="scope.row.goods_image" fit="cover" /><span>{{ scope.row.goods_name }}</span></div></template></el-table-column>
      <el-table-column prop="goods_min_price" label="售价" width="120"><template #default="scope">¥ {{ scope.row.goods_min_price }}</template></el-table-column>
      <el-table-column prop="stock" label="库存" width="90" />
      <el-table-column prop="goods_sales" label="销量" width="90" />
      <el-table-column prop="status" label="状态" width="90"><template #default="scope"><el-tag :type="scope.row.approvalStatus === 10 ? 'success' : 'info'">{{ scope.row.status }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="180" fixed="right"><template #default="scope"><el-button v-hasPermi="['tea:products:edit']" link type="primary" @click="openEdit(scope.row)">编辑</el-button><el-button v-hasPermi="['tea:products:remove']" link type="danger" @click="remove(scope.row)">删除</el-button></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="load" />

    <el-dialog v-model="dialog.open" :title="dialog.title" width="520px" append-to-body>
      <el-form ref="formRef" :model="dialog.form" :rules="rules" label-width="90px">
        <el-form-item label="商品名称" prop="goods_name"><el-input v-model="dialog.form.goods_name" maxlength="60" /></el-form-item>
        <el-form-item label="分类"><el-select v-model="dialog.form.category_id"><el-option v-for="item in categories" :key="item.category_id" :value="item.category_id" :label="item.category_id ? item.name : '未分类'" /></el-select></el-form-item>
        <el-form-item label="商品描述"><el-input v-model="dialog.form.description" type="textarea" :rows="4" maxlength="5000" show-word-limit placeholder="填写已核实的商品介绍，纯文本" /></el-form-item>
        <el-form-item label="售价" prop="goods_min_price"><el-input-number v-model="dialog.form.goods_min_price" :min="0" :precision="2" :step="10" /></el-form-item>
        <el-form-item label="库存" prop="stock"><el-input-number v-model="dialog.form.stock" :min="0" :precision="0" /></el-form-item>
        <el-form-item label="图片地址"><el-input v-model="dialog.form.goods_image" placeholder="/h5/static/catalog/..." /></el-form-item>
        <el-form-item label="状态"><el-radio-group v-model="dialog.form.approvalStatus"><el-radio :value="10">上架</el-radio><el-radio :value="20">下架</el-radio></el-radio-group></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="saving" @click="dialog.open = false">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { listTeaProducts, listTeaCategories, addTeaProduct, updateTeaProduct, delTeaProduct } from '@/api/tea'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const categories = ref([{ category_id: 0, name: '全部商品' }])
const saving = ref(false)
const query = reactive({ pageNum: 1, pageSize: 10, keyword: '' })
const dialog = reactive({ open: false, title: '', form: {} })
const formRef = ref()
const rules = { goods_name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }], goods_min_price: [{ required: true, message: '请输入售价', trigger: 'change' }] }

function load() { loading.value = true; listTeaProducts(query).then(({ data }) => { rows.value = data.rows || []; total.value = data.total || 0 }).finally(() => { loading.value = false }) }
function reset() { query.pageNum = 1; query.keyword = ''; load() }
function openCreate() { dialog.title = '新增商品'; dialog.form = { goods_name: '', category_id: 0, description: '', goods_min_price: 0, stock: 0, approvalStatus: 10, goods_image: '/h5/static/catalog/a5134ccd3282cce5.jpg' }; dialog.open = true }
function openEdit(row) { dialog.title = '编辑商品'; dialog.form = { category_id: 0, description: '', ...row, goods_min_price: Number(row.goods_min_price), stock: Number(row.stock) }; dialog.open = true }
async function submit() { if (saving.value || !await formRef.value.validate().catch(() => false)) return; saving.value = true; try { await (dialog.form.goods_id ? updateTeaProduct(dialog.form.goods_id, dialog.form) : addTeaProduct(dialog.form)); ElMessage.success('保存成功'); dialog.open = false; load() } catch { /* preserve user input; interceptor reports the failure */ } finally { saving.value = false } }
function remove(row) { ElMessageBox.confirm(`确认删除“${row.goods_name}”吗？`, '提示', { type: 'warning' }).then(() => delTeaProduct(row.goods_id)).then(() => { ElMessage.success('删除成功'); load() }) }
load()
listTeaCategories().then(({ data }) => { categories.value = data.categoryList }).catch(() => { /* keep uncategorized option on read failure */ })
</script>

<style scoped>
.product-cell { display: flex; align-items: center; gap: 10px; }
.product-cell .el-image { width: 44px; height: 44px; border-radius: 4px; flex: 0 0 auto; }
.search-form { margin-bottom: 4px; }
</style>
