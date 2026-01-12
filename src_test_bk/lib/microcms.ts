// src/lib/microcms.ts
import { createClient, type MicroCMSQueries, type MicroCMSImage, type MicroCMSDate } from "microcms-js-sdk";

// ニュース記事の型定義（MicroCMSで作った項目と合わせます）
export type News = {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  title: string;
  content: string;
  date: string;
  category: string[]; // セレクト（複数選択可の場合）または string
  thumbnail?: MicroCMSImage;
};

export type NewsResponse = {
  totalCount: number;
  offset: number;
  limit: number;
  contents: News[];
};

// APIクライアントの作成
export const client = createClient({
  serviceDomain: import.meta.env.MICROCMS_SERVICE_DOMAIN,
  apiKey: import.meta.env.MICROCMS_API_KEY,
});

// ニュース一覧を取得する関数
export const getNews = async (queries?: MicroCMSQueries) => {
  return await client.get<NewsResponse>({ endpoint: "news", queries });
};

// ニュース詳細を取得する関数
export const getNewsDetail = async (contentId: string, queries?: MicroCMSQueries) => {
  return await client.getListDetail<News>({
    endpoint: "news",
    contentId,
    queries,
  });
};