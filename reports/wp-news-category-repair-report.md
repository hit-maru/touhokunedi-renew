# WordPressニュースカテゴリ復旧 dry-run レポート

## 原因

microCMS側のカテゴリは現在すべて「ニュース」ですが、今回確認したWordPress XML側の投稿カテゴリも対象168記事すべて「お知らせ / news」のみでした。
そのため、このXMLだけでは「製品情報」「展示会」「イベント」へ分類する根拠がありません。

## 使用したデータ

- WordPress XML: `/Users/maruokahitoshimacbookpro/Downloads/WordPress.2026-05-29.xml`
- microCMS endpoint: `news`
- 既存対応表: `tmp/wp-import-repair/plan-2026-07-22T17-47-48-023Z.json`
- 実行モード: dry-run only

## 照合方法

1. 既存の本文復旧 plan JSON の `microCMS content ID -> WordPress post ID` 対応を最優先
2. 対応表の WordPress post ID が存在する場合、タイトル・日付キーも検証
3. 対応表がない場合のみ、HTMLエンティティ正規化済みタイトル + 公開日で完全一致
4. タイトル単独の曖昧一致は未使用

## WordPress側のカテゴリ名・slug一覧と件数

| カテゴリ名 |slug |件数 |
| --- |--- |--- |
| お知らせ |news |168 |

## 4カテゴリへの対応表

| WPカテゴリ名 |slug |正規化後 |根拠 |
| --- |--- |--- |--- |
| お知らせ |news |ニュース |WXR実データで唯一の投稿カテゴリ |

## 復旧前カテゴリ件数 / 復旧後予定カテゴリ件数

| カテゴリ |復旧前 |復旧後予定 |
| --- |--- |--- |
| 製品情報 |0 |0 |
| 展示会 |0 |0 |
| イベント |0 |0 |
| ニュース |168 |168 |

## 集計

- microCMS記事数: 168
- WordPress対象記事数: 168
- 一致数: 168
- 未一致数: 0
- 重複候補数: 0
- 要確認数: 0
- 変更対象数: 0
- 変更不要数: 168
- PATCH可能件数: 0

## 記事ごとの差分一覧

