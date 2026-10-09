# AI backend design (P1-B)

## Scope and deployment decision

P1-B adds one server-side text-chat API. It does not add tools, autonomous agents,
image analysis, speech, translation, or summarization. Static GitHub Pages remains
an explicitly labelled demo because Pages cannot run this Python backend.

The implemented adapter targets OpenAI's HTTPS chat-completions endpoint on a fixed
host. Production activation is **not approved by this change**. A real response is
only possible when an operator deliberately runs the backend with server-side
configuration.

## Provider and hosting review — P1-B historical snapshot

This subsection records the state known while P1-B was implemented. At that point,
on 2026-10-08, official SDK/repository documentation confirmed that all candidate
APIs require server-side credentials, but pricing, free-tier, card, and regional
eligibility had not yet been independently verified in that work phase. The later
**P1-C** section below supersedes this subsection for current pricing, availability,
and policy research while preserving this text as historical context. Neither
section constitutes provider or hosting approval. Consequently, this project makes
no claim of free or zero-cost operation and enables no hosted provider by default.

| Option | Applicability | Billing/free-tier decision | Operational risk |
|---|---|---|---|
| OpenAI API | Implemented as the single adapter; fixed official API host | Requires operator verification and an explicit spending limit before production | Quota, billing, model lifecycle, and provider outage |
| Google Gemini API | Technically viable, but would require a second adapter | Not adopted; current eligibility and billing must be checked first | Quota and regional availability changes |
| Groq API | Technically viable, but would require a second adapter | Not adopted; current free limits and production terms must be checked first | Free-tier exhaustion and model availability |

Hosting comparison:

| Host type | Result |
|---|---|
| GitHub Pages | Frontend only; cannot host `/api/chat` |
| Local Python process | Supported and testable; recommended for P1-B verification |
| Managed container/function | Possible later, but no platform is selected because public abuse controls, pricing, persistence for distributed rate limiting, and billing were not verified |

Before any production deployment, an operator must review the provider's current
official pricing and terms, configure a provider-side hard spending/quota limit,
and add an upstream authenticated gateway or equivalent abuse protection. The
in-memory limiter is defense-in-depth for one process, not protection for a public,
distributed deployment.

## API contract

`GET /api/status` returns:

```json
{"status":"ok","chat":"implemented"}
```

or `not_configured` when no server provider is active.

`POST /api/chat` accepts only:

```json
{"messages":[{"role":"user","content":"Hello"}]}
```

Roles are limited to `user` and `assistant`. The final message must be from the
user. Unknown fields, oversized bodies, excessive history, and invalid types are
rejected.

Success returns `{"status":"ok","reply":"..."}`. Safe failure statuses are:

- `not_configured`
- `invalid_request`
- `rate_limited`
- `provider_timeout`
- `provider_error`

Provider response bodies, credentials, and internal exception text are never
returned. Request content is not logged by the development server.

## Configuration

All values are server-side environment variables:

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | Must be `openai` for the implemented adapter |
| `AI_MODEL` | Operator-selected model identifier |
| `AI_API_KEY` | Server-only provider credential |
| `AI_ALLOWED_ORIGINS` | Comma-separated exact browser origins |
| `AI_TIMEOUT_SECONDS` | Provider timeout, default 20 seconds |
| `AI_RATE_LIMIT_REQUESTS` | Per-process/IP requests per minute, default 20 |

No provider URL can be supplied by a browser request. The adapter endpoint is fixed
in server code to prevent SSRF or arbitrary proxying. The adapter sends a bounded
`max_completion_tokens` value as well as enforcing the response character limit.

## Frontend/backend origins

The browser uses same-origin `/api` by default. If a future deployment puts the
backend on another origin, set the reviewed public HTTPS origin in the static page:

```html
<meta name="easy-ai-api-base" content="https://api.example.com">
```

The client rejects a cross-origin HTTP URL. Configure `AI_ALLOWED_ORIGINS` on the
backend with the exact HTTPS frontend origin (no wildcard). A configured allowlist
requires an `Origin` header and supports a restricted CORS preflight. This is only
browser access policy: it is not authentication. A public deployment still needs
an authenticated reverse proxy/API gateway, distributed rate limiting, quotas,
and abuse monitoring. TLS must terminate at a trusted proxy or managed host, and
`AI_API_KEY` must be supplied from that host's secret manager rather than a file in
the web root.

The development server deliberately uses the socket peer address and ignores
`X-Forwarded-For`. A future trusted proxy deployment must define and test an
explicit trusted-proxy policy before using forwarded addresses for rate limiting.

