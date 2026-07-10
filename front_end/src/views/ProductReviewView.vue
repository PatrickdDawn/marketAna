<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ProductAliasItem, ProductCatalogItem, ProductResolutionItem } from '../api/types'
import {
  confirmProductResolution,
  getPendingProductAliases,
  getPendingProductResolutions,
  getProductCatalog,
  reviewProductAlias,
  runArticleTask,
} from '../api/client'
import EmptyState from '../components/common/EmptyState.vue'
import ErrorState from '../components/common/ErrorState.vue'
import LoadingState from '../components/common/LoadingState.vue'

type ReviewTab = 'resolutions' | 'aliases'

const activeTab = ref<ReviewTab>('resolutions')
const catalog = ref<ProductCatalogItem[]>([])
const resolutions = ref<ProductResolutionItem[]>([])
const aliases = ref<ProductAliasItem[]>([])
const selectedKeys = ref<Record<number, string>>({})
const busy = ref<Record<number, string>>({})
const loading = ref(true)
const error = ref('')

const concreteCatalog = computed(() =>
  catalog.value.filter((item) => !item.product_key.startsWith('GROUP.')),
)

function isValidProductKey(productKey: string | undefined) {
  return !!productKey && concreteCatalog.value.some((item) => item.product_key === productKey)
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [catalogResult, resolutionResult, aliasResult] = await Promise.all([
      getProductCatalog(),
      getPendingProductResolutions(),
      getPendingProductAliases(),
    ])
    catalog.value = catalogResult.data
    resolutions.value = resolutionResult.data
    aliases.value = aliasResult.data
    for (const item of resolutions.value) {
      selectedKeys.value[item.id] = item.suggested_product_key || ''
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '审核数据加载失败'
  } finally {
    loading.value = false
  }
}

async function confirmAndRerun(item: ProductResolutionItem) {
  const productKey = selectedKeys.value[item.id]
  if (!productKey) return
  busy.value[item.id] = '正在确认并重新分析'
  try {
    await confirmProductResolution(item.id, productKey)
    await runArticleTask(item.article_id)
    await fetchData()
  } catch (cause) {
    busy.value[item.id] = cause instanceof Error ? cause.message : '重新分析失败'
    return
  }
  delete busy.value[item.id]
}