| ID |タイトル |公開日 |WP元カテゴリ |正規化後 |現在値 |変更前 |変更後 |照合方法 |確信度 |PATCH対象 |要確認理由 |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| bsrpqj1h2r-a |2026年入社式-本社工場 |2026-04-03 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 4-ls9gyqiq9 |健康経営優良法人2026（中小規模法人部門）認定 |2026-03-11 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 6w964egdpll |年始のご挨拶 |2025-12-31 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| m68u1oji8 |年末年始休業のお知らせ |2025-12-12 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| s2zuezki9 |「令和7年 青森県東方沖地震」により被災された方々へお見舞い申し上げます |2025-12-09 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| rzk6qzzom |ふくしま健康経営優良事業所2025認定 |2025-12-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| wp-6mcte0 |当社で活躍中の「ねじ女（ジョ）」達 |2025-10-29 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 7o3aqoc7t03 |第30回QCサークル発表会 |2025-10-24 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| wsu_ywqjoti |REIFふくしま2025出展 |2025-10-17 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| r_di-4n7m |ふくしま健康経営セミナー2025 |2025-09-11 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| dp04_pkcymqu |第29回QCサークル発表会 |2025-08-29 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| tonzkg82_b |&lt;会社見学>東日本旅客鉄道株式会社　盛岡保線設備技術センター様 |2025-08-27 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |normalized_title_and_date |high |no | |
| rrw7b8s2nai |「イクボス宣言」認証 |2025-08-21 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 7dratgeb8 |暑中お見舞い申し上げます。 |2025-08-04 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| c5flf9q7nq |ベルマークを寄付させていただきました |2025-07-16 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| dg_gwvekf |「空気のきれいな施設」認証 |2025-07-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| nea3eje-su-3 |BBQイベント開催 |2025-06-28 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 8h2ewehe9tcc |営業勉強会実施 |2025-06-24 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| zpds69xcvi |<会社見学>東日本旅客鉄道株式会社　横浜支社　大船保線技術センター様 |2025-06-03 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 5-3tbrb25f |技能実習生 技能検定実施 |2025-06-03 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 9xd95ihyeiw |異常気象災害時の対応訓練を実施しました |2025-05-27 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| mudvuo-bc |永年勤続優良従業員表彰 |2025-05-26 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| mb_nuiq5hb |近隣清掃実施 |2025-04-28 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 9ndy22qpdp3 |福島県次世代育成支援企業認定 |2025-04-16 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| k6eiz3w95 |To those affected by the massive earthquake in the area between Myanmar and Thailand on 28th of March |2025-04-02 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 3sj2s7pfe5xi |2025年入社式-東京営業部 |2025-04-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| zbi8x3-kvk |営業部門名称変更のお知らせ |2025-03-31 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| k02tjckrv1h |下請法について勉強会実施 |2025-03-28 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 9wrvj7lims4 |2025年入社式-本社工場 |2025-03-21 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| dkv6yb5ia6h |健康経営優良法人2025 認定 |2025-03-10 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| bcsi_ar-i13 |健康経営優良法人2025認定 |2025-03-10 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 3r37fclwhhnc |健康増進プロジェクト |2025-02-21 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 535pqtapt |年始のご挨拶 |2024-12-31 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| efo08p-_-x |全社で避難訓練を実施しました |2024-12-04 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 5-83r-pyb |安全講話 |2024-11-27 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| go_6g3-phka |東京営業所移転のお知らせ |2024-11-25 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| pg37fr4oa |社内スポーツイベント開催 |2024-11-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| tzjlnef5lfa |下請法勉強会の実施 |2024-10-25 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| i3zt95c2zg0i |第28回QCサークル発表会 |2024-10-25 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 6mwdm4f74s |REIFふくしま2024出展 |2024-10-18 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| rwa29nxfvh5r |「えるぼし」認定が新聞掲載されました |2024-10-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 45i7416pd |内定式を執り行いました |2024-10-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 6s8wca_2yk |地元就職魅力発見イベントへ参加しました！ |2024-09-30 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| d3oyjo4yv430 |「トモニン」取得  ～仕事と介護の両立支援企業～ |2024-09-17 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 4a-_2kopa |「えるぼし」認定交付式 |2024-09-13 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| uzkvag6z1ki |第54回仙台広告賞　大賞受賞 |2024-09-11 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| bxwsmqp0hb6 |第27回QCサークル発表会 |2024-08-30 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| puruu6kfc |26卒インターンシップ |2024-08-29 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| pxob7ceqhf |全国安全週間 |2024-07-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| dc61i0p4as |BBQイベント開催 |2024-06-10 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| ra54ocver31y |女性の活躍推進企業データベース公表のご案内 |2024-05-29 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 44f4cu4w8ad |永年勤続優良従業員表彰 |2024-05-27 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| tg7njxk709qt |避難訓練実施 |2024-05-21 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 5dyxyumtw5cr |いわき市 副市長来社 |2024-04-18 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 3ns8dgs07f |近隣清掃実施（中部工業団地） |2024-04-15 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| qmd0h0sztz1 |To those affected by the earthquake in Taiwan on 3rd of April |2024-04-04 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| ooqoyfnquu |女性活躍推進法・次世代育成支援対策推進法に基づく一般事業主行動計画 |2024-04-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| rjad0f06ik |2024年入社式 |2024-04-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| dpzoy6uno |健康経営優良法人2024認定 |2024-03-12 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| opgoi3z1b |2023いわきオープンファクトリー開催 |2024-02-28 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| j18c2k2t9a |「令和６年能登半島地震」により被災された方々へお悔やみとお見舞い申し上げます |2024-01-04 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| l7ik6bupm18 |新年のご挨拶 |2023-12-31 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| p8yyrbfdvxj9 |避難訓練 |2023-12-15 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| sbkvr215025 |地域清掃実施しました。 |2023-11-11 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| e-4cbax7l8 |第8回鉄道技術展出展のご案内 |2023-11-08 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| oq2wplu8v |安全講和 |2023-11-03 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 3byf_ebocfhk |第26回QCサークル発表会 |2023-10-31 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 76dzgx2vbdsw |REIFふくしま2023出展 |2023-10-16 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| tlf_6k2t3bt |学びの秋！適正取引講習会をみんなで受講 |2023-09-26 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| bxqw4c-v-6y |第25回QCサークル発表会 |2023-08-31 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| f3tr53dvdmxx |暑中お見舞い申し上げます。 |2023-08-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| r3msjr7d8p |全国安全週間「ゼロ災でいこう ヨシ！」 |2023-07-07 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| v8xnoor-x |いわき市立永崎小学校の生徒さんが来社されました |2023-07-06 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| qg_6j0k32i |高校生のためのもの作り企業ガイダンスに参加しました |2023-06-20 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| ypmqpb7qcfa |ラジオCM始まりました。 |2023-06-07 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| o5h4coj82za |避難訓練実施しました |2023-05-10 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| xz0u6fjo099 |2023年入社式 |2023-03-22 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 7p4w-dfojx2 |第9回ものづくり日本大賞　東北経済産業局長賞　受賞 |2023-03-03 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| g3c5fpjkkay |「みつけた！いわき企業ナビブック」に掲載されました。 |2023-02-06 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| a6bpupyeol |年始のご挨拶 |2022-12-31 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| qfvap_shk |年賀状廃止のお知らせ |2022-12-06 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| bugsga57t |AED講習実施 |2022-12-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| oh_wcm0cd3un |下請法勉強会実施 |2022-11-25 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| nsvl08adrd |近隣清掃活動実施 |2022-11-23 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| drl7-3smq6p |避難訓練実施 |2022-10-24 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 3yz40gsun |REIFふくしま2022 ご来場ありがとうございました |2022-10-18 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 2vnp318roq |地元の小学生と交流 |2022-10-11 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 887pmrdife12 |経済産業省性能評価完了 |2022-09-22 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| k_anyjpycb8 |ISO14001・45001の認証取得 |2022-09-22 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| zn5n9o3en |第23回　QCサークル発表会開催 |2022-08-29 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| brj9ri4tn |いわき市 副市長来社 |2022-07-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 76fg4u0_p |7月1日から全国安全週間 |2022-07-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| jjht_atmdto |避難訓練実施 |2022-05-27 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| zgxfkr_ii |新型コロナウィルス拡散防止対策～当社の取り組み⑰～ |2022-05-11 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| o4pcn9vefd |経済産業省性能評価完了 |2022-04-25 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| kh9b28s6sj |－当社の新型コロナ感染者の状況－ |2022-04-07 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| j_12f70x1lzl |3月31日のHP一時停止について |2022-04-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| e7lmdj1_ps |アルコールチェック義務化の勉強会を実施しました |2022-03-28 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| v28fjtszvz |3.16福島県沖地震 |2022-03-17 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 0t2sae6gt |ウクライナ人道危機救援金に募金しました。 |2022-03-16 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| m6swhk-n-d |パワハラについて学びました |2022-03-14 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| e44tipos2 |第22回　QCサークル発表会開催 |2022-01-24 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| k99yzqogxb1f |新型コロナウィルス拡散防止対策～当社の取り組み⑯～ |2022-01-17 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| kb2m1a27cg |年始のご挨拶 |2021-12-31 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 60bw36owi |第21回 QCサークル発表会開催 |2021-12-27 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 67bitqlhcyn |SDGs 当社の取組み |2021-12-14 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 2-ht8gpub |NC班 経営者協会会長賞 受賞 |2021-12-10 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| vnopautyn |金属熱処理技能検定合格 |2021-12-10 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| n5iimw-l1alz |第７回鉄道技術展へのご来場ありがとうございました |2021-12-03 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| qxku1m_we |第７回鉄道技術展に出展いたします |2021-11-18 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| mwjrv2i1pm |全社で避難訓練実施しました |2021-11-02 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| g06hes1xub7x |地域清掃活動実施 |2021-10-18 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| otvjibz0s3_6 |新型コロナウィルス拡散防止対策～当社の取り組み⑮～ |2021-10-04 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| dezf6eaq7 |下請法勉強会実施 |2021-10-04 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| lm12emzz1sh |ISO9001　鉄道車両部門まで認証範囲拡大 |2021-10-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| nwg0i7il7 |新型コロナウィルス拡散防止対策～当社の取り組み⑭～ |2021-09-16 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| o5ohss7f8 |JR東日本様より感謝状授与 |2021-09-03 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| xly30y-uhe |第20回QCサークル発表会開催 |2021-08-20 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| sixgd4t29h1 |仙台ラジオCMが金賞受賞 |2021-08-17 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| lqeouaqp8 |第19回 QCサークル発表会開催 |2021-07-23 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 0qau9jo3w |新型コロナウィルス拡散防止対策～当社の取り組み⑬～ |2021-07-12 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| qumuo0azs40a |新型コロナウィルス拡散防止対策～当社の取り組み⑫～ |2021-06-21 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 9a93wf9pu2f |新型コロナウィルス拡散防止対策～当社の取り組み⑪～ |2021-04-26 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| fwj9h5sbyr |全社で避難訓練実施しました |2021-04-20 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| fk4uglbeni |2021年度入社式を行いました |2021-03-24 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 69lfgdzqy3h |新型コロナウィルス拡散防止対策～当社の取り組み⑩～ |2021-03-22 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| hoj3e6z937v |BCP：安否確認訓練を実施しました |2021-03-12 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| m14as5k5l |新型コロナウィルス拡散防止対策～当社の取り組み⑨～ |2021-03-08 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| skhoyc06nlce |2.13福島県沖地震後の当社の状況について |2021-02-15 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| phx2w97j7 |新型コロナウィルス拡散防止対策～当社の取り組み⑧～ |2021-02-04 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| e5cmw8gsw3s |第18回　オンラインＱＣサークル発表会を行いました |2021-01-18 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| neg1blsjxv3 |年末年始のお知らせ |2020-12-14 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| qr6shcvp987 |新型コロナウィルス拡散防止対策～当社の取り組み⑦～ |2020-12-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 4wla0g5f3lw |第17回　オンラインＱＣサークル発表会を行いました |2020-11-24 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| jg1cpyivm |ＲＥＩＦふくしま2020　ご来場いただきありがとうございました |2020-10-30 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| l25c3tuxss7 |新型コロナウィルス拡散防止対策～当社の取り組み⑥～ |2020-10-06 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| gf561z7ymxwe |おかげさまで設立70周年 |2020-09-15 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| la0s5beud |第16回　オンラインＱＣサークル発表会を開催しました |2020-08-11 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 72rp_l4wnk |新型コロナウィルス拡散防止対策～当社の取り組み⑤～ |2020-08-06 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 7trp7o7cq |第15回　オンラインＱＣサークル発表会を開催しました |2020-07-26 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| u_t-gz3nbf |新型コロナウィルス拡散防止対策～当社の取り組み④～ |2020-06-29 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| k_htd7btx4 |新型コロナウィルス拡散防止対策～当社の取り組み③～ |2020-06-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| j4egmo2qudw |新型コロナウィルス拡散防止対策～当社の取り組み②～【東京営業所一部在宅勤務、営業時間短縮実施のご連絡】 |2020-04-06 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 60xkll_yq7r |当社　郡山営業所　電子マネー PayPayを導入しました |2020-03-31 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| lngyuiibto |新型コロナウィルス拡散防止対策～当社の取り組み①～ |2020-03-23 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 1la8vs2ubv |ねじラボ・共同研究成果報告会を実施しました |2020-01-19 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| fyggaop30 |年末年始休業のお知らせ |2019-12-17 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| u689hadux1 |第14回　ＱＣサークル発表会を開催しました |2019-12-16 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| pen3_01wk |第6回　鉄道技術展ご来場いただきありがとうございました |2019-12-02 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| qljct9nme |ＲＥＩＦ2019　ご来場いただきありがとうございました |2019-11-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 1inhe76hnod |台風19号被害状況 |2019-10-14 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| m3x09qdjfcl |再エネ推進の参議院議員 河野義博氏、地元 まやま祐一氏が当社を視察 |2019-09-24 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| qc9qwjs16 |第13回　ＱＣサークル活動発表会開催 |2019-09-23 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| d1rupbykx2lr |ＢＢＱイベント開催 |2019-07-13 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| sxvtrmx1c |ゴールデンウィークの休業のお知らせ |2019-04-17 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 9vdue306a62 |第12回QCサークル発表会を開催しました |2019-02-23 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 0gnve4n7a |いわき市 清水市長に来社いただきました |2018-05-21 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| wc5_hrwx1 |BCP：避難訓練を実施しました |2018-05-10 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| v_3hkzl22te |地域未来牽引企業に選定されました |2018-04-14 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 4m13fn343n |第10回QCサークル発表会を開催しました |2018-03-24 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 3sv9p59uaa6 |新潟日報に掲載されました |2018-03-10 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| d2v11177ig |第9回QCサークル発表会を開催しました |2018-01-27 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 02gvy_k6r8 |若手幹部育成 「企業活性化プロジェクト」を修了しました |2017-12-18 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| 64rxcx8wb1 |第5回 鉄道技術展2017に出展しました |2017-12-01 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| bsymtxz4o6k |再生可能エネルギー REIFふくしま2017に出展しました |2017-11-09 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| bb_df_ao6 |社内研修に伴う営業時間の一部変更のお知らせ 10/27 午後～ |2017-10-06 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| pl20_6cmzes7 |【人財育成】ISO2015年版移行の社内勉強会 |2017-07-21 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |
| rtmcacvgex |社内スポーツイベント |2017-05-18 |お知らせ (news) |ニュース |ニュース |ニュース |ニュース |existing_correspondence_title_date_verified |high |no | |

## 未一致一覧

_なし_

## 複数候補一覧

_なし_

## 複数カテゴリ記事一覧

_なし_

## 未確定カテゴリ一覧

_なし_

## PATCHを止めるべき問題の有無

あり。WordPress XMLに4分類の元データがなく、カテゴリ復旧PATCHで「製品情報」「展示会」「イベント」を復元できません。
