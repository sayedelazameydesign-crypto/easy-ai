# easy-ai — قناة المزامنة الآمنة · Secure Sync Channel

قناة مزامنة مؤتمتة تنقل البيانات من **Google Drive** إلى **هذا المستودع** ثم إلى
**العالم الخارجي** عبر لوحة عامة على GitHub Pages — مع تنقيح كامل للأسرار قبل أي نشر.

```
Google Drive ──TLS/OAuth2──▶ GitHub Actions (كل ساعة)
     │
     ├─ 1) جلب   : تعداد المجلد + محتوى الملفات النصية (≤ 512KB)
     ├─ 2) تنقيح : المُحمِّر يحذف الأسرار/البريد/الهواتف/البطاقات تلقائيًا
     ├─ 3) خزنة  : لقطة خام مشفرة AES-256-GCM في vault/ (لا تُلتزم أبدًا)
     ├─ 4) تخزين : data/files.json + data/manifest.json (بصمات SHA-256)
     ├─ 5) بوابة : فحص أمني أخير — أي اشتباه = حجز المحتوى وعدم نشره
     └─ 6) نشر   : commit إلى المستودع + لوحة عامة على GitHub Pages
```

## الحالة الآن

أول دفعة بيانات حقيقية (مجلد **«1pro — بوابة التكاملات»**) متزامنة ومنشورة في
[`data/`](data/). المزامنة الساعية تبدأ تلقائيًا بعد إضافة أسرار Google
(التعليمات في [docs/SETUP.md](docs/SETUP.md)) ودمج الفرع في `main`.

- اللوحة العامة (بعد التفعيل): `https://sayedelazameydesign-crypto.github.io/easy-ai/`
- الواجهة العامة JSON: [`data/files.json`](data/files.json) ·
  [`data/manifest.json`](data/manifest.json) · [`data/latest.md`](data/latest.md)

## قاعدة العرض الصدقة

اللوحة لا تُظهر «متزامن» إلا إذا قال `manifest.json` ذلك. بلا أسرار تظهر
**«غير مُهيّأ»** مع **أسماء** المتغيرات الناقصة فقط (لا قيم أبدًا)، وبلا manifest
تظهر «غير معروف». لا حالة مُختلَقة — نفس فلسفة بوابة التكاملات.

## الإعداد السريع (5 دقائق)

في `Settings → Secrets and variables → Actions` أضف (التفاصيل الكاملة في
[docs/SETUP.md](docs/SETUP.md)):

| السر | الدور |
|---|---|
| `GOOGLE_DRIVE_REFRESH_TOKEN` | الثلاثي الدائم — قراءة Drive |
| `GOOGLE_DRIVE_CLIENT_ID` | 〃 (الثلاثي كلٌّ أو لا شيء) |
| `GOOGLE_DRIVE_CLIENT_SECRET` | 〃 |
| `GOOGLE_DRIVE_FOLDER_ID` | اختياري — تجاوز نطاق المجلد الافتراضي في `config/sync.yaml` |
| `SYNC_VAULT_KEY` | اختياري — تشفير اللقطات الخام محليًا (`openssl rand -hex 32`) |

أوضاع بديلة مدعومة: `GOOGLE_DRIVE_ACCESS_TOKEN` (تجربة قصيرة العمر) أو
`GOOGLE_SERVICE_ACCOUNT_JSON` (حساب خدمة — شاركه المجلد للقراءة).

## التشغيل محليًا

```bash
make install            # تثبيت المتطلبات
make doctor             # فحص البيئة — بلا شبكة وبلا طباعة أي قيمة
make sync               # مزامنة حقيقية (تحتاج الأسرار في البيئة)
python -m sync run --dry-run           # تجربة بلا كتابة في المستودع
python -m sync scan data --gate        # بوابة الفحص يدويًا
python -m sync decrypt vault/gdrive/snapshot-….bin   # فك لقطة خام (يحتاج SYNC_VAULT_KEY)
make test               # 47 اختبارًا
make preview            # معاينة اللوحة على http://localhost:8000
```

## البنية

| المسار | الدور |
|---|---|
| `sync/drive.py` | مصدر Drive — الأوضاع الثلاثة، أخطاء بلا أجسام responses |
| `sync/redact.py` | المُحمِّر — قيم الأسرار الحقيقية + الأنماط المعروفة |
| `sync/crypto.py` | خزنة AES-256-GCM + scrypt |
| `sync/scan.py` | بوابة الفحص — findings بلا نص مطابق أبدًا |
| `sync/store.py` | data/ + manifest بالبصمات وسجل التشغيلات |
| `sync/pipeline.py` | الدمج والحالات الصادقة (`ok / not_configured / error / blocked_scan`) |
| `site/index.html` | اللوحة العامة (RTL، بلا أي اعتماديات خارجية، آمنة XSS) |
| `.github/workflows/sync.yml` | القناة الساعية + النشر على Pages |
| `.github/workflows/ci.yml` | الاختبارات + بوابة الفحص لكل PR |

الأمان كاملًا في [SECURITY.md](SECURITY.md).

---

## English summary

An hourly, least-privilege GitHub Actions channel syncs a scoped Google Drive
folder into this repo: content is redacted (real secret values + pattern
scrubbing), raw snapshots are kept only as AES-256-GCM ciphertext in a
gitignored `vault/`, sanitized output lands in `data/` with SHA-256 manifests,
a scan gate quarantines anything secret-shaped before publication, and the
result is served to the world as a GitHub Pages dashboard plus stable public
JSON endpoints. Half-configured credentials are treated as *not configured*
(names reported, values never), and the dashboard never fabricates a status.
