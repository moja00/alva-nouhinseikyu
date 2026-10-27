/**
 * sample-data.js
 * 動作確認用および初期状態用のリアルな日本語ビジネスサンプルデータ
 */

export const SAMPLE_DOCUMENTS = {
  invoice: {
    id: 'sample_inv_001',
    docType: 'invoice',
    docNumber: 'INV-202609-082',
    issueDate: '2026-09-15',
    dueDate: '2026-10-31',
    title: 'コーポレートサイトリニューアル及び運用保守（8月分）',
    endUserName: '',
    client: {
      name: 'アークス・テクノロジー株式会社',
      honorific: '御中',
      zip: '107-0062',
      address: '東京都港区南青山3-5-1 青山タワープレイス 12F',
      contactPerson: 'デジタル推進部 田中 健一 様'
    },
    issuer: {
      name: 'スタジオ・ネクサス合同会社',
      invoiceNumber: 'T9012345678901',
      zip: '150-0043',
      address: '東京都渋谷区道玄坂1丁目20-8 渋谷インフォスタワー 7F',
      tel: '03-6800-9988',
      fax: '',
      email: 'billing@nexus-studio.example.com',
      bankInfo: '三菱UFJ銀行 渋谷支店 (店番: 135)\n普通預金 0987654\n口座名義: ド）スタジオネクサス',
      stampDataUrl: '',
      showStamp: true
    },
    items: [
      {
        id: 'sample_item_1',
        name: 'Webサイトリニューアル UI/UX設計・Figmaデザイン作成',
        quantity: 1,
        unit: '式',
        unitPrice: 350000,
        taxRate: 10,
        note: '第1期フェーズ'
      },
      {
        id: 'sample_item_2',
        name: 'フロントエンド実装・レスポンシブWebコーディング',
        quantity: 1,
        unit: '式',
        unitPrice: 280000,
        taxRate: 10,
        note: 'HTML5/Tailwind/JS'
      },
      {
        id: 'sample_item_3',
        name: 'CMS（WordPress/Headless）導入・管理画面カスタマイズ',
        quantity: 1,
        unit: '式',
        unitPrice: 180000,
        taxRate: 10,
        note: 'カスタム投稿3種'
      },
      {
        id: 'sample_item_4',
        name: '月額クラウドサーバー運用保守（2026年9月度）',
        quantity: 1,
        unit: '月',
        unitPrice: 40000,
        taxRate: 10,
        note: '24時間監視含む'
      },
      {
        id: 'sample_item_5',
        name: 'プロジェクト管理用資材・リファレンス書籍（軽減税率対象）',
        quantity: 2,
        unit: '冊',
        unitPrice: 4200,
        taxRate: 8,
        note: '公式ガイド本'
      }
    ],
    taxFractionRule: 'floor',
    notes: '・お振込手数料は貴社にてご負担いただけますようお願い申し上げます。\n・ご請求内容に関するご質問やお支払期日のご相談は、担当（support@nexus-studio.example.com）までご連絡ください。',
    themeColor: 'indigo'
  },
  delivery: {
    id: 'sample_del_001',
    docType: 'delivery',
    docNumber: 'DEL-202609-015',
    issueDate: '2026-09-15',
    dueDate: '2026-09-22',
    title: 'オフィス備品およびPC周辺機器の納品',
    client: {
      name: 'グローバル・イノベーション株式会社',
      honorific: '御中',
      zip: '100-0005',
      address: '東京都千代田区丸の内1-2-1 丸の内ビルディング 18F',
      contactPerson: '総務部 佐藤 翔太 様'
    },
    issuer: {
      name: 'スタジオ・ネクサス合同会社',
      invoiceNumber: 'T9012345678901',
      zip: '150-0043',
      address: '東京都渋谷区道玄坂1丁目20-8 渋谷インフォスタワー 7F',
      tel: '03-6800-9988',
      fax: '',
      email: 'billing@nexus-studio.example.com',
      bankInfo: '',
      stampDataUrl: '',
      showStamp: true
    },
    items: [
      {
        id: 'del_item_1',
        name: '27インチ 4Kモニター（USB-C給電対応）',
        quantity: 5,
        unit: '台',
        unitPrice: 48000,
        taxRate: 10,
        note: '型番: MON-4K-27'
      },
      {
        id: 'del_item_2',
        name: 'エルゴノミック メッシュチェア（ハイバック）',
        quantity: 5,
        unit: '脚',
        unitPrice: 62000,
        taxRate: 10,
        note: 'ブラック / 肘掛付'
      },
      {
        id: 'del_item_3',
        name: '来客用ドリップコーヒー＆緑茶セット（軽減税率対象）',
        quantity: 4,
        unit: '箱',
        unitPrice: 3800,
        taxRate: 8,
        note: '賞味期限: 12ヶ月'
      }
    ],
    taxFractionRule: 'floor',
    notes: '・納品物をご確認の上、受領印をいただけますようお願い申し上げます。\n・初期不良等の交換対応は納品日より14日以内にご連絡ください。',
    themeColor: 'emerald'
  }
};