## Local operation

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
export AI_PROVIDER=openai
export AI_MODEL='operator-reviewed-model-id'
export AI_API_KEY='server-side-only'
export AI_ALLOWED_ORIGINS='http://localhost:8000'
.venv/bin/python -m backend --host 127.0.0.1 --port 8000
```

Without these settings the API reports `not_configured`, while the frontend stays
in its visibly labelled demo mode. It never presents preset responses as provider
output.

## Security limits

- 20 messages per conversation by default.
- 4,000 characters per message and 12,000 total input characters.
- 8,000 output characters.
- 64 KiB HTTP body cap.
- Fixed provider endpoint and network timeout.
- Exact-origin CORS allowlist; when configured, missing and mismatched origins are rejected.
- CORS is not treated as authentication or protection for non-browser clients.
- In-memory, per-process/socket-peer-IP sliding-window rate limit; forwarded IP headers are ignored.
- No body or credential logging by default.

The local limiter resets on restart and does not coordinate multiple instances.
Therefore this implementation must not be exposed as an unlimited public API.


---

# P1-C — مقارنة المزودين والاستضافة (بحث توثيقي فقط)

**تاريخ التحقق:** 2026-10-08

**نطاق القرار:** بحث مكتبي فقط؛ لم يُنشأ حساب أو مفتاح، ولم تُضف وسيلة دفع، ولم
يُنفذ اتصال حقيقي أو نشر عام. لا يعتمد هذا القسم مزودًا أو منصة نهائيًا.

## منهجية وحدود الأدلة

تُستخدم التصنيفات التالية حتى لا تختلط الحقائق بالاستنتاجات:

- **موثق رسميًا:** نص أو رقم منشور في وثائق الجهة نفسها في تاريخ التحقق.
- **استنتاج هندسي:** نتيجة توافق الوثيقة مع معمارية Cela.sh الحالية، وليست وعدًا
  من الجهة.
- **غير محسوم من الوثائق:** يحتاج إلى إنشاء حساب أو معاينة لوحة الفوترة أو سؤال
  الدعم؛ لم يُختبر هنا.
- **غير مختبر:** يحتاج إلى مفتاح أو نشر أو اتصال فعلي، وهو ممنوع في P1-C.

الأسعار والحصص قابلة للتغيير، وبعض الحدود تُعرض حسب الحساب أو المشروع داخل لوحة
المزود. يجب إعادة فتح الروابط الرسمية ومراجعة لوحة الحساب قبل أي اعتماد بشري.

## المصادر الرسمية المباشرة

### Google Gemini

- [الأسعار](https://ai.google.dev/gemini-api/docs/pricing)
- [الفوترة ومستويات الاستخدام وحدود الإنفاق](https://ai.google.dev/gemini-api/docs/billing)
- [حدود المعدل](https://ai.google.dev/gemini-api/docs/rate-limits)
- [المناطق المتاحة](https://ai.google.dev/gemini-api/docs/available-regions)
- [الشروط الإضافية واستخدام البيانات](https://ai.google.dev/gemini-api/terms)
- [الاحتفاظ ومراقبة إساءة الاستخدام](https://ai.google.dev/gemini-api/docs/usage-policies)
- [Zero Data Retention](https://ai.google.dev/gemini-api/docs/zdr)

### OpenAI API

- [أسعار API](https://openai.com/api/pricing/)
- [حدود المعدل ومستويات الاستخدام](https://platform.openai.com/docs/guides/rate-limits)
- [إعداد الفوترة المسبقة](https://help.openai.com/en/articles/8264644-setting-up-and-managing-prepaid-api-billing)
- [الفوترة المسبقة وانتهاء الرصيد](https://help.openai.com/en/articles/8264778)
- [ضوابط واستخدام بيانات API](https://platform.openai.com/docs/guides/your-data)
- [الدول والمناطق المدعومة](https://platform.openai.com/docs/supported-countries)

### الاستضافة

- Render: [الخدمات المجانية](https://render.com/docs/free)،
  [أول نشر](https://render.com/docs/your-first-deploy)،
  [الأسئلة والفوترة](https://render.com/docs/faq)،
  [متغيرات البيئة والأسرار](https://render.com/docs/configure-environment-variables)
- Vercel: [خطة Hobby](https://vercel.com/docs/plans/hobby)،
  [حدود Functions](https://vercel.com/docs/functions/limitations)،
  [Python runtime](https://vercel.com/docs/functions/runtimes)،
  [الاستخدام العادل](https://vercel.com/docs/limits/fair-use-guidelines)،
  [متغيرات البيئة](https://vercel.com/docs/environment-variables)
- Hugging Face: [نظرة عامة على Spaces](https://huggingface.co/docs/hub/en/spaces-overview)،
  [عتاد وأسعار Spaces](https://huggingface.co/docs/hub/spaces-gpus)،
  [Static Spaces](https://huggingface.co/docs/hub/spaces-sdks-static)

## مقارنة مزودي النماذج

| البند | Gemini Developer API | OpenAI API |
|---|---|---|
| نماذج النص/المحادثة | **موثق رسميًا:** صفحة الأسعار تعرض نماذج Flash وFlash-Lite وPro، لكن إتاحة المستوى المجاني تختلف حسب النموذج؛ بعض نماذج Pro/Preview بلا Free Tier. | **موثق رسميًا:** API يقدم نماذج نصية متعددة، وتُحاسب Chat Completions/Responses وفق أسعار النموذج، لا برسوم منفصلة للواجهة. الأسماء والأسعار تتغير ويجب اختيار نموذج منشور وقت الاعتماد. |
| مثال سعر موثق | **موثق بتاريخ التحقق:** صفحة الأسعار تعرض لـGemini 3.7 Flash سعرًا مدفوعًا قدره $0.75 للإدخال و$3.75 للإخراج لكل مليون token حتى 2026-12-31، ثم أسعارًا أعلى معلنة من 2027؛ المستوى المجاني لذلك النموذج يعرض الإدخال والإخراج بلا رسم ضمن الحصة. | **موثق في صفحة السعر:** من أمثلة النماذج النصية المنشورة GPT-4.1 mini بسعر $0.40 إدخال و$1.60 إخراج لكل مليون token، وGPT-4.1 nano بسعر $0.10/$0.40. يلزم إعادة التحقق من بقاء النموذج والسعر قبل الاعتماد. |
| حصة API مجانية مستمرة | **موثق رسميًا:** توجد Free Tier لبعض النماذج، وليست لكل النماذج. الوصول محدود وBest-effort عمليًا؛ لا يجوز بناء ضمان إنتاجي عليها. | **غير مثبت كحصة دائمة عامة:** قد توجد أرصدة مجانية لحسابات مؤهلة، لكن وثائق الفوترة لا تعد بحصة مجانية مستمرة لكل حساب. ChatGPT Free منتج منفصل ولا يثبت مجانية API. |
| RPM/TPM/RPD | **موثق رسميًا:** الحدود لكل مشروع وتتغير حسب النموذج والمستوى، وتستخدم RPM وTPM وRPD/TPD؛ RPD يعاد عند منتصف الليل بتوقيت Pacific. القيم الفعلية يجب أخذها من صفحة النموذج/المشروع وقت القرار، لا نسخ رقم ثابت هنا. | **موثق رسميًا:** الحدود على مستوى المؤسسة والمشروع، وتستخدم RPM/RPD/TPM/TPD وتختلف حسب النموذج ومستوى الاستخدام؛ القيم الفعلية تظهر في صفحة Limits للحساب. |
| البطاقة والفوترة | **موثق:** Free Tier لا يحتاج ربط Billing كي يظل Free Tier؛ الانتقال للمدفوع يتطلب Cloud Billing/Prepay. **غير محسوم:** هل إنشاء المفتاح المجاني للحساب المصري المحدد سيطلب وسيلة دفع أو تحققًا إضافيًا في واجهة الحساب. | **موثق:** تفعيل الفوترة المسبقة يتطلب إضافة تفاصيل دفع، والحد الأدنى المنشور للشراء $5؛ نفاد الرصيد يوقف الطلبات بأخطاء فوترة. **غير محسوم:** وجود رصيد ترويجي لحساب بعينه. |
| الإتاحة في مصر | **موثق رسميًا:** مصر موجودة في قائمة المناطق المتاحة. توجد أيضًا شروط عمر/حساب وشروط استخدام عامة يجب قبولها. | **يحتاج إعادة تحقق من قائمة الدول عند القرار:** لا يكفي افتراض الإتاحة من إمكانية فتح ChatGPT؛ يجب أن تكون مصر مدعومة لخدمة API والحساب ووسيلة الدفع نفسها. لم يُنشأ حساب للاختبار. |
| استخدام البيانات | **موثق وحساس:** في Unpaid Services قد يستخدم Google المدخلات والمخرجات لتحسين المنتجات وقد يراجعها بشر؛ تنص الشروط على عدم إرسال معلومات حساسة أو سرية أو شخصية. Paid Services لا تستخدم prompts/responses لتحسين المنتجات وفق الشروط، مع احتفاظ محدود لمراقبة الإساءة وسياسات خاصة للـgrounding. | **موثق في ضوابط البيانات:** بيانات API لا تُستخدم لتدريب النماذج افتراضيًا إلا عند الاشتراك الصريح في مشاركة معينة، لكن قد توجد سجلات لمراقبة الإساءة ومدد احتفاظ تختلف حسب الميزة والأهلية. يلزم فحص ميزة/model محددة قبل إرسال بيانات شخصية. |
| نفاد الحصة | **موثق/استنتاج:** يرجع المزود أخطاء quota/rate limit؛ المستوى المجاني لا يتحول تلقائيًا إلى نجاح أو سعة مضمونة. ربط Billing ينقل الاستخدام إلى المستوى المدفوع وفق إعداد الحساب. | **موثق:** نفاد الرصيد المسبق ينتج خطأ `credit_balance_exhausted`، وبلوغ المعدل ينتج 429/ترويسات إعادة المحاولة؛ لا ينبغي للواجهة عرض fallback على أنه رد حقيقي. |
| حدود الإنفاق | **موثق:** توجد spend caps حسب مستوى حساب الفوترة ($250 لـTier 1 وفق صفحة الفوترة في تاريخ التحقق)، لكنها ليست وعدًا بتكلفة صفرية؛ يجب أيضًا ضبط ميزانية/تنبيهات Cloud Billing. Free Tier بلا فاتورة لكنه محدود وغير مضمون للإنتاج. | **موثق:** توجد حدود استخدام معتمدة وحدود مشروع/مؤسسة، وإعداد auto-recharge له حد شهري؛ توضح الوثائق أن حد auto-recharge ليس حد استخدام API كاملًا. يلزم تعطيل auto-recharge وضبط حدود المشروع ومراقبة الرصيد إن اعتُمد. |
| التوافق مع `ChatProvider` | **استنتاج هندسي:** Adapter مستقل جديد مطلوب لتحويل `{role, content}` إلى `generateContent` وتحليل candidates، مع عنوان ثابت وأخطاء آمنة. حجم التغيير متوسط ولا يستلزم تغيير عقد `/api/chat`. | **موثق في الشيفرة المحلية/استنتاج:** Adapter P1-B موجود لـChat Completions، لكن لم يُختبر بمفتاح حقيقي. أقل تغيير برمجي، وليس دليلًا على أفضل تكلفة أو سياسة بيانات. |
| تكلفة إلزامية متوقعة | قد تكون **$0** لنموذج أولي محدود على نموذج ذي Free Tier، مقابل قبول سياسة بيانات Unpaid وحدود متغيرة. أي ضمان خصوصية أقوى أو سعة أعلى قد يفرض Billing. | لا توجد حصة مجانية دائمة مثبتة؛ المسار المعتاد يتطلب دفعًا مسبقًا بحد أدنى منشور $5، ثم تكلفة token فعلية. |
| حالة الدليل | الأسعار/المناطق/سياسة البيانات موثقة؛ البطاقة عند إنشاء الحساب والحصة الفعلية للمشروع **غير مختبرتين**. | الفوترة والأسعار العامة موثقة؛ أهلية الحساب المصري والحدود الفعلية والاتصال **غير مختبرة**. |

### ترتيب أولي غير ملزم للمزود

1. **Gemini Free Tier لتجربة محلية غير حساسة فقط:** أقرب خيار إلى شرط عدم
   التكلفة الإلزامية، ومصر مدعومة رسميًا. التحفظ الحاسم هو استخدام بيانات Unpaid
   لتحسين المنتجات وإمكان المراجعة البشرية؛ لذلك لا يصلح لمدخلات شخصية أو سرية،
   ولا يُعتمد لخدمة عامة قبل مراجعة الشروط داخل الحساب.
2. **OpenAI API لتجربة مضبوطة مدفوعة:** Adapter المحلي أقرب تقنيًا، وسياسة بيانات
   API أوضح للاستخدام العادي، لكن الدفع/البطاقة والتكلفة الفعلية متوقعة ولا يحقق
   شرط «بلا وسيلة دفع» كما هو.

هذا ترتيب بحثي فقط، وليس اختيارًا. لا يثبت أي اتصال أو أهلية حساب.

## مقارنة منصات الاستضافة

| البند | Render Free Web Service | Vercel Hobby Functions | Hugging Face Spaces |
|---|---|---|---|
| Python Backend فعلي | **موثق:** Web Services تدعم Python وتستمع على port؛ العقدان الحاليان قابلان للتشغيل بعد ضبط أمر build/start. | **موثق:** Python runtime يشغل ASGI/WSGI وFunctions. **استنتاج:** الخادم الحالي طويل العمر (`ThreadingHTTPServer`) لا يُنقل كما هو؛ يحتاج wrapper serverless لمساري API وفصل الملفات الثابتة. | **موثق:** Docker/Gradio يشغلان compute؛ Static Space لا يشغل Python. **استنتاج:** Backend الحالي يحتاج Docker Space أو تكييفًا. |
| مستوى مجاني | **موثق:** Free web service و750 instance-hours/workspace شهريًا. | **موثق:** Hobby مجاني ضمن حدود، منها 1,000,000 invocation و4 CPU-hours و360 GB-hours شهريًا وفق الصفحة في تاريخ التحقق. | **موثق:** Static مجاني للجميع لكنه لا يشغل Backend. إنشاء Gradio/Docker compute يتطلب خطة مدفوعة حاليًا، باستثناء أهلية محدودة لـZeroGPU لا تناسب API Python عامة. CPU Basic بلا سعر عتاد، لكن إنشاء compute Space نفسه يتطلب الخطة. |
| البطاقة | وثيقة أول نشر تقول «No payment is required» للموارد المجانية، والـFAQ يقول إن غياب وسيلة الدفع يؤدي للتعليق بدل الفوترة عند بعض التجاوزات. **غير محسوم:** متطلبات التحقق الخاصة بالحساب/المنطقة الفعلية. | Hobby بلا دورة فوترة وفق الوثيقة. **غير محسوم من الوثائق التي روجعت:** هل إنشاء حساب/نشر Python للمستخدم المحدد يتطلب بطاقة تحقق. | compute Space يتطلب PRO/Team/Enterprise وفق الوثيقة الحالية، وبالتالي توجد تكلفة/فوترة؛ Static وحده لا يكفي. متطلبات البطاقة التفصيلية **غير محسومة**. |
| CPU/ذاكرة/مدة الطلب | حدود CPU/RAM الدقيقة للـFree instance يجب أخذها من صفحة الخطة وقت القرار؛ Render يسمح Web Service طويل العمر، لكن لا ينبغي استخدام حد الطلب الطويل ذريعة لمحادثة بلا timeout. | **موثق:** Hobby Functions حتى 2GB/1 vCPU، مدة قصوى منشورة 300 ثانية، وحزمة Python حتى 500MB. | **موثق:** CPU Basic يعرض 2 vCPU و16GB وقرصًا غير دائم 50GB، لكن compute creation مدفوع الخطة حاليًا. |
| الخمول | **موثق:** ينام بعد 15 دقيقة بلا traffic؛ الاستيقاظ يقارب دقيقة، ما قد يجعل أول `/api/status` أو `/api/chat` بطيئًا أو يفشل من منظور المستخدم. | Functions مؤرشفة عند عدم الاستدعاء وقد يحدث cold start، لكن لا يوجد خادم دائم مطلوب. | free hardware ينام بعد الخمول (الوثيقة تذكر نحو 48 ساعة لـCPU Basic)، والملفات المحلية غير مناسبة للحالة الدائمة. |
| تجاوز الحدود | **موثق:** نفاد ساعات Free أو bandwidth بلا وسيلة دفع يعلق الخدمات لبقية الدورة؛ مع وسيلة دفع قد تُفرض رسوم إضافية حسب المورد. | **موثق:** Hobby لا يدفع عادةً تجاوزًا تلقائيًا؛ قد تتوقف/تتعلق الميزة حتى تجدد الفترة. لا توجد Spend Management في Hobby مثل Pro. | paid hardware يحاسب بالدقيقة أثناء Starting/Running؛ يجب إيقافه/إعادته لـCPU Basic لإيقاف التكلفة. |
| الاستخدام التجاري | Free مناسب للمعاينة؛ وثائق Render نفسها لا توصي به للإنتاج. يجب مراجعة شروط الحساب التجاري قبل الاعتماد. | **موثق:** Hobby شخصي غير تجاري فقط؛ أي استخدام تجاري يتطلب Pro/Enterprise. | يعتمد على الخطة وشروط Hub؛ Public Space يكشف المصدر، وcompute المطلوب ليس بديلًا مجانيًا مباشرًا. |
| الأسرار | **موثق:** Environment variables/secret files من لوحة Render؛ لا توضع في Git. | **موثق:** Environment Variables مشفرة at rest ومقيدة بالبيئات؛ يجب ألا تستخدم بادئة عامة أو تُبنى داخل frontend. | Spaces Secrets متاحة، لكن Public Space يعرض المصدر؛ الأسرار لا توضع في الملفات. |
| HTTPS/CORS | Render يوفر نطاق HTTPS؛ اضبط `AI_ALLOWED_ORIGINS` على أصل GitHub Pages الدقيق، و`easy-ai-api-base` على HTTPS. | Vercel يوفر HTTPS؛ نفس CORS، لكن وظيفة Python تحتاج تكييفًا قبل الاختبار. | HTTPS متاح؛ يحتاج CORS واختبار routing داخل Docker/Gradio. |
| الملفات المحلية | **موثق:** تغييرات filesystem تضيع عند sleep/redeploy؛ التطبيق الحالي stateless لذلك لا يعتمد عليها. | filesystem للوظيفة read-only مع `/tmp` مؤقت؛ التطبيق الحالي يجب أن يبقى stateless، ومحدد المعدل داخل الذاكرة غير موثوق عبر instances. | القرص الافتراضي غير دائم؛ لا يصلح لعداد موزع أو سجل دائم. |
| ملاءمة النموذج الأولي | **الأعلى أوليًا:** أقل تغيير لتشغيل Python الحالي، مقابل cold start قوي وعدم ملاءمة الإنتاج. | جيد تقنيًا بعد تحويل handler إلى Functions، لكن هذا تغيير برمجي جديد وشروط Hobby تمنع الاستخدام التجاري. | ضعيف لهذا المشروع الآن: Static لا يكفي وcompute يتطلب خطة مدفوعة. |
| ملاءمة خدمة عامة | غير كافٍ وحده: يحتاج auth، rate limit موزع، مراقبة وحماية تكلفة وخطة تشغيل أنسب. | غير كافٍ على Hobby: يحتاج auth ومخزن rate-limit موزع وخطة متوافقة مع الغرض. | غير موصى به كمسار API عام في القيود الحالية. |
| حالة الدليل | التشغيل المجاني والخمول والتعليق موثقة؛ البطاقة الفعلية للحساب غير مختبرة. | Python والحدود وHobby موثقة؛ توافق الشيفرة الحالية والبطاقة غير مختبرين. | شرط الخطة للـcompute وStatic المجاني موثقان؛ لا نشر اختباري. |

### ترتيب أولي غير ملزم للاستضافة

1. **تشغيل محلي:** الخيار الوحيد المثبت دون حساب أو بطاقة أو نشر، والمناسب لاختبار
   P1-B بأمان عند توفير مفتاح يوافق عليه المالك لاحقًا.
2. **Render Free لنموذج أولي خاص/محدود:** أقل تعديل لمعمارية Python الحالية، لكن
   cold start والتعليق ومحدد المعدل أحادي العملية تمنع اعتباره خدمة عامة جاهزة.
3. **Vercel Hobby:** موارد مجانية موثقة للمشروعات الشخصية غير التجارية، لكنه يتطلب
   تكييف الخادم إلى Functions واختبارات جديدة؛ ليس drop-in deployment.
4. **Hugging Face:** Static لا يشغل Python، وcompute Space يتطلب خطة مدفوعة وفق
   الوثائق الحالية؛ لذلك لا يحقق شرط الاستضافة المجانية المباشرة.

## الحد الأدنى قبل أي تشغيل عام

لا تكفي CORS أو حصة المزود. يجب قبل النشر العام تنفيذ ومراجعة:

1. مصادقة المستخدم أو بوابة وصول موثوقة؛ لا API عامة مجهولة بلا حد.
2. Rate limit موزع ودائم يناسب تعدد العمليات والنسخ، مع سياسة trusted proxy؛ لا
   ثقة تلقائية في `X-Forwarded-For`.
3. حصة لكل مستخدم/يوم وحد أقصى متزامن، بالإضافة إلى RPM/TPM لدى المزود.
4. حدود الإدخال والسجل والمخرجات والمهلة الموجودة في P1-B مع اختبار بيئة النشر.
5. حد إنفاق قابل للإنفاذ وتنبيهات، وتعطيل auto-recharge حيث يلزم؛ حد تنبيه وحده
   ليس ضمانًا لإيقاف التكلفة.
6. Secret manager في منصة الاستضافة، ومنع الأسرار ومحتوى المحادثة من logs.
7. HTTPS فقط، وأصل GitHub Pages محدد حرفيًا، وسياسة CSP مناسبة في دفعة مستقلة.
8. تحويل 429/quota/timeout/provider errors إلى الحالات الصريحة الحالية دون نجاح
   زائف أو fallback مخفي.
9. سياسة خصوصية للمستخدم وموافقة واعية؛ منع إرسال PII/أسرار، وبالأخص منعها تمامًا
   إلى Gemini Unpaid وفق شروطه.
10. مراقبة availability والحصة والتكلفة مع kill switch يعطل المحادثة الحقيقية
    ويعيد الواجهة إلى حالة غير متاحة/تجريبية معلنة.

## بديل التشغيل بلا استضافة

إذا لم تُقبل بطاقة أو تكلفة أو سياسة بيانات أي خيار، يبقى المسار الآمن:

- GitHub Pages يعرض الواجهة التجريبية الصادقة فقط.
- Backend يعمل محليًا على `127.0.0.1` لأغراض التطوير والمراجعة.
- لا يُكشف `/api/chat` للإنترنت.
- لا تُرسل مدخلات شخصية إلى Free Tier.
- يمكن لاحقًا اختبار Adapter بمفتاح مؤقت داخل بيئة محلية دون حفظه في Git، بعد
  موافقة بشرية ومراجعة شروط الحساب.

## مسائل غير محسومة تتطلب مراجعة بشرية

- هل يقبل المالك سياسة استخدام بيانات Gemini Unpaid لمحتوى غير حساس فقط؟
- هل يقتصر الجمهور على مصر/المناطق المتاحة، وكيف يمنع الوصول من مناطق ذات شروط
  Paid-only إن أصبحت الخدمة عامة؟
- هل إنشاء مفتاح Gemini المجاني أو حساب Render/Vercel الفعلي يطلب بطاقة أو تحققًا
  إضافيًا لهذا الحساب المصري؟ **غير محسوم دون تجربة حساب، ولم تُجرَ.**
- ما النموذج المحدد والحصة الفعلية RPM/TPM/RPD الظاهرة للمشروع يوم الاعتماد؟
- هل المنتج شخصي غير تجاري بما يطابق Vercel Hobby؟
- هل تقبل تجربة مستخدم Render cold start التي قد تقارب دقيقة؟
- ما آلية المصادقة والـrate-limit الموزع ومن يراقب الإنفاق والحوادث؟
- هل يلزم Data Processing Agreement أو Zero Data Retention؟ إذا نعم، قد تستبعد
  الخطط المجانية بالكامل.
- هل يُسمح بدفع حد أدنى $5 لـOpenAI أو خطة مدفوعة للاستضافة؟ لم تُمنح موافقة.

## خلاصة قرار P1-C

يوجد **مسار محتمل بلا تكلفة إلزامية** لنموذج أولي فقط: Gemini Free Tier مع Render
Free أو تشغيل محلي. لكنه ليس قرارًا جاهزًا بسبب سياسة بيانات Gemini Unpaid، تغير
الحصص، cold start، غياب المصادقة والـrate-limit الموزع، وعدم اختبار متطلبات الحساب
والبطاقة. OpenAI أقرب إلى Adapter الحالي لكنه ليس مسارًا مثبتًا بلا دفع. Vercel
يتطلب تكييفًا، وHugging Face compute ليس مجاني الإنشاء وفق الوثائق الحالية.

**لا مزود ولا منصة معتمدان. القرار النهائي بشري بعد مراجعة الحساب الفعلي، وسياسة
البيانات، والتكلفة، وضوابط منع الإساءة.**

## سجل القرارات البشرية

الحالات المسموحة في هذا السجل:

- `NOT_DECIDED`: لم يُتخذ قرار بشري بعد.
- `NEEDS_VALIDATION`: يوجد اتجاه محتمل، لكنه يحتاج تحققًا داخل حساب فعلي أو تجربة
  مقيدة أو مراجعة شروط محدثة.
- `APPROVED`: اعتماد بشري موثق مع دليل وتاريخ ومراجع. لا توجد قرارات بهذه الحالة
  حاليًا.

| القرار المطلوب | الخيارات المعروفة | أثر الأمن والتكلفة والخصوصية | ما تؤكده الوثائق | ما يحتاج تجربة/موافقة | الحالة |
|---|---|---|---|---|---|
| مزود النموذج | Gemini Developer API؛ OpenAI API؛ local/demo only | يحدد سياسة البيانات، السعر، الحصة، الأخطاء والإتاحة الإقليمية | P1-C يوثق الفئات والأسعار والسياسات المتاحة بتاريخ المراجعة | أهلية الحساب، شروطه الفعلية، وقبول المالك لسياسة البيانات | `NOT_DECIDED` |
| النموذج المحدد | نموذج نصي مدعوم لدى المزود المعتمد | الجودة والكمون والسياق وسعر الإدخال والإخراج وحدود المعدل | صفحات النموذج والسعر تعرض الخيارات المنشورة | model ID والحصة الفعلية في لوحة المشروع واختبار محدود | `NOT_DECIDED` |
| مستوى الخدمة | free/unpaid؛ paid/prepaid؛ local only | المستوى المجاني قد يغير استخدام البيانات؛ المدفوع يضيف التزامًا ماليًا | Gemini يميز Unpaid/Paid؛ OpenAI يوثق prepaid | البطاقة، الفوترة، سقف الحساب، والموافقة على الدفع | `NOT_DECIDED` |
| منصة الاستضافة | local only؛ Render؛ Vercel؛ بديل يراجع لاحقًا | تحدد الخمول، تعدد النسخ، proxy، الأسرار، الحدود والتكلفة | P1-C يوثق الحدود العامة للخيارات المدروسة | إنشاء الحساب، البطاقة، التوافق العملي وشروط الغرض التجاري | `NOT_DECIDED` |
| نموذج المصادقة | جلسة خادمية؛ token قصير العمر؛ بوابة وصول مُدارة | يمنع استهلاك المفتاح العام ويحدد الإبطال وCSRF وفصل المستخدمين | الوثائق المعمارية تثبت الحاجة ولا تعتمد آلية | تعريف الجمهور والهوية وتهديدات العميل والمنصة | `NOT_DECIDED` |
| سياسة البيانات | منع كل البيانات الحساسة؛ allowlist حسب التصنيف؛ مزود مدفوع بضوابط أقوى | تحدد ما يجوز خروجه ومدة الاحتفاظ والموافقة والحذف | شروط المزودين تبين فروقًا مهمة، خصوصًا Gemini Unpaid | تصنيف بيانات المنتج، DPA/ZDR، consent وretention | `NOT_DECIDED` |
| حد الإنفاق الصلب | provider hard cap؛ prepaid بلا auto-recharge؛ gateway kill switch؛ local only | يمنع أو يحد الخسارة المالية؛ التنبيه وحده لا يوقف الطلبات | بعض المنصات تنشر caps/credits، لكن ضمان الإيقاف يختلف | اختبار حساب فعلي وإثبات أن الحد قابل للإنفاذ | `NOT_DECIDED` |
| محدد الاستخدام | لكل مستخدم؛ لكل tenant؛ IP مساعد؛ quota يومية؛ concurrent cap | يمنع الإساءة ويحمي التكلفة؛ IP وحده غير كافٍ خلف proxies | الحاجة إلى حد موزع موثقة؛ التنفيذ يعتمد الاستضافة | مخزن موزع، trusted proxy، قيم الحدود وهوية المستخدم | `NOT_DECIDED` |

لا يجوز تغيير أي صف إلى `APPROVED` بمجرد اكتمال وثيقة أو نجاح اختبار وهمي؛ يجب
إضافة مرجع الاعتماد البشري، تاريخ إعادة التحقق، والقيم المعتمدة.

## حدود التكلفة: مفاهيم غير متكافئة

يجب الفصل بين الآليات التالية:

1. **حد مخرجات النموذج:** يقلل عدد tokens الممكن توليدها في طلب واحد، لكنه لا يحدد
   سعر المدخلات أو الأدوات أو retries، ولذلك ليس حدًا ماليًا.
2. **محدد المعدل:** يحد RPM/TPM أو عدد الطلبات، لكنه قد يسمح بطلبات غالية ولا يضمن
   بقاء الفاتورة دون سقف عبر مدة طويلة.
3. **تقدير التكلفة المحلي:** يفيد في الرفض المبكر والمراقبة، لكنه تقريبي وقد يتأخر
   عن تسعير المزود الفعلي، ولا يُعد آلية منع مستقلة.
4. **تنبيه الحصة/الميزانية:** إشعار تشغيلي فقط ما لم تنص المنصة صراحة على وقف
   الطلبات؛ لا يجوز وصفه بأنه hard cap.
5. **حد تفرضه المنصة:** لا يعد حدًا صلبًا إلا بعد توثيق أن تجاوزه يرفض الطلبات ولا
   يولد رسومًا إضافية، والتحقق من أثر auto-recharge والرصيد القائم.
6. **kill switch في البوابة:** ضابط إضافي يوقف إنشاء طلبات جديدة، ويجب أن يعمل عند
   نفاد الحصة أو فشل المزود أو تجاوز حد داخلي. لا يلغي تكلفة الطلبات الجارية.

إذا لم يوفر المزود سقفًا ماليًا صلبًا قابلًا للإنفاذ، فهذه الحقيقة مانع للنشر العام
حتى تعتمد مجموعة ضوابط بديلة: prepaid محدود بلا auto-recharge، quota داخلية موزعة،
مراقبة قريبة، وkill switch مختبر. عند الإيقاف أو نفاد الحصة تعود الواجهة إلى حالة
خطأ/عدم توفر صريحة، ولا تتحول الردود التجريبية إلى إجابات توحي بنجاح المزود.
