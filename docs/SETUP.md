# إعداد القناة — خطوة بخطوة

الترتيب مقصود: ابدأ بما يجعل القناة تعمل، ثم حسّن النطاق والتشفير.
كل الأسماء تطابق `sync/config.py` — ولا تُطبع أي قيمة في أي خطوة.

## 1) اعتماد Google Drive (اختر وضعًا واحدًا)

### الوضع الدائم (موصى به): ثلاثي refresh token

1. في [Google Cloud Console](https://console.cloud.google.com/): أنشئ مشروعًا،
   وفعّل **Google Drive API**.
2. أنشئ **OAuth Client ID** من نوع *Desktop app* (شاشة الموافقة: Internal أو
   External بحسابك).
3. احصل على `refresh_token` مرة واحدة — أسهل طريق هو
   [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/):
   - Settings ⚙️ → «Use your own OAuth credentials» → أدخل Client ID/Secret.
   - Step 1 → اختر النطاق `https://www.googleapis.com/auth/drive.readonly`
     (القناة تقرأ فقط ولا تكتب في Drive أبدًا).
   - Step 2 → Authorize ثم **Exchange authorization code for tokens** →
     انسخ `refresh_token`.
4. بدائل سطر الأوامر موجودة في أي دليل OAuth قياسي — القاعدة الوحيدة:
   **الثلاثي كلٌّ أو لا شيء**؛ نصف ثلاثي = «غير مُهيّأ» ولن تُلمس الشبكة.

### وضع تجربة: `GOOGLE_DRIVE_ACCESS_TOKEN`

رمز وصول قصير العمر (ساعة) من Playground مباشرة. لا يُجدَّد ولا يُخزَّن —
للتجربة فقط، وبعدها تعود القناة «غير مُهيّأ» بصدق.

### وضع حساب الخدمة: `GOOGLE_SERVICE_ACCOUNT_JSON`

أنشئ Service Account، وحمّل مفتاحه JSON، **وشارك مجلد Drive مع بريده**
(قارئ فقط). تعمل بلا تفويض مستخدم، لكنها ترى فقط ما تُشاركه معها.

## 2) أضف الأسرار إلى GitHub

في المستودع: `Settings → Secrets and variables → Actions → New repository secret`
أو بالطرفية (القيم تُدخل تفاعليًا — لا تكتبها في سطر الأوامر):

```bash
gh secret set GOOGLE_DRIVE_REFRESH_TOKEN   # الثلاثي الدائم
gh secret set GOOGLE_DRIVE_CLIENT_ID
gh secret set GOOGLE_DRIVE_CLIENT_SECRET
gh secret set SYNC_VAULT_KEY               # اختياري: openssl rand -hex 32
```

## 3) نطاق المزامنة (أي مجلد يُنشر للعالم)

الافتراضي مثبّت في `config/sync.yaml`:
مجلد **«1pro — بوابة التكاملات»** (`folder_id`). لتغيير النطاق:

- عدّل `drive.folder_id` في `config/sync.yaml` (يُلتزم — ليس سرًّا)، أو
- أضف سر `GOOGLE_DRIVE_FOLDER_ID` (يتجاوز الملف وقت التشغيل)، أو
- أزل القيمتين لمزامنة جذر «ملفاتي» كله (غير موصى به للنشر العام).

حدود المحتوى: ملفات نصية (`text/markdown`, `text/plain`, `application/json`)
حتى **512KB**، ومستندات Google Docs تُصدَّر نصًّا، وجداول Sheets تُصدَّر CSV.
ما عدا ذلك يُفهرس (اسم/رابط/توقيت) بلا محتوى.

## 4) فعّل القناة

1. ادمج فرع العمل في `main` — جدولة GitHub Actions تعمل من الفرع الافتراضي فقط.
2. Pages تُفعَّل تلقائيًا من workflow (`enablement: true`)؛ للتفعيل اليدوي:
   `Settings → Pages → Source: GitHub Actions`.
3. أول تشغيل: `Actions → secure-sync → Run workflow` (أو انتظر الدقيقة 17
   من كل ساعة).
4. تحقق بصدق: اللوحة يجب أن تعرض «متزامن» **فقط** بعد أن يقول
   `data/manifest.json` ذلك؛ وقبل إضافة الأسرار ستعرض «غير مُهيّأ» مع أسماء
   النواقص — وهذا سلوك صحيح لا عطل.

## 5) التحقق بعد الضبط

```bash
python -m sync doctor              # صحة البيئة — بلا شبكة وبلا قيم
python -m sync run --dry-run       # دورة كاملة بلا كتابة
python -m sync scan data --gate    # بوابة الفحص
make test                          # الاختبارات كاملة
```

## فك لقطة خام (للمالك فقط، محليًا)

```bash
SYNC_VAULT_KEY=… python -m sync decrypt vault/gdrive/snapshot-….bin
```

`vault/` لا يدخل git ولا يُنشر؛ اللقطات تُحفظ مشفرة AES-256-GCM ويبقى
أحدث 24 منها فقط.