async function reviewAlias(item: ProductAliasItem, action: 'approve' | 'reject') {
  busy.value[item.id] = action === 'approve' ? '正在批准' : '正在拒绝'
  try {
    await reviewProductAlias(item.id, action)
    aliases.value = aliases.value.filter((candidate) => candidate.id !== item.id)
    delete busy.value[item.id]
  } catch (cause) {
    busy.value[item.id] = cause instanceof Error ? cause.message : '操作失败'
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="review-page">
    <header class="page-header">
      <div>
        <h1>品种审核</h1>
        <p>处理未知正文片段，并控制新别名何时进入全局匹配。</p>
      </div>
      <button class="refresh-button" type="button" title="刷新审核数据" @click="fetchData">刷新</button>
    </header>

    <div class="tabs" role="tablist" aria-label="审核类型">
      <button
        type="button"
        :class="{ active: activeTab === 'resolutions' }"
        @click="activeTab = 'resolutions'"
      >
        未知片段 <span>{{ resolutions.length }}</span>
      </button>
      <button
        type="button"
        :class="{ active: activeTab === 'aliases' }"
        @click="activeTab = 'aliases'"
      >
        别名候选 <span>{{ aliases.length }}</span>
      </button>
    </div>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" :on-retry="fetchData" />

    <template v-else-if="activeTab === 'resolutions'">
      <EmptyState v-if="resolutions.length === 0" message="没有待确认的未知品种" />
      <div v-else class="review-list">
        <article v-for="item in resolutions" :key="item.id" class="review-row">
          <div class="row-heading">
            <div>
              <strong>{{ item.raw_name || '无明确标题' }}</strong>
              <router-link :to="`/articles/${item.article_id}`">{{ item.article_title }}</router-link>
            </div>
            <span v-if="item.suggested_product" class="suggestion">
              建议 {{ item.suggested_product }} · {{ Math.round(item.confidence * 100) }}%
            </span>
          </div>
          <p class="excerpt">{{ item.excerpt || '无正文摘要' }}</p>
          <div class="row-actions">
            <input
              v-model="selectedKeys[item.id]"
              list="product-catalog-options"
              aria-label="搜索并选择标准品种"
              placeholder="输入品种名或代码搜索"
            >
            <datalist id="product-catalog-options">
              <option
                v-for="product in concreteCatalog"
                :key="product.product_key"
                :value="product.product_key"
                :label="`${product.display_name} · ${product.exchange} ${product.symbol}`"
              />
            </datalist>
            <button
              type="button"
              class="primary-button"
              :disabled="!isValidProductKey(selectedKeys[item.id]) || !!busy[item.id]"
              @click="confirmAndRerun(item)"
            >
              确认并重新分析
            </button>
            <span v-if="busy[item.id]" class="status-text">{{ busy[item.id] }}</span>
          </div>
        </article>
      </div>
    </template>

    <template v-else>
      <EmptyState v-if="aliases.length === 0" message="没有待审核的别名" />
      <div v-else class="review-list">
        <article v-for="item in aliases" :key="item.id" class="review-row alias-row">
          <div class="alias-main">
            <strong>{{ item.alias }}</strong>
            <span class="mapping-arrow">→</span>
            <span>{{ item.product }}</span>
            <small>{{ item.product_key }}</small>
          </div>
          <div class="alias-meta">
            <span>出现 {{ item.occurrence_count }} 次</span>
            <span>置信度 {{ Math.round(item.confidence * 100) }}%</span>
            <span>{{ item.product_group }}</span>
          </div>
          <div class="row-actions">
            <button type="button" class="primary-button" :disabled="!!busy[item.id]" @click="reviewAlias(item, 'approve')">
              批准
            </button>
            <button type="button" class="secondary-button" :disabled="!!busy[item.id]" @click="reviewAlias(item, 'reject')">
              拒绝
            </button>
            <span v-if="busy[item.id]" class="status-text">{{ busy[item.id] }}</span>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.review-page {
  width: min(1080px, 100%);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.page-header h1 {
  color: #1a1a2e;
  font-size: 24px;
  line-height: 1.3;
}

.page-header p {
  color: #77808c;
  font-size: 13px;
  margin-top: 5px;
}

.refresh-button,
.primary-button,
.secondary-button {
  border: 1px solid #cfd5dd;
  border-radius: 5px;
  cursor: pointer;
  font: inherit;
  min-height: 36px;
  padding: 7px 14px;
}

.refresh-button,
.secondary-button {
  background: #fff;
  color: #3d4652;
}

.primary-button {
  background: #2367d1;
  border-color: #2367d1;
  color: #fff;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tabs {
  border-bottom: 1px solid #dfe3e8;
  display: flex;
  gap: 24px;
  margin-bottom: 18px;
}

.tabs button {
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  color: #66707c;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  padding: 9px 2px;
}

.tabs button.active {
  border-bottom-color: #2367d1;
  color: #1c4f9f;
}

.tabs span {
  background: #e9edf2;
  border-radius: 10px;
  font-size: 11px;
  margin-left: 4px;
  padding: 1px 6px;
}

.review-list {
  display: grid;
  gap: 10px;
}

.review-row {
  background: #fff;
  border: 1px solid #dde2e8;
  border-radius: 6px;
  padding: 16px;
}

.row-heading,
.alias-main,
.alias-meta,
.row-actions {
  align-items: center;
  display: flex;
  gap: 12px;
}

.row-heading {
  justify-content: space-between;
}

.row-heading strong {
  color: #202631;
  font-size: 16px;
  margin-right: 12px;
}

.row-heading a {
  color: #2367d1;
  font-size: 13px;
}

.suggestion {
  color: #1f7a4d;
  font-size: 12px;
  white-space: nowrap;
}

.excerpt {
  color: #4d5662;
  line-height: 1.7;
  margin: 12px 0;
  max-height: 5.1em;
  overflow: hidden;
  white-space: pre-wrap;
}

.row-actions {
  flex-wrap: wrap;
}

input[list] {
  background: #fff;
  border: 1px solid #cfd5dd;
  border-radius: 5px;
  color: #252c35;
  min-height: 36px;
  min-width: min(360px, 100%);
  padding: 6px 10px;
}

.status-text {
  color: #9a5a10;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.alias-row {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(260px, 1fr) minmax(240px, auto) auto;
}

.alias-main strong {
  font-size: 16px;
}

.mapping-arrow {
  color: #8b949f;
}

.alias-main small,
.alias-meta {
  color: #7b8490;
  font-size: 12px;
}

@media (max-width: 760px) {
  .page-header,
  .row-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .alias-row {
    grid-template-columns: 1fr;
  }

  .suggestion {
    white-space: normal;
  }

  input[list] {
    min-width: 100%;
  }
}
</style>
