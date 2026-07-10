// ===== 后端统一响应格式 =====
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// ===== 方向枚举 =====
export type Direction = '看涨' | '看跌' | '中性'

// ===== 单条预测 =====
export interface Prediction {
  article_id: number
  result_id?: number
  direction: Direction
  confidence: number
  company: string
  date: string
  reason?: string
  contract?: string | null
  need_manual_review?: boolean
}

export interface CompanyPrediction {
  article_id: number
  result_id?: number
  product: string
  product_key?: string
  product_group?: string
  contract?: string | null
  direction: Direction
  confidence: number
  date: string
  need_manual_review?: boolean
}

// ===== 品种页面 =====
export interface ProductItem {
  product: string
  product_key?: string
  product_group?: string
  predictions: Prediction[]
}

// ===== 期货公司页面 =====
export interface CompanyItem {
  company: string
  predictions: CompanyPrediction[]
}

// ===== 热力图（趋势分析页面） =====
export interface HeatmapData {
  date: string
  product: string
  product_key?: string
  product_group?: string
  value: number // 正值=看涨强度, 负值=看跌强度, 0=中性
}

// ===== 资讯文章 =====
export interface ArticleItem {
  id: number
  title: string
  source: string
  company: string
  publish_time: string
  summary?: string
  url?: string
}

// ===== 文章详情 =====
export interface ArticleDetail {
  article: {
    id: number
    title: string
    source: string
    company: string
    file_url: string | null
    file_type: string | null
    publish_time: string | null
    status: number
    error_msg: string | null
    created_at: string
    updated_at: string
    product: string | null
    product_key?: string | null
    product_group?: string | null
    direction: string | null
    reason: string | null
    confidence: number | null
    need_manual_review: boolean
    analysis_time: string | null
  }
  text: {
    raw_text: string | null
    cleaned_text: string | null
    refined_text: string | null
    raw_length: number
    cleaned_length: number
    refined_length: number
    parser_type: string | null
  } | null
  analysis_result: {
    id?: number
    product: string
    product_key?: string
    product_group?: string
    contract?: string | null
    contract_key?: string
    direction: string
    reason: string | null
    confidence: number
    analysis_method: string
    need_manual_review: boolean
    is_primary?: boolean
    model_name?: string | null
    llm_duration_ms?: number | null
    llm_retry_count?: number | null
    llm_error_msg?: string | null
    analysis_time: string | null
    evidence?: AnalysisEvidence
  } | null
  analysis_results: AnalysisResultItem[]
  task_logs: TaskLogItem[]
  manual_confirmations: ManualConfirmationItem[]
}

export interface EvidenceExcerpt {
  quote: string
  source: 'segment' | 'cleaned_text' | 'raw_text' | 'analysis_reason'
  start_char: number | null
  end_char: number | null
  match_type: 'reason' | 'keyword' | 'fallback'
}

export interface AnalysisEvidence {
  summary: string
  source: 'segment' | 'cleaned_text' | 'raw_text' | 'analysis_reason'
  section_type?: 'core' | 'ocr' | 'table' | 'ai' | 'mixed' | 'unknown'
  cleaned_text?: string
  refined_text?: string
  excerpts: EvidenceExcerpt[]
  notes: string
}

export interface AnalysisResultItem {
  id: number
  article_id: number
  product: string
  product_key?: string
  product_group?: string
  contract: string | null
  contract_key: string
  direction: string
  reason: string | null
  confidence: number
  analysis_method: string
  need_manual_review: boolean
  is_primary: boolean
  model_name: string | null
  llm_duration_ms: number | null
  llm_retry_count: number | null
  llm_error_msg: string | null
  analysis_time: string | null
  evidence?: AnalysisEvidence
}

export interface TaskLogItem {
  id: number
  article_id: number
  stage: string
  status: string
  message: string | null
  duration_ms: number | null
  created_at: string
}

export interface ManualConfirmationItem {
  id: number
  article_id: number
  original_product: string | null
  original_product_key?: string | null
  original_direction: string | null
  original_reason: string | null
  original_confidence: number | null
  confirmed_product: string
  confirmed_product_key?: string | null
  confirmed_direction: string
  confirmed_reason: string | null
  confirmed_confidence: number
  confirmed_by: string | null
  note: string | null
  confirmed_at: string
}

export interface ProductCatalogItem {
  product_key: string
  display_name: string
  official_name: string
  exchange: string
  symbol: string
  product_group: string
  active: boolean
}

export interface ProductResolutionItem {
  id: number
  article_id: number
  article_title: string
  raw_name: string
  excerpt: string | null
  suggested_product_key: string | null
  suggested_product: string | null
  resolved_product_key: string | null
  resolved_product: string | null
  confidence: number
  method: string
  status: string
  reviewed_by: string | null
  review_note: string | null
  created_at: string
  reanalysis_required?: boolean
}

export interface ProductAliasItem {
  id: number
  alias: string
  product_key: string
  product: string
  product_group: string
  status: string
  occurrence_count: number
  confidence: number
  reviewed_by: string | null
  review_note: string | null
  created_at: string
}

// ===== 方向对应的颜色和标签 =====
export const DIRECTION_CONFIG: Record<Direction, { color: string; bgColor: string; label: string }> = {
  '看涨': { color: '#e74c3c', bgColor: '#fce8e6', label: '涨' },
  '看跌': { color: '#27ae60', bgColor: '#e8f5e9', label: '跌' },
  '中性': { color: '#95a5a6', bgColor: '#f0f0f0', label: '稳' },
}
